/**
 * Validation for data/prior-analytics-en/.
 *
 *   npx tsx scripts/import-prior-analytics-en/validate.ts
 *
 * Writes data/prior-analytics-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

runValidation({
  workId: 'prior-analytics-en',
  dir: join(REPO_ROOT, 'data', 'prior-analytics-en'),
  translator: 'Alfred James Jenkinson',
  shape: 'book-chapter',
  reportTitle: 'Prior Analytics (English, Jenkinson 1928)',
  expected: [
    { book: '1', chapters: run(46) },
    { book: '2', chapters: run(27) },
  ],
  incipit: 'We must first state the subject of our inquiry',
  explicit: 'a single sign correlative with each affection.',
  expectBekkerRefs: true,
  requiredAnomalyTopics: ['CONTENT-VERIFIED', 'disambiguation', 'line numbers', 'footnote', 'Bekker'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "page-scan",
    rawDir: join(HERE, 'raw'),
    files: ["prior-analytics-book-1.parse.json", "prior-analytics-book-2.parse.json"],
    furnitureExact: ["ANALYTICA PRIORA", "BOOK I", "BOOK II"],
  },
});
