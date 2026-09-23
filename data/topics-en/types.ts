/**
 * Type definitions for the bundled English Topics corpus in
 *   data/topics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:topics-en  (scripts/import-topics-en/index.ts)
 * and validated by
 *   npm run validate:topics-en  (scripts/import-topics-en/validate.ts)
 *
 * Source: the MIT Internet Classics Archive (classics.mit.edu/Aristotle/
 * topics.html), reproducing W. A. Pickard-Cambridge's Oxford translation of
 * Aristotle's Topics, first published 1928 (The Works of Aristotle, Vol. I,
 * ed. W. D. Ross). MIT's own page carries an explicit "Translated by W. A.
 * Pickard-Cambridge" credit line (verified by direct inspection of every
 * fetched page - see about.json's "Digital source" section for the exact
 * quoted text and where it appears).
 *
 * Two-level tree, Book -> Chapter (8 Books; MIT's own page splits the work
 * into 8 separate HTML pages, one per Book, matching the traditional Bekker
 * book division). A Book division has children (its Chapters) and no
 * passages of its own; a Chapter division has one passage and no children.
 *
 * Id scheme: Book = `book-N`, Chapter = `book-N-ch-M`, both 1-based plain
 * arabic numerals, matching MIT's own "Part N" chapter headings (MIT's site
 * calls chapters "Part N" rather than "Chapter N"; this schema's existing
 * "Chapter" terminology is used for the id/number fields per this app's
 * standing convention for Aristotle - see the Nicomachean Ethics English
 * edition's types.ts for the precedent).
 *
 * Division.ref is ALWAYS null, for both Books and Chapters: MIT's Internet
 * Classics Archive pages print NO Bekker page/column/line markers anywhere
 * (verified directly - the only inline anchors present are silent, invisible
 * `<A NAME="n">` deep-link targets, sequentially numbered across an entire
 * Book with no relation to the Bekker apparatus, and are discarded as
 * transport scaffolding, not read as a reference scheme). This is a genuine
 * limitation of this source, disclosed in about.json, not fabricated around.
 *
 * Each Chapter carries exactly ONE Passage: every paragraph MIT's own
 * `<BR><BR>` paragraph-break markup delimits within that "Part", in document
 * order, joined with "\n\n". Passage.n is '' throughout (MIT prints no
 * paragraph numbering of its own); Passage.ref is always null (no marker at
 * any level below "Part").
 */

export type Lang = 'en';

export interface Passage {
  /** always '' — MIT prints no paragraph numbering */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces */
  text: string;
  /** always null — MIT's Internet Classics Archive prints no Bekker (or any other) per-passage reference marker */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'8' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** always null — MIT prints no Bekker (or any other) reference marker at Book or Chapter level */
  ref: string | null;
  /** always null — the source prints no chapter rubric beyond the bare "Part N" label already captured by `number` */
  sourceHeading: string | null;
  /** always null — no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'topics-en' */
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
