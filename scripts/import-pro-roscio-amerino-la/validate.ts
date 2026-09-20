/**
 * Validation for data/pro-roscio-amerino-la/ AND data/pro-roscio-amerino-en/
 * together (one validator per speech, covering both its Latin and English
 * editions - see scripts/cicero-npm-scripts-group-a.json).
 *
 *   npx tsx scripts/import-pro-roscio-amerino-la/validate.ts
 *
 * Writes data/pro-roscio-amerino-la/VALIDATION_REPORT.md, prints a summary,
 * and exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/pro-roscio-amerino-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR_LA = join(REPO_ROOT, 'data', 'pro-roscio-amerino-la');
const DIR_EN = join(REPO_ROOT, 'data', 'pro-roscio-amerino-en');

const EXPECTED_SECTIONS = 154;
const INCIPIT_LA = 'credo ego vos, iudices, mirari';
const EXPLICIT_LA = 'ex animis amittimus.';
const INCIPIT_EN = 'I imagine that you, O judges';
const EXPLICIT_EN = 'every feeling of humanity.';
/** Section 132 carries the well-known "Desunt non pauca" manuscript lacuna - verified present, not merely expected. */
const LACUNA_SECTION_ID = 'sec-132';
const LACUNA_MARKER = 'Desunt non pauca.';

const LEAK_MARKERS = ['<', '&amp;', '&lt;', '&gt;', '&quot;', '  ', '\t'];

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

