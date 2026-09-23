/**
 * Validation for data/meteorologica-en/.
 *
 *   npx tsx scripts/import-meteorologica-en/validate.ts
 *   npm run validate:meteorologica-en
 *
 * Writes data/meteorologica-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/meteorologica-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'meteorologica-en');

const WORK_ID = 'meteorologica-en';
const EXPECTED_BOOKS = [
  { number: '1', chapters: 14, supplemented: false },
  { number: '2', chapters: 9, supplemented: true },
  { number: '3', chapters: 6, supplemented: false },
  { number: '4', chapters: 12, supplemented: false },
];
const INCIPIT = 'We have already discussed the first causes of nature, and all natural motion';
// Book II Chapter 9 must contain the join point verbatim (MIT's cutoff
// completed by the archive.org supplement with a single space, no invented
// punctuation).
const CH9_JOIN = 'it is ejected and causes thunder and lightning';
const BOOK2_EXPLICIT = 'So much for thunder and lightning.';
const BOOK4_EXPLICIT = 'such as man, plants, and the rest.';

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
  if (about['translator'] !== 'E. W. Webster') err('translator', `about.json translator must be "E. W. Webster", got ${JSON.stringify(about['translator'])}`);

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
    chapterCounts.push(`Book ${spec.number}: ${chapters.length} chapters${spec.supplemented ? ' (last chapter supplemented from archive.org — see anomalies)' : ''}`);
    if (chapters.length !== spec.chapters) err('chapter-count', `${b.id}: expected ${spec.chapters} chapters, got ${chapters.length}`);
    totalChapters += chapters.length;

    chapters.forEach((c, j) => {
      const wantNumber = j + 1;
      const wantId = `book-${spec.number}-ch-${wantNumber}`;
      if (c.id !== wantId) err('chapter-id', `chapter[${j}] id ${JSON.stringify(c.id)}, expected ${JSON.stringify(wantId)}`);
      if (c.number !== String(wantNumber)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)}, expected "${wantNumber}"`);
      if (c.ref !== null) err('chapter-ref', `${c.id}: ref must be null, got ${JSON.stringify(c.ref)}`);
      if (c.sourceHeading !== null) err('chapter-sourceHeading', `${c.id}: sourceHeading must be null, got ${JSON.stringify(c.sourceHeading)}`);
      if (c.editorialTitle !== null) err('chapter-editorialTitle', `${c.id}: editorialTitle must be null, got ${JSON.stringify(c.editorialTitle)}`);
      if (!Array.isArray(c.children) || c.children.length !== 0) err('chapter-children', `${c.id}: children must be [], got ${JSON.stringify(c.children)}`);
      if (c.passages.length !== 1) err('chapter-passage-count', `${c.id}: expected exactly 1 passage, got ${c.passages.length}`);
      const isLastChapter = j === chapters.length - 1;
      for (const p of c.passages) {
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${c.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${c.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
        if (spec.supplemented && isLastChapter) {
          if (!p.anomaly || !/SUPPLEMENTED/.test(p.anomaly)) err('missing-supplement-flag', `${c.id}: expected a SUPPLEMENTED Passage.anomaly, got ${JSON.stringify(p.anomaly)}`);
        } else if (p.anomaly !== undefined) {
          warn('unexpected-anomaly-field', `${c.id}: passage has an unexpected anomaly field: ${JSON.stringify(p.anomaly)}`);
        }
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
  if (!anomalies.some((a) => /SUPPLEMENTED|supplement/i.test(a.note))) err('supplement-note', 'anomalies.json must document the Book II / Part 9 archive.org supplement');

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.startsWith(INCIPIT);
  if (!okStart) err('spot-check-incipit', `book-1 ch-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const book2Chapters = books[1]?.children ?? [];
  const book2Last = book2Chapters[book2Chapters.length - 1];
  const book2LastText = book2Last?.passages[0]?.text ?? '';
  const okJoin = book2LastText.includes(CH9_JOIN);
  if (!okJoin) {
    err('spot-check-join', `book-2's final chapter (${book2Last?.id}) does not contain the expected MIT/archive.org join text ${JSON.stringify(CH9_JOIN)} (chapter text: ${JSON.stringify(book2LastText.slice(-300))})`);
  }
  const okBook2End = book2LastText.endsWith(BOOK2_EXPLICIT);
  if (!okBook2End) {
    err('spot-check-book2-end', `book-2's final chapter (${book2Last?.id}) does not end with ${JSON.stringify(BOOK2_EXPLICIT)} (got: ${JSON.stringify(book2LastText.slice(-90))})`);
  }

  const book4Chapters = books[3]?.children ?? [];
  const book4Last = book4Chapters[book4Chapters.length - 1];
  const book4LastText = book4Last?.passages[0]?.text ?? '';
  const okBook4End = book4LastText.endsWith(BOOK4_EXPLICIT);
  if (!okBook4End) {
    err('spot-check-explicit', `book-4's final chapter (${book4Last?.id}) does not end with ${JSON.stringify(BOOK4_EXPLICIT)} (got: ${JSON.stringify(book4LastText.slice(-90))})`);
  }

  const stats = { books: books.length, chapters: totalChapters, chars: 0 };
  const walkChars = (divs: Division[]): number => divs.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0) + walkChars(d.children), 0);
  stats.chars = walkChars(books);

  writeReport(findings, stats, chapterCounts, anomalies, {
    incipitOk: okStart,
    incipitGot: p1.slice(0, 90),
    explicitOk: okJoin && okBook2End && okBook4End,
    explicitGot: `book2-tail: ${book2LastText.slice(-90)} | book4-tail: ${book4LastText.slice(-90)}`,
  });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:meteorologica-en ===\n');
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
  L.push(`# Meteorology (English, Webster) validation report`);
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
    L.push(`- ${spot.explicitOk ? 'OK' : 'FAIL'} — book endings\n  - got: \`${spot.explicitGot}\``);
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
