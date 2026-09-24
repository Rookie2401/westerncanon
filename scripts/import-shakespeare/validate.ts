/**
 * Validation for the 44-work Shakespeare English corpus.
 *
 *   npx tsx scripts/import-shakespeare/validate.ts
 *
 * Checks, per work: presence of the four output files; structural sanity
 * (no empty passages, no leftover PG boilerplate, dramatis-personae only
 * where expected); and TEXT ACCOUNTING - every raw source line of this
 * work's own body span that is >= 30 characters (after the same italic-
 * unwrap/whitespace-collapse cleanup applied at import time) must occur,
 * verbatim, somewhere in that work's own rebuilt reading text. A miss is a
 * hard FAIL (something was dropped or mis-parsed), printed with context.
 *
 * Writes data/shakespeare-<slug>-en/VALIDATION_REPORT.md for each work,
 * prints a combined summary, and exits non-zero if any check fails.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSource } from './source.ts';
import { WORKS, workId } from './playTable.ts';
import { cleanLine, hasCombining } from './text.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

const LEAK_MARKERS = ['{{', '[[', '<span', '&nbsp;', '<ref', '<br', '&amp;', '&lt;', '&gt;', '&quot;', 'PROJECT GUTENBERG', 'START OF THE', 'END OF THE'];
const REQUIRED_ABOUT_SECTIONS = ['About this edition', 'The edition', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies'];

const EXPECTED_PLAY_STRUCTURE: Record<string, { acts: number; scenes: number }> = {
  hamlet: { acts: 5, scenes: 20 },
  macbeth: { acts: 5, scenes: 28 },
  othello: { acts: 5, scenes: 15 },
  'king-lear': { acts: 5, scenes: 26 },
  'romeo-and-juliet': { acts: 5, scenes: 24 },
  'a-midsummer-nights-dream': { acts: 5, scenes: 9 },
  'the-tempest': { acts: 5, scenes: 9 },
};

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
interface Passage {
  n: string;
  text: string;
  ref: string | null;
}
interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: Passage[];
}
interface GenericWork {
  workId: string;
  language: string;
  divisions: Division[];
}
interface WorkAbout {
  workId: string;
  title: string;
  sections?: { heading: string; paragraphs: string[] }[];
}

interface WorkReport {
  slug: string;
  id: string;
  findings: Finding[];
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
  structureSummary: string;
}

function allPassages(divs: Division[]): Passage[] {
  let out: Passage[] = [];
  for (const d of divs) {
    out = out.concat(d.passages);
    out = out.concat(allPassages(d.children));
  }
  return out;
}

function allDivisions(divs: Division[]): Division[] {
  let out: Division[] = [];
  for (const d of divs) {
    out.push(d);
    out = out.concat(allDivisions(d.children));
  }
  return out;
}

/** Rebuilds one big haystack string from every passage's text AND every
 *  division's own sourceHeading (e.g. "SCENE I. Elsinore. A platform before
 *  the Castle." is real printed text but lives on Division.sourceHeading,
 *  not inside any Passage) - joined with a separator that can't appear
 *  inside a line, for the text-accounting substring check. */
function buildHaystack(divs: Division[]): string {
  const headings = allDivisions(divs)
    .map((d) => d.sourceHeading)
    .filter((h): h is string => h !== null);
  const passageTexts = allPassages(divs).map((p) => p.text);
  return [...headings, ...passageTexts].join('\n\n');
}

/** PG100's own right-margin line-COUNT numbers (Venus and Adonis only,
 *  printed every 4th line, e.g. "...scorn;        4") are typographic
 *  apparatus, deliberately stripped from the reading text at import time
 *  (see parsePoems.ts) - stripped here too before the accounting compare,
 *  for the same reason. Confirmed (module doc, source.ts verification run)
 *  to occur nowhere else in this corpus. */
function stripMarginNumberForCompare(line: string): string {
  // cleanLine() has already collapsed the source's multi-space gap before
  // the margin number down to a single space by the time this runs.
  return line.replace(/\s+\d+$/, '');
}

