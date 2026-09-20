/**
 * Type definitions for the bundled Cicero Latin/English oration corpora in
 *   data/pro-archia-la/            data/pro-archia-en/
 *   data/pro-roscio-amerino-la/    data/pro-roscio-amerino-en/
 *   data/pro-caelio-la/            data/pro-caelio-en/
 *
 * These files are generated (do not hand-edit) by
 *   npm run import:pro-archia-la           (scripts/import-pro-archia-la/index.ts)
 *   npm run import:pro-archia-en           (scripts/import-pro-archia-en/index.ts)
 *   npm run import:pro-roscio-amerino-la   (scripts/import-pro-roscio-amerino-la/index.ts)
 *   npm run import:pro-roscio-amerino-en   (scripts/import-pro-roscio-amerino-en/index.ts)
 *   npm run import:pro-caelio-la           (scripts/import-pro-caelio-la/index.ts)
 *   npm run import:pro-caelio-en           (scripts/import-pro-caelio-en/index.ts)
 * and validated by (one validator per speech, checking both its Latin and
 * English editions together):
 *   npm run validate:pro-archia            (scripts/import-pro-archia-la/validate.ts)
 *   npm run validate:pro-roscio-amerino    (scripts/import-pro-roscio-amerino-la/validate.ts)
 *   npm run validate:pro-caelio            (scripts/import-pro-caelio-la/validate.ts)
 *
 * Source (Latin, and English for the first two works): Perseus /
 * OpenGreekAndLatin canonical-latinLit TEI XML, CTS textgroup phi0474. Each
 * of these three orations is a single continuous speech with NO book or
 * chapter subdivision of its own in this app's schema - only the edition's
 * own numbered sections (Cicero's oratory was not written or transmitted in
 * "books"; the traditional citation unit smaller than the whole speech is
 * the section). Pro Caelio's English edition is the one exception to the
 * Perseus sourcing - it has no Perseus English witness, so it is sourced
 * from English Wikisource instead; see its own about.json/anomalies.json
 * for how a significant provenance concern discovered in that source was
 * handled.
 *
 * FLAT, single-tier division tree (mirrors data/categoriae-la/types.ts):
 * `divisions` is the numbered sections directly, one level deep; `children`
 * is always []. Id scheme: `sec-N`, plain arabic, 1-based, matching the
 * source's own section `n` attribute exactly - deliberately NOT a
 * `book-`/`speech-`/`actio-` prefixed id, so it falls through to the
 * generic "§ N" display label in src/library/genericCorpus.ts's
 * kindLabel(), same as any other undivided generic-profile work.
 *
 * Division.ref - a NEW convention for Cicero, unlike the Bekker-keyed
 * Aristotle corpora already in this app: the Perseus TEI prints an inline
 * `<milestone unit="chapter" n="N"/>` at various points within the
 * section-numbered running text - the traditional, coarser-grained
 * Roman-numeral "chapter" citation (one chapter typically spans several
 * sections; chapter and section are independent numbering systems for the
 * same running text). Division.ref is the chapter number ACTIVE AT THAT
 * SECTION'S START - the nearest preceding chapter milestone in document
 * order - stored as a plain arabic numeral string (e.g. "1", "2"), never a
 * range. null only for a section before any chapter milestone has been
 * seen (possible only at the very start of a work). Passage.ref is always
 * null: no citation finer than Division.ref exists in this source. (Pro
 * Caelio's English/Wikisource edition carries no chapter milestones at all,
 * so Division.ref is null throughout that one edition - see its
 * about.json.)
 *
 * Each section Division carries exactly one Passage: the full text of that
 * `<div subtype="section">` (or, for Pro Caelio's English edition, of that
 * `===N===` wiki section), its paragraph(s) joined with "\n\n" when a
 * section prints more than one (uncommon but genuine - e.g. a block-quoted
 * verse citation set off in its own paragraph). Passage.n is '' throughout,
 * matching the Nicomachean Ethics precedent (no finer per-passage
 * numbering exists in any of these six editions).
 */

export type Lang = 'la' | 'en';

export interface Passage {
  /** always '' - no finer-than-section numbering exists in any of these six editions */
  n: string;
  /** verbatim reading text (Latin edition or English translation), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc; no passage-level citation finer than Division.ref exists */
  ref: string | null;
  /** optional note when something irregular was preserved (manuscript lacuna, apparatus-supplied word, orphaned wiki markup, ...) */
  anomaly?: string;
}

export interface Division {
  /** `sec-N`, 1-based arabic, matching the source's own section number */
  id: string;
  /** section number as an arabic string */
  number: string | null;
  /** the traditional chapter number active at this section's start (nearest preceding <milestone unit="chapter"/> in document order), as a plain arabic string; null before the first chapter milestone in the work, and null throughout for Pro Caelio's English edition (no chapter milestones in that source - see its about.json) */
  ref: string | null;
  /** verbatim source rubric for this division; null throughout these six editions - the running oration carries no per-section rubric */
  sourceHeading: string | null;
  /** English, EDITORIAL - null throughout these works (no editorial gloss is added) */
  editorialTitle: string | null;
  /** always [] - these works are one level deep */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'pro-archia-la' | 'pro-archia-en' | 'pro-roscio-amerino-la' | 'pro-roscio-amerino-en' | 'pro-caelio-la' | 'pro-caelio-en' */
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
