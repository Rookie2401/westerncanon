/**
 * Shared output-writing helper for this Dante import batch: writes
 * data/<workId>/{work.json, about.json, anomalies.json, types.ts}
 * deterministically (no clock, no directory iteration), so re-running any
 * importer twice produces byte-identical files.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsonText } from './text.ts';
import { typesFileContent } from './typesTemplate.ts';
import type { Anomaly, GenericWork, WorkAbout } from './genericTypes.ts';

export function writeWorkOutputs(outDir: string, work: GenericWork, about: WorkAbout, anomalies: Anomaly[]): void {
  mkdirSync(outDir, { recursive: true });
  const files: Array<[string, string]> = [
    ['work.json', jsonText(work)],
    ['about.json', jsonText(about)],
    ['anomalies.json', jsonText(anomalies)],
    ['types.ts', typesFileContent(work.language)],
  ];
  for (const [name, content] of files) {
    const file = join(outDir, name);
    writeFileSync(file, content, 'utf8');
    process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
  }
}

export function countChars(work: GenericWork): number {
  let total = 0;
  const walk = (divs: GenericWork['divisions']): void => {
    for (const d of divs) {
      for (const p of d.passages) total += p.text.length;
      walk(d.children);
    }
  };
  walk(work.divisions);
  return total;
}