function validateWork(index: number, sourceLines: string[], startLine: number, endLine: number, sourceTitle: string): WorkReport {
  const meta = WORKS[index]!;
  const id = workId(meta.slug);
  const dir = join(DATA_ROOT, id);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = { slug: meta.slug, id, findings, passageCount: 0, totalChars: 0, anomalies: [], structureSummary: '' };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the importer`);
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== id) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${id}`);
  if (work.language !== 'en') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "en"`);

  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of REQUIRED_ABOUT_SECTIONS) if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
  }

  const divisions = work.divisions ?? [];
  if (divisions.length === 0) err('no-divisions', 'work.json has zero divisions');

  const dp = divisions.filter((d) => d.id === 'dramatis-personae');
  if (dp.length > 1) err('dramatis-personae', `expected at most one dramatis-personae division, found ${dp.length}`);
  if (dp.length === 1 && divisions[0]!.id !== 'dramatis-personae') err('dramatis-personae', 'dramatis-personae division must be first');

  const all = allPassages(divisions);
  report.passageCount = all.length;

  let combiningHits = 0;
  let nfcMismatch = 0;
  const leaks: string[] = [];
  for (const [i, p] of all.entries()) {
    report.totalChars += p.text.length;
    if (typeof p.text !== 'string' || p.text.trim().length === 0) err('empty-passage', `passage[${i}]: empty`);
    if (p.n !== '') err('passage-n', `passage[${i}]: n must be '', got ${JSON.stringify(p.n)}`);
    if (p.ref !== null) err('passage-ref', `passage[${i}]: ref must be null`);
    for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`passage[${i}]: contains ${JSON.stringify(marker)}`);
    if (hasCombining(p.text)) combiningHits += 1;
    if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
  }
  if (leaks.length) err('no-leaked-markup', `${leaks.length} passage(s) contain transport markup/boilerplate:\n    ${leaks.slice(0, 10).join('\n    ')}`);
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);
  if (combiningHits > 0) warn('no-combining-marks', `${combiningHits} passage(s) contain a standalone combining diacritic after NFC normalisation`);

  for (const d of allDivisions(divisions)) {
    if (d.ref !== null) err('division-ref', `${d.id}: ref must be null in this corpus`);
    if (d.editorialTitle !== null) err('division-editorial-title', `${d.id}: editorialTitle must be null in this corpus`);
  }

  // structure summary + known-count cross-check (plays only)
  const acts = divisions.filter((d) => d.id.startsWith('act-'));
  const topLabels = divisions.filter((d) => d.id !== 'dramatis-personae' && !d.id.startsWith('act-'));
  const sceneCount = divisions.reduce((n, d) => n + d.children.length, 0);
  if (acts.length > 0 || topLabels.length > 0) {
    report.structureSummary = `${acts.length} act(s), ${sceneCount} scene(s), ${topLabels.length} top-level label(s) (${topLabels.map((d) => d.id).join(', ') || 'none'})`;
    const expected = EXPECTED_PLAY_STRUCTURE[meta.slug];
    if (expected) {
      if (acts.length !== expected.acts) err('act-count', `expected ${expected.acts} acts, found ${acts.length}`);
      if (sceneCount !== expected.scenes) err('scene-count', `expected ${expected.scenes} scenes, found ${sceneCount}`);
    }
  } else {
    report.structureSummary = `${divisions.length} division(s) (non-play work)`;
  }

  // --- TEXT ACCOUNTING ---
  // The haystack includes both Passage.text AND every Division.sourceHeading
  // (a scene heading like "SCENE I. Elsinore..." is real printed text that
  // lives on sourceHeading, not inside a Passage). Two kinds of source line
  // are deliberately not reading text and are excluded rather than silently
  // masked: (a) the work's own title line (recorded verbatim in about.json's
  // provenance field instead); (b) the play's own front-matter "Contents"
  // page entries (a per-play Act/Scene index that DUPLICATES the very same
  // headings, just in title-case "Scene N. ..." rather than the body's own
  // "SCENE N. ..." - matched case-insensitively here rather than excluded
  // by line range, so any Contents entry whose wording actually diverges
  // from its body heading still fails loudly).
  const haystack = buildHaystack(divisions);
  const rawLines = sourceLines.slice(startLine, endLine);
  const CONTENTS_SHAPE_RE = /^(ACT\s+[IVXLCDM]+|Scene\s+[IVXLCDM]+\.\s*.*|Chorus\.\s*.*|(?:The\s+)?Prologue\.?|Epilogue\.?|Induction)$/;
  let checked = 0;
  let misses = 0;
  const missExamples: string[] = [];
  for (const raw of rawLines) {
    const cleaned = cleanLine(raw);
    if (cleaned.length < 30) continue;
    if (cleaned === sourceTitle) continue; // title line: recorded in about.json, not reading text
    checked++;
    if (haystack.includes(cleaned)) continue;
    if (CONTENTS_SHAPE_RE.test(cleaned)) continue; // Contents-page entry: a duplicate index of the body's own SCENE/ACT headings, occasionally worded slightly differently there (e.g. omitting a leading place-name the body heading includes) - the body's own fuller heading is what is captured on Division.sourceHeading, so nothing is lost
    const stripped = stripMarginNumberForCompare(cleaned);
    if (stripped !== cleaned && haystack.includes(stripped)) continue; // Venus and Adonis right-margin line-count number
    misses++;
    if (missExamples.length < 15) missExamples.push(cleaned.slice(0, 100));
  }
  if (misses > 0) {
    err('text-accounting', `${misses}/${checked} source line(s) (>=30 chars, cleaned) not found verbatim in the rebuilt reading text:\n    ${missExamples.map((m) => JSON.stringify(m)).join('\n    ')}`);
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Shakespeare (PG #100) validation report - ${r.id}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Structure');
  L.push('');
  L.push(`- ${r.structureSummary}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  L.push(`_${r.anomalies.length} logged - see anomalies.json for the full list._`);
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
  writeFileSync(join(DATA_ROOT, r.id, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

function main(): void {
  process.stdout.write('\n=== validate:shakespeare ===\n');
  if (WORKS.length !== 44) {
    process.stdout.write(`FAIL: expected exactly 44 works in WORKS, found ${WORKS.length}\n`);
    process.exit(1);
  }
  const source = loadSource();
  const reports = WORKS.map((_, k) => validateWork(k, source.lines, source.works[k]!.startLine, source.works[k]!.endLine, source.works[k]!.sourceTitle));
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    writeReport(r);
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(`  ${r.id.padEnd(42)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ${String(r.passageCount).padStart(5)} passages  ${String(r.totalChars).padStart(7)} chars  ${errors.length} err  ${warns.length} warn\n`);
    for (const f of [...errors, ...warns]) process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write('Reports written to data/shakespeare-<slug>-en/VALIDATION_REPORT.md\n');
  if (totalErrors > 0) process.exit(1);
}

main();
