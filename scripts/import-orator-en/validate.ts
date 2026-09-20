/**
 * Validation for data/orator-en/.
 *
 *   npx tsx scripts/import-orator-en/validate.ts
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printSummary, validateGenericWork, writeReport } from '../import-cicero-rhetorica-shared/validateCommon.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'orator-en');

function main(): void {
  const report = validateGenericWork({
    workId: 'orator-en',
    dir: DIR,
    expectLang: 'en',
    spotStart: 'Which, my Brutus, would be the most difficult talk',
    spotEnd: 'my abilities are unequal.',
    expectAllDivisionRefsNull: true,
    expectAllPassageRefsNull: true,
    extraChecks: (work, findings, extra) => {
      const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
      const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

      if (work.divisions.length < 5) err('chunk-count', `expected at least a handful of chunks, got ${work.divisions.length}`);
      if (work.divisions.some((d) => d.children.length !== 0)) err('flat', 'a division carries children (expected a flat, one-level tree)');
      work.divisions.forEach((d, i) => {
        if (d.id !== `sec-${i + 1}`) err('chunk-id', `position ${i}: id ${JSON.stringify(d.id)}, expected sec-${i + 1}`);
        if (d.number !== String(i + 1)) err('chunk-number', `${d.id}: number ${JSON.stringify(d.number)}, expected ${i + 1}`);
      });
      for (const d of work.divisions) {
        const t = d.passages[0]?.text ?? '';
        if (/\[footnote:/i.test(t)) err('leftover-footnote', `${d.id}: contains an un-stripped [Footnote: ...] span`);
        if (t.includes('_')) err('leftover-underscore', `${d.id}: contains an un-stripped underscore`);
        if (/\*\*\*\s*(START|END) OF THE PROJECT GUTENBERG/i.test(t)) err('leftover-boilerplate', `${d.id}: contains Gutenberg boilerplate`);
        if (/^\s*\*(\s*\*)+\s*$/.test(t)) err('leftover-ornament', `${d.id}: passage is only a decorative asterisk ornament`);
      }
      const sizes = work.divisions.map((d) => d.passages[0]?.text.length ?? 0);
      const maxSize = Math.max(...sizes);
      if (maxSize > 40000) warn('chunk-size', `largest chunk is ${maxSize} chars (target was ~15000; a single long paragraph can exceed it, but this is unusually large)`);

      extra.push(`chunk sizes: min ${Math.min(...sizes)}, max ${maxSize}, mean ${Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)}`);
    },
  });

  writeReport(report);
  printSummary(report);
  if (report.findings.some((f) => f.level === 'ERROR')) process.exit(1);
}

main();
