/**
 * Assembles one play's parsed RawPassage[] into a GenericWork (dramatis-
 * personae + a single flat "text" division, per this batch's brief - the
 * 1912 translation is prose with no line numbers, so there is no Perseus-
 * style card division to align to), and writes work.json / about.json /
 * anomalies.json / types.ts into data/aristophanes-<slug>-en/.
 *
 * Determinism: no clock, no directory iteration, no randomness; the PLAYS
 * table and each parser's own document-order walk fix everything, so running
 * the importer twice produces byte-identical output.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Anomaly } from './text.ts';
import type { RawPassage } from './wikitextPlay.ts';

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

function footnoteTrailer(numbers: number[], footnotes: Map<number, string>, workId: string, where: string): string {
  const uniq = [...new Set(numbers)].sort((a, b) => a - b);
  return uniq
    .map((n) => {
      const text = footnotes.get(n);
      if (text === undefined) fail(workId, `${where}: footnote [${n}] referenced but never captured`);
      return `[Note ${n}: ${text}]`;
    })
    .join('\n');
}

function passageOf(workId: string, where: string, p: RawPassage, footnotes: Map<number, string>): Passage {
  const trailer = footnoteTrailer(p.footnoteNumbers, footnotes, workId, where);
  const body = p.speaker === null ? p.text : `${p.speaker}\n${p.text}`;
  const text = trailer.length > 0 ? `${body}\n${trailer}` : body;
  if (text.trim().length === 0) fail(workId, `${where}: produced an empty passage`);
  return { n: '', text, ref: null };
}

export function buildWork(
  workId: string,
  title: string,
  dramatisPersonae: string[],
  passages: RawPassage[],
  footnotes: Map<number, string>,
): GenericWork {
  if (passages.length === 0) fail(workId, 'no passages produced');
  const divisions: Division[] = [];
  if (dramatisPersonae.length > 0) {
    divisions.push({
      id: 'dramatis-personae',
      number: null,
      ref: null,
      sourceHeading: 'Dramatis Personae',
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: dramatisPersonae.join('\n'), ref: null }],
    });
  }
  // The play text is one unnumbered division headed by the play's title as the
  // 1912 edition prints it at the head of each play (the app labels an
  // unnumbered, unheaded leaf "Praefatio", which would be wrong here).
  divisions.push({
    id: 'text',
    number: null,
    ref: null,
    sourceHeading: title,
    editorialTitle: null,
    children: [],
    passages: passages.map((p, i) => passageOf(workId, `text[${i}]`, p, footnotes)),
  });
  return { workId, language: 'en', divisions };
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

export function printSummary(workId: string, work: GenericWork, anomalies: Anomaly[], footnoteCount: number): void {
  let speeches = 0;
  let chars = 0;
  for (const d of work.divisions) {
    if (d.id === 'dramatis-personae') continue;
    speeches += d.passages.length;
    for (const p of d.passages) chars += p.text.length;
  }
  process.stdout.write(`  ${workId}: ${speeches} speeches / ${chars} chars / ${footnoteCount} footnotes / ${anomalies.length} anomalies\n`);
}
