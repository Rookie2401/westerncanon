/**
 * Validation for all 13 generated Archimedes work corpora.
 *
 *   npm run validate:archimedes
 *
 * Writes data/archimedes-<slug>/VALIDATION_REPORT.md for each of the 13 works,
 * prints a combined summary, and exits non-zero if any ERROR-level check fails
 * for any work. WARN-level findings (preserved source irregularities) do not
 * fail the run. Mirrors the ERROR/WARN pattern of
 * scripts/import-isagoge-shared/validate.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIMEDES_WORKS } from './workTable.ts';
import type { ArchimedesWorkEntry } from './workTable.ts';
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

/** substrings that indicate leaked transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;',
  '&lt;',
  '&gt;',
  '&#9651;',
  '<lb ',
  '<pb ',
  '<del',
  '<add',
  '<gap',
  '<figure',
  '<graphic',
  '<lg',
  '<l ',
  '</p>',
  '<div',
  '<head',
  'xmlns',
  'http://',
];

function walkDivisions(divs: Division[], visit: (d: Division, path: string) => void, prefix = ''): void {
  for (const d of divs) {
    const path = `${prefix}${d.id}`;
    visit(d, path);
    if (d.children.length) walkDivisions(d.children, visit, `${path}/`);
  }
}

function expectedDivisionCount(entry: ArchimedesWorkEntry): number {
  const s = entry.structure;
  if (s.kind === 'flat') return s.numbers.length;
  if (s.kind === 'books') return s.books.length + s.books.reduce((n, b) => n + b.numbers.length, 0);
  // fragments: one Division per chapter (sections are folded into passages, not divisions)
  return s.chapters.length;
}

function expectedPassageFloor(entry: ArchimedesWorkEntry): number {
  // A lower bound: at least one passage per leaf division (one known
  // corpus-wide exception drops a single wholly-deleted paragraph, tlg001
  // book 1 ch.34, but that division still keeps its other 4 passages).
  const s = entry.structure;
  if (s.kind === 'flat') return s.numbers.length;
  if (s.kind === 'books') return s.books.reduce((n, b) => n + b.numbers.length, 0);
  return s.chapters.reduce((n, c) => n + c.sections.length, 0);
}

interface WorkReport {
  entry: ArchimedesWorkEntry;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; heading: string | null; passages: number; chars: number }[];
  anomalies: Anomaly[];
  delLogged: number;
  addLogged: number;
  gapLogged: number;
  figureLogged: number;
}

function validateWork(entry: ArchimedesWorkEntry): WorkReport {
  const dir = join(DATA_ROOT, entry.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    entry,
    dir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
    delLogged: 0,
    addLogged: 0,
    gapLogged: 0,
    figureLogged: 0,
  };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run \`npm run import:archimedes\``);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== entry.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${entry.workId}`);
  if (work.language !== 'grc') err('language', `work.json language is ${JSON.stringify(work.language)}, expected 'grc'`);
  if (about.title !== entry.latinTitle) {
    warn('about-title', `about.json title ${JSON.stringify(about.title)} != canonical Latin title ${JSON.stringify(entry.latinTitle)}`);
  }
  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of ['The edition', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
    }
  }

  const divisions = work.divisions ?? [];

  // ---- division count against the ground-truth structure table ----
  let flatDivCount = 0;
  walkDivisions(divisions, () => {
    flatDivCount += 1;
  });
  report.divisionCount = flatDivCount;
  const expectedDivs = expectedDivisionCount(entry);
  if (flatDivCount !== expectedDivs) {
    err('division-count', `expected exactly ${expectedDivs} division(s) (incl. Book containers), got ${flatDivCount}`);
  }

  // ---- top-level shape: books vs flat vs fragments ----
  if (entry.structure.kind === 'books') {
    if (divisions.length !== 2) err('top-level', `expected exactly 2 top-level Book divisions, got ${divisions.length}`);
    divisions.forEach((d, i) => {
      const spec = entry.structure.kind === 'books' ? entry.structure.books[i] : undefined;
      if (!spec) return;
      if (d.editorialTitle !== null) err('book-editorialTitle', `${d.id}: Book editorialTitle must be null, got ${JSON.stringify(d.editorialTitle)}`);
      if (d.sourceHeading !== null) err('book-sourceHeading', `${d.id}: Book sourceHeading must be null, got ${JSON.stringify(d.sourceHeading)}`);
      if (d.ref !== null) err('book-ref', `${d.id}: Book ref must be null, got ${JSON.stringify(d.ref)}`);
      if (d.passages.length !== 0) err('book-passages', `${d.id}: Book must carry passages: [], got ${d.passages.length}`);
      if (d.children.length !== spec.numbers.length) {
        err('book-children', `${d.id}: expected ${spec.numbers.length} chapter(s), got ${d.children.length}`);
      }
      const numbers = d.children.map((c) => c.number);
      if (JSON.stringify(numbers) !== JSON.stringify(spec.numbers)) {
        err('book-chapter-numbers', `${d.id}: chapter number sequence ${JSON.stringify(numbers)} != expected ${JSON.stringify(spec.numbers)}`);
      }
    });
  } else if (entry.structure.kind === 'flat') {
    const numbers = divisions.map((d) => d.number);
    if (JSON.stringify(numbers) !== JSON.stringify(entry.structure.numbers)) {
      err('flat-numbers', `top-level number sequence ${JSON.stringify(numbers)} != expected ${JSON.stringify(entry.structure.numbers)}`);
    }
    for (const d of divisions) {
      if (d.children.length !== 0) err('flat-children', `${d.id}: expected no children, got ${d.children.length}`);
    }
  } else {
    // fragments (tlg013)
    if (divisions.length !== entry.structure.chapters.length) {
      err('fragments-chapters', `expected ${entry.structure.chapters.length} chapter divisions, got ${divisions.length}`);
    }
    divisions.forEach((d) => {
      if (d.editorialTitle !== null) err('fragments-editorialTitle', `${d.id}: editorialTitle must be null`);
      if (d.sourceHeading === null) warn('fragments-sourceHeading', `${d.id}: expected a verbatim source chapter title, got null`);
      if (d.children.length !== 0) err('fragments-children', `${d.id}: expected no children, got ${d.children.length}`);
    });
  }

  // Every leaf division must carry number:string (never null) and editorialTitle: null.
  walkDivisions(divisions, (d) => {
    if (d.children.length > 0) return; // Book containers checked above
    if (d.number === null) err('division-number', `${d.id}: number must never be null in this corpus`);
    if (d.editorialTitle !== null) err('division-editorialTitle', `${d.id}: editorialTitle must be null (numbered-only policy)`);
  });

  // ---- passages ----
  let passageCount = 0;
  let totalChars = 0;
  const gapAnomalyPassages: string[] = [];
  const figurePassages: string[] = [];
  walkDivisions(divisions, (d, path) => {
    if (d.children.length > 0) return;
    let chars = 0;
    d.passages.forEach((p, i) => {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) {
        err('empty-passage', `${path}: passage[${i}] has empty text`);
      }
      if (typeof p.n !== 'string') err('passage-n', `${path}: passage[${i}] n is not a string`);
      if (p.anomaly && /lacuna/i.test(p.anomaly)) gapAnomalyPassages.push(`${path}/passage[${i}]`);
      if (p.figure) {
        figurePassages.push(`${path}/passage[${i}]`);
        if (!p.figure.image && !p.figure.note) err('figure-note', `${path}: passage[${i}] figure has no note`);
        if (!p.figure.source) err('figure-source', `${path}: passage[${i}] figure has no source citation`);
      }
    });
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, heading: d.sourceHeading, passages: d.passages.length, chars });
  });
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  const floor = expectedPassageFloor(entry);
  if (passageCount < floor) {
    err('passage-floor', `expected at least ${floor} passage(s) (one per leaf section), got ${passageCount}`);
  }

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkDivisions(divisions, (d, path) => {
    if (d.sourceHeading != null) {
      for (const marker of LEAK_MARKERS) if (d.sourceHeading.includes(marker)) leaks.push(`${path}/sourceHeading: contains ${JSON.stringify(marker)}`);
    }
    d.passages.forEach((p, i) => {
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${path}/passage[${i}]: contains ${JSON.stringify(marker)}`);
      if (p.ref && p.ref.includes('&#9651;')) leaks.push(`${path}/passage[${i}]/ref: contains raw &#9651;`);
    });
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- Unicode form: NFC required (unlike Isagoge, Archimedes IS normalised) ----
  let combiningHits = 0;
  walkDivisions(divisions, (d) => {
    if (d.sourceHeading != null && hasCombining(d.sourceHeading)) combiningHits += 1;
    for (const p of d.passages) if (hasCombining(p.text)) combiningHits += 1;
  });
  if (combiningHits > 0) {
    err('no-combining-marks', `${combiningHits} string(s) contain standalone combining diacritics after NFC normalisation`);
  }
  let nfcMismatch = 0;
  walkDivisions(divisions, (d) => {
    for (const p of d.passages) if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
  });
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);

  // ---- every <del>/<gap>/<add>/<figure> occurrence logged in anomalies.json ----
  const delLogged = anomalies.filter((a) => /<del>/.test(a.note)).length;
  const addLogged = anomalies.filter((a) => /<add cause="omitted">/.test(a.note)).length;
  const gapLogged = anomalies.filter((a) => /<gap reason="omitted"/.test(a.note)).length;
  const figureLogged = anomalies.filter((a) => /<figure>/.test(a.note)).length;
  if (gapAnomalyPassages.length > 0 && gapLogged === 0) {
    err('gap-logged', `${gapAnomalyPassages.length} passage(s) carry a lacuna anomaly but anomalies.json has no matching <gap> entries`);
  }
  if (figurePassages.length > 0 && figureLogged !== figurePassages.length) {
    err('figure-logged', `${figurePassages.length} passage(s) carry a figure marker but anomalies.json logs ${figureLogged} <figure> entries`);
  }
  report.delLogged = delLogged;
  report.addLogged = addLogged;
  report.gapLogged = gapLogged;
  report.figureLogged = figureLogged;

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Archimedes validation report - ${r.entry.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions (incl. Book containers): ${r.divisionCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- Mugler volume: ${r.entry.muglerVolume} (${r.entry.muglerYear})`);
  L.push(
    `- anomalies logged: ${r.delLogged} <del>, ${r.addLogged} <add cause="omitted">, ${r.gapLogged} <gap>, ${r.figureLogged} <figure>`,
  );
  L.push('');
  L.push('## Per-division passage counts (leaf divisions only)');
  L.push('');
  L.push('| id | number | sourceHeading | passages | chars |');
  L.push('|----|--------|---------------|----------|-------|');
  r.perDivision.forEach((d) => {
    L.push(`| ${d.id} | ${d.number ?? '-'} | ${d.heading ? d.heading.replace(/\|/g, '\\|') : '-'} | ${d.passages} | ${d.chars} |`);
  });
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
  const reports = ARCHIMEDES_WORKS.map(validateWork);

  if (reports.length !== 13) {
    process.stderr.write(`STOP: expected exactly 13 works in the table, got ${reports.length}\n`);
    process.exit(1);
  }

  for (const r of reports) writeReport(r);

  process.stdout.write('\n=== validate:archimedes ===\n');
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(
      `  ${r.entry.workId.padEnd(32)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ` +
        `${r.divisionCount} div  ${r.passageCount} passages  ${errors.length} err  ${warns.length} warn\n`,
    );
    for (const f of [...errors, ...warns]) {
      process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
    }
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write(`Reports written to data/archimedes-<slug>/VALIDATION_REPORT.md\n`);
  if (totalErrors > 0) process.exit(1);
}

main();
