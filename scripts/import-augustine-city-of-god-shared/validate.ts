/**
 * Validation for BOTH generated City of God corpora (Latin + English).
 *
 *   npm run validate:augustine-city-of-god
 *
 * Writes data/augustine-city-of-god-la/VALIDATION_REPORT.md and
 * data/augustine-city-of-god-en/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails in either work. WARN-level
 * findings (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/augustine-city-of-god-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const LA_DIR = join(REPO_ROOT, 'data', 'augustine-city-of-god-la');
const EN_DIR = join(REPO_ROOT, 'data', 'augustine-city-of-god-en');

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

const BOOK_ID = /^book-\d+$/;
const CHAPTER_ID = /^book-\d+-ch-\d+$/;

/** substrings that indicate leaked wiki/HTML transport markup (never legitimate reading text) */
const LEAK_MARKERS = [
  '&amp;', '&lt;', '&gt;', '&#', '{{', '}}', '[[', ']]', '<ref', '</ref', '<references',
  'http://', 'https://', 'xmlns', '</p>', '<div', '<span', '{{header', '{{titulus',
  '{{Liber', '{{finis', 'textquality', '==Footnotes==', '== Contents ==',
];

function walkTexts(divisions: Division[], visit: (s: string, where: string) => void): void {
  for (const d of divisions) {
    if (d.sourceHeading != null) visit(d.sourceHeading, `${d.id}/sourceHeading`);
    if (d.editorialTitle != null) visit(d.editorialTitle, `${d.id}/editorialTitle`);
    d.passages.forEach((p, i) => visit(p.text, `${d.id}/passage[${i}, n=${JSON.stringify(p.n)}]`));
    if (d.children.length) walkTexts(d.children, visit);
  }
}

interface PerBook {
  id: string;
  number: string | null;
  chapters: number;
  passages: number;
  chars: number;
}

interface WorkReport {
  workId: string;
  dir: string;
  findings: Finding[];
  divisionCount: number;
  bookCount: number;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  perBook: PerBook[];
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}

function countChars(d: Division): number {
  return d.passages.reduce((n, p) => n + p.text.length, 0) + d.children.reduce((n, c) => n + countChars(c), 0);
}
function countPassages(d: Division): number {
  return d.passages.length + d.children.reduce((n, c) => n + countPassages(c), 0);
}
function countChapters(d: Division): number {
  // a "chapter" is any division matching CHAPTER_ID anywhere in the tree
  let n = CHAPTER_ID.test(d.id) ? 1 : 0;
  for (const c of d.children) n += countChapters(c);
  return n;
}

