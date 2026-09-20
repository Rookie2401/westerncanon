/**
 * Cicero, De Legibus - Latin text, via Latin Wikisource (Perseus does NOT
 * have this text - its own __cts__.xml tracking file marks De Legibus
 * "status: not migrated", and the XML file genuinely does not exist in the
 * canonical-latinLit repository - confirmed directly, not assumed). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-de-legibus-la/index.ts
 *
 * Reads (already in the repo; nothing is downloaded)
 *   scripts/import-de-legibus-la/raw/liber-I.json
 *   scripts/import-de-legibus-la/raw/liber-II.json
 *   scripts/import-de-legibus-la/raw/liber-III.json
 * (the MediaWiki action=parse&prop=wikitext API result for
 * https://la.wikisource.org/wiki/De_legibus/Liber_I, /Liber_II, /Liber_III)
 * and writes:
 *   data/de-legibus-la/work.json       - the GenericWork (3 Books, each a
 *                                         flat list of Section divisions,
 *                                         one Passage each)
 *   data/de-legibus-la/about.json      - provenance / licence / prose
 *   data/de-legibus-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-legibus-la/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection of all three pages) ---
 * Each page is plain wikitext: a `{{titulus2|...}}` + `{{Liber|...}}` front-
 * matter header, two `<center>'''...'''</center>` page-title lines, then the
 * dialogue itself (Atticus, Quintus and Marcus speaking, in continuous prose
 * with no markup around speaker names).
 *
 * Book 1 and Book 2 print bracketed paragraph numbers inline, e.g. "[1]",
 * "[34]" - the source's own numbering, sequential 1..63 and 1..69
 * respectively, no gaps. A marker's exact position is NOT reliably at a
 * paragraph or word boundary (Book 1 opens "Atticvs[1] Lucus quidem ille...";
 * some markers fall mid-paragraph in both books) - so this importer splits
 * the continuous text stream at each marker's own exact character position,
 * not at a paragraph/blank-line boundary; whatever falls before the very
 * first marker of a book (here, just "Atticvs" in Book 1 - the speaker
 * attribution for section 1's own speech - and nothing in Book 2) is folded
 * into section 1 rather than discarded or filed unnumbered.
 *
 * Book 3 carries NO bracketed paragraph numbers anywhere (confirmed - this
 * page instead uses `{{pn|N}}` page-number templates and separate Roman-
 * numeral "Caput" chapter markers, I through XX, sequential, no gaps -
 * neither of which is a paragraph/section numbering this app's schema can
 * use). Per this app's fallback policy for a genuinely absent source
 * numbering, Book 3's sections are numbered SEQUENTIALLY BY PARAGRAPH by
 * this importer - editorially-assigned sequential numbers, NOT the source's
 * own; disclosed as such in about.json. Both the `{{pn|N}}` templates and
 * the Roman-numeral Caput markers are stripped as structural scaffolding
 * (never used for Division.ref, which stays null throughout this whole
 * work, per the import brief).
 *
 * Book 3 also breaks off INCOMPLETE: the page's own last line of dialogue
 * ends "...et id ipsum quod dicis exspecto." followed immediately (no
 * space) by a bare "*" and nothing else - no closing formula, mid-argument.
 * This matches the traditional understanding that De Legibus, like De
 * Republica, is incompletely transmitted; confirmed directly against this
 * source rather than assumed.
 *
 * PROVENANCE GAP: this Wikisource transcription cites NO source critical
 * edition anywhere on any of the three pages - no editor, no year. This is
 * disclosed, not resolved or invented - see about.json.
 *
 * Faithfulness rules:
 *   - verbatim Latin reading text only; strip ONLY wiki transport
 *     scaffolding (the front-matter templates, the page-title lines, the
 *     Book 3 `{{pn|N}}`/Roman-numeral apparatus); entity-decode, collapse
 *     whitespace.
 *   - `⟨...⟩` (261 total across the three books) is this source's own
 *     angle-bracket editorial supplement mark (a modern editor's
 *     conjectural restoration of a manuscript gap) - kept 100% verbatim,
 *     never stripped or resolved, flagged via Passage.anomaly (one
 *     occurrence, in Book 2, is 531 characters long - a whole multi-
 *     sentence passage on the "ius Manium", far longer than the ordinary
 *     single-word supplements elsewhere, and is called out with its own
 *     dedicated anomaly note given its length and significance).
 *   - short bracketed spans (single words/word-fragments, e.g. "[tuis]",
 *     "[rari po]", or a literal lacuna mark like "[ . . . . ]") are, by the
 *     same logic, kept 100% verbatim and flagged.
 *   - EDITORIAL JUDGEMENT CALL (flagged prominently in the final report,
 *     not silently applied): FOUR specific longer bracketed spans across
 *     the three books read as a Wikisource-added citation or descriptive
 *     gloss interrupting Cicero's own sentence (each either names an
 *     ancient author + work being cross-referenced, or describes "the
 *     topic/passage on X" as an aside) rather than a textual-critical
 *     supplement patching a syntactic gap - these four are EXCLUDED from
 *     the reading text (identified individually, by exact text match, in
 *     EXCLUDED_GLOSSES below) rather than kept. This is a judgement call,
 *     not a certainty, since Wikisource does not mark the distinction
 *     itself; every one of the four is logged individually with its full
 *     text in anomalies.json.
 *   - a bare "*" standing alone in the running text (5 occurrences outside
 *     the excluded citations, 3 in Book 2 and 2 in Book 3) is this source's
 *     own way of marking a point where Cicero's text is understood to break
 *     off or be lost - kept verbatim (mirroring how a Perseus <gap> is kept
 *     as its literal rendering elsewhere in this app), not stripped; every
 *     occurrence logged individually.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-legibus-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-legibus-la');

const WORK_ID = 'de-legibus-la';

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

function readWikitext(file: string): string {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { parse?: { wikitext?: string | { '*'?: string } } };
  const wt = raw.parse?.wikitext;
  const text = typeof wt === 'string' ? wt : wt?.['*'];
  if (!text) fail(`could not find .parse.wikitext string in ${file}`);
  return text;
}

/**
 * Four longer bracketed spans (across all three books) that read as a
 * Wikisource-added citation or descriptive gloss rather than a textual
 * supplement - see the module doc's "EDITORIAL JUDGEMENT CALL". Matched by
 * exact substring and removed (with surrounding single spaces collapsed)
 * before any other processing.
 */
