/**
 * Structural mirror of the app's real generic-work content types in
 * `src/library/types.ts` (Passage/Division/GenericWork/WorkAbout*, including
 * `PassageFigure`), used internally by the Ptolemy importer. Not one of the
 * per-work `data/<workId>/types.ts` outputs - those are generated
 * byte-identical copies (see typesTemplate.ts), exactly like every other
 * importer's pattern in this repo.
 */

export type Lang = 'grc' | 'en';

/** Mirrors src/library/types.ts's PassageFigure exactly. */
export interface PassageFigure {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  source: string;
  note?: string;
}

export interface Passage {
  /** printed section/chapter-internal locator, '' when the chapter has none of its own */
  n: string;
  /** verbatim reading text: paragraphs joined by a blank line ("\n\n") - see module docs */
  text: string;
  /** always null in this corpus (citation is Book/Chapter only - see about.json) */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
  /** present iff a <figure> marker fell inside this passage's source span - see aboutText.ts */
  figure?: PassageFigure;
}

export interface Division {
  /** `book-N` or `book-N-ch-M` (M may be a non-numeric source label, e.g. "toc") */
  id: string;
  /** the division's own printed number/label, or null only for a pure container */
  number: string | null;
  /** always null in this corpus (see Passage.ref) */
  ref: string | null;
  /** verbatim running header text captured from the source, or null */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for any division in this corpus */
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
