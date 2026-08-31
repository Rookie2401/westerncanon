/**
 * Aristotle, *Categoriae* - Greek text (ed. Immanuel Bekker, Aristotelis Opera
 * vol. 1, Oxford 1837), via the OpenGreekAndLatin / First1KGreek TEI. Run-once
 * ingestion pipeline.
 *
 *   npm run import:aristotle-categoriae-grc
 *
 * Reads scripts/import-aristotle-categoriae-grc/raw/tlg0086.tlg006.1st1K-grc1.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/categoriae-grc/work.json       - the GenericWork (15 chapter divisions, one level deep)
 *   data/categoriae-grc/about.json      - provenance / licence metadata
 *   data/categoriae-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle`.
 *
 * Faithfulness rules (mirrors scripts/import-summa, scripts/import-isagoge-grc):
 *   - verbatim original-language reading text only; no accent / spelling /
 *     orthography / punctuation normalisation; nothing discarded or silently
 *     corrected.
 *   - only XML transport scaffolding is removed: <milestone unit="section">,
 *     <pb> page-image breaks, and the chapter-1 <head> (the work title). Any
 *     empty <p> that is skipped is counted and reported.
 *   - the source marks chapter divisions only - no Bekker page/column/line
 *     milestones - so every Division.ref / Passage.ref is null and every
 *     Passage.n is "". Division.sourceHeading is null for every chapter.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES_CHAPTERS } from '../import-aristotle-shared/chapters.ts';
import {
  CAT_GRC_ABOUT_SECTIONS,
  CAT_GRC_LICENSE,
  CAT_GRC_PROVENANCE,
} from '../import-aristotle-shared/aboutText.ts';
import { cleanText } from '../import-aristotle-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/categoriae-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0086.tlg006.1st1K-grc1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'categoriae-grc');

const WORK_ID = 'categoriae-grc';
const EXPECTED_CHAPTERS = 15;
const BEKKER_SPAN = '1a1–15b33';
/** Verbatim incipit of chapter 1, paragraph 1 (NFC-insensitive prefix check). */
const INCIPIT = 'ὉΜΩΝΥΜΑ λέγεται ὧν ὄνομα μόνον κοινόν';
const CHAPTERS = CATEGORIES_CHAPTERS;

interface Anomaly {
  where: string;
  note: string;
}

interface ParsedChapter {
  number: number;
  paragraphs: string[];
  emptyParagraphs: number;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

/** Slice the single <div type="edition"> body and split it into chapter blocks. */
function parseChapters(xml: string): { chapters: ParsedChapter[]; headText: string } {
  const edStart = xml.indexOf('<div type="edition"');
  const bodyEnd = xml.indexOf('</body>');
  if (edStart < 0 || bodyEnd < 0 || bodyEnd < edStart) fail('no <div type="edition"> ... </body> in source XML');
  const ed = xml.slice(edStart, bodyEnd);

  const parts = ed.split(/<div type="textpart" subtype="chapter" n="(\d+)">/);
  // parts = [preamble, n1, body1, n2, body2, ...]
  if (parts.length < 3 || parts.length % 2 !== 1) {
    fail(`unexpected chapter split shape (${parts.length} parts)`);
  }

  const chapters: ParsedChapter[] = [];
  let headText = '';
  for (let i = 1; i < parts.length; i += 2) {
    const number = Number(parts[i]);
    const body = parts[i + 1] ?? '';

    if (chapters.length === 0) {
      const hm = /<head>([\s\S]*?)<\/head>/.exec(body);
      if (hm) headText = cleanText(hm[1].replace(/<[^>]+>/g, ' '));
    }

    const pMatches = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)];
    const cleaned = pMatches.map((m) => cleanText(m[1].replace(/<[^>]+>/g, ' ')));
    const paragraphs = cleaned.filter((t) => t.length > 0);
    chapters.push({
      number,
      paragraphs,
      emptyParagraphs: cleaned.length - paragraphs.length,
    });
  }
  return { chapters, headText };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { chapters, headText } = parseChapters(xml);

  // --- hard structural gates --------------------------------------------
  if (chapters.length !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} chapters, found ${chapters.length}`);
  }
  chapters.forEach((c, i) => {
    if (c.number !== i + 1) fail(`chapter ${i + 1} carries n="${c.number}" (out of sequence)`);
    if (c.paragraphs.length === 0) fail(`chapter ${c.number} has no non-empty <p> passages`);
    c.paragraphs.forEach((t, j) => {
      if (t.length === 0) fail(`chapter ${c.number} passage ${j} is empty after cleaning`);
    });
  });

  const incipitGot = chapters[0].paragraphs[0] ?? '';
  if (!incipitGot.normalize('NFC').startsWith(INCIPIT.normalize('NFC'))) {
    fail(`chapter 1 incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got:             ${JSON.stringify(incipitGot.slice(0, 80))}`);
  }

  const totalEmptyP = chapters.reduce((n, c) => n + c.emptyParagraphs, 0);

  // --- build divisions -------------------------------------------------
  const divisions: Division[] = chapters.map((c, i) => {
    const meta = CHAPTERS[i]!;
    const passages: Passage[] = c.paragraphs.map((text) => ({ n: '', text, ref: null }));
    return {
      id: meta.id,
      number: meta.number,
      ref: null,
      sourceHeading: null,
      editorialTitle: meta.en,
      children: [],
      passages,
    };
  });

  // --- anomalies -----------------------------------------------------
  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      'source TEI marks chapter divisions only; no Bekker page/column/line milestones and no <lb>, ' +
      'and the <pb> markers are 1837 Oxford Opera page images, not Bekker pages, and were dropped. ' +
      `Division.ref and Passage.ref are null and Passage.n is "" throughout; cite by chapter. ` +
      `The work spans Bekker ${BEKKER_SPAN} in the standard pagination.`,
  });
  anomalies.push({
    where: `${WORK_ID} / ch-1 head`,
    note:
      `the <head> in chapter 1 (${JSON.stringify(headText)}) is the work title, not a chapter ` +
      'heading; it is not stored as sourceHeading (every Greek chapter sourceHeading is null).',
  });
  anomalies.push({
    where: `${WORK_ID} / ch-1 incipit`,
    note:
      `chapter 1 opens with the all-caps word ${JSON.stringify(incipitGot.split(' ')[0])} in the ` +
      'source transcription; preserved verbatim.',
  });
  anomalies.push({
    where: `${WORK_ID} / empty <p>`,
    note: `${totalEmptyP} <p> element(s) were empty after stripping transport markup and were skipped (no reading text dropped).`,
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };
  const about = {
    workId: WORK_ID,
    title: 'Categories',
    author: 'Aristotle',
    language: 'grc',
    edition: 'Bekker 1837',
    editor: 'Immanuel Bekker',
    provenance: CAT_GRC_PROVENANCE,
    license: CAT_GRC_LICENSE,
    sections: CAT_GRC_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary --------------------------------------------------
  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce(
    (n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0),
    0,
  );
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(
      `  ${(d.number ?? '-').padEnd(4)} ${d.id.padEnd(6)} ` +
        `${String(d.passages.length).padStart(2)} passage(s)  "${d.editorialTitle}"\n`,
    );
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions  ${totalPassages} passages  ${totalChars} chars  ` +
      `(${totalEmptyP} empty <p> skipped)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
