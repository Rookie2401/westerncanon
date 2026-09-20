/**
 * Validation for data/ad-atticum-selection-en/ (English).
 *   npm run validate:ad-atticum-selection-en
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-atticum-selection-en',
  language: 'en',
  dataDir: join(REPO_ROOT, 'data', 'ad-atticum-selection-en'),
  requiredIds: [
    'letter-2-19', 'letter-3-10', 'letter-3-15', 'letter-7-10', 'letter-7-11', 'letter-9-10',
    'letter-12-1', 'letter-12-53', 'letter-13-1', 'letter-13-52', 'letter-14-1', 'letter-14-22',
    'letter-15-1a', 'letter-15-29', 'letter-16-1', 'letter-16-16f',
  ],
  minDivisionCount: 185,
  spotChecks: [
    { id: 'letter-2-19', startsWith: 'I have many causes for anxiety, both from the disturbed state of polit' },
    { id: 'letter-16-16f', endsWith: 'I earnestly and repeatedly beg you to do so.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
