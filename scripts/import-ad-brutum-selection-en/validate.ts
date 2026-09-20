/**
 * Validation for data/ad-brutum-selection-en/ (English).
 *   npm run validate:ad-brutum-selection-en
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-brutum-selection-en',
  language: 'en',
  dataDir: join(REPO_ROOT, 'data', 'ad-brutum-selection-en'),
  requiredIds: ['letter-1-16', 'letter-1-17'],
  minDivisionCount: 2,
  spotChecks: [
    { id: 'letter-1-16', startsWith: 'I have read an extract from your letter to Octavius' },
    { id: 'letter-1-17', endsWith: 'I know the man and his views.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
