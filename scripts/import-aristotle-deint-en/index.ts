/**
 * Aristotle, *De Interpretatione* ("On Interpretation") — English translation
 * by Ella Mary Edghill (The Works of Aristotle, Vol. I, ed. W. D. Ross,
 * Oxford: Clarendon Press, 1928), via English Wikisource. Run-once ingestion
 * pipeline.
 *
 *   npm run import:aristotle-deint-en
 *
 * Reads scripts/import-aristotle-deint-en/raw/on-interpretation-wikisource.json
 * (already in the repo; the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API for the English Wikisource page "The Works of
 * Aristotle/On Interpretation" — this page is a page-scan transclusion, so
 * action=parse&prop=wikitext returns only <pages/> markup, not the text
 * itself; see scripts/import-aristotle-shared/englishWikisource.ts's doc
 * comment for the verified page shape). Writes:
 *   data/de-interpretatione-en/work.json       - the GenericWork (14 chapter divisions, one level deep)
 *   data/de-interpretatione-en/about.json      - provenance / licence metadata + About prose
 *   data/de-interpretatione-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle-deint-en`.
 *
 * Faithfulness rules (mirrors every other importer in this repo, esp.
 * scripts/import-aristotle-deint-grc and -la for this same work, and its own
 * English sibling scripts/import-aristotle-categoriae-en):
 *   - verbatim English reading text only; no wording "fixes", no
 *     modernisation, nothing discarded or silently corrected.
 *   - only wiki/HTML transport scaffolding is removed (see
 *     import-aristotle-categoriae-en's doc comment — identical pipeline).
 *   - inline footnote markers (Ross's editorial annotation) are stripped and
 *     counted; the footnotes themselves are never read by this importer.
 *   - this source DOES carry Bekker page/column/line markers, so
 *     Division.ref is populated as "Bekker <start>–<end>"; Passage.ref stays
 *     null. See data/de-interpretatione-en/types.ts.
 *   - UNLIKE its sibling Categories, this work prints two genuine "square of
 *     opposition" tables (chapters 12-13, real argument content) — each
 *     flattened into one plain-text Passage (Passage.text has no table
 *     field) and flagged — and three scanned-page diagrams (chapter 10, no
 *     transcribed text available) — each recorded as an honest
 *     `Passage.figure` marker (source + note, no image) on the passage
 *     immediately before it, never fabricated as an image.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DE_INTERPRETATIONE_CHAPTERS } from '../import-aristotle-shared/chapters.ts';
import { parseEnglishWikisourceWork } from '../import-aristotle-shared/englishWikisource.ts';
import {
  DEINT_EN_ABOUT_SECTIONS,
  DEINT_EN_LICENSE,
  DEINT_EN_PROVENANCE,
  EN_EDITOR,
  EN_EDITION,
  EN_TRANSLATOR,
} from '../import-aristotle-shared/englishAboutText.ts';
import type { Division, GenericWork, Passage } from '../../data/de-interpretatione-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_JSON = join(HERE, 'raw', 'on-interpretation-wikisource.json');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-interpretatione-en');

const WORK_ID = 'de-interpretatione-en';
const EXPECTED_CHAPTERS = 14;
const EXPECTED_REFS_STRIPPED = 67;
const EXPECTED_MARKER_IRREGULARITIES = 2;
/** one `<p><br></p>` spacer immediately after the chapter-12 table (idx 107 in the reading-text block) - pure formatting, no reading text lost. */
const EXPECTED_EMPTY_NODES = 1;
const EXPECTED_TABLES = 2;
const EXPECTED_FIGURES = 3;
const INCIPIT = "First we must define the terms 'noun' and 'verb', then the terms 'denial' and 'affirmation', then 'proposition' and 'sentence'.";
const EXPLICIT = 'For whereas, when two propositions are true, a man may state both at the same time without inconsistency, contrary propositions are those which state contrary conditions, and contrary conditions cannot subsist at one and the same time in the same subject.';
const CHAPTERS = DE_INTERPRETATIONE_CHAPTERS;

interface Anomaly {
  where: string;
  note: string;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const raw = JSON.parse(readFileSync(RAW_JSON, 'utf8')) as { parse?: { text?: { '*'?: string } } };
  const html = raw.parse?.text?.['*'];
  if (!html) fail('could not find .parse.text["*"] HTML string in the raw JSON.');

  process.stdout.write(`parsing ${RAW_JSON} ...\n  html ${html.length} chars\n`);

