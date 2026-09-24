/**
 * Validation for the two Ptolemy Greek work corpora (Almagest, Tetrabiblos)
 * produced by index.ts. See scripts/import-ptolemy/validateEn.ts for the
 * separate Tetrabiblos-English validator (a different source: sacred-
 * texts.com HTML, not local TEI XML, so a different accounting method -
 * see that file's module doc).
 *
 *   npx tsx scripts/import-ptolemy/validate.ts
 *
 * Writes data/<workId>/VALIDATION_REPORT.md for each work, prints a
 * combined summary, and exits non-zero if any ERROR-level check fails.
 *
 * --- TEXT ACCOUNTING (2026-09-23, jsdom-based, exact reconciliation) ------
 * An independent, XML-DOM-based re-derivation of "what reading text should
 * this source contain", cross-checked character-for-character (after
 * stripping ALL whitespace on both sides - see normalizeForAccounting)
 * against work.json. On any divergence, the exact index and 50 characters
 * of context on each side are printed and the check FAILS - no tolerance
 * band, unlike the ratio-based check in scripts/import-aristotle-rest-
 * shared/validate.ts (this corpus is small enough, and its apparatus simple
 * enough - only 3 kinds of exclusion, no nested folding - that exact
 * reconciliation is both possible and the stronger guarantee this task asked
 * for).
 *
 * RAW side (rawAccountingText): parse the whole raw TEI file with jsdom
 * (`new JSDOM(xml, {contentType: 'text/xml'})`), remove <teiHeader> (front
 * matter), every <note> (both footnote-apparatus AND marginal running-heads
 * - both wholly excluded, see teiWalker.ts), and every <head> (captured
 * separately as Division.sourceHeading, never part of Passage.text - so
 * removed from BOTH sides identically, not subtracted after the fact).
 * <del>, <add>, <gap/>, <figure>/<figDesc>/<list>/<item>/<label>/<num>,
 * <graphic/> are all LEFT IN. Then take textContent.
 *
 * WORK side (workAccountingText, 2026-09-23 redesign): every Passage's
 * `text` ONLY, concatenated in document order across every leaf division.
 * `Passage.figure.note` is NEVER included - it is now, deliberately, pure
 * importer-synthesised metadata (a diagram count + a "Scan page(s): ..."
 * URL list - see index.ts's buildFigure), never verbatim source text, so it
 * has no raw-side counterpart to reconcile against at all. This is why a
 * <figure> with no transcribed content of its own (a bare <graphic/>
 * pointer - no <figDesc>) needs no adjustment on either side any more:
 * <graphic/> is a self-closing element with zero text content, so it
 * contributes zero raw chars, and Passage.text now correspondingly gets
 * zero chars from it too (see index.ts - the old DIAGRAM_PLACEHOLDER-in-
 * Passage.text design this replaced needed a matching subtraction; this one
 * doesn't).
 *
 * Both sides are then whitespace-AND-bracket-stripped (see
 * normalizeForAccounting) and compared for exact identity. Stripping `[`/`]`
 * from BOTH sides uniformly (rather than counting and subtracting only the
 * synthetic ones teiWalker.ts adds around a kept `<del>` span) is simpler
 * and still exact: a `[`/`]` is never otherwise meaningful reading-text
 * punctuation in this corpus, on either side, so the two `<del>`-bracket
 * cases (synthetic AND the rare "already bracketed in the source" one) wash
 * out identically without needing to be told apart. No other adjustment is
 * needed: table text kept via `Passage.text` itself (e.g. the Table of
 * Chords) is genuine source text on BOTH sides already (the raw side's
 * <figDesc> is left in), so it reconciles with no adjustment.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { GRC_WORKS } from './workTable.ts';
import type { GrcWorkEntry } from './workTable.ts';
import { hasCombining } from './text.ts';
import type { Division, GenericWork, WorkAbout, Anomaly } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');
const RAW_DIR = join(HERE, 'raw');

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

function walkDivisions(divs: Division[], visit: (d: Division, path: string) => void, prefix = ''): void {
  for (const d of divs) {
    const path = `${prefix}${d.id}`;
    visit(d, path);
    if (d.children.length) walkDivisions(d.children, visit, `${path}/`);
  }
}

function countLeafDivisions(divs: Division[]): number {
  let n = 0;
  walkDivisions(divs, (d) => {
    if (d.children.length === 0) n += 1;
  });
  return n;
}

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '<lb', '<pb', '<del', '<add', '<gap', '<note', '<milestone', '<div', '<head', '<figure', '<figDesc', '<list', '<item', '<label', '<num', '<graphic', '</p>', 'xmlns', 'http://'];

/** `<del>` brackets (synthetic ones teiWalker.ts adds AND the rare literal
 *  ones already printed by the source - the "already-bracketed" case) are
 *  stripped from BOTH sides uniformly by normalizeForAccounting below -
 *  matching scripts/import-greek-drama-shared/validate.ts's own convention
 *  exactly - rather than trying to count and subtract only the synthetic
 *  ones from the work side. Simpler and exact either way: a `[`/`]` is never
 *  otherwise meaningful reading-text punctuation in this corpus. */
