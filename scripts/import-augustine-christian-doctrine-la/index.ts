/**
 * Augustine, *De Doctrina Christiana* - Latin text, from Latin Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-augustine-christian-doctrine-la/index.ts
 *
 * Reads scripts/import-augustine-christian-doctrine-la/raw/{prol,I,II,III,IV}.json
 * (already in the repo - the result of the MediaWiki `action=parse&prop=wikitext`
 * API for the Latin Wikisource page family "De Doctrina Christiana/prol",
 * "/I", "/II", "/III", "/IV"). Writes:
 *   data/augustine-christian-doctrine-la/work.json       - the GenericWork
 *   data/augustine-christian-doctrine-la/about.json      - provenance / licence / prose
 *   data/augustine-christian-doctrine-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-augustine-christian-doctrine-shared/validate.ts`.
 *
 * SOURCE SHAPE - verified by direct inspection of all 5 fetched pages (this is
 * the messiest source of the three Augustine works being imported in this
 * batch; five pages, FOUR different internal layouts):
 *
 *   - "prol" (Prologus): a `<div class="verse">` block of flat `<br />`-joined
 *     text. Each unit is either a plain rubric line or a numbered paragraph
 *     "N. text" (a single running number - the Prologus predates the
 *     Book/Chapter/Section citation apparatus, so it is cited by paragraph
 *     number alone, e.g. "prol. 3"). A rubric line, when present, always
 *     immediately precedes the numbered paragraph it titles.
 *
 *   - "I" (Liber Primus): the whole body is ONE `<p>...</p>` block, again
 *     `<br />`-joined, but each numbered unit carries TWO numbers, "N. M. text"
 *     (N = chapter, M = a running section number that never resets across the
 *     whole book - the traditional Book.Chapter.Section citation). A rubric
 *     line, when present, precedes the unit it titles; a chapter with more
 *     than one section can carry a *separate* rubric before each of its
 *     sections (not just its first) - see "Known gaps & anomalies" below for
 *     how the second-and-later rubrics are preserved.
 *
 *   - "IV" (Liber Quartus): same "N. M. text" dual numbering as Book I, but
 *     laid out as ordinary blank-line-separated paragraphs (no `<p>`/`<br />`
 *     at all): each paragraph after the first is exactly one rubric line, a
 *     single `\n`, then "N. M. text"; the very first paragraph has no rubric.
 *
 *   - "II" and "III" (Liber Secundus / Tertius): a completely different
 *     layout - one giant `<ol>` whose `<li>` items are single-number
 *     "N. text" paragraphs (no dual chapter.section numbering is printed at
 *     all here), interleaved with top-level `<p>rubric</p>` tags that sit
 *     BETWEEN `<li>` items (invalid HTML nesting, but that is what the
 *     wikitext contains). Critically, this source's `<p>` tags do double
 *     duty: most are genuine rubrics (always preceded by a `<p>&nbsp;</p>`
 *     spacer), but Book III also uses bare `<p>` tags to lay out an internally
 *     quoted three-line pagan verse (the "Neptune" quotation in II.11) plus
 *     the prose sentence that follows it - those are NOT rubrics and are
 *     folded back into the *previous* `<li>`'s passage text as a continuation,
 *     never discarded and never mistaken for a title. See "How it was
 *     imported" for the exact rule that tells the two apart (whether a
 *     `<p>&nbsp;</p>` spacer precedes the run of `<p>`s or not).
 *
 * IMPORTANT FINDING, worth restating prominently for anyone checking this
 * import: Books II and III's `<p>rubric</p>` tags are almost 1:1 with their
 * numbered paragraphs (63 rubric-bounded groups from 63 paragraphs in Book
 * II; 59 groups from 61 paragraphs in Book III) - NOT the traditional 42-
 * and 37-chapter scheme these two Books carry in the standard critical
 * apparatus (and in the English NPNF translation bundled alongside this
 * Latin text, fetched independently). This transcription simply does not
 * mark the traditional chapter numerals for Books II/III at all; what it
 * marks instead reads like a per-paragraph marginal summary. Rather than
 * invent or reconstruct the traditional 42-/37-chapter boundaries (which
 * this source does not supply and which this importer has no independent way
 * to verify), each rubric-bounded group is used as this work's Chapter
 * division for these two Books - the only structural unit the source itself
 * marks. Passage.n still carries the source's own reliable running paragraph
 * number. See the "Known gaps & anomalies" section of about.json.
 *
 * Faithfulness rules (mirrors scripts/import-isagoge-la and every other
 * importer in this repo): verbatim Latin reading text only; no accent/
 * spelling/capitalisation "fixes" (this source capitalises normally at
 * sentence starts - unlike the other two Augustine Latin sources in this
 * batch - and is kept exactly so). Only wiki/HTML TRANSPORT scaffolding is
 * removed (the `{{titulus2}}` header, `__NOTOC__`, the `<div class="verse">`
 * open tag, the `{{Liber ...}}` nav template, `<p>`/`<li>`/`<ol>` wrapper
 * tags, and a single bare "**" typographic section-break marker in Book I -
 * see the anomaly logged for it). Nothing else - no word, no number, no
 * rubric - is discarded, corrected, or reordered. Every irregularity
 * (repeated/decreasing printed numbers, extra per-section rubrics, the
 * continuation-paragraph quirk) is preserved exactly as printed and logged
 * to anomalies.json; never silently fixed.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../import-augustine-christian-doctrine-shared/bookMeta.ts';
import { cleanText } from '../import-augustine-christian-doctrine-shared/text.ts';
import { LA_ABOUT_SECTIONS, LA_LICENSE, LA_PROVENANCE } from './aboutText.ts';
import type { Division, GenericWork, Passage } from '../../data/augustine-christian-doctrine-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'augustine-christian-doctrine-la');

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

interface RawPassage {
  n: string;
  text: string;
  anomaly?: string;
}
interface RawChapter {
  sourceHeading: string | null;
  printedNumber: string | null;
  passages: RawPassage[];
}

function loadWikitext(file: string): string {
  const path = join(RAW_DIR, file);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    parse?: { wikitext?: string | { '*'?: string } };
  };
  const wt = raw.parse?.wikitext;
  const wikitext = typeof wt === 'string' ? wt : wt?.['*'];
  if (!wikitext) fail(`${file}: could not find .parse.wikitext string in the raw JSON`);
  return wikitext;
}

/** Byte offset right after the {{Liber ...}} nav template's closing "}}". */
function findAfterLiber(wikitext: string, label: string): number {
  if (!wikitext.includes('{{titulus2')) fail(`${label}: {{titulus2 ...}} header template not found`);
  if (!wikitext.includes('__NOTOC__')) fail(`${label}: __NOTOC__ marker not found`);
  const liberIdx = wikitext.indexOf('{{Liber');
  if (liberIdx < 0) fail(`${label}: {{Liber ...}} nav template not found`);
  const closeIdx = wikitext.indexOf('}}', liberIdx);
  if (closeIdx < 0) fail(`${label}: {{Liber ...}} nav template not closed`);
  return closeIdx + 2;
}

