/**
 * Type definitions for the bundled English De Finibus corpus in
 *   data/de-finibus-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-finibus-en  (scripts/import-de-finibus-en/index.ts)
 * and validated by
 *   npm run validate:de-finibus-en  (scripts/import-de-finibus-en/validate.ts)
 *
 * Source: English Wikisource, "The Academic Questions, Treatise De Finibus,
 * and Tusculan Disputations / De Finibus, a Treatise on the Chief Good and
 * Evil" (5 Book subpages, page-scan transcription of Charles Duke Yonge's
 * translation, Bohn's Classical Library, 1891 printing).
 *
 * Two-level tree, Book -> Section, independently parsed from the Latin
 * sibling data/de-finibus-la/ (a different source entirely - Perseus TEI XML
 * - so the two editions are NOT forced to divide identically; see
 * anomalies.json). A Book division has children (its Sections) and no
 * passages of its own; a Section division has exactly one Passage and no
 * children.
 *
 * Id scheme: Book = `book-N`, Section = `book-N-sec-M`. UNLIKE the Latin
 * sibling (whose 443 sections are Perseus's own fine paragraph-level
 * numbering, a different grain from the traditional chapter), this English
 * witness carries NO finer subdivision than Yonge's own printed roman-
 * numeral chapter markers ("I.", "II." ...) - so here Section IS that
 * chapter: `book-N-sec-M` where M is the arabic value of the M-th roman
 * numeral chapter marker printed in that Book (1-based, matching the
 * traditional Ciceronian chapter numbering one-for-one - the same numbers
 * that appear as Division.ref on the Latin sibling's Sections).
 *
 * Division.ref is ALWAYS NULL throughout this edition (Book and Section
 * alike): this page-scan transcription carries no Bekker/Stephanus-style
 * inline reference apparatus of its own to reconstruct a machine-derived ref
 * from; the chapter number itself is already captured as Division.number.
 *
 * Each Section carries exactly ONE Passage: every paragraph transcribed
 * under that chapter, in document order (with the leading "N. " chapter-
 * numeral prefix stripped, since it is now Division.number), joined with
 * "\n\n" when there is more than one. Passage.n is '' throughout; Passage.ref
 * is always null. Passage.anomaly carries a human-readable note for the one
 * documented irregularity (Book 2's missing printed "I." - see
 * anomalies.json).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - see the module doc */
  n: string;
  /** verbatim English paragraph(s) (Yonge's translation), whitespace collapsed, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. an inferred, unprinted chapter boundary) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'5' for a Book, '1'..N for a Section = the printed roman-numeral chapter, arabic) */
  number: string | null;
  /** always null - see the module doc */
  ref: string | null;
  /** always null - this witness's own book-title lines ("Second Book Of The Treatise...") are structural furniture, not a rubric worth preserving verbatim here */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-finibus-en' */
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
