/**
 * Type definitions for the bundled English *On Sense and the Sensible* (De sensu et sensibilibus) corpus in
 *   data/de-sensu-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-sensu-en    (scripts/import-de-sensu-en/index.ts)
 * and validated by
 *   npm run validate:de-sensu-en  (scripts/import-de-sensu-en/validate.ts)
 *
 * Source: English Wikisource, "On Sense and the Sensible/Section I" and
 * "/Section II" - John Isaac Beare's translation, published in *The Works of
 * Aristotle Translated into English*, Volume III: Parva Naturalia (Oxford:
 * Clarendon Press, 1908). Public domain: published well before 1929.
 *
 * THE PARENT PAGE IS A STUB, and that matters: "On Sense and the Sensible"
 * itself holds only 451 bytes - a {{header}} and two links - with no treatise
 * text at all. The text lives entirely on the two "Section" subpages, which
 * between them carry the whole of the standard seven-chapter division:
 * Section I heads Parts 1-4, Section II Parts 5-7. They are imported as ONE
 * flat run of chapters 1-7 (the source's own numbering, continuous across the
 * two pages), because the "Sections" are an artefact of how Wikisource split
 * the page, not a division Aristotle or Beare made.
 *
 * The two subpages are ORDINARY WIKITEXT (36 KB and 42 KB of real prose), not
 * djvu page-scan transclusions, and print no Bekker page/column markers at
 * all - so every Division.ref here is null.
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
  /** 'de-sensu-en' */
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
