/**
 * Validator for data/jewish-war-grc. Run after the importer:
 *   npx tsx scripts/import-jewish-war-grc/index.ts
 *   npx tsx scripts/import-jewish-war-grc/validate.ts
 *
 * Checks: 7 books present, 4001 sections present (673/654/542/663/572/442/455
 * per book, continuous 1..count in each), every Division id matches
 * book-N / book-N-sec-M in strict order, every Book has a non-empty
 * sourceHeading, every Section has a null sourceHeading and a null ref, no
 * empty passage text, no leaked XML tags or unresolved entities.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/jewish-war-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', 'data', 'jewish-war-grc');
const EXPECTED_SECTION_COUNTS: Record<string, number> = {
  'book-1': 673,
  'book-2': 654,
  'book-3': 542,
  'book-4': 663,
  'book-5': 572,
  'book-6': 442,
  'book-7': 455,
};

let failures = 0;
function check(cond: boolean, msg: string): void {
  if (!cond) {
    failures += 1;
    process.stderr.write(`FAIL: ${msg}\n`);
  } else {
    process.stdout.write(`ok:   ${msg}\n`);
  }
}

function main(): void {
  const work = JSON.parse(readFileSync(join(DATA_DIR, 'work.json'), 'utf8')) as GenericWork;

  check(work.workId === 'jewish-war-grc', `workId is "jewish-war-grc" (found "${work.workId}")`);
  check(work.language === 'grc', `language is "grc" (found "${work.language}")`);
  check(work.divisions.length === 7, `7 books present (found ${work.divisions.length})`);

  let totalSections = 0;
  let emptyPassages = 0;
  let leakedTags = 0;
  let leakedEntities = 0;
  let badIds = 0;
  let badRefs = 0;
  let badSourceHeadings = 0;
  const tagRe = /<[^>]*>/;
  const entRe = /&(?!amp;|lt;|gt;|quot;|apos;)/;

  work.divisions.forEach((bk, i) => {
    const wantId = `book-${i + 1}`;
    check(bk.id === wantId, `book ${i + 1} id is "${wantId}" (found "${bk.id}")`);
    check(bk.ref === null, `${bk.id} has null ref`);
    check(typeof bk.sourceHeading === 'string' && bk.sourceHeading.length > 0, `${bk.id} has a non-empty sourceHeading`);
    check(bk.passages.length === 0, `${bk.id} carries no passages of its own`);
    const wantSections = EXPECTED_SECTION_COUNTS[wantId]!;
    check(bk.children.length === wantSections, `${bk.id} has ${wantSections} sections (found ${bk.children.length})`);

    bk.children.forEach((sec, j) => {
      totalSections += 1;
      const wantSecId = `book-${i + 1}-sec-${j + 1}`;
      if (sec.id !== wantSecId) badIds += 1;
      if (sec.number !== String(j + 1)) badIds += 1;
      if (sec.ref !== null) badRefs += 1;
      if (sec.sourceHeading !== null) badSourceHeadings += 1;
      check(sec.passages.length === 1, `${sec.id} has exactly one passage`);
      check(sec.children.length === 0, `${sec.id} has no children`);
      for (const p of sec.passages) {
        if (p.text.length === 0) {
          emptyPassages += 1;
          process.stderr.write(`  empty passage in ${sec.id}\n`);
        }
        if (tagRe.test(p.text)) {
          leakedTags += 1;
          process.stderr.write(`  possible leaked tag in ${sec.id}: ${JSON.stringify(p.text.slice(0, 120))}\n`);
        }
        if (entRe.test(p.text)) {
          leakedEntities += 1;
          process.stderr.write(`  possible leaked entity in ${sec.id}: ${JSON.stringify(p.text.slice(0, 120))}\n`);
        }
        if (p.n !== '') {
          process.stderr.write(`  unexpected non-empty Passage.n in ${sec.id}: ${JSON.stringify(p.n)}\n`);
          badIds += 1;
        }
        if (p.ref !== null) badRefs += 1;
      }
    });
  });

  check(totalSections === 4001, `4001 sections present total (found ${totalSections})`);
  check(badIds === 0, `every section id/number matches its expected shape in strict order (found ${badIds} mismatches)`);
  check(badRefs === 0, `every ref (Book, Section, Passage) is null (found ${badRefs} non-null)`);
  check(badSourceHeadings === 0, `every section sourceHeading is null (found ${badSourceHeadings} non-null)`);
  check(emptyPassages === 0, `no empty passage text (found ${emptyPassages})`);
  check(leakedTags === 0, `no leaked XML tags (found ${leakedTags})`);
  check(leakedEntities === 0, `no leaked/unresolved entities (found ${leakedEntities})`);

  if (failures > 0) {
    process.stderr.write(`\n${failures} check(s) FAILED.\n`);
    process.exit(1);
  }
  process.stdout.write('\nAll checks passed.\n');
}

main();
