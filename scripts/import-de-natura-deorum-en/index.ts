/**
 * Cicero, De Natura Deorum — English translation by Charles Duke Yonge
 * (1888), via English Wikisource's page-scan transclusion, "Cicero's
 * Tusculan Disputations/On the Nature of the Gods" (3 book subpages).
 * Run-once ingestion pipeline.
 *
 *   npm run import:de-natura-deorum-en
 *
 * Reads scripts/import-de-natura-deorum-en/raw/book-{1,2,3}.json (already in
 * the repo - the RENDERED HTML from the MediaWiki action=parse&prop=text API
 * for each of the 3 "Cicero's Tusculan Disputations/On the Nature of the
 * Gods/Book N" subpages, fetched once; nothing is downloaded at run time)
 * and writes:
 *   data/de-natura-deorum-en/work.json       - the GenericWork (3 Books, each
 *                                              a flat list of section divisions)
 *   data/de-natura-deorum-en/about.json      - provenance / licence / prose
 *   data/de-natura-deorum-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-natura-deorum-en`.
 *
 * PAGE TITLES USED (verified via the MediaWiki API's own search/query
 * endpoints before fetching, not assumed from the brief - the literal ASCII
 * apostrophe in "Cicero's" was confirmed to be exactly what the live titles
 * use, and each pageid below was cross-checked against action=query):
 *   "Cicero's Tusculan Disputations/On the Nature of the Gods/Book 1" (pageid 4145576)
 *   "Cicero's Tusculan Disputations/On the Nature of the Gods/Book 2" (pageid 4145578)
 *   "Cicero's Tusculan Disputations/On the Nature of the Gods/Book 3" (pageid 4145582)
 * All THREE fetched subpages carry genuine, complete, real page-scan prose
 * from start to finish - none is a red-linked/unproofread stub (confirmed by
 * direct inspection of every paragraph, not just spot-checked): Book 1 runs
 * pages 209-253ish, Book 2 pages 254-317ish, Book 3 pages 318-361ish of the
 * "1888 Cicero's Tusculan Disputations.djvu" scan, matching the page-scan
 * ranges this import was told to expect for Book 3 in particular.
 *
 * Structure and faithfulness rules: see parseYonge1888.ts's own module doc
 * for the full account of this source's non-uniform section-numeral
 * markup (plain, page-break-interrupted, and the older {{anchor}}-template
 * style) and what is stripped as transport scaffolding (page-number
 * markers, footnote-reference numbers, Yonge's own {{smallrefs}} footnote
 * block, the "BOOK N." title line) versus kept verbatim (everything else,
 * including the wst-anchor numerals' own visible text).
 *
 * Division.ref is null throughout (see types.ts): this source carries no
 * Bekker/chapter milestones of any kind: section numbering here is this
 * 1888 edition's OWN (coarser) roman-numeral count, recovered from the
 * page-scan's own paragraph structure, not the fine Plasberg `§` numbers of
 * the Latin edition in this library.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBookHtml } from './parseYonge1888.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-natura-deorum-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-natura-deorum-en');
const WORK_ID = 'de-natura-deorum-en';

interface Anomaly {
  where: string;
  note: string;
}

const EXPECTED_MAX_SECTION = [44, 67, 40];

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];
  const bookDivisions: Division[] = [];
  let totalFootnoteRefsStripped = 0;
  let totalAnchorStyleNumerals = 0;
  let totalPageBreakInterruptedNumerals = 0;
  const summary: { book: number; sections: number; maxNumber: number; passages: number }[] = [];

  for (let bookNum = 1; bookNum <= 3; bookNum++) {
    const rawFile = join(RAW_DIR, `book-${bookNum}.json`);
    process.stdout.write(`parsing ${rawFile} ...\n`);
    const raw = JSON.parse(readFileSync(rawFile, 'utf8')) as { parse?: { text?: { '*'?: string } } };
    const html = raw.parse?.text?.['*'];
    if (!html) fail(`book-${bookNum}: could not find .parse.text["*"] HTML string in ${rawFile}`);

    const parsed = parseBookHtml(html, bookNum);
    anomalies.push(...parsed.anomalies);
    totalFootnoteRefsStripped += parsed.totalFootnoteRefsStripped;
    totalAnchorStyleNumerals += parsed.totalAnchorStyleNumerals;
    totalPageBreakInterruptedNumerals += parsed.totalPageBreakInterruptedNumerals;

    const maxNumber = parsed.sections[parsed.sections.length - 1]!.number;
    const wantMax = EXPECTED_MAX_SECTION[bookNum - 1]!;
    if (maxNumber !== wantMax) {
      fail(`book-${bookNum}: expected the last section to be numbered ${wantMax}, got ${maxNumber} - re-verify this book's numeral count against the live source before adjusting EXPECTED_MAX_SECTION`);
    }

    // A handful of witnesses in this batch have a section numeral repeat
    // instead of advancing (a probable single-character transcription slip -
    // see the companion De Senectute English importer's "35"/"35b" case,
    // and Book 3's "17" here where "XXVII" prints as "XVII"). The literal
    // source number is kept as this app's Division.number either way; only
    // the id (which this app's routing needs unique) gets a lettered suffix
    // for the second and later occurrences.
    const seenNumber = new Map<number, number>();
    const sectionDivisions: Division[] = parsed.sections.map((s) => {
      const occurrence = (seenNumber.get(s.number) ?? 0) + 1;
      seenNumber.set(s.number, occurrence);
      const passages: Passage[] = s.passages.map((p) => ({ n: '', text: p.text, ref: null }));
      let id = `book-${bookNum}-sec-${s.number}`;
      if (occurrence > 1) {
        const suffix = String.fromCharCode('a'.charCodeAt(0) + occurrence - 1);
        id = `${id}${suffix}`;
        const note = `This source's own numeral "${s.number}" repeats here rather than advancing (occurrence ${occurrence}) - a probable single-character transcription slip in the 1888 print (e.g. "XVII" printed where "XXVII" is contextually expected). Kept literally as printed rather than silently renumbered; only this Division's id is disambiguated ("${id}") for this app's own routing.`;
        anomalies.push({ where: id, note });
        if (passages.length > 0) passages[0]!.anomaly = note;
      }
      return {
        id,
        number: String(s.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages,
      };
    });

    bookDivisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: sectionDivisions,
      passages: [],
    });

    summary.push({
      book: bookNum,
      sections: sectionDivisions.length,
      maxNumber,
      passages: sectionDivisions.reduce((n, d) => n + d.passages.length, 0),
    });
  }

  if (bookDivisions.length !== 3) fail(`expected exactly 3 Book divisions, got ${bookDivisions.length}`);
  const emptySections = bookDivisions.flatMap((b) => b.children).filter((d) => d.passages.length === 0 || d.passages.every((p) => p.text.length === 0));
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry no passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / division refs`,
    note: 'This source carries no Bekker/chapter milestones of any kind; Division.ref is null throughout for every section. Section numbering is this 1888 edition’s own (coarser) roman-numeral count (44 in Book 1, 67 in Book 2, 40 in Book 3), reconstructed from the page-scan’s own paragraph structure - NOT the fine Plasberg "§" section numbers of the Latin edition in this library (124 / 168 / 95); the two numbering schemes do not correspond 1:1 and are never conflated.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalFootnoteRefsStripped} inline footnote-reference markers (numbers only, linking to Yonge's own {{smallrefs}} footnote block at the end of each page-scan) were stripped; the footnote block itself (editorial commentary, not Yonge's translated running text) is removed entirely and not reproduced anywhere in this build.`,
  });
  if (totalAnchorStyleNumerals > 0) {
    anomalies.push({
      where: `${WORK_ID} / structure`,
      note: `${totalAnchorStyleNumerals} section numeral(s) are printed via the older {{anchor}}-template style rather than plain text; every occurrence is logged individually above (its visible text is kept, unlike Metaphysics's anchor-only-paragraph convention - see parseYonge1888.ts).`,
    });
  }
  if (totalPageBreakInterruptedNumerals > 0) {
    anomalies.push({
      where: `${WORK_ID} / structure`,
      note: `${totalPageBreakInterruptedNumerals} section numeral(s) have a page-scan break (zero-width page-number marker) falling immediately before or within them; resolved transparently by stripping the marker before matching, with no effect on the reading text.`,
    });
  }

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };
  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'On the Nature of the Gods',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: 'Bohn’s Classical Library, 1888',
    provenance:
      'English Wikisource, "Cicero’s Tusculan Disputations/On the Nature of the Gods" (3 book subpages), fetched once per book via the MediaWiki action=parse&prop=text API (a page-scan transclusion: action=parse&prop=wikitext for these pages returns only <pages/> transclusion markup, not the assembled text, so the rendered HTML was fetched and parsed with jsdom instead); imported by scripts/import-de-natura-deorum-en. The raw per-book dumps are committed under scripts/import-de-natura-deorum-en/raw/.',
    license:
      "Yonge's 1888 translation is in the public domain (published well over 95 years ago; Yonge died in 1891). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Natura Deorum — English, trans. Yonge',
        paragraphs: [
          'This is Cicero’s De Natura Deorum ("On the Nature of the Gods") in the English translation made by Charles Duke Yonge, first published in Bohn’s Classical Library in 1888. It stands alongside the Latin text (ed. Plasberg) already in this library as a facing English rendering of the same three-book dialogue.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Yonge’s own translator’s footnotes are excluded — see "How it was imported" below. All three books are complete, genuine page-scan transcriptions — unlike this library’s Metaphysics (Ross) English import, there is no missing or unproofread content here to disclose.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., Cicero’s Tusculan Disputations, De Natura Deorum, De Divinatione, De Fato, etc., Bohn’s Classical Library (London: George Bell & Sons, 1888 and reprints). This translation is in the public domain.',
          'The work is divided into 3 Books, each further numbered by this 1888 edition’s own roman-numeral sections (44 in Book 1, 67 in Book 2, 40 in Book 3) — a coarser division than the modern Plasberg Latin edition’s fine §-numbered sections in this library (124 / 168 / 95); the two do not correspond 1:1.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the RENDERED HTML of each "Cicero’s Tusculan Disputations/On the Nature of the Gods/Book N" Wikisource subpage, fetched once through the MediaWiki action=parse&prop=text API and committed under the importer’s raw/ directory. Like this library’s other page-scan Wikisource imports, action=parse&prop=wikitext for these pages returns only <pages index="..." from=X to=Y/> transclusion markup, not the assembled text, so the already-rendered HTML was fetched and parsed with jsdom instead. It is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each numbered section starts with its own roman numeral printed at the very start of a paragraph (e.g. "I. There are many things…"); a small number of these are printed via the older {{anchor}}-template markup style rather than plain text, and a few more have the page-scan’s own page break falling immediately before the numeral — both are resolved transparently (see scripts/import-de-natura-deorum-en/parseYonge1888.ts for the full technical account) with no effect on the reading text. The "BOOK N." title line and Yonge’s own {{smallrefs}}-generated footnote block (editorial commentary, not his translated prose) are removed as page furniture/apparatus; only the inline footnote-reference NUMBER markers are stripped from the running prose (the footnote text itself is not reproduced anywhere in this build).',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and this edition’s own section number. This source carries no Bekker or chapter milestones of any kind, so Division.ref is null throughout — not fabricated. Passage.ref is likewise always null; Passage.n is always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books are present, complete and verified as genuine page-scan transcriptions from start to finish (no red-linked or unproofread stub anywhere) — confirmed by direct inspection of every book, not assumed from a spot check. No paragraph is dropped, merged or reordered except where documented in anomalies.json.',
          'Numeral markup irregularities. A handful of section numerals are printed via the older {{anchor}}-template style, and a few more have a page-scan break falling immediately before them; both are logged individually in anomalies.json and have no effect on the reading text itself.',
          'Numbering scheme. This 1888 edition’s own section numbering (roman numerals, 44/67/40 per book) is coarser than — and does not correspond 1:1 with — the modern Plasberg Latin edition’s fine §-numbered sections (124/168/95) already in this library; the two are never conflated.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  process.stdout.write('\nBooks:\n');
  for (const s of summary) {
    process.stdout.write(`  Book ${s.book}  ${s.sections} sections (I..${s.maxNumber === s.sections ? s.maxNumber : `${s.maxNumber} with gap(s)`})  ${s.passages} passages\n`);
  }
  const totalSections = summary.reduce((n, s) => n + s.sections, 0);
  const totalPassages = summary.reduce((n, s) => n + s.passages, 0);
  process.stdout.write(
    `\n  3 books  ${totalSections} sections  ${totalPassages} passages  ${totalFootnoteRefsStripped} footnote refs stripped  ${totalAnchorStyleNumerals} anchor-style numerals  ${totalPageBreakInterruptedNumerals} page-break-interrupted numerals\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-natura-deorum-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
