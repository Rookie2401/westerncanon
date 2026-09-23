/**
 * Validation for data/historia-animalium-en/.
 *
 *   npx tsx scripts/import-historia-animalium-en/validate.ts
 *
 * Writes data/historia-animalium-en/VALIDATION_REPORT.md, prints a summary,
 * and exits non-zero if any ERROR-level check fails. See
 * scripts/import-aristotle-rest-en-shared/validateCore.ts for the checks.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidation } from '../import-aristotle-rest-en-shared/validateCore.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

runValidation({
  workId: 'historia-animalium-en',
  dir: join(REPO_ROOT, 'data', 'historia-animalium-en'),
  translator: "D'Arcy Wentworth Thompson",
  shape: 'book-chapter',
  reportTitle: 'History of Animals (English, Thompson 1910 — Books VIII/IX completed from MIT)',
  // Nine books only: Thompson did not translate the (spurious) Book X, and no
  // such Wikisource page exists. Books 8 and 9 originally were short of the
  // standard 30/50 because Wikisource's own page stopped mid-sentence; both
  // are now completed to the full standard count from a Wayback Machine
  // capture of MIT's own copy of this translation - see anomalies.json.
  expected: [
    { book: '1', chapters: run(17) },
    { book: '2', chapters: run(17) },
    { book: '3', chapters: run(22) },
    { book: '4', chapters: run(11) },
    { book: '5', chapters: run(34) },
    { book: '6', chapters: run(37) },
    { book: '7', chapters: run(12) },
    { book: '8', chapters: run(30) },
    { book: '9', chapters: run(50) },
  ],
  incipit: 'Of the parts of animals some are simple',
  explicit: 'they make a violent movement of their tails at the same time that they produce this peculiar sound.',
  expectBekkerRefs: false,
  requiredAnomalyTopics: ['NO BOOK X', 'SUPPLEMENTED', 'Bekker', 'footnote', 'ordinary wikitext'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["history-of-animals-book-1.json", "history-of-animals-book-2.json", "history-of-animals-book-3.json", "history-of-animals-book-4.json", "history-of-animals-book-5.json", "history-of-animals-book-6.json", "history-of-animals-book-7.json", "history-of-animals-book-8.json", "history-of-animals-book-9.json"],
  },
});
