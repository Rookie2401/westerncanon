/**
 * Homer, *Odyssey* - English translation (A. T. Murray, Loeb Classical
 * Library, 1919). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-homer-odyssey-en/index.ts
 *
 * Reads scripts/import-homer-odyssey-en/raw/tlg0012.tlg002.perseus-eng3.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/odyssey-en/work.json      - the GenericWork (24 Books, each a
 *                                     single leaf Division holding one
 *                                     Passage of every paragraph, joined as
 *                                     prose)
 *   data/odyssey-en/about.json     - provenance / licence / prose
 *   data/odyssey-en/anomalies.json - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-homer-shared/validate.ts`.
 *
 * Parsing itself lives in scripts/import-homer-shared/parseEn.ts, shared
 * with the Iliad English importer - see that file's doc comment for the
 * full structural writeup. This source has NO <quote> wrapper tags and NO
 * <corr> corrections anywhere (confirmed by direct inspection before
 * writing this importer) - unlike the Iliad's own English source, which has
 * both - so no "Known gaps & anomalies" section on <corr> is needed here;
 * direct speech in this translation is simply run inline in the prose,
 * marked only by ordinary quotation marks in the text itself, not a <quote>
 * tag.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEn } from '../import-homer-shared/parseEn.ts';
import { DIGITAL_SOURCE_SECTION_EN, EN_LICENSE, EN_PROVENANCE } from '../import-homer-shared/aboutText.ts';
import type { GenericWork, WorkAbout } from '../import-homer-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0012.tlg002.perseus-eng3.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'odyssey-en');

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { divisions, anomalies, totalCards, totalParagraphs, totalNotes, totalCorrections } = parseEn(xml, 'odyssey-en');

  anomalies.push({
    where: 'odyssey-en / whole work',
    note:
      `Parsed ${totalCards} Loeb "card" print-pagination divisions (discarded as pure layout) across 24 Books, ` +
      `yielding ${totalParagraphs} prose paragraphs. ${totalNotes} <note resp="Loeb"> footnote markers were ` +
      `stripped entirely (Murray/Loeb apparatus, not reading text). ${totalCorrections} <corr> transcription ` +
      `correction(s) were found (0 in this source, unlike the Iliad's own English text).`,
  });

  const work: GenericWork = { workId: 'odyssey-en', language: 'en', divisions };

  const about: WorkAbout = {
    workId: 'odyssey-en',
    title: 'Odyssey',
    author: 'Homer',
    language: 'en',
    translator: 'A. T. Murray',
    edition: 'Loeb Classical Library, 2 vols. (Cambridge, MA: Harvard University Press, 1919)',
    provenance: EN_PROVENANCE,
    license: EN_LICENSE,
    sections: [
      {
        heading: 'About the text',
        paragraphs: [
          'The Odyssey follows the Iliad in the traditional ordering, telling Odysseus\'s ten-year journey home ' +
            'from Troy - the wanderings among the Cyclops, Circe, the Sirens, Scylla and Charybdis, and Calypso, ' +
            'told partly in his own first-person narration to the Phaeacians - and his eventual return to Ithaca, ' +
            'where, still disguised, he and his son Telemachus overthrow the suitors besieging his wife Penelope.',
          'A. T. Murray\'s Loeb translation renders Homer\'s verse as flowing English prose, with the Loeb ' +
            'edition\'s own marginal numbers keyed to the corresponding Greek verse lines (used here only to ' +
            'compute each Book\'s Division.ref, e.g. "1–444", not shown inline). Direct speech in this particular ' +
            'translation runs inline in the prose with ordinary quotation marks, rather than a separate <quote> ' +
            'markup tag (which the Iliad\'s own English source does use) - a difference in how the two source ' +
            'files happen to be marked up, not a difference in the reading text itself.',
        ],
      },
      DIGITAL_SOURCE_SECTION_EN,
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const chars = b.passages[0]!.text.length;
    totalChars += chars;
    process.stdout.write(`  book-${b.number!.padStart(2)}  ref ${(b.ref ?? '-').padEnd(9)}  ${chars.toString().padStart(6)} chars\n`);
  }
  process.stdout.write(
    `\n  24 books  ${totalCards} cards  ${totalParagraphs} paragraphs  ${totalNotes} Loeb notes stripped  ` +
      `${totalCorrections} corrections kept  ${totalChars} chars  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-homer-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
