/**
 * Validation for data/de-caelo-en/.
 *
 *   npx tsx scripts/import-de-caelo-en/validate.ts
 *
 * Writes data/de-caelo-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

runValidation({
  workId: 'de-caelo-en',
  dir: join(REPO_ROOT, 'data', 'de-caelo-en'),
  translator: 'John Leofric Stocks',
  shape: 'book-chapter',
  reportTitle: 'On the Heavens (English, Stocks 1922)',
  expected: [
    { book: '1', chapters: run(12) },
    { book: '2', chapters: run(14) },
    { book: '3', chapters: run(8) },
    { book: '4', chapters: run(6) },
  ],
  // Verbatim first and last words of the edition, as printed by the source.
  incipit: 'The science which has to do with nature clearly concerns itself',
  explicit: 'of the phenomena connected with them.',
  expectBekkerRefs: false,
  requiredAnomalyTopics: ['SUPPLEMENTED', 'Bekker', 'footnote', 'ordinary wikitext'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["on-the-heavens-book-1.json", "on-the-heavens-book-2.json", "on-the-heavens-book-3.json", "on-the-heavens-book-4.json"],
  },
});
