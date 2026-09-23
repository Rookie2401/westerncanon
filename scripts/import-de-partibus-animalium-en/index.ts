/**
 * Aristotle, *On the Parts of Animals* (De partibus animalium) — William
 * Ogle's English translation (Oxford, 1912), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-partibus-animalium-en/index.ts
 *
 * Reads scripts/import-de-partibus-animalium-en/raw/parts-of-animals-book-N.json
 * (N = 1..4; already in the repo — each the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response for
 * "On the Parts of Animals/Book I".."/Book IV"). Writes:
 *   data/de-partibus-animalium-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/de-partibus-animalium-en/about.json      - provenance / licence metadata + About prose
 *   data/de-partibus-animalium-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-partibus-animalium-en/validate.ts`.
 *
 * --- What was verified before this importer was written -------------------
 * All four subpages exist and carry real transcribed prose (43-76 KB each);
 * none is a red-link stub. They are NOT page-scan transclusions, so the
 * plain-wikitext technique is used; the source prints no Bekker page/column
 * markers, so every Division.ref is null.
 *
 * Chapter marking here IS uniform (`==Part N==` wiki headings throughout, in
 * contrast to its sibling On the Generation of Animals, whose Books II-V use
 * bare number lines — each work's HTML/wikitext quirks were checked
 * independently rather than assumed to match).
 *
 * Books II, III and IV each ran normally for a while and then the Wikisource
 * page simply ended, in the middle of a sentence, with nothing after it but
 * the page's interwiki link:
 *   Book II  - 14 of the standard 17 chapters; ch. 14 broke off mid-sentence
 *              (and left a half-written "<A" opening tag dangling, which the
 *              shared parser strips as transport debris).
 *   Book III - 14 of the standard 15 chapters; ch. 14 broke off MID-WORD.
 *   Book IV  - 10 of MIT/Ogle's own 14 chapters; ch. 10 broke off mid-sentence.
 *              (Note: the traditional headcount often quoted for this book is
 *              13, but MIT's own page - verified directly, see below - prints
 *              a 14th "Part": this edition follows MIT's own structure rather
 *              than the traditional count.)
 * Only Book I was ever whole (5 of 5 chapters). All of this is now
 * SUPPLEMENTED (see "MIT SUPPLEMENT" below) and the edition is complete.
 *
 * ============================================================================
 * MIT SUPPLEMENT (added 2026-09-22) — Books II, III, IV completed
 * ============================================================================
 * Each of the three Wikisource cutoffs above happened at exactly the word
 * where the MIT Internet Classics Archive's OWN page for that book cuts off
 * too — the Wikisource transcription was evidently copied from MIT's page
 * verbatim, including its defect. Confirmed for all three book pages
 * (parts_animals.2.ii.html, .3.iii.html, .4.iv.html) by direct `curl` fetch:
 * each response's received byte count exactly matches the server's own
 * declared Content-Length header (101,471 bytes for all three, suspiciously
 * identical across books of very different total length - consistent with a
 * fixed-size server-side output-buffer bug, not a per-book defect). A
 * COMPLETE capture of each page survives in the Wayback Machine's earliest
 * snapshot on file, 2000-08-17, cached at raw/mit/parts_animals.N.<roman>.
 * wayback-20000817.html for N=2..4 - each with both `<A NAME="start">`/
 * `<A NAME="end">` markers, the ordinary closing navigation footer, the
 * on-page credit "Translated by William Ogle" (matching the
 * Wikisource-credited translator exactly), and MIT's own Part-heading count
 * for each book: 17 for Book II, 15 for Book III, 14 for Book IV - all
 * mechanically counted, not assumed.
 *
 * The overlap between Wikisource's own last words and MIT's continuation was
 * checked by exact substring search in each case and matched byte-for-byte
 * with no wording difference:
 *   Book II  ch.14 - "...nature decks it with" | MIT continues "hair, with
 *            long hair..." (word boundary; single-space join).
 *   Book III ch.14 - "...The explanatio" | MIT continues "n of this is
 *            that..." (MID-WORD; direct concatenation, no space, completing
 *            "explanation").
 *   Book IV  ch.10 - "...adapted to" | MIT continues "their operations, as
 *            indeed..." (word boundary; single-space join).
 * Each tail and each whole new chapter (Book II 15-17, Book III 15, Book IV
 * 11-14) is supplied verbatim from raw/supplement-pa-*.txt files, mechanically
 * extracted from the wayback HTML's own `<B>Part N</B>` / `<BR><BR>` markup
 * (never hand-retyped or paraphrased). See
 * scripts/import-aristotle-mit-supplement-shared/apply.ts for the generic
 * splice mechanism and about.json / anomalies.json for the reader-facing
 * disclosure.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';
import { applyMitSupplements } from '../import-aristotle-mit-supplement-shared/apply.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-partibus-animalium-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
const BOOK_CHAPTERS: Record<number, number[]> = { 1: run(5), 2: run(14), 3: run(14), 4: run(10) };
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'On the Parts of Animals',
  author: 'Aristotle',
  language: 'en',
  translator: 'William Ogle',
  editor: 'John Alexander Smith and William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume V: De partibus animalium, trans. William Ogle (Oxford: Clarendon Press, 1912)',
  provenance:
    'English Wikisource, pages "On the Parts of Animals/Book I" through "/Book IV", each fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-partibus-animalium-en/raw/. These pages are ORDINARY WIKITEXT rather than djvu page-scan transclusions, so the wikitext itself is the text; imported by scripts/import-de-partibus-animalium-en.',
  license:
    "Ogle's 1912 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        "Aristotle's On the Parts of Animals in William Ogle's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1912 as part of that series' volume V. Book I is Aristotle's methodological manifesto for the study of living things — the case for explanation by final cause and for dividing animals by their real affinities rather than by dichotomy; Books II-IV work systematically through the uniform and non-uniform parts of animals and the reasons for them.",
        'The text here is the translation, verbatim throughout, whichever of the two sources (English Wikisource or MIT, see below) a given word comes from. Nothing is modernised, paraphrased, or silently corrected in either source.',
      ],
    },
    {
      heading: 'Text completeness: Books II, III and IV completed from MIT',
      paragraphs: [
        "This edition is now complete. Book I was always whole (5/5 chapters). Books II, III and IV each read normally on English Wikisource for a while and then the transcription simply stopped, in the middle of a sentence (mid-word in Book III): Book II broke off in chapter 14 (\"...nature decks it with\"), Book III in chapter 14 (\"...The explanatio\", mid-word), Book IV in chapter 10 (\"...adapted to\"). In every case this happened because the Wikisource page was itself copied from the MIT Internet Classics Archive's page for that book, which cuts off at exactly the same word. MIT's own LIVE pages still have this defect today (confirmed by direct fetch: received bytes exactly match each page's own declared Content-Length — a genuine server-side bug affecting all three book pages identically, not a download error), but a COMPLETE capture of each page survives in the Wayback Machine's earliest snapshot on file, from 2000-08-17, each carrying the on-page credit \"Translated by William Ogle\" and MIT's own chapter count for that book.",
        "MIT's own structure gives Book II 17 chapters, Book III 15, and Book IV 14 — verified directly by counting that capture's own \"Part N\" headings, not assumed. (Book IV in particular: the traditional headcount sometimes quoted for it is 13, but MIT's page — the same edition this whole corpus otherwise follows — prints a 14th \"Part\"; this edition follows MIT's own structure and reports the difference rather than silently picking one.) The rest of chapter 14/14/10 and the whole of chapters II.15-17, III.15 and IV.11-14 are supplied verbatim from those captures, mechanically extracted from their HTML (never hand-retyped or paraphrased). Each affected chapter's Passage carries an `anomaly` field disclosing exactly where Wikisource's own text ends and MIT's begins, or that the whole chapter comes from MIT; see anomalies.json for the full account, including each overlap sentence and whether the join was a single space or (Book III chapter 14 only) a direct mid-word concatenation completing \"explanation\".",
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is the raw wikitext of the four English Wikisource "On the Parts of Animals/Book N" subpages, fetched once each and committed under the importer\'s raw/ directory. This batch\'s brief expected page-scan transclusions (for which only the rendered HTML carries text); direct inspection found ordinary wikitext instead — 43-76 KB of real prose per page — so the wikitext route was used and the difference is disclosed here. The text is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Each page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and closes with an interwiki link that is likewise skipped. Chapters are marked uniformly by `==Part N==` wiki headings — "Part" being this digitisation\'s word for a chapter — and each heading starts a new Chapter division; every paragraph beneath it, in document order, becomes part of that chapter\'s single Passage, joined by blank lines.',
        "That uniformity was checked for this work specifically rather than assumed from its volume-mate On the Generation of Animals, whose Books II-V mark chapters quite differently (bare number lines). The importer refuses to ship a division it has not been told to expect: each book declares its exact chapter numbers in advance, and a mismatch stops the run.",
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by book and chapter only. This digitisation prints no Bekker page/column markers anywhere, so every Division.ref and every Passage.ref is null. No Bekker reference has been reconstructed or estimated, because doing so would mean inventing a citation the source does not support.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        'See "Text completeness" above for the headline account, now resolved. anomalies.json carries the complete machine-readable log: each of the three original mid-sentence cutoffs with its exact last surviving words, the MIT supplement\'s provenance and overlap verification for all six supplemented chapters, the half-written HTML tag left dangling at the end of Book II\'s Wikisource text (stripped as transport debris, not treated as a word), every furniture line skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.',
        "A word on trust: this is a plaintext digitisation rather than a page-by-page proofread against a scan, so isolated transcription slips are possible even in the parts that are present. That is a disclosed limitation of the source, not something quietly corrected here.",
      ],
    },
  ],
};

const MIT_TAIL_2_14 =
  'SUPPLEMENTED: the Wikisource transcription of Book II ends here ("...nature decks it with"), leaving a half-written HTML opening tag dangling (stripped as transport debris, not a word Ogle wrote), because it was itself copied from the MIT Internet Classics Archive\'s page for this book, which cuts off at the same word. MIT\'s own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length, a genuine server-side bug shared by all three affected book pages here, not a download error). Everything from "hair, with long hair..." onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-17), matched byte-for-byte against Wikisource\'s own last words with no wording difference, and joined with a single space (the cut fell at a word boundary). Chapters 15-17 (MIT\'s own count for this book) are likewise supplied whole from the same capture. See this importer\'s module doc and raw/supplement-pa-2-*.txt for the full account.';
const MIT_TAIL_3_14 =
  'SUPPLEMENTED: the Wikisource transcription of Book III ends here, in the MIDDLE OF A WORD ("...The explanatio"), because it was itself copied from the MIT Internet Classics Archive\'s page for this book, which cuts off at the same point. MIT\'s own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length). The rest of the same word, "n of this is that...", is appended with NO space, completing "explanation" - and everything after it onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-17), matched byte-for-byte against Wikisource\'s own last words with no wording difference. Chapter 15 - MIT/Ogle\'s own 15th chapter of this book, present on MIT\'s page though sometimes omitted from headcounts that quote a traditional 14 - is likewise supplied whole from the same capture. See this importer\'s module doc and raw/supplement-pa-3-*.txt for the full account.';
const MIT_TAIL_4_10 =
  'SUPPLEMENTED: the Wikisource transcription of Book IV ends here ("...adapted to"), because it was itself copied from the MIT Internet Classics Archive\'s page for this book, which cuts off at the same word. MIT\'s own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length). Everything from "their operations, as indeed..." onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-17), matched byte-for-byte against Wikisource\'s own last words with no wording difference, and joined with a single space (the cut fell at a word boundary). Chapters 11-14 are likewise supplied whole from the same capture - MIT\'s own page counts 14 chapters for this book, not the 13 sometimes quoted as the traditional count; this edition follows MIT\'s own structure and reports the difference rather than silently picking one. See this importer\'s module doc and raw/supplement-pa-4-*.txt for the full account.';

function wholeChapterAnomaly(book: number, roman: string, chapter: number): string {
  return `SUPPLEMENTED: Wikisource's transcription of Book ${roman} never carried Chapter ${chapter} at all (its page stops earlier in this same book — see the book-${book} tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-17) of MIT's own page for this book (raw/mit/parts_animals.${book}.${roman.toLowerCase()}.wayback-20000817.html), which carries the on-page credit "Translated by William Ogle" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).`;
}

runWikitextImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: OUT_DIR,
  shape: 'book-chapter',
  pages: [1, 2, 3, 4].map((n) => ({
    rawFile: `parts-of-animals-book-${n}.json`,
    pageTitle: `On the Parts of Animals/Book ${ROMAN[n]}`,
    label: `book-${n}`,
    expectedChapters: BOOK_CHAPTERS[n]!,
    book: n,
  })),
  about,
  // Standard chapter counts, used only to report how far short each book
  // falls before supplementing - never to fill anything in. Book IV is 14,
  // not the sometimes-quoted traditional 13: verified directly against
  // MIT's own page (see the module doc's "MIT SUPPLEMENT" section).
  traditionalChapterCounts: { 1: 5, 2: 17, 3: 15, 4: 14 },
  passageAnomalies: {
    'book-2:14': MIT_TAIL_2_14,
    'book-3:14': MIT_TAIL_3_14,
    'book-4:10': MIT_TAIL_4_10,
  },
  extraAnomalies: [
    {
      where: `${WORK_ID} / completeness`,
      note: 'COMPLETE (as of the 2026-09-22 MIT supplement). Book I was always whole (5/5, ends cleanly). Books II, III and IV originally stopped mid-sentence (mid-word in Book III) on English Wikisource, at 14/17, 14/15 and 10/14 chapters respectively; each has now been completed from a Wayback Machine capture of the MIT Internet Classics Archive\'s own copy of this same Ogle translation, whose live page has the identical defect (see the three book-N-ch-M tail anomalies and the six "whole chapter" anomalies below for the full, per-chapter account). Total: 51 chapters across 4 books (5 + 17 + 15 + 14), all of it Ogle\'s translation verbatim, part MIT-sourced (17 of the 51 chapters: the tails of II.14/III.14/IV.10 and the whole of II.15-17, III.15, IV.11-14) and the rest Wikisource-sourced.',
    },
    {
      where: `${WORK_ID} / book-2 stray markup`,
      note: 'Book II\'s Wikisource transcription broke off leaving a half-written HTML opening tag ("<A") at the very end of its last surviving sentence. It is transport debris rather than a word of the translation, so it was removed; the words before it are kept verbatim. No other page in this work left such a fragment.',
    },
    {
      where: `${WORK_ID} / chapter marker shape`,
      note: 'All four Wikisource pages mark chapters uniformly with "==Part N==" wiki headings. This was verified for this work independently and NOT assumed from its 1912 volume-mate On the Generation of Animals, whose Books II-V use a quite different bare-number-line marker. MIT\'s own pages use the same "Part N" convention (via a `<B>...</B>` heading rather than wikitext), likewise verified directly.',
    },
    {
      where: `${WORK_ID} / reference scheme`,
      note: 'Division.ref and Passage.ref are null throughout: neither Wikisource\'s plaintext digitisation nor MIT\'s Internet Classics Archive prints Bekker page/column markers anywhere in this work (confirmed across all four Wikisource pages and all three MIT supplement pages). No Bekker reference was reconstructed, because any such citation would be invented rather than read from either source.',
    },
    {
      where: `${WORK_ID} / relation to the Greek sibling`,
      note: 'This English edition was parsed entirely independently of any Greek edition of De partibus animalium; the two are not forced to agree on chapter boundaries, and no division here was adjusted to match a Greek text.',
    },
    {
      where: `${WORK_ID} / MIT supplement source verification`,
      note: 'MIT\'s Internet Classics Archive credits this translation "Translated by William Ogle" on all three fetched book pages (verified by direct inspection of raw/mit/parts_animals.{2.ii,3.iii,4.iv}.wayback-20000817.html), matching the Wikisource-credited translator exactly. MIT\'s own live pages for Books II-IV are each themselves truncated at the identical word Wikisource stops at (same underlying page, copied before it broke); the complete text used to supplement them comes from the Wayback Machine\'s earliest capture on file for each (2000-08-17), which carries both `<A NAME="start">`/`<A NAME="end">` markers and the ordinary closing navigation footer MIT\'s live copies currently lack.',
    },
    {
      where: `${WORK_ID} / book-2-ch-15`, note: wholeChapterAnomaly(2, 'II', 15),
    },
    {
      where: `${WORK_ID} / book-2-ch-16`, note: wholeChapterAnomaly(2, 'II', 16),
    },
    {
      where: `${WORK_ID} / book-2-ch-17`, note: wholeChapterAnomaly(2, 'II', 17),
    },
    {
      where: `${WORK_ID} / book-3-ch-15`, note: wholeChapterAnomaly(3, 'III', 15),
    },
    {
      where: `${WORK_ID} / book-4-ch-11`, note: wholeChapterAnomaly(4, 'IV', 11),
    },
    {
      where: `${WORK_ID} / book-4-ch-12`, note: wholeChapterAnomaly(4, 'IV', 12),
    },
    {
      where: `${WORK_ID} / book-4-ch-13`, note: wholeChapterAnomaly(4, 'IV', 13),
    },
    {
      where: `${WORK_ID} / book-4-ch-14`, note: wholeChapterAnomaly(4, 'IV', 14),
    },
  ],
});

const rawDir = join(HERE, 'raw');
applyMitSupplements(OUT_DIR, {
  tails: [
    { book: 2, chapter: 14, supplementFile: join(rawDir, 'supplement-pa-2-14-tail.txt'), midWord: false, anomaly: MIT_TAIL_2_14 },
    { book: 3, chapter: 14, supplementFile: join(rawDir, 'supplement-pa-3-14-tail.txt'), midWord: true, anomaly: MIT_TAIL_3_14 },
    { book: 4, chapter: 10, supplementFile: join(rawDir, 'supplement-pa-4-10-tail.txt'), midWord: false, anomaly: MIT_TAIL_4_10 },
  ],
  wholeChapters: [
    { book: 2, chapter: 15, supplementFile: join(rawDir, 'supplement-pa-2-15.txt'), anomaly: wholeChapterAnomaly(2, 'II', 15) },
    { book: 2, chapter: 16, supplementFile: join(rawDir, 'supplement-pa-2-16.txt'), anomaly: wholeChapterAnomaly(2, 'II', 16) },
    { book: 2, chapter: 17, supplementFile: join(rawDir, 'supplement-pa-2-17.txt'), anomaly: wholeChapterAnomaly(2, 'II', 17) },
    { book: 3, chapter: 15, supplementFile: join(rawDir, 'supplement-pa-3-15.txt'), anomaly: wholeChapterAnomaly(3, 'III', 15) },
    { book: 4, chapter: 11, supplementFile: join(rawDir, 'supplement-pa-4-11.txt'), anomaly: wholeChapterAnomaly(4, 'IV', 11) },
    { book: 4, chapter: 12, supplementFile: join(rawDir, 'supplement-pa-4-12.txt'), anomaly: wholeChapterAnomaly(4, 'IV', 12) },
    { book: 4, chapter: 13, supplementFile: join(rawDir, 'supplement-pa-4-13.txt'), anomaly: wholeChapterAnomaly(4, 'IV', 13) },
    { book: 4, chapter: 14, supplementFile: join(rawDir, 'supplement-pa-4-14.txt'), anomaly: wholeChapterAnomaly(4, 'IV', 14) },
  ],
});
process.stdout.write('MIT supplement applied to de-partibus-animalium-en. Run `npx tsx scripts/import-de-partibus-animalium-en/validate.ts` next.\n');
