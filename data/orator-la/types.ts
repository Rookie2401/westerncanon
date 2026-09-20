/**
 * Type definitions for the bundled Latin texts of Cicero's *Brutus* and
 * *Orator* (data/brutus-la/, data/orator-la/).
 *
 * Generated (do not hand-edit) by
 *   npm run import:brutus-la   (scripts/import-brutus-la/index.ts)
 *   npm run import:orator-la   (scripts/import-orator-la/index.ts)
 * and validated by
 *   npm run validate:brutus-la (scripts/import-brutus-la/validate.ts)
 *   npm run validate:orator-la (scripts/import-orator-la/validate.ts)
 *
 * Source: Perseus / Open Greek and Latin canonical-latinLit TEI XML -
 * urn:cts:latinLit:phi0474.phi039.perseus-lat2 (Brutus) and
 * urn:cts:latinLit:phi0474.phi040.perseus-lat2 (Orator), both from M. Tulli
 * Ciceronis Rhetorica, Vol. 2, ed. Augustus Samuel Wilkins (Oxford:
 * Clarendon Press, 1902).
 *
 * IMPORTANT: this file is kept byte-identical across both data dirs
 * (brutus-la, orator-la) - mirrors data/categoriae-la/types.ts.
 *
 * Structural notes for both works:
 *   - FLAT: neither work is divided into books. Every division is a
 *     section leaf, id `sec-N` (Division.number = the plain arabic section
 *     number, exactly as printed by Wilkins, running 1..N with no gaps -
 *     N = 333 for Brutus, 238 for Orator). `children` is always [].
 *   - each section leaf carries exactly one Passage (Passage.n is always
 *     the empty string; a section's <p>s, if more than one, are joined
 *     with "\n\n").
 *   - this source prints inline <milestone unit="chapter" n="N"/> markers -
 *     a coarser, traditional Roman-numeral-cited chapter reference,
 *     independent of Wilkins' own section numbering. A section's
 *     Division.ref is the nearest PRECEDING such milestone value (as a
 *     plain arabic string), i.e. the traditional chapter that section
 *     falls within; null if no milestone has been seen yet (Brutus's own
 *     editorial "SIGLA" front matter, which is not part of the work's text
 *     and is excluded entirely, plus a handful of sections before the very
 *     first milestone - see anomalies.json). Passage.ref is null
 *     throughout: the milestone is a chapter-level marker only, never
 *     printed per-paragraph.
 */

export type Lang = 'la' | 'grc' | 'en';

export interface Passage {
  /** paragraph number as printed; '' throughout (no printed sub-numbers within a section) */
  n: string;
  /** verbatim Latin paragraph(s), whitespace collapsed, entities decoded */
  text: string;
  /** null throughout for this work (see module doc) */
  ref: string | null;
  /** optional note when something irregular was preserved (editorial deletion span, lacuna mark, …) */
  anomaly?: string;
}

export interface Division {
  /** 'sec-1'..'sec-N' */
  id: string;
  /** plain arabic section number as printed */
  number: string | null;
  /** nearest preceding traditional chapter milestone, as a plain arabic string; null if none yet */
  ref: string | null;
  /** null throughout: this source prints no per-section rubric */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text); null throughout (no editorial titles assigned) */
  editorialTitle: string | null;
  /** [] throughout (flat, one level deep) */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'brutus-la' | 'orator-la' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
