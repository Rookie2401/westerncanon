/**
 * Aristotle, *On the Heavens* (De caelo) — J. L. Stocks's English translation
 * (Oxford, 1922), via English Wikisource. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-caelo-en/index.ts
 *
 * Reads scripts/import-de-caelo-en/raw/on-the-heavens-book-N.json (N = 1..4;
 * already in the repo — each the cached `action=query&prop=revisions&
 * rvslots=main&rvprop=content` response for "On the Heavens/Book I".."/Book
 * IV", i.e. {title, requestedTitle, content}). Writes:
 *   data/de-caelo-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/de-caelo-en/about.json      - provenance / licence metadata + About prose
 *   data/de-caelo-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-caelo-en/validate.ts`.
 *
 * --- What was verified before this importer was written -------------------
 * All four subpages exist and carry real transcribed prose (31-76 KB of
 * wikitext each); none is a red-link stub. Contrary to this batch's initial
 * brief, they are NOT page-scan transclusions: `action=parse&prop=wikitext`
 * returns the prose itself, so the plain-wikitext technique is used (see
 * scripts/import-aristotle-rest-en-shared/wikitext.ts) rather than the
 * rendered-HTML technique of scripts/import-aristotle-metaphysics-en. One
 * consequence matters to the reader and is disclosed everywhere: this
 * digitisation prints no Bekker page/column markers, so every Division.ref
 * is null.
 *
 * Chapter markers are uniform `==Part N==` wiki headings across all four
 * books, and the counts match the standard division exactly (12 / 14 / 8 / 6).
 * "Part" is simply this digitisation's word for a chapter; nothing is
 * renumbered.
 *
 * Book I's transcription stops mid-sentence in chapter 12 (the page simply
 * ends there) — because the Wikisource transcription was itself copied from
 * the MIT Internet Classics Archive's copy of this SAME Stocks translation,
 * which cuts off at the exact same word. This is now SUPPLEMENTED (see
 * "MIT SUPPLEMENT" below): the rest of chapter 12 is appended verbatim from
 * a complete capture of MIT's own page, and this edition is complete.
 *
 * ============================================================================
 * MIT SUPPLEMENT (added 2026-09-22) — Book I chapter 12 completed
 * ============================================================================
 * Verified: MIT's own LIVE page for this book (classics.mit.edu/Aristotle/
 * heavens.1.i.html) is ITSELF truncated, at exactly the same word Wikisource
 * stops at ("...F and H coincident,") — confirmed by a direct `curl` fetch
 * whose received byte count (101,501) exactly matches the server's own
 * declared Content-Length header, so nothing was lost in transit; this is a
 * genuine server-side defect, not a fetch error. A COMPLETE capture of the
 * same URL — both `<A NAME="start">`/`<A NAME="end">` markers present, and
 * the ordinary closing navigation footer present — was located in the
 * Wayback Machine's earliest capture on file, 2000-08-17
 * (http://web.archive.org/web/20000817043055/http://classics.mit.edu/
 * Aristotle/heavens.1.i.html), cached at raw/mit/heavens.1.i.wayback-
 * 20000817.html. That capture carries the on-page credit line "Translated
 * by J. L. Stocks" (matching the Wikisource-credited translator exactly)
 * and its own chapter count for this book is 12 (matching Wikisource's own
 * count — Book I was never short a chapter, only short the tail of its
 * last one). The overlap sentence — Wikisource's own last words, "But when
 * terms stand to one another as these do, F and H coincident," — was found
 * by exact substring search in the wayback capture's chapter 12 text, with
 * no wording difference at all (both sides transcribe the identical MIT
 * digitisation). Everything from "E and F never predicated..." onward is
 * appended from raw/supplement-decaelo-1-12-tail.txt (mechanically
 * extracted from the wayback HTML's own `<B>Part 12</B>` / `<BR><BR>`
 * markup, not hand-retyped), joined onto Wikisource's own last word with a
 * single space (the cut fell at a word boundary, not mid-word). See
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
const WORK_ID = 'de-caelo-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const BOOK_CHAPTERS: Record<number, number[]> = {
  1: Array.from({ length: 12 }, (_, i) => i + 1),
  2: Array.from({ length: 14 }, (_, i) => i + 1),
  3: Array.from({ length: 8 }, (_, i) => i + 1),
  4: Array.from({ length: 6 }, (_, i) => i + 1),
};

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'On the Heavens',
  author: 'Aristotle',
  language: 'en',
  translator: 'John Leofric Stocks',
  editor: 'William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume II: De caelo, trans. J. L. Stocks (Oxford: Clarendon Press, 1922)',
  provenance:
    'English Wikisource, pages "On the Heavens/Book I" through "/Book IV", each fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-caelo-en/raw/. Unlike this library\'s Metaphysics and Categories imports, these pages are ORDINARY WIKITEXT rather than djvu page-scan transclusions, so the wikitext itself is the text and no rendered-HTML fetch was needed; imported by scripts/import-de-caelo-en.',
  license:
    "Stocks's 1922 translation is in the public domain (published before 1929; the Oxford 'Works of Aristotle' volumes of this period are long out of copyright). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        "Aristotle's On the Heavens in J. L. Stocks's English translation, made for the Oxford Works of Aristotle Translated into English under the general editorship of W. D. Ross and published in 1922 as that series' volume II. It is the cosmological treatise: the nature and motion of the heavenly bodies, the sphericity and rest of the earth, and the four sublunary elements with their natural motions of heaviness and lightness.",
        'The text here is the translation, verbatim throughout, whichever of the two sources (English Wikisource or MIT, see below) a given word comes from. Nothing is modernised, paraphrased, or silently corrected in either source.',
      ],
    },
    {
      heading: 'Text completeness: Book I chapter 12 completed from MIT',
      paragraphs: [
        "This edition is now complete. Book I's transcription on English Wikisource ran normally through chapters 1-11 and most of chapter 12, then simply stopped, in the middle of a sentence, partway through the argument that 'generated' and 'destructible' are coincident (\"...But when terms stand to one another as these do, F and H coincident,\") — because the Wikisource page was itself copied from the MIT Internet Classics Archive's page for this book, which cuts off at exactly the same word. MIT's own LIVE copy still has this defect today (confirmed by a direct fetch whose received byte count exactly matches the server's own declared Content-Length, so nothing was lost in transit — a genuine server-side bug, not a download error), but a COMPLETE capture of the very same MIT page survives in the Wayback Machine's earliest snapshot on file, from 2000-08-17, carrying the same on-page \"Translated by J. L. Stocks\" credit and the same 12-chapter count for Book I.",
        'The rest of chapter 12 — from "E and F never predicated of the same thing..." onward — is supplied verbatim from that 2000 capture, mechanically extracted from its HTML (never hand-retyped or paraphrased) and joined onto Wikisource\'s own last word with a single space. The overlap sentence quoted above was matched byte-for-byte against the wayback text with no wording difference. Chapter 12\'s Passage carries an `anomaly` field disclosing exactly where Wikisource\'s own text ends and MIT\'s begins; see anomalies.json for the full account. Books II, III and IV were always complete and are unaffected.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is (i) the raw wikitext of the four English Wikisource "On the Heavens/Book N" subpages, fetched once each and committed under the importer\'s raw/ directory, and (ii) for the tail of Book I chapter 12 that Wikisource lacks, a hand-transcribed plain-text file (scripts/import-de-caelo-en/raw/supplement-decaelo-1-12-tail.txt) mechanically extracted from a complete Wayback Machine capture of MIT\'s own page for this book (raw/mit/heavens.1.i.wayback-20000817.html), each carrying its own provenance header. This batch\'s brief expected the Wikisource pages to be djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found they are not — each page holds 31-76 KB of ordinary wikitext prose — so the simpler and more faithful wikitext route was used and the difference is disclosed here rather than papered over. The text is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Each book page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped. Chapters are marked uniformly by `==Part N==` wiki headings — "Part" being this digitisation\'s word for a chapter — and each heading starts a new Chapter division; every paragraph beneath it, in document order, becomes part of that chapter\'s single Passage, joined by blank lines. Interwiki links and category tags are skipped and counted. This particular work carries no footnotes, no templates beyond the header, and no inline HTML at all, so no apparatus had to be removed from the reading text.',
        'The importer refuses to ship a division it has not been told to expect: each book declares its exact chapter numbers in advance, and a mismatch stops the run rather than silently producing a different book.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by book and chapter only. This digitisation prints no Bekker page/column markers anywhere — unlike the page-scan transcriptions behind this library\'s Categories, De Interpretatione and (in Book 1) Metaphysics — so every Division.ref and every Passage.ref is null. No Bekker reference has been reconstructed or estimated, because doing so would mean inventing a citation the source does not support.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        "See \"Text completeness\" above for the one substantive point, now resolved. anomalies.json carries the complete machine-readable log: the original mid-sentence cutoff with its exact last surviving words, the MIT supplement's provenance and overlap verification, every furniture line skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
        "A word on trust: this is a plaintext digitisation, not a page-by-page proofread against a scan, so isolated transcription slips are possible despite this importer's care. That is a disclosed limitation of the source rather than something quietly corrected here — this library never edits a source into looking better than it is.",
      ],
    },
  ],
};

const MIT_TAIL_ANOMALY_1_12 =
  'SUPPLEMENTED: the Wikisource transcription of Book I ends mid-sentence at exactly this point ("...But when terms stand to one another as these do, F and H coincident,") because it was itself copied from the MIT Internet Classics Archive\'s page for this book, which cuts off at the same word. MIT\'s own live copy still has this defect (confirmed by direct fetch: received bytes exactly match the declared Content-Length, a genuine server-side bug, not a download error). Everything from "E and F never predicated..." onward is supplied verbatim from a complete Wayback Machine capture of the same MIT page (2000-08-17), matched byte-for-byte against Wikisource\'s own last words with no wording difference, and joined with a single space (the cut fell at a word boundary). See this importer\'s module doc and raw/supplement-decaelo-1-12-tail.txt for the full account.';

runWikitextImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: OUT_DIR,
  shape: 'book-chapter',
  pages: [1, 2, 3, 4].map((n) => ({
    rawFile: `on-the-heavens-book-${n}.json`,
    pageTitle: `On the Heavens/Book ${ROMAN[n]}`,
    label: `book-${n}`,
    expectedChapters: BOOK_CHAPTERS[n]!,
    book: n,
  })),
  about,
  passageAnomalies: {
    'book-1:12': MIT_TAIL_ANOMALY_1_12,
  },
  extraAnomalies: [
    {
      where: `${WORK_ID} / book-1-ch-12`,
      note: MIT_TAIL_ANOMALY_1_12,
    },
    {
      where: `${WORK_ID} / reference scheme`,
      note: 'Division.ref and Passage.ref are null for every division of this work: this plaintext digitisation prints no Bekker page/column markers at all (confirmed across all four book pages). No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source.',
    },
    {
      where: `${WORK_ID} / chapter numbering`,
      note: 'The source heads its chapters "Part N"; they are the chapters of the standard division and are imported under this app\'s ordinary Chapter numbering without renumbering. The counts match the standard division exactly: Book I 12, Book II 14, Book III 8, Book IV 6 chapters.',
    },
    {
      where: `${WORK_ID} / relation to the Greek sibling`,
      note: 'This English edition was parsed entirely independently of any Greek edition of De caelo in this library; the two are not forced to agree on chapter boundaries, and no division here was adjusted to match a Greek text.',
    },
    {
      where: `${WORK_ID} / MIT supplement source verification`,
      note: 'MIT\'s Internet Classics Archive credits this translation "Translated by J. L. Stocks" on the fetched page (verified by direct inspection of raw/mit/heavens.1.i.wayback-20000817.html), matching the Wikisource-credited translator exactly. MIT\'s own live page for this book is itself truncated at the identical word Wikisource stops at; the complete text used to supplement it comes from the Wayback Machine\'s earliest capture on file (2000-08-17), which carries both `<A NAME="start">`/`<A NAME="end">` markers and the ordinary closing navigation footer MIT\'s live copy currently lacks.',
    },
  ],
});

applyMitSupplements(OUT_DIR, {
  tails: [
    {
      book: 1,
      chapter: 12,
      supplementFile: join(HERE, 'raw', 'supplement-decaelo-1-12-tail.txt'),
      midWord: false,
      anomaly: MIT_TAIL_ANOMALY_1_12,
    },
  ],
  wholeChapters: [],
});
process.stdout.write('MIT supplement applied to de-caelo-en. Run `npx tsx scripts/import-de-caelo-en/validate.ts` next.\n');
