/**
 * Validation for data/ad-familiares-selection-la/ (Latin).
 *   npm run validate:ad-familiares-selection-la
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-familiares-selection-la',
  language: 'la',
  dataDir: join(REPO_ROOT, 'data', 'ad-familiares-selection-la'),
  requiredIds: [
    'letter-1-9', 'letter-4-5', 'letter-4-6', 'letter-5-12', 'letter-7-1',
    'letter-9-16', 'letter-9-17', 'letter-9-18', 'letter-9-19', 'letter-9-20',
    'letter-9-21', 'letter-9-22', 'letter-9-23', 'letter-9-24', 'letter-9-25', 'letter-9-26',
    'letter-10-1', 'letter-14-1', 'letter-14-2', 'letter-14-3', 'letter-14-4',
  ],
  minDivisionCount: 55,
  spotChecks: [
    { id: 'letter-1-9', startsWith: 'periucundae mihi fuerunt litterae tuae' },
    { id: 'letter-14-4', endsWith: 'filiola et spes reliqua nostra, Cicero, valete. Pr. K. Mai. Brundisio.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
