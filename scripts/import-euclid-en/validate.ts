/**
 * Validation for the generated English Euclid *Elements* corpus (Heath,
 * 1908).
 *
 *   npm run validate:euclid-en
 *
 * Writes data/euclid-elements-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved, documented source irregularities) do not fail the run.
 *
 * Unlike scripts/import-euclid-shared/validate.ts (the Greek edition's
 * validator, which checks every count against a hand-verified GROUND_TRUTH
 * table), this validator uses INTERNAL consistency checks only - this is an
 * independently-edited English witness and is expected to diverge from the
 * Greek witness's own exact counts in bookkeeping detail (see the top-level
 * task notes / about.json). What it checks instead: each Book's own
 * section-type groups form a sane, known subset in canonical order; each
 * group's own leaf numbers are a complete, gap-free, duplicate-free
 * increasing sequence; no leaf (besides the one documented exception) is
 * empty; no transport markup leaked into any text field; and a verbatim
 * spot-check of Book I Definition 1 and Book XIII's genuine final passage.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOK_TITLES, TYPE_META, isTypeCode, type TypeCode } from '../import-euclid-shared/structure.ts';
import type { Division, GenericWork } from '../../data/euclid-elements-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'euclid-elements-en');

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
  '&amp;', '&lt;', '&gt;', '{{', '}}', '[[', ']]',
  '<div', '<p>', '</p>', '<lb', '<pb', '<note', '<del', '</del>', '<add', '</add>',
  '<num', '</num>', '<figure', '<emph', '</emph>', '<hi', '</hi>', '<label', '</label>',
  '<ref', '</ref>', '<foreign', '</foreign>', '<quote', '</quote>', '<term', '</term>',
  '<bibl', '</bibl>', '<title', '</title>', '<milestone',
  'http://', 'https://', 'xmlns',
];

/** Canonical section-type codes, in the order they must appear within a Book (mirrors TYPE_META's key order for a "normal" book / Book X). */
const NORMAL_TYPES: TypeCode[] = ['def', 'post', 'comm_not', 'prop'];
const BOOK_X_TYPES: TypeCode[] = ['def1', 'prop1', 'def2', 'prop2', 'def3', 'prop3'];

const KNOWN_EMPTY_LEAF_ID = 'book-6-def-5';

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
    if (d.sourceHeading) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    if (d.children.length > 0) walkTexts(d.children, visit);
  }
}

