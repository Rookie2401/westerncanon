/**
 * Dante, *Vita Nuova* - English translation by Dante Gabriel Rossetti
 * (first published 1861 as "The Early Italian Poets"; this digitisation is
 * the standalone "Siddal Edition" reprint, Ellis and Elvey, London, 1899).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/vita-nuova-en/index.ts
 *
 * Source: Project Gutenberg #41085, "The New Life (La Vita Nuova)"
 * (raw/pg41085.txt, cached from
 * https://www.gutenberg.org/cache/epub/41085/pg41085.txt; nothing is
 * downloaded at build/run time). The PG header states translator "Dante
 * Gabriel Rossetti" and the title page reproduced in the text itself states
 * "The Siddal Edition ... Ellis and Elvey, London, 1899", printed by Hazell,
 * Watson & Viney - a reprint of Rossetti's 1861 translation.
 *
 * STRUCTURE. This edition prints NO numbered chapter divisions anywhere in
 * the translated text itself (confirmed by direct inspection: the narrative
 * runs continuously from "In that part of the book of my memory..." to
 * "Laus Deo." with no "I"/"II"/chapter heading of any kind marking Barbi's
 * standard 42-part division). English Wikisource's own copy of this exact
 * edition independently confirms this: its "Section 1..11" breakdown carries
 * an explicit editorial note that those sections "are divided arbitrarily to
 * match the accompanying LibriVox recordings. Neither Dante's original
 * Italian text nor the translation by Rossetti is so divided" - so THAT
 * scheme is not used here either, to avoid shipping an invented division as
 * if it were the source's own. Instead this work is ONE flat Division
 * holding one Passage per paragraph-or-poem block, in reading order, exactly
 * as the blank lines of the source delimit them - the same "flat corpus of
 * natural units" shape already used by this library for e.g.
 * data/aristophanes-*-en (one Passage per speech, no invented act/scene
 * division beyond what the source itself prints).
 *
 * PROSE vs VERSE. A block is treated as verse (each of its own lines kept,
 * joined by "\n") when its second and later lines carry the print's hanging
 * indent (4+ leading spaces, the same convention as this batch's Commedia
 * import); a block with no such indent is prose and its wrapped print lines
 * are joined with a single space (the line breaks are page-width wrapping,
 * not part of Rossetti's sentence structure).
 *
 * EXCLUDED (editorial front/back matter, disclosed in about.json): the
 * publisher's title page, "Prefatory Note" and "Introduction" by William
 * Michael Rossetti; the 33 numbered translator footnotes (commentary, not
 * translated text - their inline "[N]" markers are stripped from the
 * reading text and the note bodies are not preserved anywhere in this
 * build, matching this library's convention for translator apparatus
 * elsewhere, e.g. Loeb notes in data/iliad-en); the "THE SIDDAL EDITION OF
 * D. G. ROSSETTI'S WORKS" publisher's advertisement; and the Gutenberg
 * transcriber's note.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, type Anomaly } from '../shared/text.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const RAW = join(HERE, 'raw', 'pg41085.txt');
const WORK_ID = 'dante-vita-nuova-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);

const TEXT_START_NEEDLE = 'In that part of the book of my memory before the which is little that';
const TEXT_END_NEEDLE = 'Laus Deo.';

function stripItalicMarkup(s: string): string {
  // Gutenberg plain text marks italics with single leading/trailing
  // underscores around a run (e.g. "_Incipit Vita Nova_"); pure transport
  // formatting, not part of the wording.
  return s.replace(/_/g, '');
}

function main(): void {
  const raw = readFileSync(RAW, 'utf8');
  const lines = raw.split(/\r?\n/);

  const startIdx = lines.findIndex((l) => l.includes(TEXT_START_NEEDLE));
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(TEXT_END_NEEDLE));
  if (startIdx === -1 || endIdx === -1) {
    process.stderr.write('STOP (vita-nuova-en): could not find text start/end markers\n');
    process.exit(1);
  }

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      'Excluded from the reading text (editorial front/back matter, not Dante\'s or Rossetti\'s translated text): ' +
      'the publisher\'s title page, William Michael Rossetti\'s "Prefatory Note" and "Introduction", the "THE ' +
      "SIDDAL EDITION OF D. G. ROSSETTI'S WORKS\" publisher's advertisement following \"Laus Deo.\", and the " +
      'Gutenberg transcriber\'s note ("Minor typographical errors have been corrected without note" - a change made ' +
      "by Gutenberg's own transcribers to their source scan, disclosed here since this importer cannot recover what " +
      'those corrections were).',
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      'This edition prints no numbered chapter divisions anywhere in the translated text (confirmed by direct ' +
      "inspection of the full text between \"In that part of the book...\" and \"Laus Deo.\"): unlike Michele " +
      "Barbi's Italian critical edition (this library's dante-vita-nuova-it, ch-1..ch-42), Rossetti's English runs " +
      'continuously with no "I"/"II"/chapter heading of any kind. English Wikisource\'s own copy of this same 1899 ' +
      'Siddal-edition scan confirms this independently: its own "Section 1..11" breakdown is explicitly disclosed ' +
      'there as "divided arbitrarily to match the accompanying LibriVox recordings. Neither Dante\'s original ' +
      'Italian text nor the translation by Rossetti is so divided" - so that scheme is not used here either, to ' +
      "avoid shipping an invented division as if it were the source's own. This work is therefore imported as one " +
      'flat Division of paragraph/poem-block Passages, in reading order.',
  });

  let footnoteMarkersStripped = 0;
  const rawBody = lines.slice(startIdx, endIdx + 1);

  // Drop footnote bodies: a line starting with 2 spaces + "[N]" begins a
  // footnote; it and every following line up to (not including) the next
  // blank line are apparatus, not reading text.
  const bodyNoNotes: string[] = [];
  let inFootnote = false;
  let footnoteBodiesDropped = 0;
  for (const line of rawBody) {
    if (/^ {2}\[\d+\]/.test(line)) {
      inFootnote = true;
      footnoteBodiesDropped += 1;
      continue;
    }
    if (inFootnote) {
      if (line.trim() === '') inFootnote = false;
      continue;
    }
    bodyNoNotes.push(line);
  }
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note:
      `${footnoteBodiesDropped} numbered translator footnote(s) (Rossetti's/the editor's commentary, indented ` +
      '"  [N] ..." blocks) were removed wholesale from the reading text; their content is not preserved anywhere ' +
      'in this build. Inline "[N]" reference markers in the running text were also stripped (count logged below).',
  });

  // Split into blank-line-delimited blocks.
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of bodyNoNotes) {
    if (line.trim() === '') {
      if (cur.length > 0) blocks.push(cur);
      cur = [];
      continue;
    }
    cur.push(line);
  }
  if (cur.length > 0) blocks.push(cur);

  // The first block is the title ("THE NEW LIFE. (LA VITA NUOVA.)" - already
  // excluded, since rawBody starts at the opening sentence, not the title)
  // and the last block is "Laus Deo." itself, which is genuine closing text
  // and is kept.

  const passages: Passage[] = [];
  for (const block of blocks) {
    const isVerse = block.length > 1 && block.slice(1).some((l) => /^ {4,}\S/.test(l));
    let text: string;
    if (isVerse) {
      const cleanedLines = block.map((l) =>
        stripItalicMarkup(cleanText(l)).replace(/\[\d+\]/g, () => {
          footnoteMarkersStripped += 1;
          return '';
        }),
      );
      text = cleanedLines.map((l) => l.trim()).join('\n');
    } else {
      const joined = block.map((l) => stripItalicMarkup(l)).join(' ');
      text = cleanText(joined).replace(/\[\d+\]/g, () => {
        footnoteMarkersStripped += 1;
        return '';
      });
      text = cleanText(text);
    }
    if (text.trim().length === 0) continue;
    passages.push({ n: '', text, ref: null });
  }

  anomalies[anomalies.length - 1]!.note += ` ${footnoteMarkersStripped} inline "[N]" marker(s) stripped.`;

  const division: Division = {
    id: 'text',
    number: null,
    ref: null,
    sourceHeading: 'The New Life',
    editorialTitle: null,
    children: [],
    passages,
  };

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: [division] };
  const totalChars = countChars(work);

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The New Life',
    author: 'Dante Alighieri',
    language: 'en',
    translator: 'Dante Gabriel Rossetti',
    edition: 'The Siddal Edition (London: Ellis and Elvey, 1899), a reprint of Rossetti\'s translation first published 1861',
    provenance:
      'Project Gutenberg eBook #41085, "The New Life (La Vita Nuova)" (www.gutenberg.org/ebooks/41085), Distributed ' +
      'Proofreaders text prepared from page images of the 1899 Siddal Edition supplied by Internet Archive/American ' +
      'Libraries; fetched once and cached under scripts/import-dante/vita-nuova-en/raw/pg41085.txt. Nothing is ' +
      'downloaded at build or run time. Imported by scripts/import-dante/vita-nuova-en.',
    license:
      "Rossetti's translation (1861) and Dante's Italian original (c. 1294) are both in the public domain worldwide. " +
      'The Project Gutenberg digital transcription is released under the Project Gutenberg License.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's Vita Nuova (\"The New Life\"), Dante Gabriel Rossetti's English prose-and-verse translation - " +
            'prose passages in English prose, each embedded sonnet or canzone rendered as English verse - first ' +
            "published in 1861 in Rossetti's The Early Italian Poets and reprinted standalone as this 1899 Siddal " +
            'Edition.',
          'The text here is the translation, verbatim throughout. Nothing is modernised, paraphrased, or silently corrected.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'Project Gutenberg eBook #41085, prepared by the Distributed Proofreaders team from page images of the ' +
            '1899 Siddal Edition (Ellis and Elvey, London; printed by Hazell, Watson & Viney) supplied by Internet ' +
            'Archive/American Libraries.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This edition prints no numbered chapter divisions in the translated text; see "structure" in ' +
            'anomalies.json for the full reasoning (including independent confirmation from English Wikisource\'s ' +
            'own copy of the same edition). The work is therefore one flat Division holding one Passage per ' +
            "paragraph-or-poem block, in the order the source's own blank lines delimit them. A block is treated as " +
            "verse (each printed line kept, joined by \"\\n\") when its own continuation lines carry the print's " +
            'hanging indent, matching this batch\'s Commedia convention; otherwise it is prose and its print-width-' +
            'wrapped lines are joined with a single space.',
          `${passages.length} passages, ${totalChars} characters total.`,
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Passage.n and Division.ref are null/empty throughout: this edition prints no chapter or paragraph citation numbers.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Excluded editorial front/back matter, the 33 dropped translator footnotes, and the no-chapter-division ' +
            'finding are all logged in anomalies.json. The Gutenberg transcribers themselves state they corrected ' +
            '"minor typographical errors ... without note" in their source scan; this importer has no way to recover ' +
            "what those were and reproduces Gutenberg's own text as received.",
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(`\n${passages.length} passages, ${totalChars} chars, ${anomalies.length} anomalies\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
