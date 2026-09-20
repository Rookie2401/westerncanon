/**
 * Type definitions for the bundled English Tusculan Disputations corpus in
 *   data/tusculan-disputations-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:tusculan-disputations-en  (scripts/import-tusculan-disputations-en/index.ts)
 * and validated by
 *   npm run validate:tusculan-disputations-en  (scripts/import-tusculan-disputations-en/validate.ts)
 *
 * Source: Project Gutenberg ebook #14988, "Cicero's Tusculan Disputations;
 * Also, Treatises On the Nature of the Gods, and On the Commonwealth"
 * (Harper & Brothers, New York, 1877 - Harper's New Classical Library),
 * TUSCULAN-DISPUTATIONS-ONLY PORTION of that shared volume (see index.ts's
 * module doc for the exact delimiting text; "On the Nature of the Gods" and
 * "On the Commonwealth", the volume's other two works, are out of scope and
 * not present anywhere in this data).
 *
 * Two-level tree, Book -> Section, independently parsed from the Latin
 * sibling data/tusculan-disputations-la/ (a different source entirely -
 * Perseus TEI XML - so the two editions are NOT forced to divide
 * identically; see anomalies.json). A Book division has children (its
 * Sections) and no passages of its own; a Section division has exactly one
 * Passage and no children.
 *
 * Id scheme: Book = `book-N`, Section = `book-N-sec-M`. This edition prints
 * its own traditional roman-numeral chapter numbering inline ("I.", "II."
 * ...) throughout all 5 books - unlike De Finibus's English sibling, this is
 * NOT inferred to be missing anywhere (every book's own "I." is present -
 * see the module doc in index.ts) - so Section IS that printed chapter:
 * `book-N-sec-M` where M is the arabic value of the M-th roman-numeral
 * chapter marker printed in that Book (1-based).
 *
 * Division.ref is ALWAYS NULL throughout this edition (Book and Section
 * alike): this plain-text transcription carries no page/column reference
 * apparatus of its own; the chapter number itself is already captured as
 * Division.number.
 *
 * Book Division.editorialTitle carries this edition's own printed book
 * subtitle (e.g. "On the Contempt of Death" for Book I), trimmed of its
 * terminal period; the source prints these in inconsistent typographic case
 * (all-caps for four of the five, sentence case for Book IV) - preserved
 * here in a single normalised case throughout since the casing is pure
 * typography, not wording (see about.json). Section Division.editorialTitle
 * is always null.
 *
 * Each Section carries exactly ONE Passage: every paragraph transcribed
 * under that chapter, in document order (with the leading "N. " chapter-
 * numeral prefix stripped, since it is now Division.number), joined with
 * "\n\n" when there is more than one. Passage.n is '' throughout; Passage.ref
 * is always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - see the module doc */
  n: string;
  /** verbatim English paragraph(s) (Yonge's translation), whitespace collapsed */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'5' for a Book, '1'..N for a Section = the printed roman-numeral chapter, arabic) */
  number: string | null;
  /** always null - see the module doc */
  ref: string | null;
  /** always null - this edition's own printed subtitle is carried on editorialTitle instead, see the module doc */
  sourceHeading: string | null;
  /** Book only: this edition's own printed book subtitle (e.g. "On the Contempt of Death"); null for a Section */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'tusculan-disputations-en' */
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
