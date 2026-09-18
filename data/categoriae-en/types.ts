/**
 * Type definitions for the bundled English Categoriae corpus in
 *   data/categoriae-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-categoriae-en  (scripts/import-aristotle-categoriae-en/index.ts)
 * and validated by
 *   npm run validate:aristotle-categoriae-en  (scripts/import-aristotle-categoriae-en/validate.ts)
 *
 * This is Aristotle's Categories in Ella Mary Edghill's 1928 Oxford
 * translation (The Works of Aristotle, Vol. I, ed. W. D. Ross), from English
 * Wikisource's page-scan transclusion. It is the English sibling of
 * data/categoriae-grc/ (Bekker 1837) and data/categoriae-la/ (trans.
 * Boethius) and shares their division id / number / editorialTitle table
 * (scripts/import-aristotle-shared/chapters.ts) so all three line up 1:1 -
 * but unlike those two, this source DOES carry Bekker page/column/line
 * markers, so Division.ref is populated here (see below).
 *
 * Structural notes:
 *   - divisions are the chapters only (15 of them); there is no praefatio
 *     division - chapter 1 is the first thing after the wiki-transport
 *     scaffolding and the translator's preface (dropped as apparatus, not
 *     Aristotle's text).
 *   - divisions are one level deep: `children` is always [].
 *   - Division.ref is populated: "Bekker <start>–<end>", e.g. "Bekker
 *     1a1–1a15", reconstructed from this source's own inline page/column
 *     anchors (id="1a" etc.) and every-5th-line markers (id="5", "10", ...).
 *     A chapter's end is the Bekker position in effect where the next
 *     chapter begins (continuous numbering - chapters are adjoining, not
 *     gapped) and is precise only to the nearest printed marker, never to
 *     the exact word; see about.json's "Reference scheme" section.
 *   - Passage.ref is null throughout: the source does not mark a Bekker
 *     position at every paragraph break, only at the coarser points above,
 *     so no per-passage ref is fabricated. Passage.n is '' throughout (this
 *     source prints no paragraph numbers).
 *   - Division.sourceHeading is null throughout: this translation prints no
 *     Latin-style chapter rubric (unlike categoriae-la).
 *   - no <figure>/table content exists in this particular work (unlike its
 *     sibling data/de-interpretatione-en/), so Passage.figure is unused and
 *     Passage.anomaly is only ever set for the one genuine source
 *     irregularity recorded in anomalies.json (a duplicated Bekker line
 *     marker in chapter 7).
 */

export type Lang = 'en';

export interface PassageFigure {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  source: string;
  note?: string;
}

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc comment */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
  /** unused in this work (present only for structural parity with the shared Passage shape) */
  figure?: PassageFigure;
}

export interface Division {
  /** slug, 'ch-1'..'ch-15' */
  id: string;
  /** chapter number as an arabic string ('1'..'15') */
  number: string | null;
  /** "Bekker <start>–<end>" reconstructed from this source's own markers - see the module doc comment */
  ref: string | null;
  /** always null - this translation prints no chapter rubric */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text) - from the shared chapter table */
  editorialTitle: string | null;
  /** always [] (one level deep) */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'categoriae-en' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