/** A single numbered reading unit, already stripped of its own leading number(s). */
interface FlatAtom {
  n: string;
  rubric: string | null;
  text: string;
}
interface DualAtom {
  chapterNum: string;
  sectionNum: string;
  rubric: string | null;
  text: string;
}

/**
 * Group flat "N. text" atoms into Chapters: a non-null rubric starts a new
 * Chapter. `numberedChapters` controls Division.number/printedNumber for the
 * resulting Chapters: true for Books II/III (their single running paragraph
 * number doubles as the only citation number the source provides, so it is
 * meaningful as Division.number too); false for the Prologus, whose rubric-
 * bounded groups are a purely synthetic convenience with no numeral of their
 * own in the source (see the book-0 anomaly note) - Division.number is null
 * for all of them, and they are excluded from the chapter-level monotonicity
 * check (only Passage.n, the real printed paragraph number, is checked there).
 */
function groupByRubric(atoms: FlatAtom[], numberedChapters: boolean): RawChapter[] {
  const chapters: RawChapter[] = [];
  let cur: RawChapter | null = null;
  for (const a of atoms) {
    const text = cleanText(a.text);
    if (text.length === 0) fail(`empty passage text for printed number "${a.n}"`);
    if (a.rubric !== null || cur === null) {
      cur = { sourceHeading: a.rubric, printedNumber: numberedChapters ? a.n : null, passages: [] };
      chapters.push(cur);
    }
    cur.passages.push({ n: a.n, text });
  }
  return chapters;
}

