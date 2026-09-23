/**
 * Shared run-once ingestion driver used by all ten
 * scripts/import-plato-<dialogue>-<lang>/index.ts entry points. Reads the
 * dialogue's already-fetched raw TEI XML, tokenizes it (parse.ts), checks
 * the result against the independently-verified Stephanus page range for
 * that dialogue, and writes work.json / about.json / anomalies.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAbout } from './aboutText.ts';
import { parseDialogue } from './parse.ts';
import type { GenericWork } from './types.ts';
import { dialogueMeta, type DialogueMeta } from './works.ts';

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

export interface RunImportOptions {
  slug: DialogueMeta['slug'];
  lang: 'grc' | 'en';
  /** absolute path to this importer's raw XML file */
  rawPath: string;
  /** absolute path to this importer's repo-root data/<workId> output directory */
  outDir: string;
}

export function runImport(opts: RunImportOptions): void {
  const meta = dialogueMeta(opts.slug);
  const workId = `plato-${meta.slug}-${opts.lang}`;

  mkdirSync(opts.outDir, { recursive: true });
  const xml = readFileSync(opts.rawPath, 'utf8');
  process.stdout.write(`parsing ${opts.rawPath} ...\n`);

  const result = parseDialogue(xml, workId);
  const { divisions, anomalies } = result;

  // --- structural cross-checks against the independently-verified range ---
  if (divisions.length === 0) fail(`${workId}: zero Stephanus-page divisions parsed`);

  const numbers = divisions.map((d) => Number(d.number));
  const first = numbers[0]!;
  const last = numbers[numbers.length - 1]!;
  if (first !== meta.firstPage) fail(`${workId}: first Stephanus page ${first} != expected ${meta.firstPage}`);
  if (last !== meta.lastPage) fail(`${workId}: last Stephanus page ${last} != expected ${meta.lastPage}`);
  const expectedCount = meta.lastPage - meta.firstPage + 1;
  if (divisions.length !== expectedCount) {
    fail(`${workId}: expected ${expectedCount} Stephanus pages (${meta.firstPage}-${meta.lastPage}), got ${divisions.length}`);
  }
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1]! + 1) {
      fail(`${workId}: non-monotonic Stephanus page sequence at index ${i}: ${numbers[i - 1]} -> ${numbers[i]}`);
    }
  }
  for (const d of divisions) {
    if (d.id !== `sec-${d.number}`) fail(`${workId}: division id ${d.id} does not match sec-${d.number}`);
    // Exactly one passage per Stephanus page, except where a page is shared
    // by several letters in the Epistles (see parse.ts) - then one per
    // letter-part, in source order (page 358 carries three).
    if (d.passages.length < 1) fail(`${workId}: division ${d.id} has no passages`);
    if (d.children.length !== 0) fail(`${workId}: division ${d.id} unexpectedly has children`);
    for (const p of d.passages) if (p.text.length === 0) fail(`${workId}: division ${d.id} has empty passage text`);
  }

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: `${workId} / passage & division refs`,
    note: 'Every passage and division ref is null: the Stephanus page number is itself the citation. Finer a/b/c/d sub-page lettering is stripped as transport scaffolding, not tracked as a separate ref field.',
  });
  anomalies.push({
    where: `${workId} / speaker labels`,
    note: 'Speaker abbreviations (e.g. "ΣΩ." / "Soc.") are kept verbatim as the start of each paragraph exactly where the source prints one; the source prints a label only when the speaker changes from the previous paragraph (standard typesetting for a continuous speech split across paragraphs), so most paragraphs of a longer speech carry no repeated label — not a parsing gap.',
  });

  const work: GenericWork = { workId, language: opts.lang, divisions };
  const about = buildAbout(meta, opts.lang, {
    pageCount: divisions.length,
    delCount: result.delCount,
    addCount: result.addCount,
    gapCount: result.gapCount,
    corrCount: result.corrCount,
    sicCount: result.sicCount,
  });

  writeJson(opts.outDir, 'work.json', work);
  writeJson(opts.outDir, 'about.json', about);
  writeJson(opts.outDir, 'anomalies.json', anomalies);

  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(
    `  ${divisions.length} Stephanus pages (${meta.firstPage}-${meta.lastPage})  ${totalChars} chars  ` +
      `${result.delCount} <del>  ${result.addCount} <add>  ${result.gapCount} <gap/>  ${result.corrCount} <corr>  ${result.sicCount} <sic>\n`,
  );
  process.stdout.write(`Done. ${workId} written to ${opts.outDir}\n`);
}

function writeJson(dir: string, name: string, data: unknown): void {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}
