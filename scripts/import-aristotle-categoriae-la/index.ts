/**
 * Aristotle, *Categoriae* — Latin translation by Boethius (early 6th c.), via
 * Latin Wikisource. Run-once ingestion pipeline.
 *
 *   npm run import:aristotle-categoriae-la
 *
 * Reads scripts/import-aristotle-categoriae-la/raw/categoriae-wikisource.json
 * (already in the repo; the result of the MediaWiki `action=parse&prop=wikitext`
 * API for the Latin Wikisource page "Categoriae", pageid 1453). Writes:
 *   data/categoriae-la/work.json       - the GenericWork (15 chapter divisions, one level deep)
 *   data/categoriae-la/about.json      - provenance / licence metadata + About prose
 *   data/categoriae-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle`.
 *
 * Faithfulness rules (mirrors scripts/import-summa, scripts/import-isagoge-la):
 *   - verbatim Latin reading text only; NO u/v or i/j regularisation, no accent
 *     / spelling / orthography / punctuation normalisation; nothing discarded or
 *     silently corrected.
 *   - only wiki-transport scaffolding is removed ({{TextQuality}}, {{titulus2}},
 *     {{finis}}, the <div class=text> wrapper, the trailing interwiki links).
 *   - the sole permitted repair is the U+FFFD replacement character at two
 *     mid-word line-wrap points in chapter 10 (an encoding artefact) — removed,
 *     word halves joined, both occurrences recorded in anomalies.json.
 *   - editorial marks printed in the edition are KEPT verbatim and flagged: the
 *     "<...>" lacuna mark (3× in chapter 10).
 *   - this source carries no Bekker page/column/line numbers, so every
 *     Division.ref / Passage.ref is null and every Passage.n is "". Chapters that
 *     print a Latin rubric keep it verbatim as Division.sourceHeading.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES_CHAPTERS } from '../import-aristotle-shared/chapters.ts';
import {
  CAT_LA_ABOUT_SECTIONS,
  CAT_LA_LICENSE,
  CAT_LA_PROVENANCE,
} from '../import-aristotle-shared/aboutText.ts';
import {
  ANGLE_SUPPLEMENT_RE,
  LACUNA_RE,
  parseLatinWikisource,
} from '../import-aristotle-shared/latinWikisource.ts';
import type { Division, GenericWork, Passage } from '../../data/categoriae-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_JSON = join(HERE, 'raw', 'categoriae-wikisource.json');
const OUT_DIR = join(REPO_ROOT, 'data', 'categoriae-la');

const WORK_ID = 'categoriae-la';
const EXPECTED_CHAPTERS = 15;
const BEKKER_SPAN = '1a1–15b33';
/** Verbatim incipit of chapter 1, passage 1 (prefix check). */
const INCIPIT = 'Aequiuoca dicuntur quorum nomen solum commune est';
/** Verbatim explicit of chapter 15, last passage (suffix check) — truncation guard. */
const EXPLICIT = 'qui autem solent dici paene omnes sunt annumerati.';
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

  const raw = JSON.parse(readFileSync(RAW_JSON, 'utf8')) as {
    parse?: { title?: string; pageid?: number; wikitext?: string | { '*'?: string } };
  };
  const wt = raw.parse?.wikitext;
  const wikitext = typeof wt === 'string' ? wt : wt?.['*'];
  if (!wikitext) fail('could not find .parse.wikitext string in the raw JSON.');

  process.stdout.write(`parsing ${RAW_JSON} ...\n  wikitext ${wikitext.length} chars\n`);

  const parsed = parseLatinWikisource(wikitext);

  // --- hard structural gates -------------------------------------------
  if (parsed.prefaceRegion.trim().length !== 0) {
    fail(`text before chapter [01] is not whitespace-only: ${JSON.stringify(parsed.prefaceRegion.slice(0, 120))}`);
  }
  if (parsed.chapters.length !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} chapters, found ${parsed.chapters.length}`);
  }
  parsed.chapters.forEach((c, i) => {
    if (c.number !== String(i + 1)) fail(`chapter ${i + 1} carries token "${c.numberToken}" -> number "${c.number}" (out of sequence)`);
    if (c.passages.length === 0) fail(`chapter ${c.number} has no passages`);
    c.passages.forEach((t, j) => {
      if (t.length === 0) fail(`chapter ${c.number} passage ${j} is empty after cleaning`);
    });
  });

  const incipitGot = parsed.chapters[0]!.passages[0] ?? '';
  if (!incipitGot.startsWith(INCIPIT)) {
    fail(`chapter 1 incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got:             ${JSON.stringify(incipitGot.slice(0, 90))}`);
  }
  const lastCh = parsed.chapters[parsed.chapters.length - 1]!;
  const explicitGot = lastCh.passages[lastCh.passages.length - 1] ?? '';
  if (!explicitGot.endsWith(EXPLICIT)) {
    fail(`chapter 15 explicit spot-check failed — possible truncation.\n  expected suffix: ${JSON.stringify(EXPLICIT)}\n  got tail:        ${JSON.stringify(explicitGot.slice(-90))}`);
  }
  if (parsed.replacementCharCount !== 2) {
    fail(`expected exactly 2 U+FFFD line-wrap artefacts to repair, found ${parsed.replacementCharCount} (${parsed.replacementContexts.join(' ; ')})`);
  }

  // --- build divisions + per-passage anomalies ------------------------
  const anomalies: Anomaly[] = [];
  const divisions: Division[] = parsed.chapters.map((c, i) => {
    const meta = CHAPTERS[i]!;
    const passages: Passage[] = c.passages.map((text, j) => {
      const passage: Passage = { n: '', text, ref: null };
      const lac = text.match(LACUNA_RE);
      const sup = text.match(ANGLE_SUPPLEMENT_RE);
      const notes: string[] = [];
      if (lac) {
        notes.push(`editorial lacuna mark ${lac.join(', ')} printed in the edition, kept verbatim; the omitted words are not supplied`);
        anomalies.push({
          where: `${WORK_ID} / ${meta.id} / passage ${j}`,
          note: `the edition prints the editorial lacuna mark "<...>" here (${lac.length}×); it marks text that is defective/omitted in this witness. Kept verbatim; nothing is supplied (no fabrication).`,
        });
      }
      if (sup) {
        notes.push(`editorial angle-bracket supplement ${sup.join(', ')} printed in the edition, kept verbatim (not markup)`);
        anomalies.push({
          where: `${WORK_ID} / ${meta.id} / passage ${j}`,
          note: `contains editorial angle-bracket supplement ${sup.join(', ')} from the edition; kept verbatim (not markup).`,
        });
      }
      if (notes.length) passage.anomaly = notes.join('; ');
      return passage;
    });
    return {
      id: meta.id,
      number: meta.number,
      ref: null,
      sourceHeading: c.rubric,
      editorialTitle: meta.en,
      children: [],
      passages,
    };
  });

  // --- work-level anomalies -----------------------------------------
  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      'This source carries no Bekker page/column/line numbers and no line numbering. ' +
      'Division.ref and Passage.ref are null throughout and Passage.n is "" throughout; ' +
      `citation is by chapter (plus the editorial English chapter title). In the standard ` +
      `pagination the Categoriae occupies Bekker ${BEKKER_SPAN}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / orthography`,
    note:
      'Classical Latin orthography as transmitted: consonantal u is written u, not v ' +
      '(Aequiuoca, uero, diuersa, uniuoca, denominatiua). Single quotation marks around cited ' +
      "terms ('homo', 'album') are the edition's punctuation. Kept verbatim — no u/v or i/j " +
      'regularisation and no spelling normalisation.',
  });
  anomalies.push({
    where: `${WORK_ID} / chapter-9 heading token`,
    note:
      'The chapter-9 heading is printed "[9]" where every other chapter token is zero-padded ' +
      '("[01]"…"[08]", "[10]"…"[15]"). Normalised to number "9"; no reading text affected.',
  });
  anomalies.push({
    where: `${WORK_ID} / wiki transport`,
    note:
      `Removed as wiki-transport scaffolding (no reading text touched): ${parsed.strippedTemplates.join(', ')}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / ch-10 replacement character`,
    note:
      `The source transcription carried the Unicode REPLACEMENT CHARACTER (U+FFFD) at ` +
      `${parsed.replacementCharCount} mid-word line-wrap points in chapter 10 ` +
      `(${parsed.replacementContexts.join(', ')}). This is a transcription encoding artefact, not a ` +
      `textual variant; the stray character was removed and the word halves joined to restore ` +
      `"inuicem" and "opponuntur". No other change.`,
  });
  anomalies.push({
    where: `${WORK_ID} / ch-10 lacunae`,
    note:
      'Chapter 10 (DE OPPOSITIS) prints the editorial lacuna mark "<...>" at three points ' +
      '(after "idem enim modus est oppositionis;", after "priuatio uisus caecitas dicitur", and ' +
      'before "habens uisum dicitur"). These mark places where the Latin is defective/omitted in ' +
      'this witness. The mark is preserved verbatim; the missing words are NOT supplied. Compare ' +
      'the Greek Categoriae, chapter 10, for the sense.',
  });
  const withRubric = parsed.chapters.filter((c) => c.rubric).map((c) => c.number);
  const noRubric = parsed.chapters.filter((c) => !c.rubric).map((c) => c.number);
  anomalies.push({
    where: `${WORK_ID} / chapter rubrics`,
    note:
      `Chapters ${withRubric.join(', ')} print a verbatim Latin rubric (DE SUBSTANTIA, DE QUANTITATE, ` +
      'DE RELATIVIS VEL AD ALIQUID, DE QUALI ET QUALITATE, DE FACERE ET PATI, DE OPPOSITIS, DE PRIORE, ' +
      'DE HIS QUAE SIMUL SUNT, DE MOTU, DE HABERE), stored verbatim as Division.sourceHeading. ' +
      `Chapters ${noRubric.join(', ')} print no rubric (sourceHeading null). These capitula are editorial ` +
      "in the tradition, not part of Boethius' running translation.",
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };
  const about = {
    workId: WORK_ID,
    title: 'Categories',
    author: 'Aristotle',
    language: 'la',
    translator: 'Boethius',
    provenance: CAT_LA_PROVENANCE,
    license: CAT_LA_LICENSE,
    sections: CAT_LA_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------
  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce(
    (n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0),
    0,
  );
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(
      `  ${(d.number ?? '-').padEnd(4)} ${d.id.padEnd(6)} ` +
        `${String(d.passages.length).padStart(2)} passage(s)  heading=${JSON.stringify(d.sourceHeading)}\n`,
    );
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions  ${totalPassages} passages  ${totalChars} chars  ` +
      `(${parsed.replacementCharCount} U+FFFD repaired, ${anomalies.length} anomalies)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
