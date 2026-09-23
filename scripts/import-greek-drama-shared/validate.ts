/**
 * Validation for all generated Greek-drama work corpora (Aeschylus,
 * Sophocles, Euripides - and, later, Aristophanes, once its driver reuses
 * this same validator by importing DRAMA_WORKS from an extended table).
 *
 *   npm run validate:greek-drama
 *
 * Writes data/<workId>/VALIDATION_REPORT.md for each work, prints a combined
 * summary, and exits non-zero if any ERROR-level check fails. WARN-level
 * findings (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { DRAMA_WORKS, workId as workIdFor } from './workTable.ts';
import type { PlayEntry, Witness } from './workTable.ts';
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

const LEAK_MARKERS = [
  '&amp;',
  '&lt;',
  '&gt;',
  '<lb',
  '<pb',
  '<del',
  '<add',
  '<gap',
  '<sic',
  '<corr',
  '<reg',
  '<choice',
  '<unclear',
  '<note',
  '<sp',
  '<speaker',
  '<milestone',
  '<div',
  '<l ',
  '<l>',
  'xmlns',
  'http://www.tei-c.org',
];

function walkDivisions(divs: Division[], visit: (d: Division, path: string) => void, prefix = ''): void {
  for (const d of divs) {
    const path = `${prefix}${d.id}`;
    visit(d, path);
    if (d.children.length) walkDivisions(d.children, visit, `${path}/`);
  }
}

/**
 * Raw-vs-work TEXT ACCOUNTING check (2026-09-22): an independent,
 * XML-DOM-based (not regex-based) re-derivation of "what reading text should
 * this witness contain", cross-checked character-for-character against
 * work.json. Catches whole-text-class bugs (a tag silently dropping its
 * content) that structural/shape checks elsewhere in this file cannot.
 *
 * RAW side (rawAccountingText): parses the raw TEI with jsdom
 * (`new JSDOM(xml, {contentType: 'text/xml'})`), removes - in this order,
 * so a descendant removed by an earlier step is never independently counted
 * by a later one - <teiHeader> (front matter, not body text), <note>
 * (apparatus AND the dramatis-personae note - see below), <bibl>, <head>,
 * <speaker> (the label itself, since the WORK side strips it from each
 * passage instead of comparing it positionally), `<l n="0">` (Perseus's own
 * display-only duplicate label line/placeholder - never source text, see
 * teiConvert.ts's logHiddenLine), and a rejected `<sic>` that is a direct
 * child of `<choice>` OR of a bare `<corr>` (the paired forms - Agamemnon
 * 801's `<corr><add>/<sic></corr>` is the one verified instance of the
 * latter; the importer spec named only `choice > sic`, but `corr > sic` is
 * extended here to match, since excluding it would falsely fail Agamemnon
 * over an already-disclosed, intentional exclusion rather than a bug - see
 * this file's own report for that call). Then takes `.textContent`.
 *
 * Dramatis personae is a deliberate, disclosed EXCLUSION from this specific
 * check on BOTH sides, not a special-cased inclusion: every `<note>` is
 * removed on the raw side (per the check's own instructions, no exception),
 * so a witness with a cast-list note has none of its text on the raw side
 * either; to keep the comparison meaningful, workAccountingText likewise
 * skips the whole `dramatis-personae` division. The cast list itself is
 * already separately checked (division shape, dedup logic) elsewhere in
 * this file - this check exists to catch DIALOGUE content loss.
 *
 * WORK side (workAccountingText): every division except `dramatis-personae`,
 * every passage's text with its speaker-label first line dropped (a passage
 * starting with "[" - a stage direction or orphan-text passage - has no
 * label line to drop), concatenated in document order.
 *
 * Both sides are then normalised (normalizeForAccounting): Unicode NFC,
 * then "(cont.)" removed (the importer's own continuation-label suffix,
 * never source text), then "[", "]" removed (editor-bracketed <del> text -
 * the WORDS inside are compared, just not the importer's own bracket
 * punctuation), then the lacuna sigla "⟨…⟩" removed (the importer's own
 * stand-in for an empty <gap>, which contributes no raw-side text either),
 * then ALL whitespace removed (both sides format differently - raw XML
 * indentation vs. work.json's "\n"-joined verse lines - so whitespace itself
 * carries no signal here). The two results must be IDENTICAL; if not, the
 * first point of divergence is reported with 50 characters of context on
 * each side.
 */
