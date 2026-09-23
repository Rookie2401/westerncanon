/**
 * Validation for all 28 generated Xenophon work corpora (14 works x grc/en).
 *
 *   npm run validate:xenophon
 *
 * Writes data/xenophon-<slug>-{grc,en}/VALIDATION_REPORT.md for each of the
 * 28 outputs, prints a combined summary, and exits non-zero if any
 * ERROR-level check fails anywhere. WARN-level findings (preserved source
 * irregularities) do not fail the run. Mirrors the ERROR/WARN pattern of
 * scripts/import-archimedes-shared/validate.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XENOPHON_WORKS, workId as workIdOf } from './workTable.ts';
import type { XenophonWorkEntry } from './workTable.ts';
import { hasCombining } from './text.ts';
import type { Division, GenericWork, WorkAbout } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

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

const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '&quot;', '&apos;',
  '<lb ', '<pb ', '<del', '<add', '<gap', '<note', '<bibl', '<said', '<choice', '<sic', '<corr',
  '<q ', '<quote', '<foreign', '<milestone', '<persName', '<placeName', '<surname', '<figure', '<graphic',
  '</p>', '<div', '<head', 'xmlns', 'http://',
];

function walkDivisions(divs: Division[], visit: (d: Division, path: string) => void, prefix = ''): void {
  for (const d of divs) {
    const path = `${prefix}${d.id}`;
    visit(d, path);
    if (d.children.length) walkDivisions(d.children, visit, `${path}/`);
  }
}

function flatIds(divs: Division[]): string[] {
  const out: string[] = [];
  walkDivisions(divs, (d) => out.push(d.id));
  return out;
}

interface WorkReport {
  id: string;
  entry: XenophonWorkEntry;
  lang: 'grc' | 'en';
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; passages: number; chars: number }[];
  anomalies: Anomaly[];
}

function validateWork(entry: XenophonWorkEntry, lang: 'grc' | 'en'): WorkReport {
  const id = workIdOf(entry, lang);
  const dir = join(DATA_ROOT, id);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = { id, entry, lang, dir, findings, divisionCount: 0, passageCount: 0, totalChars: 0, perDivision: [], anomalies: [] };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run \`npm run import:xenophon\``);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== id) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${id}`);
  if (work.language !== lang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${JSON.stringify(lang)}`);
  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of ['The edition', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
    }
  }

  const divisions = work.divisions ?? [];
  let flatDivCount = 0;
  walkDivisions(divisions, () => {
    flatDivCount += 1;
  });
  report.divisionCount = flatDivCount;

  // --- top-level shape per structure kind ---
  if (entry.structure === 'books') {
    for (const d of divisions) {
      if (!/^book-\d+$/.test(d.id)) err('book-id', `top-level division ${d.id} does not match book-N`);
      if (d.passages.length !== 0) err('book-passages', `${d.id}: Book must carry passages: [], got ${d.passages.length}`);
      if (d.children.length === 0) err('book-children', `${d.id}: Book has no chapters`);
      for (const ch of d.children) {
        if (ch.id !== `${d.id}-ch-${ch.number}`) err('chapter-id', `${ch.id} does not match ${d.id}-ch-${ch.number}`);
        if (ch.children.length !== 0) err('chapter-children', `${ch.id}: expected no grandchildren, got ${ch.children.length}`);
        if (ch.passages.length !== 1) err('chapter-passages', `${ch.id}: expected exactly 1 passage, got ${ch.passages.length}`);
      }
    }
  } else if (entry.structure === 'flat-chapters') {
    for (const d of divisions) {
      if (!/^ch-\d+$/.test(d.id)) err('chapter-id', `top-level division ${d.id} does not match ch-N`);
      if (d.children.length !== 0) err('chapter-children', `${d.id}: expected no children, got ${d.children.length}`);
      if (d.passages.length !== 1) err('chapter-passages', `${d.id}: expected exactly 1 passage, got ${d.passages.length}`);
    }
  } else {
    for (const d of divisions) {
      if (!/^sec-\d+$/.test(d.id)) err('section-id', `top-level division ${d.id} does not match sec-N`);
      if (d.children.length !== 0) err('section-children', `${d.id}: expected no children, got ${d.children.length}`);
      if (d.passages.length !== 1) err('section-passages', `${d.id}: expected exactly 1 passage, got ${d.passages.length}`);
    }
  }

  walkDivisions(divisions, (d) => {
    if (d.children.length > 0) return;
    if (d.number === null) err('division-number', `${d.id}: number must never be null for a leaf`);
    if (d.editorialTitle !== null) err('division-editorialTitle', `${d.id}: editorialTitle must be null (numbered-only policy)`);
    if (d.ref !== null) err('division-ref', `${d.id}: ref must be null (see about.json "Reference scheme")`);
  });

  // --- passages ---
  let passageCount = 0;
  let totalChars = 0;
  walkDivisions(divisions, (d, path) => {
    if (d.children.length > 0) return;
    let chars = 0;
    d.passages.forEach((p, i) => {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${path}: passage[${i}] has empty text`);
      if (typeof p.n !== 'string') err('passage-n', `${path}: passage[${i}] n is not a string`);
    });
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, passages: d.passages.length, chars });
  });
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // --- leaked markup ---
  const leaks: string[] = [];
  walkDivisions(divisions, (d, path) => {
    if (d.sourceHeading != null) {
      for (const marker of LEAK_MARKERS) if (d.sourceHeading.includes(marker)) leaks.push(`${path}/sourceHeading: contains ${JSON.stringify(marker)}`);
    }
    d.passages.forEach((p, i) => {
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${path}/passage[${i}]: contains ${JSON.stringify(marker)}`);
    });
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // --- Unicode form: NFC required ---
  let combiningHits = 0;
  let nfcMismatch = 0;
  walkDivisions(divisions, (d) => {
    if (d.sourceHeading != null && hasCombining(d.sourceHeading)) combiningHits += 1;
    for (const p of d.passages) {
      if (hasCombining(p.text)) combiningHits += 1;
      if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
    }
  });
  if (combiningHits > 0) err('no-combining-marks', `${combiningHits} string(s) contain standalone combining diacritics after NFC normalisation`);
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);

  // --- sourceHeading only ever on Book divisions, Greek only ---
  walkDivisions(divisions, (d) => {
    if (d.children.length === 0) return; // leaf: checked implicitly elsewhere
    if (entry.structure !== 'books') {
      if (d.sourceHeading !== null) err('sourceHeading-scope', `${d.id}: sourceHeading must be null outside book-structured works`);
    } else if (lang === 'en' && d.sourceHeading !== null) {
      err('sourceHeading-en', `${d.id}: English witness must carry sourceHeading: null (no book rubric is printed)`);
    } else if (lang === 'grc' && d.sourceHeading === null) {
      warn('sourceHeading-grc', `${d.id}: expected a verbatim Greek book rubric, got null`);
    }
  });

  return report;
}

/** Cross-check that the Greek and English witnesses of one work share the
 *  exact same Division id/number sequence (a strong structural-parity test,
 *  independent of anomaly counts, wording, or content itself). */
