/**
 * Type definitions for the bundled English Isagoge corpus in data/isagoge-en/.
 *
 * Generated (do not hand-edit) by
 *   npm run import:isagoge-en   (scripts/import-isagoge-en/index.ts)
 * and validated by
 *   npm run validate:isagoge-en (scripts/import-isagoge-en/validate.ts)
 *
 * This is Octavius Freire Owen's 1853 English translation of Porphyry's
 * Isagoge, printed as an appendix to his Organon of Aristotle (Bohn's
 * Classical Library). It is INDEPENDENT of the Greek (isagoge-grc) and
 * Latin (isagoge-la) editions bundled alongside it under the same `Isagoge`
 * group: Owen's 1853 chaptering (17 numbered chapters, no separate preface)
 * does not line up with the Busse-derived praefatio+26-capitula scheme used
 * by those two, so this work has its own, independently-numbered division
 * tree (based on data/de-interpretatione-la/types.ts's plain `ch-N` scheme,
 * the precedent for a flat, single-level, non-Book-nested work).
 *
 * Structural notes:
 *   - divisions are the 17 chapters only; there is no separate preface
 *     division (Chapter I, "Object of the writer, in the present
 *     Introduction," itself serves as the work's introduction).
 *   - divisions are one level deep: `children` is always [].
 *   - this source carries no printed paragraph numbers and the importer
 *     assigns no page/line citation scheme, so every Division.ref and
 *     Passage.ref is null and every Passage.n is the empty string. Citation
 *     is by chapter (roman numeral) plus the printed English chapter title.
 *   - every chapter prints its own English rubric (e.g. "Of Difference.");
 *     that rubric is stored verbatim as Division.sourceHeading.
 *     editorialTitle is null throughout: unlike the Greek/Latin editions,
 *     which need an editorial English gloss of a Greek/Latin rubric, this
 *     edition's heading is already in English, so no editorial gloss is
 *     invented.
 */

export type Lang = 'en';

export interface Passage {
  /** paragraph number as printed in the edition; '' throughout (no printed numbers) */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** canonical scholarly ref for this passage; null throughout for this work */
  ref: string | null;
  /** optional note when something irregular was preserved (source lacuna, stray mark removed, …) */
  anomaly?: string;
}

export interface Division {
  /** slug, 'ch-1'..'ch-17' */
  id: string;
  /** chapter number as a roman numeral string ('I'..'XVII') */
  number: string | null;
  /** canonical span; null throughout for this work */
  ref: string | null;
  /** verbatim per-chapter English rubric from the source (e.g. "Of Difference.") */
  sourceHeading: string | null;
  /** null throughout: the printed heading is already English, no editorial gloss needed */
  editorialTitle: string | null;
  /** [] for this work (one level deep) */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'isagoge-en' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