/**
 * Group dual "N. M. text" atoms into Chapters: a chapter-number change starts
 * a new Chapter (this is the reliable signal for Books I/IV, since a chapter
 * can - and does - print a *separate* rubric before more than one of its own
 * sections; only the first such rubric becomes the Chapter's sourceHeading,
 * the rest are preserved on their own Passage's `anomaly` field, never lost).
 */
function groupByChapterNumber(atoms: DualAtom[], bookNum: number, anomalies: Anomaly[]): RawChapter[] {
  const chapters: RawChapter[] = [];
  let cur: RawChapter | null = null;
  let prevChapterNum: string | null = null;
  for (const a of atoms) {
    const text = cleanText(a.text);
    if (text.length === 0) fail(`book ${bookNum}: chapter ${a.chapterNum} section ${a.sectionNum} has empty text after cleaning`);
    if (cur === null || a.chapterNum !== prevChapterNum) {
      cur = { sourceHeading: a.rubric, printedNumber: a.chapterNum, passages: [] };
      chapters.push(cur);
      prevChapterNum = a.chapterNum;
      cur.passages.push({ n: a.sectionNum, text });
    } else if (a.rubric !== null) {
      const note =
        `source prints a marginal rubric before this section even though it is not the first ` +
        `section of chapter "${a.chapterNum}" (that chapter's sourceHeading was already set from its ` +
        `first section): "${a.rubric}" - preserved here on the passage itself, not discarded.`;
      anomalies.push({ where: `book-${bookNum} / chapter ${a.chapterNum} / section ${a.sectionNum}`, note });
      cur.passages.push({ n: a.sectionNum, text, anomaly: note });
    } else {
      cur.passages.push({ n: a.sectionNum, text });
    }
  }
  return chapters;
}

/**
 * Mechanically detect every place the printed chapter number (between
 * consecutive Chapters) or the printed running passage number (between
 * consecutive Passages, book-wide) does not increase by exactly +1, and log
 * it verbatim. Catches repeats, gaps, and decreases alike, without ever
 * correcting the underlying data - matches this repo's "preserve verbatim,
 * always flag" policy.
 */
