/**
 * Plato, *Laws* (Νόμοι) - Greek text (ed. John Burnet, Platonis Opera
 * vol. V, Oxford: Clarendon Press 1907; Perseus/OGL canonical-greekLit CTS
 * urn:cts:greekLit:tlg0059.tlg034.perseus-grc2). Run-once ingestion
 * pipeline:
 *
 *   npx tsx scripts/import-plato-laws-grc/index.ts
 *
 * Reads scripts/import-plato-laws-grc/raw/tlg0059.tlg034.perseus-grc2.xml
 * (fetched once from PerseusDL/canonical-greekLit on GitHub and committed
 * here - nothing is downloaded at import time) and writes:
 *   data/plato-laws-grc/work.json       - the GenericWork (12 Books, each a
 *                                         flat list of Stephanus-page
 *                                         Section divisions)
 *   data/plato-laws-grc/about.json      - provenance / licence / prose
 *   data/plato-laws-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-plato-c-shared/validate.ts`.
 *
 * Parsing (the TEI div/p/said/label/milestone/del/add/supplied/sic/gap/note
 * tokenizer) is shared with Republic-grc and Laws-en - see
 * scripts/import-plato-c-shared/teiTwoLevel.ts's doc-comment for the full
 * apparatus-handling rules. Unlike Republic, the Laws is direct dramatic
 * dialogue: most Stephanus pages hold several <p><said><label>...</label>
 * ...</said></p> speaker turns (Athenian Stranger / Clinias / Megillus),
 * each kept as its own paragraph and joined with the rest of that page's
 * paragraphs by "\n\n" into a single Section Passage.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTeiTwoLevel } from '../import-plato-c-shared/teiTwoLevel.ts';
import type { GenericWork, WorkAbout } from '../import-plato-c-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0059.tlg034.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'plato-laws-grc');

const WORK_ID = 'plato-laws-grc';

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { divisions, anomalies, stats } = parseTeiTwoLevel(xml, {
    sourceLabel: WORK_ID,
    expectedBookCount: 12,
    expectedSectionCount: 327,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Νόμοι',
    author: 'Plato',
    language: 'grc',
    edition: 'Burnet 1907 (OCT)',
    editor: 'John Burnet',
    provenance:
      'Text: Perseus Digital Library / Open Greek and Latin, canonical-greekLit corpus ' +
      '(github.com/PerseusDL/canonical-greekLit), urn:cts:greekLit:tlg0059.tlg034.perseus-grc2, fetched directly and ' +
      'committed to this repository at scripts/import-plato-laws-grc/raw/. Edited from John Burnet\'s Oxford Classical ' +
      "Texts edition of Platonis Opera (vol. V, Oxford: Clarendon Press, 1907). Structural markup (Book/Stephanus-page " +
      "divisions, speaker turns) is the Perseus Project's own TEI-XML encoding of Burnet's text.",
    license:
      'Perseus/OGL canonical-greekLit texts are released under a Creative Commons Attribution-ShareAlike 4.0 ' +
      'International licence (CC BY-SA 4.0); Burnet\'s underlying 1907 edition is in the public domain (author died ' +
      '1928, and the edition itself is well out of copyright in the US and elsewhere).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is the ancient Greek text of Plato's Laws, edited by John Burnet for the Oxford Classical Texts " +
            "series (Platonis Opera vol. V, 1907), as digitized and structurally marked up by the Perseus Digital " +
            "Library / Open Greek and Latin project.",
          'Navigation is by Book (12 total) and Stephanus page (the standard citation system for Plato, from Henri ' +
            "Estienne's 1578 edition, running continuously 624-969 across the whole work here; the individual a/b/c/d/e " +
            'sub-page letters are marked in the source but are finer than this reader\'s division granularity and are ' +
            'not separately addressable).',
          'Unlike the Republic, the Laws is a direct dramatic dialogue among three unnamed-by-proper-name speakers - ' +
            'an Athenian Stranger, Clinias of Crete, and Megillus of Sparta - with no narrating frame; most Stephanus ' +
            'pages hold several short alternating speeches, each kept here as its own paragraph with its speaker label ' +
            '(e.g. "ΑΘ.", "ΚΛ.", "ΜΕ.") exactly as printed.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  process.stdout.write(
    `\n  ${stats.bookCount} books  ${stats.sectionCount} sections  ${stats.paragraphCount} paragraphs  ` +
      `del=${stats.delSpans} add=${stats.addSpans} supplied=${stats.suppliedSpans} sic=${stats.sicSpans} gap=${stats.gapMarkers} note=${stats.noteSpans} bibl=${stats.biblSpans}\n`,
  );
  process.stdout.write('Done. Run `npx tsx scripts/import-plato-c-shared/validate.ts` next.\n');
}

main();
