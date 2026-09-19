/**
 * Shared type definitions for the two bundled Metaphysics corpora:
 *   data/metaphysics-grc/        data/metaphysics-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 *   scripts/import-aristotle-metaphysics-grc/index.ts
 *   scripts/import-aristotle-metaphysics-en/index.ts
 * and validated by each importer's own validate.ts.
 *
 * Two-level tree, same shape as Augustine's work -> Book -> Chapter (one
 * level shallower than Euclid's Book -> group -> leaf): a Book division has
 * children (its Chapters) and no passages of its own; a Chapter division has
 * 1+ passages and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals
 * (Aristotle's own book/chapter numbering is already arabic-friendly for
 * this work - Ross's own 1908 English edition numbers chapters in plain
 * arabic too, unlike Augustine's roman-numeral books).
 *
 * The two editions are INDEPENDENTLY parsed from different sources (see each
 * importer's own doc comment) and are NOT forced to match chapter-for-
 * chapter: the Greek (Perseus/OGL canonical-greekLit TEI, W. D. Ross's 1924
 * OCT) has all 14 books complete; the English (English Wikisource's page-
 * scan of Ross's OWN 1908 translation) is, AS OF THIS IMPORT (2026-09-19),
 * an INCOMPLETE Wikisource transcription project - the source page itself
 * says so ("This work is incomplete") - so data/metaphysics-en/work.json
 * carries only the books/chapters actually transcribed there. See both
 * about.json files and anomalies.json for the exact, book-by-book account of
 * what is and is not present in each edition.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** '' throughout both editions (neither source prints per-passage paragraph numbers below chapter level) */
  n: string;
  /** verbatim paragraph text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null (no source in either edition prints a reference finer than the chapter-level Division.ref) */
  ref: string | null;
  /** optional note when something irregular was preserved verbatim (e.g. an editorial <add> insertion kept in the Greek, or a mid-sentence truncation in the English where the Wikisource transcription itself stops) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** plain arabic string for both a Book ('1'..'14') and a Chapter ('1'..'N') */
  number: string | null;
  /** for a Chapter: the Bekker page range covered (e.g. "980a–981a", or a single value if only one Bekker page-marker falls within it); null if no page marker could be attributed to it (flagged as an anomaly) or if the Chapter is absent from that source. Always null for a Book (a container only). */
  ref: string | null;
  /** always null (neither source prints a per-chapter title/rubric distinct from the bare chapter number) */
  sourceHeading: string | null;
  /** always null (no editorial titles are supplied for this work's chapters) */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); 1+ for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'metaphysics-grc' | 'metaphysics-en' */
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
