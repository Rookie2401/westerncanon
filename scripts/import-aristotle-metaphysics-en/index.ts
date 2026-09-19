/**
 * Aristotle, *Metaphysics* — English translation by William David Ross
 * (1908), via English Wikisource's page-scan transclusion of "Metaphysics
 * (Ross, 1908)". Run-once ingestion pipeline.
 *
 *   npm run import:aristotle-metaphysics-en
 *
 * Reads scripts/import-aristotle-metaphysics-en/raw/metaphysics-ross-1908-book-N.json
 * (N = 1..14; already in the repo — the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API for each of the 14
 * "Metaphysics (Ross, 1908)/Book N" subpages). Writes:
 *   data/metaphysics-en/work.json       - the GenericWork (see the book manifest below - NOT all 14 books)
 *   data/metaphysics-en/about.json      - provenance / licence metadata + About prose
 *   data/metaphysics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle-metaphysics-en`.
 *
 * ============================================================================
 * WHY THIS IS NOT 14 COMPLETE BOOKS (read before touching BOOK_MANIFEST)
 * ============================================================================
 * This import's brief assumed all 14 Wikisource book subpages "contain real
 * transcluded page-scan content". Direct inspection of every one of the 14
 * fetched subpages (not just Book 1/5, though those were checked too, per
 * the brief) found this is NOT so: the parent page "Metaphysics (Ross,
 * 1908)" itself carries the banner "This work is incomplete. If you'd like
 * to help expand it, see the help pages..." - and seven of the fourteen
 * book subpages are, as of this import (2026-09-19), mostly or entirely
 * unproofread: their `<pages index=... from=X to=Y />` transclusion
 * resolves to red links ("Page:...djvu/NNN (page does not exist)") rather
 * than real text. A further book (10) turns out to carry a *different*
 * digitisation entirely - a plaintext paste from the MIT Classics website,
 * headed "Part N" rather than "Chapter N", explicitly labelled "Text
 * derived from MIT classics page" and NOT backed by the djvu page scan -
 * i.e. not the page-scan source this import was asked for, so excluded on
 * provenance grounds regardless of its actual completeness.
 *
 * This importer therefore ships only the books/chapters that are genuinely,
 * verifiably present in the specified page-scan source, verbatim, per this
 * repo's non-negotiable faithfulness rule (never fabricate; log anomalies
 * rather than guess). See BOOK_MANIFEST below for the exact, individually
 * justified inclusion/exclusion decision for every one of the 14 books, and
 * data/metaphysics-en/about.json's "Known gaps & anomalies" section for the
 * reader-facing account. The companion Greek edition (data/metaphysics-grc)
 * IS complete (all 14 books, 142 chapters) - this gap is specific to the
 * English translation's Wikisource transcription project, not this app.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBookHtml } from './parseRoss1908.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/metaphysics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'metaphysics-en');

const WORK_ID = 'metaphysics-en';

interface Anomaly {
  where: string;
  note: string;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

type BookPlan =
  | { include: true; expectedChapters: number[]; expectTruncated: boolean }
  | { include: false; reason: string };

/**
 * The book-by-book decision, one entry per Wikisource subpage, each
 * individually verified by direct inspection (paragraph counts, red-link
 * counts, and reading every surviving paragraph) before this importer was
 * written - see this file's top doc comment and parseRoss1908.ts's doc
 * comment for the general findings.
 */