function validateWork(opts: {
  workId: string;
  dir: string;
  expectLang: 'la' | 'en';
  expectBookCount: number;
  /** exact ordered list of ALL top-level division ids expected */
  expectTopLevelIds: string[];
  spotChecks: { label: string; find: (work: GenericWork) => string | null; expect: string; mode: 'startsWith' | 'endsWith' }[];
}): WorkReport {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = {
    workId: opts.workId,
    dir: opts.dir,
    findings,
    divisionCount: 0,
    bookCount: 0,
    chapterCount: 0,
    passageCount: 0,
    totalChars: 0,
    perBook: [],
    anomalies: [],
    spotCheck: [],
  };

  const need = ['work.json', 'about.json', 'anomalies.json'];
  for (const f of need) {
    if (!existsSync(join(opts.dir, f))) err('presence', `missing ${f} - run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(opts.dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(opts.dir, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(opts.dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  // ---- top-level shape ----
  if (work.workId !== opts.workId) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${opts.workId}`);
  if (work.language !== opts.expectLang) err('language', `work.json language is ${JSON.stringify(work.language)}, expected ${opts.expectLang}`);
  if (about['workId'] !== opts.workId) err('about-workId', `about.json workId mismatch`);
  if (about['sections'] === undefined || (about['sections'] as unknown[]).length < 3) {
    warn('about-sections', 'about.json has fewer than 3 "sections" entries');
  }

  const divisions = work.divisions ?? [];
  report.divisionCount = divisions.length;

  const ids = divisions.map((d) => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(opts.expectTopLevelIds)) {
    err(
      'top-level-ids',
      `top-level division id sequence does not match expectation.\n  got:      ${ids.join(', ')}\n  expected: ${opts.expectTopLevelIds.join(', ')}`,
    );
  }

  const books = divisions.filter((d) => BOOK_ID.test(d.id) && d.number !== null);
  report.bookCount = books.length;
  if (books.length !== opts.expectBookCount) {
    err('book-count', `expected ${opts.expectBookCount} numbered Book divisions, got ${books.length}`);
  }
  for (const b of books) {
    if (b.passages.length !== 0) err('book-shape', `${b.id}: a Book division must hold no passages of its own, got ${b.passages.length}`);
    if (b.children.length === 0) err('book-shape', `${b.id}: a Book division must have >=1 chapter child`);
  }

  // ---- chapters / passages ----
  let chapterCount = 0;
  let passageCount = 0;
  let totalChars = 0;
  for (const d of divisions) {
    const chapters = countChapters(d);
    const passages = countPassages(d);
    const chars = countChars(d);
    chapterCount += chapters;
    passageCount += passages;
    totalChars += chars;
    if (BOOK_ID.test(d.id)) {
      report.perBook.push({ id: d.id, number: d.number, chapters, passages, chars });
    }
  }
  report.chapterCount = chapterCount;
  report.passageCount = passageCount;
  report.totalChars = totalChars;

  // ---- passage/division field sanity ----
  const walkAll = (ds: Division[], cb: (d: Division) => void) => {
    for (const d of ds) {
      cb(d);
      walkAll(d.children, cb);
    }
  };
  walkAll(divisions, (d) => {
    if (d.ref !== null) err('division-ref', `${d.id}: ref should always be null for this work, got ${JSON.stringify(d.ref)}`);
    for (const p of d.passages) {
      if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${d.id}: a passage has empty text`);
      if (typeof p.n !== 'string') err('passage-n', `${d.id}: passage n is not a string`);
      if (p.ref !== null) err('passage-ref', `${d.id}: passage ref should always be null for this work, got ${JSON.stringify(p.ref)}`);
    }
    if (CHAPTER_ID.test(d.id) && d.children.length !== 0) {
      err('chapter-shape', `${d.id}: a Chapter division must have no children, got ${d.children.length}`);
    }
  });

  // ---- leaked markup ----
  const leaks: string[] = [];
  walkTexts(divisions, (s, where) => {
    for (const marker of LEAK_MARKERS) {
      if (s.includes(marker)) leaks.push(`${where}: contains ${JSON.stringify(marker)}`);
    }
  });
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 15).join('\n    ')}`);

  // ---- spot checks ----
  for (const sc of opts.spotChecks) {
    const got = sc.find(work);
    if (got === null) {
      report.spotCheck.push({ label: sc.label, ok: false, got: '(not found)' });
      err('spot-check', `${sc.label}: target passage not found`);
      continue;
    }
    const gotN = got.normalize('NFC');
    const expN = sc.expect.normalize('NFC');
    const ok = sc.mode === 'startsWith' ? gotN.startsWith(expN) : gotN.endsWith(expN);
    report.spotCheck.push({ label: sc.label, ok, got: sc.mode === 'startsWith' ? got.slice(0, 70) : got.slice(-70) });
    if (!ok) err('spot-check', `${sc.label}: expected ${sc.mode} ${JSON.stringify(sc.expect)}, got: ${JSON.stringify(sc.mode === 'startsWith' ? got.slice(0, 70) : got.slice(-70))}`);
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# City of God validation report - ${r.workId}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- top-level divisions: ${r.divisionCount}`);
  L.push(`- Books: ${r.bookCount}`);
  L.push(`- Chapters: ${r.chapterCount}`);
  L.push(`- Passages: ${r.passageCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push('');
  L.push('## Per-book counts');
  L.push('');
  L.push('| book | number | chapters | passages | chars |');
  L.push('|------|--------|----------|----------|-------|');
  for (const b of r.perBook) L.push(`| ${b.id} | ${b.number ?? '-'} | ${b.chapters} | ${b.passages} | ${b.chars} |`);
  L.push('');
  L.push('## Verbatim spot-check');
  L.push('');
  for (const s of r.spotCheck) L.push(`- ${s.ok ? 'OK' : 'FAIL'} - ${s.label}\n  - got: \`${s.got}\``);
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

function findChapterText(work: GenericWork, bookId: string, chapterId: string, passageIdx: 'first' | 'last'): string | null {
  const book = work.divisions.find((d) => d.id === bookId);
  const ch = book?.children.find((c) => c.id === chapterId);
  if (!ch || ch.passages.length === 0) return null;
  return passageIdx === 'first' ? ch.passages[0].text : ch.passages[ch.passages.length - 1].text;
}

function findLastChapterOfBook(work: GenericWork, bookId: string): Division | null {
  const book = work.divisions.find((d) => d.id === bookId);
  if (!book || book.children.length === 0) return null;
  return book.children[book.children.length - 1];
}

function main(): void {
  const la = validateWork({
    workId: 'augustine-city-of-god-la',
    dir: LA_DIR,
    expectLang: 'la',
    expectBookCount: 22,
    expectTopLevelIds: ['book-0', ...Array.from({ length: 22 }, (_, i) => `book-${i + 1}`), 'colophon'],
    spotChecks: [
      {
        label: 'Book 1 proem (book-1-ch-0) starts "Gloriosissimam ciuitatem Dei"',
        find: (w) => findChapterText(w, 'book-1', 'book-1-ch-0', 'first'),
        expect: 'Gloriosissimam ciuitatem Dei',
        mode: 'startsWith',
      },
      {
        label: 'book-0 (Letter to Firmus) starts "DOMINO EXIMIO"',
        find: (w) => findChapterText(w, 'book-0', 'book-0', 'first'), // book-0 is itself a leaf; special-cased below
        expect: 'DOMINO EXIMIO',
        mode: 'startsWith',
      },
      {
        label: 'Book XXII final chapter ends "...Amen. Amen." (true end of the work)',
        find: (w) => {
          const lastCh = findLastChapterOfBook(w, 'book-22');
          return lastCh ? lastCh.passages[lastCh.passages.length - 1].text : null;
        },
        expect: 'Amen. Amen.',
        mode: 'endsWith',
      },
      {
        label: 'colophon starts "In hoc codice continentur"',
        find: (w) => {
          const d = w.divisions.find((x) => x.id === 'colophon');
          return d ? d.passages[0]?.text ?? null : null;
        },
        expect: 'In hoc codice continentur',
        mode: 'startsWith',
      },
    ],
  });
  // book-0 is a leaf top-level division (not a Book with children), so the
  // generic findChapterText(w, 'book-0', 'book-0', ...) helper above can't
  // reach it via the Book->Chapter path; patch that one spot-check directly.
  {
    const work = JSON.parse(readFileSync(join(LA_DIR, 'work.json'), 'utf8')) as GenericWork;
    const book0 = work.divisions.find((d) => d.id === 'book-0');
    const got = book0?.passages[0]?.text ?? null;
    const idx = la.spotCheck.findIndex((s) => s.label.startsWith('book-0'));
    if (idx >= 0 && got) {
      const ok = got.normalize('NFC').startsWith('DOMINO EXIMIO');
      la.spotCheck[idx] = { label: la.spotCheck[idx].label, ok, got: got.slice(0, 70) };
      if (!ok) la.findings.push({ level: 'ERROR', check: 'spot-check', message: `book-0 does not start with "DOMINO EXIMIO" - got ${JSON.stringify(got.slice(0, 70))}` });
      else la.findings = la.findings.filter((f) => !(f.check === 'spot-check' && f.message.includes('book-0')));
    }
  }

  const enHasData = existsSync(join(EN_DIR, 'work.json'));
  const en = validateWork({
    workId: 'augustine-city-of-god-en',
    dir: EN_DIR,
    expectLang: 'en',
    expectBookCount: 22,
    expectTopLevelIds: Array.from({ length: 22 }, (_, i) => `book-${i + 1}`),
    spotChecks: [
      {
        label: 'Book 1 Preface (book-1-ch-0) starts "The glorious city of God"',
        find: (w) => findChapterText(w, 'book-1', 'book-1-ch-0', 'first'),
        expect: 'The glorious city of God',
        mode: 'startsWith',
      },
      {
        label: 'Book XXII final chapter ends "...giving thanks to God. Amen." (true end of the work)',
        find: (w) => {
          const lastCh = findLastChapterOfBook(w, 'book-22');
          return lastCh ? lastCh.passages[lastCh.passages.length - 1].text : null;
        },
        expect: EXPECTED_XXII_EN_TAIL,
        mode: 'endsWith',
      },
    ],
  });

  writeReport(la);
  if (enHasData) writeReport(en);

  const all = [
    ...la.findings.map((f) => ({ w: 'la', ...f })),
    ...(enHasData ? en.findings.map((f) => ({ w: 'en', ...f })) : []),
  ];
  process.stdout.write('\n=== validate:augustine-city-of-god ===\n');
  if (!enHasData) {
    process.stdout.write('  [WARN] en (not yet generated - run npm run import:augustine-city-of-god-en)\n');
  }
  for (const f of all) process.stdout.write(`  [${f.level}] ${f.w} ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  process.stdout.write(
    `\n${errors.length} error(s), ${warns.length} warning(s).\n` +
      `Reports: ${join(LA_DIR, 'VALIDATION_REPORT.md')}\n` +
      (enHasData ? `         ${join(EN_DIR, 'VALIDATION_REPORT.md')}\n` : ''),
  );
  process.stdout.write(
    `\nla: ${la.bookCount} books / ${la.chapterCount} chapters / ${la.passageCount} passages / ${la.totalChars} chars\n` +
      (enHasData
        ? `en: ${en.bookCount} books / ${en.chapterCount} chapters / ${en.passageCount} passages / ${en.totalChars} chars\n`
        : 'en: not yet generated\n'),
  );
  if (errors.length > 0 || !enHasData) process.exit(1);
}

/** Verbatim tail of Dods' translation's actual final passage (Book XXII, chapter 30) - the true end of the English edition. */
const EXPECTED_XXII_EN_TAIL = 'let those who think I have said just enough join me in giving thanks to God. Amen.';

main();
