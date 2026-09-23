/**
 * Validation for every generated work corpus in scripts/import-aristotle-
 * rest-shared/workTable.ts. Writes data/<workId>/VALIDATION_REPORT.md for
 * each work, prints a combined summary (incl. a raw-vs-imported character
 * coverage table - see below), and exits non-zero if any ERROR-level check
 * fails for any work.
 *
 *   npx tsx scripts/import-aristotle-rest-shared/validate.ts
 *
 * --- Coverage check -----------------------------------------------------
 * For every work, this independently re-derives a "raw content character
 * count" straight from the source XML (all tags stripped by regex, entities
 * decoded, NFC-normalised, whitespace collapsed - i.e. EVERYTHING between
 * tags, including text this importer deliberately excludes) and compares it
 * against (a) every Passage's text actually written to work.json, MINUS any
 * synthetic `[`/`]` characters this importer itself added around a bracket-
 * kept <del> span (see teiWalker.ts - <del> content is KEPT, not excluded,
 * so it counts toward (a) like any other reading text; only the two bracket
 * characters themselves are not present in the raw source and so are backed
 * out), PLUS (b) every character this importer explicitly excluded and
 * LOGGED (sourceHeading text on every Division, every <note>-discarded/
 * <bibl>/<choice><sic>-not-kept excerpt recorded in anomalies.json). If
 * (a)+(b) doesn't land within a small tolerance of the raw count, something
 * is being silently dropped (exactly the class of bug two earlier versions
 * of this importer had: see teiWalker.ts's `<p[\s>]` fix note and its
 * "unified paragraph accumulation" doc comment for the sibling-<lg> fix) and
 * the work FAILS validation.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKS } from './workTable.ts';
import type { WorkEntry } from './workTable.ts';
import { cleanText, hasCombining } from './text.ts';
import type { Division, GenericWork, WorkAbout, Anomaly } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');
const RAW_DIR = join(HERE, '..', 'import-aristotle-rest', 'raw');

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

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '<lb', '<pb', '<del', '<add', '<gap', '<note', '<milestone', '<div', '<head', '</p>', 'xmlns', 'http://'];

/** Raw content chars: strip only tags (keep ALL text incl. head/note/bibl/del),
 *  decode entities, NFC, collapse whitespace. Independent of teiWalker.ts.
 *  For prior-analytics-grc (the one 'book-chapter-filtered' work), this file
 *  actually transmits BOTH Prior AND Posterior Analytics (see workTable.ts);
 *  only the `book n="priora"` span is imported, so the coverage check must
 *  measure only that span too, or it would (correctly, but confusingly)
 *  report ~50% "missing" for content this importer was never meant to touch. */
function rawContentChars(entry: WorkEntry): number {
  const xml = readFileSync(join(RAW_DIR, entry.file), 'utf8');
  const bodyStart = xml.search(/<body\b[^>]*>/);
  const bodyEndMatch = /<\/body>/.exec(xml);
  let body = xml.slice(bodyStart, bodyEndMatch ? bodyEndMatch.index : undefined);
  if (entry.shape.kind === 'book-chapter-filtered') {
    const { filterSubtype, filterN } = entry.shape;
    const openRe = new RegExp(`<div\\b(?=[^>]*\\btype="textpart")(?=[^>]*\\bsubtype="${filterSubtype}")(?=[^>]*\\bn="${filterN}")[^>]*>`);
    const openMatch = openRe.exec(body);
    if (openMatch) {
      const contentStart = openMatch.index + openMatch[0].length;
      // Find this div's matching close by depth-counting nested <div>/</div>.
      const restRe = /<div\b[^>]*>|<\/div>/g;
      restRe.lastIndex = contentStart;
      let depth = 1;
      let end = body.length;
      let mm: RegExpExecArray | null;
      while ((mm = restRe.exec(body))) {
        if (mm[0] === '</div>') depth -= 1;
        else depth += 1;
        if (depth === 0) {
          end = mm.index;
          break;
        }
      }
      body = body.slice(contentStart, end);
    }
  }
  const stripped = body.replace(/<[^>]+>/g, ' ');
  return cleanText(stripped).length;
}

interface WorkReport {
  entry: WorkEntry;
  dir: string;
  findings: Finding[];
  bookCount: number | null;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
  rawChars: number;
  headChars: number;
  excludedChars: number;
  bracketsAdded: number;
  coverageRatio: number;
}

