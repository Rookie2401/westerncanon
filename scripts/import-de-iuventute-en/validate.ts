/**
 * Validation for data/de-iuventute-en/.
 *
 *   npx tsx scripts/import-de-iuventute-en/validate.ts
 *
 * Writes data/de-iuventute-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-iuventute-en",
  dir: join(REPO_ROOT, 'data', "de-iuventute-en"),
  translator: "G. R. T. Ross",
  shape: 'flat',
  reportTitle: "On Youth and Old Age, On Life and Death (English, G. R. T. Ross 1908)",
  expected: [{ chapters: [1, 2, 3, 4, 5, 6, 23, 24, 25, 26, 27] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "We must now treat of youth and old age and life and dea",
  explicit: "nclude with an account of medical principles.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["On Breathing", "de-respiratione-en", "numbering", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-youth-and-old-age.json", "on-life-and-death.json"],
  },
});
