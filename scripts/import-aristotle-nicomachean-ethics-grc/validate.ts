/**
 * Shared validator for both Nicomachean Ethics corpora:
 *   data/nicomachean-ethics-grc/   data/nicomachean-ethics-en/
 *
 *   npm run validate:aristotle-nicomachean-ethics
 *
 * Run after both `npm run import:aristotle-nicomachean-ethics-grc` and
 * `npm run import:aristotle-nicomachean-ethics-en`. Checks, for each
 * edition independently and then across both:
 *   - exactly 10 Book divisions, ids `book-1`..`book-10` in order
 *   - chapter ids `book-N-ch-M`, 1-based and contiguous within each book
 *   - chapter counts are reported against the traditionally cited numbers
 *     (13,9,12,9,11,13,15,16,12,9) and any mismatch is flagged, never
 *     silently forced to match
 *   - every chapter has exactly one Passage with non-empty text
 *   - every Division.ref (when non-null) looks like a Bekker page/range
 *     token; every Passage.ref is null; every Passage.n is ''
 *   - no leaked XML/HTML tag fragments or unescaped entities in any
 *     passage text
 *   - the two editions parse to the same 10/116 book/chapter split (a real
 *     mismatch would be reported, not reconciled - as it happens, they agree)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork as GrcWork } from '../../data/nicomachean-ethics-grc/types.ts';
import type { GenericWork as EnWork } from '../../data/nicomachean-ethics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const CANONICAL_CHAPTER_COUNTS = [13, 9, 12, 9, 11, 13, 15, 16, 12, 9];

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
const BEKKER_TOKEN_RE = /^\d{4}[ab](–\d{4}[ab])?$/;

function validateEdition(label: string, work: { workId: string; language: string; divisions: unknown[] }): void {
  process.stdout.write(`\n--- ${label} (${work.workId}) ---\n`);

  const divisions = work.divisions as Array<{
    id: string;
    number: string | null;
    ref: string | null;
    children: Array<{
      id: string;
      number: string | null;
      ref: string | null;
      passages: Array<{ n: string; text: string; ref: string | null; anomaly?: string }>;
    }>;
  }>;

  if (divisions.length !== 10) {
    fail(`${label}: expected 10 Book divisions, got ${divisions.length}`);
  }

  let totalChapters = 0;
  const mismatches: string[] = [];

  divisions.forEach((b, bi) => {
    const wantBookId = `book-${bi + 1}`;
    if (b.id !== wantBookId) fail(`${label}: Book ${bi + 1} has id "${b.id}", expected "${wantBookId}"`);
    if (b.ref !== null) fail(`${label}: ${b.id}.ref should be null, got ${JSON.stringify(b.ref)}`);

    const want = CANONICAL_CHAPTER_COUNTS[bi]!;
    const got = b.children.length;
    if (got !== want) mismatches.push(`Book ${bi + 1}: parsed ${got}, traditionally cited ${want}`);

    b.children.forEach((c, ci) => {
      totalChapters += 1;
      const wantChId = `${wantBookId}-ch-${ci + 1}`;
      if (c.id !== wantChId) {
        fail(`${label}: chapter at position ${ci + 1} of Book ${bi + 1} has id "${c.id}", expected "${wantChId}"`);
      }
      if (c.number !== String(ci + 1)) {
        fail(`${label}: ${c.id}.number is ${JSON.stringify(c.number)}, expected "${ci + 1}"`);
      }
      if (c.ref !== null && !BEKKER_TOKEN_RE.test(c.ref)) {
        fail(`${label}: ${c.id}.ref "${c.ref}" does not look like a Bekker page/range token`);
      }
      if (c.passages.length !== 1) {
        fail(`${label}: ${c.id} has ${c.passages.length} passages, expected exactly 1`);
      }
      for (const p of c.passages) {
        if (p.n !== '') fail(`${label}: ${c.id} passage.n is ${JSON.stringify(p.n)}, expected ""`);
        if (p.ref !== null) fail(`${label}: ${c.id} passage.ref is ${JSON.stringify(p.ref)}, expected null`);
        if (!p.text || p.text.trim().length === 0) {
          fail(`${label}: ${c.id} has empty passage text`);
        }
        const tagLeak = TAG_LEAK_RE.exec(p.text);
        if (tagLeak) fail(`${label}: ${c.id} passage text leaks a tag fragment: ${JSON.stringify(tagLeak[0])}`);
        const entityLeak = ENTITY_LEAK_RE.exec(p.text);
        if (entityLeak) fail(`${label}: ${c.id} passage text leaks an entity: ${JSON.stringify(entityLeak[0])}`);
      }
    });
  });

  if (mismatches.length > 0) {
    warn(`${label}: ${mismatches.length} book(s) differ from the traditionally cited chapter count - ${mismatches.join('; ')}`);
  }

  process.stdout.write(`  ${divisions.length} books, ${totalChapters} chapters checked.\n`);
}

function loadWork<T>(dataDirName: string): T {
  const file = join(REPO_ROOT, 'data', dataDirName, 'work.json');
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function main(): void {
  const grc = loadWork<GrcWork>('nicomachean-ethics-grc');
  const en = loadWork<EnWork>('nicomachean-ethics-en');

  validateEdition('Greek (Bywater 1894)', grc as unknown as { workId: string; language: string; divisions: unknown[] });
  validateEdition('English (Rackham 1926)', en as unknown as { workId: string; language: string; divisions: unknown[] });

  // --- cross-edition structural agreement (informational, not forced) ----
  process.stdout.write('\n--- cross-edition comparison ---\n');
  if (grc.divisions.length === en.divisions.length) {
    let bookMismatches = 0;
    for (let i = 0; i < grc.divisions.length; i++) {
      const gb = grc.divisions[i]!;
      const eb = en.divisions[i]!;
      if (gb.children.length !== eb.children.length) {
        bookMismatches += 1;
        warn(`Book ${i + 1}: grc has ${gb.children.length} chapters, en has ${eb.children.length}`);
      }
    }
    if (bookMismatches === 0) {
      process.stdout.write('  Both editions agree on 10/10 book chapter-counts, chapter-for-chapter.\n');
    }
  } else {
    fail(`edition book counts differ: grc=${grc.divisions.length} en=${en.divisions.length}`);
  }

  process.stdout.write(`\n${failures} failure(s), ${warnings} warning(s) (warnings are expected/documented anomalies, not bugs).\n`);
  if (failures > 0) {
    process.stderr.write(`\nSTOP: ${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nOK.\n');
}

main();
