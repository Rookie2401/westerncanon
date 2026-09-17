/**
 * Validation for BOTH generated Confessions corpora (Latin + English).
 *
 *   npm run validate:augustine-confessions
 *
 * Writes data/augustine-confessions-la/VALIDATION_REPORT.md and
 * data/augustine-confessions-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails in either work. WARN-level
 * findings (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from './bookMeta.ts';
import type { Division, GenericWork } from '../../data/augustine-confessions-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const LA_DIR = join(REPO_ROOT, 'data', 'augustine-confessions-la');
const EN_DIR = join(REPO_ROOT, 'data', 'augustine-confessions-en');

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
  'xmlns', '</p>', '<div', '<note', '<lb ', '<pb ', '<br', '__NOTOC__', '{{finis', 'Textquality',
  '==Footnotes==', '<references',
];

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
    if (d.children.length > 0) walkTexts(d.children, visit);
  }
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  bookCount: number;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  perBook: { id: string; number: string | null; chapters: number; passages: number; chars: number }[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function validateWork(opts: {
  workId: string;
  dir: string;
  expectLang: 'la' | 'en';
  spotStart: string;
  /** verbatim tail of Book XIII's last passage - guards against truncation */
  spotEnd: string;
  /** expected chapter count per book, 1-indexed by position (Book I first) */
  expectChapterCounts: number[];
}): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(opts.dir, f))) err('presence', `missing ${f} - run the importer`);
  }

  const report: WorkReport = {
    workId: opts.workId,
    dir: opts.dir,
    findings,
    bookCount: 0,
    chapterCount: 0,
    passageCount: 0,
    totalChars: 0,
    perBook: [],
    anomalies: [],
    spotCheck: [],
  };
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(opts.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(opts.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(opts.dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['author'] !== 'Augustine of Hippo') err('author', `about.json author is ${JSON.stringify(about['author'])}, must be exactly "Augustine of Hippo"`);

  const divisions = work.divisions ?? [];
  report.bookCount = divisions.length;

  // ---- book count + id/number sequence ----
  if (divisions.length !== 13) err('book-count', `expected exactly 13 Book divisions, got ${divisions.length}`);
  divisions.forEach((d, i) => {
    const meta = BOOKS[i];
    if (!meta) return;
    if (d.id !== `book-${i + 1}`) err('book-id', `division ${i}: id ${JSON.stringify(d.id)} != expected "book-${i + 1}"`);
    if (d.number !== meta.roman) err('book-number', `${d.id}: number ${JSON.stringify(d.number)} != canonical roman ${JSON.stringify(meta.roman)}`);
    if (d.editorialTitle !== meta.en) err('book-editorialTitle', `${d.id}: editorialTitle does not match the shared bookMeta.ts gloss`);
    if (d.sourceHeading !== null) warn('book-sourceHeading', `${d.id}: expected sourceHeading null for a Book, got ${JSON.stringify(d.sourceHeading)}`);
    if (d.passages.length !== 0) err('book-passages', `${d.id}: a Book division must have no passages of its own, got ${d.passages.length}`);
    if (d.children.length === 0) err('book-children', `${d.id}: a Book division must have at least one Chapter child`);
    const expected = opts.expectChapterCounts[i];
    if (expected !== undefined && d.children.length !== expected) {
      err('chapter-count', `${d.id}: expected ${expected} chapters, got ${d.children.length}`);
    }
  });

  // ---- chapters + passages ----
  let chapterCount = 0;
  let passageCount = 0;
  let totalChars = 0;
  for (const b of divisions) {
    let bookChars = 0;
    b.children.forEach((c, ci) => {
      chapterCount += 1;
      if (c.id !== `${b.id}-ch-${ci + 1}`) err('chapter-id', `${c.id}: expected id "${b.id}-ch-${ci + 1}"`);
      if (c.number !== String(ci + 1)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)} != expected "${ci + 1}"`);
      if (c.children.length !== 0) err('chapter-children', `${c.id}: a Chapter division must have no children, got ${c.children.length}`);
      if (c.editorialTitle !== null) warn('chapter-editorialTitle', `${c.id}: expected editorialTitle null for a Chapter`);
      if (c.ref !== null) err('chapter-ref', `${c.id}: ref should be null`);
      if (c.passages.length === 0) err('chapter-empty', `${c.id}: a Chapter division must have at least one passage`);
      for (const p of c.passages) {
        passageCount += 1;
        bookChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}: a passage has empty text`);
        if (typeof p.n !== 'string') err('passage-n', `${c.id}: passage n is not a string`);
        if (p.ref !== null) err('passage-ref', `${c.id}: passage ref should be null, got ${JSON.stringify(p.ref)}`);
      }
    });
    totalChars += bookChars;
    report.perBook.push({
      id: b.id,
      number: b.number,
      chapters: b.children.length,
      passages: b.children.reduce((n, c) => n + c.passages.length, 0),
      chars: bookChars,
    });
  }
  report.chapterCount = chapterCount;
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 15).join('\n    ')}`);

  // ---- leaked MediaWiki italic markup (should have been fully stripped) ----
  const italicLeaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    if (/''/.test(s)) italicLeaks.push(where);
  });
  if (italicLeaks.length) err('no-leaked-italics', `${italicLeaks.length} string(s) still contain a "''" pair: ${italicLeaks.slice(0, 10).join(', ')}`);

  // ---- spot check: first passage of Book I, last passage of Book XIII ----
  const firstBook = divisions[0];
  const firstPassage = firstBook?.children[0]?.passages[0]?.text ?? '';
  const startOk = firstPassage.normalize('NFC').startsWith(opts.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `Book I, chapter 1, passage 1 starts "${opts.spotStart}"`, ok: startOk, got: firstPassage.slice(0, 80) });
  if (!startOk) err('spot-check', `Book I chapter 1 passage 1 does not start with ${JSON.stringify(opts.spotStart)} (got: ${JSON.stringify(firstPassage.slice(0, 80))})`);

  const lastBook = divisions[divisions.length - 1];
  const lastChapter = lastBook?.children[lastBook.children.length - 1];
  const lastPassage = lastChapter?.passages[lastChapter.passages.length - 1]?.text ?? '';
  const endOk = lastPassage.normalize('NFC').endsWith(opts.spotEnd.normalize('NFC'));
  report.spotCheck.push({ label: `Book XIII, final chapter ends "${opts.spotEnd}"`, ok: endOk, got: lastPassage.slice(-80) });
  if (!endOk) err('spot-end', `Book XIII final passage does not end with ${JSON.stringify(opts.spotEnd)} - possible truncation (got tail: ${JSON.stringify(lastPassage.slice(-80))})`);

  return report;
}

function writeReport(r: WorkReport, sibling: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Confessions validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${r.bookCount}`);
  L.push(`- chapters: ${r.chapterCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Per-book counts');
  L.push('');
  L.push('| # | id | number | chapters | passages | chars |');
  L.push('|---|----|--------|----------|----------|-------|');
  r.perBook.forEach((b, i) => {
    L.push(`| ${i} | ${b.id} | ${b.number ?? '-'} | ${b.chapters} | ${b.passages} | ${b.chars} |`);
  });
  L.push('');
  L.push(
    `Sibling work \`${sibling.workId}\` has ${sibling.bookCount} books / ${sibling.chapterCount} chapters / ` +
      `${sibling.passageCount} passages (each edition follows its own chapter division - counts are expected to differ).`,
  );
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
  const la = validateWork({
    workId: 'augustine-confessions-la',
    dir: LA_DIR,
    expectLang: 'la',
    spotStart: 'magnus es, domine, et laudabilis valde.',
    // Confessiones, Book XIII's closing sentence (13.38.53).
    spotEnd: 'sic, sic accipietur, sic invenietur, sic aperietur.',
    expectChapterCounts: [20, 10, 12, 16, 14, 16, 21, 12, 13, 43, 31, 32, 38],
  });
  const en = validateWork({
    workId: 'augustine-confessions-en',
    dir: EN_DIR,
    expectLang: 'en',
    spotStart: '1. Great art Thou, O Lord, and greatly to be praised;',
    // Pilkington's translation, closing sentence of Book XIII (this edition's
    // inline section numerals are kept verbatim, so passage 1 begins "1. ").
    spotEnd: 'so, even so shall it be received, so shall it be found, so shall it be opened. Amen.',
    expectChapterCounts: [18, 10, 12, 16, 14, 16, 21, 12, 13, 43, 31, 32, 38],
  });

  writeReport(la, en);
  writeReport(en, la);

  const all = [...la.findings.map((f) => ({ w: 'la', ...f })), ...en.findings.map((f) => ({ w: 'en', ...f }))];
  process.stdout.write('\n=== validate:augustine-confessions ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Reports: ${join(LA_DIR, 'VALIDATION_REPORT.md')}\n` +
      `         ${join(EN_DIR, 'VALIDATION_REPORT.md')}\n`,
  );
  process.stdout.write(
    `\nla: ${la.bookCount} books / ${la.chapterCount} chapters / ${la.passageCount} passages / ${la.totalChars} chars\n` +
      `en: ${en.bookCount} books / ${en.chapterCount} chapters / ${en.passageCount} passages / ${en.totalChars} chars\n`,
  );
  if (errors.length > 0) process.exit(1);
}

main();
