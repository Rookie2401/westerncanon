/**
 * Type definitions for one work of Plutarch's Parallel Lives, bundled in
 *   data/plutarch-<slug>-{grc,en}/
 *
 * Generated (do not hand-edit) by
 *   npm run import:plutarch  (scripts/import-plutarch/index.ts, table-driven
 *   over all 66 works / 132 language editions - see
 *   scripts/import-plutarch-shared/workTable.ts and WORKS.md)
 * and validated by
 *   npm run validate:plutarch  (scripts/import-plutarch-shared/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0007.tlgNNN - Bernadotte Perrin, ed. and trans.,
 * Plutarch's Lives, Loeb Classical Library, 11 vols. (Cambridge, MA: Harvard
 * University Press; London: William Heinemann Ltd., 1914-1926). See
 * about.json for this work's exact volume/year and any structural anomalies.
 *
 * Shape: a flat sequence of chapter Divisions (id `ch-N`, number `"N"`,
 * a clean 1..N sequence) - EXCEPT the two "double lives" (Agis and
 * Cleomenes; Tiberius and Caius Gracchus), whose source restarts chapter
 * numbering per named part: those two works instead have an extra book-level
 * Division per part (id `book-<part>`, number null, sourceHeading = the
 * part's own source title, e.g. "Agis"/"AGIS") wrapping its own
 * `book-<part>-ch-N` chapters. A chapter Division has no children and
 * exactly one Passage; a book-level Division (the two exceptions only) has
 * no passages of its own and its chapters as children.
 *
 * Each chapter's single Passage joins every paragraph found anywhere in the
 * source's own section subdivisions beneath that chapter, in document order,
 * separated by "\n\n" - sections are not separately addressable divisions.
 * Passage.n is '' throughout (no separate paragraph numbering is exposed);
 * Passage.ref and every Division.ref are always null (citation is by chapter
 * number alone, carried in Division.number/id - see about.json "Reference
 * scheme"). Passage.anomaly is set when the source's own <gap reason="lost"/>
 * lacuna markers fall within that chapter (see anomalies.json for the full,
 * machine-readable list of every preserved irregularity: editorial gaps,
 * <add> supplements, <choice><sic>/<corr> manuscript corrections).
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' - this source exposes no separate paragraph numbering */
  n: string;
  /** verbatim reading text (Greek or English per this directory's language), paragraphs joined by "\n\n" */
  text: string;
  /** always null - citation is by chapter number alone (Division.number/id) */
  ref: string | null;
  /** optional note when a source <gap reason="lost"/> lacuna falls within this chapter */
  anomaly?: string;
}

export interface Division {
  /** `ch-N` for a chapter (64 of 66 works); `book-<part>` / `book-<part>-ch-N` for the two double lives - see the module doc */
  id: string;
  /** arabic string ('1'..'N') for a chapter; null for a book-level Division (the two double lives only) */
  number: string | null;
  /** always null - this source carries no page-marker citation scheme */
  ref: string | null;
  /** book-level Division only (the two double lives): the part's own verbatim source <head> title (e.g. "Agis"/"AGIS"); null for every chapter */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** book-level Division -> its chapters; chapter -> [] */
  children: Division[];
  /** [] for a book-level Division (a container only); exactly [one Passage] for a chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** `plutarch-<slug>-grc` or `plutarch-<slug>-en` */
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
