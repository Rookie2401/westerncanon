/**
 * Validation for data/ad-quintum-fratrem-selection-en/ (English).
 *   npm run validate:ad-quintum-fratrem-selection-en
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-quintum-fratrem-selection-en',
  language: 'en',
  dataDir: join(REPO_ROOT, 'data', 'ad-quintum-fratrem-selection-en'),
  requiredIds: ['letter-1-1'],
  minDivisionCount: 1,
  spotChecks: [
    { id: 'letter-1-1', startsWith: 'Though I have no doubt that many messengers, and even common rumour' },
    { id: 'letter-1-1', endsWith: 'if you wish me and all your friends to be well also. Farewell.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
