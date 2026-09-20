/**
 * Validation for data/de-republica-la/.
 *
 *   npx tsx scripts/import-de-republica-la/validate.ts
 *
 * Writes data/de-republica-la/VALIDATION_REPORT.md, prints a summary, and
 * exits non-zero if any ERROR-level check fails. WARN-level findings
 * (preserved source irregularities - and there are many, genuinely, for
 * this work) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Division, GenericWork } from '../../data/de-republica-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'de-republica-la');

const WORK_ID = 'de-republica-la';
const EXPECTED_DIVISIONS = [
  { number: '1', sectionCount: 70, heading: 'Liber Primus' },
  { number: '1fr', sectionCount: 6, heading: 'Libri I de Re Publica Fragmenta Incertae Sedis' },
  { number: '2', sectionCount: 71, heading: 'Liber Secundus' },
  { number: '3', sectionCount: 43, heading: 'Liber Tertius' },
  { number: '3fr', sectionCount: 5, heading: 'Libri III de Re Publica Fragmenta Incertae Sedis' },
  { number: '4', sectionCount: 13, heading: 'Liber Quartus' },
  { number: '5', sectionCount: 10, heading: 'Liber Quintus' },
  { number: '6', sectionCount: 26, heading: 'Liber Sextus' },
  { number: 'fr', sectionCount: 8, heading: 'Librorum de Re Publica incertorum Fragmenta' },
];
/** book-1 sec-1 genuinely opens mid-gap (34-page lacuna) — the verbatim gap-dots, not real prose, are the true incipit. */
const INCIPIT = '. . . . impetu liberavissent';
/** book-6's final surviving section closes the Dream of Scipio. */
const EXPLICIT = 'Ille discessit; ego somno solutus sum.';

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '<p>', '</p>', '<div', '<del', '<add', '<gap', '<note', '<milestone', '<cit', '<bibl', '<quote', '<pb'];

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

  for (const f of ['work.json', 'about.json', 'anomalies.json']) {
    if (!existsSync(join(DIR, f))) err('presence', `missing ${f} — run the importer`);
  }
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport(findings, { divisions: 0, sections: 0, passages: 0, chars: 0 }, []);
    process.exit(1);
  }

  const work = JSON.parse(readFileSync(join(DIR, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(DIR, 'about.json'), 'utf8')) as Record<string, unknown>;
  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  if (work.workId !== WORK_ID) err('workId', `expected ${WORK_ID}, got ${JSON.stringify(work.workId)}`);
  if (work.language !== 'la') err('language', `expected 'la', got ${JSON.stringify(work.language)}`);
  if (about['translator'] !== undefined) err('translator', `about.json must not carry a translator (no English bundled), got ${JSON.stringify(about['translator'])}`);
  if (about['editor'] !== 'Carl Friedrich Wilhelm Mueller') err('editor', `expected editor "Carl Friedrich Wilhelm Mueller", got ${JSON.stringify(about['editor'])}`);

  const divs = work.divisions ?? [];
  if (divs.length !== EXPECTED_DIVISIONS.length) err('division-count', `expected ${EXPECTED_DIVISIONS.length} top-level divisions, got ${divs.length}`);

  let totalSections = 0;
  let totalPassages = 0;
  let totalChars = 0;
  const sectionCounts: string[] = [];
  const BOOK_ID_STRICT = /^book-\d+$/; // matches genericCorpus.ts's kindLabel behaviour for a plain-integer book

  divs.forEach((b, i) => {
    const spec = EXPECTED_DIVISIONS[i];
    if (!spec) return;
    if (b.id !== `book-${spec.number}`) err('division-id', `division[${i}] id ${JSON.stringify(b.id)}, expected "book-${spec.number}"`);
    if (b.number !== spec.number) err('division-number', `${b.id}: number ${JSON.stringify(b.number)}, expected ${JSON.stringify(spec.number)}`);
    if (b.ref !== null) err('division-ref', `${b.id}: ref must be null, got ${JSON.stringify(b.ref)}`);
    if (b.sourceHeading !== spec.heading) err('division-sourceHeading', `${b.id}: sourceHeading ${JSON.stringify(b.sourceHeading)}, expected ${JSON.stringify(spec.heading)}`);
    if (b.passages.length !== 0) err('division-passages', `${b.id}: passages must be [] (container only), got ${b.passages.length}`);

    const isFragmentCollection = /fr$/.test(spec.number) && spec.number !== '';
    if (isFragmentCollection && BOOK_ID_STRICT.test(b.id)) {
      err('fragment-id-shape', `${b.id}: a fragment-collection id must NOT match the plain book-N pattern (it would wrongly render as "Book ${spec.number}")`);
    }
    if (!isFragmentCollection && !BOOK_ID_STRICT.test(b.id)) {
      err('numbered-book-id-shape', `${b.id}: a numbered book's id should match book-N`);
    }

    const sections = b.children ?? [];
    sectionCounts.push(`${b.id}: ${sections.length} sections (expected ${spec.sectionCount})`);
    if (sections.length !== spec.sectionCount) err('section-count', `${b.id}: expected ${spec.sectionCount}, got ${sections.length}`);
    totalSections += sections.length;

    const seenNumbers = new Set<string>();
    for (const s of sections) {
      const wantId = `book-${spec.number}-sec-${s.number}`;
      if (s.id !== wantId) err('section-id', `section id ${JSON.stringify(s.id)}, expected ${JSON.stringify(wantId)}`);
      if (seenNumbers.has(s.number ?? '')) err('section-number-dup', `${s.id}: duplicate section number ${JSON.stringify(s.number)} within ${b.id}`);
      seenNumbers.add(s.number ?? '');
      if (s.sourceHeading !== null) err('section-sourceHeading', `${s.id}: sourceHeading must be null, got ${JSON.stringify(s.sourceHeading)}`);
      if (s.editorialTitle !== null) err('section-editorialTitle', `${s.id}: editorialTitle must be null, got ${JSON.stringify(s.editorialTitle)}`);
      if (!Array.isArray(s.children) || s.children.length !== 0) err('section-children', `${s.id}: children must be [], got ${JSON.stringify(s.children)}`);
      if (s.passages.length !== 1) err('section-passage-count', `${s.id}: expected exactly 1 passage, got ${s.passages.length}`);
      if (isFragmentCollection && s.ref !== null) err('fragment-ref-not-null', `${s.id}: fragment-collection sections should have ref=null (no chapter milestones there), got ${JSON.stringify(s.ref)}`);
      for (const p of s.passages) {
        totalPassages += 1;
        totalChars += p.text.length;
        if (typeof p.text !== 'string' || p.text.length === 0) err('empty-passage', `${s.id}: passage text is empty`);
        if (p.n !== '') err('passage-n', `${s.id}: passage n must be "", got ${JSON.stringify(p.n)}`);
        if (p.ref !== null) err('passage-ref', `${s.id}: passage ref must be null, got ${JSON.stringify(p.ref)}`);
      }
    }
  });

  // ---- leaked markup ----
  const leaks: string[] = [];
  const walk = (ds: Division[], where: string) => {
    for (const d of ds) {
      d.passages.forEach((p, i) => {
        for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`${where}${d.id}/passage[${i}]: contains ${JSON.stringify(marker)}`);
        if (p.text.includes('�')) leaks.push(`${where}${d.id}/passage[${i}]: contains U+FFFD replacement character`);
      });
      if (d.children.length) walk(d.children, where);
    }
  };
  walk(divs, '');
  if (leaks.length) err('no-leaked-markup', `${leaks.length} string(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);

  // ---- required anomaly disclosures ----
  const need: Array<[RegExp, string]> = [
    [/nine top-level/i, 'the nine-top-level-divisions structure'],
    [/<del>/i, 'the <del> exclusion policy'],
    [/<add>/i, 'the <add> retention policy'],
    [/<gap reason="lost"/i, 'the <gap> handling'],
    [/bibl.*citation|citation.*kept/i, 'the fragment-citation editorial judgement call'],
    [/section numbering.*not sequential|not sequential.*numbering/i, 'the non-sequential section numbering'],
    [/No text survives.*section-1|ENTIRE content is lost/i, 'the book-3-sec-1 total-loss placeholder'],
  ];
  for (const [re, label] of need) {
    if (!anomalies.some((a) => re.test(a.note))) err('missing-disclosure', `anomalies.json must document: ${label}`);
  }

  // ---- placeholder passage must be flagged, never mistaken for real Cicero text ----
  const b3 = divs.find((d) => d.id === 'book-3');
  const sec1 = b3?.children.find((s) => s.number === '1');
  if (!sec1?.passages[0]?.text.startsWith('[No text survives')) {
    err('placeholder-text', 'book-3-sec-1 should carry the bracketed "no text survives" placeholder');
  }
  if (!sec1?.passages[0]?.anomaly) {
    err('placeholder-anomaly', 'book-3-sec-1 passage must carry an .anomaly flag explaining the placeholder');
  }

  // ---- spot checks ----
  const b1 = divs.find((d) => d.id === 'book-1');
  const p1 = b1?.children[0]?.passages[0]?.text ?? '';
  const okStart = p1.normalize('NFC').startsWith(INCIPIT.normalize('NFC'));
  if (!okStart) err('spot-check-incipit', `book-1 sec-1 does not start with ${JSON.stringify(INCIPIT)} (got: ${JSON.stringify(p1.slice(0, 90))})`);

  const b6 = divs.find((d) => d.id === 'book-6');
  const b6Sections = b6?.children ?? [];
  const lastSec = b6Sections[b6Sections.length - 1];
  const lastText = lastSec?.passages[0]?.text ?? '';
  const okEnd = lastText.normalize('NFC').endsWith(EXPLICIT.normalize('NFC'));
  if (!okEnd) err('spot-check-explicit', `book-6's final section does not end with ${JSON.stringify(EXPLICIT)} (got tail: ${JSON.stringify(lastText.slice(-90))})`);

  const stats = { divisions: divs.length, sections: totalSections, passages: totalPassages, chars: totalChars };
  writeReport(findings, stats, sectionCounts, anomalies, { incipitOk: okStart, incipitGot: p1.slice(0, 90), explicitOk: okEnd, explicitGot: lastText.slice(-90) });

  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:de-republica-la ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  ${stats.divisions} top-level divisions / ${stats.sections} sections / ${stats.passages} passages / ${stats.chars} chars\n`);
  process.stdout.write(`  -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(
  findings: Finding[],
  stats: { divisions: number; sections: number; passages: number; chars: number },
  sectionCounts: string[],
  anomalies: Anomaly[] = [],
  spot?: { incipitOk: boolean; incipitGot: string; explicitOk: boolean; explicitGot: string },
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# De Republica (Latin) validation report`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('This work is genuinely, severely fragmentary — see about.json. This report validates structural');
  L.push('integrity and disclosure, not completeness (there is none to check against).');
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- top-level divisions: ${stats.divisions}`);
  L.push(`- sections: ${stats.sections}`);
  L.push(`- passages: ${stats.passages}`);
  L.push(`- total passage chars: ${stats.chars}`);
  for (const c of sectionCounts) L.push(`- ${c}`);
  L.push('');
  if (spot) {
    L.push('## Verbatim spot-check');
    L.push('');
    L.push(`- ${spot.incipitOk ? 'OK' : 'FAIL'} — book-1 sec-1 incipit (opens mid-lacuna, so this is the gap's own literal dots, not prose)\n  - got: \`${spot.incipitGot}\``);
    L.push(`- ${spot.explicitOk ? 'OK' : 'FAIL'} — book-6 final section explicit (close of the Dream of Scipio)\n  - got: \`${spot.explicitGot}\``);
    L.push('');
  }
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  if (anomalies.length === 0) L.push('_none_');
  for (const a of anomalies.slice(0, 80)) L.push(`- **${a.where}** — ${a.note}`);
  if (anomalies.length > 80) L.push(`- _(${anomalies.length - 80} more; see anomalies.json)_`);
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
