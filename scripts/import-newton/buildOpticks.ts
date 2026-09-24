/**
 * Opticks (4th ed., 1730), Project Gutenberg #33504 - plain-text parser.
 * See classify.ts/buildPrincipia.ts for the shared conventions (scholium-like
 * asides fold into the current item as a further passage; every diagram
 * marker becomes the standard "not yet available" note).
 *
 * Structure confirmed by direct inspection (scripts/import-newton/raw/opticks/
 * pg33504.txt, line numbers as fetched 2026-09-23):
 *   Book I  Part I  (line 160):  Definitions (8) + Axioms (8) + Propositions I-VIII
 *   Book I  Part II (line 2593): Experiments 1-17 (no propositions)
 *   Book II Part I  (line 4278): Observations 1-24ish
 *   Book II Part II (line 5039): Observations + Propositions
 *   Book II Part III(line 5515): Propositions I-XX (Obs. converted to Props)
 *   Book II Part IV (line 6577): Observations + Propositions
 *   Book III Part I (line 7211): Observations, then Queries 1-31 (no further
 *                                 Part II - Newton left Book III "imperfect",
 *                                 by his own words in the Advertisements)
 * "THE FIRST BOOK OF OPTICKS" / "SECOND BOOK" / "THIRD BOOK" are running-title
 * furniture repeated at the top of every Part, not per-Part book markers -
 * the real book boundary is the FIRST time each label is seen.
 */
import { readFileSync } from 'node:fs';
import type { Anomaly, Division, Passage } from './sharedTypes.ts';

export interface OpticksBuildResult {
  divisions: Division[];
  anomalies: Anomaly[];
  bookCounts: Record<string, { props: number; obs: number; exper: number; queries: number; defs: number; axioms: number }>;
}

interface Item {
  kind: 'def' | 'ax' | 'prop' | 'obs' | 'exper' | 'query';
  number: string; // as printed (arabic throughout this source)
  headingRaw: string;
  paragraphs: string[]; // first paragraph carries the marker text itself, verbatim
}

const FURNITURE_LINES = new Set<string>([
  'THE FIRST BOOK OF OPTICKS', 'SECOND BOOK', 'THIRD BOOK', 'OF', 'OPTICKS',
  '_DEFINITIONS_', '_AXIOMS._', '_AXIOMS_', '_PROPOSITIONS._', '_PROPOSITIONS_',
  'TITLE PAGE OF THE 1730 EDITION',
]);