interface PerLeaf {
  id: string;
  number: string | null;
  passages: number;
  chars: number;
}

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run \`npm run import:euclid-en\` first`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, null);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  // ---- top-level shape ----
  if (work.workId !== 'euclid-elements-en') err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected "euclid-elements-en"`);
  if (work.language !== 'en') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "en"`);
  if (about['translator'] !== undefined && about['translator'] !== 'Thomas Little Heath') {
    err('translator-spelling', `about.json translator is ${JSON.stringify(about['translator'])}, must be exactly "Thomas Little Heath"`);
  }

  const divisions = work.divisions ?? [];

  // ---- 13 Books, in order, with the curated (reused) titles ----
  if (divisions.length !== 13) {
    err('book-count', `expected exactly 13 Book divisions, got ${divisions.length}`);
  }
  divisions.forEach((b, i) => {
    const meta = BOOK_TITLES[i];
    if (!meta) return;
    if (b.id !== meta.id) err('book-id', `book[${i}] id ${JSON.stringify(b.id)} != canonical ${JSON.stringify(meta.id)}`);
    if (b.number !== meta.number) err('book-number', `${b.id}: number ${JSON.stringify(b.number)} != canonical ${JSON.stringify(meta.number)}`);
    if (b.editorialTitle !== meta.en) err('book-editorialTitle', `${b.id}: editorialTitle ${JSON.stringify(b.editorialTitle)} != canonical ${JSON.stringify(meta.en)}`);
    if (b.sourceHeading !== null) warn('book-sourceHeading', `${b.id}: sourceHeading should be null`);
    if (b.ref !== null) err('book-ref', `${b.id}: ref should be null (no citation anchor is derived from this source's page breaks)`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: a Book container must carry no passages of its own, got ${b.passages.length}`);
    if (b.children.length === 0) err('book-children', `${b.id}: a Book must have at least one section-type group`);
  });

  // ---- per-book section-type groups + leaves: internal consistency only ----
  const perLeaf: PerLeaf[] = [];
  const emptyLeaves: string[] = [];
  let totalLeaves = 0;
  let totalPassages = 0;
  let totalChars = 0;
  let sourceHeadingCount = 0;

  divisions.forEach((bookDiv, bi) => {
    const bookNum = bi + 1;
    const expectedTypes = bookNum === 10 ? BOOK_X_TYPES : NORMAL_TYPES;
    const gotTypeSuffixes = bookDiv.children.map((g) => g.id.replace(`book-${bookNum}-`, ''));
    const wantSubset = expectedTypes.map((t) => TYPE_META[t].groupIdSuffix);
    // every group id must be one of the canonical suffixes, in the canonical relative order (a subset, never reordered/duplicated)
    let cursor = -1;
    let orderOk = true;
    for (const suf of gotTypeSuffixes) {
      const idx = wantSubset.indexOf(suf);
      if (idx < 0 || idx <= cursor) {
        orderOk = false;
        break;
      }
      cursor = idx;
    }
    if (!orderOk) {
      err(
        'book-groups',
        `${bookDiv.id}: section-type groups ${JSON.stringify(gotTypeSuffixes)} are not a canonical-order subset of ${JSON.stringify(wantSubset)}`,
      );
      return;
    }

    for (const groupDiv of bookDiv.children) {
      const suf = groupDiv.id.replace(`book-${bookNum}-`, '');
      const type = expectedTypes.find((t) => TYPE_META[t].groupIdSuffix === suf);
      if (!type || !isTypeCode(type)) {
        err('book-groups', `${groupDiv.id}: unrecognised section-type suffix ${JSON.stringify(suf)}`);
        continue;
      }
      const meta = TYPE_META[type];
      if (groupDiv.number !== null) err('group-number', `${groupDiv.id}: number should be null`);
      if (groupDiv.editorialTitle !== meta.groupLabel) {
        err('group-editorialTitle', `${groupDiv.id}: editorialTitle ${JSON.stringify(groupDiv.editorialTitle)} != canonical ${JSON.stringify(meta.groupLabel)}`);
      }
      if (groupDiv.passages.length !== 0) err('group-passages', `${groupDiv.id}: a section-type group must carry no passages of its own`);
      if (groupDiv.children.length === 0) {
        err('group-children', `${groupDiv.id}: a section-type group must have at least one leaf`);
        continue;
      }

      // leaf numbers: complete, gap-free, duplicate-free increasing sequence (own range, not assumed to start at 1)
      let prev: number | null = null;
      groupDiv.children.forEach((leaf) => {
        totalLeaves += 1;
        const n = Number(leaf.number);
        if (!Number.isFinite(n)) {
          err('leaf-number-numeric', `${leaf.id}: Division.number ${JSON.stringify(leaf.number)} is not numeric`);
        } else {
          if (prev !== null && n !== prev + 1) {
            err('leaf-number-sequence', `${groupDiv.id}: leaf numbers are not a complete increasing sequence (…${prev}, ${n}…)`);
          }
          prev = n;
        }
        const wantId = `book-${bookNum}-${meta.leafInfix}-${leaf.number}`;
        if (leaf.id !== wantId) err('leaf-id', `leaf id ${JSON.stringify(leaf.id)} != canonical ${JSON.stringify(wantId)}`);
        if (leaf.editorialTitle !== null) err('leaf-editorialTitle', `${leaf.id}: editorialTitle should be null`);
        if (leaf.ref !== null) err('leaf-ref', `${leaf.id}: ref should be null`);
        if (leaf.children.length !== 0) err('leaf-children', `${leaf.id}: a leaf must have no children`);
        if (leaf.sourceHeading !== null) {
          sourceHeadingCount += 1;
          if (!type.startsWith('prop')) {
            warn('leaf-sourceHeading', `${leaf.id}: sourceHeading set on a non-proposition leaf (${JSON.stringify(leaf.sourceHeading)}) - expected only for prop-type leaves`);
          }
        }

        let chars = 0;
        if (leaf.passages.length === 0) {
          emptyLeaves.push(leaf.id);
        }
        for (const p of leaf.passages) {
          totalPassages += 1;
          chars += p.text.length;
          if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${leaf.id}: a passage has empty text`);
          if (p.n !== '') err('passage-n', `${leaf.id}: passage n should be '' (this source has no printed paragraph numbers), got ${JSON.stringify(p.n)}`);
          if (p.ref !== null) err('passage-ref', `${leaf.id}: passage ref should be null, got ${JSON.stringify(p.ref)}`);
          if ('figure' in p) err('no-figure-field', `${leaf.id}: this text-only edition's Passage must never carry a figure field`);
        }
        totalChars += chars;
        perLeaf.push({ id: leaf.id, number: leaf.number, passages: leaf.passages.length, chars });
      });
    }
  });

  // ---- no leaf should be empty, except the one documented exception ----
  const gotEmpty = [...new Set(emptyLeaves)].sort();
  const unexpectedEmpty = gotEmpty.filter((id) => id !== KNOWN_EMPTY_LEAF_ID);
  if (unexpectedEmpty.length > 0) {
    err('empty-leaves', `leaf division(s) unexpectedly carry zero passages: ${unexpectedEmpty.join(', ')}`);
  }
  if (gotEmpty.includes(KNOWN_EMPTY_LEAF_ID)) {
    err('empty-leaves', `${KNOWN_EMPTY_LEAF_ID} carries zero passages - the importer should have inserted its documented honest placeholder`);
  } else {
    warn('known-empty-leaf', `${KNOWN_EMPTY_LEAF_ID} carries its documented honest placeholder (Heath omits this definition outright; the only genuinely empty <p></p> in the source) rather than a translated definition`);
  }

  // ---- anomalies.json accounting ----
  const noteAnomalies = anomalies.filter((a) => a.note.startsWith('<note> excluded')).length;
  const figureAnomalies = anomalies.filter((a) => /^<figure> diagram marker/.test(a.note)).length;
  if (noteAnomalies < 1) err('anomalies-notes', 'no individually-logged <note> commentary anomalies found');
  if (figureAnomalies < 1) err('anomalies-figures', 'no individually-logged <figure> marker anomalies found');

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- verbatim spot-check ----
  const firstLeaf = divisions[0]?.children[0]?.children[0];
  const firstText = firstLeaf?.passages[0]?.text ?? '';
  const spotStart = 'A point is that which has no part.';
  const startOk = firstText === spotStart;
  if (!startOk) err('spot-start', `Book I, Definition 1 does not read exactly ${JSON.stringify(spotStart)} (got: ${JSON.stringify(firstText)})`);

  const lastBook = divisions[divisions.length - 1];
  const lastGroup = lastBook?.children[lastBook.children.length - 1];
  const lastLeaf = lastGroup?.children[lastGroup.children.length - 1];
  const lastText = lastLeaf?.passages[lastLeaf.passages.length - 1]?.text ?? '';
  const spotEnd = 'therefore the whole angle ABC of the pentagon consists of one right angle and a fifth. Q. E. D.';
  const endOk = lastText.endsWith(spotEnd);
  if (!endOk) err('spot-end', `Book XIII's final passage does not end with ${JSON.stringify(spotEnd)} (got tail: ${JSON.stringify(lastText.slice(-100))})`);
  if (lastLeaf?.id !== 'book-13-prop-18') err('spot-end-id', `expected the final leaf to be book-13-prop-18, got ${JSON.stringify(lastLeaf?.id)}`);

  // ---- write report -------------------------------------------------------
  const errors = findings.filter((f) => f.level === 'ERROR');
  writeReport(findings, {
    divisionCount: divisions.length,
    totalLeaves,
    totalPassages,
    totalChars,
    sourceHeadingCount,
    perLeaf,
    anomalyCount: anomalies.length,
    spotCheck: [
      { label: 'Book I, Definition 1 reads exactly the expected text', ok: startOk, got: firstText },
      { label: "Book XIII's final passage ends with the expected text", ok: endOk, got: lastText.slice(-100) },
    ],
  });

  process.stdout.write('\n=== validate:euclid-en ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Report: ${join(DIR, 'VALIDATION_REPORT.md')}\n` +
      `\n13 books  ${totalLeaves} leaf divisions  ${totalPassages} passages  ${totalChars} chars\n`,
  );
  if (errors.length > 0) process.exit(1);
}

interface ReportData {
  divisionCount: number;
  totalLeaves: number;
  totalPassages: number;
  totalChars: number;
  sourceHeadingCount: number;
  perLeaf: PerLeaf[];
  anomalyCount: number;
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function writeReport(findings: Finding[], data: ReportData | null): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push('# English Euclid *Elements* (Heath, 1908) validation report');
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  if (data) {
    L.push('## Counts');
    L.push('');
    L.push(`- Books: ${data.divisionCount}`);
    L.push(`- leaf divisions (definitions/postulates/common notions/propositions): ${data.totalLeaves}`);
    L.push(`- passages: ${data.totalPassages}`);
    L.push(`- total passage chars: ${data.totalChars}`);
    L.push(`- leaves carrying a verbatim printed sourceHeading (proposition leaves only): ${data.sourceHeadingCount}`);
    L.push(`- anomalies.json entries: ${data.anomalyCount}`);
    L.push('');
    L.push('## Verbatim spot-check');
    L.push('');
    for (const s of data.spotCheck) L.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got.slice(0, 100)}\``);
    L.push('');
  }
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
