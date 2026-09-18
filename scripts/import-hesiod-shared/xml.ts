/**
 * Shared TEI-XML parsing for the six Hesiod importers.
 *
 * Source shape (Perseus / OpenGreekAndLatin `canonical-greekLit`, verified
 * by direct inspection of all six raw files, not assumed):
 *
 *   Greek  (tlg0020.tlg00{1,2,3}.perseus-grc2.xml): a single
 *     <div type="edition" xml:lang="grc"> body with NO book/chapter
 *     <div type="textpart">s - each poem is one continuous sequence of
 *     <l n="N">verse text</l> elements (occasionally wrapped in a bare
 *     <sp> "speech" container with no effect on line order or numbering).
 *     A handful of lines are wrapped in <del>...</del> (later editorial
 *     bracketing / athetesis - e.g. Theogony 111, 118, 196, 323-324) or in
 *     <add>...</add> (an editorially-supplied passage - the ~19-line
 *     Hera/Hephaestus/Metis/Athena-birth passage numbered 929a-929s in
 *     Theogony, and the 4-line "silver race" doublet 169a-169d in Works and
 *     Days). Per this repo's non-negotiable faithfulness rule ("never
 *     content"), BOTH are kept verbatim in the reading text - only the
 *     <del>/<add> tags themselves are stripped, matching how <add> (but,
 *     departing from precedent, NOT <del>) is handled in this repo's Euclid
 *     importer; see each work's anomalies.json for the explicit call-out.
 *     Theogony additionally carries one <gap reason="ellipsis" rend=" * * *
 *     * "/> self-closing lacuna marker (not inside any <l>) - the source's
 *     own printed "* * * *" ellipsis for an omitted/untranslatable line,
 *     kept as its own line in the reading text, verbatim, at its original
 *     position.
 *
 *     All three Greek files carry their own native <milestone unit="card"
 *     n="N"/> markers (attribute order varies between files - "n... ed...
 *     unit...", "ed... n... unit...", "ed... unit... n..." are all seen, so
 *     parsing matches unit="card" via lookahead rather than assuming it
 *     precedes n). N is the Greek line number the card starts on - confirmed
 *     by direct inspection for all three poems: every milestone immediately
 *     precedes the <l> of the same n (32 cards in the Theogony, 26 in Works
 *     and Days, 13 in the Shield of Heracles).
 *
 *   English (tlg0020.tlg00{1,2,3}.perseus-eng2.xml): Evelyn-White's 1914
 *     Loeb prose translation. The source plan for this importer assumed
 *     <p> paragraphs with inline <milestone> breaks (matching how Homer's
 *     English translation is encoded in this same repository); that is NOT
 *     what these three files actually contain - there is no <p> anywhere
 *     in the body. Instead the body is a bare sequence of <l n="N"> "line
 *     group" elements (reference anchors only, spaced roughly every 5
 *     Greek lines - e.g. n="1","5","10",...) whose content is ordinary
 *     running prose, not verse; <milestone unit="card" n="N"/> markers are
 *     threaded through this stream (sometimes at an <l> boundary, sometimes
 *     mid-<l>) and carry the SAME card numbers as the Greek witness (the
 *     Theogony's own Greek milestones and the Theogony English milestones
 *     are byte-identical lists - cross-checked in the Theogony importer).
 *     <note resp="Loeb" ...> footnotes (Evelyn-White's own scholarly notes,
 *     not Hesiod's text) are dropped wholesale, matching this repo's
 *     established <note> convention (see e.g. import-euclid-en); inline
 *     <placeName>/<foreign>/<hi> wrapping real reading-text words (verified
 *     by direct inspection: every occurrence outside a <note> sits at a
 *     whitespace/punctuation boundary on both sides) is unwrapped, keeping
 *     the text.
 *
 *   Card boundary derivation: a card milestone's `n` is the STARTING GREEK
 *   LINE NUMBER of that card (verified directly for all three poems: every
 *   Greek milestone n="X" immediately precedes Greek line n="X"). Each
 *   work's card boundary list is hardcoded once in cardBoundaries.ts, and
 *   every importer (Greek AND English, for all three works) cross-checks
 *   its own file's native milestone list against that shared table at
 *   import time, failing loudly on any mismatch - so the Greek and English
 *   witness of a work can never silently disagree about where a card
 *   starts. The Greek <l> stream is split by bucketing each line's integer
 *   line-number prefix ("929a" -> 929) against the boundary list; the
 *   English stream is split at its own inline milestones directly.
 */