function cleanPara(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function classifyLine(line: string): { kind: Item['kind']; number: string } | null {
  {
    const m = /^DEFIN\.\s+([IVXLC]+)\.?$/.exec(line);
    if (m) return { kind: 'def', number: m[1]! };
  }
  {
    const m = /^AX\.\s+([IVXLC]+)\.?$/.exec(line);
    if (m) return { kind: 'ax', number: m[1]! };
  }
  {
    const m = /^_PROP\._\s+([IVXLC]+)\.\s+(?:THEOR|PROB)\.\s+[IVXLC]+\.?$/.exec(line);
    if (m) return { kind: 'prop', number: m[1]! };
  }
  {
    // Book II Part III prints its 20 propositions in this plainer,
    // non-italicised, no-Theor/Prob-suffix form (confirmed by direct
    // inspection - genuinely different typesetting from Book I's Part I/II
    // "_PROP._ N. THEOR./PROB. N." form; Book II Parts I/II/IV and Book III
    // Part I carry no propositions of their own at all, only Observations
    // and, in Book III, Queries).
    const m = /^PROP\.\s+([IVXLC]+)\.?$/.exec(line);
    if (m) return { kind: 'prop', number: m[1]! };
  }
  return null;
}

const INLINE_MARKER_RE = /_(?:Obs|Exper)\._\s+\d+\.?\s|_(?:Query_|Qu\._|Quest\._)\s*\d+\.?\s/g;

/** Paragraph-initial inline markers (Obs./Exper./Query forms all carry their content on the same line). */
function classifyParaStart(text: string): { kind: Item['kind']; number: string } | null {
  {
    const m = /^_Obs\._\s+(\d+)\.?\s/.exec(text);
    if (m) return { kind: 'obs', number: m[1]! };
  }
  {
    const m = /^_Exper\._\s+(\d+)\.?\s/.exec(text);
    if (m) return { kind: 'exper', number: m[1]! };
  }
  {
    const m = /^_(?:Query_|Qu\._|Quest\._)\s*(\d+)\.?\s/.exec(text);
    if (m) return { kind: 'query', number: m[1]! };
  }
  return null;
}

/**
 * Splits `text` at every place a new Obs./Exper./Query item genuinely
 * begins, including mid-paragraph (the source sometimes opens straight into
 * "Exper. 1." with a lead-in clause on the same physical paragraph). Guarded
 * exactly like the Principia parser's Hypoth./Cor. splitter: a match only
 * counts at the text's own start or right after a "<letter>. " sentence
 * boundary, because Newton's own prose constantly CITES an earlier
 * Observation/Experiment mid-sentence ("...by the 13th Observation..." /
 * "as appears by Exper. 4.") which must never be mistaken for a new item.
 */
function splitOnInlineMarkers(text: string): string[] {
  const starts: number[] = [0];
  let m: RegExpExecArray | null;
  INLINE_MARKER_RE.lastIndex = 0;
  while ((m = INLINE_MARKER_RE.exec(text))) {
    if (m.index === 0) continue;
    const before = text.slice(0, m.index).trimEnd();
    if (before.endsWith('.')) starts.push(m.index);
  }
  if (starts.length === 1) return [text];
  const out: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]!;
    const e = i + 1 < starts.length ? starts[i + 1]! : text.length;
    out.push(text.slice(s, e).trim());
  }
  return out;
}

const ASIDE_RE = /^(?:Cas\.\s*[0-9IVXLC]+\.?|_?Illustration\.?_?|_?Scholium\.?_?|_?Definition\.?_?|_?Cor\.\s*[0-9IVXLC]+\.?)$/;

