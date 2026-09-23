/**
 * Type definitions for the bundled English Athenian Constitution corpus in
 *   data/athenian-constitution-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:athenian-constitution-en  (scripts/import-athenian-constitution-en/index.ts)
 * and validated by
 *   npm run validate:athenian-constitution-en  (scripts/import-athenian-constitution-en/validate.ts)
 *
 * Source: Project Gutenberg ebook #26095, "The Athenian Constitution" -
 * Sir Frederic G. Kenyon's translation (Oxford, 1920 revision of his
 * original 1891 edition princeps of the papyrus), fetched once and cached
 * at scripts/import-athenian-constitution-en/raw/pg26095.txt.
 *
 * Flat, single-book, one-level tree: divisions are the 69 chapters directly
 * (children: [] on every one), the standard traditional chapter numbering
 * for this work - same shape as data/categoriae-en. This source itself
 * labels each division "Part N" rather than "Chapter N" (Kenyon's own
 * heading word for this particular translation); the traditional English
 * name for these divisions in this work is nonetheless "chapter", and the
 * id scheme below follows this app's "single-book works: flat ch-N" rule.
 *
 * Id scheme: `ch-N`, 1-based plain arabic numerals, matching Kenyon's own
 * "Part N" numbering exactly (1-69, confirmed present in strict sequence by
 * direct inspection of the cached source).
 *
 * Division.ref is always null: this source carries no Bekker-style page
 * apparatus at all (the Athenian Constitution was recovered from an
 * Egyptian papyrus in 1890 and was never assigned Bekker pagination in the
 * first place - Bekker's 1831 edition of Aristotle predates the papyrus's
 * discovery by nearly 60 years). Division.sourceHeading is always null (no
 * separate chapter title/rubric beyond the bare "Part N" heading, which is
 * already captured in Division.number). Division.editorialTitle is always
 * null (no editorial chapter titles are supplied by this importer).
 * Passage.n is '' and Passage.ref is always null throughout. Each chapter
 * carries exactly one Passage (that chapter's paragraphs joined with
 * "\n\n").
 *
 * The work's very opening is itself fragmentary in every surviving witness
 * (the papyrus's own beginning is lost) - Kenyon's translation reflects this
 * directly, opening mid-sentence with an editorial "...[They were tried]"
 * supplement in square brackets. This is preserved verbatim, not smoothed
 * over; see anomalies.json.
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
  /** `ch-N`, 1-based, matching this source's own "Part N" numbering */
  id: string;
  /** arabic string ('1'..'69') */
  number: string | null;
  /** always null - this work carries no Bekker-style page apparatus (see the module doc comment) */
  ref: string | null;
  /** always null - the sole heading is "Part N", already captured in Division.number */
  sourceHeading: string | null;
  /** always null - no editorial chapter title is supplied */
  editorialTitle: string | null;
  /** always [] (one level deep) */
  children: Division[];
  /** exactly [one Passage] per chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'athenian-constitution-en' */
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
