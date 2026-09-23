/**
 * Type definitions for the bundled English On Generation and Corruption
 * corpus in data/de-generatione-et-corruptione-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-generatione-et-corruptione-en  (scripts/import-de-generatione-et-corruptione-en/index.ts)
 * and validated by
 *   npm run validate:de-generatione-et-corruptione-en  (scripts/import-de-generatione-et-corruptione-en/validate.ts)
 *
 * Source: the MIT Internet Classics Archive (classics.mit.edu/Aristotle/
 * gener_corr.html), reproducing H. H. Joachim's Oxford translation of
 * Aristotle's On Generation and Corruption, first published 1922 (The Works
 * of Aristotle, Vol. II, ed. W. D. Ross). MIT's own page carries an explicit
 * "Translated by H. H. Joachim" credit line (verified by direct inspection
 * of both fetched book pages - see about.json's "Digital source" section for
 * the exact quoted text).
 *
 * Two-level tree, Book -> Chapter (2 Books; MIT's own page splits the work
 * into 2 separate HTML pages, one per Book, matching the traditional Bekker
 * book division). A Book division has children (its Chapters) and no
 * passages of its own; a Chapter division has one passage and no children.
 *
 * Id scheme: Book = `book-N`, Chapter = `book-N-ch-M`, both 1-based plain
 * arabic numerals, matching MIT's own "Part N" chapter headings.
 *
 * Division.ref is ALWAYS null, for both Books and Chapters: MIT's Internet
 * Classics Archive pages print NO Bekker page/column/line markers anywhere
 * (verified directly). This is a genuine limitation of this source,
 * disclosed in about.json, not fabricated around.
 *
 * IMPORTANT — this edition is INCOMPLETE at one point, not by this app's
 * choice: MIT's own live HTML page for Book I (gener_corr.1.i.html) itself
 * ends abruptly mid-sentence/mid-word part-way through Part 8 (Book I's
 * final chapter), with no closing navigation footer at all — confirmed both
 * by direct HTTP fetch (the response's own Content-Length matches exactly
 * what was received; nothing was lost in transit) and independently via a
 * second fetch tool. The surviving text of Book I Part 8 is preserved
 * verbatim exactly as far as it goes, with that Passage's own `anomaly`
 * field flagging the cutoff; nothing is completed, guessed at, or filled in
 * from another edition. See about.json's "Known gaps & anomalies" section
 * and anomalies.json for the exact last surviving words. Book II is
 * complete.
 *
 * Each Chapter carries exactly ONE Passage: every paragraph MIT's own
 * `<BR><BR>` paragraph-break markup delimits within that "Part", in document
 * order, joined with "\n\n". Passage.n is '' throughout; Passage.ref is
 * always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' — MIT prints no paragraph numbering */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces */
  text: string;
  /** always null — MIT's Internet Classics Archive prints no Bekker (or any other) per-passage reference marker */
  ref: string | null;
  /** set only on Book I Chapter 8's final passage — flags the source's own mid-sentence cutoff (see the module doc) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'2' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** always null — MIT prints no Bekker (or any other) reference marker */
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
  /** 'de-generatione-et-corruptione-en' */
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
