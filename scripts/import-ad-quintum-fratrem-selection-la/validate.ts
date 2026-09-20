/**
 * Validation for data/ad-quintum-fratrem-selection-la/ (Latin).
 *   npm run validate:ad-quintum-fratrem-selection-la
 * See scripts/import-cicero-letters-shared/validateCore.ts for what is checked.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWork, writeReport, printSummaryAndExit, type WorkValidationSpec } from '../import-cicero-letters-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SPEC: WorkValidationSpec = {
  workId: 'ad-quintum-fratrem-selection-la',
  language: 'la',
  dataDir: join(REPO_ROOT, 'data', 'ad-quintum-fratrem-selection-la'),
  requiredIds: ['letter-1-1'],
  minDivisionCount: 1,
  spotChecks: [
    { id: 'letter-1-1', startsWith: 'etsi non dubitabam quin hanc epistulam multi nuntii' },
    { id: 'letter-1-1', endsWith: 'diligentissime servias.' },
  ],
};

const report = validateWork(SPEC);
writeReport(report);
printSummaryAndExit([report]);
