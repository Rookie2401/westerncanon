/**
 * Shared structural validator core for the eight Cicero letters-selection
 * works. Each work's own scripts/import-<workId>/validate.ts calls
 * `validateWork` with its own spec (required Division ids, spot-check
 * snippets) and writes data/<workId>/VALIDATION_REPORT.md.
 *
 * Checks performed, generically, for every work:
 *   - work.json/about.json/anomalies.json all present
 *   - workId/language match
 *   - every Division: id matches `letter-<book>-<letter>` and number
 *     matches `<book>.<letter>` for the SAME book/letter; children === [];
 *     ref === null; at least one Passage
 *   - Divisions are sorted ascending by (book, letter)
 *   - every Passage: n === '', ref === null, non-empty text
 *   - no leaked XML/HTML tag fragments or unescaped entities in any
 *     sourceHeading/passage text
 *   - every spec.requiredIds entry is present (the task's explicitly named
 *     letters - a real omission here is a real bug, not a documented gap,
 *     since a documented gap must instead appear in anomalies.json and be
 *     absent from requiredIds by the spec author)
 *   - every spec.spotChecks entry's text matches (verbatim incipit/explicit
 *     substring, NFC-insensitive)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: { n: string; text: string; ref: string | null; anomaly?: string }[];
}

export interface GenericWork {
  workId: string;
  language: string;
  divisions: Division[];
}

interface Anomaly {
  where: string;
  note: string;
}

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

export interface SpotCheck {
  id: string;
  startsWith?: string;
  endsWith?: string;
  contains?: string;
}

export interface WorkValidationSpec {
  workId: string;
  language: 'la' | 'en';
  dataDir: string;
  /** Division ids that MUST be present - the task's explicitly named letters plus any 'ALL'-book spot letters worth pinning. */
  requiredIds: string[];
  /** sanity floor - real count is data-driven, not hard-coded, so this just guards against a badly broken run */
  minDivisionCount: number;
  spotChecks: SpotCheck[];
}

export interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  anomalies: Anomaly[];
  spotResults: { label: string; ok: boolean; got: string }[];
}

const ID_RE = /^letter-(\d+)-([0-9]+[a-z]?)$/;
const NUMBER_RE = /^(\d+)\.([0-9]+[a-z]?)$/;
const TAG_LEAK_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
const ENTITY_LEAK_RE = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/;

