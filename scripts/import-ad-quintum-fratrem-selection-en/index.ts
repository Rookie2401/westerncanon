/**
 * Cicero, Letters to his Brother Quintus - English, CURATED SELECTION (a
 * single letter). Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi058.perseus-eng1 (trans. Evelyn S.
 * Shuckburgh, 1899-1900).
 *
 *   npm run import:ad-quintum-fratrem-selection-en
 *
 * Reads scripts/import-ad-quintum-fratrem-selection-en/raw/phi0474.phi058.perseus-eng1.xml
 * and writes data/ad-quintum-fratrem-selection-en/{work,about,anomalies}.json.
 * Then run `npm run validate:ad-quintum-fratrem-selection-en`.
 *
 * Selection: 1.1 only (same letter as the Latin sibling).
 *
 * *** CONFIRMED SOURCE BUG, INVESTIGATED *** - the task that produced this
 * importer flagged that book=1:letter=1 appears to occur twice in this
 * file's raw XML and asked for the cause to be run down rather than
 * silently picking one copy. Direct inspection of the fetched XML shows:
 * `<body>` contains exactly two top-level wrapper divs, `<div n="Q">` and
 * `<div n="FR">` (i.e. the citation prefix "Q FR" used in every letter's own
 * `n="text=Q FR:book=..."` attribute has been split into two separate
 * wrapping elements rather than being a single non-nesting label) - and
 * EVERY letter in Books I-III (27 letters total, not just 1.1) is present,
 * byte-for-byte identical, once inside each wrapper. This is a genuine
 * whole-file duplication bug in the upstream Perseus source, not a
 * structural split of any individual letter and not specific to 1.1 - it
 * just happens to be the first letter in the file, so it was the first
 * place the duplication became visible. scripts/import-cicero-letters-
 * shared/english.ts's flat-div parser strips stray `<div>`/`</div>`
 * wrapper tags generically and scripts/import-cicero-letters-shared/
 * select.ts deduplicates any letter-div seen more than once with identical
 * content, keeping only the first occurrence - confirmed safe here since
 * both copies are byte-identical (see anomalies.json).
 *
 * Division scheme, faithfulness rules and Passage granularity are
 * identical to data/ad-atticum-selection-en - see that importer's and
 * data/ad-quintum-fratrem-selection-en/types.ts's module docs.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractEnglishSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { SHUCKBURGH_CITATION, SHUCKBURGH_LICENSE, PURSER_CITATIONS } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-quintum-fratrem-selection-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi058.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-quintum-fratrem-selection-en');
const WORK_ID = 'ad-quintum-fratrem-selection-en';

const SELECTION: BookSelector[] = [{ book: 1, letters: ['1'] }];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const result = extractEnglishSelection(xml, 'Q FR', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-quintum-fratrem-selection-en / structure',
    note: `${result.totalNotes} <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); ${result.epigraphsExcluded} <epigraph> editorial headnote(s) excluded entirely.`,
  });
  anomalies.push({
    where: 'ad-quintum-fratrem-selection-en / duplicate-div investigation (book=1:letter=1)',
    note:
      'CONFIRMED SOURCE BUG (investigated as requested): this file’s <body> contains two top-level wrapper divs, <div n="Q"> and <div n="FR"> (the "Q FR" citation prefix, apparently meant to be a single non-nesting label, has been split into two wrapping elements). ALL 27 letters of Books I-III are duplicated wholesale, byte-for-byte identical, once inside each wrapper - not a structural split specific to letter 1.1 (it is simply the first letter in the file, so the first place the duplication is visible when scanning for book=1:letter=1). The importer’s shared parser strips stray wrapper <div> tags and deduplicates any letter-div seen more than once with identical content, keeping the first occurrence only; verified byte-identical here, so nothing was lost or double-counted.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Letters to his Brother Quintus (Selection)',
    author: 'M. Tullius Cicero',
    language: 'en',
    translator: 'Evelyn S. Shuckburgh',
    edition: 'London: George Bell & Sons, 1899–1900',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi058.perseus-eng1), which digitises ${SHUCKBURGH_CITATION} Imported by scripts/import-ad-quintum-fratrem-selection-en.`,
    license: SHUCKBURGH_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Letters to his Brother Quintus. It bundles a single letter personally chosen by the app’s owner: 1.1, Cicero’s long letter of paternal advice to his brother Quintus on the conduct of provincial government. The full collection (three books, more than twenty further letters) exists but is not bundled in this edition.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `English translation: ${SHUCKBURGH_CITATION}`,
          `Latin text (companion edition, data/ad-quintum-fratrem-selection-la): ${PURSER_CITATIONS.phi058}`,
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi058.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi058.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letter is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This source lists every letter as a <div n="text=Q FR:book=B:letter=L" type="letter">; <head> is dropped, <opener> becomes the Division’s sourceHeading, <epigraph> and <note> (translator apparatus) are excluded entirely, and typographic wrapper tags (<foreign>, <quote>, <emph>, <title>, <placeName>) are unwrapped keeping their text. See "Known gaps & anomalies" for a confirmed whole-file duplication bug in this specific source that the importer detects and de-duplicates.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter ("1.1"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 1.1". Division.ref is always null; Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'This source has a confirmed whole-file duplication bug: its entire letter content (all 27 letters of Books I-III, not just 1.1) is printed twice, wrapped in two erroneous top-level <div n="Q"> / <div n="FR"> elements that both appear to originate from a single "Q FR" citation-prefix label being split in two during the source’s generation. Both copies are byte-for-byte identical; the importer keeps only the first occurrence. See anomalies.json for the full investigation note.',
        ],
      },
    ],
  };

  writeJson(OUT_DIR, 'work.json', work);
  writeJson(OUT_DIR, 'about.json', about);
  writeJson(OUT_DIR, 'anomalies.json', anomalies);

  process.stdout.write(
    `\n${result.divisions.length} divisions (letters) / ${result.totalPassages} passages / ${result.totalChars} chars.\n`,
  );
  if (result.missing.length > 0) {
    process.stdout.write(`MISSING (${result.missing.length}): ${result.missing.map((m) => `${m.book}.${m.letter}`).join(', ')}\n`);
  }
  process.stdout.write('\nDone. Run `npm run validate:ad-quintum-fratrem-selection-en` next.\n');
}

main();
