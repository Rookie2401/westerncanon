/**
 * Type definitions for the bundled Latin Tusculanae Disputationes corpus in
 *   data/tusculan-disputations-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:tusculan-disputations-la  (scripts/import-tusculan-disputations-la/index.ts)
 * and validated by
 *   npm run validate:tusculan-disputations-la  (scripts/import-tusculan-disputations-la/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi049.perseus-lat2 - Max Pohlenz, ed., M. Tulli
 * Ciceronis Tusculanae Disputationes (Leipzig: Teubner, 1918).
 *
 * Two-level tree, Book -> Section, independently parsed from the English
 * sibling data/tusculan-disputations-en/ (a different source entirely -
 * Project Gutenberg plain text of Yonge's 1877 translation - so the two
 * editions are NOT forced to divide identically; see anomalies.json). A Book
 * division has children (its Sections) and no passages of its own; a
 * Section division has exactly one Passage and no children.
 *
 * Id scheme: Book = `book-N`, Section = `book-N-sec-M`, both 1-based plain
 * arabic numerals, matching Perseus's own `subtype="section"` fine-grained
 * paragraph numbering (475 sections total across the 5 books).
 *
 * Division.ref (Section only) is ALWAYS NULL in this edition: unlike the De
 * Finibus Latin witness (phi048, same Perseus text group), this Pohlenz XML
 * carries NO `<milestone unit="chapter"/>` markers at all (confirmed by
 * direct inspection - zero occurrences in the whole file) and no `<head>`
 * book-title text either, so there is no source-printed traditional-chapter
 * reference to reconstruct here; nothing is fabricated to supply one. See
 * about.json / anomalies.json. (The traditional Tusculan chapter numbers ARE
 * available - and printed inline - in the ENGLISH sibling, whose 1877
 * Gutenberg source happens to preserve them; the two editions are not
 * reconciled against each other.) Book Division.ref is always null too.
 *
 * Each Section carries exactly ONE Passage: every surviving `<p>` under that
 * section div, in document order, joined with "\n\n" when there is more than
 * one. Passage.n is '' throughout; Passage.ref is always null. Passage.anomaly
 * carries a human-readable note when that passage's text includes a kept
 * editorial `<add>` insertion or a printed manuscript `<gap>` - see
 * anomalies.json for the full, individually logged account.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - see the module doc */
  n: string;
  /** verbatim Latin paragraph(s), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null */
  ref: string | null;
  /** optional note when something irregular (a kept <add>, a printed <gap>) was preserved in this passage */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'5' for a Book, '1'..N for a Section, Perseus's own section numbering) */
  number: string | null;
  /** always null in this edition - see the module doc */
  ref: string | null;
  /** always null - this edition carries no <head> text at all */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'tusculan-disputations-la' */
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