/** Only bibl/note-discarded/choice-sic-logged logs represent text genuinely
 *  ABSENT from work.json (add, del [now bracketed-KEPT - see workTable.ts's
 *  module doc], note-kept-verbatim, sic-kept and gap-ellipsis are all KEPT
 *  in the reading text, just also logged for disclosure - see index.ts's
 *  KIND_LABEL map - so must NOT be subtracted here; gap-lost is a self-
 *  closing element with no raw text of its own either way). Matched by the
 *  distinctive phrasing index.ts's logsToAnomalies gives each kind, not by
 *  kind directly (Anomaly.json only carries where/note strings). */
const EXCLUDED_LOG_PREFIX = /^(<bibl> editorial citation excluded|non-citation <note> discarded|non-citation <head> discarded|<choice><sic> variant NOT kept)/;

function excerptCharsFromAnomalies(anomalies: Anomaly[], workId: string): number {
  // Every logged bibl/note-discarded/choice-sic anomaly note quotes its
  // excerpt in a trailing `"..."` - sum those lengths back out. Truncation
  // markers ("…") are not inserted for these logs, so this is an exact
  // accounting.
  let total = 0;
  for (const a of anomalies) {
    if (!a.where.startsWith(`${workId} /`)) continue;
    if (!EXCLUDED_LOG_PREFIX.test(a.note)) continue;
    const m = /: "([\s\S]*)"$/.exec(a.note);
    if (m) total += m[1]!.length;
  }
  return total;
}

/** Every `<del>` KEPT via bracket-wrapping (not the "already bracketed in
 *  the source" case) adds exactly 2 synthetic characters (`[` and `]`) that
 *  are not present in the raw source - subtract them from the imported side
 *  of the coverage ratio so a work with bracketed dels isn't reported as
 *  artificially "long". */
function bracketsAddedChars(anomalies: Anomaly[], workId: string): number {
  let count = 0;
  for (const a of anomalies) {
    if (!a.where.startsWith(`${workId} /`)) continue;
    if (a.note.startsWith('<del> editor-bracketed text KEPT')) count += 1;
  }
  return count * 2;
}

function sumHeadChars(divisions: Division[]): number {
  let total = 0;
  walkDivisions(divisions, (d) => {
    if (d.sourceHeading) total += d.sourceHeading.length;
  });
  return total;
}

