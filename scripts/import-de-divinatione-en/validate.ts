/**
 * Validator for data/de-divinatione-en.
 *
 *   npm run validate:de-divinatione-en
 *
 * Run after `npm run import:de-divinatione-en`. Checks:
 *   - exactly 2 Book divisions, ids `book-1`/`book-2`, in order
 *   - section ids `book-N-sec-M`; every section has exactly one Passage with
 *     non-empty text, n === '', Passage.ref === null
 *   - the documented gap (Book 1 section 25) is indeed absent, and Book 2 is
 *     confirmed complete (150/150) — not silently present, not silently
 *     multiplied elsewhere
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/de-divinatione-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-divinatione-en';
const EXPECTED_COUNTS = [131, 150];
const EXPECTED_GAPS: Array<number | null> = [25, null];

let failures = 0;
function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

const TAG_LEAK_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
const ENTITY_LEAK_RE = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/;
const CHAPTER_TOKEN_RE = /^\d+$/;

function main(): void {
  const file = join(REPO_ROOT, 'data', WORK_ID, 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== WORK_ID) fail(`work.workId is "${work.workId}", expected "${WORK_ID}"`);
  if (work.language !== 'en') fail(`work.language is "${work.language}", expected "en"`);
  if (work.divisions.length !== 2) fail(`expected 2 Book divisions, got ${work.divisions.length}`);

  let totalSections = 0;
  work.divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);

    const want = EXPECTED_COUNTS[bi]!;
    if (b.children.length !== want) fail(`Book ${bi + 1}: expected ${want} sections, got ${b.children.length}`);
    const gap = EXPECTED_GAPS[bi];
    if (gap !== null && b.children.some((d) => d.number === String(gap))) {
      fail(`Book ${bi + 1}: expected section ${gap} to be absent (documented gap), but found it`);
    }

    const ids = new Set<string>();
    for (const d of b.children) {
      totalSections += 1;
      if (ids.has(d.id)) fail(`duplicate id ${d.id}`);
      ids.add(d.id);
      if (!d.id.startsWith(`${wantBookId}-sec-`)) fail(`${d.id} does not start with "${wantBookId}-sec-"`);
      if (d.children.length !== 0) fail(`${d.id} should have no children, got ${d.children.length}`);
      if (d.ref !== null && !CHAPTER_TOKEN_RE.test(d.ref)) fail(`${d.id}.ref "${d.ref}" does not look like a plain chapter number`);
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
    }
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
