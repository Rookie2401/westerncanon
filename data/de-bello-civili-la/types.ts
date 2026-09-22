/**
 * Type definitions for the bundled Latin De Bello Civili (Civil War) corpus in
 *   data/de-bello-civili-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-bello-civili-la  (scripts/import-de-bello-civili-la/index.ts)
 * and validated by
 *   npm run validate:de-bello-civili-la  (scripts/import-de-bello-civili-la/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0448.phi002.perseus-lat3 (witness "lat3") - Julius
 * Caesar, The Civil Wars, ed. Arthur George Peskett (London: William
 * Heinemann; New York: G. P. Putnam's Sons, 1914).
 *
 * Unlike De Bello Gallico, this work is entirely Caesar's own, but it too is
 * unfinished: the narrative simply stops at the end of Book 3 (chapter 112,
 * a textually complete sentence) with no formal conclusion - see "Known gaps
 * & anomalies" in about.json. Separately, three scattered points earlier in
 * Book 3 (chapters 8, 10, 50) each carry a small, unrelated manuscript
 * lacuna. No Hirtius/authorship caveat applies here.
 *
 * Two-level tree, Book -> Chapter (same shape as the Nicomachean Ethics / De
 * Bello Gallico Book->Chapter GenericWork convention): a Book division has
 * children (its Chapters) and no passages of its own; a Chapter division has
 * exactly one passage and no children. Unlike De Bello Gallico's Latin
 * witness, this source has NO extra section-level nesting - every chapter
 * holds its paragraph directly.
 *
 * Id scheme: Book = `book-N` (1-3), Chapter = `book-N-ch-M`, both 1-based
 * plain arabic numerals, contiguous within each book, matching this
 * edition's own chapter numbering exactly (confirmed identical,
 * chapter-for-chapter, against the independently-parsed English sibling -
 * see data/de-bello-civili-en/types.ts).
 *
 * Division.ref is always null throughout: this source carries no
 * page-marker or milestone citation scheme (only typographic `<pb/>` page
 * breaks, dropped as zero-width scaffolding - see about.json); citation is
 * by Book and Chapter number alone.
 *
 * Each Chapter carries exactly ONE Passage: its single <p> paragraph.
 * Passage.n is '' throughout (no printed paragraph numbers); Passage.ref is
 * always null.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Latin paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. the manuscript's own literal ". . ." ellipsis, printed plainly at one of three scattered points within Book 3 - chapters 8, 10, 50 - marking a small lacuna; unrelated to the work's own unfinished ending at chapter 112) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'3' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme */
  ref: string | null;
  /** always null - this source prints no per-book rubric */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-bello-civili-la' */
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
