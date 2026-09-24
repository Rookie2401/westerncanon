/**
 * Boethius - the Consolatio Philosophiae (Latin + English) and the five
 * theological tractates / Opuscula sacra (Latin + English), all from the
 * Loeb Classical Library's 1918 edition (H. F. Stewart & E. K. Rand,
 * "Boethius: The Theological Tractates, The Consolation of Philosophy",
 * London: William Heinemann Ltd. / Cambridge, MA: Harvard University
 * Press), digitised by the Perseus Digital Library / OpenGreekAndLatin
 * canonical-latinLit repository (author id stoa0058). Run-once ingestion
 * pipeline, table-driven over 12 works.
 *
 *   npx tsx scripts/import-boethius/fetch.ts     (downloads once, caches)
 *   npx tsx scripts/import-boethius/index.ts     (parses, writes outputs)
 *   npx tsx scripts/import-boethius/validate.ts  (structure + text accounting)
 *
 * Source catalogue (confirmed by direct inspection of the CTS __cts__.xml
 * metadata and, tractate by tractate, the fetched XML itself - see
 * parseConsolatioLa.ts / parseConsolatioEn.ts / parseTractateLa.ts /
 * parseTractateEn.ts for the full, per-work structural notes):
 *
 *   boethius-consolatio-la        stoa0058.stoa001.perseus-lat2.xml
 *   boethius-consolatio-en        stoa0058.stoa001.perseus-eng1.xml
 *   boethius-quomodo-substantiae-la / -en   stoa0058.stoa003 (Hebdomades)
 *   boethius-de-fide-catholica-la / -en     stoa0058.stoa006
 *   boethius-contra-eutychen-la / -en       stoa0058.stoa023
 *   boethius-de-trinitate-la / -en          stoa0058.stoa025
 *   boethius-utrum-pater-la / -en           stoa0058.stoa028
 *
 * PD basis: the Latin critical text and the 1918 English translation are
 * both in the public domain (the underlying work is 6th-century; this
 * specific Loeb volume was published in 1918, long out of copyright in
 * every jurisdiction with a life+70 or 95-year fixed term). The digital
 * transcription is distributed by the Perseus Digital Library /
 * OpenGreekAndLatin canonical-latinLit repository under CC BY-SA 4.0.
 *
 * IMPORTANT DISCLOSURE ABOUT THE ENGLISH TRACTATES: this repository's own
 * __cts__.xml metadata for stoa003/006/023/025/028 lists ONLY the Latin
 * edition (perseus-lat1) as a registered <edition>; no <translation> is
 * registered for these five works even though a complete, real
 * "...perseus-eng1.xml" file (same 1918 Stewart & Rand translation, same
 * teiHeader attribution) sits alongside it in the very same directory and
 * was fetched and used here. This is disclosed in every English tractate's
 * about.json rather than silently treated as an equally-canonical edition.
 *
 * All 12 raw files were fetched once via fetch.ts (raw.githubusercontent.com,
 * ≤1 request/3s, a descriptive User-Agent) and are cached under raw/; this
 * script never re-fetches a file that is already present, and performs no
 * network access of its own - it only reads raw/.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Anomaly, GenericWork, WorkAbout, WorkAboutSection } from './genericTypes.ts';
import { parseConsolatioLa } from './parseConsolatioLa.ts';
import { parseConsolatioEn } from './parseConsolatioEn.ts';
import { parseLatinTractate, LATIN_TRACTATES } from './parseTractateLa.ts';
import { parseEnglishTractate, ENGLISH_TRACTATES } from './parseTractateEn.ts';
import { emitTypesTs } from './typesTemplate.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

const ARCHIVE_REF = 'https://archive.org/details/in.ernet.dli.2015.155564';
const LOEB_EDITION =
  'Boethius: The Theological Tractates, The Consolation of Philosophy, ed. & trans. H. F. Stewart and E. K. Rand (Loeb Classical Library 74; London: William Heinemann Ltd.; Cambridge, MA: Harvard University Press, 1918)';
const PROVENANCE_COMMON =
  'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS author id stoa0058), digitising the Loeb 1918 Stewart & Rand edition; imported by scripts/import-boethius. Raw files fetched once (cached at scripts/import-boethius/raw/) and bundled with the app; nothing is loaded from the network at runtime. Loeb page-image reference: ' +
  ARCHIVE_REF;
const LICENSE_COMMON =
  "The Loeb 1918 Latin text and English translation are in the public domain (6th-century source text; 1918 publication, long out of copyright in every jurisdiction with a life+70 or fixed 95-year term). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).";

interface WorkEntry {
  workId: string;
  rawFile: string;
  title: string;
  language: 'la' | 'en';
  kind: 'consolatio-la' | 'consolatio-en' | 'tractate-la' | 'tractate-en';
  cts: string;
  aboutExtra: WorkAboutSection[];
}

const TRACTATE_TITLES: Record<string, string> = {
  'boethius-quomodo-substantiae': 'Quomodo Substantiae in Eo Quod Sint Bonae Sint Cum Non Sint Substantialia Bona (De Hebdomadibus)',
  'boethius-de-fide-catholica': 'De Fide Catholica',
  'boethius-contra-eutychen': 'Contra Eutychen et Nestorium',
  'boethius-de-trinitate': 'Quomodo Trinitas Unus Deus Ac Non Tres Dii (De Trinitate)',
  'boethius-utrum-pater': 'Utrum Pater et Filius ac Spiritus Sanctus de Divinitate Substantialiter Praedicentur',
};
const TRACTATE_CTS: Record<string, string> = {
  'boethius-quomodo-substantiae': 'stoa0058.stoa003',
  'boethius-de-fide-catholica': 'stoa0058.stoa006',
  'boethius-contra-eutychen': 'stoa0058.stoa023',
  'boethius-de-trinitate': 'stoa0058.stoa025',
  'boethius-utrum-pater': 'stoa0058.stoa028',
};

const WORKS: WorkEntry[] = [
  {
    workId: 'boethius-consolatio-la',
    rawFile: 'stoa0058.stoa001.perseus-lat2.xml',
    title: 'De consolatione philosophiae',
    language: 'la',
    kind: 'consolatio-la',
    cts: 'stoa0058.stoa001.perseus-lat2',
    aboutExtra: [],
  },
  {
    workId: 'boethius-consolatio-en',
    rawFile: 'stoa0058.stoa001.perseus-eng1.xml',
    title: 'The Consolation of Philosophy',
    language: 'en',
    kind: 'consolatio-en',
    cts: 'stoa0058.stoa001.perseus-eng1',
    aboutExtra: [],
  },
  ...LATIN_TRACTATES.map((t): WorkEntry => {
    const base = t.workId.replace(/-la$/, '');
    return {
      workId: t.workId,
      rawFile: `stoa0058.${TRACTATE_CTS[base]!.split('.')[1]}.perseus-lat1.xml`,
      title: TRACTATE_TITLES[base]!,
      language: 'la',
      kind: 'tractate-la',
      cts: `${TRACTATE_CTS[base]}.perseus-lat1`,
      aboutExtra: [],
    };
  }),
  ...ENGLISH_TRACTATES.map((t): WorkEntry => {
    const base = t.workId.replace(/-en$/, '');
    return {
      workId: t.workId,
      rawFile: `stoa0058.${TRACTATE_CTS[base]!.split('.')[1]}.perseus-eng1.xml`,
      title: TRACTATE_TITLES[base]!,
      language: 'en',
      kind: 'tractate-en',
      cts: `${TRACTATE_CTS[base]}.perseus-eng1`,
      aboutExtra: [
        {
          heading: 'A note on this translation\'s catalogue status',
          paragraphs: [
            "This repository's own __cts__.xml metadata for this tractate lists only the Latin edition as a registered <edition>; no <translation> is formally registered for the English text. A complete " +
              `"...${t.workId.endsWith('-en') ? 'perseus-eng1.xml' : ''}" file - the same 1918 Stewart & Rand translation, carrying the same teiHeader attribution (editor H. F. Stewart, 1918, William Heinemann Ltd. / Harvard University Press) as the Consolation's own English text - sits in the same source directory and was fetched and used here. This is disclosed rather than silently presented as an equally-catalogued edition.`,
          ],
        },
      ],
    };
  }),
];

function fail(msg: string): never {
  process.stderr.write(`STOP (import-boethius): ${msg}\n`);
  process.exit(1);
}

function readRaw(rawFile: string): string {
  const p = join(RAW_DIR, rawFile);
  if (!existsSync(p)) fail(`raw file not found: ${p} - run scripts/import-boethius/fetch.ts first`);
  return readFileSync(p, 'utf8');
}

function countChars(work: GenericWork): number {
  let n = 0;
  const walk = (divs: GenericWork['divisions']): void => {
    for (const d of divs) {
      for (const p of d.passages) n += p.text.length;
      walk(d.children);
    }
  };
  walk(work.divisions);
  return n;
}

function firstLastWords(work: GenericWork, n = 10): { first: string; last: string } {
  const flat: string[] = [];
  const walk = (divs: GenericWork['divisions']): void => {
    for (const d of divs) {
      for (const p of d.passages) flat.push(p.text);
      walk(d.children);
    }
  };
  walk(work.divisions);
  const first = flat[0] ?? '';
  const last = flat[flat.length - 1] ?? '';
  const firstWords = first.split(/\s+/).slice(0, n).join(' ');
  const lastWords = last.split(/\s+/).slice(-n).join(' ');
  return { first: firstWords, last: lastWords };
}

function buildAbout(entry: WorkEntry, work: GenericWork): WorkAbout {
  const isLatin = entry.language === 'la';
  const structureNote =
    entry.kind === 'consolatio-la' || entry.kind === 'consolatio-en'
      ? 'Divisions: book-N (5 books) > book-N-sec-<number> (the edition\'s own Prosa/Metrum section numbering; see the importer\'s own module doc for the exact, source-verified scheme in each language - the two languages number their sections differently and are never forced to agree).'
      : 'Divisions: a flat list of chapters (ch-pr, ch-1, ch-2, ...) or, where the source marks none, a single division ch-1 - see the importer\'s own module doc for which of the five tractates has real chapter divisions in this edition.';

  const sections: WorkAboutSection[] = [
    {
      heading: 'About this edition',
      paragraphs: [
        entry.kind.startsWith('consolatio')
          ? "Boethius's Consolation of Philosophy, written in prison c. 523-524 while awaiting execution on a charge of treason: a dialogue in alternating prose and verse between the condemned author and the personified figure of Philosophy, on fortune, fate, providence and the true nature of happiness."
          : `One of Boethius's theological tractates (Opuscula sacra): ${entry.title}.`,
        `The text here is ${isLatin ? "Stewart & Rand's Latin critical text" : "Stewart & Rand's (Consolation: the 1609 'I. T.' translation as revised by H. F. Stewart) English translation"}, verbatim throughout. Nothing is modernised, paraphrased or silently corrected.`,
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [LOEB_EDITION + '.', structureNote],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is ${entry.cts}.xml from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'See this importer\'s own module doc comments (scripts/import-boethius/parseConsolatioLa.ts, parseConsolatioEn.ts, parseTractateLa.ts, parseTractateEn.ts) for the complete, source-verified account of this specific work\'s markup and every editorial decision made while reading it. In every case: entities are decoded and whitespace collapsed; transport scaffolding (page breaks, the Loeb edition\'s own facing-page line-count ticks) is dropped; nothing is added to or removed from the actual reading text beyond what each importer\'s doc comment discloses.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Division.ref and Passage.ref are null throughout every one of these twelve works: none of these sources carries a page-marker or line-milestone citation scheme this schema could use. Citation here is by the division id alone (Book/section for the Consolatio, chapter for the tractates), matching each edition\'s own numbering exactly.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `${work.divisions.length} top-level division(s) in this work; see anomalies.json for the complete, machine-readable log of every irregularity encountered while importing it (with location and excerpt), and this importer's own module doc comments for the narrative account.`,
      ],
    },
    ...entry.aboutExtra,
  ];

  const about: WorkAbout = {
    workId: entry.workId,
    title: entry.title,
    author: 'Anicius Manlius Severinus Boethius',
    language: entry.language,
    edition: LOEB_EDITION,
    provenance: PROVENANCE_COMMON,
    license: LICENSE_COMMON,
    sections,
  };
  if (isLatin) about.editor = 'H. F. Stewart and E. K. Rand';
  else about.translator = entry.kind === 'consolatio-en' ? '"I. T." (1609), revised by H. F. Stewart' : 'H. F. Stewart';
  return about;
}

function writeJson(dir: string, name: string, data: unknown): number {
  const file = join(dir, name);
  const text = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(file, text, 'utf8');
  return Buffer.byteLength(text, 'utf8');
}

export function main(): void {
  const report: string[] = [];
  for (const entry of WORKS) {
    const xml = readRaw(entry.rawFile);
    let result: { work: GenericWork; anomalies: Anomaly[] };
    switch (entry.kind) {
      case 'consolatio-la':
        result = parseConsolatioLa(xml);
        break;
      case 'consolatio-en':
        result = parseConsolatioEn(xml);
        break;
      case 'tractate-la':
        result = parseLatinTractate(entry.workId, xml);
        break;
      case 'tractate-en':
        result = parseEnglishTractate(entry.workId, xml);
        break;
    }
    const { work, anomalies } = result;
    if (work.workId !== entry.workId) fail(`${entry.workId}: parser returned workId ${work.workId}`);

    const outDir = join(DATA_ROOT, entry.workId);
    mkdirSync(outDir, { recursive: true });

    const about = buildAbout(entry, work);
    const typesTs = emitTypesTs(entry.workId, entry.title, entry.language, entry.kind.startsWith('consolatio'));

    const wBytes = writeJson(outDir, 'work.json', work);
    writeJson(outDir, 'about.json', about);
    writeJson(outDir, 'anomalies.json', anomalies);
    writeFileSync(join(outDir, 'types.ts'), typesTs, 'utf8');

    const chars = countChars(work);
    const { first, last } = firstLastWords(work);
    report.push(
      `${entry.workId.padEnd(32)} ${work.divisions.length.toString().padStart(2)} top-level div(s)  ${chars.toString().padStart(7)} chars  ${anomalies.length.toString().padStart(2)} anomalies  (${(wBytes / 1024).toFixed(1)} KB)\n` +
        `  first: ${first}\n  last:  ${last}`,
    );
  }

  process.stdout.write('\n=== import:boethius ===\n\n');
  process.stdout.write(report.join('\n\n') + '\n');
  process.stdout.write('\nDone. Run `npx tsx scripts/import-boethius/validate.ts` next.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
