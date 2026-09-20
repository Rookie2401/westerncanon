/**
 * Type definitions for the bundled Latin In Catilinam corpus in
 *   data/in-catilinam-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:in-catilinam-la  (scripts/import-in-catilinam-la/index.ts)
 * and validated by
 *   npm run validate:in-catilinam-la  (scripts/import-in-catilinam-la/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi013.perseus-lat2 - Cicero, *M. Tulli Ciceronis
 * Orationes, Volume 1*, ed. Albert Curtis Clark (Oxford: Clarendon Press,
 * 1908).
 *
 * Two-level tree, Speech -> Section (no Book level - unlike In Verrem, these
 * four orations are not further subdivided). A Speech division has children
 * (its Sections) and no passages of its own; a Section division has exactly
 * one passage and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel so Speeches
 * render as "Speech N" and Sections fall through to the default "§ M"):
 * Speech = `speech-N` (1-based, matching the source's own
 * `subtype="speech"` numbering, which restarts at 1 within this work only -
 * there are exactly 4), Section = `speech-N-sec-M` (1-based, matching the
 * source's own `subtype="section"` numbering, which is continuous across an
 * entire speech, NOT reset per chapter).
 *
 * Division.ref (Section only) is the traditional "chapter" citation active
 * at that section's start: the source prints inline
 * `<milestone unit="chapter" n="K"/>` markers (chapter numbering also
 * restarts at 1 within each speech), coarser than the section numbering - a
 * chapter typically spans several sections. A Section's ref is the nearest
 * preceding chapter milestone in document order (which may be the very
 * first token of that section itself, when a new chapter begins there), as
 * a plain arabic numeral string; null if no chapter milestone precedes it
 * yet (see anomalies.json - this genuinely happens for a handful of the
 * earliest sections of a speech in this source). Speech Division.ref is
 * always null. Passage.ref is always null (no per-paragraph reference is
 * printed).
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly
 * under that section's div, in document order, joined with "\n\n" when
 * there is more than one (rare - most sections hold a single `<p>`).
 * Passage.n is '' throughout (this source prints no finer per-paragraph
 * numbering).
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
  /** arabic string ('1'..'4' for a Speech, '1'..N for a Section, matching the source's own numbering) */
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
  /** 'in-catilinam-la' */
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