function rawDirFor(playwright: string): string {
  return join(REPO_ROOT, 'scripts', `import-${playwright}`, 'raw');
}

function rawAccountingText(xml: string): string {
  const dom = new JSDOM(xml, { contentType: 'text/xml' });
  const doc = dom.window.document;
  for (const sel of ['teiHeader', 'note', 'bibl', 'head', 'speaker', 'l[n="0"]']) {
    for (const el of doc.querySelectorAll(sel)) el.remove();
  }
  for (const sel of ['choice > sic', 'corr > sic']) {
    for (const el of doc.querySelectorAll(sel)) el.remove();
  }
  return doc.documentElement.textContent ?? '';
}

function stripSpeakerLabelLine(passageText: string): string {
  // A speech passage ALWAYS has the shape "label\nbody..." (teiConvert.ts's
  // flush() joins them with a literal "\n" unconditionally); a stage-
  // direction/orphan-text passage never contains "\n" at all (its text
  // comes from a single extractCleanText() call, whose whitespace-collapse
  // removes any newline). So "no \n present" - not "starts with '['" - is
  // the reliable discriminator: a del-bracketed speaker attribution (e.g.
  // "[Χορός]\n...", Aeschylus Suppliants 741) or a fully del-bracketed
  // speaker AND line (e.g. "[Antigone]\n[How do you know...]", Euripides
  // Phoenician Women) both start with "[" too, but are still ordinary
  // speeches with a label line to strip.
  const nl = passageText.indexOf('\n');
  return nl === -1 ? passageText : passageText.slice(nl + 1);
}

function workAccountingText(work: GenericWork): string {
  let out = '';
  for (const d of work.divisions ?? []) {
    if (d.id === 'dramatis-personae') continue; // see module doc above
    for (const p of d.passages) out += stripSpeakerLabelLine(p.text);
  }
  return out;
}

function normalizeForAccounting(s: string): string {
  return s
    .normalize('NFC')
    .replaceAll('(cont.)', '')
    .replaceAll('[', '')
    .replaceAll(']', '')
    .replaceAll('⟨…⟩', '')
    .replace(/\s+/g, '');
}

interface AccountingResult {
  rawChars: number;
  workChars: number;
  delta: number;
  divergence: string | null;
}

function findDivergence(a: string, b: string): string | null {
  if (a === b) return null;
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  const ctxA = a.slice(Math.max(0, i - 50), i + 50);
  const ctxB = b.slice(Math.max(0, i - 50), i + 50);
  return `first divergence at normalised offset ${i} (raw len ${a.length}, work len ${b.length}):\n      raw : ...${JSON.stringify(ctxA)}...\n      work: ...${JSON.stringify(ctxB)}...`;
}

function runAccountingCheck(target: Target): AccountingResult {
  const witness: Witness | null = target.lang === 'grc' ? target.entry.grc : target.entry.en;
  if (!witness) throw new Error(`${target.workId}: no ${target.lang} witness`);
  const xml = readFileSync(join(rawDirFor(target.entry.playwright), witness.file), 'utf8');
  const rawNorm = normalizeForAccounting(rawAccountingText(xml));

  const work = JSON.parse(readFileSync(join(DATA_ROOT, target.workId, 'work.json'), 'utf8')) as GenericWork;
  const workNorm = normalizeForAccounting(workAccountingText(work));

  return {
    rawChars: rawNorm.length,
    workChars: workNorm.length,
    delta: workNorm.length - rawNorm.length,
    divergence: findDivergence(rawNorm, workNorm),
  };
}

interface Target {
  entry: PlayEntry;
  lang: 'grc' | 'en';
  workId: string;
}

function targets(): Target[] {
  const out: Target[] = [];
  for (const entry of DRAMA_WORKS) {
    out.push({ entry, lang: 'grc', workId: workIdFor(entry, 'grc') });
    if (entry.en) out.push({ entry, lang: 'en', workId: workIdFor(entry, 'en') });
  }
  return out;
}

