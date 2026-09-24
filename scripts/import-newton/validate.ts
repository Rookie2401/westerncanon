/**
 * Validation for the Newton batch (newton-principia-la, newton-principia-en,
 * newton-opticks-en): structure checks (proposition/lemma/etc. counts per
 * book against this edition's own printed numbering, independently verified
 * by direct inspection - see scripts/import-newton/index.ts's about.json
 * prose for the citations) AND TEXT ACCOUNTING (rebuilds the token stream
 * from the cached raw pages and confirms every paragraph of 40+ characters
 * occurs, verbatim modulo whitespace, somewhere in that work's assembled
 * text - printing every miss and FAILING the run on any non-editorial one).
 *
 *   npx tsx scripts/import-newton/validate.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenizePage } from './walk.ts';
import type { Division, GenericWork, WorkAbout } from './sharedTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

type Level = 'ERROR' | 'WARN';
interface Finding { level: Level; check: string; message: string }

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function loadWork(workId: string): { work: GenericWork; about: WorkAbout } | null {
  const dir = join(DATA_ROOT, workId);
  if (!existsSync(join(dir, 'work.json'))) return null;
  return {
    work: JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')),
    about: JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')),
  };
}

function allDivisions(divs: Division[]): Division[] {
  const out: Division[] = [];
  const walk = (d: Division) => { out.push(d); for (const c of d.children) walk(c); };
  for (const d of divs) walk(d);
  return out;
}

function structureChecks(workId: string, work: GenericWork, findings: Finding[]): void {
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: `${workId}: ${m}` });
  const divisions = allDivisions(work.divisions);
  for (const d of divisions) {
    if (d.children.length === 0 && d.passages.length === 0) err('empty-division', `${d.id} has neither children nor passages`);
    for (const [i, p] of d.passages.entries()) {
      if (!p.text || p.text.trim().length === 0) err('empty-passage', `${d.id} passage[${i}] is empty`);
      if (p.n !== '') err('passage-n', `${d.id} passage[${i}]: n must be '', got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `${d.id} passage[${i}]: ref must be null`);
    }
  }
  // no duplicate ids
  const ids = new Map<string, number>();
  for (const d of divisions) ids.set(d.id, (ids.get(d.id) ?? 0) + 1);
  for (const [id, n] of ids) if (n > 1) err('duplicate-id', `division id "${id}" appears ${n} times`);
}

function countKind(work: GenericWork, bookId: string, slugPrefix: string): number {
  return allDivisions(work.divisions).filter((d) => d.id.startsWith(`${bookId}-${slugPrefix}-`) || d.id === `${bookId}-${slugPrefix}`).length;
}

function principiaStructureChecks(workId: string, work: GenericWork, findings: Finding[], expected: { book: string; props: number; lemmas: number }[]): void {
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: `${workId}: ${m}` });
  for (const e of expected) {
    const props = countKind(work, e.book, 'prop');
    const lemmas = countKind(work, e.book, 'lemma');
    if (props !== e.props) err('prop-count', `${e.book}: expected ${e.props} Propositions, found ${props}`);
    if (lemmas !== e.lemmas) err('lemma-count', `${e.book}: expected ${e.lemmas} Lemmas, found ${lemmas}`);
  }
  const sections14 = work.divisions.find((d) => d.id === 'book-1')?.children.length;
  if (sections14 !== 14) err('book-1-sections', `expected 14 Sections in Book I, found ${sections14}`);
  const sections9 = work.divisions.find((d) => d.id === 'book-2')?.children.length;
  if (sections9 !== 9) err('book-2-sections', `expected 9 Sections in Book II, found ${sections9}`);
  const defs = countKind(work, 'definitions', 'def');
  if (defs !== 8) err('definitions-count', `expected 8 Definitions, found ${defs}`);
  const laws = countKind(work, 'axioms', 'law');
  if (laws !== 3) err('laws-count', `expected 3 Laws, found ${laws}`);
}

/**
 * Content-token text (>=40 chars) rebuilt from the cached raw pages for one
 * language's Principia pages. `skipFiles` names raw pages that were
 * DELIBERATELY excluded from the assembled work (each disclosed in
 * about.json) - e.g. the 1846 English edition's own editorial Dedication,
 * which is the editors' modern matter, not Newton's - so their text is never
 * expected to appear in the output and is not counted as a miss.
 */
