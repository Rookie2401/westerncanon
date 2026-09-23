/**
 * Validation for data/de-somno-en/.
 *
 *   npx tsx scripts/import-de-somno-en/validate.ts
 *
 * Writes data/de-somno-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-somno-en",
  dir: join(REPO_ROOT, 'data', "de-somno-en"),
  translator: "John Isaac Beare",
  shape: 'flat',
  reportTitle: "On Sleep and Sleeplessness (English, Beare 1908)",
  expected: [{ chapters: [1, 2, 3] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "With regard to sleep and waking, we must consider what ",
  explicit: "ovement tends to the conservation of animals.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["COMPLETE", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-sleep-and-sleeplessness.json"],
  },
});
