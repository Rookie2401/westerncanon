/**
 * Type definitions for the bundled English *Prior Analytics* (Analytica Priora) corpus in
 *   data/prior-analytics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:prior-analytics-en    (scripts/import-prior-analytics-en/index.ts)
 * and validated by
 *   npm run validate:prior-analytics-en  (scripts/import-prior-analytics-en/validate.ts)
 *
 * Source: English Wikisource, "The Works of Aristotle/Prior Analytics/Book I"
 * and "/Book II" - A. J. Jenkinson's translation for *The Works of Aristotle
 * Translated into English*, Volume I, ed. W. D. Ross (Oxford: Clarendon Press,
 * 1928). Public domain: published before 1929.
 *
 * WHERE THIS LIVES ON WIKISOURCE, established by search rather than guessed:
 * the bare title "Prior Analytics" is a translations-disambiguation page
 * listing two versions, and the Jenkinson one sits under the same
 * "The Works of Aristotle/..." base page that this library's Categories import
 * already uses. Its book subpages are "The Works of Aristotle/Prior Analytics/
 * Book I" and "/Book II". A standalone "Prior Analytics/Book I" does NOT exist.
 *
 * CONTENT-VERIFIED: both subpages carry real proofread prose (184 KB and 122 KB
 * of visible text), with 46 chapters in Book I and 27 in Book II - the full
 * standard division, untruncated.
 *
 * These subpages ARE djvu page-scan transclusions (~970 bytes of
 * `<pages index=.../>` wikitext apiece), so the RENDERED HTML was fetched and
 * parsed. Chapters are marked by a `span.wst-anchor#Chapter_N` anchor, and the
 * source prints Bekker page markers in `span.wst-bekker` elements, so
 * Division.ref carries real page ranges (this work begins at Bekker 24a, which
 * is why the page tokens here are two digits plus a column letter).
 *
 * Two-level tree, Book -> Chapter, parsed entirely independently
 * of any Greek edition of the same work in this library; the two are never
 * forced to divide chapters identically and any real mismatch is logged
 * rather than silently reconciled (see anomalies.json).
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID): Book = `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals.
 *
 * Each Chapter carries exactly ONE Passage: every paragraph the source prints
 * under that chapter marker, in document order, joined with "\n\n".
 * Passage.n is '' throughout (the source numbers nothing below chapter level)
 * and Passage.ref is always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source numbers nothing below chapter level */
  n: string;
  /** verbatim English text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - the source prints no per-paragraph reference */
  ref: string | null;
  /** set only where the source's own transcription is defective at that point */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'2' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** Chapter only: Bekker page range printed by the source, e.g. "26a-26b"; null for a Book */
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
  /** 'prior-analytics-en' */
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
