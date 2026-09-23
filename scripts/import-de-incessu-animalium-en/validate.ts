/**
 * Validation for data/de-incessu-animalium-en/.
 *
 *   npx tsx scripts/import-de-incessu-animalium-en/validate.ts
 *
 * Writes data/de-incessu-animalium-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-incessu-animalium-en",
  dir: join(REPO_ROOT, 'data', "de-incessu-animalium-en"),
  translator: "A. S. L. Farquharson",
  shape: 'flat',
  reportTitle: "On the Gait of Animals (English, Farquharson 1912)",
  expected: [{ chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "We have now to consider the parts which are useful to a",
  explicit: "o investigate the problems of Life and Death.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["CONTENT-VERIFIED", "redirect", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-the-progression-of-animals.json"],
  },
});