export function buildOpticks(rawFile: string): OpticksBuildResult {
  const raw = readFileSync(rawFile, 'utf8');
  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK OPTICKS ***';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK OPTICKS ***';
  const s = raw.indexOf(startMarker);
  const e = raw.indexOf(endMarker);
  if (s < 0 || e < 0) throw new Error('STOP: Gutenberg start/end markers not found');
  let body = raw.slice(s + startMarker.length, e);

  // --- Newton's own "Advertisements" (I and II, both signed "I. N.") -----
  // Real front matter in Newton's own words, prefacing the work exactly as
  // the Principia's Author's Preface does - imported as a "prefaces"
  // Division. The UNSIGNED "Advertisement to this Fourth Edition" that
  // follows (describing events after Newton's 1727 death) is the
  // PUBLISHER's own editorial note, not Newton's, and is excluded and
  // disclosed exactly like the Principia's excluded 1846 editorial
  // Dedication (see about.json). The Transcriber's Note is Project
  // Gutenberg's own, likewise excluded.
  const advStart = body.indexOf('Advertisement I');
  const advIEnd = body.indexOf('Advertisement II');
  const advIIEnd = body.indexOf('Advertisement to this Fourth Edition');
  const firstBookStart = body.indexOf('THE FIRST BOOK OF OPTICKS');
  let prefaceDiv: Division | null = null;
  if (advStart >= 0 && advIEnd > advStart && advIIEnd > advIEnd && firstBookStart > advIIEnd) {
    const advI = cleanPara(body.slice(advStart + 'Advertisement I'.length, advIEnd).replace(/\r?\n/g, ' '));
    const advII = cleanPara(body.slice(advIEnd + 'Advertisement II'.length, advIIEnd).replace(/\r?\n/g, ' '));
    prefaceDiv = {
      id: 'prefaces', number: null, ref: null, sourceHeading: "SIR ISAAC NEWTON'S ADVERTISEMENTS", editorialTitle: null,
      children: [
        { id: 'prefaces-advertisement-1', number: 'I', ref: null, sourceHeading: 'Advertisement I', editorialTitle: null, children: [], passages: [{ n: '', text: advI, ref: null }] },
        { id: 'prefaces-advertisement-2', number: 'II', ref: null, sourceHeading: 'Advertisement II', editorialTitle: null, children: [], passages: [{ n: '', text: advII, ref: null }] },
      ],
      passages: [],
    };
    // Skip the whole front-matter block (title page + Advertisements +
    // publisher's unsigned note + transcriber's note) so it is never
    // re-read as ordinary Book I content below.
    body = body.slice(firstBookStart);
  }

  // paragraphs: split on blank lines, join wrapped lines with a single space
  const rawParas = body.split(/\r?\n\s*\r?\n/).map((p) => p.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0));

  const anomalies: Anomaly[] = [];
  const bookDivs: Division[] = [];
  const bookCounts: Record<string, { props: number; obs: number; exper: number; queries: number; defs: number; axioms: number }> = {};

  let bookNum = 0; // 0 = not yet started
  let partNum = 0;
  let bookDiv: Division | null = null;
  let partDiv: Division | null = null;
  let items: Item[] = [];
  let current: Item | null = null;
  /** Paragraphs that arrive while no item is open - genuine reading text in
   * a Part that carries no numbered items of its own, e.g. Book II Part II
   * ("Remarks upon the foregoing Observations"), which is pure discursive
   * prose with no Observation/Proposition markers at all. Never discarded. */
  let orphanParagraphs: string[] = [];
  let seenSecondBook = false;
  let seenThirdBook = false;

  function pushCurrent(): void {
    if (current) items.push(current);
    current = null;
  }

  function flushPart(): void {
    pushCurrent();
    if (!bookDiv) return;
    if (partDiv) {
      if (items.length === 0) {
        // A Part with no numbered items of its own (e.g. Book II Part II,
        // "Remarks upon the foregoing Observations" - pure discursive prose):
        // its text lives directly on the Part's own Division rather than
        // being lost or forced under a fabricated item numbering.
        if (orphanParagraphs.length === 0) {
          throw new Error(`STOP: Part "${partDiv.id}" has neither numbered items nor any reading text at all`);
        }
        partDiv.passages = [{ n: '', text: cleanPara(orphanParagraphs.join('\n\n')), ref: null }];
        anomalies.push({ where: partDiv.id, note: 'This Part carries no numbered Observation/Proposition/Query markers of its own in the source; its text (pure discursive prose) is held directly on this Division rather than under any leaf item.' });
      } else {
        const leadIn: Division[] = [];
        if (orphanParagraphs.length > 0) {
          anomalies.push({ where: partDiv.id, note: `${orphanParagraphs.length} paragraph(s) of lead-in prose appeared before this Part's first numbered item; kept as a leading "intro" leaf Division so no container mixes children with its own passages.` });
          leadIn.push({ id: `${partDiv.id}-intro`, number: null, ref: null, sourceHeading: null, editorialTitle: null, children: [], passages: [{ n: '', text: cleanPara(orphanParagraphs.join('\n\n')), ref: null }] });
        }
        partDiv.children = [...leadIn, ...items.map((it) => itemToDivision(it, bookNum, partNum))];
      }
      bookDiv.children.push(partDiv);
      const c = (bookCounts[`book-${bookNum}`] ??= { props: 0, obs: 0, exper: 0, queries: 0, defs: 0, axioms: 0 });
      for (const it of items) {
        if (it.kind === 'prop') c.props += 1;
        else if (it.kind === 'obs') c.obs += 1;
        else if (it.kind === 'exper') c.exper += 1;
        else if (it.kind === 'query') c.queries += 1;
        else if (it.kind === 'def') c.defs += 1;
        else if (it.kind === 'ax') c.axioms += 1;
      }
    }
    items = [];
    orphanParagraphs = [];
    partDiv = null;
  }

  function startBook(n: number): void {
    flushPart();
    if (bookDiv) bookDivs.push(bookDiv);
    bookNum = n;
    partNum = 0;
    bookDiv = { id: `book-${n}`, number: n === 1 ? 'I' : n === 2 ? 'II' : 'III', ref: null, sourceHeading: null, editorialTitle: null, children: [], passages: [] };
  }

  function startPart(roman: string): void {
    flushPart();
    partNum += 1;
    partDiv = { id: `book-${bookNum}-part-${partNum}`, number: roman, ref: null, sourceHeading: `PART ${roman}.`, editorialTitle: null, children: [], passages: [] };
  }

  function openItem(kind: Item['kind'], number: string, headingRaw: string): void {
    pushCurrent();
    current = { kind, number, headingRaw, paragraphs: [] as string[] };
  }

  /** Appends to the currently open item's paragraphs, if any is open. Reads `current` via a local const to sidestep TS's narrowing-across-closure quirks with a mutated outer `let`. */
  function pushToCurrent(text: string): boolean {
    const cur = current;
    if (!cur) return false;
    cur.paragraphs.push(text);
    return true;
  }

  for (const lines of rawParas) {
    if (lines.length === 0) continue;
    const joined = cleanPara(lines.join(' '));
    if (joined.length === 0) continue;

    // Single-line paragraphs that are pure structural markers or furniture.
    if (lines.length === 1) {
      const line = lines[0]!;
      if (FURNITURE_LINES.has(line)) {
        if (line === 'SECOND BOOK' && !seenSecondBook) { seenSecondBook = true; startBook(2); }
        else if (line === 'THIRD BOOK' && !seenThirdBook) { seenThirdBook = true; startBook(3); }
        else if (line === 'THE FIRST BOOK OF OPTICKS' && bookNum === 0) startBook(1);
        continue;
      }
      const partM = /^_PART\s+([IVXLC]+)\._$/.exec(line);
      if (partM) { startPart(partM[1]!); continue; }
      const structM = classifyLine(line);
      if (structM) { openItem(structM.kind, structM.number, line); continue; }
      if (ASIDE_RE.test(line)) {
        if (pushToCurrent(`${line} `)) continue;
      }
    }

    // Multi-line (or unmatched single-line) paragraph: split at every place a
    // fresh Obs./Exper./Query item genuinely begins (see splitOnInlineMarkers),
    // then feed each segment through the same per-paragraph logic in order.
    for (const segment of splitOnInlineMarkers(joined)) {
      if (segment.length === 0) continue;
      const paraM = classifyParaStart(segment);
      if (paraM) { openItem(paraM.kind, paraM.number, segment.slice(0, 40)); }
      if (!pushToCurrent(segment) && partDiv) orphanParagraphs.push(segment);
      // else: front matter (Advertisements) before Book I Part I even starts - not imported (see about.json)
    }
  }
  startBook(0); // flush the trailing book/part via one more call (n=0 is discarded, only used to flush)
  // (TS narrows `bookDiv` oddly across this many closures reassigning it; an
  // explicit re-annotation sidesteps that rather than fighting the inference.)
  const finalBookDiv = bookDiv as Division | null;
  if (finalBookDiv && finalBookDiv.id !== 'book-0') bookDivs.push(finalBookDiv);

  const divisions: Division[] = [...(prefaceDiv ? [prefaceDiv] : []), ...bookDivs.filter((d) => d.id !== 'book-0')];
  return { divisions, anomalies, bookCounts };
}

function itemToDivision(it: Item, bookNum: number, partNum: number): Division {
  // Each Part restarts its own Observation/Experiment/Proposition numbering
  // independently (confirmed: Book I Part I's Prop. I-VIII and Part II's own
  // separate Prop. I-XI are NOT the same items), so the Part number must be
  // part of the id to keep it unique across the whole work.
  const slug = it.kind;
  const id = `book-${bookNum}-part-${partNum}-${slug}-${it.number}`;
  const text = cleanPara(it.paragraphs.join('\n\n'));
  if (text.length === 0) throw new Error(`STOP: Opticks division "${id}" has empty text`);
  const passage: Passage = { n: '', text, ref: null };
  return { id, number: it.number, ref: null, sourceHeading: it.headingRaw, editorialTitle: null, children: [], passages: [passage] };
}
