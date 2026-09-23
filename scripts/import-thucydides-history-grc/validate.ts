/**
 * Validator for data/thucydides-history-grc/.
 *
 *   npx tsx scripts/import-thucydides-history-grc/validate.ts
 *
 * Run after `npm run import:thucydides-history-grc`. Checks:
 *   - exactly 8 Book divisions, ids `book-1`..`book-8` in order
 *   - chapter counts match this edition's own totals
 *     (146/103/116/135/116/105/87/109, 917 total)
 *   - chapter ids `book-N-ch-M`, 1-based contiguous within each book (no
 *     letter-suffixed chapters, unlike Herodotus)
 *   - every chapter has exactly one Passage with non-empty text, n === '',
 *     ref === null
 *   - every Division.ref and sourceHeading is null throughout
 *   - no leaked XML/HTML tag fragments or unescaped entities in any passage
 *     text
 *   - the work opens with Thucydides's own opening sentence
 *   - the Melian Dialogue's speaker-labelled chapters carry the expected
 *     "ΑΘ."/"ΜΗΛ." prefix
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/thucydides-history-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_CHAPTER_COUNTS = [146, 103, 116, 135, 116, 105, 87, 109];
const EXPECTED_BOOKS = 8;
const OPENING = 'Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον';

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
  const file = join(REPO_ROOT, 'data', 'thucydides-history-grc', 'work.json');
  const work = JSON.parse(readFileSync(file, 'utf8')) as GenericWork;

  if (work.workId !== 'thucydides-history-grc') fail(`workId is ${JSON.stringify(work.workId)}, expected "thucydides-history-grc"`);
  if (work.language !== 'grc') fail(`language is ${JSON.stringify(work.language)}, expected "grc"`);

  const divisions = work.divisions;
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);

  let totalChapters = 0;
  let dialogueChapterCount = 0;

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
      if (c.sourceHeading !== null) fail(`${c.id}.sourceHeading should be null, got ${JSON.stringify(c.sourceHeading)}`);
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
        if (/^(ΑΘ\.|ΜΗΛ\.) /.test(p.text)) dialogueChapterCount += 1;
      }
    });
  });

  if (totalChapters !== 917) warn(`expected 917 total chapters, got ${totalChapters}`);
  if (dialogueChapterCount === 0) warn('expected at least one Melian Dialogue chapter with a "ΑΘ."/"ΜΗΛ." speaker prefix, found none');

  // The work must open with Thucydides's own opening sentence.
  const book1 = divisions[0];
  const ch1 = book1?.children[0];
  if (!ch1 || ch1.number !== '1') {
    fail('Book 1 chapter 1 not found where expected');
  } else if (!ch1.passages[0]!.text.startsWith(OPENING)) {
    fail(`Book 1 chapter 1 does not open with the expected opening "${OPENING}..."`);
  }

  // Book 5 chapter 87 is the first Melian Dialogue turn (Athenian speaker).
  const book5 = divisions[4];
  const ch87 = book5?.children.find((c) => c.number === '87');
  if (!ch87) {
    fail('Book 5 chapter 87 (first Melian Dialogue turn) not found where expected');
  } else if (!ch87.passages[0]!.text.startsWith('ΑΘ. ')) {
    fail(`Book 5 chapter 87 does not open with the expected "ΑΘ. " speaker label, got: "${ch87.passages[0]!.text.slice(0, 40)}"`);
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
