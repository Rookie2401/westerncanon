/**
 * Aristotle, *The Athenian Constitution* - Sir Frederic G. Kenyon's
 * translation (Oxford, 1920 revision), Project Gutenberg ebook #26095
 * (https://www.gutenberg.org/ebooks/26095). Run-once ingestion pipeline:
 *
 *   npx tsx scripts/import-athenian-constitution-en/index.ts
 *
 * Reads scripts/import-athenian-constitution-en/raw/pg26095.txt (fetched
 * once from gutenberg.org and cached here - nothing is downloaded at import
 * time) and writes:
 *   data/athenian-constitution-en/work.json       - the GenericWork: 69 flat Chapters
 *   data/athenian-constitution-en/about.json      - provenance / licence / prose
 *   data/athenian-constitution-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-athenian-constitution-en/validate.ts`.
 *
 * This is flowing plain-text prose with no markup (same technique as
 * scripts/import-plato-republic-en / import-politics-en / import-poetics-en).
 * Key facts about this source, verified by direct inspection of the cached
 * raw/pg26095.txt before writing this importer:
 *
 *   - Gutenberg boilerplate is stripped via the "*** START ... ***" /
 *     "*** END ... ***" marker lines. Within the licensed region, only a
 *     short title page ("THE ATHENIAN CONSTITUTION / by / Aristotle /
 *     Translated by Sir Frederic G. Kenyon") precedes the real translation -
 *     there is no separate translator's introduction/preface/bibliography
 *     of any kind in this particular Gutenberg edition (unlike Politics-en's
 *     and Poetics-en's siblings), and the translation ends cleanly with the
 *     line "THE END" immediately before the Gutenberg end-of-ebook
 *     boilerplate - no trailing index or notes section.
 *   - Kenyon's own division heading for this translation is "Part N" (NOT
 *     "Chapter N" - confirmed by direct inspection), each on its own line,
 *     numbered 1 through 69 in strict sequence with no gaps (confirmed by
 *     direct count: exactly 69 lines matching /^Part [0-9]+$/, in order).
 *     This app's convention for a single-book work is a flat `ch-N` id
 *     scheme regardless of the source's own label for the division, so
 *     Kenyon's "Part N" maps directly to `ch-N` here (see
 *     data/athenian-constitution-en/types.ts).
 *   - Paragraphs are separated by one-or-more blank lines and each paragraph
 *     is hard-wrapped; unwrapped here by joining a paragraph's lines with a
 *     single space (as in the other Gutenberg-plain-text imports in this
 *     group).
 *   - No Bekker-style page markers of any kind appear anywhere (checked
 *     directly) - unexceptional, since the papyrus this work survives on was
 *     only discovered in 1890, fifty-nine years after Bekker's 1831 edition
 *     of Aristotle's other works, so it was never assigned Bekker pagination
 *     to begin with. Division.ref is null throughout.
 *   - No footnote/endnote apparatus of any kind was found (checked directly:
 *     no "[Footnote", no bracketed digit markers, no trailing notes
 *     section).
 *   - This source DOES contain a small number of square-bracketed asides,
 *     all genuine translator apparatus and kept verbatim: (a) Kenyon's own
 *     editorial supplements marking where the papyrus itself is damaged or
 *     illegible, most strikingly right at the very opening of Part 1, which
 *     begins mid-sentence "...[They were tried] by a court..." - the
 *     papyrus's own beginning is lost, in every surviving witness to this
 *     work, not an importer artefact; (b) Kenyon's own transliterated-Greek
 *     glosses, e.g. "[Strategi]", "[Hipparchi]"; and (c) ONE genuine Project
 *     Gutenberg transcriber's note, "[Transcriber's note: of?]" in Part 8,
 *     flagging the transcriber's own uncertainty about a single word in
 *     their scan of the printed page. Per this repo's rule of never
 *     discarding or silently correcting source text, and because removing
 *     just the bracketed note would leave the surrounding sentence
 *     grammatically broken (its very purpose is to flag uncertainty about
 *     what word governs the following clause), this is preserved exactly as
 *     printed rather than stripped - logged to anomalies.json as a disclosed
 *     irregularity, not a silent pass-through.
 *
 * Schema: Athenian-Constitution-en is a FLAT, one-level tree - divisions are
 * the 69 chapters directly (children: [] on every one), the same shape as
 * data/categoriae-en. See data/athenian-constitution-en/types.ts for the
 * full schema doc.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/athenian-constitution-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_TXT = join(HERE, 'raw', 'pg26095.txt');
const OUT_DIR = join(REPO_ROOT, 'data', 'athenian-constitution-en');

const WORK_ID = 'athenian-constitution-en';
const EXPECTED_CHAPTERS = 69;

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

/** Splits a raw chunk of Gutenberg plain text into unwrapped paragraphs (blank-line-separated, hard-wrap joined with spaces). */
function splitParagraphs(chunk: string): string[] {
  return chunk
    .split(/\n\s*\n+/)
    .map((block) => cleanText(block.split('\n').join(' ')))
    .filter((p) => p.length > 0);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const raw = readFileSync(RAW_TXT, 'utf8').replace(/\r\n/g, '\n');
  process.stdout.write(`parsing ${RAW_TXT} ...\n`);

  const anomalies: Anomaly[] = [];

  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK THE ATHENIAN CONSTITUTION ***';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK THE ATHENIAN CONSTITUTION ***';
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    fail(`could not locate Gutenberg START/END boundary markers in ${RAW_TXT}`);
  }
  const licensed = raw.slice(startIdx + startMarker.length, endIdx);

  const partHeaderRe = /^Part ([0-9]{1,2})[ \t]*$/gm;
  const partHeaders: Array<{ n: number; matchStart: number; contentStart: number }> = [];
  {
    let m: RegExpExecArray | null;
    while ((m = partHeaderRe.exec(licensed))) {
      partHeaders.push({ n: Number(m[1]!), matchStart: m.index, contentStart: m.index + m[0]!.length });
    }
  }
  if (partHeaders.length !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} "Part N" headings, found ${partHeaders.length}`);
  }
  const gotNumbers = partHeaders.map((h) => h.n);
  const wantNumbers = Array.from({ length: EXPECTED_CHAPTERS }, (_, i) => i + 1);
  if (JSON.stringify(gotNumbers) !== JSON.stringify(wantNumbers)) {
    fail(`"Part N" headings out of sequence: got [${gotNumbers.join(', ')}], want [${wantNumbers.join(', ')}]`);
  }

  // Confirm only a short title page precedes Part 1 (no separate introduction/preface/bibliography).
  const beforePart1 = licensed.slice(0, partHeaders[0]!.matchStart);
  if (!/Translated by Sir Frederic G\. Kenyon/.test(beforePart1)) {
    fail('expected the translator credit line "Translated by Sir Frederic G. Kenyon" before Part 1 - not found; front matter may differ from what was verified');
  }
  if (beforePart1.length > 400) {
    fail(`front matter before Part 1 is unexpectedly long (${beforePart1.length} chars) - expected only a short title page; investigate before proceeding`);
  }

  const endHeadingMatch = /^THE END[ \t]*$/m.exec(licensed);
  if (!endHeadingMatch) fail('could not locate the trailing "THE END" line marking the close of the translation');
  const realTextEnd = endHeadingMatch.index;

  let transcriberNoteFound = false;
  let openingBracketFound = false;

  const divisions: Division[] = [];
  for (let i = 0; i < partHeaders.length; i++) {
    const chapterNum = i + 1;
    const start = partHeaders[i]!.contentStart;
    const end = i + 1 < partHeaders.length ? partHeaders[i + 1]!.matchStart : realTextEnd;
    const chunk = licensed.slice(start, end);

    if (chunk.includes("[Transcriber's note")) transcriberNoteFound = true;
    if (chapterNum === 1 && chunk.trim().startsWith('...[They were tried]')) openingBracketFound = true;

    const paragraphs = splitParagraphs(chunk);
    if (paragraphs.length === 0) fail(`ch-${chapterNum}: zero paragraphs`);
    const passage: Passage = { n: '', text: paragraphs.join('\n\n'), ref: null };
    divisions.push({
      id: `ch-${chapterNum}`,
      number: String(chapterNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    });
  }

  if (!transcriberNoteFound) fail('expected the one known "[Transcriber\'s note: of?]" occurrence (Part 8) to be found - not found; investigate before proceeding');
  if (!openingBracketFound) fail('expected Part 1 to open with the papyrus\'s own fragmentary "...[They were tried]" opening - not found; investigate before proceeding');

  anomalies.push({
    where: `${WORK_ID} / ch-1 / fragmentary opening`,
    note:
      'The Athenian Constitution survives only on a papyrus discovered in Egypt in 1890, whose own beginning is ' +
      'lost - every translation of this work, including Kenyon\'s here, therefore opens mid-sentence. This source\'s ' +
      'own text begins "...[They were tried] by a court empanelled..." (the bracketed words are Kenyon\'s own ' +
      'editorial supplement for sense, not an importer artefact) and is kept exactly as printed.',
  });
  anomalies.push({
    where: `${WORK_ID} / ch-8 / preserved transcriber note`,
    note:
      'Part 8 (ch-8) contains one genuine Project Gutenberg transcriber\'s note embedded inline in the running text: ' +
      '"...any one who, in a time [Transcriber\'s note: of?] civil factions, did not take up arms..." - the ' +
      "transcriber's own flagged uncertainty about a single word in their source scan. Removing just the bracketed " +
      "note would leave the sentence missing whatever word it stands in for and would silently paper over a real " +
      "source uncertainty, so - per this repo's rule of never discarding or silently correcting text - it is kept " +
      'exactly as printed rather than stripped or "corrected".',
  });
  anomalies.push({
    where: `${WORK_ID} / Bekker references`,
    note:
      'This work carries no Bekker-style page apparatus of any kind: the papyrus was discovered in 1890, fifty-nine ' +
      "years after Bekker's 1831 edition of Aristotle's other works, so it was never assigned Bekker pagination to " +
      'begin with (unlike data/politics-en and data/categoriae-en). Division.ref is null throughout; nothing is ' +
      'fabricated to supply a citation scheme this work has never had.',
  });
  anomalies.push({
    where: `${WORK_ID} / front and back matter`,
    note:
      'This particular Gutenberg edition carries only a short title page before Part 1 (no separate translator\'s ' +
      'introduction, preface, or bibliography, unlike its siblings in this importer group) and ends cleanly with ' +
      '"THE END" - no trailing index or notes section of any kind.',
  });
  anomalies.push({
    where: `${WORK_ID} / division labelling`,
    note:
      'Kenyon\'s own heading for each of this work\'s 69 divisions in this translation is "Part N", not "Chapter N". ' +
      'This app\'s "single-book work" convention uses a flat ch-N id regardless of the source\'s own label, so ' +
      '"Part N" maps directly to ch-N here; Division.sourceHeading stays null (the label itself is not preserved as ' +
      'a distinct field, matching this app\'s other single-book English editions).',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Athenian Constitution',
    author: 'Aristotle',
    language: 'en',
    translator: 'Sir Frederic G. Kenyon',
    edition: 'The Athenian Constitution (Oxford, 1920 revision of Kenyon\'s 1891 editio princeps translation)',
    provenance:
      'Text: Project Gutenberg ebook #26095 (www.gutenberg.org/ebooks/26095), fetched directly and cached at ' +
      "scripts/import-athenian-constitution-en/raw/pg26095.txt. Sir Frederic G. Kenyon's translation - Kenyon was " +
      "the first editor of the papyrus (discovered 1890, first published by him in 1891) and revised his own " +
      'translation for this 1920 Oxford printing; Kenyon died in 1952.',
    license:
      "Kenyon's translation is in the public domain (this printing dates from 1920; Kenyon died in 1952, over 70 " +
      'years ago). The Project Gutenberg transcription of it is also in the public domain in the United States; see ' +
      "gutenberg.org/ebooks/26095 for Project Gutenberg's own terms on redistributing their specific eBook file, " +
      "which this importer respects by keeping the text itself rather than Gutenberg's licence header/footer.",
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is Sir Frederic G. Kenyon's English translation of Aristotle's Athenian Constitution, via Project " +
            'Gutenberg ebook #26095 (Oxford, 1920 revision).',
          'Navigation is by chapter only (69 chapters, flat - this work has no Book-level grouping). Kenyon\'s own ' +
            'heading for each division in this translation is "Part N"; this library\'s single-book-work convention ' +
            'maps that directly to ch-N.',
          'The work survives only on a papyrus roll discovered in Egypt in 1890 (first identified and published by ' +
            "Kenyon himself in 1891) - its own beginning is lost, so even the best translation necessarily opens " +
            'mid-sentence; this is a fact about every surviving witness to the work, not a gap introduced by this ' +
            'import.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'This work carries no Bekker-style page apparatus at all (it was recovered decades after Bekker\'s ' +
            "edition of Aristotle's other works was compiled, so it was never assigned Bekker pagination), so " +
            'Division.ref is null throughout and navigation is by chapter number only.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the complete machine-readable log: the papyrus\'s own fragmentary opening ' +
            '(preserved verbatim, including Kenyon\'s own editorial bracketed supplement), one genuine Project ' +
            'Gutenberg transcriber\'s note preserved verbatim in Part 8 rather than silently stripped, the absent ' +
            'Bekker reference scheme, and this printing\'s minimal front/back matter.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(`\n  ${divisions.length} chapters  ${totalChars} chars\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-athenian-constitution-en/validate.ts` next.\n');
}

main();