const BOOK_MANIFEST: Record<number, BookPlan> = {
  1: { include: true, expectedChapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], expectTruncated: false },
  2: { include: true, expectedChapters: [1, 2, 3], expectTruncated: false },
  3: { include: true, expectedChapters: [1, 2, 3, 4, 5, 6], expectTruncated: false },
  4: { include: true, expectedChapters: [1, 2, 3, 4, 6, 7, 8], expectTruncated: false },
  5: {
    include: true,
    expectedChapters: Array.from({ length: 30 }, (_, i) => i + 1),
    expectTruncated: false,
  },
  6: { include: true, expectedChapters: [1, 2, 3, 4], expectTruncated: false },
  7: { include: true, expectedChapters: [1, 2, 3, 4], expectTruncated: true },
  8: {
    include: false,
    reason:
      'Not transcribed on Wikisource as of this import: the page carries only red links to non-existent Page: scans (11 occurrences of "(page does not exist)"), with 0 chapters and effectively 0 chars of real prose (4 <p> elements total, all boilerplate/redlinks).',
  },
  // expectTruncated: true here means "the book stops right after this
  // chapter because the source's next block is an unproofread red link" -
  // chapter 1 itself ends cleanly (no mid-sentence cutoff within it).
  9: { include: true, expectedChapters: [1], expectTruncated: true },
  10: {
    include: false,
    reason:
      'Wrong source for this import\'s purpose: this subpage\'s text is explicitly labelled "Text derived from MIT classics page" and structured with "Part N" headings, not the djvu page-scan transcription of Ross\'s 1908 print (no Bekker/page-scan markup at all) - excluded on provenance grounds even though it happens to have substantial text, since it cannot be verified against the specified page-scan source.',
  },
  11: {
    include: false,
    reason:
      'Not transcribed on Wikisource as of this import: almost entirely red links (27 occurrences of "(page does not exist)"), 0 usable chapters.',
  },
  12: {
    include: false,
    reason:
      'Fragmentary and unreliable: what little non-red-linked content exists starts mid-sentence with no Chapter 1/2 heading present at all, the first real heading found is "CHAPTER III", and the surrounding footnote-like text is garbled raw OCR (e.g. "Digitized by VjOOQIC" - a classic mis-OCR of "Digitized by Google" - and unreadable strings like "navra xphv^oro. Jy 6ixov*^ wa vovs iKOoiV avta di€K6(rfirja\'€v*"), not proofread Wikisource prose. Excluded rather than risk shipping corrupted or discontinuous text as verbatim.',
  },
  13: { include: true, expectedChapters: [1], expectTruncated: true },
  14: {
    include: false,
    reason:
      'Not transcribed on Wikisource as of this import: almost entirely red links (17 occurrences of "(page does not exist)"), 0 usable chapters.',
  },
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];
  const bookDivisions: Division[] = [];
  let totalFootnoteRefsStripped = 0;
  let totalBookTitleLinesSkipped = 0;
  const includedSummary: { book: number; chapters: number; passages: number; truncated: boolean }[] = [];

  for (let bookNum = 1; bookNum <= 14; bookNum++) {
    const plan = BOOK_MANIFEST[bookNum]!;
    if (!plan.include) {
      anomalies.push({ where: `${WORK_ID} / book-${bookNum}`, note: `EXCLUDED ENTIRELY. ${plan.reason}` });
      continue;
    }

    const rawFile = join(RAW_DIR, `metaphysics-ross-1908-book-${bookNum}.json`);
    const raw = JSON.parse(readFileSync(rawFile, 'utf8')) as { parse?: { text?: { '*'?: string } } };
    const html = raw.parse?.text?.['*'];
    if (!html) fail(`book-${bookNum}: could not find .parse.text["*"] HTML string in ${rawFile}`);

    const parsed = parseBookHtml(html, bookNum);
    anomalies.push(...parsed.anomalies);
    totalFootnoteRefsStripped += parsed.totalFootnoteRefsStripped;
    totalBookTitleLinesSkipped += parsed.bookTitleLinesSkipped;

    const gotChapters = parsed.chapters.map((c) => c.number);
    const wantChapters = plan.expectedChapters;
    if (gotChapters.length !== wantChapters.length || gotChapters.some((n, i) => n !== wantChapters[i])) {
      fail(
        `book-${bookNum}: expected chapters [${wantChapters.join(',')}], parsed [${gotChapters.join(',')}] - the manifest above needs updating to match, or the source changed since this importer was verified.`,
      );
    }
    if ((parsed.truncated !== null) !== plan.expectTruncated) {
      fail(`book-${bookNum}: truncation expectation mismatch (expected ${plan.expectTruncated}, got ${parsed.truncated !== null})`);
    }
    for (const c of parsed.chapters) {
      if (c.passages.length === 0) fail(`book-${bookNum}-ch-${c.number}: no passages`);
      for (const p of c.passages) {
        if (p.text.length === 0) fail(`book-${bookNum}-ch-${c.number}: empty passage text`);
      }
    }

    const chapterDivisions: Division[] = parsed.chapters.map((c) => {
      const passages: Passage[] = c.passages.map((p) => {
        const passage: Passage = { n: '', text: p.text, ref: null };
        if (p.anomaly) passage.anomaly = p.anomaly;
        return passage;
      });
      return {
        id: `book-${bookNum}-ch-${c.number}`,
        number: String(c.number),
        ref: c.ref,
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
      children: chapterDivisions,
      passages: [],
    });

    const totalPassagesThisBook = chapterDivisions.reduce((n, c) => n + c.passages.length, 0);
    includedSummary.push({
      book: bookNum,
      chapters: chapterDivisions.length,
      passages: totalPassagesThisBook,
      truncated: parsed.truncated !== null,
    });

    if (wantChapters.length > 1) {
      const gaps: number[] = [];
      for (let n = wantChapters[0]!; n < wantChapters[wantChapters.length - 1]!; n++) {
        if (!wantChapters.includes(n)) gaps.push(n);
      }
      if (gaps.length > 0) {
        anomalies.push({
          where: `${WORK_ID} / book-${bookNum}`,
          note: `Chapter${gaps.length > 1 ? 's' : ''} ${gaps.join(', ')} ${gaps.length > 1 ? 'are' : 'is'} entirely absent from this Wikisource subpage - no heading, no red-link stub, the content simply jumps from the previous chapter straight to the next present one. Not fabricated here.`,
        });
      }
    }
    const lastIncluded = wantChapters[wantChapters.length - 1]!;
    // real chapter-count ceilings per the standard Bekker book divisions, for reporting only
    const REAL_CHAPTER_COUNTS: Record<number, number> = {
      1: 10, 2: 3, 3: 6, 4: 8, 5: 30, 6: 4, 7: 17, 8: 6, 9: 10, 10: 10, 11: 12, 12: 10, 13: 10, 14: 6,
    };
    const realTotal = REAL_CHAPTER_COUNTS[bookNum]!;
    const lastChapterParsed = parsed.chapters[parsed.chapters.length - 1];
    const lastChapterMidSentenceCut = lastChapterParsed?.passages.some((p) => p.anomaly?.startsWith('TRUNCATED')) ?? false;
    if (lastIncluded < realTotal || parsed.truncated) {
      const suffix = lastChapterMidSentenceCut ? ', the last chapter cut off mid-sentence' : '';
      anomalies.push({
        where: `${WORK_ID} / book-${bookNum}`,
        note: `Only ${wantChapters.length} of this book's ${realTotal} standard chapters are present in this Wikisource source (through chapter ${lastIncluded}${suffix}); the rest is not yet transcribed there. Not fabricated here.`,
      });
    }
  }

  anomalies.push({
    where: `${WORK_ID} / footnotes stripped`,
    note: `${totalFootnoteRefsStripped} inline footnote markers (Ross's editorial annotation) were removed from the reading text across all included books; the footnotes themselves are translator/editorial apparatus, not Aristotle's text, and are not preserved anywhere in this build.`,
  });
  anomalies.push({
    where: `${WORK_ID} / book-title lines skipped`,
    note: `${totalBookTitleLinesSkipped} "BOOK N (<letter>)" page-furniture line(s) (Wikisource navigation text, not Aristotle's words) were skipped.`,
  });
  anomalies.push({
    where: `${WORK_ID} / scope summary`,
    note: `Of the 14 Wikisource "Metaphysics (Ross, 1908)" book subpages, ${includedSummary.length} are included in this build (Books ${includedSummary.map((s) => s.book).join(', ')}), covering ${includedSummary.reduce((n, s) => n + s.chapters, 0)} chapters total; 5 are excluded entirely (Books ${Object.entries(BOOK_MANIFEST).filter(([, p]) => !p.include).map(([n]) => n).join(', ')}). See the per-book entries above for the individual reasons. The companion Greek edition (data/metaphysics-grc) is complete: all 14 books, 142 chapters.`,
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };
  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Metaphysics',
    author: 'Aristotle',
    language: 'en',
    translator: 'William David Ross',
    edition: 'Metaphysics, trans. W. D. Ross (1908)',
    provenance:
      'English Wikisource, "Metaphysics (Ross, 1908)" (14 book subpages), fetched once per book via the MediaWiki action=parse&prop=text API (a page-scan transclusion: action=parse&prop=wikitext returns only <pages/> markup, not the text itself, so the rendered HTML was fetched and parsed instead); imported by scripts/import-aristotle-metaphysics-en. The raw per-book dumps are committed under scripts/import-aristotle-metaphysics-en/raw/.',
    license:
      "Ross's 1908 translation is in the public domain (published before 1929; Ross died in 1971, so the translation is also public domain in life-plus-50/60/70-year jurisdictions). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Aristotle\'s Metaphysics — English, trans. Ross',
        paragraphs: [
          'This is Aristotle\'s Metaphysics in the English translation made by William David Ross, first published in 1908 - sixteen years before the SAME Ross edited the Greek critical text that stands alongside it in this library (data/metaphysics-grc): this is his own established Greek text, translated into English by his own hand, well before he became the series general editor of the Oxford "Works of Aristotle" translations (for which Categories and De Interpretatione were translated by Ella Mary Edghill, already in this library).',
          'The text here is the translation, verbatim. Nothing is modernised, paraphrased or silently corrected. Where the underlying page-scan transcription genuinely stops - mid-sentence, in two places - the cutoff is preserved exactly as far as it goes and flagged, never completed or guessed at.',
        ],
      },
      {
        heading: 'IMPORTANT: this edition is INCOMPLETE, not by this app\'s choice',
        paragraphs: [
          'Unlike every other bundled edition in this library, this one does not cover the whole work. English Wikisource\'s "Metaphysics (Ross, 1908)" project is, as of this import (2026-09-19), unfinished - its own page banner says "This work is incomplete. If you\'d like to help expand it..." - and the gap is large: of the work\'s 14 books, only 9 are represented here at all (Books 1–7, 9, 13), and several of those are themselves partial (Book 4 is missing its Chapter 5 entirely with no trace in the source; Book 7 has only its first 4 of 17 chapters, the last one cut off mid-sentence; Book 9 has only its first of 10 chapters; Book 13 has only its first of 10 chapters, also cut off mid-sentence). Books 8, 11 and 14 are not transcribed at all (their page-scan transclusions resolve to nothing but red links). Book 12\'s surviving fragments are too discontinuous and OCR-garbled to include reliably. Book 10, unusually, DOES have substantial text on Wikisource, but it turns out to be a plaintext copy from the MIT Classics website (not the page-scan transcription this import specifically sources from, and headed "Part N" rather than "Chapter N") - excluded here on provenance grounds rather than mixed in as if it were the same kind of source as the rest.',
          'None of this is fabricated, summarised, or filled in from another translation to paper over the gap - every chapter present here is verbatim Ross, verified against the actual page-scan transcription. See anomalies.json for the complete, book-by-book account, and data/metaphysics-grc (the Greek edition, which IS complete - all 14 books, 142 chapters) for the full text of the books not yet available here in English.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the RENDERED HTML of each included English Wikisource "Metaphysics (Ross, 1908)/Book N" subpage, fetched once through the MediaWiki action=parse&prop=text API and committed under the importer\'s raw/ directory (all 14 subpages were fetched and inspected, including the excluded ones, to reach the scope decision above). Like this library\'s other page-scan Wikisource imports, action=parse&prop=wikitext for these pages returns only <pages index="..." from=X to=Y/> transclusion markup, not the assembled text, so the already-rendered HTML was fetched and parsed with jsdom instead. It is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Unlike Categories/De Interpretatione\'s Edghill translation (which marks every chapter the same way), this source uses up to four different, sometimes mixed-within-a-book chapter-heading representations - a modern MediaWiki auto-heading, an older roman-numeral anchor template, a bare bold span with no id, and even one lone unstyled "CHAPTER I" text line - all individually identified and handled; see scripts/import-aristotle-metaphysics-en/parseRoss1908.ts\'s doc comment for the full census. Ordinary paragraphs become passages; wiki/HTML transport scaffolding only is removed (per-template <style>/<link> resets, page-number scan markers, edit-section links, and inline footnote-reference markers, which are counted and stripped - the footnotes themselves are editorial apparatus and are not preserved, matching this library\'s other English translations). Where a paragraph\'s own transcription crosses into an unproofread, red-linked page scan mid-sentence, only the surviving prefix is kept (flagged via that Passage\'s own `anomaly` field) and nothing further in that book is imported.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by book and chapter, plus a Bekker page reference where the source happens to print one: unlike Categories/De Interpretatione\'s Edghill translation (which prints Bekker markers throughout), this source carries them (via the same inline page/column-anchor convention) only in Book 1 - every other included book carries none, so Division.ref is null for their chapters. Passage.ref is null throughout (no marker is printed at every paragraph break in Book 1 either).',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See "IMPORTANT: this edition is INCOMPLETE" above for the headline account, and anomalies.json for the complete machine-readable log: every excluded book with its specific reason, every gap within an included book, both mid-sentence truncations with their exact last surviving words, every footnote marker and book-title line stripped, and (Book 1 only) the Bekker reference scheme.',
          'A word on trust: this source\'s own community-proofreading status is separately incomplete even for the parts that DO have text - Wikisource\'s validation process is ongoing - so isolated OCR/transcription slips are possible in the included chapters despite this importer\'s own care; that is a disclosed limitation of the source, not something silently papered over.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------
  process.stdout.write('\nIncluded books:\n');
  for (const s of includedSummary) {
    process.stdout.write(`  Book ${String(s.book).padStart(2)}  ${String(s.chapters).padStart(2)} chapters  ${String(s.passages).padStart(3)} passages${s.truncated ? '  (TRUNCATED)' : ''}\n`);
  }
  const excludedBooks = Object.entries(BOOK_MANIFEST).filter(([, p]) => !p.include).map(([n]) => n);
  process.stdout.write(`\nExcluded books: ${excludedBooks.join(', ')}\n`);
  const totalChapters = includedSummary.reduce((n, s) => n + s.chapters, 0);
  const totalPassages = includedSummary.reduce((n, s) => n + s.passages, 0);
  process.stdout.write(
    `\n  ${includedSummary.length}/14 books included  ${totalChapters} chapters  ${totalPassages} passages  ` +
      `(${totalFootnoteRefsStripped} footnote refs stripped, ${totalBookTitleLinesSkipped} book-title lines skipped, ${anomalies.length} anomalies total)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle-metaphysics-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
