/**
 * Aristotle, *Politics* - "A Treatise on Government", William Ellis's
 * translation (London & Toronto: J. M. Dent & Sons Ltd.; New York: E. P.
 * Dutton & Co., Everyman's Library, first issued 1912), Project Gutenberg
 * ebook #6762 (https://www.gutenberg.org/ebooks/6762). Run-once ingestion
 * pipeline:
 *
 *   npx tsx scripts/import-politics-en/index.ts
 *
 * Reads scripts/import-politics-en/raw/pg6762.txt (fetched once from
 * gutenberg.org and cached here - nothing is downloaded at import time) and
 * writes:
 *   data/politics-en/work.json       - the GenericWork: 8 Books, each with
 *                                       its own numbered Chapters (103 total)
 *   data/politics-en/about.json      - provenance / licence / prose
 *   data/politics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-politics-en/validate.ts`.
 *
 * This is flowing plain-text prose with no markup, like
 * scripts/import-plato-republic-en/index.ts (its technique is followed
 * closely here), NOT a TEI/wiki source, so this file has its own from-
 * scratch parser. Key facts about this source, verified by direct
 * inspection of the cached raw/pg6762.txt before writing this importer:
 *
 *   - Gutenberg boilerplate (the standalone start/end license banners) is
 *     stripped via the exact "*** START ... ***" / "*** END ... ***" marker
 *     lines. Within the licensed region, front matter (a "Produced by Eric
 *     Eldred" credit, the title page, A. D. Lindsay's signed "INTRODUCTION"
 *     essay, and a bibliography) precedes the real translation, and an
 *     alphabetical "INDEX" (keyed to the ORIGINAL PRINT edition's page
 *     numbers, not to anything reconstructable here) follows it. None of
 *     this front/back matter contains any line matching this source's own
 *     "BOOK <roman>" or "CHAPTER <roman>" heading pattern (confirmed by
 *     direct scan of every such line in the file: exactly 8 BOOK headers and
 *     103 CHAPTER headers exist in the whole file, all within the real
 *     translation region, in the exact expected sequence) - so, unlike
 *     Republic-en, no second-occurrence disambiguation trick is needed; the
 *     real-text region is simply "from the first BOOK header to the line
 *     immediately before the INDEX heading".
 *   - The 8 Book breaks are lines matching exactly /^BOOK ([IVX]+)$/ (own
 *     line, nothing else): BOOK I-VIII in strict sequence. Within each Book,
 *     Chapter breaks are lines matching exactly /^CHAPTER ([IVX]+)$/, also
 *     restarting at "I" for every Book, exactly matching this translation's
 *     own printed structure (chapter counts per book, confirmed by direct
 *     count: I=13, II=12, III=18, IV=16, V=12, VI=8, VII=17, VIII=7; 103
 *     total).
 *   - Paragraphs are separated by one-or-more blank lines and each paragraph
 *     is hard-wrapped; unwrapped here by joining a paragraph's lines with a
 *     single space (as in Republic-en).
 *   - Bekker page markers: unlike Republic-en (which carries none at all),
 *     THIS source DOES print them, inline in the running prose, as bracketed
 *     tokens - "[1252b]", "[1253a]", etc. (161 occurrences total, including
 *     one transcription irregularity - see below). The very
 *     first one, at the start of Book I Chapter I, is spelled out in full as
 *     "[Bekker 1252a]"; every subsequent one is the bare "[<page><column>]"
 *     form. Both forms are recognised by MARKER_RE below. These markers are
 *     citation apparatus, not Aristotle's/Ellis's prose, so - mirroring
 *     data/categoriae-en's handling of its own inline Bekker anchors - they
 *     are stripped from the reading text and instead used to reconstruct
 *     each Chapter's Division.ref as "Bekker <start>-<end>" (continuous
 *     numbering: a chapter's end is whatever marker is in force at the
 *     point the next chapter begins). One marker is transcribed with a
 *     stray capital "I" in place of the digit "1" ("[I259b]", Book I Chapter
 *     XI) - a source/transcription irregularity, normalised for the PURPOSE
 *     OF COMPUTING Division.ref (since a citation range needs a real page
 *     number) but logged verbatim to anomalies.json, not silently ignored.
 *   - No footnote/endnote apparatus of any kind was found in the real
 *     translation region (checked directly: no "[Footnote", no bracketed
 *     digit markers, no trailing notes section before "INDEX").
 *   - One further stray token was found and is preserved VERBATIM, exactly
 *     as printed, per this repo's rule of never discarding or silently
 *     correcting source text: the single word "Ed." appears embedded
 *     mid-sentence in Book I Chapter I ("...every society Ed. is
 *     established..."), breaking the grammar of the sentence. Its origin is
 *     unclear (most likely a transcription-era scanno in this specific
 *     Gutenberg edition rather than anything meaningful in Ellis's own
 *     printed text), but it is kept exactly as found and logged to
 *     anomalies.json rather than removed or "fixed".
 *
 * Schema: Politics-en is a two-level Book -> Chapter tree, one Passage per
 * Chapter (that chapter's paragraphs joined with "\n\n") - the same shape as
 * data/nicomachean-ethics-en. See data/politics-en/types.ts for the full
 * schema doc.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/politics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_TXT = join(HERE, 'raw', 'pg6762.txt');
const OUT_DIR = join(REPO_ROOT, 'data', 'politics-en');

const WORK_ID = 'politics-en';
const ROMAN_BOOKS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const EXPECTED_CHAPTER_COUNTS = [13, 12, 18, 16, 12, 8, 17, 7];
const EXPECTED_TOTAL_MARKERS = 161; // 160 plain-digit markers + 1 known "[I259b]" transcription irregularity

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
    .map((block) => block.split('\n').join(' '))
    .map((s) => s.trim())
    .filter((p) => p.length > 0);
}

/** Bekker page-marker token: "[Bekker 1252a]" (the one spelled-out occurrence) or the bare "[1252b]" form; also tolerates the one known "[I259b]" transcription irregularity (capital I for digit 1). */
const MARKER_RE = /\[(?:Bekker\s+)?([I1][0-9]{3}[ab])\]/g;

