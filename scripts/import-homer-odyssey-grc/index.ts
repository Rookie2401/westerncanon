/**
 * Homer, *Odyssey* - Greek text (Monro/Allen Oxford Classical Text). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-homer-odyssey-grc/index.ts
 *
 * Reads scripts/import-homer-odyssey-grc/raw/tlg0012.tlg002.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/odyssey-grc/work.json      - the GenericWork (24 Books, each a
 *                                      single leaf Division holding one
 *                                      Passage of every surviving verse line)
 *   data/odyssey-grc/about.json     - provenance / licence / prose
 *   data/odyssey-grc/anomalies.json - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-homer-shared/validate.ts`.
 *
 * Parsing itself lives in scripts/import-homer-shared/parseGrc.ts, shared
 * with the Iliad Greek importer - see that file's doc comment for the full
 * structural writeup (attribute-order tolerance for the Book div, <del>/
 * <note>/<milestone>/<q> handling). Unlike the Iliad's source file, this
 * source has NO <del> spans and NO Perseus transcriber gap-notes anywhere in
 * its 24 Books (confirmed by direct inspection before writing this
 * importer) - so no comparable "Known gaps & anomalies" section is needed
 * in this work's about.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGrc } from '../import-homer-shared/parseGrc.ts';
import { DIGITAL_SOURCE_SECTION_GRC, GRC_LICENSE, GRC_PROVENANCE } from '../import-homer-shared/aboutText.ts';
import type { GenericWork, WorkAbout } from '../import-homer-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0012.tlg002.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'odyssey-grc');

/** Traditional total (sanity cross-check only, never force-fit). */
const EXPECTED_LINES_APPROX = 12110;

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { divisions, anomalies, totalLines, totalDelLines, totalNoteGaps } = parseGrc(xml, 'odyssey-grc');

  if (Math.abs(totalLines - EXPECTED_LINES_APPROX) > 50) {
    process.stdout.write(
      `NOTE: parsed ${totalLines} <l> elements vs. the traditional ~${EXPECTED_LINES_APPROX} total - flagged, not force-fit.\n`,
    );
  }
  anomalies.push({
    where: 'odyssey-grc / whole work',
    note:
      `Parsed ${totalLines} <l> verse-line elements across 24 Books (traditional total ~${EXPECTED_LINES_APPROX}). ` +
      `${totalDelLines} line(s) excluded as <del> and ${totalNoteGaps} source-internal gap note(s) were found ` +
      `(both 0 in this source, unlike the Iliad's own text).`,
  });

  const work: GenericWork = { workId: 'odyssey-grc', language: 'grc', divisions };

  const about: WorkAbout = {
    workId: 'odyssey-grc',
    title: 'Ὀδύσσεια',
    author: 'Homer',
    language: 'grc',
    edition: 'Monro/Allen, Homeri Opera, Oxford Classical Texts (2nd ed. 1917-19)',
    editor: 'D. B. Monro and T. W. Allen',
    provenance: GRC_PROVENANCE,
    license: GRC_LICENSE,
    sections: [
      {
        heading: 'About the text',
        paragraphs: [
          'The Odyssey follows the Iliad in the traditional ordering, telling Odysseus\'s ten-year journey home ' +
            'from Troy - the wanderings among the Cyclops, Circe, the Sirens, Scylla and Charybdis, and Calypso, ' +
            'told partly in his own first-person narration to the Phaeacians - and his eventual return to Ithaca, ' +
            'where, still disguised, he and his son Telemachus overthrow the suitors besieging his wife Penelope. ' +
            'The 24 Books printed here follow the same traditional Alexandrian division as the Iliad\'s.',
          'The Greek text is verse (dactylic hexameter); it is reproduced here one line per source line, exactly ' +
            'as lineated in the edition, never collapsed to prose or re-lineated.',
        ],
      },
      DIGITAL_SOURCE_SECTION_GRC,
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
    `\n  24 books  ${totalLines} <l> lines parsed (traditional ~${EXPECTED_LINES_APPROX})  ` +
      `${totalDelLines} <del>-excluded  ${totalNoteGaps} source-internal gap note(s)  ${totalChars} chars  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-homer-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
