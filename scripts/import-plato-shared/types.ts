/**
 * Shared type definitions for the twelve bundled Plato dialogue corpora
 * (Greek + English, six dialogues each):
 *
 *   data/plato-euthyphro-grc/   data/plato-euthyphro-en/
 *   data/plato-apology-grc/     data/plato-apology-en/
 *   data/plato-crito-grc/       data/plato-crito-en/
 *   data/plato-phaedo-grc/      data/plato-phaedo-en/
 *   data/plato-ion-grc/         data/plato-ion-en/
 *   data/plato-meno-grc/        data/plato-meno-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-plato-<dialogue>-<lang>/index.ts, sharing the parsing
 * logic in scripts/import-plato-shared/parse.ts, and validated by
 *   npm run validate:plato   (scripts/import-plato-shared/validate.ts, once wired up)
 *
 * FLAT one-level tree - shallower than Euclid's Book -> group -> leaf or
 * Augustine's Book -> Chapter: none of these six dialogues has a Book
 * division (unlike Plato's Republic and Laws, which are a different
 * agent's job in this same batch). GenericWork.divisions is a flat array
 * of Stephanus-page Divisions; every Division is a leaf (children: [])
 * carrying exactly one Passage.
 *
 * Id scheme: Division.id = `sec-N` where N is the literal Stephanus page
 * number as printed in the source (e.g. `sec-2`, `sec-17`, `sec-530` for
 * Ion) - NOT necessarily starting at 1, and NOT shared/contiguous across
 * different dialogues, but monotonically increasing within one work. This
 * id does not match src/library/genericCorpus.ts's shared BOOK_ID/
 * CHAPTER_ID/PROPOSITION_ID regexes, so it falls back to that shared
 * code's plain "§ N" label automatically - intended, not a bug; that
 * shared file is not touched by this importer.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' - no finer numbering below the Stephanus-page level is tracked */
  n: string;
  /** verbatim reading text: this page's <p> paragraphs joined with "\n\n", each starting with its speaker label exactly as printed (e.g. "Socrates." / "ΣΩ."), whitespace collapsed within each paragraph, entities decoded */
  text: string;
  /** always null: no finer physical reference beyond the Stephanus page itself is tracked */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a paragraph with no <said who> speaker markup) */
  anomaly?: string;
}

export interface Division {
  /** `sec-N`, N = the literal Stephanus page number */
  id: string;
  /** the Stephanus page number as a string, e.g. "2" */
  number: string;
  /** always null - see Passage.ref */
  ref: string | null;
  /** always null - the source prints no per-page heading at this granularity */
  sourceHeading: string | null;
  /** always null - no editorial title is fabricated */
  editorialTitle: string | null;
  /** always [] - none of these six dialogues has any division below the Stephanus page */
  children: Division[];
  /** always exactly one Passage - the whole page's text */
  passages: Passage[];
}

export interface GenericWork {
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

export interface Anomaly {
  where: string;
  note: string;
}
