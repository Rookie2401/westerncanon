/**
 * Dante, *De Vulgari Eloquentia* - English translation by A. G. Ferrers
 * Howell, in "A translation of the Latin works of Dante Alighieri" (Temple
 * Classics, London: J. M. Dent, 1904). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/de-vulgari-en/index.ts
 *
 * SOURCE. A previous attempt at this lane tried to base the import on
 * English Wikisource's page-scan transclusion of this same 1904 Dent volume
 * (see the old fetchPages.ts, since deleted) - but of the 115 djvu pages
 * covering this work, only 17 carry any Wikisource transcription at all (3
 * at "proofread" quality, 14 at the lower "not proofread" quality), so
 * Wikisource could not supply the text. This import instead uses
 * archive.org item translationoflat00dantuoft, a University of Toronto
 * (Robarts) scan of the SAME 1904 Dent printing (confirmed by its own
 * metadata: publisher "London : Dent", date 1904, creators Dante/Howell/
 * Wicksteed; not access-restricted; collections internetarchivebooks,
 * toronto) - its own ABBYY OCR text layer (raw/translationoflat00dantuoft_
 * djvu.xml, HIDDENTEXT layer, fetched once and cached; nothing is
 * downloaded at build/run time) used as the base text, corrected page by
 * page against the page image, exactly like this batch's monarchia-la lane.
 *
 * LEAF <-> PRINTED PAGE MAPPING. Confirmed independently (via archive.org's
 * own _page_numbers.json leaf/pageNumber index, and by eye against several
 * page images): djvu leaf N = printed page (N - 19) throughout the range
 * that matters here (leaf 20 = printed p.1, ... leaf 134 = printed p.115,
 * leaf 135 = printed p.116 (Appendix I) ... leaf 142 = printed p.123
 * (Appendix's last page)). raw/images-by-page/pNNN.jpg (copied once from
 * raw/images/page-0<N+19>.jpg, the same page scans a prior attempt at this
 * lane already fetched from Wikisource - reused here since the djvu page
 * numbering lines up exactly) are the page images used for proofreading.
 *
 * EXTRACTION. raw/extractPages.mjs parses the djvu.xml HIDDENTEXT layer
 * directly (not via Wikisource) into one raw OCR text file per printed page,
 * raw/ocr/pNNN.txt, doing two structural things no plain LINE-join can:
 * (a) drops the printed running head (page-number + book/chapter title) from
 * the top of each page, detected positionally (a verso head is "<page#>
 * <Title>", a recto head is "<roman>. <Title> <page#>") rather than by exact
 * wording, because this scan's OCR of the header text itself is heavily
 * garbled ("ELOQUHNTIA", "SHCOND", "SECONt BOO.^" have all been observed);
 * (b) strips this edition's marginal shoulder-caption words (short bold
 * subject-tags in the OUTER margin beside a paragraph's opening lines, e.g.
 * "The subject defined", "Neither angels nor brutes speak" - navigational
 * apparatus, not Dante's or Howell's own prose) via a per-page coordinate
 * rule (median body-column left/right edge from the >=6-word lines; any
 * leading/trailing line words beyond that edge by more than 60px are
 * caption debris, not body text) - ABBYY's own OCR does not separate these
 * into a distinct region, so uncorrected they land mid-sentence ("The But
 * because the business...").
 *
 * PROOFREADING. Every one of the 115 pages was then read against its own
 * page image and corrected by hand; every correction is logged, one file
 * per printed page, at raw/corrections/pNNN.json (find/replace/note
 * triples), applied deterministically below (applyCorrections()) - a
 * `find` must match its page's OCR text exactly once, or the build stops.
 *
 * STRUCTURE. Two top-level Divisions (book-1, book-2), 19 + 14 chapter
 * child-Divisions (book-N-ch-M), confirmed independently by this importer's
 * own sequential "CHAPTER <roman>" scan (findChapterMarkers()), matching
 * the same 19+14 division already shipped for the Latin original
 * (dante-de-vulgari-eloquentia-la, Giuliani's edition). Each chapter's first
 * Passage is Howell's own bracketed argument/summary, printed at the head of
 * every chapter (e.g. "[The author intends to treat of the vernacular
 * ...]") - part of the 1904 text, kept verbatim, not folded into the reading
 * prose. Every further Passage is one printed paragraph of the chapter's
 * translated prose: this edition marks a paragraph break only by first-line
 * indentation, never a blank OCR line, so - unlike this batch's monarchia-la
 * lane, which disclosed the same limitation as unrecoverable - the breaks
 * here are recovered from this scan's own word coordinates
 * (raw/detectParagraphs.mjs: a line whose first surviving word sits well
 * right of that page's median body-left edge is a paragraph's own first
 * line), not assumed, and every split point is a verbatim raw/paragraph-
 * starts/pNNN.json marker matched back into the joined text below - see that
 * script's own header comment for the method and its calibration.
 *
 * EXCLUDED (apparatus, disclosed in anomalies.json - not Dante's or Howell's
 * own running text): a "Notes to Chapter N" section following every
 * chapter's prose (numbered scholarly annotations cross-referencing Dante's
 * other works, e.g. "2. Compare Paradiso, II. 7..." - a different register
 * entirely from the translation itself) before the next chapter begins; a
 * one-time editorial paragraph after Book I Chapter I's own prose explaining
 * this edition's own chapter-heading convention ("The original chapter
 * headings, which are not by the hand of Dante ... have been replaced by
 * summaries..."); the marginal shoulder-captions (see EXTRACTION above); and
 * the book's front matter (half-title, contents) and its pp.116-123
 * "Appendix" (the translator's own notes on the history/date/title of the
 * work and on some textual points - editorial back matter, not Dante's
 * text, not run as part of this import; see about.json).
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, type Anomaly } from '../shared/text.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WORK_ID = 'dante-de-vulgari-eloquentia-en';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);
const RAW = join(HERE, 'raw');

const FIRST_PAGE = 1;
const LAST_PAGE = 115;
const EXPECTED_CHAPTERS: Record<1 | 2, number> = { 1: 19, 2: 14 };

interface Correction {
  find: string;
  replace: string;
  note: string;
}

function applyCorrections(page: number, rawText: string): { text: string; count: number } {
  const file = join(RAW, 'corrections', `p${String(page).padStart(3, '0')}.json`);
  if (!existsSync(file)) return { text: rawText, count: 0 };
  const corrections = JSON.parse(readFileSync(file, 'utf8')) as Correction[];
  let text = rawText;
  for (const c of corrections) {
    const idx = text.indexOf(c.find);
    if (idx === -1) {
      process.stderr.write(`STOP (de-vulgari-en): correction not found on p${page}: ${JSON.stringify(c.find)}\n`);
      process.exit(1);
    }
    const idx2 = text.indexOf(c.find, idx + 1);
    if (idx2 !== -1) {
      process.stderr.write(`STOP (de-vulgari-en): correction ambiguous (matches twice) on p${page}: ${JSON.stringify(c.find)}\n`);
      process.exit(1);
    }
    text = text.slice(0, idx) + c.replace + text.slice(idx + c.find.length);
  }
  return { text, count: corrections.length };
}

// Plain-ASCII sentinel marking a line-end hyphen pending resolution once the next line/page's text is known - same
// device as monarchia-la's HYPHEN_MARKER.
const HYPHEN_MARKER = '@@HYPHEN@@';

/** Join every page's lines (in page order) into one continuous string, resolving a trailing line-end hyphen (a
 * word split across a line or page boundary) by fusing directly with no space, and every other line break with a
 * single space. Whitespace inside each line is left for cleanText() to normalise afterward. */
