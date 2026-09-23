/**
 * Aristotle, *History of Animals* (Historia animalium) — D'Arcy Wentworth
 * Thompson's English translation (Oxford, 1910), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-historia-animalium-en/index.ts
 *
 * Reads scripts/import-historia-animalium-en/raw/history-of-animals-book-N.json
 * (N = 1..9; already in the repo — each the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response for
 * "History of Animals (Thompson)/Book I".."/Book IX"). Writes:
 *   data/historia-animalium-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/historia-animalium-en/about.json      - provenance / licence metadata + About prose
 *   data/historia-animalium-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-historia-animalium-en/validate.ts`.
 *
 * --- NINE BOOKS, NOT TEN (checked, not assumed) ---------------------------
 * The Greek tradition transmits a tenth book of the Historia animalium, but
 * it is widely judged spurious and Thompson did not translate it. This was
 * verified directly rather than taken on trust: a batched existence check of
 * "History of Animals (Thompson)/Book X" against the MediaWiki API returns
 * `missing` (no page at all — not even a red-link stub), and the work's own
 * Wikisource contents page lists Books I-IX only. No tenth book is
 * fabricated; the finding is logged in anomalies.json.
 *
 * --- What else was verified before this importer was written --------------
 * All nine existing subpages carry real transcribed prose (36-102 KB each).
 * They are NOT page-scan transclusions, so the plain-wikitext technique is
 * used; the source prints no Bekker page/column markers, so every
 * Division.ref is null.
 *
 * MIXED CHAPTER-MARKER SHAPES, confirmed page by page: Books I, III, V and VI
 * use `==Part N==` wiki headings, while Books II, IV, VII, VIII and IX mark
 * chapters with a bare "Part N" text line carrying no wiki markup at all — a
 * shape a headings-only parser would read as ZERO chapters, silently losing
 * five of the nine books. Both are handled in one pass, and the bare-line
 * rule requires the line to be exactly "Part N" so that ordinary short
 * sentences (e.g. Book IV's "So much for molluscs.") are never mistaken for
 * markers.
 *
 * --- TWO BOOKS STOPPED MID-SENTENCE — NOW SUPPLEMENTED FROM MIT ----------
 * Books I-VII are complete against the standard division (17, 17, 22, 11, 34,
 * 37, 12 chapters). Books VIII and IX originally were not: each ran normally
 * and then the Wikisource page simply ended mid-sentence, Book VIII after 21
 * of its standard 30 chapters and Book IX after 39 of its standard 50.
 *
 * ============================================================================
 * MIT SUPPLEMENT (added 2026-09-22) — Books VIII and IX completed
 * ============================================================================
 * Both cutoffs happened at exactly the word where the MIT Internet Classics
 * Archive's OWN page for that book cuts off too — the Wikisource
 * transcription was evidently copied from MIT's page verbatim, including its
 * defect. Confirmed for both book pages (history_anim.8.viii.html,
 * .9.ix.html) by direct `curl` fetch: each response's received byte count
 * exactly matches the server's own declared Content-Length header (101,476
 * bytes for both — identical to the byte, consistent with a fixed-size
 * server-side output-buffer bug affecting MIT's Aristotle pages generally,
 * not a per-book defect; the sibling import-de-caelo-en and
 * import-de-partibus-animalium-en importers hit the same bug on their own
 * pages, at their own different cutoff points). A COMPLETE capture of each
 * page survives in the Wayback Machine's earliest snapshot on file,
 * 2000-08-18, cached at raw/mit/history_anim.N.<roman>.wayback-20000818.html
 * for N=8,9 — each with both `<A NAME="start">`/`<A NAME="end">` markers,
 * the ordinary closing navigation footer, the on-page credit "Translated by
 * D'Arcy Wentworth Thompson" (matching the Wikisource-credited translator
 * exactly), and MIT's own Part-heading count for each book: 30 for Book
 * VIII, 50 for Book IX — both mechanically counted and both matching the
 * standard division exactly, so no chapter-count discrepancy arises here
 * (unlike De partibus animalium's Book IV).
 *
 * The overlap between Wikisource's own last words and MIT's continuation was
 * checked by exact substring search in each case and matched byte-for-byte
 * with no wording difference:
 *   Book VIII ch.21 - "...chickpeas and figs, but the one thing essent" | MIT
 *             continues "ial is to vary the food..." (MID-WORD; direct
 *             concatenation, no space, completing "essential").
 *   Book IX   ch.39 - "...run round and draw threads about its mouth until
 *             it closes" | MIT continues "the mouth up; then it comes up and
 *             bites it." (word boundary; single-space join).
 * Each tail and each whole new chapter (Book VIII 22-30, Book IX 40-50) is
 * supplied verbatim from raw/supplement-ha-*.txt files, mechanically
 * extracted from the wayback HTML's own `<B>Part N</B>` / `<BR><BR>` markup
 * (never hand-retyped or paraphrased). See
 * scripts/import-aristotle-mit-supplement-shared/apply.ts for the generic
 * splice mechanism and about.json / anomalies.json for the reader-facing
 * disclosure.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import { applyMitSupplements } from '../import-aristotle-mit-supplement-shared/apply.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'historia-animalium-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
/** chapters actually present in the source, book by book (verified before writing this importer) */
const PRESENT: Record<number, number> = { 1: 17, 2: 17, 3: 22, 4: 11, 5: 34, 6: 37, 7: 12, 8: 21, 9: 39 };
/** chapter counts of the standard division, for reporting the shortfall only */
const STANDARD: Record<number, number> = { 1: 17, 2: 17, 3: 22, 4: 11, 5: 34, 6: 37, 7: 12, 8: 30, 9: 50 };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'History of Animals',
  author: 'Aristotle',
  language: 'en',
  translator: "D'Arcy Wentworth Thompson",
  editor: 'John Alexander Smith and William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume IV: Historia animalium, trans. D\'Arcy Wentworth Thompson (Oxford: Clarendon Press, 1910)',
  provenance:
    'English Wikisource, pages "History of Animals (Thompson)/Book I" through "/Book IX", each fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-historia-animalium-en/raw/. These pages are ORDINARY WIKITEXT rather than djvu page-scan transclusions, so the wikitext itself is the text; imported by scripts/import-historia-animalium-en.',
  license:
    "Thompson's 1910 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        "Aristotle's History of Animals in D'Arcy Wentworth Thompson's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1910 as that series' volume IV. It is the great descriptive survey on which the rest of Aristotle's biology rests: the parts of animals and their differences, the ways animals live, feed, breed, migrate and behave — the observations of fishes, bees, birds and cephalopods for which the treatise is still read.",
        "Thompson was himself a naturalist and classicist — the author of A Glossary of Greek Birds and later of On Growth and Form — and his version has stayed the standard English one. The text here is the translation, verbatim throughout, whichever of the two sources (English Wikisource or MIT, see below) a given word comes from. Nothing is modernised, paraphrased, or silently corrected in either source.",
      ],
    },
    {
      heading: 'Nine books, not ten',
      paragraphs: [
        "The Greek manuscript tradition hands down a tenth book of the History of Animals, but it is widely judged not to be Aristotle's, and Thompson did not translate it. That is what this edition reflects, and it was checked rather than assumed: there is no Wikisource page for a Book X at all — an existence query against the site's API returns nothing, not even an untranscribed stub — and the work's own contents page lists Books I to IX only.",
        'No tenth book has been fabricated, and none has been imported from any other translation to make the set look complete.',
      ],
    },
    {
      heading: 'Text completeness: Books VIII and IX completed from MIT',
      paragraphs: [
        "This edition is now complete. Seven of the nine books were always complete against the standard division. Book VIII's Wikisource transcription broke off in the middle of a word after 21 of its 30 chapters (\"...chickpeas and figs, but the one thing essent\"), and Book IX's after 39 of its 50 (\"...run round and draw threads about its mouth until it closes\"). Both happened because the Wikisource page was itself copied from the MIT Internet Classics Archive's page for that book, which cuts off at exactly the same point. MIT's own LIVE pages still have this defect today (confirmed by direct fetch: received bytes exactly match each page's own declared Content-Length — a genuine server-side bug, not a download error, and identical down to the byte between the two books, 101,476 bytes each), but a COMPLETE capture of each page survives in the Wayback Machine's earliest snapshot on file, from 2000-08-18, each carrying the on-page credit \"Translated by D'Arcy Wentworth Thompson\" and MIT's own chapter count for that book — 30 for Book VIII, 50 for Book IX, both matching the standard division exactly.",
        'The rest of chapter VIII.21 (completing the word "essential") and IX.39, and the whole of chapters VIII.22-30 and IX.40-50, are supplied verbatim from those captures, mechanically extracted from their HTML (never hand-retyped or paraphrased). Each affected chapter\'s Passage carries an `anomaly` field disclosing exactly where Wikisource\'s own text ends and MIT\'s begins, or that the whole chapter comes from MIT; see anomalies.json for the full account. Books I-VII remain unaffected: 150 chapters, whole, from Wikisource alone.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is (i) the raw wikitext of the nine English Wikisource "History of Animals (Thompson)/Book N" subpages, fetched once each and committed under the importer\'s raw/ directory, and (ii) for the parts of Books VIII and IX that Wikisource lacks, hand-transcribed plain-text files (scripts/import-historia-animalium-en/raw/supplement-ha-8-*.txt, supplement-ha-9-*.txt) mechanically extracted from complete Wayback Machine captures of MIT\'s own pages for those two books (raw/mit/history_anim.{8.viii,9.ix}.wayback-20000818.html), each carrying its own provenance header. This batch\'s brief expected page-scan transclusions (for which only the rendered HTML carries text); direct inspection found ordinary wikitext instead — 36-102 KB of real prose per page — so the wikitext route was used and the difference is disclosed here. The text is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Each page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and closes with an interwiki link that is likewise skipped. Chapter marking is NOT uniform across the nine pages, and this mattered: Books I, III, V and VI head their chapters `==Part N==`, but Books II, IV, VII, VIII and IX mark them with a bare "Part N" line carrying no wiki markup at all — a shape that a headings-driven parser would read as zero chapters, silently losing five of the nine books. Both shapes are handled in one pass, and the bare-line rule demands an exact "Part N" match so that ordinary short sentences in the text (Book IV\'s "So much for molluscs." among them) are never mistaken for markers.',
        'The importer refuses to ship a division it has not been told to expect: each book declares its exact chapter numbers in advance, and a mismatch stops the run rather than silently producing a different book.',
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
        'See "Nine books, not ten" and "Text completeness" above for the substantive points. anomalies.json carries the complete machine-readable log: the absence of Book X with the evidence for it, both original mid-sentence/mid-word cutoffs with their exact last surviving words, the MIT supplement\'s provenance and overlap verification for all 11 supplemented chapters (VIII.21 tail + VIII.22-30, IX.39 tail + IX.40-50), the mixed chapter-marker shapes, every furniture line skipped, and the null reference scheme.',
        "A word on trust: this is a plaintext digitisation rather than a page-by-page proofread against a scan, so isolated transcription slips are possible even in the complete books. That is a disclosed limitation of the source, not something quietly corrected here.",
      ],
    },
  ],
};

