/**
 * Checks DIAGRAMS_ARISTOTLE (aristotle.ts) against the shipped data: every
 * divisionId resolves to exactly one division in data/<workId>/work.json,
 * the passage index exists, the passage carries the attached figure, and
 * the PNG exists with exactly the recorded pixel size.
 *
 *   npx tsx scripts/import-aristotle-rest-shared/diagrams/check-aristotle.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DIAGRAMS_ARISTOTLE } from './aristotle.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', '..', '..', 'data');

interface Passage { text: string; figure?: { image?: string; imageWidth?: number; imageHeight?: number } }
interface Division { id: string; passages: Passage[]; children: Division[] }

async function main(): Promise<void> {
  const problems: string[] = [];
  let checked = 0;
  for (const [workId, list] of Object.entries(DIAGRAMS_ARISTOTLE)) {
    const work = JSON.parse(readFileSync(join(DATA, workId, 'work.json'), 'utf8')) as { divisions: Division[] };
    const all: Division[] = [];
    const walk = (ds: Division[]) => { for (const d of ds) { all.push(d); walk(d.children); } };
    walk(work.divisions);
    const ids = all.map((d) => d.id);
    if (new Set(ids).size !== ids.length) problems.push(`${workId}: division ids are not unique`);
    for (const dg of list) {
      checked += 1;
      const label = `${workId} / ${dg.divisionId} [${dg.image}]`;
      const matches = all.filter((d) => d.id === dg.divisionId);
      if (matches.length !== 1) { problems.push(`${label}: ${matches.length} divisions match the id`); continue; }
      const passage = matches[0]!.passages[dg.passageIndex];
      if (!passage) { problems.push(`${label}: no passage at index ${dg.passageIndex}`); continue; }
      if (passage.figure?.image !== dg.image) problems.push(`${label}: shipped passage.figure.image is ${JSON.stringify(passage.figure?.image)} (re-run the importer?)`);
      const abs = join(DATA, workId, dg.image);
      if (!existsSync(abs)) { problems.push(`${label}: file missing`); continue; }
      const meta = await sharp(abs).metadata();
      if (meta.width !== dg.width || meta.height !== dg.height) problems.push(`${label}: real size ${meta.width}x${meta.height} != recorded ${dg.width}x${dg.height}`);
      if (passage.figure && (passage.figure.imageWidth !== dg.width || passage.figure.imageHeight !== dg.height)) problems.push(`${label}: shipped figure dims differ from the map`);
    }
  }
  for (const p of problems) process.stderr.write(`FAIL: ${p}\n`);
  process.stdout.write(`${checked} diagram(s) checked, ${problems.length} problem(s)\n`);
  if (problems.length) process.exit(1);
}

main().catch((e) => { process.stderr.write(String(e) + '\n'); process.exit(1); });
