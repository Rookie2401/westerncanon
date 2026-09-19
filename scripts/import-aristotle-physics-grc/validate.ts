/**
 * Validation for data/physics-grc/.
 *
 *   npx tsx scripts/import-aristotle-physics-grc/validate.ts
 *
 * Writes data/physics-grc/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. WARN-level findings (preserved
 * source irregularities) do not fail the run.
 *
 * Standalone (not reusing scripts/import-aristotle-shared/validate.ts): that
 * file is hard-wired to the flat, chapters-only Categories/De Interpretatione
 * shape (single WorkSpec.chapters table, no Book level, ref always null).
 * Physics has a real Book -> Chapter tree with non-null chapter refs, so its
 * checks differ enough that a small standalone validator is clearer than
 * bending the shared one to fit a second shape.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/physics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'physics-grc');
const WORK_ID = 'physics-grc';
const CANONICAL_CHAPTER_COUNTS = [9, 9, 8, 14, 6, 10, 5, 10];
const SPOT_START = 'Ἐπειθὴ τὸ εἰδέναι καὶ τὸ ἐπίστασθαι συμβαίνει';
const SPOT_END = 'ἀδιαίρετόν ἐστι καὶ ἀμερὲς καὶ οὐδὲν ἔχον μέγεθος.';

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
  '&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&nbsp;',
  '<p>', '</p>', '<div', '</div>', '<note', '<lb ', '<lb/', '<pb ', '<pb/',
  '<head>', '</head>', '<lg', '</lg>', '<l>', '</l>', '<add', '</add>', '<del', '</del>', '<sic', '</sic>', '<gap',
  'xmlns',
];

function fresh(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags);
}
const ENTITY_RE = /&[a-zA-Z]+;|&#x?[0-9a-fA-F]+;/;

function findings(): { findings: Finding[]; report: string[] } {
  const F: Finding[] = [];
  const err = (check: string, m: string) => F.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => F.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (F.some((f) => f.level === 'ERROR')) return { findings: F, report: [] };

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${WORK_ID}`);
  if (work.language !== 'grc') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "grc"`);
  if (about['translator'] !== undefined) err('translator', `about.json must not carry a translator for this Greek-only work, got ${JSON.stringify(about['translator'])}`);

  const books = work.divisions ?? [];
  const bookReportRows: string[] = [];
  const perDivision: { id: string; number: string | null; passages: number; chars: number }[] = [];

  if (books.length !== 8) err('book-count', `expected 8 books, got ${books.length}`);

  let totalChapters = 0;
  let totalPassages = 0;
  let totalChars = 0;
  const leaks: string[] = [];
  const bekkerRefsSeen: string[] = [];

  const visit = (s: string, where: string) => {
    for (const marker of LEAK_MARKERS) if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    if (fresh(ENTITY_RE).test(s)) leaks.push(`${where}: contains an HTML/XML entity`);
    if (s.includes('�')) leaks.push(`${where}: contains U+FFFD replacement character`);
  };

  books.forEach((b, i) => {
    const expectedId = `book-${i + 1}`;
    if (b.id !== expectedId) err('book-id', `book[${i}].id is ${JSON.stringify(b.id)}, expected ${JSON.stringify(expectedId)}`);
    if (b.number !== String(i + 1)) err('book-number', `${b.id}: number ${JSON.stringify(b.number)} != ${JSON.stringify(String(i + 1))}`);
    if (b.ref !== null) err('book-ref', `${b.id}: ref must be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== null) err('book-sourceHeading', `${b.id}: sourceHeading must be null, got ${JSON.stringify(b.sourceHeading)}`);
    if (b.editorialTitle !== null) err('book-editorialTitle', `${b.id}: editorialTitle must be null, got ${JSON.stringify(b.editorialTitle)}`);
    if (!Array.isArray(b.passages) || b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [], got ${JSON.stringify(b.passages)}`);
    if (!Array.isArray(b.children)) err('book-children-type', `${b.id}: children must be an array`);

    const chapters = b.children ?? [];
    if (CANONICAL_CHAPTER_COUNTS[i] !== undefined && chapters.length !== CANONICAL_CHAPTER_COUNTS[i]) {
      const msg = `${b.id}: canonical chapter count is ${CANONICAL_CHAPTER_COUNTS[i]}, found ${chapters.length}`;
      if (anomalies.some((a) => a.where === `${WORK_ID} / ${b.id}` && /chapter count mismatch/.test(a.note))) {
        warn('chapter-count', msg + ' (documented in anomalies.json)');
      } else {
        err('chapter-count', msg + ' (undocumented — must be recorded in anomalies.json if genuine)');
      }
    }
    totalChapters += chapters.length;

    let bookChars = 0;
    let bookPassages = 0;
    chapters.forEach((c: Division, j: number) => {
      const expectedChId = `${b.id}-ch-${j + 1}`;
      if (c.id !== expectedChId) err('chapter-id', `book-${i + 1} chapter[${j}].id is ${JSON.stringify(c.id)}, expected ${JSON.stringify(expectedChId)}`);
      if (c.number !== String(j + 1)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)} != ${JSON.stringify(String(j + 1))}`);
      if (c.sourceHeading !== null) err('chapter-sourceHeading', `${c.id}: sourceHeading must be null, got ${JSON.stringify(c.sourceHeading)}`);
      if (c.editorialTitle !== null) err('chapter-editorialTitle', `${c.id}: editorialTitle must be null, got ${JSON.stringify(c.editorialTitle)}`);
      if (!Array.isArray(c.children) || c.children.length !== 0) err('chapter-children', `${c.id}: children must be [], got ${JSON.stringify(c.children)}`);
      if (!Array.isArray(c.passages) || c.passages.length !== 1) {
        err('chapter-passages', `${c.id}: expected exactly 1 passage, got ${Array.isArray(c.passages) ? c.passages.length : typeof c.passages}`);
      }
      const documentedForThisChapter = anomalies.some((a) => a.where === `${WORK_ID} / ${c.id}`);
      if (c.ref === null) {
        if (documentedForThisChapter) {
          warn('chapter-ref', `${c.id}: ref is null (documented in anomalies.json - source has no marginal marker in this chapter)`);
        } else {
          err('chapter-ref', `${c.id}: ref is null and undocumented (every chapter should carry a Bekker range unless flagged in anomalies.json)`);
        }
      } else {
        if (typeof c.ref !== 'string' || c.ref.length === 0) err('chapter-ref-type', `${c.id}: ref must be a non-empty string, got ${JSON.stringify(c.ref)}`);
        else if (!/^\d{3}[ab](–\d{3}[ab])?$/.test(c.ref)) {
          if (documentedForThisChapter) {
            warn('chapter-ref-format', `${c.id}: ref ${JSON.stringify(c.ref)} looks malformed but is documented in anomalies.json as a verbatim-preserved source transcription error`);
          } else {
            err('chapter-ref-format', `${c.id}: ref ${JSON.stringify(c.ref)} does not look like a Bekker page/column (range) and is undocumented`);
          }
        } else {
          bekkerRefsSeen.push(c.ref);
        }
      }

      (c.passages ?? []).forEach((p, k) => {
        totalPassages += 1;
        bookPassages += 1;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${c.id}[${k}]: passage has empty text`);
        if (typeof p.n !== 'string' || p.n !== '') err('passage-n', `${c.id}[${k}]: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${c.id}[${k}]: passage ref must be null, got ${JSON.stringify(p.ref)}`);
        bookChars += p.text.length;
        totalChars += p.text.length;
        visit(p.text, `${c.id}/passage[${k}]`);
      });
      if (c.sourceHeading != null) visit(c.sourceHeading, `${c.id}/sourceHeading`);
      perDivision.push({ id: c.id, number: c.number, passages: c.passages?.length ?? 0, chars: (c.passages ?? []).reduce((n, p) => n + p.text.length, 0) });
    });
    bookReportRows.push(`| ${b.id} | ${chapters.length} | ${bookPassages} | ${bookChars} |`);
  });

  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup / entities:\n    ${leaks.slice(0, 20).join('\n    ')}`);

  // ---- spot checks (NFC-insensitive) ----
  const spotChecks: { label: string; ok: boolean; got: string }[] = [];
  const p1 = books[0]?.children?.[0]?.passages?.[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(SPOT_START.normalize('NFC'));
  spotChecks.push({ label: `book-1-ch-1 passage[0] starts "${SPOT_START}"`, ok: okStart, got: p1.slice(0, 60) });
  if (!okStart) err('spot-check-start', `book-1-ch-1 passage[0] does not start with expected incipit (got: ${JSON.stringify(p1.slice(0, 60))})`);

  const lastBook = books[books.length - 1];
  const lastChapter = lastBook?.children?.[lastBook.children.length - 1];
  const lastText = lastChapter?.passages?.[lastChapter.passages.length - 1]?.text ?? '';
  const okEnd = lastText.normalize('NFC').endsWith(SPOT_END.normalize('NFC'));
  spotChecks.push({ label: `final chapter (${lastChapter?.id}) ends "${SPOT_END}"`, ok: okEnd, got: lastText.slice(-80) });
  if (!okEnd) err('spot-check-end', `final chapter does not end with the expected explicit (got tail: ${JSON.stringify(lastText.slice(-80))})`);

  // ---- Bekker ref span spot-check (first chapter starts 184a, last ends 267b) ----
  const firstRef = books[0]?.children?.[0]?.ref ?? null;
  const lastRef = lastChapter?.ref ?? null;
  if (!firstRef || !firstRef.startsWith('184a')) err('bekker-start', `book-1-ch-1 ref should start "184a...", got ${JSON.stringify(firstRef)}`);
  if (!lastRef || !lastRef.includes('267b')) err('bekker-end', `final chapter ref should include "267b", got ${JSON.stringify(lastRef)}`);

  // ---- anomalies must document the edition correction + del/lg apparatus ----
  if (!anomalies.some((a) => /Ross/.test(a.note) && /Bekker/.test(a.note))) {
    err('anomaly-edition', 'anomalies.json must document the Ross-vs-Bekker edition correction');
  }
  if (!anomalies.some((a) => /<del>/.test(a.note) || /del>/.test(a.note))) {
    err('anomaly-del', 'anomalies.json must document how <del> (editorial deletions) were handled');
  }
  if (!anomalies.some((a) => /<lg>/.test(a.note) || /lg>/.test(a.note))) {
    err('anomaly-lg', 'anomalies.json must document how <lg>/<l> were handled');
  }

  // ---- Unicode form: no decomposed combining marks ----
  const isCombiningCp = (cp: number): boolean =>
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f);
  let combiningHits = 0;
  for (const d of perDivision) {
    // re-walk text via books structure below instead (perDivision doesn't carry text) -- handled in loop above via visit;
    void d;
  }
  // (combining check folded into the visit() pass below for simplicity)
  books.forEach((b) =>
    (b.children ?? []).forEach((c) =>
      (c.passages ?? []).forEach((p) => {
        for (const ch of p.text) {
          if (isCombiningCp(ch.codePointAt(0) ?? 0)) {
            combiningHits += 1;
            break;
          }
        }
      }),
    ),
  );
  if (combiningHits > 0) err('no-combining-marks', `${combiningHits} passage(s) contain standalone combining diacritics — text must stay precomposed (no NFD)`);

  // ---- report ----
  const report: string[] = [];
  report.push(`# Aristotle validation report - ${WORK_ID}`);
  report.push('');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  const errCount = F.filter((f) => f.level === 'ERROR').length;
  const warnCount = F.filter((f) => f.level === 'WARN').length;
  report.push(`**Result: ${errCount === 0 ? 'PASS' : 'FAIL'}** - ${errCount} error(s), ${warnCount} warning(s).`);
  report.push('');
  report.push('## Counts');
  report.push('');
  report.push(`- books: ${books.length}`);
  report.push(`- chapters: ${totalChapters}`);
  report.push(`- passages: ${totalPassages}`);
  report.push(`- total passage chars: ${totalChars}`);
  report.push(`- canonical chapter counts (I-VIII): ${CANONICAL_CHAPTER_COUNTS.join(', ')}`);
  report.push(`- actual chapter counts (I-VIII): ${books.map((b) => b.children?.length ?? 0).join(', ')}`);
  report.push('');
  report.push('## Per-book counts');
  report.push('');
  report.push('| book | chapters | passages | chars |');
  report.push('|------|----------|----------|-------|');
  report.push(...bookReportRows);
  report.push('');
  report.push('## Verbatim spot-check');
  report.push('');
  for (const s of spotChecks) report.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got}\``);
  report.push('');
  report.push('## Bekker ref spot-check');
  report.push('');
  report.push(`- first chapter ref: ${JSON.stringify(firstRef)}`);
  report.push(`- final chapter ref: ${JSON.stringify(lastRef)}`);
  report.push(`- total refs captured: ${bekkerRefsSeen.length} / ${totalChapters} chapters`);
  report.push('');
  report.push('## Anomalies (preserved, not corrected)');
  report.push('');
  if (anomalies.length === 0) report.push('_none_');
  for (const a of anomalies) report.push(`- **${a.where}** - ${a.note}`);
  report.push('');
  report.push('## Errors');
  report.push('');
  const errs = F.filter((f) => f.level === 'ERROR');
  if (errs.length === 0) report.push('_none_');
  for (const f of errs) report.push(`- **[${f.check}]** ${f.message}`);
  report.push('');
  report.push('## Warnings');
  report.push('');
  const warns = F.filter((f) => f.level === 'WARN');
  if (warns.length === 0) report.push('_none_');
  for (const f of warns) report.push(`- **[${f.check}]** ${f.message}`);
  report.push('');

  return { findings: F, report };
}

function main(): void {
  const { findings: F, report } = findings();
  if (report.length > 0) writeFileSync(join(DIR, 'VALIDATION_REPORT.md'), report.join('\n'), 'utf8');

  process.stdout.write('\n=== validate:aristotle-physics-grc ===\n');
  for (const f of F) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = F.filter((f) => f.level === 'ERROR');
  const warns = F.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

main();
