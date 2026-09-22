/**
 * Type definitions for the bundled English De Bello Gallico (The Gallic War)
 * translation corpus in
 *   data/de-bello-gallico-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-bello-gallico-en  (scripts/import-de-bello-gallico-en/index.ts)
 * and validated by
 *   npm run validate:de-bello-gallico-en  (scripts/import-de-bello-gallico-en/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0448.phi001.perseus-eng2 - William Alexander McDevitte
 * and W. S. Bohn, trans., Caesar's Commentaries (New York: Harper and
 * Brothers, 1870-1872).
 *
 * IMPORTANT - authorship: Book 8 (`book-8`) translates Aulus Hirtius's
 * continuation, NOT Caesar's own words - his narrative ends after Book 7.
 * This witness carries the same evidence as the Latin sibling: Book 8 opens
 * with Hirtius's own prefatory letter to Balbus (chapter `book-8-ch-0`). See
 * about.json for the full disclosure.
 *
 * Two-level tree, Book -> Chapter, structurally IDENTICAL in shape to the
 * Latin sibling (data/de-bello-gallico-la/types.ts) and - confirmed by
 * independent parsing of this witness, not assumed - agreeing with it
 * exactly, chapter for chapter, in every one of the 8 books (including Book
 * 8's chapter numbering starting at "0"). Unlike the Latin sibling, this
 * English witness has NO extra `<div subtype="section">` nesting level -
 * every chapter here holds its paragraph(s) directly.
 *
 * Id scheme: Book = `book-N` (1-8), Chapter = `book-N-ch-M` (M is "0" for
 * Book 8's Hirtius preface, else 1-based) - see the Latin sibling's module
 * doc for the full rationale; identical scheme here since both witnesses
 * agree chapter-for-chapter.
 *
 * Division.ref is always null throughout: this source carries no
 * page-marker or milestone citation scheme; citation is by Book and Chapter
 * number alone.
 *
 * Each Chapter carries exactly ONE Passage: its <p> paragraph(s), in
 * document order, joined with "\n\n" when more than one (routine in this
 * witness, since it has no extra nesting level to read through). Passage.n
 * is '' throughout; Passage.ref is always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English translation paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a linearised tabular list, since this flat-text schema has no table representation) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter (M is "0" for Book 8's Hirtius preface, else 1-based) */
  id: string;
  /** arabic string ('1'..'8' for a Book, '0'/'1'..'N' for a Chapter) */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme */
  ref: string | null;
  /** always null - this witness prints no per-book rubric (unlike the Latin sibling's "COMMENTARIUS PRIMUS" etc.) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-bello-gallico-en' */
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
