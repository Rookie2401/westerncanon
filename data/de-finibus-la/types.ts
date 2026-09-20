/**
 * Type definitions for the bundled Latin De Finibus Bonorum et Malorum corpus in
 *   data/de-finibus-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-finibus-la  (scripts/import-de-finibus-la/index.ts)
 * and validated by
 *   npm run validate:de-finibus-la  (scripts/import-de-finibus-la/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi048.perseus-lat2 - Theodor Schiche, ed., M.
 * Tulli Ciceronis De Finibus Bonorum et Malorum Libri Quinque (Leipzig:
 * Teubner, 1915).
 *
 * Two-level tree, Book -> Section, independently parsed from the English
 * sibling data/de-finibus-en/ (a different source entirely - Wikisource page
 * scan of Yonge's translation - so the two editions are NOT forced to divide
 * identically; see anomalies.json). A Book division has children (its
 * Sections) and no passages of its own; a Section division has exactly one
 * Passage and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID; a
 * section id matches none of the app's special-cased id shapes, so it falls
 * through to the plain "§ N" label): Book = `book-N`, Section = `book-N-sec-M`,
 * both 1-based plain arabic numerals, matching Perseus's own
 * `subtype="section"` fine-grained paragraph numbering (443 sections total
 * across the 5 books - NOT the coarser traditional "chapter" numbering, see
 * Division.ref below).
 *
 * Division.ref (Section only) is the traditional Ciceronian chapter number
 * (e.g. "17") that section falls under, reconstructed from this source's own
 * inline `<milestone unit="chapter" n="…"/>` markers: the nearest such
 * marker at or before that section's own text, carried forward across
 * section boundaries (a chapter usually spans several sections; not every
 * section starts a new chapter). Null only for section(s) before the very
 * first chapter milestone in the whole work (none, in practice - the first
 * milestone is the work's opening word). Book Division.ref is always null.
 *
 * Each Section carries exactly ONE Passage: every surviving `<p>` under that
 * section div, in document order, joined with "\n\n" when there is more than
 * one. Passage.n is '' throughout (Perseus's own section number is already
 * the Division.number here); Passage.ref is always null (the chapter
 * reference lives on the Section Division itself, see Division.ref above).
 * Passage.anomaly carries a human-readable note when that passage's text
 * includes a kept editorial `<add>` insertion or a printed manuscript
 * `<gap>` - see anomalies.json for the full, individually logged account.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - see the module doc */
  n: string;
  /** verbatim Latin paragraph(s), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - the chapter reference lives on the enclosing Section Division, not the Passage */
  ref: string | null;
  /** optional note when something irregular (a kept <add>, a printed <gap>) was preserved in this passage */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'5' for a Book, '1'..N for a Section, Perseus's own section numbering) */
  number: string | null;
  /** Section only: nearest preceding traditional chapter number (e.g. "17"); null for a Book, or for a section before the first chapter milestone */
  ref: string | null;
  /** Book only: the source's own <head> text (e.g. "LIBER PRIMUS"); null for a Section (no rubric of its own) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-finibus-la' */
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
