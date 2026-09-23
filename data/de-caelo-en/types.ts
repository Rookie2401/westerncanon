/**
 * Type definitions for the bundled English *On the Heavens* (De caelo) corpus
 * in data/de-caelo-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-caelo-en    (scripts/import-de-caelo-en/index.ts)
 * and validated by
 *   npm run validate:de-caelo-en  (scripts/import-de-caelo-en/validate.ts)
 *
 * Source: English Wikisource, "On the Heavens/Book I".."/Book IV" - John
 * Leofric Stocks's translation, first published as volume II of *The Works of
 * Aristotle Translated into English*, ed. W. D. Ross (Oxford: Clarendon
 * Press, 1922). Public domain: published well before 1929.
 *
 * IMPORTANT PROVENANCE NOTE, verified page by page rather than assumed: these
 * four subpages are ORDINARY WIKITEXT (31-76 KB of real prose each), NOT the
 * djvu page-scan transclusions used by data/metaphysics-en and
 * data/categoriae-en. They therefore carry no page-scan proofreading markup
 * and, in particular, no Bekker page/column markers at all - so every
 * Division.ref here is null. That is a real property of this digitisation,
 * not a parser gap; see about.json and anomalies.json.
 *
 * Two-level tree, Book -> Chapter, parsed entirely independently of any Greek
 * sibling; the two are never forced to divide chapters identically and any
 * real mismatch would be logged rather than reconciled. A Book division has
 * children (its Chapters) and no passages of its own; a Chapter division has
 * exactly one Passage and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"):
 * Book = `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic
 * numerals. The chapter numbers are the source's own: it heads each chapter
 * `==Part N==`, "Part" being this digitisation's word for what the standard
 * division calls a chapter. The counts match that standard division exactly
 * (Book I 12, Book II 14, Book III 8, Book IV 6).
 *
 * Each Chapter carries exactly ONE Passage: every paragraph found under that
 * chapter heading, in document order, joined with "\n\n". Passage.n is ''
 * throughout (the source numbers nothing below chapter level) and
 * Passage.ref is always null.
 *
 * Known gap preserved, not repaired: Book I's chapter 12 - and therefore the
 * book - stops mid-sentence, exactly where the Wikisource transcription ends.
 * The surviving words are kept verbatim and the cut is flagged on that
 * Passage's own `anomaly` field; nothing is completed or guessed.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source numbers nothing below chapter level */
  n: string;
  /** verbatim English text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - the source prints no per-paragraph reference */
  ref: string | null;
  /** set only where the source's own text stops mid-sentence (Book I, chapter 12) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'4' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** always null for this work - this digitisation prints no Bekker markers (see the module doc) */
  ref: string | null;
  /** always null - the source prints no chapter rubric beyond the bare "Part N" */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-caelo-en' */
  workId: string;
  language: Lang;
  divisions: Division[];
}

export interface WorkAboutSection {
  heading: string;
  paragraphs: string[];
}

export interface WorkAbout {
  workId: string;
  title: string;
  author: string;
  language: Lang;
  edition?: string;
  editor?: string;
  translator?: string;
  provenance: string;
  license: string;
  sections?: WorkAboutSection[];
}
