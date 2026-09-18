/**
 * Type definitions for the bundled English Euclid *Elements* corpus in
 * `data/euclid-elements-en/`.
 *
 * Generated (do not hand-edit) by
 *   npm run import:euclid-en      (scripts/import-euclid-en/index.ts)
 * and validated by
 *   npm run validate:euclid-en    (scripts/import-euclid-en/validate.ts)
 *
 * Thomas L. Heath's 1908 English translation, "The Thirteen Books of
 * Euclid's Elements" (Cambridge University Press), translated from Heiberg's
 * Greek text - the same edition the bundled Greek corpus (data/euclid-
 * elements/) is based on, so this file mirrors that one's shape EXACTLY
 * (same 3-level work -> Book -> section-type group -> individual
 * definition/postulate/common-notion/proposition tree, same Division id/
 * citation scheme - see scripts/import-euclid-shared/structure.ts's
 * TYPE_META/BOOK_TITLES, reused verbatim by both importers) with one
 * deliberate difference: this edition is TEXT-ONLY. It reuses none of the
 * Greek edition's hand-sourced diagram images, so `Passage` here has no
 * `figure`/`PassageFigure` field at all (unlike data/euclid-elements/
 * types.ts) - every `<figure>` marker in the source is simply logged to
 * anomalies.json and dropped, never a fabricated image, never a silent one
 * either. See the About page for the exact figure-marker count.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' for this work: the source carries no printed paragraph numbers below the proposition level */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces; <note> commentary excluded, inline formatting/citation tags unwrapped */
  text: string;
  /** always null: this source's page-break milestones land mid-sentence as often as at paragraph boundaries, so none is used as a citation anchor - see about.json */
  ref: string | null;
  /** optional note when something irregular was preserved or excluded (e.g. a mismatched printed heading, a split-bracket aside) */
  anomaly?: string;
}

export interface Division {
  id: string;
  /** roman numeral 'I'..'XIII' for a Book; null for a section-type group; the printed arabic number (as a string) for a leaf */
  number: string | null;
  /** always null for this work (no page/line markers used as a ref - see Passage.ref) */
  ref: string | null;
  /** verbatim printed heading (e.g. "Proposition 1." / "PROPOSITION 19.") for a proposition leaf; null for def/post/common-notion leaves (redundant with number) and for Book/group containers */
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
