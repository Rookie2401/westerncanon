/**
 * Type definitions for the bundled English *Virtues and Vices* (De virtutibus et vitiis) corpus in
 *   data/virtues-and-vices-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:virtues-and-vices-en    (scripts/import-virtues-and-vices-en/index.ts)
 * and validated by
 *   npm run validate:virtues-and-vices-en  (scripts/import-virtues-and-vices-en/validate.ts)
 *
 * Source: English Wikisource, page "Virtues and Vices" - Joseph Solomon's
 * translation for *The Works of Aristotle Translated into English*, Volume IX,
 * ed. W. D. Ross (Oxford: Clarendon Press). Public domain: published well
 * before 1929.
 *
 * PSEUDO-ARISTOTLE. This short tract is of uncertain date and authorship and
 * is not now regarded as Aristotle's own; the Wikisource page's own header
 * calls it "a short Aristotelian tract of uncertain date and authorship". It
 * is bundled here under Aristotle's name because that is how the Oxford
 * edition transmits it - Solomon's translation was appended to his Eudemian
 * Ethics - with the doubt recorded in about.json rather than hidden.
 *
 * The page IS a djvu page-scan transclusion (558 bytes of `<pages index=.../>`
 * wikitext), so the RENDERED HTML was fetched and parsed. It is fully
 * proofread - ZERO red links - so nothing is truncated, and it DOES print
 * Bekker page markers, so Division.ref carries real page ranges.
 *
 * The source's own chapter marking skips the number 6 (it prints 1, 2, 3, 4,
 * 5, 7, 8): the text runs straight on at that point and only the printed
 * figure is absent. The gap is preserved rather than closed by renumbering.
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
  /** Chapter only: Bekker page range printed by the source, e.g. "1249a-1250a" */
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
  /** 'virtues-and-vices-en' */
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
