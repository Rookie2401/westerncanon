/**
 * Cicero, Epistulae ad M. Brutum - Latin, CURATED SELECTION (two letters).
 * Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi059.perseus-lat1 (ed. Purser).
 *
 *   npm run import:ad-brutum-selection-la
 *
 * Reads scripts/import-ad-brutum-selection-la/raw/phi0474.phi059.perseus-lat1.xml
 * and writes data/ad-brutum-selection-la/{work,about,anomalies}.json.
 * Then run `npm run validate:ad-brutum-selection-la`.
 *
 * Selection: 1.16, 1.17 only.
 *
 * Confirmed by direct inspection: this source's book-level division uses
 * subtype="Book" (capitalised), same as Ad Familiares/Ad Quintum Fratrem
 * (Ad Atticum alone uses lowercase "book") - see scripts/import-cicero-
 * letters-shared/latin.ts's module doc. Neither 1.16 nor 1.17 is one of
 * this collection's fragmented letters (Book 1 letters 2, 3 and 4 are, per
 * the English sibling's own div structure - not requested here).
 *
 * Division scheme, faithfulness rules and Passage granularity (one per
 * Perseus section) are identical to data/ad-atticum-selection-la - see that
 * importer's and data/ad-brutum-selection-la/types.ts's module docs.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLatinSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { PURSER_CITATIONS, PURSER_LICENSE, SHUCKBURGH_CITATION } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-brutum-selection-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi059.perseus-lat1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-brutum-selection-la');
const WORK_ID = 'ad-brutum-selection-la';

const SELECTION: BookSelector[] = [{ book: 1, letters: ['16', '17'] }];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const result = extractLatinSelection(xml, 'Book', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-brutum-selection-la / structure',
    note: `${result.totalNotes} <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); ${result.totalGaps} <gap reason="omitted"/> marker(s) encountered within the extracted letters.`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Epistulae ad M. Brutum (Selection)',
    author: 'M. Tullius Cicero',
    language: 'la',
    editor: 'Louis Claude Purser',
    edition: 'Oxford: Clarendon Press, 1901 (Epistulae, Vol. III)',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi059.perseus-lat1), which digitises ${PURSER_CITATIONS.phi059} Imported by scripts/import-ad-brutum-selection-la.`,
    license: PURSER_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Epistulae ad M. Brutum. It bundles two letters personally chosen by the app’s owner: 1.16 and 1.17 - Brutus’s frank letter of political disagreement with Cicero over the treatment of Antony and Octavian, and Cicero’s long reply defending his policy. The full collection (two books, more than twenty further letters) exists but is not bundled in this edition.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `Latin text: ${PURSER_CITATIONS.phi059}`,
          'English translation (companion edition, data/ad-brutum-selection-en): ' + SHUCKBURGH_CITATION,
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi059.perseus-lat1.xml (CTS urn:cts:latinLit:phi0474.phi059.perseus-lat1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letters are bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book (<div subtype="Book"> - capitalised in this source), letter (<div subtype="letter">) and section (<div subtype="section">) divisions and collects every section’s paragraph text in document order into one Passage per section. Typographic/critical-apparatus wrapper tags (<reg>, <del>, <add>, <hi>, <foreign>, <quote>, <date>) are unwrapped, keeping their text. Self-closing <milestone/>, <pb/> and <lb/> transport markers are dropped. The source’s own inline <label rend="opener"> is captured separately as each Division’s sourceHeading.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter (e.g. "1.16"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 1.16". Division.ref is always null. Each Division carries one Passage per Perseus section sub-division within that letter; Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json. Neither selected letter (1.16, 1.17) is one of this collection’s letters that are split into sections at different chronological positions in the English sibling edition (that affects Book 1 letters 2, 3 and 4, none of which are part of this selection) - so both editions’ Divisions for this work correspond 1:1.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-brutum-selection-la` next.\n');
}

main();
