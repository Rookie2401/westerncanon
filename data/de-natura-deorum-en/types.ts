/**
 * Type definitions for the bundled De Natura Deorum corpora in
 *   data/de-natura-deorum-la/          data/de-natura-deorum-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-natura-deorum-la  (scripts/import-de-natura-deorum-la/index.ts)
 *   npm run import:de-natura-deorum-en  (scripts/import-de-natura-deorum-en/index.ts)
 * and validated by
 *   npm run validate:de-natura-deorum-la / validate:de-natura-deorum-en
 *
 * Source:
 *   Latin  - Perseus canonical-latinLit TEI XML, CTS urn:cts:latinLit:
 *            phi0474.phi050.perseus-lat2 (ed. Otto Plasberg, "Scripta Quae
 *            Manserunt Omnia, Fasc. 45", Leipzig: Teubner, 1917) - NOT
 *            perseus-lat1/Mueller as might be assumed from the sibling De
 *            Divinatione volume; confirmed against this work's own
 *            __cts__.xml (phi0474/phi050/__cts__.xml lists only a
 *            perseus-lat2 edition; no perseus-lat1 file exists for phi050).
 *   English- English Wikisource, Charles Duke Yonge's 1888 translation
 *            ("On the Nature of the Gods"), 3 separate page-scan book pages
 *            under "Cicero's Tusculan Disputations/On the Nature of the
 *            Gods/Book N", fetched via the MediaWiki action=parse&prop=text
 *            API (rendered HTML, not wikitext) and parsed with jsdom.
 *
 * Two-level tree, Book -> section (3 Books). Id scheme: Book = `book-N`,
 * section = `book-N-sec-M`, both 1-based plain arabic numerals.
 *
 * Division.ref (Latin): this witness carries NO inline `<milestone
 * unit="chapter">` markers at all (confirmed by direct inspection - only
 * `<pb/>` page breaks, no chapter milestones), so every section's
 * Division.ref is null throughout; nothing is fabricated. (English):
 * Wikisource's page-scan transclusion carries no Bekker/chapter milestones
 * either; Division.ref is null throughout there too - section numbering is
 * instead recovered from this source's own inline paragraph numbering (see
 * the English importer's module doc). Book Division.ref is always null.
 * Passage.ref is always null. Passage.n is always the empty string.
 *
 * Book 3 (both witnesses) ends fragmentarily: Cicero's own text breaks off
 * genuinely (a well-known transmission gap), and Plasberg's edition
 * reconstructs the surviving remnants from later authors' quotations
 * (Lactantius, Arnobius, Augustine, etc.) - each such fragment is kept
 * verbatim as its own section, with the secondary source's own citation
 * (`<bibl>`, e.g. "Lact. Inst. 2.3.2") excluded from the reading text as
 * apparatus (see the Latin importer's module doc and anomalies.json).
 */

export type Lang = 'la' | 'en';

export interface Passage {
  /** always '' - no printed sub-section paragraph numbering in this source */
  n: string;
  /** verbatim paragraph text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - no per-paragraph marker is printed in either witness */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a section */
  id: string;
  /** arabic string ('1'..'3' for a Book, '1'..N for a section) */
  number: string | null;
  /** always null - see the module doc; neither witness carries a milestone this source can build a ref from */
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
  /** 'de-natura-deorum-la' | 'de-natura-deorum-en' */
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
