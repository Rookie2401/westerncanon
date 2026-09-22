/**
 * Validation for data/jewish-antiquities-en/.
 *
 *   npm run validate:jewish-antiquities-en
 *
 * Writes data/jewish-antiquities-en/VALIDATION_REPORT.md, prints a
 * summary, and exits non-zero if any ERROR-level check fails. WARN-level
 * findings (preserved source irregularities) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/jewish-antiquities-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'jewish-antiquities-en');

const WORK_ID = 'jewish-antiquities-en';
const EXPECTED_BOOKS: Array<{ number: string; sectionCount: number; heading: string }> = [
  { number: '1', sectionCount: 84, heading: 'Book I CONTAINING THE INTERVAL OF THREE THOUSAND EIGHT HUNDRED AND THIRTY-THREE YEARS. FROM THE CREATION TO THE DEATH OF ISAAC.' },
  { number: '2', sectionCount: 76, heading: 'Book II CONTAINING THE INTERVAL OF TWO HUNDRED AND TWENTY YEARS. FROM THE DEATH OF ISAAC TO THE EXODUS OUT OF EGYPT.' },
  { number: '3', sectionCount: 79, heading: 'Book III CONTAINING THE INTERVAL OF TWO YEARS. FROM THE EXODUS OUT OF EGYPT, TO THE REJECTION OF THAT GENERATION.' },
  { number: '4', sectionCount: 88, heading: 'Book IV CONTAINING THE INTERVAL OF THIRTY-EIGHT YEARS. FROM THE REJECTION OF THAT GENERATION TO THE DEATH OF MOSES.' },
  { number: '5', sectionCount: 98, heading: 'Book V CONTAINING THE INTERVAL OF FOUR HUNDRED AND SEVENTY-SIX YEARS. FROM THE DEATH OF MOSES TO THE DEATH OF ELI.' },
  { number: '6', sectionCount: 83, heading: 'Book VI CONTAINING THE INTERVAL OF THIRTY-TWO YEARS. FROM THE DEATH OF ELI TO THE DEATH OF SAUL.' },
  { number: '7', sectionCount: 76, heading: 'Book VII CONTAINING THE INTERVAL OF FORTY YEARS. FROM THE DEATH OF SAUL TO THE DEATH OF DAVID.' },
  { number: '8', sectionCount: 85, heading: 'Book VIII CONTAINING THE INTERVAL OF ONE HUNDRED AND SIXTY-THREE YEARS. FROM THE DEATH OF DAVID TO THE DEATH OF AHAB.' },
  { number: '9', sectionCount: 54, heading: 'Book IX CONTAINING THE INTERVAL OF ONE HUNDRED AND FIFTY-SEVEN YEARS. FROM THE DEATH OF AHAB TO THE CAPTIVITY OF THE TEN TRIBES.' },
  { number: '10', sectionCount: 52, heading: 'Book X CONTAINING THE INTERVAL OF ONE HUNDRED AND EIGHTY-TWO YEARS AND A HALF. FROM THE CAPTIVITY OF THE TEN TRIBES TO THE FIRST YEAR OF CYRUS.' },
  { number: '11', sectionCount: 54, heading: 'Book XI CONTAINING THE INTERVAL OF TWO HUNDRED AND FIFTY-THREE YEARS AND FIVE MONTHS. FROM THE FIRST OF CYRUS TO THE DEATH OF ALEXANDER THE GREAT.' },
  { number: '12', sectionCount: 68, heading: 'Book XII CONTAINING THE INTERVAL OF A HUNDRED AND SEVENTY YEARS. FROM THE DEATH OF ALEXANDER THE GREAT TO THE DEATH OF JUDAS MACCABEUS.' },
  { number: '13', sectionCount: 87, heading: 'Book XIII CONTAINING THE INTERVAL OF EIGHTY-TWO YEARS, FROM THE DEATH OF JUDAS MACCABEUS TO THE DEATH OF QUEEN ALEXANDRA.' },
  { number: '14', sectionCount: 111, heading: 'Book XIV CONTAINING THE INTERVAL OF THIRTY-TWO YEARS. FROM THE DEATH OF QUEEN ALEXANDRA TO THE DEATH OF ANTIGONUS.' },
  { number: '15', sectionCount: 67, heading: 'Book XV CONTAINING THE INTERVAL OF EIGHTEEN YEARS. FROM THE DEATH OF ANTIGONUS TO THE FINISHING OF THE TEMPLE BY HEROD.' },
  { number: '16', sectionCount: 61, heading: 'Book XVI CONTAINING THE INTERVAL OF TWELVE YEARS. FROM THE FINISHING OF THE TEMPLE BY HEROD TO THE DEATH OF ALEXANDER AND ARISTOBULUS.' },
  { number: '17', sectionCount: 61, heading: 'Book XVII CONTAINING THE INTERVAL OF FOURTEEN YEARS. FROM THE DEATH OF ALEXANDER AND ARISTOBULUS TO THE BANISHMENT OF ARCHELAUS.' },
  { number: '18', sectionCount: 57, heading: 'Book XVIII CONTAINING THE INTERVAL OF THIRTY-TWO YEARS. FROM THE BANISHMENT OF ARCHELUS TO THE DEPARTURE FROM BABYLON.' },
  { number: '19', sectionCount: 52, heading: 'Book XIX CONTAINING THE INTERVAL OF THREE YEARS AND A HALF. FROM THE DEPARTURE OUT OF BABYLON TO FADUS, THE ROMAN PROCURATOR.' },
  { number: '20', sectionCount: 51, heading: 'Book XX CONTAINING THE INTERVAL OF TWENTY-TWO YEARS. FROM FADUS THE PROCURATOR TO FLORUS.' },
];
const TOTAL_SECTIONS = EXPECTED_BOOKS.reduce((n, b) => n + b.sectionCount, 0);

/** Verbatim incipit of book-1-sec-1's passage (prefix check). */
const INCIPIT = 'Those who undertake to write histories';

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '<p>', '</p>', '<div', '<note', '<gap', '<del', '<milestone', '<lb', '<quote', '<q ', '<q>'];

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
  if (work.language !== 'en') err('language', `expected 'en', got ${JSON.stringify(work.language)}`);
  if (about['editor'] !== undefined) err('editor', `about.json must not carry an editor on the English side, got ${JSON.stringify(about['editor'])}`);
  if (about['translator'] !== 'William Whiston') err('translator', `expected translator "William Whiston", got ${JSON.stringify(about['translator'])}`);

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
    sectionCounts.push(`Book ${spec.number}: ${sections.length} sections (expected ${spec.sectionCount})`);
    if (sections.length !== spec.sectionCount) err('section-count', `${b.id}: expected ${spec.sectionCount}, got ${sections.length}`);
    totalSections += sections.length;

    // no "arg" sections at all in this witness (unlike the Greek sibling)
    if (sections.some((s) => s.number === 'arg')) err('no-arg-sections', `${b.id}: this English witness must not contain any "arg" section`);

    sections.forEach((s) => {
      if (s.id !== `book-${spec.number}-sec-${s.number}`) err('section-id', `${s.id}: id does not match "book-${spec.number}-sec-${String(s.number)}"`);
      if (s.ref !== null) err('section-ref', `${s.id}: ref must be null, got ${JSON.stringify(s.ref)}`);
      if (s.editorialTitle !== null) err('section-editorialTitle', `${s.id}: editorialTitle must be null, got ${JSON.stringify(s.editorialTitle)}`);
      if (!Array.isArray(s.children) || s.children.length !== 0) err('section-children', `${s.id}: children must be [], got ${JSON.stringify(s.children)}`);
      if (s.passages.length !== 1) err('section-passage-count', `${s.id}: expected exactly 1 passage, got ${s.passages.length}`);
      for (const p of s.passages) {
        totalPassages += 1;
        totalChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${s.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${s.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${s.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      }
    });

    // section numbers, when numeric, should be strictly increasing except for the one
    // documented Book 17 irregularity (book-17-sec-13) - flagged as WARN, not ERROR.
    let prev: number | null = null;
    for (const s of sections) {
      if (!/^\d+$/.test(String(s.number))) continue;
      const val = Number(s.number);
      if (prev !== null && val <= prev) {
        if (s.id === 'book-17-sec-13') {
          warn('known-numbering-irregularity', `${s.id}: n="${s.number}" follows n="${prev}" - documented source-side irregularity, see anomalies.json`);
        } else {
          err('section-number-order', `${s.id}: n="${s.number}" follows n="${prev}" (expected strictly increasing) - undocumented irregularity`);
        }
      } else {
        prev = val;
      }
    }
  });

  if (totalSections !== TOTAL_SECTIONS) err('total-sections', `expected ${TOTAL_SECTIONS} sections total, got ${totalSections}`);

  // book-17-sec-13 must exist (the documented numbering irregularity)
  const book17 = books.find((b) => b.id === 'book-17');
  if (!book17?.children.some((s) => s.id === 'book-17-sec-13')) {
    err('book17-sec13-present', 'expected book-17-sec-13 (the documented source-side numbering irregularity) to be present');
  }

  // Testimonium Flavianum (Book 18) must be present as ordinary, unflagged text
  const book18 = books.find((b) => b.id === 'book-18');
  const sec63 = book18?.children.find((s) => s.id === 'book-18-sec-63');
  if (!sec63 || !sec63.passages[0]?.text.includes('Jesus')) {
    err('testimonium-present', 'book-18-sec-63 should contain the Testimonium Flavianum passage, mentioning "Jesus"');
  }
  if (sec63?.passages[0]?.anomaly) {
    warn('testimonium-unexpectedly-flagged', 'book-18-sec-63 carries a Passage.anomaly - the English witness is not expected to flag this passage (see the Greek sibling instead)');
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
  if (!anomalies.some((a) => /note.*editorial|editorial.*footnote/i.test(a.note))) {
    err('note-exclusion', 'anomalies.json must document the <note> editorial-footnote exclusion policy');
  }
  if (!anomalies.some((a) => /book-17-sec-13|numbering irregularity/i.test(a.note))) {
    err('book17-note', 'anomalies.json must document the Book 17 section-numbering irregularity individually');
  }
  if (!anomalies.some((a) => /nested.*<p>|<quote>/i.test(a.note))) {
    err('nested-p-note', 'anomalies.json must document the nested-<p>-inside-<quote> handling');
  }

  // ---- spot checks ----
  const p1 = books[0]?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(INCIPIT.normalize('NFC'));
  if (!okStart) err('spot-check-incipit', `book-1-sec-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const lastBook = books[books.length - 1];
  const lastSections = lastBook?.children ?? [];
  const lastSec = lastSections[lastSections.length - 1];
  const lastText = lastSec?.passages[0]?.text ?? '';

  const stats = { books: books.length, sections: totalSections, passages: totalPassages, chars: totalChars };
  writeReport(findings, stats, sectionCounts, anomalies, {
    incipitOk: okStart,
    incipitGot: p1.slice(0, 90),
    lastSecId: lastSec?.id ?? '(none)',
    lastTextTail: lastText.slice(-120),
  });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:jewish-antiquities-en ===\n');
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
  spot?: { incipitOk: boolean; incipitGot: string; lastSecId: string; lastTextTail: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Jewish Antiquities (English) validation report`);
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
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — book-1-sec-1 incipit\n  - got: \`${spot.incipitGot}\``);
    L.push(`- (informational) final section (${spot.lastSecId}) tail\n  - got: \`${spot.lastTextTail}\``);
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
