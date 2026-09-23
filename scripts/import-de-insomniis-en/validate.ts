/**
 * Validation for data/de-insomniis-en/.
 *
 *   npx tsx scripts/import-de-insomniis-en/validate.ts
 *
 * Writes data/de-insomniis-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-insomniis-en",
  dir: join(REPO_ROOT, 'data', "de-insomniis-en"),
  translator: "John Isaac Beare",
  shape: 'flat',
  reportTitle: "On Dreams (English, Beare 1908)",
  expected: [{ chapters: [1, 2, 3] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "We must, in the next place, investigate the subject of ",
  explicit: " non-dreaming to dreaming] should occur also.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["Thomas Browne", "COMPLETE", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-dreams-aristotle.json"],
  },
});
