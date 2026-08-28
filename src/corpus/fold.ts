/**
 * Diacritic folding for search. This MUST stay in lockstep with the folding the
 * import pipeline applied when building `search-index.json` (see
 * scripts/import-summa/normalize.ts `foldForSearch`), otherwise queries would
 * not line up with `record.text`:
 *
 *   - lowercase
 *   - ligatures: `æ -> ae`, `œ -> oe`, `ß -> ss`
 *   - Unicode NFKD, then strip combining marks (U+0300–U+036F)
 *   - collapse whitespace, trim
 */
export function fold(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a folded query into word tokens (letters/digits, ligatures already expanded). */
export function tokenize(folded: string): string[] {
  return folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
