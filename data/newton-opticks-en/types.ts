/**
 * Generated (do not hand-edit) by scripts/import-newton/index.ts for newton-opticks-en.
 * Structural types shared by both Newton works imported by this batch
 * (newton-principia-la, newton-principia-en, newton-opticks-en). Mirrors
 * src/library/types.ts's Division/Passage/PassageFigure shapes exactly (see
 * data/euclid-elements/types.ts for the precedent this follows); this file
 * is the importer's own working copy, and a byte-identical copy is written
 * to each data/<workId>/types.ts as this app's per-work convention requires.
 */

export type Lang = 'la' | 'en';

/**
 * A diagram marker bundled alongside a passage. Every source page-scan in
 * this batch DOES carry a real, high-resolution scanned image for each
 * figure (unlike e.g. this library's Euclid import, whose figure host is
 * dead) - but per this batch's brief, diagrams are deferred to a later
 * phase uniformly: `image`/`alt` are always omitted here and `note` always
 * carries the honest "not yet available" sentence; `source` names the
 * edition/book/item citation (e.g. "Principia (1687) I.47").
 */
export interface PassageFigure {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  source: string;
  note?: string;
}

export interface Passage {
  /** '' throughout: neither source prints a paragraph-level citation number below the item level */
  n: string;
  /** verbatim reading text (see about.json for the printed-notation convention used for superscripts/fractions) */
  text: string;
  /** always null: neither source carries a page/line milestone scheme finer than Book/Section/item */
  ref: string | null;
  /** optional note when something irregular was preserved (a numbering gap, a supplemented/quoted passage, a diagram marker, ...) */
  anomaly?: string;
  figure?: PassageFigure;
}

export interface Division {
  id: string;
  /** the printed number (roman as printed, or arabic for Opticks) as a string; null for a container with no number of its own */
  number: string | null;
  /** always null: neither source carries a finer page/line reference scheme */
  ref: string | null;
  /** the item's own printed heading/rubric, verbatim (e.g. "Prop. IV. Theor. IV.", "SECT. II. ..."); null where the source prints none */
  sourceHeading: string | null;
  /** always null: no editorial titles are invented anywhere in this corpus */
  editorialTitle: string | null;
  children: Division[];
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

export interface Anomaly {
  where: string;
  note: string;
}
