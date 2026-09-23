/**
 * Type definitions for the bundled English Poetics corpus in
 *   data/poetics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:poetics-en  (scripts/import-poetics-en/index.ts)
 * and validated by
 *   npm run validate:poetics-en  (scripts/import-poetics-en/validate.ts)
 *
 * Source: Project Gutenberg ebook #6763, "Aristotle on the Art of Poetry" -
 * Ingram Bywater's translation (Oxford: Clarendon Press, first published
 * 1920), fetched once and cached at
 * scripts/import-poetics-en/raw/pg6763.txt.
 *
 * Flat, one-level tree: divisions are the 26 traditional Poetics chapters
 * directly (same shape as data/categoriae-en), NOT a Book -> Chapter tree -
 * this work has always circulated as a single continuous treatise, and this
 * source itself marks it that way (bare arabic numerals "1".."26" on their
 * own line, with no "Book" grouping of any kind). `children` is always [].
 *
 * Id scheme: `ch-N`, 1-based plain arabic numerals, matching this source's
 * own bare numeral headings exactly (confirmed by direct inspection: exactly
 * 26 such headings, in strict sequence 1..26, appear in the real-translation
 * region of the cached source).
 *
 * IMPORTANT SCOPE NOTE: Gilbert Murray's own signed "PREFACE" (which
 * precedes Bywater's translation in this printing and is a separate essay
 * about the work, not a translation of it) is EXCLUDED entirely - only
 * Aristotle's text, in Bywater's translation, is imported. See
 * scripts/import-poetics-en/index.ts's doc comment for exactly how the
 * boundary between the two was located.
 *
 * Division.ref is always null: this source prints no Bekker page markers at
 * all (unlike data/politics-en's Ellis translation - verified by direct
 * inspection of the whole cached source; see anomalies.json). Division.
 * sourceHeading is always null (no separate chapter title/rubric is
 * printed - the sole heading IS the bare number, already captured in
 * Division.number). Division.editorialTitle is always null (no editorial
 * chapter titles are supplied by this importer). Passage.n is '' and
 * Passage.ref is always null throughout (this source has no paragraph-level
 * citation apparatus of any kind). Each chapter carries exactly one Passage
 * (that chapter's paragraphs joined with "\n\n").
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbering */
  n: string;
  /** verbatim English paragraph(s), whitespace collapsed to single spaces, entities decoded, joined with "\n\n" */
  text: string;
  /** always null - this source has no paragraph-level citation apparatus */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `ch-N`, 1-based, matching this source's own bare numeral headings */
  id: string;
  /** arabic string ('1'..'26') */
  number: string | null;
  /** always null - this source prints no Bekker markers at all (see the module doc comment) */
  ref: string | null;
  /** always null - the sole heading is the bare chapter number, already in Division.number */
  sourceHeading: string | null;
  /** always null - no editorial chapter title is supplied */
  editorialTitle: string | null;
  /** always [] (one level deep) */
  children: Division[];
  /** exactly [one Passage] per chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'poetics-en' */
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
