/**
 * Validation for data/ad-brutum-selection-la/ (Latin).
 *   npm run validate:ad-brutum-selection-la
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-brutum-selection-la',
  language: 'la',
  dataDir: join(REPO_ROOT, 'data', 'ad-brutum-selection-la'),
  requiredIds: ['letter-1-16', 'letter-1-17'],
  minDivisionCount: 2,
  spotChecks: [
    { id: 'letter-1-16', startsWith: 'particulam litterularum tuarum, quas misisti Octavio' },
    { id: 'letter-1-17', endsWith: 'et hominem noro et quid sibi voluerit.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
