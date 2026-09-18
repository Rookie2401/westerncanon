/**
 * Type definitions for the bundled English De Interpretatione corpus in
 *   data/de-interpretatione-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-deint-en  (scripts/import-aristotle-deint-en/index.ts)
 * and validated by
 *   npm run validate:aristotle-deint-en  (scripts/import-aristotle-deint-en/validate.ts)
 *
 * This is Aristotle's De Interpretatione ("On Interpretation") in Ella Mary
 * Edghill's 1928 Oxford translation (The Works of Aristotle, Vol. I, ed. W.
 * D. Ross), from English Wikisource's page-scan transclusion. It is the
 * English sibling of data/de-interpretatione-grc/ (Bekker 1837) and
 * data/de-interpretatione-la/ (trans. Boethius) and shares their division id
 * / number / editorialTitle table (scripts/import-aristotle-shared/
 * chapters.ts) so all three line up 1:1 - but unlike those two, this source
 * DOES carry Bekker page/column/line markers, so Division.ref is populated
 * here (see below).
 *
 * Structural notes:
 *   - divisions are the chapters only (14 of them); there is no praefatio
 *     division - chapter 1 is the first thing after the wiki-transport
 *     scaffolding and the translator's preface (dropped as apparatus, not
 *     Aristotle's text).
 *   - divisions are one level deep: `children` is always [].
 *   - Division.ref is populated: "Bekker <start>–<end>", e.g. "Bekker
 *     16a1–16a15", reconstructed from this source's own inline page/column
 *     anchors (id="16a" etc.) and every-5th-line markers (id="5", "10", ...).
 *     A chapter's end is the Bekker position in effect where the next
 *     chapter begins (continuous numbering - chapters are adjoining, not
 *     gapped) and is precise only to the nearest printed marker, never to
 *     the exact word; see about.json's "Reference scheme" section.
 *   - Passage.ref is null throughout: the source does not mark a Bekker
 *     position at every paragraph break, only at the coarser points above,
 *     so no per-passage ref is fabricated. Passage.n is '' throughout (this
 *     source prints no paragraph numbers).
 *   - Division.sourceHeading is null throughout: this translation prints no
 *     Latin-style chapter rubric (unlike de-interpretatione-la).
 *   - chapters 12 and 13 each contain one "square of opposition" table of
 *     contradictory/contrary modal propositions - genuine argument content,
 *     not apparatus - which this source prints as an HTML <table>. Passage.text
 *     has no table field, so each table is flattened to one Passage of
 *     plain text (cells joined " — ", rows joined " / ", nothing reordered
 *     or reworded) and flagged via Passage.anomaly; see anomalies.json.
 *   - chapter 10 contains three scanned-page diagrams (the "indefinite name"
 *     schemas) with no transcribed text in the source; each is recorded as
 *     an honest `Passage.figure` marker (no `image`, only `source`+`note`)
 *     on the passage immediately preceding it, per the shared PassageFigure
 *     convention (src/library/types.ts) - never fabricated as an image.
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
  /** verbatim English paragraph (or, for the two table passages in chapters 12-13, a flattened rendering of the source table - see the module doc comment), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc comment */
  ref: string | null;
  /** optional note when something irregular was preserved, or when this passage's text is a flattened table */
  anomaly?: string;
  /** set on the passage immediately before each of chapter 10's three scanned diagrams; unset elsewhere */
  figure?: PassageFigure;
}

export interface Division {
  /** slug, 'ch-1'..'ch-14' */
  id: string;
  /** chapter number as an arabic string ('1'..'14') */
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
  /** 'de-interpretatione-en' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
