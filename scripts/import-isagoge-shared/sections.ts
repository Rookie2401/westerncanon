/**
 * Canonical ordered section table for Porphyry's *Isagoge*, used by BOTH the
 * Greek (Busse 1887) and the Latin (Boethius) importers so the two independent
 * works line up 1:1 visually.
 *
 * - `id`     : division slug. Identical id set in both works.
 * - `number` : roman numeral as printed in the Latin edition ('I'..'XXVI');
 *              null for the preface.
 * - `en`     : EDITORIAL English title. This is an editorial paraphrase of the
 *              Latin rubric, never source text; it lives in the data only as the
 *              `editorialTitle` field.
 *
 * There are 27 entries: the preface plus 26 numbered sections. Both sources
 * carry exactly 26 section headings after their preface; if an importer detects
 * a different count it must STOP rather than guess the alignment.
 */

export interface SectionMeta {
  id: string;
  number: string | null;
  en: string;
}

export const SECTIONS: readonly SectionMeta[] = [
  { id: 'praefatio', number: null, en: 'Preface' },
  { id: 'de-genere', number: 'I', en: 'On Genus' },
  { id: 'de-specie', number: 'II', en: 'On Species' },
  { id: 'de-differentia', number: 'III', en: 'On Differentia' },
  { id: 'de-proprio', number: 'IV', en: 'On Property' },
  { id: 'de-accidente', number: 'V', en: 'On Accident' },
  { id: 'sec-vi', number: 'VI', en: 'Features Common to All Five' },
  { id: 'sec-vii', number: 'VII', en: 'Genus and Differentia: Common Features' },
  { id: 'sec-viii', number: 'VIII', en: 'Genus and Differentia: Differences' },
  { id: 'sec-ix', number: 'IX', en: 'Genus and Species: Common Features' },
  { id: 'sec-x', number: 'X', en: 'Genus and Species: Distinctive Features' },
  { id: 'sec-xi', number: 'XI', en: 'Genus and Property: Common Features' },
  { id: 'sec-xii', number: 'XII', en: 'Genus and Property: Distinctive Features' },
  { id: 'sec-xiii', number: 'XIII', en: 'Genus and Accident: Common Features' },
  { id: 'sec-xiv', number: 'XIV', en: 'Genus and Accident: Distinctive Features' },
  { id: 'sec-xv', number: 'XV', en: 'Differentia and Species: Common Features' },
  { id: 'sec-xvi', number: 'XVI', en: 'Species and Differentia: Differences' },
  { id: 'sec-xvii', number: 'XVII', en: 'Differentia and Property: Common Features' },
  { id: 'sec-xviii', number: 'XVIII', en: 'Property and Differentia: Differences' },
  { id: 'sec-xix', number: 'XIX', en: 'Differentia and Accident: Common Features' },
  { id: 'sec-xx', number: 'XX', en: 'Differentia and Accident: Distinctive Features' },
  { id: 'sec-xxi', number: 'XXI', en: 'Species and Property: Common Features' },
  { id: 'sec-xxii', number: 'XXII', en: 'Species and Property: Distinctive Features' },
  { id: 'sec-xxiii', number: 'XXIII', en: 'Species and Accident: Common Features' },
  { id: 'sec-xxiv', number: 'XXIV', en: 'Species and Accident: Distinctive Features' },
  { id: 'sec-xxv', number: 'XXV', en: 'Property and Inseparable Accident: Common Features' },
  { id: 'sec-xxvi', number: 'XXVI', en: 'Property and Inseparable Accident: Distinctive Features' },
];

/** The 26 section ids that follow the preface, in order. */
export const NUMBERED_SECTION_IDS: readonly string[] = SECTIONS.slice(1).map((s) => s.id);

/** All 27 division ids in order (preface first). */
export const ALL_SECTION_IDS: readonly string[] = SECTIONS.map((s) => s.id);
