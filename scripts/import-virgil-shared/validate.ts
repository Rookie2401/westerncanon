/**
 * Validation for BOTH generated Aeneid corpora (Latin + English).
 *
 *   npx tsx scripts/import-virgil-shared/validate.ts
 *
 * Writes data/aeneid-la/VALIDATION_REPORT.md and
 * data/aeneid-en/VALIDATION_REPORT.md, prints a summary, and exits non-zero
 * if any ERROR-level check fails in either work. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const LA_DIR = join(REPO_ROOT, 'data', 'aeneid-la');
const EN_DIR = join(REPO_ROOT, 'data', 'aeneid-en');

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

const BOOK_ID = /^book-([1-9]|1[0-2])$/;
const REF_RANGE = /^\d+–\d+$/;

/** substrings that indicate leaked XML transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#',
  '<div', '<l ', '<l>', '</l>', '<p>', '</p>', '<q', '</q>', '<hi', '</hi>',
  '<del', '</del>', '<gap', '<note', '</note>', '<choice', '</choice>',
  '<sic>', '</sic>', '<corr>', '</corr>', '<reg>', '</reg>', '<orig>', '</orig>',
  '<milestone', '<placeName', '</placeName>', '<persName', '</persName>',
  'xml:lang', 'xml:base',
];

interface PerBook {
  id: string;
  number: string | null;
  ref: string | null;
  lines: number;
  chars: number;
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  bookCount: number;
  totalLines: number;
  totalChars: number;
  perBook: PerBook[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function validateWork(opts: {
  workId: string;
  dir: string;
  expectLang: 'la' | 'en';
  spotChecks: { label: string; find: (work: GenericWork) => string | null; expect: string; mode: 'startsWith' | 'endsWith' }[];
}): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    workId: opts.workId,
    dir: opts.dir,
    findings,
    bookCount: 0,
    totalLines: 0,
    totalChars: 0,
    perBook: [],
    anomalies: [],
    spotCheck: [],
  };

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(opts.dir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(opts.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(opts.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(opts.dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['workId'] !== opts.workId) err('about-workId', 'about.json workId mismatch');
  if (about['sections'] === undefined || (about['sections'] as unknown[]).length < 3) {
    warn('about-sections', 'about.json has fewer than 3 "sections" entries');
  }
  if (anomalies.length === 0) warn('anomalies-empty', 'anomalies.json is empty - unexpected for this source');

  const divisions = work.divisions ?? [];

  // ---- exactly 12 Books, in order 1..12, flat leaves ----
  const wantIds = Array.from({ length: 12 }, (_, i) => `book-${i + 1}`);
  const gotIds = divisions.map((d) => d.id);
  if (JSON.stringify(gotIds) !== JSON.stringify(wantIds)) {
    err(
      'book-order',
      `top-level division id sequence does not match expectation.\n  got:      ${gotIds.join(', ')}\n  expected: ${wantIds.join(', ')}`,
    );
  }
  report.bookCount = divisions.filter((d) => BOOK_ID.test(d.id)).length;
  if (report.bookCount !== 12) err('book-count', `expected 12 Book divisions, got ${report.bookCount}`);

  divisions.forEach((d, i) => {
    const expectNumber = String(i + 1);
    if (d.number !== expectNumber) err('book-number', `${d.id}: number is ${JSON.stringify(d.number)}, expected ${JSON.stringify(expectNumber)}`);
    if (d.sourceHeading !== null) err('book-sourceHeading', `${d.id}: sourceHeading must be null, got ${JSON.stringify(d.sourceHeading)}`);
    if (d.editorialTitle !== null) err('book-editorialTitle', `${d.id}: editorialTitle must be null, got ${JSON.stringify(d.editorialTitle)}`);
    if (d.children.length !== 0) err('book-shape', `${d.id}: a Book division must be a leaf (no children) in this flat schema, got ${d.children.length}`);
    if (d.passages.length !== 1) err('book-shape', `${d.id}: a Book division must carry exactly 1 Passage, got ${d.passages.length}`);
    if (d.ref === null || !REF_RANGE.test(d.ref)) err('book-ref', `${d.id}: ref must be a "first–last" line range, got ${JSON.stringify(d.ref)}`);

    const p = d.passages[0];
    if (p) {
      if (p.n !== '') err('passage-n', `${d.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      if (typeof p.text !== 'string' || p.text.length === 0) {
        err('empty-passage', `${d.id}: passage text is empty`);
      } else {
        const lines = p.text.split('\n');
        if (lines.some((l) => l.length === 0)) err('empty-line', `${d.id}: passage text contains an empty line (a stray '\\n\\n')`);
        if (lines.some((l) => l !== l.trim())) err('untrimmed-line', `${d.id}: a verse line has leading/trailing whitespace`);
        report.totalLines += lines.length;
        report.totalChars += p.text.length;
        report.perBook.push({ id: d.id, number: d.number, ref: d.ref, lines: lines.length, chars: p.text.length });
      }
    }
  });

  // ---- leaked markup ----
  const leaks: string[] = [];
  for (const d of divisions) {
    for (const p of d.passages) {
      for (const marker of LEAK_MARKERS) {
        if (p.text.includes(marker)) leaks.push(`${d.id}: contains ${JSON.stringify(marker)}`);
      }
    }
  }
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 15).join('\n    ')}`);

  // ---- spot checks ----
  for (const sc of opts.spotChecks) {
    const got = sc.find(work);
    if (got === null) {
      report.spotCheck.push({ label: sc.label, ok: false, got: '(not found)' });
      err('spot-check', `${sc.label}: target passage not found`);
      continue;
    }
    const gotN = got.normalize('NFC');
    const expN = sc.expect.normalize('NFC');
    const ok = sc.mode === 'startsWith' ? gotN.startsWith(expN) : gotN.endsWith(expN);
    report.spotCheck.push({ label: sc.label, ok, got: sc.mode === 'startsWith' ? got.slice(0, 90) : got.slice(-90) });
    if (!ok) {
      err(
        'spot-check',
        `${sc.label}: expected ${sc.mode} ${JSON.stringify(sc.expect)}, got: ${JSON.stringify(sc.mode === 'startsWith' ? got.slice(0, 90) : got.slice(-90))}`,
      );
    }
  }

  return report;
}

function bookText(work: GenericWork, bookId: string): string | null {
  const b = work.divisions.find((d) => d.id === bookId);
  return b?.passages[0]?.text ?? null;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Aeneid validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- Books: ${r.bookCount}`);
  L.push(`- total verse lines (passage text split on '\\n'): ${r.totalLines}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Per-book counts');
  L.push('');
  L.push('| book | number | ref | lines | chars |');
  L.push('|------|--------|-----|-------|-------|');
  for (const b of r.perBook) L.push(`| ${b.id} | ${b.number ?? '-'} | ${b.ref ?? '-'} | ${b.lines} | ${b.chars} |`);
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
    workId: 'aeneid-la',
    dir: LA_DIR,
    expectLang: 'la',
    spotChecks: [
      {
        label: 'Book 1 opens "Arma virumque cano"',
        find: (w) => bookText(w, 'book-1'),
        expect: 'Arma virumque cano',
        mode: 'startsWith',
      },
      {
        label: 'Book 12 ends "...fugit indignata sub umbras."',
        find: (w) => bookText(w, 'book-12'),
        expect: 'fugit indignata sub umbras.',
        mode: 'endsWith',
      },
      {
        label: 'Book 4 opens "At regina gravi"',
        find: (w) => bookText(w, 'book-4'),
        expect: 'At regina gravi',
        mode: 'startsWith',
      },
    ],
  });

  const en = validateWork({
    workId: 'aeneid-en',
    dir: EN_DIR,
    expectLang: 'en',
    spotChecks: [
      {
        label: 'Book 1 opens "Arms and the man I sing"',
        find: (w) => bookText(w, 'book-1'),
        expect: 'Arms and the man I sing',
        mode: 'startsWith',
      },
      {
        label: 'Book 12 ends "...with moan of wrath to darkness fled away." (Williams\' rendering of the poem\'s final line)',
        find: (w) => bookText(w, 'book-12'),
        expect: 'with moan of wrath to darkness fled away.',
        mode: 'endsWith',
      },
    ],
  });

  writeReport(la);
  writeReport(en);

  const all = [...la.findings.map((f) => ({ w: 'la', ...f })), ...en.findings.map((f) => ({ w: 'en', ...f }))];
  process.stdout.write('\n=== validate:virgil-aeneid ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Reports: ${join(LA_DIR, 'VALIDATION_REPORT.md')}\n` +
      `         ${join(EN_DIR, 'VALIDATION_REPORT.md')}\n`,
  );
  process.stdout.write(
    `\nla: ${la.bookCount} books / ${la.totalLines} lines / ${la.totalChars} chars\n` +
      `en: ${en.bookCount} books / ${en.totalLines} lines / ${en.totalChars} chars\n`,
  );
  if (errors.length > 0) process.exit(1);
}

main();
