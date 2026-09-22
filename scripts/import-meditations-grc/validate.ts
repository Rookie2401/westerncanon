/**
 * Validator for data/meditations-grc/.
 *
 *   npm run validate:meditations-grc
 *
 * Run after `npm run import:meditations-grc`. Checks:
 *   - exactly 12 Book divisions, ids `book-1`..`book-12` in order
 *   - chapter ids `book-N-ch-M`; M matches each chapter's own `number`
 *     field, and within a book the sequence of numbers is non-decreasing
 *     and gap-free EXCEPT where a gap is independently confirmed (Book 12
 *     skips chapter 18 - see the importer's own doc comment)
 *   - every chapter has exactly one Passage with non-empty text
 *   - every Division.ref and every Passage.ref is null; every Passage.n is ''
 *   - no leaked XML/HTML tag fragments or unescaped entities in any
 *     passage text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/meditations-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_BOOKS = 12;
/** Known, individually-confirmed chapter-numbering gaps (see index.ts's doc comment). */
const KNOWN_GAPS: Record<string, number[]> = { 'book-12': [18] };

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
  const file = join(REPO_ROOT, 'data', 'meditations-grc', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  process.stdout.write(`--- Greek (Leopold 1908) - ${work.workId} ---\n`);

  if (work.language !== 'grc') fail(`work.language is ${JSON.stringify(work.language)}, expected "grc"`);
  if (work.divisions.length !== EXPECTED_BOOKS) {
    fail(`expected ${EXPECTED_BOOKS} Book divisions, got ${work.divisions.length}`);
  }

  let totalChapters = 0;

  work.divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.number !== String(bi + 1)) fail(`${b.id}.number is ${JSON.stringify(b.number)}, expected "${bi + 1}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.passages.length !== 0) fail(`${b.id} (a Book) should have 0 passages, got ${b.passages.length}`);
    if (b.children.length === 0) fail(`${b.id} has no chapters`);

    const knownGaps = new Set(KNOWN_GAPS[b.id] ?? []);
    let prevNum = 0;
    b.children.forEach((c) => {
      totalChapters += 1;
      const n = Number(c.number);
      if (!Number.isInteger(n) || n < 1) fail(`${c.id}: number ${JSON.stringify(c.number)} is not a positive integer`);
      const wantId = `${b.id}-ch-${c.number}`;
      if (c.id !== wantId) fail(`${c.id}: id does not match its own number (expected "${wantId}")`);
      if (n <= prevNum) fail(`${c.id}: chapter numbers are not strictly increasing within ${b.id} (${n} after ${prevNum})`);
      for (let missing = prevNum + 1; missing < n; missing++) {
        if (knownGaps.has(missing)) {
          // expected, already logged by the importer - nothing to do
        } else {
          fail(`${b.id}: unexpected chapter-number gap - ${missing} is missing and not a known/logged gap`);
        }
      }
      prevNum = n;

      if (c.ref !== null) fail(`${c.id}.ref should be null, got ${JSON.stringify(c.ref)}`);
      if (c.sourceHeading !== null) fail(`${c.id}.sourceHeading should be null`);
      if (c.editorialTitle !== null) fail(`${c.id}.editorialTitle should be null`);
      if (c.children.length !== 0) fail(`${c.id} (a Chapter) should have 0 children, got ${c.children.length}`);
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

  for (const [bookId, gaps] of Object.entries(KNOWN_GAPS)) {
    warn(`${bookId}: known chapter-numbering gap at ${gaps.join(', ')} (confirmed genuine, not an error).`);
  }

  process.stdout.write(`\n  ${work.divisions.length} books, ${totalChapters} chapters checked.\n`);
  process.stdout.write(`\n${failures} failure(s), ${warnings} warning(s) (warnings are expected/documented anomalies, not bugs).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
