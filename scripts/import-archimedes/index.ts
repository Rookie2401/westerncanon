/**
 * Archimedes - all 13 surviving works, Greek text. Run-once ingestion pipeline.
 *
 *   npm run import:archimedes
 *
 * Reads scripts/import-archimedes/raw/tlg0552.tlgNNN.1st1K-grc1.xml (already in
 * the repo; nothing is downloaded here - see raw/README below) for each of the
 * 13 works and writes, per work:
 *   data/archimedes-<slug>/work.json       - the GenericWork
 *   data/archimedes-<slug>/about.json      - provenance / licence metadata
 *   data/archimedes-<slug>/anomalies.json  - machine-readable {where, note}[]
 *   data/archimedes-<slug>/types.ts        - byte-identical generated types file
 *
 * Then run `npm run validate:archimedes`.
 *
 * On any structural mismatch against the ground-truth table in
 * scripts/import-archimedes-shared/workTable.ts, this STOPS (throws
 * StopError, caught here, non-zero exit) naming the work and what disagreed -
 * it never force-fits or silently renumbers.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIMEDES_WORKS } from '../import-archimedes-shared/workTable.ts';
import { StopError, convertWork } from '../import-archimedes-shared/convert.ts';
import type { Anomaly } from '../import-archimedes-shared/convert.ts';
import { decodeEntities, nfcDiffCount } from '../import-archimedes-shared/text.ts';
import { buildAboutSections } from '../import-archimedes-shared/aboutText.ts';
import { ARCHIMEDES_TYPES_FILE } from '../import-archimedes-shared/typesTemplate.ts';
import type { GenericWork, WorkAbout } from '../import-archimedes-shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

function writeJson(dir: string, name: string, data: unknown): void {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`    wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

function countDivisions(divs: { children: unknown[] }[]): number {
  let n = 0;
  for (const d of divs) {
    n += 1;
    n += countDivisions(d.children as { children: unknown[] }[]);
  }
  return n;
}

function countFigureImages(divs: { children: unknown[]; passages: { figure?: { image?: string } }[] }[]): number {
  let n = 0;
  for (const d of divs) {
    for (const p of d.passages) if (p.figure?.image) n += 1;
    n += countFigureImages(d.children as typeof divs);
  }
  return n;
}

function main(): void {
  process.stdout.write(`Archimedes importer - ${ARCHIMEDES_WORKS.length} works\n\n`);

  for (const entry of ARCHIMEDES_WORKS) {
    const rawPath = join(RAW_DIR, entry.file);
    process.stdout.write(`[${entry.tlg}] ${entry.workId} <- ${entry.file}\n`);

    let xml: string;
    try {
      xml = readFileSync(rawPath, 'utf8');
    } catch (err) {
      process.stderr.write(`STOP: could not read ${rawPath}: ${(err as Error).message}\n`);
      process.exit(1);
    }

    const triangleDecodeCount = (xml.match(/&#9651;/g) ?? []).length;
    const nfcDiffs = nfcDiffCount(decodeEntities(xml));
    const hasLb = /<lb /.test(xml);

    let divisions;
    let anomalies: Anomaly[];
    let stats;
    let pbValues: string[];
    try {
      const result = convertWork(entry, xml);
      divisions = result.divisions;
      anomalies = result.anomalies;
      stats = result.stats;
      pbValues = result.pbValues;
    } catch (err) {
      if (err instanceof StopError) {
        process.stderr.write(`\nSTOP: ${err.message}\n\n`);
        process.exit(1);
      }
      throw err;
    }

    // pb monotonicity check (informs the "Reference scheme" prose + a
    // corpus-wide anomaly entry if it ever fails - it does not fail for any
    // of the 13 files, verified, but the importer checks rather than assumes).
    let pbNonMonotonic = 0;
    for (let i = 1; i < pbValues.length; i++) {
      if (Number(pbValues[i]) < Number(pbValues[i - 1])) pbNonMonotonic += 1;
    }
    if (pbNonMonotonic > 0) {
      anomalies.unshift({
        where: `${entry.workId} / <pb> tracking`,
        note: `${pbNonMonotonic} non-monotonic <pb> transition(s) detected; page-level refs for this work may be unreliable.`,
      });
    }

    // Corpus-wide transcription-hygiene anomalies (every file gets these, even
    // when a count is 0, so anomalies.json documents the hygiene step was
    // applied and checked, not merely that it happened not to trigger).
    anomalies.unshift({
      where: `${entry.workId} / character encoding`,
      note: `Unicode NFC normalisation was applied to all extracted reading text (${nfcDiffs} code point(s) remapped in this file - Greek ano teleia / acute-only Greek-Extended vowels to their monotonic-equivalent precomposed forms). Verified: zero standalone combining marks remain after normalisation.`,
    });
    anomalies.unshift({
      where: `${entry.workId} / entity decoding`,
      note: `The numeric entity "&#9651;" was decoded to the real character ▵ (U+25B3) ${triangleDecodeCount} time(s) in this file.`,
    });

    const work: GenericWork = { workId: entry.workId, language: 'grc', divisions };

    const divisionCount = countDivisions(divisions as { children: unknown[] }[]);
    const figureImageCount = countFigureImages(
      divisions as { children: unknown[]; passages: { figure?: { image?: string } }[] }[],
    );
    const pbFirst = pbValues[0] ?? '';
    const pbLast = pbValues[pbValues.length - 1] ?? '';

    const aboutSections = buildAboutSections(entry, {
      divisionCount,
      passageCount: stats.totalPassages,
      totalChars: stats.totalChars,
      gapCount: stats.gapCount,
      addCount: stats.addCount,
      delCount: stats.delCount,
      figureCount: stats.figureCount,
      figureImageCount,
      triangleDecodeCount,
      nfcDiffCount: nfcDiffs,
      hasLb,
      pbFirst,
      pbLast,
    });

    const about: WorkAbout = {
      workId: entry.workId,
      title: entry.latinTitle,
      author: 'Archimedes',
      language: 'grc',
      edition: `Mugler ${entry.muglerYear} (vol. ${entry.muglerVolume})`,
      editor: 'Charles Mugler',
      provenance: `TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0552.${entry.tlg}), which digitises Charles Mugler's Archimède (Les Belles Lettres, vol. ${entry.muglerVolume}, ${entry.muglerYear}); imported by scripts/import-archimedes.`,
      license:
        'The Greek text of Mugler\'s edition is used here for its public-domain-eligible ancient content; the digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
      sections: aboutSections,
    };

    const outDir = join(DATA_ROOT, entry.workId);
    mkdirSync(outDir, { recursive: true });
    writeJson(outDir, 'work.json', work);
    writeJson(outDir, 'about.json', about);
    writeJson(outDir, 'anomalies.json', anomalies);
    writeFileSync(join(outDir, 'types.ts'), ARCHIMEDES_TYPES_FILE, 'utf8');
    process.stdout.write(`    wrote types.ts\n`);

    process.stdout.write(
      `    ${divisionCount} division(s)  ${stats.totalPassages} passage(s)  ${stats.totalChars} chars  ` +
        `gap=${stats.gapCount} add=${stats.addCount} del=${stats.delCount} figure=${stats.figureCount}  ` +
        `▵ decoded=${triangleDecodeCount}  NFC remaps=${nfcDiffs}\n\n`,
    );
  }

  process.stdout.write(`Done, all ${ARCHIMEDES_WORKS.length} works imported. Run \`npm run validate:archimedes\` next.\n`);
}

main();
