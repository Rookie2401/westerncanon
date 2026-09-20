/**
 * Cicero, De Finibus Bonorum et Malorum - English translation by Charles
 * Duke Yonge (Bohn's Classical Library, 1891 printing of his 1853
 * translation), via English Wikisource's page-scan transclusion of "The
 * Academic Questions, Treatise De Finibus, and Tusculan Disputations / De
 * Finibus, a Treatise on the Chief Good and Evil" (5 Book subpages). Run-once
 * ingestion pipeline.
 *
 *   npm run import:de-finibus-en
 *
 * Reads scripts/import-de-finibus-en/raw/de-finibus-book-N.json (N = 1..5;
 * already in the repo - the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API for each of the 5
 * ".../De_Finibus,_a_Treatise_on_the_Chief_Good_and_Evil/Book_N" subpages;
 * action=parse&prop=wikitext for these pages returns only a bare
 * `<pages index="..." from=X to=Y/>` transclusion marker, not the assembled
 * text - see scripts/import-aristotle-metaphysics-en for the same technique
 * used earlier in this app). Writes:
 *   data/de-finibus-en/work.json       - the GenericWork (5 Books, each a
 *                                         flat list of Section divisions,
 *                                         one Passage each)
 *   data/de-finibus-en/about.json      - provenance / licence / prose
 *   data/de-finibus-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-finibus-en`.
 *
 * Structure (confirmed by direct inspection of all 5 fetched book
 * subpages): each page's rendered HTML carries exactly one (Book 4) or two
 * (Books 1,2,3,5) `<div class="prp-pages-output">` blocks - the FIRST is
 * always the reading text itself; the second, when present, is a
 * `{{smallrefs}}`-generated `<div class="reflist wst-smallrefs">` footnote
 * list (Yonge's/the editor's own footnotes - translator's commentary, not
 * Cicero's text) which this importer strips entirely (Book 4 happens to
 * carry no footnotes at all, hence only one block there). Only the FIRST
 * block is read.
 *
 * UNLIKE the Wikisource "Metaphysics (Ross, 1908)" source used elsewhere in
 * this app, this text has no separate chapter-heading elements at all: the
 * traditional Ciceronian chapter number is simply printed inline as the
 * first word of certain `<p>` elements' text, e.g. "XVII. And I will now
 * explain..." - confirmed, across all 5 books, to match the traditional
 * chapter counts exactly (21/35/22/28/32 - the SAME counts the independently
 * -parsed Latin sibling's own <milestone unit="chapter"/> markers produce;
 * neither edition is used to correct the other). Each book subpage also
 * opens (Books 2-5 only; Book 1 has none) with a plain furniture line
 * ("Second Book Of The Treatise On The Chief Good And Evil.") which is
 * recognised and skipped, not stored anywhere - see BOOK_TITLE_RE.
 *
 * ONE GENUINE SOURCE IRREGULARITY, found by direct inspection (not assumed):
 * Book 2 prints NO "I." marker at all - its dialogue begins directly after
 * the book-title furniture line, and the first explicit roman-numeral
 * marker in the source is "II." (at what would be this book's third
 * paragraph). The two paragraphs before that "II." are, on every other
 * evidence (they are plainly continuous with what follows, and the book's
 * marker sequence otherwise runs II..XXXV = 34 values, one short of the
 * traditionally-cited 35), chapter I's own text - so this importer treats
 * them as an IMPLICIT, unprinted chapter/section 1, logged explicitly as an
 * editorial inference rather than silently merged into chapter II. Every
 * other book (1, 3, 4, 5) prints its own "I." explicitly.
 *
 * Faithfulness rules:
 *   - verbatim English (Yonge's own translation) reading text only; no
 *     modernising or "improving" his 1853/1891 wording.
 *   - Wikisource page-scan furniture is stripped: `<style>`/`<link>`
 *     per-template resets, `.pagenum`/`.ws-pagenum` page-scan position
 *     markers, `span.mw-editsection` edit-section links, the zero-width
 *     space Wikisource inserts at each page boundary, and `sup.reference`
 *     inline footnote-reference markers (counted, not preserved anywhere -
 *     the footnotes themselves, in the second `prp-pages-output` block, are
 *     Yonge's/the editor's own apparatus, not Cicero's words).
 *   - the leading "N. " chapter-numeral prefix on a chapter's first
 *     paragraph is stripped from the reading text (it becomes that
 *     Section's Division.number instead - see data/de-finibus-en/types.ts).
 *   - indented verse-quotation `<p>`s (Cicero's own quoted Ennius/Terence
 *     etc., rendered by Wikisource as centred blocks) are read exactly like
 *     any other paragraph: their text becomes part of the enclosing
 *     chapter's Passage, in document order.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from '../import-aristotle-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-finibus-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-finibus-en');

const WORK_ID = 'de-finibus-en';
const EXPECTED_SECTION_COUNTS = [21, 35, 22, 28, 32];

interface Anomaly {
  where: string;
  note: string;
}

function fail(bookLabel: string, msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}, ${bookLabel}): ${msg}\n`);
  process.exit(1);
}

const CH_MARKER_RE = /^([IVXLCM]+)\.\s+/;
const BOOK_TITLE_RE = /^(?:First|Second|Third|Fourth|Fifth) Book Of The Treatise On The Chief Good And Evil\.?$/;

/** Small roman-numeral reader, I..XL range (this work needs at most "XXXV"). */
function romanToArabic(roman: string): number | null {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = VALUES[roman[i]!];
    const next = VALUES[roman[i + 1] ?? ''];
    if (cur === undefined) return null;
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total > 0 ? total : null;
}