const EXCLUDED_GLOSSES: { book: 1 | 2 | 3; text: string }[] = [
  { book: 1, text: '[de amicitia locus]' },
  { book: 1, text: '[quod Apollo praecepit Pythius]' },
  { book: 2, text: '[*Plutarch. quaest. Rom. 34]' },
  {
    book: 3,
    text: '[Macrobius de differentiis et societatibus 17,6: Cicero de legibus tertio: Qui poterit socios tueri, si dilectum rerum utilium et inutilium non habebit? Ü convertem lex in omnis est.]',
  },
];

/** Front matter: {{titulus2|...}} template, {{Liber|...}} template, two <center>'''...'''</center> title lines. */
const HEADER_RE = /^\s*\{\{titulus2[\s\S]*?\n\}\}\s*\{\{Liber[\s\S]*?\n\}\}\s*<center>'''[^<]*'''<\/center>\s*<center>'''[^<]*'''<\/center>\s*/;

const ANGLE_RE = /⟨[^⟩]*⟩/g; // ⟨...⟩
/** Non-digit bracket span, e.g. "[tuis]", "[ . . . . ]" - NOT "[12]" (a section-number marker). */
const SQUARE_SUPPLEMENT_RE = /\[(?!\d+\])[^[\]]*\]/g;
const SECTION_MARKER_RE = /\[(\d+)\]/g;

function excerpt(s: string, max = 100): string {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
}

