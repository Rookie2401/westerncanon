/**
 * Shared "import one witness" pipeline, called in a loop by each
 * playwright driver (scripts/import-aeschylus/index.ts,
 * scripts/import-sophocles/index.ts, scripts/import-euripides/index.ts) and,
 * later, an Aristophanes driver reusing this unchanged - see the module doc
 * in workTable.ts / teiConvert.ts for the design this rests on.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlayEntry, Witness } from './workTable.ts';
import { workId as workIdFor } from './workTable.ts';
import { convertWitness } from './teiConvert.ts';
import type { Anomaly } from './extractText.ts';
import { buildAboutSections } from './aboutText.ts';
import type { AboutStats } from './aboutText.ts';
import { DRAMA_TYPES_FILE } from './typesTemplate.ts';
import type { GenericWork, WorkAbout } from './genericTypes.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

function writeJson(dir: string, name: string, data: unknown): number {
  const file = join(dir, name);
  const text = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(file, text, 'utf8');
  return Buffer.byteLength(text);
}

function countMatching(anomalies: Anomaly[], pred: (note: string) => boolean): number {
  return anomalies.filter((a) => pred(a.note)).length;
}

function computeAboutStats(base: ReturnType<typeof convertWitness>['stats'], anomalies: Anomaly[]): AboutStats {
  return {
    ...base,
    delCount: countMatching(anomalies, (n) => n.startsWith('<del> editor-bracketed text KEPT')),
    sicRejectedCount: countMatching(anomalies, (n) => n.startsWith('<sic> excluded')),
    sicKeptCount: countMatching(anomalies, (n) => n.startsWith('<sic> transmitted reading printed as-is')),
    addCount: countMatching(
      anomalies,
      (n) => n.startsWith('<add> included') || n.startsWith('<corr> included') || n.startsWith('<reg> included'),
    ),
    gapLostCount: countMatching(anomalies, (n) => n.startsWith('<gap reason="lost"/>')),
    gapOtherCount: countMatching(anomalies, (n) => n.startsWith('<gap reason=') && !n.startsWith('<gap reason="lost"/>')),
    unclearCount: countMatching(anomalies, (n) => n.startsWith('<unclear> included')),
    spanMarkerCount: countMatching(anomalies, (n) => n.includes('marker present (source-editor athetesis')),
    unexpectedTagCount: countMatching(
      anomalies,
      (n) =>
        n.startsWith('unexpected tag <') ||
        n.startsWith('unexpected top-level child') ||
        n.startsWith('unexpected direct child') ||
        n.startsWith('unexpected nested <div'),
    ),
  };
}

export interface ImportOneResult {
  workId: string;
  playwright: string;
  title: string;
  lang: 'grc' | 'en';
  cardCount: number;
  passageCount: number;
  totalChars: number;
  hasDramatisPersonae: boolean;
  anomalyCount: number;
  bytesWritten: number;
}

/** Imports one witness (Greek edition or English translation) of one play.
 *  `rawDir` is the driver's own raw/ directory (already populated). Idempotent:
 *  re-running overwrites the same 4 output files with freshly re-derived
 *  content - nothing here depends on a prior run's output. */
export function importOneWitness(entry: PlayEntry, lang: 'grc' | 'en', rawDir: string): ImportOneResult {
  const witness: Witness | null = lang === 'grc' ? entry.grc : entry.en;
  if (!witness) throw new Error(`${entry.slug}: no ${lang} witness on this entry`);

  const rawPath = join(rawDir, witness.file);
  const xml = readFileSync(rawPath, 'utf8');

  const id = workIdFor(entry, lang);
  const { divisions, anomalies, stats } = convertWitness(xml, id, lang);

  const work: GenericWork = { workId: id, language: lang, divisions };

  const aboutStats = computeAboutStats(stats, anomalies);
  const sections = buildAboutSections(entry, lang, aboutStats);
  const about: WorkAbout = {
    workId: id,
    title: entry.title,
    author: entry.playwrightLabel,
    language: lang,
    edition: lang === 'grc' ? witness.citation : entry.grc.citation,
    editor: lang === 'grc' ? witness.person : entry.grc.person,
    translator: lang === 'en' ? witness.person : undefined,
    provenance: `Perseus canonical-greekLit TEI XML, urn:cts:greekLit:${entry.tlgGroup}.${entry.tlgWork}.${witness.witness}`,
    license: 'Source TEI: CC-BY-SA (Perseus Digital Library / canonical-greekLit); underlying edition/translation text is public domain.',
    sections,
  };

  const dir = join(DATA_ROOT, id);
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  bytes += writeJson(dir, 'work.json', work);
  bytes += writeJson(dir, 'about.json', about);
  bytes += writeJson(dir, 'anomalies.json', anomalies);
  writeFileSync(join(dir, 'types.ts'), DRAMA_TYPES_FILE, 'utf8');

  return {
    workId: id,
    playwright: entry.playwright,
    title: entry.title,
    lang,
    cardCount: stats.cardCount,
    passageCount: stats.passageCount,
    totalChars: stats.totalChars,
    hasDramatisPersonae: stats.hasDramatisPersonae,
    anomalyCount: anomalies.length,
    bytesWritten: bytes,
  };
}
