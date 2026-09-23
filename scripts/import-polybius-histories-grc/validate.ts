/**
 * Validator for data/polybius-histories-grc/.
 *
 *   npx tsx scripts/import-polybius-histories-grc/validate.ts
 *
 * Run after `npm run import:polybius-histories-grc`. Checks:
 *   - exactly 39 Book divisions, ids `book-1`..`book-39` in order
 *   - chapter counts match this edition's own totals (incl. Book 17 = 0)
 *   - chapter ids `book-N-ch-M`, M matching this edition's own printed
 *     number (digits, optionally one trailing lowercase letter), no
 *     duplicates within a book - NOT assumed 1-based contiguous, since the
 *     fragmentary books are genuinely non-contiguous (see types.ts)
 *   - every non-empty-book chapter has exactly one Passage with non-empty
 *     text, n === '', ref === null; Book 17 has zero Chapters and zero
 *     Passages
 *   - every Division.ref and Passage.ref is null throughout
 *   - Book 1 Chapter 1 begins with the expected opening words
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/polybius-histories-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_BOOKS = 39;
const EXPECTED_CHAPTER_COUNTS = [
  88, 71, 118, 87, 111, 61, 21, 42, 47, 49, 37, 52, 11, 13, 39, 41, 0, 56, 2, 12, 50, 22, 18, 15, 6, 2, 20, 23, 27, 32,
  33, 16, 20, 14, 6, 17, 1, 22, 8,
];
const KNOWN_EMPTY_BOOKS = new Set(['17']);
const EXPECTED_TOTAL_CHAPTERS = 1310;
const EXPECTED_OPENING =
  'εἰ μὲν τοῖς πρὸ ἡμῶν ἀναγράφουσι τὰς πράξεις παραλελεῖφθαι συνέβαινε τὸν ὑπὲρ αὐτῆς τῆς ἱστορίας ἔπαινον';

let failures = 0;
let warnings = 0;

function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function warn(message: string): void {
  warnings += 1;
  process.stdout.write(`WARN: ${message}\n`);
}

const TAG_LEAK_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
const ENTITY_LEAK_RE = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/;

function main(): void {
  const file = join(REPO_ROOT, 'data', 'polybius-histories-grc', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== 'polybius-histories-grc') fail(`workId is ${JSON.stringify(work.workId)}, expected "polybius-histories-grc"`);
  if (work.language !== 'grc') fail(`language is ${JSON.stringify(work.language)}, expected "grc"`);

  const divisions = work.divisions;
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);

  let totalChapters = 0;

  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    const wantBookId = `book-${bookN}`;
    if (b.id !== wantBookId) fail(`Book ${bookN} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);

    const want = EXPECTED_CHAPTER_COUNTS[bi]!;
    const got = b.children.length;
    if (got !== want) fail(`${b.id}: expected ${want} chapters, got ${got}`);

    const isKnownEmpty = KNOWN_EMPTY_BOOKS.has(String(bookN));
    if (isKnownEmpty) {
      if (b.children.length !== 0) fail(`${b.id} was expected to be a total loss (0 chapters)`);
      if (b.passages.length !== 0) fail(`${b.id}.passages should be [], got ${b.passages.length} entries`);
    }

    const seenNumbers = new Set<string>();
    b.children.forEach((c) => {
      totalChapters += 1;
      const n = c.number ?? '';
      if (!/^[0-9]+[a-z]?$/.test(n)) fail(`${c.id}: unexpected chapter-number format ${JSON.stringify(n)}`);
      if (seenNumbers.has(n)) fail(`${b.id}: duplicate chapter number ${JSON.stringify(n)}`);
      seenNumbers.add(n);

      const wantChId = `${wantBookId}-ch-${n}`;
      if (c.id !== wantChId) fail(`chapter has id "${c.id}", expected "${wantChId}"`);
      if (c.ref !== null) fail(`${c.id}.ref should be null, got ${JSON.stringify(c.ref)}`);
      if (c.editorialTitle !== null) fail(`${c.id}.editorialTitle should be null, got ${JSON.stringify(c.editorialTitle)}`);
      if (c.children.length !== 0) fail(`${c.id}.children should be [], got ${c.children.length} entries`);
      if (c.passages.length !== 1) fail(`${c.id} has ${c.passages.length} passages, expected exactly 1`);
      for (const p of c.passages) {
        if (p.n !== '') fail(`${c.id} passage.n is ${JSON.stringify(p.n)}, expected ""`);
        if (p.ref !== null) fail(`${c.id} passage.ref is ${JSON.stringify(p.ref)}, expected null`);
        if (!p.text || p.text.trim().length === 0) fail(`${c.id} has empty passage text`);
        const tagLeak = TAG_LEAK_RE.exec(p.text);
        if (tagLeak) fail(`${c.id} passage text leaks a tag fragment: ${JSON.stringify(tagLeak[0])}`);
        const entityLeak = ENTITY_LEAK_RE.exec(p.text);
        if (entityLeak) fail(`${c.id} passage text leaks an entity: ${JSON.stringify(entityLeak[0])}`);
      }
    });
  });

  if (totalChapters !== EXPECTED_TOTAL_CHAPTERS) {
    fail(`expected ${EXPECTED_TOTAL_CHAPTERS} total chapters, got ${totalChapters}`);
  }

  // Book 1 Chapter 1 must begin with the expected opening words.
  const book1 = divisions[0];
  const ch1 = book1?.children[0];
  if (!ch1 || ch1.id !== 'book-1-ch-1') {
    fail('book-1-ch-1 not found where expected');
  } else if (!ch1.passages[0]!.text.startsWith(EXPECTED_OPENING)) {
    fail(`book-1-ch-1 does not begin with the expected opening words. Got: ${JSON.stringify(ch1.passages[0]!.text.slice(0, 120))}`);
  }

  // Book 6 Chapter 1 should carry Büttner-Wobst's own transliterated Latin excerpt-group heading.
  const book6ch1 = divisions[5]?.children[0];
  if (!book6ch1 || book6ch1.sourceHeading !== 'ι. εχ προοεμιο') {
    warn(`book-6-ch-1.sourceHeading is ${JSON.stringify(book6ch1?.sourceHeading)}, expected "ι. εχ προοεμιο"`);
  }

  process.stdout.write(`\n${divisions.length} books, ${totalChapters} chapters checked.\n`);
  process.stdout.write(`\n${failures} failure(s), ${warnings} warning(s) (warnings are expected/documented anomalies, not bugs).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
