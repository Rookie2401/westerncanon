/**
 * Type definitions for the bundled English In Catilinam corpus in
 *   data/in-catilinam-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:in-catilinam-en  (scripts/import-in-catilinam-en/index.ts)
 * and validated by
 *   npm run validate:in-catilinam-en  (scripts/import-in-catilinam-en/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi013.perseus-eng2 - Charles Duke Yonge, trans.,
 * *The Orations of Marcus Tullius Cicero, Volume 2* (London: Bell, 1856),
 * "Against L. Catiline".
 *
 * Two-level tree, Speech -> Section - independently parsed from the Latin
 * sibling data/in-catilinam-la/ (the two editions are NOT forced to divide
 * sections identically; any real mismatch is logged rather than silently
 * reconciled - see anomalies.json). Same id scheme as the Latin sibling:
 * Speech = `speech-N` (1..4), Section = `speech-N-sec-M`.
 *
 * Structural note specific to this English witness: unlike the Latin TEI
 * (where `subtype="section"` divs sit directly under the speech div), this
 * source additionally nests a `subtype="commentary" resp="editor"` div
 * (headed "THE ARGUMENT.") immediately before the section divs of every
 * speech - Yonge's own prose summary of that oration's historical
 * background, NOT a translation of anything Cicero actually said. It is
 * excluded from the reading text entirely (the importer only ever collects
 * `<p>` text from inside `subtype="section"` divs, so this sibling div is
 * skipped structurally, not by any special-case rule) - see the importer's
 * module doc and about.json.
 *
 * Division.ref (Section only) mirrors the Latin sibling's own `<milestone
 * unit="chapter" n="K"/>` markers (present independently in this witness
 * too, at the same traditional chapter boundaries), as a plain arabic
 * numeral string; null if none precedes yet. Speech Division.ref is always
 * null; Passage.ref is always null.
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly
 * under that section's div, in document order, joined with "\n\n" when
 * there is more than one (in practice every section here holds exactly
 * one). Passage.n is '' throughout.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim English translation (Yonge's own wording), whitespace collapsed, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `speech-N` for a Speech, `speech-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'4' for a Speech, '1'..N for a Section) */
  number: string | null;
  /** Section only: nearest preceding chapter milestone value, as a plain arabic numeral string; null for a Speech or when no milestone yet precedes */
  ref: string | null;
  /** Speech only: the source's own oration-title rubric (its first `<head>`), verbatim; null for a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Speech -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Speech (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'in-catilinam-en' */
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
