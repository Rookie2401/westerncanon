/**
 * Validation for data/eudemian-ethics-en/.
 *
 *   npx tsx scripts/import-eudemian-ethics-en/validate.ts
 *
 * Writes data/eudemian-ethics-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 *
 * Note the expected book list: 1, 2, 3, 7 — NOT 1, 2, 3, 4. Books IV-VI of
 * the Eudemian Ethics are the "common books", identical with Nicomachean
 * Ethics V-VII, and were never translated by Solomon; the validator asserts
 * that absence deliberately, and requires anomalies.json to document it, so
 * that a future run which quietly "filled in" those books from elsewhere
 * would FAIL rather than pass unnoticed.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

runValidation({
  workId: 'eudemian-ethics-en',
  dir: join(REPO_ROOT, 'data', 'eudemian-ethics-en'),
  translator: 'Joseph Solomon',
  shape: 'book-chapter',
  reportTitle: 'Eudemian Ethics (English, Solomon — Books I, II, III, VII only)',
  // Gapless runs. An earlier build asserted 1-5/7-11 for Book II, 1/3-6 for
  // Book III and 1-12 for Book VII, having failed to read chapter openings the
  // source emits outside any <p> and, for Book VII, an entire second
  // transclusion block holding chapters 13-15. Asserting the full runs means
  // those regressions would now FAIL rather than pass unnoticed.
  expected: [
    { book: '1', chapters: [1, 2, 3, 4, 5, 6, 7, 8] },
    { book: '2', chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    { book: '3', chapters: [1, 2, 3, 4, 5, 6, 7] },
    { book: '7', chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  ],
  incipit: "The man who stated his judgement in the god's precinct in",
  explicit: 'than if he thought himself to be always unhappy.',
  expectBekkerRefs: true,
  requiredAnomalyTopics: ['BOOKS IV, V AND VI ARE NOT PRESENT', 'nicomachean-ethics-en', 'book 8', 'footnote', 'Bekker'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "page-scan",
    rawDir: join(HERE, 'raw'),
    files: ["eudemian-ethics-book-1.parse.json", "eudemian-ethics-book-2.parse.json", "eudemian-ethics-book-3.parse.json", "eudemian-ethics-book-7.parse.json"],
    furnitureExact: ["ETHICA EUDEMIA", "BOOK I", "BOOK II", "BOOK III", "BOOK VII", "BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII."],
  },
});
