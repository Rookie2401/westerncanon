/**
 * Shared validator engine for this batch's English Aristotle editions.
 *
 * Mirrors the shape established by
 * scripts/import-aristotle-posterior-analytics-en/validate.ts: an
 * ERROR/WARN `Finding[]`, presence / id / number / ref / passage structural
 * checks, a leak scan for un-stripped wiki or HTML scaffolding, a verbatim
 * incipit/explicit spot check, a written data/<slug>-en/VALIDATION_REPORT.md,
 * and a non-zero exit when any ERROR is present. WARN findings (real,
 * disclosed source irregularities such as a chapter number the source itself
 * never prints) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Division, GenericWork } from './emit.ts';
import { runAccounting, type AccountingResult, type AccountingSpec } from './textAccounting.ts';

export type Level = 'ERROR' | 'WARN';

export interface Finding {
  level: Level;
  check: string;
  message: string;
}

export interface Anomaly {
  where: string;
  note: string;
}

/**
 * Strings that must never survive into reading text. `''` and `[[`/`{{`
 * catch un-unwrapped wikitext; the tag fragments catch un-stripped HTML; the
 * URL prefixes catch external-link furniture.
 */
export const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '&nbsp;', '{{', '}}', '[[', ']]', '<ref', '</ref', '<references',
  'http://', 'https://', "''", '<p>', '</p>', '<div', '<span', '<sup', '===', '(page does not exist)',
  'mw-parser-output', 'Digitized by',
];

export interface ExpectedDivision {
  /** '1', '2', ... for a Book; omitted for a flat work */
  book?: string;
  /** the chapter numbers this division must contain, in order */
  chapters: number[];
}

export interface ValidateSpec {
  workId: string;
  dir: string;
  translator: string;
  /** 'book-chapter' => ids book-N / book-N-ch-M ; 'flat' => ids ch-N */
  shape: 'book-chapter' | 'flat';
  expected: ExpectedDivision[];
  /** first words of the first chapter's text, verbatim */
  incipit: string;
  /** last words of the last chapter's text, verbatim */
  explicit: string;
  /** substrings that anomalies.json must document (case-insensitive) */
  requiredAnomalyTopics: string[];
  /** true when at least one chapter is expected to carry a non-null Bekker ref */
  expectBekkerRefs: boolean;
  /** human title for the report heading */
  reportTitle: string;
  /**
   * Reconcile the shipped reading text against the cached raw source, so that
   * dropped paragraphs fail the build. See ./textAccounting.ts for why this is
   * a separate traversal rather than a re-run of the importer's own parser.
   */
  accounting?: AccountingSpec;
}

