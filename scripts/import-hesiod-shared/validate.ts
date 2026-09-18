/**
 * Validation for the six generated Hesiod corpora:
 *   data/theogony-grc/            data/theogony-en/
 *   data/works-and-days-grc/      data/works-and-days-en/
 *   data/shield-of-heracles-grc/  data/shield-of-heracles-en/
 *
 *   npx tsx scripts/import-hesiod-shared/validate.ts
 *
 * Writes data/<id>/VALIDATION_REPORT.md for each work, prints a summary, and
 * exits non-zero if any ERROR-level check fails in any work. WARN-level
 * findings do not fail the run.
 *
 * Mirrors scripts/import-aristotle-shared/validate.ts.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHIELD_CARD_BOUNDARIES,
  SHIELD_FINAL_LINE,
  THEOGONY_CARD_BOUNDARIES,
  THEOGONY_FINAL_LINE,
  WORKS_AND_DAYS_CARD_BOUNDARIES,
  WORKS_AND_DAYS_FINAL_LINE,
} from './cardBoundaries.ts';
import type { Anomaly, Division, GenericWork } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA = join(REPO_ROOT, 'data');

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

/** substrings that indicate leaked transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<div', '<p>', '</p>', '<l ', '<l>', '</l>', '<lb', '<pb',
  '<note', '<del', '</del>', '<add', '</add>', '<gap', '<sp>', '</sp>', '<milestone', '<placeName', '</placeName>',
  '<foreign', '<hi ', 'http://', 'https://', 'xmlns',
];

interface WorkSpec {
  workId: string;
  language: 'grc' | 'en';
  boundaries: readonly number[];
  finalLine: number;
  /** Verbatim head of card 1's passage. */
  spotStart: string;
  /** Verbatim tail of the final card's passage - guards against truncation. */
  spotEnd: string;
}

const WORKS: WorkSpec[] = [
  {
    workId: 'theogony-grc',
    language: 'grc',
    boundaries: THEOGONY_CARD_BOUNDARIES,
    finalLine: THEOGONY_FINAL_LINE,
    spotStart: 'Μουσάων Ἑλικωνιάδων ἀρχώμεθʼ ἀείδειν',
    spotEnd: 'Μοῦσαι Ὀλυμπιάδες, κοῦραι Διὸς αἰγιόχοιο.',
  },
  {
    workId: 'theogony-en',
    language: 'en',
    boundaries: THEOGONY_CARD_BOUNDARIES,
    finalLine: THEOGONY_FINAL_LINE,
    spotStart: 'From the Heliconian Muses let us begin to sing',
    spotEnd: 'sing of the company of women.',
  },
  {
    workId: 'works-and-days-grc',
    language: 'grc',
    boundaries: WORKS_AND_DAYS_CARD_BOUNDARIES,
    finalLine: WORKS_AND_DAYS_FINAL_LINE,
    spotStart: 'μοῦσαι Πιερίηθεν ἀοιδῇσιν κλείουσαι',
    spotEnd: 'ὄρνιθας κρίνων καὶ ὑπερβασίας ἀλεείνων.',
  },
  {
    workId: 'works-and-days-en',
    language: 'en',
    boundaries: WORKS_AND_DAYS_CARD_BOUNDARIES,
    finalLine: WORKS_AND_DAYS_FINAL_LINE,
    spotStart: 'Muses of Pieria who give glory through song',
    spotEnd: 'who discerns the omens of birds and avoids transgression.',
  },
  {
    workId: 'shield-of-heracles-grc',
    language: 'grc',
    boundaries: SHIELD_CARD_BOUNDARIES,
    finalLine: SHIELD_FINAL_LINE,
    spotStart: 'ἢ οἵη προλιποῦσα δόμους καὶ πατρίδα γαῖαν',
    spotEnd: 'ὅστις ἄγοι Πυθοῖδε βίῃ σύλασκε δοκεύων.',
  },
  {
    workId: 'shield-of-heracles-en',
    language: 'en',
    boundaries: SHIELD_CARD_BOUNDARIES,
    finalLine: SHIELD_FINAL_LINE,
    spotStart: 'Or like her who left home and country and came to Thebes',
    spotEnd: 'that any might bring to Phyto.',
  },
];

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; ref: string | null; chars: number }[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
  }
}

