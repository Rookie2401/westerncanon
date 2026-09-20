/**
 * Cicero, *Orator* - English translation (E. Jones, 1776). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-orator-en/index.ts
 *
 * Reads (via scripts/import-cicero-brutus-orator-shared/splitGutenberg.ts)
 * scripts/import-cicero-brutus-orator-shared/raw/pg9776.txt - the SAME
 * Project Gutenberg ebook #9776 file as scripts/import-brutus-en, which
 * contains both works back to back - and writes:
 *   data/orator-en/work.json       - the GenericWork (FLAT: `sec-N`
 *                                    reading-chunk Divisions, see below)
 *   data/orator-en/about.json      - provenance / licence / prose
 *   data/orator-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-orator-en/validate.ts`.
 *
 * This importer calls the shared `loadAndSplit()` (see
 * scripts/import-cicero-brutus-orator-shared/splitGutenberg.ts for the
 * full account of the source's structure and every cleaning decision) and
 * is responsible only for its OWN half: grouping Orator's paragraphs into
 * `sec-N` reading chunks and writing this work's independent
 * work.json/about.json/anomalies.json. It never reads or depends on
 * scripts/import-brutus-en's output.
 *
 * DIVISION SCHEME - see data/orator-en/types.ts and the fuller explanation
 * in scripts/import-brutus-en/index.ts's own module doc (identical
 * reasoning: this translation prints no chapter/section numbers of its
 * own, so navigation here is by a small number of purely mechanical,
 * up-to-~15,000-character reading chunks, not a citation scheme).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunkParagraphs, loadAndSplit, RAW_TXT } from '../import-cicero-brutus-orator-shared/splitGutenberg.ts';
import type { Division, GenericWork, Passage } from '../../data/orator-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'orator-en');

const WORK_ID = 'orator-en';
const TARGET_CHUNK_CHARS = 15000;
const INCIPIT = 'Which, my Brutus, would be the most difficult talk';
const EXPLICIT_TAIL = 'my abilities are unequal.';

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
      `A second title-page block for Orator (${split.titlePageExcludedChars} characters: "THE ORATOR, BY MARCUS ` +
      'TULLIUS CICERO; ADDRESSED TO MARCUS BRUTUS; And now first translated from the Original Latin." plus a ' +
      'Milton epigraph, "Song charms the Sense, but Eloquence the Soul.") sits between the end of Brutus\'s text ' +
      'and Orator\'s own heading ("THE ORATOR." - a standalone line ending in a period, distinct from this ' +
      'title-page line which ends in a comma). This title-page block is decorative front matter, not Cicero\'s ' +
      'translated text; excluded, same treatment as the book\'s opening title page.',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: `${split.footnoteCount} "[Footnote: ...]" translator/transcriber asides (combined across Brutus and Orator, this work's own share not separately delimited in the shared source) were excluded entirely - Jones's own explanatory glosses, not his translated running text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / italic markup`,
    note: `${split.orator.underscoresStripped} underscore characters (Gutenberg's plain-text italic-markup convention, e.g. "_juncture_") were stripped from Orator's text; this schema has no rich-text field.`,
  });
  if (split.orator.ornamentsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / typographic ornament`,
      note: `${split.orator.ornamentsDropped} decorative row-of-asterisks ornament (no text content), printed just before the work's closing paragraph, was dropped.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / division scheme`,
    note:
      "Jones's 1776 translation prints no chapter/section numbers anywhere in Orator's text either (confirmed by " +
      `direct inspection of the whole source file). Per the task brief's own fallback guidance, this edition is ` +
      `divided into ${TARGET_CHUNK_CHARS}-character reading chunks (paragraphs grouped in document order, never ` +
      'split) - these sec-N numbers are this importer\'s own sequential labels only and do NOT correspond to the ' +
      "Latin sibling's Wilkins section numbers. See about.json and data/orator-en/types.ts.",
  });

  const paragraphs = split.orator.paragraphs;
  if (paragraphs.length === 0) fail('zero paragraphs parsed for Orator');
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
    title: 'Orator',
    author: 'Cicero',
    language: 'en' as const,
    translator: 'E. Jones',
    edition: 'First edition (London: B. White, 1776)',
    provenance:
      'Project Gutenberg ebook #9776, "Cicero\'s Brutus, or History of Famous Orators; also His Orator, or ' +
      'Accomplished Speaker", trans. E. Jones (London: B. White, 1776) - fetched from ' +
      'https://www.gutenberg.org/cache/epub/9776/pg9776.txt and committed at ' +
      'scripts/import-cicero-brutus-orator-shared/raw/pg9776.txt; imported by scripts/import-orator-en (which ' +
      'shares its fetch/split/clean logic with scripts/import-brutus-en - both works come from this one file).',
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
          "This is Cicero's Orator (his treatise on the ideal orator and prose style, addressed to M. Junius " +
            'Brutus) in the English translation made by E. Jones, first published London: B. White, 1776, "now ' +
            'first translated from the Original Latin" per its own title page. An independent Latin edition ' +
            '(Wilkins, 1902) is also bundled - see data/orator-la.',
          'Navigation here is by a small number of reading-sized chunks, NOT by the traditional Wilkins section ' +
            'numbers used for the Latin edition - see "Reference scheme" below for why, and exactly how the ' +
            'chunking was done.',
        ],
      },
      {
        heading: 'The translation',
        paragraphs: [
          'E. Jones, trans., Cicero\'s Brutus, or History of Famous Orators; also His Orator, or Accomplished ' +
            'Speaker (London: B. White, 1776). In his preface, Jones describes Orator as composed shortly after ' +
            'Brutus, at Brutus\'s own request, as a fifth book completing the four-book project on oratory begun ' +
            'with Brutus. This translation is in the public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is Project Gutenberg ebook #9776 (pg9776.txt), which contains BOTH Brutus ' +
            'and Orator as one continuous file. It was fetched once and is bundled with the app; nothing is ' +
            'loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The shared importer module locates Orator\'s own heading - the standalone line "THE ORATOR." (ending ' +
            'in a period, distinct from a nearby title-page line "THE ORATOR," ending in a comma, which is ' +
            'excluded as front matter - see anomalies.json) - and reads to the work\'s natural closing paragraph ' +
            '("Thus, my Brutus, I have given you my opinion of a complete Orator...").',
          `${split.footnoteCount} inline "[Footnote: ...]" translator/transcriber asides (combined across both ` +
            "works) are stripped entirely, bracket-depth-aware so a nested bracket does not truncate the removal " +
            'early. Other bracketed text - Jones\'s own parenthetical insertions and "[Greek: WORD]" ' +
            'transliteration markers Gutenberg uses to stand in for untranslated Greek script - is genuine content ' +
            'and is kept verbatim.',
          `Gutenberg's plain-text italic markup (a pair of underscores around a word or phrase) is stripped ` +
            `(${split.orator.underscoresStripped} underscore characters in this work) since this schema has no ` +
            'rich-text field; every enclosed word is kept. A single decorative row-of-asterisks ornament (no text ' +
            'content), printed just before the work\'s closing paragraph, is dropped. Hard-wrapped lines are ' +
            'rejoined with a single space, except where a line ends in a hyphen (a genuine compound word split at ' +
            'the wrap point, or Jones\'s em-dash convention "--") - those join with no inserted space.',
          'Paragraphs (delimited by the source\'s own blank lines) are then grouped, in document order and without ' +
            `ever splitting a paragraph, into chunks of up to ${TARGET_CHUNK_CHARS} characters each - purely a ` +
            'reading-navigation convenience; see "Reference scheme".',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          "Jones's 1776 translation prints NO chapter, section, or paragraph numbers anywhere in Orator's text - " +
            'confirmed by reading the entire source file directly before writing this importer, not assumed.',
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
          'A second title-page block (repeating the work\'s title, plus a Milton epigraph) between the end of ' +
            'Brutus\'s text and Orator\'s own heading is not reproduced as reading text - see "How it was ' +
            'imported".',
          `${split.footnoteCount} translator/transcriber footnotes (combined across both works) were excluded ` +
            'entirely from the reading text.',
          'No section/chapter numbering is available from this source at all (see "Reference scheme"); this ' +
            "edition's own sec-N reading-chunk numbers are a navigation convenience only.",
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
      `  ${split.footnoteCount} footnotes (shared total)  ${split.orator.underscoresStripped} underscores  ` +
      `${split.orator.ornamentsDropped} ornaments dropped\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-orator-en/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
