/**
 * Validator for all four works this importer group produces:
 *   data/plato-republic-grc/   data/plato-republic-en/
 *   data/plato-laws-grc/       data/plato-laws-en/
 *
 *   npx tsx scripts/import-plato-c-shared/validate.ts
 *
 * Run each work's own importer first (see scripts/import-plato-<work>-
 * <lang>/index.ts). This does not re-parse the raw sources; it only checks
 * the written work.json/about.json/anomalies.json for internal consistency
 * and the shape described in scripts/import-plato-c-shared/types.ts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork, WorkAbout } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

let failures = 0;
function check(cond: unknown, message: string): void {
  if (!cond) {
    failures += 1;
    process.stderr.write(`FAIL: ${message}\n`);
  }
}

function readJson<T>(workId: string, name: string): T {
  const file = join(REPO_ROOT, 'data', workId, name);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

const BOOK_ID_RE = /^book-\d+$/;
const SECTION_ID_RE = /^book-\d+-sec-\d+$/;

interface SectionInfo {
  bookNum: number;
  stephanus: number;
  id: string;
}

/** Walks a two-level (Book -> Section) work and returns flat section info in document order, plus basic shape checks. */
function checkTwoLevelWork(workId: string, work: GenericWork, expectedBookCount: number, expectedSectionCount: number): SectionInfo[] {
  check(work.workId === workId, `${workId}: work.json workId is "${work.workId}", expected "${workId}"`);
  check(work.divisions.length === expectedBookCount, `${workId}: expected ${expectedBookCount} Book divisions, got ${work.divisions.length}`);

  const sections: SectionInfo[] = [];
  work.divisions.forEach((book, bi) => {
    const bookNum = bi + 1;
    check(book.id === `book-${bookNum}`, `${workId}: Book ${bi} has id "${book.id}", expected "book-${bookNum}"`);
    check(book.number === String(bookNum), `${workId}: ${book.id} has number "${book.number}", expected "${bookNum}"`);
    check(book.ref === null, `${workId}: ${book.id}.ref should be null`);
    check(book.sourceHeading === null, `${workId}: ${book.id}.sourceHeading should be null`);
    check(book.editorialTitle === null, `${workId}: ${book.id}.editorialTitle should be null`);
    check(book.passages.length === 0, `${workId}: ${book.id} (a Book container) should have 0 passages, has ${book.passages.length}`);
    check(book.children.length > 0, `${workId}: ${book.id} has no Section children`);

    book.children.forEach((section) => {
      check(SECTION_ID_RE.test(section.id), `${workId}: section id "${section.id}" does not match book-N-sec-M`);
      check(section.id === `book-${bookNum}-sec-${section.number}`, `${workId}: section id "${section.id}" inconsistent with number "${section.number}"`);
      check(section.ref === null, `${workId}: ${section.id}.ref should be null`);
      check(section.sourceHeading === null, `${workId}: ${section.id}.sourceHeading should be null`);
      check(section.editorialTitle === null, `${workId}: ${section.id}.editorialTitle should be null`);
      check(section.children.length === 0, `${workId}: ${section.id} should have 0 children`);
      check(section.passages.length === 1, `${workId}: ${section.id} should have exactly 1 passage, has ${section.passages.length}`);
      const passage = section.passages[0];
      check(!!passage && passage.n === '', `${workId}: ${section.id} passage.n should be ''`);
      check(!!passage && passage.ref === null, `${workId}: ${section.id} passage.ref should be null`);
      check(!!passage && passage.text.length > 0, `${workId}: ${section.id} passage.text is empty`);
      if (passage) {
        check(!/<\/?[a-zA-Z]+[ >]/.test(passage.text), `${workId}: ${section.id} passage.text looks like it still contains an XML tag: "${passage.text.slice(0, 80)}"`);
      }
      const stephanus = Number(section.number);
      check(Number.isFinite(stephanus) && stephanus > 0, `${workId}: ${section.id} has non-numeric Stephanus number "${section.number}"`);
      sections.push({ bookNum, stephanus, id: section.id });
    });
  });

  check(sections.length === expectedSectionCount, `${workId}: expected ${expectedSectionCount} total Section divisions, got ${sections.length}`);

  // Stephanus numbers must strictly increase across the WHOLE work (continuous, not restarting per book).
  for (let i = 1; i < sections.length; i++) {
    check(
      sections[i]!.stephanus > sections[i - 1]!.stephanus,
      `${workId}: Stephanus numbering not strictly increasing at ${sections[i]!.id} (${sections[i - 1]!.stephanus} -> ${sections[i]!.stephanus})`,
    );
  }

  return sections;
}

