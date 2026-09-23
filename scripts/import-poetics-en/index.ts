/**
 * Aristotle, *Poetics* - "On the Art of Poetry", Ingram Bywater's
 * translation (Oxford: Clarendon Press, first published 1920), Project
 * Gutenberg ebook #6763 (https://www.gutenberg.org/ebooks/6763). Run-once
 * ingestion pipeline:
 *
 *   npx tsx scripts/import-poetics-en/index.ts
 *
 * Reads scripts/import-poetics-en/raw/pg6763.txt (fetched once from
 * gutenberg.org and cached here - nothing is downloaded at import time) and
 * writes:
 *   data/poetics-en/work.json       - the GenericWork: 26 flat Chapters
 *   data/poetics-en/about.json      - provenance / licence / prose
 *   data/poetics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-poetics-en/validate.ts`.
 *
 * This is flowing plain-text prose with no markup (like
 * scripts/import-plato-republic-en and scripts/import-politics-en, whose
 * from-scratch-parser technique this file follows). Key facts about this
 * source, verified by direct inspection of the cached raw/pg6763.txt before
 * writing this importer - NOT assumed from the task brief, which correctly
 * flagged both of the following as open questions to verify rather than
 * guess:
 *
 *   - EXCLUDING GILBERT MURRAY'S INTRODUCTION: this printing opens with a
 *     title page, then a long essay headed "PREFACE" and SIGNED "G. M." (=
 *     Gilbert Murray) at its close - an appreciation of the Poetics aimed at
 *     the general reader, not a translation of Aristotle's own text. Bywater
 *     himself supplies no separate "PREFATORY NOTE" of his own in this
 *     printing (the task brief raised this as one possibility; it does not
 *     occur - checked directly). Immediately after Murray's signature ("G.
 *     M") the real translation begins under its own heading, the exact line
 *     "ARISTOTLE ON THE ART OF POETRY" (all caps - distinct from the title
 *     page's earlier mixed-case "On the Art of Poetry" title-page banner).
 *     This exact all-caps line occurs EXACTLY ONCE in the whole file
 *     (confirmed by direct grep), so it is used directly as the start-of-
 *     real-text anchor with no second-occurrence disambiguation needed
 *     (unlike Republic-en, whose analogous marker recurs and needs the
 *     second-occurrence trick).
 *   - CHAPTER STRUCTURE: the Poetics' 26 traditional chapters ARE marked in
 *     this source, as bare arabic numerals "1".."26" each alone on their own
 *     line (no "Chapter" word, no roman numerals) - confirmed by direct scan
 *     of the real-translation region: exactly 26 such lines, in strict
 *     ascending sequence, and no bare-numeral line of this form appears
 *     anywhere else in the file (in particular, Murray's Preface's own
 *     footnote-style "(1) Prof. Butcher, 1895 and 1898; ..." and the
 *     translation's own internal enumerated arguments, e.g. Chapter 26's
 *     "(1) ... (2) ... (3) ...", use parenthesised digits INLINE in running
 *     prose, never a bare digit alone on its own line, so they cannot be
 *     confused with a chapter heading).
 *   - Paragraphs are separated by one-or-more blank lines and each paragraph
 *     is hard-wrapped; unwrapped here by joining a paragraph's lines with a
 *     single space (as in Republic-en / Politics-en).
 *   - Bekker page markers: NONE anywhere in this source (checked directly -
 *     no bracketed page tokens of any kind, unlike Politics-en's Ellis
 *     translation). Division.ref is null throughout; see anomalies.json.
 *   - No footnote/endnote apparatus was found anywhere in the real
 *     translation region (Murray's Preface has its own one footnote, "(1)
 *     Prof. Butcher, ..." - but that whole Preface is excluded already).
 *     The translation's own bracketed asides, e.g. "[Strategi]"-style square
 *     brackets, do NOT occur in this particular work (that pattern is from
 *     Athenian-Constitution-en, a different source); nothing of the kind
 *     was found here.
 *   - The translation ends cleanly with "...the Objections of the critics,
 *     and the Solutions in answer to them." immediately followed by the
 *     Gutenberg END-of-ebook boilerplate - no trailing index or notes
 *     section of any kind (unlike Politics-en, which has a trailing INDEX).
 *
 * Schema: Poetics-en is a FLAT, one-level tree - divisions are the 26
 * chapters directly (children: [] on every one), the same shape as
 * data/categoriae-en, NOT a Book -> Chapter tree. See data/poetics-en/
 * types.ts for the full schema doc and the rationale (this work has always
 * circulated as a single continuous treatise with no Book-level grouping of
 * its own, and this source's own heading scheme - bare chapter numbers, no
 * "Book" of any kind - confirms that).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/poetics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_TXT = join(HERE, 'raw', 'pg6763.txt');
const OUT_DIR = join(REPO_ROOT, 'data', 'poetics-en');

const WORK_ID = 'poetics-en';
const EXPECTED_CHAPTERS = 26;

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

  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK ARISTOTLE ON THE ART OF POETRY ***';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK ARISTOTLE ON THE ART OF POETRY ***';
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    fail(`could not locate Gutenberg START/END boundary markers in ${RAW_TXT}`);
  }
  const licensed = raw.slice(startIdx + startMarker.length, endIdx);

  const realHeadingRe = /^ARISTOTLE ON THE ART OF POETRY[ \t]*$/gm;
  const realHeadingMatches: RegExpExecArray[] = [];
  {
    let m: RegExpExecArray | null;
    while ((m = realHeadingRe.exec(licensed))) realHeadingMatches.push(m);
  }
  if (realHeadingMatches.length !== 1) {
    fail(`expected exactly 1 occurrence of the real-text heading "ARISTOTLE ON THE ART OF POETRY", found ${realHeadingMatches.length}`);
  }
  const translationStart = realHeadingMatches[0]!.index + realHeadingMatches[0]![0]!.length;

  // Sanity: confirm Murray's Preface (excluded) actually precedes this point and is signed "G. M".
  const prefaceHeading = /^PREFACE[ \t]*$/m.exec(licensed);
  if (!prefaceHeading || prefaceHeading.index >= translationStart) {
    fail('expected a "PREFACE" heading before the real-text heading (Gilbert Murray\'s introductory essay) - not found in the expected position');
  }
  const signatureMatch = /\nG\. M\n/m.exec(licensed.slice(0, translationStart));
  if (!signatureMatch) {
    fail('expected Gilbert Murray\'s preface to end with his signature "G. M" immediately before the real-text heading - not found');
  }
  anomalies.push({
    where: `${WORK_ID} / front matter excluded`,
    note:
      'This printing opens with a title page and then Gilbert Murray\'s own signed "PREFACE" (an appreciation of ' +
      'the Poetics for the general reader, ending "G. M") - not a translation of Aristotle\'s text, and not by ' +
      'Bywater. Neither the title page nor Murray\'s Preface is included here; only the translation itself, from ' +
      'its own "ARISTOTLE ON THE ART OF POETRY" heading (which occurs exactly once in the source) to the end of ' +
      'Chapter 26, is imported. Bywater supplies no separate prefatory note of his own in this printing.',
  });

  const translation = licensed.slice(translationStart);

  const chapterHeaderRe = /^([0-9]{1,2})[ \t]*$/gm;
  const chapterHeaders: Array<{ n: number; matchStart: number; contentStart: number }> = [];
  {
    let m: RegExpExecArray | null;
    while ((m = chapterHeaderRe.exec(translation))) {
      chapterHeaders.push({ n: Number(m[1]!), matchStart: m.index, contentStart: m.index + m[0]!.length });
    }
  }
  if (chapterHeaders.length !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} bare-numeral chapter headings, found ${chapterHeaders.length}: [${chapterHeaders.map((h) => h.n).join(', ')}]`);
  }
  const gotNumbers = chapterHeaders.map((h) => h.n);
  const wantNumbers = Array.from({ length: EXPECTED_CHAPTERS }, (_, i) => i + 1);
  if (JSON.stringify(gotNumbers) !== JSON.stringify(wantNumbers)) {
    fail(`chapter headings out of sequence: got [${gotNumbers.join(', ')}], want [${wantNumbers.join(', ')}]`);
  }
  if (translation.slice(0, chapterHeaders[0]!.matchStart).trim().length !== 0) {
    fail(`unexpected non-whitespace content before the first chapter heading: ${JSON.stringify(translation.slice(0, chapterHeaders[0]!.matchStart).trim().slice(0, 120))}`);
  }

  // No Bekker markers anywhere in this source - verified directly.
  if (/\[\s*(?:Bekker\s+)?\d{3,4}[ab]\s*\]/.test(translation)) {
    fail('found what looks like an inline Bekker page marker in this source - expected none; investigate before proceeding');
  }
  anomalies.push({
    where: `${WORK_ID} / Bekker references`,
    note:
      'This source prints no Bekker page/column markers anywhere (verified by direct inspection of the whole ' +
      'translation region) - unlike data/politics-en\'s Ellis translation, which does. Division.ref is null ' +
      'throughout; nothing is fabricated to supply a citation scheme this source does not carry.',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note:
      'No footnote/endnote apparatus of any kind was found anywhere in the real translation region (checked ' +
      'directly: no "[Footnote", no bracketed digit markers, no trailing notes section - the translation runs ' +
      'straight through to its own closing sentence and then directly into the Gutenberg end-of-ebook boilerplate).',
  });

  const divisions: Division[] = [];
  for (let i = 0; i < chapterHeaders.length; i++) {
    const chapterNum = i + 1;
    const start = chapterHeaders[i]!.contentStart;
    const end = i + 1 < chapterHeaders.length ? chapterHeaders[i + 1]!.matchStart : translation.length;
    const chunk = translation.slice(start, end);
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

  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${EXPECTED_CHAPTERS} traditional Poetics chapters are present and in order, from the verbatim ` +
      `opening ("Our subject being Poetry, ...") to the verbatim closing sentence. The Poetics as traditionally ` +
      `numbered originally comprised two books (Tragedy/Epic, and Comedy/other subjects); only the first survives ` +
      `in antiquity, and this translation - like every surviving witness - covers only that surviving portion, not ` +
      `an importer gap.`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Poetics',
    author: 'Aristotle',
    language: 'en',
    translator: 'Ingram Bywater',
    edition: 'On the Art of Poetry (Oxford: Clarendon Press, first published 1920)',
    provenance:
      'Text: Project Gutenberg ebook #6763 (www.gutenberg.org/ebooks/6763), fetched directly and cached at ' +
      "scripts/import-poetics-en/raw/pg6763.txt. Ingram Bywater's translation of the Poetics, published by the " +
      'Clarendon Press in 1920 with an introductory Preface by Gilbert Murray (excluded from this import - see ' +
      "About below). Bywater's own scholarly edition of the Greek text, on which this translation is based, was " +
      'first published in 1909; Bywater died in 1914.',
    license:
      "Bywater's translation is in the public domain (published 1920; Bywater died in 1914, so the translation is " +
      'public domain in every life-plus-N jurisdiction as well as by publication date). The Project Gutenberg ' +
      'transcription of it is also in the public domain in the United States; see gutenberg.org/ebooks/6763 for ' +
      "Project Gutenberg's own terms on redistributing their specific eBook file, which this importer respects by " +
      "keeping the text itself rather than Gutenberg's licence header/footer.",
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is Ingram Bywater's English translation of Aristotle's Poetics, via Project Gutenberg ebook #6763 " +
            '(Oxford: Clarendon Press, first published 1920).',
          'Navigation is by chapter only (26 traditional chapters, flat - this work has no Book-level grouping of ' +
            'its own, and this source marks chapters with bare numerals "1" through "26").',
          "Gilbert Murray's own signed \"Preface\" to this printing - an appreciation of the Poetics for the general " +
            'reader, not a translation of Aristotle\'s text - is not included here; only the translation itself is.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'This source prints no Bekker page/column markers at all, so Division.ref is null throughout and ' +
            'navigation is by chapter number only. See data/politics-en (Ellis) for a sibling English translation ' +
            'in this library that does carry Bekker references.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the complete machine-readable log: the excluded front matter (title page and ' +
            "Murray's Preface, with exactly where the real translation begins), the absent Bekker reference scheme, " +
            'the absence of any footnote apparatus, and confirmation of completeness. The Poetics survives from ' +
            'antiquity only in part (originally two books, of which only the first, on Tragedy and Epic, survives); ' +
            'that is a fact about every surviving witness to this work, not a gap introduced by this import.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(`\n  ${divisions.length} chapters  ${totalChars} chars\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-poetics-en/validate.ts` next.\n');
}

main();
