/**
 * Type definitions for the bundled Latin De Officiis corpus in
 *   data/de-officiis-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-officiis-la  (scripts/import-de-officiis-la/index.ts)
 * and validated by
 *   npm run validate:de-officiis-la  (scripts/import-de-officiis-la/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi055.perseus-lat1 - Cicero, De Officiis, ed.
 * Walter Miller (Cambridge, MA: Harvard University Press; London: William
 * Heinemann Ltd, 1913 Loeb Classical Library edition).
 *
 * Two-level tree, Book -> Section (Cicero has no Bekker numbers; Perseus's
 * own `subtype="section"` numbering is used directly, matching this source's
 * own citation practice - "off. 1.7" etc.). A Book division has children
 * (its Sections) and no passages of its own; a Section division has one or
 * more passages and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID so
 * Books render as "Book N"; a `book-N-sec-M` id matches no special kind and
 * falls through to the generic "§ M" label, which is correct/intentional):
 * Book = `book-N`, Section = `book-N-sec-M`, both 1-based plain arabic
 * numerals, matching the source's own numbering (3 books; 161/89/121
 * sections respectively - see about.json).
 *
 * Division.ref (Section only) is the nearest PRECEDING inline
 * `<milestone unit="chapter" n="…"/>` value in this book (Cicero's
 * traditional chapter citation, coarser than section numbering - e.g.
 * "off. 1.7" is chapter 7 within Book 1), reconstructed by walking the
 * source in document order and carrying the last-seen chapter number forward
 * across sections that carry no milestone of their own; null before the
 * first milestone of a book. Chapter numbering restarts at 1 in each Book.
 * Book Division.ref is always null.
 *
 * Each Section carries exactly ONE Passage: every surviving `<p>` under that
 * section div, in document order, joined with "\n\n" when there is more than
 * one (this source's TEI often also encodes a second, empty `<p>` per
 * section - a source-side artifact; it cleans to empty text and is dropped,
 * not joined in as a blank segment - see anomalies.json). Passage.n is ''
 * throughout (Cicero's own prose carries no paragraph sub-numbering finer
 * than the section); Passage.ref is always null (no finer milestone than
 * the section-level chapter reference is derivable from this source).
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - no paragraph sub-numbering finer than the section exists in this source */
  n: string;
  /** verbatim Latin paragraph(s), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc for why per-passage chapter refs are not fabricated */
  ref: string | null;
  /** optional note when something irregular was preserved (a kept <add>, an omitted <gap>, etc.) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'3' for a Book, '1'..N for a Section) */
  number: string | null;
  /** Section only: nearest preceding chapter milestone value, e.g. "7"; null for a Book or before the first milestone */
  ref: string | null;
  /** Book only: the source's own verbatim <head> rubric (e.g. "Liber Primus"); null for a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-officiis-la' */
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
