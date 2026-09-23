/**
 * Validation for data/virtues-and-vices-en/.
 *
 *   npx tsx scripts/import-virtues-and-vices-en/validate.ts
 *
 * Writes data/virtues-and-vices-en/VALIDATION_REPORT.md, prints a summary,
 * and exits non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 *
 * The expected chapter list is a gapless 1-8. An earlier build asserted
 * 1-5, 7-8 here, having failed to read chapter 6 (whose opening the source
 * emits outside any <p>, at a scanned page boundary); asserting the full run
 * means that regression would now FAIL rather than pass unnoticed.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: 'virtues-and-vices-en',
  dir: join(REPO_ROOT, 'data', 'virtues-and-vices-en'),
  translator: 'Joseph Solomon',
  shape: 'flat',
  reportTitle: 'Virtues and Vices (English, Solomon — pseudo-Aristotle)',
  expected: [{ chapters: [1, 2, 3, 4, 5, 6, 7, 8] }],
  incipit: 'The noble is the object of praise, the base of blame',
  explicit: 'belong to the class of the blameable.',
  expectBekkerRefs: true,
  requiredAnomalyTopics: ['PSEUDO-ARISTOTLE', 'FLAT', 'COMPLETE', 'footnote', 'Bekker'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "page-scan",
    rawDir: join(HERE, 'raw'),
    files: ["virtues-and-vices.parse.json"],
    furnitureExact: ["DE VIRTUTIBUS ET VITIIS"],
  },
});
