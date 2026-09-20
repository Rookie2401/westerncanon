/**
 * Validator for data/in-catilinam-en. Run after the importer:
 *   npx tsx scripts/import-in-catilinam-en/index.ts
 *   npx tsx scripts/import-in-catilinam-en/validate.ts
 *
 * Checks: 4 speeches present, 115 sections present (33/29/29/24 per
 * speech, matching the Latin sibling), every Division id matches the
 * speech-N / speech-N-sec-M shape, no empty passage text, no leaked XML
 * tags or unresolved entities.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/in-catilinam-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', 'data', 'in-catilinam-en');
const CANONICAL_SECTION_COUNTS: Record<number, number> = { 1: 33, 2: 29, 3: 29, 4: 24 };

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

  check(work.workId === 'in-catilinam-en', `workId is "in-catilinam-en" (found "${work.workId}")`);
  check(work.language === 'en', `language is "en" (found "${work.language}")`);
  check(work.divisions.length === 4, `4 speeches present (found ${work.divisions.length})`);

  const totalSections = work.divisions.reduce((n, sp) => n + sp.children.length, 0);
  check(totalSections === 115, `115 sections present (found ${totalSections})`);

  let emptyPassages = 0;
  let leakedTags = 0;
  let leakedEntities = 0;
  let badIds = 0;
  let badRefs = 0;
  const tagRe = /<[^>]*>/;
  const entRe = /&(?!amp;|lt;|gt;|quot;|apos;)/;

  work.divisions.forEach((sp, i) => {
    check(sp.id === `speech-${i + 1}`, `speech ${i + 1} id is "speech-${i + 1}" (found "${sp.id}")`);
    const want = CANONICAL_SECTION_COUNTS[i + 1]!;
    check(sp.children.length === want, `${sp.id} has ${want} sections (found ${sp.children.length})`);
    check(typeof sp.sourceHeading === 'string' && sp.sourceHeading.length > 0, `${sp.id} has a non-empty sourceHeading`);
    check(sp.passages.length === 0, `${sp.id} carries no passages of its own`);

    sp.children.forEach((sec, j) => {
      const wantId = `speech-${i + 1}-sec-${j + 1}`;
      if (sec.id !== wantId) badIds += 1;
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

  check(badIds === 0, `every section id matches speech-N-sec-M in order (found ${badIds} mismatches)`);
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
