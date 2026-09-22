/**
 * Type definitions for the bundled Latin De Bello Gallico (Gallic War) corpus in
 *   data/de-bello-gallico-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-bello-gallico-la  (scripts/import-de-bello-gallico-la/index.ts)
 * and validated by
 *   npm run validate:de-bello-gallico-la  (scripts/import-de-bello-gallico-la/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0448.phi001.perseus-lat2 - Julius Caesar (Books I-VII)
 * and Aulus Hirtius (Book VIII), C. Iuli Commentarii Rerum in Gallia
 * Gestarum, ed. Thomas Rice Holmes (Oxford: Clarendon Press, 1914).
 *
 * IMPORTANT - authorship: Book 8 (`book-8`) was NOT written by Caesar. His
 * own narrative ends after Book 7; Book 8 is a continuation by his officer
 * Aulus Hirtius, written after Caesar's assassination, opening with Hirtius's
 * own prefatory letter to Balbus (captured here as chapter `book-8-ch-0` -
 * see below). See about.json for the full disclosure.
 *
 * Two-level tree, Book -> Chapter (matches the Nicomachean Ethics / de
 * -officiis-la Book->Chapter GenericWork shape): a Book division has
 * children (its Chapters) and no passages of its own; a Chapter division has
 * exactly one passage and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID/
 * CHAPTER_ID so Books and Chapters render as "Book N"/"Chapter N"): Book =
 * `book-N` (1-8), Chapter = `book-N-ch-M` - this edition's own chapter
 * numbering, 1-based within every book EXCEPT Book 8, whose first chapter is
 * genuinely numbered "0" in the source (Hirtius's prefatory letter to Balbus,
 * before his numbered narrative resumes at chapter 1) - preserved verbatim
 * as `book-8-ch-0` rather than forced to 1, since it is what the source
 * itself prints (both this Latin witness and the English sibling agree).
 *
 * The source has an extra `<div type="textpart" subtype="section">` nesting
 * level between chapter and paragraph (absent from the English sibling -
 * see data/de-bello-gallico-en/types.ts); per this app's established
 * Nicomachean-Ethics-English precedent for an uninformative extra nesting
 * level, every `<p>` found anywhere under a chapter div, at any section
 * depth, becomes one paragraph of that chapter's single Passage, in document
 * order.
 *
 * Division.ref is always null throughout (Book and Chapter): this source
 * carries no page-marker or milestone citation scheme this schema could use
 * (unlike, e.g., Aristotle's Bekker numbers) - citation here is simply by
 * Book and Chapter number, the same numbers this edition itself prints.
 *
 * Each Chapter carries exactly ONE Passage: the chapter's surviving <p>
 * paragraphs (read straight through any intervening <div subtype="section">),
 * in document order, joined with "\n\n" when the chapter has more than one.
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
  /** optional note when something irregular was preserved (e.g. Holmes's own <add> editorial supplement, a <sic>-marked reading, or the manuscript's <gap> at the very end of Book 8) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter (M is "0" for Book 8's Hirtius preface, else 1-based) */
  id: string;
  /** arabic string ('1'..'8' for a Book, '0'/'1'..'N' for a Chapter) */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme */
  ref: string | null;
  /** Book only: the verbatim source rubric (e.g. "COMMENTARIUS PRIMUS"); null for a Chapter (no per-chapter rubric is printed) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-bello-gallico-la' */
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