export function validateWork(spec: WorkValidationSpec): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    workId: spec.workId,
    dir: spec.dataDir,
    findings,
    divisionCount: 0,
    passageCount: 0,
    totalChars: 0,
    anomalies: [],
    spotResults: [],
  };

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(spec.dataDir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(spec.dataDir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(spec.dataDir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(spec.dataDir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== spec.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${spec.workId}`);
  if (work.language !== spec.language) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${spec.language}`);
  if (about['workId'] !== spec.workId) err('about-workId', `about.json workId is ${JSON.stringify(about['workId'])}, expected ${spec.workId}`);

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;
  if (divisions.length < spec.minDivisionCount) {
    err('division-count-floor', `expected at least ${spec.minDivisionCount} divisions, got ${divisions.length}`);
  }

  let prevKey: [number, number, string] | null = null;
  let passageCount = 0;
  let totalChars = 0;
  const seenIds = new Set<string>();

  for (const d of divisions) {
    const idM = ID_RE.exec(d.id);
    const numM = d.number ? NUMBER_RE.exec(d.number) : null;
    if (!idM) {
      err('division-id-shape', `id ${JSON.stringify(d.id)} does not match letter-<book>-<letter>`);
    }
    if (!numM) {
      err('division-number-shape', `${d.id}: number ${JSON.stringify(d.number)} does not match <book>.<letter>`);
    }
    if (idM && numM) {
      if (idM[1] !== numM[1] || idM[2]!.toLowerCase() !== numM[2]!.toLowerCase()) {
        err('division-id-number-mismatch', `${d.id}: id book/letter does not match number ${d.number}`);
      }
    }
    if (seenIds.has(d.id)) err('division-duplicate-id', `duplicate division id ${d.id}`);
    seenIds.add(d.id);

    if (d.ref !== null) err('division-ref', `${d.id}: ref must be null, got ${JSON.stringify(d.ref)}`);
    if (!Array.isArray(d.children) || d.children.length !== 0) {
      err('division-children', `${d.id}: children must be [], got ${JSON.stringify(d.children)}`);
    }
    if (d.editorialTitle !== null) {
      err('division-editorialTitle', `${d.id}: editorialTitle must be null, got ${JSON.stringify(d.editorialTitle)}`);
    }
    if (d.passages.length === 0) err('division-no-passages', `${d.id}: has zero passages`);
    if (d.sourceHeading !== null && (typeof d.sourceHeading !== 'string' || d.sourceHeading.trim().length === 0)) {
      err('division-sourceHeading', `${d.id}: sourceHeading must be a non-empty string or null`);
    }

    // ordering
    if (idM) {
      const book = Number(idM[1]);
      const letterRaw = idM[2]!;
      const lm = /^(\d+)([a-z]?)$/.exec(letterRaw);
      const letterNum = lm ? Number(lm[1]) : 0;
      const letterSuffix = lm ? lm[2]! : '';
      const key: [number, number, string] = [book, letterNum, letterSuffix];
      if (prevKey) {
        const cmp =
          key[0] !== prevKey[0] ? key[0] - prevKey[0] : key[1] !== prevKey[1] ? key[1] - prevKey[1] : key[2].localeCompare(prevKey[2]);
        if (cmp < 0) err('division-order', `${d.id} is out of (book, letter) ascending order (previous was book ${prevKey[0]} letter ${prevKey[1]}${prevKey[2]})`);
      }
      prevKey = key;
    }

    let chars = 0;
    for (const p of d.passages) {
      passageCount += 1;
      chars += p.text.length;
      if (p.n !== '') err('passage-n', `${d.id}: passage.n must be "", got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage.ref must be null, got ${JSON.stringify(p.ref)}`);
      if (typeof p.text !== 'string' || p.text.trim().length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      const tagLeak = TAG_LEAK_RE.exec(p.text);
      if (tagLeak) err('no-leaked-markup', `${d.id}: passage text leaks a tag fragment: ${JSON.stringify(tagLeak[0])}`);
      const entityLeak = ENTITY_LEAK_RE.exec(p.text);
      if (entityLeak) err('no-leaked-entity', `${d.id}: passage text leaks an entity: ${JSON.stringify(entityLeak[0])}`);
      if (p.text.includes('�')) err('no-replacement-char', `${d.id}: passage text contains U+FFFD`);
    }
    if (d.sourceHeading) {
      const tagLeak = TAG_LEAK_RE.exec(d.sourceHeading);
      if (tagLeak) err('no-leaked-markup', `${d.id}: sourceHeading leaks a tag fragment: ${JSON.stringify(tagLeak[0])}`);
    }
    totalChars += chars;
  }
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  for (const reqId of spec.requiredIds) {
    if (!seenIds.has(reqId)) err('required-letter-missing', `required letter division "${reqId}" is missing from work.json`);
  }

  for (const sc of spec.spotChecks) {
    const d = divisions.find((x) => x.id === sc.id);
    if (!d) {
      err('spot-check-missing-division', `spot-check division "${sc.id}" not found`);
      continue;
    }
    const text = d.passages.map((p) => p.text).join('\n\n');
    if (sc.startsWith) {
      const ok = text.normalize('NFC').startsWith(sc.startsWith.normalize('NFC'));
      report.spotResults.push({ label: `${sc.id} starts with ${JSON.stringify(sc.startsWith)}`, ok, got: text.slice(0, 80) });
      if (!ok) err('spot-check-start', `${sc.id} does not start with ${JSON.stringify(sc.startsWith)} (got: ${JSON.stringify(text.slice(0, 80))})`);
    }
    if (sc.endsWith) {
      const ok = text.normalize('NFC').endsWith(sc.endsWith.normalize('NFC'));
      report.spotResults.push({ label: `${sc.id} ends with ${JSON.stringify(sc.endsWith)}`, ok, got: text.slice(-80) });
      if (!ok) err('spot-check-end', `${sc.id} does not end with ${JSON.stringify(sc.endsWith)} (got tail: ${JSON.stringify(text.slice(-80))})`);
    }
    if (sc.contains) {
      const ok = text.normalize('NFC').includes(sc.contains.normalize('NFC'));
      report.spotResults.push({ label: `${sc.id} contains ${JSON.stringify(sc.contains)}`, ok, got: '' });
      if (!ok) err('spot-check-contains', `${sc.id} does not contain ${JSON.stringify(sc.contains)}`);
    }
  }

  // anomalies.json shape
  for (const a of anomalies) {
    if (typeof a.where !== 'string' || typeof a.note !== 'string') {
      err('anomalies-shape', `anomalies.json entry is not {where, note}: ${JSON.stringify(a)}`);
    }
  }

  // about.json must state this is a curated selection (required framing).
  const aboutStr = JSON.stringify(about).toLowerCase();
  if (!aboutStr.includes('selection') || !aboutStr.includes('not the') ) {
    warn('about-selection-framing', 'about.json should clearly state this is a curated selection, not the full collection');
  }

  return report;
}

export function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Cicero letters-selection validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- divisions (letters): ${r.divisionCount}`);
  L.push(`- passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Spot checks');
  L.push('');
  if (r.spotResults.length === 0) L.push('_none_');
  for (const s of r.spotResults) L.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}${s.got ? `\n  - got: \`${s.got}\`` : ''}`);
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

export function printSummaryAndExit(reports: WorkReport[]): void {
  const all = reports.flatMap((r) => r.findings.map((f) => ({ w: r.workId, ...f })));
  process.stdout.write('\n=== validate ===\n');
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  for (const r of reports) {
    process.stdout.write(
      `  ${r.workId.padEnd(32)} ${String(r.divisionCount).padStart(3)} divisions / ${String(r.passageCount).padStart(3)} passages / ${String(r.totalChars).padStart(6)} chars -> ${join(r.dir, 'VALIDATION_REPORT.md')}\n`,
    );
  }
  if (errors.length > 0) process.exit(1);
}
