/**
 * Canonical ordered chapter tables for Aristotle's *Categoriae* (15 chapters)
 * and *De Interpretatione* (14 chapters), used by the Greek (Bekker 1837 /
 * First1KGreek TEI) importer of each work.
 *
 * - `id`     : division slug, stable.
 * - `number` : chapter number as an arabic string ('1'..'15' / '1'..'14'),
 *              as the source numbers its chapters.
 * - `en`     : EDITORIAL English chapter title. This is an editorial label, never
 *              source text; it lives in the data only as the `editorialTitle`
 *              field and is rendered with an "ed." tag.
 *
 * There is NO preface division for either work: chapter 1 is the first thing
 * after the source scaffolding. If an importer detects a chapter count other
 * than 15 / 14 it must STOP rather than guess the alignment.
 */

export interface ChapterMeta {
  id: string;
  number: string;
  en: string;
}

export const CATEGORIES_CHAPTERS: readonly ChapterMeta[] = [
  { id: 'ch-1', number: '1', en: 'Homonyms, Synonyms, and Paronyms' },
  { id: 'ch-2', number: '2', en: 'Simple and Composite Expressions; the Fourfold Division of Beings' },
  { id: 'ch-3', number: '3', en: 'Predication and the Transitivity of "Said Of"; Differentiae' },
  { id: 'ch-4', number: '4', en: 'The Ten Categories' },
  { id: 'ch-5', number: '5', en: 'Substance' },
  { id: 'ch-6', number: '6', en: 'Quantity' },
  { id: 'ch-7', number: '7', en: 'Relatives' },
  { id: 'ch-8', number: '8', en: 'Quality' },
  { id: 'ch-9', number: '9', en: 'Doing and Being-Affected; the Remaining Categories' },
  { id: 'ch-10', number: '10', en: 'The Four Kinds of Opposition' },
  { id: 'ch-11', number: '11', en: 'Further Remarks on Contraries' },
  { id: 'ch-12', number: '12', en: 'The Senses of "Prior"' },
  { id: 'ch-13', number: '13', en: 'The Senses of "Simultaneous"' },
  { id: 'ch-14', number: '14', en: 'The Kinds of Change' },
  { id: 'ch-15', number: '15', en: 'The Senses of "Having"' },
];

export const DE_INTERPRETATIONE_CHAPTERS: readonly ChapterMeta[] = [
  { id: 'ch-1', number: '1', en: 'Spoken and Written Signs; Truth and Falsity in Combination' },
  { id: 'ch-2', number: '2', en: 'The Noun' },
  { id: 'ch-3', number: '3', en: 'The Verb' },
  { id: 'ch-4', number: '4', en: 'The Sentence' },
  { id: 'ch-5', number: '5', en: 'The Simple Statement: Affirmation and Denial' },
  { id: 'ch-6', number: '6', en: 'Affirmation, Negation, and the Contradictory Pair' },
  { id: 'ch-7', number: '7', en: 'Universal and Particular Statements; the Square of Opposition' },
  { id: 'ch-8', number: '8', en: 'Single Statements versus Merely Verbal Unity' },
  { id: 'ch-9', number: '9', en: 'Future Contingents and the Sea-Battle' },
  { id: 'ch-10', number: '10', en: 'Statements with "Is" as a Third Element; Indefinite Names' },
  { id: 'ch-11', number: '11', en: 'Whether Many Predicates Make One Statement' },
  { id: 'ch-12', number: '12', en: 'The Contradictories of Modal Statements' },
  { id: 'ch-13', number: '13', en: 'The Logical Consequences among Modal Statements' },
  { id: 'ch-14', number: '14', en: 'Whether Contrary Beliefs Are Opposed by Contrary or Contradictory' },
];

/** The 15 Categoriae chapter ids, in order. */
export const CATEGORIES_CHAPTER_IDS: readonly string[] = CATEGORIES_CHAPTERS.map((c) => c.id);

/** The 14 De Interpretatione chapter ids, in order. */
export const DE_INTERPRETATIONE_CHAPTER_IDS: readonly string[] =
  DE_INTERPRETATIONE_CHAPTERS.map((c) => c.id);

/** Lookup a chapter table by the work-family key. */
export function chapterTableFor(family: 'categoriae' | 'de-interpretatione'): readonly ChapterMeta[] {
  return family === 'categoriae' ? CATEGORIES_CHAPTERS : DE_INTERPRETATIONE_CHAPTERS;
}
