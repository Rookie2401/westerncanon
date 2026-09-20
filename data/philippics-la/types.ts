/**
 * Type definitions for the bundled Latin Philippicae corpus in
 *   data/philippics-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:philippics-la  (scripts/import-philippics-la/index.ts)
 * and validated by
 *   npm run validate:philippics-la  (scripts/import-philippics-la/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi035.perseus-lat2 - Cicero, *M. Tulli Ciceronis
 * Orationes, Vol. 6*, ed. Albert Curtis Clark (Oxford: Clarendon Press,
 * 1918).
 *
 * Two-level tree, Speech -> Section (no Book level), same shape as
 * data/in-catilinam-la - 14 speeches here rather than 4. Id scheme:
 * Speech = `speech-N` (1..14), Section = `speech-N-sec-M` (continuous
 * within a speech, not reset per chapter).
 *
 * Division.ref (Section only) is the nearest preceding `<milestone
 * unit="chapter" n="K"/>` value (chapter numbering restarts at 1 within
 * each speech), as a plain arabic numeral string; null if none precedes
 * yet. Speech Division.ref and every Passage.ref are always null.
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly
 * under that section's div, in document order, joined with "\n\n" when
 * there is more than one. Passage.n is '' throughout.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim Latin text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `speech-N` for a Speech, `speech-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'14' for a Speech, '1'..N for a Section) */
  number: string | null;
  /** Section only: nearest preceding chapter milestone value, as a plain arabic numeral string; null for a Speech or when no milestone yet precedes */
  ref: string | null;
  /** Speech only: the source's own oration-title rubric (its `<head>`), verbatim; null for a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Speech -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Speech (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'philippics-la' */
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
