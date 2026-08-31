/**
 * Validation for the two generated Aristotle corpora:
 *   data/categoriae-grc/          data/de-interpretatione-grc/
 *
 *   npm run validate:aristotle
 *
 * Writes data/<id>/VALIDATION_REPORT.md for each work, prints a summary, and
 * exits non-zero if any ERROR-level check fails in either work. WARN-level
 * findings (preserved source irregularities) do not fail the run.
 *
 * Mirrors scripts/import-isagoge-shared/validate.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES_CHAPTERS,
  DE_INTERPRETATIONE_CHAPTERS,
  type ChapterMeta,
} from './chapters.ts';
import type { Division, GenericWork } from '../../data/categoriae-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA = join(REPO_ROOT, 'data');

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
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<ref', '</ref', 'http://', 'https://',
  'xmlns', '<p>', '</p>', '<div', '<note', '<lb ', '<pb ', '<milestone', '<head>', '<pb/',
];

/** editorial angle-bracket supplement pattern (kept verbatim, must be flagged) */
const ANGLE_SUPPLEMENT_RE = /<'?[A-Za-z][A-Za-z' ]*'?>/;

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
  }
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; heading: string | null; passages: number; chars: number }[];
  anomalies: Anomaly[];
  refScheme: string;
  spotCheck: { label: string; ok: boolean; got: string }[];
}

interface WorkSpec {
  workId: string;
  chapters: readonly ChapterMeta[];
  bekkerSpan: string;
  spotStart: string;
}

const WORKS: WorkSpec[] = [
  {
    workId: 'categoriae-grc',
    chapters: CATEGORIES_CHAPTERS,
    bekkerSpan: '1a1–15b33',
    spotStart: 'ὉΜΩΝΥΜΑ λέγεται ὧν ὄνομα μόνον κοινόν',
  },
  {
    workId: 'de-interpretatione-grc',
    chapters: DE_INTERPRETATIONE_CHAPTERS,
    bekkerSpan: '16a1–24b9',
    spotStart: 'ΠΡΩΤΟΝ δεῖ θέσθαι τί ὄνομα καὶ τί ῥῆμα',
  },
];

