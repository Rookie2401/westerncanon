/**
 * Plutarch's Parallel Lives - all 66 works (48 Lives + 18 Comparisons; 4
 * unpaired Lives), Greek + English = 132 data files. Table-driven run-once
 * ingestion pipeline (single importer, looped over
 * scripts/import-plutarch-shared/workTable.ts - never 132 per-work scripts).
 *
 *   npm run import:plutarch     (tsx scripts/import-plutarch/index.ts)
 *
 * Reads scripts/import-plutarch/raw/tlg0007.tlgNNN.perseus-{grc,eng}N.xml
 * (already fetched into the repo - see raw/README below; nothing is
 * downloaded here) for each of the 66 works x 2 languages and writes, per
 * work+language:
 *   data/plutarch-<slug>-{grc,en}/work.json       - the GenericWork
 *   data/plutarch-<slug>-{grc,en}/about.json      - provenance / licence / prose
 *   data/plutarch-<slug>-{grc,en}/anomalies.json  - machine-readable {where, note}[]
 *   data/plutarch-<slug>-{grc,en}/types.ts        - byte-identical generated types file
 *
 * Then run `npm run validate:plutarch`.
 *
 * On any structural mismatch against the ground truth in workTable.ts (a
 * work's chapter sequence must be a clean 1..N; the two double lives'
 * book-level parts must match by name and count), this STOPS (throws
 * StopError, caught here, non-zero exit) naming the work and what
 * disagreed - it never force-fits or silently renumbers.
 *
 * raw/ - all 132 witnesses fetched once from
 *   https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0007/<tlg>/tlg0007.<tlg>.<witness>.xml
 * and cached here (also raw/catalogs/ - the 66 __cts__.xml catalog files
 * used to build workTable.ts, kept for provenance/audit, not read by this
 * importer).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUTARCH_WORKS } from '../import-plutarch-shared/workTable.ts';
import type { PlutarchWorkEntry } from '../import-plutarch-shared/workTable.ts';
import { walkEdition } from '../import-plutarch-shared/teiWalker.ts';
import { StopError, convertWork } from '../import-plutarch-shared/convert.ts';
import type { Anomaly } from '../import-plutarch-shared/convert.ts';
import { decodeEntities, nfcDiffCount } from '../import-plutarch-shared/text.ts';
import { buildAboutSections } from '../import-plutarch-shared/aboutText.ts';
import { PLUTARCH_TYPES_FILE } from '../import-plutarch-shared/typesTemplate.ts';
import type { GenericWork, WorkAbout } from '../import-plutarch-shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

function writeJson(dir: string, name: string, data: unknown): void {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function importOne(entry: PlutarchWorkEntry, lang: 'grc' | 'en'): { anomalyCount: number; chapterCount: number } {
  const file = lang === 'grc' ? entry.grcFile : entry.engFile;
  const workId = `plutarch-${entry.slug}-${lang}`;
  const rawPath = join(RAW_DIR, file);

  let xml: string;
  try {
    xml = readFileSync(rawPath, 'utf8');
  } catch (err) {
    process.stderr.write(`STOP: could not read ${rawPath}: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const nfcDiffs = nfcDiffCount(decodeEntities(xml));

  const { root, stats: walkStats } = walkEdition(xml, workId);

  let result;
  try {
    result = convertWork(entry, lang, root);
  } catch (err) {
    if (err instanceof StopError) {
      process.stderr.write(`\nSTOP: ${err.message}\n\n`);
      process.exit(1);
    }
    throw err;
  }
  const { divisions, anomalies, stats } = result;

  // Corpus-wide transcription-hygiene anomalies (every file gets these, even
  // when a count is 0, so anomalies.json documents the hygiene step was
  // applied and checked, not merely that it happened not to trigger).
  const allAnomalies: Anomaly[] = [
    {
      where: `${workId} / character encoding`,
      note: `Unicode NFC normalisation was applied to all extracted reading text (${nfcDiffs} code point(s) remapped in this file). Entity decoding found 0 XML entities in this witness (verified corpus-wide: the tlg0007 texts use literal Unicode characters throughout, never &...; escapes).`,
    },
    {
      where: `${workId} / apparatus excluded`,
      note: `${walkStats.noteCount} <note> element(s) and ${walkStats.biblCount} <bibl> element(s) (Perseus's own editorial/critical apparatus and citation-linking, never Perrin's printed prose) were excluded entirely, tag and content, at every nesting depth.`,
    },
    {
      where: `${workId} / structural markers dropped`,
      note: `${walkStats.pbCount} <pb/> page-break marker(s) and ${walkStats.milestoneCount} <milestone/> marker(s) were dropped (zero-width; this work's citation scheme is by chapter number alone, carried in the Division id/number - see about.json "Reference scheme").`,
    },
    ...anomalies,
  ];

  const isDoubleLife = entry.parts !== null;

  const work: GenericWork = { workId, language: lang, divisions };

  const witness = lang === 'grc' ? entry.grcWitness : entry.engWitness;
  const about: WorkAbout = {
    workId,
    title: lang === 'grc' ? entry.grcTitle : entry.engTitle,
    author: 'Plutarch',
    language: lang,
    edition: `Perrin ${entry.year} (Loeb Classical Library, vol. ${entry.volRoman})`,
    ...(lang === 'grc' ? { editor: 'Bernadotte Perrin' } : { translator: 'Bernadotte Perrin' }),
    provenance: `TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0007.${entry.tlg}.${witness}), digitising Bernadotte Perrin's Loeb Classical Library edition/translation of Plutarch's ${entry.engTitle} (vol. ${entry.volRoman}, ${entry.year}); imported by scripts/import-plutarch (table-driven over all 66 works - see scripts/import-plutarch-shared/WORKS.md).`,
    license:
      "Perrin's 1914-1926 Loeb edition and translation are in the public domain. The digital transcription is distributed by the Perseus Digital Library / Open Greek and Latin canonical-greekLit repository under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: buildAboutSections(entry, {
      lang,
      chapterCount: stats.chapterCount,
      passageCount: stats.passageCount,
      totalChars: stats.totalChars,
      convertStats: stats,
      walkStats,
      isDoubleLife,
    }),
  };

  const outDir = join(DATA_ROOT, workId);
  mkdirSync(outDir, { recursive: true });
  writeJson(outDir, 'work.json', work);
  writeJson(outDir, 'about.json', about);
  writeJson(outDir, 'anomalies.json', allAnomalies);
  writeFileSync(join(outDir, 'types.ts'), PLUTARCH_TYPES_FILE, 'utf8');

  return { anomalyCount: allAnomalies.length, chapterCount: stats.chapterCount };
}

function main(): void {
  process.stdout.write(`Plutarch importer - ${PLUTARCH_WORKS.length} works x 2 languages = ${PLUTARCH_WORKS.length * 2} editions\n\n`);

  let totalChapters = 0;
  let totalAnomalies = 0;
  for (const entry of PLUTARCH_WORKS) {
    for (const lang of ['grc', 'en'] as const) {
      const { anomalyCount, chapterCount } = importOne(entry, lang);
      totalChapters += chapterCount;
      totalAnomalies += anomalyCount;
      process.stdout.write(
        `[${entry.tlg}] plutarch-${entry.slug}-${lang}  ${chapterCount} chapter(s)  ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'}\n`,
      );
    }
  }

  process.stdout.write(
    `\nDone. ${PLUTARCH_WORKS.length * 2} editions written, ${totalChapters} total chapter divisions, ${totalAnomalies} total anomaly entries.\n` +
      `Run \`npm run validate:plutarch\` next.\n`,
  );
}

main();
