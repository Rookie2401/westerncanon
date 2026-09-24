/**
 * Dante, *Convivio* ("The Banquet") - English translation by Elizabeth Price
 * Sayer (London: George Routledge, 1887; introduction by Henry Morley).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/convivio-en/index.ts
 *
 * Source: Project Gutenberg #12867, "The Banquet (Il Convito)"
 * (raw/pg12867.txt, cached from
 * https://www.gutenberg.org/cache/epub/12867/pg12867.txt; nothing is
 * downloaded at build/run time). PG header: "Translator: Elizabeth Price
 * Sayer", "Author of introduction, etc.: Henry Morley", Distributed
 * Proofreaders text.
 *
 * STRUCTURE. Four top-level Divisions (book-1..book-4, "The First
 * Treatise".."The Fourth Treatise" as printed - Dante's Convivio was
 * planned for 15 treatises but only these 4 were completed), each with
 * child Divisions book-N-ch-M (13 / 16 / 15 / 30 chapters - the standard,
 * universally used chapter division for this work, confirmed by direct
 * count of this source's own "CHAPTER N." headings). One Passage per
 * chapter: its paragraph-or-verse blocks (see ../shared/blocks.ts) joined
 * by a blank line, preserving prose-paragraph and embedded-canzone-verse
 * shape exactly as the source prints it.
 *
 * EXCLUDED (editorial front matter, disclosed in about.json): Henry
 * Morley's own signed introduction ("H.M.", dated April 1887) before "THE
 * BANQUET OF DANTE ALIGHIERI"; the Gutenberg transcription credits and
 * license boilerplate.
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
const RAW = join(HERE, 'raw', 'pg12867.txt');
const WORK_ID = 'dante-convivio-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const BOOK_NAMES = ['First', 'Second', 'Third', 'Fourth'] as const;
const EXPECTED_CHAPTERS: Record<string, number> = { First: 13, Second: 16, Third: 15, Fourth: 30 };
const BOOK_RE = /^The (First|Second|Third|Fourth) Treatise\.?$/;
const CHAPTER_RE = /^CHAPTER ([IVXL]+)\.$/;
const START_MARKER = '*** START OF THE PROJECT GUTENBERG EBOOK';
const END_MARKER = '*** END OF THE PROJECT GUTENBERG EBOOK';

interface RawChapter {
  book: (typeof BOOK_NAMES)[number];
  number: number;
  lines: string[];
}

function main(): void {
  const raw = readFileSync(RAW, 'utf8');
  const lines = raw.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.includes(START_MARKER));
  const pgEndIdx = lines.findIndex((l) => l.includes(END_MARKER));
  const noteIdx = lines.findIndex((l, i) => i > startIdx && l.trim() === 'NOTE' && lines[i + 2]?.trim() === 'ON THE DATE OF THE CONVITO');
  if (startIdx === -1 || pgEndIdx === -1 || noteIdx === -1) {
    process.stderr.write('STOP (convivio-en): PG markers or "NOTE ON THE DATE OF THE CONVITO" boundary not found\n');
    process.exit(1);
  }
  // The translated text (Sayer's Convivio, Treatises I-IV) ends where the
  // publisher's own back-matter essay "NOTE ON THE DATE OF THE CONVITO"
  // begins; everything from there to the PG boilerplate is editorial
  // apparatus, not Dante's or Sayer's text, and is excluded.
  const endIdx = noteIdx;

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      "Excluded from the reading text: Henry Morley's own signed introduction (\"H.M.\", dated April 1887) preceding " +
      '"THE BANQUET OF DANTE ALIGHIERI" (editorial front matter, not Dante\'s or Sayer\'s translated text); the ' +
      'publisher\'s back-matter essay "NOTE ON THE DATE OF THE CONVITO" following the end of Book IV chapter XXX ' +
      '(editorial commentary on when the work was written, not part of the translated text); and the Project ' +
      'Gutenberg transcription credits/license boilerplate.',
  });

  let curBook: (typeof BOOK_NAMES)[number] | null = null;
  const chapters: RawChapter[] = [];
  const canzoni: Record<string, string[]> = { First: [], Second: [], Third: [], Fourth: [] };
  let cur: RawChapter | null = null;
  let sawChapterInThisBook = false;
  for (let i = startIdx + 1; i < endIdx; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const bm = BOOK_RE.exec(trimmed);
    if (bm) {
      curBook = bm[1] as (typeof BOOK_NAMES)[number];
      cur = null;
      sawChapterInThisBook = false;
      continue;
    }
    const cm = CHAPTER_RE.exec(trimmed);
    if (cm && curBook) {
      cur = { book: curBook, number: romanToArabic(cm[1]!, `${WORK_ID} / ${curBook} ch header`), lines: [] };
      chapters.push(cur);
      sawChapterInThisBook = true;
      continue;
    }
    if (cur) {
      cur.lines.push(line);
      continue;
    }
    // Between a book heading and its "CHAPTER I.": each of the Second,
    // Third and Fourth Treatises opens with the printed text of the
    // canzone that treatise comments on (the First Treatise, Dante's own
    // general introduction, has none). This is genuine primary text, not
    // front matter, and is kept - see "canzoni" below.
    if (curBook && !sawChapterInThisBook) canzoni[curBook]!.push(line);
  }

  const byBook: Record<string, RawChapter[]> = { First: [], Second: [], Third: [], Fourth: [] };
  for (const c of chapters) byBook[c.book]!.push(c);
  for (const name of BOOK_NAMES) {
    const list = byBook[name]!.sort((a, b) => a.number - b.number);
    const expected = EXPECTED_CHAPTERS[name]!;
    if (list.length !== expected) {
      process.stderr.write(`STOP (convivio-en): ${name} Treatise has ${list.length} chapters, expected ${expected}\n`);
      process.exit(1);
    }
    for (let i = 0; i < list.length; i++) {
      if (list[i]!.number !== i + 1) {
        process.stderr.write(`STOP (convivio-en): ${name} Treatise chapter numbering gap at index ${i}\n`);
        process.exit(1);
      }
    }
  }

  let canzoniIncluded = 0;
  const bookDivisions: Division[] = BOOK_NAMES.map((name, bi) => {
    const chDivs: Division[] = byBook[name]!.sort((a, b) => a.number - b.number).map((c) => {
      const blocks = splitBlocks(c.lines).map(renderBlock).filter((t) => t.length > 0);
      const text = blocks.join('\n\n');
      return {
        id: `book-${bi + 1}-ch-${c.number}`,
        number: String(c.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text, ref: null }],
      };
    });
    const canzoneBlocks = splitBlocks(canzoni[name]!).map(renderBlock).filter((t) => t.length > 0);
    if (canzoneBlocks.length > 0) {
      canzoniIncluded += 1;
      chDivs.unshift({
        id: `book-${bi + 1}-canzone`,
        number: null,
        ref: null,
        sourceHeading: 'Canzone',
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text: canzoneBlocks.join('\n\n'), ref: null }],
      });
    }
    return {
      id: `book-${bi + 1}`,
      number: String(bi + 1),
      ref: null,
      sourceHeading: `The ${name} Treatise`,
      editorialTitle: null,
      children: chDivs,
      passages: [],
    };
  });

  if (canzoniIncluded > 0) {
    anomalies.push({
      where: `${WORK_ID} / canzoni`,
      note:
        'The Second, Third and Fourth Treatises each open with the printed text of the canzone that treatise then ' +
        "comments upon (the First Treatise, Dante's own general introduction, opens with none). This is genuine " +
        'primary text, not front matter, and is kept as an extra child Division ("book-N-canzone", number null) ' +
        `placed before that treatise's Chapter I. ${canzoniIncluded} canzone(s) included this way.`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };
  const totalChars = countChars(work);
  const totalChapters = chapters.length;

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Banquet (Il Convito)',
    author: 'Dante Alighieri',
    language: 'en',
    translator: 'Elizabeth Price Sayer',
    edition: 'London: George Routledge and Sons, 1887, with an introduction by Henry Morley',
    provenance:
      'Project Gutenberg eBook #12867, "The Banquet (Il Convito)" (www.gutenberg.org/ebooks/12867), Distributed ' +
      'Proofreaders text; fetched once and cached under scripts/import-dante/convivio-en/raw/pg12867.txt. Nothing is ' +
      'downloaded at build or run time. Imported by scripts/import-dante/convivio-en.',
    license:
      "Sayer's translation (1887) and Dante's Italian original (c. 1304-07, unfinished) are both in the public " +
      'domain worldwide. The Project Gutenberg digital transcription is released under the Project Gutenberg License.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'Il Convivio ("The Banquet"), Dante\'s unfinished philosophical commentary on three of his own canzoni, in ' +
            "Elizabeth Price Sayer's 1887 English translation. Dante planned fourteen treatises of commentary plus " +
            'an introductory first treatise (fifteen in all) but completed only four; this edition, like the ' +
            'Italian original, contains all four completed treatises and no more.',
          'The text here is the translation, verbatim throughout. Nothing is modernised, paraphrased, or silently corrected.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Project Gutenberg eBook #12867, Distributed Proofreaders text ("Produced by Paul Murray, Marc André Selig ' +
            'and PG Distributed Proofreaders"), first released 2004 and most recently updated 2024. It is the complete ' +
            `text: all four treatises, ${totalChapters} chapters (13 + 16 + 15 + 30).`,
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each treatise ("The First Treatise".."The Fourth Treatise", as printed) is a top-level Division; each of ' +
            'its numbered chapters is a child Division holding a single Passage whose text is that chapter\'s ' +
            "paragraph-and-verse blocks, in order, joined by a blank line. A block is treated as verse (each printed " +
            'line kept, joined by "\\n") when its own continuation lines carry the print\'s hanging indent - used ' +
            "here for Dante's own canzoni, quoted and then commented on stanza by stanza - and as prose (print-" +
            'width-wrapped lines joined by a single space) otherwise, matching this batch\'s Commedia/Vita Nuova ' +
            'convention.',
          `${totalChapters} chapters, ${totalChars} characters total.`,
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Division.ref and Passage.ref are null throughout: citation is by treatise and chapter number only, which the Division id and number already carry.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          "Excluded editorial front matter (Henry Morley's introduction) is logged in anomalies.json. This app also " +
            'holds no verbatim Italian edition of the Convivio at this time: the Italian sources checked during this ' +
            'import (Italian Wikisource\'s "Convivio", and LiberLiber\'s digitisation of the same) both explicitly ' +
            'state they reproduce the Busnelli-Vandelli critical edition (1st ed. 1934-37; the source used here is ' +
            'itself the 2nd edition, Le Monnier, 1964, with Antonio Enzo Quaglio\'s updating appendix) - a post-1931 ' +
            'critical text - and no complete, clearly pre-1931-edition, verbatim transcription of the Italian ' +
            "Convivio was located; see this importer's accompanying report for the full account. Only this English " +
            'translation is shipped for the Convivio.',
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(`\n${totalChapters} chapters across 4 treatises, ${totalChars} chars, ${anomalies.length} anomalies\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
