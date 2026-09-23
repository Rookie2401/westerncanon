/**
 * Type definitions for the bundled English Politics corpus in
 *   data/politics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:politics-en  (scripts/import-politics-en/index.ts)
 * and validated by
 *   npm run validate:politics-en  (scripts/import-politics-en/validate.ts)
 *
 * Source: Project Gutenberg ebook #6762, "Politics: A Treatise on
 * Government" - William Ellis's translation (London & Toronto: J. M. Dent
 * & Sons; New York: E. P. Dutton & Co., Everyman's Library, first issued
 * 1912), fetched once and cached at scripts/import-politics-en/raw/pg6762.txt.
 *
 * Two-level tree, Book -> Chapter, mirroring data/nicomachean-ethics-en's
 * shape: a Book division has children (its Chapters) and no passages of its
 * own; a Chapter division has exactly one Passage (all of that chapter's
 * paragraphs joined with "\n\n") and no children.
 *
 * Id scheme: Book = `book-N`, Chapter = `book-N-ch-M`, both 1-based plain
 * arabic numerals, matching this source's own "BOOK <roman>" / "CHAPTER
 * <roman>" headings (8 books; chapter numbering restarts at 1 in each book,
 * exactly as printed).
 *
 * Division.ref (Chapter only) IS populated here, unlike the task brief's own
 * expectation that this popular Everyman edition would print no Bekker
 * markers at all: direct inspection of the cached source shows it DOES carry
 * inline bracketed Bekker page/column markers throughout the reading text
 * (e.g. "[1252b]", "[1253a]"), reconstructed the same way as
 * data/categoriae-en's Division.ref - "Bekker <start>-<end>", where <end> is
 * the marker in effect at the point the next chapter begins (continuous
 * numbering, not gapped). The very first marker in the book is printed once,
 * uniquely, with the word "Bekker" spelled out ("[Bekker 1252a]") rather than
 * the bare "[1252a]" form used everywhere else; both forms are recognised by
 * the same parser. See anomalies.json for the one further transcription
 * irregularity found in these markers (a stray capital "I" printed in place
 * of the digit "1" in one marker) and for the marker itself being stripped
 * out of the reading text before it becomes Passage.text (it is citation
 * apparatus, not Aristotle's/Ellis's prose).
 *
 * Book Division.ref is always null. Passage.ref is always null throughout
 * (no marker is printed at every paragraph break, only at the coarser points
 * described above). Passage.n is '' throughout (this source prints no
 * paragraph numbering of its own). Division.sourceHeading and
 * editorialTitle are always null (this edition prints no chapter rubric or
 * title beyond the bare "CHAPTER <roman>" heading already captured in
 * Division.number).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbering */
  n: string;
  /** verbatim English paragraph(s), whitespace collapsed to single spaces, entities decoded, joined with "\n\n" */
  text: string;
  /** always null - no per-paragraph Bekker marker is printed, only per-page/column (see Division.ref) */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'8' for a Book, '1'..N for a Chapter, restarting each Book) */
  number: string | null;
  /** Chapter only: "Bekker <start>-<end>" reconstructed from this source's own inline markers; null for a Book */
  ref: string | null;
  /** always null - the source prints no chapter rubric of its own beyond "CHAPTER <roman>" */
  sourceHeading: string | null;
  /** always null - this edition supplies no editorial chapter titles */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'politics-en' */
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
