/**
 * Dante, *La Divina Commedia* - English verse translation by Henry Wadsworth
 * Longfellow (1867). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/commedia-en/index.ts
 *
 * Source: Project Gutenberg #1004, "Divine Comedy, Longfellow's Translation,
 * Complete" (raw/pg1004.txt, already cached - fetched once from
 * https://www.gutenberg.org/cache/epub/1004/pg1004.txt, nothing is downloaded
 * at build/run time). The PG header carries no further edition note beyond
 * "Translator: Henry Wadsworth Longfellow"; Longfellow's translation was
 * first published complete in 1867 (Boston: Ticknor and Fields) and is
 * public domain.
 *
 * STRUCTURE. Three top-level Divisions (inferno/purgatorio/paradiso, one per
 * cantica), each with child Divisions inferno-canto-N.. (34/33/33 cantos),
 * one Passage per canto holding every verse line of that canto joined by
 * "\n", including the source's own blank lines between tercets (this
 * digitisation prints one). Each printed line is trimmed of the hanging
 * 4-space (occasionally 1- or 5-space, a transcription-formatting
 * inconsistency of this particular digitisation, not a wording change)
 * indentation used to mark a tercet's 2nd/3rd line in the print layout -
 * pure typographic furniture, not part of Longfellow's wording - and blank
 * lines between tercets are kept exactly where the source prints them.
 *
 * EXCLUDED: the PG "Contents" table (a generated index, not Dante's or
 * Longfellow's text) and the trailing "APPENDIX / SIX SONNETS ON DANTE'S
 * DIVINE COMEDY BY HENRY WADSWORTH LONGFELLOW" - six of Longfellow's OWN
 * original sonnets about Dante, explicitly headed as an appendix in the
 * source, not a translation of anything Dante wrote. Both exclusions are
 * disclosed in about.json/anomalies.json.
 *
 * LINE COUNTS. The commonly cited totals for Dante's ITALIAN original are
 * Inferno 4,720 / Purgatorio 4,755 / Paradiso 4,758 (14,233 lines). This
 * digitisation of Longfellow's ENGLISH translation - which does not
 * guarantee a strict one-Italian-line-to-one-English-line correspondence in
 * every tercet - is measured at import time and the actual counts are
 * reported in about.json/anomalies.json and checked (as a disclosed
 * comparison, not a forced match) by validate.ts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, romanToArabic, type Anomaly } from '../shared/text.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const RAW = join(HERE, 'raw', 'pg1004.txt');
const WORK_ID = 'dante-commedia-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const CANTICHE = ['Inferno', 'Purgatorio', 'Paradiso'] as const;
type Cantica = (typeof CANTICHE)[number];
const EXPECTED_CANTOS: Record<Cantica, number> = { Inferno: 34, Purgatorio: 33, Paradiso: 33 };
const KNOWN_ITALIAN_TOTAL: Record<Cantica, number> = { Inferno: 4720, Purgatorio: 4755, Paradiso: 4758 };

const HEADER_RE = /^(Inferno|Purgatorio|Paradiso): Canto ([IVXLCDM]+)$/;
const START_MARKER = '*** START OF THE PROJECT GUTENBERG EBOOK';
const END_MARKER = '*** END OF THE PROJECT GUTENBERG EBOOK';
const APPENDIX_MARKER = 'SIX SONNETS ON DANTE’S DIVINE COMEDY BY HENRY WADSWORTH LONGFELLOW';

interface RawCanto {
  cantica: Cantica;
  number: number;
  lines: string[];
}

function parse(raw: string): { cantos: RawCanto[]; anomalies: Anomaly[] } {
  const anomalies: Anomaly[] = [];
  const lines = raw.split(/\r?\n/);

  const startIdx = lines.findIndex((l) => l.includes(START_MARKER));
  const endIdx = lines.findIndex((l) => l.includes(END_MARKER));
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    process.stderr.write('STOP (commedia-en): could not find PG start/end markers\n');
    process.exit(1);
  }
  const sonnetsIdx = lines.findIndex((l, i) => i > startIdx && i < endIdx && l.includes(APPENDIX_MARKER));
  if (sonnetsIdx === -1) {
    process.stderr.write('STOP (commedia-en): could not find the appendix marker to bound the poem text\n');
    process.exit(1);
  }
  // The bare "APPENDIX" heading line itself sits a few lines above the
  // "SIX SONNETS..." line found above; the poem text ends before THAT line,
  // not before "SIX SONNETS...", or the heading would be swallowed as if it
  // were the last line of Paradiso's final canto.
  let appendixIdx = sonnetsIdx;
  for (let i = sonnetsIdx - 1; i > startIdx; i--) {
    if (lines[i]!.trim() === 'APPENDIX') { appendixIdx = i; break; }
  }
  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      'Excluded from the reading text: the Project Gutenberg "Contents" table (a generated navigation index, not ' +
      'Dante\'s or Longfellow\'s own words) preceding "Inferno: Canto I", and the trailing "APPENDIX / SIX SONNETS ' +
      'ON DANTE\'S DIVINE COMEDY BY HENRY WADSWORTH LONGFELLOW" - six of Longfellow\'s own original sonnets about ' +
      'Dante, explicitly headed as an appendix in the source and not a translation of any part of the Commedia.',
  });

  const cantos: RawCanto[] = [];
  let cur: RawCanto | null = null;
  for (let i = startIdx + 1; i < appendixIdx; i++) {
    const line = lines[i]!;
    const m = HEADER_RE.exec(line.trim());
    if (m) {
      cur = { cantica: m[1] as Cantica, number: romanToArabic(m[2]!, `${WORK_ID} / header at line ${i + 1}`), lines: [] };
      cantos.push(cur);
      continue;
    }
    if (!cur) continue; // front matter (title page, "Contents" list) before Inferno: Canto I
    cur.lines.push(line);
  }
  return { cantos, anomalies };
}

/** Strip the hanging print-indent from a verse line without touching its wording. */
function stripHangingIndent(line: string): string {
  if (line.trim() === '') return '';
  return cleanText(line);
}

