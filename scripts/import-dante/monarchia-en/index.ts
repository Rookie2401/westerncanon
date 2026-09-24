/**
 * Dante, *De Monarchia* - English translation by F. J. Church, appended to
 * his father R. W. Church's essay "Dante" (London: Macmillan and Co., 1879).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/monarchia-en/index.ts
 *
 * Source: Project Gutenberg #33896, "Dante. An essay. To which is added a
 * translation of De Monarchia." (raw/pg33896.txt, cached from
 * https://www.gutenberg.org/cache/epub/33896/pg33896.txt; nothing is
 * downloaded at build/run time). The book's own "NOTICE" (by R. W. Church)
 * states: "By the desire of Mr. Macmillan, a translation of the De
 * Monarchia is subjoined. I am indebted for it to my son, Mr. F. J. Church
 * ... It is made from the text of Witte's second edition of the De
 * Monarchia, 1874." - so the Latin text underlying this translation is
 * Karl Witte's 1874 edition (itself not shipped here as a separate
 * Division; only the English translation, per this batch's brief).
 *
 * ONLY the De Monarchia translation (lines ~4786-7923 of the raw file,
 * "DE MONARCHIA." through "THE END.") is imported. R. W. Church's own
 * essay "Dante" that precedes it is a separate, unrelated work (a critical
 * essay about Dante, not a translation of anything Dante wrote) and is not
 * part of this batch's brief; it is excluded and disclosed, not silently
 * dropped.
 *
 * STRUCTURE. Three top-level Divisions (book-1..book-3), each with child
 * Divisions book-N-ch-M (16 / 13 / 16 chapters - the standard division for
 * this work, confirmed by direct count of this source's own "N.--" chapter
 * markers). One Passage per chapter, its paragraph blocks joined by a
 * blank line.
 *
 * EXCLUDED (apparatus, disclosed in about.json): R. W. Church's preceding
 * essay "Dante"; 324 "[Footnote N: ...]" translator/editorial footnote
 * blocks (their content is not preserved anywhere in this build) and their
 * inline "[N]" reference markers; the trailing "CONTENTS OF DE MONARCHIA"
 * chapter-title index (the book's own back-matter table of contents, not
 * part of the translated text - the Gutenberg producer's own note says a
 * combined Table of Contents was added at the front "for the reader's
 * convenience" and this original one left in place at the back).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { romanToArabic, type Anomaly } from '../shared/text.ts';
import { splitBlocks, renderBlock } from '../shared/blocks.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const RAW = join(HERE, 'raw', 'pg33896.txt');
const WORK_ID = 'dante-monarchia-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const TEXT_START_NEEDLE = 'DE MONARCHIA.';
const BOOK_I_NEEDLE = 'BOOK I.';
const TEXT_END_NEEDLE = 'THE END.';
const EXPECTED_CHAPTERS: Record<number, number> = { 1: 16, 2: 13, 3: 16 };

function main(): void {
  const raw = readFileSync(RAW, 'utf8');
  const lines = raw.split(/\r?\n/);

  // "DE MONARCHIA." appears 4 times in the file (title-page mentions,
  // contents list, the real heading, and the back-matter "CONTENTS OF DE
  // MONARCHIA" section). The real translation's heading is the one
  // immediately followed (within a few lines) by "BOOK I.".
  let deMonarchiaHeadingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() === TEXT_START_NEEDLE.replace(/\.$/, '.') && lines.slice(i + 1, i + 6).some((l) => l.trim() === BOOK_I_NEEDLE)) {
      deMonarchiaHeadingIdx = i;
      break;
    }
  }
  const endIdx = lines.findIndex((l, i) => i > deMonarchiaHeadingIdx && l.trim() === TEXT_END_NEEDLE);
  if (deMonarchiaHeadingIdx === -1 || endIdx === -1) {
    process.stderr.write('STOP (monarchia-en): could not find De Monarchia text bounds\n');
    process.exit(1);
  }

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      'Only the De Monarchia translation is imported from this combined volume. Excluded: R. W. Church\'s preceding ' +
      'essay "Dante" (a critical essay about Dante, not a translation of anything Dante wrote, and outside this ' +
      "batch's brief), the book's front title pages and \"NOTICE\", and the trailing \"CONTENTS OF DE MONARCHIA\" " +
      "chapter-title index (back-matter table of contents, not translated text).",
  });

  const bookRe = /^BOOK (I|II|III)\.$/;
  const chapterRe = /^([IVXL]+)\.--(.*)$/;
  interface RawChapter {
    book: number;
    number: number;
    lines: string[];
  }
  let curBookRoman: 'I' | 'II' | 'III' | null = null;
  const romanBook: Record<string, number> = { I: 1, II: 2, III: 3 };
  const chapters: RawChapter[] = [];
  let cur: RawChapter | null = null;
  let footnoteMarkersStripped = 0;

  for (let i = deMonarchiaHeadingIdx + 1; i < endIdx; i++) {
    const raw0 = lines[i]!;
    const trimmed = raw0.trim();
    const bm = bookRe.exec(trimmed);
    if (bm) {
      curBookRoman = bm[1] as 'I' | 'II' | 'III';
      cur = null;
      continue;
    }
    const cm = chapterRe.exec(raw0);
    if (cm && curBookRoman) {
      cur = { book: romanBook[curBookRoman]!, number: romanToArabic(cm[1]!, `${WORK_ID} / book ${curBookRoman} chapter header`), lines: [cm[2]!] };
      chapters.push(cur);
      continue;
    }
    if (!cur) continue;
    cur.lines.push(raw0);
  }

  const byBook: Record<number, RawChapter[]> = { 1: [], 2: [], 3: [] };
  for (const c of chapters) byBook[c.book]!.push(c);
  for (const b of [1, 2, 3]) {
    const list = byBook[b]!.sort((a, x) => a.number - x.number);
    if (list.length !== EXPECTED_CHAPTERS[b]) {
      process.stderr.write(`STOP (monarchia-en): Book ${b} has ${list.length} chapters, expected ${EXPECTED_CHAPTERS[b]}\n`);
      process.exit(1);
    }
    for (let i = 0; i < list.length; i++) {
      if (list[i]!.number !== i + 1) {
        process.stderr.write(`STOP (monarchia-en): Book ${b} chapter numbering gap at index ${i}\n`);
        process.exit(1);
      }
    }
  }

  const bookDivisions: Division[] = [1, 2, 3].map((b) => {
    const chDivs: Division[] = byBook[b]!.sort((a, x) => a.number - x.number).map((c) => {
      const blocks = splitBlocks(c.lines).filter((blk) => !blk[0]!.trim().startsWith('[Footnote'));
      const rendered = blocks.map(renderBlock).map((t) =>
        t.replace(/\[\d+\]/g, () => {
          footnoteMarkersStripped += 1;
          return '';
        }),
      ).map((t) => t.replace(/\s{2,}/g, ' ').trim()).filter((t) => t.length > 0);
      return {
        id: `book-${b}-ch-${c.number}`,
        number: String(c.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text: rendered.join('\n\n'), ref: null }],
      };
    });
    return {
      id: `book-${b}`,
      number: String(b),
      ref: null,
      sourceHeading: `Book ${['I', 'II', 'III'][b - 1]}`,
      editorialTitle: null,
      children: chDivs,
      passages: [],
    };
  });

  const footnoteBlockCount = chapters.reduce((s, c) => s + splitBlocks(c.lines).filter((blk) => blk[0]!.trim().startsWith('[Footnote')).length, 0);
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note:
      `${footnoteBlockCount} "[Footnote N: ...]" translator/editorial footnote block(s) were removed wholesale from ` +
      `the reading text; their content is not preserved anywhere in this build. ${footnoteMarkersStripped} inline ` +
      '"[N]" reference markers were also stripped from the running text.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };
  const totalChars = countChars(work);
  const totalChapters = chapters.length;

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Monarchia',
    author: 'Dante Alighieri',
    language: 'en',
    translator: 'F. J. Church',
    edition: "London: Macmillan and Co., 1879, translated \"from the text of Witte's second edition of the De Monarchia, 1874\"",
    provenance:
      'Project Gutenberg eBook #33896, "Dante. An essay. To which is added a translation of De Monarchia." ' +
      '(www.gutenberg.org/ebooks/33896), Distributed Proofreaders text; fetched once and cached under ' +
      'scripts/import-dante/monarchia-en/raw/pg33896.txt. Nothing is downloaded at build or run time. Only the De ' +
      "Monarchia translation is imported (see \"How it was imported\"); R. W. Church's preceding essay \"Dante\" is " +
      'not part of this library. Imported by scripts/import-dante/monarchia-en.',
    license:
      "Church's translation (1879) and Dante's Latin original (c. 1312-13) are both in the public domain worldwide. " +
      'The Project Gutenberg digital transcription is released under the Project Gutenberg License.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's De Monarchia, a Latin political treatise arguing for the independent, God-given authority of " +
            'universal secular monarchy (embodied by the Holy Roman Emperor) alongside, not subordinate to, the ' +
            "authority of the Papacy - in F. J. Church's English translation, made from Karl Witte's 1874 critical " +
            'edition of the Latin text and first published 1879 as an appendix to his father R. W. Church\'s essay ' +
            '"Dante".',
          'The text here is the translation, verbatim throughout. Nothing is modernised, paraphrased, or silently corrected.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Project Gutenberg eBook #33896, first released 2010 and most recently updated 2024. The producer\'s own ' +
            "note states two edits to the source scan: a combined Table of Contents was added at the front \"for the " +
            'reader\'s convenience" (the original book\'s own contents lists remain in place further in, and are ' +
            'themselves excluded here as apparatus, not reading text), and quotations from the Divine Comedy within ' +
            "R. W. Church's separate essay (not part of this import) were corrected against the Singleton Princeton " +
            'edition - disclosed here for completeness though it does not touch the De Monarchia translation itself.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the three books is a top-level Division; each of its numbered chapters (marked "N.--" at the head ' +
            'of its first paragraph in the source) is a child Division holding a single Passage whose text is that ' +
            "chapter's paragraph blocks, in order, joined by a blank line.",
          `${totalChapters} chapters across 3 books (16 + 13 + 16), ${totalChars} characters total.`,
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Division.ref and Passage.ref are null throughout: citation is by book and chapter number only, which the Division id and number already carry.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'The excluded footnote apparatus and inline reference markers are logged in anomalies.json with exact ' +
            'counts. This app also holds no verbatim Latin edition of De Monarchia at this time: the Latin sources ' +
            'checked during this import (Latin Wikisource\'s "De monarchia", and thelatinlibrary.com\'s copy) either ' +
            'explicitly declare their own source edition unknown (Latin Wikisource\'s page header literally states ' +
            '"editio: incognita, fons: incognitus") or state no source edition at all; the one clearly-attributed ' +
            "pre-1931 Latin edition located (E. Moore's Oxford text, as reprinted in Aurelia Henry's 1904 \"De " +
            "Monarchia: Edited with Translation and Notes\" exists online only as raw, unproofread OCR, not a " +
            "vetted verbatim transcription; see this importer's accompanying report for the full account. Only this " +
            'English translation is shipped for De Monarchia.',
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(`\n${totalChapters} chapters across 3 books, ${totalChars} chars, ${anomalies.length} anomalies\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