const MIT_TAIL_8_21 =
  'SUPPLEMENTED: the Wikisource transcription of Book VIII ends here, in the MIDDLE OF A WORD ("...chickpeas and figs, but the one thing essent"), because it was itself copied from the MIT Internet Classics Archive\'s page for this book, which cuts off at the same point. MIT\'s own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length, a genuine server-side bug shared with Book IX\'s own page here, not a download error). The rest of the same word, "ial is to vary the food...", is appended with NO space, completing "essential" - and everything after it onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-18), matched byte-for-byte against Wikisource\'s own last words with no wording difference. Chapters 22-30 (MIT\'s own count for this book, matching the standard division) are likewise supplied whole from the same capture. See this importer\'s module doc and raw/supplement-ha-8-*.txt for the full account.';
const MIT_TAIL_9_39 =
  'SUPPLEMENTED: the Wikisource transcription of Book IX ends here ("...run round and draw threads about its mouth until it closes"), because it was itself copied from the MIT Internet Classics Archive\'s page for this book, which cuts off at the same word. MIT\'s own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length). Everything from "the mouth up; then it comes up and bites it." onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-18), matched byte-for-byte against Wikisource\'s own last words with no wording difference, and joined with a single space (the cut fell at a word boundary). Chapters 40-50 (MIT\'s own count for this book, matching the standard division) are likewise supplied whole from the same capture. See this importer\'s module doc and raw/supplement-ha-9-*.txt for the full account.';

