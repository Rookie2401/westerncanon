/**
 * Validation for data/jewish-antiquities-grc/.
 *
 *   npm run validate:jewish-antiquities-grc
 *
 * Writes data/jewish-antiquities-grc/VALIDATION_REPORT.md, prints a
 * summary, and exits non-zero if any ERROR-level check fails. WARN-level
 * findings (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/jewish-antiquities-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'jewish-antiquities-grc');

const WORK_ID = 'jewish-antiquities-grc';
/** [numbered-section-count, book sourceHeading] per book, 1-indexed by position. */
const EXPECTED_BOOKS: Array<{ number: string; numberedSections: number; heading: string }> = [
  { number: '1', numberedSections: 346, heading: 'Τάδε ἔνεστιν ἐν τῇ πρώτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '2', numberedSections: 349, heading: 'Τάδε ἔνεστιν ἐν τῇ β τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '3', numberedSections: 322, heading: 'Τάδε ἔνεστιν ἐν τῇ τρίτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '4', numberedSections: 331, heading: 'Τάδε ἔνεστιν ἐν τῇ τετάρτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '5', numberedSections: 362, heading: 'Τάδε ἔνεστιν ἐν τῇ πέμπτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '6', numberedSections: 378, heading: 'Τάδε ἔνεστιν ἐν τῇ ἕκτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '7', numberedSections: 394, heading: 'Τάδε ἔνεστιν ἐν τῇ ἑβδόμῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '8', numberedSections: 420, heading: 'Τάδε ἔνεστιν ἐν τῇ ὀγδόῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '9', numberedSections: 291, heading: 'Τάδε ἔνεστιν ἐν τῇ ἐνάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '10', numberedSections: 281, heading: 'Τάδε ἔνεστιν ἐν τῇ δεκάτῃ βίβλῳ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '11', numberedSections: 347, heading: 'Τάδε ἔνεστιν ἐν τῇ ἑνδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '12', numberedSections: 434, heading: 'Τάδε ἔνεστιν ἐν τῇ δωδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '13', numberedSections: 433, heading: 'Τάδε ἔνεστιν ἐν τῇ τρισκαιδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '14', numberedSections: 491, heading: 'Τάδε ἔνεστιν ἐν τῇ τεσσαρεσκαιδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '15', numberedSections: 425, heading: 'Τάδε ἔνεστιν ἐν τῇ πεντεκαιδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '16', numberedSections: 404, heading: 'Τάδε ἔνεστιν ἐν τῇ ἑξκαιδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '17', numberedSections: 355, heading: 'Τάδε ἔνεστιν ἐν τῇ ἑπτακαιδεκάτῃ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '18', numberedSections: 379, heading: 'Τάδε ἔνεστιν ἐν τῇ ιη τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '19', numberedSections: 366, heading: 'Τάδε ἔνεστιν ἐν τῇ ιθ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
  { number: '20', numberedSections: 268, heading: 'Τάδε ἔνεστιν ἐν τῇ κ τῶν Ἰωσήπου ἱστοριῶν τῆς Ἰουδαϊκῆς ἀρχαιολογίας.' },
];
const TOTAL_SECTIONS = EXPECTED_BOOKS.reduce((n, b) => n + b.numberedSections + 1, 0);

/** Verbatim incipit of book-1's "arg" section (prefix check). */
const INCIPIT = 'α. ἡ τοῦ κόσμου σύστασις καὶ διάταξις τῶν στοιχείων.';

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '<p>', '</p>', '<div', '<del', '<gap', '<milestone', '<pb', '<label', '<num>', '<q', '<head'];

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

