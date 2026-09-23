/**
 * Type definitions for the bundled English Herodotus Histories corpus in
 *   data/herodotus-histories-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:herodotus-histories-en  (scripts/import-herodotus-histories-en/index.ts)
 * and validated by
 *   npm run validate:herodotus-histories-en  (scripts/import-herodotus-histories-en/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0016.tlg001.perseus-eng2 - "The Histories", A. D.
 * Godley's English translation ("Modernized by Perseus"), from the same Loeb
 * Classical Library edition as the Greek sibling: A. D. Godley, Herodotus, 4
 * vols. (Cambridge, MA: Harvard University Press; London: William Heinemann
 * Ltd., 1920-1925).
 *
 * Same three-level source (Book -> Chapter -> Section -> <p>) collapsed to
 * Book -> Chapter as the Greek sibling (data/herodotus-histories-grc) -
 * parsed completely independently, but confirmed by direct inspection to
 * agree with it exactly, book for book and chapter for chapter, including
 * the same 45 single-letter-suffixed chapter numbers (e.g. "121A".."121F").
 *
 * Id scheme, Division.ref/Passage.ref (always null), and sourceHeading
 * (always null) all match the Greek sibling's own conventions exactly - see
 * data/herodotus-histories-grc/types.ts for the full explanation of the
 * letter-suffix chapter numbering.
 *
 * Passage.anomaly is unused (left unset) throughout this English edition: it
 * carries no <del>/<gap>/<choice> apparatus of its own (confirmed by direct
 * inspection - this witness has none of the Greek sibling's editorial
 * apparatus at all, only translator's footnotes, which are dropped
 * entirely rather than flagged inline).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English paragraph (Godley's translation), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme distinct from Book/Chapter */
  ref: string | null;
  /** unused in this edition - see module doc */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book (N = 1-9), `book-N-ch-M` for a Chapter (M is this edition's own chapter number, verbatim, incl. the rare single-letter suffix - matches the Greek sibling exactly) */
  id: string;
  /** arabic string ('1'..'9' for a Book; the edition's own chapter number string for a Chapter, e.g. '1', '121A') */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme beyond Book/Chapter */
  ref: string | null;
  /** always null - this source has no Book-level <head> rubric */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'herodotus-histories-en' */
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
