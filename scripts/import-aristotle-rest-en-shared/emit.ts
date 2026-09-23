/**
 * Shared output assembly for this batch's English Aristotle importers.
 *
 * These interfaces are STRUCTURALLY identical to each work's own
 * data/<slug>-en/types.ts (which stays the per-work source of truth, with its
 * own doc comments, exactly as data/nicomachean-ethics-en/types.ts does).
 * TypeScript is structurally typed, so a Division built here satisfies each
 * work's own Division without any cast; keeping a copy here just lets the
 * builders live in one place instead of being retyped 18 times.
 *
 * Determinism (required: every importer in this repo must produce byte-
 * identical output when run twice): nothing here reads the clock, the
 * filesystem ordering, or any random source, and every object is built with
 * its keys written in a fixed literal order, so JSON.stringify is stable.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
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

/** One chapter's finished content, ready to become a Division. */
export interface ChapterInput {
  number: number;
  /** Bekker page range printed by the source for this chapter, or null when it prints none. */
  ref: string | null;
  /** the chapter's paragraphs, in document order; joined with "\n\n" into ONE Passage */
  paragraphs: string[];
  /** set when part of the chapter is missing from the source (red-link truncation) */
  passageAnomaly?: string;
}

function fail(workId: string, msg: string): never {
  process.stderr.write(`STOP (${workId}): ${msg}\n`);
  process.exit(1);
}

function chapterDivision(workId: string, id: string, c: ChapterInput): Division {
  const text = c.paragraphs.join('\n\n');
  if (text.length === 0) fail(workId, `${id}: chapter has no reading text`);
  const passage: Passage = { n: '', text, ref: null };
  if (c.passageAnomaly) passage.anomaly = c.passageAnomaly;
  return {
    id,
    number: String(c.number),
    ref: c.ref,
    sourceHeading: null,
    editorialTitle: null,
    children: [],
    passages: [passage],
  };
}

/** Two-level Book -> Chapter tree: ids `book-N` / `book-N-ch-M`. */
export function buildBookChapterWork(workId: string, books: { number: number; chapters: ChapterInput[] }[]): GenericWork {
  if (books.length === 0) fail(workId, 'no books to emit');
  const divisions: Division[] = books.map((b) => {
    if (b.chapters.length === 0) fail(workId, `book-${b.number}: no chapters`);
    return {
      id: `book-${b.number}`,
      number: String(b.number),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: b.chapters.map((c) => chapterDivision(workId, `book-${b.number}-ch-${c.number}`, c)),
      passages: [],
    };
  });
  return { workId, language: 'en', divisions };
}

/** Flat single-book work: ids `ch-N`. */
export function buildFlatWork(workId: string, chapters: ChapterInput[]): GenericWork {
  if (chapters.length === 0) fail(workId, 'no chapters to emit');
  return {
    workId,
    language: 'en',
    divisions: chapters.map((c) => chapterDivision(workId, `ch-${c.number}`, c)),
  };
}

/** Write work.json / about.json / anomalies.json into data/<workId>/, printing a size line for each. */
export function writeOutputs(outDir: string, work: GenericWork, about: WorkAbout, anomalies: { where: string; note: string }[]): void {
  mkdirSync(outDir, { recursive: true });
  for (const [name, data] of [['work.json', work], ['about.json', about], ['anomalies.json', anomalies]] as const) {
    const file = join(outDir, name);
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
  }
}

/** Print the per-book / per-chapter summary every importer in this batch ends with. */
export function printSummary(workId: string, work: GenericWork, anomalies: unknown[]): void {
  const isTwoLevel = work.divisions.some((d) => d.children.length > 0);
  let chapters = 0;
  let chars = 0;
  const walk = (ds: Division[]): void => {
    for (const d of ds) {
      if (d.children.length === 0) chapters += 1;
      for (const p of d.passages) chars += p.text.length;
      walk(d.children);
    }
  };
  walk(work.divisions);
  if (isTwoLevel) {
    for (const b of work.divisions) {
      const c = b.children.length;
      const n = b.children.reduce((m, ch) => m + ch.passages.reduce((k, p) => k + p.text.length, 0), 0);
      process.stdout.write(`  Book ${String(b.number).padStart(2)}  ${String(c).padStart(2)} chapters  ${String(n).padStart(7)} chars\n`);
    }
  }
  process.stdout.write(`\n  ${workId}: ${isTwoLevel ? `${work.divisions.length} books / ` : ''}${chapters} chapters / ${chars} chars / ${anomalies.length} anomalies\n`);
}
