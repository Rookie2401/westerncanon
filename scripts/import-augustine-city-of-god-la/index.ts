/**
 * Augustine, *De civitate Dei* - Latin Wikisource.
 * Run-once ingestion pipeline (fetch step is separate; see fetch.ts).
 *
 *   npx tsx scripts/import-augustine-city-of-god-la/fetch.ts   (one-time, cached)
 *   npm run import:augustine-city-of-god-la
 *
 * Reads scripts/import-augustine-city-of-god-la/raw/*.json (23 pages: the
 * dedicatory "Prologus" letter to Firmus + Liber I..XXII, each the result of
 * the MediaWiki `action=parse&prop=wikitext` API for
 * https://la.wikisource.org ). Writes:
 *   data/augustine-city-of-god-la/work.json
 *   data/augustine-city-of-god-la/about.json
 *   data/augustine-city-of-god-la/anomalies.json
 *
 * --- Structure discovered by inspecting the live pages (see anomalies.json
 * and the "Known gaps & anomalies" section of about.json for the full
 * writeup) ---
 *
 * "De civitate Dei/Prologus" is NOT the famous literary proem ("Gloriosissimam
 * ciuitatem Dei...") - it is a distinct, separate item: Augustine's short
 * dedicatory COVER LETTER to a man named Firmus, explaining how to bind the
 * 22 books into one, two, or five codices. It is represented here as its own
 * leading top-level division, id 'book-0'.
 *
 * The actual literary proem to the whole work (addressed to Marcellinus,
 * "Gloriosissimam ciuitatem Dei...") is instead found EMBEDDED at the very
 * start of the "Liber I" page itself, marked with a bracket "[Pr]" - the same
 * bracket convention used for the chapter markers "[I]", "[II]", etc. Three
 * OTHER books (V, VI, VII) also carry their own "[Pr]"-marked opening
 * paragraph. Every book with one gets a `book-N-ch-0` division.
 *
 * Chapter markers are normally "[roman]" (checked case by case: Liber III
 * alone uses "==roman==" MediaWiki headings instead - the only book that
 * does). Chapters are numbered by their 1-based POSITION among a book's own
 * markers (never by parsing the printed roman numeral itself), so a mislabeled
 * or duplicated source numeral never desyncs the id scheme - it only produces
 * a flagged anomaly. Liber V misprints its 23rd chapter as "[XXXIII]"
 * (extra X); Liber VIII prints two consecutive chapters both as "[XIX]".
 * Both are preserved verbatim and flagged; both books are otherwise complete.
 *
 * Liber XVIII: after "[XXXI]" the next bracket marker is "[XLVII]" - a real
 * gap in this transcription (chapters "XXXII"-"XLVI", on the minor prophets,
 * were never given their own bracket markers here). The paragraphs are
 * present and complete; they are folded as extra (unnumbered) passages of
 * chapter 31 rather than inventing chapter breaks the source does not mark.
 *
 * Liber XXII: after "[IV]" the next bracket marker is "[XII]" - but UNLIKE
 * Liber XVIII, this transcription's gap is internally structured: chapters
 * 5-11 (including chapter 8's 23-part catalogue of contemporary miracles at
 * Hippo/Carthage) are marked with plain arabic "N." / "N. M." numbering
 * instead of brackets, each preceded by a short caption line. These ARE
 * parsed into proper book-22-ch-5..ch-11 divisions (chapter 8 -> 23 numbered
 * passages) - see parseXXIIGap() - specifically because recovering them keeps
 * every later chapter's printed-roman-vs-position cross-check exact (chapter
 * "[XII]" really is the 12th chapter), where simply folding them (as Liber
 * XVIII's gap is folded) would desync every remaining chapter in the book.
 * Each short caption line is merged as a prefix onto the paragraph it
 * introduces (nothing is dropped; Passage has no separate heading field).
 *
 * Liber XXII's own final passage ("...Amen. Amen.") is followed by one more
 * paragraph: a scribal colophon ("In hoc codice continentur libri sancti
 * Augustini...") summing up the 22-book structure - manuscript-transmission
 * matter, not Augustine's own text. It is kept, verbatim, as its own trailing
 * top-level division ('colophon') rather than as chapter 30's own last
 * passage, so that chapter 30 (and hence the work) still verifiably ends on
 * Augustine's own closing sentence.
 *
 * Faithfulness rules (mirrors scripts/import-isagoge-la): verbatim Latin
 * reading text only; no u/v or spelling regularisation; nothing discarded or
 * silently corrected. Only wiki-transport scaffolding is removed
 * ({{titulus2}}, the {{Liber ...}} prev/next nav template - which prints
 * TWICE per page - <div class=text>/</div>, {{finis}}, {{textquality|N%}}).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/augustine-city-of-god-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'augustine-city-of-god-la');

const ROMANS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII',
];

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

const ABOUT_SECTIONS = [
  {
    heading: 'About the text',
    paragraphs: [
      'Augustine began De Civitate Dei ("The City of God") in 412 AD, two years after the Gothic sack of Rome ' +
        'under Alaric, and finished it in 426. It answers the charge, current among Rome\'s remaining pagan ' +
        'aristocracy, that abandoning the old gods for Christianity had caused the disaster. Addressed to his ' +
        'younger friend Marcellinus, it grew far beyond a single apologetic tract into a twenty-two book history ' +
        'and theology of two "cities" - the earthly city, bound by love of self, and the City of God, bound by ' +
        'love of God - interwoven from Creation to the Last Judgment.',
      'The first ten books argue against Roman religion: books 1-5 against worshipping the gods for the sake of ' +
        'temporal happiness, books 6-10 against worshipping them for the sake of the life to come, closing with a ' +
        'sustained engagement with Platonist philosophy. The remaining twelve books (11-22) trace the origin, ' +
        'history, and destined ends of the two cities, culminating in Book 22\'s account of the resurrection of ' +
        'the body and the eternal life of the redeemed - the "Amen. Amen." on which the whole work closes.',
      'Augustine\'s own dedicatory letter to a correspondent named Firmus - included here as its own division, ' +
        '"Letter to Firmus" - explains that he wrote the twenty-two books to be bound as a reader saw fit: as one ' +
        'codex, as two (10 books + 12), or as five.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'The reading text is the Latin Wikisource transcription of De civitate Dei, itself sourced from ' +
        'thelatinlibrary.com. Orthography is classical and unregularised throughout: u/v are not distinguished ' +
        '("ciuitas", "aduersus"), matching the edition exactly. Chapters are marked in most books with a bracketed ' +
        'roman numeral, e.g. "[I]", "[II]" - Liber III alone uses MediaWiki "==roman==" headings instead. No ' +
        'chapter in this edition carries a printed rubric/title.',
      'This particular transcription is not uniform in its numbering. A handful of genuine irregularities in the ' +
        'source are preserved verbatim and individually flagged in anomalies.json rather than silently corrected ' +
        '- see "Known gaps & anomalies" below.',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'Fetched from the Latin Wikisource MediaWiki API (`action=parse&prop=wikitext`) for the page family ' +
        '"De civitate Dei/Prologus" and "De civitate Dei/Liber I" through "Liber XXII" (23 pages total). Each raw ' +
        'API response is cached under scripts/import-augustine-city-of-god-la/raw/ so the importer never needs to ' +
        're-fetch the source to rebuild work.json.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'Each of the 22 books is a top-level division (book-1 .. book-22); each book\'s chapters are numbered by ' +
        'their 1-based POSITION among that book\'s own chapter markers, not by parsing the printed roman numeral ' +
        '- so a mislabeled or duplicated source numeral never desynchronises the id scheme, it only produces a ' +
        'flagged anomaly. Four books (I, V, VI, VII) carry their own un-numbered opening "[Pr]" paragraph in this ' +
        'edition; each becomes that book\'s chapter 0 (e.g. book-1-ch-0), sourceHeading "Praefatio".',
      'Two items of front/back matter that are not part of any single book are represented as their own ' +
        'top-level divisions: \'book-0\' (Augustine\'s dedicatory letter to Firmus, from the separate ' +
        '"De civitate Dei/Prologus" page - see the anomaly on this below, since it is easy to mistake for the ' +
        'work\'s literary proem) and \'colophon\' (a short scribal note on the 22-book structure that follows, ' +
        'in the source, immediately after the work\'s own final sentence).',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Every irregularity below is preserved verbatim in the reading text; anomalies.json records the same list ' +
        'with a machine-readable {where, note} entry per item.',
      '"De civitate Dei/Prologus" is Augustine\'s dedicatory letter to Firmus about binding the 22 books, NOT the ' +
        'work\'s own literary proem - that famous opening ("Gloriosissimam ciuitatem Dei...", addressed to ' +
        'Marcellinus) is embedded inside the "Liber I" page itself, marked "[Pr]", and is represented as ' +
        'book-1-ch-0.',
      'Liber V misprints its 23rd chapter marker as "[XXXIII]" (an extra X) instead of "[XXIII]"; Liber VIII ' +
        'prints two consecutive, genuinely distinct chapters both as "[XIX]". Both are kept exactly as printed; ' +
        'Division.number is the 1-based position, not the printed numeral, and the mismatch is flagged.',
      'Liber XVIII gives no bracket markers for the traditional chapters "[XXXII]" through "[XLVI]" (on the minor ' +
        'prophets); that content is folded in as extra passages of chapter 31 rather than inventing chapter ' +
        'breaks the source does not mark. Every later chapter in that book is consequently offset from its ' +
        'printed roman numeral by 15 (flagged individually).',
      'Liber XXII briefly switches numbering convention: chapters 5-11 (including chapter 8\'s 23-part catalogue ' +
        'of contemporary miracles at Hippo and Carthage) are marked with plain arabic "N."/"N. M." numbering, ' +
        'each usually preceded by a short caption line, instead of brackets. These were recovered into proper ' +
        'chapter/passage divisions (chapter 8\'s 23 sub-numbers become passages n="1".."23"); each caption is ' +
        'merged verbatim as a prefix onto the paragraph it introduces, since Passage has no separate heading ' +
        'field.',
    ],
  },
];

function readRawWikitext(slug: string): string {
  const file = join(RAW_DIR, `${slug}.json`);
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { parse?: { wikitext?: { '*'?: string } | string } };
  const wt = raw.parse?.wikitext;
  const text = typeof wt === 'string' ? wt : wt?.['*'];
  if (!text) {
    process.stderr.write(`STOP: could not find .parse.wikitext string in ${file}\n`);
    process.exit(1);
  }
  return text;
}

/** Strip wiki-transport scaffolding common to every "De civitate Dei" page. */
function stripScaffold(wikitext: string, where: string): string {
  let text = wikitext;
  const beforeTitulus = text.length;
  text = text.replace(/\{\{titulus2[\s\S]*?\n\}\}/, '');
  if (text.length === beforeTitulus) {
    process.stderr.write(`STOP: ${where}: {{titulus2 ...}} template not found / not stripped.\n`);
    process.exit(1);
  }
  text = text.replace(/<div class=text>/g, '');
  text = text.replace(/<\/div>/g, '');
  const beforeLiber = text.length;
  text = text.replace(/\{\{Liber[\s\S]*?\n\}\}/g, '');
  if (text.length === beforeLiber) {
    process.stderr.write(`STOP: ${where}: {{Liber ...}} nav template not found / not stripped.\n`);
    process.exit(1);
  }
  text = text.replace(/\{\{finis\}\}/gi, '');
  text = text.replace(/\{\{textquality\|[^}]*\}\}/gi, '');
  return text.trim();
}

