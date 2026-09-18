/**
 * Small shared helpers for the four Homer importers. Text cleaning itself
 * (entity decoding + whitespace collapse, no orthography/spelling changes)
 * reuses the repo's existing scripts/import-isagoge-shared/text.ts - see that
 * file's own doc comment for the exact rules.
 */

export { cleanText, decodeEntities, collapseWs } from '../import-isagoge-shared/text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

/** Trim a verbatim excerpt for an anomaly note (never used for reading text itself). */
export function excerpt(s: string, max = 160): string {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
}
