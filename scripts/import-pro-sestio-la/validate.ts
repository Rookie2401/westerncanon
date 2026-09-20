/**
 * Validation for data/pro-sestio-la/.
 *
 *   npx tsx scripts/import-pro-sestio-la/validate.ts
 *
 * Writes data/pro-sestio-la/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings
 * (documented source irregularities) do not fail the run.
 *
 * Standalone (mirrors scripts/import-aristotle-physics-grc/validate.ts):
 * this work's flat, single-tier section shape (no Book/Chapter tree, refs
 * built from coarser chapter milestones) doesn't match the shared
 * chapters-only validator used by the Categories/De Interpretatione Latin
 * imports, so a small dedicated validator is clearer.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/pro-sestio-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'pro-sestio-la');
const WORK_ID = 'pro-sestio-la';
const EXPECTED_SECTIONS = 147;
const EXPECTED_CHAPTERS = 69;
const SPOT_START = 'si quis antea, iudices, mirabatur quid esset quod, pro tantis opibus';
const SPOT_END = 'eos conservetis per quos me reciperavistis.';

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
  '&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&nbsp;',
  '<p>', '<p ', '</p>', '<div', '</div>', '<note', '<milestone', '<del', '</del>',
  '<add', '</add>', '<reg', '</reg>', '<choice', '</choice>', '<abbr', '</abbr>',
  '<expan', '</expan>', '<quote', '</quote>', '<l>', '<l ', '</l>', '<q>', '<q ',
  '</q>', '<num', '</num>', '<head>', '</head>', 'xmlns',
];

function fresh(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags);
}
const ENTITY_RE = /&[a-zA-Z]+;|&#x?[0-9a-fA-F]+;/;

function findings(): { findings: Finding[]; report: string[] } {
  const F: Finding[] = [];
  const err = (check: string, m: string) => F.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => F.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (F.some((f) => f.level === 'ERROR')) return { findings: F, report: [] };

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${WORK_ID}`);
  if (work.language !== 'la') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "la"`);
  if (about['translator'] !== undefined) err('translator', `about.json must not carry a translator for this Latin-only work, got ${JSON.stringify(about['translator'])}`);

  const sections = work.divisions ?? [];
  if (sections.length !== EXPECTED_SECTIONS) err('section-count', `expected ${EXPECTED_SECTIONS} sections, got ${sections.length}`);

  let totalChars = 0;
  const leaks: string[] = [];
  const refsSeen: (string | null)[] = [];
  const sectionRows: string[] = [];

  const visit = (s: string, where: string) => {
    for (const marker of LEAK_MARKERS) if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    if (fresh(ENTITY_RE).test(s)) leaks.push(`${where}: contains an HTML/XML entity`);
    if (s.includes('�')) leaks.push(`${where}: contains U+FFFD replacement character`);
  };

  sections.forEach((s: Division, i: number) => {
    const expectedId = `sec-${i + 1}`;
    if (s.id !== expectedId) err('section-id', `section[${i}].id is ${JSON.stringify(s.id)}, expected ${JSON.stringify(expectedId)}`);
    if (s.number !== String(i + 1)) err('section-number', `${s.id}: number ${JSON.stringify(s.number)} != ${JSON.stringify(String(i + 1))}`);
    if (s.sourceHeading !== null) err('section-sourceHeading', `${s.id}: sourceHeading must be null, got ${JSON.stringify(s.sourceHeading)}`);
    if (s.editorialTitle !== null) err('section-editorialTitle', `${s.id}: editorialTitle must be null, got ${JSON.stringify(s.editorialTitle)}`);
    if (!Array.isArray(s.children) || s.children.length !== 0) err('section-children', `${s.id}: children must be [], got ${JSON.stringify(s.children)}`);
    if (!Array.isArray(s.passages) || s.passages.length !== 1) {
      err('section-passages', `${s.id}: expected exactly 1 passage, got ${Array.isArray(s.passages) ? s.passages.length : typeof s.passages}`);
    }

    if (i === 0) {
      if (s.ref !== null) err('sec-1-ref', `sec-1: ref must be null (documented: no chapter milestone precedes it), got ${JSON.stringify(s.ref)}`);
    } else if (s.ref !== null && (typeof s.ref !== 'string' || !/^\d+$/.test(s.ref))) {
      err('section-ref-format', `${s.id}: ref ${JSON.stringify(s.ref)} is not a plain arabic-numeral string or null`);
    }
    refsSeen.push(s.ref);

    (s.passages ?? []).forEach((p, k) => {
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${s.id}[${k}]: passage has empty text`);
      if (typeof p.n !== 'string' || p.n !== '') err('passage-n', `${s.id}[${k}]: passage n must be "", got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${s.id}[${k}]: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      totalChars += p.text.length;
      visit(p.text, `${s.id}/passage[${k}]`);
    });
    sectionRows.push(`| ${s.id} | ${s.ref ?? '_null_'} | ${(s.passages ?? []).reduce((n, p) => n + p.text.length, 0)} |`);
  });

  // ref values should be non-decreasing across sections (chapter number never goes backwards)
  let lastNum = 0;
  let refOutOfOrder = 0;
  for (const r of refsSeen) {
    if (r === null) continue;
    const num = Number(r);
    if (num < lastNum) refOutOfOrder += 1;
    lastNum = Math.max(lastNum, num);
  }
  if (refOutOfOrder > 0) err('ref-monotonic', `${refOutOfOrder} section(s) have a chapter ref lower than an earlier section's - refs should be non-decreasing`);
  if (lastNum !== EXPECTED_CHAPTERS) err('ref-final', `final chapter ref reached is ${lastNum}, expected ${EXPECTED_CHAPTERS}`);

  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup / entities:\n    ${leaks.slice(0, 20).join('\n    ')}`);

  // ---- spot checks ----
  const spotChecks: { label: string; ok: boolean; got: string }[] = [];
  const firstText = sections[0]?.passages?.[0]?.text ?? '';
  const okStart = firstText.startsWith(SPOT_START);
  spotChecks.push({ label: `sec-1 passage[0] starts "${SPOT_START}"`, ok: okStart, got: firstText.slice(0, 70) });
  if (!okStart) err('spot-check-start', `sec-1 passage[0] does not start with expected incipit (got: ${JSON.stringify(firstText.slice(0, 70))})`);

  const lastSection = sections[sections.length - 1];
  const lastText = lastSection?.passages?.[lastSection.passages.length - 1]?.text ?? '';
  const okEnd = lastText.endsWith(SPOT_END);
  spotChecks.push({ label: `final section (${lastSection?.id}) ends "${SPOT_END}"`, ok: okEnd, got: lastText.slice(-70) });
  if (!okEnd) err('spot-check-end', `final section does not end with the expected explicit (got tail: ${JSON.stringify(lastText.slice(-70))})`);

  // ---- anomalies must document key apparatus handling ----
  if (!anomalies.some((a) => /apparatus criticus/.test(a.where) || /<note>/.test(a.note))) {
    err('anomaly-notes', 'anomalies.json must document how <note> apparatus criticus was handled');
  }
  if (!anomalies.some((a) => /<del>/.test(a.note) || /del>/.test(a.note) || /editorial deletion/.test(a.note))) {
    warn('anomaly-del', 'anomalies.json does not mention <del> handling (fine only if this witness truly has zero)');
  }
  if (!anomalies.some((a) => /refs/.test(a.where))) {
    err('anomaly-refs', 'anomalies.json must document the Division.ref (chapter-milestone) scheme');
  }

  // ---- report ----
  const report: string[] = [];
  report.push(`# Cicero validation report - ${WORK_ID}`);
  report.push('');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  const errCount = F.filter((f) => f.level === 'ERROR').length;
  const warnCount = F.filter((f) => f.level === 'WARN').length;
  report.push(`**Result: ${errCount === 0 ? 'PASS' : 'FAIL'}** - ${errCount} error(s), ${warnCount} warning(s).`);
  report.push('');
  report.push('## Counts');
  report.push('');
  report.push(`- sections: ${sections.length}`);
  report.push(`- total passage chars: ${totalChars}`);
  report.push(`- final chapter ref reached: ${lastNum} (expected ${EXPECTED_CHAPTERS})`);
  report.push('');
  report.push('## Per-section refs & chars (first 20 shown in full report body)');
  report.push('');
  report.push('| section | ref | chars |');
  report.push('|---------|-----|-------|');
  report.push(...sectionRows);
  report.push('');
  report.push('## Verbatim spot-check');
  report.push('');
  for (const s of spotChecks) report.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got}\``);
  report.push('');
  report.push('## Anomalies (preserved, not corrected)');
  report.push('');
  if (anomalies.length === 0) report.push('_none_');
  for (const a of anomalies) report.push(`- **${a.where}** - ${a.note}`);
  report.push('');
  report.push('## Errors');
  report.push('');
  const errs = F.filter((f) => f.level === 'ERROR');
  if (errs.length === 0) report.push('_none_');
  for (const f of errs) report.push(`- **[${f.check}]** ${f.message}`);
  report.push('');
  report.push('## Warnings');
  report.push('');
  const warns = F.filter((f) => f.level === 'WARN');
  if (warns.length === 0) report.push('_none_');
  for (const f of warns) report.push(`- **[${f.check}]** ${f.message}`);
  report.push('');

  return { findings: F, report };
}

function main(): void {
  const { findings: F, report } = findings();
  if (report.length > 0) writeFileSync(join(DIR, 'VALIDATION_REPORT.md'), report.join('\n'), 'utf8');

  process.stdout.write(`\n=== validate:${WORK_ID} ===\n`);
  for (const f of F) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = F.filter((f) => f.level === 'ERROR');
  const warns = F.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

main();
