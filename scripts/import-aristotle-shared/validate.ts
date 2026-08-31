/**
 * Validation for the four generated Aristotle corpora:
 *   data/categoriae-grc/          data/de-interpretatione-grc/     (Greek, Bekker)
 *   data/categoriae-la/           data/de-interpretatione-la/      (Latin, trans. Boethius)
 *
 *   npm run validate:aristotle
 *
 * Writes data/<id>/VALIDATION_REPORT.md for each work, prints a summary, and
 * exits non-zero if any ERROR-level check fails in any work. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 *
 * Mirrors scripts/import-isagoge-shared/validate.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES_CHAPTERS,
  DE_INTERPRETATIONE_CHAPTERS,
  type ChapterMeta,
} from './chapters.ts';
import { ANGLE_SUPPLEMENT_RE, LACUNA_RE } from './latinWikisource.ts';
import type { Division, GenericWork } from '../../data/categoriae-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA = join(REPO_ROOT, 'data');

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
  'xmlns', '<p>', '</p>', '<div', '<note', '<lb ', '<pb ', '<milestone', '<head>', '<pb/',
  // wiki-transport tokens specific to the Latin Wikisource sources
  'TextQuality', 'Textquality', 'titulus', '{{finis', 'class=text',
];

function fresh(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags);
}

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
  }
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; heading: string | null; passages: number; chars: number }[];
  anomalies: Anomaly[];
  refScheme: string;
  spotCheck: { label: string; ok: boolean; got: string }[];
}

interface WorkSpec {
  workId: string;
  language: 'grc' | 'la';
  chapters: readonly ChapterMeta[];
  bekkerSpan: string;
  /** grc: every chapter sourceHeading must be null. la: sourceHeading may be a verbatim rubric or null. */
  sourceHeadings: 'all-null' | 'rubric-or-null';
  /** Verbatim head of the first chapter's first passage. */
  spotStart: string;
  /** Verbatim tail of the final chapter's last passage — guards against truncation. */
  spotEnd: string;
}

const WORKS: WorkSpec[] = [
  {
    workId: 'categoriae-grc',
    language: 'grc',
    chapters: CATEGORIES_CHAPTERS,
    bekkerSpan: '1a1–15b33',
    sourceHeadings: 'all-null',
    spotStart: 'ὉΜΩΝΥΜΑ λέγεται ὧν ὄνομα μόνον κοινόν',
    // Categories, end of ch. 15 (Bekker 15b32–33).
    spotEnd: 'οἱ δὲ εἰωθότες λέγεσθαι σχεδὸν ἅπαντες κατηρίθμηνται.',
  },
  {
    workId: 'de-interpretatione-grc',
    language: 'grc',
    chapters: DE_INTERPRETATIONE_CHAPTERS,
    bekkerSpan: '16a1–24b9',
    sourceHeadings: 'all-null',
    spotStart: 'ΠΡΩΤΟΝ δεῖ θέσθαι τί ὄνομα καὶ τί ῥῆμα',
    // De Interpretatione, end of ch. 14 (Bekker 24b8–9).
    spotEnd: 'ἅμα δὲ οὐκ ἐνδέχεται τὰ ἐναντία ὑπάρχειν τῷ αὐτῷ.',
  },
  {
    workId: 'categoriae-la',
    language: 'la',
    chapters: CATEGORIES_CHAPTERS,
    bekkerSpan: '1a1–15b33',
    sourceHeadings: 'rubric-or-null',
    spotStart: 'Aequiuoca dicuntur quorum nomen solum commune est',
    // Boethius' Categoriae, end of ch. 15 (DE HABERE).
    spotEnd: 'qui autem solent dici paene omnes sunt annumerati.',
  },
  {
    workId: 'de-interpretatione-la',
    language: 'la',
    chapters: DE_INTERPRETATIONE_CHAPTERS,
    bekkerSpan: '16a1–24b9',
    sourceHeadings: 'rubric-or-null',
    spotStart: 'Primum oportet constituere quid sit nomen et quid uerbum',
    // Boethius' Perihermenias, end of ch. 14.
    spotEnd: 'simul autem eidem non contingit inesse contraria.',
  },
];

