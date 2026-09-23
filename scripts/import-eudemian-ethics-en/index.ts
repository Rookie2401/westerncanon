/**
 * Aristotle, *Eudemian Ethics* — Joseph Solomon's English translation, via
 * English Wikisource's page-scan transclusion of "Eudemian Ethics".
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-eudemian-ethics-en/index.ts
 *
 * Reads scripts/import-eudemian-ethics-en/raw/eudemian-ethics-book-N.parse.json
 * (N = 1, 2, 3, 7; already in the repo — the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API for each book subpage). Writes:
 *   data/eudemian-ethics-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/eudemian-ethics-en/about.json      - provenance / licence metadata + About prose
 *   data/eudemian-ethics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-eudemian-ethics-en/validate.ts`.
 *
 * ============================================================================
 * BOOKS IV, V AND VI DO NOT EXIST IN THIS TRANSLATION (read before touching
 * the manifest)
 * ============================================================================
 * This edition ships Books I, II, III and VII only, and that is CORRECT, not
 * a gap in the import. Books IV, V and VI of the Eudemian Ethics are, in the
 * Greek tradition itself, the SAME THREE BOOKS as Nicomachean Ethics V, VI
 * and VII — the so-called "common books" — and Solomon therefore never
 * re-translated them. Three independent confirmations were obtained before
 * this importer was written:
 *   1. The work's own Wikisource parent page says so outright in its header
 *      notes: "Books IV, V, VI of the Eudemian Ethics are identical to
 *      Nicomachean Ethics Books V, VI, VII, so were not translated by
 *      Solomon."
 *   2. Its contents list prints the line "Books IV, V, VI = Nicomachean
 *      Ethics Books V, VI, VII" where those book links would be, and links
 *      only to /Book 1, /Book 2, /Book 3 and /Book 7.
 *   3. A batched MediaWiki existence check for "Eudemian Ethics/Book 4",
 *      "/Book 5" and "/Book 6" returns `missing` for all three — the pages do
 *      not exist at all, not even as untranscribed red-link stubs.
 * The printed text itself carries the same note: Book 7's page opens with the
 * running line "BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII."
 *
 * NOTHING IS FABRICATED TO FILL THOSE BOOKS. In particular, Books IV-VI are
 * NOT copied from data/nicomachean-ethics-en (or from any other source) to
 * make the numbering look continuous: those are a different translator's
 * words (Rackham's Loeb, in this library) from a different edition, and
 * presenting them as Solomon's Eudemian Ethics would be a fabrication. The
 * book numbering here therefore runs 1, 2, 3, 7 — the source's own — and the
 * reason is disclosed in about.json and anomalies.json.
 *
 * --- Book VIII -------------------------------------------------------------
 * Solomon's edition has no separate Book VIII either: following one
 * manuscript tradition, its material was appended to Book VII as sections
 * 13-15. The parent page states this, and the rendered page confirms it by
 * tagging chapter 13 with the internal anchor id "book8". Those sections are
 * this edition's book-7 chapters 13, 14 and 15, which is why Book 7 runs to
 * 15 chapters.
 *
 * --- Source technique and markers -----------------------------------------
 * These four subpages ARE page-scan transclusions (their wikitext is 263-525
 * bytes of `<pages index="Works of Aristotle v9 (ed. Ross).djvu" .../>`), so
 * the rendered HTML was fetched and parsed with jsdom. Chapter markers are a
 * `<b>N</b>` element that is the paragraph's FIRST child — NOT any bold
 * number, since this same source renders its Bekker page markers as
 * `<b>1219a</b>` inside a mid-paragraph `span.wst-verse`. Bekker markers ARE
 * present throughout (unlike most of this English batch), so Division.ref
 * carries real page ranges.
 *
 * Verified: all four subpages carry real proofread prose (29-104 KB of
 * visible text each) with ZERO red links — no truncation anywhere.
 *
 * --- TWO PARSER FAULTS THIS EDITION ONCE HAD (both fixed) ------------------
 * Recorded because they shaped the manifest above and are easy to reintroduce:
 *  1. Only the FIRST div.prp-pages-output block was read. A page emits one
 *     such block per `<pages .../>` tag, and Book 7 has two text blocks; the
 *     second holds chapters 13-15, about 19,700 characters. They were simply
 *     absent, and the shortfall was mistaken for the source's own arrangement.
 *  2. Only `<p>` elements were walked. Where a printed paragraph straddles a
 *     scanned page boundary the transclusion closes the paragraph at the break
 *     and emits the continuation as loose text; whole chapter openings arrive
 *     that way. This lost Book II chapter 6 and Book III chapters 2 and 7,
 *     which were then wrongly logged as numbers "the source does not print".
 * Both are fixed in the shared parser, and a text-accounting check in
 * validate.ts now reconciles every paragraph of the cached raw HTML against
 * the shipped work, so a regression of either kind fails the build.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPageScanImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'eudemian-ethics-en';

/**
 * Chapter numbers as the SOURCE ITSELF marks them, book by book. Every book
 * is a complete, gapless run.
 *
 * (Historical note, because it shaped this file: an earlier version of this
 * importer declared Book II as skipping chapter 6 and Book III as skipping
 * chapter 2 and stopping at 6, and recorded that as an anomaly of the source.
 * That was wrong, and the fault was this project's, not Wikisource's. Those
 * chapter openings are printed where a scanned page boundary falls, and the
 * transclusion emits them OUTSIDE any <p> element; a parser that walked only
 * <p> elements could not see them. Book 7's chapters 13-15 - the material of
 * Book VIII - were missing for a second reason: they render in a SECOND
 * div.prp-pages-output block, and only the first was being read. Both faults
 * are fixed in scripts/import-aristotle-rest-en-shared/pagescan.ts, and the
 * books are whole.)
 */
