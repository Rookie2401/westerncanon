/**
 * Validator for data/polybius-histories-en/.
 *
 *   npx tsx scripts/import-polybius-histories-en/validate.ts
 *
 * Run after `npm run import:polybius-histories-en`. Checks:
 *   - exactly 40 top-level divisions: `book-1`..`book-39` (in order) PLUS a
 *     40th, `fragments` (Shuckburgh's own "Shorter Fragments" appendix - see
 *     types.ts and the importer's module doc)
 *   - Book chapter counts match this edition's own totals (incl. Book 17 =
 *     0) - these are NOT expected to equal the Greek sibling's own counts
 *   - Book chapter ids `book-N-ch-M`, M matching this edition's own printed
 *     number (digits, optionally one trailing lowercase letter), no
 *     duplicates within a book
 *   - every non-empty-book chapter has exactly one Passage with non-empty
 *     text, n === '', ref === null; Book 17 has zero Chapters and zero
 *     Passages
 *   - `fragments` has exactly two Group children (`fragments-a`,
 *     `fragments-b`) with the source's own verbatim heading text, 30 and 80
 *     Chapters respectively (110 total), each Chapter's id/number matching
 *     this source's own printed fragment number and carrying exactly one
 *     non-empty Passage
 *   - every Division.ref and Passage.ref is null throughout
 *   - Book 1 Chapter 1 begins with the expected opening words
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/polybius-histories-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_BOOKS = 39;
const EXPECTED_CHAPTER_COUNTS = [
  88, 71, 118, 86, 111, 57, 18, 39, 45, 49, 36, 48, 9, 13, 39, 40, 0, 55, 1, 12, 48, 21, 18, 15, 6, 1, 20, 23, 27, 24,
  28, 28, 19, 14, 6, 8, 10, 11, 18,
];
const KNOWN_EMPTY_BOOKS = new Set(['17']);
const EXPECTED_TOTAL_BOOK_CHAPTERS = 1280;
const EXPECTED_OPENING = 'Had the praise of History been passed over by former Chroniclers';

const EXPECTED_TOP_LEVEL_DIVISIONS = EXPECTED_BOOKS + 1; // 39 Books + 1 `fragments`
const FRAGMENTS_A_HEADING = 'A: Fragments whose reference is known';
const FRAGMENTS_B_HEADING = 'B: Fragments of uncertain reference';
const EXPECTED_FRAGMENTS_A_COUNT = 30;
const EXPECTED_FRAGMENTS_B_COUNT = 80;
const FRAGMENTS_GROUP_B_STARTS_AT = 31;

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

/** Checks a Chapter division (Book's or a fragments Group's) generically: exactly one non-empty Passage, no children, refs null, no tag/entity leaks. */
function checkLeafChapter(c: Division, wantId: string): void {
  if (c.id !== wantId) fail(`chapter has id "${c.id}", expected "${wantId}"`);
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
}

