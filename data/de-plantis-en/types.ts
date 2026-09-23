/**
 * Type definitions for the bundled English *On Plants* (De plantis) corpus in
 *   data/de-plantis-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-plantis-en    (scripts/import-de-plantis-en/index.ts)
 * and validated by
 *   npm run validate:de-plantis-en  (scripts/import-de-plantis-en/validate.ts)
 *
 * Source: English Wikisource, page "On Plants" - E. S. Forster's translation
 * for *The Works of Aristotle Translated into English*, Volume VI: Opuscula
 * (Oxford: Clarendon Press, 1913). Public domain: published well before 1929.
 *
 * PSEUDO-ARISTOTLE. The De plantis is not Aristotle's: the Wikisource page's
 * own header calls it "widely believed to be spurious and instead to be by
 * Nicolaus of Damascus", and Forster's preface (which is NOT imported - see
 * below) explains that the surviving text reached Latin through Arabic and
 * Greek retranslation. It is bundled under Aristotle's name because that is
 * how the Oxford edition transmits it, with the doubt recorded rather than
 * hidden.
 *
 * TWO BOOKS, NOT A FLAT TEXT - determined by inspection. The page marks its
 * own book boundaries with `<div class="wst-heading">BOOK I</div>` and
 * `BOOK II`, so this edition is a two-level Book -> Chapter tree: Book I
 * chapters 1-7, Book II chapters 1-10.
 *
 * FRONT MATTER EXCLUDED: the page begins with the 1913 title page (DE PLANTIS
 * / BY / E. S. FORSTER / OXFORD / AT THE CLARENDON PRESS / 1913), Forster's
 * own signed PREFACE, and a CONTENTS heading. That is the translator's
 * editorial apparatus, not the treatise, so the import starts at the first
 * paragraph of the text proper and the omission is disclosed in anomalies.json.
 *
 * The page IS a djvu page-scan transclusion (663 bytes of `<pages index=.../>`
 * wikitext), so the RENDERED HTML was fetched and parsed. It carries Bekker
 * page markers AND its chapter numbers in the SAME `span.wst-sidenote`
 * container, which is why the two are told apart by shape rather than by
 * position; Division.ref carries real page ranges.
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
  /** arabic string ('1'..'2' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** Chapter only: Bekker page range printed by the source, e.g. "815a-816b"; null for a Book */
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
  /** 'de-plantis-en' */
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