  let parsed;
  try {
    parsed = parseEnglishWikisourceWork(html, EXPECTED_CHAPTERS);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  // --- hard structural gates -------------------------------------------
  if (parsed.chapters.length !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} chapters, found ${parsed.chapters.length}`);
  }
  parsed.chapters.forEach((c, i) => {
    if (c.number !== i + 1) fail(`chapter at position ${i} carries number ${c.number} (out of sequence)`);
    if (c.passages.length === 0) fail(`chapter ${c.number} has no passages`);
    c.passages.forEach((p, j) => {
      if (p.text.length === 0) fail(`chapter ${c.number} passage ${j} is empty after cleaning`);
    });
  });
  if (parsed.workHeading !== 'DE INTERPRETATIONE') {
    fail(`expected the reading-text block's heading to be "DE INTERPRETATIONE", got ${JSON.stringify(parsed.workHeading)}`);
  }

  const incipitGot = parsed.chapters[0]!.passages[0]!.text;
  if (!incipitGot.startsWith(INCIPIT)) {
    fail(`chapter 1 incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got:             ${JSON.stringify(incipitGot.slice(0, 140))}`);
  }
  const lastCh = parsed.chapters[parsed.chapters.length - 1]!;
  const explicitGot = lastCh.passages[lastCh.passages.length - 1]!.text;
  if (!explicitGot.endsWith(EXPLICIT)) {
    fail(`chapter 14 explicit spot-check failed — possible truncation.\n  expected suffix: ${JSON.stringify(EXPLICIT)}\n  got tail:        ${JSON.stringify(explicitGot.slice(-160))}`);
  }
  if (parsed.totalRefsStripped !== EXPECTED_REFS_STRIPPED) {
    fail(`expected exactly ${EXPECTED_REFS_STRIPPED} inline footnote markers stripped, counted ${parsed.totalRefsStripped}`);
  }
  if (parsed.emptyNodesSkipped !== EXPECTED_EMPTY_NODES) {
    fail(`expected ${EXPECTED_EMPTY_NODES} empty node(s) skipped (a "<p><br></p>" spacer after the chapter-12 table), found ${parsed.emptyNodesSkipped} — investigate before proceeding`);
  }
  if (parsed.markerIrregularities.length !== EXPECTED_MARKER_IRREGULARITIES) {
    fail(
      `expected exactly ${EXPECTED_MARKER_IRREGULARITIES} Bekker-marker irregularities (the known ch.3 and ch.12 backward jumps), found ${parsed.markerIrregularities.length}:\n  ${parsed.markerIrregularities.join('\n  ')}`,
    );
  }
  const tableCount = parsed.chapters.reduce((n, c) => n + c.passages.filter((p) => p.isTable).length, 0);
  if (tableCount !== EXPECTED_TABLES) fail(`expected exactly ${EXPECTED_TABLES} table passages (chapters 12 and 13), found ${tableCount}`);
  const figureFiles = parsed.chapters.flatMap((c) => c.passages.flatMap((p) => p.figureFiles));
  if (figureFiles.length !== EXPECTED_FIGURES) fail(`expected exactly ${EXPECTED_FIGURES} <figure> diagrams (chapter 10), found ${figureFiles.length}`);

