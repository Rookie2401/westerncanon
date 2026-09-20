/**
 * Validation for data/de-officiis-en/.
 *
 *   npx tsx scripts/import-de-officiis-en/validate.ts
 *
 * Writes data/de-officiis-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/de-officiis-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'de-officiis-en');

const WORK_ID = 'de-officiis-en';
const EXPECTED_BOOKS = [
  { number: '1', sectionCount: 161, heading: 'Book I: Moral Goodness' },
  { number: '2', sectionCount: 89, heading: 'Book II: Expediency' },
  { number: '3', sectionCount: 121, heading: 'Book III: the conflict between the right and the expedient' },
];
const INCIPIT = 'My dear son Marcus, you have now been studying a full year under Cratippus';
const EXPLICIT = 'you will be dearer to me still, if you find pleasure in such counsel and instruction.';

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '<p>', '</p>', '<div', '<note', '<milestone', '<hi', '<foreign', '<pb', '<sp>', '<speaker'];

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
    writeReport(findings, { books: 0, sections: 0, passages: 0, chars: 0 }, []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];
  const laWork = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'de-officiis-la', 'work.json'), 'utf8')) as GenericWork;

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'en') err('language', `expected 'en', got ${JSON.stringify(work.language)}`);
  if (about['editor'] !== undefined) err('editor', `about.json must not carry an editor on the English side, got ${JSON.stringify(about['editor'])}`);
  if (about['translator'] !== 'Walter Miller') err('translator', `expected translator "Walter Miller", got ${JSON.stringify(about['translator'])}`);

  const books = work.divisions ?? [];
  if (books.length !== EXPECTED_BOOKS.length) err('book-count', `expected ${EXPECTED_BOOKS.length} books, got ${books.length}`);
  if (laWork.divisions?.length !== books.length) warn('sibling-book-count', `Latin sibling has ${laWork.divisions?.length} books vs ${books.length} here`);

  let totalSections = 0;
  let totalPassages = 0;
  let totalChars = 0;
  const sectionCounts: string[] = [];

  books.forEach((b, i) => {
    const spec = EXPECTED_BOOKS[i];
    if (!spec) return;
    if (b.id !== `book-${spec.number}`) err('book-id', `book[${i}] id ${JSON.stringify(b.id)}, expected "book-${spec.number}"`);
    if (b.number !== spec.number) err('book-number', `${b.id}: number ${JSON.stringify(b.number)}, expected ${JSON.stringify(spec.number)}`);
    if (b.ref !== null) err('book-ref', `${b.id}: ref must be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== spec.heading) err('book-sourceHeading', `${b.id}: sourceHeading ${JSON.stringify(b.sourceHeading)}, expected ${JSON.stringify(spec.heading)}`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [] (container only), got ${b.passages.length}`);

    const sections = b.children ?? [];
    const laSections = laWork.divisions?.[i]?.children ?? [];
    sectionCounts.push(`Book ${spec.number}: ${sections.length} sections (expected ${spec.sectionCount}; Latin sibling has ${laSections.length})`);
    if (sections.length !== spec.sectionCount) err('section-count', `${b.id}: expected ${spec.sectionCount}, got ${sections.length}`);
    if (sections.length !== laSections.length) err('sibling-section-count', `${b.id}: ${sections.length} sections vs Latin sibling's ${laSections.length}`);
    totalSections += sections.length;

    sections.forEach((s, j) => {
      const wantId = `book-${spec.number}-sec-${j + 1}`;
      if (s.id !== wantId) err('section-id', `section[${j}] id ${JSON.stringify(s.id)}, expected ${JSON.stringify(wantId)}`);
      if (s.number !== String(j + 1)) err('section-number', `${s.id}: number ${JSON.stringify(s.number)}, expected "${j + 1}"`);
      if (s.sourceHeading !== null) err('section-sourceHeading', `${s.id}: sourceHeading must be null, got ${JSON.stringify(s.sourceHeading)}`);
      if (!Array.isArray(s.children) || s.children.length !== 0) err('section-children', `${s.id}: children must be [], got ${JSON.stringify(s.children)}`);
      if (s.passages.length !== 1) err('section-passage-count', `${s.id}: expected exactly 1 passage, got ${s.passages.length}`);
      if (s.ref === null) warn('section-ref-null', `${s.id}: ref is null`);
      for (const p of s.passages) {
        totalPassages += 1;
        totalChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${s.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${s.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${s.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      }
    });
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

  // ---- required anomaly disclosures ----
  if (!anomalies.some((a) => /mislabeled|n="1"/i.test(a.note))) err('book3-bug-note', 'anomalies.json must document the Book III n="1" source bug');
  if (!anomalies.some((a) => /milestone unit="section"/i.test(a.note))) err('structure-note', 'anomalies.json must document the milestone-driven section reconstruction');

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(INCIPIT.normalize('NFC'));
  if (!okStart) err('spot-check-incipit', `book-1 sec-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 100))})`);

  const lastBook = books[books.length - 1];
  const lastSections = lastBook?.children ?? [];
  const lastSec = lastSections[lastSections.length - 1];
  const lastText = lastSec?.passages[0]?.text ?? '';
  const okEnd = lastText.normalize('NFC').endsWith(EXPLICIT.normalize('NFC'));
  if (!okEnd) err('spot-check-explicit', `final section does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-100))})`);

  // ---- verse-quotation split spot check (section 102/103 of book 3) ----
  const b3 = books[2];
  const sec102 = b3?.children.find((s) => s.number === '102');
  const sec103 = b3?.children.find((s) => s.number === '103');
  if (!sec102?.passages[0]?.text.includes('None have I giv') || !sec103?.passages[0]?.text.startsWith('Their third argument')) {
    err('spot-check-mid-p-split', 'book-3 sec-102/sec-103 mid-<p> section-milestone split did not land where expected');
  }

  const stats = { books: books.length, sections: totalSections, passages: totalPassages, chars: totalChars };
  writeReport(findings, stats, sectionCounts, anomalies, { incipitOk: okStart, incipitGot: p1.slice(0, 100), explicitOk: okEnd, explicitGot: lastText.slice(-100) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:de-officiis-en ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${stats.books} books / ${stats.sections} sections / ${stats.passages} passages / ${stats.chars} chars\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  stats: { books: number; sections: number; passages: number; chars: number },
  sectionCounts: string[],
  anomalies: Anomaly[] = [],
  spot?: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# De Officiis (English) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${stats.books}`);
  L.push(`- sections: ${stats.sections}`);
  L.push(`- passages: ${stats.passages}`);
  L.push(`- total passage chars: ${stats.chars}`);
  for (const c of sectionCounts) L.push(`- ${c}`);
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — book-1 sec-1 incipit\n  - got: \`${spot.incipitGot}\``);
    L.push(`- ${spot.explicitOk ? 'OK' : 'FAIL'} — final section explicit\n  - got: \`${spot.explicitGot}\``);
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
