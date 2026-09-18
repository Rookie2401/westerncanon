/**
 * Plato, *Republic* - English translation by Benjamin Jowett (3rd edition
 * text, long public domain - Jowett died in 1893), Project Gutenberg ebook
 * #1497 (https://www.gutenberg.org/ebooks/1497). Run-once ingestion
 * pipeline:
 *
 *   npx tsx scripts/import-plato-republic-en/index.ts
 *
 * Reads scripts/import-plato-republic-en/raw/pg1497.txt (fetched once from
 * gutenberg.org and committed here - nothing is downloaded at import time)
 * and writes:
 *   data/plato-republic-en/work.json       - the GenericWork: 10 Books,
 *                                            EACH A LEAF (children: [], one
 *                                            Passage) - see below and
 *                                            scripts/import-plato-c-shared/
 *                                            types.ts for why this edition
 *                                            is one level shallower than
 *                                            every other work this importer
 *                                            group produces.
 *   data/plato-republic-en/about.json      - provenance / licence / prose
 *   data/plato-republic-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-plato-c-shared/validate.ts`.
 *
 * THIS IS A DIFFERENT KIND OF SOURCE than Republic-grc/Laws-grc/Laws-en
 * (which all share scripts/import-plato-c-shared/teiTwoLevel.ts, a TEI-XML
 * tokenizer): Gutenberg's pg1497.txt is flowing plain-text prose with no
 * markup at all, so this file has its own from-scratch parser rather than
 * reusing that one. Key facts about this source, verified by direct
 * inspection before writing this importer (not assumed from the task brief
 * - the brief's own line numbers were explicitly approximate):
 *
 *   - Gutenberg boilerplate (license text, the book's own front-matter
 *     Contents listing, and Jowett's own ~8,500-line "INTRODUCTION AND
 *     ANALYSIS" essay - which precedes the actual dialogue and has its OWN
 *     misleadingly-similar inline "BOOK I. <summary prose>" sub-headings,
 *     e.g. line 632 "BOOK I. The Republic opens with a truly Greek
 *     scene—...") is all excluded. The real dialogue text is identified
 *     structurally, not by hardcoded line numbers: it begins at the SECOND
 *     occurrence of the exact line " PERSONS OF THE DIALOGUE." (the first,
 *     in the Contents listing near the top, is a table-of-contents entry)
 *     and ends at the line immediately before "*** END OF THE PROJECT
 *     GUTENBERG EBOOK THE REPUBLIC ***".
 *   - Within that real-dialogue region, the 10 Book breaks are lines
 *     matching exactly /^ ?BOOK [IVX]+\.\s*$/ (own line, nothing else) -
 *     confirmed to occur in this region in the exact sequence I..X and
 *     nowhere else (Jowett's Introduction's inline headers never match
 *     this pattern - they always have trailing prose on the same line, and
 *     in any case sit entirely before the second "PERSONS OF THE DIALOGUE."
 *     line so are excluded by the region cut alone).
 *   - The "PERSONS OF THE DIALOGUE." list of character names and the
 *     following "The scene is laid..." paragraph sit BEFORE the "BOOK I."
 *     heading, i.e. they are not textually part of any Book under Jowett's
 *     own heading scheme. Since this edition's schema (see below) has no
 *     slot for a work-level front-matter division, and dropping them would
 *     lose real printed content, they are prepended as Book 1's own
 *     opening paragraphs instead - logged to anomalies.json as an explicit
 *     editorial choice, not silently absorbed.
 *   - Paragraphs are separated by one-or-more blank lines and each
 *     paragraph is hard-wrapped at roughly 72-79 characters; unwrapped here
 *     by joining a paragraph's lines with a single space (whitespace
 *     collapse otherwise handles any leftover double-spacing).
 *   - No footnote/transcriber apparatus of any kind was found in the real
 *     dialogue region (checked directly: no square-bracketed asides, no
 *     asterisk/dagger footnote markers). The parenthetical asides that DO
 *     appear (e.g. Book VIII's famous "nuptial number" passage, glossing
 *     the arithmetic inline: "(Meaning either (1) that... or (2) that...)")
 *     are Jowett's OWN original translation/commentary, not transcriber
 *     apparatus, and are kept verbatim per the task brief.
 *   - Stephanus pagination: NONE. This source carries no Stephanus page
 *     markers at all (unlike the Perseus/Loeb texts), so this edition
 *     navigates by Book only - see the schema note below and about.json's
 *     explicit disclosure of this limitation.
 *
 * Schema: Republic-en is the ONE edition in this importer group that is a
 * flat, one-level Book-only tree (children: [], one Passage per Book -
 * same shape as a Homer/Virgil Book), NOT the two-level Book->Stephanus-
 * section tree used by Republic-grc/Laws-grc/Laws-en. See the doc-comment
 * on scripts/import-plato-c-shared/types.ts for the full rationale.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-plato-c-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../import-plato-c-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_TXT = join(HERE, 'raw', 'pg1497.txt');
const OUT_DIR = join(REPO_ROOT, 'data', 'plato-republic-en');

const WORK_ID = 'plato-republic-en';
const EXPECTED_ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
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
  const raw = readFileSync(RAW_TXT, 'utf8');
  process.stdout.write(`parsing ${RAW_TXT} ...\n`);

  const anomalies: Anomaly[] = [];

  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK THE REPUBLIC ***';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK THE REPUBLIC ***';
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    fail(`could not locate Gutenberg START/END boundary markers in ${RAW_TXT}`);
  }
  const licensed = raw.slice(startIdx + startMarker.length, endIdx);

  const personsMarker = /^ ?PERSONS OF THE DIALOGUE\.[ \t]*$/m;
  const personsMatches: number[] = [];
  {
    const re = new RegExp(personsMarker.source, 'gm');
    let pm: RegExpExecArray | null;
    while ((pm = re.exec(licensed))) personsMatches.push(pm.index);
  }
  if (personsMatches.length !== 2) {
    fail(
      `expected exactly 2 occurrences of " PERSONS OF THE DIALOGUE." (1 table-of-contents entry + 1 real heading), found ${personsMatches.length}`,
    );
  }
  const dialogueStart = personsMatches[1]!;
  const dialogue = licensed.slice(dialogueStart);

  const bookHeaderRe = /^ ?BOOK ([IVX]+)\.[ \t]*$/gm;
  const headers: Array<{ roman: string; matchStart: number; contentStart: number }> = [];
  let hm: RegExpExecArray | null;
  while ((hm = bookHeaderRe.exec(dialogue))) {
    headers.push({ roman: hm[1]!, matchStart: hm.index, contentStart: hm.index + hm[0].length });
  }
  if (headers.length !== 10) {
    fail(`expected exactly 10 "BOOK <roman>." headers in the real dialogue region, found ${headers.length}`);
  }
  const gotRomans = headers.map((h) => h.roman);
  if (JSON.stringify(gotRomans) !== JSON.stringify(EXPECTED_ROMANS)) {
    fail(`Book headers out of sequence: got [${gotRomans.join(', ')}], want [${EXPECTED_ROMANS.join(', ')}]`);
  }

  // Front matter: "PERSONS OF THE DIALOGUE." itself, the character list,
  // and the "The scene is laid..." paragraph - everything between the real
  // heading and the first "BOOK I." header. Prepended to Book 1 (see the
  // file doc-comment) rather than dropped.
  const frontMatterChunk = dialogue.slice(0, headers[0]!.matchStart);
  const frontMatterParagraphs = splitParagraphs(frontMatterChunk);
  if (frontMatterParagraphs.length === 0) {
    fail('expected non-empty front matter (PERSONS OF THE DIALOGUE / scene note) before BOOK I.');
  }
  anomalies.push({
    where: 'book-1',
    note:
      `The printed edition's "PERSONS OF THE DIALOGUE." character list and the following "The scene is laid..." ` +
      `paragraph (${frontMatterParagraphs.length} short paragraphs total) sit before the "BOOK I." heading in ` +
      `Jowett's own text, i.e. they are not part of any Book under his heading scheme. This edition's schema has no ` +
      `work-level front-matter division, so - rather than discard genuine printed content - they are prepended as ` +
      `Book 1's own opening paragraphs. This is an explicit editorial placement choice by this importer, not ` +
      `something the source itself does.`,
  });

  const divisions: Division[] = [];
  for (let i = 0; i < headers.length; i++) {
    const bookNum = i + 1;
    const start = headers[i]!.contentStart;
    const end = i + 1 < headers.length ? headers[i + 1]!.matchStart : dialogue.length;
    const bookChunk = dialogue.slice(start, end);
    const paragraphs = splitParagraphs(bookChunk);
    if (paragraphs.length === 0) fail(`Book ${bookNum} (${headers[i]!.roman}) has zero paragraphs`);
    const allParagraphs = bookNum === 1 ? [...frontMatterParagraphs, ...paragraphs] : paragraphs;
    const passage: Passage = { n: '', text: allParagraphs.join('\n\n'), ref: null };
    const division: Division = {
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    divisions.push(division);
  }

  anomalies.push({
    where: `${WORK_ID} / footnote check`,
    note:
      'The real-dialogue region of this source was checked directly for transcriber/Gutenberg footnote apparatus ' +
      '(square-bracketed asides, asterisk/dagger markers): none was found. The numbered parenthetical asides in Book ' +
      'VIII\'s "nuptial number" passage, e.g. "(Meaning either (1) that ... or (2) that ...)", are Jowett\'s own ' +
      'original translation/commentary, not transcriber apparatus, and are kept verbatim.',
  });
  anomalies.push({
    where: `${WORK_ID} / Stephanus pagination`,
    note:
      'This source carries no Stephanus page markers at all, unlike the Perseus/Loeb texts used elsewhere in this ' +
      'importer group. Nothing is fabricated to supply them; this edition navigates by Book only (see about.json).',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Republic',
    author: 'Plato',
    language: 'en',
    translator: 'Benjamin Jowett',
    provenance:
      'Text: Project Gutenberg ebook #1497 (www.gutenberg.org/ebooks/1497), fetched directly and committed to this ' +
      "repository at scripts/import-plato-republic-en/raw/pg1497.txt. Benjamin Jowett's translation, first published " +
      '1871 and revised for later editions (this text reflects his later revised wording, per the Gutenberg edition ' +
      'front matter); Jowett died in 1893.',
    license:
      'Jowett\'s translation is in the public domain worldwide (translator died 1893, well over 100 years ago). The ' +
      'Project Gutenberg transcription of it is also in the public domain in the United States; see ' +
      'gutenberg.org/ebooks/1497 for Project Gutenberg\'s own terms on redistributing their specific eBook file, ' +
      'which this importer respects by keeping the text itself rather than Gutenberg\'s licence header/footer.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is Benjamin Jowett's English translation of Plato's Republic, via Project Gutenberg ebook #1497.",
          'Navigation is by Book only (10 total). Unlike the accompanying Greek text (data/plato-republic-grc) and ' +
            "every other work in this importer group, this source carries NO Stephanus page markers at all - Gutenberg's " +
            "plain-text transcription of Jowett's translation was never marked up with them, so there is no page-level " +
            'citation data to preserve. The Greek edition, sourced from Perseus/Open Greek and Latin (which does carry ' +
            'Stephanus TEI markup), offers page-level navigation that this English edition genuinely cannot.',
          'Jowett\'s own "Introduction and Analysis" essay, which precedes the dialogue proper in the printed edition ' +
            'and includes his own prose summary of each Book, is not included here - only the dialogue itself.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(`\n  ${divisions.length} books  ${totalChars} chars  front-matter paragraphs=${frontMatterParagraphs.length}\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-plato-c-shared/validate.ts` next.\n');
}

main();
