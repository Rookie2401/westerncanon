/**
 * Type definitions for the bundled English *On Dreams* (De insomniis) corpus in
 *   data/de-insomniis-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-insomniis-en    (scripts/import-de-insomniis-en/index.ts)
 * and validated by
 *   npm run validate:de-insomniis-en  (scripts/import-de-insomniis-en/validate.ts)
 *
 * Source: English Wikisource, page "On Dreams (Aristotle)" - John Isaac
 * Beare's translation, published in *The Works of Aristotle Translated into
 * English*, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908).
 * Public domain: published well before 1929.
 *
 * MIND THE TITLE. The undisambiguated Wikisource page "On Dreams" is NOT this
 * work: it is Sir Thomas Browne's essay of the same name (its own {{header}}
 * names Browne as author and Simon Wilkin's 1835-36 Collected Works as the
 * source). Aristotle's De insomniis lives at "On Dreams (Aristotle)". The
 * wrong page was identified and rejected during this import rather than
 * silently ingested as Aristotle; see anomalies.json.
 *
 * The correct page is ORDINARY WIKITEXT (24 KB of real prose), not a djvu
 * page-scan transclusion, and prints no Bekker page/column markers - so every
 * Division.ref here is null. It marks chapters with a bare "Part N" text line
 * (no `=` markup), and carries all 3 chapters of the standard division.
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
  /** 'de-insomniis-en' */
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