function joinLines(allLines: string[]): string {
  let out = '';
  for (const raw0 of allLines) {
    const line = raw0.replace(/-$/, HYPHEN_MARKER);
    if (out.endsWith(HYPHEN_MARKER)) out = out.slice(0, -HYPHEN_MARKER.length) + line.replace(/^\s+/, '');
    else out += (out.length > 0 ? ' ' : '') + line;
  }
  if (out.includes(HYPHEN_MARKER)) {
    process.stderr.write('STOP (de-vulgari-en): unresolved line-end hyphen marker remains in joined text\n');
    process.exit(1);
  }
  return out;
}

interface ChapterMarker {
  number: number;
  /** index right after "CHAPTER <roman>" in the book's text */
  afterHeading: number;
  /** index where "CHAPTER" itself starts */
  headingStart: number;
}

function romanToArabicSafe(roman: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = VALUES[roman[i]!];
    const next = VALUES[roman[i + 1] ?? ''];
    if (cur === undefined) return -1;
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

/** Strict sequential scan for this edition's "CHAPTER <roman>" headings: only a match whose arabic value equals
 * the next expected chapter number (starting at 1) is accepted, exactly like monarchia-la's chapter-break scan. */
function findChapterMarkers(text: string, book: 1 | 2): ChapterMarker[] {
  const re = /CHAPTER\s+([IVXLCDM]+)\b/g;
  const markers: ChapterMarker[] = [];
  let expected = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = romanToArabicSafe(m[1]!);
    if (value === expected) {
      markers.push({ number: value, afterHeading: m.index + m[0].length, headingStart: m.index });
      expected += 1;
    }
  }
  if (markers.length !== EXPECTED_CHAPTERS[book]) {
    process.stderr.write(
      `STOP (de-vulgari-en): book ${book} found ${markers.length} chapter markers, expected ${EXPECTED_CHAPTERS[book]} (numbers: ${markers.map((b) => b.number).join(',')})\n`,
    );
    process.exit(1);
  }
  return markers;
}

