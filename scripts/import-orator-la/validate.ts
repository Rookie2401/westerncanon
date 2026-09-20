/**
 * Validation for data/orator-la/.
 *
 *   npx tsx scripts/import-orator-la/validate.ts
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printSummary, validateGenericWork, writeReport } from '../import-cicero-rhetorica-shared/validateCommon.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'orator-la');

function main(): void {
  const report = validateGenericWork({
    workId: 'orator-la',
    dir: DIR,
    expectLang: 'la',
    spotStart: 'Utrum difficilius aut maius esset negare tibi saepius idem roganti',
    spotEnd: 'verecundia negandi scribendi me impudentiam suscepisse.',
    expectAllDivisionRefsNull: false,
    expectAllPassageRefsNull: true,
    extraChecks: (work, findings, extra) => {
      const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
      const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

      if (work.divisions.length !== 238) err('section-count', `expected 238 sections, got ${work.divisions.length}`);
      if (work.divisions.some((d) => d.children.length !== 0)) err('flat', 'a division carries children (expected a flat, one-level tree)');
      work.divisions.forEach((d, i) => {
        if (d.id !== `sec-${i + 1}`) err('section-id', `position ${i}: id ${JSON.stringify(d.id)}, expected sec-${i + 1}`);
        if (d.number !== String(i + 1)) err('section-number', `${d.id}: number ${JSON.stringify(d.number)}, expected ${i + 1}`);
      });
      const withRef = work.divisions.filter((d) => d.ref !== null).length;
      if (withRef === 0) err('milestone-refs', 'no section carries a non-null ref; expected chapter-milestone refs on most sections');
      if (work.divisions.some((d) => d.ref !== null && !/^\d+$/.test(d.ref))) err('ref-shape', 'a non-null division ref is not a plain arabic numeral string');
      let prev = 0;
      let monotonic = true;
      for (const d of work.divisions) {
        if (d.ref === null) continue;
        const n = Number(d.ref);
        if (n < prev) monotonic = false;
        prev = n;
      }
      if (!monotonic) warn('ref-monotonic', 'chapter-milestone refs are not monotonically non-decreasing across the flat section sequence');

      extra.push(`sections with a non-null (chapter-milestone) ref: ${withRef} / ${work.divisions.length}`);
    },
  });

  writeReport(report);
  printSummary(report);
  if (report.findings.some((f) => f.level === 'ERROR')) process.exit(1);
}

main();
