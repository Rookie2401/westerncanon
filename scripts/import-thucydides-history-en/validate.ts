/**
 * Validator for data/thucydides-history-en/.
 *
 *   npx tsx scripts/import-thucydides-history-en/validate.ts
 *
 * Run after `npm run import:thucydides-history-en`. Checks:
 *   - exactly 8 Book divisions, ids `book-1`..`book-8` in order
 *   - chapter counts match this edition's own totals
 *     (146/103/116/135/116/105/87/109, 917 total) - matching the Greek
 *     sibling
 *   - chapter ids `book-N-ch-M`, 1-based contiguous within each book
 *   - every chapter has exactly one Passage with non-empty text, n === '',
 *     ref === null
 *   - every Division.ref and sourceHeading is null throughout
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 *   - the work opens with Crawley's own opening sentence
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/thucydides-history-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_CHAPTER_COUNTS = [146, 103, 116, 135, 116, 105, 87, 109];
const EXPECTED_BOOKS = 8;
const OPENING = 'Thucydides, an Athenian, wrote the history of the war';

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
  const file = join(REPO_ROOT, 'data', 'thucydides-history-en', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== 'thucydides-history-en') fail(`workId is ${JSON.stringify(work.workId)}, expected "thucydides-history-en"`);
  if (work.language !== 'en') fail(`language is ${JSON.stringify(work.language)}, expected "en"`);

  const divisions = work.divisions;
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);

  let totalChapters = 0;

  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    const wantBookId = `book-${bookN}`;
    if (b.id !== wantBookId) fail(`Book ${bookN} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== null) fail(`${b.id}.sourceHeading should be null, got ${JSON.stringify(b.sourceHeading)}`);

    const want = EXPECTED_CHAPTER_COUNTS[bi]!;
    const got = b.children.length;
    if (got !== want) fail(`${b.id}: expected ${want} chapters, got ${got}`);

    b.children.forEach((c, ci) => {
      totalChapters += 1;
      const wantNum = String(ci + 1);
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

  if (totalChapters !== 917) warn(`expected 917 total chapters, got ${totalChapters}`);

  // The work must open with Crawley's own opening sentence.
  const book1 = divisions[0];
  const ch1 = book1?.children[0];
  if (!ch1 || ch1.number !== '1') {
    fail('Book 1 chapter 1 not found where expected');
  } else if (!ch1.passages[0]!.text.startsWith(OPENING)) {
    fail(`Book 1 chapter 1 does not open with the expected opening "${OPENING}..."`);
  }

  // Book 5 chapter 86 is the bare <said> turn ("The Melian commissioners answered:-").
  const book5 = divisions[4];
  const ch86 = book5?.children.find((c) => c.number === '86');
  if (!ch86) {
    fail('Book 5 chapter 86 (Melian Dialogue framing turn) not found where expected');
  } else if (!/Melian commissioners answered/.test(ch86.passages[0]!.text)) {
    warn(`Book 5 chapter 86 does not contain the expected "Melian commissioners answered" framing text, got: "${ch86.passages[0]!.text.slice(0, 80)}"`);
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