/** Extract Howell's bracketed chapter argument: the first "[...]" run after the chapter heading. Returns the
 * argument text (without the brackets) and the index right after the closing "]". */
function extractArgument(spanText: string, where: string): { argument: string; afterArgument: number } {
  const open = spanText.indexOf('[');
  if (open === -1) {
    process.stderr.write(`STOP (de-vulgari-en): no bracketed argument found for ${where}\n`);
    process.exit(1);
  }
  const close = spanText.indexOf(']', open + 1);
  if (close === -1) {
    process.stderr.write(`STOP (de-vulgari-en): unterminated bracketed argument for ${where}\n`);
    process.exit(1);
  }
  return { argument: cleanText(spanText.slice(open + 1, close)), afterArgument: close + 1 };
}

interface NotesBoundary {
  page: number;
  marker: string;
}

interface ParagraphStart {
  line: number;
  marker: string;
}

/** Every printed paragraph break for pages 1-115, as a short verbatim marker (raw/paragraph-starts/pNNN.json,
 * generated by raw/detectParagraphs.mjs from this scan's own word coordinates: a paragraph's first line is
 * indented well beyond the page's median body-left edge, this edition's only typographic paragraph mark - see
 * that script's own header comment). Loaded once, in page order, and matched within each chapter's own narrative
 * span below so the shipped Passage split falls at the same points the 1904 printing itself breaks paragraphs. */
function loadAllParagraphStarts(): string[] {
  const markers: string[] = [];
  for (let page = FIRST_PAGE; page <= LAST_PAGE; page++) {
    const file = join(RAW, 'paragraph-starts', `p${String(page).padStart(3, '0')}.json`);
    if (!existsSync(file)) continue;
    const entries = JSON.parse(readFileSync(file, 'utf8')) as ParagraphStart[];
    for (const e of entries) markers.push(e.marker);
  }
  return markers;
}

/** True if `text.slice(0, pos)` ends inside an open quotation: counts quote marks that are NOT elisions (an
 * apostrophe with a letter on both sides, e.g. "l'ora", "già'n", is punctuation internal to a word, not a quote
 * mark) and returns whether that count is odd. Used to reject a geometrically-indented candidate line that is
 * really the second line of a multi-line quoted verse passage (this edition gives such a block a hanging indent
 * on every line, not just its first, so a continuation line can look exactly like a new paragraph's start). */
function endsInsideQuote(text: string, pos: number): boolean {
  let count = 0;
  for (let i = 0; i < pos; i++) {
    const ch = text[i];
    if (ch !== "'" && ch !== '’' && ch !== '‘') continue;
    const prev = text[i - 1] ?? '';
    const next = text[i + 1] ?? '';
    const elision = /[A-Za-z]/.test(prev) && /[A-Za-z]/.test(next);
    if (!elision) count++;
  }
  return count % 2 === 1;
}

/** Split `text` at every position where one of `markers` starts (a marker at position 0 is not a split - the
 * text's own start is already the first paragraph's start; nor is a position inside an open quotation - see
 * endsInsideQuote()). Each returned piece is cleanText()-ed. */
