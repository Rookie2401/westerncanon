/** Minimal roman-numeral -> arabic converter for chapter numbers up to a few
 *  dozen (Ashmand's Book I runs to XXVII) - throws on anything it can't
 *  parse rather than guessing. */
const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanToArabic(roman: string): number {
  const s = roman.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) throw new Error(`romanToArabic: not a roman numeral: ${JSON.stringify(roman)}`);
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = VALUES[s[i]!]!;
    const next = i + 1 < s.length ? VALUES[s[i + 1]!]! : 0;
    if (cur < next) total -= cur;
    else total += cur;
  }
  if (total <= 0) throw new Error(`romanToArabic: parsed non-positive value from ${JSON.stringify(roman)}`);
  return total;
}
