/** Minimal roman-numeral helpers for cross-checking printed chapter numbers
 *  (both Confessions importers print roman numerals in running prose that
 *  must line up with the plain arabic chapter index derived from the page
 *  title / heading-group position). Only needs to cover 1..99, comfortably
 *  more than the largest chapter count in either edition (43). */

const ROMAN_TABLE: readonly [number, string][] = [
  [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 100) throw new Error(`toRoman: out of supported range: ${n}`);
  let rem = n;
  let out = '';
  for (const [value, sym] of ROMAN_TABLE) {
    while (rem >= value) {
      out += sym;
      rem -= value;
    }
  }
  return out;
}

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

export function fromRoman(s: string): number {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN_VALUES[s[i]!];
    if (v === undefined) throw new Error(`fromRoman: invalid character "${s[i]}" in "${s}"`);
    const next = ROMAN_VALUES[s[i + 1] ?? ''];
    if (next !== undefined && next > v) total -= v;
    else total += v;
  }
  return total;
}
