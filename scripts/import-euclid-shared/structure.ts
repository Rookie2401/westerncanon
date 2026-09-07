/**
 * Curated structural tables for Euclid's *Elements* (ed. Heiberg & Menge,
 * Euclidis Opera Omnia, 1883-88; CTS urn:cts:greekLit:tlg1799.tlg001), shared
 * by the importer (scripts/import-euclid/index.ts) and the validator
 * (scripts/import-euclid-shared/validate.ts).
 *
 * The source TEI div tree is exactly 3 levels deep everywhere:
 *   <div subtype="book" n="1".."13">
 *     <div subtype="type" n="def|post|comm_not|prop"> (Book X: def1|prop1|def2|prop2|def3|prop3)
 *       <div subtype="number" n="...">  <-- one definition/postulate/common-notion/proposition
 *
 * GROUND_TRUTH below is the exact, independently-researched structural fact
 * about this edition (already verified against the real fetched XML: 13
 * books, 611 "number" leaves total). Four of those leaves - Book I.30, Book
 * II.7, Book X prop1.6, Book XII.7 - are genuinely present in the source but
 * mis-nested (see MISPLACED_SPLITS in scripts/import-euclid/index.ts) and
 * are split out into their own leaf during import; GROUND_TRUTH reflects the
 * corrected structure, not the raw TEI div nesting. The importer parses the
 * real file and STOPS if what it finds disagrees with this table; nothing
 * here is used to override or reshape what was actually parsed (beyond that
 * one documented, verified split).
 */

export type TypeCode =
  | 'def'
  | 'post'
  | 'comm_not'
  | 'prop'
  | 'def1'
  | 'prop1'
  | 'def2'
  | 'prop2'
  | 'def3'
  | 'prop3';

export interface BookMeta {
  id: string;
  /** roman numeral, 'I'..'XIII' */
  number: string;
  /** EDITORIAL English book title (never source text) */
  en: string;
}

export const BOOK_TITLES: readonly BookMeta[] = [
  { id: 'book-1', number: 'I', en: 'Fundamentals of Plane Geometry: Triangles and Parallelograms' },
  { id: 'book-2', number: 'II', en: 'Geometric Algebra' },
  { id: 'book-3', number: 'III', en: 'Circles' },
  { id: 'book-4', number: 'IV', en: 'Constructions In and Around Circles' },
  { id: 'book-5', number: 'V', en: 'The Theory of Proportion (Eudoxus)' },
  { id: 'book-6', number: 'VI', en: 'Similar Figures' },
  { id: 'book-7', number: 'VII', en: 'Number Theory I: Divisibility and Greatest Common Measure' },
  { id: 'book-8', number: 'VIII', en: 'Number Theory II: Continued Proportions and Powers' },
  { id: 'book-9', number: 'IX', en: 'Number Theory III: Prime Numbers and Perfect Numbers' },
  { id: 'book-10', number: 'X', en: 'Incommensurable Magnitudes' },
  { id: 'book-11', number: 'XI', en: 'Solid Geometry: Fundamentals' },
  { id: 'book-12', number: 'XII', en: 'Measurement of Areas and Volumes by Exhaustion' },
  { id: 'book-13', number: 'XIII', en: 'The Five Regular (Platonic) Solids' },
];

export const ROMAN_BY_BOOK: Record<number, string> = Object.fromEntries(
  BOOK_TITLES.map((b, i) => [i + 1, b.number]),
);

export interface TypeMeta {
  /** the id suffix appended to `book-N-` for the section-type group Division */
  groupIdSuffix: string;
  /** the infix used in leaf ids: `book-N-<leafInfix>-<number>` */
  leafInfix: string;
  /** EDITORIAL English group label (never source text) */
  groupLabel: string;
  /** singular noun used in a non-proposition passage's figure citation (props never need this - see structure.ts note) */
  singular: string;
}