/** Strip excluded citation/gloss spans for one book, logging each individually. Also strips any leftover '' / ''' wiki emphasis markup defensively (none expected in-body; front matter already removed). */
function stripExcludedGlossesAndMarkup(book: 1 | 2 | 3, text: string): string {
  let out = text;
  for (const g of EXCLUDED_GLOSSES) {
    if (g.book !== book) continue;
    const idx = out.indexOf(g.text);
    if (idx < 0) fail(`book ${book}: expected excluded gloss not found verbatim: ${JSON.stringify(g.text.slice(0, 60))}`);
    anomalies.push({
      where: `book-${book}`,
      note: `A bracketed span was excluded from the reading text as a Wikisource-added citation/gloss (editorial judgement call - see the importer's module doc), not Cicero's own words: "${g.text}"`,
    });
    out = out.slice(0, idx) + out.slice(idx + g.text.length);
  }
  const boldItalicHits = out.match(/'{2,3}/g);
  if (boldItalicHits) {
    anomalies.push({ where: `book-${book}`, note: `${boldItalicHits.length} leftover wiki bold/italic marker(s) ('' or ''') found outside the front matter and unwrapped (markup stripped, text kept).` });
    out = out.replace(/'{2,3}/g, '');
  }
  return out;
}

/** Split raw span text into cleaned, non-empty paragraphs (blank-line boundaries), joined "\n\n". */
function toParagraphText(raw: string): string {
  return raw
    .split(/\n\s*\n/)
    .map((s) => cleanText(s))
    .filter((s) => s.length > 0)
    .join('\n\n');
}

/** Books 1 & 2: split the continuous stream at [N] marker positions. */
function parseNumberedBook(book: 1 | 2, wikitext: string): { number: string; text: string }[] {
  const headerMatch = HEADER_RE.exec(wikitext);
  if (!headerMatch) fail(`book ${book}: front-matter header not matched`);
  let body = wikitext.slice(headerMatch[0].length);
  body = stripExcludedGlossesAndMarkup(book, body);

  const marks: { idx: number; n: string; len: number }[] = [];
  let mm: RegExpExecArray | null;
  SECTION_MARKER_RE.lastIndex = 0;
  while ((mm = SECTION_MARKER_RE.exec(body))) marks.push({ idx: mm.index, n: mm[1]!, len: mm[0].length });
  if (marks.length === 0) fail(`book ${book}: no "[N]" section markers found`);
  marks.forEach((mk, i) => {
    if (mk.n !== String(i + 1)) fail(`book ${book}: section marker out of sequence - found "[${mk.n}]" at position ${i + 1}`);
  });

  const spans: { number: string; raw: string }[] = [];
  const preamble = body.slice(0, marks[0]!.idx);
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i]!.idx + marks[i]!.len;
    const end = i + 1 < marks.length ? marks[i + 1]!.idx : body.length;
    spans.push({ number: marks[i]!.n, raw: body.slice(start, end) });
  }
  if (preamble.trim().length > 0) {
    anomalies.push({
      where: `book-${book}-sec-1`,
      note: `${preamble.trim().length} char(s) of running text found before this book's first "[1]" marker ("${excerpt(preamble)}") - folded into section 1 rather than discarded or filed unnumbered.`,
    });
    spans[0]!.raw = preamble + spans[0]!.raw;
  }

  return spans.map((s) => ({ number: s.number, text: toParagraphText(s.raw) }));
}

/** Book 3: no [N] markers - strip {{pn|N}} + Roman-numeral Caput markers, then number paragraphs sequentially. */
function parseBook3(wikitext: string): { number: string; text: string }[] {
  const headerMatch = HEADER_RE.exec(wikitext);
  if (!headerMatch) fail('book 3: front-matter header not matched');
  let body = wikitext.slice(headerMatch[0].length);
  body = stripExcludedGlossesAndMarkup(3, body);

  // Roman-numeral "Caput" markers stand alone at a paragraph's own start, e.g. "I {{pn|1}}Marcus ..."
  // or "II Atque ut ad haec...". Confirmed by direct inspection: exactly I..XX, sequential, no gaps,
  // no false positives (no real paragraph in this text starts with a bare capital-letter token
  // otherwise). Stripped here (with the single trailing space) before {{pn}} removal.
  const paras = body.split(/\n\s*\n/);
  const ROMAN_RE = /^([IVXLCDM]{1,6})\s+/;
  const capsFound: string[] = [];
  const stripped = paras.map((p) => {
    const t = p; // preserve original for non-matching case
    const m = ROMAN_RE.exec(t.trimStart());
    if (m) {
      capsFound.push(m[1]!);
      const idxOfMatch = t.indexOf(m[0]);
      return t.slice(0, idxOfMatch) + t.slice(idxOfMatch + m[0].length);
    }
    return t;
  });
  const EXPECTED_CAPS = Array.from({ length: 20 }, (_, i) => toRoman(i + 1));
  if (capsFound.length !== EXPECTED_CAPS.length || capsFound.some((c, i) => c !== EXPECTED_CAPS[i])) {
    fail(`book 3: expected Caput markers I..XX in sequence, got: ${JSON.stringify(capsFound)}`);
  }
  anomalies.push({
    where: 'book-3',
    note: `This page marks 20 traditional "Caput" (chapter) divisions with an inline Roman numeral (I..XX, sequential, no gaps) before the first paragraph of each chapter. Per the import brief, Division.ref stays null throughout this work, so these numerals are stripped as structural scaffolding (like a milestone elsewhere in this app) rather than used for anything; they are not part of Cicero's own sentence.`,
  });

  let joined = stripped.join('\n\n');
  const pnHits = joined.match(/\{\{pn\|\d+\}\}/g);
  const pnCount = pnHits ? pnHits.length : 0;
  joined = joined.replace(/\{\{pn\|\d+\}\}/g, '');
  anomalies.push({
    where: 'book-3',
    note: `${pnCount} {{pn|N}} page-number template(s) (marking the printed page breaks of whatever edition this transcription follows - see the provenance-gap note) were stripped as scaffolding; not part of Cicero's own text.`,
  });

  const finalParas = joined
    .split(/\n\s*\n/)
    .map((s) => cleanText(s))
    .filter((s) => s.length > 0);

  // Trailing bare "*" (no source text after it) marks where this page's transcription of Book 3
  // breaks off - see the module doc. Kept verbatim; not stripped.
  anomalies.push({
    where: 'book-3 / completeness',
    note:
      'This page’s transcription of Book 3 ends abruptly: the final surviving line of dialogue ' +
      '("Atticus Sic prorsum censeo, et id ipsum quod dicis exspecto.*") is followed immediately by a bare ' +
      '"*" and nothing else - no closing formula, mid-argument (Atticus has just invited Marcus to continue). ' +
      'This matches the traditional understanding that De Legibus, like De Republica, is incompletely ' +
      'transmitted; confirmed directly against this source, not assumed. The trailing "*" itself is this ' +
      'source’s own paratextual mark for "text breaks off here" and is kept verbatim rather than stripped, ' +
      'like the other bare "*" marks elsewhere in this work.',
  });

  return finalParas.map((text, i) => ({ number: String(i + 1), text }));
}

