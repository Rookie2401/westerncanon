/**
 * Validation for data/poetics-en/.
 *
 *   npx tsx scripts/import-poetics-en/validate.ts
 *
 * Writes data/poetics-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. WARN-level findings (preserved
 * source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/poetics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'poetics-en');

const WORK_ID = 'poetics-en';
const EXPECTED_CHAPTERS = 26;
const OPENING_PREFIX = 'Our subject being Poetry, I propose to speak not only of the art in general';
const CLOSING_SUFFIX = 'the Objections of the critics, and the Solutions in answer to them.';

// NOTE: "''" is deliberately NOT a leak marker here - unlike this library's
// wiki-sourced English editions (where '' means italic markup), this is a
// Gutenberg plain-text source, and ch-21 genuinely prints a doubled closing
// single-quote from nested quotation ("...'sunset of life''..."), which is
// Bywater's own punctuation, not transport markup.
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<ref', '</ref', '<references',
  'http://', 'https://', '<p>', '</p>', '<div',
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
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run the importer`);
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
  if (about['translator'] !== 'Ingram Bywater') err('translator', `about.json translator must be "Ingram Bywater", got ${JSON.stringify(about['translator'])}`);

  const chapters = work.divisions ?? [];
  if (chapters.length !== EXPECTED_CHAPTERS) err('chapter-count', `expected ${EXPECTED_CHAPTERS} chapters, got ${chapters.length}`);

  chapters.forEach((c, i) => {
    const wantNumber = i + 1;
    const wantId = `ch-${wantNumber}`;
    if (c.id !== wantId) err('chapter-id', `chapter[${i}] id ${JSON.stringify(c.id)}, expected ${JSON.stringify(wantId)}`);
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
  if (!anomalies.some((a) => /Murray|front matter/i.test(a.note))) err('frontmatter-note', 'anomalies.json must document the exclusion of Gilbert Murray\'s Preface');
  if (!anomalies.some((a) => /Bekker/i.test(a.note))) err('bekker-note', 'anomalies.json must document the absent Bekker reference scheme');

  // ---- spot checks ----
  const openingText = chapters[0]?.passages[0]?.text ?? '';
  const okStart = openingText.startsWith(OPENING_PREFIX);
  if (!okStart) err('spot-check-opening', `ch-1 does not start with ${JSON.stringify(OPENING_PREFIX)} (got: ${JSON.stringify(openingText.slice(0, 140))})`);

  const lastCh = chapters[chapters.length - 1];
  const closingText = lastCh?.passages[0]?.text ?? '';
  const okEnd = closingText.endsWith(CLOSING_SUFFIX);
  if (!okEnd) err('spot-check-closing', `final chapter (${lastCh?.id}) does not end with ${JSON.stringify(CLOSING_SUFFIX)} (got tail: ${JSON.stringify(closingText.slice(-140))})`);

  const stats = { chapters: chapters.length, chars: 0 };
  stats.chars = chapters.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);

  writeReport(findings, stats, [], anomalies, {
    openingOk: okStart,
    openingGot: openingText.slice(0, 140),
    closingOk: okEnd,
    closingGot: closingText.slice(-140),
  });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:poetics-en ===\n');
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
  spot?: { openingOk: boolean; openingGot: string; closingOk: boolean; closingGot: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Poetics (English, Bywater) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- chapters: ${stats.chapters}`);
  L.push(`- total passage chars: ${stats.chars}`);
  for (const c of chapterCounts) L.push(`- ${c}`);
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.openingOk ? 'OK' : 'FAIL'} - ch-1 opening\n  - got: \`${spot.openingGot}\``);
    L.push(`- ${spot.closingOk ? 'OK' : 'FAIL'} - final chapter closing\n  - got tail: \`${spot.closingGot}\``);
    L.push('');
  }
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (anomalies.length === 0) L.push('_none_');
  for (const a of anomalies) L.push(`- **${a.where}** - ${a.note}`);
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
