/**
 * Type definitions for the bundled English *On Breathing* (De respiratione) corpus in
 *   data/de-respiratione-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-respiratione-en    (scripts/import-de-respiratione-en/index.ts)
 * and validated by
 *   npm run validate:de-respiratione-en  (scripts/import-de-respiratione-en/validate.ts)
 *
 * Source: English Wikisource, page "On Breathing" (Parts 7-22) - G. R. T.
 * Ross's translation, published in *The Works of Aristotle Translated into
 * English*, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908).
 * Public domain: published well before 1929.
 *
 * WHY THE CHAPTERS START AT 7. They are the source's own numbers. In the
 * Oxford volume, On Youth and Old Age, On Breathing and On Life and Death
 * share one continuous run of Parts 1-27, and English Wikisource preserves
 * that while keeping the three treatises on separate pages, each header
 * noting that "Parts are numbered in the context of their part in the entire"
 * treatise:
 *     Parts 1-6    On Youth and Old Age      -> data/de-iuventute-en
 *     Parts 7-22   On Breathing              -> THIS edition
 *     Parts 23-27  On Life and Death         -> data/de-iuventute-en
 * Renumbering 7-22 as 1-16 here would silently break every citation and hide
 * the relationship to its companion edition, so the numbering is preserved
 * exactly as printed. Nothing is missing before chapter 7.
 *
 * The page is ORDINARY WIKITEXT (37 KB of real prose), not a djvu page-scan
 * transclusion, and prints no Bekker page/column markers - so every
 * Division.ref here is null. It carries a `{{ppoem}}` block quoting
 * Empedocles' verses on respiration: that is a quotation inside Aristotle's
 * own text, translated, and so is genuine reading matter rather than
 * apparatus - it is kept, with only the template's formatting directives
 * stripped.
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
  /** 'de-respiratione-en' */
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