function main(): void {
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, { books: 0, sections: 0, passages: 0, chars: 0 }, []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'grc') err('language', `expected 'grc', got ${JSON.stringify(work.language)}`);
  if (about['translator'] !== undefined) err('translator', `about.json must not carry a translator on the Greek side, got ${JSON.stringify(about['translator'])}`);
  if (about['editor'] !== 'Benedikt Niese') err('editor', `expected editor "Benedikt Niese", got ${JSON.stringify(about['editor'])}`);

  const books = work.divisions ?? [];
  if (books.length !== EXPECTED_BOOKS.length) err('book-count', `expected ${EXPECTED_BOOKS.length} books, got ${books.length}`);

  let totalSections = 0;
  let totalPassages = 0;
  let totalChars = 0;
  const sectionCounts: string[] = [];

  books.forEach((b, i) => {
    const spec = EXPECTED_BOOKS[i];
    if (!spec) return;
    if (b.id !== `book-${spec.number}`) err('book-id', `book[${i}] id ${JSON.stringify(b.id)}, expected "book-${spec.number}"`);
    if (b.number !== spec.number) err('book-number', `${b.id}: number ${JSON.stringify(b.number)}, expected ${JSON.stringify(spec.number)}`);
    if (b.ref !== null) err('book-ref', `${b.id}: ref must be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== spec.heading) err('book-sourceHeading', `${b.id}: sourceHeading ${JSON.stringify(b.sourceHeading)}, expected ${JSON.stringify(spec.heading)}`);
    if (b.editorialTitle !== null) err('book-editorialTitle', `${b.id}: editorialTitle must be null, got ${JSON.stringify(b.editorialTitle)}`);
    if (b.passages.length !== 0) err('book-passages', `${b.id}: passages must be [] (container only), got ${b.passages.length}`);

    const sections = b.children ?? [];
    const wantTotal = spec.numberedSections + 1;
    sectionCounts.push(`Book ${spec.number}: ${sections.length} sections (expected ${wantTotal} = ${spec.numberedSections} numbered + 1 arg)`);
    if (sections.length !== wantTotal) err('section-count', `${b.id}: expected ${wantTotal}, got ${sections.length}`);
    totalSections += sections.length;

    // first section must be "arg"; then 1..numberedSections with no gaps
    const first = sections[0];
    if (!first || first.number !== 'arg' || first.id !== `book-${spec.number}-sec-arg`) {
      err('arg-section', `${b.id}: first section must be id "book-${spec.number}-sec-arg" / number "arg", got ${JSON.stringify(first?.id)}/${JSON.stringify(first?.number)}`);
    }
    sections.slice(1).forEach((s, j) => {
      const wantNum = String(j + 1);
      const wantId = `book-${spec.number}-sec-${wantNum}`;
      if (s.id !== wantId) err('section-id', `section[${j + 1}] id ${JSON.stringify(s.id)}, expected ${JSON.stringify(wantId)}`);
      if (s.number !== wantNum) err('section-number', `${s.id}: number ${JSON.stringify(s.number)}, expected "${wantNum}"`);
    });

    sections.forEach((s) => {
      if (s.ref !== null) err('section-ref', `${s.id}: ref must be null, got ${JSON.stringify(s.ref)}`);
      if (s.editorialTitle !== null) err('section-editorialTitle', `${s.id}: editorialTitle must be null, got ${JSON.stringify(s.editorialTitle)}`);
      if (!Array.isArray(s.children) || s.children.length !== 0) err('section-children', `${s.id}: children must be [], got ${JSON.stringify(s.children)}`);
      if (s.passages.length !== 1) err('section-passage-count', `${s.id}: expected exactly 1 passage, got ${s.passages.length}`);
      if (s.id !== 'book-1-sec-arg' && s.sourceHeading !== null) {
        err('section-sourceHeading', `${s.id}: sourceHeading must be null, got ${JSON.stringify(s.sourceHeading)}`);
      }
      for (const p of s.passages) {
        totalPassages += 1;
        totalChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${s.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${s.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${s.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      }
    });
  });

  if (totalSections !== TOTAL_SECTIONS) err('total-sections', `expected ${TOTAL_SECTIONS} sections total, got ${totalSections}`);

  // book-1-sec-arg must carry the preface heading
  const book1Arg = books[0]?.children.find((s) => s.id === 'book-1-sec-arg');
  if (book1Arg && book1Arg.sourceHeading !== 'Προοίμιον περὶ τῆς ὅλης πραγματείας.') {
    err('book1-arg-heading', `book-1-sec-arg sourceHeading ${JSON.stringify(book1Arg.sourceHeading)}, expected "Προοίμιον περὶ τῆς ὅλης πραγματείας."`);
  }

  // Testimonium Flavianum fallback sections must be present, non-empty, and flagged
  for (const id of ['book-18-sec-63', 'book-18-sec-64']) {
    const book18 = books.find((b) => b.id === 'book-18');
    const sec = book18?.children.find((s) => s.id === id);
    if (!sec) {
      err('testimonium-present', `${id} not found in book-18`);
    } else {
      const passage = sec.passages[0];
      if (!passage || passage.text.length === 0) err('testimonium-text', `${id}: expected non-empty (del-fallback) passage text`);
      if (!passage?.anomaly) err('testimonium-flagged', `${id}: expected Passage.anomaly to flag the <del> fallback`);
    }
  }

  // ---- leaked markup ----
  const leaks: string[] = [];
  const walk = (divs: Division[], where: string) => {
    for (const d of divs) {
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${where}${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${where}${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children, where);
    }
  };
  walk(books, '');
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- required anomaly disclosures ----
  if (!anomalies.some((a) => /del.*interpolation|interpolation.*del/i.test(a.note))) {
    err('del-note', 'anomalies.json must document the <del> exclusion policy');
  }
  if (!anomalies.some((a) => /Testimonium Flavianum/i.test(a.note))) {
    err('testimonium-note', 'anomalies.json must document the Testimonium Flavianum <del> fallback individually');
  }
  if (!anomalies.some((a) => /Whiston_chapter|Whiston_section/i.test(a.note))) {
    warn('whiston-milestone-note', 'anomalies.json should document the dropped Whiston cross-reference milestones');
  }

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(INCIPIT.normalize('NFC'));
  if (!okStart) err('spot-check-incipit', `book-1-sec-arg does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const lastBook = books[books.length - 1];
  const lastSections = lastBook?.children ?? [];
  const lastSec = lastSections[lastSections.length - 1];
  const lastText = lastSec?.passages[0]?.text ?? '';
  // No externally-verified explicit string is asserted here; the report simply records the
  // final section's own tail for a human spot-check instead.

  const testimonium63 = books[17]?.children.find((s) => s.id === 'book-18-sec-63');
  const testimoniumOk = testimonium63?.passages[0]?.text.includes('χριστὸς') ?? false;
  if (!testimoniumOk) err('spot-check-testimonium', `book-18-sec-63 does not contain the expected Testimonium wording ("χριστὸς")`);

  const stats = { books: books.length, sections: totalSections, passages: totalPassages, chars: totalChars };
  writeReport(findings, stats, sectionCounts, anomalies, {
    incipitOk: okStart,
    incipitGot: p1.slice(0, 90),
    lastSecId: lastSec?.id ?? '(none)',
    lastTextTail: lastText.slice(-120),
    testimoniumOk,
  });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:jewish-antiquities-grc ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${stats.books} books / ${stats.sections} sections / ${stats.passages} passages / ${stats.chars} chars\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  stats: { books: number; sections: number; passages: number; chars: number },
  sectionCounts: string[],
  anomalies: Anomaly[] = [],
  spot?: { incipitOk: boolean; incipitGot: string; lastSecId: string; lastTextTail: string; testimoniumOk: boolean },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Jewish Antiquities (Greek) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- books: ${stats.books}`);
  L.push(`- sections: ${stats.sections}`);
  L.push(`- passages: ${stats.passages}`);
  L.push(`- total passage chars: ${stats.chars}`);
  for (const c of sectionCounts) L.push(`- ${c}`);
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — book-1-sec-arg incipit\n  - got: \`${spot.incipitGot}\``);
    L.push(`- (informational) final section (${spot.lastSecId}) tail\n  - got: \`${spot.lastTextTail}\``);
    L.push(`- ${spot.testimoniumOk ? 'OK' : 'FAIL'} — book-18-sec-63 (Testimonium Flavianum) contains "χριστὸς"`);
    L.push('');
  }
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (anomalies.length === 0) L.push('_none_');
  for (const a of anomalies.slice(0, 60)) L.push(`- **${a.where}** — ${a.note}`);
  if (anomalies.length > 60) L.push(`- _(${anomalies.length - 60} more; see anomalies.json)_`);
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
  writeFileSync(join(DIR, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

main();
