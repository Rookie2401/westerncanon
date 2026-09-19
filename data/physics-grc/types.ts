/**
 * Type definitions for the bundled Aristotle corpus at data/physics-grc/.
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-physics-grc  (scripts/import-aristotle-physics-grc/index.ts)
 * and validated by
 *   npx tsx scripts/import-aristotle-physics-grc/validate.ts
 *
 * Greek text ONLY (no English translation is bundled for this work - see
 * about.json's "Known gaps & anomalies" section for why).
 *
 * Unlike data/categoriae-grc/ and data/de-interpretatione-grc/ (flat,
 * chapters-only), the *Physics* has real Books: this is a two-level tree,
 * Book -> Chapter, the same shape as data/augustine-city-of-god-la/'s
 * Book -> Chapter (one level shallower than Euclid's three-level tree). A
 * Book division has children (its Chapters) and no passages of its own; a
 * Chapter division is a leaf (children: []) with one Passage holding that
 * chapter's running prose.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals.
 * Chapter numbers restart at 1 in every book, matching the source.
 *
 * Reference scheme: the digital source (First1KGreek TEI for
 * urn:cts:greekLit:tlg0086.tlg031.1st1K-grc1) marks Bekker page/column
 * milestones (<note type="marginal">184a</note> etc., e.g. "184a", "184b",
 * "185a", ...) inline, in document order, throughout each chapter - but no
 * Bekker LINE numbers survive as citeable text (the <lb n="N"/> markers are
 * zero-width position markers only). Division.ref for a Chapter is therefore
 * the Bekker page/column RANGE spanned by that chapter (e.g. "184a-187a"),
 * built from the first and last marginal marker encountered in it; a Book's
 * own ref is left null (its Chapters already carry the citation). Passage.ref
 * is always null and Passage.n is always "" (the source prints no
 * within-chapter passage numbering).
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' for this work (no printed sub-chapter numbering in the source) */
  n: string;
  /** verbatim Greek paragraph(s) for the chapter, '\n\n'-joined if the source prints more than one <p>; whitespace collapsed, entities decoded, apparatus removed as documented in anomalies.json */
  text: string;
  /** always null for this work; see Division.ref for the chapter's own Bekker range */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter (both 1-based arabic) */
  id: string;
  /** Book: '1'..'8'. Chapter: '1'..N, resets each book. */
  number: string;
  /** Chapter only: the Bekker page/column range spanned by this chapter, e.g. "184a-187a" (single value if only one marginal marker falls in it). Always null for a Book. */
  ref: string | null;
  /** always null (the source's per-book <head> is a running header/title, not a chapter or book heading worth preserving structurally - see anomalies.json) */
  sourceHeading: string | null;
  /** always null (no editorial titles are supplied for this work) */
  editorialTitle: string | null;
  /** Book -> its Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (container only); exactly 1 Passage for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'physics-grc' */
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
