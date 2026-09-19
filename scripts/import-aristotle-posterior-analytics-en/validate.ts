/**
 * Validation for data/posterior-analytics-en/.
 *
 *   npx tsx scripts/import-aristotle-posterior-analytics-en/validate.ts
 *
 * Writes data/posterior-analytics-en/VALIDATION_REPORT.md, prints a summary,
 * and exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/posterior-analytics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'posterior-analytics-en');

const WORK_ID = 'posterior-analytics-en';
/** number, expectedChapters (traditional Chapter I..N count only — Book 2's Appendix chapters, 23/24, are extra) */
const EXPECTED_BOOKS = [
  { number: '1', traditionalCount: 34, extra: [] as number[] },
  { number: '2', traditionalCount: 19, extra: [23, 24] },
];
const INCIPIT = 'All communications of knowledge from teacher to pupil by way of reasoning pre-suppose some pre-existing knowledge.';
const EXPLICIT = 'does not make use of all the individual instances, but only of some or one.';

const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<ref', '</ref', '<references',
  'http://', 'https://', "''", ':\'\'', '<p>', '</p>', '<div', '===Notes===',
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
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, { books: 0, chapters: 0, chars: 0 }, []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'en') err('language', `expected 'en', got ${JSON.stringify(work.language)}`);
  if (about['translator'] !== 'E. S. Bouchier') err('translator', `about.json translator must be "E. S. Bouchier", got ${JSON.stringify(about['translator'])}`);

  const books = work.divisions ?? [];
  if (books.length !== EXPECTED_BOOKS.length) err('book-count', `expected ${EXPECTED_BOOKS.length} books, got ${books.length}`);

  let totalChapters = 0;
  const chapterCounts: string[] = [];

  books.forEach((b, i) => {
    const spec = EXPECTED_BOOKS[i];
    if (!spec) return;
    if (b.id !== `book-${spec.number}`) err('book-id', `book[${i}] id ${JSON.stringify(b.id)}, expected "book-${spec.number}"`);
    if (b.number !== spec.number) err('book-number', `${b.id}: number ${JSON.stringify(b.number)}, expected ${JSON.stringify(spec.number)}`);
    if (b.ref !== null) err('book-ref', `${b.id}: ref must be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== null) err('book-sourceHeading', `${b.id}: sourceHeading must be null, got ${JSON.stringify(b.sourceHeading)}`);
    if (b.editorialTitle !== null) err('book-editorialTitle', `${b.id}: editorialTitle must be null, got ${JSON.stringify(b.editorialTitle)}`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [] (container only), got ${b.passages.length}`);

    const chapters = b.children ?? [];
    const expectedNumbers = [...Array(spec.traditionalCount)].map((_, j) => j + 1).concat(spec.extra);
    chapterCounts.push(`Book ${spec.number}: ${chapters.length} chapters (traditional Chapters I-${spec.traditionalCount}${spec.extra.length ? ` + Appendix Chapters ${spec.extra.join(', ')}` : ''})`);
    if (chapters.length !== expectedNumbers.length) {
      warn('chapter-count', `${b.id}: expected ${expectedNumbers.length} chapters (real page count enumerated by the importer), got ${chapters.length}`);
    }
    totalChapters += chapters.length;

    chapters.forEach((c, j) => {
      const wantNumber = expectedNumbers[j];
      const wantId = wantNumber !== undefined ? `book-${spec.number}-ch-${wantNumber}` : undefined;
      if (wantId && c.id !== wantId) err('chapter-id', `chapter[${j}] id ${JSON.stringify(c.id)}, expected ${JSON.stringify(wantId)}`);
      if (wantNumber !== undefined && c.number !== String(wantNumber)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)}, expected "${wantNumber}"`);
      if (c.ref !== null) err('chapter-ref', `${c.id}: ref must be null, got ${JSON.stringify(c.ref)}`);
      if (c.sourceHeading !== null) err('chapter-sourceHeading', `${c.id}: sourceHeading must be null, got ${JSON.stringify(c.sourceHeading)}`);
      if (typeof c.editorialTitle !== 'string' || c.editorialTitle.trim().length === 0) err('chapter-editorialTitle', `${c.id}: editorialTitle must be a non-empty verbatim Bouchier chapter title, got ${JSON.stringify(c.editorialTitle)}`);
      if (!Array.isArray(c.children) || c.children.length !== 0) err('chapter-children', `${c.id}: children must be [], got ${JSON.stringify(c.children)}`);
      if (c.passages.length !== 1) err('chapter-passage-count', `${c.id}: expected exactly 1 passage, got ${c.passages.length}`);
      for (const p of c.passages) {
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${c.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${c.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      }
    });
  });

  // ---- leaked markup ----
  const leaks: string[] = [];
  const walk = (divs: Division[]) => {
    for (const d of divs) {
      if (d.editorialTitle) {
        for (const marker of LEAK_MARKERS) if (d.editorialTitle.includes(marker)) leaks.push(`${d.id}/editorialTitle: contains ${JSON.stringify(marker)}`);
      }
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children);
    }
  };
  walk(books);
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- required anomaly documentation ----
  if (!anomalies.some((a) => /Appendix/i.test(a.note))) err('appendix-note', 'anomalies.json must document how the Book II Appendix chapters were handled');
  if (!anomalies.some((a) => /footnote/i.test(a.note))) err('footnote-note', 'anomalies.json must document the dropped Bouchier footnotes');
  if (!anomalies.some((a) => /Bekker/i.test(a.note))) err('ref-note', 'anomalies.json must document the null Bekker/reference scheme');

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  // incipit is preceded by the italicised argument paragraph, so check the SECOND paragraph.
  const bodyStart = p1.split('\n\n')[1] ?? '';
  const okStart = bodyStart.startsWith(INCIPIT);
  if (!okStart) err('spot-check-incipit', `book-1 ch-1's body (2nd paragraph) does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(bodyStart.slice(0, 90))})`);

  const lastBook = books[books.length - 1];
  const lastChapters = lastBook?.children ?? [];
  const lastCh = lastChapters[lastChapters.length - 1];
  const lastText = lastCh?.passages[0]?.text ?? '';
  const okEnd = lastText.endsWith(EXPLICIT);
  if (!okEnd) err('spot-check-explicit', `final chapter (${lastCh?.id}) does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-90))})`);

  const stats = { books: books.length, chapters: totalChapters, chars: 0 };
  const walkChars = (divs: Division[]): number => divs.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0) + walkChars(d.children), 0);
  stats.chars = walkChars(books);

  writeReport(findings, stats, chapterCounts, anomalies, { incipitOk: okStart, incipitGot: bodyStart.slice(0, 90), explicitOk: okEnd, explicitGot: lastText.slice(-90) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:aristotle-posterior-analytics-en ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${stats.books} books / ${stats.chapters} chapters / ${stats.chars} chars\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  stats: { books: number; chapters: number; chars: number },
  chapterCounts: string[],
  anomalies: Anomaly[] = [],
  spot?: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Posterior Analytics (English, Bouchier) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${stats.books}`);
  L.push(`- chapters: ${stats.chapters}`);
  L.push(`- total passage chars: ${stats.chars}`);
  for (const c of chapterCounts) L.push(`- ${c}`);
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — book-1 ch-1 body incipit\n  - got: \`${spot.incipitGot}\``);
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