  // --- build divisions ---------------------------------------------------
  const anomalies: Anomaly[] = [];
  const divisions: Division[] = parsed.chapters.map((c, i) => {
    const meta = CHAPTERS[i]!;
    const passages: Passage[] = c.passages.map((p, j) => {
      const passage: Passage = { n: '', text: p.text, ref: null };
      const notes: string[] = [];
      if (p.isTable) {
        notes.push('this passage is a flattened rendering of a source <table> (a "square of opposition" of contradictory/contrary modal propositions); cells joined " — ", rows joined " / ", nothing reordered or reworded — see about.json');
        anomalies.push({
          where: `${WORK_ID} / ${meta.id} / passage ${j}`,
          note: 'source prints this passage as an HTML <table>, not running prose; flattened to plain text (cells joined " — ", rows joined " / ", left-to-right/top-to-bottom, nothing reordered or reworded) because Passage.text has no table field. Genuine argument content (the prose introduces it as "a table"), not apparatus.',
        });
      }
      if (p.figureFiles.length > 0) {
        const [first, ...rest] = p.figureFiles;
        passage.figure = {
          source: `English Wikisource, File:${first} (scanned page, De Interpretatione ch. ${meta.number})`,
          note:
            'A diagram appears here in the printed edition (one of the "indefinite name" affirmation/denial schemes discussed in this chapter); not reproduced as an image in this build. No transcribed text exists for it in the source, and no image is bundled here to keep the app fully offline without a separate asset-review pass — nothing is fabricated in its place.',
        };
        notes.push(`a printed diagram (${first}) follows this passage in the source; not reproduced as an image — see Passage.figure`);
        anomalies.push({
          where: `${WORK_ID} / ${meta.id} / passage ${j}`,
          note: `a scanned-page diagram (${first}) follows this passage in the printed edition; no transcribed text exists for it in the source and no image is bundled here (this build stays fully offline without a separate asset-review pass) — recorded as an honest Passage.figure marker (source + note, no image), nothing fabricated.`,
        });
        if (rest.length > 0) {
          anomalies.push({
            where: `${WORK_ID} / ${meta.id} / passage ${j}`,
            note: `${rest.length} additional diagram(s) also immediately follow this passage (${rest.join(', ')}) but the Passage schema allows only one \`figure\` per passage; only the first is recorded there. Same treatment as the first: not reproduced as an image, nothing fabricated.`,
          });
        }
      }
      if (notes.length) passage.anomaly = notes.join('; ');
      return passage;
    });
    return {
      id: meta.id,
      number: meta.number,
      ref: `Bekker ${c.startRef}–${c.endRef}`,
      sourceHeading: null,
      editorialTitle: meta.en,
      children: [],
      passages,
    };
  });

  // --- work-level anomalies -----------------------------------------
  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      'Unlike de-interpretatione-grc and de-interpretatione-la, this source prints Bekker page/column anchors and a line-number marker every 5th line, inline throughout. Division.ref is reconstructed from them as "Bekker <start>–<end>", where <end> is the position in effect at the moment the next chapter begins (continuous numbering; not gapped) and is precise only to the nearest printed marker. Passage.ref is left null throughout — no marker is printed at every paragraph break, so no per-passage Bekker reference is fabricated. In the standard pagination the work occupies Bekker 16a1–24b9; the markers actually printed in this source run 16a1–24b5 (a few lines short of the canonical end — line numbers are only printed every 5th line and the work’s last few lines fall after the final printed marker).',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes stripped`,
    note: `${parsed.totalRefsStripped} inline footnote markers (Ross's editorial annotation) were removed from the reading text; the footnotes themselves are translator/editorial apparatus, not Aristotle's text, and are not preserved anywhere in this build.`,
  });
  anomalies.push({
    where: `${WORK_ID} / table of contents and preface excluded`,
    note:
      'The page also carries an editorial "TABLE OF CONTENTS" transclusion (one-line chapter summaries with anchor links, in a separate reading-text block from the one used here) and a translator’s prefatory note. Neither is Aristotle’s text; neither is read by this importer.',
  });
  for (const irregularity of parsed.markerIrregularities) {
    anomalies.push({
      where: `${WORK_ID} / bekker markers`,
      note: `Source transcription irregularity, preserved as printed (not corrected): ${irregularity}.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / empty spacer paragraph`,
    note: `${parsed.emptyNodesSkipped} formatting-only "<p><br></p>" spacer (immediately after the chapter-12 table) was skipped; it carries no reading text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${EXPECTED_CHAPTERS} chapters are present and in order, from the verbatim incipit to the verbatim explicit. The imported reading text is the English Wikisource transcription of "The Works of Aristotle/On Interpretation" with transport scaffolding removed; no paragraph is dropped, merged or reordered.`,
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };
  const about = {
    workId: WORK_ID,
    title: 'De Interpretatione',
    author: 'Aristotle',
    language: 'en' as const,
    translator: EN_TRANSLATOR,
    editor: EN_EDITOR,
    edition: EN_EDITION,
    provenance: DEINT_EN_PROVENANCE,
    license: DEINT_EN_LICENSE,
    sections: DEINT_EN_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------
  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(`  ${(d.number ?? '-').padEnd(4)} ${d.id.padEnd(6)} ${String(d.passages.length).padStart(2)} passage(s)  ref=${d.ref}\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions  ${totalPassages} passages  ${totalChars} chars  ` +
      `(${parsed.totalRefsStripped} footnote refs stripped, ${tableCount} tables, ${figureFiles.length} figures, ${anomalies.length} anomalies)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle-deint-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
