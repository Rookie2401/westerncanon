/**
 * Validation for data/de-divinatione-per-somnum-en/.
 *
 *   npx tsx scripts/import-de-divinatione-per-somnum-en/validate.ts
 *
 * Writes data/de-divinatione-per-somnum-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: "de-divinatione-per-somnum-en",
  dir: join(REPO_ROOT, 'data', "de-divinatione-per-somnum-en"),
  translator: "John Isaac Beare",
  shape: 'flat',
  reportTitle: "On Prophesying by Dreams (English, Beare 1908)",
  expected: [{ chapters: [1, 2] }],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: "As to the divination which takes place in sleep, and is",
  explicit: "in every form of it, have now been discussed.",
  expectBekkerRefs: false,
  requiredAnomalyTopics: ["COMPLETE", "SIC", "Bekker", "footnote", "ordinary wikitext"],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-prophesying-by-dreams.json"],
  },
});
