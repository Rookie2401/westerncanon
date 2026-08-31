/**
 * Validation for BOTH generated Isagoge corpora.
 *
 *   npm run validate:isagoge
 *
 * Writes data/isagoge-grc/VALIDATION_REPORT.md and
 * data/isagoge-la/VALIDATION_REPORT.md, prints a summary, and exits non-zero if
 * any ERROR-level check fails in either work. WARN-level findings (preserved
 * source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_SECTION_IDS, SECTIONS } from './sections.ts';
import type { Division, GenericWork } from '../../data/isagoge-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const GRC_DIR = join(REPO_ROOT, 'data', 'isagoge-grc');
const LA_DIR = join(REPO_ROOT, 'data', 'isagoge-la');

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
const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<ref', '</ref', 'http://', 'https://', 'xmlns', '</p>', '<div', '<note', '<lb ', '<pb '];

/** apparatus-criticus / editorial-metadata tokens that must never reach the reading flow */
const APPARATUS_MARKERS = ['Brand.', 'superscr', 'in ras.', ' codd.', 'colloc.', 'TextQuality', '{{titulus'];

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
  droppedApparatus: number | null;
  brandisNotes: number | null;
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function validateWork(opts: {
  workId: string;
  dir: string;
  expectLang: 'grc' | 'la';
  refExpectation: 'busse-page' | 'null';
  spotStart: string;
  /** verbatim tail of the final division's last passage — guards against truncation */
  spotEnd: string;
  /** exact division count expected (praefatio + numbered capitula) */
  expectDivisions: number;
}): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(opts.dir, f))) err('presence', `missing ${f} - run the importer`);
  }

  const report: WorkReport = {
    workId: opts.workId,
    dir: opts.dir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
    refScheme: '',
    droppedApparatus: null,
    brandisNotes: null,
    spotCheck: [],
  };
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(opts.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(opts.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(opts.dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['translator'] !== undefined && about['translator'] !== 'Boethius') {
    err('translator-spelling', `about.json translator is ${JSON.stringify(about['translator'])}, must be exactly "Boethius"`);
  }

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  // ---- division count (praefatio + 26 numbered capitula) ----
  if (divisions.length !== opts.expectDivisions) {
    err('division-count', `expected exactly ${opts.expectDivisions} divisions, got ${divisions.length}`);
  }

  // ---- division id set + order ----
  const ids = divisions.map((d) => d.id);
  if (ids.length !== ALL_SECTION_IDS.length || ids.some((id, i) => id !== ALL_SECTION_IDS[i])) {
    err('division-ids', `division id sequence does not match the canonical 27-entry table:\n  got: ${ids.join(', ')}`);
  }
  // number / editorialTitle from the shared table
  divisions.forEach((d, i) => {
    const meta = SECTIONS[i];
    if (!meta) return;
    if (d.number !== meta.number) err('division-number', `${d.id}: number ${JSON.stringify(d.number)} != canonical ${JSON.stringify(meta.number)}`);
    if (d.editorialTitle !== meta.en) err('division-editorialTitle', `${d.id}: editorialTitle ${JSON.stringify(d.editorialTitle)} != canonical ${JSON.stringify(meta.en)}`);
    if (d.children.length !== 0) warn('division-children', `${d.id}: expected no children, got ${d.children.length}`);
  });

  // ---- preface ----
  const preface = divisions[0];
  if (!preface || preface.id !== 'praefatio') {
    err('preface', 'first division is not the praefatio');
  } else {
    if (preface.sourceHeading !== null) warn('preface', 'praefatio sourceHeading should be null');
    if (preface.number !== null) err('preface', 'praefatio number should be null');
    if (preface.passages.length === 0) err('preface', 'praefatio has no passages');
  }

  // ---- passages ----
  let passageCount = 0;
  let totalChars = 0;
  for (const d of divisions) {
    let chars = 0;
    for (const p of d.passages) {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) {
        err('empty-passage', `${d.id}: a passage has empty text`);
      }
      if (typeof p.n !== 'string') err('passage-n', `${d.id}: passage n is not a string`);
      // ref expectation
      if (opts.refExpectation === 'null') {
        if (p.ref !== null) err('passage-ref', `${d.id}: passage ref should be null for ${opts.workId}, got ${JSON.stringify(p.ref)}`);
      } else {
        if (typeof p.ref !== 'string' || !/^Busse (p\.|pp\.) /.test(p.ref)) {
          err('passage-ref', `${d.id}: passage ref ${JSON.stringify(p.ref)} is not a "Busse p. N" ref`);
        }
      }
    }
    totalChars += chars;
    report.perDivision.push({
      id: d.id,
      number: d.number,
      heading: d.sourceHeading,
      passages: d.passages.length,
      chars,
    });
    // division ref expectation
    if (opts.refExpectation === 'null') {
      if (d.ref !== null) err('division-ref', `${d.id}: division ref should be null for ${opts.workId}`);
    } else if (d.id !== 'praefatio' || d.ref !== null) {
      if (typeof d.ref !== 'string' || !/^Busse (p\.|pp\.) /.test(d.ref)) {
        err('division-ref', `${d.id}: division ref ${JSON.stringify(d.ref)} is not a Busse page span`);
      }
    }
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of [...LEAK_MARKERS, ...APPARATUS_MARKERS]) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- Unicode form: polytonic Greek must stay precomposed (no NFD) ----
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
    err('no-combining-marks', `${combiningHits} string(s) contain standalone combining diacritics (expected precomposed characters, no NFD)`);
  }

  // ---- editorial angle-bracket supplements (WARN, must have an anomaly) ----
  const angleHits: string[] = [];
  walkTexts(divisions, (s, where) => {
    const m = s.match(/<[a-zA-Z]+>/g);
    if (m) angleHits.push(`${where}: ${m.join(', ')}`);
  });
  if (angleHits.length) {
    warn('angle-supplement', `${angleHits.length} editorial angle-bracket supplement(s) preserved: ${angleHits.join('; ')}`);
    if (!anomalies.some((a) => /angle-bracket/i.test(a.note))) {
      err('angle-supplement', 'angle-bracket supplement present in text but not recorded in anomalies.json');
    }
  }

  // ---- spot check ----
  // Compare in NFC so a decomposed vs precomposed accent in the source
  // transcription is not mistaken for altered text. The stored `text` itself is
  // left byte-verbatim; only this equality test is normalisation-insensitive.
  const p1 = preface?.passages[0]?.text ?? '';
  const ok = p1.normalize('NFC').startsWith(opts.spotStart.normalize('NFC'));
  report.spotCheck.push({ label: `praefatio passage 1 starts "${opts.spotStart}"`, ok, got: p1.slice(0, 60) });
  if (!ok) err('spot-check', `praefatio passage 1 does not start with ${JSON.stringify(opts.spotStart)} (got: ${JSON.stringify(p1.slice(0, 60))})`);

  // ---- explicit / no truncation: final division's last passage tail ----
  const lastDiv = divisions[divisions.length - 1];
  const lastP = lastDiv?.passages[lastDiv.passages.length - 1]?.text ?? '';
  const endOk = lastP.normalize('NFC').endsWith(opts.spotEnd.normalize('NFC'));
  report.spotCheck.push({ label: `final division (${lastDiv?.id}) ends "${opts.spotEnd}"`, ok: endOk, got: lastP.slice(-60) });
  if (!endOk) {
    err('spot-end', `final division last passage does not end with ${JSON.stringify(opts.spotEnd)} — possible truncation (got tail: ${JSON.stringify(lastP.slice(-60))})`);
  }

  // ---- ref scheme note + grc-specific accounting ----
  if (opts.refExpectation === 'null') {
    report.refScheme = "section (division number + paragraph number); no Busse/line numbers in source, all ref fields null";
  } else {
    report.refScheme = 'Busse PAGE level only (per-line refs downgraded: source <lb> markers are duplicated / non-monotonic)';
    const apparatus = anomalies.find((a) => /apparatus-criticus notes were dropped/i.test(a.note));
    const brandis = anomalies.find((a) => /Brandis pagination/i.test(a.note));
    report.droppedApparatus = apparatus ? Number(apparatus.note.match(/^(\d+)/)?.[1] ?? 'NaN') : null;
    report.brandisNotes = brandis ? Number(brandis.note.match(/^(\d+)/)?.[1] ?? 'NaN') : null;
    if (report.droppedApparatus == null) err('apparatus-count', 'anomalies.json has no dropped-apparatus count for the Greek work');
    if (report.brandisNotes == null) err('brandis-note', 'anomalies.json has no Brandis marginal-note count for the Greek work');
  }

  return report;
}

