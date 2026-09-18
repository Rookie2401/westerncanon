/**
 * Homer, *Iliad* - Greek text (Monro/Allen Oxford Classical Text). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-homer-iliad-grc/index.ts
 *
 * Reads scripts/import-homer-iliad-grc/raw/tlg0012.tlg001.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/iliad-grc/work.json      - the GenericWork (24 Books, each a single
 *                                    leaf Division holding one Passage of
 *                                    every surviving verse line)
 *   data/iliad-grc/about.json     - provenance / licence / prose
 *   data/iliad-grc/anomalies.json - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-homer-shared/validate.ts`.
 *
 * Parsing itself (attribute-order tolerance, <del>/<note>/<milestone>/<q>
 * handling) lives in scripts/import-homer-shared/parseGrc.ts, shared with
 * the Odyssey Greek importer - see that file's doc comment for the full
 * structural writeup. This file only wires the raw path, expected line-count
 * cross-check, and this work's own about.json prose.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGrc } from '../import-homer-shared/parseGrc.ts';
import { DIGITAL_SOURCE_SECTION_GRC, GRC_LICENSE, GRC_PROVENANCE } from '../import-homer-shared/aboutText.ts';
import type { GenericWork, WorkAbout } from '../import-homer-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0012.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'iliad-grc');

/** Traditional total (Monro/Allen's own printed text; a small number of lines - e.g. Iliad 9.458-461 - are omitted by this edition's own numbering, and a handful more are marked <del> as probably-spurious but still counted in the printed line numbering). Used only as a sanity cross-check, never to force-fit the parsed count. */
const EXPECTED_LINES_APPROX = 15693;

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { divisions, anomalies, totalLines, totalDelLines, totalNoteGaps } = parseGrc(xml, 'iliad-grc');

  if (Math.abs(totalLines - EXPECTED_LINES_APPROX) > 50) {
    process.stdout.write(
      `NOTE: parsed ${totalLines} <l> elements vs. the traditional ~${EXPECTED_LINES_APPROX} total - ` +
        `flagged, not force-fit; see anomalies.json for the genuine gaps/deletions this edition itself marks.\n`,
    );
  }
  anomalies.push({
    where: 'iliad-grc / whole work',
    note:
      `Parsed ${totalLines} <l> verse-line elements across 24 Books (traditional total ~${EXPECTED_LINES_APPROX}). ` +
      `${totalDelLines} line(s) are marked <del> in this OCT edition (judged spurious/interpolated) and excluded ` +
      `from the reading text, each logged individually above. ${totalNoteGaps} Perseus transcriber note(s) flag a ` +
      `genuine line-numbering gap in this edition's own text (e.g. Iliad 9.458-461, omitted by the source itself); ` +
      `nothing was fabricated to fill any such gap.`,
  });

  const work: GenericWork = { workId: 'iliad-grc', language: 'grc', divisions };

  const about: WorkAbout = {
    workId: 'iliad-grc',
    title: 'Ἰλιάς',
    author: 'Homer',
    language: 'grc',
    edition: 'Monro/Allen, Homeri Opera, Oxford Classical Texts (3rd ed. 1920)',
    editor: 'D. B. Monro and T. W. Allen',
    provenance: GRC_PROVENANCE,
    license: GRC_LICENSE,
    sections: [
      {
        heading: 'About the text',
        paragraphs: [
          'The Iliad is the earlier and (in the traditional ordering) the first of the two Homeric epics, telling ' +
            'a few weeks near the end of the ten-year Trojan War: the wrath of Achilles after Agamemnon seizes his ' +
            'prize Briseis, his withdrawal from battle, the death of his companion Patroclus at Hector\'s hands, and ' +
            'his terrible return to the fighting that ends with Hector\'s death and Priam\'s ransoming of his son\'s ' +
            'body. The 24 Books printed here follow the traditional division, itself first fixed by Alexandrian ' +
            'scholars (each Book labelled with a letter of the Greek alphabet in antiquity) and preserved by ' +
            'Monro and Allen\'s edition.',
          'The Greek text is verse (dactylic hexameter); it is reproduced here one line per source line, exactly ' +
            'as lineated in the edition, never collapsed to prose or re-lineated.',
        ],
      },
      DIGITAL_SOURCE_SECTION_GRC,
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Four lines in Book 8 (part of the simile comparing the Trojan campfires to stars, 8.548-552) are marked ' +
            '<del> in this OCT text - judged by Monro and Allen to be probable ancient interpolations - and are ' +
            'excluded from the reading text here, exactly as this repository\'s Euclid text excludes its own ' +
            'source\'s <del> spans; every instance is individually logged in anomalies.json with its line number ' +
            'and excluded Greek text, never silently dropped.',
          'This edition itself omits a short run of lines in Book 9 (the traditional line numbers 458-461) - a ' +
            'gap in the edition\'s own numbering, not a defect of this import; the Perseus transcribers\' own note ' +
            'marking that gap is preserved in anomalies.json rather than shown as reading text.',
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
