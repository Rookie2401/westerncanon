/**
 * Validation for data/de-oratore-la/.
 *
 *   npx tsx scripts/import-de-oratore-la/validate.ts
 *
 * Writes data/de-oratore-la/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero on any ERROR-level finding. See
 * scripts/import-cicero-rhetorica-shared/validateCommon.ts for the shared
 * generic-shape checks this wraps.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printSummary, validateGenericWork, writeReport } from '../import-cicero-rhetorica-shared/validateCommon.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'de-oratore-la');

const EXPECTED_SECTION_COUNTS = [265, 367, 230];

function main(): void {
  const report = validateGenericWork({
    workId: 'de-oratore-la',
    dir: DIR,
    expectLang: 'la',
    spotStart: 'Cogitanti mihi saepe numero et memoria vetera repetenti',
    spotEnd: 'nosque curemus et aliquando ab hac contentione disputationis animos nostros curamque laxemus.',
    expectAllDivisionRefsNull: true,
    expectAllPassageRefsNull: true,
    extraChecks: (work, findings, extra) => {
      const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
      const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

      if (work.divisions.length !== 3) err('book-count', `expected 3 books, got ${work.divisions.length}`);
      work.divisions.forEach((b, i) => {
        if (b.id !== `book-${i + 1}`) err('book-id', `book ${i} has id ${JSON.stringify(b.id)}, expected book-${i + 1}`);
        const want = EXPECTED_SECTION_COUNTS[i];
        if (b.children.length !== want) err('section-count', `${b.id}: expected ${want} sections, got ${b.children.length}`);
        b.children.forEach((c, j) => {
          if (c.id !== `${b.id}-sec-${j + 1}`) err('section-id', `${b.id} position ${j}: id ${JSON.stringify(c.id)}, expected ${b.id}-sec-${j + 1}`);
          if (c.number !== String(j + 1)) err('section-number', `${c.id}: number ${JSON.stringify(c.number)}, expected ${j + 1}`);
        });
        if (!b.sourceHeading) warn('book-heading', `${b.id}: no sourceHeading captured`);
      });

      // known bibliographic constants
      if (work.divisions.some((b) => b.ref !== null)) err('book-ref', 'a book division carries a non-null ref (this source has no milestones at all)');

      extra.push(`books: ${work.divisions.map((b) => `${b.id}=${b.children.length}`).join(', ')}`);
    },
  });

  writeReport(report);
  printSummary(report);
  if (report.findings.some((f) => f.level === 'ERROR')) process.exit(1);
}

main();