export const TYPE_META: Record<TypeCode, TypeMeta> = {
  def: { groupIdSuffix: 'definitions', leafInfix: 'def', groupLabel: 'Definitions', singular: 'Definition' },
  post: { groupIdSuffix: 'postulates', leafInfix: 'post', groupLabel: 'Postulates', singular: 'Postulate' },
  comm_not: { groupIdSuffix: 'common-notions', leafInfix: 'cn', groupLabel: 'Common Notions', singular: 'Common Notion' },
  prop: { groupIdSuffix: 'propositions', leafInfix: 'prop', groupLabel: 'Propositions', singular: 'Proposition' },
  def1: { groupIdSuffix: 'def1', leafInfix: 'def1', groupLabel: 'Definitions I', singular: 'Definition' },
  prop1: { groupIdSuffix: 'prop1', leafInfix: 'prop1', groupLabel: 'Propositions I', singular: 'Proposition' },
  def2: { groupIdSuffix: 'def2', leafInfix: 'def2', groupLabel: 'Definitions II', singular: 'Definition' },
  prop2: { groupIdSuffix: 'prop2', leafInfix: 'prop2', groupLabel: 'Propositions II', singular: 'Proposition' },
  def3: { groupIdSuffix: 'def3', leafInfix: 'def3', groupLabel: 'Definitions III', singular: 'Definition' },
  prop3: { groupIdSuffix: 'prop3', leafInfix: 'prop3', groupLabel: 'Propositions III', singular: 'Proposition' },
};

export function isTypeCode(s: string): s is TypeCode {
  return Object.prototype.hasOwnProperty.call(TYPE_META, s);
}

interface GroupGroundTruth {
  type: TypeCode;
  /** inclusive [from, to] range of printed numbers as they appear in the source */
  range: [number, number];
  /** printed numbers within `range` that are genuinely absent from the edition (documented gaps, not errors) */
  exclude?: number[];
}

interface BookGroundTruth {
  book: number;
  groups: GroupGroundTruth[];
}

/** Expected numbers for one group, in source order, as strings (e.g. ['1','2',...,'29','31',...,'48']). */
export function expectedNumbers(g: GroupGroundTruth): string[] {
  const excl = new Set(g.exclude ?? []);
  const out: string[] = [];
  for (let n = g.range[0]; n <= g.range[1]; n++) {
    if (!excl.has(n)) out.push(String(n));
  }
  return out;
}

export const GROUND_TRUTH: readonly BookGroundTruth[] = [
  { book: 1, groups: [
    { type: 'def', range: [1, 23] },
    { type: 'post', range: [1, 5] },
    { type: 'comm_not', range: [1, 9] },
    { type: 'prop', range: [1, 48] },
  ] },
  { book: 2, groups: [
    { type: 'def', range: [1, 2] },
    { type: 'prop', range: [1, 14] },
  ] },
  { book: 3, groups: [
    { type: 'def', range: [1, 11] },
    { type: 'prop', range: [1, 37] },
  ] },
  { book: 4, groups: [
    { type: 'def', range: [1, 7] },
    { type: 'prop', range: [1, 16] },
  ] },
  { book: 5, groups: [
    { type: 'def', range: [1, 18] },
    { type: 'prop', range: [1, 25] },
  ] },
  { book: 6, groups: [
    { type: 'def', range: [1, 5] },
    { type: 'prop', range: [1, 33] },
  ] },
  { book: 7, groups: [
    { type: 'def', range: [1, 22] },
    { type: 'prop', range: [1, 39] },
  ] },
  { book: 8, groups: [
    { type: 'prop', range: [1, 27] },
  ] },
  { book: 9, groups: [
    { type: 'prop', range: [1, 36] },
  ] },
  { book: 10, groups: [
    { type: 'def1', range: [1, 4] },
    { type: 'prop1', range: [1, 47] },
    { type: 'def2', range: [1, 6] },
    { type: 'prop2', range: [48, 84] },
    { type: 'def3', range: [1, 6] },
    { type: 'prop3', range: [85, 115] },
  ] },
  { book: 11, groups: [
    { type: 'def', range: [1, 28] },
    { type: 'prop', range: [1, 39] },
  ] },
  { book: 12, groups: [
    { type: 'prop', range: [1, 18] },
  ] },
  { book: 13, groups: [
    { type: 'prop', range: [1, 18] },
  ] },
];

