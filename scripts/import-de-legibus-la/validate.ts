/**
 * Validation for data/de-legibus-la/.
 *
 *   npx tsx scripts/import-de-legibus-la/validate.ts
 *
 * Writes data/de-legibus-la/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings do not
 * fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/de-legibus-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'de-legibus-la');

const WORK_ID = 'de-legibus-la';
const EXPECTED_BOOKS = [
  { number: '1', sectionCount: 63 },
  { number: '2', sectionCount: 69 },
  { number: '3', sectionCount: 109 },
];
const INCIPIT = 'Atticvs Lucus quidem ille et haec Arpinatium quercus agnoscitur';
/** Book 3 genuinely breaks off mid-dialogue, trailing "*" kept verbatim - see about.json. */
const EXPLICIT = 'Atticus Sic prorsum censeo, et id ipsum quod dicis exspecto.*';

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<center', '</center', 'titulus2', 'pn|'];

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

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'la') err('language', `expected 'la', got ${JSON.stringify(work.language)}`);
  if (about['translator'] !== undefined) err('translator', `about.json must not carry a translator (no English bundled), got ${JSON.stringify(about['translator'])}`);
  if (about['editor'] !== undefined) err('editor', `about.json must not name an editor (genuine provenance gap), got ${JSON.stringify(about['editor'])}`);

  const books = work.divisions ?? [];
  if (books.length !== EXPECTED_BOOKS.length) err('book-count', `expected ${EXPECTED_BOOKS.length} books, got ${books.length}`);

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
    if (b.sourceHeading !== null) err('book-sourceHeading', `${b.id}: sourceHeading must be null, got ${JSON.stringify(b.sourceHeading)}`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [] (container only), got ${b.passages.length}`);

    const sections = b.children ?? [];
    sectionCounts.push(`Book ${spec.number}: ${sections.length} sections (expected ${spec.sectionCount})`);
    if (sections.length !== spec.sectionCount) err('section-count', `${b.id}: expected ${spec.sectionCount}, got ${sections.length}`);
    totalSections += sections.length;

    sections.forEach((s, j) => {
      const wantId = `book-${spec.number}-sec-${j + 1}`;
      if (s.id !== wantId) err('section-id', `section[${j}] id ${JSON.stringify(s.id)}, expected ${JSON.stringify(wantId)}`);
      if (s.number !== String(j + 1)) err('section-number', `${s.id}: number ${JSON.stringify(s.number)}, expected "${j + 1}"`);
      if (s.ref !== null) err('section-ref', `${s.id}: ref must be null for this work, got ${JSON.stringify(s.ref)}`);
      if (s.sourceHeading !== null) err('section-sourceHeading', `${s.id}: sourceHeading must be null, got ${JSON.stringify(s.sourceHeading)}`);
      if (!Array.isArray(s.children) || s.children.length !== 0) err('section-children', `${s.id}: children must be [], got ${JSON.stringify(s.children)}`);
      if (s.passages.length !== 1) err('section-passage-count', `${s.id}: expected exactly 1 passage, got ${s.passages.length}`);
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
  const walk = (ds: Division[], where: string) => {
    for (const d of ds) {
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${where}${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${where}${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children, where);
    }
  };
  walk(books, '');
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- excluded-gloss and other required disclosures ----
  const excludedCount = anomalies.filter((a) => /excluded from the reading text as a Wikisource-added/i.test(a.note)).length;
  if (excludedCount !== 4) err('excluded-gloss-count', `expected exactly 4 excluded-gloss anomalies, found ${excludedCount}`);
  if (!anomalies.some((a) => /provenance/i.test(a.where) || /does not cite a specific source/i.test(a.note))) err('provenance-note', 'anomalies.json must document the missing-edition provenance gap');
  if (!anomalies.some((a) => /sequentially by paragraph|numbered sequentially/i.test(a.note))) err('book3-numbering-note', 'anomalies.json must document Book 3\'s editorially-assigned sequential numbering');
  if (!anomalies.some((a) => /breaks off|ends abruptly/i.test(a.note))) err('book3-incomplete-note', 'anomalies.json must document Book 3\'s incompleteness');
  if (!anomalies.some((a) => /531-character/i.test(a.note))) warn('long-span-note', 'anomalies.json should call out the 531-character ⟨…⟩ span individually');

  // ---- angle/square-bracket supplements must be flagged on their Passage ----
  const ANGLE_RE = /⟨[^⟩]*⟩/;
  const SQ_RE = /\[(?!\d+\])[^[\]]*\]/;
  let unflagged = 0;
  const walk2 = (ds: Division[]) => {
    for (const d of ds) {
      for (const p of d.passages) {
        if ((ANGLE_RE.test(p.text) || SQ_RE.test(p.text)) && !p.anomaly) unflagged += 1;
      }
      if (d.children.length) walk2(d.children);
    }
  };
  walk2(books);
  if (unflagged > 0) err('unflagged-supplement', `${unflagged} passage(s) contain a ⟨…⟩/[…] supplement mark but no .anomaly flag`);

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(INCIPIT.normalize('NFC'));
  if (!okStart) err('spot-check-incipit', `book-1 sec-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 100))})`);

  const b3 = books[2];
  const b3Sections = b3?.children ?? [];
  const lastSec = b3Sections[b3Sections.length - 1];
  const lastText = lastSec?.passages[0]?.text ?? '';
  const okEnd = lastText.normalize('NFC').endsWith(EXPLICIT.normalize('NFC'));
  if (!okEnd) err('spot-check-explicit', `book-3's final section does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-100))})`);

  const stats = { books: books.length, sections: totalSections, passages: totalPassages, chars: totalChars };
  writeReport(findings, stats, sectionCounts, anomalies, { incipitOk: okStart, incipitGot: p1.slice(0, 100), explicitOk: okEnd, explicitGot: lastText.slice(-100) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:de-legibus-la ===\n');
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
  L.push(`# De Legibus (Latin) validation report`);
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
    L.push(`- ${spot.explicitOk ? 'OK' : 'FAIL'} — book-3 final section explicit (breaks off mid-dialogue)\n  - got: \`${spot.explicitGot}\``);
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