function rawAccountingText(xml: string): string {
  const dom = new JSDOM(xml, { contentType: 'text/xml' });
  const doc = dom.window.document;
  for (const sel of ['teiHeader', 'note', 'head']) {
    for (const el of Array.from(doc.querySelectorAll(sel))) el.remove();
  }
  const body = doc.querySelector('body');
  // NFC-normalise (the WORK side is always NFC - see text.ts#cleanText) -
  // the raw XML itself is not guaranteed to be pre-composed.
  return (body?.textContent ?? '').normalize('NFC');
}

/** Passage.text ONLY - Passage.figure.note is deliberately excluded (pure
 *  importer-synthesised metadata now, never verbatim source text - see this
 *  module's doc comment). */
function workAccountingText(work: GenericWork): string {
  const parts: string[] = [];
  walkDivisions(work.divisions, (d) => {
    for (const p of d.passages) parts.push(p.text);
  });
  return parts.join('');
}

/** Whitespace AND `[`/`]` are insignificant for this comparison - see
 *  rawAccountingText's doc comment for why brackets are stripped from both
 *  sides rather than counted-and-subtracted on one side only. */
function normalizeForAccounting(s: string): string {
  return s.replace(/[[\]\s]+/g, '');
}

interface AccountingResult {
  ok: boolean;
  rawLen: number;
  workLenAdjusted: number;
  divergenceMessage?: string;
}

function checkAccounting(entry: GrcWorkEntry, work: GenericWork): AccountingResult {
  const xml = readFileSync(join(RAW_DIR, entry.file), 'utf8');
  const rawText = normalizeForAccounting(rawAccountingText(xml));
  const workNorm = normalizeForAccounting(workAccountingText(work));

  if (rawText === workNorm) {
    return { ok: true, rawLen: rawText.length, workLenAdjusted: workNorm.length };
  }
  let i = 0;
  const min = Math.min(rawText.length, workNorm.length);
  while (i < min && rawText[i] === workNorm[i]) i++;
  const rawCtx = rawText.slice(Math.max(0, i - 20), i + 50);
  const workCtx = workNorm.slice(Math.max(0, i - 20), i + 50);
  return {
    ok: false,
    rawLen: rawText.length,
    workLenAdjusted: workNorm.length,
    divergenceMessage: `first divergence at char ${i} (raw len ${rawText.length}, work len ${workNorm.length}):\n    raw : …${JSON.stringify(rawCtx)}…\n    work: …${JSON.stringify(workCtx)}…`,
  };
}

interface WorkReport {
  entry: GrcWorkEntry;
  dir: string;
  findings: Finding[];
  bookCount: number;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
  accounting: AccountingResult | null;
}