function validateWork(spec: WorkSpec): WorkReport {
  const dir = join(DATA, spec.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const isLa = spec.language === 'la';

  const report: WorkReport = {
    workId: spec.workId,
    dir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
    refScheme: isLa
      ? 'chapter (+ verbatim Latin rubric where the source prints one); no Bekker or line numbers in this source, all ref fields null'
      : `chapter (Bekker page/column/line not marked in the digital source; the work spans Bekker ${spec.bekkerSpan})`,
    spotCheck: [],
  };

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== spec.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${spec.workId}`);
  if (work.language !== spec.language) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${spec.language}`);
  if (isLa) {
    if (about['translator'] !== 'Boethius') {
      err('translator', `about.json translator must be exactly "Boethius" for the Latin work, got ${JSON.stringify(about['translator'])}`);
    }
  } else if (about['translator'] !== undefined) {
    err('translator', `about.json must not carry a translator for the Greek work, got ${JSON.stringify(about['translator'])}`);
  }

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  // ---- division count ----
  if (divisions.length !== spec.chapters.length) {
    err('division-count', `expected ${spec.chapters.length} divisions, got ${divisions.length}`);
  }

  // ---- division id set + order, number, editorialTitle, children ----
  const ids = divisions.map((d) => d.id);
  const wantIds = spec.chapters.map((c) => c.id);
  if (ids.length !== wantIds.length || ids.some((id, i) => id !== wantIds[i])) {
    err('division-ids', `division id sequence does not match the shared chapter table:\n  got: ${ids.join(', ')}\n  want: ${wantIds.join(', ')}`);
  }
  divisions.forEach((d, i) => {
    const meta = spec.chapters[i];
    if (!meta) return;
    if (d.number !== meta.number) err('division-number', `${d.id}: number ${JSON.stringify(d.number)} != shared table ${JSON.stringify(meta.number)}`);
    if (d.editorialTitle !== meta.en) err('division-editorialTitle', `${d.id}: editorialTitle ${JSON.stringify(d.editorialTitle)} != shared table ${JSON.stringify(meta.en)}`);
    if (!Array.isArray(d.children) || d.children.length !== 0) err('division-children', `${d.id}: children must be [], got ${JSON.stringify(d.children)}`);
  });

  // ---- no praefatio ----
  if (ids.includes('praefatio')) err('no-praefatio', 'these works have no praefatio division');

  // ---- passages + ref/n/sourceHeading expectations ----
  let passageCount = 0;
  let totalChars = 0;
  let rubricCount = 0;
  for (const d of divisions) {
    let chars = 0;
    if (d.ref !== null) err('division-ref', `${d.id}: division ref must be null, got ${JSON.stringify(d.ref)}`);
    if (spec.sourceHeadings === 'all-null') {
      if (d.sourceHeading !== null) {
        err('division-sourceHeading', `${d.id}: grc division sourceHeading must be null, got ${JSON.stringify(d.sourceHeading)}`);
      }
    } else {
      if (d.sourceHeading !== null) {
        rubricCount += 1;
        if (typeof d.sourceHeading !== 'string' || d.sourceHeading.trim().length === 0) {
          err('division-sourceHeading', `${d.id}: sourceHeading must be a non-empty verbatim rubric or null, got ${JSON.stringify(d.sourceHeading)}`);
        }
      }
    }
    for (const p of d.passages) {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      if (typeof p.n !== 'string') err('passage-n-type', `${d.id}: passage n is not a string`);
      if (p.n !== '') err('passage-n', `${d.id}: passage n must be "" for ${spec.workId}, got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref must be null for ${spec.workId}, got ${JSON.stringify(p.ref)}`);
    }
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, heading: d.sourceHeading, passages: d.passages.length, chars });
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  if (spec.sourceHeadings === 'rubric-or-null' && rubricCount === 0) {
    warn('rubrics', 'no chapter carries a verbatim Latin rubric — the Latin sources print several (expected > 0)');
  }

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    if (s.includes('�')) leaks.push(`${where}: contains U+FFFD replacement character`);
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- editorial angle-bracket supplements (kept verbatim, must be flagged) ----
  const angleHits: string[] = [];
  walkTexts(divisions, (s, where) => {
    const m = s.match(fresh(ANGLE_SUPPLEMENT_RE));
    if (m) angleHits.push(`${where}: ${m.join(', ')}`);
  });
  if (angleHits.length) {
    warn('angle-supplement', `${angleHits.length} editorial angle-bracket supplement(s) preserved: ${angleHits.join('; ')}`);
    if (!anomalies.some((a) => /angle-bracket/i.test(a.note) || /supplement/i.test(a.note))) {
      err('angle-supplement', 'angle-bracket supplement present in text but not recorded in anomalies.json');
    }
  }

  // ---- editorial lacuna marks "<...>" (kept verbatim, must be flagged) ----
  const lacunaHits: string[] = [];
  walkTexts(divisions, (s, where) => {
    const m = s.match(fresh(LACUNA_RE));
    if (m) lacunaHits.push(`${where}: ${m.length}×`);
  });
  if (lacunaHits.length) {
    warn('lacuna-mark', `${lacunaHits.length} passage(s) carry the editorial lacuna mark "<...>": ${lacunaHits.join('; ')}`);
    if (!anomalies.some((a) => /lacuna/i.test(a.note))) {
      err('lacuna-mark', 'lacuna mark "<...>" present in text but not recorded in anomalies.json');
    }
  }

  // ---- refs must be documented in anomalies.json ----
  if (!anomalies.some((a) => /Bekker/i.test(a.note) && /chapter/i.test(a.note))) {
    err('ref-downgrade-note', 'anomalies.json must record the by-chapter reference scheme (no Bekker milestones in the source)');
  }

  // ---- spot check: incipit (NFC-insensitive) ----
  const p1 = divisions[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(spec.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `ch-1 passage[0] starts "${spec.spotStart}"`, ok: okStart, got: p1.slice(0, 60) });
  if (!okStart) err('spot-check', `ch-1 passage[0] does not start with ${JSON.stringify(spec.spotStart)} (got: ${JSON.stringify(p1.slice(0, 60))})`);

  // ---- spot check: explicit / no truncation (NFC-insensitive) ----
  const lastDiv = divisions[divisions.length - 1];
  const lastP = lastDiv?.passages[lastDiv.passages.length - 1]?.text ?? '';
  const endOk = lastP.normalize('NFC').endsWith(spec.spotEnd.normalize('NFC'));
  report.spotCheck.push({ label: `final chapter (${lastDiv?.id}) ends "${spec.spotEnd}"`, ok: endOk, got: lastP.slice(-60) });
  if (!endOk) {
    err(
      'spot-end',
      `final chapter last passage does not end with ${JSON.stringify(spec.spotEnd)} — possible truncation (got tail: ${JSON.stringify(lastP.slice(-60))})`,
    );
  }

  // ---- Unicode form: no decomposed combining marks (rules out NFD creeping in). ----
  let combiningHits = 0;
  const isCombiningCp = (cp: number): boolean =>
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f);
  const hasCombining = (s: string): boolean => {
    for (const ch of s) if (isCombiningCp(ch.codePointAt(0) ?? 0)) return true;
    return false;
  };
  walkTexts(divisions, (s) => {
    if (hasCombining(s)) combiningHits += 1;
  });
  if (combiningHits > 0) {
    err(
      'no-combining-marks',
      `${combiningHits} string(s) contain standalone combining diacritics — text must stay precomposed (no NFD)`,
    );
  }

  return report;
}