const BOOK_CHAPTERS: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8],
  2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  3: [1, 2, 3, 4, 5, 6, 7],
  // 13-15 are Book VIII's material, appended to Book VII by the edition
  // itself; chapter 13 carries the source's own anchor id "book8".
  7: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
};

// NOTE: this work's Wikisource subpages are numbered in ARABIC ("Eudemian
// Ethics/Book 1" ... "/Book 7"), unlike most of this batch, whose subpages use
// roman numerals. The page titles below are therefore built from the arabic
// book number directly.

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'Eudemian Ethics',
  author: 'Aristotle',
  language: 'en',
  translator: 'Joseph Solomon',
  editor: 'William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume IX: Ethica Eudemia, trans. Joseph Solomon, ed. W. D. Ross (Oxford: Clarendon Press)',
  provenance:
    'English Wikisource, pages "Eudemian Ethics/Book 1", "/Book 2", "/Book 3" and "/Book 7", each fetched once via the MediaWiki action=parse&prop=text API. These are page-scan transclusions of "Works of Aristotle v9 (ed. Ross).djvu": action=parse&prop=wikitext returns only a few hundred bytes of <pages/> markup rather than the text, so the rendered HTML was fetched and parsed with jsdom instead. The raw per-book dumps are committed under scripts/import-eudemian-ethics-en/raw/. There are no pages for Books 4, 5 or 6 — see "IMPORTANT" below.',
  license:
    "Solomon's translation is in the public domain (published before 1929; the Oxford 'Works of Aristotle' volumes of this period are long out of copyright). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        "Aristotle's Eudemian Ethics in Joseph Solomon's English translation, made for the Oxford Works of Aristotle Translated into English under the general editorship of W. D. Ross. It is the less-read of Aristotle's two major ethical treatises, and in places the more direct: on happiness and the goods of fortune, on the voluntary and choice, on the particular virtues, and — in its long seventh book — on friendship.",
        'The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.',
      ],
    },
    {
      heading: 'IMPORTANT: there are no Books IV, V or VI — and none has been invented',
      paragraphs: [
        "This edition contains Books I, II, III and VII. That is the whole of what Solomon translated, and the jump in the numbering is real rather than a defect here. In the Greek tradition itself, Eudemian Ethics IV, V and VI are not separate books at all: they are the very same three books as Nicomachean Ethics V, VI and VII — the so-called common books, shared between the two treatises — so there was nothing distinct for Solomon to translate, and he did not.",
        'The source says so in as many words. The work\'s Wikisource page carries the note that "Books IV, V, VI of the Eudemian Ethics are identical to Nicomachean Ethics Books V, VI, VII, so were not translated by Solomon"; its contents list prints that equation in place of the missing book links; the printed text of Book VII opens with the same statement as a running line; and the subpages for Books 4, 5 and 6 simply do not exist on Wikisource, not even as blank placeholders.',
        'Those three books have deliberately NOT been filled in from this library\'s Nicomachean Ethics or from anywhere else. That text is a different translator\'s work from a different edition, and presenting it here as Solomon\'s Eudemian Ethics would be a fabrication, however tidy the resulting numbering might look. If you want the common books, read them where they belong, in the Nicomachean Ethics.',
        'Book VIII is likewise absent as a separate book, for a different reason: following one manuscript tradition, Solomon\'s edition appends its material to Book VII as sections 13 to 15. It is present, inside Book VII — you will find it as that book\'s chapters 13, 14 and 15.',
      ],
    },
    {
      heading: 'Completeness of what is here',
      paragraphs: [
        'The four books that do exist are complete and untruncated, in gapless chapter runs: Book I 1-8, Book II 1-11, Book III 1-7, Book VII 1-15. Every page-scan behind them is fully proofread, with no red links and no missing pages anywhere in the transclusion.',
        'Book VII runs to fifteen chapters because its last three carry the material of Book VIII, appended there by the edition itself following one manuscript tradition — the source even tags chapter 13 with an internal anchor named for Book VIII. So nothing of Solomon\'s translation is absent from this edition.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is the rendered HTML of each of the four Wikisource book subpages, fetched once each through the MediaWiki action=parse&prop=text API and committed under the importer\'s raw/ directory. Unlike most of the works imported alongside it, this one genuinely is a djvu page-scan transclusion — its wikitext holds only a few hundred bytes of transclusion markup and no text at all — so the already-rendered HTML was fetched and parsed with jsdom, exactly as this library\'s Metaphysics import does. It is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Chapters are marked in this source by a bold number standing at the head of a paragraph, immediately before that chapter\'s first words. Only a bold element that is the paragraph\'s first child and contains a bare one- or two-digit number is treated as a marker — a deliberately narrow rule, because the same source renders its Bekker page references as bold numbers too (1219a, 1220b and so on) in the middle of paragraphs, and a looser rule would shred the text into hundreds of false chapters.',
        "Running titles (\"ETHICA EUDEMIA\", \"BOOK II\", and the printed note about Books IV-VI) are page furniture rather than Aristotle's words and are skipped and counted. The translator's footnote markers are stripped from the reading text; the notes themselves are editorial apparatus, are rendered by the source in a separate block, and are not preserved here, matching this library's other English translations. The importer refuses to ship a division it has not been told to expect: each book declares its exact chapter numbers in advance, and a mismatch stops the run.",
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by book and chapter, plus a Bekker page reference. Unlike most of the Aristotle translations bundled alongside it, this source does print Bekker page markers, and it prints them throughout: each chapter\'s markers are gathered in document order to give that chapter a real page or page range (1214a, 1216a–1216b, and so on). Passage.ref is null throughout, since no marker is printed at every paragraph break and a paragraph-level citation would have to be invented.',
        'The book numbering is the source\'s own: 1, 2, 3, 7. It has not been compressed to 1, 2, 3, 4 — doing so would misrepresent every citation and hide the relationship with the Nicomachean Ethics.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        'See "IMPORTANT: there are no Books IV, V or VI" above for the headline account. anomalies.json carries the complete machine-readable log: the absence of Books IV-VI with all the evidence for it and the explicit record that nothing was copied in to replace them, the treatment of Book VIII, the two unprinted chapter numbers, the furniture lines skipped, the footnote markers stripped, and the Bekker reference scheme.',
        "A word on trust: Wikisource's page-scan proofreading for this volume is complete for the four books used here (no red links), but community validation is an ongoing process, so isolated transcription slips remain possible. That is a disclosed limitation of the source rather than something quietly corrected in this build.",
      ],
    },
  ],
};

runPageScanImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: join(REPO_ROOT, 'data', WORK_ID),
  shape: 'book-chapter',
  markerShape: 'leading-bold',
  bekkerContainer: 'span.wst-verse',
  furnitureExact: [
    'ETHICA EUDEMIA',
    'BOOK I', 'BOOK II', 'BOOK III', 'BOOK VII',
    'BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII.',
  ],
  pages: [1, 2, 3, 7].map((n) => ({
    rawFile: `eudemian-ethics-book-${n}.parse.json`,
    pageTitle: `Eudemian Ethics/Book ${n}`,
    label: `book-${n}`,
    expectedChapters: BOOK_CHAPTERS[n]!,
    book: n,
  })),
  about,
  extraAnomalies: [
    {
      where: `${WORK_ID} / books 4, 5, 6 (ABSENT BY DESIGN)`,
      note: 'BOOKS IV, V AND VI ARE NOT PRESENT, AND NOTHING WAS FABRICATED OR COPIED IN TO REPLACE THEM. In the Greek tradition these are the "common books", identical with Nicomachean Ethics V, VI and VII, so Solomon never re-translated them. Three independent confirmations were obtained before this importer was written: (1) the Wikisource parent page states in its header notes that "Books IV, V, VI of the Eudemian Ethics are identical to Nicomachean Ethics Books V, VI, VII, so were not translated by Solomon"; (2) its contents list prints that equation where the book links would be, linking only to /Book 1, /Book 2, /Book 3 and /Book 7; (3) a batched MediaWiki existence check for "Eudemian Ethics/Book 4", "/Book 5" and "/Book 6" returns `missing` for all three — the pages do not exist at all, not even as untranscribed red-link stubs. The printed text agrees: Book 7 opens with the running line "BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII." Explicitly NOT done: copying those books from data/nicomachean-ethics-en or any other edition to make the numbering continuous; that is a different translator\'s words from a different edition and would be a fabrication here. The book numbering 1, 2, 3, 7 is the source\'s own and is preserved exactly.',
    },
    {
      where: `${WORK_ID} / book 8 (folded into book 7)`,
      note: 'There is no separate Book VIII in this edition, and none is missing: following one manuscript tradition, Solomon\'s edition appends Book VIII\'s material to Book VII as sections 13-15, as the work\'s own Wikisource page states. That material is present as book-7 chapters 13, 14 and 15; the source confirms the identification by tagging chapter 13 with an internal HTML anchor named "book8".',
    },
    {
      where: `${WORK_ID} / completeness of books 1, 2, 3, 7`,
      note: 'COMPLETE and untruncated for the four books that exist, in gapless chapter runs (Book I 1-8, Book II 1-11, Book III 1-7, Book VII 1-15). Every page-scan behind them is fully proofread, with ZERO red-link ("page does not exist") occurrences across all four subpages, so no chapter breaks off mid-sentence anywhere in this work.',
    },
    {
      where: `${WORK_ID} / CORRECTION to an earlier build of this edition`,
      note: 'An earlier build of this edition was WRONG about three things, and the fault was this importer\'s rather than the source\'s. (1) It reported Book II as lacking a chapter 6 and Book III as lacking a chapter 2 and stopping at 6. Those chapter openings are in fact printed, but where a scanned page boundary falls the transclusion emits them OUTSIDE any <p> element, and the parser walked only <p> elements. (2) It shipped Book VII with 12 chapters instead of 15, losing about 19,700 characters: chapters 13-15 render in a SECOND div.prp-pages-output block (a page emits one such block per <pages .../> tag) and only the first block was read. (3) Chapter 13\'s number sits inside a wst-anchor span rather than standing free, so even reading the second block did not by itself recover it. All three are fixed; every book is now a gapless run, and the text reconciles paragraph-for-paragraph against the cached raw HTML (see VALIDATION_REPORT.md\'s text-accounting section).',
    },
    {
      where: `${WORK_ID} / chapter marker rule`,
      note: 'Chapters are marked by a bold number at the head of a paragraph. Only a <b> element that is the paragraph\'s FIRST child and whose text is a bare 1-2 digit integer is accepted as a marker, because this same source also renders its Bekker page references as bold numbers (e.g. <b>1219a</b>) inside mid-paragraph span.wst-verse elements; a looser "any bold number" rule would split the text into hundreds of false chapters.',
    },
    {
      where: `${WORK_ID} / relation to the Greek sibling`,
      note: 'This English edition was parsed entirely independently of any Greek edition of the Eudemian Ethics; the two are not forced to agree on book or chapter boundaries, and no division here was adjusted to match a Greek text.',
    },
  ],
});