function main(): void {
  const file = join(REPO_ROOT, 'data', 'polybius-histories-en', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== 'polybius-histories-en') fail(`workId is ${JSON.stringify(work.workId)}, expected "polybius-histories-en"`);
  if (work.language !== 'en') fail(`language is ${JSON.stringify(work.language)}, expected "en"`);

  const allDivisions = work.divisions;
  if (allDivisions.length !== EXPECTED_TOP_LEVEL_DIVISIONS) {
    fail(`expected ${EXPECTED_TOP_LEVEL_DIVISIONS} top-level divisions (39 Books + 1 fragments), got ${allDivisions.length}`);
  }

  const books = allDivisions.slice(0, EXPECTED_BOOKS);
  const fragments = allDivisions[EXPECTED_BOOKS];

  // --- the 39 numbered Books ------------------------------------------------
  let totalBookChapters = 0;

  books.forEach((b, bi) => {
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
      totalBookChapters += 1;
      const n = c.number ?? '';
      if (!/^[0-9]+[a-z]?$/.test(n)) fail(`${c.id}: unexpected chapter-number format ${JSON.stringify(n)}`);
      if (seenNumbers.has(n)) fail(`${b.id}: duplicate chapter number ${JSON.stringify(n)}`);
      seenNumbers.add(n);
      checkLeafChapter(c, `${wantBookId}-ch-${n}`);
    });
  });

  if (totalBookChapters !== EXPECTED_TOTAL_BOOK_CHAPTERS) {
    fail(`expected ${EXPECTED_TOTAL_BOOK_CHAPTERS} total chapters across the 39 Books, got ${totalBookChapters}`);
  }

  // Book 1 Chapter 1 must begin with the expected opening words.
  const book1 = books[0];
  const ch1 = book1?.children[0];
  if (!ch1 || ch1.id !== 'book-1-ch-1') {
    fail('book-1-ch-1 not found where expected');
  } else if (!ch1.passages[0]!.text.startsWith(EXPECTED_OPENING)) {
    fail(`book-1-ch-1 does not begin with the expected opening words. Got: ${JSON.stringify(ch1.passages[0]!.text.slice(0, 120))}`);
  }

  // Book 34's "Geographical Fragments" heading, and at least one chapter carrying
  // a Shuckburgh-authored sourceHeading, are soft (informational) checks only.
  const book34 = books[33];
  if (book34?.sourceHeading !== 'Geographical Fragments') {
    warn(`book-34.sourceHeading is ${JSON.stringify(book34?.sourceHeading)}, expected "Geographical Fragments"`);
  }
  const anyChapterHeading = books.some((b) => b.children.some((c) => c.sourceHeading));
  if (!anyChapterHeading) warn('no Chapter carries a sourceHeading anywhere - expected Shuckburgh\'s own chapter titles to survive');

  // --- the "Shorter Fragments" appendix (40th top-level division) -----------
  let totalFragmentsChapters = 0;
  if (!fragments) {
    fail('the "fragments" appendix division is missing');
  } else {
    if (fragments.id !== 'fragments') fail(`fragments division has id "${fragments.id}", expected "fragments"`);
    if (fragments.number !== null) fail(`fragments.number should be null, got ${JSON.stringify(fragments.number)}`);
    if (fragments.ref !== null) fail(`fragments.ref should be null, got ${JSON.stringify(fragments.ref)}`);
    if (fragments.editorialTitle !== null) fail(`fragments.editorialTitle should be null, got ${JSON.stringify(fragments.editorialTitle)}`);
    if (fragments.sourceHeading !== 'Shorter Fragments') fail(`fragments.sourceHeading is ${JSON.stringify(fragments.sourceHeading)}, expected "Shorter Fragments"`);
    if (fragments.passages.length !== 0) fail(`fragments.passages should be [], got ${fragments.passages.length} entries`);
    if (fragments.children.length !== 2) fail(`fragments should have exactly 2 Group children, got ${fragments.children.length}`);

    const [groupA, groupB] = fragments.children;
    const expectGroup = (
      group: Division | undefined,
      wantId: string,
      wantHeading: string,
      wantCount: number,
      startsAtLeast: number,
    ): void => {
      if (!group) {
        fail(`${wantId} is missing`);
        return;
      }
      if (group.id !== wantId) fail(`group has id "${group.id}", expected "${wantId}"`);
      if (group.number !== null) fail(`${group.id}.number should be null, got ${JSON.stringify(group.number)}`);
      if (group.ref !== null) fail(`${group.id}.ref should be null, got ${JSON.stringify(group.ref)}`);
      if (group.editorialTitle !== null) fail(`${group.id}.editorialTitle should be null, got ${JSON.stringify(group.editorialTitle)}`);
      if (group.sourceHeading !== wantHeading) fail(`${group.id}.sourceHeading is ${JSON.stringify(group.sourceHeading)}, expected ${JSON.stringify(wantHeading)}`);
      if (group.passages.length !== 0) fail(`${group.id}.passages should be [], got ${group.passages.length} entries`);
      if (group.children.length !== wantCount) fail(`${group.id}: expected ${wantCount} chapters, got ${group.children.length}`);

      const seenNumbers = new Set<string>();
      group.children.forEach((c, ci) => {
        totalFragmentsChapters += 1;
        const n = c.number ?? '';
        if (!/^[0-9]+[a-z]?$/.test(n)) fail(`${c.id}: unexpected chapter-number format ${JSON.stringify(n)}`);
        if (seenNumbers.has(n)) fail(`${group.id}: duplicate chapter number ${JSON.stringify(n)}`);
        seenNumbers.add(n);
        if (ci === 0) {
          const baseNum = Number.parseInt(n, 10);
          if (baseNum < startsAtLeast) fail(`${group.id}'s first chapter is n="${n}", expected a base number >= ${startsAtLeast}`);
        }
        checkLeafChapter(c, `${wantId}-ch-${n}`);
        if (!c.sourceHeading) fail(`${c.id}.sourceHeading is empty - expected this source's own printed fragment head (e.g. "I (6, 2)")`);
      });
    };
    expectGroup(groupA, 'fragments-a', FRAGMENTS_A_HEADING, EXPECTED_FRAGMENTS_A_COUNT, 1);
    expectGroup(groupB, 'fragments-b', FRAGMENTS_B_HEADING, EXPECTED_FRAGMENTS_B_COUNT, FRAGMENTS_GROUP_B_STARTS_AT);
  }

  process.stdout.write(
    `\n${books.length} books (${totalBookChapters} chapters) + fragments appendix (${totalFragmentsChapters} chapters) checked.\n`,
  );
  process.stdout.write(`\n${failures} failure(s), ${warnings} warning(s) (warnings are expected/documented anomalies, not bugs).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
