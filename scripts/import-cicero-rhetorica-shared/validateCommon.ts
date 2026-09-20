/**
 * Shared validation helpers for all five Cicero-rhetorica generic-profile
 * corpora added in this batch (de-oratore-la, brutus-la, brutus-en,
 * orator-la, orator-en). Each work's own scripts/import-<workId>/validate.ts
 * is a thin wrapper that supplies work-specific expectations to
 * `validateGenericWork` below, then writes its own VALIDATION_REPORT.md -
 * mirrors the style of scripts/import-isagoge-shared/validate.ts, factored
 * out since five works share almost all of the generic-shape checks.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: { n: string; text: string; ref: string | null; anomaly?: string }[];
}
export interface GenericWork {
  workId: string;
  language: string;
  divisions: Division[];
}
export interface Anomaly {
  where: string;
  note: string;
}

export type Level = 'ERROR' | 'WARN';
export interface Finding {
  level: Level;
  check: string;
  message: string;
}

/** substrings that indicate leaked transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '<div', '<note', '<del', '<add', '<reg', '<abbr', '<expan', '<milestone',
  '<gap', '<lb ', '<pb ', '</p>', '<p>', '<p ', 'xmlns', 'http://www.tei-c', '[Footnote',
];

export function flatten(divisions: Division[]): Division[] {
  const out: Division[] = [];
  const walk = (ds: Division[]) => {
    for (const d of ds) {
      out.push(d);
      if (d.children.length) walk(d.children);
    }
  };
  walk(divisions);
  return out;
}

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of flatten(divisions)) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
  }
}

export interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  leafCount: number;
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
  extra: string[];
}

export interface ValidateOpts {
  workId: string;
  dir: string;
  expectLang: string;
  /** verbatim start of the very first passage in document order */
  spotStart: string;
  /** verbatim end of the very last passage in document order */
  spotEnd: string;
  /** every Division.ref must be null throughout (true for all 5 of these works except brutus-la/orator-la) */
  expectAllDivisionRefsNull: boolean;
  /** every Passage.ref must be null throughout (true for all 5 of these works) */
  expectAllPassageRefsNull: boolean;
  /** extra, work-specific checks; push into `findings` / `extra` as needed */
  extraChecks?: (work: GenericWork, findings: Finding[], extra: string[]) => void;
}

export function validateGenericWork(opts: ValidateOpts): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    workId: opts.workId,
    dir: opts.dir,
    findings,
    divisionCount: 0,
    leafCount: 0,
    passageCount: 0,
    totalChars: 0,
    anomalies: [],
    spotCheck: [],
    extra: [],
  };

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(opts.dir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(opts.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(opts.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(opts.dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['workId'] !== opts.workId) err('about-workId', `about.json workId mismatch`);

  const flat = flatten(work.divisions);
  report.divisionCount = flat.length;
  const leaves = flat.filter((d) => d.children.length === 0);
  report.leafCount = leaves.length;

  let passageCount = 0;
  let totalChars = 0;
  const leaks: string[] = [];
  for (const d of leaves) {
    if (d.passages.length === 0) err('empty-division', `${d.id}: leaf division has zero passages`);
    for (const p of d.passages) {
      passageCount += 1;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      totalChars += p.text.length;
      if (opts.expectAllPassageRefsNull && p.ref !== null) {
        err('passage-ref', `${d.id}: passage ref should be null, got ${JSON.stringify(p.ref)}`);
      }
    }
    if (opts.expectAllDivisionRefsNull && d.ref !== null) {
      err('division-ref', `${d.id}: division ref should be null, got ${JSON.stringify(d.ref)}`);
    }
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  walkTexts(work.divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 15).join('\n    ')}`);

  // double-space / stray-whitespace sanity (whitespace-collapse should have caught this)
  const dbl: string[] = [];
  walkTexts(work.divisions, (s, where) => {
    if (/ {2,}/.test(s)) dbl.push(where);
  });
  if (dbl.length) warn('double-space', `${dbl.length} string(s) contain a run of 2+ spaces: ${dbl.slice(0, 10).join(', ')}`);

  // spot check: first leaf's first passage; last leaf's last passage
  const first = leaves[0];
  const p1 = first?.passages[0]?.text ?? '';
  const startOk = p1.normalize('NFC').startsWith(opts.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `first passage starts "${opts.spotStart}"`, ok: startOk, got: p1.slice(0, 70) });
  if (!startOk) err('spot-check', `first passage does not start with ${JSON.stringify(opts.spotStart)} (got: ${JSON.stringify(p1.slice(0, 70))})`);

  const last = leaves[leaves.length - 1];
  const pn = last?.passages[last.passages.length - 1]?.text ?? '';
  const endOk = pn.normalize('NFC').endsWith(opts.spotEnd.normalize('NFC'));
  report.spotCheck.push({ label: `final (${last?.id}) ends "${opts.spotEnd}"`, ok: endOk, got: pn.slice(-70) });
  if (!endOk) err('spot-end', `final division's last passage does not end with ${JSON.stringify(opts.spotEnd)} (got tail: ${JSON.stringify(pn.slice(-70))})`);

  opts.extraChecks?.(work, findings, report.extra);

  return report;
}

export function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# ${r.workId} validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions (all levels): ${r.divisionCount}`);
  L.push(`- leaf divisions: ${r.leafCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  for (const line of r.extra) L.push(`- ${line}`);
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

export function printSummary(r: WorkReport): void {
  process.stdout.write(`\n=== validate:${r.workId} ===\n`);
  for (const f of r.findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s). Report: ${join(r.dir, 'VALIDATION_REPORT.md')}\n` +
      `${r.divisionCount} divisions (${r.leafCount} leaves) / ${r.passageCount} passages / ${r.totalChars} chars\n`,
  );
}
