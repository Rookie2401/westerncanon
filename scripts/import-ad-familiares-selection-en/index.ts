/**
 * Cicero, Letters to his Friends - English, CURATED SELECTION (not the
 * full collection). Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi056.perseus-eng1 (trans. Evelyn S.
 * Shuckburgh, 1899-1900).
 *
 *   npm run import:ad-familiares-selection-en
 *
 * Reads scripts/import-ad-familiares-selection-en/raw/phi0474.phi056.perseus-eng1.xml
 * and writes data/ad-familiares-selection-en/{work,about,anomalies}.json.
 * Then run `npm run validate:ad-familiares-selection-en`.
 *
 * Selection: same letters as the Latin sibling data/ad-familiares-selection-la
 * (see that importer's module doc), determined independently by scanning
 * this English source's own flat `<div n="text=F:book=B:letter=L">`
 * structure - same reassembly-of-chronological-fragments technique as
 * data/ad-atticum-selection-en (see scripts/import-cicero-letters-shared/
 * english.ts's module doc); Book 10 of this collection is itself split this
 * way for two of its traditional letters (21 and 34).
 *
 * Division scheme, faithfulness rules and Passage granularity (one per
 * underlying source fragment) are identical to data/ad-atticum-selection-en
 * - see that importer's and data/ad-familiares-selection-en/types.ts's
 * module docs.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractEnglishSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { SHUCKBURGH_CITATION, SHUCKBURGH_LICENSE, PURSER_CITATIONS } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-familiares-selection-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi056.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-familiares-selection-en');
const WORK_ID = 'ad-familiares-selection-en';

const SELECTION: BookSelector[] = [
  { book: 1, letters: ['9'] },
  { book: 4, letters: ['5', '6'] },
  { book: 5, letters: ['12'] },
  { book: 7, letters: ['1'] },
  { book: 9, letters: ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26'] },
  { book: 10, letters: 'ALL' },
  { book: 14, letters: ['1', '2', '3', '4'] },
];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const result = extractEnglishSelection(xml, 'F', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-familiares-selection-en / structure',
    note: `${result.totalNotes} <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); ${result.epigraphsExcluded} <epigraph> editorial headnote(s) excluded entirely; ${result.fragmentedLetterCount} letter(s) were reassembled from more than one source fragment; ${result.duplicatesDropped} exact-duplicate div(s) dropped.`,
  });
  anomalies.push({
    where: 'ad-familiares-selection-en / edition divergence from the Latin sibling (Book 10)',
    note:
      "This English edition's Book 10 Division count (35) is 2 fewer than the Latin sibling data/ad-familiares-selection-la's (37): Purser's Latin critical text splits two traditionally single-numbered letters (10.21, 10.34) into a separate lettered sub-letter each (10.21A, 10.34A), which this app represents as two extra Divisions in the Latin edition; Shuckburgh instead reprints the same two letters' later sections at a separate chronological position without renumbering them, which this English edition reassembles into one Division with two Passages each. Both editions agree these two letters are compound - a genuine, confirmed edition difference, not a parsing error.",
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Letters to his Friends (Selection)',
    author: 'M. Tullius Cicero',
    language: 'en',
    translator: 'Evelyn S. Shuckburgh',
    edition: 'London: George Bell & Sons, 1899–1900',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi056.perseus-eng1), which digitises ${SHUCKBURGH_CITATION} Imported by scripts/import-ad-familiares-selection-en.`,
    license: SHUCKBURGH_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Letters to his Friends. It bundles a small set of letters personally chosen by the app’s owner as especially significant or rewarding reading, drawn from within the full 16-book, several-hundred-letter collection. The full collection (hundreds more letters) exists but is not bundled in this edition.',
          'Exactly these letters are included: 5.12 (to Lucceius); 7.1 (to Marius); 1.9 (to Lentulus Spinther); 4.5 (Servius Sulpicius’s letter of condolence to Cicero) and 4.6 (Cicero’s reply); 14.1-14.4 (to Terentia and family); 9.16-9.26 (the correspondence with Paetus); and every letter in Book 10. Nothing outside this list is present.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `English translation: ${SHUCKBURGH_CITATION}`,
          `Latin text (companion edition, data/ad-familiares-selection-la): ${PURSER_CITATIONS.phi056}`,
          'Shuckburgh’s own volume presents the whole correspondence in strict chronological order across all of Cicero’s letter collections, not grouped by book/addressee. This app’s edition re-sorts the selected letters into traditional book.letter order instead, for clearer navigation.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi056.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi056.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letters below are bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This source lists every letter as a flat, non-nested <div n="text=F:book=B:letter=L" type="letter"> directly under <body>, in Shuckburgh’s own chronological print order. For each requested book.letter the importer collects every div naming that traditional letter (directly, or as a numbered fragment of it, e.g. "21.1-6"/"21.7" for traditional letter 21), orders any fragments by their own leading section number, and turns each fragment into one Passage of a single reconstructed Division. <head> is dropped (this app generates its own citation); <opener> becomes the Division’s sourceHeading; <epigraph> (editorial headnote) is excluded entirely; <note> (translator/editor footnotes, including embedded <bibl>) is discarded entirely. Purely typographic wrapper tags (<foreign>, <quote>/<l>/<lg>, <emph>, <title>, <placeName>) are unwrapped, keeping their text; self-closing <pb/> and <milestone/> are dropped.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter (e.g. "9.16"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 9.16". Division.ref is always null. Each Division carries one Passage per underlying source fragment (almost always exactly one; see "Known gaps & anomalies" for Book 10’s two split letters); Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. Two of Book 10’s traditional letters (21 and 34) are printed by Shuckburgh at more than one chronological position and are reassembled here into one Division each, with multiple Passages in section order - matching (letter-for-letter) the two places Purser’s Latin critical text (data/ad-familiares-selection-la) independently splits the same two letters into a lettered sub-letter each (10.21A, 10.34A). This English edition therefore has 2 fewer Book 10 Divisions than the Latin sibling; a genuine, confirmed edition difference, not a parsing error.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-familiares-selection-en` next.\n');
}

main();