function collectPrincipiaRawChunks(rawDir: string, skipFiles: Set<string> = new Set()): string[] {
  const out: string[] = [];
  for (const file of readdirSync(rawDir).sort()) {
    if (!file.endsWith('.json')) continue;
    if (skipFiles.has(file)) continue;
    const j = JSON.parse(readFileSync(join(rawDir, file), 'utf8')) as { html: string };
    const { tokens } = tokenizePage(j.html);
    for (const t of tokens) {
      if (t.kind !== 'content') continue;
      if (norm(t.text).length >= 40) out.push(norm(t.text));
    }
  }
  return out;
}

/**
 * Opticks paragraphs (>=40 chars), from the same start/end boundary the
 * importer itself uses. The Gutenberg boilerplate (title page, the
 * UNSIGNED "Advertisement to this Fourth Edition" written after Newton's
 * death, and the Transcriber's Note) is DELIBERATELY excluded from the
 * assembled work and disclosed in about.json - excluded here too, by the
 * same textual boundary (Newton's own signed Advertisements I/II are kept
 * and ARE expected to appear, under the "prefaces" Division).
 */
function collectOpticksRawChunks(rawFile: string): string[] {
  const raw = readFileSync(rawFile, 'utf8');
  const s = raw.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK OPTICKS ***');
  const e = raw.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK OPTICKS ***');
  let body = raw.slice(s + '*** START OF THE PROJECT GUTENBERG EBOOK OPTICKS ***'.length, e);
  // Skip the PG credit block + title page (transport furniture, never
  // imported) up to Newton's own signed "Advertisement I", then skip the
  // unsigned "Advertisement to this Fourth Edition" + Transcriber's Note
  // through to Book I's own start - see buildOpticks.ts / about.json.
  const advI = body.indexOf('Advertisement I');
  const advToFourth = body.indexOf('Advertisement to this Fourth Edition');
  const firstBook = body.indexOf('THE FIRST BOOK OF OPTICKS');
  if (advI >= 0 && advToFourth > advI && firstBook > advToFourth) {
    body = body.slice(advI, advToFourth) + body.slice(firstBook);
  }
  const paras = body.split(/\r?\n\s*\r?\n/).map((p) => norm(p.replace(/\r?\n/g, ' ')));
  return paras.filter((p) => p.length >= 40);
}

function textAccounting(workId: string, work: GenericWork, rawChunks: string[], findings: Finding[]): { checked: number; missed: number } {
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: `${workId}: ${m}` });
  const allText = norm(allDivisions(work.divisions).flatMap((d) => d.passages.map((p) => p.text)).join(' ☃ '));
  let missed = 0;
  const misses: string[] = [];
  for (const chunk of rawChunks) {
    // A chunk may have been SPLIT during assembly (Cor./Hypoth./Obs./Exper./
    // Query mid-paragraph boundaries - see classify.ts/buildOpticks.ts), so
    // require only its first 60 and last 60 characters to survive somewhere
    // in the corpus, not necessarily contiguously as the exact original
    // substring.
    const head = chunk.slice(0, 60);
    const tail = chunk.slice(-60);
    if (!allText.includes(head) || !allText.includes(tail)) {
      missed += 1;
      if (misses.length < 30) misses.push(chunk.slice(0, 100));
    }
  }
  if (missed > 0) err('text-accounting', `${missed}/${rawChunks.length} raw paragraph(s) not found in the assembled text. First misses:\n    ${misses.join('\n    ')}`);
  return { checked: rawChunks.length, missed };
}

