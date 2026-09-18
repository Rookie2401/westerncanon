/**
 * Validation for all four generated Homer corpora (Iliad/Odyssey x Greek/
 * English).
 *
 *   npx tsx scripts/import-homer-shared/validate.ts
 *
 * Writes data/<workId>/VALIDATION_REPORT.md for each of the four works,
 * prints a summary, and exits non-zero if any ERROR-level check fails for
 * any of them. WARN-level findings (preserved source irregularities) do not
 * fail the run. Modelled on scripts/import-euclid-shared/validate.ts and
 * scripts/import-augustine-city-of-god-shared/validate.ts, adapted for the
 * flat one-level Book-only tree these four works share (see
 * scripts/import-homer-shared/types.ts).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenericWork } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const BOOK_ID = /^book-\d+$/;
const REF_RE = /^\d+–\d+$/;

/** substrings that indicate leaked XML/HTML transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '&#', '<l ', '<l>', '</l', '<p>', '</p', '<div', '</div', '<note', '</note',
  '<quote', '</quote', '<placeName', '</placeName', '<corr', '</corr', '<milestone', '<del', '</del', '<q>', '</q',
  'xmlns', 'http://', 'https://',
];

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

interface SpotCheck {
  label: string;
  find: (work: GenericWork) => string | null;
  expect: string;
  mode: 'startsWith' | 'endsWith';
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  bookCount: number;
  totalChars: number;
  perBook: { id: string; number: string | null; ref: string | null; chars: number }[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function validateWork(opts: {
  workId: string;
  expectLang: 'grc' | 'en';
  spotChecks: SpotCheck[];
}): WorkReport {
  const dir = join(REPO_ROOT, 'data', opts.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    workId: opts.workId,
    dir,
    findings,
    bookCount: 0,
    totalChars: 0,
    perBook: [],
    anomalies: [],
    spotCheck: [],
  };

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['workId'] !== opts.workId) err('about-workId', `about.json workId mismatch`);
  if (about['sections'] === undefined || (about['sections'] as unknown[]).length < 2) {
    warn('about-sections', 'about.json has fewer than 2 "sections" entries');
  }
  if (!about['provenance'] || !about['license']) err('about-fields', 'about.json missing provenance or license');

  const divisions = work.divisions ?? [];

  // ---- exact top-level id sequence: book-1..book-24, nothing else ----
  const expectIds = Array.from({ length: 24 }, (_, i) => `book-${i + 1}`);
  const ids = divisions.map((d) => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(expectIds)) {
    err('top-level-ids', `top-level division id sequence does not match expectation.\n  got:      ${ids.join(', ')}\n  expected: ${expectIds.join(', ')}`);
  }
  report.bookCount = divisions.filter((d) => BOOK_ID.test(d.id)).length;

  // ---- shape: every division is a leaf with exactly 1 passage ----
  for (const d of divisions) {
    if (d.children.length !== 0) err('division-shape', `${d.id}: must have no children (flat Book-only tree), got ${d.children.length}`);
    if (d.passages.length !== 1) err('division-shape', `${d.id}: must have exactly 1 passage, got ${d.passages.length}`);
    if (d.number === null || !/^\d+$/.test(String(d.number))) err('division-number', `${d.id}: number must be a plain arabic string, got ${JSON.stringify(d.number)}`);
    if (d.sourceHeading !== null) err('division-sourceHeading', `${d.id}: sourceHeading should always be null, got ${JSON.stringify(d.sourceHeading)}`);
    if (d.editorialTitle !== null) err('division-editorialTitle', `${d.id}: editorialTitle should always be null, got ${JSON.stringify(d.editorialTitle)}`);
    if (d.ref !== null && !REF_RE.test(d.ref)) err('division-ref', `${d.id}: ref ${JSON.stringify(d.ref)} does not match "N–M" shape`);
    for (const p of d.passages) {
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: passage text is empty`);
      if (p.n !== '') err('passage-n', `${d.id}: passage n should always be '', got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref should always be null, got ${JSON.stringify(p.ref)}`);
    }
    const chars = d.passages.reduce((n, p) => n + p.text.length, 0);
    report.totalChars += chars;
    report.perBook.push({ id: d.id, number: d.number, ref: d.ref, chars });
  }

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
    if (!ok) err('spot-check', `${sc.label}: expected ${sc.mode} ${JSON.stringify(sc.expect)}, got: ${JSON.stringify(sc.mode === 'startsWith' ? got.slice(0, 90) : got.slice(-90))}`);
  }

  return report;
}

function firstBookText(work: GenericWork): string | null {
  return work.divisions[0]?.passages[0]?.text ?? null;
}
function lastBookText(work: GenericWork): string | null {
  const last = work.divisions[work.divisions.length - 1];
  return last?.passages[0]?.text ?? null;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Homer import validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- Books: ${r.bookCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Per-book counts');
  L.push('');
  L.push('| book | number | ref | chars |');
  L.push('|------|--------|-----|-------|');
  for (const b of r.perBook) L.push(`| ${b.id} | ${b.number ?? '-'} | ${b.ref ?? '-'} | ${b.chars} |`);
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
  const works = [
    validateWork({
      workId: 'iliad-grc',
      expectLang: 'grc',
      spotChecks: [
        {
          label: 'Book 1 opens "μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος"',
          find: firstBookText,
          expect: 'μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος',
          mode: 'startsWith',
        },
        {
          label: 'Book 24 ends "...ἀμφίεπον τάφον Ἕκτορος ἱπποδάμοιο."',
          find: lastBookText,
          expect: 'ἀμφίεπον τάφον Ἕκτορος ἱπποδάμοιο.',
          mode: 'endsWith',
        },
      ],
    }),
    validateWork({
      workId: 'odyssey-grc',
      expectLang: 'grc',
      spotChecks: [
        {
          label: 'Book 1 opens "ἄνδρα μοι ἔννεπε, μοῦσα, πολύτροπον"',
          find: firstBookText,
          expect: 'ἄνδρα μοι ἔννεπε, μοῦσα, πολύτροπον',
          mode: 'startsWith',
        },
        {
          label: 'Book 24 ends "...ἠμὲν δέμας ἠδὲ καὶ αὐδήν."',
          find: lastBookText,
          expect: 'ἠμὲν δέμας ἠδὲ καὶ αὐδήν.',
          mode: 'endsWith',
        },
      ],
    }),
    validateWork({
      workId: 'iliad-en',
      expectLang: 'en',
      spotChecks: [
        {
          label: 'Book 1 opens "The wrath sing, goddess, of Peleus\' son, Achilles"',
          find: firstBookText,
          expect: "The wrath sing, goddess, of Peleus' son, Achilles",
          mode: 'startsWith',
        },
        {
          label: 'Book 24 ends "...funeral for horse-taming Hector."',
          find: lastBookText,
          expect: 'funeral for horse-taming Hector.',
          mode: 'endsWith',
        },
      ],
    }),
    validateWork({
      workId: 'odyssey-en',
      expectLang: 'en',
      spotChecks: [
        {
          label: 'Book 1 opens "Tell me, O Muse, of the man of many devices"',
          find: firstBookText,
          expect: 'Tell me, O Muse, of the man of many devices',
          mode: 'startsWith',
        },
        {
          label: 'Book 24 ends "...in the likeness of Mentor both in form and in voice."',
          find: lastBookText,
          expect: 'in the likeness of Mentor both in form and in voice.',
          mode: 'endsWith',
        },
      ],
    }),
  ];

  for (const w of works) writeReport(w);

  process.stdout.write('\n=== validate: homer (iliad/odyssey x grc/en) ===\n');
  let anyError = false;
  for (const w of works) {
    for (const f of w.findings) {
      process.stdout.write(`  [${f.level}] ${w.workId} ${f.check}: ${f.message.split('\n')[0]}\n`);
      if (f.level === 'ERROR') anyError = true;
    }
    process.stdout.write(`  ${w.workId}: ${w.bookCount} books / ${w.totalChars} chars / ${w.anomalies.length} anomalies\n`);
  }
  process.stdout.write(`\nReports written under data/<workId>/VALIDATION_REPORT.md\n`);
  if (anyError) process.exit(1);
}

main();
