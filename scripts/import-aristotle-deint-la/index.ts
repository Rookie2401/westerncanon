/**
 * Aristotle, *De Interpretatione* ("Perihermenias") — Latin translation by
 * Boethius (early 6th c.), via Latin Wikisource. Run-once ingestion pipeline.
 *
 *   npm run import:aristotle-deint-la
 *
 * Reads scripts/import-aristotle-deint-la/raw/deinterpretatione-wikisource.json
 * (already in the repo; the result of the MediaWiki `action=parse&prop=wikitext`
 * API for the Latin Wikisource page "De interpretatione", pageid 1454). Writes:
 *   data/de-interpretatione-la/work.json       - the GenericWork (14 chapter divisions)
 *   data/de-interpretatione-la/about.json      - provenance / licence metadata + About prose
 *   data/de-interpretatione-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle`.
 *
 * Faithfulness rules (mirrors scripts/import-summa, scripts/import-isagoge-la):
 *   - verbatim Latin reading text only; NO u/v or i/j regularisation, no accent
 *     / spelling / orthography / punctuation normalisation; nothing discarded or
 *     silently corrected. Apparent transcription slips are kept verbatim and
 *     flagged, never conjecturally emended.
 *   - only wiki-transport scaffolding is removed ({{titulus2}}, the trailing
 *     {{Textquality}} tag, the trailing interwiki links).
 *   - editorial angle-bracket supplements printed in the edition (<'ferus'>,
 *     <'est aliquod animal iustum'>, <albus, et>, <im>) are KEPT verbatim and
 *     flagged (mirrors isagoge-la's <quod>).
 *   - this source carries no Bekker page/column/line numbers, so every
 *     Division.ref / Passage.ref is null and every Passage.n is "". Chapters that
 *     print a Latin rubric keep it verbatim as Division.sourceHeading.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DE_INTERPRETATIONE_CHAPTERS } from '../import-aristotle-shared/chapters.ts';
import {
  DEINT_LA_ABOUT_SECTIONS,
  DEINT_LA_LICENSE,
  DEINT_LA_PROVENANCE,
} from '../import-aristotle-shared/aboutText.ts';
import {
  ANGLE_SUPPLEMENT_RE,
  LACUNA_RE,
  parseLatinWikisource,
} from '../import-aristotle-shared/latinWikisource.ts';
import type {
  Division,
  GenericWork,
  Passage,
} from '../../data/de-interpretatione-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_JSON = join(HERE, 'raw', 'deinterpretatione-wikisource.json');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-interpretatione-la');

const WORK_ID = 'de-interpretatione-la';
const EXPECTED_CHAPTERS = 14;
const BEKKER_SPAN = '16a1–24b9';
/** Verbatim incipit of chapter 1, passage 1 (prefix check). */
const INCIPIT = 'Primum oportet constituere quid sit nomen et quid uerbum';
/** Verbatim explicit of chapter 14, last passage (suffix check) — truncation guard. */
const EXPLICIT = 'simul autem eidem non contingit inesse contraria.';
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
    fail(`chapter 14 explicit spot-check failed — possible truncation.\n  expected suffix: ${JSON.stringify(EXPLICIT)}\n  got tail:        ${JSON.stringify(explicitGot.slice(-90))}`);
  }
  if (parsed.replacementCharCount !== 0) {
    fail(`did not expect any U+FFFD in this page, found ${parsed.replacementCharCount}`);
  }

  // --- build divisions + per-passage anomalies ------------------------
  const anomalies: Anomaly[] = [];
  const supplementHits: string[] = [];
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
          note: `the edition prints the editorial lacuna mark "<...>" here (${lac.length}×); kept verbatim, nothing supplied (no fabrication).`,
        });
      }
      if (sup) {
        supplementHits.push(`${meta.id} (${sup.join(', ')})`);
        notes.push(`editorial angle-bracket supplement ${sup.join(', ')} printed in the edition, kept verbatim (not markup)`);
        anomalies.push({
          where: `${WORK_ID} / ${meta.id} / passage ${j}`,
          note: `contains editorial angle-bracket supplement ${sup.join(', ')} from the edition; kept verbatim (not markup). Mirrors the <quod> supplement in isagoge-la.`,
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
      `pagination the De Interpretatione occupies Bekker ${BEKKER_SPAN}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / orthography`,
    note:
      'Classical Latin orthography as transmitted: consonantal u is written u, not v (uerbum, ' +
      "uox, uero, diuisione). Single quotation marks around cited terms ('homo', 'album', " +
      "'hircoceruus') and the double-hyphen dashes (\"--\") are the edition's punctuation. Kept " +
      'verbatim — no u/v or i/j regularisation and no spelling normalisation.',
  });
  anomalies.push({
    where: `${WORK_ID} / wiki transport`,
    note:
      `Removed as wiki-transport scaffolding (no reading text touched): ${parsed.strippedTemplates.join(', ')}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / editorial supplements`,
    note:
      `The edition prints editorial angle-bracket supplements, kept verbatim (not markup): ` +
      `${supplementHits.join('; ')}. Each supplies words the editor judged implied; this mirrors ` +
      `the <quod> supplement in isagoge-la.`,
  });

  // Apparent transcription slips in chapter 14 — kept verbatim, flagged (never emended).
  const ch14 = divisions[13]!.passages.map((p) => p.text).join(' ');
  const slips: string[] = [];
  if (/\bcontraria ent\b/.test(ch14)) slips.push('"contraria ent" (evidently for "contraria erit")');
  if (/\bbonum est nel quoniam\b/.test(ch14)) slips.push('"bonum est nel quoniam" (evidently for "… uel quoniam")');
  if (slips.length) {
    anomalies.push({
      where: `${WORK_ID} / ch-14 transcription slips`,
      note:
        `Chapter 14 contains apparent single-letter transcription slips, preserved verbatim and ` +
        `NOT corrected: ${slips.join('; ')}. No conjectural emendation is applied.`,
    });
  }

  const withRubric = parsed.chapters.filter((c) => c.rubric).map((c) => c.number);
  const noRubric = parsed.chapters.filter((c) => !c.rubric).map((c) => c.number);
  anomalies.push({
    where: `${WORK_ID} / chapter rubrics`,
    note:
      `Chapters ${withRubric.join(', ')} print a verbatim Latin rubric (DE NOMINE, DE VERBO, ` +
      `DE ORATIONE), stored verbatim as Division.sourceHeading. Chapters ${noRubric.join(', ')} print ` +
      'no rubric (sourceHeading null). These capitula are editorial in the tradition, not part of ' +
      "Boethius' running translation.",
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };
  const about = {
    workId: WORK_ID,
    title: 'De Interpretatione',
    author: 'Aristotle',
    language: 'la',
    translator: 'Boethius',
    provenance: DEINT_LA_PROVENANCE,
    license: DEINT_LA_LICENSE,
    sections: DEINT_LA_ABOUT_SECTIONS,
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
      `(${anomalies.length} anomalies)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