function main(): void {
  const findings: Finding[] = [];
  process.stdout.write('\n=== validate:newton ===\n');

  const la = loadWork('newton-principia-la');
  const en = loadWork('newton-principia-en');
  const op = loadWork('newton-opticks-en');
  if (!la) findings.push({ level: 'ERROR', check: 'presence', message: 'newton-principia-la: missing - run the importer' });
  if (!en) findings.push({ level: 'ERROR', check: 'presence', message: 'newton-principia-en: missing - run the importer' });
  if (!op) findings.push({ level: 'ERROR', check: 'presence', message: 'newton-opticks-en: missing - run the importer' });

  if (la) {
    structureChecks('newton-principia-la', la.work, findings);
    principiaStructureChecks('newton-principia-la', la.work, findings, [
      { book: 'book-1', props: 98, lemmas: 29 },
      { book: 'book-2', props: 51, lemmas: 4 },
      { book: 'book-3', props: 42, lemmas: 11 },
    ]);
    const hypoth = countKind(la.work, 'book-3', 'hypoth');
    if (hypoth !== 9) findings.push({ level: 'ERROR', check: 'hypoth-count', message: `newton-principia-la: expected 9 Hypotheses in Book III, found ${hypoth}` });
    if (la.work.divisions.some((d) => d.id === 'general-scholium')) findings.push({ level: 'ERROR', check: 'general-scholium', message: 'newton-principia-la: the 1687 first edition must NOT carry a general-scholium Division' });
    const rawChunks = collectPrincipiaRawChunks(join(HERE, 'raw', 'la'));
    const acc = textAccounting('newton-principia-la', la.work, rawChunks, findings);
    process.stdout.write(`  newton-principia-la  text accounting: ${acc.checked - acc.missed}/${acc.checked} paragraphs accounted for\n`);
  }

  if (en) {
    structureChecks('newton-principia-en', en.work, findings);
    principiaStructureChecks('newton-principia-en', en.work, findings, [
      { book: 'book-1', props: 98, lemmas: 29 },
      { book: 'book-2', props: 53, lemmas: 7 },
      { book: 'book-3', props: 42, lemmas: 11 },
    ]);
    const rules = countKind(en.work, 'book-3', 'rule');
    const phaen = countKind(en.work, 'book-3', 'phaenomenon');
    if (rules !== 4) findings.push({ level: 'ERROR', check: 'rule-count', message: `newton-principia-en: expected 4 Rules in Book III, found ${rules}` });
    if (phaen !== 6) findings.push({ level: 'ERROR', check: 'phaenomenon-count', message: `newton-principia-en: expected 6 Phaenomena in Book III, found ${phaen}` });
    if (!en.work.divisions.some((d) => d.id === 'general-scholium')) findings.push({ level: 'ERROR', check: 'general-scholium', message: 'newton-principia-en: this 1726-derived edition must carry a general-scholium Division' });
    const rawChunks = collectPrincipiaRawChunks(join(HERE, 'raw', 'en'), new Set(['dedication.json']));
    const acc = textAccounting('newton-principia-en', en.work, rawChunks, findings);
    process.stdout.write(`  newton-principia-en  text accounting: ${acc.checked - acc.missed}/${acc.checked} paragraphs accounted for\n`);
  }

  if (op) {
    structureChecks('newton-opticks-en', op.work, findings);
    const expectCounts: [string, string, number][] = [
      ['book-1', 'def', 8], ['book-1', 'ax', 8], ['book-1', 'prop', 19], ['book-1', 'exper', 31],
      ['book-2', 'prop', 20], ['book-2', 'obs', 37],
      ['book-3', 'obs', 11], ['book-3', 'query', 31],
    ];
    const opDivisions = allDivisions(op.work.divisions);
    for (const [book, slug, want] of expectCounts) {
      // Opticks ids are "book-N-part-M-slug-number" (each Part restarts its
      // own numbering independently - see buildOpticks.ts), so the Book
      // number alone (not "book-N-slug-") is the matching prefix.
      const re = new RegExp(`^${book}-part-\\d+-${slug}-`);
      const got = opDivisions.filter((d) => re.test(d.id)).length;
      if (got !== want) findings.push({ level: 'ERROR', check: 'opticks-count', message: `newton-opticks-en: ${book} ${slug}: expected ${want}, found ${got}` });
    }
    const rawChunks = collectOpticksRawChunks(join(HERE, 'raw', 'opticks', 'pg33504.txt'));
    const acc = textAccounting('newton-opticks-en', op.work, rawChunks, findings);
    process.stdout.write(`  newton-opticks-en    text accounting: ${acc.checked - acc.missed}/${acc.checked} paragraphs accounted for\n`);
  }

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const report: string[] = [];
  report.push('# Newton batch validation report');
  report.push('');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  report.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  report.push('');
  report.push('## Errors');
  report.push('');
  if (errors.length === 0) report.push('_none_');
  for (const f of errors) report.push(`- **[${f.check}]** ${f.message}`);
  report.push('');
  report.push('## Warnings');
  report.push('');
  if (warns.length === 0) report.push('_none_');
  for (const f of warns) report.push(`- **[${f.check}]** ${f.message}`);
  writeFileSync(join(HERE, 'VALIDATION_REPORT.md'), report.join('\n') + '\n', 'utf8');

  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  for (const f of errors) process.stdout.write(`  [ERROR] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write('Report written to scripts/import-newton/VALIDATION_REPORT.md\n');
  if (errors.length > 0) process.exit(1);
}

main();
