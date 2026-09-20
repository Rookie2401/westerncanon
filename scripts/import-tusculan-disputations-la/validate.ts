/**
 * Validator for data/tusculan-disputations-la/
 *
 *   npm run validate:tusculan-disputations-la
 *
 * Run after `npm run import:tusculan-disputations-la`. Checks:
 *   - exactly 5 Book divisions, ids `book-1`..`book-5` in order
 *   - section ids `book-N-sec-M`, 1-based and contiguous within each book
 *   - every section has exactly one Passage with non-empty text
 *   - every Division.ref is null (this edition supplies none); every Book
 *     sourceHeading is null (this edition supplies none)
 *   - every Passage.ref is null; every Passage.n is ''
 *   - no leaked XML tag fragments or unescaped entities in any passage text
 *   - section counts cross-checked against the known totals
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/tusculan-disputations-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_SECTION_COUNTS = [119, 67, 84, 84, 121];

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
  const file = join(REPO_ROOT, 'data', 'tusculan-disputations-la', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  process.stdout.write(`\n--- tusculan-disputations-la ---\n`);

  if (work.workId !== 'tusculan-disputations-la') fail(`workId is "${work.workId}", expected "tusculan-disputations-la"`);
  if (work.language !== 'la') fail(`language is "${work.language}", expected "la"`);

  if (work.divisions.length !== 5) fail(`expected 5 Book divisions, got ${work.divisions.length}`);

  let totalSections = 0;

  work.divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.number !== String(bi + 1)) fail(`${b.id}.number is ${JSON.stringify(b.number)}, expected "${bi + 1}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== null) fail(`${b.id}.sourceHeading should be null (this edition has no <head>), got ${JSON.stringify(b.sourceHeading)}`);
    if (b.passages.length !== 0) fail(`${b.id} should have 0 passages (container only), got ${b.passages.length}`);

    const wantSections = EXPECTED_SECTION_COUNTS[bi]!;
    if (b.children.length !== wantSections) {
      warn(`${b.id}: ${b.children.length} sections, expected ${wantSections}`);
    }

    b.children.forEach((s, si) => {
      totalSections += 1;
      const wantSecId = `${wantBookId}-sec-${si + 1}`;
      if (s.id !== wantSecId) fail(`section at position ${si + 1} of Book ${bi + 1} has id "${s.id}", expected "${wantSecId}"`);
      if (s.number !== String(si + 1)) fail(`${s.id}.number is ${JSON.stringify(s.number)}, expected "${si + 1}"`);
      if (s.children.length !== 0) fail(`${s.id} should be a leaf (children: []), got ${s.children.length} children`);
      if (s.ref !== null) fail(`${s.id}.ref should be null (this edition has no chapter milestones), got ${JSON.stringify(s.ref)}`);
      if (s.passages.length !== 1) fail(`${s.id} has ${s.passages.length} passages, expected exactly 1`);
      for (const p of s.passages) {
        if (p.n !== '') fail(`${s.id} passage.n is ${JSON.stringify(p.n)}, expected ""`);
        if (p.ref !== null) fail(`${s.id} passage.ref is ${JSON.stringify(p.ref)}, expected null`);
        if (!p.text || p.text.trim().length === 0) fail(`${s.id} has empty passage text`);
        const tagLeak = TAG_LEAK_RE.exec(p.text);
        if (tagLeak) fail(`${s.id} passage text leaks a tag fragment: ${JSON.stringify(tagLeak[0])}`);
        const entityLeak = ENTITY_LEAK_RE.exec(p.text);
        if (entityLeak) fail(`${s.id} passage text leaks an entity: ${JSON.stringify(entityLeak[0])}`);
      }
    });
  });

  process.stdout.write(`  5 books, ${totalSections} sections checked.\n`);
  process.stdout.write(`\n${failures} failure(s), ${warnings} warning(s) (warnings are expected/documented anomalies, not bugs).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