function splitParagraphs(block: string): string[] {
  return block
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function makePassages(block: string): Passage[] {
  return splitParagraphs(block).map((para) => ({ n: '', text: cleanText(para), ref: null }));
}

/** A single bracket-marker occurrence: `[Pr]`, `[I]`, `[II]`, ... */
interface BracketMarker {
  idx: number;
  len: number;
  roman: string; // 'Pr' or a roman numeral
}

function findBracketMarkers(text: string): BracketMarker[] {
  const re = /\[(Pr|[IVXLCDM]+)\]/g;
  const out: BracketMarker[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ idx: m.index, len: m[0].length, roman: m[1] });
  return out;
}

/**
 * Liber XXII's gap between "[IV]" and "[XII]": chapters 5-11 are marked with
 * plain arabic numbering ("5.", "6. 1.", "6. 2.", ... "8. 23.", "9.", "10.",
 * "11. 1." ... "11. 5.") instead of brackets, each numbered paragraph usually
 * preceded by a short caption paragraph. Returns one Division per recovered
 * chapter (positions 5-11); the trailing orphan caption ("Quae aequalitas
 * habebitur...", with no numbered paragraph of its own before the gap ends)
 * is returned separately so the caller can prefix it onto chapter XII.
 */
function parseXXIIGap(gapText: string): { chapters: Division[]; trailingCaption: string | null } {
  const paras = splitParagraphs(gapText);
  // paras[0] is "[IV] ..." itself - the caller already handles chapter 4 from
  // the bracket-segment logic, but the segment passed to bracket-segment logic
  // stops BEFORE the "[V]"-equivalent content starts, i.e. paras[0] here is
  // discarded by the caller (it re-derives chapter 4 itself). We only look at
  // paras[1:].
  const rest = paras.slice(1);
  const NUM_RE = /^(\d+)\.\s+(?:(\d+)\.\s+)?([\s\S]*)$/;

  type Entry = { chapter: number; sub: string | null; text: string };
  const entries: Entry[] = [];
  let pendingCaption: string[] = [];
  for (const para of rest) {
    const mm = NUM_RE.exec(para);
    if (mm) {
      const chapter = Number(mm[1]);
      const sub = mm[2] ?? null;
      let body = mm[3];
      if (pendingCaption.length > 0) {
        body = `${pendingCaption.join(' ')} ${body}`;
        pendingCaption = [];
      }
      entries.push({ chapter, sub, text: body });
    } else {
      pendingCaption.push(para);
    }
  }
  const trailingCaption = pendingCaption.length > 0 ? pendingCaption.join(' ') : null;

  const chapterNumbers = [...new Set(entries.map((e) => e.chapter))].sort((a, b) => a - b);
  const chapters: Division[] = [];
  for (const chNum of chapterNumbers) {
    const chEntries = entries.filter((e) => e.chapter === chNum);
    const passages: Passage[] = chEntries.map((e) => ({
      n: e.sub ?? '',
      text: cleanText(e.text),
      ref: null,
    }));
    chapters.push({
      id: `book-22-ch-${chNum}`,
      number: String(chNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages,
    });
  }
  anomalies.push({
    where: 'augustine-city-of-god-la / book-22 (chapters 5-11)',
    note:
      'This Wikisource transcription switches from bracket "[roman]" chapter markers to plain arabic ' +
      '"N." / "N. M." numbering for chapters 5-11 (the gap between "[IV]" and "[XII]"), each numbered ' +
      'paragraph normally preceded by a short caption line (e.g. "Quid mundus crediderit de Romulo."). ' +
      'These captions carry no dedicated field in the Passage/Division schema, so each is merged verbatim ' +
      'as a prefix onto the paragraph it introduces, nothing dropped. Chapter 8 (the catalogue of ' +
      'contemporary miracles at Hippo and Carthage) is sub-numbered "8. 1." through "8. 23."; those become ' +
      'passages n="1".."23" of book-22-ch-8. A stray section-spanning caption, "Caro resurget (11-21)", ' +
      'precedes chapter 11 with no chapter number of its own; it is merged onto book-22-ch-11\'s first passage.',
  });
  return { chapters, trailingCaption };
}

function parseBracketBook(bookIdx: number, bodyText: string): Division[] {
  const bookNum = bookIdx + 1;
  const where = `augustine-city-of-god-la / book-${bookNum}`;
  const markers = findBracketMarkers(bodyText);
  if (markers.length === 0) {
    process.stderr.write(`STOP: ${where}: no bracket chapter markers found.\n`);
    process.exit(1);
  }

  const chapters: Division[] = [];
  let position = 0; // 1-based, excludes 'Pr'
  let xxiiTrailingCaption: string | null = null; // stashed book-22 ch.4->ch.12 gap caption
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const segStart = marker.idx + marker.len;
    const segEnd = i + 1 < markers.length ? markers[i + 1].idx : bodyText.length;
    let segText = bodyText.slice(segStart, segEnd);

    if (marker.roman === 'Pr') {
      const passages = makePassages(segText);
      if (passages.length === 0) {
        process.stderr.write(`STOP: ${where}: [Pr] proem has no passages.\n`);
        process.exit(1);
      }
      if (passages.length > 1) {
        anomalies.push({ where: `${where}-ch-0`, note: `[Pr] proem has ${passages.length} paragraphs (expected 1)` });
      }
      chapters.push({
        id: `book-${bookNum}-ch-0`,
        number: null,
        ref: null,
        sourceHeading: 'Praefatio',
        editorialTitle: null,
        children: [],
        passages,
      });
      continue;
    }

    // --- Book XXII's chapter-5-11 gap: special-cased (see parseXXIIGap doc) ---
    if (bookNum === 22 && marker.roman === 'IV' && markers[i + 1]?.roman === 'XII') {
      position += 1; // chapter 4 itself
      const passages4 = makePassages(splitParagraphs(segText)[0] ?? '');
      // segText's OWN first paragraph is chapter 4's text; parseXXIIGap discards
      // that paragraph and recovers chapters 5-11 from the rest of segText.
      chapters.push({
        id: `book-22-ch-4`,
        number: String(position),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: passages4,
      });
      const { chapters: gapChapters, trailingCaption } = parseXXIIGap(segText);
      chapters.push(...gapChapters);
      position += gapChapters.length; // now equals 11
      xxiiTrailingCaption = trailingCaption;
      continue;
    }
    if (bookNum === 22 && marker.roman === 'XII' && xxiiTrailingCaption) {
      segText = `${xxiiTrailingCaption} ${segText}`;
      anomalies.push({
        where: `${where}-ch-12`,
        note:
          'chapter opens with a caption ("Quae aequalitas habebitur...") stranded at the end of the ' +
          'arabic-numbered gap (see book-22 chapters 5-11 anomaly); merged as a prefix here since it ' +
          'thematically introduces this chapter\'s content on bodily stature at the resurrection',
      });
      xxiiTrailingCaption = null;
    }

    position += 1;
    const expectedRoman = ROMANS_BY_INT[position];
    if (expectedRoman && marker.roman !== expectedRoman) {
      anomalies.push({
        where: `${where}-ch-${position}`,
        note: `source prints chapter marker "[${marker.roman}]" at position ${position} (expected "[${expectedRoman}]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("${position}"), not the printed numeral`,
      });
    }

    const passages = makePassages(segText);
    if (passages.length === 0) {
      process.stderr.write(`STOP: ${where}-ch-${position}: no passages.\n`);
      process.exit(1);
    }
    // Multi-paragraph chapters are normal in this text (Augustine's chapters
    // vary widely in length) and are NOT flagged here. The one place a
    // multi-paragraph chapter genuinely signals a transcription gap - Liber
    // XVIII chapter 31, which folds in un-bracketed content for the missing
    // "[XXXII]".."[XLVI]" - is flagged once, below, after this book's chapter
    // list is complete (see the bookNum === 18 block).
    chapters.push({
      id: `book-${bookNum}-ch-${position}`,
      number: String(position),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages,
    });
  }
  if (bookNum === 18) {
    const ch31 = chapters.find((c) => c.number === '31');
    if (ch31 && ch31.passages.length > 1) {
      anomalies.push({
        where: `${where}-ch-31`,
        note:
          `This Wikisource transcription gives no bracket markers for the traditional chapters "[XXXII]" ` +
          `through "[XLVI]" (on the minor prophets Abdias/Naum/Ambacum etc.) - the next bracket after ` +
          `"[XXXI]" is "[XLVII]". Rather than invent chapter breaks the source does not mark, that content ` +
          `is folded in as ${ch31.passages.length} passages of chapter 31 (all text preserved, nothing ` +
          `discarded). Every following chapter's printed roman numeral is consequently offset from its ` +
          `1-based position by 15 (e.g. this book's last chapter prints "[LIV]" at position 39); each is ` +
          `individually flagged above.`,
      });
    }
  }
  return chapters;
}

