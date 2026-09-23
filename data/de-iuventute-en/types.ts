/**
 * Type definitions for the bundled English *On Youth and Old Age, On Life and Death* (De juventute et senectute, De vita et morte) corpus in
 *   data/de-iuventute-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-iuventute-en    (scripts/import-de-iuventute-en/index.ts)
 * and validated by
 *   npm run validate:de-iuventute-en  (scripts/import-de-iuventute-en/validate.ts)
 *
 * Source: English Wikisource, pages "On Youth and Old Age" (Parts 1-6) and
 * "On Life and Death" (Parts 23-27) - G. R. T. Ross's translation, published
 * in *The Works of Aristotle Translated into English*, Volume III: Parva
 * Naturalia (Oxford: Clarendon Press, 1908). Public domain: published well
 * before 1929.
 *
 * HOW THE SOURCE DIVIDES THIS MATERIAL, and why the chapter numbers jump.
 * This import's brief anticipated that Wikisource might bundle Youth/Old Age,
 * Life/Death and On Breathing onto ONE continuous page needing a split at the
 * source's own treatise boundary. It does not. The source keeps them on THREE
 * separate pages - "On Youth and Old Age", "On Breathing" and "On Life and
 * Death" - but numbers their chapters as ONE continuous run of Parts 1-27,
 * and says so in its own header notes ("Parts are numbered in the context of
 * their part in the entire..."). The run divides:
 *     Parts 1-6    On Youth and Old Age      -> this edition
 *     Parts 7-22   On Breathing              -> data/de-respiratione-en
 *     Parts 23-27  On Life and Death         -> this edition
 * So no split had to be performed: the source had already separated the
 * treatises, and this edition simply takes the two pages its title names.
 * The consequence is a REAL, DELIBERATE GAP in the chapter numbering here -
 * it runs 1, 2, 3, 4, 5, 6, then 23, 24, 25, 26, 27. Those numbers are the
 * source's own, and renumbering them 1-11 would silently break every citation
 * and hide the relationship to On Breathing, so they are preserved exactly.
 * Chapters 7-22 are not missing: they are a different treatise, complete, in
 * data/de-respiratione-en.
 *
 * Both pages are ORDINARY WIKITEXT, not djvu page-scan transclusions, and
 * print no Bekker page/column markers - so every Division.ref here is null.
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
  /** 'de-iuventute-en' */
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
