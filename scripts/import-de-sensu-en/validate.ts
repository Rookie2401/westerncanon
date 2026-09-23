/**
 * Validation for data/de-sensu-en/.
 *
 *   npx tsx scripts/import-de-sensu-en/validate.ts
 *
 * Writes data/de-sensu-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-sensu-en",
  dir: join(REPO_ROOT, 'data', "de-sensu-en"),
  translator: "John Isaac Beare",
  shape: 'flat',
  reportTitle: "On Sense and the Sensible (English, Beare 1908)",
  expected: [{ chapters: [1, 2, 3, 4, 5, 6, 7] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "Having now definitely considered the soul, by itself, a",
  explicit: "irst consider that of memory and remembering.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["parent page", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-sense-and-the-sensible-section-1.json", "on-sense-and-the-sensible-section-2.json"],
  },
});
