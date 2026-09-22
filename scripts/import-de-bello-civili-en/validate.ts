/**
 * Validator for data/de-bello-civili-en/.
 *
 *   npx tsx scripts/import-de-bello-civili-en/validate.ts
 *
 * Run after `npm run import:de-bello-civili-en`. Checks the same structural
 * shape as scripts/import-de-bello-civili-la/validate.ts, plus a
 * cross-edition comparison against the Latin sibling (informational, not
 * forced - the two witnesses do in fact agree exactly).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork as EnWork } from '../../data/de-bello-civili-en/types.ts';
import type { GenericWork as LaWork } from '../../data/de-bello-civili-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_CHAPTER_COUNTS = [87, 44, 112];

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
  const work = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'de-bello-civili-en', 'work.json'), 'utf8')) as EnWork;

  if (work.workId !== 'de-bello-civili-en') fail(`workId is ${JSON.stringify(work.workId)}, expected "de-bello-civili-en"`);
  if (work.language !== 'en') fail(`language is ${JSON.stringify(work.language)}, expected "en"`);

  const divisions = work.divisions;
  if (divisions.length !== 3) fail(`expected 3 Book divisions, got ${divisions.length}`);

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

  if (totalChapters !== 243) warn(`expected 243 total chapters, got ${totalChapters}`);

  // --- cross-edition comparison against the Latin sibling -----------------
  const laFile = join(REPO_ROOT, 'data', 'de-bello-civili-la', 'work.json');
  try {
    const la = JSON.parse(readFileSync(laFile, 'utf8')) as LaWork;
    if (la.divisions.length === divisions.length) {
      let mismatches = 0;
      for (let i = 0; i < divisions.length; i++) {
        if (la.divisions[i]!.children.length !== divisions[i]!.children.length) {
          mismatches += 1;
          warn(`Book ${i + 1}: la has ${la.divisions[i]!.children.length} chapters, en has ${divisions[i]!.children.length}`);
        }
      }
      if (mismatches === 0) process.stdout.write('\nCross-edition check: la and en agree on 3/3 book chapter-counts, chapter-for-chapter.\n');
    } else {
      fail(`edition book counts differ: la=${la.divisions.length} en=${divisions.length}`);
    }
  } catch {
    warn(`could not read ${laFile} for cross-edition comparison (run the Latin importer first for a full check)`);
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
