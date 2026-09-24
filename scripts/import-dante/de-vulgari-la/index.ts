/**
 * Dante, *De Vulgari Eloquentia* - Latin original, Giovanni Battista
 * Giuliani's edition ("Le Opere Latine di Dante Allighieri", Vol. I,
 * Firenze: Successori Le Monnier, 1878). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/de-vulgari-la/index.ts
 *
 * Source: Latin Wikisource, page-scan transclusion of the djvu
 * "Alighieri, Giuliani - Opere latine vol I - 1878.djvu", pages "De Vulgari
 * Eloquentia/Liber I" and "/Liber II" (raw/liber1.json, raw/liber2.json,
 * cached MediaWiki action=parse&prop=text responses rendering the full
 * `<pages index="..." from=X to=Y />` transclusion in one request each;
 * nothing is downloaded at build/run time). Confirmed by direct inspection
 * of the page's own {{titulus2}} header: "Recensor=Ioannes Baptista
 * Iuliani | Editio = ex Le Opere Latine di Dante Allighieri, Vol. I,
 * Firenze, Successori Le Monnier, 1878" - a clearly pre-1931 edition, and
 * confirmed COMPLETE (zero red-linked/unproofread pages found in either
 * book, unlike the companion English translation - see dante-de-vulgari-
 * eloquentia-en's absence and this importer's accompanying report).
 *
 * STRUCTURE. Two top-level Divisions (book-1, book-2), each with child
 * Divisions book-N-ch-M (19 + 14 chapters - the standard division for this
 * work, confirmed by direct count of this source's own "Caput N." headings).
 * Each chapter carries the source's own printed chapter ARGUMENT/title
 * (e.g. "Quid sit Vulgaris locutio, et quo differat a Grammatica.") as its
 * Division.sourceHeading, and its paragraph/verse blocks as one Passage,
 * using the same block collector as this batch's other page-scan sources
 * (see ../shared/pagescanLite.ts) to recover any reading text not wrapped
 * in a <p> where a printed paragraph straddles a scanned page boundary.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectUnits } from '../shared/pagescanLite.ts';
import { romanToArabic, type Anomaly } from '../shared/text.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WORK_ID = 'dante-de-vulgari-eloquentia-la';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const BOOK_FILES = [
  { book: 1, file: 'liber1.json', expectedChapters: 19 },
  { book: 2, file: 'liber2.json', expectedChapters: 14 },
];

const CAPUT_RE = /^Caput ([IVXL]+)\.$/;

interface RawChapter {
  number: number;
  title: string | null;
  contentUnits: string[];
}

function loadHtml(file: string): string {
  const j = JSON.parse(readFileSync(join(HERE, 'raw', file), 'utf8')) as { parse: { text: { '*': string } } };
  return j.parse.text['*'];
}

function main(): void {
  const anomalies: Anomaly[] = [];
  const bookDivisions: Division[] = [];
  let totalChapters = 0;

  for (const { book, file, expectedChapters } of BOOK_FILES) {
    const html = loadHtml(file);
    const units = collectUnits(html);

    const chapters: RawChapter[] = [];
    let cur: RawChapter | null = null;
    let expectTitleNext = false;
    for (const u of units) {
      const m = CAPUT_RE.exec(u.text);
      if (m) {
        cur = { number: romanToArabic(m[1]!, `${WORK_ID} / book-${book} chapter header`), title: null, contentUnits: [] };
        chapters.push(cur);
        expectTitleNext = true;
        continue;
      }
      if (!cur) continue; // front matter (LIBER heading, running titles) before Caput I.
      if (expectTitleNext) {
        cur.title = u.text;
        expectTitleNext = false;
        continue;
      }
      cur.contentUnits.push(u.text);
    }

    const sorted = chapters.sort((a, b) => a.number - b.number);
    if (sorted.length !== expectedChapters) {
      process.stderr.write(`STOP (de-vulgari-la): book ${book} has ${sorted.length} chapters, expected ${expectedChapters}\n`);
      process.exit(1);
    }
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i]!.number !== i + 1) {
        process.stderr.write(`STOP (de-vulgari-la): book ${book} chapter numbering gap at index ${i}\n`);
        process.exit(1);
      }
      if (sorted[i]!.contentUnits.length === 0) {
        process.stderr.write(`STOP (de-vulgari-la): book ${book} chapter ${sorted[i]!.number} has no content units\n`);
        process.exit(1);
      }
    }

    const chDivs: Division[] = sorted.map((c) => ({
      id: `book-${book}-ch-${c.number}`,
      number: String(c.number),
      ref: null,
      sourceHeading: c.title,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: c.contentUnits.join('\n\n'), ref: null }],
    }));

    bookDivisions.push({
      id: `book-${book}`,
      number: String(book),
      ref: null,
      sourceHeading: `Liber ${book === 1 ? 'Primus' : 'Secundus'}`,
      editorialTitle: null,
      children: chDivs,
      passages: [],
    });
    totalChapters += sorted.length;
  }

  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note:
      'Both books were confirmed free of red-linked (unproofread) djvu pages before this import (zero ' +
      '`class="new"` "page does not exist" links in either rendered book), unlike English Wikisource\'s only ' +
      "available digitisation of the companion 1904 Howell/Wicksteed English translation of this same work, which " +
      'was found to have large unproofread gaps (Book I missing djvu pages 23-39 and others; Book II missing pages ' +
      "100-119 and others) and was therefore NOT imported - see this batch's accompanying report. This Latin text " +
      'is complete.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions: bookDivisions };
  const totalChars = countChars(work);

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Vulgari Eloquentia',
    author: 'Dante Alighieri',
    language: 'la',
    editor: 'Giovanni Battista Giuliani',
    edition: 'Le Opere Latine di Dante Allighieri, Vol. I (Firenze: Successori Le Monnier, 1878)',
    provenance:
      'Latin Wikisource, page-scan transclusion of the djvu "Alighieri, Giuliani - Opere latine vol I - 1878.djvu", ' +
      'pages "De Vulgari Eloquentia/Liber I" and "/Liber II" (la.wikisource.org), fetched once via the MediaWiki ' +
      'action=parse API (rendering each book\'s full `<pages .../>` transclusion in one request) and cached under ' +
      'scripts/import-dante/de-vulgari-la/raw/. Nothing is downloaded at build or run time. The page\'s own ' +
      '{{titulus2}} header states "Recensor=Ioannes Baptista Iuliani | Editio = ex Le Opere Latine di Dante ' +
      'Allighieri, Vol. I, Firenze, Successori Le Monnier, 1878". Imported by scripts/import-dante/de-vulgari-la.',
    license:
      "Dante's Latin original (c. 1303-05, unfinished) is in the public domain worldwide, as is Giuliani's 1878 " +
      'edition. The Wikisource digital transcription/proofreading is released under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's De Vulgari Eloquentia (\"On Eloquence in the Vernacular\"), his unfinished Latin treatise on the " +
            'Italian vernacular and the art of lyric poetry, in Giovanni Battista Giuliani\'s 1878 edition - part of ' +
            "his complete edition of Dante's Latin works. Dante left the treatise unfinished partway through Book " +
            'II\'s fourteenth chapter; this edition, like the work itself, ends there.',
          'The text here is verbatim throughout. Nothing is modernised, paraphrased, or silently corrected.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Latin Wikisource\'s page-scan transclusion of Giuliani\'s 1878 "Opere Latine" volume I, confirmed complete ' +
            '(no unproofread/red-linked pages) in both books at the time of this import.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each book ("Liber Primus"/"Liber Secundus") is a top-level Division; each of its numbered chapters ' +
            '("Caput I." etc.) is a child Division. This edition prints a short italicised argument/title after each ' +
            '"Caput N." heading (e.g. "Quid sit Vulgaris locutio, et quo differat a Grammatica.") - kept as that ' +
            "Division's sourceHeading, not folded into the reading text. The chapter's own paragraph/verse blocks, " +
            'in order, form its single Passage, joined by a blank line. Reading text not wrapped in a <p> element ' +
            'by the source (where a printed paragraph straddles a scanned page boundary) was recovered by walking ' +
            'the rendered page in document order, exactly like this batch\'s companion English page-scan attempt - ' +
            'see ../shared/pagescanLite.ts.',
          `${totalChapters} chapters across 2 books (19 + 14), ${totalChars} characters total.`,
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Division.ref and Passage.ref are null throughout: citation is by book and chapter number only, which the Division id and number already carry.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the completeness check performed before import, and this batch\'s accompanying ' +
            'report for the full account of why the companion English translation (A. G. Ferrers Howell, revised ' +
            '1904) could not be shipped alongside this Latin text: English Wikisource\'s only available copy of it ' +
            'has substantial unproofread gaps.',
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(`\n${totalChapters} chapters across 2 books, ${totalChars} chars, ${anomalies.length} anomalies\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
