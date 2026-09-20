/**
 * Validator for data/de-amicitia-en.
 *
 *   npm run validate:de-amicitia-en
 *
 * Run after `npm run import:de-amicitia-en`. Checks:
 *   - exactly 104 flat section divisions, ids `sec-1`..`sec-104` in order
 *   - every section has exactly one Passage with non-empty text, n === '',
 *     Passage.ref === null
 *   - every Division.ref (when non-null) is a plausible chapter token
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/de-amicitia-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-amicitia-en';
const EXPECTED_SECTIONS = 104;

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

  if (work.divisions.length !== EXPECTED_SECTIONS) {
    fail(`expected ${EXPECTED_SECTIONS} section divisions, got ${work.divisions.length}`);
  }

  work.divisions.forEach((d, i) => {
    const wantId = `sec-${i + 1}`;
    if (d.id !== wantId) fail(`section at position ${i + 1} has id "${d.id}", expected "${wantId}"`);
    if (d.number !== String(i + 1)) fail(`${d.id}.number is ${JSON.stringify(d.number)}, expected "${i + 1}"`);
    if (d.children.length !== 0) fail(`${d.id} should have no children, got ${d.children.length}`);
    if (d.ref !== null && !CHAPTER_TOKEN_RE.test(d.ref)) {
      fail(`${d.id}.ref "${d.ref}" does not look like a plain chapter number`);
    }
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

  // chapter refs should be non-decreasing arabic numbers once they appear
  let lastChapter = 0;
  let sawFirstRef = false;
  let outOfOrder = 0;
  for (const d of work.divisions) {
    if (d.ref === null) continue;
    const n = Number(d.ref);
    if (sawFirstRef && n < lastChapter) outOfOrder += 1;
    lastChapter = n;
    sawFirstRef = true;
  }
  if (outOfOrder > 0) fail(`${outOfOrder} section(s) have a chapter ref that decreases from the previous one (unexpected for a single-Book work)`);

  const withRef = work.divisions.filter((d) => d.ref !== null).length;
  process.stdout.write(`${work.divisions.length} sections checked, ${withRef} carry a chapter ref.\n`);

  process.stdout.write(`\n${failures} failure(s).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
