/**
 * Validation for data/posterior-analytics-grc/.
 *
 *   npx tsx scripts/import-aristotle-posterior-analytics-grc/validate.ts
 *
 * Writes data/posterior-analytics-grc/VALIDATION_REPORT.md, prints a summary,
 * and exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SQUARE_BRACKET_RE } from './index.ts';
import type { Division, GenericWork } from '../../data/posterior-analytics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'posterior-analytics-grc');

const WORK_ID = 'posterior-analytics-grc';
const EXPECTED_BOOKS = [
  { number: '1', chapterCount: 34 },
  { number: '2', chapterCount: 19 },
];
/** Verbatim incipit of book-1 ch-1's passage (prefix check). */
const INCIPIT = 'Πᾶσα διδασκαλία καὶ πᾶσα μάθησις διανοητικὴ ἐκ προϋπαρχούσης γίνεται γνώσεως.';
/** Verbatim explicit of book-2's final chapter's passage (suffix check) — truncation guard. */
const EXPLICIT = 'ἡ δὲ πᾶσα ὁμοίως ἔχει πρὸς τὸ πᾶν πρᾶγμα.';

const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<ref', '</ref', 'http://', 'https://',
  'Κεφαλίδα', 'χ|', '<p>', '</p>', '<div',
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

function fresh(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags);
}

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, { books: 0, chapters: 0, passages: 0, chars: 0 }, []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'grc') err('language', `expected 'grc', got ${JSON.stringify(work.language)}`);
  if (about['translator'] !== undefined) err('translator', `about.json must not carry a translator on the Greek side, got ${JSON.stringify(about['translator'])}`);

  const books = work.divisions ?? [];
  if (books.length !== EXPECTED_BOOKS.length) err('book-count', `expected ${EXPECTED_BOOKS.length} books, got ${books.length}`);

  let totalChapters = 0;
  let totalPassages = 0;
  let totalChars = 0;
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
    chapterCounts.push(`Book ${spec.number}: ${chapters.length} chapters (traditional ~${spec.chapterCount})`);
    if (chapters.length !== spec.chapterCount) {
      warn('chapter-count', `${b.id}: expected traditional count ${spec.chapterCount}, got ${chapters.length} (real count, not forced)`);
    }
    totalChapters += chapters.length;

    let prevRefEnd: string | null = null;
    chapters.forEach((c, j) => {
      const wantId = `book-${spec.number}-ch-${j + 1}`;
      if (c.id !== wantId) err('chapter-id', `chapter[${j}] id ${JSON.stringify(c.id)}, expected ${JSON.stringify(wantId)}`);
      if (c.number !== String(j + 1)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)}, expected "${j + 1}"`);
      if (c.sourceHeading !== null) err('chapter-sourceHeading', `${c.id}: sourceHeading must be null, got ${JSON.stringify(c.sourceHeading)}`);
      if (c.editorialTitle !== null) err('chapter-editorialTitle', `${c.id}: editorialTitle must be null on the Greek side, got ${JSON.stringify(c.editorialTitle)}`);
      if (!Array.isArray(c.children) || c.children.length !== 0) err('chapter-children', `${c.id}: children must be [], got ${JSON.stringify(c.children)}`);
      if (c.passages.length !== 1) err('chapter-passage-count', `${c.id}: expected exactly 1 passage, got ${c.passages.length}`);
      if (c.ref === null) warn('chapter-ref-null', `${c.id}: ref is null (no Bekker marker recoverable for this chapter)`);
      prevRefEnd = c.ref;
      for (const p of c.passages) {
        totalPassages += 1;
        totalChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${c.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${c.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      }
    });
    void prevRefEnd;
  });

  // ---- leaked markup ----
  const leaks: string[] = [];
  const walk = (divs: Division[], where: string) => {
    for (const d of divs) {
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${where}${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${where}${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children, where);
    }
  };
  walk(books, '');
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- square-bracket editorial marks must be flagged in anomalies.json ----
  const sqHits: string[] = [];
  const walkSq = (divs: Division[]) => {
    for (const d of divs) {
      d.passages.forEach((p, i) => {
        const m = p.text.match(fresh(SQUARE_BRACKET_RE));
        if (m) sqHits.push(`${d.id}/passage[${i}]: ${m.join(', ')}`);
      });
      if (d.children.length) walkSq(d.children);
    }
  };
  walkSq(books);
  if (sqHits.length && !anomalies.some((a) => /square-bracket/i.test(a.note))) {
    err('square-bracket-note', 'square-bracket marks present in text but not recorded in anomalies.json');
  }

  // ---- refs documented ----
  if (!anomalies.some((a) => /Bekker/i.test(a.note))) {
    err('ref-note', 'anomalies.json must document the Bekker ref reconstruction scheme');
  }
  if (!anomalies.some((a) => /edition/i.test(a.note))) {
    err('edition-note', 'anomalies.json must document the unlabeled-edition provenance gap');
  }

  // ---- spot checks (NFC-insensitive) ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(INCIPIT.normalize('NFC'));
  if (!okStart) err('spot-check-incipit', `book-1 ch-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const lastBook = books[books.length - 1];
  const lastChapters = lastBook?.children ?? [];
  const lastCh = lastChapters[lastChapters.length - 1];
  const lastText = lastCh?.passages[0]?.text ?? '';
  const okEnd = lastText.normalize('NFC').endsWith(EXPLICIT.normalize('NFC'));
  if (!okEnd) err('spot-check-explicit', `final chapter does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-90))})`);

  // ---- no decomposed combining marks ----
  let combiningHits = 0;
  const isCombiningCp = (cp: number): boolean =>
    (cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) || (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) || (cp >= 0xfe20 && cp <= 0xfe2f);
  const walkCombining = (divs: Division[]) => {
    for (const d of divs) {
      for (const p of d.passages) {
        for (const ch of p.text) if (isCombiningCp(ch.codePointAt(0) ?? 0)) { combiningHits += 1; break; }
      }
      if (d.children.length) walkCombining(d.children);
    }
  };
  walkCombining(books);
  if (combiningHits > 0) err('no-combining-marks', `${combiningHits} string(s) contain standalone combining diacritics — text must stay precomposed (no NFD)`);

  const stats = { books: books.length, chapters: totalChapters, passages: totalPassages, chars: totalChars };
  writeReport(findings, stats, chapterCounts, anomalies, { incipitOk: okStart, incipitGot: p1.slice(0, 90), explicitOk: okEnd, explicitGot: lastText.slice(-90) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:aristotle-posterior-analytics-grc ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${stats.books} books / ${stats.chapters} chapters / ${stats.passages} passages / ${stats.chars} chars\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  stats: { books: number; chapters: number; passages: number; chars: number },
  chapterCounts: string[],
  anomalies: Anomaly[] = [],
  spot?: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Posterior Analytics (Greek) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${stats.books}`);
  L.push(`- chapters: ${stats.chapters}`);
  L.push(`- passages: ${stats.passages}`);
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
