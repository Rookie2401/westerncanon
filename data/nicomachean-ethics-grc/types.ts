/**
 * Type definitions for the bundled Greek Nicomachean Ethics corpus in
 *   data/nicomachean-ethics-grc/
 *
 * Generated (do not hand-edit) by
 *   npm run import:aristotle-nicomachean-ethics-grc  (scripts/import-aristotle-nicomachean-ethics-grc/index.ts)
 * and validated by
 *   npm run validate:aristotle-nicomachean-ethics-grc  (scripts/import-aristotle-nicomachean-ethics-grc/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0086.tlg010.perseus-grc2 - Ingram Bywater, ed.,
 * Aristotelis Ethica Nicomachea (Oxford: Clarendon Press, 1894).
 *
 * Two-level tree, Book -> Chapter (matches the shared Euclid/Augustine-style
 * GenericWork shape one level shallower than Euclid's Book -> group -> leaf):
 * a Book division has children (its Chapters) and no passages of its own; a
 * Chapter division has one or more passages (one per surviving <p>) and no
 * children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N`, Chapter = `book-N-ch-M`, both 1-based plain arabic numerals -
 * Aristotle's own chapter numbering within each book (Perseus's own TEI
 * calls the chapter-level div `subtype="section"`, but per this app's
 * existing Aristotle-Bekker convention that is treated as "Chapter" here).
 *
 * Division.ref (Chapter only) is the Bekker page range covered by that
 * chapter's text, e.g. "1094a–1095a" (or a single page/column token such as
 * "1094a" when the whole chapter falls on one page), reconstructed from the
 * inline `<milestone unit="page" resp="Bekker" n="…"/>` markers the source
 * carries in document order. Book Division.ref is always null (Books are a
 * container only).
 *
 * Each Chapter carries exactly ONE Passage: the chapter's surviving <p>
 * paragraphs, in document order, joined with "\n\n" when the chapter has
 * more than one. Passage.n is '' throughout (no printed paragraph numbers);
 * Passage.ref is always null (no per-paragraph Bekker marker is printed,
 * only per-page - see Division.ref above).
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc for why per-passage Bekker refs are not fabricated */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. an editorial <add>/<del>/<gap> in Bywater's apparatus) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter */
  id: string;
  /** arabic string ('1'..'10' for a Book, '1'..'N' for a Chapter) */
  number: string | null;
  /** Chapter only: Bekker page range, e.g. "1094a–1095a"; null for a Book */
  ref: string | null;
  /** always null - the source prints no chapter rubric */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'nicomachean-ethics-grc' */
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
