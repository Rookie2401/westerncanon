/**
 * Validator for data/de-natura-deorum-en.
 *
 *   npm run validate:de-natura-deorum-en
 *
 * Run after `npm run import:de-natura-deorum-en`. Checks: exactly 3 Book
 * divisions; every section id matches `book-N-sec-M[a-z]?` and is unique;
 * every section has at least one Passage with non-empty text, n === '',
 * ref === null throughout (Division and Passage); no leaked XML/HTML tag
 * fragments or unescaped entities in any passage text; reports
 * section-number coverage per book (this source's own roman-numeral count,
 * not forced to be gap-free); confirms the one documented duplicate-numeral
 * irregularity (Book 3's "17"/"17b" — see index.ts's module doc) is present
 * and flagged, not silently absent or silently multiplied.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/de-natura-deorum-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-natura-deorum-en';

let failures = 0;
function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

const TAG_LEAK_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
const ENTITY_LEAK_RE = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/;
const ID_RE = /^book-(\d)-sec-(\d+)([a-z])?$/;

function main(): void {
  const file = join(REPO_ROOT, 'data', WORK_ID, 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== WORK_ID) fail(`work.workId is "${work.workId}", expected "${WORK_ID}"`);
  if (work.language !== 'en') fail(`work.language is "${work.language}", expected "en"`);
  if (work.divisions.length !== 3) fail(`expected 3 Book divisions, got ${work.divisions.length}`);

  let totalSections = 0;
  work.divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.children.length === 0) fail(`${b.id} has no sections`);

    const ids = new Set<string>();
    const numbers: number[] = [];
    let duplicateLetteredIds = 0;
    for (const d of b.children) {
      totalSections += 1;
      const idMatch = ID_RE.exec(d.id);
      if (!idMatch) fail(`${d.id} does not match expected id shape book-N-sec-M[a-z]?`);
      if (ids.has(d.id)) fail(`duplicate id ${d.id}`);
      ids.add(d.id);
      if (idMatch?.[3]) duplicateLetteredIds += 1;
      if (d.number === null || !/^\d+$/.test(d.number)) fail(`${d.id}.number "${d.number}" is not a plain arabic number`);
      numbers.push(Number(d.number));
      if (d.children.length !== 0) fail(`${d.id} should have no children, got ${d.children.length}`);
      if (d.ref !== null) fail(`${d.id}.ref should be null (this witness has no milestones), got ${JSON.stringify(d.ref)}`);
      if (d.passages.length === 0) fail(`${d.id} has no passages`);
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
    if (bi === 2) {
      // Book 3's documented "17"/"17b" duplicate-numeral irregularity (see
      // index.ts's module doc) - must be present and flagged, not silently
      // absent (source reverted) or silently multiplied (parser regression).
      if (!b.children.some((d) => d.id === 'book-3-sec-17b')) {
        fail('expected the documented "book-3-sec-17b" disambiguated duplicate to be present - its absence means the source anomaly this importer was built against has changed');
      }
      if (duplicateLetteredIds !== 1) {
        fail(`Book 3: expected exactly 1 lettered (disambiguated) id, found ${duplicateLetteredIds}`);
      }
    } else if (duplicateLetteredIds !== 0) {
      fail(`Book ${bi + 1}: expected no lettered (disambiguated) ids, found ${duplicateLetteredIds}`);
    }
    const max = numbers[numbers.length - 1]!;
    process.stdout.write(`Book ${bi + 1}: ${b.children.length} sections, numbered I..${max}\n`);
  });

  process.stdout.write(`\n${work.divisions.length} books, ${totalSections} sections checked.\n`);

  process.stdout.write(`\n${failures} failure(s).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
