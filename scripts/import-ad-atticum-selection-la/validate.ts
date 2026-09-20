/**
 * Validation for data/ad-atticum-selection-la/ (Latin).
 *   npm run validate:ad-atticum-selection-la
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-atticum-selection-la',
  language: 'la',
  dataDir: join(REPO_ROOT, 'data', 'ad-atticum-selection-la'),
  requiredIds: [
    'letter-2-19', 'letter-3-10', 'letter-3-15', 'letter-7-10', 'letter-7-11', 'letter-9-10',
    'letter-12-1', 'letter-12-53', 'letter-13-1', 'letter-13-52', 'letter-14-1', 'letter-14-22',
    'letter-15-1', 'letter-15-29', 'letter-16-1', 'letter-16-16f',
  ],
  minDivisionCount: 195,
  spotChecks: [
    { id: 'letter-2-19', startsWith: 'multa me sollicitant et ex rei publicae tanto motu' },
    { id: 'letter-16-16f', endsWith: 'quod ut facias te vehementer etiam atque etiam rogo.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