function loadEdition(dir: string, workId: string, lang: 'la' | 'en', findings: Finding[]): { work: GenericWork | null; about: Record<string, unknown> | null; anomalies: Anomaly[] } {
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  for (const f of ['work.json', 'about.json', 'anomalies.json', 'types.ts']) {
    if (!existsSync(join(dir, f))) err(`${workId}-presence`, `missing ${f} - run the importer`);
  }
  if (!existsSync(join(dir, 'work.json'))) return { work: null, about: null, anomalies: [] };

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = existsSync(join(dir, 'about.json')) ? (JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as Record<string, unknown>) : null;
  const anomalies = existsSync(join(dir, 'anomalies.json')) ? (JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[]) : [];

  if (work.workId !== workId) err(`${workId}-workId`, `expected ${workId}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== lang) err(`${workId}-language`, `expected ${JSON.stringify(lang)}, got ${JSON.stringify(work.language)}`);

  const divisions = work.divisions ?? [];
  if (divisions.length !== EXPECTED_SECTIONS) {
    findings.push({ level: 'WARN', check: `${workId}-section-count`, message: `expected ${EXPECTED_SECTIONS} sections, got ${divisions.length} (source may genuinely differ - see anomalies.json)` });
  }
  divisions.forEach((d, i) => {
    const wantId = `sec-${i + 1}`;
    if (d.id !== wantId) err(`${workId}-section-id`, `divisions[${i}] id ${JSON.stringify(d.id)}, expected ${JSON.stringify(wantId)}`);
    if (d.number !== String(i + 1)) err(`${workId}-section-number`, `${d.id}: number ${JSON.stringify(d.number)}, expected "${i + 1}"`);
    if (!Array.isArray(d.children) || d.children.length !== 0) err(`${workId}-section-children`, `${d.id}: children must be [], got ${JSON.stringify(d.children)}`);
    if (d.passages.length !== 1) err(`${workId}-passage-count`, `${d.id}: expected exactly 1 passage, got ${d.passages.length}`);
    for (const p of d.passages) {
      if (typeof p.text !== 'string' || p.text.length === 0) err(`${workId}-empty-passage`, `${d.id}: passage text is empty`);
      if (p.n !== '') err(`${workId}-passage-n`, `${d.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err(`${workId}-passage-ref`, `${d.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
    }
  });

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
  walk(divisions);
  if (leaks.length) err(`${workId}-no-leaked-markup`, `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  return { work, about, anomalies };
}

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });

  const la = loadEdition(DIR_LA, 'pro-roscio-amerino-la', 'la', findings);
  const en = loadEdition(DIR_EN, 'pro-roscio-amerino-en', 'en', findings);

  const laFirst = la.work?.divisions[0]?.passages[0]?.text ?? '';
  const laLast = la.work?.divisions[la.work.divisions.length - 1]?.passages[0]?.text ?? '';
  const laIncipitOk = laFirst.startsWith(INCIPIT_LA);
  const laExplicitOk = laLast.endsWith(EXPLICIT_LA);
  if (!laIncipitOk) err('pro-roscio-amerino-la-spot-incipit', `sec-1 does not start with ${JSON.stringify(INCIPIT_LA)} (got: ${JSON.stringify(laFirst.slice(0, 60))})`);
  if (!laExplicitOk) err('pro-roscio-amerino-la-spot-explicit', `last section does not end with ${JSON.stringify(EXPLICIT_LA)} (got: ${JSON.stringify(laLast.slice(-60))})`);

  const enFirst = en.work?.divisions[0]?.passages[0]?.text ?? '';
  const enLast = en.work?.divisions[en.work.divisions.length - 1]?.passages[0]?.text ?? '';
  const enIncipitOk = enFirst.startsWith(INCIPIT_EN);
  const enExplicitOk = enLast.endsWith(EXPLICIT_EN);
  if (!enIncipitOk) err('pro-roscio-amerino-en-spot-incipit', `sec-1 does not start with ${JSON.stringify(INCIPIT_EN)} (got: ${JSON.stringify(enFirst.slice(0, 60))})`);
  if (!enExplicitOk) err('pro-roscio-amerino-en-spot-explicit', `last section does not end with ${JSON.stringify(EXPLICIT_EN)} (got: ${JSON.stringify(enLast.slice(-60))})`);

  // ---- lacuna spot-check (Latin only - see the importer's module doc) ----
  const lacunaSection = la.work?.divisions.find((d) => d.id === LACUNA_SECTION_ID);
  const lacunaOk = !!lacunaSection?.passages[0]?.text.includes(LACUNA_MARKER);
  if (!lacunaOk) {
    findings.push({ level: 'WARN', check: 'pro-roscio-amerino-la-lacuna', message: `${LACUNA_SECTION_ID} does not contain the expected "${LACUNA_MARKER}" manuscript-gap marker - if the upstream source has changed, update the importer/anomalies accordingly` });
  }

  if (la.work && en.work) {
    const laN = la.work.divisions.length;
    const enN = en.work.divisions.length;
    if (laN !== enN) {
      findings.push({ level: 'WARN', check: 'cross-edition-section-count', message: `Latin has ${laN} sections, English has ${enN} - a genuine mismatch between editions, if so, should already be documented in anomalies.json` });
    }
    const laIds = new Set(la.work.divisions.map((d) => d.id));
    const enIds = new Set(en.work.divisions.map((d) => d.id));
    const onlyLa = [...laIds].filter((id) => !enIds.has(id));
    const onlyEn = [...enIds].filter((id) => !laIds.has(id));
    if (onlyLa.length) findings.push({ level: 'WARN', check: 'cross-edition-ids', message: `section ids only in Latin: ${onlyLa.join(', ')}` });
    if (onlyEn.length) findings.push({ level: 'WARN', check: 'cross-edition-ids', message: `section ids only in English: ${onlyEn.join(', ')}` });
  }

  if (!la.anomalies.some((a) => /apparatus|note/i.test(a.note))) err('pro-roscio-amerino-la-apparatus-note', 'anomalies.json must document the dropped critical apparatus');
  if (!la.anomalies.some((a) => /gap|lacuna|Desunt/i.test(a.note))) err('pro-roscio-amerino-la-lacuna-note', 'anomalies.json must document the section-132 manuscript lacuna');
  if (!en.anomalies.some((a) => /argument/i.test(a.note))) err('pro-roscio-amerino-en-argument-note', 'anomalies.json must document how "The Argument" front matter was handled');

  const stats = {
    laSections: la.work?.divisions.length ?? 0,
    laChars: sumChars(la.work),
    enSections: en.work?.divisions.length ?? 0,
    enChars: sumChars(en.work),
  };

  writeReport(findings, stats, la.anomalies, en.anomalies, {
    la: { incipitOk: laIncipitOk, incipitGot: laFirst.slice(0, 60), explicitOk: laExplicitOk, explicitGot: laLast.slice(-60) },
    en: { incipitOk: enIncipitOk, incipitGot: enFirst.slice(0, 60), explicitOk: enExplicitOk, explicitGot: enLast.slice(-60) },
    lacunaOk,
  });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:pro-roscio-amerino ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  la: ${stats.laSections} sections / ${stats.laChars} chars   en: ${stats.enSections} sections / ${stats.enChars} chars\n`);
  process.stdout.write(`  -> ${join(DIR_LA, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function sumChars(work: GenericWork | null): number {
  if (!work) return 0;
  return work.divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
}

function writeReport(
  findings: Finding[],
  stats: { laSections: number; laChars: number; enSections: number; enChars: number },
  laAnomalies: Anomaly[],
  enAnomalies: Anomaly[],
  spot: {
    la: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string };
    en: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string };
    lacunaOk: boolean;
  },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push('# Pro S. Roscio Amerino (Latin + English) validation report');
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- Latin: ${stats.laSections} sections, ${stats.laChars} chars`);
  L.push(`- English: ${stats.enSections} sections, ${stats.enChars} chars`);
  L.push('');
  L.push('## Verbatim spot-check');
  L.push('');
  L.push(`- ${spot.la.incipitOk ? 'OK' : 'FAIL'} - Latin sec-1 incipit\n  - got: \`${spot.la.incipitGot}\``);
  L.push(`- ${spot.la.explicitOk ? 'OK' : 'FAIL'} - Latin final section explicit\n  - got: \`${spot.la.explicitGot}\``);
  L.push(`- ${spot.en.incipitOk ? 'OK' : 'FAIL'} - English sec-1 incipit\n  - got: \`${spot.en.incipitGot}\``);
  L.push(`- ${spot.en.explicitOk ? 'OK' : 'FAIL'} - English final section explicit\n  - got: \`${spot.en.explicitGot}\``);
  L.push(`- ${spot.lacunaOk ? 'OK' : 'FAIL'} - Latin ${LACUNA_SECTION_ID} preserves the "${LACUNA_MARKER}" manuscript-gap marker`);
  L.push('');
  L.push('## Anomalies (Latin, preserved not corrected)');
  L.push('');
  if (laAnomalies.length === 0) L.push('_none_');
  for (const a of laAnomalies) L.push(`- **${a.where}** - ${a.note}`);
  L.push('');
  L.push('## Anomalies (English, preserved not corrected)');
  L.push('');
  if (enAnomalies.length === 0) L.push('_none_');
  for (const a of enAnomalies) L.push(`- **${a.where}** - ${a.note}`);
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
  writeFileSync(join(DIR_LA, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

main();
