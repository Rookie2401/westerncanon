/**
 * Euclid, *Elements* - English translation (Thomas L. Heath, *The Thirteen
 * Books of Euclid's Elements*, translated from the text of Heiberg, with
 * introduction and commentary, Cambridge University Press, 1908). Run-once
 * ingestion pipeline, text-only companion to the bundled Greek (Heiberg)
 * edition in scripts/import-euclid (no diagram images are sourced here -
 * see the top-of-repo task notes and about.json "Diagrams" section).
 *
 *   npm run import:euclid-en
 *
 * Reads scripts/import-euclid-en/raw/tlg1799.tlg001.perseus-eng2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/euclid-elements-en/work.json       - the GenericWork (13 Books, each
 *                                              a 2-level tree of section-type
 *                                              groups and 607 leaf divisions)
 *   data/euclid-elements-en/about.json      - provenance / licence / prose
 *   data/euclid-elements-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:euclid-en`.
 *
 * This importer mirrors the Division/id/citation SCHEME of
 * scripts/import-euclid/index.ts exactly (via the shared BOOK_TITLES/
 * TYPE_META tables in scripts/import-euclid-shared/structure.ts) but is an
 * independent parser: this TEI witness (perseus-eng2, an EPIDOC translation
 * div rather than the Greek witness's edition div) uses a different, richer
 * inline-markup vocabulary and does NOT carry the Greek witness's
 * mis-nesting quirks, so none of the Greek importer's MISPLACED_SPLITS /
 * <del>/<add> / real-diagram logic applies here. See the source-structure
 * notes below, established by direct inspection of the fetched XML (not
 * assumed from the Greek importer's docs):
 *
 *   - Each `<div type="textpart" subtype="book|type|number" ... n="...">`
 *     carries an extra `xml:base="..."` attribute the Greek witness's divs
 *     don't have; the token regex below tolerates any attribute order.
 *   - Book X's six type-groups are spelled `def_1`/`prop_1`/`def_2`/
 *     `prop_2`/`def_3`/`prop_3` in this source (with an underscore, unlike
 *     TYPE_META's `def1`/`prop1`/... keys) - normalised by stripping the
 *     underscore before the TYPE_META lookup, never let leak into an id.
 *   - Common Notions: the div's own `n` attribute is the ORIGINAL longer-list
 *     numbering (e.g. "7", "8" for Book I's 4th/5th common notion), but each
 *     leaf's `<head>` carries Heath's own sequential 1..5 numbering. This
 *     importer uses `<head>` (not `n`) as `Division.number` for `comm_not`
 *     leaves only, so ids/citations read "Common Notion 4", not "...7";
 *     the original longer-list number is kept verbatim, bracketed, inside
 *     the passage prose itself ("[7] Things which coincide...") - not
 *     touched, per the verbatim-text rule.
 *   - `<note type="crit" ...>` (134 total) is Heath's own scholarly
 *     commentary, nested either as a sibling of a leaf's `<p>`s or - in 52
 *     of the 134 cases - genuinely nested INSIDE the still-open final `<p>`
 *     of a leaf (confirmed by direct inspection: `...Q. E. D.<note>...
 *     </note></p>`, no separate `</p>` before the note). Both shapes are
 *     handled uniformly: on `<note`, the parser jumps straight to the
 *     matching `</note>` (notes never nest) without touching visibleBuf,
 *     regardless of whether a `<p>` is currently open, and logs one
 *     anomaly per dropped note. This is editorial commentary, not Euclid's
 *     translated text - excluded from the reading Passage, matching how
 *     apparatus/commentary is dropped elsewhere in this repo's importers.
 *   - `<pb n="V1_153"/>` (678 total) is a page-break milestone. Unlike the
 *     Greek witness (which carries none), this source has many - but they
 *     land mid-sentence as often as at paragraph boundaries (e.g.
 *     "...let<pb n="V1_342"/><emph>FG</emph> be drawn..." - genuinely no
 *     space either side in the encoding), so there is no reliable
 *     paragraph- or sentence-level anchor to hang a `ref` on. Decision:
 *     treated as transport scaffolding, not as a `ref` source - every
 *     `<pb/>`/`<lb/>` is replaced with a single space (never zero-width)
 *     specifically so it can never silently fuse two words together;
 *     `cleanText` then collapses any resulting doubled space. `ref` stays
 *     null throughout, same as the Greek edition. See about.json.
 *   - `<figure></figure>` (493 total, non-self-closing but always empty)
 *     marks a diagram position, same idea as the Greek witness's
 *     `<figure/>`. This edition is deliberately text-only (no images are
 *     sourced for it - see the top-of-repo task notes), and
 *     data/euclid-elements-en/types.ts's Passage has no `figure` field at
 *     all, so every marker is simply logged to anomalies.json (one entry
 *     each) and otherwise dropped - never a fabricated image, never a
 *     silent drop either.
 *   - Inline formatting/citation tags actually used in the running
 *     reading text (confirmed present OUTSIDE any `<note>`, so they are
 *     NOT commentary-only): `<emph>`, `<hi rend="...">`, `<label
 *     resp="perseus">` (Book I only - "Enunciation"/"Proof."/"QED.",
 *     Heath's own pedagogical labels for his first book, dropped by Heath
 *     himself from Book II on - preserved verbatim, not added elsewhere),
 *     `<ref target="elem...">` (Heath's own cross-reference citations,
 *     e.g. "[Post. 3]"), `<foreign xml:lang="grc|lat">`, `<quote>`,
 *     `<term>`. All are unwrapped (tag dropped, text kept) exactly like
 *     the Greek importer unwraps `<num>`. `<bibl>`/`<title>` are also
 *     unwrapped for robustness but were confirmed to occur only inside
 *     `<note>` (i.e. never survive into the reading text in practice).
 *   - `<milestone unit="volume" n="2|3"/>` (2 total, between Books II/III
 *     and IX/X) marks the printed edition's own volume boundaries;
 *     zero-width, no reading-text content.
 *   - No `<del>`/`<add>`/`<num>` anywhere in this source (0 occurrences) -
 *     unlike the Greek witness, this translation carries no encoded
 *     editorial-deletion apparatus at all.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOK_TITLES,
  TYPE_META,
  isTypeCode,
  type TypeCode,
} from '../import-euclid-shared/structure.ts';
import { PROVENANCE, LICENSE, ABOUT_SECTIONS } from './aboutText.ts';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/euclid-elements-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg1799.tlg001.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'euclid-elements-en');

interface Anomaly {
  where: string;
  note: string;
}

/** Independently derived from this source (not assumed from the Greek witness's 611 - see the module doc). */
const EXPECTED_TOTAL_LEAVES = 607;
/** Every `<figure></figure>` marker in the source (confirmed always empty between the tags). */
const EXPECTED_TOTAL_FIGURE_MARKERS = 493;
/** Every `<note type="crit" ...>` scholarly-commentary block (Heath's own notes), dropped from the reading text. */
const EXPECTED_TOTAL_NOTES = 134;

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