function validateWork(spec: WorkSpec): WorkReport {
  const dir = join(DATA, spec.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });

  const report: WorkReport = {
    workId: spec.workId,
    dir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
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
  if (about['author'] !== 'Hesiod') err('author', `about.json author must be "Hesiod", got ${JSON.stringify(about['author'])}`);
  if (spec.language === 'en') {
    if (about['translator'] !== 'Hugh G. Evelyn-White') {
      err('translator', `about.json translator must be "Hugh G. Evelyn-White" for the English work, got ${JSON.stringify(about['translator'])}`);
    }
  } else if (about['translator'] !== undefined) {
    err('translator', `about.json must not carry a translator for the Greek work, got ${JSON.stringify(about['translator'])}`);
  }

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  // ---- division count ----
  if (divisions.length !== spec.boundaries.length) {
    err('division-count', `expected ${spec.boundaries.length} divisions (cards), got ${divisions.length}`);
  }

  // ---- division id / number / ref / shape ----
  divisions.forEach((d, i) => {
    const wantId = `sec-${i + 1}`;
    if (d.id !== wantId) err('division-id', `division[${i}] id is ${JSON.stringify(d.id)}, expected ${JSON.stringify(wantId)}`);
    if (d.number !== String(i + 1)) err('division-number', `${d.id}: number ${JSON.stringify(d.number)} != ${JSON.stringify(String(i + 1))}`);
    if (d.sourceHeading !== null) err('division-sourceHeading', `${d.id}: sourceHeading must be null, got ${JSON.stringify(d.sourceHeading)}`);
    if (d.editorialTitle !== null) err('division-editorialTitle', `${d.id}: editorialTitle must be null, got ${JSON.stringify(d.editorialTitle)}`);
    if (!Array.isArray(d.children) || d.children.length !== 0) err('division-children', `${d.id}: children must be [], got ${JSON.stringify(d.children)}`);
    if (!Array.isArray(d.passages) || d.passages.length !== 1) err('division-passages', `${d.id}: expected exactly 1 passage, got ${d.passages?.length}`);
    const startLine = spec.boundaries[i];
    const endLine = i + 1 < spec.boundaries.length ? spec.boundaries[i + 1]! - 1 : spec.finalLine;
    const wantRef = startLine !== undefined ? `${startLine}–${endLine}` : null;
    if (d.ref !== wantRef) err('division-ref', `${d.id}: ref ${JSON.stringify(d.ref)} != expected ${JSON.stringify(wantRef)}`);
  });

  // ---- passages ----
  let passageCount = 0;
  let totalChars = 0;
  for (const d of divisions) {
    let chars = 0;
    for (const p of d.passages ?? []) {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      if (typeof p.n !== 'string') err('passage-n-type', `${d.id}: passage n is not a string`);
      if (p.n !== '') err('passage-n', `${d.id}: passage n must be "" for ${spec.workId}, got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref must be null for ${spec.workId}, got ${JSON.stringify(p.ref)}`);
    }
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, ref: d.ref, chars });
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    if (s.includes('�')) leaks.push(`${where}: contains U+FFFD replacement character`);
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

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
    err('no-combining-marks', `${combiningHits} string(s) contain standalone combining diacritics - text must stay precomposed (no NFD)`);
  }

  // ---- spot check: incipit (NFC-insensitive) ----
  const p1 = divisions[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(spec.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `card 1 starts "${spec.spotStart}"`, ok: okStart, got: p1.slice(0, 60) });
  if (!okStart) err('spot-check', `card 1 does not start with ${JSON.stringify(spec.spotStart)} (got: ${JSON.stringify(p1.slice(0, 60))})`);

  // ---- spot check: explicit / no truncation ----
  const lastDiv = divisions[divisions.length - 1];
  const lastP = lastDiv?.passages[lastDiv.passages.length - 1]?.text ?? '';
  const endOk = lastP.normalize('NFC').endsWith(spec.spotEnd.normalize('NFC'));
  report.spotCheck.push({ label: `final card (${lastDiv?.id}) ends "${spec.spotEnd}"`, ok: endOk, got: lastP.slice(-60) });
  if (!endOk) {
    err('spot-end', `final card last passage does not end with ${JSON.stringify(spec.spotEnd)} - possible truncation (got tail: ${JSON.stringify(lastP.slice(-60))})`);
  }

  return report;
}

function writeReport(r: WorkReport, all: WorkReport[]): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Hesiod validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions (cards): ${r.divisionCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Per-division passage counts');
  L.push('');
  L.push('| # | id | number | ref | chars |');
  L.push('|---|----|--------|-----|-------|');
  r.perDivision.forEach((d, i) => {
    L.push(`| ${i} | ${d.id} | ${d.number ?? '-'} | ${d.ref ?? '-'} | ${d.chars} |`);
  });
  L.push('');
  for (const sib of all) {
    if (sib.workId === r.workId) continue;
    const sameFamily = sib.workId.replace(/-(grc|en)$/, '') === r.workId.replace(/-(grc|en)$/, '');
    if (!sameFamily) continue;
    const idsMatch = JSON.stringify(r.perDivision.map((d) => d.id)) === JSON.stringify(sib.perDivision.map((d) => d.id));
    const refsMatch = JSON.stringify(r.perDivision.map((d) => d.ref)) === JSON.stringify(sib.perDivision.map((d) => d.ref));
    L.push(`Companion work \`${sib.workId}\`: ${sib.divisionCount} divisions / ${sib.passageCount} passages; division id sets ${idsMatch ? 'MATCH 1:1' : 'DIFFER'}; ref (card line-range) sets ${refsMatch ? 'MATCH 1:1' : 'DIFFER'}.`);
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

  // cross-work: each grc/en pair must share its division id sequence AND ref (line-range) sequence.
  for (const family of ['theogony', 'works-and-days', 'shield-of-heracles'] as const) {
    const grc = reports.find((r) => r.workId === `${family}-grc`);
    const en = reports.find((r) => r.workId === `${family}-en`);
    if (grc && en) {
      const idsSame = JSON.stringify(grc.perDivision.map((d) => d.id)) === JSON.stringify(en.perDivision.map((d) => d.id));
      const refsSame = JSON.stringify(grc.perDivision.map((d) => d.ref)) === JSON.stringify(en.perDivision.map((d) => d.ref));
      if (!idsSame) {
        const msg = `${family}: grc and en division id sequences differ (must be identical - shared card boundary table)`;
        grc.findings.push({ level: 'ERROR', check: 'cross-work-ids', message: msg });
        en.findings.push({ level: 'ERROR', check: 'cross-work-ids', message: msg });
      }
      if (!refsSame) {
        const msg = `${family}: grc and en division ref (line-range) sequences differ (the two witnesses' cards must cover identical line spans)`;
        grc.findings.push({ level: 'ERROR', check: 'cross-work-refs', message: msg });
        en.findings.push({ level: 'ERROR', check: 'cross-work-refs', message: msg });
      }
    }
  }

  for (const r of reports) writeReport(r, reports);

  const all = reports.flatMap((r) => r.findings.map((f) => ({ w: r.workId, ...f })));
  process.stdout.write('\n=== validate:hesiod ===\n');
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
