/**
 * Validation for the 11-play Aristophanes English corpus.
 *
 *   npx tsx scripts/import-aristophanes-en/validate.ts
 *
 * Writes data/aristophanes-<slug>-en/VALIDATION_REPORT.md for each play,
 * prints a combined summary, and exits non-zero if any check fails.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYS, workId } from './playTable.ts';
import { hasCombining } from './text.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DATA_ROOT = join(REPO_ROOT, 'data');

const MIN_SPEECHES = 100;

const LEAK_MARKERS = ['{{', '[[', '<span', '&nbsp;', '<ref', '<br', '&amp;', '&lt;', '&gt;', '&quot;', '</'];

const REQUIRED_ABOUT_SECTIONS = ['About this edition', 'The translation', 'Digital source', 'How it was imported', 'Reference scheme', 'Known gaps & anomalies'];

/** First/last ~60 characters of the `text` division's first/last Passage,
 *  recorded directly from this importer's own verified output (see the
 *  report accompanying this batch) - guards against a future re-run
 *  silently truncating or reordering a play. */
const EXPECTED: Record<string, { first: string; last: string }> = {
  acharnians: { first: '[SCENE: The Athenian Ecclesia on the Pnyx', last: 'will repeat in thine honour, "Triumph, Triumph!"' },
  knights: { first: "[SCENE: In front of Demos' house at Athens.]", last: 'whom he used formerly so wantonly to insult.' },
  clouds: { first: "[SCENE: A sleeping-room in Strepsiades' house", last: 'So let the Chorus file off the stage. Its part is played.' },
  wasps: { first: "[SCENE: Philocleon's house at Athens.]", last: "it means 'three rulers,' 'three kinglets.']" },
  peace: { first: 'First Servant\nQuick, quick, bring the dung-beetle his cake.', last: 'my friends. All who come with me shall have cakes galore.' },
  birds: { first: '[Scene: A wild, desolate tract of open country', last: 'victory is thine, oh, thou greatest of the gods!' },
  lysistrata: { first: 'Lysistrata (alone)\nAh! if only they had been invited', last: 'held in peculiar reverence at Sparta.]' },
  thesmophoriazusae: { first: "[Scene: In front of Agathon's house", last: 'may the two goddesses reward us for our labours!' },
  frogs: { first: '[Scene: In front of the temple of Heracles', last: 'Cleophon, as we have just seen, was not an Athenian.]' },
  ecclesiazusae: { first: '[SCENE: Before a house in a Public Square at Athens', last: 'victory is ours, victory is ours! Ho! Victory! Io! evoë!' },
  plutus: { first: 'CHREMYLUS\nI call the gods to witness', last: "the Chorus similarly makes its exit singing.]" },
};

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
interface Passage {
  n: string;
  text: string;
  ref: string | null;
}
interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: Passage[];
}
interface GenericWork {
  workId: string;
  language: string;
  divisions: Division[];
}
interface WorkAbout {
  workId: string;
  title: string;
  sections?: { heading: string; paragraphs: string[] }[];
}

interface WorkReport {
  slug: string;
  id: string;
  findings: Finding[];
  speechCount: number;
  totalChars: number;
  footnoteRefs: number;
  anomalies: Anomaly[];
}

