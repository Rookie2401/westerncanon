/**
 * Shared type definitions for the two bundled Meditations corpora:
 *   data/meditations-grc/        data/meditations-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 *   scripts/import-meditations-grc/index.ts
 *   scripts/import-meditations-en/index.ts
 * and validated by each importer's own validate.ts.
 *
 * Two-level tree, Book -> Chapter (same shape as the Nicomachean
 * Ethics/Metaphysics/Augustine corpora): a Book division has children (its
 * Chapters) and no passages of its own; a Chapter division has exactly one
 * Passage and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals -
 * Marcus's own book/chapter numbering (his editors', really; Marcus
 * himself did not number these jottings). Chapter numbers are the SOURCE's
 * own printed numbers, not a forced 1..N re-count: a chapter number can be
 * genuinely absent from a book's sequence (see below) rather than
 * renumbered to close the gap.
 *
 * The two editions are INDEPENDENTLY parsed from different sources (see
 * each importer's own doc comment) and are NOT forced to match chapter-for-
 * chapter. As it happens they agree almost everywhere (12 books, the same
 * chapter count in 11 of them), but Book 12 diverges in an interesting,
 * genuinely disclosed way: the Greek (Leopold 1908 / Perseus) source skips
 * chapter number 18 entirely (n goes ...17, 19, 20...), while the English
 * (Haines 1916 / Wikisource) source skips chapter number 15 instead (n
 * goes ...14, 16, 17...) - two DIFFERENT numbers missing in the two
 * independently-digitised witnesses of the same book. Neither gap is
 * filled in or reconciled against the other; both are logged individually
 * in each edition's own anomalies.json. This work has no Bekker-style (or
 * any other) page/line reference system, so Division.ref and Passage.ref
 * are always null throughout both editions - there is nothing to
 * reconstruct a ref from.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' - neither source prints a paragraph number below chapter level */
  n: string;
  /** verbatim paragraph text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this work carries no page/line reference system in either source */
  ref: string | null;
  /** optional note when something irregular was preserved verbatim (e.g. an editorial <add> insertion kept in the Greek, or a genuine chapter-number gap) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** plain arabic string for both a Book ('1'..'12') and a Chapter (the source's own printed chapter number - not necessarily contiguous, see the module doc's Book 12 note) */
  number: string | null;
  /** always null - this work has no page/line reference system to attribute to a Division */
  ref: string | null;
  /** always null - neither source prints a per-chapter title/rubric distinct from the bare chapter number */
  sourceHeading: string | null;
  /** always null - no editorial titles are supplied for this work's chapters */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'meditations-grc' | 'meditations-en' */
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
