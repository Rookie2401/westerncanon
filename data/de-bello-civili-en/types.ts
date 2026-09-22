/**
 * Type definitions for the bundled English De Bello Civili (The Civil War)
 * translation corpus in
 *   data/de-bello-civili-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-bello-civili-en  (scripts/import-de-bello-civili-en/index.ts)
 * and validated by
 *   npm run validate:de-bello-civili-en  (scripts/import-de-bello-civili-en/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0448.phi002.perseus-eng2 - Arthur George Peskett,
 * trans., The Civil Wars (London: William Heinemann; New York: G. P.
 * Putnam's Sons, 1914) - the SAME 1914 Loeb volume as the Latin sibling
 * (both by Peskett), a matched Latin/English pair (unlike De Bello Gallico's
 * Perseus witnesses, which are drawn from two different editions).
 *
 * Entirely Caesar's own, but unfinished: the narrative simply stops at the
 * end of Book 3 (chapter 112, a textually complete sentence) with no formal
 * conclusion - see "Known gaps & anomalies" in about.json. Separately, two
 * scattered points earlier in Book 3 (chapters 8, 50) each carry a small,
 * unrelated manuscript lacuna. No Hirtius/authorship caveat applies here
 * (contrast De Bello Gallico).
 *
 * Two-level tree, Book -> Chapter, structurally IDENTICAL in shape to the
 * Latin sibling (data/de-bello-civili-la/types.ts) and - confirmed by
 * independent parsing of this witness, not assumed - agreeing with it
 * exactly, chapter for chapter, in every one of the 3 books.
 *
 * Id scheme: Book = `book-N` (1-3), Chapter = `book-N-ch-M`, both 1-based
 * plain arabic numerals, contiguous within each book - identical scheme to
 * the Latin sibling since both witnesses agree chapter-for-chapter.
 *
 * Division.ref is always null throughout: this source carries no
 * page-marker or milestone citation scheme (only typographic `<pb/>` page
 * breaks, dropped as zero-width scaffolding); citation is by Book and
 * Chapter number alone.
 *
 * Each Chapter carries exactly ONE Passage: its single <p> paragraph.
 * Passage.n is '' throughout; Passage.ref is always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English translation paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a `<gap rend=". . ." reason="lost"/>` marker, kept as its literal printed ellipsis, at one of two scattered points within Book 3 - chapters 8, 50 - marking a small lacuna; unrelated to the work's own unfinished ending at chapter 112) */
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
  /** 'de-bello-civili-en' */
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
