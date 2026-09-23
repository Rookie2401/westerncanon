/**
 * Validator for data/herodotus-histories-grc/.
 *
 *   npx tsx scripts/import-herodotus-histories-grc/validate.ts
 *
 * Run after `npm run import:herodotus-histories-grc`. Checks:
 *   - exactly 9 Book divisions, ids `book-1`..`book-9` in order
 *   - chapter counts match this edition's own totals
 *     (216/188/160/205/133/144/257/151/124, 1578 total)
 *   - chapter ids `book-N-ch-M`, 1-based contiguous within each book, except
 *     for the source's own genuine single-uppercase-letter-suffixed
 *     subdivisions (e.g. "121A".."121F") - verified algorithmically, never
 *     forced
 *   - every chapter has exactly one Passage with non-empty text, n === '',
 *     ref === null
 *   - every Division.ref and sourceHeading is null throughout
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 *   - the work opens with the famous proem
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/herodotus-histories-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_CHAPTER_COUNTS = [216, 188, 160, 205, 133, 144, 257, 151, 124];
const EXPECTED_BOOKS = 9;
const PROEM_START = 'Ἡροδότου Ἁλικαρνησσέος ἱστορίης ἀπόδεξις ἥδε';

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

function parseChapterNum(n: string): { base: number; letter: string } | null {
  const m = /^(\d+)([A-Z]?)$/.exec(n);
  if (!m) return null;
  return { base: Number(m[1]), letter: m[2] ?? '' };
}
function nextLetter(letter: string): string {
  return letter === '' ? 'A' : String.fromCharCode(letter.charCodeAt(0) + 1);
}

function main(): void {
  const file = join(REPO_ROOT, 'data', 'herodotus-histories-grc', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== 'herodotus-histories-grc') fail(`workId is ${JSON.stringify(work.workId)}, expected "herodotus-histories-grc"`);
  if (work.language !== 'grc') fail(`language is ${JSON.stringify(work.language)}, expected "grc"`);

  const divisions = work.divisions;
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);

  let totalChapters = 0;
  let letteredCount = 0;

  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    const wantBookId = `book-${bookN}`;
    if (b.id !== wantBookId) fail(`Book ${bookN} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== null) fail(`${b.id}.sourceHeading should be null, got ${JSON.stringify(b.sourceHeading)}`);

    const want = EXPECTED_CHAPTER_COUNTS[bi]!;
    const got = b.children.length;
    if (got !== want) fail(`${b.id}: expected ${want} chapters, got ${got}`);

    // Two genuinely different lettered shapes occur in this edition: letters
    // inserted AFTER an existing plain chapter (Book 2: "121".."121F",
    // "122") and letters standing in for a base number that is NEVER
    // printed plain at all (Book 8: "139", "140A", "140B", "141" - no bare
    // "140"; the standard modern division of Hdt. 8.140 into 140.a/140.b).
    let lastBase = 0;
    let lastLetter = '';
    b.children.forEach((c, ci) => {
      totalChapters += 1;
      const wantChId = `${wantBookId}-ch-${c.number}`;
      if (c.id !== wantChId) fail(`chapter at position ${ci} of Book ${bookN} has id "${c.id}", expected "${wantChId}"`);
      if (c.ref !== null) fail(`${c.id}.ref should be null, got ${JSON.stringify(c.ref)}`);
      if (c.sourceHeading !== null) fail(`${c.id}.sourceHeading should be null, got ${JSON.stringify(c.sourceHeading)}`);
      if (c.children.length !== 0) fail(`${c.id}.children should be [], got ${c.children.length} entries`);
      if (c.passages.length !== 1) fail(`${c.id} has ${c.passages.length} passages, expected exactly 1`);

      const parsed = parseChapterNum(c.number ?? '');
      if (!parsed) {
        fail(`${c.id}: unparseable chapter number ${JSON.stringify(c.number)}`);
      } else if (ci === 0) {
        if (parsed.base !== 1 || parsed.letter !== '') fail(`${c.id}: Book must open with chapter "1", got "${c.number}"`);
      } else {
        const continuesSameBase = parsed.base === lastBase && parsed.letter === nextLetter(lastLetter);
        const startsNewLetteredRun = parsed.base === lastBase + 1 && parsed.letter === 'A';
        const plainNext = parsed.letter === '' && parsed.base === lastBase + 1;
        if (!(continuesSameBase || startsNewLetteredRun || plainNext)) {
          fail(`${c.id}: number "${c.number}" does not follow from the previous chapter "${lastBase}${lastLetter}"`);
        }
      }
      if (parsed) {
        if (parsed.letter !== '') letteredCount += 1;
        lastBase = parsed.base;
        lastLetter = parsed.letter;
      }

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

  if (totalChapters !== 1578) warn(`expected 1578 total chapters, got ${totalChapters}`);
  if (letteredCount !== 45) warn(`expected 45 letter-suffixed chapters, got ${letteredCount}`);

  // The work must open with the famous proem.
  const book1 = divisions[0];
  const ch1 = book1?.children[0];
  if (!ch1 || ch1.number !== '1') {
    fail('Book 1 chapter 1 not found where expected');
  } else if (!ch1.passages[0]!.text.startsWith(PROEM_START)) {
    fail(`Book 1 chapter 1 does not open with the expected proem "${PROEM_START}..."`);
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