function crossCheckParity(entry: XenophonWorkEntry, grcReport: WorkReport, enReport: WorkReport, findings: Finding[]): void {
  const grcPath = join(DATA_ROOT, grcReport.id, 'work.json');
  const enPath = join(DATA_ROOT, enReport.id, 'work.json');
  if (!existsSync(grcPath) || !existsSync(enPath)) return;
  const grcWork = JSON.parse(readFileSync(grcPath, 'utf8')) as GenericWork;
  const enWork = JSON.parse(readFileSync(enPath, 'utf8')) as GenericWork;
  const grcIds = flatIds(grcWork.divisions ?? []);
  const enIds = flatIds(enWork.divisions ?? []);
  if (JSON.stringify(grcIds) !== JSON.stringify(enIds)) {
    findings.push({
      level: 'ERROR',
      check: 'grc-en-parity',
      message: `${entry.slug}: Greek (${grcIds.length} divisions) and English (${enIds.length} divisions) witnesses disagree on Division id sequence.`,
    });
  }
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Xenophon validation report - ${r.id}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- structure: ${r.entry.structure}`);
  L.push(`- divisions (incl. Book containers): ${r.divisionCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- anomalies logged: ${r.anomalies.length}`);
  L.push('');
  L.push('## Per-division passage counts (leaf divisions only, first 50)');
  L.push('');
  L.push('| id | number | passages | chars |');
  L.push('|----|--------|----------|-------|');
  r.perDivision.slice(0, 50).forEach((d) => {
    L.push(`| ${d.id} | ${d.number ?? '-'} | ${d.passages} | ${d.chars} |`);
  });
  if (r.perDivision.length > 50) L.push(`| ... | ${r.perDivision.length - 50} more | | |`);
  L.push('');
  L.push('## Anomalies (preserved, not corrected) - first 100');
  L.push('');
  if (r.anomalies.length === 0) L.push('_none_');
  for (const a of r.anomalies.slice(0, 100)) L.push(`- **${a.where}** - ${a.note}`);
  if (r.anomalies.length > 100) L.push(`- ... ${r.anomalies.length - 100} more, see anomalies.json`);
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
  if (XENOPHON_WORKS.length !== 14) {
    process.stderr.write(`STOP: expected exactly 14 works in the table, got ${XENOPHON_WORKS.length}\n`);
    process.exit(1);
  }

  const reports: WorkReport[] = [];
  const parityFindings: Finding[] = [];
  for (const entry of XENOPHON_WORKS) {
    const grcReport = validateWork(entry, 'grc');
    const enReport = validateWork(entry, 'en');
    reports.push(grcReport, enReport);
    crossCheckParity(entry, grcReport, enReport, parityFindings);
  }

  // Attach parity findings to the Greek report of their work so they surface once each.
  for (const f of parityFindings) {
    const slug = f.message.split(':')[0];
    const target = reports.find((r) => r.entry.slug === slug && r.lang === 'grc');
    if (target) target.findings.push(f);
  }

  // --- special verification target: Anabasis opening line -----------------
  const anabGrc = reports.find((r) => r.id === 'xenophon-anabasis-grc');
  const anabEn = reports.find((r) => r.id === 'xenophon-anabasis-en');
  if (anabGrc && existsSync(join(DATA_ROOT, 'xenophon-anabasis-grc', 'work.json'))) {
    const w = JSON.parse(readFileSync(join(DATA_ROOT, 'xenophon-anabasis-grc', 'work.json'), 'utf8')) as GenericWork;
    const ch1 = w.divisions[0]?.children?.[0];
    const text = ch1?.passages?.[0]?.text ?? '';
    if (!text.startsWith('Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο')) {
      anabGrc.findings.push({ level: 'ERROR', check: 'verification-target', message: `book-1-ch-1 does not open with "Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο": got ${JSON.stringify(text.slice(0, 60))}` });
    }
  }
  if (anabEn && existsSync(join(DATA_ROOT, 'xenophon-anabasis-en', 'work.json'))) {
    const w = JSON.parse(readFileSync(join(DATA_ROOT, 'xenophon-anabasis-en', 'work.json'), 'utf8')) as GenericWork;
    const ch1 = w.divisions[0]?.children?.[0];
    const text = ch1?.passages?.[0]?.text ?? '';
    if (!text.startsWith('Darius and Parysatis had two sons')) {
      anabEn.findings.push({ level: 'ERROR', check: 'verification-target', message: `book-1-ch-1 does not open with "Darius and Parysatis had two sons": got ${JSON.stringify(text.slice(0, 60))}` });
    }
  }

  for (const r of reports) writeReport(r);

  process.stdout.write('\n=== validate:xenophon ===\n');
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(
      `  ${r.id.padEnd(38)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ${String(r.divisionCount).padStart(5)} div  ${String(r.passageCount).padStart(5)} passages  ${errors.length} err  ${warns.length} warn\n`,
    );
    for (const f of [...errors, ...warns]) {
      process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
    }
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} outputs.\n`);
  process.stdout.write(`Reports written to data/xenophon-<slug>-{grc,en}/VALIDATION_REPORT.md\n`);
  if (totalErrors > 0) process.exit(1);
}

main();