function splitIntoParagraphs(text: string, markers: string[]): string[] {
  const positions = new Set<number>();
  for (const m of markers) {
    let idx = text.indexOf(m);
    while (idx !== -1) {
      if (idx > 0 && !endsInsideQuote(text, idx)) positions.add(idx);
      idx = text.indexOf(m, idx + 1);
    }
  }
  const sorted = [0, ...[...positions].sort((a, b) => a - b), text.length];
  const pieces: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const piece = cleanText(text.slice(sorted[i]!, sorted[i + 1]!));
    if (piece.length > 0) pieces.push(piece);
  }
  return pieces;
}

function loadNotesBoundary(book: 1 | 2, chapter: number): NotesBoundary {
  const file = join(RAW, 'notes-boundaries', `book${book}-ch${chapter}.json`);
  if (!existsSync(file)) {
    process.stderr.write(`STOP (de-vulgari-en): missing notes-boundaries/book${book}-ch${chapter}.json\n`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(file, 'utf8')) as NotesBoundary;
}

// This edition prints Howell's own footnotes - English translations of the
// Provençal/Italian/French verse Dante quotes throughout the treatise - at
// the FOOT of the page, never interleaved with the running prose above them.
// A footnote-definition line always starts with a bare 1-2 digit number
// directly followed by an opening quote mark ("1 'Even though...'"), unlike
// a "Notes to Chapter N" entry (always "N. " with a period). Since footnotes
// are always the last thing printed on their page, everything from the
// first such line to the end of that page's OCR text is footnote apparatus.
const FOOTNOTE_START_RE = /^\d{1,2}\s+['’"“‘]/;

/** Split a page's (corrected) lines into {content, footnote}. */
function splitFootnoteTail(lines: string[]): { content: string[]; footnote: string[] } {
  const idx = lines.findIndex((l) => FOOTNOTE_START_RE.test(l));
  if (idx === -1) return { content: lines, footnote: [] };
  return { content: lines.slice(0, idx), footnote: lines.slice(idx) };
}

// Each such footnote is cross-referenced from the main text by a small
// superscript number immediately after the quotation it translates, which
// OCRs as a bare digit stuck to the closing quote mark ("...lassi,' 1 and").
// Stripped here (counted, not silently dropped) now that the footnote body
// itself has been removed by splitFootnoteTail() above - left in place, the
// marker digit would sit as printed noise in the reading text.
const FOOTNOTE_MARKER_RE = /(['’"”])\s?(?<!\d)\d{1,2}(?!\d)/g;

function main(): void {
  const anomalies: Anomaly[] = [];

  // ---- Load, correct, and flatten every page's OCR text -------------------
  const allLines: string[] = [];
  let totalCorrections = 0;
  const correctionsByPage: Record<number, number> = {};
  let footnoteLineCount = 0;
  let footnoteWordCount = 0;
  let pagesWithFootnotes = 0;
  for (let page = FIRST_PAGE; page <= LAST_PAGE; page++) {
    const file = join(RAW, 'ocr', `p${String(page).padStart(3, '0')}.txt`);
    if (!existsSync(file)) {
      process.stderr.write(`STOP (de-vulgari-en): missing raw/ocr/p${page}.txt\n`);
      process.exit(1);
    }
    const raw = readFileSync(file, 'utf8');
    const { text: corrected, count } = applyCorrections(page, raw);
    totalCorrections += count;
    correctionsByPage[page] = count;
    if (corrected.length === 0) continue;
    const { content, footnote } = splitFootnoteTail(corrected.split('\n'));
    if (footnote.length > 0) {
      pagesWithFootnotes += 1;
      footnoteLineCount += footnote.length;
      footnoteWordCount += footnote.reduce((s, l) => s + (l.match(/\S+/g) ?? []).length, 0);
    }
    allLines.push(...content);
  }
  let fullText = joinLines(allLines);
  let footnoteMarkersStripped = 0;
  fullText = fullText.replace(FOOTNOTE_MARKER_RE, (_m, quote: string) => {
    footnoteMarkersStripped += 1;
    return quote;
  });

  // ---- Locate BOOK I / BOOK II (disambiguated from inline "Book II."-style
  // cross-references, e.g. within Chapter I's own argument, by requiring the
  // ALL-CAPS heading to be followed shortly by "CHAPTER I") -----------------
  function findBookHeading(label: 'BOOK I' | 'BOOK II'): number {
    const re = new RegExp(`\\b${label}\\b`, 'g');
    const hits: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(fullText))) hits.push(m.index);
    const real = hits.filter((idx) => fullText.slice(idx, idx + 400).includes('CHAPTER I'));
    if (real.length !== 1) {
      process.stderr.write(`STOP (de-vulgari-en): expected exactly 1 structural "${label}" heading, found ${real.length} (candidates at ${hits.join(',')})\n`);
      process.exit(1);
    }
    return real[0]!;
  }
  const bookIIdx = findBookHeading('BOOK I');
  const bookIIIdx = findBookHeading('BOOK II');
  if (!(bookIIdx < bookIIIdx)) {
    process.stderr.write('STOP (de-vulgari-en): BOOK I must precede BOOK II\n');
    process.exit(1);
  }

  // End of Book II / end of the whole reading text: LAST_PAGE (115) is the
  // last page loaded into fullText at all - the Appendix (p.116+) was never
  // read in, so no in-text boundary search is needed here. (Confirmed by eye
  // against the page image: p.115 ends with Chapter XIV's own text and its
  // one-line Notes entry, then blank space; "APPENDIX" first appears at the
  // top of p.116 - see notes-boundaries/appendix-start.json, used only for
  // the about.json disclosure below, not for slicing.)
  const appendixFile = join(RAW, 'notes-boundaries', 'appendix-start.json');
  if (!existsSync(appendixFile)) {
    process.stderr.write('STOP (de-vulgari-en): missing notes-boundaries/appendix-start.json\n');
    process.exit(1);
  }
  const appendixBoundary = JSON.parse(readFileSync(appendixFile, 'utf8')) as NotesBoundary;
  if (appendixBoundary.page !== LAST_PAGE + 1) {
    process.stderr.write(`STOP (de-vulgari-en): appendix-start.json says the Appendix begins on p.${appendixBoundary.page}, expected p.${LAST_PAGE + 1}\n`);
    process.exit(1);
  }

  const book1Text = fullText.slice(bookIIdx, bookIIIdx);
  const book2Text = fullText.slice(bookIIIdx);
  const bookTexts: Record<1 | 2, string> = { 1: book1Text, 2: book2Text };

  // The one-time editorial paragraph on the edition's own chapter-heading
  // convention, appearing within Book I Chapter I's span only.
  const editorialFile = join(RAW, 'notes-boundaries', 'editorial-convention-note.json');
  let editorialNote: NotesBoundary | null = null;
  if (existsSync(editorialFile)) editorialNote = JSON.parse(readFileSync(editorialFile, 'utf8')) as NotesBoundary;

  let notesWordsExcluded = 0;
  let totalChapters = 0;
  let totalParagraphs = 0;
  const allParagraphMarkers = loadAllParagraphStarts();
  const bookDivisions: Division[] = [];

  for (const book of [1, 2] as const) {
    const bookText = bookTexts[book]!;
    const markers = findChapterMarkers(bookText, book);
    const chDivs: Division[] = [];
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i]!;
      const spanEnd = i + 1 < markers.length ? markers[i + 1]!.headingStart : bookText.length;
      const spanText = bookText.slice(marker.afterHeading, spanEnd);
      const where = `${WORK_ID} / book-${book} chapter ${marker.number}`;

      let { argument, afterArgument } = extractArgument(spanText, where);
      // This edition sometimes prints the argument's own closing full stop just OUTSIDE the bracket ("...
      // described]." rather than "...described.]"), which otherwise lands as stray leading punctuation on the
      // narrative's first paragraph instead of closing the argument sentence. A lone "." (optionally preceded by
      // whitespace, never followed by another "." - i.e. not an ellipsis) directly after "]" belongs to the
      // argument, not the narrative.
      const stray = /^\s*\.(?!\.)/.exec(spanText.slice(afterArgument));
      if (stray) {
        argument = argument + '.';
        afterArgument += stray[0].length;
      }
      const afterArgumentText = spanText.slice(afterArgument);

      let excludedStart: number;
      if (book === 1 && marker.number === 1 && editorialNote) {
        const idx = afterArgumentText.indexOf(editorialNote.marker);
        if (idx === -1) {
          process.stderr.write(`STOP (de-vulgari-en): editorial-convention-note marker not found in ${where}: ${JSON.stringify(editorialNote.marker)}\n`);
          process.exit(1);
        }
        excludedStart = idx;
      } else {
        const nb = loadNotesBoundary(book, marker.number);
        const idx = afterArgumentText.indexOf(nb.marker);
        if (idx === -1) {
          process.stderr.write(`STOP (de-vulgari-en): notes-boundary marker not found in ${where} (expected on p.${nb.page}): ${JSON.stringify(nb.marker)}\n`);
          process.exit(1);
        }
        excludedStart = idx;
      }

      const rawNarrative = afterArgumentText.slice(0, excludedStart);
      const excludedTail = afterArgumentText.slice(excludedStart);
      notesWordsExcluded += (excludedTail.match(/\S+/g) ?? []).length;

      if (rawNarrative.trim().length === 0) {
        process.stderr.write(`STOP (de-vulgari-en): empty narrative text for ${where}\n`);
        process.exit(1);
      }
      const paragraphs = splitIntoParagraphs(rawNarrative, allParagraphMarkers);
      if (paragraphs.length === 0) {
        process.stderr.write(`STOP (de-vulgari-en): no paragraphs produced for ${where}\n`);
        process.exit(1);
      }
      totalParagraphs += paragraphs.length;

      chDivs.push({
        id: `book-${book}-ch-${marker.number}`,
        number: String(marker.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text: argument, ref: null }, ...paragraphs.map((p) => ({ n: '', text: p, ref: null }))],
      });
    }
    bookDivisions.push({
      id: `book-${book}`,
      number: String(book),
      ref: null,
      sourceHeading: book === 1 ? 'Book I' : 'Book II',
      editorialTitle: null,
      children: chDivs,
      passages: [],
    });
    totalChapters += chDivs.length;
  }

  // ---- Anomalies ------------------------------------------------------------
  const extractManifest = JSON.parse(readFileSync(join(RAW, 'extract-manifest.json'), 'utf8')) as Array<{ page: number; captionWordsRemoved?: number }>;
  const totalCaptionWordsRemoved = extractManifest.reduce((s, m) => s + (m.captionWordsRemoved ?? 0), 0);

  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      "Only pp.1-115 (Book I, chapters I-XIX, pp.1-64; Book II, chapters I-XIV, pp.65-115) are imported as reading text. Excluded: the book's own half-title and contents front matter (pp.i-x, not part of the translation); " +
      "and pp.116-123, headed \"Appendix\" - the translator's own back-matter notes on the history, date, and title of De Vulgari Eloquentia, and a postscript - editorial apparatus about the work, not Dante's own text, not run as part of this import.",
  });
  anomalies.push({
    where: `${WORK_ID} / Notes apparatus`,
    note:
      `Every chapter in this edition is followed by a "Notes to Chapter N" section (numbered scholarly annotations, mostly cross-references to Dante's other works) before the next chapter begins; these are editorial ` +
      `apparatus, not Dante's or Howell's own text, and are excluded from the shipped reading text throughout. Approximately ${notesWordsExcluded} words of this apparatus (by whitespace-delimited token count) were excluded this way. ` +
      'A one-time editorial paragraph after Book I Chapter I\'s own prose, explaining this edition\'s own chapter-heading convention ("The original chapter headings ... have been replaced by summaries ..."), is excluded ' +
      'alongside Chapter I\'s own Notes section for the same reason (translator/editor apparatus, not Dante\'s text).',
  });
  anomalies.push({
    where: `${WORK_ID} / marginal shoulder-captions`,
    note:
      `This edition prints a short bold subject-caption in the outer margin beside the opening lines of most paragraphs (e.g. "The subject defined", "Neither angels nor brutes speak") - a navigational aid, not part of ` +
      `Dante's or Howell's running prose. ${totalCaptionWordsRemoved} caption word-tokens were identified and removed (by page-image coordinate, at extraction time; see raw/extractPages.mjs) across the 115 pages.`,
  });
  anomalies.push({
    where: `${WORK_ID} / page-bottom footnotes`,
    note:
      "Howell's own footnotes - English translations of the Provençal/Italian/French verse Dante quotes throughout the treatise - are printed at the foot of the page, never interleaved with the prose above them. " +
      `${footnoteLineCount} such footnote line(s) (${footnoteWordCount} words) across ${pagesWithFootnotes} pages were excluded from the reading text (see raw/extractPages.mjs / index.ts's splitFootnoteTail()); the small ` +
      `superscript reference number each one is cross-linked from in the main text (OCR'd as a bare digit stuck to the closing quote mark it follows) was also stripped from the running prose - ${footnoteMarkersStripped} such ` +
      'marker(s) removed. Neither the footnote translations nor their reference numbers are preserved anywhere in this build.',
  });
  anomalies.push({
    where: `${WORK_ID} / OCR corrections`,
    note: `${totalCorrections} individual OCR corrections were applied across the 115 pages (each page proofread by hand against its own scan image); see raw/corrections/pNNN.json for the exact per-page list.`,
  });
  anomalies.push({
    where: `${WORK_ID} / paragraphs`,
    note:
      "This edition marks a new paragraph only by first-line indentation, never a blank line, so paragraph breaks are invisible in the plain OCR text and were recovered from this scan's own word coordinates " +
      "(raw/detectParagraphs.mjs: a line whose first surviving word sits well right of that page's median body-left edge is a paragraph's own first line) rather than assumed. Each chapter's translated prose is split " +
      `into one Passage per printed paragraph on that basis (${totalParagraphs} paragraph Passages across ${totalChapters} chapters); the bracketed chapter argument remains a separate, first Passage, exactly as printed ` +
      'at the head of each chapter. See raw/paragraph-starts/pNNN.json for the exact per-page detections and raw/detectParagraphs.mjs for the method and its calibration.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };
  const totalChars = countChars(work);

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Vulgari Eloquentia',
    author: 'Dante Alighieri',
    language: 'en',
    translator: 'A. G. Ferrers Howell',
    edition: '"A translation of the Latin works of Dante Alighieri" (Temple Classics, London: J. M. Dent, 1904)',
    provenance:
      'archive.org item translationoflat00dantuoft (University of Toronto / Robarts Library scan of the same 1904 Dent printing; not access-restricted; contributor Internet Archive). Its djvu.txt/djvu.xml OCR text layer ' +
      '(ABBYY) and _page_numbers.json leaf/page index were fetched once (archive.org/metadata + archive.org/download) and cached under scripts/import-dante/de-vulgari-en/raw/; nothing is downloaded at build or run time. ' +
      'raw/extractPages.mjs derives one plain-text file per printed page (raw/ocr/pNNN.txt) from the djvu.xml HIDDENTEXT layer, stripping the running head and marginal shoulder-captions (see this file\'s own header comment). ' +
      "Every one of the 115 pages covering this work (pp.1-115) was then proofread by hand against its own page image (raw/images-by-page/pNNN.jpg, reused from a prior attempt at this lane that had fetched them from " +
      "Wikisource under the same djvu-leaf numbering) and corrected (raw/corrections/pNNN.json). A prior attempt at this lane tried to use English Wikisource's own page-scan transclusion of this same 1904 volume as the " +
      'base text, but found only 17 of its 115 djvu pages carried any transcription at all (3 at "proofread" quality, 14 at "not proofread"), so Wikisource could not supply the text; that route\'s fetchPages.ts has been ' +
      'deleted and its wikitext caches removed. Imported by scripts/import-dante/de-vulgari-en.',
    license:
      "Dante's Latin original (c. 1303-05, unfinished) and Howell's 1904 English translation are both in the public domain worldwide (pre-1931, no copyright renewal on file). The archive.org digital scan carries no " +
      'additional restriction.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's De Vulgari Eloquentia (\"On Eloquence in the Vernacular\"), his unfinished Latin treatise on the Italian vernacular and the art of lyric poetry, in A. G. Ferrers Howell's English translation, first " +
            'published 1904 in the Temple Classics series volume "A translation of the Latin works of Dante Alighieri" (which also included De Monarchia, the Epistles and Eclogues, and the Quaestio de Aqua et Terra - ' +
            'only the De Vulgari Eloquentia translation is imported here). Dante left the treatise unfinished partway through Book II\'s fourteenth chapter; this edition, like the work itself, ends there.',
          'Howell prints a short bracketed argument/summary at the head of every chapter (his own words, replacing - by his own editorial note - the "inadequate and sometimes incorrect" chapter headings of the ' +
            'manuscript tradition, which are not by Dante\'s own hand); this is part of the 1904 printed text and is kept here as each chapter\'s own first Passage. The translated prose itself is verbatim throughout: ' +
            'nothing is modernised, paraphrased, or silently corrected beyond genuine OCR misreadings fixed against the scanned page image.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'archive.org item translationoflat00dantuoft, the University of Toronto (Robarts Library) scan of the 1904 Dent Temple Classics printing, not access-restricted, with unrestricted djvu.txt/djvu.xml OCR downloads.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Direct OCR correction against page images (the same route as this batch\'s dante-monarchia-la lane), not a Wikisource-base route: this scan\'s own ABBYY OCR text layer was extracted per page (stripping the ' +
            "running head and this edition's marginal shoulder-captions - short bold subject-tags in the outer margin beside paragraph openings, e.g. \"The subject defined\" - which ABBYY's OCR otherwise merges into " +
            'the start or end of the body line beside them, corrupting the sentence) and then every page was proofread by hand against its own scan image and corrected.',
          'Each book ("Book I"/"Book II") is a top-level Division; each of its numbered chapters ("CHAPTER I" etc., found by this importer\'s own sequential scan, independently confirmed at 19 + 14) is a child Division ' +
            "holding the chapter's own bracketed argument as its first Passage, then one further Passage per printed paragraph of its translated prose. This edition marks a paragraph break only by first-line indentation, " +
            "never a blank line, so the breaks were recovered from this scan's own word coordinates (raw/detectParagraphs.mjs), not assumed - see the \"paragraphs\" entry in anomalies.json for the method and count, and " +
            "raw/paragraph-starts/pNNN.json for the exact per-page detections. A \"Notes to Chapter N\" apparatus section (scholarly cross-reference annotations, not Dante's or Howell's own text) follows every chapter's " +
            "prose in this edition and is excluded from the shipped reading text throughout; see anomalies.json for the excluded word count and the one-time editorial paragraph excluded alongside Book I Chapter I's own " +
            'Notes section.',
          `${totalChapters} chapters across 2 books (19 + 14), ${totalParagraphs} paragraph Passages, ${totalChars} characters total. The 19+14 chapter division matches the one already shipped for the Latin original in ` +
            "this library (dante-de-vulgari-eloquentia-la, Giuliani's edition), independently confirmed here by directly counting this edition's own \"CHAPTER\" markers rather than assumed from the Latin sibling.",
        ],
      },
      {
        heading: 'Residual-error audit',
        paragraphs: [
          'After the page-by-page correction pass, every word of the emitted text was cross-checked by scripts/import-dante/de-vulgari-en/residualCheck.ts against a vocabulary built from this library\'s own shipped ' +
            'dante-monarchia-en, dante-convivio-en and dante-vita-nuova-en texts (all English translations from the same general period), plus a proper-name/place-name/foreign-quotation allowance list. Every token ' +
            "absent from that vocabulary was checked individually (against its page image, where its printed context did not already settle the reading) and either corrected via a further raw/corrections/pNNN.json entry " +
            '(marked "residual audit") or confirmed as printed. At the point this data was generated, the audit found 1080 tokens absent from that sibling vocabulary: 1077 confirmed as printed (ordinary English words, ' +
            'proper/place names, or Provençal/Italian/French/Latin quotations the sibling texts simply do not happen to use) and 3 that were genuine surviving OCR misreadings, all fixed. residualCheck.ts exits non-zero ' +
            'on any unconfirmed token, so it doubles as a regression guard; at the time of this import it reports zero unconfirmed tokens.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Division.ref and Passage.ref are null throughout: citation is by book and chapter number only, which the Division id and number already carry.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `${totalCorrections} individual OCR corrections were applied across the 115 pages (including those added during the residual-error audit pass); see anomalies.json for the Notes-apparatus, page-bottom-footnote, ` +
            'marginal-caption, and paragraph-subdivision disclosures, and raw/corrections/pNNN.json for the exact per-page correction list.',
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(
    `\n${totalChapters} chapters across 2 books (19 + 14), ${totalParagraphs} paragraph passages, ${totalChars} chars, ${totalCorrections} OCR corrections, ${notesWordsExcluded} notes-apparatus words excluded, ` +
      `${footnoteLineCount} footnote lines / ${footnoteMarkersStripped} footnote markers excluded, ${anomalies.length} anomaly entries\n`,
  );
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
