/**
 * Validation for data/de-generatione-animalium-en/.
 *
 *   npx tsx scripts/import-de-generatione-animalium-en/validate.ts
 *
 * Writes data/de-generatione-animalium-en/VALIDATION_REPORT.md, prints a
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
  workId: 'de-generatione-animalium-en',
  dir: join(REPO_ROOT, 'data', 'de-generatione-animalium-en'),
  translator: 'Arthur Platt',
  shape: 'book-chapter',
  reportTitle: 'On the Generation of Animals (English, Platt 1912)',
  expected: [
    { book: '1', chapters: run(23) },
    { book: '2', chapters: run(8) },
    { book: '3', chapters: run(11) },
    { book: '4', chapters: run(10) },
    { book: '5', chapters: run(8) },
  ],
  incipit: 'WE have now discussed the other parts of animals',
  explicit: 'of necessity and on account of the motive or efficient cause.',
  expectBekkerRefs: false,
  requiredAnomalyTopics: ['COMPLETE', 'Bekker', 'footnote', 'ordinary wikitext', 'marker'],
  // Reconcile the shipped text against the cached raw source: every source
  // paragraph must survive into the work, or this FAILS. See
  // ../import-aristotle-rest-en-shared/textAccounting.ts.
  accounting: {
    kind: "wikitext",
    rawDir: join(HERE, 'raw'),
    files: ["generation-of-animals-book-1.json", "generation-of-animals-book-2.json", "generation-of-animals-book-3.json", "generation-of-animals-book-4.json", "generation-of-animals-book-5.json"],
  },
});
