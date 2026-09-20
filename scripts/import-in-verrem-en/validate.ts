/**
 * Validator for data/in-verrem-en. Run after the importer:
 *   npx tsx scripts/import-in-verrem-en/index.ts
 *   npx tsx scripts/import-in-verrem-en/validate.ts
 *
 * Checks: 2 actiones present (1 book / 5 books), 974 sections present
 * (56 / 158,192,228,151,189 per book, matching the Latin sibling), every
 * Division id matches actio-N / actio-N-book-M / actio-N-book-M-sec-K in
 * strict order, every Book has a non-empty sourceHeading, no empty passage
 * text, no leaked XML tags or unresolved entities.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/in-verrem-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', 'data', 'in-verrem-en');
const EXPECTED_BOOK_SECTION_COUNTS: Record<string, number> = {
  'actio-1-book-1': 56,
  'actio-2-book-1': 158,
  'actio-2-book-2': 192,
  'actio-2-book-3': 228,
  'actio-2-book-4': 151,
  'actio-2-book-5': 189,
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

  check(work.workId === 'in-verrem-en', `workId is "in-verrem-en" (found "${work.workId}")`);
  check(work.language === 'en', `language is "en" (found "${work.language}")`);
  check(work.divisions.length === 2, `2 actiones present (found ${work.divisions.length})`);

  let totalBooks = 0;
  let totalSections = 0;
  let emptyPassages = 0;
  let leakedTags = 0;
  let leakedEntities = 0;
  let badIds = 0;
  let badRefs = 0;
  const tagRe = /<[^>]*>/;
  const entRe = /&(?!amp;|lt;|gt;|quot;|apos;)/;

  work.divisions.forEach((ac, i) => {
    check(ac.id === `actio-${i + 1}`, `actio ${i + 1} id is "actio-${i + 1}" (found "${ac.id}")`);
    check(ac.sourceHeading === null, `${ac.id} has null sourceHeading`);
    check(ac.passages.length === 0, `${ac.id} carries no passages of its own`);
    const wantBooks = i === 0 ? 1 : 5;
    check(ac.children.length === wantBooks, `${ac.id} has ${wantBooks} book(s) (found ${ac.children.length})`);

    ac.children.forEach((bk, j) => {
      totalBooks += 1;
      const wantId = `actio-${i + 1}-book-${j + 1}`;
      if (bk.id !== wantId) badIds += 1;
      check(typeof bk.sourceHeading === 'string' && bk.sourceHeading.length > 0, `${bk.id} has a non-empty sourceHeading`);
      check(bk.passages.length === 0, `${bk.id} carries no passages of its own`);
      const wantSections = EXPECTED_BOOK_SECTION_COUNTS[wantId]!;
      check(bk.children.length === wantSections, `${bk.id} has ${wantSections} sections (found ${bk.children.length})`);

      bk.children.forEach((sec, k) => {
        totalSections += 1;
        const wantSecId = `actio-${i + 1}-book-${j + 1}-sec-${k + 1}`;
        if (sec.id !== wantSecId) badIds += 1;
        if (sec.ref !== null && !/^\d+$/.test(sec.ref)) badRefs += 1;
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
        }
      });
    });
  });

  check(totalBooks === 6, `6 books present total (found ${totalBooks})`);
  check(totalSections === 974, `974 sections present total (found ${totalSections})`);
  check(badIds === 0, `every division id matches its expected shape in order (found ${badIds} mismatches)`);
  check(badRefs === 0, `every non-null section ref is a plain arabic numeral (found ${badRefs} malformed)`);
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
