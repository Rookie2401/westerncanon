/**
 * Type definitions for the bundled De Divinatione corpora in
 *   data/de-divinatione-la/          data/de-divinatione-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-divinatione-la  (scripts/import-de-divinatione-la/index.ts)
 *   npm run import:de-divinatione-en  (scripts/import-de-divinatione-en/index.ts)
 * and validated by
 *   npm run validate:de-divinatione-la / validate:de-divinatione-en
 *
 * Source: Perseus canonical-latinLit TEI XML.
 *   Latin  - CTS urn:cts:latinLit:phi0474.phi053.perseus-lat1 (ed. C. F. W.
 *            Mueller, Leipzig: Teubner, 1915).
 *   English- CTS urn:cts:latinLit:phi0474.phi053.perseus-eng1 (trans.
 *            William Armistead Falconer, Loeb Classical Library, 1923
 *            printing).
 *
 * Two-level tree, Book -> section (2 Books). Id scheme (read by
 * src/library/genericCorpus.ts's BOOK_ID; a section leaf `book-N-sec-M`
 * matches none of the special shapes there and falls through to the plain
 * "§ M" label): Book = `book-N`, section = `book-N-sec-M`, both 1-based
 * plain arabic numerals, matching the source's own `subtype="section"`
 * numbering (Latin) / `<milestone unit="section">` numbering (English).
 *
 * IMPORTANT witness-structure difference between the two languages (see each
 * importer's own module doc for the full account): the Latin witness marks
 * every section with an explicit `<div type="textpart" subtype="section"
 * n="N">` nested inside each `<div subtype="book">`; the English witness
 * carries NO section divs at all (only the two Book divs) - sections are
 * recovered entirely from this source's own inline `<milestone unit="section"
 * n="N"/>` markers, which can (and often do) fall mid-paragraph. Each
 * witness's own editorial synopsis ("ARGUMENTUM") preceding each Book is
 * excluded from the reading text entirely (it is Mueller's own prose
 * describing the book in the third person, not Cicero's) - see the Latin
 * importer's module doc.
 *
 * Division.ref is this edition's own chapter citation (e.g. "31"),
 * reconstructed from this source's inline `<milestone unit="chapter"
 * n="…"/>` markers: the value active at the moment a given section closes,
 * or null if none has appeared yet since the start of that Book (chapter
 * numbering restarts at 1 in Book 2, confirmed in both witnesses). Book
 * Division.ref is always null. Passage.ref is always null. Passage.n is
 * always the empty string.
 */

export type Lang = 'la' | 'en';

export interface Passage {
  /** always '' - no printed sub-section paragraph numbering in this source */
  n: string;
  /** verbatim paragraph text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc; no per-paragraph marker is printed */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a section */
  id: string;
  /** arabic string ('1'..'2' for a Book, '1'..N for a section, restarting each Book) */
  number: string | null;
  /** section only: this edition's chapter citation active at this section, or null; always null for a Book */
  ref: string | null;
  /** always null - the source prints no per-section rubric */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are sections; section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-divinatione-la' | 'de-divinatione-en' */
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
