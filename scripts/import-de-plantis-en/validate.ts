/**
 * Validation for data/de-plantis-en/.
 *
 *   npx tsx scripts/import-de-plantis-en/validate.ts
 *
 * Writes data/de-plantis-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 *
 * The expected explicit is the line of Greek hexameter the source prints at
 * the very end of Book II, after the colophon. It stands inside the
 * transcribed text block, so it is kept as part of the work rather than
 * stripped as furniture; asserting it here means a future run that quietly
 * dropped it would FAIL rather than pass unnoticed.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

runValidation({
  workId: 'de-plantis-en',
  dir: join(REPO_ROOT, 'data', 'de-plantis-en'),
  translator: 'Edward Seymour Forster',
  shape: 'book-chapter',
  reportTitle: 'On Plants (English, Forster 1913 — pseudo-Aristotle)',
  expected: [
    { book: '1', chapters: run(7) },
    { book: '2', chapters: run(10) },
  ],
  incipit: 'Life is found in animals and plants',
  explicit: 'μακρὰ δένδεα, πρῶτον ἐλαίας.',
  expectBekkerRefs: true,
  requiredAnomalyTopics: ['TWO BOOKS', 'front matter EXCLUDED', 'unmarked in the source', 'PSEUDO-ARISTOTLE', 'footnote', 'Bekker'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "page-scan",
    rawDir: join(HERE, 'raw'),
    files: ["on-plants.parse.json"],
    // Everything before the source's first "BOOK I" heading is the 1913 title
    // page and the translator's own preface — editorial front matter, excluded
    // from this edition by design (see anomalies.json).
    skipBeforeBookHeading: /^BOOK\s+[IVXLCDM]+$/i,
  },
});
