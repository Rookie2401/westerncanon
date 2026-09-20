/**
 * Type definitions for the bundled English De Officiis corpus in
 *   data/de-officiis-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-officiis-en  (scripts/import-de-officiis-en/index.ts)
 * and validated by
 *   npm run validate:de-officiis-en  (scripts/import-de-officiis-en/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi055.perseus-eng1 - Walter Miller, trans.,
 * De Officiis (Loeb Classical Library, 1913; Cambridge, MA: Harvard
 * University Press; London: William Heinemann Ltd) - the same Miller volume
 * as the facing Latin text bundled as data/de-officiis-la.
 *
 * Two-level tree, Book -> Section, independently parsed from the Latin
 * sibling data/de-officiis-la/ (the two witnesses are NOT forced to divide
 * sections identically; both happen to agree exactly - 161/89/121 sections
 * in Books I/II/III - but this is a real cross-check, not an assumption).
 * A Book division has children (its Sections) and no passages of its own; a
 * Section division has one or more passages and no children.
 *
 * STRUCTURAL NOTE — this English witness is NOT encoded the same way as the
 * Latin one, despite being the same Perseus phi0474.phi055 work: it has NO
 * `<div subtype="section">` divs at all. Instead, each Book div is one
 * continuous run of `<p>` elements, and sections are marked purely by
 * inline `<milestone unit="section" n="N"/>` markers - which do not reliably
 * align to `<p>` boundaries (confirmed by direct inspection: 36 of 482 `<p>`
 * elements have running text before their first section milestone, and 50
 * contain more than one section milestone, i.e. a single `<p>` can span a
 * section boundary). The importer therefore does NOT use `<p>` as the
 * section-splitting unit; it splits the continuous text stream at each
 * marker's exact character position, carrying a running "current section"
 * state forward, and re-derives paragraph breaks within a section from
 * whatever `<p>` boundaries fall inside that section's own span (joined with
 * "\n\n"). See the importer's module doc for the full algorithm.
 *
 * Id scheme (matches the Latin sibling and this app's general BOOK_ID/
 * kindLabel convention): Book = `book-N`, Section = `book-N-sec-M`.
 *
 * Division.ref (Section only): the nearest preceding inline
 * `<milestone unit="chapter" n="…"/>` value in this book (Cicero's
 * traditional chapter citation), carried forward across sections with no
 * marker of their own, reset to null at the start of each book - same
 * scheme as the Latin sibling, and the two witnesses' chapter counts agree
 * exactly (45/25/33). Book Division.ref is always null.
 *
 * Each Section carries exactly ONE Passage: its re-derived paragraph(s),
 * joined with "\n\n" when there is more than one. Passage.n is '' throughout;
 * Passage.ref is always null (no finer milestone than the section-level
 * chapter reference is derivable from this source).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - no paragraph sub-numbering finer than the section exists in this source */
  n: string;
  /** verbatim English (Miller's own translation) text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc for why per-passage chapter refs are not fabricated */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'3' for a Book, '1'..N for a Section) */
  number: string | null;
  /** Section only: nearest preceding chapter milestone value, e.g. "7"; null for a Book or before the first milestone */
  ref: string | null;
  /** Book only: the source's own verbatim <head> rubric (e.g. "Book I: Moral Goodness"); null for a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-officiis-en' */
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
