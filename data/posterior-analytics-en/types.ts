/**
 * Type definitions for the bundled English corpus in
 *   data/posterior-analytics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-posterior-analytics-en  (scripts/import-aristotle-posterior-analytics-en/index.ts)
 * and validated by
 *   npm run validate:aristotle-posterior-analytics-en  (scripts/import-aristotle-posterior-analytics-en/validate.ts)
 *
 * Aristotle's *Posterior Analytics* in E. S. Bouchier's 1901 translation,
 * from English Wikisource ("Posterior Analytics (Bouchier)"), one plain
 * wikitext page per chapter — unlike the English Categories/De
 * Interpretatione bundled elsewhere in this repo (Edghill/Ross, 1928),
 * which is a page-scan transclusion needing HTML+jsdom, this source is
 * ordinary wikitext. It is the English sibling of
 * data/posterior-analytics-grc/ and shares its Book -> Chapter tree shape,
 * but is independently divided (see below) rather than sharing a chapter
 * table 1:1 with the Greek side.
 *
 * Structural notes:
 *   - two-level tree, Book -> Chapter (matching src/library/genericCorpus.ts's
 *     BOOK_ID (`book-N`) / CHAPTER_ID (`-ch-M`) id conventions).
 *   - a Book division is a container only: `children` holds its Chapters,
 *     `passages` is always []. Book.ref/.sourceHeading/.editorialTitle are
 *     always null.
 *   - a Chapter division has `children: []` and exactly 1 Passage, whose
 *     text is Bouchier's own one-paragraph italicised chapter ARGUMENT
 *     (summary) followed by the chapter's body paragraphs, joined with
 *     "\n\n" — the argument is genuine translator's prose worth keeping,
 *     not source apparatus, so it is included rather than discarded.
 *     Chapter.number is the arabic chapter number as a string, matching
 *     Bouchier's own printed roman numeral converted to arabic (e.g. "XI"
 *     -> "11"). Chapter.editorialTitle is Bouchier's own printed chapter
 *     title (e.g. "Whether a Demonstrative Science exists" for Book 1
 *     Chapter 1), captured verbatim. Chapter.sourceHeading and .ref are
 *     always null: this translation prints no chapter rubric distinct from
 *     its title, and (confirmed by direct inspection of every page) no
 *     Bekker page/column/line markers at all.
 *   - Book 2's last two chapters (numbers 23-24) come from a separate
 *     Wikisource page titled ".../Book II/Appendix", which nonetheless
 *     prints them as ordinary numbered Bouchier chapters ("Chapter XXIII:
 *     On Induction", "Chapter XXIV: On Example") continuing Bouchier's own
 *     numbering — Chapters XX-XXII simply do not exist in this translation.
 *     They are imported as ordinary Chapter divisions (book-2-ch-23,
 *     book-2-ch-24) using Bouchier's own numbers and titles, exactly like
 *     every other chapter; see anomalies.json for the full reasoning.
 *   - Bouchier's own scholarly footnotes (inline `<ref>...</ref>` markers,
 *     rendered under each page's own "===Notes===" heading) are editorial
 *     apparatus, not Aristotle's text, and are dropped entirely — each
 *     occurrence logged individually in anomalies.json.
 *   - Passage.n is always "" (no printed paragraph numbers); Passage.ref is
 *     always null (see above).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English text: Bouchier's italicised chapter argument + body paragraphs, joined with "\n\n"; whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no Bekker or other physical reference markers */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic numeral string for both Book and Chapter ('1'/'2' for Book; '1'..'34' for Book 1's Chapters, '1'..'19' then '23'/'24' for Book 2's - see the module doc comment on the Appendix) */
  number: string | null;
  /** always null - see the module doc comment */
  ref: string | null;
  /** always null - this translation prints no chapter rubric distinct from its own title */
  sourceHeading: string | null;
  /** Book: always null. Chapter: Bouchier's own printed chapter title, verbatim */
  editorialTitle: string | null;
  /** Book -> its Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (container only); exactly 1 for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'posterior-analytics-en' */
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
