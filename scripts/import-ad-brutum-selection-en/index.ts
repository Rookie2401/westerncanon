/**
 * Cicero, Letters to Brutus - English, CURATED SELECTION (two letters).
 * Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi059.perseus-eng1 (trans. Evelyn S.
 * Shuckburgh, 1899-1900).
 *
 *   npm run import:ad-brutum-selection-en
 *
 * Reads scripts/import-ad-brutum-selection-en/raw/phi0474.phi059.perseus-eng1.xml
 * and writes data/ad-brutum-selection-en/{work,about,anomalies}.json.
 * Then run `npm run validate:ad-brutum-selection-en`.
 *
 * Selection: 1.16, 1.17 only (same letters as the Latin sibling). This
 * source's own flat `<div n="text=BRUT.:book=B:letter=L">` structure does
 * fragment some Book 1 letters (2, 3, 4) across chronological positions -
 * see scripts/import-cicero-letters-shared/english.ts's module doc for the
 * general technique - but neither requested letter is affected; both are
 * single, unfragmented divs.
 *
 * Division scheme, faithfulness rules and Passage granularity are
 * identical to data/ad-atticum-selection-en - see that importer's and
 * data/ad-brutum-selection-en/types.ts's module docs.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractEnglishSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { SHUCKBURGH_CITATION, SHUCKBURGH_LICENSE, PURSER_CITATIONS } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-brutum-selection-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi059.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-brutum-selection-en');
const WORK_ID = 'ad-brutum-selection-en';

const SELECTION: BookSelector[] = [{ book: 1, letters: ['16', '17'] }];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const result = extractEnglishSelection(xml, 'BRUT.', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-brutum-selection-en / structure',
    note: `${result.totalNotes} <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); ${result.epigraphsExcluded} <epigraph> editorial headnote(s) excluded entirely; ${result.fragmentedLetterCount} of the requested letters were reassembled from more than one source fragment (expected 0 - neither 1.16 nor 1.17 is one of this collection's fragmented letters).`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Letters to Brutus (Selection)',
    author: 'M. Tullius Cicero',
    language: 'en',
    translator: 'Evelyn S. Shuckburgh',
    edition: 'London: George Bell & Sons, 1899–1900',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi059.perseus-eng1), which digitises ${SHUCKBURGH_CITATION} Imported by scripts/import-ad-brutum-selection-en.`,
    license: SHUCKBURGH_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Letters to Brutus. It bundles two letters personally chosen by the app’s owner: 1.16 and 1.17 - Brutus’s frank letter of political disagreement with Cicero over the treatment of Antony and Octavian, and Cicero’s long reply defending his policy. The full collection (two books, more than twenty further letters) exists but is not bundled in this edition.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `English translation: ${SHUCKBURGH_CITATION}`,
          `Latin text (companion edition, data/ad-brutum-selection-la): ${PURSER_CITATIONS.phi059}`,
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi059.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi059.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letters are bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This source lists every letter as a <div n="text=BRUT.:book=B:letter=L" type="letter">; <head> is dropped, <opener> becomes the Division’s sourceHeading, <epigraph> and <note> (translator apparatus) are excluded entirely, and typographic wrapper tags (<foreign>, <quote>, <emph>, <title>, <placeName>) are unwrapped keeping their text. Neither requested letter is fragmented in this source (unlike Book 1 letters 2-4, which are not part of this selection), so each Division here carries exactly one Passage.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter (e.g. "1.16"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 1.16". Division.ref is always null; Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json. No gaps or fragmentation affect this two-letter selection; both editions’ Divisions correspond 1:1.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-brutum-selection-en` next.\n');
}

main();