function writeReport(r: WorkReport, all: WorkReport[]): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Aristotle validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions: ${r.divisionCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- ref scheme: ${r.refScheme}`);
  L.push('');
  L.push('## Per-division passage counts');
  L.push('');
  L.push('| # | id | number | sourceHeading | passages | chars |');
  L.push('|---|----|--------|---------------|----------|-------|');
  r.perDivision.forEach((d, i) => {
    L.push(`| ${i} | ${d.id} | ${d.number ?? '-'} | ${d.heading ? d.heading.replace(/\|/g, '\\|') : '-'} | ${d.passages} | ${d.chars} |`);
  });
  L.push('');
  for (const sib of all) {
    if (sib.workId === r.workId) continue;
    const idsMatch =
      JSON.stringify(r.perDivision.map((d) => d.id)) === JSON.stringify(sib.perDivision.map((d) => d.id));
    L.push(`Companion work \`${sib.workId}\`: ${sib.divisionCount} divisions / ${sib.passageCount} passages; division id sets ${idsMatch ? 'MATCH 1:1' : 'DIFFER'}.`);
  }
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
  const reports = WORKS.map(validateWork);
  for (const r of reports) writeReport(r, reports);

  // cross-work: each grc/la pair must share its division id sequence.
  for (const family of ['categoriae', 'de-interpretatione'] as const) {
    const grc = reports.find((r) => r.workId === `${family}-grc`);
    const la = reports.find((r) => r.workId === `${family}-la`);
    if (grc && la) {
      const same =
        JSON.stringify(grc.perDivision.map((d) => d.id)) === JSON.stringify(la.perDivision.map((d) => d.id));
      if (!same) {
        const msg = `${family}: grc and la division id sequences differ (must be identical — shared chapter table)`;
        grc.findings.push({ level: 'ERROR', check: 'cross-work-ids', message: msg });
        la.findings.push({ level: 'ERROR', check: 'cross-work-ids', message: msg });
      }
    }
  }
  for (const r of reports) writeReport(r, reports);

  const all = reports.flatMap((r) => r.findings.map((f) => ({ w: r.workId, ...f })));
  process.stdout.write('\n=== validate:aristotle ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  for (const r of reports) {
    process.stdout.write(
      `  ${r.workId.padEnd(24)} ${String(r.divisionCount).padStart(2)} divisions / ` +
        `${String(r.passageCount).padStart(3)} passages / ${String(r.totalChars).padStart(6)} chars  ` +
        `-> ${join(r.dir, 'VALIDATION_REPORT.md')}\n`,
    );
  }
  if (errors.length > 0) process.exit(1);
}

main();
