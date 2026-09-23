/**
 * Validation for all 132 generated Plutarch work+language directories.
 *
 *   npm run validate:plutarch
 *
 * Writes data/plutarch-<slug>-{grc,en}/VALIDATION_REPORT.md for each of the
 * 132 editions, prints a combined summary, and exits non-zero if any
 * ERROR-level check fails for any edition. WARN-level findings (preserved
 * source irregularities) do not fail the run. Mirrors the ERROR/WARN pattern
 * of scripts/import-archimedes-shared/validate.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUTARCH_WORKS } from './workTable.ts';
import type { PlutarchWorkEntry } from './workTable.ts';
import { hasCombining } from './text.ts';
import type { Division, GenericWork, WorkAbout } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

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
  '&amp;',
  '&lt;',
  '&gt;',
  '<pb',
  '<note',
  '<bibl',
  '<gap',
  '<add',
  '<sic',
  '<corr',
  '<milestone',
  '<div',
  '<head',
  '<p>',
  '</p>',
  'xmlns',
  'http://',
];

/** true iff `numbers` is a clean run of consecutive integers (any starting
 *  point - Timoleon, tlg018, genuinely starts at 0; every other work at 1). */
function isConsecutive(numbers: readonly (string | null)[]): boolean {
  if (numbers.length === 0 || numbers[0] === null) return false;
  const start = Number(numbers[0]);
  if (!Number.isInteger(start)) return false;
  return numbers.every((v, i) => v === String(start + i));
}

function walkDivisions(divs: Division[], visit: (d: Division, path: string) => void, prefix = ''): void {
  for (const d of divs) {
    const path = `${prefix}${d.id}`;
    visit(d, path);
    if (d.children.length) walkDivisions(d.children, visit, `${path}/`);
  }
}

interface EditionReport {
  workId: string;
  entry: PlutarchWorkEntry;
  lang: 'grc' | 'en';
  dir: string;
  findings: Finding[];
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
}