function writeReport(r: WorkReport, sibling: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Isagoge validation report - ${r.workId}`);
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
  if (r.droppedApparatus != null) L.push(`- apparatus footnotes dropped from reading text: ${r.droppedApparatus}`);
  if (r.brandisNotes != null) L.push(`- Brandis marginal notes stripped from reading text: ${r.brandisNotes}`);
  L.push('');
  L.push('## Per-division passage counts');
  L.push('');
  L.push('| # | id | number | sourceHeading | passages | chars |');
  L.push('|---|----|--------|---------------|----------|-------|');
  r.perDivision.forEach((d, i) => {
    L.push(`| ${i} | ${d.id} | ${d.number ?? '-'} | ${d.heading ? d.heading.replace(/\|/g, '\\|') : '-'} | ${d.passages} | ${d.chars} |`);
  });
  L.push('');
  L.push(`Sibling work \`${sibling.workId}\` has ${sibling.divisionCount} divisions / ${sibling.passageCount} passages; ` +
    `division id sets ${JSON.stringify(r.perDivision.map((d) => d.id)) === JSON.stringify(sibling.perDivision.map((d) => d.id)) ? 'MATCH 1:1' : 'DO NOT MATCH'}.`);
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
  const grc = validateWork({
    workId: 'isagoge-grc',
    dir: GRC_DIR,
    expectLang: 'grc',
    refExpectation: 'busse-page',
    spotStart: 'Ὄντος ἀναγκαίου, Χρυσαόριε,',
    // Isagoge, closing sentence (Busse p. 22).
    spotEnd: 'ἀλλ᾿ ἐξαρκοῦσι καὶ αὗται εἰς διάκρισίν τε αὐτῶν καὶ τῆς κοινωνίας παράστασιν.',
    expectDivisions: 27,
  });
  const la = validateWork({
    workId: 'isagoge-la',
    dir: LA_DIR,
    expectLang: 'la',
    refExpectation: 'null',
    spotStart: 'Cum sit necessarium, Chrysaori,',
    // Boethius' translation, closing sentence.
    spotEnd: 'sed sufficiunt etiam, haec ad discretionem eorum communitatisque traditionem.',
    expectDivisions: 27,
  });

  // cross-work: the grc and la division id sequences currently align 1:1 (both
  // follow praefatio + 26 capitula). This is a convenience, not a requirement —
  // the reader handles independent division trees — so a mismatch is a WARNING.
  const grcIds = grc.perDivision.map((d) => d.id);
  const laIds = la.perDivision.map((d) => d.id);
  if (JSON.stringify(grcIds) !== JSON.stringify(laIds)) {
    const msg = 'grc and la division id sequences differ (allowed: the two editions may divide independently)';
    grc.findings.push({ level: 'WARN', check: 'cross-work-ids', message: msg });
    la.findings.push({ level: 'WARN', check: 'cross-work-ids', message: msg });
  }

  writeReport(grc, la);
  writeReport(la, grc);

  const all = [...grc.findings.map((f) => ({ w: 'grc', ...f })), ...la.findings.map((f) => ({ w: 'la', ...f }))];
  process.stdout.write('\n=== validate:isagoge ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Reports: ${join(GRC_DIR, 'VALIDATION_REPORT.md')}\n` +
      `         ${join(LA_DIR, 'VALIDATION_REPORT.md')}\n`,
  );
  process.stdout.write(
    `\ngrc: ${grc.divisionCount} divisions / ${grc.passageCount} passages / ${grc.totalChars} chars\n` +
      `la : ${la.divisionCount} divisions / ${la.passageCount} passages / ${la.totalChars} chars\n`,
  );
  if (errors.length > 0) process.exit(1);
}

main();
