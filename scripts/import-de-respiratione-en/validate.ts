/**
 * Validation for data/de-respiratione-en/.
 *
 *   npx tsx scripts/import-de-respiratione-en/validate.ts
 *
 * Writes data/de-respiratione-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-respiratione-en",
  dir: join(REPO_ROOT, 'data', "de-respiratione-en"),
  translator: "G. R. T. Ross",
  shape: 'flat',
  reportTitle: "On Breathing (English, G. R. T. Ross 1908)",
  expected: [{ chapters: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "A few of the previous physical philosophers have spoken",
  explicit: "ng to discase or old age, their death ensues.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["de-iuventute-en", "numbering", "Empedocles", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-breathing.json"],
  },
});
