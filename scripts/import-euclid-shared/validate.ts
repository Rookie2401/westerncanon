/**
 * Validation for the generated Euclid *Elements* corpus.
 *
 *   npm run validate:euclid
 *
 * Writes data/euclid-elements/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved, documented source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOK_TITLES,
  EXPECTED_COMBINING_MARK_HITS,
  EXPECTED_EMPTY_LEAVES,
  EXPECTED_TOTAL_FIGURE_OBJECTS,
  EXPECTED_TOTAL_FIGURES,
  EXPECTED_TOTAL_LEAVES,
  GROUND_TRUTH,
  TYPE_META,
  expectedNumbers,
  type TypeCode,
} from './structure.ts';
import type { Division, GenericWork } from '../../data/euclid-elements/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'euclid-elements');

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
  '<div', '<p>', '</p>', '<lb', '<pb', '<note', '<del', '</del>', '<add', '</add>', '<num', '</num>', '<figure',
  'http://', 'https://', 'xmlns',
];

function groupIdOf(bookNum: number, type: TypeCode): string {
  return `book-${bookNum}-${TYPE_META[type].groupIdSuffix}`;
}
function leafIdOf(bookNum: number, type: TypeCode, number: string): string {
  return `book-${bookNum}-${TYPE_META[type].leafInfix}-${number}`;
}

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}]`));
    if (d.children.length > 0) walkTexts(d.children, visit);
  }
}

function isCombiningCp(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  );
}
function hasCombining(s: string): boolean {
  for (const ch of s) if (isCombiningCp(ch.codePointAt(0) ?? 0)) return true;
  return false;
}

interface PerLeaf {
  id: string;
  number: string | null;
  passages: number;
  chars: number;
  figures: number;
}

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} - run \`npm run import:euclid\` first`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, null);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  // ---- top-level shape ----
  if (work.workId !== 'euclid-elements') err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected "euclid-elements"`);
  if (work.language !== 'grc') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "grc"`);
  if (about['editor'] !== undefined && about['editor'] !== 'Johan Ludvig Heiberg') {
    err('editor-spelling', `about.json editor is ${JSON.stringify(about['editor'])}, must be exactly "Johan Ludvig Heiberg"`);
  }

  const divisions = work.divisions ?? [];

  // ---- 13 Books, in order, with the curated titles ----
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
    if (b.ref !== null) err('book-ref', `${b.id}: ref should be null (no page/line markers in this source)`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: a Book container must carry no passages of its own, got ${b.passages.length}`);
    if (b.children.length === 0) err('book-children', `${b.id}: a Book must have at least one section-type group`);
  });

  // ---- per-book section-type groups + leaves, against GROUND_TRUTH ----
  const perLeaf: PerLeaf[] = [];
  const emptyLeaves: string[] = [];
  let totalLeaves = 0;
  let totalPassages = 0;
  let totalChars = 0;
  let totalFigures = 0;

  for (const bgt of GROUND_TRUTH) {
    const bookDiv = divisions[bgt.book - 1];
    if (!bookDiv) continue; // already reported above

    const wantGroupIds = bgt.groups.map((g) => groupIdOf(bgt.book, g.type));
    const gotGroupIds = bookDiv.children.map((g) => g.id);
    if (gotGroupIds.length !== wantGroupIds.length || gotGroupIds.some((id, i) => id !== wantGroupIds[i])) {
      err(
        'book-groups',
        `Book ${bgt.book}: section-type group ids do not match ground truth.\n    got:  ${gotGroupIds.join(', ')}\n    want: ${wantGroupIds.join(', ')}`,
      );
      continue;
    }

    bgt.groups.forEach((g, gi) => {
      const groupDiv = bookDiv.children[gi]!;
      const meta = TYPE_META[g.type];
      if (groupDiv.number !== null) err('group-number', `${groupDiv.id}: number should be null`);
      if (groupDiv.sourceHeading !== null) warn('group-sourceHeading', `${groupDiv.id}: sourceHeading should be null`);
      if (groupDiv.editorialTitle !== meta.groupLabel) {
        err('group-editorialTitle', `${groupDiv.id}: editorialTitle ${JSON.stringify(groupDiv.editorialTitle)} != canonical ${JSON.stringify(meta.groupLabel)}`);
      }
      if (groupDiv.passages.length !== 0) err('group-passages', `${groupDiv.id}: a section-type group must carry no passages of its own`);

      const want = expectedNumbers(g);
      const got = groupDiv.children.map((leaf) => leaf.number);
      if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
        err(
          'leaf-numbers',
          `${groupDiv.id}: leaf numbers do not match ground truth.\n    got:  ${got.join(',')}\n    want: ${want.join(',')}`,
        );
        return;
      }

      for (const leaf of groupDiv.children) {
        totalLeaves += 1;
        const wantId = leafIdOf(bgt.book, g.type, leaf.number ?? '');
        if (leaf.id !== wantId) err('leaf-id', `leaf id ${JSON.stringify(leaf.id)} != canonical ${JSON.stringify(wantId)}`);
        if (leaf.editorialTitle !== null) err('leaf-editorialTitle', `${leaf.id}: editorialTitle should be null (leaves are numbered only, per the editorial-title policy)`);
        if (leaf.sourceHeading !== null) warn('leaf-sourceHeading', `${leaf.id}: sourceHeading should be null`);
        if (leaf.ref !== null) err('leaf-ref', `${leaf.id}: ref should be null (no page/line markers in this source)`);
        if (leaf.children.length !== 0) err('leaf-children', `${leaf.id}: a leaf must have no children`);

        let chars = 0;
        let figures = 0;
        if (leaf.passages.length === 0) {
          emptyLeaves.push(leaf.id);
        }
        for (const p of leaf.passages) {
          totalPassages += 1;
          chars += p.text.length;
          if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${leaf.id}: a passage has empty text`);
          if (p.n !== '') err('passage-n', `${leaf.id}: passage n should be '' (this source has no paragraph numbers), got ${JSON.stringify(p.n)}`);
          if (p.ref !== null) err('passage-ref', `${leaf.id}: passage ref should be null, got ${JSON.stringify(p.ref)}`);
          if (p.figure) {
            figures += 1;
            totalFigures += 1;
            if (p.figure.image) err('figure-image', `${leaf.id}: figure has an image, but this build ships without any (source diagrams are unrecoverable) - got ${JSON.stringify(p.figure.image)}`);
            if (!p.figure.note) err('figure-note', `${leaf.id}: figure has no image, so it must carry a note`);
            if (!p.figure.source || !p.figure.source.startsWith('Heiberg, Elements')) {
              err('figure-source', `${leaf.id}: figure.source ${JSON.stringify(p.figure.source)} does not start with "Heiberg, Elements"`);
            }
          }
        }
        totalChars += chars;
        perLeaf.push({ id: leaf.id, number: leaf.number, passages: leaf.passages.length, chars, figures });
      }
    });
  }

  // ---- exact totals ----
  if (totalLeaves !== EXPECTED_TOTAL_LEAVES) {
    err('total-leaves', `expected ${EXPECTED_TOTAL_LEAVES} total leaf divisions, got ${totalLeaves}`);
  }
  if (totalFigures !== EXPECTED_TOTAL_FIGURE_OBJECTS) {
    err(
      'total-figures',
      `expected ${EXPECTED_TOTAL_FIGURE_OBJECTS} total Passage.figure objects (498 markers minus 5 same-passage ` +
        `merges - see EXPECTED_TOTAL_FIGURE_OBJECTS), got ${totalFigures}`,
    );
  }

  // ---- the five documented zero-passage leaves, exactly ----
  const wantEmpty = [...EXPECTED_EMPTY_LEAVES].sort();
  const gotEmpty = [...emptyLeaves].sort();
  if (JSON.stringify(gotEmpty) !== JSON.stringify(wantEmpty)) {
    err(
      'empty-leaves',
      `zero-passage leaves do not match the documented set.\n    got:  ${gotEmpty.join(', ')}\n    want: ${wantEmpty.join(', ')}`,
    );
  } else if (gotEmpty.length > 0) {
    warn('empty-leaves', `${gotEmpty.length} leaf division(s) carry zero passages, as documented: ${gotEmpty.join(', ')}`);
  }

  // ---- anomalies.json accounting ----
  const figureAnomalies = anomalies.filter((a) => /^<figure\/> diagram marker/.test(a.note)).length;
  const delAnomalies = anomalies.filter((a) => /^<del> excluded from the reading text/.test(a.note)).length;
  const addAnomalies = anomalies.filter((a) => /^<add> editorial insertion/.test(a.note)).length;
  if (figureAnomalies !== EXPECTED_TOTAL_FIGURES) {
    err('anomalies-figures', `expected ${EXPECTED_TOTAL_FIGURES} individually-logged <figure/> anomalies, got ${figureAnomalies}`);
  }
  if (delAnomalies < 1) err('anomalies-del', 'no individually-logged <del> anomalies found');
  if (addAnomalies < 1) err('anomalies-add', 'no individually-logged <add> anomalies found');

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- Unicode form: polytonic Greek must stay precomposed (no NFD) ----
  let combiningHits = 0;
  walkTexts(divisions, (s) => {
    if (hasCombining(s)) combiningHits += 1;
  });
  if (combiningHits !== EXPECTED_COMBINING_MARK_HITS) {
    err(
      'no-combining-marks',
      `expected exactly ${EXPECTED_COMBINING_MARK_HITS} string(s) with a standalone combining diacritic ` +
        `(the one documented "Σο͂" occurrence in Book XI, Proposition 31 - see EXPECTED_COMBINING_MARK_HITS), got ${combiningHits}`,
    );
  } else if (combiningHits > 0) {
    warn(
      'no-combining-marks',
      `${combiningHits} documented standalone combining diacritic preserved verbatim (Book XI, Proposition 31, "Σο͂") - not corrected, per this app's source-fidelity policy`,
    );
  }

  // ---- spot check ----
  const firstLeaf = divisions[0]?.children[0]?.children[0];
  const firstText = firstLeaf?.passages[0]?.text ?? '';
  const spotStart = 'σημεῖόν ἐστιν, οὗ μέρος οὐθέν.';
  const startOk = firstText.normalize('NFC') === spotStart.normalize('NFC');
  if (!startOk) err('spot-start', `Book I, Definition 1 does not read exactly ${JSON.stringify(spotStart)} (got: ${JSON.stringify(firstText)})`);

  const lastBook = divisions[divisions.length - 1];
  const lastGroup = lastBook?.children[lastBook.children.length - 1];
  const lastLeaf = lastGroup?.children[lastGroup.children.length - 1];
  const lastText = lastLeaf?.passages[lastLeaf.passages.length - 1]?.text ?? '';
  const spotEnd = 'μιᾶς ἐστιν ὀρθῆς καὶ πέμπτου· ὅπερ ἔδει δεῖξαι.';
  const endOk = lastText.normalize('NFC').endsWith(spotEnd.normalize('NFC'));
  if (!endOk) err('spot-end', `Book XIII's final proposition does not end with ${JSON.stringify(spotEnd)} (got tail: ${JSON.stringify(lastText.slice(-60))}) - possible truncation`);

  // ---- write report -------------------------------------------------------
  const errors = findings.filter((f) => f.level === 'ERROR');
  writeReport(findings, {
    divisionCount: divisions.length,
    totalLeaves,
    totalPassages,
    totalChars,
    totalFigures,
    perLeaf,
    emptyLeaves: gotEmpty,
    anomalyCounts: { figures: figureAnomalies, del: delAnomalies, add: addAnomalies, total: anomalies.length },
    spotCheck: [
      { label: 'Book I, Definition 1 reads exactly the expected text', ok: startOk, got: firstText },
      { label: `Book XIII's final proposition ends with the expected text`, ok: endOk, got: lastText.slice(-80) },
    ],
  });

  process.stdout.write('\n=== validate:euclid ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Report: ${join(DIR, 'VALIDATION_REPORT.md')}\n` +
      `\n13 books  ${totalLeaves} leaf divisions  ${totalPassages} passages  ${totalChars} chars  ${totalFigures} figures\n`,
  );
  if (errors.length > 0) process.exit(1);
}

interface ReportData {
  divisionCount: number;
  totalLeaves: number;
  totalPassages: number;
  totalChars: number;
  totalFigures: number;
  perLeaf: PerLeaf[];
  emptyLeaves: string[];
  anomalyCounts: { figures: number; del: number; add: number; total: number };
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function writeReport(findings: Finding[], data: ReportData | null): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push('# Euclid *Elements* validation report');
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
    L.push(`- Passage.figure objects: ${data.totalFigures}`);
    L.push(`- anomalies.json entries: ${data.anomalyCounts.total} (figure markers: ${data.anomalyCounts.figures}, <del> exclusions: ${data.anomalyCounts.del}, <add> insertions: ${data.anomalyCounts.add})`);
    L.push(`- leaf divisions with zero passages (documented): ${data.emptyLeaves.join(', ') || 'none'}`);
    L.push('');
    L.push('## Verbatim spot-check');
    L.push('');
    for (const s of data.spotCheck) L.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got.slice(0, 80)}\``);
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
