/**
 * Assembles one work's parsed RawDivision[] (see parsePlay.ts / parsePoems.ts)
 * into a GenericWork, and writes work.json / about.json / anomalies.json /
 * types.ts into data/shakespeare-<slug>-en/. Mirrors the Aristophanes-en
 * importer's emit.ts.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { joinPassageText, type RawDivision, type RawPassage } from './parsePlay.ts';
import type { Anomaly } from './text.ts';

export interface Passage {
  n: string;
  text: string;
  ref: string | null;
}

export interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  workId: string;
  language: 'en';
  divisions: Division[];
}

export interface WorkAboutSection {
  heading: string;
  paragraphs: string[];
}

export interface WorkAbout {
  workId: string;
  title: string;
  author: string;
  language: 'en';
  edition?: string;
  editor?: string;
  translator?: string;
  provenance: string;
  license: string;
  sections?: WorkAboutSection[];
}

function fail(workId: string, msg: string): never {
  process.stderr.write(`STOP (${workId}): ${msg}\n`);
  process.exit(1);
}

function toPassage(workId: string, where: string, p: RawPassage): Passage {
  const text = joinPassageText(p.speaker, p.lines);
  if (text.trim().length === 0) fail(workId, `${where}: produced an empty passage`);
  return { n: '', text, ref: null };
}

function toDivision(workId: string, raw: RawDivision): Division {
  return {
    id: raw.id,
    number: raw.number,
    ref: null,
    sourceHeading: raw.sourceHeading,
    editorialTitle: null,
    children: raw.children.map((c) => toDivision(workId, c)),
    passages: raw.passages.map((p, i) => toPassage(workId, `${raw.id}[${i}]`, p)),
  };
}

export function buildWork(workId: string, dramatisPersonae: string[] | null, sceneNote: string | null, divisions: RawDivision[]): GenericWork {
  const out: Division[] = [];
  if (dramatisPersonae && dramatisPersonae.length > 0) {
    const castLines = sceneNote ? [...dramatisPersonae, sceneNote] : dramatisPersonae;
    out.push({
      id: 'dramatis-personae',
      number: null,
      ref: null,
      sourceHeading: 'Dramatis Personæ',
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: castLines.join('\n'), ref: null }],
    });
  }
  for (const d of divisions) out.push(toDivision(workId, d));
  if (out.length === 0) fail(workId, 'no divisions produced');
  return { workId, language: 'en', divisions: out };
}

export function writeOutputs(outDir: string, work: GenericWork, about: WorkAbout, anomalies: Anomaly[], typesFile: string): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'types.ts'), typesFile, 'utf8');
  for (const [name, data] of [
    ['work.json', work],
    ['about.json', about],
    ['anomalies.json', anomalies],
  ] as const) {
    const file = join(outDir, name);
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
  }
  process.stdout.write(`  wrote types.ts\n`);
}

function countPassages(divs: Division[]): { count: number; chars: number } {
  let count = 0;
  let chars = 0;
  for (const d of divs) {
    count += d.passages.length;
    for (const p of d.passages) chars += p.text.length;
    const sub = countPassages(d.children);
    count += sub.count;
    chars += sub.chars;
  }
  return { count, chars };
}

export function printSummary(workId: string, work: GenericWork, anomalies: Anomaly[]): void {
  const { count, chars } = countPassages(work.divisions);
  process.stdout.write(`  ${workId}: ${count} passages / ${chars} chars / ${anomalies.length} anomalies\n`);
}