function checkMonotonicity(bookNum: number, chapters: RawChapter[], anomalies: Anomaly[]): void {
  let prevChapterInt: number | null = null;
  let prevSectionInt: number | null = null;
  for (const ch of chapters) {
    if (ch.printedNumber !== null) {
      const cInt = Number(ch.printedNumber);
      if (Number.isFinite(cInt)) {
        if (prevChapterInt !== null && cInt !== prevChapterInt + 1) {
          anomalies.push({
            where: `book-${bookNum} / chapter printed "${ch.printedNumber}"`,
            note:
              `chapter number is printed as "${ch.printedNumber}" here, which does not follow the ` +
              `previous chapter number ${prevChapterInt} by exactly +1 in this source; kept verbatim ` +
              `as printed (this Division's id is assigned by encounter position, not by this printed ` +
              `numeral - see data/augustine-christian-doctrine-la/types.ts).`,
          });
        }
        prevChapterInt = cInt;
      }
    }
    for (const p of ch.passages) {
      const sInt = Number(p.n);
      if (Number.isFinite(sInt)) {
        if (prevSectionInt !== null && sInt !== prevSectionInt + 1) {
          anomalies.push({
            where: `book-${bookNum} / passage printed "${p.n}"`,
            note:
              `printed running number "${p.n}" does not follow the previous passage's printed number ` +
              `${prevSectionInt} by exactly +1 in this source; kept verbatim as printed, not corrected.`,
          });
        }
        prevSectionInt = sInt;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Per-page parsers
// ---------------------------------------------------------------------------

const FLAT_NUM_RE = /^(\d+)\.\s+([\s\S]*)$/;
const DUAL_NUM_RE = /^(\d+)\.\s*(\d+)\.\s+([\s\S]*)$/;

function parseProl(wikitext: string): { sourceHeading: string; chapters: RawChapter[] } {
  const afterLiber = findAfterLiber(wikitext, 'prol');
  let body = wikitext.slice(afterLiber);
  const headingMatch = /^\s*==PROLOGUS==\s*\n*/.exec(body);
  if (!headingMatch) fail('prol: "==PROLOGUS==" heading not found where expected');
  body = body.slice(headingMatch[0].length);

  const units = body
    .split('<br />')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (units.length === 0) fail('prol: no <br />-delimited units found');

  const atoms: FlatAtom[] = [];
  let pendingRubric: string | null = null;
  for (const u of units) {
    const m = FLAT_NUM_RE.exec(u);
    if (m) {
      atoms.push({ n: m[1]!, rubric: pendingRubric, text: m[2]! });
      pendingRubric = null;
    } else {
      if (pendingRubric !== null) fail(`prol: two rubric lines in a row: "${pendingRubric}" then "${u}"`);
      pendingRubric = u;
    }
  }
  if (pendingRubric !== null) fail(`prol: trailing rubric "${pendingRubric}" with no following numbered paragraph`);

  return { sourceHeading: 'PROLOGUS', chapters: groupByRubric(atoms, false) };
}

function parseBookI(wikitext: string, anomalies: Anomaly[]): { sourceHeading: string; chapters: RawChapter[] } {
  const afterLiber = findAfterLiber(wikitext, 'I');
  let body = wikitext.slice(afterLiber);
  const headingMatch = /^\s*==LIBER PRIMUS==\s*\n*/.exec(body);
  if (!headingMatch) fail('book I: "==LIBER PRIMUS==" heading not found where expected');
  body = body.slice(headingMatch[0].length);

  // The body has no opening <p> (the source never opens one), but does carry
  // a stray, unmatched closing "</p>" immediately before the trailing
  // "<p>&nbsp;</p>" filler - both are stripped together here.
  const fillerMatch = /<\/p>\s*<p>&nbsp;<\/p>\s*$/.exec(body);
  if (!fillerMatch) fail('book I: trailing "</p><p>&nbsp;</p>" filler not found at end of page');
  body = body.slice(0, fillerMatch.index);

  const units = body
    .split('<br />')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (units.length === 0) fail('book I: no <br />-delimited units found');

  const atoms: DualAtom[] = [];
  let pendingRubricParts: string[] = [];
  for (const u of units) {
    if (u === '**') {
      anomalies.push({
        where: 'book-1',
        note:
          'a bare "**" divider (a typographic section-break marker) appears in the source between ' +
          'chapter 15 and chapter 16, on its own <br />-delimited line; treated as print-layout ' +
          'scaffolding (like a horizontal rule) rather than reading text or a rubric, and dropped - ' +
          'noted here rather than silently discarded. It is NOT folded into chapter 16\'s sourceHeading.',
      });
      continue;
    }
    const m = DUAL_NUM_RE.exec(u);
    if (m) {
      const rubric = pendingRubricParts.length > 0 ? pendingRubricParts.join(' ') : null;
      atoms.push({ chapterNum: m[1]!, sectionNum: m[2]!, rubric, text: m[3]! });
      pendingRubricParts = [];
    } else {
      pendingRubricParts.push(u);
    }
  }
  if (pendingRubricParts.length > 0) {
    fail(`book I: trailing rubric(s) with no following numbered paragraph: ${pendingRubricParts.join(' | ')}`);
  }

  return { sourceHeading: 'LIBER PRIMUS', chapters: groupByChapterNumber(atoms, 1, anomalies) };
}

function parseBookIV(wikitext: string, anomalies: Anomaly[]): { sourceHeading: string; chapters: RawChapter[] } {
  const afterLiber = findAfterLiber(wikitext, 'IV');
  const body = wikitext.slice(afterLiber);
  const preambleMatch = /^\s*LIBER QUARTUS\n([^\n]+)\n\s*\n/.exec(body);
  if (!preambleMatch) fail('book IV: "LIBER QUARTUS" heading + argumentum line not found where expected');
  const argumentum = preambleMatch[1]!.trim();
  const rest = body.slice(preambleMatch[0].length);

  const paras = rest
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (paras.length === 0) fail('book IV: no paragraphs found after the preamble');

  const atoms: DualAtom[] = [];
  paras.forEach((p, i) => {
    const nlIdx = p.indexOf('\n');
    let rubric: string | null = null;
    let rest2 = p;
    if (nlIdx >= 0) {
      rubric = p.slice(0, nlIdx).trim();
      rest2 = p.slice(nlIdx + 1).trim();
    }
    const m = DUAL_NUM_RE.exec(rest2);
    if (!m) fail(`book IV: paragraph ${i} does not match "N. M. text" after its optional rubric: ${JSON.stringify(rest2.slice(0, 80))}`);
    if (i === 0 && rubric !== null) fail('book IV: unexpected rubric before the very first paragraph');
    atoms.push({ chapterNum: m[1]!, sectionNum: m[2]!, rubric, text: m[3]! });
  });

  return {
    sourceHeading: `LIBER QUARTUS. ${argumentum}`,
    chapters: groupByChapterNumber(atoms, 4, anomalies),
  };
}

type Token = { t: 'OL' | '/OL' } | { t: 'LI' | 'P'; text: string };

function tokenize(body: string): Token[] {
  const TOKEN_RE = /<ol[^>]*>|<\/ol>|<li>([\s\S]*?)<\/li>|<p>([^<]*)<\/p>/g;
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(body))) {
    if (m[0].startsWith('<ol')) tokens.push({ t: 'OL' });
    else if (m[0] === '</ol>') tokens.push({ t: '/OL' });
    else if (m[1] !== undefined) tokens.push({ t: 'LI', text: m[1] });
    else tokens.push({ t: 'P', text: m[2]! });
  }
  return tokens;
}

/**
 * Books II and III: one big <ol> of "N. text" <li> items, with <p> tags
 * interleaved directly inside the <ol> (invalid HTML, but that's the wikitext).
 * A <p>&nbsp;</p> spacer immediately after an <li>/</ol> means every following
 * <p> up to the next <li> is a genuine rubric for THAT next <li>. Without that
 * spacer, the following <p>(s) are a continuation of the CURRENT (just-closed)
 * <li>'s passage text (used once, for the internally-quoted "Neptune" verse in
 * Book III's section 11, which the source lays out with bare <p> tags outside
 * the <li> that ought to contain them).
 */
function parseOlBook(wikitext: string, bookNum: number, headingLabel: string): { sourceHeading: string; chapters: RawChapter[] } {
  const afterLiber = findAfterLiber(wikitext, String(bookNum));
  const body = wikitext.slice(afterLiber);
  const preambleRe = new RegExp(`^\\s*<p>${headingLabel}</p>\\s*<p>([^<]*)</p>\\s*`);
  const preambleMatch = preambleRe.exec(body);
  if (!preambleMatch) fail(`book ${bookNum}: "<p>${headingLabel}</p><p>argumentum</p>" preamble not found`);
  const argumentum = preambleMatch[1]!.trim();
  const rest = body.slice(preambleMatch[0].length);

  const tokens = tokenize(rest);
  const atoms: FlatAtom[] = [];
  let pendingRubricParts: string[] | null = null;
  let seenNbsp = false;

  for (const tok of tokens) {
    if (tok.t === 'OL' || tok.t === '/OL') continue;
    if (tok.t === 'LI') {
      const mm = FLAT_NUM_RE.exec(tok.text);
      if (!mm) fail(`book ${bookNum}: <li> does not start with "N. ": ${JSON.stringify(tok.text.slice(0, 60))}`);
      const rubric = pendingRubricParts && pendingRubricParts.length > 0 ? pendingRubricParts.join(' ') : null;
      atoms.push({ n: mm[1]!, rubric, text: mm[2]! });
      pendingRubricParts = null;
      seenNbsp = false;
      continue;
    }
    if (tok.t !== 'P') continue;
    const pText = tok.text;
    if (atoms.length === 0) continue; // preamble already consumed above; defensive only
    if (!seenNbsp) {
      if (pText === '&nbsp;') {
        seenNbsp = true;
        pendingRubricParts = [];
      } else {
        // continuation of the immediately preceding <li>'s passage text
        const last = atoms[atoms.length - 1]!;
        last.text = `${last.text} ${pText}`;
      }
    } else if (pText !== '&nbsp;') {
      pendingRubricParts!.push(pText);
    }
  }
  if (pendingRubricParts && pendingRubricParts.length > 0) {
    fail(`book ${bookNum}: trailing rubric with no following <li>: ${pendingRubricParts.join(' | ')}`);
  }

  return { sourceHeading: `${headingLabel}. ${argumentum}`, chapters: groupByRubric(atoms, true) };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];

  const prolWt = loadWikitext('prol.json');
  const iWt = loadWikitext('I.json');
  const iiWt = loadWikitext('II.json');
  const iiiWt = loadWikitext('III.json');
  const ivWt = loadWikitext('IV.json');

  const prol = parseProl(prolWt);
  const bookI = parseBookI(iWt, anomalies);
  const bookII = parseOlBook(iiWt, 2, 'LIBER SECUNDUS');
  const bookIII = parseOlBook(iiiWt, 3, 'LIBER TERTIUS');
  const bookIV = parseBookIV(ivWt, anomalies);

  const parsed = [
    { n: 0, sourceHeading: prol.sourceHeading, chapters: prol.chapters },
    { n: 1, sourceHeading: bookI.sourceHeading, chapters: bookI.chapters },
    { n: 2, sourceHeading: bookII.sourceHeading, chapters: bookII.chapters },
    { n: 3, sourceHeading: bookIII.sourceHeading, chapters: bookIII.chapters },
    { n: 4, sourceHeading: bookIV.sourceHeading, chapters: bookIV.chapters },
  ];

  for (const p of parsed) checkMonotonicity(p.n, p.chapters, anomalies);

  const divisions: Division[] = [];
  for (const p of parsed) {
    const meta = BOOKS[p.n];
    if (!meta || meta.n !== p.n) fail(`bookMeta.ts entry for book ${p.n} not found / mismatched`);
    if (p.chapters.length === 0) fail(`book ${p.n}: no chapters parsed`);

    const children: Division[] = p.chapters.map((ch, idx) => {
      const chapterPos = idx + 1;
      if (ch.passages.length === 0) fail(`book ${p.n} chapter position ${chapterPos}: no passages`);
      const passages: Passage[] = ch.passages.map((pp) => {
        const passage: Passage = { n: pp.n, text: pp.text, ref: null };
        if (pp.anomaly) passage.anomaly = pp.anomaly;
        return passage;
      });
      return {
        id: `book-${p.n}-ch-${chapterPos}`,
        number: ch.printedNumber,
        ref: null,
        sourceHeading: ch.sourceHeading,
        editorialTitle: null,
        children: [],
        passages,
      };
    });

    divisions.push({
      id: `book-${p.n}`,
      number: meta.roman,
      ref: null,
      sourceHeading: p.sourceHeading,
      editorialTitle: meta.en,
      children,
      passages: [],
    });
  }

  // --- corpus-level anomaly notes ------------------------------------------
  anomalies.push({
    where: 'augustine-christian-doctrine-la / all refs',
    note:
      'This Wikisource transcription carries no physical page/line reference of its own. Division.ref ' +
      "and Passage.ref are null throughout; citation is by the printed numbers reflected directly in " +
      "Division.number / Division.id and Passage.n.",
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-la / book-0 (Prologus)',
    note:
      'The Prologus predates the work\'s own Book/Chapter/Section citation apparatus and is cited in the ' +
      'secondary literature by paragraph number alone (e.g. "prol. 3"). The source prints an occasional ' +
      'rubric before some (not all) of its 9 numbered paragraphs; this importer uses each such rubric as a ' +
      'synthetic Chapter boundary (book-0-ch-1..4) purely to fit this app\'s Book->Chapter->Passage schema - ' +
      'Division.number is null for all four of these synthetic chapters since the source assigns them no ' +
      'numeral of its own; Passage.n carries the real printed paragraph number (1-9) throughout.',
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-la / book-2 and book-3 chapter scheme',
    note:
      'IMPORTANT: unlike Books I and IV (explicit "chapter.section" dual numbering) and unlike the English ' +
      'NPNF translation bundled alongside this Latin text (which divides Book II into the traditional 42 ' +
      'chapters and Book III into 37), this Latin Wikisource transcription of Books II and III prints NO ' +
      'chapter numerals at all. What it prints instead is a one-line marginal rubric before nearly every ' +
      'numbered paragraph (63 rubric-bounded groups from 63 paragraphs in Book II, one of them a genuine ' +
      '2-paragraph group; 59 groups from 61 paragraphs in Book III, two of them 2-paragraph groups) - far ' +
      'finer-grained than the traditional chapter scheme. Since this source supplies no way to recover the ' +
      'traditional 42-/37-chapter boundaries, and this importer never invents structure the source does not ' +
      'provide, each rubric-bounded group is used as this work\'s Chapter division for these two Books. ' +
      'Passage.n still carries the source\'s own reliable running paragraph number (matching the traditional ' +
      'section number), but Division.number/Division.id for book-2/book-3 chapters do NOT correspond to the ' +
      'traditional chapter numbering used elsewhere for this work - readers citing by traditional chapter ' +
      'number should consult a critical edition.',
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-la / book-3 section 11 (Neptune quotation)',
    note:
      'Book III, printed paragraph 11, quotes three lines of pagan verse (a Vergilian-style invocation of ' +
      'Neptune) followed by a prose sentence, all laid out in the source as bare top-level <p> tags OUTSIDE ' +
      'the <li> element that nominally contains the rest of that paragraph, rather than as blank-line-joined ' +
      'prose inside it. This importer detects this case (no <p>&nbsp;</p> spacer precedes these <p> tags, ' +
      'unlike every genuine rubric transition) and folds the verse + following sentence back into paragraph ' +
      "11's passage text, joined by single spaces per this repo's normal whitespace-collapsing rule. Nothing " +
      'is lost; the line-break layout of the verse itself is not preserved (this app\'s Passage.text has no ' +
      'line-break/verse formatting model, matching every other importer in this repo).',
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-la / orthography',
    note:
      'No accent, spelling, or capitalisation regularisation of any kind. Unlike the Confessiones and De ' +
      'Civitate Dei Latin sources in this app (which print entirely lowercase), this De Doctrina Christiana ' +
      'transcription capitalises normally at the start of sentences and proper nouns; kept exactly as printed.',
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-la / bare citation numbers',
    note:
      'This source embeds occasional bare digits directly in the reading text after certain phrases (e.g. ' +
      '"Qui habet, dabitur ei 1." in Book I paragraph 1) - almost certainly Scripture cross-reference footnote ' +
      'markers. Unlike every other Augustine source in this app, this page family carries NO <ref>...</ref> ' +
      'markup and NO trailing apparatus/footnote block of any kind (checked directly in all 5 fetched pages: ' +
      'zero occurrences of "<ref", "----", or any footnote template). Since there is no reliable, source-' +
      'internal way to distinguish these bare digits from ordinary reading text, and since discarding them ' +
      'would be an unverifiable guess about the editor\'s intent, they are kept exactly as printed, verbatim, ' +
      'as part of the passage text.',
  });

  // --- write outputs ---------------------------------------------------------
  const work: GenericWork = {
    workId: 'augustine-christian-doctrine-la',
    language: 'la',
    divisions,
  };
  const about = {
    workId: 'augustine-christian-doctrine-la',
    title: 'De Doctrina Christiana',
    author: 'Augustine of Hippo',
    language: 'la' as const,
    provenance: LA_PROVENANCE,
    license: LA_LICENSE,
    sections: LA_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ---------------------------------------------------
  let totalChapters = 0;
  let totalPassages = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const chapters = b.children.length;
    const passages = b.children.reduce((n, c) => n + c.passages.length, 0);
    const chars = b.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);
    totalChapters += chapters;
    totalPassages += passages;
    totalChars += chars;
    process.stdout.write(
      `  ${(b.number ?? '(prol)').padEnd(6)} ${b.id.padEnd(9)} ${String(chapters).padStart(3)} chapter(s)  ${String(passages).padStart(3)} passage(s)  ${chars} chars\n`,
    );
  }
  process.stdout.write(
    `\n  5 books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars\n` +
      `  ${anomalies.length} anomalies logged\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-augustine-christian-doctrine-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
