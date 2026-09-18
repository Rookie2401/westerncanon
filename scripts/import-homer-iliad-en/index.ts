/**
 * Homer, *Iliad* - English translation (A. T. Murray, Loeb Classical
 * Library, 1924-25). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-homer-iliad-en/index.ts
 *
 * Reads scripts/import-homer-iliad-en/raw/tlg0012.tlg001.perseus-eng3.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/iliad-en/work.json      - the GenericWork (24 Books, each a single
 *                                   leaf Division holding one Passage of
 *                                   every paragraph, joined as prose)
 *   data/iliad-en/about.json     - provenance / licence / prose
 *   data/iliad-en/anomalies.json - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-homer-shared/validate.ts`.
 *
 * Parsing itself (card-division flattening, <note resp="Loeb">/<quote>/
 * <placeName>/<corr> handling, milestone-derived line-range refs) lives in
 * scripts/import-homer-shared/parseEn.ts, shared with the Odyssey English
 * importer - see that file's doc comment for the full structural writeup.
 * Murray's translation is chosen (not the alternative eng4/Samuel Butler
 * witness also present in this Perseus repo) for translator consistency
 * across both epics.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEn } from '../import-homer-shared/parseEn.ts';
import { DIGITAL_SOURCE_SECTION_EN, EN_LICENSE, EN_PROVENANCE } from '../import-homer-shared/aboutText.ts';
import type { GenericWork, WorkAbout } from '../import-homer-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0012.tlg001.perseus-eng3.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'iliad-en');

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { divisions, anomalies, totalCards, totalParagraphs, totalNotes, totalCorrections } = parseEn(xml, 'iliad-en');

  anomalies.push({
    where: 'iliad-en / whole work',
    note:
      `Parsed ${totalCards} Loeb "card" print-pagination divisions (discarded as pure layout) across 24 Books, ` +
      `yielding ${totalParagraphs} prose paragraphs. ${totalNotes} <note resp="Loeb"> footnote markers were ` +
      `stripped entirely (Murray/Loeb apparatus, not reading text). ${totalCorrections} <corr resp="perseus"> ` +
      `transcription correction(s) were kept verbatim and individually logged above.`,
  });

  const work: GenericWork = { workId: 'iliad-en', language: 'en', divisions };

  const about: WorkAbout = {
    workId: 'iliad-en',
    title: 'Iliad',
    author: 'Homer',
    language: 'en',
    translator: 'A. T. Murray',
    edition: 'Loeb Classical Library, 2 vols. (Cambridge, MA: Harvard University Press, 1924-25)',
    provenance: EN_PROVENANCE,
    license: EN_LICENSE,
    sections: [
      {
        heading: 'About the text',
        paragraphs: [
          'The Iliad is the earlier and (in the traditional ordering) the first of the two Homeric epics, telling ' +
            'a few weeks near the end of the ten-year Trojan War: the wrath of Achilles after Agamemnon seizes his ' +
            'prize Briseis, his withdrawal from battle, the death of his companion Patroclus at Hector\'s hands, and ' +
            'his terrible return to the fighting that ends with Hector\'s death and Priam\'s ransoming of his son\'s ' +
            'body.',
          'A. T. Murray\'s Loeb translation renders Homer\'s verse as flowing English prose, with the Loeb ' +
            'edition\'s own marginal numbers keyed to the corresponding Greek verse lines (used here only to ' +
            'compute each Book\'s Division.ref, e.g. "1–611", not shown inline).',
        ],
      },
      DIGITAL_SOURCE_SECTION_EN,
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'One short phrase is marked <corr resp="perseus"> in the source (Book 20: "son of") - the digital ' +
            'transcribers\' own correction of a probable transcription error, not an editorial change to Murray\'s ' +
            'wording - and is kept verbatim; it is individually logged in anomalies.json.',
        ],
      },
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
