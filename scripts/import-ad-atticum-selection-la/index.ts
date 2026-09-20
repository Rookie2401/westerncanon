/**
 * Cicero, Epistulae ad Atticum - Latin, CURATED SELECTION (not the full
 * collection). Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi057.perseus-lat1 (ed. Purser).
 *
 *   npm run import:ad-atticum-selection-la
 *
 * Reads scripts/import-ad-atticum-selection-la/raw/phi0474.phi057.perseus-lat1.xml
 * (fetched once from raw.githubusercontent.com/PerseusDL/canonical-latinLit,
 * bundled in the repo; nothing is downloaded at import time) and writes:
 *   data/ad-atticum-selection-la/work.json
 *   data/ad-atticum-selection-la/about.json
 *   data/ad-atticum-selection-la/anomalies.json
 *
 * Then run `npm run validate:ad-atticum-selection-la`.
 *
 * Selection (personally chosen by the app's owner - see about.json): 2.19,
 * 3.10, 3.15, 7.10, 7.11, 9.10, and every letter in Books 12-16. "Every
 * letter" means every letter TOKEN Purser's own edition actually contains
 * for that book, scanned from the source itself, not assumed to be a
 * gapless 1..N run - Purser's critical text subdivides several
 * traditionally single-numbered letters into lettered parts (e.g. 12.5 ->
 * 5, 5A, 5B, 5C), and every part actually present becomes its own Division
 * here, verbatim - see about.json's "Known gaps & anomalies".
 *
 * Division scheme: see data/ad-atticum-selection-la/types.ts. Ad Atticum's
 * own book-level `<div subtype="book">` uses LOWERCASE "book" in this
 * source (confirmed by direct inspection; Ad Familiares/Quintum Fratrem/
 * Brutum all use capitalised "Book" instead - see scripts/import-cicero-
 * letters-shared/latin.ts's module doc).
 *
 * Each Division carries one Passage per Perseus `subtype="section"`
 * sub-division within that letter (this collection's chosen granularity -
 * see about.json "Reference scheme"; kept CONSISTENT across all four Latin
 * works in this import group).
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLatinSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { PURSER_CITATIONS, PURSER_LICENSE, SHUCKBURGH_CITATION } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-atticum-selection-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi057.perseus-lat1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-atticum-selection-la');
const WORK_ID = 'ad-atticum-selection-la';

const SELECTION: BookSelector[] = [
  { book: 2, letters: ['19'] },
  { book: 3, letters: ['10', '15'] },
  { book: 7, letters: ['10', '11'] },
  { book: 9, letters: ['10'] },
  { book: 12, letters: 'ALL' },
  { book: 13, letters: 'ALL' },
  { book: 14, letters: 'ALL' },
  { book: 15, letters: 'ALL' },
  { book: 16, letters: 'ALL' },
];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const result = extractLatinSelection(xml, 'book', SELECTION);

  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');

  // Order by (book, letter) ascending - not the order requested/scanned.
  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-atticum-selection-la / structure',
    note: `${result.totalNotes} <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); ${result.totalGaps} <gap reason="omitted"/> marker(s) encountered within extracted letters (see the per-letter entries above for which).`,
  });
  anomalies.push({
    where: 'ad-atticum-selection-la / edition divergence from the English sibling',
    note:
      "Purser's Latin critical edition subdivides several traditionally single-numbered letters in Books 12-16 into lettered sub-letters that this app treats as separate Divisions (e.g. 12.5 -> 5, 5A, 5B, 5C; also 12.18/18A, 12.37/37A, 12.38/38A, 13.2/2A/2B, 13.6/6A, 13.7/7A, 13.21/21A, 13.33/33A, 13.47/47A, 14.13/13A/13B, 14.17/17A, 15.1/1A, 15.4/4A, 15.16/16A, 16.13/13A, 16.16/16A/16B/16C/16D/16E/16F). Shuckburgh's English translation (data/ad-atticum-selection-en) does not split the same way and instead sometimes re-splits a single traditional letter across non-adjacent chronological positions by section range. The two editions' Division counts for Books 12-16 therefore differ; this is a genuine, confirmed edition difference, not a parsing error - see about.json.",
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Epistulae ad Atticum (Selection)',
    author: 'M. Tullius Cicero',
    language: 'la',
    editor: 'Louis Claude Purser',
    edition: 'Oxford: Clarendon Press, 1903 (Epistulae, Vol. II, Pars Prior and Pars Posterior)',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi057.perseus-lat1), which digitises ${PURSER_CITATIONS.phi057} Imported by scripts/import-ad-atticum-selection-la.`,
    license: PURSER_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Epistulae ad Atticum. It bundles a small set of letters personally chosen by the app’s owner as especially significant or rewarding reading, drawn from within the full 16-book, several-hundred-letter correspondence. The full collection (hundreds more letters) exists but is not bundled in this edition.',
          'Exactly these letters are included: 2.19; 3.10; 3.15; 7.10; 7.11; 9.10; and every letter in Books 12, 13, 14, 15 and 16 (the closing books of the correspondence, covering the last eighteen months of Cicero’s life). Nothing outside this list is present.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `Latin text: ${PURSER_CITATIONS.phi057}`,
          'English translation (companion edition, data/ad-atticum-selection-en): ' + SHUCKBURGH_CITATION,
          'Shuckburgh’s own volume presents the whole correspondence in strict chronological order across all of Cicero’s letter collections, not grouped by book/addressee. This app’s edition re-sorts the selected letters into traditional book.letter order instead, for clearer navigation within a single addressee-collection.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi057.perseus-lat1.xml (CTS urn:cts:latinLit:phi0474.phi057.perseus-lat1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letters below are bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book (Purser’s own <div subtype="book">), letter (<div subtype="letter">) and section (<div subtype="section">) divisions and, for each requested book.letter, collects every section’s paragraph text in document order into one Passage per section. Typographic/critical-apparatus wrapper tags (<reg>, <del>, <add>, <sic>, <corr>, <choice>, <abbr>, <expan>, <hi>, <foreign>, <quote>, <date>) are unwrapped, keeping their text - these are Purser’s own printed reading text, including his editorially marked deletions/additions, which this importer does not re-edit. Self-closing <milestone/>, <pb/> and <lb/> transport markers are dropped. The source’s own inline <label rend="opener"> (a dateline + salute line Purser prints before most letters) is captured separately as each Division’s sourceHeading, not mixed into the reading text.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter (e.g. "12.19"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 12.19" rather than being mistaken for a chapter number. Division.ref is always null (no finer citation is tracked). Each Division carries one Passage per Perseus section sub-division within that letter (this collection’s chosen granularity, consistent across all four Latin works in this import group); Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: Purser’s critical edition subdivides several traditionally single-numbered letters in Books 12-16 into lettered sub-letters (e.g. 12.5 -> 5, 5A, 5B, 5C); every part actually present in the source is kept as its own Division here, verbatim, not merged or renumbered. This produces more Division entries in this Latin edition than in the English sibling for the same book ranges, which is a genuine, confirmed edition difference (see the Shuckburgh translation’s own further chronological re-splitting), not a parsing error.',
          'A small number of <gap reason="omitted"/> markers appear within the extracted letters where Purser’s own edition omits text; nothing is fabricated in their place - see anomalies.json for exactly which letters.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-atticum-selection-la` next.\n');
}

main();