function validateWork(entry: GrcWorkEntry): WorkReport {
  const dir = join(DATA_ROOT, entry.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = { entry, dir, findings, bookCount: 0, chapterCount: 0, passageCount: 0, totalChars: 0, anomalies: [], accounting: null };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) if (!existsSync(join(dir, f))) err('presence', `missing ${f}`);
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== entry.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${entry.workId}`);
  if (work.language !== 'grc') err('language', `work.json language is ${JSON.stringify(work.language)}`);
  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of ['The edition', 'Digital source', 'How it was imported', 'Diagrams and tables', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
    }
  }

  const divisions = work.divisions ?? [];
  report.bookCount = divisions.length;
  const leafCount = countLeafDivisions(divisions);
  report.chapterCount = leafCount;

  if (divisions.length !== entry.expectedBooks) err('book-count', `expected ${entry.expectedBooks} book(s), got ${divisions.length}`);
  if (leafCount !== entry.expectedChapters) err('chapter-count', `expected ${entry.expectedChapters} chapter(s), got ${leafCount}`);
  walkDivisions(divisions, (d) => {
    if (d.children.length > 0) return;
    if (d.number === null) err('division-number', `${d.id}: number must never be null`);
    if (d.passages.length !== 1) err('division-passages', `${d.id}: expected exactly 1 passage, got ${d.passages.length}`);
  });

  let passageCount = 0;
  let totalChars = 0;
  walkDivisions(divisions, (d, path) => {
    if (d.children.length > 0) return;
    d.passages.forEach((p, i) => {
      passageCount += 1;
      totalChars += p.text.length;
      // Empty Passage.text is allowed ONLY when Passage.figure is set (a
      // chapter whose entire printed content is one or more diagrams with
      // no transcribed content of their own, e.g. book-9-ch-4 - 20 diagram
      // markers, zero table text - see index.ts's buildFigure) - the
      // reading text genuinely does not exist for that chapter; its
      // content is disclosed entirely via Passage.figure instead.
      if (typeof p.text !== 'string') err('empty-passage', `${path}: passage[${i}] has non-string text`);
      else if (p.text.length === 0 && !p.figure) err('empty-passage', `${path}: passage[${i}] has empty text and no figure`);
      if (p.figure && !p.figure.image && !p.figure.note) err('figure-shape', `${path}: figure has neither image nor note`);
      if (p.figure && !p.figure.source) err('figure-source', `${path}: figure has no source citation`);
    });
  });
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  const leaks: string[] = [];
  walkDivisions(divisions, (d, path) => {
    d.passages.forEach((p, i) => {
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${path}/passage[${i}]: contains ${JSON.stringify(marker)}`);
      if (p.figure?.note) for (const marker of LEAK_MARKERS) if (p.figure.note.includes(marker)) leaks.push(`${path}/passage[${i}]/figure.note: contains ${JSON.stringify(marker)}`);
    });
    if (d.sourceHeading) for (const marker of LEAK_MARKERS) if (d.sourceHeading.includes(marker)) leaks.push(`${path}/sourceHeading: contains ${JSON.stringify(marker)}`);
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  let nfcMismatch = 0;
  let combiningHits = 0;
  walkDivisions(divisions, (d) => {
    for (const p of d.passages) {
      if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
      if (hasCombining(p.text)) combiningHits += 1;
    }
  });
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);
  if (combiningHits > 0) warn('combining-marks', `${combiningHits} passage(s) contain a standalone combining diacritic`);

  const accounting = checkAccounting(entry, work);
  report.accounting = accounting;
  if (!accounting.ok) {
    err('text-accounting', `raw-vs-imported text does not reconcile - ${accounting.divergenceMessage}`);
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Ptolemy (Greek) validation report - ${r.entry.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${r.bookCount}`);
  L.push(`- chapters (leaf divisions): ${r.chapterCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  if (r.accounting) {
    L.push(`- raw accounting chars (source, whitespace-stripped): ${r.accounting.rawLen}`);
    L.push(`- work accounting chars (adjusted, whitespace-stripped): ${r.accounting.workLenAdjusted}`);
    L.push(`- text accounting: ${r.accounting.ok ? 'EXACT MATCH' : 'DIVERGED'}`);
  }
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
  writeFileSync(join(r.dir, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

function main(): void {
  const reports = GRC_WORKS.map(validateWork);
  for (const r of reports) writeReport(r);

  process.stdout.write('\n=== validate:ptolemy (Greek) ===\n\n');
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(`  ${r.entry.workId.padEnd(28)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ${r.bookCount} bk  ${r.chapterCount} ch  ${r.passageCount} psg  ${r.totalChars} chars  ${errors.length} err  ${warns.length} warn\n`);
    for (const f of [...errors, ...warns]) process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write('Reports written to data/<workId>/VALIDATION_REPORT.md\n');
  if (totalErrors > 0) process.exit(1);
}

main();
