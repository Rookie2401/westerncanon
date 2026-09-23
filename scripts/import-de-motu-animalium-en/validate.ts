/**
 * Validation for data/de-motu-animalium-en/.
 *
 *   npx tsx scripts/import-de-motu-animalium-en/validate.ts
 *
 * Writes data/de-motu-animalium-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-motu-animalium-en",
  dir: join(REPO_ROOT, 'data', "de-motu-animalium-en"),
  translator: "A. S. L. Farquharson",
  shape: 'flat',
  reportTitle: "On the Motion of Animals (English, Farquharson 1912)",
  expected: [{ chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "ELSEWHERE we have investigated in detail the movement o",
  explicit: "al; it remains to speak of animal generation.",
  expectBekkerRefs: true,
  requiredAnomalyTopics: ["CONTENT-VERIFIED", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-the-movement-of-animals.json"],
  },
});
