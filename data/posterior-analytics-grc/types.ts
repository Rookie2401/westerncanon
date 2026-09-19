/**
 * Type definitions for the bundled Greek corpus in
 *   data/posterior-analytics-grc/
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-posterior-analytics-grc  (scripts/import-aristotle-posterior-analytics-grc/index.ts)
 * and validated by
 *   npm run validate:aristotle-posterior-analytics-grc  (scripts/import-aristotle-posterior-analytics-grc/validate.ts)
 *
 * Aristotle's *Posterior Analytics* (Ἀναλυτικῶν Ὑστέρων), original Greek,
 * from Greek Wikisource (el.wikisource.org), two per-book pages
 * ("Αναλυτικών υστέρων/1", "Αναλυτικών υστέρων/2"), plain wikitext. Unlike
 * the companion Categoriae/De Interpretatione Greek corpora (First1KGreek
 * TEI, no edition asserted beyond "Bekker 1837"), Greek Wikisource does not
 * name a source edition for this page at all - not even implicitly - so no
 * specific edition is asserted here either; see about.json's "The edition"
 * section for the full disclosure. Treated as public domain on the same
 * basis as every other Wikisource-sourced original-language text already in
 * this repo (e.g. categoriae-la's Latin Wikisource source, which carries the
 * same kind of unlabeled-edition gap).
 *
 * Structural notes:
 *   - two-level tree, Book -> Chapter (matching src/library/genericCorpus.ts's
 *     BOOK_ID (`book-N`) / CHAPTER_ID (`-ch-M`) id conventions so these
 *     render as "Book N" / "Chapter M").
 *   - a Book division is a container only: `children` holds its Chapters,
 *     `passages` is always []. Book.ref/.sourceHeading/.editorialTitle are
 *     always null.
 *   - a Chapter division has `children: []` and 1+ passages (the source
 *     prints no paragraph numbers, so there is exactly one Passage per
 *     chapter, holding the whole chapter's prose). Chapter.number is the
 *     arabic chapter number as a string ('1'..'34' in Book 1, '1'..'19' in
 *     Book 2 - the traditional counts). Chapter.sourceHeading and
 *     .editorialTitle are always null (the source prints neither a rubric
 *     nor is an editorial English title assigned on the Greek side - see the
 *     English sibling data/posterior-analytics-en/ for Bouchier's own titles).
 *   - Chapter.ref: the Bekker page/column span covered by that chapter (e.g.
 *     "71a" for a chapter that stays within one Bekker page/column, or
 *     "71a–71b" for one that crosses into the next), reconstructed from this
 *     source's own inline `{{χ|71a}}`-style Bekker markers. A chapter's start
 *     is the Bekker position in effect where it begins (continuous
 *     numbering - carried over from the previous chapter's end, exactly like
 *     the English Categoriae/De Interpretatione's own Bekker-ref
 *     reconstruction) and its end is the position in effect where the next
 *     chapter begins. Because the source marks only page/column boundaries
 *     (no line numbers, unlike the English Wikisource HTML source used for
 *     categoriae-en/de-interpretatione-en), precision stops at the
 *     page/column - never a line number. Book 1's and Book 2's Bekker
 *     numbering is continuous across the two source pages (Book 1 ends at
 *     89b, Book 2's Chapter 1 - which carries no marker of its own - starts
 *     there too); the importer seeds Book 2's reconstruction with Book 1's
 *     final position so this carries through correctly. See about.json's
 *     "Reference scheme" section.
 *   - Passage.ref is always null (no finer-grained milestone than the
 *     chapter-level Bekker span above is derivable from this source).
 *     Passage.n is always "" (no printed paragraph numbers).
 *   - The source's own editorial square-bracket marks (e.g. "[ἢ τὰ καθ'
 *     ἕκαστα]", "[γὰρ]") - apparent text-critical annotations already
 *     present in the Wikisource transcription, not wiki markup - are kept
 *     verbatim in the reading text and flagged via Passage.anomaly /
 *     anomalies.json, never stripped or resolved.
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc comment */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a source editorial square-bracket mark) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic numeral string for both Book and Chapter ('1'/'2' for Book; '1'..'34' or '1'..'19' for Chapter) */
  number: string | null;
  /** Book: always null. Chapter: the Bekker page/column span, e.g. "71a" or "71a–71b" - see the module doc comment */
  ref: string | null;
  /** always null - the source prints no chapter rubric */
  sourceHeading: string | null;
  /** always null on the Greek side - see the English sibling for Bouchier's own chapter titles */
  editorialTitle: string | null;
  /** Book -> its Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (container only); exactly 1 for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'posterior-analytics-grc' */
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