function validateWork(spec: WorkSpec): WorkReport {
  const dir = join(DATA, spec.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    workId: spec.workId,
    dir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
    refScheme: `chapter (Bekker page/column/line not marked in the digital source; the work spans Bekker ${spec.bekkerSpan})`,
    spotCheck: [],
  };

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== spec.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${spec.workId}`);
  if (work.language !== 'grc') err('language', `work.json language is ${JSON.stringify(work.language)}, expected grc`);
  if (about['translator'] !== undefined) {
    err('translator', `about.json must not carry a translator for the Greek work, got ${JSON.stringify(about['translator'])}`);
  }

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  // ---- division count ----
  if (divisions.length !== spec.chapters.length) {
    err('division-count', `expected ${spec.chapters.length} divisions, got ${divisions.length}`);
  }

  // ---- division id set + order, number, editorialTitle, children ----
  const ids = divisions.map((d) => d.id);
  const wantIds = spec.chapters.map((c) => c.id);
  if (ids.length !== wantIds.length || ids.some((id, i) => id !== wantIds[i])) {
    err('division-ids', `division id sequence does not match the shared chapter table:\n  got: ${ids.join(', ')}\n  want: ${wantIds.join(', ')}`);
  }
  divisions.forEach((d, i) => {
    const meta = spec.chapters[i];
    if (!meta) return;
    if (d.number !== meta.number) err('division-number', `${d.id}: number ${JSON.stringify(d.number)} != shared table ${JSON.stringify(meta.number)}`);
    if (d.editorialTitle !== meta.en) err('division-editorialTitle', `${d.id}: editorialTitle ${JSON.stringify(d.editorialTitle)} != shared table ${JSON.stringify(meta.en)}`);
    if (!Array.isArray(d.children) || d.children.length !== 0) err('division-children', `${d.id}: children must be [], got ${JSON.stringify(d.children)}`);
  });

  // ---- no praefatio ----
  if (ids.includes('praefatio')) err('no-praefatio', 'these works have no praefatio division');

  // ---- passages + ref/n/sourceHeading expectations (grc: all null / "") ----
  let passageCount = 0;
  let totalChars = 0;
  for (const d of divisions) {
    let chars = 0;
    if (d.ref !== null) err('division-ref', `${d.id}: division ref must be null, got ${JSON.stringify(d.ref)}`);
    if (d.sourceHeading !== null) {
      err('division-sourceHeading', `${d.id}: grc division sourceHeading must be null, got ${JSON.stringify(d.sourceHeading)}`);
    }
    for (const p of d.passages) {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      if (typeof p.n !== 'string') err('passage-n-type', `${d.id}: passage n is not a string`);
      if (p.n !== '') err('passage-n', `${d.id}: passage n must be "" for ${spec.workId}, got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref must be null for ${spec.workId}, got ${JSON.stringify(p.ref)}`);
    }
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, heading: d.sourceHeading, passages: d.passages.length, chars });
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- editorial angle-bracket supplements (none expected in the Greek, but check + require an anomaly) ----
  const angleHits: string[] = [];
  walkTexts(divisions, (s, where) => {
    if (ANGLE_SUPPLEMENT_RE.test(s)) angleHits.push(`${where}: ${(s.match(new RegExp(ANGLE_SUPPLEMENT_RE, 'g')) ?? []).join(', ')}`);
  });
  if (angleHits.length) {
    warn('angle-supplement', `${angleHits.length} editorial angle-bracket supplement(s) preserved: ${angleHits.join('; ')}`);
    if (!anomalies.some((a) => /angle-bracket/i.test(a.note) || /angle-bracket/i.test(a.where))) {
      err('angle-supplement', 'angle-bracket supplement present in text but not recorded in anomalies.json');
    }
  }

  // ---- refs must be documented as a downgrade in anomalies.json ----
  if (!anomalies.some((a) => /Bekker/i.test(a.note) && /chapter/i.test(a.note))) {
    err('ref-downgrade-note', 'anomalies.json must record the by-chapter reference downgrade (no Bekker milestones in the digital source)');
  }

  // ---- spot check (NFC-insensitive) ----
  const p1 = divisions[0]?.passages[0]?.text ?? '';
  const ok = p1.normalize('NFC').startsWith(spec.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `ch-1 passage[0] starts "${spec.spotStart}"`, ok, got: p1.slice(0, 60) });
  if (!ok) err('spot-check', `ch-1 passage[0] does not start with ${JSON.stringify(spec.spotStart)} (got: ${JSON.stringify(p1.slice(0, 60))})`);

  return report;
}

function writeReport(r: WorkReport, all: WorkReport[]): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Aristotle validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions: ${r.divisionCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- ref scheme: ${r.refScheme}`);
  L.push('');
  L.push('## Per-division passage counts');
  L.push('');
  L.push('| # | id | number | sourceHeading | passages | chars |');
  L.push('|---|----|--------|---------------|----------|-------|');
  r.perDivision.forEach((d, i) => {
    L.push(`| ${i} | ${d.id} | ${d.number ?? '-'} | ${d.heading ? d.heading.replace(/\|/g, '\\|') : '-'} | ${d.passages} | ${d.chars} |`);
  });
  L.push('');
  for (const sib of all) {
    if (sib.workId === r.workId) continue;
    L.push(`Companion Greek work \`${sib.workId}\`: ${sib.divisionCount} divisions / ${sib.passageCount} passages.`);
  }
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
  const reports = WORKS.map(validateWork);
  for (const r of reports) writeReport(r, reports);

  const all = reports.flatMap((r) => r.findings.map((f) => ({ w: r.workId, ...f })));
  process.stdout.write('\n=== validate:aristotle ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  for (const r of reports) {
    process.stdout.write(
      `  ${r.workId.padEnd(24)} ${String(r.divisionCount).padStart(2)} divisions / ` +
        `${String(r.passageCount).padStart(3)} passages / ${String(r.totalChars).padStart(6)} chars  ` +
        `-> ${join(r.dir, 'VALIDATION_REPORT.md')}\n`,
    );
  }
  if (errors.length > 0) process.exit(1);
}

main();
