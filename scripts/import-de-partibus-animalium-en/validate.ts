/**
 * Validation for data/de-partibus-animalium-en/.
 *
 *   npx tsx scripts/import-de-partibus-animalium-en/validate.ts
 *
 * Writes data/de-partibus-animalium-en/VALIDATION_REPORT.md, prints a
 * summary, and exits non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

runValidation({
  workId: 'de-partibus-animalium-en',
  dir: join(REPO_ROOT, 'data', 'de-partibus-animalium-en'),
  translator: 'William Ogle',
  shape: 'book-chapter',
  reportTitle: 'On the Parts of Animals (English, Ogle 1912 — completed from MIT)',
  // Books II-IV originally stopped short on Wikisource because the source
  // page itself stopped mid-sentence; each is now completed to MIT/Ogle's
  // own chapter count (17 / 15 / 14 - not the traditional 13 for Book IV,
  // see the importer's module doc) from a Wayback Machine capture of MIT's
  // own copy of this same translation. See anomalies.json for the full
  // per-chapter account.
  expected: [
    { book: '1', chapters: run(5) },
    { book: '2', chapters: run(17) },
    { book: '3', chapters: run(15) },
    { book: '4', chapters: run(14) },
  ],
  incipit: 'Every systematic science, the humblest and the noblest alike',
  explicit: 'in due sequence must next deal with the question of their generation.',
  expectBekkerRefs: false,
  requiredAnomalyTopics: ['SUPPLEMENTED', 'completeness', 'Bekker', 'footnote', 'ordinary wikitext'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["parts-of-animals-book-1.json", "parts-of-animals-book-2.json", "parts-of-animals-book-3.json", "parts-of-animals-book-4.json"],
  },
});