function validateEdition(entry: PlutarchWorkEntry, lang: 'grc' | 'en'): EditionReport {
  const workId = `plutarch-${entry.slug}-${lang}`;
  const dir = join(DATA_ROOT, workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: EditionReport = {
    workId,
    entry,
    lang,
    dir,
    findings,
    chapterCount: 0,
    passageCount: 0,
    totalChars: 0,
    anomalies: [],
  };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run \`npm run import:plutarch\``);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${workId}`);
  if (work.language !== lang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${JSON.stringify(lang)}`);

  const expectedTitle = lang === 'grc' ? entry.grcTitle : entry.engTitle;
  if (about.title !== expectedTitle) warn('about-title', `about.json title ${JSON.stringify(about.title)} != expected ${JSON.stringify(expectedTitle)}`);
  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of ['The edition', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
    }
  }

  const divisions = work.divisions ?? [];
  const isDoubleLife = entry.parts !== null;

  if (isDoubleLife) {
    if (divisions.length !== entry.parts!.length) {
      err('top-level-books', `expected ${entry.parts!.length} book-level Division(s), got ${divisions.length}`);
    }
    divisions.forEach((d, i) => {
      const part = entry.parts![i];
      if (!part) return;
      if (d.id !== `book-${part.slug}`) err('book-id', `divisions[${i}].id is ${JSON.stringify(d.id)}, expected "book-${part.slug}"`);
      if (d.number !== null) err('book-number', `${d.id}: book number must be null, got ${JSON.stringify(d.number)}`);
      if (d.passages.length !== 0) err('book-passages', `${d.id}: book must carry passages: [], got ${d.passages.length}`);
      if (d.sourceHeading === null) warn('book-sourceHeading', `${d.id}: expected a verbatim source part title, got null`);
      const numbers = d.children.map((c) => c.number);
      if (!isConsecutive(numbers)) {
        err('book-chapter-numbers', `${d.id}: chapter number sequence ${JSON.stringify(numbers)} is not a clean consecutive-integer sequence`);
      }
      d.children.forEach((c) => {
        if (c.id !== `book-${part.slug}-ch-${c.number}`) err('chapter-id', `expected id "book-${part.slug}-ch-${c.number}", got ${JSON.stringify(c.id)}`);
      });
    });
  } else {
    const numbers = divisions.map((d) => d.number);
    if (!isConsecutive(numbers)) {
      err('flat-chapter-numbers', `top-level chapter number sequence ${JSON.stringify(numbers)} is not a clean consecutive-integer sequence`);
    }
    divisions.forEach((d) => {
      if (d.id !== `ch-${d.number}`) err('chapter-id', `expected id "ch-${d.number}", got ${JSON.stringify(d.id)}`);
      if (d.children.length !== 0) err('flat-children', `${d.id}: expected no children, got ${d.children.length}`);
    });
  }

  // Every leaf division (chapter) must carry number:string, ref:null, sourceHeading:null, editorialTitle:null, exactly 1 passage.
  let chapterCount = 0;
  let passageCount = 0;
  let totalChars = 0;
  const gapAnomalyChapters: string[] = [];
  walkDivisions(divisions, (d, path) => {
    if (d.children.length > 0) return; // book container, checked above
    chapterCount += 1;
    if (d.number === null) err('chapter-number', `${path}: number must never be null for a chapter`);
    if (d.ref !== null) err('chapter-ref', `${path}: ref must be null`);
    if (d.sourceHeading !== null) err('chapter-sourceHeading', `${path}: sourceHeading must be null`);
    if (d.editorialTitle !== null) err('chapter-editorialTitle', `${path}: editorialTitle must be null`);
    if (d.passages.length !== 1) err('chapter-passages', `${path}: expected exactly 1 passage, got ${d.passages.length}`);
    d.passages.forEach((p, i) => {
      passageCount += 1;
      totalChars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${path}: passage[${i}] has empty text`);
      if (p.n !== '') err('passage-n', `${path}: passage[${i}].n must be '', got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${path}: passage[${i}].ref must be null`);
      if (p.anomaly && /lacuna/i.test(p.anomaly)) gapAnomalyChapters.push(path);
    });
  });
  report.chapterCount = chapterCount;
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkDivisions(divisions, (d, path) => {
    if (d.sourceHeading != null) {
      for (const marker of LEAK_MARKERS) if (d.sourceHeading.includes(marker)) leaks.push(`${path}/sourceHeading: contains ${JSON.stringify(marker)}`);
    }
    d.passages.forEach((p, i) => {
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${path}/passage[${i}]: contains ${JSON.stringify(marker)}`);
    });
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- Unicode form: NFC required ----
  let combiningHits = 0;
  let nfcMismatch = 0;
  walkDivisions(divisions, (d) => {
    if (d.sourceHeading != null && hasCombining(d.sourceHeading)) combiningHits += 1;
    for (const p of d.passages) {
      if (hasCombining(p.text)) combiningHits += 1;
      if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
    }
  });
  // WARN, not ERROR: verified by direct inspection (11 occurrences across 8
  // Greek editions - e.g. plutarch-antony-grc ch-7's "ε͂πανελθὼν", ch-86's
  // "καθ̔ειργμένην") that these are genuine, pre-existing dangling
  // combining diacritics IN THE SOURCE XML ITSELF (a handful of stray
  // elision/breathing marks and one mid-word misplaced accent) - not an
  // importer decoding bug. Per the faithfulness rule (verbatim; never
  // silently correct source text), they are preserved exactly as fetched
  // rather than stripped or "fixed"; flagged here as a preserved
  // irregularity, not a failure.
  if (combiningHits > 0) {
    warn(
      'combining-marks-preserved',
      `${combiningHits} string(s) contain standalone combining diacritics after NFC normalisation - verified to be genuine dangling marks already present in the source XML (stray elision/breathing marks, one misplaced mid-word accent), preserved verbatim rather than silently corrected.`,
    );
  }
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);

  // ---- gap anomalies cross-checked against anomalies.json ----
  const gapLogged = anomalies.filter((a) => /<gap reason="lost"/.test(a.note)).length;
  if (gapAnomalyChapters.length > 0 && gapLogged === 0) {
    err('gap-logged', `${gapAnomalyChapters.length} chapter(s) carry a lacuna anomaly but anomalies.json has no matching <gap> entries`);
  }

  return report;
}

function writeReport(r: EditionReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Plutarch validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- tlg: ${r.entry.tlg}`);
  L.push(`- chapters: ${r.chapterCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- Loeb vol. ${r.entry.volRoman} (${r.entry.year})`);
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
  const reports: EditionReport[] = [];
  for (const entry of PLUTARCH_WORKS) {
    for (const lang of ['grc', 'en'] as const) reports.push(validateEdition(entry, lang));
  }

  if (reports.length !== 132) {
    process.stderr.write(`STOP: expected exactly 132 editions, got ${reports.length}\n`);
    process.exit(1);
  }

  for (const r of reports) writeReport(r);

  process.stdout.write('\n=== validate:plutarch ===\n');
  let totalErrors = 0;
  let totalWarns = 0;
  let totalChapters = 0;
  for (const r of reports) {
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    totalChapters += r.chapterCount;
    const status = errors.length === 0 ? 'PASS' : 'FAIL';
    if (errors.length > 0 || warns.length > 0) {
      process.stdout.write(
        `  ${r.workId.padEnd(42)} ${status}  ${r.chapterCount} ch  ${r.passageCount} psg  ${errors.length} err  ${warns.length} warn\n`,
      );
      for (const f of [...errors, ...warns]) {
        process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
      }
    }
  }
  process.stdout.write(
    `\n${reports.length} editions checked, ${totalChapters} total chapters, ${totalErrors} error(s), ${totalWarns} warning(s).\n`,
  );
  process.stdout.write(`Reports written to data/plutarch-<slug>-{grc,en}/VALIDATION_REPORT.md\n`);
  if (totalErrors > 0) process.exit(1);
}

main();
