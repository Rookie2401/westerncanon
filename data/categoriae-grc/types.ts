/**
 * Type definitions for the bundled Aristotle corpora in
 *   data/categoriae-grc/          data/de-interpretatione-grc/
 *
 * These files are generated (do not hand-edit) by
 *   npm run import:aristotle-categoriae-grc  (scripts/import-aristotle-categoriae-grc/index.ts)
 *   npm run import:aristotle-deint-grc       (scripts/import-aristotle-deint-grc/index.ts)
 * and validated by
 *   npm run validate:aristotle               (scripts/import-aristotle-shared/validate.ts)
 *
 * Both works are the original Greek text (Bekker 1837, via the First1KGreek
 * TEI). The two are INDEPENDENT texts and neither is derived from the other.
 *
 * Structural notes for these works:
 *   - divisions are the chapters only; there is NO praefatio division.
 *   - divisions are one level deep: `children` is always [].
 *   - the digital source marks chapter divisions only — no Bekker
 *     page/column/line milestones and no line markers — so every Division.ref
 *     and Passage.ref is null, every Passage.n is the empty string, and every
 *     Division.sourceHeading is null. Citation is by chapter (plus the editorial
 *     English chapter title).
 *
 * IMPORTANT: this file is kept byte-identical across both data dirs
 * (categoriae-grc, de-interpretatione-grc).
 */

export type Lang = 'la' | 'grc';

export interface Passage {
  /** paragraph number as printed in the edition; '' throughout for these works (no printed numbers) */
  n: string;
  /** verbatim original-language paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** canonical scholarly ref for this passage; null throughout for these works */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** slug, 'ch-1'..'ch-15' (Categoriae) / 'ch-1'..'ch-14' (De Interpretatione) */
  id: string;
  /** chapter number as an arabic string ('1'..'15' / '1'..'14') */
  number: string | null;
  /** canonical span; null throughout for these works */
  ref: string | null;
  /** verbatim per-chapter heading from the source; always null (the Greek source marks none) */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text) - from the shared chapter table */
  editorialTitle: string | null;
  /** [] for these works (one level deep) */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'categoriae-grc' | 'de-interpretatione-grc' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