function checkAbout(workId: string, about: WorkAbout): void {
  check(about.workId === workId, `${workId}: about.json workId is "${about.workId}", expected "${workId}"`);
  check(!!about.title, `${workId}: about.json missing title`);
  check(about.author === 'Plato', `${workId}: about.json author is "${about.author}", expected "Plato"`);
  check(!!about.provenance, `${workId}: about.json missing provenance`);
  check(!!about.license, `${workId}: about.json missing license`);
}

function checkAnomalies(workId: string, anomalies: unknown): void {
  check(Array.isArray(anomalies), `${workId}: anomalies.json is not an array`);
  if (Array.isArray(anomalies)) {
    for (const a of anomalies) {
      check(a && typeof a.where === 'string' && typeof a.note === 'string', `${workId}: malformed anomaly entry ${JSON.stringify(a).slice(0, 120)}`);
    }
  }
}

function walkAllDivisions(divisions: Division[], visit: (d: Division) => void): void {
  for (const d of divisions) {
    visit(d);
    walkAllDivisions(d.children, visit);
  }
}

function main(): void {
  // --- Republic (Greek + English) -----------------------------------
  {
    const workId = 'plato-republic-grc';
    const work = readJson<GenericWork>(workId, 'work.json');
    check(work.language === 'grc', `${workId}: language should be "grc", got "${work.language}"`);
    const sections = checkTwoLevelWork(workId, work, 10, 278);
    const first = sections[0]!;
    const last = sections[sections.length - 1]!;
    check(first.stephanus === 327, `${workId}: expected first Stephanus page 327, got ${first.stephanus}`);
    check(last.stephanus === 621, `${workId}: expected last Stephanus page 621, got ${last.stephanus}`);
    checkAbout(workId, readJson<WorkAbout>(workId, 'about.json'));
    checkAnomalies(workId, readJson<unknown>(workId, 'anomalies.json'));
    process.stdout.write(`${workId}: OK (10 books, ${sections.length} sections, Stephanus ${first.stephanus}-${last.stephanus})\n`);
  }
  {
    const workId = 'plato-republic-en';
    const work = readJson<GenericWork>(workId, 'work.json');
    check(work.workId === workId, `${workId}: work.json workId is "${work.workId}", expected "${workId}"`);
    check(work.language === 'en', `${workId}: language should be "en", got "${work.language}"`);
    check(work.divisions.length === 10, `${workId}: expected 10 Book divisions, got ${work.divisions.length}`);
    work.divisions.forEach((book, bi) => {
      const bookNum = bi + 1;
      check(BOOK_ID_RE.test(book.id), `${workId}: Book id "${book.id}" does not match book-N`);
      check(book.id === `book-${bookNum}`, `${workId}: Book ${bi} has id "${book.id}", expected "book-${bookNum}"`);
      check(book.number === String(bookNum), `${workId}: ${book.id} has number "${book.number}", expected "${bookNum}"`);
      check(book.ref === null, `${workId}: ${book.id}.ref should be null`);
      check(book.sourceHeading === null, `${workId}: ${book.id}.sourceHeading should be null`);
      check(book.editorialTitle === null, `${workId}: ${book.id}.editorialTitle should be null`);
      // The one intentional structural asymmetry in this importer group:
      // Republic-en is a ONE-level Book-only tree (no Stephanus data available).
      check(book.children.length === 0, `${workId}: ${book.id} should have 0 children (Book-only tree - no Stephanus data), has ${book.children.length}`);
      check(book.passages.length === 1, `${workId}: ${book.id} should have exactly 1 passage, has ${book.passages.length}`);
      const passage = book.passages[0];
      check(!!passage && passage.n === '', `${workId}: ${book.id} passage.n should be ''`);
      check(!!passage && passage.ref === null, `${workId}: ${book.id} passage.ref should be null`);
      check(!!passage && passage.text.length > 100, `${workId}: ${book.id} passage.text looks too short (${passage?.text.length ?? 0} chars)`);
    });
    checkAbout(workId, readJson<WorkAbout>(workId, 'about.json'));
    checkAnomalies(workId, readJson<unknown>(workId, 'anomalies.json'));
    process.stdout.write(`${workId}: OK (10 books, Book-only tree - no Stephanus pagination in this source, disclosed in about.json)\n`);
  }

  // --- Laws (Greek + English) ------------------------------------------
  let lawsGrcSections: SectionInfo[];
  let lawsEnSections: SectionInfo[];
  {
    const workId = 'plato-laws-grc';
    const work = readJson<GenericWork>(workId, 'work.json');
    check(work.language === 'grc', `${workId}: language should be "grc", got "${work.language}"`);
    lawsGrcSections = checkTwoLevelWork(workId, work, 12, 327);
    const first = lawsGrcSections[0]!;
    const last = lawsGrcSections[lawsGrcSections.length - 1]!;
    check(first.stephanus === 624, `${workId}: expected first Stephanus page 624, got ${first.stephanus}`);
    check(last.stephanus === 969, `${workId}: expected last Stephanus page 969, got ${last.stephanus}`);
    checkAbout(workId, readJson<WorkAbout>(workId, 'about.json'));
    checkAnomalies(workId, readJson<unknown>(workId, 'anomalies.json'));
    process.stdout.write(`${workId}: OK (12 books, ${lawsGrcSections.length} sections, Stephanus ${first.stephanus}-${last.stephanus})\n`);
  }
  {
    const workId = 'plato-laws-en';
    const work = readJson<GenericWork>(workId, 'work.json');
    check(work.language === 'en', `${workId}: language should be "en", got "${work.language}"`);
    lawsEnSections = checkTwoLevelWork(workId, work, 12, 327);
    const first = lawsEnSections[0]!;
    const last = lawsEnSections[lawsEnSections.length - 1]!;
    check(first.stephanus === 624, `${workId}: expected first Stephanus page 624, got ${first.stephanus}`);
    check(last.stephanus === 969, `${workId}: expected last Stephanus page 969, got ${last.stephanus}`);
    checkAbout(workId, readJson<WorkAbout>(workId, 'about.json'));
    checkAnomalies(workId, readJson<unknown>(workId, 'anomalies.json'));
    process.stdout.write(`${workId}: OK (12 books, ${lawsEnSections.length} sections, Stephanus ${first.stephanus}-${last.stephanus})\n`);
  }

  // Cross-check: Laws Greek and English should carry the identical
  // Book/Stephanus-section sequence (both sourced from the same TEI
  // structure). The task brief allows for real mismatches to be *noted*
  // rather than forced into alignment - so this is a warning-style check
  // (still counted as a hard failure here because none were found when
  // this validator was written; if the sources are ever refreshed and a
  // real mismatch appears, this should become a logged anomaly instead of
  // a silent pass, not a crash).
  {
    const workId = 'plato-laws-grc/en cross-check';
    check(lawsGrcSections.length === lawsEnSections.length, `${workId}: section count differs (grc ${lawsGrcSections.length} vs en ${lawsEnSections.length})`);
    const n = Math.min(lawsGrcSections.length, lawsEnSections.length);
    let mismatches = 0;
    for (let i = 0; i < n; i++) {
      if (lawsGrcSections[i]!.id !== lawsEnSections[i]!.id) mismatches += 1;
    }
    check(mismatches === 0, `${workId}: ${mismatches} Book/Section id mismatches between the Greek and English Laws sequences`);
    process.stdout.write(`${workId}: OK (${n} sections match 1:1 between Greek and English)\n`);
  }

  // --- cross-source sanity: every division id, across all four works,
  //     matches either the Book or Section id shape ------------------
  for (const workId of ['plato-republic-grc', 'plato-republic-en', 'plato-laws-grc', 'plato-laws-en']) {
    const work = readJson<GenericWork>(workId, 'work.json');
    walkAllDivisions(work.divisions, (d) => {
      check(BOOK_ID_RE.test(d.id) || SECTION_ID_RE.test(d.id), `${workId}: division id "${d.id}" matches neither book-N nor book-N-sec-M`);
    });
  }

  if (failures > 0) {
    process.stderr.write(`\n${failures} validation failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('\nAll checks passed.\n');
}

main();
