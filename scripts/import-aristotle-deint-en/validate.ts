/**
 * Validation for data/de-interpretatione-en/ (Aristotle, De Interpretatione,
 * trans. Edghill, 1928 — English Wikisource). Mirrors
 * scripts/import-aristotle-categoriae-en/validate.ts (its English sibling),
 * adapted for this edition's two flattened tables (ch. 12-13) and three
 * unreproduced diagrams (ch. 10).
 *
 *   npm run validate:aristotle-deint-en
 *
 * Writes data/de-interpretatione-en/VALIDATION_REPORT.md, prints a summary,
 * and exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DE_INTERPRETATIONE_CHAPTERS } from '../import-aristotle-shared/chapters.ts';
import type { Division, GenericWork } from '../../data/de-interpretatione-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'de-interpretatione-en');

const WORK_ID = 'de-interpretatione-en';
const EXPECTED_CHAPTERS = 14;
const EXPECTED_FIGURE_PASSAGES = 3;
/** Verbatim head of chapter 1's first passage. */
const SPOT_START = "First we must define the terms 'noun' and 'verb', then the terms 'denial' and 'affirmation', then 'proposition' and 'sentence'.";
/** Verbatim tail of chapter 14's last passage — guards against truncation. */
const SPOT_END = 'contrary conditions cannot subsist at one and the same time in the same subject.';
const BEKKER_RE = /^Bekker (\d+[ab]\d+)–(\d+[ab]\d+)$/;
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]', '<ref', '</ref', 'http://', 'https://',
  'xmlns', '<p>', '</p>', '<div', '<span', '<table', '<figure', '<style', '<link', 'wst-',
  'Chapter_', 'cite_note', 'cite-bracket',
];

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

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
}

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, { divisionCount: 0, passageCount: 0, totalChars: 0, perDivision: [], anomalies: [], spotCheck: [] });
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${WORK_ID}`);
  if (work.language !== 'en') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "en"`);
  if (about['translator'] !== 'Ella Mary Edghill') err('translator', `about.json translator must be "Ella Mary Edghill", got ${JSON.stringify(about['translator'])}`);
  if (about['editor'] !== 'William David Ross') err('editor', `about.json editor must be "William David Ross", got ${JSON.stringify(about['editor'])}`);

  const divisions = work.divisions ?? [];
  if (divisions.length !== EXPECTED_CHAPTERS) err('division-count', `expected ${EXPECTED_CHAPTERS} divisions, got ${divisions.length}`);

  const ids = divisions.map((d) => d.id);
  const wantIds = DE_INTERPRETATIONE_CHAPTERS.map((c) => c.id);
  if (ids.length !== wantIds.length || ids.some((id, i) => id !== wantIds[i])) {
    err('division-ids', `division id sequence does not match the shared chapter table:\n  got: ${ids.join(', ')}\n  want: ${wantIds.join(', ')}`);
  }
  divisions.forEach((d, i) => {
    const meta = DE_INTERPRETATIONE_CHAPTERS[i];
    if (!meta) return;
    if (d.number !== meta.number) err('division-number', `${d.id}: number ${JSON.stringify(d.number)} != ${JSON.stringify(meta.number)}`);
    if (d.editorialTitle !== meta.en) err('division-editorialTitle', `${d.id}: editorialTitle ${JSON.stringify(d.editorialTitle)} != ${JSON.stringify(meta.en)}`);
    if (!Array.isArray(d.children) || d.children.length !== 0) err('division-children', `${d.id}: children must be [], got ${JSON.stringify(d.children)}`);
    if (d.sourceHeading !== null) err('division-sourceHeading', `${d.id}: sourceHeading must be null (this translation prints no chapter rubric), got ${JSON.stringify(d.sourceHeading)}`);
    if (typeof d.ref !== 'string' || !BEKKER_RE.test(d.ref)) {
      err('division-ref', `${d.id}: ref must be "Bekker <start>–<end>", got ${JSON.stringify(d.ref)}`);
    }
  });
  const refPairs = divisions.map((d) => {
    const m = BEKKER_RE.exec(d.ref ?? '');
    return m ? { start: m[1]!, end: m[2]! } : null;
  });
  for (let i = 1; i < refPairs.length; i++) {
    const prev = refPairs[i - 1];
    const cur = refPairs[i];
    if (prev && cur && prev.end !== cur.start) {
      err('ref-chain', `${divisions[i]!.id}: Bekker start ${JSON.stringify(cur.start)} does not chain from chapter ${i}'s end ${JSON.stringify(prev.end)}`);
    }
  }

  let passageCount = 0;
  let totalChars = 0;
  let figurePassages = 0;
  const perDivision: { id: string; number: string | null; ref: string | null; passages: number; chars: number }[] = [];
  for (const d of divisions) {
    let chars = 0;
    for (const p of d.passages) {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      if (p.n !== '') err('passage-n', `${d.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      if (p.figure !== undefined) {
        figurePassages += 1;
        if (p.figure.image !== undefined) err('figure-image', `${d.id}: this work's figures are honest no-image markers - unexpected Passage.figure.image`);
        if (!p.figure.source || !p.figure.note) err('figure-shape', `${d.id}: Passage.figure must carry both source and note`);
        if (!anomalies.some((a) => /figure|diagram/i.test(a.note))) err('figure-note', `${d.id}: carries a figure but no anomaly documents unreproduced diagrams`);
      }
    }
    totalChars += chars;
    perDivision.push({ id: d.id, number: d.number, ref: d.ref, passages: d.passages.length, chars });
  }
  if (figurePassages !== EXPECTED_FIGURE_PASSAGES) {
    err('figure-count', `expected exactly ${EXPECTED_FIGURE_PASSAGES} passages carrying a figure marker, found ${figurePassages}`);
  }

  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    if (s.includes('​')) leaks.push(`${where}: contains U+200B zero-width space`);
    if (s.includes('�')) leaks.push(`${where}: contains U+FFFD replacement character`);
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  if (!anomalies.some((a) => /Bekker/i.test(a.note) && /chapter/i.test(a.note))) {
    err('ref-scheme-note', 'anomalies.json must record the Bekker reference-reconstruction scheme');
  }
  if (!anomalies.some((a) => /footnote/i.test(a.note))) {
    err('footnote-note', 'anomalies.json must record the inline footnote markers stripped');
  }
  if (!anomalies.some((a) => /table/i.test(a.note))) {
    err('table-note', 'anomalies.json must record the two flattened "square of opposition" tables');
  }

  const spotCheck: { label: string; ok: boolean; got: string }[] = [];
  const p1 = divisions[0]?.passages[0]?.text ?? '';
  const okStart = p1.startsWith(SPOT_START);
  spotCheck.push({ label: `ch-1 passage[0] starts "${SPOT_START.slice(0, 50)}..."`, ok: okStart, got: p1.slice(0, 80) });
  if (!okStart) err('spot-check', `ch-1 passage[0] does not start with the expected incipit (got: ${JSON.stringify(p1.slice(0, 80))})`);

  const lastDiv = divisions[divisions.length - 1];
  const lastP = lastDiv?.passages[lastDiv.passages.length - 1]?.text ?? '';
  const okEnd = lastP.endsWith(SPOT_END);
  spotCheck.push({ label: `final chapter (${lastDiv?.id}) ends "...${SPOT_END.slice(-50)}"`, ok: okEnd, got: lastP.slice(-80) });
  if (!okEnd) err('spot-end', `final chapter last passage does not end with the expected explicit — possible truncation (got tail: ${JSON.stringify(lastP.slice(-80))})`);

  if (anomalies.length < 5) warn('anomalies-low', `expected several recorded anomalies (markers, tables, figures) - found only ${anomalies.length}`);

  writeReport(findings, { divisionCount: divisions.length, passageCount, totalChars, perDivision, anomalies, spotCheck });

  process.stdout.write('\n=== validate:aristotle-deint-en ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${WORK_ID}: ${divisions.length} divisions / ${passageCount} passages / ${totalChars} chars -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  data: {
    divisionCount: number;
    passageCount: number;
    totalChars: number;
    perDivision: { id: string; number: string | null; ref: string | null; passages: number; chars: number }[];
    anomalies: Anomaly[];
    spotCheck: { label: string; ok: boolean; got: string }[];
  },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# de-interpretatione-en validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions: ${data.divisionCount}`);
  L.push(`- passages: ${data.passageCount}`);
  L.push(`- total passage chars: ${data.totalChars}`);
  L.push('');
  L.push('## Per-division');
  L.push('');
  L.push('| # | id | number | ref | passages | chars |');
  L.push('|---|----|--------|-----|----------|-------|');
  data.perDivision.forEach((d, i) => {
    L.push(`| ${i} | ${d.id} | ${d.number ?? '-'} | ${d.ref ?? '-'} | ${d.passages} | ${d.chars} |`);
  });
  L.push('');
  L.push('## Verbatim spot-check');
  L.push('');
  for (const s of data.spotCheck) L.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got}\``);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (data.anomalies.length === 0) L.push('_none_');
  for (const a of data.anomalies) L.push(`- **${a.where}** - ${a.note}`);
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
