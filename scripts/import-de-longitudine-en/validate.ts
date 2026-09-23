/**
 * Validation for data/de-longitudine-en/.
 *
 *   npx tsx scripts/import-de-longitudine-en/validate.ts
 *
 * Writes data/de-longitudine-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-longitudine-en",
  dir: join(REPO_ROOT, 'data', "de-longitudine-en"),
  translator: "G. R. T. Ross",
  shape: 'flat',
  reportTitle: "On Longevity and Shortness of Life (English, G. R. T. Ross 1908)",
  expected: [{ chapters: [1, 2, 3, 4, 5, 6] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "The reasons for some animals being long-lived and other",
  explicit: "ould complete our course of study on animals.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["COMPLETE", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-longevity-and-shortness-of-life.json"],
  },
});
