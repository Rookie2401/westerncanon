/**
 * Shared type definitions for the six bundled Augustine corpora:
 *   data/augustine-confessions-la/       data/augustine-confessions-en/
 *   data/augustine-city-of-god-la/       data/augustine-city-of-god-en/
 *   data/augustine-christian-doctrine-la/ data/augustine-christian-doctrine-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-augustine-<name>/index.ts and validated by
 *   npm run validate:augustine   (scripts/import-augustine-shared/validate.ts)
 *
 * Two-level tree, same shape as Euclid's Book -> group -> leaf but one level
 * shallower: work -> Book -> Chapter. A Book division has children (its
 * Chapters) and no passages of its own; a Chapter division has passages
 * (one per numbered section in the Latin editions' Book.Chapter.Section
 * citation scheme, or a single unnumbered passage in editions/works where
 * the source prints one continuous paragraph per chapter) and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N", not an
 * anonymous "§ N"): Book = `book-N`, Chapter = `book-N-ch-M`, both 1-based
 * plain arabic numerals regardless of the source's own roman numerals
 * (which are preserved verbatim in `number` and `sourceHeading`).
 */

export type Lang = 'la' | 'en';

export interface Passage {
  /** printed section number within the chapter ('1', '2', ...); '' when the source prints no sub-numbering below chapter level */
  n: string;
  /** verbatim paragraph text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null: no physical page/line reference is available from the Wikisource transcription */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a source numbering inconsistency) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** roman numeral for a Book ('I'..'XXII'); plain arabic string for a Chapter ('1'..'N') */
  number: string | null;
  /** always null (see Passage.ref) */
  ref: string | null;
  /** verbatim heading/rubric from THIS work's own source, where the source prints one (e.g. a De Doctrina Christiana capitulum title); null when the source prints none for this division */
  sourceHeading: string | null;
  /** editorial English gloss — for a Book, its argumentum/summary in one line; null for a Chapter (its own text is short enough not to need one) */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); 1+ for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
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