function validateWork(entry: WorkEntry): WorkReport {
  const dir = join(DATA_ROOT, entry.workId);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    entry,
    dir,
    findings,
    bookCount: null,
    chapterCount: 0,
    passageCount: 0,
    totalChars: 0,
    anomalies: [],
    rawChars: 0,
    headChars: 0,
    excludedChars: 0,
    bracketsAdded: 0,
    coverageRatio: 0,
  };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) {
    if (!existsSync(join(dir, f))) err('presence', `missing ${f}`);
  }
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
    for (const required of ['The edition', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies']) {
      if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
    }
  }

  const divisions = work.divisions ?? [];
  const expectBooks = entry.expectedBooks !== null;
  report.bookCount = expectBooks ? divisions.length : null;
  const leafCount = countLeafDivisions(divisions);
  report.chapterCount = leafCount;

  if (expectBooks && divisions.length !== entry.expectedBooks) {
    err('book-count', `expected ${entry.expectedBooks} book(s), got ${divisions.length}`);
  }
  if (leafCount !== entry.expectedChapters) {
    err('chapter-count', `expected ${entry.expectedChapters} chapter(s), got ${leafCount}`);
  }
  walkDivisions(divisions, (d) => {
    if (d.children.length > 0) return;
    if (d.number === null) err('division-number', `${d.id}: number must never be null`);
    if (d.passages.length === 0) err('division-passages', `${d.id}: leaf division has no passages`);
  });

  let passageCount = 0;
  let totalChars = 0;
  walkDivisions(divisions, (d, path) => {
    if (d.children.length > 0) return;
    d.passages.forEach((p, i) => {
      passageCount += 1;
      totalChars += p.text.length;
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${path}: passage[${i}] has empty text`);
    });
  });
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkDivisions(divisions, (d, path) => {
    d.passages.forEach((p, i) => {
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${path}/passage[${i}]: contains ${JSON.stringify(marker)}`);
    });
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- Unicode: NFC required; standalone combining marks logged not failed
  // (see teiWalker.ts / index.ts - genuine vowel-quantity notation in a few files) ----
  let nfcMismatch = 0;
  walkDivisions(divisions, (d) => {
    for (const p of d.passages) if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
  });
  if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);
  let combiningHits = 0;
  walkDivisions(divisions, (d) => {
    for (const p of d.passages) if (hasCombining(p.text)) combiningHits += 1;
  });
  if (combiningHits > 0) warn('combining-marks', `${combiningHits} passage(s) contain a standalone combining diacritic (expected: vowel-quantity marks on omicron/nu - see anomalies.json)`);

  // ---- raw-vs-imported character coverage ----
  const rawChars = rawContentChars(entry);
  const headChars = sumHeadChars(divisions);
  const excludedChars = excerptCharsFromAnomalies(anomalies, entry.workId);
  const bracketsAdded = bracketsAddedChars(anomalies, entry.workId);
  report.rawChars = rawChars;
  report.headChars = headChars;
  report.excludedChars = excludedChars;
  report.bracketsAdded = bracketsAdded;
  const denominator = rawChars - headChars - excludedChars;
  const importedForComparison = totalChars - bracketsAdded;
  const ratio = denominator > 0 ? importedForComparison / denominator : totalChars === 0 ? 1 : 0;
  report.coverageRatio = ratio;
  if (ratio < 0.9 || ratio > 1.1) {
    err(
      'coverage',
      `raw-vs-imported character coverage ratio ${ratio.toFixed(3)} is outside [0.90, 1.10] - ` +
        `raw=${rawChars} head=${headChars} loggedExclusions=${excludedChars} imported=${totalChars} bracketsAdded=${bracketsAdded} ` +
        `(expected imported-brackets ≈ raw - head - loggedExclusions; a low ratio means text is being silently dropped)`,
    );
  } else if (ratio < 0.97 || ratio > 1.03) {
    warn('coverage', `raw-vs-imported character coverage ratio ${ratio.toFixed(3)} (within tolerance, but outside the tight ±3% band - likely just whitespace-collapse variance)`);
  } else if (ratio < 0.99) {
    warn('coverage', `raw-vs-imported character coverage ratio ${ratio.toFixed(3)} is below the 0.99 floor the coordinator asked this batch to confirm - investigate before reporting this work as reconciled`);
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Aristotle-rest validation report - ${r.entry.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  if (r.bookCount !== null) L.push(`- books: ${r.bookCount}`);
  L.push(`- chapters (leaf divisions): ${r.chapterCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- raw content chars (source, tags stripped): ${r.rawChars}`);
  L.push(`- head chars preserved as sourceHeading: ${r.headChars}`);
  L.push(`- logged excluded chars (bibl/discarded-note/not-kept-choice-sic): ${r.excludedChars}`);
  L.push(`- synthetic bracket chars added around kept <del> spans: ${r.bracketsAdded}`);
  L.push(`- coverage ratio: ${r.coverageRatio.toFixed(4)}`);
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
  for (const r of reports) writeReport(r);

  process.stdout.write('\n=== validate:aristotle-rest-grc ===\n\n');
  process.stdout.write(
    `${'workId'.padEnd(34)} ${'result'.padEnd(4)} ${'books'.padStart(5)} ${'ch'.padStart(5)} ${'chars'.padStart(8)} ${'raw'.padStart(8)} ${'coverage'.padStart(9)}\n`,
  );
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(
      `${r.entry.workId.padEnd(34)} ${(errors.length === 0 ? 'PASS' : 'FAIL').padEnd(4)} ${String(r.bookCount ?? '-').padStart(5)} ${String(r.chapterCount).padStart(5)} ${String(r.totalChars).padStart(8)} ${String(r.rawChars).padStart(8)} ${r.coverageRatio.toFixed(3).padStart(9)}\n`,
    );
    for (const f of [...errors, ...warns]) {
      process.stdout.write(`    [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
    }
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} works.\n`);
  process.stdout.write(`Reports written to data/<workId>/VALIDATION_REPORT.md\n`);
  if (totalErrors > 0) process.exit(1);
}

main();
