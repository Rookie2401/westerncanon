/**
 * Type definitions for the bundled Euclid *Elements* corpus in
 * `data/euclid-elements/`.
 *
 * Generated (do not hand-edit) by
 *   npm run import:euclid      (scripts/import-euclid/index.ts)
 * and validated by
 *   npm run validate:euclid    (scripts/import-euclid-shared/validate.ts)
 *
 * Unlike the Isagoge / Aristotle generic works (one level deep: work ->
 * division), the Elements is a 3-level tree: work -> Book -> section-type
 * group (Definitions / Postulates / Common Notions / Propositions, or the six
 * Book X sub-groups) -> individual definition/postulate/common-notion/
 * proposition. This mirrors src/library/types.ts's `Division.children` /
 * `PassageFigure` shapes exactly (see that file for the authoritative
 * shared contract); this file exists only so the importer/validator have a
 * local, dependency-free mirror to import, per this repo's per-work
 * `data/<workId>/types.ts` convention.
 */

export type Lang = 'la' | 'grc';

/**
 * A diagram marker bundled alongside a passage. Every `<figure/>` in the
 * source TEI is real structural information (498 total) but points only to a
 * dead image host, so `image`/`alt` are always omitted here and `note` always
 * carries the honest "not yet available" sentence; `source` names the exact
 * Heiberg book/proposition citation (e.g. "Heiberg, Elements I.47").
 */
export interface PassageFigure {
  image?: string;
  alt?: string;
  source: string;
  note?: string;
}

export interface Passage {
  /** always '' for this work: the source carries no printed paragraph numbers below the proposition level */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces; <del> content excluded, <num>/<add> unwrapped */
  text: string;
  /** always null: this TEI carries no <pb>/milestone page markers */
  ref: string | null;
  /** optional note when something irregular was preserved or excluded (e.g. an <add> supplement, or a <del> exclusion) */
  anomaly?: string;
  figure?: PassageFigure;
}

export interface Division {
  id: string;
  /** roman numeral 'I'..'XIII' for a Book; null for a section-type group; the printed arabic number (as a string) for a leaf */
  number: string | null;
  /** always null for this work (no page/line markers in the source) */
  ref: string | null;
  /** always null for this work (no source-language heading text exists at Book/group/leaf level) */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text): the Book title or the section-type group label; null for leaves */
  editorialTitle: string | null;
  /** Book -> children are section-type groups; group -> children are leaves; leaf -> [] */
  children: Division[];
  /** [] for a Book or a section-type group (containers carry no passages of their own); 1+ for a leaf */
  passages: Passage[];
}

export interface GenericWork {
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
