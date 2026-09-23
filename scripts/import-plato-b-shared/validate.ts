/**
 * Validation for all ten generated Plato dialogue corpora (Symposium,
 * Phaedrus, Protagoras, Gorgias, Timaeus — Greek + English each).
 *
 *   npx tsx scripts/import-plato-b-shared/validate.ts
 *
 * Writes data/plato-<dialogue>-<lang>/VALIDATION_REPORT.md for each of the
 * ten works, prints a summary, and exits non-zero if any ERROR-level check
 * fails anywhere. WARN-level findings (preserved source irregularities) do
 * not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Anomaly, Division, GenericWork, WorkAbout } from './types.ts';
import { DIALOGUES, type DialogueMeta } from './works.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

/** substrings that indicate leaked transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '&quot;', '&apos;',
  '<div', '<p>', '</p>', '<said', '</said>', '<label', '</label>',
  '<milestone', '<note', '<bibl', '<cit', '<quote', '<del', '<add',
  '<gap', '<corr', '<sic', '<l>', '</l>', '<term', '<emph', '<foreign',
  '<gloss', '<placeName', '<name', '<date', '<head', '<q ', '<q>', '</q>',
  'xmlns', 'http://www.tei-c.org',
];

interface WorkReport {
  workId: string;
  dir: string;
  slug: DialogueMeta['slug'];
  lang: 'grc' | 'en';
  findings: Finding[];
  pageCount: number;
  firstPage: string;
  lastPage: string;
  totalChars: number;
  anomalies: Anomaly[];
  delCount: number;
  addCount: number;
  gapCount: number;
}

function countAnomalyKind(anomalies: Anomaly[], re: RegExp): number {
  return anomalies.filter((a) => re.test(a.note)).length;
}

function walkAllText(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
  }
}

function validateWork(meta: DialogueMeta, lang: 'grc' | 'en'): WorkReport {
  const workId = `plato-${meta.slug}-${lang}`;
  const dir = join(REPO_ROOT, 'data', workId);
  const findings: Finding[] = [];
  const err = (check: string, mmsg: string) => findings.push({ level: 'ERROR', check, message: mmsg });
  const warn = (check: string, mmsg: string) => findings.push({ level: 'WARN', check, message: mmsg });

  const report: WorkReport = {
    workId,
    dir,
    slug: meta.slug,
    lang,
    findings,
    pageCount: 0,
    firstPage: '',
    lastPage: '',
    totalChars: 0,
    anomalies: [],
    delCount: 0,
    addCount: 0,
    gapCount: 0,
  };

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${workId}`);
  if (work.language !== lang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${lang}`);
  if (about.workId !== workId) err('about-workId', `about.json workId is ${JSON.stringify(about.workId)}, expected ${workId}`);
  if (about.author !== 'Plato') err('about-author', `about.json author is ${JSON.stringify(about.author)}, expected "Plato"`);
  if (!about.provenance || !about.license) err('about-fields', 'about.json missing provenance/license');

  const divisions = work.divisions ?? [];
  report.pageCount = divisions.length;

  // ---- Stephanus page range: exact, monotonic, no gaps/dupes ----
  const expectedCount = meta.lastPage - meta.firstPage + 1;
  if (divisions.length !== expectedCount) {
    err('page-count', `expected ${expectedCount} Stephanus pages (${meta.firstPage}-${meta.lastPage}), got ${divisions.length}`);
  }
  const numbers = divisions.map((d) => Number(d.number));
  numbers.forEach((n, i) => {
    if (i === 0 && n !== meta.firstPage) err('first-page', `first Stephanus page is ${n}, expected ${meta.firstPage}`);
    if (i > 0 && n !== numbers[i - 1]! + 1) err('page-sequence', `non-monotonic Stephanus page sequence at index ${i}: ${numbers[i - 1]} -> ${n}`);
  });
  if (numbers.length > 0) {
    report.firstPage = String(numbers[0]);
    report.lastPage = String(numbers[numbers.length - 1]);
    if (numbers[numbers.length - 1] !== meta.lastPage) err('last-page', `last Stephanus page is ${numbers[numbers.length - 1]}, expected ${meta.lastPage}`);
  }

  // ---- per-division shape ----
  let totalChars = 0;
  for (const d of divisions) {
    if (d.id !== `sec-${d.number}`) err('division-id', `${d.id}: id does not match sec-${d.number}`);
    if (d.ref !== null) err('division-ref', `${d.id}: ref should be null, got ${JSON.stringify(d.ref)}`);
    if (d.sourceHeading !== null) err('division-sourceHeading', `${d.id}: sourceHeading should be null`);
    if (d.editorialTitle !== null) err('division-editorialTitle', `${d.id}: editorialTitle should be null`);
    if (d.children.length !== 0) err('division-children', `${d.id}: expected no children, got ${d.children.length}`);
    // One passage per page, except a page shared by several Letters in the
    // Epistles carries one passage per letter-part (the Epistles are the only
    // work with letter divs; page 358 carries three).
    if (d.passages.length < 1) err('division-passages', `${d.id}: expected at least 1 passage, got ${d.passages.length}`);
    if (d.passages.length > 1 && !d.passages.every((p) => /^Letter \d+$/.test(p.n))) err('division-passages', `${d.id}: ${d.passages.length} passages but not all are Letter-parts`);
    for (const p of d.passages) {
      totalChars += p.text.length;
      if (p.n !== '' && !/^Letter \d+$/.test(p.n)) err('passage-n', `${d.id}: passage n should be "" (or "Letter N" in the Epistles), got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref should be null, got ${JSON.stringify(p.ref)}`);
      if (typeof p.text !== 'string' || p.text.length === 0) err('passage-text', `${d.id}: passage text is empty`);
    }
  }
  report.totalChars = totalChars;

  // ---- leaked transport markup ----
  const leaks: string[] = [];
  walkAllText(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- stray entity refs (anything &word; not decoded) ----
  const entityLeaks: string[] = [];
  walkAllText(divisions, (s, where) => {
    const m = s.match(/&[a-zA-Z#][a-zA-Z0-9]*;/g);
    if (m) entityLeaks.push(`${where}: ${m.join(', ')}`);
  });
  if (entityLeaks.length) err('no-entity-leaks', `${entityLeaks.length} string(s) contain undecoded entity refs: ${entityLeaks.slice(0, 5).join('; ')}`);

  // ---- double-space / triple-space hygiene (defensive check on the boundary-space fix) ----
  const spacingIssues: string[] = [];
  walkAllText(divisions, (s, where) => {
    if (/ {2,}/.test(s)) spacingIssues.push(where);
    if (/\n{3,}/.test(s)) spacingIssues.push(`${where} (multiple blank lines)`);
  });
  if (spacingIssues.length) warn('spacing-hygiene', `${spacingIssues.length} passage(s) contain a double space or excess blank line: ${spacingIssues.slice(0, 5).join(', ')}`);

  // ---- Greek: no standalone combining diacritics (precomposed only, no NFD) ----
  if (lang === 'grc') {
    const isCombiningCp = (cp: number): boolean =>
      (cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) || (cp >= 0x1dc0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff) || (cp >= 0xfe20 && cp <= 0xfe2f);
    const hasCombining = (s: string): boolean => {
      for (const ch of s) if (isCombiningCp(ch.codePointAt(0) ?? 0)) return true;
      return false;
    };
    let combiningHits = 0;
    walkAllText(divisions, (s) => {
      if (hasCombining(s)) combiningHits += 1;
    });
    if (combiningHits > 0) warn('no-combining-marks', `${combiningHits} string(s) contain standalone combining diacritics (unexpected precomposed-only source)`);
  }

  // ---- every paragraph starts with a capital/label-ish token where a label is expected? (informational only, not enforced — many paragraphs legitimately carry no repeated label) ----

  // ---- del/add/gap counts from anomalies, cross-checked against console-reported counts is not persisted; just tally from anomalies.json ----
  report.delCount = countAnomalyKind(anomalies, /^<del> excluded/);
  report.addCount = countAnomalyKind(anomalies, /^<add> editorial insertion/);
  report.gapCount = countAnomalyKind(anomalies, /^<gap\b/);

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Plato ${r.slug} (${r.lang}) validation report — ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- Stephanus pages: ${r.pageCount} (${r.firstPage}–${r.lastPage})`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- <del> exclusions: ${r.delCount}`);
  L.push(`- <add> insertions kept: ${r.addCount}`);
  L.push(`- <gap/> lacunae: ${r.gapCount}`);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (r.anomalies.length === 0) L.push('_none_');
  for (const a of r.anomalies.slice(0, 200)) L.push(`- **${a.where}** — ${a.note}`);
  if (r.anomalies.length > 200) L.push(`- ... and ${r.anomalies.length - 200} more`);
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
  const reports: WorkReport[] = [];
  for (const meta of DIALOGUES) {
    for (const lang of ['grc', 'en'] as const) {
      reports.push(validateWork(meta, lang));
    }
  }

  // ---- cross-check: grc/en page-range and page-count must match per dialogue ----
  for (const meta of DIALOGUES) {
    const grc = reports.find((r) => r.slug === meta.slug && r.lang === 'grc')!;
    const en = reports.find((r) => r.slug === meta.slug && r.lang === 'en')!;
    if (grc.pageCount !== en.pageCount || grc.firstPage !== en.firstPage || grc.lastPage !== en.lastPage) {
      const msg = `grc (${grc.pageCount} pages, ${grc.firstPage}-${grc.lastPage}) and en (${en.pageCount} pages, ${en.firstPage}-${en.lastPage}) page ranges differ`;
      grc.findings.push({ level: 'ERROR', check: 'grc-en-page-range-match', message: msg });
      en.findings.push({ level: 'ERROR', check: 'grc-en-page-range-match', message: msg });
    }
  }

  for (const r of reports) writeReport(r);

  process.stdout.write('\n=== validate:plato-b (symposium, phaedrus, protagoras, gorgias, timaeus) ===\n\n');
  for (const meta of DIALOGUES) {
    const grc = reports.find((r) => r.slug === meta.slug && r.lang === 'grc')!;
    const en = reports.find((r) => r.slug === meta.slug && r.lang === 'en')!;
    const grcErr = grc.findings.filter((f) => f.level === 'ERROR').length;
    const enErr = en.findings.filter((f) => f.level === 'ERROR').length;
    process.stdout.write(
      `${meta.englishTitle.padEnd(12)} grc: ${String(grc.pageCount).padStart(3)} pages (${grc.firstPage}-${grc.lastPage})  ` +
        `${String(grc.totalChars).padStart(7)} chars  del=${grc.delCount} add=${grc.addCount} gap=${grc.gapCount}  ${grcErr === 0 ? 'PASS' : `FAIL(${grcErr})`}\n`,
    );
    process.stdout.write(
      `${''.padEnd(12)} en : ${String(en.pageCount).padStart(3)} pages (${en.firstPage}-${en.lastPage})  ` +
        `${String(en.totalChars).padStart(7)} chars  del=${en.delCount} add=${en.addCount} gap=${en.gapCount}  ${enErr === 0 ? 'PASS' : `FAIL(${enErr})`}\n`,
    );
    const pageDiff = Math.abs(grc.pageCount - en.pageCount);
    process.stdout.write(`${''.padEnd(12)} section counts ${pageDiff === 0 ? 'match exactly' : `differ by ${pageDiff}`}\n\n`);
  }

  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    const errs = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errs.length;
    totalWarns += warns.length;
    for (const f of errs) process.stdout.write(`  [ERROR] ${r.workId} ${f.check}: ${f.message.split('\n')[0]}\n`);
  }
  for (const r of reports) {
    for (const f of r.findings.filter((x) => x.level === 'WARN')) {
      process.stdout.write(`  [WARN]  ${r.workId} ${f.check}: ${f.message.split('\n')[0]}\n`);
    }
  }

  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write(`Reports: data/plato-<dialogue>-<lang>/VALIDATION_REPORT.md\n`);
  if (totalErrors > 0) process.exit(1);
}

main();
