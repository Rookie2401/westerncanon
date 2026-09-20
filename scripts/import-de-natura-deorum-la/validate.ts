/**
 * Validator for data/de-natura-deorum-la.
 *
 *   npm run validate:de-natura-deorum-la
 *
 * Run after `npm run import:de-natura-deorum-la`. Checks:
 *   - exactly 3 Book divisions, ids `book-1`..`book-3`, in order
 *   - section ids `book-N-sec-M`, 1-based and contiguous within each book
 *     (124 / 168 / 95)
 *   - every section has exactly one Passage with non-empty text, n === '',
 *     Passage.ref === null, Division.ref === null (this witness has no
 *     milestones at all)
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/de-natura-deorum-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-natura-deorum-la';
const EXPECTED_SECTIONS_PER_BOOK = [124, 168, 95];

let failures = 0;
function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

const TAG_LEAK_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
const ENTITY_LEAK_RE = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/;

function main(): void {
  const file = join(REPO_ROOT, 'data', WORK_ID, 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== WORK_ID) fail(`work.workId is "${work.workId}", expected "${WORK_ID}"`);
  if (work.language !== 'la') fail(`work.language is "${work.language}", expected "la"`);
  if (work.divisions.length !== 3) fail(`expected 3 Book divisions, got ${work.divisions.length}`);

  let totalSections = 0;
  work.divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.passages.length !== 0) fail(`${b.id} should have no passages of its own, got ${b.passages.length}`);

    const want = EXPECTED_SECTIONS_PER_BOOK[bi]!;
    if (b.children.length !== want) fail(`Book ${bi + 1}: expected ${want} sections, got ${b.children.length}`);

    b.children.forEach((d, si) => {
      totalSections += 1;
      const wantId = `${wantBookId}-sec-${si + 1}`;
      if (d.id !== wantId) fail(`section at position ${si + 1} of Book ${bi + 1} has id "${d.id}", expected "${wantId}"`);
      if (d.number !== String(si + 1)) fail(`${d.id}.number is ${JSON.stringify(d.number)}, expected "${si + 1}"`);
      if (d.children.length !== 0) fail(`${d.id} should have no children, got ${d.children.length}`);
      if (d.ref !== null) fail(`${d.id}.ref should be null (this witness has no milestones), got ${JSON.stringify(d.ref)}`);
      if (d.passages.length !== 1) fail(`${d.id} has ${d.passages.length} passages, expected exactly 1`);
      for (const p of d.passages) {
        if (p.n !== '') fail(`${d.id} passage.n is ${JSON.stringify(p.n)}, expected ""`);
        if (p.ref !== null) fail(`${d.id} passage.ref is ${JSON.stringify(p.ref)}, expected null`);
        if (!p.text || p.text.trim().length === 0) fail(`${d.id} has empty passage text`);
        const tagLeak = TAG_LEAK_RE.exec(p.text);
        if (tagLeak) fail(`${d.id} passage text leaks a tag fragment: ${JSON.stringify(tagLeak[0])}`);
        const entityLeak = ENTITY_LEAK_RE.exec(p.text);
        if (entityLeak) fail(`${d.id} passage text leaks an entity: ${JSON.stringify(entityLeak[0])}`);
      }
    });
  });

  process.stdout.write(`${work.divisions.length} books, ${totalSections} sections checked.\n`);

  process.stdout.write(`\n${failures} failure(s).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
