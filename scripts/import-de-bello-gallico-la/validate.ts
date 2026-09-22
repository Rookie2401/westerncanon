/**
 * Validator for data/de-bello-gallico-la/.
 *
 *   npx tsx scripts/import-de-bello-gallico-la/validate.ts
 *
 * Run after `npm run import:de-bello-gallico-la`. Checks:
 *   - exactly 8 Book divisions, ids `book-1`..`book-8` in order
 *   - each Book's sourceHeading is the verbatim source rubric
 *   - chapter ids `book-N-ch-M`, 1-based contiguous within each book, EXCEPT
 *     Book 8, whose chapters are contiguous starting at "0" (Hirtius's
 *     preface) - this is genuine source numbering, not forced
 *   - chapter counts match this edition's own totals (54/35/29/38/58/44/90/56)
 *   - every chapter has exactly one Passage with non-empty text, n === '',
 *     ref === null
 *   - every Division.ref is null throughout
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/de-bello-gallico-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_CHAPTER_COUNTS = [54, 35, 29, 38, 58, 44, 90, 56];
const EXPECTED_HEADS = [
  'COMMENTARIUS PRIMUS',
  'COMMENTARIUS SECUNDUS',
  'COMMENTARIUS TERTIUS',
  'COMMENTARIUS QUARTUS',
  'COMMENTARIUS QUINTUS',
  'COMMENTARIUS SEXTUS',
  'COMMENTARIUS SEPTIMUS',
  'COMMENTARIUS OCTAVUS',
];

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
  const file = join(REPO_ROOT, 'data', 'de-bello-gallico-la', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== 'de-bello-gallico-la') fail(`workId is ${JSON.stringify(work.workId)}, expected "de-bello-gallico-la"`);
  if (work.language !== 'la') fail(`language is ${JSON.stringify(work.language)}, expected "la"`);

  const divisions = work.divisions;
  if (divisions.length !== 8) fail(`expected 8 Book divisions, got ${divisions.length}`);

  let totalChapters = 0;

  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    const wantBookId = `book-${bookN}`;
    if (b.id !== wantBookId) fail(`Book ${bookN} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== EXPECTED_HEADS[bi]) {
      fail(`${b.id}.sourceHeading is ${JSON.stringify(b.sourceHeading)}, expected ${JSON.stringify(EXPECTED_HEADS[bi])}`);
    }

    const want = EXPECTED_CHAPTER_COUNTS[bi]!;
    const got = b.children.length;
    if (got !== want) fail(`${b.id}: expected ${want} chapters, got ${got}`);

    const startsAt = bookN === 8 ? 0 : 1;
    b.children.forEach((c, ci) => {
      totalChapters += 1;
      const wantNum = String(startsAt + ci);
      const wantChId = `${wantBookId}-ch-${wantNum}`;
      if (c.id !== wantChId) fail(`chapter at position ${ci} of Book ${bookN} has id "${c.id}", expected "${wantChId}"`);
      if (c.number !== wantNum) fail(`${c.id}.number is ${JSON.stringify(c.number)}, expected "${wantNum}"`);
      if (c.ref !== null) fail(`${c.id}.ref should be null, got ${JSON.stringify(c.ref)}`);
      if (c.sourceHeading !== null) fail(`${c.id}.sourceHeading should be null, got ${JSON.stringify(c.sourceHeading)}`);
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

  if (totalChapters !== 404) warn(`expected 404 total chapters, got ${totalChapters}`);

  // Book 8 chapter 0 must be Hirtius's preface, addressed to Balbus.
  const book8 = divisions[7];
  const ch0 = book8?.children[0];
  if (!ch0 || ch0.number !== '0') {
    fail('Book 8 chapter 0 (Hirtius\'s preface) not found where expected');
  } else if (!/Balbe/.test(ch0.passages[0]!.text)) {
    warn('Book 8 chapter 0 does not contain "Balbe" - expected Hirtius\'s prefatory letter to Balbus');
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
