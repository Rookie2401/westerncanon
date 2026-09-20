/**
 * Cicero, *Brutus* - English translation (E. Jones, 1776). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-brutus-en/index.ts
 *
 * Reads (via scripts/import-cicero-brutus-orator-shared/splitGutenberg.ts)
 * scripts/import-cicero-brutus-orator-shared/raw/pg9776.txt - Project
 * Gutenberg ebook #9776, fetched once from
 * https://www.gutenberg.org/cache/epub/9776/pg9776.txt and committed there;
 * nothing is downloaded at import time - and writes:
 *   data/brutus-en/work.json       - the GenericWork (FLAT: `sec-N`
 *                                    reading-chunk Divisions, see below)
 *   data/brutus-en/about.json      - provenance / licence / prose
 *   data/brutus-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-brutus-en/validate.ts`.
 *
 * This importer calls scripts/import-cicero-brutus-orator-shared's shared
 * `loadAndSplit()` (fetch, footnote/underscore stripping, paragraph
 * splitting, and the Brutus/Orator boundary split - see that module's own
 * doc comment for the full account of the source's structure and every
 * cleaning decision) and is responsible only for its OWN half: grouping
 * Brutus's paragraphs into `sec-N` reading chunks and writing this work's
 * independent work.json/about.json/anomalies.json. It never reads or
 * depends on scripts/import-orator-en's output.
 *
 * DIVISION SCHEME - read data/brutus-en/types.ts first. Jones's 1776
 * translation prints no chapter/section numbers at all (verified directly,
 * not assumed), so this edition cannot be keyed to the Latin sibling's
 * Wilkins section numbers without inventing a correspondence that isn't
 * really printed. Per the task's own fallback guidance, paragraphs (as
 * delimited by the source's own blank lines) are grouped in document order
 * into chunks of up to ~15,000 characters each (never splitting a
 * paragraph) - a purely mechanical, reproducible chunking for readable
 * navigation, NOT a citation scheme. See about.json for full disclosure.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunkParagraphs, loadAndSplit, RAW_TXT } from '../import-cicero-brutus-orator-shared/splitGutenberg.ts';
import type { Division, GenericWork, Passage } from '../../data/brutus-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'brutus-en');

const WORK_ID = 'brutus-en';
const TARGET_CHUNK_CHARS = 15000;
const INCIPIT = 'When I had left Cilicia, and arrived at Rhodes';
const EXPLICIT_TAIL = '"--[Caetera defunt.]';

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
  process.stdout.write(`parsing ${RAW_TXT} ...\n`);

  const split = loadAndSplit();
  const anomalies: Anomaly[] = [];

  anomalies.push({
    where: `${WORK_ID} / front matter`,
    note:
      `E. Jones's own translator's "PREFACE." (${split.prefaceExcludedChars} characters, describing both Brutus ` +
      'and Orator and his approach to translating them) precedes Brutus\'s own heading in the source and is not ' +
      "part of either work's translated running text; excluded from both editions.",
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: `${split.footnoteCount} "[Footnote: ...]" translator/transcriber asides (combined across Brutus and Orator, this work's own share not separately delimited in the shared source) were excluded entirely - Jones's own explanatory glosses, not his translated running text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / italic markup`,
    note: `${split.brutus.underscoresStripped} underscore characters (Gutenberg's plain-text italic-markup convention, e.g. "_Civil War_") were stripped from Brutus's text; this schema has no rich-text field. One doubled "__metaphorical_" (a transcription glitch, not a real word) normalises the same way as every other case since only the markup character is removed.`,
  });
  if (split.brutus.ornamentsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / typographic ornament`,
      note: `${split.brutus.ornamentsDropped} decorative row-of-asterisks ornament(s) (no text content) were dropped.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / division scheme`,
    note:
      "Jones's 1776 translation prints no chapter/section numbers anywhere in Brutus's text (confirmed by direct " +
      'inspection of the whole source file). Per the task brief\'s own fallback guidance, this edition is divided ' +
      `into ${TARGET_CHUNK_CHARS}-character reading chunks (paragraphs grouped in document order, never split) - ` +
      'these sec-N numbers are this importer\'s own sequential labels only and do NOT correspond to the Latin ' +
      "sibling's Wilkins section numbers. See about.json and data/brutus-en/types.ts.",
  });

  const paragraphs = split.brutus.paragraphs;
  if (paragraphs.length === 0) fail('zero paragraphs parsed for Brutus');
  const chunks = chunkParagraphs(paragraphs, TARGET_CHUNK_CHARS);

  const divisions: Division[] = chunks.map((paras, i) => {
    const passage: Passage = { n: '', text: paras.join('\n\n'), ref: null };
    const div: Division = {
      id: `sec-${i + 1}`,
      number: String(i + 1),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    return div;
  });

  // --- hard sanity gates ---------------------------------------------------
  const firstText = divisions[0]!.passages[0]!.text;
  if (!firstText.startsWith(INCIPIT)) fail(`incipit mismatch: got ${JSON.stringify(firstText.slice(0, 80))}`);
  const lastText = divisions[divisions.length - 1]!.passages[0]!.text;
  if (!lastText.endsWith(EXPLICIT_TAIL)) fail(`explicit mismatch: got tail ${JSON.stringify(lastText.slice(-80))}`);

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about = {
    workId: WORK_ID,
    title: 'Brutus',
    author: 'Cicero',
    language: 'en' as const,
    translator: 'E. Jones',
    edition: 'First edition (London: B. White, 1776)',
    provenance:
      'Project Gutenberg ebook #9776, "Cicero\'s Brutus, or History of Famous Orators; also His Orator, or ' +
      'Accomplished Speaker", trans. E. Jones (London: B. White, 1776) - fetched from ' +
      'https://www.gutenberg.org/cache/epub/9776/pg9776.txt and committed at ' +
      'scripts/import-cicero-brutus-orator-shared/raw/pg9776.txt; imported by scripts/import-brutus-en (which ' +
      'shares its fetch/split/clean logic with scripts/import-orator-en - both works come from this one file).',
    license:
      "Jones's 1776 translation is in the public domain worldwide (first published 1776, well over 200 years " +
      'ago). Project Gutenberg\'s own plain-text transcription of it is in the public domain in the United ' +
      'States; see gutenberg.org/ebooks/9776 for Project Gutenberg\'s own terms on redistributing their specific ' +
      'eBook file, which this importer respects by keeping the translated text itself rather than Gutenberg\'s ' +
      'licence header/footer.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is Cicero's Brutus (a dialogue on the history of Roman and Greek oratory, addressed to M. Junius " +
            'Brutus) in the English translation made by E. Jones, first published London: B. White, 1776 - the ' +
            'first English translation of the work, per Jones\'s own preface. An independent Latin edition (Wilkins, ' +
            '1902) is also bundled - see data/brutus-la.',
          'Navigation here is by a small number of reading-sized chunks, NOT by the traditional Wilkins section ' +
            'numbers used for the Latin edition - see "Reference scheme" below for why, and exactly how the ' +
            'chunking was done.',
        ],
      },
      {
        heading: 'The translation',
        paragraphs: [
          'E. Jones, trans., Cicero\'s Brutus, or History of Famous Orators; also His Orator, or Accomplished ' +
            'Speaker (London: B. White, 1776) - "now first translated into English", per Jones\'s own title page. ' +
            'This translation is in the public domain.',
          'In his own preface (not reproduced as reading text here - see "How it was imported"), Jones describes ' +
            'Brutus as composed by Cicero during the Civil War in Africa, in the form of a dialogue with Atticus ' +
            'and Brutus, intended as a fourth book supplementing his three earlier works on the qualifications of ' +
            'an orator.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is Project Gutenberg ebook #9776 (pg9776.txt), which contains BOTH Brutus ' +
            'and its companion Orator as one continuous file. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The shared importer module locates Brutus\'s own heading ("BRUTUS, OR THE HISTORY OF ELOQUENCE.") and ' +
            'reads to the bracketed note "[Caetera defunt.]" (Jones\'s own marker, matching the Latin manuscript\'s ' +
            'own lacuna at this exact point - kept as reading text, not treated as apparatus). Everything before ' +
            'that heading - Gutenberg\'s own boilerplate, the book\'s title page, and Jones\'s own translator\'s ' +
            '"PREFACE." (which describes both works together) - is excluded, as is everything from Gutenberg\'s ' +
            'own closing boilerplate onward.',
          `${split.footnoteCount} inline "[Footnote: ...]" translator/transcriber asides (combined across both ` +
            "works) are stripped entirely, bracket-depth-aware so a nested bracket (e.g. a Greek-transliteration " +
            'marker inside a footnote) does not truncate the removal early. Other bracketed text - Jones\'s own ' +
            'parenthetical insertions (e.g. "[where he lately died]") and "[Greek: WORD]" transliteration markers ' +
            'Gutenberg uses to stand in for untranslated Greek script - is genuine content and is kept verbatim.',
          `Gutenberg's plain-text italic markup (a pair of underscores around a word or phrase, e.g. "_Civil ` +
            `War_") is stripped (${split.brutus.underscoresStripped} underscore characters in this work) since ` +
            'this schema has no rich-text field; every enclosed word is kept. Hard-wrapped lines are rejoined with ' +
            'a single space, except where a line ends in a hyphen (a genuine compound word split at the wrap ' +
            'point, or Jones\'s em-dash convention "--", always printed with no following space) - those join ' +
            'with no inserted space, so as not to fabricate a space that is not in the original.',
          'Paragraphs (delimited by the source\'s own blank lines) are then grouped, in document order and without ' +
            `ever splitting a paragraph, into chunks of up to ${TARGET_CHUNK_CHARS} characters each - purely a ` +
            'reading-navigation convenience; see "Reference scheme".',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          "Jones's 1776 translation prints NO chapter, section, or paragraph numbers anywhere in Brutus's text - " +
            'confirmed by reading the entire source file directly before writing this importer, not assumed. The ' +
            'only structural device found anywhere in the shared source is a single decorative row-of-asterisks ' +
            'ornament, which appears once near the end of the companion work Orator and is not a general ' +
            'section-break convention.',
          `Because no genuine correspondence to the Latin edition's own (Wilkins) section numbers can be ` +
            'recovered from this source, this edition is instead divided into a small number of purely mechanical ' +
            `reading chunks (id sec-1, sec-2, ... - up to ~${TARGET_CHUNK_CHARS} characters each, breaking only ` +
            'at a paragraph boundary). These numbers are this importer\'s own and do NOT cite, and should not be ' +
            'read as citing, any position in the Latin edition\'s numbering. Division.ref and Passage.ref are null ' +
            'throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          "Jones's own translator's preface (describing both Brutus and Orator, and his approach to translating " +
            'them) is not reproduced as reading text - see "How it was imported".',
          `${split.footnoteCount} translator/transcriber footnotes (combined across both works) were excluded ` +
            'entirely from the reading text.',
          'No section/chapter numbering is available from this source at all (see "Reference scheme"); this ' +
            "edition's own sec-N reading-chunk numbers are a navigation convenience only.",
          'The work itself ends mid-sentence ("if I had been so fortunate, &c, &c,\'--[Caetera defunt.]"), ' +
            "matching the Latin manuscript tradition's own genuine textual gap at this point, not an import defect " +
            '- see data/brutus-la/about.json.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(
    `\n  ${paragraphs.length} paragraphs  ${divisions.length} chunks  ${totalChars} chars\n` +
      `  ${split.footnoteCount} footnotes (shared total)  ${split.brutus.underscoresStripped} underscores  ` +
      `${split.brutus.ornamentsDropped} ornaments dropped\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-brutus-en/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