import { cleanText } from './text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export function fail(workId: string, msg: string): never {
  process.stderr.write(`STOP (${workId}): ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Greek parsing
// ---------------------------------------------------------------------------

export interface GreekAtom {
  kind: 'line' | 'gap';
  /** the <l n="..."> value verbatim (may be lettered, e.g. "929a"); "" for a gap */
  n: string;
  /** the integer line-number prefix used for card bucketing (e.g. 929 for "929a") */
  linePrefix: number;
  /** cleaned verbatim text */
  text: string;
  /** number of <del>...</del> spans this line's raw content contained (0 for an ordinary line; may be >1 - see works-and-days-grc n="169a".."169d", each with two partial spans mixed with plain text) */
  delSpans: number;
  /** number of <add>...</add> spans this line's raw content contained (0 for an ordinary line; always a single whole-line span in practice) */
  addSpans: number;
}

export interface ParsedGreekBody {
  atoms: GreekAtom[];
  /** total <del>...</del> spans across all lines (a line may contain more than one - see GreekAtom.delSpans) */
  delSpanCount: number;
  /** total <add>...</add> spans across all lines */
  addSpanCount: number;
  gapCount: number;
  /** every <milestone unit="card" n="..."> found natively in the Greek file, in document order */
  nativeMilestones: string[];
}

/** Slice out the single <div type="edition" ...> ... </div> body (no book/chapter nesting exists to slice further). */
function sliceGreekEditionDiv(xml: string, workId: string): string {
  const divRe = /<div\b[^>]*\btype="edition"[^>]*>/;
  const m = divRe.exec(xml);
  if (!m) fail(workId, 'no <div type="edition"> found in Greek source XML');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyEnd < 0 || bodyEnd < m.index) fail(workId, 'no </body> found after <div type="edition"> in Greek source XML');
  return xml.slice(m.index, bodyEnd);
}

export function parseGreekBody(xml: string, workId: string): ParsedGreekBody {
  const body = sliceGreekEditionDiv(xml, workId);

  // Attribute order on <milestone> varies between these three files (seen: "n... ed... unit...",
  // "ed... n... unit...", "ed... unit... n..."), so match unit="card" via lookahead rather than
  // assuming it precedes n.
  const nativeMilestones = [...body.matchAll(/<milestone\b(?=[^>]*\bunit="card")[^>]*\bn="([^"]+)"[^>]*\/>/g)].map(
    (m) => m[1]!,
  );

  const re = /<l\b[^>]*\sn="([^"]+)"[^>]*>([\s\S]*?)<\/l>|<gap\b([^>]*)\/>/g;
  const atoms: GreekAtom[] = [];
  let delSpanCount = 0;
  let addSpanCount = 0;
  let gapCount = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    if (match[1] !== undefined) {
      const n = match[1];
      const linePrefixMatch = /^\d+/.exec(n);
      if (!linePrefixMatch) fail(workId, `<l n="${n}"> has no leading integer - cannot bucket into a card`);
      const linePrefix = Number(linePrefixMatch[0]);
      let inner = match[2]!;

      // Strip <del>/<add> spans generically (never assume a single span wraps the
      // WHOLE line - works-and-days-grc n="169a".."169d" each carry TWO separate
      // <del> spans mixed with plain, non-deleted text), keeping their text content
      // and counting each span individually.
      let delSpans = 0;
      inner = inner.replace(/<del>([\s\S]*?)<\/del>/g, (_whole: string, t: string) => {
        delSpans += 1;
        return t;
      });
      let addSpans = 0;
      inner = inner.replace(/<add>([\s\S]*?)<\/add>/g, (_whole: string, t: string) => {
        addSpans += 1;
        return t;
      });
      delSpanCount += delSpans;
      addSpanCount += addSpans;

      if (/<[a-zA-Z]/.test(inner)) {
        fail(workId, `<l n="${n}"> contains an unexpected nested tag not accounted for by this parser: ${JSON.stringify(inner.slice(0, 120))}`);
      }
      const text = cleanText(inner.replace(/<[^>]+>/g, ' '));
      if (text.length === 0) fail(workId, `<l n="${n}"> is empty after cleaning`);
      atoms.push({ kind: 'line', n, linePrefix, text, delSpans, addSpans });
    } else {
      gapCount += 1;
      const attrs = match[3] ?? '';
      const rendM = /\brend="([^"]*)"/.exec(attrs);
      const gapText = cleanText(rendM ? rendM[1]! : '* * * *');
      atoms.push({
        kind: 'gap',
        n: '',
        linePrefix: atoms.length ? atoms[atoms.length - 1]!.linePrefix : 0,
        text: gapText,
        delSpans: 0,
        addSpans: 0,
      });
    }
  }
  if (atoms.length === 0) fail(workId, 'no <l> lines found in Greek source XML');
  return { atoms, delSpanCount, addSpanCount, gapCount, nativeMilestones };
}

// ---------------------------------------------------------------------------
// English parsing
// ---------------------------------------------------------------------------

export interface EnglishCard {
  /** the milestone's own n value = the card's starting Greek line number, as a string */
  n: string;
  text: string;
}

export interface ParsedEnglishBody {
  cards: EnglishCard[];
  noteCount: number;
}

function sliceEnglishTranslationDiv(xml: string, workId: string): string {
  const bodyStart = xml.indexOf('<body');
  if (bodyStart < 0) fail(workId, 'no <body> found in English source XML');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyEnd < 0 || bodyEnd < bodyStart) fail(workId, 'no </body> found in English source XML');
  return xml.slice(bodyStart, bodyEnd);
}

export function parseEnglishBody(xml: string, workId: string): ParsedEnglishBody {
  let body = sliceEnglishTranslationDiv(xml, workId);

  // Drop <note>...</note> (Evelyn-White's own footnotes) wholesale, replacing
  // each block with a single space so words on either side never merge
  // (verified by direct inspection: several notes abut reading-text words
  // with no surrounding whitespace, e.g. "quick-glancing<note>...</note>Aphrodite").
  let noteCount = 0;
  body = body.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, () => {
    noteCount += 1;
    return ' ';
  });

  // Attribute order matched order-agnostically (see the same note in parseGreekBody above).
  const tokenRe = /<milestone\b(?=[^>]*\bunit="card")[^>]*\bn="([^"]+)"[^>]*\/>|<[^>]+>/g;
  const cards: EnglishCard[] = [];
  let currentN: string | null = null;
  let buf = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const flush = (nextN: string | null): void => {
    if (currentN !== null) {
      const text = cleanText(buf);
      if (text.length === 0) fail(workId, `English card n="${currentN}" is empty after cleaning`);
      cards.push({ n: currentN, text });
    } else if (buf.trim().length > 0) {
      fail(workId, `unexpected reading text before the first card milestone: ${JSON.stringify(buf.trim().slice(0, 120))}`);
    }
    currentN = nextN;
    buf = '';
  };

  while ((match = tokenRe.exec(body))) {
    buf += body.slice(lastIndex, match.index);
    if (match[1] !== undefined) flush(match[1]);
    lastIndex = tokenRe.lastIndex;
  }
  buf += body.slice(lastIndex);
  flush(null);

  if (cards.length === 0) fail(workId, 'no <milestone unit="card"> markers found in English source XML');
  return { cards, noteCount };
}

// ---------------------------------------------------------------------------
// Card assembly (shared by both languages, once boundaries are known)
// ---------------------------------------------------------------------------

export interface CardBucket {
  /** 1-based sequential card position in the poem */
  index: number;
  startLine: number;
  endLine: number;
}

/** Card boundaries (starting Greek line numbers), plus the poem's own final line number. */
export function bucketsFromBoundaries(boundaries: number[], finalLine: number): CardBucket[] {
  return boundaries.map((startLine, i) => ({
    index: i + 1,
    startLine,
    endLine: i + 1 < boundaries.length ? boundaries[i + 1]! - 1 : finalLine,
  }));
}

/** Bucket Greek atoms (in document order) into the given card boundaries, by integer line-number prefix. */
export function bucketGreekAtoms(atoms: GreekAtom[], boundaries: number[], workId: string): GreekAtom[][] {
  const buckets: GreekAtom[][] = boundaries.map(() => []);
  let cardIdx = 0;
  for (const atom of atoms) {
    while (cardIdx + 1 < boundaries.length && atom.linePrefix >= boundaries[cardIdx + 1]!) cardIdx += 1;
    if (atom.kind === 'line' && atom.linePrefix < boundaries[0]!) {
      fail(workId, `line n="${atom.n}" precedes the first card boundary (${boundaries[0]})`);
    }
    buckets[cardIdx]!.push(atom);
  }
  const empties = buckets.map((b, i) => (b.length === 0 ? i : -1)).filter((i) => i >= 0);
  if (empties.length > 0) fail(workId, `card(s) with no lines at bucket index ${empties.join(', ')}`);
  return buckets;
}
