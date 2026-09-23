/**
 * Type definitions for the bundled English Rhetoric corpus in
 *   data/rhetoric-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:rhetoric-en  (scripts/import-rhetoric-en/index.ts)
 * and validated by
 *   npm run validate:rhetoric-en  (scripts/import-rhetoric-en/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0086.tlg038.perseus-eng2 - John Henry Freese, trans.,
 * "The 'Art' of Rhetoric" (London: William Heinemann, Ltd.; Cambridge, MA:
 * Harvard University Press, 1926 printing; 1947 reprint), per this work's
 * own __cts__.xml <ti:translation> record.
 *
 * Two-level tree, Book -> Chapter, independently parsed from the Greek
 * sibling data/rhetoric-grc/ (when present) - the two editions are NOT
 * forced to divide chapters identically; any real mismatch is logged
 * rather than silently reconciled (see anomalies.json). A Book division has
 * children (its Chapters) and no passages of its own; a Chapter division
 * has one or more passages and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals,
 * matching the source's own `subtype="chapter"` numbering.
 *
 * Structural note specific to this source: unlike Nicomachean Ethics'
 * English witness (which nests an unlabelled `subtype="subsection"` div
 * between chapter and paragraph), this Rhetoric TEI labels that same extra
 * nesting level explicitly `<div type="textpart" subtype="section" n="K">`
 * - Freese's own Bekker-line-keyed sub-numbering (e.g. "1.1.1"). It carries
 * no information this schema needs (Division has no room for a third tier
 * here, and Passage has no field for it), so the importer reads straight
 * through it exactly as the Nicomachean Ethics importer does: every `<p>`
 * found anywhere under a chapter div, regardless of how many section divs
 * it is nested inside, becomes one paragraph of that chapter's single
 * Passage, in document order.
 *
 * Division.ref (Chapter only) is the Bekker page range covered by that
 * chapter's text, e.g. "1354a–1355a" (or a single page/column token when
 * the whole chapter falls on one page), reconstructed from this source's
 * own inline `<milestone unit="page" resp="Bekker" n="…"/>` markers in
 * document order. Book Division.ref is always null.
 *
 * Each Chapter carries exactly ONE Passage: every <p> found under that
 * chapter div (at any section nesting depth), in document order, joined
 * with "\n\n" when there is more than one. Passage.n is '' throughout
 * (Freese's own paragraph sub-numbering is not preserved - see the
 * structural note above); Passage.ref is always null (no per-paragraph
 * Bekker marker is printed, only per-page - see Division.ref above).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - Freese's own section sub-numbering is not preserved (see the module doc) */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc for why per-passage Bekker refs are not fabricated */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'3' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** Chapter only: Bekker page range, e.g. "1354a–1355a"; null for a Book */
  ref: string | null;
  /** always null - the source prints no chapter rubric of its own */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'rhetoric-en' */
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
