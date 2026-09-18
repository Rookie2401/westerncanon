/**
 * Aristotle, *Categories* — English translation by Ella Mary Edghill (The
 * Works of Aristotle, Vol. I, ed. W. D. Ross, Oxford: Clarendon Press, 1928),
 * via English Wikisource. Run-once ingestion pipeline.
 *
 *   npm run import:aristotle-categoriae-en
 *
 * Reads scripts/import-aristotle-categoriae-en/raw/categories-wikisource.json
 * (already in the repo; the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API for the English Wikisource page "The Works of
 * Aristotle/Categories" — this page is a page-scan transclusion, so
 * action=parse&prop=wikitext returns only <pages/> markup, not the text
 * itself; see scripts/import-aristotle-shared/englishWikisource.ts's doc
 * comment for the verified page shape). Writes:
 *   data/categoriae-en/work.json       - the GenericWork (15 chapter divisions, one level deep)
 *   data/categoriae-en/about.json      - provenance / licence metadata + About prose
 *   data/categoriae-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle-categoriae-en`.
 *
 * Faithfulness rules (mirrors every other importer in this repo, esp.
 * scripts/import-aristotle-categoriae-grc and -la for this same work):
 *   - verbatim English reading text only; no wording "fixes", no
 *     modernisation, nothing discarded or silently corrected.
 *   - only wiki/HTML transport scaffolding is removed: the editorial table
 *     of contents (a separate transclusion elsewhere on the page), the
 *     translator's preface, per-template <style>/<link> CSS resets, page-
 *     transition spacers, a zero-width-space artefact, and the margin-
 *     floated chapter-number / Bekker page-column-line marker <span>s (their
 *     ids are read for the citation apparatus, then the spans themselves are
 *     removed so they never appear mid-sentence in the reading prose).
 *   - inline footnote markers (Ross's editorial annotation) are stripped and
 *     counted; the footnotes themselves live in a separate part of the page
 *     and are never read by this importer at all — editorial apparatus, not
 *     Aristotle's text, mirroring this library's other English translations.
 *   - this source DOES carry Bekker page/column/line markers (unlike the
 *     Greek/Latin digital sources for this same work), so Division.ref is
 *     populated as "Bekker <start>–<end>"; Passage.ref stays null (no marker
 *     is printed at every paragraph break). See data/categoriae-en/types.ts.
 *   - this work has no tables or <figure> diagrams (unlike its sibling
 *     De Interpretatione); every passage is ordinary prose.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES_CHAPTERS } from '../import-aristotle-shared/chapters.ts';
import { parseEnglishWikisourceWork } from '../import-aristotle-shared/englishWikisource.ts';
import {
  CAT_EN_ABOUT_SECTIONS,
  CAT_EN_LICENSE,
  CAT_EN_PROVENANCE,
  EN_EDITOR,
  EN_EDITION,
  EN_TRANSLATOR,
} from '../import-aristotle-shared/englishAboutText.ts';
import type { Division, GenericWork, Passage } from '../../data/categoriae-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_JSON = join(HERE, 'raw', 'categories-wikisource.json');
const OUT_DIR = join(REPO_ROOT, 'data', 'categoriae-en');

const WORK_ID = 'categoriae-en';
const EXPECTED_CHAPTERS = 15;
const EXPECTED_REFS_STRIPPED = 35;
const EXPECTED_MARKER_IRREGULARITIES = 1;
const INCIPIT = "Things are said to be named 'equivocally' when, though they have a common name, the definition corresponding with the name differs for each.";
const EXPLICIT = 'Other senses of the word might perhaps be found, but the most ordinary ones have all been enumerated.';
const CHAPTERS = CATEGORIES_CHAPTERS;

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
  if (parsed.workHeading !== 'CATEGORIAE') {
    fail(`expected the reading-text block's heading to be "CATEGORIAE", got ${JSON.stringify(parsed.workHeading)}`);
  }

  const incipitGot = parsed.chapters[0]!.passages[0]!.text;
  if (!incipitGot.startsWith(INCIPIT)) {
    fail(`chapter 1 incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got:             ${JSON.stringify(incipitGot.slice(0, 140))}`);
  }
  const lastCh = parsed.chapters[parsed.chapters.length - 1]!;
  const explicitGot = lastCh.passages[lastCh.passages.length - 1]!.text;
  if (!explicitGot.endsWith(EXPLICIT)) {
    fail(`chapter 15 explicit spot-check failed — possible truncation.\n  expected suffix: ${JSON.stringify(EXPLICIT)}\n  got tail:        ${JSON.stringify(explicitGot.slice(-140))}`);
  }
  if (parsed.totalRefsStripped !== EXPECTED_REFS_STRIPPED) {
    fail(`expected exactly ${EXPECTED_REFS_STRIPPED} inline footnote markers stripped, counted ${parsed.totalRefsStripped}`);
  }
  if (parsed.emptyNodesSkipped !== 0) {
    fail(`expected 0 empty nodes skipped, found ${parsed.emptyNodesSkipped} — investigate before proceeding`);
  }
  if (parsed.markerIrregularities.length !== EXPECTED_MARKER_IRREGULARITIES) {
    fail(
      `expected exactly ${EXPECTED_MARKER_IRREGULARITIES} Bekker-marker irregularity (the known chapter-7 duplicated "10"), found ${parsed.markerIrregularities.length}:\n  ${parsed.markerIrregularities.join('\n  ')}`,
    );
  }
  parsed.chapters.forEach((c) => {
    if (c.passages.some((p) => p.figureFiles.length > 0)) {
      fail('expected no <figure> diagrams in Categories — found one; this work is not expected to carry any (see De Interpretatione instead)');
    }
    if (c.passages.some((p) => p.isTable)) {
      fail('expected no <table> elements in Categories — found one; this work is not expected to carry any (see De Interpretatione instead)');
    }
  });

  // --- build divisions ---------------------------------------------------
  const anomalies: Anomaly[] = [];
  const divisions: Division[] = parsed.chapters.map((c, i) => {
    const meta = CHAPTERS[i]!;
    const passages: Passage[] = c.passages.map((p) => ({ n: '', text: p.text, ref: null }));
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
      'Unlike categoriae-grc and categoriae-la, this source prints Bekker page/column anchors and a line-number marker every 5th line, inline throughout. Division.ref is reconstructed from them as "Bekker <start>–<end>", where <end> is the position in effect at the moment the next chapter begins (continuous numbering; not gapped) and is precise only to the nearest printed marker. Passage.ref is left null throughout — no marker is printed at every paragraph break, so no per-passage Bekker reference is fabricated. In the standard pagination the work occupies Bekker 1a1–15b33; the markers actually printed in this source run 1a1–15b30 (a few lines short of the canonical end — line numbers are only printed every 5th line and the work’s last few lines fall after the final printed marker).',
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
    where: `${WORK_ID} / completeness`,
    note: `All ${EXPECTED_CHAPTERS} chapters are present and in order, from the verbatim incipit to the verbatim explicit. The imported reading text is the English Wikisource transcription of "The Works of Aristotle/Categories" with transport scaffolding removed; no paragraph is dropped, merged or reordered.`,
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };
  const about = {
    workId: WORK_ID,
    title: 'Categories',
    author: 'Aristotle',
    language: 'en' as const,
    translator: EN_TRANSLATOR,
    editor: EN_EDITOR,
    edition: EN_EDITION,
    provenance: CAT_EN_PROVENANCE,
    license: CAT_EN_LICENSE,
    sections: CAT_EN_ABOUT_SECTIONS,
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
      `(${parsed.totalRefsStripped} footnote refs stripped, ${anomalies.length} anomalies)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle-categoriae-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
