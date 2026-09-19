/**
 * Validator for data/metaphysics-en. Run after the importer:
 *   npx tsx scripts/import-aristotle-metaphysics-en/index.ts
 *   npx tsx scripts/import-aristotle-metaphysics-en/validate.ts
 *
 * Checks: no empty passage text, no leaked XML/HTML tags or unresolved
 * entities in any passage text, and reports the book/chapter coverage
 * (NOT 14 complete books - see index.ts's top doc comment for why).
 *
 * One nuance handled deliberately, not a bug: four spans of literal
 * "<...>" text ARE genuine, verified source content - Ross's own 1908
 * translation uses angle brackets for his editorial glosses/insertions
 * within the English prose (e.g. "the higher <more abstract> classes"),
 * printed as such in the book and correctly entity-decoded (&lt;...&gt;)
 * from the Wikisource HTML by this importer. These four exact strings are
 * allow-listed below (verified by hand against the raw source); any OTHER
 * "<...>" span is treated as a real leaked tag and fails the check.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from '../../data/metaphysics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', 'data', 'metaphysics-en');

const KNOWN_GENUINE_ANGLE_BRACKET_SPANS = new Set([
  '<more abstract>',
  '<more concrete>',
  '<sc. points>',
  '<the stones are to the house as part to whole,>',
]);

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

  process.stdout.write(`books present: ${work.divisions.length}/14 (${work.divisions.map((b) => b.id).join(', ')})\n`);
  const totalChapters = work.divisions.reduce((n, b) => n + b.children.length, 0);
  process.stdout.write(`chapters present: ${totalChapters}\n`);

  let emptyPassages = 0;
  let leakedTags = 0;
  let leakedEntities = 0;
  const tagRe = /<[^>]*>/g;
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
        const tagMatches = p.text.match(tagRe) ?? [];
        for (const m of tagMatches) {
          if (!KNOWN_GENUINE_ANGLE_BRACKET_SPANS.has(m)) {
            leakedTags += 1;
            process.stderr.write(`  possible leaked tag in ${c.id}: ${JSON.stringify(m)} (context: ${JSON.stringify(p.text.slice(0, 120))})\n`);
          }
        }
        if (entRe.test(p.text)) {
          leakedEntities += 1;
          process.stderr.write(`  possible leaked entity in ${c.id}: ${JSON.stringify(p.text.slice(0, 120))}\n`);
        }
      }
    }
  }
  check(emptyPassages === 0, `no empty passage text (found ${emptyPassages})`);
  check(leakedTags === 0, `no leaked XML/HTML tags beyond the 4 known-genuine angle-bracket spans (found ${leakedTags} unexplained)`);
  check(leakedEntities === 0, `no leaked/unresolved entities (found ${leakedEntities})`);

  if (failures > 0) {
    process.stderr.write(`\n${failures} check(s) FAILED.\n`);
    process.exit(1);
  }
  process.stdout.write('\nAll checks passed. (Coverage is intentionally partial - see index.ts and about.json for why.)\n');
}

main();
