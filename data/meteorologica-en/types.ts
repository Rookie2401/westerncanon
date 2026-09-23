/**
 * Type definitions for the bundled English Meteorology corpus in
 *   data/meteorologica-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:meteorologica-en  (scripts/import-meteorologica-en/index.ts)
 * and validated by
 *   npm run validate:meteorologica-en  (scripts/import-meteorologica-en/validate.ts)
 *
 * Source: the MIT Internet Classics Archive (classics.mit.edu/Aristotle/
 * meteorology.html), reproducing E. W. Webster's Oxford translation of
 * Aristotle's Meteorology (Meteorologica), first published 1923 (The Works
 * of Aristotle, Vol. III, ed. W. D. Ross). MIT's own page carries an
 * explicit "Translated by E. W. Webster" credit line (verified by direct
 * inspection of every fetched book page - see about.json's "Digital source"
 * section for the exact quoted text).
 *
 * Two-level tree, Book -> Chapter (4 Books; MIT's own page splits the work
 * into 4 separate HTML pages, one per Book, matching the traditional Bekker
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
 * choice: MIT's own live HTML page for Book II (meteorology.2.ii.html)
 * itself ends mid-sentence, mid-tag, part-way through Part 9 (Book II's
 * final chapter), with no closing navigation footer at all — confirmed both
 * by direct HTTP fetch (the response's own Content-Length matches exactly
 * what was received) and independently via a second fetch path. The
 * surviving text of Book II Part 9 is preserved verbatim exactly as far as
 * it goes, with that Passage's own `anomaly` field flagging the cutoff;
 * nothing is completed, guessed at, or filled in from another edition. See
 * about.json's "Known gaps & anomalies" section and anomalies.json for the
 * exact last surviving words. Books I, III and IV are complete.
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
  /** set only on Book II Chapter 9's final passage — flags the source's own mid-sentence cutoff (see the module doc) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'4' for a Book, '1'..'N' for a Chapter) */
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
  /** 'meteorologica-en' */
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