interface MarkerHit {
  raw: string; // exact bracketed text incl. optional "Bekker " prefix, e.g. "[Bekker 1252a]" or "[I259b]"
  normalized: string; // e.g. "1252a" / "1259b" (leading "I" normalised to "1")
}

function findMarkers(text: string): MarkerHit[] {
  const hits: MarkerHit[] = [];
  const re = new RegExp(MARKER_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const token = m[1]!;
    hits.push({ raw: m[0]!, normalized: token[0] === 'I' ? '1' + token.slice(1) : token });
  }
  return hits;
}

/** Strip Bekker marker tokens from reading text, collapsing the surrounding whitespace as a normal cleanText pass will. */
function stripMarkers(text: string): string {
  return text.replace(MARKER_RE, ' ');
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const raw = readFileSync(RAW_TXT, 'utf8').replace(/\r\n/g, '\n');
  process.stdout.write(`parsing ${RAW_TXT} ...\n`);

  const anomalies: Anomaly[] = [];

  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK POLITICS: A TREATISE ON GOVERNMENT ***';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK POLITICS: A TREATISE ON GOVERNMENT ***';
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    fail(`could not locate Gutenberg START/END boundary markers in ${RAW_TXT}`);
  }
  const licensed = raw.slice(startIdx + startMarker.length, endIdx);

  const bookHeaderRe = /^BOOK ([IVX]+)[ \t]*$/gm;
  const bookHeaders: Array<{ roman: string; matchStart: number; contentStart: number }> = [];
  {
    let hm: RegExpExecArray | null;
    while ((hm = bookHeaderRe.exec(licensed))) {
      bookHeaders.push({ roman: hm[1]!, matchStart: hm.index, contentStart: hm.index + hm[0]!.length });
    }
  }
  if (bookHeaders.length !== ROMAN_BOOKS.length) {
    fail(`expected exactly ${ROMAN_BOOKS.length} "BOOK <roman>" headers, found ${bookHeaders.length}`);
  }
  const gotBookRomans = bookHeaders.map((h) => h.roman);
  if (JSON.stringify(gotBookRomans) !== JSON.stringify(ROMAN_BOOKS)) {
    fail(`Book headers out of sequence: got [${gotBookRomans.join(', ')}], want [${ROMAN_BOOKS.join(', ')}]`);
  }

  const indexHeadingMatch = /^INDEX[ \t]*$/m.exec(licensed);
  if (!indexHeadingMatch) fail('could not locate the trailing "INDEX" heading marking the end of the real translation region');
  const realTextEnd = indexHeadingMatch.index;
  if (realTextEnd <= bookHeaders[bookHeaders.length - 1]!.matchStart) {
    fail('"INDEX" heading occurs before the last BOOK header - unexpected file layout');
  }

  let totalMarkers = 0;
  let irregularMarkerFound = false;
  let edStrayFound = false;
  // Bekker pagination is continuous across the whole work (it is not reset at Book
  // boundaries), so this is carried across Book boundaries too - see the
  // book-8-ch-1 handling below and the matching anomaly note.
  let lastMarkerOverall: string | null = null;
  let chaptersWithNoOwnMarker = 0;

  const divisions: Division[] = [];
  for (let bi = 0; bi < bookHeaders.length; bi++) {
    const bookNum = bi + 1;
    const bookStart = bookHeaders[bi]!.contentStart;
    const bookEnd = bi + 1 < bookHeaders.length ? bookHeaders[bi + 1]!.matchStart : realTextEnd;
    const bookChunk = licensed.slice(bookStart, bookEnd);

    const chapterHeaderRe = /^CHAPTER ([IVX]+)[ \t]*$/gm;
    const chapterHeaders: Array<{ roman: string; matchStart: number; contentStart: number }> = [];
    {
      let cm: RegExpExecArray | null;
      while ((cm = chapterHeaderRe.exec(bookChunk))) {
        chapterHeaders.push({ roman: cm[1]!, matchStart: cm.index, contentStart: cm.index + cm[0]!.length });
      }
    }
    const expectedCount = EXPECTED_CHAPTER_COUNTS[bi]!;
    if (chapterHeaders.length !== expectedCount) {
      fail(`Book ${ROMAN_BOOKS[bi]} (book-${bookNum}): expected ${expectedCount} "CHAPTER <roman>" headers, found ${chapterHeaders.length}`);
    }
    if (bookChunk.slice(0, chapterHeaders[0]!.matchStart).trim().length !== 0) {
      fail(`Book ${ROMAN_BOOKS[bi]}: unexpected non-whitespace content before its first CHAPTER header: ${JSON.stringify(bookChunk.slice(0, chapterHeaders[0]!.matchStart).trim().slice(0, 120))}`);
    }

    const chapterDivisions: Division[] = [];

    for (let ci = 0; ci < chapterHeaders.length; ci++) {
      const chapterNum = ci + 1;
      const wantRoman = arabicToRomanLocal(chapterNum);
      if (chapterHeaders[ci]!.roman !== wantRoman) {
        fail(`book-${bookNum}: chapter at position ${ci} is headed "CHAPTER ${chapterHeaders[ci]!.roman}", expected "CHAPTER ${wantRoman}"`);
      }
      const chStart = chapterHeaders[ci]!.contentStart;
      const chEnd = ci + 1 < chapterHeaders.length ? chapterHeaders[ci + 1]!.matchStart : bookChunk.length;
      const chapterChunk = bookChunk.slice(chStart, chEnd);

      const markers = findMarkers(chapterChunk);
      totalMarkers += markers.length;
      for (const hit of markers) {
        if (/^[I]/.test(hit.raw.replace(/^\[(?:Bekker\s+)?/, ''))) {
          irregularMarkerFound = true;
          anomalies.push({
            where: `book-${bookNum}-ch-${chapterNum}`,
            note: `Bekker marker transcription irregularity, preserved as found but normalised for Division.ref computation: the source prints ${JSON.stringify(hit.raw)} (a stray capital "I" in place of the digit "1") where every other marker in this text uses a plain digit; read here as Bekker page ${hit.normalized}.`,
          });
        }
      }
      if (markers.length === 0) chaptersWithNoOwnMarker++;
      const startRef = markers.length > 0 ? markers[0]!.normalized : lastMarkerOverall;
      if (markers.length > 0) lastMarkerOverall = markers[markers.length - 1]!.normalized;
      // end ref: the marker in force when the NEXT chapter begins, i.e. the last marker seen up through this chapter (continuous numbering, carried across Book boundaries)
      const chapterEndRef = lastMarkerOverall;

      const cleanedChunk = stripMarkers(chapterChunk);
      const paragraphs = splitParagraphs(cleanedChunk).map((p) => cleanText(p));
      if (paragraphs.length === 0) fail(`book-${bookNum}-ch-${chapterNum}: zero paragraphs`);

      if (bookNum === 1 && chapterNum === 1) {
        const joinedCheck = paragraphs.join(' ');
        if (joinedCheck.includes(' Ed. ')) edStrayFound = true;
      }

      const passage: Passage = { n: '', text: paragraphs.join('\n\n'), ref: null };
      const division: Division = {
        id: `book-${bookNum}-ch-${chapterNum}`,
        number: String(chapterNum),
        ref: startRef && chapterEndRef ? `Bekker ${startRef}–${chapterEndRef}` : null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
      chapterDivisions.push(division);
    }

    divisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    });
  }

  if (totalMarkers !== EXPECTED_TOTAL_MARKERS) {
    fail(`expected exactly ${EXPECTED_TOTAL_MARKERS} inline Bekker markers across the whole work, counted ${totalMarkers}`);
  }
  if (!irregularMarkerFound) fail('expected the one known "[I259b]" marker irregularity to be found - not found; investigate before proceeding');
  if (!edStrayFound) fail('expected the one known stray "Ed." token in book-1-ch-1 to be found verbatim - not found; investigate before proceeding');

  if (chaptersWithNoOwnMarker > 0) {
    anomalies.push({
      where: `${WORK_ID} / book-8-ch-1`,
      note:
        'This chapter prints no inline Bekker marker of its own at all (the source jumps from the last marker in ' +
        'Book VII, "[1337a]", straight to the next one, "[1337b]", which falls inside book-8-ch-2). Since Bekker ' +
        'pagination is continuous across the whole work and not reset at Book boundaries, this chapter\'s ' +
        'Division.ref ("Bekker 1337a–1337a") is carried forward from whatever marker was last in force when it ' +
        'began, rather than left null - this is the accurate continuous-numbering position, not a fabricated one, ' +
        'but is disclosed here because it differs from every other chapter (which all contain at least one marker ' +
        'of their own).',
    });
  }
  anomalies.push({
    where: `${WORK_ID} / Bekker references`,
    note:
      `Unlike the task brief's own initial expectation, this Everyman-edition Gutenberg text DOES print inline Bekker ` +
      `page/column markers throughout (${totalMarkers} of them: "[Bekker 1252a]" once at the very start, then the bare ` +
      `"[1252b]"/"[1253a]"/... form thereafter). Division.ref is reconstructed from them as "Bekker <start>–<end>" per ` +
      `chapter, where <end> is whichever marker is in force at the point the next chapter begins (continuous ` +
      `numbering, not gapped, exactly as this app's data/categoriae-en already does for its own inline Bekker ` +
      `anchors). The markers themselves are stripped out of the reading text - they are citation apparatus, not ` +
      `Aristotle's/Ellis's prose. Passage.ref stays null throughout: no marker is printed at every paragraph break, ` +
      `only at the coarser points described above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / stray "Ed." token`,
    note:
      'Book 1 Chapter I contains a single stray word "Ed." embedded mid-sentence ("...every society Ed. is ' +
      'established for some good purpose..."), breaking the grammar of the sentence. Its origin is unclear - most ' +
      'likely a transcription-era scanno specific to this Gutenberg edition rather than anything meaningful in ' +
      "Ellis's own printed 1912 text - but per this repo's rule of never discarding or silently correcting source " +
      'text, it is preserved exactly as found rather than removed or "fixed".',
  });
  anomalies.push({
    where: `${WORK_ID} / front and back matter excluded`,
    note:
      'A. D. Lindsay\'s signed "INTRODUCTION" essay, the bibliography that follows it, and the trailing alphabetical ' +
      '"INDEX" (keyed to the original print edition\'s own page numbers, which this build has no way to reproduce) ' +
      'are excluded as apparatus, not Aristotle\'s/Ellis\'s translated text. No footnote/endnote apparatus of any ' +
      'kind was found anywhere in the real translation region.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Politics',
    author: 'Aristotle',
    language: 'en',
    translator: 'William Ellis',
    edition: 'A Treatise on Government (Everyman\'s Library, J. M. Dent & Sons, first issued 1912)',
    provenance:
      'Text: Project Gutenberg ebook #6762 (www.gutenberg.org/ebooks/6762), fetched directly and cached at ' +
      "scripts/import-politics-en/raw/pg6762.txt. William Ellis's translation of the Politics, first issued in this " +
      "Everyman's Library edition in 1912 (reprinted 1919, 1923, 1928 per the Gutenberg edition's own title page); " +
      'Ellis\'s translation itself dates from the 18th century (first published 1776) and was revised for this ' +
      'Everyman printing.',
    license:
      "Ellis's translation is in the public domain (first published 1776, revised for this 1912 printing; both the " +
      'translator and this printing are long out of copyright). The Project Gutenberg transcription of it is also in ' +
      'the public domain in the United States; see gutenberg.org/ebooks/6762 for Project Gutenberg\'s own terms on ' +
      "redistributing their specific eBook file, which this importer respects by keeping the text itself rather than " +
      "Gutenberg's licence header/footer.",
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is William Ellis's English translation of Aristotle's Politics, via Project Gutenberg ebook #6762 " +
            "(the 1912 Everyman's Library printing, J. M. Dent & Sons / E. P. Dutton & Co.).",
          'Navigation is by Book and Chapter (8 Books, 103 Chapters total), matching this source\'s own "BOOK ' +
            '<roman>" / "CHAPTER <roman>" headings.',
          "A. D. Lindsay's signed \"Introduction\" essay and the bibliography that precede the translation proper in " +
            'the printed edition are not included here - only Aristotle\'s text, in Ellis\'s translation.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Unlike some other English translations bundled in this library, this source DOES print inline Bekker ' +
            'page/column markers throughout its reading text (161 of them, including one transcription irregularity). ' +
            'Division.ref for each Chapter is ' +
            'reconstructed from them as "Bekker <start>–<end>", covering the Bekker range that chapter\'s printed ' +
            'text spans; Book Division.ref and every Passage.ref are null (no marker is printed at a finer grain than ' +
            'this). See anomalies.json for the one transcription irregularity found in these markers.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the complete machine-readable log: the Bekker-reference reconstruction method, one ' +
            'marker transcription irregularity (a stray capital "I" for the digit "1"), one preserved stray "Ed." ' +
            'token mid-sentence in Book 1 Chapter I, and the excluded front/back matter (Introduction, bibliography, ' +
            'index). Nothing is fabricated, summarised, or silently corrected; every irregularity found by direct ' +
            'inspection of the source is disclosed here rather than papered over.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalChapters = divisions.reduce((n, d) => n + d.children.length, 0);
  const totalChars = divisions.reduce(
    (n, d) => n + d.children.reduce((m, c) => m + c.passages[0]!.text.length, 0),
    0,
  );
  process.stdout.write(
    `\n  ${divisions.length} books  ${totalChapters} chapters  ${totalChars} chars  ${totalMarkers} Bekker markers\n`,
  );
  process.stdout.write('Done. Run `npx tsx scripts/import-politics-en/validate.ts` next.\n');
}

function arabicToRomanLocal(n: number): string {
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let remaining = n;
  let out = '';
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      out += symbol;
      remaining -= value;
    }
  }
  return out;
}

main();
