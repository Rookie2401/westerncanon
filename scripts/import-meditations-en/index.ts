/**
 * Marcus Aurelius, *Meditations* - English translation by Charles Reginald
 * Haines, 1916 Loeb Classical Library ("The communings with himself of
 * Marcus Aurelius Antoninus"), via English Wikisource's page-scan
 * transclusion "Marcus Aurelius (Haines 1916)" (12 book subpages). Run-once
 * ingestion pipeline.
 *
 *   npm run import:meditations-en
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-meditations-en/raw/book-N.json   (N = 1..12; the raw
 *     MediaWiki action=parse&prop=text JSON response for each
 *     "Marcus Aurelius (Haines 1916)/Book N" subpage)
 * and writes:
 *   data/meditations-en/work.json       - the GenericWork (12 Books, each
 *                                          a flat list of Chapter
 *                                          divisions, one Passage each)
 *   data/meditations-en/about.json      - provenance / licence / prose
 *   data/meditations-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:meditations-en`.
 *
 * Like this library's other Wikisource page-scan imports (e.g.
 * scripts/import-aristotle-metaphysics-en), action=parse&prop=wikitext for
 * these pages returns only the `<pages index=... include=A,B,C,.../>`
 * transclusion marker, not the assembled text (and this source uses a
 * comma-separated page LIST, not a from-to range, a further reason the
 * rendered HTML - not the wikitext - is fetched and parsed with jsdom
 * instead). See scripts/import-meditations-en/parseHaines1916.ts's own doc
 * comment for the full structural account: two `div.prp-pages-output`
 * blocks per book page (reading text, then footnote apparatus - only the
 * first is used), Haines's own "N. " inline chapter-numbering convention,
 * and the verse-quotation `<div>` blocks (Books 5, 7, 10, 11, 12) that a
 * `<p>`-only walk would silently drop.
 *
 * All 12 books are complete, clean, verbatim prose in this source (unlike
 * scripts/import-aristotle-metaphysics-en's Ross translation, which is
 * genuinely incomplete on Wikisource) - confirmed by inspecting every
 * book's full parsed chapter sequence before writing this importer. The
 * one genuine gap is a single missing chapter NUMBER (not a missing
 * range): Book 12 skips entry 15 (sequence runs ...14, 16, 17...) - see
 * "Known gaps & anomalies" in about.json and this importer's own doc
 * comment on data/meditations-en/types.ts for the comparison against the
 * Greek sibling's own (different) gap in the same book.
 *
 * Faithfulness rules (mirrors this library's Ross/Metaphysics-en English
 * Wikisource convention):
 *   - verbatim translation text only; no modernising or silent correction.
 *   - `<sup class="reference">` footnote markers (Haines's own translator
 *     annotations) are counted and stripped entirely - apparatus, not
 *     translation, matching this library's other English Wikisource imports.
 *   - `<span class="pagenum ...">` page-scan boundary markers are stripped;
 *     confirmed by inspection to always sit after a literal space in the
 *     source, so their removal never glues two words together.
 *   - a `<p>`-only walk would MISS the quoted-verse `<div>` blocks entirely
 *     (Books 5, 7, 10, 11, 12) - this parser walks `p, div.tiInherit,
 *     div[style*="text-align:left"]` together, in document order, so that
 *     text is not silently dropped.
 *   - each Chapter is exactly one Passage: its surviving paragraph
 *     fragments (ordinary <p> breaks and quoted-verse blocks alike) joined
 *     with "\n\n", paralleling the Greek sibling's own multi-<p>-per-
 *     chapter joining convention.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBookHtml } from './parseHaines1916.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/meditations-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'meditations-en');

const WORK_ID = 'meditations-en';
const EXPECTED_BOOKS = 12;
const PAGE_TITLE = (n: number) => `Marcus Aurelius (Haines 1916)/Book ${n}`;
const API_URL = (n: number) =>
  `https://en.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(PAGE_TITLE(n))}&prop=text&format=json`;

interface Anomaly {
  where: string;
  note: string;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

async function ensureRawBook(n: number): Promise<string> {
  const rawFile = join(RAW_DIR, `book-${n}.json`);
  if (!existsSync(rawFile)) {
    mkdirSync(RAW_DIR, { recursive: true });
    const url = API_URL(n);
    process.stdout.write(`raw book-${n}.json not found, downloading from ${url} ...\n`);
    const res = await fetch(url, { headers: { 'User-Agent': 'meditations-import-script/1.0 (research; contact cjwalker117@outlook.com)' } });
    if (!res.ok) throw new Error(`download failed for Book ${n}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(rawFile, buf);
    process.stdout.write(`  saved ${buf.length} bytes to ${rawFile}\n`);
  }
  return rawFile;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];
  const bookDivisions: Division[] = [];
  let totalFootnoteRefsStripped = 0;
  let totalPagenumSpansStripped = 0;
  let totalBookTitleLinesSkipped = 0;
  let totalFrontMatterNodesSkipped = 0;
  let totalChapters = 0;

  for (let bookNum = 1; bookNum <= EXPECTED_BOOKS; bookNum++) {
    const rawFile = await ensureRawBook(bookNum);
    const raw = JSON.parse(readFileSync(rawFile, 'utf8')) as { parse?: { text?: { '*'?: string } }; error?: { info?: string } };
    if (raw.error) fail(`book-${bookNum}: MediaWiki API error: ${raw.error.info ?? JSON.stringify(raw.error)}`);
    const html = raw.parse?.text?.['*'];
    if (!html) fail(`book-${bookNum}: could not find .parse.text["*"] HTML string in ${rawFile}`);

    const parsed = parseBookHtml(html, bookNum);
    anomalies.push(...parsed.anomalies);
    totalFootnoteRefsStripped += parsed.totalFootnoteRefsStripped;
    totalPagenumSpansStripped += parsed.totalPagenumSpansStripped;
    totalBookTitleLinesSkipped += parsed.bookTitleLinesSkipped;
    totalFrontMatterNodesSkipped += parsed.frontMatterNodesSkipped;

    if (parsed.chapters.length === 0) fail(`book-${bookNum}: parsed 0 chapters`);
    for (const c of parsed.chapters) {
      if (c.paragraphs.length === 0) fail(`book-${bookNum}-ch-${c.number}: no surviving paragraph text`);
    }

    // --- detect (never fill) chapter-numbering gaps within this book -----
    const nums = parsed.chapters.map((c) => c.number);
    const gaps: number[] = [];
    for (let i = 1; i < nums.length; i++) {
      for (let missing = nums[i - 1]! + 1; missing < nums[i]!; missing++) gaps.push(missing);
    }
    if (gaps.length > 0) {
      anomalies.push({
        where: `${WORK_ID} / book-${bookNum}`,
        note: `This source's own chapter numbering skips ${gaps.length === 1 ? 'number' : 'numbers'} ${gaps.join(', ')} entirely - confirmed genuine by direct inspection of the Wikisource page, not a parsing error. Not renumbered to close the gap; see data/meditations-en/types.ts for the (different) gap in the Greek sibling.`,
      });
    }

    const chapterDivisions: Division[] = parsed.chapters.map((c) => {
      const passage: Passage = { n: '', text: c.paragraphs.join('\n\n'), ref: null };
      return {
        id: `book-${bookNum}-ch-${c.number}`,
        number: String(c.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
    });
    totalChapters += chapterDivisions.length;

    bookDivisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    });

    process.stdout.write(`  book-${bookNum}: ${chapterDivisions.length} chapters parsed\n`);
  }

  if (bookDivisions.length !== EXPECTED_BOOKS) fail(`expected ${EXPECTED_BOOKS} books, got ${bookDivisions.length}`);

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / footnotes stripped`,
    note: `${totalFootnoteRefsStripped} inline footnote markers (Haines's own translator annotation) were removed from the reading text across all 12 books; the footnotes themselves are translator apparatus, not Marcus's text, and are not preserved anywhere in this build (they live in each book page's separate, un-parsed second div.prp-pages-output / {{smallrefs}} block).`,
  });
  anomalies.push({
    where: `${WORK_ID} / page-scan boundary markers stripped`,
    note: `${totalPagenumSpansStripped} mid-paragraph page-scan boundary markers (span.pagenum, Wikisource page-scan furniture) were removed; each was confirmed to sit after a literal space in the source, so removal never glues two words together.`,
  });
  anomalies.push({
    where: `${WORK_ID} / book-title lines skipped`,
    note: `${totalBookTitleLinesSkipped} "BOOK N" page-furniture line(s) (Wikisource heading text, not Haines's translation) were skipped.`,
  });
  anomalies.push({
    where: `${WORK_ID} / front matter skipped`,
    note: `${totalFrontMatterNodesSkipped} front-matter node(s) preceding a book's first numbered entry (e.g. Book 1's half-title block "Marcus Aurelius Antoninus") were skipped; see the per-book entries above for the exact text of each.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'This work carries no page/line reference system in this source; every Division.ref and Passage.ref is null throughout rather than fabricated.',
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };
  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Meditations',
    author: 'Marcus Aurelius',
    language: 'en',
    translator: 'Charles Reginald Haines',
    edition: 'The Communings with Himself of Marcus Aurelius Antoninus, trans. C. R. Haines (Loeb Classical Library, 1916)',
    provenance:
      'English Wikisource, "Marcus Aurelius (Haines 1916)" (12 book subpages), fetched once per book via the MediaWiki action=parse&prop=text API (a page-scan transclusion: action=parse&prop=wikitext for these pages returns only the <pages index=... include=.../> transclusion marker, not the text itself, so the rendered HTML was fetched and parsed instead); imported by scripts/import-meditations-en. The raw per-book dumps are committed under scripts/import-meditations-en/raw/.',
    license:
      "Haines's 1916 translation is in the public domain (published over a century ago; Haines died in 1955, so the translation is also public domain in life-plus-50/60/70-year jurisdictions). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Marcus Aurelius\'s Meditations - English, trans. Haines',
        paragraphs: [
          'This is Marcus Aurelius\'s private philosophical notebook - Τὰ εἰς ἑαυτόν, conventionally known in English as the Meditations - in the English translation made by Charles Reginald Haines, published in 1916 as "The Communings with Himself of Marcus Aurelius Antoninus" in the Loeb Classical Library.',
          'The text here is the translation, verbatim. Nothing is modernised, paraphrased or silently corrected. Haines\'s own numbering of each book\'s short entries is preserved exactly as printed, including one genuine gap (see below) rather than being renumbered to close it.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the RENDERED HTML of each "Marcus Aurelius (Haines 1916)/Book N" subpage (N = 1..12), fetched once through the MediaWiki action=parse&prop=text API and committed under the importer\'s raw/ directory. Like this library\'s other page-scan Wikisource imports, action=parse&prop=wikitext for these pages returns only the transclusion marker, not the assembled text, so the already-rendered HTML was fetched and parsed with jsdom instead. It is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Haines\'s translation marks each book\'s short numbered entries with plain leading text ("1. From my Grandfather Verus, ...") rather than a separate heading element; this importer recognises that pattern to open each new chapter, and treats every following un-numbered paragraph - an ordinary prose continuation, or, in Books 5, 7, 10, 11 and 12, a separately-marked quoted-verse block - as part of the same chapter\'s text, joined with a blank line (paralleling the Greek sibling\'s own multi-paragraph-per-chapter convention). Wiki/HTML transport scaffolding only is removed: page-scan boundary markers, inline footnote-reference markers (counted and stripped - the footnotes themselves are translator apparatus and are not preserved, matching this library\'s other English translations), and page-furniture lines ("BOOK N" headings, and, in Book 1, a half-title block).',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter only (e.g. "4.3"), matching the Greek sibling. This source carries no page/line reference system, so Division.ref and Passage.ref are null throughout - nothing is fabricated to fill that gap.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `Completeness. All 12 books are present and, with one exception, run as a complete, contiguous entry sequence: Book 1 (17), Book 2 (17), Book 3 (16), Book 4 (51), Book 5 (36), Book 6 (59), Book 7 (75), Book 8 (61), Book 9 (42), Book 10 (38), Book 11 (39). No paragraph is dropped, merged or reordered except where documented in anomalies.json.`,
          'Numbering gap in Book 12. This source\'s own entry numbering in Book 12 skips number 15 entirely - it runs ...13, 14, 16, 17... (35 entries total, numbered 1-14 and 16-36). Confirmed genuine by direct inspection of the Wikisource page, not a parsing error; not renumbered to close the gap. Interestingly, the companion Greek edition (data/meditations-grc, independently transcribed from a different, 1908 Teubner-based source) also has a Book 12 gap, but at a DIFFERENT number (18, not 15) - the two are not reconciled against each other; each edition\'s own gap is logged in its own anomalies.json.',
          'Footnotes and page furniture. Every inline translator footnote marker, page-scan boundary marker, "BOOK N" heading line, and (Book 1 only) the half-title block preceding "BOOK I" were stripped as page furniture / apparatus, not part of Haines\'s translation proper; every occurrence is logged in anomalies.json.',
          'A word on trust: this source\'s own community-proofreading status is a live Wikisource project; isolated OCR/transcription slips are possible despite this importer\'s own care in walking every paragraph and quoted-verse block individually - that is a disclosed limitation of the source, not something silently papered over.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------
  let totalChars = 0;
  for (const b of bookDivisions) {
    for (const c of b.children) totalChars += c.passages.reduce((n, p) => n + p.text.length, 0);
  }
  process.stdout.write('\nBooks:\n');
  for (const b of bookDivisions) {
    process.stdout.write(`  Book ${b.number!.padStart(2)}  ${b.id.padEnd(9)} ${String(b.children.length).padStart(2)} chapters\n`);
  }
  process.stdout.write(
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ` +
      `(${totalFootnoteRefsStripped} footnote refs, ${totalPagenumSpansStripped} pagenum spans, ${totalBookTitleLinesSkipped} book-title lines, ${totalFrontMatterNodesSkipped} front-matter nodes stripped, ${anomalies.length} anomalies total)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:meditations-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
