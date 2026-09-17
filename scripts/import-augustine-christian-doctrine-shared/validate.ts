/**
 * Validation for BOTH generated On Christian Doctrine corpora (Latin and
 * English).
 *
 *   npx tsx scripts/import-augustine-christian-doctrine-shared/validate.ts
 *
 * Writes data/augustine-christian-doctrine-la/VALIDATION_REPORT.md and
 * data/augustine-christian-doctrine-en/VALIDATION_REPORT.md, prints a
 * summary, and exits non-zero if any ERROR-level check fails in either work.
 * WARN-level findings (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/augustine-christian-doctrine-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const LA_DIR = join(REPO_ROOT, 'data', 'augustine-christian-doctrine-la');
const EN_DIR = join(REPO_ROOT, 'data', 'augustine-christian-doctrine-en');

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}
interface Anomaly {
  where: string;
  note: string;
}

/** substrings that indicate leaked transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;',
  '&lt;',
  '&gt;',
  '&#',
  '&nbsp;',
  '{{',
  '}}',
  '[[',
  ']]',
  '<ref',
  '</ref',
  '<br',
  '<p>',
  '</p>',
  '<li',
  '</li',
  '<ol',
  '</ol',
  '<div',
  'http://',
  'https://',
  'xmlns',
  '__NOTOC__',
];

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    for (const p of d.passages) visit(p.text, `${d.id}/passage[n=${JSON.stringify(p.n)}]`);
    walkTexts(d.children, visit);
  }
}

interface PerBook {
  id: string;
  number: string | null;
  chapters: number;
  passages: number;
  chars: number;
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  perBook: PerBook[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function validateWork(opts: {
  workId: string;
  dir: string;
  expectLang: 'la' | 'en';
  spotStart: string;
  spotEnd: string;
  expectBookCount: number;
}): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(opts.dir, f))) err('presence', `missing ${f} - run the importer`);
  }

  const report: WorkReport = {
    workId: opts.workId,
    dir: opts.dir,
    findings,
    divisionCount: 0,
    chapterCount: 0,
    passageCount: 0,
    totalChars: 0,
    perBook: [],
    anomalies: [],
    spotCheck: [],
  };
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(opts.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(opts.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(opts.dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['author'] !== 'Augustine of Hippo') err('author', `about.json author is ${JSON.stringify(about['author'])}, must be exactly "Augustine of Hippo"`);

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  // ---- book count (Prologue/Preface + Books I-IV = 5) ----
  if (divisions.length !== opts.expectBookCount) {
    err('book-count', `expected exactly ${opts.expectBookCount} top-level Book divisions, got ${divisions.length}`);
  }

  // ---- book id sequence ----
  const expectedIds = Array.from({ length: opts.expectBookCount }, (_, i) => `book-${i}`);
  const ids = divisions.map((d) => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    err('book-ids', `book id sequence does not match ${JSON.stringify(expectedIds)}:\n  got: ${ids.join(', ')}`);
  }

  // ---- structural shape: Book has children only, Chapter has passages only ----
  for (const b of divisions) {
    if (b.passages.length !== 0) err('book-shape', `${b.id}: a Book division must have no passages of its own, found ${b.passages.length}`);
    if (b.children.length === 0) err('book-shape', `${b.id}: a Book division has no Chapter children`);
    for (const c of b.children) {
      if (c.children.length !== 0) err('chapter-shape', `${c.id}: a Chapter division must have no children, found ${c.children.length}`);
      if (c.passages.length === 0) err('chapter-shape', `${c.id}: a Chapter division has no passages`);
      const idRe = new RegExp(`^${b.id}-ch-\\d+$`);
      if (!idRe.test(c.id)) err('chapter-id', `${c.id}: does not match "${b.id}-ch-<N>"`);
    }
  }

  // ---- passages ----
  let chapterCount = 0;
  let passageCount = 0;
  let totalChars = 0;
  for (const b of divisions) {
    let bookChapters = 0;
    let bookPassages = 0;
    let bookChars = 0;
    for (const c of b.children) {
      bookChapters += 1;
      for (const p of c.passages) {
        bookPassages += 1;
        bookChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}: a passage has empty text`);
        if (typeof p.n !== 'string') err('passage-n', `${c.id}: passage n is not a string`);
        if (p.ref !== null) err('passage-ref', `${c.id}: passage ref should be null, got ${JSON.stringify(p.ref)}`);
      }
      if (c.ref !== null) err('chapter-ref', `${c.id}: chapter ref should be null`);
    }
    if (b.ref !== null) err('book-ref', `${b.id}: book ref should be null`);
    chapterCount += bookChapters;
    passageCount += bookPassages;
    totalChars += bookChars;
    report.perBook.push({ id: b.id, number: b.number, chapters: bookChapters, passages: bookPassages, chars: bookChars });
  }
  report.chapterCount = chapterCount;
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 15).join('\n    ')}`);

  // ---- spot check: verbatim opening of book-0's first passage ----
  const book0 = divisions.find((d) => d.id === 'book-0');
  const firstPassage = book0?.children[0]?.passages[0];
  const p1 = firstPassage?.text ?? '';
  const startOk = p1.normalize('NFC').startsWith(opts.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `book-0 first passage starts "${opts.spotStart}"`, ok: startOk, got: p1.slice(0, 70) });
  if (!startOk) err('spot-check-start', `book-0 first passage does not start with ${JSON.stringify(opts.spotStart)} (got: ${JSON.stringify(p1.slice(0, 70))})`);

  // ---- spot check: verbatim close of the final Book's final passage (true end of the work) ----
  const lastBook = divisions[divisions.length - 1];
  const lastChapter = lastBook?.children[lastBook.children.length - 1];
  const lastPassage = lastChapter?.passages[lastChapter.passages.length - 1];
  const pN = lastPassage?.text ?? '';
  const endOk = pN.normalize('NFC').endsWith(opts.spotEnd.normalize('NFC'));
  report.spotCheck.push({ label: `final book (${lastBook?.id}) ends "${opts.spotEnd}"`, ok: endOk, got: pN.slice(-90) });
  if (!endOk) {
    err('spot-check-end', `final book's last passage does not end with ${JSON.stringify(opts.spotEnd)} - possible truncation (got tail: ${JSON.stringify(pN.slice(-90))})`);
  }

  // ---- anomalies.json shape ----
  for (const a of anomalies) {
    if (typeof a.where !== 'string' || typeof a.note !== 'string') err('anomaly-shape', 'anomalies.json contains an entry missing where/note');
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# On Christian Doctrine validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${r.divisionCount}`);
  L.push(`- chapters: ${r.chapterCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Per-book counts');
  L.push('');
  L.push('| book | number | chapters | passages | chars |');
  L.push('|------|--------|----------|----------|-------|');
  for (const b of r.perBook) L.push(`| ${b.id} | ${b.number ?? '-'} | ${b.chapters} | ${b.passages} | ${b.chars} |`);
  L.push('');
  L.push('## Verbatim spot-check');
  L.push('');
  for (const s of r.spotCheck) L.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got}\``);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (r.anomalies.length === 0) L.push('_none_');
  for (const a of r.anomalies) L.push(`- **${a.where}** - ${a.note}`);
  L.push('');
  L.push('## Errors');
  L.push('');
  if (errors.length === 0) L.push('_none_');
  for (const f of errors) L.push(`- **[${f.check}]** ${f.message}`);
  L.push('');
  L.push('## Warnings');
  L.push('');
  if (warns.length === 0) L.push('_none_');
  for (const f of warns) L.push(`- **[${f.check}]** ${f.message}`);
  L.push('');
  writeFileSync(join(r.dir, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

function main(): void {
  const la = validateWork({
    workId: 'augustine-christian-doctrine-la',
    dir: LA_DIR,
    expectLang: 'la',
    spotStart: 'Sunt praecepta quaedam tractandarum Scripturarum,',
    // Liber Quartus, closing sentence.
    spotEnd: 'non solum sibi sed aliis etiam laborare studet, quantulacumque potui facultate disserui.',
    expectBookCount: 5,
  });
  const en = validateWork({
    workId: 'augustine-christian-doctrine-en',
    dir: EN_DIR,
    expectLang: 'en',
    spotStart: '1. There are certain rules for the interpretation of Scripture',
    // Book IV, closing sentence (Shaw's translation).
    spotEnd: 'not for his own instruction only, but for that of others also.',
    expectBookCount: 5,
  });

  writeReport(la);
  writeReport(en);

  const all = [...la.findings.map((f) => ({ w: 'la', ...f })), ...en.findings.map((f) => ({ w: 'en', ...f }))];
  process.stdout.write('\n=== validate:augustine-christian-doctrine ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Reports: ${join(LA_DIR, 'VALIDATION_REPORT.md')}\n` +
      `         ${join(EN_DIR, 'VALIDATION_REPORT.md')}\n`,
  );
  process.stdout.write(
    `\nla: ${la.divisionCount} books / ${la.chapterCount} chapters / ${la.passageCount} passages / ${la.totalChars} chars\n` +
      `en: ${en.divisionCount} books / ${en.chapterCount} chapters / ${en.passageCount} passages / ${en.totalChars} chars\n`,
  );
  if (errors.length > 0) process.exit(1);
}

main();
