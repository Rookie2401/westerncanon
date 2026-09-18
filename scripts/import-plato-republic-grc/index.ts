/**
 * Plato, *Republic* (Πολιτεία) - Greek text (ed. John Burnet, Platonis
 * Opera vol. IV, Oxford: Clarendon Press 1902/1905 printing; Perseus/OGL
 * canonical-greekLit CTS urn:cts:greekLit:tlg0059.tlg030.perseus-grc2).
 * Run-once ingestion pipeline:
 *
 *   npx tsx scripts/import-plato-republic-grc/index.ts
 *
 * Reads scripts/import-plato-republic-grc/raw/tlg0059.tlg030.perseus-grc2.xml
 * (fetched once from PerseusDL/canonical-greekLit on GitHub and committed
 * here, mirroring scripts/import-euclid/raw - nothing is downloaded at
 * import time) and writes:
 *   data/plato-republic-grc/work.json       - the GenericWork (10 Books,
 *                                             each a flat list of Stephanus-
 *                                             page Section divisions - see
 *                                             scripts/import-plato-c-shared/
 *                                             types.ts for the shape)
 *   data/plato-republic-grc/about.json      - provenance / licence / prose
 *   data/plato-republic-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-plato-c-shared/validate.ts`.
 *
 * Parsing itself (the TEI div/p/said/label/milestone/del/add/supplied/sic/
 * gap/note tokenizer) is shared with Laws-grc and Laws-en - see
 * scripts/import-plato-c-shared/teiTwoLevel.ts's doc-comment for the full
 * apparatus-handling rules. This file only supplies Republic-specific
 * metadata (workId, expected book/section counts, about.json prose).
 *
 * Faithfulness: verbatim Greek reading text only; no accent/spelling/
 * orthography fixes. Only transport scaffolding (XML tags, milestone
 * markers, whitespace collapse) is stripped - see anomalies.json for every
 * apparatus exclusion/inclusion (del/add/supplied/sic/gap) logged
 * individually, plus a summary for the (Laws-en-only) <note> footnotes.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTeiTwoLevel } from '../import-plato-c-shared/teiTwoLevel.ts';
import type { GenericWork, WorkAbout } from '../import-plato-c-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0059.tlg030.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'plato-republic-grc');

const WORK_ID = 'plato-republic-grc';

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
    expectedBookCount: 10,
    expectedSectionCount: 278,
  });

  anomalies.push({
    where: `${WORK_ID} / narration`,
    note:
      'Every <said> in this source carries who="#Σωκράτης" and there is exactly one <said> (and one <p>) per Section: ' +
      'the Republic is narrated throughout in the first person by Socrates, who quotes the other speakers within his ' +
      'own narration rather than each speaker getting a separate <said> turn (unlike Laws, which is direct dramatic ' +
      'dialogue). This is a genuine structural feature of the source, not a parsing gap - confirmed by direct ' +
      'inspection of the whole file before writing this importer.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Πολιτεία',
    author: 'Plato',
    language: 'grc',
    edition: 'Burnet 1902 (OCT)',
    editor: 'John Burnet',
    provenance:
      'Text: Perseus Digital Library / Open Greek and Latin, canonical-greekLit corpus ' +
      '(github.com/PerseusDL/canonical-greekLit), urn:cts:greekLit:tlg0059.tlg030.perseus-grc2, fetched directly and ' +
      'committed to this repository at scripts/import-plato-republic-grc/raw/. Edited from John Burnet\'s Oxford ' +
      'Classical Texts edition of Platonis Opera (Oxford: Clarendon Press, 1902; the OCT Republic volume - vol. IV - ' +
      'was first issued 1902, with the whole Platonis Opera series completed by 1907), itself edited from 19th-century ' +
      'manuscript collations. Structural markup (Book/Stephanus-page divisions, speaker turns) is the Perseus Project\'s ' +
      'own TEI-XML encoding of Burnet\'s text.',
    license:
      'Perseus/OGL canonical-greekLit texts are released under a Creative Commons Attribution-ShareAlike 4.0 ' +
      'International licence (CC BY-SA 4.0); Burnet\'s underlying 1902 edition is in the public domain (author died ' +
      '1928, and the edition itself is well out of copyright in the US and elsewhere).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is the ancient Greek text of Plato's Republic, edited by John Burnet for the Oxford Classical Texts " +
            "series (Platonis Opera, 1902), as digitized and structurally marked up by the Perseus Digital Library / " +
            "Open Greek and Latin project.",
          'Navigation is by Book (10 total) and Stephanus page (the standard citation system for Plato, from Henri ' +
            "Estienne's 1578 edition - e.g. \"327a\" - preserved here at page granularity; the individual a/b/c/d/e " +
            'sub-page letters are marked in the source but are finer than this reader\'s division granularity and are ' +
            'not separately addressable).',
          'The Republic is narrated throughout by Socrates in the first person - he recounts, to an unnamed listener, ' +
            'a conversation that took place "yesterday" - so the source marks nearly the entire text as a single ' +
            'continuous quotation attributed to Socrates, with the other speakers\' words appearing as reported speech ' +
            'within his narration, rather than as separate dramatic turns (contrast the Laws, a direct dialogue with ' +
            'alternating speaker labels).',
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
