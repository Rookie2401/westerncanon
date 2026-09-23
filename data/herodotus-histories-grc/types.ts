/**
 * Type definitions for the bundled Greek Herodotus Histories corpus in
 *   data/herodotus-histories-grc/
 *
 * Generated (do not hand-edit) by
 *   npm run import:herodotus-histories-grc  (scripts/import-herodotus-histories-grc/index.ts)
 * and validated by
 *   npm run validate:herodotus-histories-grc  (scripts/import-herodotus-histories-grc/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0016.tlg001.perseus-grc2 - Herodotus, Ἱστορίαι
 * ("Histories"), ed. A. D. Godley, Herodotus, 4 vols. (Cambridge, MA: Harvard
 * University Press; London: William Heinemann Ltd., 1920-1925), Loeb
 * Classical Library.
 *
 * Three-level source (Book -> Chapter -> Section -> <p>) collapsed to the
 * same two-level Book -> Chapter GenericWork shape used throughout this app
 * (e.g. data/de-bello-gallico-la, data/meditations-grc): a Book division has
 * children (its Chapters) and no passages of its own; a Chapter division has
 * exactly one passage (every <p> found anywhere under it, at any section
 * depth, joined with "\n\n") and no children. Perseus/Godley's own "section"
 * level carries no citation information this schema needs (this edition's
 * citation unit is Book.Chapter, not Book.Chapter.Section) and is not
 * preserved.
 *
 * Id scheme: Book = `book-N` (N = 1-9), Chapter = `book-N-ch-M` where M is
 * this edition's OWN printed chapter number, taken verbatim - almost always
 * a plain 1-based integer, but 45 chapters across the work carry a single
 * uppercase-letter suffix (e.g. "121A".."121F" in Book 2, "7A"/"7B" in Book
 * 9) - a genuine feature of this edition's own numbering (later chapters
 * were subdivided by the editorial tradition without renumbering everything
 * that follows), confirmed identical in the English sibling
 * (data/herodotus-histories-en) and preserved verbatim rather than forced
 * into a synthetic contiguous integer sequence. See about.json for the full
 * disclosure and anomalies.json for the exact list.
 *
 * Division.ref and Passage.ref are always null: this source carries no
 * page-marker or milestone citation scheme distinct from its own Book/
 * Chapter numbering. Division.sourceHeading is always null: this source has
 * no <head> rubric at Book level (confirmed by direct inspection - 0 <head>
 * elements in the whole file).
 *
 * Passage.anomaly is set on a Chapter's single Passage when that chapter's
 * text preserves something irregular: a <del> span (this edition's own
 * apparatus bracketing text as a probable interpolation) - KEPT in the
 * reading text, wrapped in square brackets `[...]`, per this app's
 * corpus-wide policy for editor-bracketed text (applied uniformly across
 * Herodotus, Thucydides, the Greek drama corpus and Xenophon) - a <gap
 * reason="ellipsis"/> (no literal text fabricated), or a <choice><sic>/
 * <corr></choice> pair (the <corr> reading is kept, the <sic> logged).
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme distinct from Book/Chapter */
  ref: string | null;
  /** optional note when something irregular was preserved in this chapter (a <del> span kept bracketed in square brackets, a <gap/>, or a sic/corr choice) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book (N = 1-9), `book-N-ch-M` for a Chapter (M is this edition's own chapter number, verbatim, incl. the rare single-letter suffix) */
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
  /** 'herodotus-histories-grc' */
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