function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let s = '';
  let rem = n;
  for (const [v, sym] of table) {
    while (rem >= v) {
      s += sym;
      rem -= v;
    }
  }
  return s;
}

/** Flag every kept ⟨…⟩ / short-[…] supplement in a section's final text, individually where it's worth it (the one very long span) and via a single passage-level summary otherwise. */
function flagSupplements(book: number, secNumber: string, text: string): string | undefined {
  const angleHits = text.match(new RegExp(ANGLE_RE.source, 'g')) ?? [];
  const squareHits = text.match(new RegExp(SQUARE_SUPPLEMENT_RE.source, 'g')) ?? [];
  const allHits = [...angleHits, ...squareHits];
  if (allHits.length === 0) return undefined;
  const longOne = allHits.find((h) => h.length > 60);
  if (longOne) {
    anomalies.push({
      where: `book-${book}-sec-${secNumber}`,
      note: `A ${longOne.length}-character ⟨…⟩ span is kept verbatim here - far longer than the ordinary single-word supplements elsewhere in this text, beginning ${JSON.stringify(longOne.slice(0, 60))}…. This reads as a substantial passage the source's own editorial tradition marks as belonging to a separate strand of transmission (not a simple gap-filling conjecture); kept 100% verbatim per this work's angle-bracket policy.`,
    });
  }
  return `${allHits.length} editorial supplement/lacuna mark(s) already present in the Wikisource transcription, kept verbatim: ${allHits.slice(0, 8).join(', ')}${allHits.length > 8 ? '…' : ''}`;
}

