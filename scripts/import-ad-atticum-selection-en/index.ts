/**
 * Cicero, Letters to Atticus - English, CURATED SELECTION (not the full
 * collection). Perseus/OpenGreekAndLatin canonical-latinLit, CTS urn
 * urn:cts:latinLit:phi0474.phi057.perseus-eng1 (trans. Evelyn S.
 * Shuckburgh, 1899-1900).
 *
 *   npm run import:ad-atticum-selection-en
 *
 * Reads scripts/import-ad-atticum-selection-en/raw/phi0474.phi057.perseus-eng1.xml
 * (fetched once, bundled in the repo) and writes:
 *   data/ad-atticum-selection-en/work.json
 *   data/ad-atticum-selection-en/about.json
 *   data/ad-atticum-selection-en/anomalies.json
 *
 * Then run `npm run validate:ad-atticum-selection-en`.
 *
 * Selection (same letters as the Latin sibling data/ad-atticum-selection-la
 * - see that importer's module doc): 2.19, 3.10, 3.15, 7.10, 7.11, 9.10,
 * and every letter in Books 12-16, determined by scanning this English
 * source itself (Shuckburgh's own div structure), independently of the
 * Latin source's own (different) letter tokens - see
 * scripts/import-cicero-letters-shared/english.ts's module doc for why:
 * Shuckburgh arranges the WHOLE correspondence in strict chronological
 * order and, where a single traditional letter was written/sent in more
 * than one sitting, splits it across non-adjacent `<div>`s keyed
 * `letter=<N>.<section-range>`; this importer reconstructs each traditional
 * letter from its fragment(s) and reports every fragment as a separate
 * Passage, in section order - see about.json.
 *
 * Division scheme: see data/ad-atticum-selection-en/types.ts. Every
 * Division carries one Passage per underlying source fragment (almost
 * always exactly one; a handful of Book 12/13/15/16 letters are split into
 * more - kept CONSISTENT with this rule across all four English works in
 * this import group, and documented per-letter in anomalies.json).
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractEnglishSelection, type BookSelector } from '../import-cicero-letters-shared/select.ts';
import { sortDivisionsByBookLetter } from '../import-cicero-letters-shared/division.ts';
import { writeJson, fail } from '../import-cicero-letters-shared/io.ts';
import { SHUCKBURGH_CITATION, SHUCKBURGH_LICENSE, PURSER_CITATIONS } from '../import-cicero-letters-shared/citations.ts';
import type { GenericWork, WorkAbout } from '../../data/ad-atticum-selection-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi057.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'ad-atticum-selection-en');
const WORK_ID = 'ad-atticum-selection-en';

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

  const result = extractEnglishSelection(xml, 'A', SELECTION);
  if (result.divisions.length === 0) fail('no divisions extracted - something is badly wrong');

  sortDivisionsByBookLetter(result.divisions);

  const anomalies = [...result.anomalies];
  anomalies.push({
    where: 'ad-atticum-selection-en / structure',
    note: `${result.totalNotes} <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); ${result.epigraphsExcluded} <epigraph> editorial headnote(s) excluded entirely; ${result.fragmentedLetterCount} letter(s) were reassembled from more than one source fragment (see the per-letter entries above); ${result.duplicatesDropped} exact-duplicate div(s) dropped.`,
  });
  anomalies.push({
    where: 'ad-atticum-selection-en / edition divergence from the Latin sibling',
    note:
      "This English edition's Book 12-16 Division set does not match data/ad-atticum-selection-la's 1:1: Purser's Latin critical text subdivides several traditionally single-numbered letters into lettered sub-letters (e.g. 12.5 -> 5, 5A, 5B, 5C) that Shuckburgh's translation does not split the same way (it instead sometimes re-splits ONE traditional letter across non-adjacent chronological positions by section range, reassembled here into a single Division with multiple Passages). This is a genuine, confirmed edition difference, not a parsing error - see about.json.",
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: result.divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Letters to Atticus (Selection)',
    author: 'M. Tullius Cicero',
    language: 'en',
    translator: 'Evelyn S. Shuckburgh',
    edition: 'London: George Bell & Sons, 1899–1900',
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi057.perseus-eng1), which digitises ${SHUCKBURGH_CITATION} Imported by scripts/import-ad-atticum-selection-en.`,
    license: SHUCKBURGH_LICENSE,
    sections: [
      {
        heading: 'A curated selection, not the full collection',
        paragraphs: [
          'This is NOT the complete Letters to Atticus. It bundles a small set of letters personally chosen by the app’s owner as especially significant or rewarding reading, drawn from within the full 16-book, several-hundred-letter correspondence. The full collection (hundreds more letters) exists but is not bundled in this edition.',
          'Exactly these letters are included: 2.19; 3.10; 3.15; 7.10; 7.11; 9.10; and every letter in Books 12, 13, 14, 15 and 16 (the closing books of the correspondence, covering the last eighteen months of Cicero’s life). Nothing outside this list is present.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          `English translation: ${SHUCKBURGH_CITATION}`,
          `Latin text (companion edition, data/ad-atticum-selection-la): ${PURSER_CITATIONS.phi057}`,
          'Shuckburgh’s own volume presents the whole correspondence in strict chronological order across all of Cicero’s letter collections, not grouped by book/addressee - and, where a single traditionally-numbered letter was written or sent in more than one sitting, sometimes prints its parts at their separate chronological places rather than together. This app’s edition re-sorts the selected letters into traditional book.letter order and reassembles any such split letter into one Division (with one Passage per part, in the letter’s own internal section order) for clearer navigation - see "How it was imported".',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is phi0474.phi057.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi057.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and only the selected letters below are bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This source lists every letter as a flat, non-nested <div n="text=A:book=B:letter=L" type="letter"> directly under <body>, in Shuckburgh’s own chronological print order (not grouped by book). For each requested book.letter the importer collects every div whose book/letter token names that traditional letter (either directly, e.g. "19", or as a numbered fragment of it, e.g. "5.1-2", "5.4" for traditional letter 5), orders the fragments by their own leading section number, and turns each fragment into one Passage of a single reconstructed Division. <head> (Shuckburgh’s own numbering, with a Perseus-added traditional-citation gloss) is dropped - this app generates its own book.letter citation. <opener> (a salute + dateline line printed before most letters) is captured separately as the Division’s sourceHeading, not mixed into the reading text; when a letter has more than one fragment only the first (section-ascending) fragment’s heading is kept as sourceHeading, and the others are noted in anomalies.json rather than silently dropped. <epigraph> (an editorial headnote some letters carry - biographical/contextual prose, not Cicero’s or Atticus’s own words) is excluded entirely. <note> (Shuckburgh’s own translator/editor footnotes, including embedded <bibl> citations) is discarded entirely, tag and content. Purely typographic wrapper tags (<foreign>, <quote>/<l>/<lg> verse, <emph>, <title>, <placeName>) are unwrapped, keeping their text; self-closing <pb/> and <milestone/> page-break markers are dropped.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by traditional book.letter (e.g. "12.19"), reconstructed as this app’s own Division.number - not a plain arabic numeral, so it renders as "§ 12.19" rather than being mistaken for a chapter number. Division.ref is always null. Each Division carries one Passage per underlying source fragment (almost always exactly one; see "Known gaps & anomalies" for the handful that are not); Passage.n is always empty and Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: this English edition’s Book 12-16 Division count does not match the Latin sibling’s 1:1 - Purser’s Latin critical text splits several traditional letters into lettered sub-letters that Shuckburgh does not split the same way; this is a genuine, confirmed edition difference (see data/ad-atticum-selection-la’s about.json), not a parsing error.',
          'A handful of Book 12/13/15/16 letters are themselves printed by Shuckburgh at more than one chronological position (because he believed different parts of the traditional letter were written at different times); this importer reassembles each into one Division with multiple Passages, in section order, and records the reassembly in anomalies.json for every letter affected.',
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
  process.stdout.write('\nDone. Run `npm run validate:ad-atticum-selection-en` next.\n');
}

main();
