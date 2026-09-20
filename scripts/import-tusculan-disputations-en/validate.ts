/**
 * Validator for data/tusculan-disputations-en/
 *
 *   npm run validate:tusculan-disputations-en
 *
 * Run after `npm run import:tusculan-disputations-en`. Checks:
 *   - exactly 5 Book divisions, ids `book-1`..`book-5` in order
 *   - each Book carries a non-empty editorialTitle (its printed subtitle)
 *   - section ids `book-N-sec-M`, 1-based and contiguous within each book
 *   - section counts match this edition's own printed numbering (49,27,34,38,42)
 *   - every section has exactly one Passage with non-empty text
 *   - every Division.ref and every Passage.ref is null; every Passage.n is ''
 *   - no leaked "[N]" footnote markers, stray "_" italic delimiters, or
 *     unescaped HTML/XML-style entities in any passage text
 *   - "[Greek: ...]" transliteration asides, where present, survive verbatim
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/tusculan-disputations-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_SECTION_COUNTS = [49, 27, 34, 38, 42];

let failures = 0;

function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

const FOOTNOTE_LEAK_RE = /\[\d+\]/;
const UNDERSCORE_LEAK_RE = /_/;

function main(): void {
  const file = join(REPO_ROOT, 'data', 'tusculan-disputations-en', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  process.stdout.write(`\n--- tusculan-disputations-en ---\n`);

  if (work.workId !== 'tusculan-disputations-en') fail(`workId is "${work.workId}", expected "tusculan-disputations-en"`);
  if (work.language !== 'en') fail(`language is "${work.language}", expected "en"`);
  if (work.divisions.length !== 5) fail(`expected 5 Book divisions, got ${work.divisions.length}`);

  let totalSections = 0;
  let greekAsideSections = 0;

  work.divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.number !== String(bi + 1)) fail(`${b.id}.number is ${JSON.stringify(b.number)}, expected "${bi + 1}"`);
    if (b.ref !== null) fail(`${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);
    if (b.passages.length !== 0) fail(`${b.id} should have 0 passages (container only), got ${b.passages.length}`);
    if (!b.editorialTitle || b.editorialTitle.trim().length === 0) fail(`${b.id}.editorialTitle should be a non-empty printed subtitle`);
    if (b.editorialTitle?.endsWith('.')) fail(`${b.id}.editorialTitle "${b.editorialTitle}" should have its trailing period stripped`);

    const want = EXPECTED_SECTION_COUNTS[bi]!;
    if (b.children.length !== want) fail(`${b.id}: ${b.children.length} sections, expected ${want}`);

    b.children.forEach((s, si) => {
      totalSections += 1;
      const wantSecId = `${wantBookId}-sec-${si + 1}`;
      if (s.id !== wantSecId) fail(`section at position ${si + 1} of Book ${bi + 1} has id "${s.id}", expected "${wantSecId}"`);
      if (s.number !== String(si + 1)) fail(`${s.id}.number is ${JSON.stringify(s.number)}, expected "${si + 1}"`);
      if (s.children.length !== 0) fail(`${s.id} should be a leaf (children: []), got ${s.children.length} children`);
      if (s.ref !== null) fail(`${s.id}.ref should be null, got ${JSON.stringify(s.ref)}`);
      if (s.editorialTitle !== null) fail(`${s.id}.editorialTitle should be null, got ${JSON.stringify(s.editorialTitle)}`);
      if (s.passages.length !== 1) fail(`${s.id} has ${s.passages.length} passages, expected exactly 1`);
      for (const p of s.passages) {
        if (p.n !== '') fail(`${s.id} passage.n is ${JSON.stringify(p.n)}, expected ""`);
        if (p.ref !== null) fail(`${s.id} passage.ref is ${JSON.stringify(p.ref)}, expected null`);
        if (!p.text || p.text.trim().length === 0) fail(`${s.id} has empty passage text`);
        const footnoteLeak = FOOTNOTE_LEAK_RE.exec(p.text);
        if (footnoteLeak) fail(`${s.id} passage text leaks a footnote marker: ${JSON.stringify(footnoteLeak[0])}`);
        const underscoreLeak = UNDERSCORE_LEAK_RE.exec(p.text);
        if (underscoreLeak) fail(`${s.id} passage text leaks an italic underscore`);
        if (p.text.includes('[Greek:')) greekAsideSections += 1;
      }
    });
  });

  if (greekAsideSections === 0) {
    fail('expected at least one section to carry a kept "[Greek: ...]" transliteration aside, found none');
  }

  process.stdout.write(`  5 books, ${totalSections} sections checked (${greekAsideSections} carry a kept "[Greek: ...]" aside).\n`);
  process.stdout.write(`\n${failures} failure(s).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