/** Flag every bare standalone "*" (lacuna mark) in a section's final text, individually. */
function flagStars(book: number, secNumber: string, text: string): void {
  const idxs: number[] = [];
  const re = /\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) idxs.push(m.index);
  for (const idx of idxs) {
    anomalies.push({
      where: `book-${book}-sec-${secNumber}`,
      note: `A bare "*" in the running text (context: "…${excerpt(text.slice(Math.max(0, idx - 30), idx + 10))}…") marks a point this source's transcription treats as a break/lacuna; kept verbatim, not stripped.`,
    });
  }
}

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const raw1 = readWikitext(join(HERE, 'raw', 'liber-I.json'));
  const raw2 = readWikitext(join(HERE, 'raw', 'liber-II.json'));
  const raw3 = readWikitext(join(HERE, 'raw', 'liber-III.json'));

  process.stdout.write(`parsing Liber I (${raw1.length} chars) ...\n`);
  const secs1 = parseNumberedBook(1, raw1);
  process.stdout.write(`  ${secs1.length} sections\n`);

  process.stdout.write(`parsing Liber II (${raw2.length} chars) ...\n`);
  const secs2 = parseNumberedBook(2, raw2);
  process.stdout.write(`  ${secs2.length} sections\n`);

  process.stdout.write(`parsing Liber III (${raw3.length} chars) ...\n`);
  const secs3 = parseBook3(raw3);
  process.stdout.write(`  ${secs3.length} sections (editorially-numbered sequentially - see anomalies.json)\n`);

  const EXPECTED_COUNTS = [63, 69];
  if (secs1.length !== EXPECTED_COUNTS[0]) fail(`book 1: expected ${EXPECTED_COUNTS[0]} sections, got ${secs1.length}`);
  if (secs2.length !== EXPECTED_COUNTS[1]) fail(`book 2: expected ${EXPECTED_COUNTS[1]} sections, got ${secs2.length}`);

  const divisions: Division[] = [
    [1, secs1] as const,
    [2, secs2] as const,
    [3, secs3] as const,
  ].map(([bookNum, secs]) => {
    const children: Division[] = secs.map((s) => {
      if (s.text.length === 0) fail(`book-${bookNum} sec-${s.number} has no surviving text`);
      const supplementNote = flagSupplements(bookNum, s.number, s.text);
      flagStars(bookNum, s.number, s.text);
      const passage: Passage = { n: '', text: s.text, ref: null };
      if (supplementNote) passage.anomaly = supplementNote;
      return {
        id: `book-${bookNum}-sec-${s.number}`,
        number: s.number,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
    });
    return {
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children,
      passages: [],
    };
  });

  anomalies.push({
    where: `${WORK_ID} / provenance`,
    note:
      'Latin Wikisource does not cite a specific source critical edition for any of the three De legibus pages - ' +
      'no editor, no year, no publisher is given ("editio: incognita" / "fons: incognitus" in Wikisource’s own ' +
      'categorisation terms). The Latin text itself is ancient and unquestionably public domain regardless of which ' +
      'modern edition transcribed it, but the specific editorial lineage of this particular transcription is not ' +
      'stated by the source; disclosed here rather than invented - see about.json.',
  });
  anomalies.push({
    where: `${WORK_ID} / numbering scheme`,
    note:
      "Book 1 and Book 2 use this source's own bracketed \"[N]\" paragraph numbers (sequential, no gaps, 63 and 69 " +
      'respectively). Book 3 carries no such numbering at all in this source, so its sections (109 of them) are ' +
      'numbered SEQUENTIALLY BY PARAGRAPH by this importer - editorially-assigned sequential numbers, not the ' +
      "source's own; this is a deliberate, disclosed fallback (see the import brief), not an inconsistency.",
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Legibus',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    provenance:
      'Latin Wikisource, pages "De legibus/Liber I", "/Liber II" and "/Liber III", each fetched once via the ' +
      'MediaWiki action=parse&prop=wikitext API; imported by scripts/import-de-legibus-la. The raw dumps are ' +
      'committed at scripts/import-de-legibus-la/raw/liber-I.json, liber-II.json and liber-III.json. Perseus does ' +
      'not have this text (confirmed directly against its own tracking data, not assumed).',
    license:
      "Cicero's Latin text is itself in the public domain (1st century BC). The digital transcription is taken " +
      'from Latin Wikisource and is available under the Creative Commons Attribution-ShareAlike 4.0 International ' +
      'licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Cicero’s De Legibus — Latin',
        paragraphs: [
          'This is the Latin text of Cicero’s De Legibus ("On the Laws"), his dialogue proposing an ideal legal ' +
            'code to accompany the ideal commonwealth of the companion dialogue De Republica (also bundled in this ' +
            'library, as data/de-republica-la), cast as a conversation among Cicero himself, his brother Quintus, ' +
            'and his friend Atticus.',
          'The text here is the original Latin, verbatim. Nothing is translated, modernised, normalised or silently ' +
            'corrected. No English translation is bundled with this work at this time (none was found on Wikisource ' +
            'or Project Gutenberg during research for this import).',
        ],
      },
      {
        heading: 'The edition — a genuine provenance gap',
        paragraphs: [
          'Unlike this app’s Perseus-sourced Latin texts, which generally name a specific 19th/early-20th-century ' +
            'editor, Latin Wikisource states NO source critical edition anywhere on any of the three De legibus ' +
            'pages used here - no editor, no year, no publisher. This is a genuine gap in what the source itself ' +
            'discloses, not something this import can resolve; the Latin text is unquestionably ancient and public ' +
            'domain regardless, but which modern editorial lineage this particular transcription follows is simply ' +
            'not stated.',
          'The work is divided into 3 Books. Books 1 and 2 carry this source’s own bracketed paragraph numbering ' +
            '(63 and 69 sections respectively); Book 3 carries none, so its 109 sections are numbered sequentially by ' +
            'this importer instead - see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the wikitext of the Latin Wikisource pages "De legibus/Liber I", "/Liber II" ' +
            'and "/Liber III", retrieved once each through the MediaWiki action=parse&prop=wikitext API and committed ' +
            'under the importer’s raw/ directory. It is bundled with the app; nothing is loaded from the network ' +
            'at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer strips only wiki-transport scaffolding: the {{titulus2|...}}/{{Liber|...}} front-matter ' +
            'templates and the two bolded page-title lines at the top of each page. For Books 1-2, the source’s ' +
            'own "[N]" bracketed paragraph markers are used directly as section numbers, splitting the continuous ' +
            'text stream at each marker’s own exact position (not at a paragraph boundary, since a marker can ' +
            'fall mid-sentence). For Book 3, which has no such markers, a separate Roman-numeral "Caput" chapter ' +
            'apparatus (I..XX) and {{pn|N}} page-number templates are stripped as scaffolding, and the remaining ' +
            'text is split into paragraphs and numbered sequentially instead.',
          'EDITORIAL JUDGEMENT CALL: four longer bracketed spans across the three books - each either naming an ' +
            'ancient author/work being cross-referenced, or describing "the topic/passage on X" as an aside, rather ' +
            'than patching a syntactic gap the way the ordinary short supplements do - were judged to be Wikisource-' +
            'added citations/glosses rather than Cicero’s own words, and excluded from the reading text. This is a ' +
            'judgement call, not a certainty (Wikisource marks no distinction of its own here); every one of the ' +
            'four is logged individually, with its full text, in anomalies.json - see also the importer’s module doc.',
          'This source’s own editorial marks are otherwise all kept verbatim: angle-bracket ⟨…⟩ supplements ' +
            '(a modern editor’s conjectural restoration of a manuscript gap - 261 occurrences, one of them 531 ' +
            'characters long), short square-bracket supplements/lacuna marks (e.g. "[tuis]", "[ . . . . ]"), and a ' +
            'handful of bare "*" marks (this source’s own way of marking a point where the text is understood to ' +
            'break off). Every occurrence is flagged via Passage.anomaly and logged individually or summarised in ' +
            'anomalies.json.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Section. Division.ref is null throughout: this source carries no milestone-' +
            'style reference apparatus at all (Book 3’s own Roman-numeral "Caput" markers are a real structural ' +
            'feature of that page but are stripped as scaffolding rather than surfaced as a reference, since this ' +
            'app’s Book->Section schema for this work has no field for a third tier - see the import brief). ' +
            'Passage.ref and Passage.n are always null/\'\'.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Provenance. No source critical edition is named by Latin Wikisource for any of the three pages - see ' +
            '"The edition" above.',
          'Book 3 is incomplete. This page’s own transcription of Book 3 ends abruptly mid-dialogue, mid-argument ' +
            '("...et id ipsum quod dicis exspecto.*" followed by a bare "*" and nothing else) - confirmed directly ' +
            'against this source, matching the traditional understanding that De Legibus, like De Republica, does ' +
            'not survive complete.',
          'Editorially-assigned section numbers in Book 3. This source has no paragraph numbering of its own for ' +
            'Book 3; its 109 sections here are numbered sequentially by this importer - see "The edition" above.',
          'Four bracketed spans excluded as likely Wikisource-added citations/glosses rather than Cicero’s own ' +
            'words - a disclosed editorial judgement call, not a certainty; every one logged individually with its ' +
            'full text in anomalies.json.',
          'All other editorial marks (angle-bracket ⟨…⟩ supplements, short square-bracket supplements/lacuna ' +
            'marks, bare "*" lacuna marks) are kept 100% verbatim throughout and flagged.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  let totalSections = 0;
  let totalChars = 0;
  for (const b of divisions) {
    totalSections += b.children.length;
    for (const s of b.children) totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
  }
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) process.stdout.write(`  book-${b.number}  ${String(b.children.length).padStart(3)} sections\n`);
  process.stdout.write(`\n  3 books  ${totalSections} sections  ${totalChars} chars  ${anomalies.length} anomalies\n`);
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-legibus-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
