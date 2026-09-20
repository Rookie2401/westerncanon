/**
 * Cicero, Epistulae ad Quintum Fratrem - Latin, CURATED SELECTION (a single
 * letter). Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi058.perseus-lat1 (ed. Purser).
 *
 *   npm run import:ad-quintum-fratrem-selection-la
 *
 * Reads scripts/import-ad-quintum-fratrem-selection-la/raw/phi0474.phi058.perseus-lat1.xml
 * and writes data/ad-quintum-fratrem-selection-la/{work,about,anomalies}.json.
 * Then run `npm run validate:ad-quintum-fratrem-selection-la`.
 *
 * Selection: 1.1 only - Cicero's long letter of paternal advice to his
 * brother Quintus on provincial governorship.
 *
 * Confirmed by direct inspection: this source's book-level division uses
 * subtype="Book" (capitalised), same as Ad Familiares/Ad Brutum (Ad Atticum
 * alone uses lowercase "book") - see scripts/import-cicero-letters-shared/
 * latin.ts's module doc. The three `n="1" subtype="letter"` divs found in
 * this file are letter 1 of Books I, II and III respectively (normal - each
 * book has its own letter 1), NOT a duplication bug; contrast the English
 * sibling importer's module doc, which documents a genuine whole-file
 * duplication found ONLY in the English source.
 *
 * Division scheme, faithfulness rules and Passage granularity (one per
 * Perseus section) are identical to data/ad-atticum-selection-la - see that
 * importer's and data/ad-quintum-fratrem-selection-la/types.ts's module docs.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLatinSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { PURSER_CITATIONS, PURSER_LICENSE, SHUCKBURGH_CITATION } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-quintum-fratrem-selection-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi058.perseus-lat1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-quintum-fratrem-selection-la');
const WORK_ID = 'ad-quintum-fratrem-selection-la';

const SELECTION: BookSelector[] = [{ book: 1, letters: ['1'] }];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const result = extractLatinSelection(xml, 'Book', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-quintum-fratrem-selection-la / structure',
    note: `${result.totalNotes} <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); ${result.totalGaps} <gap reason="omitted"/> marker(s) encountered within the extracted letter.`,
  });
  anomalies.push({
    where: 'ad-quintum-fratrem-selection-la / duplicate-div investigation',
    note:
      'Three <div type="textpart" n="1" subtype="letter"> divs exist in this source, one nested under each of Book I, II and III (each book has its own letter numbered 1) - a normal, expected structure, NOT a duplication bug. This is confirmed genuinely different from the English sibling source, which does have a real whole-file duplication bug - see data/ad-quintum-fratrem-selection-en/anomalies.json.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Epistulae ad Quintum Fratrem (Selection)',
    author: 'M. Tullius Cicero',
    language: 'la',
    editor: 'Louis Claude Purser',
    edition: 'Oxford: Clarendon Press, 1901 (Epistulae, Vol. III)',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi058.perseus-lat1), which digitises ${PURSER_CITATIONS.phi058} Imported by scripts/import-ad-quintum-fratrem-selection-la.`,
    license: PURSER_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Epistulae ad Quintum Fratrem. It bundles a single letter personally chosen by the app’s owner: 1.1, Cicero’s long letter of paternal advice to his brother Quintus on the conduct of provincial government. The full collection (three books, more than twenty further letters) exists but is not bundled in this edition.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `Latin text: ${PURSER_CITATIONS.phi058}`,
          'English translation (companion edition, data/ad-quintum-fratrem-selection-en): ' + SHUCKBURGH_CITATION,
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi058.perseus-lat1.xml (CTS urn:cts:latinLit:phi0474.phi058.perseus-lat1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letter is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book (<div subtype="Book"> - capitalised in this source), letter (<div subtype="letter">) and section (<div subtype="section">) divisions and collects every section’s paragraph text in document order into one Passage per section. Typographic/critical-apparatus wrapper tags (<reg>, <del>, <add>, <hi>, <foreign>, <quote>, <date>) are unwrapped, keeping their text. Self-closing <milestone/>, <pb/> and <lb/> transport markers are dropped. The source’s own inline <label rend="opener"> is captured separately as the Division’s sourceHeading.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter ("1.1"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 1.1". Division.ref is always null. The Division carries one Passage per Perseus section sub-division within the letter; Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full list. The English sibling source (data/ad-quintum-fratrem-selection-en) has a confirmed whole-file duplication bug (its entire letter content is printed twice, wrapped in two erroneous top-level divs) that this Latin source does NOT share - see that work’s about.json for the investigation.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-quintum-fratrem-selection-la` next.\n');
}

main();
