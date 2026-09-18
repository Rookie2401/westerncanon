/**
 * Validation for the English Isagoge corpus (Owen, 1853).
 *
 *   npm run validate:isagoge-en
 *
 * Writes data/isagoge-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. WARN-level findings (preserved
 * source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/isagoge-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'isagoge-en');

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
  '&amp;', '&lt;', '&gt;', '&#', '{{', '}}', '[[', ']]', '<ref', '</ref',
  'http://', 'https://', 'xmlns', '</p>', '<div', '<span', '<sup', '<style', '<link',
  'wst-sidenote', 'pagenum', 'TemplateStyles', 'cite_note', 'cite_ref',
];

const EXPECTED_ROMANS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII',
];

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
  }
}

interface WorkReport {
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; heading: string | null; passages: number; chars: number }[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function validateWork(): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run the importer`);
  }

  const report: WorkReport = {
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
    spotCheck: [],
  };
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== 'isagoge-en') err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected "isagoge-en"`);
  if (work.language !== 'en') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "en"`);
  if (about['translator'] !== 'Octavius Freire Owen') {
    err('translator-spelling', `about.json translator is ${JSON.stringify(about['translator'])}, must be exactly "Octavius Freire Owen"`);
  }

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  // ---- chapter count: verified against the real source, not assumed ----
  if (divisions.length !== 17) {
    err('division-count', `expected exactly 17 chapter divisions (verified against the rendered Wikisource page body), got ${divisions.length}`);
  }

  // ---- division ids / numbers, sequential, one level deep ----
  divisions.forEach((d, i) => {
    const expectedId = `ch-${i + 1}`;
    if (d.id !== expectedId) err('division-id', `division[${i}] id is ${JSON.stringify(d.id)}, expected ${JSON.stringify(expectedId)}`);
    if (d.number !== EXPECTED_ROMANS[i]) {
      err('division-number', `${d.id}: number ${JSON.stringify(d.number)} != expected ${JSON.stringify(EXPECTED_ROMANS[i] ?? null)}`);
    }
    if (d.editorialTitle !== null) err('division-editorialTitle', `${d.id}: editorialTitle should be null (source heading is already English), got ${JSON.stringify(d.editorialTitle)}`);
    if (d.ref !== null) err('division-ref', `${d.id}: ref should be null for isagoge-en`);
    if (!d.sourceHeading || d.sourceHeading.length === 0) err('division-sourceHeading', `${d.id}: sourceHeading is empty`);
    if (d.children.length !== 0) warn('division-children', `${d.id}: expected no children, got ${d.children.length}`);
  });

  // ---- passages ----
  let passageCount = 0;
  let totalChars = 0;
  for (const d of divisions) {
    let chars = 0;
    if (d.passages.length === 0) err('empty-division', `${d.id}: no passages`);
    for (const p of d.passages) {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      if (p.n !== '') err('passage-n', `${d.id}: passage n should be '' for isagoge-en, got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref should be null for isagoge-en, got ${JSON.stringify(p.ref)}`);
    }
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, heading: d.sourceHeading, passages: d.passages.length, chars });
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- stray "*" / "}" must be gone from reading text (removed by the importer) ----
  const strayHits: string[] = [];
  walkTexts(divisions, (s, where) => {
    if (s.includes('*')) strayHits.push(`${where}: contains "*"`);
    if (s.includes('}')) strayHits.push(`${where}: contains "}"`);
  });
  if (strayHits.length) err('no-stray-marks', `${strayHits.length} string(s) still contain a stray "*"/"}" mark:\n    ${strayHits.join('\n    ')}`);

  // ---- every passage-level anomaly note must correspond to a real Passage.anomaly ----
  const flaggedPassages = divisions.reduce((n, d) => n + d.passages.filter((p) => p.anomaly).length, 0);
  if (flaggedPassages === 0) warn('passage-anomalies', 'no passage carries an anomaly note (expected at least the stray-mark and dropped-word passages)');

  // ---- known textual anomalies must be recorded in anomalies.json ----
  const requiredAnomalyPatterns: [RegExp, string][] = [
    [/table of contents/i, 'TOC duplicate-heading question'],
    [/dropped word/i, 'Chapter IV apparent dropped word'],
    [/OCR-level/i, 'OCR-level irregularities'],
    [/stray transport marks/i, 'stray "*"/"}" removal'],
  ];
  for (const [re, label] of requiredAnomalyPatterns) {
    if (!anomalies.some((a) => re.test(a.where) || re.test(a.note))) {
      err('anomaly-coverage', `expected an anomalies.json entry covering: ${label}`);
    }
  }

  // ---- spot check: verbatim first sentence / genuine final sentence ----
  const FIRST_SENTENCE_START =
    "Since it is necessary, Chrysaorius, both to the doctrine of Aristotle's Categories, to know what genus, difference, species, property, and accident are";
  const FINAL_SENTENCE_END =
    'but these are sufficient for their distinction, and the setting forth of their agreement.';

  const p1 = divisions[0]?.passages[0]?.text ?? '';
  const startOk = p1.normalize('NFC').startsWith(FIRST_SENTENCE_START.normalize('NFC'));
  report.spotCheck.push({ label: `chapter I passage 1 starts with the opening sentence`, ok: startOk, got: p1.slice(0, 90) });
  if (!startOk) err('spot-check', `chapter I passage 1 does not start with the expected opening sentence (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const lastDiv = divisions[divisions.length - 1];
  const lastP = lastDiv?.passages[lastDiv.passages.length - 1]?.text ?? '';
  const endOk = lastP.normalize('NFC').endsWith(FINAL_SENTENCE_END.normalize('NFC'));
  report.spotCheck.push({ label: `final division (${lastDiv?.id}) ends with the closing sentence`, ok: endOk, got: lastP.slice(-90) });
  if (!endOk) err('spot-end', `final division last passage does not end with the expected closing sentence — possible truncation (got tail: ${JSON.stringify(lastP.slice(-90))})`);

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push('# Isagoge (English, Owen 1853) validation report');
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
  L.push('- ref scheme: chapter (roman numeral) + printed chapter title; no printed paragraph numbers, all ref fields null');
  L.push('');
  L.push('## Per-division passage counts');
  L.push('');
  L.push('| # | id | number | sourceHeading | passages | chars |');
  L.push('|---|----|--------|---------------|----------|-------|');
  r.perDivision.forEach((d, i) => {
    L.push(`| ${i} | ${d.id} | ${d.number ?? '-'} | ${d.heading ? d.heading.replace(/\|/g, '\\|') : '-'} | ${d.passages} | ${d.chars} |`);
  });
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
  writeFileSync(join(DIR, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

function main(): void {
  const r = validateWork();
  writeReport(r);

  process.stdout.write('\n=== validate:isagoge-en ===\n');
  for (const f of r.findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` + `Report: ${join(DIR, 'VALIDATION_REPORT.md')}\n`,
  );
  process.stdout.write(`\nisagoge-en: ${r.divisionCount} divisions / ${r.passageCount} passages / ${r.totalChars} chars\n`);
  if (errors.length > 0) process.exit(1);
}

main();
