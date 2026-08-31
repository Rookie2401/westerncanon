/**
 * Type definitions for the bundled Latin Aristotle corpora in
 *   data/categoriae-la/          data/de-interpretatione-la/
 *
 * These files are generated (do not hand-edit) by
 *   npm run import:aristotle-categoriae-la  (scripts/import-aristotle-categoriae-la/index.ts)
 *   npm run import:aristotle-deint-la       (scripts/import-aristotle-deint-la/index.ts)
 * and validated by
 *   npm run validate:aristotle             (scripts/import-aristotle-shared/validate.ts)
 *
 * Both works are Aristotle in the Latin translation of Boethius (early 6th c.),
 * from Latin Wikisource. The two are INDEPENDENT texts and neither is derived
 * from the other; each is the Latin sibling of the matching Greek work
 * (data/categoriae-grc/, data/de-interpretatione-grc/) and shares its division
 * id / number / editorialTitle table so the two line up 1:1.
 *
 * Structural notes for these works:
 *   - divisions are the chapters only; there is NO praefatio division
 *     (chapter 1 is the first thing after the wiki scaffolding).
 *   - divisions are one level deep: `children` is always [].
 *   - this source carries no Bekker page/column/line milestones and no line
 *     numbers, so every Division.ref and Passage.ref is null and every
 *     Passage.n is the empty string. Citation is by chapter (plus the editorial
 *     English chapter title).
 *   - some chapters print a verbatim Latin rubric (e.g. "DE SUBSTANTIA"); that
 *     rubric is stored verbatim as Division.sourceHeading. Chapters with no
 *     printed rubric have sourceHeading null.
 *
 * IMPORTANT: this file is kept byte-identical across both data dirs
 * (categoriae-la, de-interpretatione-la).
 */

export type Lang = 'la' | 'grc';

export interface Passage {
  /** paragraph number as printed in the edition; '' throughout for these works (no printed numbers) */
  n: string;
  /** verbatim Latin paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** canonical scholarly ref for this passage; null throughout for these works */
  ref: string | null;
  /** optional note when something irregular was preserved (editorial supplement, lacuna mark, …) */
  anomaly?: string;
}

export interface Division {
  /** slug, 'ch-1'..'ch-15' (Categoriae) / 'ch-1'..'ch-14' (De Interpretatione) */
  id: string;
  /** chapter number as an arabic string ('1'..'15' / '1'..'14') */
  number: string | null;
  /** canonical span; null throughout for these works */
  ref: string | null;
  /** verbatim per-chapter Latin rubric from the source, or null where the source prints none */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text) - from the shared chapter table */
  editorialTitle: string | null;
  /** [] for these works (one level deep) */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'categoriae-la' | 'de-interpretatione-la' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
