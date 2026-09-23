/**
 * Type definitions for the bundled English *Eudemian Ethics* (Ethica Eudemia) corpus in
 *   data/eudemian-ethics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:eudemian-ethics-en    (scripts/import-eudemian-ethics-en/index.ts)
 * and validated by
 *   npm run validate:eudemian-ethics-en  (scripts/import-eudemian-ethics-en/validate.ts)
 *
 * Source: English Wikisource, "Eudemian Ethics/Book 1", "/Book 2", "/Book 3"
 * and "/Book 7" - Joseph Solomon's translation for *The Works of Aristotle
 * Translated into English*, Volume IX, ed. W. D. Ross (Oxford: Clarendon
 * Press). Public domain: published well before 1929.
 *
 * IMPORTANT - BOOKS IV, V AND VI ARE ABSENT BY DESIGN, AND NOTHING WAS
 * FABRICATED TO REPLACE THEM. In the Greek tradition those three are the
 * "common books", identical with Nicomachean Ethics V, VI and VII, so Solomon
 * never re-translated them. Confirmed three ways: the Wikisource parent page
 * says so in its header notes; its contents list prints "Books IV, V, VI =
 * Nicomachean Ethics Books V, VI, VII" where those links would be; and an API
 * existence check for /Book 4, /Book 5 and /Book 6 returns `missing` for all
 * three. They were explicitly NOT copied from data/nicomachean-ethics-en,
 * which is a different translator's words from a different edition. The book
 * numbering here is therefore the source's own: 1, 2, 3, 7.
 *
 * Book VIII is also absent as a separate book, for a different reason: its
 * material is appended to Book VII as sections 13-15, following one manuscript
 * tradition, so it is present inside book-7.
 *
 * These four subpages ARE djvu page-scan transclusions (263-525 bytes of
 * `<pages index=.../>` wikitext apiece), so the RENDERED HTML was fetched and
 * parsed. All four are fully proofread - ZERO red links - so nothing is
 * truncated. Unlike most of this English batch, the source DOES print Bekker
 * page markers throughout, so Division.ref carries real page ranges.
 *
 * Two chapter numbers the source itself never prints (Book II skips 6, Book
 * III skips 2) are left as gaps rather than closed by renumbering; no text is
 * missing at those points, only the printed figure.
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
  /** arabic string ('1'..'7' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** Chapter only: Bekker page range printed by the source, e.g. "1216a-1216b"; null for a Book */
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
  /** 'eudemian-ethics-en' */
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
