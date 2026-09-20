/**
 * Validator for data/de-senectute-en.
 *
 *   npm run validate:de-senectute-en
 *
 * Run after `npm run import:de-senectute-en`. Checks:
 *   - exactly 85 flat section divisions
 *   - ids are unique; every id matches `sec-<number>[a-z]?`
 *   - every section has exactly one Passage with non-empty text, n === '',
 *     Passage.ref === null
 *   - every Division.ref (when non-null) is a plausible chapter token
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 *   - the one known "35"/"35b" duplicate-numbering irregularity is present
 *     and flagged (see index.ts's module doc) — not silently absent, not
 *     silently multiplied
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/de-senectute-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-senectute-en';
const EXPECTED_SECTIONS = 85;

let failures = 0;
function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

const TAG_LEAK_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
const ENTITY_LEAK_RE = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/;
const CHAPTER_TOKEN_RE = /^\d+$/;
const ID_RE = /^sec-(\d+)([a-z])?$/;

function main(): void {
  const file = join(REPO_ROOT, 'data', WORK_ID, 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== WORK_ID) fail(`work.workId is "${work.workId}", expected "${WORK_ID}"`);
  if (work.language !== 'en') fail(`work.language is "${work.language}", expected "en"`);

  if (work.divisions.length !== EXPECTED_SECTIONS) {
    fail(`expected ${EXPECTED_SECTIONS} section divisions, got ${work.divisions.length}`);
  }

  const seenIds = new Set<string>();
  let duplicateNumberSeen = false;
  for (const d of work.divisions) {
    const idMatch = ID_RE.exec(d.id);
    if (!idMatch) fail(`${d.id} does not match expected id shape sec-<number>[a-z]?`);
    if (seenIds.has(d.id)) fail(`duplicate id ${d.id}`);
    seenIds.add(d.id);
    if (idMatch?.[2]) duplicateNumberSeen = true;

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
  }

  if (!work.divisions.some((d) => d.id === 'sec-35b')) {
    fail('expected the documented "sec-35b" disambiguated duplicate to be present (see index.ts module doc) - its absence means the source anomaly this importer was built against has changed');
  }
  if (!duplicateNumberSeen) fail('expected at least one disambiguated (lettered) id, none found');
  if (work.divisions.some((d) => d.id === 'sec-36')) {
    fail('expected no "sec-36" (this witness has no milestone for section 36 - see index.ts module doc); found one, meaning the source may have changed');
  }

  const withRef = work.divisions.filter((d) => d.ref !== null).length;
  process.stdout.write(`${work.divisions.length} sections checked, ${withRef} carry a chapter ref, ${seenIds.size} unique ids.\n`);

  process.stdout.write(`\n${failures} failure(s).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
