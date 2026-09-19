/**
 * Type definitions for the bundled English Nicomachean Ethics corpus in
 *   data/nicomachean-ethics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-nicomachean-ethics-en  (scripts/import-aristotle-nicomachean-ethics-en/index.ts)
 * and validated by
 *   npm run validate:aristotle-nicomachean-ethics-en  (scripts/import-aristotle-nicomachean-ethics-en/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0086.tlg010.perseus-eng2 - Harris Rackham, trans.,
 * "The Nicomachean Ethics" (London: William Heinemann; New York: G. P.
 * Putnam's Sons, 1926 Loeb Classical Library printing).
 *
 * Two-level tree, Book -> Chapter, independently parsed from the Greek
 * sibling data/nicomachean-ethics-grc/ - the two editions are NOT forced to
 * divide chapters identically; any real mismatch is logged rather than
 * silently reconciled (see anomalies.json). A Book division has children
 * (its Chapters) and no passages of its own; a Chapter division has one or
 * more passages and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals,
 * matching the source's own `subtype="section"` numbering (treated as
 * "Chapter" here per this app's existing Aristotle-Bekker convention).
 *
 * Structural note specific to this English witness: unlike the Greek TEI
 * (which nests `<p>` paragraphs directly under each chapter div), this
 * source inserts an extra `subtype="subsection"` div between chapter and
 * paragraph - Rackham's own Bekker-line-keyed sub-numbering (e.g. "1.1.1").
 * That extra level carries no information this schema needs (Division has
 * no room for a third tier here, and Passage has no field for it), so the
 * importer reads straight through it: every `<p>` found anywhere under a
 * chapter div, regardless of how many subsection divs it is nested inside,
 * becomes one ordinary Passage of that chapter, in document order.
 *
 * Division.ref (Chapter only) is the Bekker page range covered by that
 * chapter's text, e.g. "1094a–1095a" (or a single page/column token when
 * the whole chapter falls on one page), reconstructed from this source's
 * own inline `<milestone unit="page" resp="Bekker" n="…"/>` markers in
 * document order. Book Division.ref is always null.
 *
 * Each Chapter carries exactly ONE Passage: every <p> found under that
 * chapter div (at any subsection nesting depth), in document order, joined
 * with "\n\n" when there is more than one. Passage.n is '' throughout
 * (Rackham's own paragraph sub-numbering is not preserved - see the
 * structural note above); Passage.ref is always null (no per-paragraph
 * Bekker marker is printed, only per-page - see Division.ref above).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - Rackham's own subsection numbering is not preserved (see the module doc) */
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
  /** arabic string ('1'..'10' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** Chapter only: Bekker page range, e.g. "1094a–1095a"; null for a Book */
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
  /** 'nicomachean-ethics-en' */
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
