/**
 * Shared type definitions for the four bundled Homer corpora:
 *   data/iliad-grc/    data/iliad-en/
 *   data/odyssey-grc/  data/odyssey-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-homer-<work>-<lang>/index.ts, sharing the parsing helpers in
 * this directory (parseGrc.ts / parseEn.ts / text.ts), and validated by
 *   npx tsx scripts/import-homer-shared/validate.ts
 *
 * ONE-LEVEL tree, flatter even than Euclid's Book -> group -> leaf or
 * Augustine's Book -> Chapter: `GenericWork.divisions` is simply 24 Book
 * divisions, each a LEAF (children: [] always) carrying exactly one Passage
 * whose text is that whole Book's reading text (every verse line, for the
 * Greek; every paragraph, for Murray's English prose). Neither source prints
 * any numbered structure below the Book level worth modelling separately -
 * this mirrors how a long Augustine chapter is already handled as a single
 * Passage, just with no Chapter level at all above it here.
 *
 * Id scheme (read by src/library/genericCorpus.ts's `BOOK_ID` regex,
 * `/^book-\d+$/`, so these render as "Book N" in the UI automatically - this
 * file does not need to touch that shared code): Book = `book-N`, 1-based
 * plain arabic numerals ("book-1".."book-24"), matching Euclid's own Book
 * numbering convention rather than Augustine's roman numerals.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '': neither source prints sub-numbering below the Book level */
  n: string;
  /** the Book's full reading text: Greek verse lines joined with "\n" (one per source <l>), or Murray's English paragraphs joined with "\n\n" */
  text: string;
  /** always null: division-level `ref` already carries the book's line range */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. an editorially-excluded <del> line, or a source-internal line gap) */
  anomaly?: string;
}

export interface Division {
  /** `book-N`, 1-based arabic */
  id: string;
  /** plain arabic string "1".."24" (NOT roman, unlike Augustine's Books) */
  number: string;
  /** the book's own printed line range, e.g. "1–611" (Greek: its own verse numbering; English: the Loeb margin's cross-reference line numbers, which track the Greek) */
  ref: string | null;
  /** always null: neither source prints a per-book argument/summary heading */
  sourceHeading: string | null;
  /** always null: not fabricated - neither source prints one */
  editorialTitle: string | null;
  /** always [] - a Book is a leaf, unlike Euclid/Augustine's deeper trees */
  children: Division[];
  /** always exactly 1 element */
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