function bookIdOf(bookNum: number): string {
  return `book-${bookNum}`;
}
function groupIdOf(bookNum: number, type: TypeCode): string {
  return `${bookIdOf(bookNum)}-${TYPE_META[type].groupIdSuffix}`;
}
function leafIdOf(bookNum: number, type: TypeCode, number: string): string {
  return `${bookIdOf(bookNum)}-${TYPE_META[type].leafInfix}-${number}`;
}

function citationFor(bookNum: number, type: TypeCode, number: string): string {
  const roman = BOOK_TITLES[bookNum - 1]!.number;
  if (type.startsWith('prop')) return `Heath, Elements ${roman}.${number}`;
  return `Heath, Elements ${roman}, ${TYPE_META[type].singular} ${number}`;
}

const excerpt = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text ');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text ...>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  // Structural divs tolerate any attribute order/extra attributes (this
  // witness inserts xml:base between subtype and n); everything else is an
  // exact literal tag this source was confirmed to use (see module doc).
  const tokenRe =
    /<div type="textpart" subtype="(book|type|number)"[^>]*?\sn="([^"]*)"\s*>|<div[^>]*>|<\/div>|<p(?:\s[^>]*)?>|<\/p>|<head>|<\/head>|<note\b[^>]*>|<emph>|<\/emph>|<hi[^>]*>|<\/hi>|<label[^>]*>|<\/label>|<ref[^>]*>|<\/ref>|<foreign[^>]*>|<\/foreign>|<quote>|<\/quote>|<term>|<\/term>|<bibl[^>]*>|<\/bibl>|<title>|<\/title>|<lb[^>]*>|<\/lb>|<pb[^>]*\/>|<milestone[^>]*\/>|<figure[^>]*\/>|<figure[^>]*>|<\/figure>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'other' | 'book' | 'type' | 'number'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentType: TypeCode | null = null;
  let currentGroupDiv: Division | null = null;
  let currentLeafDiv: Division | null = null;
  let currentLeafId = '';

  let inP = false;
  let visibleBuf = '';
  let inHead = false;
  let headBuf = '';
  let figuresThisP = 0;

  let totalLeaves = 0;
  let totalFigureMarkers = 0;
  let totalNotes = 0;
  let totalHistoricalNoteParagraphs = 0;
  const notesByBook: Record<number, number> = {};

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inHead) headBuf += free;
      else if (inP) visibleBuf += free;
    }
    lastIndex = tokenRe.lastIndex;

    const tok = m[0];

    if (m[1] !== undefined) {
      // specific book/type/number div-open
      const kind = m[1] as 'book' | 'type' | 'number';
      const rawN = m[2] ?? '';
      stack.push(kind);
      if (kind === 'book') {
        currentBookNum = Number(rawN);
        if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 13) {
          fail(`unexpected book number "${rawN}"`);
        }
        const meta = BOOK_TITLES[currentBookNum - 1];
        if (!meta) fail(`no BOOK_TITLES entry for book ${currentBookNum}`);
        currentBookDiv = {
          id: bookIdOf(currentBookNum),
          number: meta.number,
          ref: null,
          sourceHeading: null,
          editorialTitle: meta.en,
          children: [],
          passages: [],
        };
        divisions.push(currentBookDiv);
        currentType = null;
        currentGroupDiv = null;
      } else if (kind === 'type') {
        // Only Book X's def_1/prop_1/def_2/prop_2/def_3/prop_3 need the
        // underscore stripped to reach TYPE_META's def1/prop1/... keys;
        // "comm_not" is already exactly a TYPE_META key and must NOT be
        // touched (a blanket strip would mangle it to "commnot").
        const underscoreMatch = /^(def|prop)_([123])$/.exec(rawN);
        const normalized = underscoreMatch ? `${underscoreMatch[1]}${underscoreMatch[2]}` : rawN;
        if (!isTypeCode(normalized)) fail(`unknown section-type code "${rawN}" (normalised "${normalized}") in book ${currentBookNum}`);
        currentType = normalized;
        if (!currentBookDiv) fail(`type div "${rawN}" encountered outside any book`);
        currentGroupDiv = {
          id: groupIdOf(currentBookNum, currentType),
          number: null,
          ref: null,
          sourceHeading: null,
          editorialTitle: TYPE_META[currentType].groupLabel,
          children: [],
          passages: [],
        };
        currentBookDiv.children.push(currentGroupDiv);
        currentLeafDiv = null;
      } else {
        // number
        if (!currentGroupDiv || !currentType) fail(`number div "${rawN}" encountered outside any section-type group`);
        currentLeafId = leafIdOf(currentBookNum, currentType, rawN);
        currentLeafDiv = {
          id: currentLeafId,
          number: rawN,
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        currentGroupDiv.children.push(currentLeafDiv);
        totalLeaves += 1;
      }
    } else if (tok.startsWith('<div')) {
      // generic wrapper div (the subtype-less top-level "translation" div) -
      // must still be pushed so its own closing </div> doesn't pop a real
      // book/type/number frame off the stack.
      stack.push('other');
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'number') {
        currentLeafDiv = null;
      } else if (kind === 'type') {
        currentGroupDiv = null;
        currentType = null;
      } else if (kind === 'book') currentBookDiv = null;
    } else if (tok === '<head>') {
      inHead = true;
      headBuf = '';
    } else if (tok === '</head>') {
      inHead = false;
      if (currentLeafDiv && currentType) {
        const headText = cleanText(headBuf);
        const n = currentLeafDiv.number ?? '';
        if (currentType === 'comm_not') {
          // The div's own n is the original longer-list numbering; Heath's
          // <head> carries his own sequential 1..5 numbering, used as the
          // real Division.number (see module doc).
          if (headText.length === 0) {
            anomalies.push({ where: currentLeafId, note: `Common Notion n="${n}" has an empty <head>; kept the original div n as Division.number instead of Heath's sequential numbering.` });
          } else {
            currentLeafDiv.number = headText;
            currentLeafDiv.id = leafIdOf(currentBookNum, currentType, headText);
            currentLeafId = currentLeafDiv.id;
          }
        } else if (currentType.startsWith('prop')) {
          // Richer printed heading (e.g. "Proposition 1." / "PROPOSITION 19.");
          // kept verbatim as sourceHeading (Division.number stays the plain n).
          currentLeafDiv.sourceHeading = headText;
          const digits = (headText.match(/\d+/) ?? [])[0];
          if (digits !== n) {
            anomalies.push({
              where: currentLeafId,
              note: `Printed heading ${JSON.stringify(headText)} does not contain the expected number "${n}" (this division's real number, from the source div's own n attribute); kept verbatim as sourceHeading rather than corrected - a genuine transcription quirk of this witness, not acted on.`,
            });
          }
        }
        // def/post/def1/def2/def3: <head> is just the bare number, already
        // captured via n - redundant as sourceHeading, so left null.
      }
      headBuf = '';
    } else if (tok === '<p>' || /^<p[\s>]/.test(tok)) {
      inP = true;
      visibleBuf = '';
      figuresThisP = 0;
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(visibleBuf);
      if (!currentLeafDiv) {
        // Books XII and XIII each open with a "HISTORICAL NOTE." essay -
        // Heath's own introductory prose about the book's mathematical
        // history, sitting directly under the Book div BEFORE any
        // Definitions/Propositions type-div opens (confirmed by direct
        // inspection: 13 and 6 <p> paragraphs respectively, no other book
        // has this). This is editorial scholarly commentary, not Euclid's
        // translated text, so it is excluded from the reading text exactly
        // like a <note> - logged individually, never silently dropped.
        if (cleaned.length > 0) {
          totalHistoricalNoteParagraphs += 1;
          anomalies.push({
            where: currentBookDiv ? currentBookDiv.id : bookIdOf(currentBookNum),
            note: `Book-level introductory prose (Heath's own "Historical Note" preceding this book's Definitions/Propositions, not Euclid's translated text) excluded from the reading text: "${excerpt(cleaned)}"`,
          });
        }
        if (figuresThisP > 0) {
          totalFigureMarkers += figuresThisP;
          for (let i = 0; i < figuresThisP; i++) {
            anomalies.push({
              where: currentBookDiv ? currentBookDiv.id : bookIdOf(currentBookNum),
              note: `<figure> diagram marker ${i + 1} of ${figuresThisP} inside this book's "Historical Note" preamble (not a numbered division); dropped, same as every other marker in this text-only edition.`,
            });
          }
        }
        figuresThisP = 0;
      } else {
        if (cleaned.length > 0) {
          const passage: Passage = { n: '', text: cleaned, ref: null };
          currentLeafDiv.passages.push(passage);
        } else {
          anomalies.push({
            where: currentLeafId,
            note: 'A paragraph in this division cleaned to empty text (no visible content once tags were stripped); dropped from the reading text rather than emitted empty.',
          });
        }
        if (figuresThisP > 0) {
          const bookNum = currentBookNum;
          const type = currentType!;
          const number = currentLeafDiv.number ?? '';
          const citation = citationFor(bookNum, type, number);
          totalFigureMarkers += figuresThisP;
          for (let i = 0; i < figuresThisP; i++) {
            anomalies.push({
              where: currentLeafId,
              note: `<figure> diagram marker ${i + 1} of ${figuresThisP} in this division (${citation}); this English edition is text-only (no diagram images are bundled for it - see about.json "Diagrams"), so the marker is dropped without an image or a Passage.figure field.`,
            });
          }
        }
        figuresThisP = 0;
      }
    } else if (tok.startsWith('<note')) {
      // Notes never nest (confirmed by direct inspection: opens === closes
      // === 134, and a plain indexOf search for the next </note> never
      // crosses into a second <note>). Jump straight past the whole block,
      // whether it's a sibling of <p> or genuinely nested inside one still
      // open (52 of the 134 cases - see module doc); visibleBuf/headBuf are
      // never touched either way.
      const closeAt = body.indexOf('</note>', tokenRe.lastIndex);
      if (closeAt < 0) fail(`<note> at book ${currentBookNum} (${currentLeafId || 'no leaf'}) is never closed`);
      const inner = body.slice(tokenRe.lastIndex, closeAt);
      totalNotes += 1;
      notesByBook[currentBookNum] = (notesByBook[currentBookNum] ?? 0) + 1;
      const nAttr = /\sn="([^"]*)"/.exec(tok)?.[1] ?? '';
      anomalies.push({
        where: currentLeafId || bookIdOf(currentBookNum),
        note: `<note> excluded (Heath's own scholarly commentary, not Euclid's translated text)${nAttr ? ` [n="${excerpt(nAttr, 60)}"]` : ''}: "${excerpt(inner.replace(/<[^>]+>/g, ' '))}"`,
      });
      tokenRe.lastIndex = closeAt + '</note>'.length;
      // Keep the outer gap-tracking variable in sync with the manual jump,
      // so the NEXT token's free-text slice starts right after </note>
      // rather than replaying the note's own raw markup into visibleBuf.
      lastIndex = tokenRe.lastIndex;
    } else if (tok === '<pb' || /^<pb[\s/]/.test(tok) || /^<lb[\s>]/.test(tok) || tok === '</lb>' || /^<milestone/.test(tok)) {
      // Page-break / line-break / volume-boundary milestones: never
      // zero-width (a real word can sit flush against either side in this
      // encoding - see module doc), always a single space; cleanText
      // collapses any resulting double space.
      if (inHead) headBuf += ' ';
      else if (inP) visibleBuf += ' ';
    } else if (/^<figure/.test(tok)) {
      if (inP) figuresThisP += 1;
    } else if (tok === '</figure>') {
      // no-op: counted on open above
    }
    // <emph>/</emph>, <hi ...>/</hi>, <label ...>/</label>, <ref ...>/</ref>,
    // <foreign ...>/</foreign>, <quote>/</quote>, <term>/</term>,
    // <bibl ...>/</bibl>, <title>/</title>, and the generic wrapper <div ...>
    // (subtype-less "translation" div): zero-width unwraps by design - their
    // own tag text is recognised (never leaks into visibleBuf/headBuf) but
    // triggers no other action, so the real text between them flows through
    // via the ordinary gap-capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 13) fail(`expected exactly 13 Book divisions, got ${divisions.length}`);

  process.stdout.write(
    `  ${totalLeaves} numbered leaf divisions  ${totalFigureMarkers} <figure> markers  ${totalNotes} <note> commentary blocks dropped\n`,
  );

  if (totalLeaves !== EXPECTED_TOTAL_LEAVES) {
    fail(`expected ${EXPECTED_TOTAL_LEAVES} total numbered leaf divisions, parsed ${totalLeaves}`);
  }
  if (totalFigureMarkers !== EXPECTED_TOTAL_FIGURE_MARKERS) {
    fail(`expected ${EXPECTED_TOTAL_FIGURE_MARKERS} total <figure> markers, parsed ${totalFigureMarkers}`);
  }
  if (totalNotes !== EXPECTED_TOTAL_NOTES) {
    fail(`expected ${EXPECTED_TOTAL_NOTES} total <note> commentary blocks, parsed ${totalNotes}`);
  }

  // --- internal structural consistency (no hardcoded ground-truth table:
  //     see the top-of-repo task notes - this edition may legitimately
  //     diverge from the Greek witness's own hand-verified counts) ---------
  for (const bookDiv of divisions) {
    if (bookDiv.children.length === 0) fail(`${bookDiv.id}: a Book must have at least one section-type group`);
    for (const groupDiv of bookDiv.children) {
      if (groupDiv.children.length === 0) fail(`${groupDiv.id}: a section-type group must have at least one leaf`);
      let prev: number | null = null;
      for (const leaf of groupDiv.children) {
        const n = Number(leaf.number);
        if (!Number.isFinite(n)) fail(`${leaf.id}: non-numeric Division.number ${JSON.stringify(leaf.number)}`);
        if (prev !== null && n !== prev + 1) {
          fail(`${groupDiv.id}: leaf numbers are not a complete increasing sequence (got ...${prev}, ${n}... - a gap or duplicate)`);
        }
        prev = n;
      }
    }
  }

  // --- no leaf should ever be empty, with one documented exception -------
  // Book VI, Definition 5 is the ONLY genuinely empty <p></p> anywhere in
  // this source (confirmed by a corpus-wide scan) - Heath's translation
  // simply omits this definition outright, matching Heiberg's judgement
  // (followed by this app's own Greek edition) that it is a spurious later
  // addition; unlike Book VI Definition 2 ("[Reciprocally related figures.
  // See note.]"), Heath doesn't even print a bracketed placeholder here.
  // Rather than leave a leaf with literally zero passages (breaking the
  // reader's leaf-always-has-content assumption) or fabricate wording of
  // our own, an honest placeholder is inserted and flagged.
  const KNOWN_EMPTY_LEAF_ID = 'book-6-def-5';
  const emptyLeaves: string[] = [];
  const walk = (ds: Division[]): void => {
    for (const d of ds) {
      if (d.children.length === 0 && d.passages.length === 0) emptyLeaves.push(d.id);
      if (d.children.length > 0) walk(d.children);
    }
  };
  walk(divisions);
  const unexpectedEmpty = emptyLeaves.filter((id) => id !== KNOWN_EMPTY_LEAF_ID);
  if (unexpectedEmpty.length > 0) {
    fail(`leaf division(s) unexpectedly carry zero passages: ${unexpectedEmpty.sort().join(', ')}`);
  }
  if (emptyLeaves.includes(KNOWN_EMPTY_LEAF_ID)) {
    const findLeaf = (ds: Division[]): Division | null => {
      for (const d of ds) {
        if (d.id === KNOWN_EMPTY_LEAF_ID) return d;
        if (d.children.length > 0) {
          const found = findLeaf(d.children);
          if (found) return found;
        }
      }
      return null;
    };
    const leaf = findLeaf(divisions);
    if (!leaf) fail(`internal error: could not re-find ${KNOWN_EMPTY_LEAF_ID} to attach its placeholder passage`);
    leaf.passages.push({
      n: '',
      text: '[This definition is omitted in Heath’s translation.]',
      ref: null,
      anomaly:
        'The source is genuinely empty here (a bare <p></p>, the only one anywhere in this witness): Heath’s ' +
        'translation omits Book VI Definition 5 outright, matching Heiberg’s judgement (followed by this ' +
        'app’s Greek edition too) that it is a spurious later addition - unlike Book VI Definition 2, where ' +
        'Heath prints a bracketed placeholder ("[Reciprocally related figures. See note.]"). The bracketed ' +
        'sentence above is an honest placeholder supplied by this importer, not source text.',
    });
    anomalies.push({
      where: KNOWN_EMPTY_LEAF_ID,
      note:
        'Source is a bare <p></p> - genuinely empty, the only such case anywhere in this witness. Heath omits this ' +
        'definition outright (matching Heiberg’s judgement that it is spurious); an honest placeholder passage ' +
        'was inserted rather than leaving this division with zero passages or fabricating wording.',
    });
  }

  // --- the one documented split-bracket porism (Book V.19 - see module doc
  //     / about.json "Known gaps & anomalies"): a lone "[" ends one passage
  //     and a lone "]" begins a later one within the same leaf, verbatim as
  //     printed, never merged or "fixed" -------------------------------------
  let splitBracketLeaves = 0;
  for (const bookDiv of divisions) {
    for (const groupDiv of bookDiv.children) {
      for (const leaf of groupDiv.children) {
        const endsOpen = leaf.passages.some((p) => p.text.trimEnd().endsWith('['));
        const startsClose = leaf.passages.some((p) => p.text.trimStart().startsWith(']'));
        if (endsOpen && startsClose) {
          splitBracketLeaves += 1;
          anomalies.push({
            where: leaf.id,
            note:
              'One passage in this division ends with a lone "[" and a later passage begins with a lone "]" - a ' +
              "Heath-printed bracketed aside (a Porism) whose opening/closing brackets fall on either side of an " +
              'intervening paragraph in this source\'s own paragraph-per-<p> structure. Preserved exactly as printed, ' +
              'split across passages rather than merged or corrected.',
          });
        }
      }
    }
  }

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: 'euclid-elements-en / commentary',
    note:
      `${totalNotes} <note> elements (Heath's own scholarly commentary, not Euclid's translated text) were excluded ` +
      `from the reading text; every occurrence is logged individually above with an excerpt. Per book: ` +
      Object.keys(notesByBook)
        .map(Number)
        .sort((a, b) => a - b)
        .map((b) => `Book ${BOOK_TITLES[b - 1]!.number} (${notesByBook[b]})`)
        .join(', ') +
      '.',
  });
  anomalies.push({
    where: 'euclid-elements-en / diagrams',
    note: `${totalFigureMarkers} <figure> diagram markers total. This edition is deliberately text-only (no images are sourced for it, unlike the bundled Greek edition's Books I-IV); every marker is logged individually above and otherwise dropped, never a fabricated image.`,
  });
  if (totalHistoricalNoteParagraphs > 0) {
    anomalies.push({
      where: 'euclid-elements-en / commentary',
      note:
        `${totalHistoricalNoteParagraphs} paragraphs of book-level "Historical Note" introductory prose (Books XII ` +
        'and XIII only - Heath\'s own essay on the book\'s mathematical history, sitting directly under the Book div ' +
        'before any Definitions/Propositions type-div opens) were excluded from the reading text as editorial ' +
        'commentary, not Euclid\'s translated text; every paragraph is logged individually above with an excerpt.',
    });
  }
  anomalies.push({
    where: 'euclid-elements-en / passage & division refs',
    note:
      'This source carries 678 <pb> page-break milestones, but they land mid-sentence as often as at paragraph ' +
      'boundaries (confirmed by direct inspection - no space on either side in several cases), so there is no ' +
      'reliable anchor to hang a division/passage ref on. Treated as transport scaffolding: replaced with a single ' +
      "space (never zero-width, to guarantee two words are never silently fused) and otherwise dropped; every " +
      'passage and division ref is null, cite by Book and printed number (matching the bundled Greek edition\'s ' +
      'convention), e.g. "Heath, Elements I.47".',
  });
  if (splitBracketLeaves > 0) {
    anomalies.push({
      where: 'euclid-elements-en / passages',
      note: `${splitBracketLeaves} leaf division(s) carry Heath's own bracketed aside split across two passages by this source's paragraph structure - see the individually-logged anomaly for each.`,
    });
  }
  anomalies.push({
    where: 'euclid-elements-en / labels',
    note:
      "Heath's own part-labels (\"Enunciation\", \"Proof.\", \"QED.\") are printed only for Book I's propositions " +
      '(47, 47 and 4 occurrences respectively - Heath drops them from Book II onward as an established convention, ' +
      'not an omission) and are kept verbatim, inline, in the reading text.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = {
    workId: 'euclid-elements-en',
    language: 'en',
    divisions,
  };

  const about = {
    workId: 'euclid-elements-en',
    title: "The Thirteen Books of Euclid's Elements",
    author: 'Euclid',
    language: 'en' as const,
    edition: 'The Thirteen Books of Euclid\'s Elements, translated from the text of Heiberg, with introduction and commentary (Cambridge University Press, 1908)',
    translator: 'Thomas Little Heath',
    provenance: PROVENANCE,
    license: LICENSE,
    sections: ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  const countRec = (ds: Division[]): void => {
    for (const d of ds) {
      totalPassages += d.passages.length;
      totalChars += d.passages.reduce((n, p) => n + p.text.length, 0);
      countRec(d.children);
    }
  };
  countRec(divisions);

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    let leafCount = 0;
    let passageCount = 0;
    const countLeaves = (ds: Division[]): void => {
      for (const d of ds) {
        if (d.children.length === 0) {
          leafCount += 1;
          passageCount += d.passages.length;
        } else countLeaves(d.children);
      }
    };
    countLeaves(b.children);
    process.stdout.write(
      `  ${b.number!.padEnd(6)} ${b.id.padEnd(9)} ${b.children.length} group(s)  ${leafCount} leaves  ${passageCount} passages  "${b.editorialTitle}"\n`,
    );
  }
  process.stdout.write(
    `\n  13 books  ${totalLeaves} leaf divisions (expected ${EXPECTED_TOTAL_LEAVES})  ` +
      `${totalFigureMarkers} figure markers (expected ${EXPECTED_TOTAL_FIGURE_MARKERS})  ` +
      `${totalNotes} notes dropped (expected ${EXPECTED_TOTAL_NOTES})  ${totalPassages} passages  ${totalChars} chars\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:euclid-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
