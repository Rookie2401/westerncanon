/**
 * Shared type definitions for the two bundled Virgil corpora:
 *   data/aeneid-la/   data/aeneid-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-virgil-aeneid-la/index.ts and
 * scripts/import-virgil-aeneid-en/index.ts, and validated by
 *   npx tsx scripts/import-virgil-shared/validate.ts
 *
 * FLAT one-level tree, one shallower than Euclid's Book -> group -> leaf and
 * Augustine's Book -> Chapter: work -> Book. There is no source-side
 * chapter/section division below Book level (the Aeneid's traditional
 * citation unit finer than the book is simply the verse line, and this
 * schema does not model individual lines as their own Division/Passage -
 * see Passage.text below), so a Book division IS the leaf: it carries
 * exactly one Passage and no children, the same shape a long Augustine
 * chapter or a single-Passage Homer Book would take in those schemas.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID so
 * Books render as "Book N", not an anonymous "§ N"): Book = `book-N`,
 * 1-based plain arabic numerals ("book-1".."book-12"), regardless of the
 * source's own numbering conventions.
 */

export type Lang = 'la' | 'en';

export interface Passage {
  /** always '' - this schema has no sub-numbering below Book level */
  n: string;
  /**
   * Verbatim reading text of the whole Book, one verse LINE per array
   * element joined with '\n' (never collapsed into flowing prose): the
   * Latin is Virgil's own hexameter verse, and Theodore C. Williams' 1910
   * translation is itself English verse (not prose, unlike e.g. a prose
   * Homer translation) - see the importers' module docs for how this was
   * confirmed against the real source files. Each line's own internal
   * whitespace is collapsed to single spaces and entities are decoded;
   * only the '\n' line separators are preserved as real structure.
   */
  text: string;
  /** always null: no page reference is meaningful at this granularity */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a source-side textual gap or an editorially-deleted line) */
  anomaly?: string;
}

export interface Division {
  /** `book-N`, 1-based arabic ('book-1'..'book-12') */
  id: string;
  /** arabic numeral string ('1'..'12') */
  number: string | null;
  /** the book's own verse-line range as printed by this source, e.g. "1–756" (first-last <l n="…"> encountered, not a fabricated round number) */
  ref: string | null;
  /** always null: the source prints no per-book rubric/argument line */
  sourceHeading: string | null;
  /** always null: no editorial gloss is fabricated */
  editorialTitle: string | null;
  /** always [] - a Book is a leaf in this flat schema */
  children: Division[];
  /** always exactly 1 - the Book's entire verse text as a single Passage */
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