/**
 * Total "number"-subtype (leaf) divs across the whole work. Cross-checked
 * against the real parse. 611, not the source TEI's naively-countable 607:
 * four propositions (Book I.30, Book II.7, Book X prop1.6, Book XII.7) are
 * genuinely present but mis-nested as extra <p> siblings inside the previous
 * proposition's still-open div rather than under their own numbered <div> -
 * confirmed by direct inspection of the source XML - and the importer splits
 * each one out into its own leaf division (see MISPLACED_SPLITS in
 * scripts/import-euclid/index.ts), so they count here as their own leaves.
 */
export const EXPECTED_TOTAL_LEAVES = 611;

/** Total bare <figure/> markers across the whole work (also the exact count of individually-logged <figure/> anomalies.json entries). */
export const EXPECTED_TOTAL_FIGURES = 498;

/**
 * Total distinct `Passage.figure` objects in work.json. This is LOWER than
 * EXPECTED_TOTAL_FIGURES: five <p> each contain two <figure/> markers
 * (Book VII prop.34, Book X prop2.71, Book XI prop.31, Book XII prop.5, Book
 * XIII prop.16), and this importer attaches both markers of such a pair to
 * the single Passage they both fall within (there is nowhere else to put a
 * second figure - PassageFigure is one-per-passage), rather than losing one.
 * All 498 markers are still individually logged in anomalies.json; only the
 * distinct-object count on Passage.figure is reduced by these five merges:
 * 498 - 5 = 493.
 */
export const EXPECTED_TOTAL_FIGURE_OBJECTS = 493;

/**
 * The one stray standalone combining diacritic (U+0342 COMBINING GREEK
 * PERISPOMENI, in "Σο͂") genuinely present, verbatim, in the fetched source -
 * inside Book XI, Proposition 31, alongside nine "#N" transcription-
 * placeholder artefacts (apparently substituting for an unencodable special
 * point-label character in the print, e.g. a primed letter). Both are
 * preserved exactly as transmitted, per this app's standing "never silently
 * correct the source" policy - see the About page "Known gaps & anomalies".
 */
export const EXPECTED_COMBINING_MARK_HITS = 1;

/**
 * The five leaf divisions whose entire content is marked <del> in the
 * source: Heiberg's own critical judgement that the wording is a later
 * interpolation, not Euclid's. Verified directly against Heiberg's 1883
 * printed page (vol. I p. 10: Book I's Common Notions IV-VI, and p. ~193:
 * Book VI's Definitions II and V, each set in square brackets) - Heiberg
 * PRINTS this material, he does not omit it. The importer therefore keeps
 * his own bracketed wording as these five leaves' passage text (rather than
 * leaving them blank), each flagged with a Passage.anomaly whose text starts
 * with BRACKETED_INTERPOLATION_ANOMALY_PREFIX - see the About page "Known
 * gaps & anomalies" section and VALIDATION_REPORT.md.
 */
export const BRACKETED_INTERPOLATION_LEAVES: readonly string[] = [
  'book-1-cn-4',
  'book-1-cn-5',
  'book-1-cn-6',
  'book-6-def-2',
  'book-6-def-5',
];

/**
 * Stable prefix for the Passage.anomaly text the importer attaches to each
 * of BRACKETED_INTERPOLATION_LEAVES' passage, shared with validate.ts so the
 * two can never drift apart (the importer writes it, the validator matches
 * on it to confirm the flag lands on exactly - and only - these five leaves).
 */
export const BRACKETED_INTERPOLATION_ANOMALY_PREFIX =
  "Bracketed in Heiberg's printed edition";