function wholeChapterAnomaly(book: number, roman: string, chapter: number, tailBookChapter: string): string {
  return `SUPPLEMENTED: Wikisource's transcription of Book ${roman} never carried Chapter ${chapter} at all (its page stops earlier in this same book, at chapter ${tailBookChapter} — see the book-${book}:${tailBookChapter} tail anomaly above). This whole chapter is supplied verbatim from a complete Wayback Machine capture (2000-08-18) of MIT's own page for this book (raw/mit/history_anim.${book}.${roman.toLowerCase()}.wayback-20000818.html), which carries the on-page credit "Translated by D'Arcy Wentworth Thompson" matching Wikisource's own translator, mechanically extracted from its HTML (never hand-retyped or paraphrased).`;
}

runWikitextImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: OUT_DIR,
  shape: 'book-chapter',
  pages: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    rawFile: `history-of-animals-book-${n}.json`,
    pageTitle: `History of Animals (Thompson)/Book ${ROMAN[n]}`,
    label: `book-${n}`,
    expectedChapters: run(PRESENT[n]!),
    book: n,
  })),
  about,
  traditionalChapterCounts: STANDARD,
  passageAnomalies: {
    'book-8:21': MIT_TAIL_8_21,
    'book-9:39': MIT_TAIL_9_39,
  },
  extraAnomalies: [
    {
      where: `${WORK_ID} / book-10 (absent)`,
      note: 'NO BOOK X IS SHIPPED, and none is fabricated. The Greek tradition transmits a tenth book of the Historia animalium, but it is widely judged spurious and Thompson did not translate it. Verified directly: a batched MediaWiki existence query for "History of Animals (Thompson)/Book X" returns `missing` — the page does not exist at all, not even as an untranscribed red-link stub — and the work\'s own Wikisource contents page lists Books I-IX only. This is a property of the translation, not a gap in this import. (MIT\'s own Internet Classics Archive index page, history_anim.html, likewise lists only Books I-IX for this translation.)',
    },
    {
      where: `${WORK_ID} / completeness`,
      note: 'COMPLETE (as of the 2026-09-22 MIT supplement). Books I-VII were always complete against the standard division (17, 17, 22, 11, 34, 37, 12 chapters = 150). Books VIII and IX originally stopped short on Wikisource (mid-sentence, mid-word in Book VIII) at 21/30 and 39/50 chapters; each has now been completed from a Wayback Machine capture of the MIT Internet Classics Archive\'s own copy of this same Thompson translation, whose live page has the identical defect (see the two book-N:M tail anomalies and the "whole chapter" anomalies below for the full, per-chapter account). Total: 230 chapters across 9 books (Books I-VII 150 + Book VIII 30 + Book IX 50), all of it Thompson\'s translation verbatim, part MIT-sourced (19 of the 230 chapters: the tails of VIII.21/IX.39 and the whole of VIII.22-30, IX.40-50) and the rest Wikisource-sourced.',
    },
    {
      where: `${WORK_ID} / chapter marker shapes`,
      note: 'The nine Wikisource source pages do NOT mark chapters the same way: Books I, III, V and VI use "==Part N==" wiki headings, Books II, IV, VII, VIII and IX use a bare "Part N" text line with no wiki markup. Both were handled; a headings-only parser would have returned zero chapters for five of the nine books. The bare-line rule requires an exact "Part N" match, so ordinary short sentences in the text (e.g. Book IV\'s "So much for molluscs.") are not mistaken for markers. MIT\'s own pages for Books VIII-IX use a `<B>Part N</B>` HTML heading instead, likewise verified directly and handled by a separate mechanical parser (see scripts/import-aristotle-mit-supplement-shared/apply.ts and the generation of raw/supplement-ha-*.txt).',
    },
    {
      where: `${WORK_ID} / reference scheme`,
      note: 'Division.ref and Passage.ref are null throughout: neither Wikisource\'s plaintext digitisation nor MIT\'s Internet Classics Archive prints Bekker page/column markers anywhere in this work (confirmed across all nine Wikisource pages and both MIT supplement pages). No Bekker reference was reconstructed, because any such citation would be invented rather than read from either source.',
    },
    {
      where: `${WORK_ID} / relation to the Greek sibling`,
      note: 'This English edition was parsed entirely independently of any Greek edition of the Historia animalium; the two are not forced to agree on chapter or book boundaries, and no division here was adjusted to match a Greek text — which matters especially for this work, whose Greek tradition has a tenth book that this translation does not.',
    },
    {
      where: `${WORK_ID} / MIT supplement source verification`,
      note: 'MIT\'s Internet Classics Archive credits this translation "Translated by D\'Arcy Wentworth Thompson" on both fetched book pages (verified by direct inspection of raw/mit/history_anim.{8.viii,9.ix}.wayback-20000818.html), matching the Wikisource-credited translator exactly. MIT\'s own live pages for Books VIII-IX are each themselves truncated at the identical word Wikisource stops at (same underlying page, copied before it broke); the complete text used to supplement them comes from the Wayback Machine\'s earliest capture on file for each (2000-08-18), which carries both `<A NAME="start">`/`<A NAME="end">` markers and the ordinary closing navigation footer MIT\'s live copies currently lack.',
    },
    { where: `${WORK_ID} / book-8-ch-22`, note: wholeChapterAnomaly(8, 'VIII', 22, '21') },
    { where: `${WORK_ID} / book-8-ch-23`, note: wholeChapterAnomaly(8, 'VIII', 23, '21') },
    { where: `${WORK_ID} / book-8-ch-24`, note: wholeChapterAnomaly(8, 'VIII', 24, '21') },
    { where: `${WORK_ID} / book-8-ch-25`, note: wholeChapterAnomaly(8, 'VIII', 25, '21') },
    { where: `${WORK_ID} / book-8-ch-26`, note: wholeChapterAnomaly(8, 'VIII', 26, '21') },
    { where: `${WORK_ID} / book-8-ch-27`, note: wholeChapterAnomaly(8, 'VIII', 27, '21') },
    { where: `${WORK_ID} / book-8-ch-28`, note: wholeChapterAnomaly(8, 'VIII', 28, '21') },
    { where: `${WORK_ID} / book-8-ch-29`, note: wholeChapterAnomaly(8, 'VIII', 29, '21') },
    { where: `${WORK_ID} / book-8-ch-30`, note: wholeChapterAnomaly(8, 'VIII', 30, '21') },
    { where: `${WORK_ID} / book-9-ch-40`, note: wholeChapterAnomaly(9, 'IX', 40, '39') },
    { where: `${WORK_ID} / book-9-ch-41`, note: wholeChapterAnomaly(9, 'IX', 41, '39') },
    { where: `${WORK_ID} / book-9-ch-42`, note: wholeChapterAnomaly(9, 'IX', 42, '39') },
    { where: `${WORK_ID} / book-9-ch-43`, note: wholeChapterAnomaly(9, 'IX', 43, '39') },
    { where: `${WORK_ID} / book-9-ch-44`, note: wholeChapterAnomaly(9, 'IX', 44, '39') },
    { where: `${WORK_ID} / book-9-ch-45`, note: wholeChapterAnomaly(9, 'IX', 45, '39') },
    { where: `${WORK_ID} / book-9-ch-46`, note: wholeChapterAnomaly(9, 'IX', 46, '39') },
    { where: `${WORK_ID} / book-9-ch-47`, note: wholeChapterAnomaly(9, 'IX', 47, '39') },
    { where: `${WORK_ID} / book-9-ch-48`, note: wholeChapterAnomaly(9, 'IX', 48, '39') },
    { where: `${WORK_ID} / book-9-ch-49`, note: wholeChapterAnomaly(9, 'IX', 49, '39') },
    { where: `${WORK_ID} / book-9-ch-50`, note: wholeChapterAnomaly(9, 'IX', 50, '39') },
  ],
});

const rawDir = join(HERE, 'raw');
applyMitSupplements(OUT_DIR, {
  tails: [
    { book: 8, chapter: 21, supplementFile: join(rawDir, 'supplement-ha-8-21-tail.txt'), midWord: true, anomaly: MIT_TAIL_8_21 },
    { book: 9, chapter: 39, supplementFile: join(rawDir, 'supplement-ha-9-39-tail.txt'), midWord: false, anomaly: MIT_TAIL_9_39 },
  ],
  wholeChapters: [
    ...[22, 23, 24, 25, 26, 27, 28, 29, 30].map((n) => ({
      book: 8, chapter: n, supplementFile: join(rawDir, `supplement-ha-8-${n}.txt`), anomaly: wholeChapterAnomaly(8, 'VIII', n, '21'),
    })),
    ...[40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50].map((n) => ({
      book: 9, chapter: n, supplementFile: join(rawDir, `supplement-ha-9-${n}.txt`), anomaly: wholeChapterAnomaly(9, 'IX', n, '39'),
    })),
  ],
});
process.stdout.write('MIT supplement applied to historia-animalium-en. Run `npx tsx scripts/import-historia-animalium-en/validate.ts` next.\n');
