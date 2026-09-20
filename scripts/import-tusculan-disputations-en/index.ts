/**
 * Cicero, Tusculan Disputations - English translation "chiefly" by Charles
 * Duke Yonge (per this edition's own title page), Project Gutenberg ebook
 * #14988, "Cicero's Tusculan Disputations; Also, Treatises On the Nature of
 * the Gods, and On the Commonwealth" (Harper & Brothers, New York, 1877 -
 * Harper's New Classical Library). Run-once ingestion pipeline.
 *
 *   npm run import:tusculan-disputations-en
 *
 * Reads scripts/import-tusculan-disputations-en/raw/pg14988.txt (fetched
 * once from gutenberg.org and committed here; nothing is downloaded at
 * import time) and writes:
 *   data/tusculan-disputations-en/work.json       - the GenericWork (5
 *                                                    Books, each a flat list
 *                                                    of Section divisions,
 *                                                    one Passage each)
 *   data/tusculan-disputations-en/about.json      - provenance / licence / prose
 *   data/tusculan-disputations-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:tusculan-disputations-en`.
 *
 * THIS IS A SHARED GUTENBERG VOLUME containing THREE separate works in this
 * order: "The Tusculan Disputations", "The Nature of the Gods", and "On the
 * Commonwealth". Only the first is in scope for this importer; the other
 * two are never read into memory beyond locating where the Tusculans end.
 * Exact delimiting text, confirmed by direct inspection (both headings occur
 * EXACTLY ONCE each in the whole file, so no table-of-contents-style
 * duplicate to disambiguate, unlike e.g. Plato's Republic import):
 *   - START: immediately after the line "THE TUSCULAN DISPUTATIONS." (the
 *     work's own title heading, right after the book's shared front-matter
 *     Contents listing).
 *   - END: immediately before the line "THE NATURE OF THE GODS." (the next
 *     work's own title heading).
 * Within that region, a short translator's/editor's "INTRODUCTION." essay
 * (historical background on the dialogues' setting, plus Middleton's own
 * one-line-per-book summary) precedes "BOOK I." itself - this is excluded
 * from Book I's text (not part of Cicero's dialogue, matching this app's
 * precedent of excluding a translator's introductory essay - see
 * scripts/import-plato-republic-en's treatment of Jowett's "Introduction and
 * Analysis"), logged as an anomaly rather than silently absorbed or dropped
 * unremarked.
 *
 * Structure: exactly 5 "BOOK <roman>." headers (I..V) within that region.
 * Each book opens with a one-line subtitle (e.g. "ON THE CONTEMPT OF
 * DEATH.") captured verbatim (trailing period stripped) as that Book's
 * Division.editorialTitle; the source prints these in inconsistent
 * typographic case (all-caps for four of the five, sentence case for Book
 * IV - "On other perturbations of the mind.") - kept exactly as printed
 * rather than normalised, since that inconsistency is itself part of what
 * the source actually prints (see about.json).
 *
 * This translation preserves Cicero's own traditional section numbering
 * inline as roman numerals ("I.", "II." ...), printed at the start of a
 * physical text LINE (not necessarily at the start of a blank-line-
 * separated paragraph - one genuine formatting quirk, confirmed by direct
 * inspection: at least one marker is glued directly onto the last line of a
 * preceding indented verse quotation with no blank line before it, e.g.
 * Book II's "IX." immediately follows the last line of a Sophocles
 * (Trachiniae) quotation glossing Hercules' endurance of pain - so this
 * importer locates markers by
 * scanning raw lines within each book's own text, not by only checking the
 * start of each blank-line-delimited paragraph). All 5 books' marker
 * sequences run perfectly contiguous 1..49/27/34/38/42 with zero rejected
 * candidates - i.e. every marker found is exactly the next expected value in
 * sequence, so there is no gap to disclose (unlike De Finibus's English
 * sibling, which has one).
 *
 * Faithfulness rules:
 *   - verbatim English (Yonge's own translation) reading text only; no
 *     modernising or "improving" the 1877 wording.
 *   - hard-wrapped physical lines within a paragraph are unwrapped (joined
 *     with a single space; final whitespace collapse handles the rest).
 *   - inline `[N]` bracketed footnote-reference markers (71 total in this
 *     region, always pure digits) are Gutenberg's own footnote apparatus -
 *     the footnote text itself lives in a single shared "FOOTNOTES:" section
 *     at the very end of the whole three-work volume, entirely outside this
 *     importer's extracted region - stripped from the reading text, counted
 *     but not preserved anywhere in this build.
 *   - inline `[Greek: <transliteration>]` bracketed asides (27 occurrences)
 *     are Gutenberg's OWN plain-text convention for representing a Greek
 *     word the translation prints in Greek script (plain ASCII text cannot
 *     encode polytonic Greek) - this is genuine content (a real word Yonge
 *     wrote in Greek), not editorial apparatus, so it is KEPT verbatim,
 *     bracket and all, exactly as transcribed.
 *   - underscore-delimited spans (e.g. "_A._", "_cor_" - Gutenberg's plain-
 *     text convention for italics: the dialogue's speaker initials in Book I
 *     and Cicero's own italicised Latin word-glosses throughout) have their
 *     delimiting underscores stripped, keeping the enclosed text - pure
 *     transport markup standing in for italic type, exactly like an HTML
 *     <hi rend="italic"> tag is unwrapped elsewhere in this app.
 *   - the leading "N. " chapter-numeral prefix on a section's first line is
 *     stripped from the reading text (it becomes that Section's
 *     Division.number instead - see data/tusculan-disputations-en/types.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-plato-c-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/tusculan-disputations-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_TXT = join(HERE, 'raw', 'pg14988.txt');
const OUT_DIR = join(REPO_ROOT, 'data', 'tusculan-disputations-en');

const WORK_ID = 'tusculan-disputations-en';
const EXPECTED_ROMANS = ['I', 'II', 'III', 'IV', 'V'];
const EXPECTED_SECTION_COUNTS = [49, 27, 34, 38, 42];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

function romanToArabic(roman: string): number | null {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = VALUES[roman[i]!];
    const next = VALUES[roman[i + 1] ?? ''];
    if (cur === undefined) return null;
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total > 0 ? total : null;
}

/**
 * Strip Gutenberg's plain-text italic convention (`_word_`), keeping the
 * enclosed text. Only ever called AFTER a paragraph's hard-wrapped physical
 * lines have already been joined with spaces (see splitParagraphs) - an
 * italicised span routinely crosses a mid-paragraph line wrap in this
 * source (e.g. "_animam agere_, to live; _animam\nefflare_, to expire;"),
 * so matching must not be newline-bounded; it IS bounded to a single
 * paragraph (the caller never passes text spanning a blank-line break).
 */
