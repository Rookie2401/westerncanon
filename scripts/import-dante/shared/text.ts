/**
 * Small shared helpers for the Dante import batch (scripts/import-dante/*).
 *
 * Mirrors the cleanText()/Anomaly conventions already used elsewhere in this
 * repo's importers (see e.g. scripts/import-aristotle-rest-en-shared/text.ts)
 * rather than inventing a new one.
 */

export interface Anomaly {
  where: string;
  note: string;
}

/** Collapse runs of whitespace within a line, trim the line, and normalise to NFC. */
export function cleanText(s: string): string {
  return s.replace(/[ \t]+/g, ' ').trim().normalize('NFC');
}

/** Roman numeral (I..MMM, uppercase) -> integer. Throws on anything unrecognised. */
export function romanToArabic(roman: string, where: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = VALUES[roman[i]!.toUpperCase()];
    const next = VALUES[(roman[i + 1] ?? '').toUpperCase()];
    if (cur === undefined) {
      process.stderr.write(`STOP (${where}): unrecognised roman numeral "${roman}"\n`);
      process.exit(1);
    }
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  if (total <= 0) {
    process.stderr.write(`STOP (${where}): roman numeral "${roman}" resolved to ${total}\n`);
    process.exit(1);
  }
  return total;
}

/** Write `data` as pretty-printed JSON (2-space indent, trailing newline). */
export function jsonText(data: unknown): string {
  return JSON.stringify(data, null, 2) + '\n';
}
