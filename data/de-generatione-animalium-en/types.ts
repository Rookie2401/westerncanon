/**
 * Type definitions for the bundled English *On the Generation of Animals* (De generatione animalium) corpus in
 *   data/de-generatione-animalium-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-generatione-animalium-en    (scripts/import-de-generatione-animalium-en/index.ts)
 * and validated by
 *   npm run validate:de-generatione-animalium-en  (scripts/import-de-generatione-animalium-en/validate.ts)
 *
 * Source: English Wikisource, "On the Generation of Animals/Book I".."/Book V"
 * - Arthur Platt's translation, published as part of *The Works of Aristotle
 * Translated into English*, ed. J. A. Smith and W. D. Ross, Volume V (Oxford:
 * Clarendon Press, 1912). Public domain: published well before 1929.
 *
 * IMPORTANT PROVENANCE NOTE, verified page by page rather than assumed: these
 * five subpages are ORDINARY WIKITEXT (54-91 KB of real prose each), NOT djvu
 * page-scan transclusions like data/metaphysics-en. They therefore carry no
 * page-scan markup and no Bekker page/column markers at all, so every
 * Division.ref here is null - a real property of this digitisation, not a
 * parser gap.
 *
 * The five pages do not all mark chapters the same way, which is why the
 * importer handles several marker shapes in one pass: Book I heads its
 * chapters with `==Part N==` wiki headings, while Books II-V use a bare line
 * containing only the chapter number, preceded by a "Book N" running-title
 * line that is page furniture and is skipped. Chapter counts match the
 * standard division exactly (I 23, II 8, III 11, IV 10, V 8).
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
  /** arabic string ('1'..'5' for a Book, '1'..'N' for a Chapter) */
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
  /** 'de-generatione-animalium-en' */
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
