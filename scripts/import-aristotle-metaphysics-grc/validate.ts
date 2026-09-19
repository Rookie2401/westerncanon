/**
 * Validator for data/metaphysics-grc. Run after the importer:
 *   npx tsx scripts/import-aristotle-metaphysics-grc/index.ts
 *   npx tsx scripts/import-aristotle-metaphysics-grc/validate.ts
 *
 * Checks: 14 books present, 142 chapters present, no empty passage text, no
 * leaked XML tags or unresolved entities in any passage text.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/metaphysics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', 'data', 'metaphysics-grc');

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

  check(work.divisions.length === 14, `14 books present (found ${work.divisions.length})`);

  const totalChapters = work.divisions.reduce((n, b) => n + b.children.length, 0);
  check(totalChapters === 142, `142 chapters present (found ${totalChapters})`);

  let emptyPassages = 0;
  let leakedTags = 0;
  let leakedEntities = 0;
  const tagRe = /<[^>]*>/;
  const entRe = /&(?!amp;|lt;|gt;|quot;|apos;)/;
  for (const b of work.divisions) {
    check(b.children.length > 0, `${b.id} has at least one chapter`);
    for (const c of b.children) {
      check(c.passages.length > 0, `${c.id} has at least one passage`);
      for (const p of c.passages) {
        if (p.text.length === 0) {
          emptyPassages += 1;
          process.stderr.write(`  empty passage in ${c.id}\n`);
        }
        if (tagRe.test(p.text)) {
          leakedTags += 1;
          process.stderr.write(`  possible leaked tag in ${c.id}: ${JSON.stringify(p.text.slice(0, 120))}\n`);
        }
        if (entRe.test(p.text)) {
          leakedEntities += 1;
          process.stderr.write(`  possible leaked entity in ${c.id}: ${JSON.stringify(p.text.slice(0, 120))}\n`);
        }
      }
    }
  }
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
