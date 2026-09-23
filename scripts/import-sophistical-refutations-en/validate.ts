/**
 * Validation for data/sophistical-refutations-en/.
 *
 *   npx tsx scripts/import-sophistical-refutations-en/validate.ts
 *   npm run validate:sophistical-refutations-en
 *
 * Writes data/sophistical-refutations-en/VALIDATION_REPORT.md, prints a
 * summary, and exits non-zero if any ERROR-level check fails.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/sophistical-refutations-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'sophistical-refutations-en');

const WORK_ID = 'sophistical-refutations-en';
const EXPECTED_CHAPTERS = 34;
const INCIPIT = 'Let us now discuss sophistic refutations, i.e. what appear to be refutations but are really fallacies instead.';
const EXPLICIT = 'for the discoveries thereof your warm thanks.';

const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '<A ', '</A>', '<B>', '</B>', '<BR', 'NAME="start"', 'NAME="end"',
  'http://', 'https://', '<p>', '</p>', '<div', '<HTML', '<TABLE',
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

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, { chapters: 0, chars: 0 }, []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'en') err('language', `expected 'en', got ${JSON.stringify(work.language)}`);
  if (about['translator'] !== 'W. A. Pickard-Cambridge') {
    err('translator', `about.json translator must be "W. A. Pickard-Cambridge", got ${JSON.stringify(about['translator'])}`);
  }

  const chapters = work.divisions ?? [];
  if (chapters.length !== EXPECTED_CHAPTERS) err('chapter-count', `expected ${EXPECTED_CHAPTERS} chapters, got ${chapters.length}`);

  chapters.forEach((c, j) => {
    const wantNumber = j + 1;
    const wantId = `ch-${wantNumber}`;
    if (c.id !== wantId) err('chapter-id', `chapter[${j}] id ${JSON.stringify(c.id)}, expected ${JSON.stringify(wantId)}`);
    if (c.number !== String(wantNumber)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)}, expected "${wantNumber}"`);
    if (c.ref !== null) err('chapter-ref', `${c.id}: ref must be null, got ${JSON.stringify(c.ref)}`);
    if (c.sourceHeading !== null) err('chapter-sourceHeading', `${c.id}: sourceHeading must be null, got ${JSON.stringify(c.sourceHeading)}`);
    if (c.editorialTitle !== null) err('chapter-editorialTitle', `${c.id}: editorialTitle must be null, got ${JSON.stringify(c.editorialTitle)}`);
    if (!Array.isArray(c.children) || c.children.length !== 0) err('chapter-children', `${c.id}: children must be [], got ${JSON.stringify(c.children)}`);
    if (c.passages.length !== 1) err('chapter-passage-count', `${c.id}: expected exactly 1 passage, got ${c.passages.length}`);
    for (const p of c.passages) {
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}: passage text is empty`);
      if (p.n !== '') err('passage-n', `${c.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${c.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
    }
  });

  // ---- leaked markup ----
  const leaks: string[] = [];
  const walk = (divs: Division[]) => {
    for (const d of divs) {
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children);
    }
  };
  walk(chapters);
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- required anomaly documentation ----
  if (!anomalies.some((a) => /Bekker/i.test(a.note))) err('ref-note', 'anomalies.json must document the absence of Bekker markers in this source');
  if (!anomalies.some((a) => /footnote/i.test(a.note))) err('footnote-note', 'anomalies.json must document the footnote check');
  if (!anomalies.some((a) => /structure|Section/i.test(a.note))) err('structure-note', 'anomalies.json must document the flat single-book (no Book level) structural choice');

  // ---- spot checks ----
  const p1 = chapters[0]?.passages[0]?.text ?? '';
  const okStart = p1.startsWith(INCIPIT);
  if (!okStart) err('spot-check-incipit', `ch-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const lastCh = chapters[chapters.length - 1];
  const lastText = lastCh?.passages[0]?.text ?? '';
  const okEnd = lastText.endsWith(EXPLICIT);
  if (!okEnd) err('spot-check-explicit', `final chapter (${lastCh?.id}) does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-90))})`);

  const stats = { chapters: chapters.length, chars: 0 };
  const walkChars = (divs: Division[]): number => divs.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0) + walkChars(d.children), 0);
  stats.chars = walkChars(chapters);

  writeReport(findings, stats, chapters.map(() => ''), anomalies, { incipitOk: okStart, incipitGot: p1.slice(0, 90), explicitOk: okEnd, explicitGot: lastText.slice(-90) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:sophistical-refutations-en ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${stats.chapters} chapters / ${stats.chars} chars\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  stats: { chapters: number; chars: number },
  chapterCounts: string[],
  anomalies: Anomaly[] = [],
  spot?: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# On Sophistical Refutations (English, Pickard-Cambridge) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- chapters: ${stats.chapters}`);
  L.push(`- total passage chars: ${stats.chars}`);
  void chapterCounts;
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — ch-1 incipit\n  - got: \`${spot.incipitGot}\``);
    L.push(`- ${spot.explicitOk ? 'OK' : 'FAIL'} — final chapter explicit\n  - got: \`${spot.explicitGot}\``);
    L.push('');
  }
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (anomalies.length === 0) L.push('_none_');
  for (const a of anomalies) L.push(`- **${a.where}** — ${a.note}`);
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

main();
