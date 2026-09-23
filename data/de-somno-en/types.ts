/**
 * Type definitions for the bundled English *On Sleep and Sleeplessness* (De somno et vigilia) corpus in
 *   data/de-somno-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-somno-en    (scripts/import-de-somno-en/index.ts)
 * and validated by
 *   npm run validate:de-somno-en  (scripts/import-de-somno-en/validate.ts)
 *
 * Source: English Wikisource, page "On Sleep and Sleeplessness" - John Isaac
 * Beare's translation, published in *The Works of Aristotle Translated into
 * English*, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908).
 * Public domain: published well before 1929.
 *
 * The page is ORDINARY WIKITEXT (27 KB of real prose), not a djvu page-scan
 * transclusion, and prints no Bekker page/column markers at all - so every
 * Division.ref here is null. Chapters are marked `==Part N==` and the count
 * matches the standard division exactly: 3 chapters, complete, untruncated.
 *
 * Flat single-book work: one tier of Chapters, parsed entirely independently
 * of any Greek edition of the same work in this library; the two are never
 * forced to divide chapters identically and any real mismatch is logged
 * rather than silently reconciled (see anomalies.json).
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID): Chapter = `ch-N`, 1-based plain arabic numerals (this work is a single book, so there is no Book tier).
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
  /** `ch-N` */
  id: string;
  /** arabic string ('1'..'N') */
  number: string | null;
  /** always null for this work - this digitisation prints no Bekker markers (see the module doc) */
  ref: string | null;
  /** always null - the source prints no chapter rubric of its own */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** always [] - this work has a single flat tier of Chapters */
  children: Division[];
  /** exactly [one Passage] per Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-somno-en' */
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