function extractProse(node: JSDOMElement): { text: string; refsStripped: number } {
  const clone = node.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link, br').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference').forEach((e) => {
    refsStripped += 1;
    e.remove();
  });
  clone.querySelectorAll('.pagenum, span.mw-editsection').forEach((e) => e.remove());
  const text = cleanText((clone.textContent ?? '').replace(/\u200B/g, ''));
  return { text, refsStripped };
}

interface ParsedSection {
  number: number;
  paragraphs: string[];
  anomaly?: string;
}

interface BookParseResult {
  sections: ParsedSection[];
  anomalies: Anomaly[];
  refsStripped: number;
  titleLinesSkipped: number;
}

function parseBook(html: string, bookNum: number): BookParseResult {
  const bookLabel = `book-${bookNum}`;
  const anomalies: Anomaly[] = [];
  let refsStripped = 0;
  let titleLinesSkipped = 0;

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const blocks = doc.querySelectorAll('div.prp-pages-output');
  if (blocks.length < 1 || blocks.length > 2) {
    fail(bookLabel, `expected 1 or 2 div.prp-pages-output blocks, found ${blocks.length}`);
  }
  const mainBlock = blocks[0]!;

  const paragraphNodes = [...mainBlock.querySelectorAll('p')];
  const sections: ParsedSection[] = [];
  let cur: ParsedSection | null = null;
  let expectedNext = 1;

  function pushParagraph(text: string): void {
    if (!cur) fail(bookLabel, 'prose paragraph found before any section was opened');
    if (text.length > 0) cur!.paragraphs.push(text);
  }

  function openSection(n: number): void {
    if (cur) sections.push(cur);
    cur = { number: n, paragraphs: [] };
  }

  for (const p of paragraphNodes) {
    const { text, refsStripped: refs } = extractProse(p);
    refsStripped += refs;
    if (text.length === 0) continue; // page-transition spacer, no reading text lost

    if (BOOK_TITLE_RE.test(text)) {
      titleLinesSkipped += 1;
      continue;
    }

    const m = CH_MARKER_RE.exec(text);
    if (m) {
      const n = romanToArabic(m[1]!);
      if (n === null) fail(bookLabel, `unparseable roman numeral chapter marker "${m[1]}"`);
      const remainder = text.slice(m[0].length);

      if (cur === null && n !== 1) {
        // Book 2's own quirk: the first explicit marker in this book is not
        // "I." - the paragraphs seen so far (if any) are chapter/section 1's
        // own text, printed with no numeral of its own. Open section 1
        // implicitly first (see the module doc), THEN this marker's section.
        openSection(1);
        anomalies.push({
          where: `${WORK_ID} / ${bookLabel}`,
          note: `This book prints no explicit "I." chapter marker at all - its first printed marker is "${m[1]}.". The paragraph(s) before it are chapter 1's own text (continuous with what follows, and the marker sequence otherwise runs ${m[1]}..the book's last value, one short of the traditionally cited count) - treated as an IMPLICIT, unprinted section 1 rather than silently merged into "${m[1]}.".`,
        });
        cur!.anomaly = 'This section has no printed chapter-numeral heading of its own in the source (see the book-level anomaly note); inferred as the implicit opening section.';
        expectedNext = n;
      }

      if (n !== expectedNext) {
        fail(bookLabel, `chapter marker "${m[1]}" (arabic ${n}) is not the expected next value ${expectedNext}`);
      }
      openSection(n);
      expectedNext = n + 1;
      pushParagraph(remainder);
      continue;
    }

    if (cur === null) {
      // No marker seen yet in this book at all (only possible for Book 2,
      // whose very first real paragraph carries no marker at all) -
      // implicit section 1; the next REAL marker expected is "II.".
      openSection(1);
      expectedNext = 2;
      cur!.anomaly = 'This section has no printed chapter-numeral heading of its own in the source; inferred as the implicit opening section (see the book-level anomaly note).';
      anomalies.push({
        where: `${WORK_ID} / ${bookLabel}`,
        note: 'This book prints no explicit "I." chapter marker at all - its dialogue begins directly (after the book-title furniture line) with no numeral of its own; the paragraph(s) before the first explicit marker ("II.") are chapter 1\'s own text, treated as an IMPLICIT, unprinted section 1 rather than silently merged into chapter II.',
      });
    }
    pushParagraph(text);
  }
  if (cur) sections.push(cur);

  return { sections, anomalies, refsStripped, titleLinesSkipped };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];
  const bookDivisions: Division[] = [];
  let totalRefsStripped = 0;
  let totalTitleLinesSkipped = 0;

  for (let bookNum = 1; bookNum <= 5; bookNum++) {
    const rawFile = join(RAW_DIR, `de-finibus-book-${bookNum}.json`);
    const raw = JSON.parse(readFileSync(rawFile, 'utf8')) as { parse?: { text?: { '*'?: string } } };
    const html = raw.parse?.text?.['*'];
    if (!html) fail(`book-${bookNum}`, `could not find .parse.text["*"] HTML string in ${rawFile}`);

    const parsed = parseBook(html, bookNum);
    anomalies.push(...parsed.anomalies);
    totalRefsStripped += parsed.refsStripped;
    totalTitleLinesSkipped += parsed.titleLinesSkipped;

    const want = EXPECTED_SECTION_COUNTS[bookNum - 1]!;
    if (parsed.sections.length !== want) {
      fail(`book-${bookNum}`, `expected ${want} sections, parsed ${parsed.sections.length}`);
    }
    for (const s of parsed.sections) {
      if (s.paragraphs.length === 0) fail(`book-${bookNum}`, `section ${s.number} has no surviving paragraph text`);
    }

    const sectionDivisions: Division[] = parsed.sections.map((s) => {
      const passage: Passage = { n: '', text: s.paragraphs.join('\n\n'), ref: null };
      if (s.anomaly) passage.anomaly = s.anomaly;
      return {
        id: `book-${bookNum}-sec-${s.number}`,
        number: String(s.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
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
  }

  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: `${totalRefsStripped} inline footnote-reference markers (sup.reference, Yonge's/the editor's own footnote apparatus - not Cicero's text) were removed from the reading text across all 5 books; the footnotes themselves (in each page's second, reflist-only prp-pages-output block) are not preserved anywhere in this build.`,
  });
  anomalies.push({
    where: `${WORK_ID} / book-title lines`,
    note: `${totalTitleLinesSkipped} "<Ordinal> Book Of The Treatise On The Chief Good And Evil." page-furniture line(s) (Wikisource transclusion navigation text, not Cicero's/Yonge's words) were skipped; Book 1 prints none of its own.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reference scheme`,
    note: 'Division.ref is null throughout this edition (Book and Section alike): the printed chapter numeral is captured as Division.number instead, and this page-scan transcription carries no other reference apparatus of its own to reconstruct a separate ref from.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Finibus Bonorum et Malorum',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: "Yonge's translation, Bohn's Classical Library, 1891 printing",
    provenance:
      'English Wikisource, "The Academic Questions, Treatise De Finibus, and Tusculan Disputations / De Finibus, a Treatise on the Chief Good and Evil" (5 Book subpages), fetched once per book via the MediaWiki action=parse&prop=text API (a page-scan transclusion: action=parse&prop=wikitext for these pages returns only <pages/> markup, not the text itself, so the rendered HTML was fetched and parsed with jsdom instead, the same technique used by scripts/import-aristotle-metaphysics-en); imported by scripts/import-de-finibus-en. The raw per-book dumps are committed under scripts/import-de-finibus-en/raw/.',
    license:
      "Charles Duke Yonge's translation (first published 1853; this text reprints Bohn's Classical Library's 1891 printing) is in the public domain: both the original 1853 translation and this 1891 reprint are well over 95 years old. The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'De Finibus - English, trans. Yonge',
        paragraphs: [
          "This is Cicero's De Finibus Bonorum et Malorum in the English translation made by Charles Duke Yonge, first published in 1853 and reprinted (the text transcribed here) in Bohn's Classical Library in 1891.",
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Footnotes (the translator\'s/editor\'s own apparatus, not part of the translated running text) are excluded - see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., "The Treatise De Finibus, a Treatise on the Chief Good and Evil", in The Academic Questions, Treatise De Finibus, and Tusculan Disputations, Of M. T. Cicero, with a Sketch of the Greek Philosophers Mentioned by Cicero (Bohn\'s Classical Library, 1891 printing). This translation is in the public domain.',
          'The work is divided into 5 Books and, within each Book, numbered chapters (21/35/22/28/32 in Books 1-5 respectively) - matching the traditional Ciceronian chapter numbering exactly, and matching the independently-parsed Latin sibling\'s own chapter-milestone counts. This source prints no Stephanus/Bekker-style page apparatus of its own, so citation here is by Book and chapter only; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          "The machine-readable text is the RENDERED HTML of each of the 5 English Wikisource \"...De Finibus.../Book N\" subpages, fetched once through the MediaWiki action=parse&prop=text API and committed under the importer's raw/ directory. It is bundled with the app; nothing is loaded from the network at runtime.",
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Unlike the Wikisource "Metaphysics (Ross, 1908)" source used elsewhere in this app, this translation has no separate chapter-heading markup at all: the chapter number is simply the first word of certain paragraphs\' own printed text (e.g. "XVII. And I will now explain..."), stripped here and moved to that Section\'s Division.number. Ordinary paragraphs become passages; page-scan furniture only is removed (per-template style/link resets, page-number scan markers, edit-section links, and inline footnote-reference markers, all counted and stripped - the footnotes themselves are editorial apparatus and are not preserved, matching this library\'s other English translations). A plain "<Ordinal> Book Of The Treatise..." furniture line at the head of Books 2-5 is recognised and skipped.',
          'One genuine source irregularity: Book 2 prints no explicit "I." marker at all - its dialogue simply begins after the book-title furniture line, with the first printed marker being "II.". The paragraph(s) before that "II." are chapter 1\'s own text (confirmed continuous with what follows, and the marker sequence otherwise running one short of the traditionally-cited 35 chapters); this importer treats them as an explicit, disclosed editorial inference - an implicit, unprinted section 1 - rather than silently merging them into chapter II or fabricating a numeral the source does not print. See anomalies.json.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and chapter (Yonge\'s own printed roman-numeral chapter divisions, which this app stores as each Section\'s Division.number). Division.ref is null throughout - this page-scan transcription carries no page/column reference apparatus of its own to reconstruct one from; Passage.ref is likewise always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 5 Books and all 21/35/22/28/32 chapters are present and in order, matching the traditional count and the independently-parsed Latin sibling\'s own chapter-milestone counts exactly.',
          "Book 2's missing \"I.\" marker. See \"How it was imported\" above and anomalies.json for the full account - this is a genuine feature of the Wikisource source, confirmed by direct inspection, not a parsing error.",
          "Footnotes. Every inline footnote-reference marker was stripped; the footnotes themselves (translator's/editor's apparatus, not Cicero's/Yonge's running text) are not preserved anywhere in this build. See anomalies.json for the total count.",
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary -----------------------------------------------
  let totalSections = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const b of bookDivisions) {
    totalSections += b.children.length;
    const chars = b.children.reduce((n, s) => n + s.passages[0]!.text.length, 0);
    totalChars += chars;
    process.stdout.write(`  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections\n`);
  }
  process.stdout.write(
    `\n  5 books  ${totalSections} sections  ${totalChars} chars  ${totalRefsStripped} footnote refs stripped  ${totalTitleLinesSkipped} title lines skipped\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-finibus-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
