/**
 * Validation for data/topics-en/.
 *
 *   npx tsx scripts/import-topics-en/validate.ts
 *   npm run validate:topics-en
 *
 * Writes data/topics-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. WARN-level findings (preserved
 * source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/topics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'topics-en');

const WORK_ID = 'topics-en';
const EXPECTED_CHAPTER_COUNTS = [18, 11, 6, 6, 8, 14, 5, 14];
const INCIPIT = 'Our treatise proposes to find a line of inquiry whereby we shall be able';
const EXPLICIT = 'those in regard to which it is rather difficult to produce points for ourselves from matters of everyday experience.';

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
    writeReport(findings, { books: 0, chapters: 0, chars: 0 }, []);
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

  const books = work.divisions ?? [];
  if (books.length !== EXPECTED_CHAPTER_COUNTS.length) {
    err('book-count', `expected ${EXPECTED_CHAPTER_COUNTS.length} books, got ${books.length}`);
  }

  let totalChapters = 0;
  const chapterCounts: string[] = [];

  books.forEach((b, i) => {
    const bookNum = i + 1;
    const expectedChapters = EXPECTED_CHAPTER_COUNTS[i];
    if (expectedChapters === undefined) return;
    if (b.id !== `book-${bookNum}`) err('book-id', `book[${i}] id ${JSON.stringify(b.id)}, expected "book-${bookNum}"`);
    if (b.number !== String(bookNum)) err('book-number', `${b.id}: number ${JSON.stringify(b.number)}, expected "${bookNum}"`);
    if (b.ref !== null) err('book-ref', `${b.id}: ref must be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== null) err('book-sourceHeading', `${b.id}: sourceHeading must be null, got ${JSON.stringify(b.sourceHeading)}`);
    if (b.editorialTitle !== null) err('book-editorialTitle', `${b.id}: editorialTitle must be null, got ${JSON.stringify(b.editorialTitle)}`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [] (container only), got ${b.passages.length}`);

    const chapters = b.children ?? [];
    chapterCounts.push(`Book ${bookNum}: ${chapters.length} chapters`);
    if (chapters.length !== expectedChapters) err('chapter-count', `${b.id}: expected ${expectedChapters} chapters, got ${chapters.length}`);
    totalChapters += chapters.length;

    chapters.forEach((c, j) => {
      const wantNumber = j + 1;
      const wantId = `book-${bookNum}-ch-${wantNumber}`;
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
  walk(books);
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- required anomaly documentation ----
  if (!anomalies.some((a) => /Bekker/i.test(a.note))) err('ref-note', 'anomalies.json must document the absence of Bekker markers in this source');
  if (!anomalies.some((a) => /footnote/i.test(a.note))) err('footnote-note', 'anomalies.json must document the footnote check');

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.startsWith(INCIPIT);
  if (!okStart) err('spot-check-incipit', `book-1 ch-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const lastBook = books[books.length - 1];
  const lastChapters = lastBook?.children ?? [];
  const lastCh = lastChapters[lastChapters.length - 1];
  const lastText = lastCh?.passages[0]?.text ?? '';
  const okEnd = lastText.endsWith(EXPLICIT);
  if (!okEnd) err('spot-check-explicit', `final chapter (${lastCh?.id}) does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-90))})`);

  const stats = { books: books.length, chapters: totalChapters, chars: 0 };
  const walkChars = (divs: Division[]): number => divs.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0) + walkChars(d.children), 0);
  stats.chars = walkChars(books);

  writeReport(findings, stats, chapterCounts, anomalies, { incipitOk: okStart, incipitGot: p1.slice(0, 90), explicitOk: okEnd, explicitGot: lastText.slice(-90) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:topics-en ===\n');
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
  L.push(`# Topics (English, Pickard-Cambridge) validation report`);
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
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — book-1 ch-1 incipit\n  - got: \`${spot.incipitGot}\``);
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