export function runValidation(spec: ValidateSpec): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json', 'types.ts']) {
    if (!existsSync(join(spec.dir, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(spec, findings, { divisions: 0, chapters: 0, chars: 0 }, [], []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(spec.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(spec.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(spec.dir, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== spec.workId) err('workId', `expected ${spec.workId}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'en') err('language', `expected 'en', got ${JSON.stringify(work.language)}`);
  if (about['workId'] !== spec.workId) err('about-workId', `about.json workId must be ${spec.workId}, got ${JSON.stringify(about['workId'])}`);
  if (about['translator'] !== spec.translator) err('translator', `about.json translator must be ${JSON.stringify(spec.translator)}, got ${JSON.stringify(about['translator'])}`);
  if (typeof about['license'] !== 'string' || !/public domain/i.test(about['license'] as string)) {
    err('license', 'about.json license must state the public-domain status of the translation explicitly');
  }
  if (!Array.isArray(anomalies) || anomalies.some((a) => typeof a?.where !== 'string' || typeof a?.note !== 'string')) {
    err('anomalies-shape', 'anomalies.json must be a flat {where, note}[] array');
  }

  const counts: string[] = [];
  let totalChapters = 0;
  let bekkerRefsSeen = 0;

  const checkChapter = (c: Division, wantNumber: number, wantId: string): void => {
    if (c.id !== wantId) err('chapter-id', `chapter id ${JSON.stringify(c.id)}, expected ${JSON.stringify(wantId)}`);
    if (c.number !== String(wantNumber)) err('chapter-number', `${c.id}: number ${JSON.stringify(c.number)}, expected ${JSON.stringify(String(wantNumber))}`);
    // A Bekker page token, or two joined by an en dash. Two-digit pages are
    // legitimate: the Prior Analytics begins at Bekker 24a. The column letter
    // is required below 100 so that a bare small number can never pass as a
    // page reference - mirrors BEKKER_PAGE_RE in ../import-aristotle-rest-en-shared/pagescan.ts.
    const BEKKER = String.raw`(?:\d{2,4}[ab]|\d{3,4})`;
    if (c.ref !== null && !new RegExp(`^${BEKKER}(–${BEKKER})?$`).test(c.ref)) err('chapter-ref', `${c.id}: ref ${JSON.stringify(c.ref)} is not a Bekker page/range`);
    if (c.ref !== null) bekkerRefsSeen += 1;
    if (c.sourceHeading !== null) err('chapter-sourceHeading', `${c.id}: sourceHeading must be null`);
    if (c.editorialTitle !== null) err('chapter-editorialTitle', `${c.id}: editorialTitle must be null`);
    if (!Array.isArray(c.children) || c.children.length !== 0) err('chapter-children', `${c.id}: children must be []`);
    if (c.passages.length !== 1) err('chapter-passage-count', `${c.id}: expected exactly 1 passage, got ${c.passages.length}`);
    for (const p of c.passages) {
      if (typeof p.text !== 'string' || p.text.trim().length === 0) err('empty-passage', `${c.id}: passage text is empty`);
      if (p.n !== '') err('passage-n', `${c.id}: passage n must be ""`);
      if (p.ref !== null) err('passage-ref', `${c.id}: passage ref must be null`);
    }
    totalChapters += 1;
  };

  if (spec.shape === 'book-chapter') {
    const books = work.divisions ?? [];
    if (books.length !== spec.expected.length) err('book-count', `expected ${spec.expected.length} books, got ${books.length}`);
    books.forEach((b, i) => {
      const want = spec.expected[i];
      if (!want) return;
      if (b.id !== `book-${want.book}`) err('book-id', `book[${i}] id ${JSON.stringify(b.id)}, expected "book-${want.book}"`);
      if (b.number !== want.book) err('book-number', `${b.id}: number ${JSON.stringify(b.number)}, expected ${JSON.stringify(want.book)}`);
      if (b.ref !== null) err('book-ref', `${b.id}: ref must be null`);
      if (b.sourceHeading !== null) err('book-sourceHeading', `${b.id}: sourceHeading must be null`);
      if (b.editorialTitle !== null) err('book-editorialTitle', `${b.id}: editorialTitle must be null`);
      if (b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [] (container only)`);
      const got = b.children ?? [];
      if (got.length !== want.chapters.length) err('chapter-count', `${b.id}: expected ${want.chapters.length} chapters, got ${got.length}`);
      counts.push(`Book ${want.book}: ${got.length} chapters (numbers ${summariseRun(want.chapters)})`);
      got.forEach((c, j) => {
        const n = want.chapters[j];
        if (n === undefined) return;
        checkChapter(c, n, `book-${want.book}-ch-${n}`);
      });
    });
  } else {
    const want = spec.expected[0];
    const got = work.divisions ?? [];
    if (!want) err('expected-spec', 'flat work spec has no expected chapter list');
    else {
      if (got.length !== want.chapters.length) err('chapter-count', `expected ${want.chapters.length} chapters, got ${got.length}`);
      counts.push(`${got.length} chapters (numbers ${summariseRun(want.chapters)})`);
      got.forEach((c, j) => {
        const n = want.chapters[j];
        if (n === undefined) return;
        checkChapter(c, n, `ch-${n}`);
      });
    }
  }

  if (spec.expectBekkerRefs && bekkerRefsSeen === 0) err('bekker-refs', 'this source prints Bekker markers, but no chapter carries a ref');
  if (!spec.expectBekkerRefs && bekkerRefsSeen > 0) err('bekker-refs', `this source prints no Bekker markers, but ${bekkerRefsSeen} chapter(s) carry a ref`);

  // ---- leaked markup ----
  const leaks: string[] = [];
  const walk = (divs: Division[]): void => {
    for (const d of divs) {
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children);
    }
  };
  walk(work.divisions ?? []);
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- required anomaly documentation ----
  for (const topic of spec.requiredAnomalyTopics) {
    if (!anomalies.some((a) => new RegExp(topic, 'i').test(a.note) || new RegExp(topic, 'i').test(a.where))) {
      err('anomaly-doc', `anomalies.json must document "${topic}"`);
    }
  }

  // ---- verbatim spot checks ----
  const firstChapter = spec.shape === 'book-chapter' ? work.divisions?.[0]?.children?.[0] : work.divisions?.[0];
  const lastTop = work.divisions?.[work.divisions.length - 1];
  const lastChapter = spec.shape === 'book-chapter' ? lastTop?.children?.[lastTop.children.length - 1] : lastTop;
  const firstText = firstChapter?.passages?.[0]?.text ?? '';
  const lastText = lastChapter?.passages?.[0]?.text ?? '';
  const incipitOk = firstText.startsWith(spec.incipit);
  const explicitOk = lastText.endsWith(spec.explicit);
  if (!incipitOk) err('spot-check-incipit', `first chapter (${firstChapter?.id}) does not start with the expected verbatim incipit (got: ${JSON.stringify(firstText.slice(0, 90))})`);
  if (!explicitOk) err('spot-check-explicit', `last chapter (${lastChapter?.id}) does not end with the expected verbatim explicit (got tail: ${JSON.stringify(lastText.slice(-90))})`);

  let chars = 0;
  const walkChars = (ds: Division[]): void => { for (const d of ds) { for (const p of d.passages) chars += p.text.length; walkChars(d.children); } };
  walkChars(work.divisions ?? []);

  // ---- TEXT ACCOUNTING: does every paragraph of the source survive? ----
  let accounting: AccountingResult | undefined;
  let workParagraphs = 0;
  if (spec.accounting) {
    const texts: string[] = [];
    const gather = (ds: Division[]): void => { for (const d of ds) { for (const p of d.passages) texts.push(p.text); gather(d.children); } };
    gather(work.divisions ?? []);
    workParagraphs = texts.join('\n\n').split('\n\n').filter((t) => t.trim().length > 0).length;
    accounting = runAccounting(spec.accounting, texts.join('\n\n'));
    if (accounting.missing.length > 0) {
      err(
        'text-accounting',
        `${accounting.missing.length} paragraph(s) of the raw source are ABSENT from the shipped reading text (and are not declared editorial):\n` +
          accounting.missing.map((m) => `    [${m.file}] ${m.text.slice(0, 90)}`).join('\n'),
      );
    }
  }

  if (totalChapters === 0) err('chapters', 'no chapters were emitted at all');
  void warn;

  writeReport(spec, findings, { divisions: work.divisions?.length ?? 0, chapters: totalChapters, chars }, counts, anomalies, {
    incipitOk, incipitGot: firstText.slice(0, 90), explicitOk, explicitGot: lastText.slice(-90),
  }, accounting, workParagraphs);

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n=== validate:${spec.workId} ===\n`);
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${counts.join(' | ')}\n`);
  process.stdout.write(`  ${totalChapters} chapters / ${chars} chars / ${anomalies.length} anomalies\n`);
  if (accounting) {
    process.stdout.write(
      `  text accounting: raw paragraphs ${accounting.rawParagraphs}, work paragraphs ${workParagraphs}, ` +
        `checked ${accounting.checkedParagraphs}, declared-editorial ${accounting.allowedAbsent}, MISSING ${accounting.missing.length}\n`,
    );
    for (const m of accounting.missing) process.stdout.write(`    MISSING [${m.file}] ${m.text.slice(0, 90)}\n`);
  }
  process.stdout.write(`  -> ${join(spec.dir, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

/** "1-8" for a contiguous run, "1-6, 23-27" when the source's own numbering has a gap. */
export function summariseRun(ns: number[]): string {
  if (ns.length === 0) return '(none)';
  const out: string[] = [];
  let start = ns[0]!;
  let prev = ns[0]!;
  for (let i = 1; i <= ns.length; i++) {
    const n = ns[i];
    if (n !== undefined && n === prev + 1) { prev = n; continue; }
    out.push(start === prev ? String(start) : `${start}-${prev}`);
    if (n === undefined) break;
    start = n; prev = n;
  }
  return out.join(', ');
}

function writeReport(
  spec: ValidateSpec,
  findings: Finding[],
  stats: { divisions: number; chapters: number; chars: number },
  counts: string[],
  anomalies: Anomaly[],
  spot?: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string },
  accounting?: AccountingResult,
  workParagraphs = 0,
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# ${spec.reportTitle} validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- top-level divisions: ${stats.divisions}`);
  L.push(`- chapters: ${stats.chapters}`);
  L.push(`- total passage chars: ${stats.chars}`);
  for (const c of counts) L.push(`- ${c}`);
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — first chapter incipit\n  - got: \`${spot.incipitGot}\``);
    L.push(`- ${spot.explicitOk ? 'OK' : 'FAIL'} — last chapter explicit\n  - got: \`${spot.explicitGot}\``);
    L.push('');
  }
  if (accounting) {
    L.push('## Text accounting (raw source vs. shipped work)');
    L.push('');
    L.push('Every paragraph of the cached raw response is rebuilt by an independent traversal');
    L.push('(`textAccounting.ts`) and looked for in the shipped reading text. Footnote apparatus,');
    L.push('editorial header/licence blocks, running titles and any declared front matter are');
    L.push('excluded; anything else that is absent is an error.');
    L.push('');
    L.push(`- raw paragraphs: ${accounting.rawParagraphs}`);
    L.push(`- work paragraphs: ${workParagraphs}`);
    L.push(`- checked (>= 40 chars, not editorial): ${accounting.checkedParagraphs}`);
    L.push(`- declared editorial / furniture (excluded): ${accounting.allowedAbsent}`);
    L.push(`- **missing: ${accounting.missing.length}**`);
    for (const m of accounting.missing) L.push(`  - [${m.file}] \`${m.text.slice(0, 90)}\``);
    L.push('');
  }
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (anomalies.length === 0) L.push('_none_');
  for (const a of anomalies) L.push(`- **${a.where}** — ${a.note}`);
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
  writeFileSync(join(spec.dir, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}
