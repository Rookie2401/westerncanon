/**
 * Type definitions for the bundled English *On the Motion of Animals* (De motu animalium) corpus in
 *   data/de-motu-animalium-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-motu-animalium-en    (scripts/import-de-motu-animalium-en/index.ts)
 * and validated by
 *   npm run validate:de-motu-animalium-en  (scripts/import-de-motu-animalium-en/validate.ts)
 *
 * Source: English Wikisource, page "On the Movement of Animals" - A. S. L.
 * Farquharson's translation, published in *The Works of Aristotle Translated
 * into English*, Volume V (Oxford: Clarendon Press, 1912). Public domain:
 * published well before 1929.
 *
 * TITLE NOTE: "On the Motion of Animals" is a REDIRECT on Wikisource; the
 * actual page is "On the Movement of Animals". Both were checked; the redirect
 * was followed rather than guessed at.
 *
 * CONTENT-VERIFIED, not merely blue-linked. This batch's brief flagged this
 * work as "blue-linked, NOT yet content-verified" - i.e. a link existing was
 * not to be taken as proof of text. It was verified: the page holds 38 KB of
 * real transcribed prose in 11 chapters, with 49 translator footnotes, and is
 * not a stub.
 *
 * The page is ORDINARY WIKITEXT, not a djvu page-scan transclusion. UNLIKE
 * every other plain-wikitext work in this batch, it DOES print Bekker page
 * markers, via `{{verse|verse=698a}}` templates - so Division.ref here carries
 * a real Bekker page or range, reconstructed from the source's own markers in
 * document order. Chapters are marked `==N==` (a heading whose text is just
 * the number), a shape unique to this work within the batch.
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
  /** Chapter only: Bekker page range printed by the source, e.g. "698a–698b" */
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
  /** 'de-motu-animalium-en' */
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