const ROMANS_BY_INT: Record<number, string> = {};
ROMANS.forEach((r, i) => (ROMANS_BY_INT[i + 1] = r));
// Book XVIII and XXII run past XXII (up to LIV); extend the lookup table.
const EXTRA_ROMANS = [
  'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII',
  'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL', 'XLI', 'XLII',
  'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L', 'LI', 'LII', 'LIII', 'LIV',
];
EXTRA_ROMANS.forEach((r, i) => (ROMANS_BY_INT[23 + i] = r));

/** Book III alone uses "==roman==" MediaWiki headings instead of "[roman]" brackets. */
function parseHeadingBook(bookIdx: number, bodyText: string): Division[] {
  const bookNum = bookIdx + 1;
  const where = `augustine-city-of-god-la / book-${bookNum}`;
  const re = /^==\s*(Pr|[IVXLCDM]+)\s*==\s*$/gm;
  const markers: { idx: number; len: number; roman: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyText))) markers.push({ idx: m.index, len: m[0].length, roman: m[1] });
  if (markers.length === 0) {
    process.stderr.write(`STOP: ${where}: no "==roman==" heading markers found.\n`);
    process.exit(1);
  }
  anomalies.push({
    where,
    note:
      'This is the only book in the Latin Wikisource transcription that marks its chapters with ' +
      '"==roman==" MediaWiki headings instead of "[roman]" brackets; parsed the same way, position-based.',
  });

  const chapters: Division[] = [];
  let position = 0;
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const segStart = marker.idx + marker.len;
    const segEnd = i + 1 < markers.length ? markers[i + 1].idx : bodyText.length;
    const segText = bodyText.slice(segStart, segEnd);
    position += 1;
    const expectedRoman = ROMANS_BY_INT[position];
    if (expectedRoman && marker.roman !== expectedRoman) {
      anomalies.push({
        where: `${where}-ch-${position}`,
        note: `source prints chapter heading "==${marker.roman}==" at position ${position} (expected "==${expectedRoman}=="); preserved, Division.number set to position`,
      });
    }
    const passages = makePassages(segText);
    if (passages.length === 0) {
      process.stderr.write(`STOP: ${where}-ch-${position}: no passages.\n`);
      process.exit(1);
    }
    chapters.push({
      id: `book-${bookNum}-ch-${position}`,
      number: String(position),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages,
    });
  }
  return chapters;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const divisions: Division[] = [];
  let colophonPassage: Passage | undefined;

  // --- book-0: "Prologus" = Augustine's dedicatory letter to Firmus --------
  const prologusRaw = readRawWikitext('prologus');
  const prologusBody = stripScaffold(prologusRaw, 'prologus');
  const prologusPassages = makePassages(prologusBody);
  if (prologusPassages.length === 0) {
    process.stderr.write('STOP: prologus (Letter to Firmus) has no passages.\n');
    process.exit(1);
  }
  divisions.push({
    id: 'book-0',
    number: null,
    ref: null,
    sourceHeading: 'Prologus',
    editorialTitle: 'Letter to Firmus',
    children: [],
    passages: prologusPassages,
  });
  anomalies.push({
    where: 'augustine-city-of-god-la / book-0',
    note:
      'Latin Wikisource\'s "De civitate Dei/Prologus" page is Augustine\'s short dedicatory COVER LETTER to ' +
      'Firmus about binding the 22 books into codices - not the work\'s own literary proem. The famous ' +
      'opening "Gloriosissimam ciuitatem Dei..." (addressed to Marcellinus) is a separate text, embedded at ' +
      'the very start of the "Liber I" page and marked "[Pr]" there; it is represented as book-1-ch-0.',
  });

  // --- 22 books --------------------------------------------------------
  for (let i = 0; i < ROMANS.length; i++) {
    const roman = ROMANS[i];
    const slug = `liber-${String(i + 1).padStart(2, '0')}-${roman}`;
    const raw = readRawWikitext(slug);
    const body = stripScaffold(raw, slug);
    const bookNum = i + 1;

    let chapters: Division[];
    if (bookNum === 3) {
      chapters = parseHeadingBook(i, body);
    } else {
      chapters = parseBracketBook(i, body);
    }

    // Liber XXII: split off the trailing scribal colophon (after "Amen. Amen.")
    // from chapter 30's own last passage - see module doc comment.
    if (bookNum === 22) {
      const lastChapter = chapters[chapters.length - 1];
      const lastPassages = lastChapter.passages;
      if (lastPassages.length < 2) {
        process.stderr.write('STOP: book-22 final chapter: expected >= 2 passages (closing sentence + colophon).\n');
        process.exit(1);
      }
      const popped = lastPassages.pop()!;
      if (!popped.text.startsWith('In hoc codice continentur')) {
        process.stderr.write(
          `STOP: book-22 final chapter: expected the last passage to be the scribal colophon ` +
            `("In hoc codice continentur..."), got: ${JSON.stringify(popped.text.slice(0, 60))}\n`,
        );
        process.exit(1);
      }
      colophonPassage = popped;
      anomalies.push({
        where: 'augustine-city-of-god-la / colophon',
        note:
          'Liber XXII\'s final chapter is followed, in the source, by one more paragraph: a scribal colophon ' +
          '("In hoc codice continentur libri sancti Augustini de ciuitate Dei contra paganos numero XXII...") ' +
          'summarising the 22-book structure - manuscript-transmission matter, not part of Augustine\'s own ' +
          'text. Kept verbatim as its own trailing top-level division (\'colophon\') rather than as chapter ' +
          '30\'s own last passage, so the work\'s final chapter still verifiably ends on Augustine\'s own ' +
          'closing sentence ("...Deo mecum gratias congratulantes agant. Amen. Amen.").',
      });
    }

    divisions.push({
      id: `book-${bookNum}`,
      number: roman,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapters,
      passages: [],
    });
  }

  if (!colophonPassage) {
    process.stderr.write('STOP: colophon passage was not captured while parsing book-22.\n');
    process.exit(1);
  }
  divisions.push({
    id: 'colophon',
    number: null,
    ref: null,
    sourceHeading: 'Colophon',
    editorialTitle: null,
    children: [],
    passages: [colophonPassage],
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = { workId: 'augustine-city-of-god-la', language: 'la', divisions };

  const about = {
    workId: 'augustine-city-of-god-la',
    title: 'De Civitate Dei',
    author: 'Augustine of Hippo',
    language: 'la' as const,
    edition: 'Latin Wikisource transcription (from thelatinlibrary.com)',
    provenance: 'Latin Wikisource, "De civitate Dei" (text from thelatinlibrary.com).',
    license: 'Latin text public domain; transcription CC BY-SA 4.0 (Wikisource).',
    sections: ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary --------------------------------------------------
  let totalChapters = 0;
  let totalPassages = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const d of divisions) {
    const chapterCount = d.children.length;
    const passageCount =
      d.children.reduce((n, c) => n + c.passages.length, 0) + d.passages.length;
    const chars =
      d.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0) +
      d.passages.reduce((m, p) => m + p.text.length, 0);
    totalChapters += chapterCount;
    totalPassages += passageCount;
    totalChars += chars;
    process.stdout.write(
      `  ${d.id.padEnd(10)} ${(d.number ?? '-').padEnd(6)} ${String(chapterCount).padStart(2)} chapter(s) ${String(passageCount).padStart(3)} passage(s) ${String(chars).padStart(7)} chars\n`,
    );
  }
  process.stdout.write(
    `\n  ${divisions.length} top-level divisions, ${totalChapters} chapters, ${totalPassages} passages, ${totalChars} chars\n`,
  );
  process.stdout.write(`  ${anomalies.length} anomalies recorded\n`);
  process.stdout.write('\nDone (work.json/anomalies.json written; about.json written separately). \n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