function validatePlay(slug: string): WorkReport {
  const id = workId(slug);
  const dir = join(DATA_ROOT, id);
  const findings: Finding[] = [];
  const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
  const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

  const report: WorkReport = { slug, id, findings, speechCount: 0, totalChars: 0, footnoteRefs: 0, anomalies: [] };

  const need = ['work.json', 'about.json', 'anomalies.json', 'types.ts'];
  for (const f of need) if (!existsSync(join(dir, f))) err('presence', `missing ${f} - run the importer`);
  if (findings.some((f) => f.level === 'ERROR')) return report;

  const work = JSON.parse(readFileSync(join(dir, 'work.json'), 'utf8')) as GenericWork;
  const about = JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')) as WorkAbout;
  const anomalies = JSON.parse(readFileSync(join(dir, 'anomalies.json'), 'utf8')) as Anomaly[];
  report.anomalies = anomalies;

  if (work.workId !== id) err('workId', `work.json workId is ${JSON.stringify(work.workId)}, expected ${id}`);
  if (work.language !== 'en') err('language', `work.json language is ${JSON.stringify(work.language)}, expected "en"`);

  if (!about.sections || about.sections.length === 0) {
    err('about-sections', 'about.json has no "sections" prose');
  } else {
    const headings = about.sections.map((s) => s.heading);
    for (const required of REQUIRED_ABOUT_SECTIONS) if (!headings.includes(required)) err('about-sections', `about.json is missing the "${required}" section`);
  }

  const divisions = work.divisions ?? [];
  if (divisions.length === 0) err('no-divisions', 'work.json has zero divisions');
  for (const d of divisions) {
    if (d.children.length !== 0) err('division-children', `${d.id}: expected no children (flat corpus), got ${d.children.length}`);
    if (d.number !== null) err('division-number', `${d.id}: number must be null in this corpus`);
    if (d.ref !== null) err('division-ref', `${d.id}: ref must be null in this corpus`);
  }
  const dp = divisions.filter((d) => d.id === 'dramatis-personae');
  if (dp.length > 1) err('dramatis-personae', `expected at most one dramatis-personae division, found ${dp.length}`);
  if (dp.length === 1) {
    if (divisions[0]!.id !== 'dramatis-personae') err('dramatis-personae', 'dramatis-personae division must be first');
    if (dp[0]!.sourceHeading !== 'Dramatis Personae') err('dramatis-personae-heading', `sourceHeading must be "Dramatis Personae", got ${JSON.stringify(dp[0]!.sourceHeading)}`);
  } else {
    warn('dramatis-personae', 'this play has no dramatis-personae division (source prints no cast list)');
  }

  const textDiv = divisions.find((d) => d.id === 'text');
  if (!textDiv) {
    err('text-division', 'no "text" division found');
  } else {
    if (textDiv.editorialTitle !== null) err('text-division-title', `editorialTitle must be null for the text division, got ${JSON.stringify(textDiv.editorialTitle)}`);
    if (typeof textDiv.sourceHeading !== 'string' || textDiv.sourceHeading.length === 0) err('text-division-heading', 'sourceHeading must be the play title as printed (non-empty string) for the text division');
    report.speechCount = textDiv.passages.length;
    if (textDiv.passages.length < MIN_SPEECHES) err('speech-floor', `only ${textDiv.passages.length} speeches, expected at least ${MIN_SPEECHES}`);

    let combiningHits = 0;
    let nfcMismatch = 0;
    const leaks: string[] = [];
    for (const [i, p] of textDiv.passages.entries()) {
      report.totalChars += p.text.length;
      report.footnoteRefs += (p.text.match(/\[Note \d+:/g) ?? []).length;
      if (typeof p.text !== 'string' || p.text.trim().length === 0) err('empty-passage', `text[${i}]: empty passage`);
      if (p.n !== '') err('passage-n', `text[${i}]: n must be '', got ${JSON.stringify(p.n)}`);
      if (p.ref !== null) err('passage-ref', `text[${i}]: ref must be null`);
      for (const marker of LEAK_MARKERS) if (p.text.includes(marker)) leaks.push(`text[${i}]: contains ${JSON.stringify(marker)}`);
      if (hasCombining(p.text)) combiningHits += 1;
      if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
    }
    if (leaks.length) err('no-leaked-markup', `${leaks.length} passage(s) contain transport markup:\n    ${leaks.slice(0, 10).join('\n    ')}`);
    if (nfcMismatch > 0) err('nfc-normalised', `${nfcMismatch} passage(s) are not NFC-normalised`);
    if (combiningHits > 0) warn('no-combining-marks', `${combiningHits} passage(s) contain a standalone combining diacritic after NFC normalisation`);

    const exp = EXPECTED[slug];
    if (!exp) {
      err('expected-openings', `no EXPECTED entry recorded for slug ${slug}`);
    } else {
      const first = textDiv.passages[0]?.text ?? '';
      const last = textDiv.passages[textDiv.passages.length - 1]?.text ?? '';
      if (!first.startsWith(exp.first)) err('first-speech', `first passage does not start with the recorded opening.\n    expected: ${JSON.stringify(exp.first)}\n    got     : ${JSON.stringify(first.slice(0, exp.first.length + 10))}`);
      if (!last.endsWith(exp.last)) err('last-speech', `last passage does not end with the recorded closing.\n    expected: ${JSON.stringify(exp.last)}\n    got     : ${JSON.stringify(last.slice(-(exp.last.length + 10)))}`);
    }

    // speaker-line sanity: every speech (2+ line) passage has a non-empty first line
    let missingSpeakerLine = 0;
    for (const p of textDiv.passages) {
      const nl = p.text.indexOf('\n');
      if (nl === -1) continue; // stand-alone stage direction / orphan text
      if (p.text.slice(0, nl).trim().length === 0) missingSpeakerLine += 1;
    }
    if (missingSpeakerLine > 0) err('speaker-line', `${missingSpeakerLine} speech passage(s) have an empty first (speaker-name) line`);
  }

  return report;
}

function writeReport(r: WorkReport): void {
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  const warns = r.findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push(`# Aristophanes (English) validation report - ${r.id}`);
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** - ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push(`- speeches: ${r.speechCount}`);
  L.push(`- total passage chars: ${r.totalChars}`);
  L.push(`- footnote references: ${r.footnoteRefs}`);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  L.push(`_${r.anomalies.length} logged - see anomalies.json for the full list._`);
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
  writeFileSync(join(DATA_ROOT, r.id, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

function main(): void {
  process.stdout.write('\n=== validate:aristophanes-en ===\n');
  if (PLAYS.length !== 11) {
    process.stdout.write(`FAIL: expected exactly 11 plays in PLAYS, found ${PLAYS.length}\n`);
    process.exit(1);
  }
  const reports = PLAYS.map((p) => validatePlay(p.slug));
  let totalErrors = 0;
  let totalWarns = 0;
  for (const r of reports) {
    writeReport(r);
    const errors = r.findings.filter((f) => f.level === 'ERROR');
    const warns = r.findings.filter((f) => f.level === 'WARN');
    totalErrors += errors.length;
    totalWarns += warns.length;
    process.stdout.write(`  ${r.id.padEnd(34)} ${errors.length === 0 ? 'PASS' : 'FAIL'}  ${r.speechCount} speeches  ${r.totalChars} chars  ${errors.length} err  ${warns.length} warn\n`);
    for (const f of [...errors, ...warns]) process.stdout.write(`      [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  }
  process.stdout.write(`\n${totalErrors} error(s), ${totalWarns} warning(s) across ${reports.length} plays.\n`);
  process.stdout.write('Reports written to data/aristophanes-<slug>-en/VALIDATION_REPORT.md\n');
  if (totalErrors > 0) process.exit(1);
}

main();
