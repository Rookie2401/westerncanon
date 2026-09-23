/**
 * Type definitions for the bundled English *History of Animals* (Historia animalium) corpus in
 *   data/historia-animalium-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:historia-animalium-en    (scripts/import-historia-animalium-en/index.ts)
 * and validated by
 *   npm run validate:historia-animalium-en  (scripts/import-historia-animalium-en/validate.ts)
 *
 * Source: English Wikisource, "History of Animals (Thompson)/Book I".."/Book
 * IX" - D'Arcy Wentworth Thompson's translation, published as *The Works of
 * Aristotle Translated into English*, Volume IV, ed. J. A. Smith and W. D.
 * Ross (Oxford: Clarendon Press, 1910). Public domain: published well before
 * 1929.
 *
 * NINE BOOKS, NOT TEN - confirmed, not assumed. The Greek tradition transmits
 * a tenth book of the Historia animalium, but it is widely judged spurious and
 * Thompson did not translate it; a direct existence check of
 * "History of Animals (Thompson)/Book X" against the Wikisource API returns
 * `missing` (no page at all, not even a red-link stub), and the work's own
 * contents page lists Books I-IX only. Nothing is fabricated to supply a tenth
 * book; see anomalies.json.
 *
 * IMPORTANT PROVENANCE NOTE, verified page by page: these nine subpages are
 * ORDINARY WIKITEXT (36-102 KB of real prose each), NOT djvu page-scan
 * transclusions, and they print no Bekker page/column markers at all - so
 * every Division.ref here is null. Books I, III, V and VI head their chapters
 * with `==Part N==` wiki headings; Books II, IV, VII, VIII and IX use a bare
 * "Part N" text line with no wiki markup at all, which a heading-only parser
 * would silently read as zero chapters. Both shapes are handled.
 *
 * IMPORTANT: BOOKS VIII AND IX ARE INCOMPLETE. Books I-VII are whole against
 * the standard division (17, 17, 22, 11, 34, 37, 12 chapters). Book VIII's
 * transcription stops mid-sentence after 21 of its standard 30 chapters, and
 * Book IX's after 39 of its standard 50 - 210 chapters in all. Surviving words
 * are verbatim; each cut chapter carries its own Passage.anomaly, and nothing
 * is completed, guessed at, or supplied from another translation.
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
  /** arabic string ('1'..'9' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** always null for this work - this digitisation prints no Bekker markers (see the module doc) */
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
  /** 'historia-animalium-en' */
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
