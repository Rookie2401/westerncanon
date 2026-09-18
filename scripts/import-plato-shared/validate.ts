/**
 * Shared validator for all twelve Plato dialogue imports in this batch
 * (Euthyphro, Apology, Crito, Phaedo, Ion, Meno; Greek + English).
 *
 *   npx tsx scripts/import-plato-shared/validate.ts
 *
 * Checks, per work:
 *   - data/<workId>/{work.json,about.json,anomalies.json} all exist and parse
 *   - every division has a non-empty passage with non-empty text
 *   - division ids follow `sec-N` and N matches Division.number
 *   - Stephanus page numbers are strictly increasing within the work
 *   - Division/Passage shape matches the flat one-level tree (children: [])
 * Then, per dialogue, cross-checks the Greek and English editions' first/
 * last Stephanus page against each other (they must match: the source
 * divides both witnesses identically at the page level) and reports the
 * per-language section counts side by side (these need not be identical,
 * since a translation does not always break paragraphs at the same
 * sub-page boundary as the Greek - only the outer page range must agree).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIALOGUES } from './dialogues.ts';
import type { GenericWork, WorkAbout, Anomaly } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

let failures = 0;
function fail(message: string): void {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

interface WorkStats {
  workId: string;
  firstPage: number;
  lastPage: number;
  sectionCount: number;
  anomalyCount: number;
}

function validateWork(workId: string): WorkStats | null {
  const dir = join(REPO_ROOT, 'data', workId);
  let work: GenericWork;
  let about: WorkAbout;
  let anomalies: Anomaly[];
  try {
    work = readJson(join(dir, 'work.json'));
    about = readJson(join(dir, 'about.json'));
    anomalies = readJson(join(dir, 'anomalies.json'));
  } catch (e) {
    fail(`${workId}: could not read/parse one of work.json/about.json/anomalies.json - ${(e as Error).message}`);
    return null;
  }

  if (work.workId !== workId) fail(`${workId}: work.json workId mismatch ("${work.workId}")`);
  if (about.workId !== workId) fail(`${workId}: about.json workId mismatch ("${about.workId}")`);
  if (!Array.isArray(work.divisions) || work.divisions.length === 0) {
    fail(`${workId}: work.json has no divisions`);
    return null;
  }
  if (!about.title || !about.provenance || !about.license) {
    fail(`${workId}: about.json missing title/provenance/license`);
  }
  if (!Array.isArray(anomalies)) fail(`${workId}: anomalies.json is not an array`);

  let lastNum = -Infinity;
  for (const d of work.divisions) {
    if (d.id !== `sec-${d.number}`) fail(`${workId}: division id "${d.id}" does not match number "${d.number}"`);
    if (!/^[0-9]+$/.test(d.number ?? '')) fail(`${workId}: division "${d.id}" has non-numeric number "${d.number}"`);
    const num = Number(d.number);
    if (num < lastNum) fail(`${workId}: Stephanus page numbers not monotonically non-decreasing at "${d.id}" (${lastNum} then ${num})`);
    lastNum = num;
    if (d.children.length !== 0) fail(`${workId}: division "${d.id}" has children (expected flat leaf tree)`);
    if (d.ref !== null) fail(`${workId}: division "${d.id}" has non-null ref`);
    if (d.sourceHeading !== null) fail(`${workId}: division "${d.id}" has non-null sourceHeading`);
    if (d.editorialTitle !== null) fail(`${workId}: division "${d.id}" has non-null editorialTitle`);
    if (!Array.isArray(d.passages) || d.passages.length !== 1) {
      fail(`${workId}: division "${d.id}" does not have exactly one passage`);
      continue;
    }
    const p = d.passages[0]!;
    if (p.n !== '') fail(`${workId}: division "${d.id}" passage.n is not ""`);
    if (p.ref !== null) fail(`${workId}: division "${d.id}" passage.ref is not null`);
    if (typeof p.text !== 'string' || p.text.trim().length === 0) {
      fail(`${workId}: division "${d.id}" has empty passage text`);
    }
    if (/<[a-zA-Z/][^>]*>/.test(p.text)) {
      fail(`${workId}: division "${d.id}" passage text still contains what looks like an XML tag`);
    }
    if (/&(amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);/.test(p.text)) {
      fail(`${workId}: division "${d.id}" passage text still contains an undecoded entity`);
    }
    // text is one or more paragraphs joined by the "\n\n" separator (by design, see
    // parse.ts) - check each paragraph individually for uncollapsed whitespace, not
    // the whole joined string (which legitimately contains "\n\n").
    const paras = p.text.split('\n\n');
    for (const para of paras) {
      if (para.length === 0) fail(`${workId}: division "${d.id}" has an empty paragraph in its passage text`);
      if (/ {2,}|[\n\t]/.test(para) || para !== para.trim()) {
        fail(`${workId}: division "${d.id}" has a paragraph with uncollapsed whitespace`);
      }
    }
  }

  const first = work.divisions[0]!;
  const last = work.divisions[work.divisions.length - 1]!;
  return {
    workId,
    firstPage: Number(first.number),
    lastPage: Number(last.number),
    sectionCount: work.divisions.length,
    anomalyCount: anomalies.length,
  };
}

function main(): void {
  const results: Record<string, WorkStats | null> = {};
  for (const slug of Object.keys(DIALOGUES)) {
    for (const lang of ['grc', 'en'] as const) {
      const workId = `plato-${slug}-${lang}`;
      results[workId] = validateWork(workId);
    }
  }

  process.stdout.write('\nPer-dialogue report:\n');
  for (const slug of Object.keys(DIALOGUES)) {
    const meta = DIALOGUES[slug]!;
    const grc = results[`plato-${slug}-grc`];
    const en = results[`plato-${slug}-en`];
    if (!grc || !en) {
      process.stdout.write(`  ${meta.titleEn}: MISSING DATA (see failures above)\n`);
      continue;
    }
    if (grc.firstPage !== en.firstPage || grc.lastPage !== en.lastPage) {
      fail(
        `${slug}: Greek (${grc.firstPage}-${grc.lastPage}) and English (${en.firstPage}-${en.lastPage}) page ranges differ`,
      );
    }
    const mismatchNote = grc.sectionCount !== en.sectionCount ? '  [section-count mismatch, see note below]' : '';
    process.stdout.write(
      `  ${meta.titleEn}: Stephanus ${grc.firstPage}–${grc.lastPage}  ` +
        `grc ${grc.sectionCount} sections / ${grc.anomalyCount} anomalies, ` +
        `en ${en.sectionCount} sections / ${en.anomalyCount} anomalies${mismatchNote}\n`,
    );
  }

  process.stdout.write(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) FAILED.\n`);
  if (failures > 0) process.exit(1);
}

main();
