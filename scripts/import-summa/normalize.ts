/**
 * Text normalization for Latin lemma content.
 *
 * The XML parser already decodes standard entities (`&amp;` etc). Here we:
 *  - collapse all internal whitespace / newlines to single spaces
 *  - trim
 * The source stores one block of text per lemma (no meaningful paragraph
 * breaks), so no paragraph handling is required.
 */

/** Collapse whitespace and trim. Returns `''` for nullish input. */
export function cleanText(input: string | null | undefined): string {
  if (input == null) return '';
  return String(input).replace(/\s+/g, ' ').trim();
}

/**
 * Diacritic-fold a string for search: lowercase, expand ligatures
 * (`oe`/`ae`), strip combining accents. This deliberately changes string
 * length, so folded offsets do not map back to the original.
 */
export function foldForSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, 'ae') // æ
    .replace(/œ/g, 'oe') // œ
    .replace(/ß/g, 'ss') // ß
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Substrings that must never appear in clean output. Used by the validator.
 * The Dutch stopwords carry surrounding spaces to avoid colliding with Latin.
 */
export const FORBIDDEN_SUBSTRINGS: readonly string[] = [
  '<',
  '>',
  'http',
  'source-file',
  'xmlns',
  ' het ',
  ' een ',
  ' niet ',
  ' wordt ',
];

/** Return the list of forbidden substrings found in `text` (case-insensitive for the words). */
export function findForbidden(text: string): string[] {
  const hay = text.toLowerCase();
  const hits: string[] = [];
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    if (bad === '<' || bad === '>') {
      if (text.includes(bad)) hits.push(bad);
    } else if (hay.includes(bad)) {
      hits.push(bad.trim());
    }
  }
  return hits;
}