function stripItalicUnderscores(s: string): string {
  return s.replace(/_([^_]{1,120})_/g, '$1');
}

/** Splits a raw chunk of Gutenberg plain text into unwrapped paragraphs (blank-line-separated, hard-wrap joined with spaces FIRST so a mid-paragraph-wrapped italic span isn't newline-broken), footnote markers stripped, italics unwrapped. */
function splitParagraphs(chunk: string, countFootnoteRef: () => void): string[] {
  const withoutFootnotes = chunk.replace(/\[(\d+)\]/g, () => {
    countFootnoteRef();
    return '';
  });
  return withoutFootnotes
    .split(/\n\s*\n+/)
    .map((block) => cleanText(stripItalicUnderscores(block.split('\n').join(' '))))
    .filter((p) => p.length > 0);
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const raw = readFileSync(RAW_TXT, 'utf8');
  process.stdout.write(`parsing ${RAW_TXT} ...\n`);

  const anomalies: Anomaly[] = [];
  let totalFootnoteRefsStripped = 0;

  const startMarker = 'THE TUSCULAN DISPUTATIONS.';
  const endMarker = 'THE NATURE OF THE GODS.';
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    fail(`could not locate the Tusculan-Disputations-only START/END boundary text in ${RAW_TXT}`);
  }
  // Confirm uniqueness of both boundary markers (no table-of-contents-style duplicate to disambiguate).
  if (raw.indexOf(startMarker, startIdx + 1) >= 0) fail(`"${startMarker}" occurs more than once in the source; boundary is ambiguous`);
  if (raw.indexOf(endMarker, endIdx + 1) >= 0) fail(`"${endMarker}" occurs more than once in the source; boundary is ambiguous`);
  const region = raw.slice(startIdx + startMarker.length, endIdx);

  const bookHeaderRe = /^BOOK ([IVX]+)\.\s*$/gm;
  const headers: Array<{ roman: string; matchStart: number; contentStart: number }> = [];
  let hm: RegExpExecArray | null;
  while ((hm = bookHeaderRe.exec(region))) {
    headers.push({ roman: hm[1]!, matchStart: hm.index, contentStart: hm.index + hm[0].length });
  }
  if (headers.length !== 5) fail(`expected exactly 5 "BOOK <roman>." headers in the Tusculan-Disputations-only region, found ${headers.length}`);
  const gotRomans = headers.map((h) => h.roman);
  if (JSON.stringify(gotRomans) !== JSON.stringify(EXPECTED_ROMANS)) {
    fail(`Book headers out of sequence: got [${gotRomans.join(', ')}], want [${EXPECTED_ROMANS.join(', ')}]`);
  }

  // Front matter (Gutenberg boilerplate before "THE TUSCULAN DISPUTATIONS.",
  // and the translator's own "INTRODUCTION." essay between the title and
  // "BOOK I.") is excluded entirely - never part of any Book's own text.
  const introChunk = region.slice(0, headers[0]!.matchStart);
  anomalies.push({
    where: `${WORK_ID} / front matter`,
    note:
      `The translator's/editor's own "INTRODUCTION." essay (historical background on the Tusculan setting, plus Middleton's one-line-per-book summary - ${introChunk.trim().length} chars) precedes "BOOK I." in the source and is NOT Cicero's dialogue text; excluded entirely, matching this app's precedent (scripts/import-plato-republic-en excludes Jowett's introductory essay the same way).`,
  });

  const MARKER_RE = /^([IVXLC]+)\.[ \t]+/gm;
  const divisions: Division[] = [];

  for (let i = 0; i < headers.length; i++) {
    const bookNum = i + 1;
    const chunkStart = headers[i]!.contentStart;
    const chunkEnd = i + 1 < headers.length ? headers[i + 1]!.matchStart : region.length;
    const chunk = region.slice(chunkStart, chunkEnd);

    MARKER_RE.lastIndex = 0;
    const markers: Array<{ roman: string; arabic: number; matchStart: number; contentStart: number }> = [];
    let mm: RegExpExecArray | null;
    while ((mm = MARKER_RE.exec(chunk))) {
      const arabic = romanToArabic(mm[1]!);
      if (arabic === null) fail(`book-${bookNum}: unparseable roman numeral marker "${mm[1]}"`);
      markers.push({ roman: mm[1]!, arabic: arabic!, matchStart: mm.index, contentStart: mm.index + mm[0].length });
    }
    if (markers.length === 0) fail(`book-${bookNum}: no "I." style section markers found at all`);
    markers.forEach((mk, idx) => {
      if (mk.arabic !== idx + 1) {
        fail(`book-${bookNum}: section marker "${mk.roman}" (arabic ${mk.arabic}) is not the expected next value ${idx + 1}`);
      }
    });

    // Subtitle: everything between this book's header and its first marker.
    const subtitleRaw = chunk.slice(0, markers[0]!.matchStart);
    const subtitle = stripItalicUnderscores(subtitleRaw.split('\n').join(' ')).replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    if (subtitle.length === 0) fail(`book-${bookNum}: no subtitle text found before the first section marker`);

    const want = EXPECTED_SECTION_COUNTS[i]!;
    if (markers.length !== want) fail(`book-${bookNum}: expected ${want} sections, found ${markers.length}`);

    const sectionDivisions: Division[] = markers.map((mk, idx) => {
      const sliceStart = mk.contentStart;
      const sliceEnd = idx + 1 < markers.length ? markers[idx + 1]!.matchStart : chunk.length;
      const raw = chunk.slice(sliceStart, sliceEnd);
      const paragraphs = splitParagraphs(raw, () => {
        totalFootnoteRefsStripped += 1;
      });
      if (paragraphs.length === 0) fail(`book-${bookNum}-sec-${mk.arabic}: no surviving paragraph text`);
      const passage: Passage = { n: '', text: paragraphs.join('\n\n'), ref: null };
      return {
        id: `book-${bookNum}-sec-${mk.arabic}`,
        number: String(mk.arabic),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
    });

    divisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: subtitle,
      children: sectionDivisions,
      passages: [],
    });
  }

  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: `${totalFootnoteRefsStripped} inline "[N]" bracketed footnote-reference markers (Gutenberg's own apparatus - the footnote text lives in a single shared "FOOTNOTES:" section at the end of the whole three-work volume, entirely outside this importer's extracted region) were stripped from the reading text; not preserved anywhere in this build.`,
  });
  anomalies.push({
    where: `${WORK_ID} / Greek transliterations`,
    note: '27 inline "[Greek: <transliteration>]" bracketed asides (Gutenberg\'s own plain-text convention for a word the translation prints in actual Greek script, which plain ASCII text cannot encode) were KEPT verbatim, bracket and all - this is genuine translated content, not editorial apparatus.',
  });
  anomalies.push({
    where: `${WORK_ID} / italics`,
    note: 'Underscore-delimited spans (Gutenberg\'s plain-text convention for italic type - the dialogue\'s speaker initials in Book I, e.g. "_A._"/"_M._", and Cicero\'s own italicised Latin word-glosses throughout) have their delimiting underscores stripped, keeping the enclosed text; not counted individually (239 occurrences, all confirmed well-formed on direct inspection).',
  });
  anomalies.push({
    where: `${WORK_ID} / book subtitles`,
    note: 'Each Book\'s Division.editorialTitle is this edition\'s own printed subtitle, trailing period stripped, otherwise verbatim - including its inconsistent typographic case (ALL CAPS for Books I, II, III and V; sentence case, "On other perturbations of the mind.", for Book IV) - preserved exactly as printed rather than normalised.',
  });
  anomalies.push({
    where: `${WORK_ID} / reference scheme`,
    note: 'Division.ref is null throughout this edition (Book and Section alike): the printed section numeral is captured as Division.number instead, and this plain-text transcription carries no other reference apparatus of its own.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Tusculan Disputations',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge (chiefly)',
    edition: "Harper's New Classical Library, 1877",
    provenance:
      'Project Gutenberg ebook #14988, "Cicero\'s Tusculan Disputations; Also, Treatises On the Nature of the Gods, and On the Commonwealth" (Harper & Brothers, New York, 1877), fetched directly and committed to this repository at scripts/import-tusculan-disputations-en/raw/pg14988.txt. Only the Tusculan-Disputations-only portion of this shared three-work volume is used here - see index.ts\'s module doc for the exact delimiting text; "On the Nature of the Gods" and "On the Commonwealth" are out of scope and not present in this data.',
    license:
      "This translation is in the public domain (first published 1877, well over 95 years ago). The Project Gutenberg transcription of it is also in the public domain in the United States; see gutenberg.org/ebooks/14988 for Project Gutenberg's own terms on redistributing their specific eBook file, which this importer respects by keeping only the translated text itself rather than Gutenberg's own licence header/footer.",
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'This is the English translation of Cicero\'s Tusculan Disputations printed in Harper\'s New Classical Library (1877), attributed on its own title page to Charles Duke Yonge "chiefly" (the volume\'s title page hedges the attribution; this importer reproduces that phrasing rather than asserting sole authorship). It is bundled from a shared Gutenberg volume that also contains "On the Nature of the Gods" and "On the Commonwealth" - only the Tusculan Disputations portion is included here.',
          'Navigation is by Book (5) and Section - this translation\'s own printed roman-numeral numbering (49/27/34/38/42 sections in Books I-V respectively), preserved inline in the source and captured here as each Section\'s Division.number.',
          'A short "INTRODUCTION." (historical background plus a one-line-per-book summary, credited by the source to Conyers Middleton) precedes Book I in the printed edition and is not included here - only the five Books of the dialogue itself, matching this library\'s treatment of a translator\'s introductory essay elsewhere (e.g. Jowett\'s "Introduction and Analysis" in Plato\'s Republic).',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  let totalSections = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    totalSections += b.children.length;
    const chars = b.children.reduce((n, s) => n + s.passages[0]!.text.length, 0);
    totalChars += chars;
    process.stdout.write(`  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections  "${b.editorialTitle}"\n`);
  }
  process.stdout.write(
    `\n  5 books  ${totalSections} sections  ${totalChars} chars  ${totalFootnoteRefsStripped} footnote refs stripped\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:tusculan-disputations-en` next.\n');
}

main();