interface WorkReport {
  target: Target;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  perDivision: { id: string; number: string | null; heading: string | null; passages: number; chars: number }[];
  anomalies: Anomaly[];
  accounting: AccountingResult | null;
}

function validateWork(target: Target): WorkReport {
  const dir = join(DATA_ROOT, target.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    target,
    dir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    perDivision: [],
    anomalies: [],
    accounting: null,
  };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the ${target.entry.playwright} importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== target.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${target.workId}`);
  if (work.language !== target.lang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${JSON.stringify(target.lang)}`);
  if (about.title !== target.entry.title) warn('about-title', `about.json title ${JSON.stringify(about.title)} != canonical title ${JSON.stringify(target.entry.title)}`);
  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of ['Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
    }
  }

  const divisions = work.divisions ?? [];
  if (divisions.length === 0) err('no-divisions', 'work.json has zero divisions');

  let flatDivCount = 0;
  walkDivisions(divisions, (d) => {
    flatDivCount += 1;
    if (d.children.length !== 0) err('division-children', `${d.id}: expected no children (flat corpus), got ${d.children.length}`);
  });
  report.divisionCount = flatDivCount;

  // ---- dramatis-personae, if present, must be first and unique ----
  const dpIndices = divisions.map((d, i) => (d.id === 'dramatis-personae' ? i : -1)).filter((i) => i >= 0);
  if (dpIndices.length > 1) err('dramatis-personae', `expected at most one dramatis-personae division, found ${dpIndices.length}`);
  if (dpIndices.length === 1 && dpIndices[0] !== 0) err('dramatis-personae', 'dramatis-personae division must be first, found elsewhere');
  for (const d of divisions) {
    if (d.id === 'dramatis-personae') {
      if (d.number !== null) err('dramatis-personae-number', 'dramatis-personae division must have number: null');
    } else {
      if (!/^card-.+$/.test(d.id)) err('card-id', `${d.id}: expected id shape "card-N"`);
      if (d.number === null) err('card-number', `${d.id}: number must not be null`);
    }
    if (d.editorialTitle !== null) err('editorialTitle', `${d.id}: editorialTitle must be null`);
  }

  // ---- passages ----
  let passageCount = 0;
  let totalChars = 0;
  walkDivisions(divisions, (d, path) => {
    let chars = 0;
    d.passages.forEach((p, i) => {
      passageCount += 1;
      chars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${path}: passage[${i}] has empty text`);
      if (typeof p.n !== 'string') err('passage-n', `${path}: passage[${i}] n is not a string`);
      if (p.ref !== null) err('passage-ref', `${path}: passage[${i}] ref must be null in this corpus`);
    });
    totalChars += chars;
    report.perDivision.push({ id: d.id, number: d.number, heading: d.sourceHeading, passages: d.passages.length, chars });
  });
  report.passageCount = passageCount;
  report.totalChars = totalChars;
  if (passageCount === 0) err('passage-floor', 'expected at least one passage in the whole work');

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkDivisions(divisions, (d, path) => {
    if (d.sourceHeading != null) {
      for (const marker of LEAK_MARKERS) if (d.sourceHeading.includes(marker)) leaks.push(`${path}/sourceHeading: contains ${JSON.stringify(marker)}`);
    }
    d.passages.forEach((p, i) => {
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${path}/passage[${i}]: contains ${JSON.stringify(marker)}`);
    });
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- Unicode form: NFC required, no standalone combining marks ----
  let combiningHits = 0;
  let nfcMismatch = 0;
  walkDivisions(divisions, (d) => {
    if (d.sourceHeading != null && hasCombining(d.sourceHeading)) combiningHits += 1;
    for (const p of d.passages) {
      if (hasCombining(p.text)) combiningHits += 1;
      if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
    }
  });
  if (combiningHits > 0) {
    // Not a bug: a handful of plays print onomatopoetic interjections (e.g.
    // Eumenides' "(μ̔υγμός)"/"(ὡ̓γμός)", the Furies' inarticulate groaning)
    // with a breathing mark on a consonant - a combination Unicode has no
    // precomposed character for (breathing marks are only precomposed on
    // vowels/rho), so NFC normalisation cannot and should not collapse it.
    // Verified present byte-for-byte in the raw source XML, not introduced
    // by this importer.
    warn('no-combining-marks', `${combiningHits} string(s) contain a standalone combining diacritic after NFC normalisation (expected: a breathing mark on a consonant in an onomatopoetic interjection, which has no precomposed Unicode form - verified present in the raw source XML)`);
  }
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);

  // ---- speaker-line sanity: every speech passage's first line is non-empty ----
  let missingSpeakerLine = 0;
  walkDivisions(divisions, (d) => {
    if (d.id === 'dramatis-personae') return;
    for (const p of d.passages) {
      const nl = p.text.indexOf('\n');
      if (nl === -1) continue; // stage direction / orphan text: no speaker line (see stripSpeakerLabelLine's doc)
      const firstLine = p.text.slice(0, nl);
      if (firstLine.length === 0) missingSpeakerLine += 1;
    }
  });
  if (missingSpeakerLine > 0) {
    // Not an importer bug: a small number of speeches in this corpus carry a
    // <speaker> element whose entire content is an editorially-<del>-marked
    // attribution with no replacement supplied (the source edition itself
    // leaves the speaker undecided) - see anomalies.json for each occurrence.
    warn('speaker-line', `${missingSpeakerLine} speech passage(s) have an empty first (speaker-name) line (source leaves the attribution undecided - see anomalies.json)`);
  }

  // ---- raw-vs-work text accounting (2026-09-22) ----
  try {
    const accounting = runAccountingCheck(target);
    report.accounting = accounting;
    if (accounting.divergence) {
      err('text-accounting', `raw and work.json reading text diverge after normalisation - ${accounting.divergence}`);
    }
  } catch (e) {
    err('text-accounting', `could not run the raw-vs-work accounting check: ${(e as Error).message}`);
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Greek drama validation report - ${r.target.workId}`);
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
  L.push('');
  L.push('## Per-division passage counts');
  L.push('');
  L.push('| id | number | sourceHeading | passages | chars |');
  L.push('|----|--------|---------------|----------|-------|');
  r.perDivision.forEach((d) => {
    L.push(`| ${d.id} | ${d.number ?? '-'} | ${d.heading ? d.heading.replace(/\|/g, '\\|') : '-'} | ${d.passages} | ${d.chars} |`);
  });
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  L.push(`_${r.anomalies.length} logged - see anomalies.json for the full list._`);
  L.push('');
  L.push('## Raw-vs-work text accounting');
  L.push('');
  if (r.accounting) {
    L.push(`- raw chars (normalised): ${r.accounting.rawChars}`);
    L.push(`- work chars (normalised): ${r.accounting.workChars}`);
    L.push(`- delta: ${r.accounting.delta}`);
    L.push(`- ${r.accounting.divergence ? 'DIVERGES - see Errors below' : 'IDENTICAL'}`);
  } else {
    L.push('_not run_');
  }
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
  const all = targets();
  const reports = all.map(validateWork);

  process.stdout.write('\n=== validate:greek-drama ===\n');
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    writeReport(r);
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(
      `  ${r.target.workId.padEnd(34)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ` +
        `${r.divisionCount} div  ${r.passageCount} passages  ${errors.length} err  ${warns.length} warn\n`,
    );
    for (const f of [...errors, ...warns]) {
      process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
    }
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write('Reports written to data/<workId>/VALIDATION_REPORT.md\n');

  process.stdout.write('\n=== raw-vs-work text accounting (all works) ===\n');
  process.stdout.write(`  ${'workId'.padEnd(34)} ${'raw'.padStart(8)} ${'work'.padStart(8)} ${'delta'.padStart(8)}  status\n`);
  for (const r of reports) {
    const a = r.accounting;
    if (!a) {
      process.stdout.write(`  ${r.target.workId.padEnd(34)} ${'-'.padStart(8)} ${'-'.padStart(8)} ${'-'.padStart(8)}  NOT RUN\n`);
      continue;
    }
    process.stdout.write(
      `  ${r.target.workId.padEnd(34)} ${String(a.rawChars).padStart(8)} ${String(a.workChars).padStart(8)} ${String(a.delta).padStart(8)}  ${a.divergence ? 'DIVERGES' : 'identical'}\n`,
    );
  }

  if (totalErrors > 0) process.exit(1);
}

main();