function buildCantoText(rawLines: string[], where: string, anomalies: Anomaly[]): string {
  const arr = rawLines.slice();
  while (arr.length && arr[0]!.trim() === '') arr.shift();
  while (arr.length && arr[arr.length - 1]!.trim() === '') arr.pop();
  // Collapse any run of 2+ blank lines down to a single blank line (pure
  // print-layout spacing; never more than one blank line separates two
  // tercets anywhere Longfellow's tercet structure is followed) - logged if
  // it ever happens, since it would mean the source's own spacing is
  // irregular at that point.
  const cleaned: string[] = [];
  let blankRun = 0;
  for (const raw of arr) {
    if (raw.trim() === '') {
      blankRun += 1;
      continue;
    }
    if (cleaned.length > 0) {
      if (blankRun > 1) anomalies.push({ where, note: `${blankRun} consecutive blank lines in the source collapsed to one blank line between verse lines.` });
      if (blankRun > 0) cleaned.push('');
    }
    blankRun = 0;
    cleaned.push(stripHangingIndent(raw));
  }
  return cleaned.join('\n');
}

function main(): void {
  const raw = readFileSync(RAW, 'utf8');
  const { cantos, anomalies } = parse(raw);

  const byCantica: Record<Cantica, RawCanto[]> = { Inferno: [], Purgatorio: [], Paradiso: [] };
  for (const c of cantos) byCantica[c.cantica].push(c);

  for (const cantica of CANTICHE) {
    const list = byCantica[cantica].sort((a, b) => a.number - b.number);
    const expected = EXPECTED_CANTOS[cantica];
    if (list.length !== expected) {
      process.stderr.write(`STOP (commedia-en): ${cantica} has ${list.length} cantos, expected ${expected}\n`);
      process.exit(1);
    }
    for (let i = 0; i < list.length; i++) {
      if (list[i]!.number !== i + 1) {
        process.stderr.write(`STOP (commedia-en): ${cantica} canto numbering gap/duplicate at index ${i}: got ${list[i]!.number}\n`);
        process.exit(1);
      }
    }
  }

  const cantoDivisions: Record<Cantica, Division[]> = { Inferno: [], Purgatorio: [], Paradiso: [] };
  const lineTotals: Record<Cantica, number> = { Inferno: 0, Purgatorio: 0, Paradiso: 0 };
  const perCantoLineCounts: Record<Cantica, number[]> = { Inferno: [], Purgatorio: [], Paradiso: [] };

  for (const cantica of CANTICHE) {
    for (const c of byCantica[cantica].sort((a, b) => a.number - b.number)) {
      const slug = cantica.toLowerCase() as 'inferno' | 'purgatorio' | 'paradiso';
      const where = `${WORK_ID} / ${slug}-canto-${c.number}`;
      const text = buildCantoText(c.lines, where, anomalies);
      const verseLineCount = text.split('\n').filter((l) => l.trim() !== '').length;
      lineTotals[cantica] += verseLineCount;
      perCantoLineCounts[cantica].push(verseLineCount);
      cantoDivisions[cantica].push({
        id: `${slug}-canto-${c.number}`,
        number: String(c.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text, ref: null }],
      });
    }
  }

  for (const cantica of CANTICHE) {
    const known = KNOWN_ITALIAN_TOTAL[cantica];
    const got = lineTotals[cantica];
    anomalies.push({
      where: `${WORK_ID} / ${cantica.toLowerCase()} line count`,
      note:
        `This digitisation of Longfellow's English translation of ${cantica} totals ${got} verse lines across ` +
        `${EXPECTED_CANTOS[cantica]} cantos (per-canto: ${perCantoLineCounts[cantica].join(', ')}), versus the ` +
        `${known} lines commonly cited for Dante's Italian original. The difference (${got - known >= 0 ? '+' : ''}${got - known}) ` +
        'reflects Longfellow\'s own translation choices (his English does not guarantee a strict one-line-per-Italian-line ' +
        'correspondence in every tercet) and/or this digitisation\'s own line breaks; nothing was added, removed, or ' +
        're-lineated by this importer to force a match against the Italian count.',
    });
  }

  const divisions: Division[] = CANTICHE.map((cantica) => ({
    id: cantica.toLowerCase(),
    number: null,
    ref: null,
    sourceHeading: cantica,
    editorialTitle: null,
    children: cantoDivisions[cantica],
    passages: [],
  }));

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const totalLines = CANTICHE.reduce((s, c) => s + lineTotals[c], 0);
  const totalChars = countChars(work);

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Divine Comedy',
    author: 'Dante Alighieri',
    language: 'en',
    translator: 'Henry Wadsworth Longfellow',
    edition: "Longfellow's translation, first published complete 1867 (Boston: Ticknor and Fields)",
    provenance:
      'Project Gutenberg eBook #1004, "Divine Comedy, Longfellow\'s Translation, Complete" ' +
      '(www.gutenberg.org/ebooks/1004), fetched once and cached under scripts/import-dante/commedia-en/raw/pg1004.txt; ' +
      'nothing is downloaded at build or run time. The Gutenberg header carries no further source-edition note beyond ' +
      'naming Longfellow as translator; imported by scripts/import-dante/commedia-en.',
    license:
      "Longfellow's translation (complete 1867) and Dante's original Italian poem (completed c. 1320) are both in the " +
      'public domain worldwide. The Project Gutenberg digital transcription is released under the Project Gutenberg ' +
      'License (freely usable; see www.gutenberg.org/policy/license.html).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's Divina Commedia, in Henry Wadsworth Longfellow's blank-verse English translation - the first " +
            'complete American translation of the poem, published in 1867. Longfellow rendered each of Dante\'s ' +
            'hendecasyllabic tercets as English blank verse, aiming for a close, line-by-line fidelity to the ' +
            "Italian rather than reproducing Dante's terza rima.",
          'The text here is the translation, verbatim throughout. Nothing is modernised, paraphrased, or silently corrected.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Project Gutenberg eBook #1004, credited to producer Dennis McCarthy, first released 1997 and most ' +
            'recently updated 2024. It is the complete text: all three cantiche, 34 + 33 + 33 = 100 cantos.',
          'Excluded from the reading text and disclosed here rather than silently dropped: the Gutenberg edition\'s ' +
            'own generated "Contents" table (a navigation index, not part of the poem), and a trailing "APPENDIX / ' +
            "Six Sonnets on Dante's Divine Comedy by Henry Wadsworth Longfellow\" - six of Longfellow's own original " +
            'sonnets about Dante, explicitly headed as an appendix in the source and not a translation of Dante\'s words.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each cantica (Inferno, Purgatorio, Paradiso) is a top-level Division; each of its cantos (34/33/33) is a ' +
            'child Division holding a single Passage whose text is every verse line of that canto, in order, joined ' +
            'by "\\n" - including the source\'s own blank line printed between successive tercets. Each line is ' +
            'trimmed of the hanging print-indent (this digitisation uses 4 spaces almost everywhere, occasionally 1 ' +
            'or 5 - a typesetting/transcription inconsistency, not a wording difference) used to mark a tercet\'s ' +
            "2nd and 3rd lines; this is pure print layout, not part of Longfellow's wording, and no word was " +
            'changed, added, or removed.',
          `Total across the three cantiche: ${totalLines} verse lines, ${totalChars} characters.`,
        ],
      },
      {
        heading: 'Line counts',
        paragraphs: [
          'The totals commonly cited for Dante\'s ITALIAN original are Inferno 4,720 / Purgatorio 4,755 / Paradiso ' +
            '4,758 (14,233 lines). This digitisation of Longfellow\'s ENGLISH translation was measured at import ' +
            `time at Inferno ${lineTotals.Inferno} / Purgatorio ${lineTotals.Purgatorio} / Paradiso ${lineTotals.Paradiso} ` +
            `(${totalLines} total). Longfellow's translation does not guarantee a strict one-line-per-Italian-line ` +
            'correspondence in every tercet, so a small difference from the Italian totals is expected in an ' +
            'English verse translation and is not evidence of missing or duplicated text; see anomalies.json for the ' +
            'per-cantica figures and this importer\'s own reasoning.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Division.ref and Passage.ref are null throughout: this digitisation prints no separate line-number ' +
            'citation apparatus (canto and line position are given structurally, by the Division id and the line\'s ' +
            'own position within the Passage text, not by an inline printed number).',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the complete machine-readable log: the excluded Contents table and appendix ' +
            'sonnets, any collapsed run of blank lines, and the per-cantica line-count comparison against the ' +
            'commonly cited Italian totals.',
          'This app also holds no verbatim Italian edition of the Commedia at this time: the two candidate digital ' +
            'sources checked during this import (Italian Wikisource\'s "Divina Commedia", and Project Gutenberg ' +
            '#1000) were found unusable - see this importer\'s accompanying report for the full account - so only ' +
            "this English translation is shipped for the Commedia.",
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);

  process.stdout.write(`\n${CANTICHE.map((c) => `${c} ${byCantica[c].length} cantos ${lineTotals[c]} lines`).join(' | ')}\n`);
  process.stdout.write(`Total: ${cantos.length} cantos, ${totalLines} lines, ${totalChars} chars, ${anomalies.length} anomalies\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
