/**
 * Cicero, Epistulae ad Familiares - Latin, CURATED SELECTION (not the full
 * collection). Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi056.perseus-lat1 (ed. Purser).
 *
 *   npm run import:ad-familiares-selection-la
 *
 * Reads scripts/import-ad-familiares-selection-la/raw/phi0474.phi056.perseus-lat1.xml
 * and writes data/ad-familiares-selection-la/{work,about,anomalies}.json.
 * Then run `npm run validate:ad-familiares-selection-la`.
 *
 * Selection (personally chosen by the app's owner - see about.json): 5.12
 * (to Lucceius); 7.1 (to Marius); 1.9 (to Lentulus Spinther); 4.5 (Servius
 * Sulpicius to Cicero) and 4.6 (Cicero's reply); 14.1-14.4 (to
 * Terentia/family); 9.16-9.26 (the Paetus correspondence); and every letter
 * in Book 10.
 *
 * IMPORTANT confirmed source quirk (verified by direct inspection, not
 * assumed): unlike Ad Atticum, this collection's own `<div subtype="Book">`
 * uses a CAPITALISED "Book" (Ad Atticum uses lowercase "book") - see
 * scripts/import-cicero-letters-shared/latin.ts's module doc.
 *
 * Division scheme, faithfulness rules and Passage granularity (one per
 * Perseus section) are identical to data/ad-atticum-selection-la - see that
 * importer's and data/ad-familiares-selection-la/types.ts's module docs.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLatinSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { PURSER_CITATIONS, PURSER_LICENSE, SHUCKBURGH_CITATION } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-familiares-selection-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi056.perseus-lat1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-familiares-selection-la');
const WORK_ID = 'ad-familiares-selection-la';

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

  const result = extractLatinSelection(xml, 'Book', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-familiares-selection-la / structure',
    note: `${result.totalNotes} <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); ${result.totalGaps} <gap reason="omitted"/> marker(s) encountered within extracted letters (see the per-letter entries above for which).`,
  });
  anomalies.push({
    where: 'ad-familiares-selection-la / book subtype casing',
    note: 'Confirmed by direct inspection: this source’s book-level division uses subtype="Book" (capitalised), unlike Ad Atticum’s lowercase subtype="book". Not a typo; handled explicitly by the importer.',
  });
  anomalies.push({
    where: 'ad-familiares-selection-la / edition divergence from the English sibling (Book 10)',
    note:
      "Purser's Latin critical text splits two of Book 10's traditionally single-numbered letters into a lettered sub-letter each - 10.21/10.21A and 10.34/10.34A - matching (letter-for-letter) the two places Shuckburgh's English translation (data/ad-familiares-selection-en) independently re-splits the same two traditional letters across non-adjacent chronological positions by section range. Both editions agree these two letters are compound; this app represents Purser's split as two separate Divisions (10.21, 10.21a, 10.34, 10.34a) and Shuckburgh's split as two Passages within one Division each - a genuine, confirmed edition difference in Division count, not a parsing error.",
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Epistulae ad Familiares (Selection)',
    author: 'M. Tullius Cicero',
    language: 'la',
    editor: 'Louis Claude Purser',
    edition: 'Oxford: Clarendon Press, 1901 (Epistulae, Vol. 1)',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi056.perseus-lat1), which digitises ${PURSER_CITATIONS.phi056} Imported by scripts/import-ad-familiares-selection-la.`,
    license: PURSER_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Epistulae ad Familiares. It bundles a small set of letters personally chosen by the app’s owner as especially significant or rewarding reading, drawn from within the full 16-book, several-hundred-letter collection. The full collection (hundreds more letters) exists but is not bundled in this edition.',
          'Exactly these letters are included: 5.12 (to Lucceius); 7.1 (to Marius); 1.9 (to Lentulus Spinther); 4.5 (Servius Sulpicius’s letter of condolence to Cicero) and 4.6 (Cicero’s reply); 14.1-14.4 (to Terentia and family); 9.16-9.26 (the correspondence with Paetus); and every letter in Book 10. Nothing outside this list is present.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `Latin text: ${PURSER_CITATIONS.phi056}`,
          'English translation (companion edition, data/ad-familiares-selection-en): ' + SHUCKBURGH_CITATION,
          'Shuckburgh’s own volume presents the whole correspondence in strict chronological order across all of Cicero’s letter collections, not grouped by book/addressee. This app’s edition re-sorts the selected letters into traditional book.letter order instead, for clearer navigation within a single collection.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi056.perseus-lat1.xml (CTS urn:cts:latinLit:phi0474.phi056.perseus-lat1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letters below are bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book (<div subtype="Book"> - capitalised in this source, see the importer’s module doc), letter (<div subtype="letter">) and section (<div subtype="section">) divisions and, for each requested book.letter, collects every section’s paragraph text in document order into one Passage per section. Typographic/critical-apparatus wrapper tags (<reg>, <del>, <add>, <sic>, <corr>, <hi>, <foreign>, <quote>, <date>) are unwrapped, keeping their text - Purser’s own printed reading text, not re-edited here. Self-closing <milestone/>, <pb/> and <lb/> transport markers are dropped. The source’s own inline <label rend="opener"> (a dateline + salute line) is captured separately as each Division’s sourceHeading.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter (e.g. "9.16"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 9.16" rather than being mistaken for a chapter number. Division.ref is always null. Each Division carries one Passage per Perseus section sub-division within that letter (consistent across all four Latin works in this import group); Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list, including a small number of <gap reason="omitted"/> markers where Purser’s own edition omits text within an extracted letter.',
          'Book 10’s Division count (37, vs. 35 in the English sibling data/ad-familiares-selection-en) differs because Purser splits two traditionally single-numbered letters (10.21, 10.34) into a lettered sub-letter each (10.21A, 10.34A) where Shuckburgh instead reprints the same two letters’ later sections at a separate chronological position without renumbering them - both editions agree these two letters are compound; this is a genuine, confirmed edition difference, not a parsing error.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-familiares-selection-la` next.\n');
}

main();
