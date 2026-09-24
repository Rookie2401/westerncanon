/**
 * Dante, *De Monarchia* - Latin original, "De Monarchia, the Oxford Text",
 * edited by Dr. E. Moore, with an introduction on the political theory of
 * Dante by W. H. V. Reade (Oxford: at the Clarendon Press, 1916). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/monarchia-la/index.ts
 *
 * EDITION CHOICE. The parent task's primary candidate was Karl Witte's 1874
 * critical edition (archive.org dantisalligheri01wittgoog /
 * bub_gb_7FBb66mwKsQC). Both were located and inspected (IIIF manifests,
 * djvu.txt OCR, and page images), but Witte 1874 turned out to carry a large
 * apparatus criticus (variant-reading footnotes running the length of the
 * book, plus ~230 pages of front matter before the text proper begins) that
 * would need extensive apparatus-exclusion work. Archive.org search also
 * surfaced demonarchiaoxfor00dantuoft, "De Monarchia, the Oxford text" -
 * Edward Moore's own critical Latin text (the same text later reprinted in
 * his "Tutte le opere di Dante", the alternative the parent task allowed),
 * here issued as a short standalone volume with W. H. V. Reade's English
 * introduction, Oxford: Clarendon Press, 1916 - clearly pre-1931, clearly
 * attributed (editor named on the title page), NOT_IN_COPYRIGHT, from the
 * University of Toronto (Robarts) collection (no lending/access
 * restriction, unlike the other 1916 Oxford scan found, dantedemonarchia
 * 0000dant, which is under the "printdisabled" controlled-digital-lending
 * collection and was therefore rejected). The book's own printed note on
 * its "Series Capitulorum" page (leaf image p.341) states outright: "La
 * numerazione dei capitoli e quella del Witte" - i.e. this Oxford text
 * prints Witte's own chapter numbering (with Fraticelli's alternative
 * numbering additionally noted in parentheses at each chapter head) - so
 * choosing it does not create any numbering mismatch against Witte. It was
 * therefore chosen over both Witte scans as the cleaner, more compact,
 * equally authoritative source. Also checked (and rejected as a possible
 * base text) was Latin Wikisource's own "De monarchia": its own page header
 * literally states "editio: incognita, fons: incognitus" and its own
 * {{textquality}} template marks it only 25% (unproofread) - both
 * disqualifying it as a usable base per this batch's house rule (see
 * dante-monarchia-en's about.json for the same finding). A sample
 * word-for-word comparison against the Oxford scan (Book I ch. 1, Book II
 * ch. 1, Book III ch. 1) showed the wikisource text is a reasonably close
 * match in wording but not reliable enough, given its own unproofread flag,
 * to use as a base without full re-verification against the scan anyway -
 * at which point transcribing directly from the scan is simpler and safer.
 *
 * ROUTE TAKEN: direct OCR correction against page images, not
 * wikisource-base. Source: archive.org item demonarchiaoxfor00dantuoft,
 * 400ppi scan, ABBYY OCR (djvu.txt / djvu.xml HIDDENTEXT layer, fetched
 * once and cached under raw/oxford-djvu.txt, raw/oxford-pages.json -
 * raw/oxford-pages.json is the per-leaf HIDDENTEXT extracted by
 * raw/extractPages.mjs from raw/oxford-djvu.xml's <OBJECT> entries; nothing
 * is downloaded at build or run time). raw/oxford-manifest.json (IIIF
 * Presentation v3 manifest) and raw/oxford-metadata.json (archive.org
 * /metadata response) are also cached for citation/provenance purposes.
 *
 * A quirk of this item's derivation pipeline: the djvu.xml HIDDENTEXT
 * layer's own internal leaf numbering runs ONE BEHIND the IIIF image
 * numbering actually served at canvas $N (confirmed empirically: the page
 * image at IIIF canvas $41 - i.e. file demonarchiaoxfor00dantuoft_0042.jp2 -
 * shows the content that the djvu.xml <OBJECT> element numbered 41 (usemap
 * ..._0041.djvu) carries as HIDDENTEXT). raw/oxford-pages.json is keyed by
 * the djvu.xml's own leaf numbers; PAGE_OFFSET below (=300) converts a
 * printed page number (341-376) to that leaf number (41-76). Every one of
 * those 36 leaves/pages was independently viewed as a downloaded page image
 * (raw/images/leaf42.jpg .. raw/images/leaf77.jpg, i.e. printed pages
 * 341-376 under the +1 image-vs-leaf shift above) and its OCR corrected by
 * hand against the image; see raw/corrections/p<NNN>.json (one file per
 * printed page, 341-376) for the exact find/replace list, each entry
 * carrying a short note. Corrections were applied deterministically by
 * exact substring replacement (each `find` must match exactly once in that
 * page's raw OCR text, or the build stops) - see applyCorrections() below.
 * Total correction-file entries per page are logged into anomalies.json.
 *
 * WHAT WAS EXCLUDED (apparatus, not Dante's text, matching this batch's
 * house convention - see dante-monarchia-en and dante-de-vulgari-la about.
 * json for the same policy): Reade's English introduction ("The Political
 * Theory of Dante", pp. v-xxxi) and the book's front/back matter; the
 * "SERIES CAPITULORUM" table of contents (a chapter-argument summary table,
 * itself apparatus, not run alongside each chapter here - this edition does
 * NOT repeat a chapter argument at each chapter's own head in the body
 * text, matching the English sibling's convention rather than Giuliani's);
 * the marginal line-numbers this edition prints every 5 lines for citation
 * purposes (stripped by stripLineNumbersAndDehyphenate() below); printer's
 * gathering-signature marks at a handful of page feet ("A a", "A a 2",
 * "b", "b2" - bookbinding apparatus, not Dante's text, dropped at their
 * correction entries); and, within Book I only, the parenthetical
 * alternative chapter numbers this edition prints next to Witte's own
 * numbering ("(IV.)", "(V.)", ... for the numbering of "the editions of
 * Fraticelli and other editors", per the page's own Italian note) - each
 * such parenthetical was dropped at its correction entry (see the "dropped
 * parenthetical Fraticelli marker" notes throughout
 * raw/corrections/p34*.json-p35*.json); Witte's own numbering (the bare
 * roman numeral with no parenthesis) is what defines this import's chapter
 * structure. Book II and Book III print no such parenthetical alternative
 * numbers.
 *
 * STRUCTURE. Determined independently by reading, not assumed: this edition
 * itself counts 16 chapters in Book I, 13 in Book II, and 16 in Book III (45
 * total) - the same 16+13+16 division as Church's English translation
 * (dante-monarchia-en), because both ultimately follow Witte's numbering.
 * Three top-level Divisions (book-1..book-3), each carrying its own printed
 * book-heading as sourceHeading (BOOK_HEADINGS below, transcribed from the
 * page image; the book-2/3 headings are printed in small capitals in the
 * source, normalised here to ordinary sentence capitalisation - a
 * typographic-only normalisation, disclosed here, not a textual change),
 * each containing child Divisions book-N-ch-M. Chapter boundaries were
 * found by a strict sequential scan for the bare roman-numeral markers
 * Witte's numbering prints at each chapter head (see findChapterBreaks()):
 * only a match whose arabic value equals the very next expected chapter
 * number (resetting to 1 at each book) is accepted, so any incidental
 * roman-numeral-shaped token elsewhere in the text (there are none observed,
 * but the letter-labels A/B/C/D/E/F used in this book's own syllogism
 * examples do appear) cannot be mistaken for a chapter break.
 *
 * PARAGRAPHS. The page-image transcription route does not preserve this
 * edition's own paragraph subdivisions (marked in print only by
 * first-line indentation, not blank lines, and not recoverable from the
 * OCR text-layer's line grouping); each chapter is therefore emitted as one
 * continuous Passage of running prose, verbatim at the word level
 * throughout. This is disclosed here and in about.json.
 *
 * RESIDUAL-ERROR AUDIT. After the correction pass, residualCheck.ts (same
 * directory) cross-checks every emitted word against the vocabulary of Latin
 * Wikisource's independent digitisation (cached raw/wikisource-liber*.json,
 * spell-list only) and lists every token it lacks; each such token was then
 * verified against its page image and either corrected (corrections entries
 * noted "residual audit") or recorded as confirmed-as-printed in that script.
 * It exits non-zero on any unconfirmed token. See about.json.
 *
 * RECURRING OCR MISREADINGS. A handful of misreadings (e.g. "nee" for
 * "nec", "ilia" for "illa") recur dozens of times throughout this scan and
 * are confirmed always wrong wherever they appear as a standalone word;
 * these are fixed once, globally, by applyGlobalWordFixes() below, rather
 * than hand-edited at every individual occurrence - see that function's
 * own doc comment.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, type Anomaly } from '../shared/text.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WORK_ID = 'dante-monarchia-la';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);
const RAW_DIR = join(HERE, 'raw');

const FIRST_PAGE = 341;
const LAST_PAGE = 376;
const PAGE_OFFSET = 300; // printed page N <-> oxford-pages.json leaf (N - 300)

const BOOK_HEADINGS: Record<1 | 2 | 3, string> = {
  1: 'De Necessitate Monarchiae.',
  2: 'Quomodo Romanus populus de iure sibi adsciverit officium Monarchiae sive Imperii.',
  3: 'Qualiter officium Monarchiae, sive Imperii, dependet a Deo immediate.',
};

const EXPECTED_CHAPTERS: Record<1 | 2 | 3, number> = { 1: 16, 2: 13, 3: 16 };

interface Correction {
  find: string;
  replace: string;
  note: string;
}

interface OxfordPage {
  leaf: number;
  usemap: string;
  text: string;
}

function loadOxfordPages(): Map<number, string> {
  const pages = JSON.parse(readFileSync(join(RAW_DIR, 'oxford-pages.json'), 'utf8')) as OxfordPage[];
  const byLeaf = new Map<number, string>();
  for (const p of pages) byLeaf.set(p.leaf, p.text);
  return byLeaf;
}

/** Strip the running header (a lone page-number line, possibly OCR-garbled, and/or a line starting
 * "DE MONARCHIA") from the top of a page's raw OCR text. Each of the first two lines is checked independently
 * (rather than stopping at the first non-matching line), since this scan's recto/verso pages print the page
 * number and the running title in either order, and a garbled page-number line (e.g. "36-2" for "362") must not
 * make the loop give up before it reaches the running-title line below it. */
function stripRunningHeader(text: string): string {
  const lines = text.split('\n');
  const isPageNumberLike = (s: string): boolean => /^[\d\-°o]{1,5}$/.test(s) && /\d/.test(s);
  const isHeaderLike = (s: string): boolean => /^DE MONARCHIA/i.test(s);
  let removed = 0;
  while (lines.length > 0 && removed < 2) {
    const first = lines[0]!.trim();
    if (isPageNumberLike(first) || isHeaderLike(first)) {
      lines.shift();
      removed += 1;
      continue;
    }
    break;
  }
  return lines.join('\n');
}

function applyCorrections(pageNum: number, rawText: string): { text: string; count: number } {
  const file = join(RAW_DIR, 'corrections', `p${pageNum}.json`);
  const corrections = JSON.parse(readFileSync(file, 'utf8')) as Correction[];
  let text = rawText;
  for (const c of corrections) {
    const idx = text.indexOf(c.find);
    if (idx === -1) {
      process.stderr.write(`STOP (monarchia-la): correction not found on p${pageNum}: ${JSON.stringify(c.find)}\n`);
      process.exit(1);
    }
    const idx2 = text.indexOf(c.find, idx + 1);
    if (idx2 !== -1) {
      process.stderr.write(`STOP (monarchia-la): correction ambiguous (matches twice) on p${pageNum}: ${JSON.stringify(c.find)}\n`);
      process.exit(1);
    }
    text = text.slice(0, idx) + c.replace + text.slice(idx + c.find.length);
  }
  return { text, count: corrections.length };
}

// Plain-ASCII sentinel (deliberately not a control character - a raw control byte in TypeScript source is easy
// to introduce by accident via an editor/tool and hard to spot afterwards) marking a line-end hyphen pending
// resolution once the next line/page's text is known.
const HYPHEN_MARKER = '@@HYPHEN@@';

/** Remove this edition's marginal every-5th-line citation numbers (apparatus, not Dante's text) and resolve
 * line-end hyphenation into flowing prose. This edition prints its line-numbers in the outer margin, which OCR
 * text order turns into a number token sitting at the very START of a line (recto pages) or the very END of a
 * line (verso pages) - and, where a hyphenated word-break coincides with a numbered line, the number can end up
 * sandwiched between the hyphen and the word's continuation ("adspici-" / "170 ondus" -> "adspiciendus", not
 * "adspici ondus"). Handling order matters: numbers are stripped from each line's start/end FIRST, so that
 * dehyphenation afterwards only ever has to fuse two genuine word-fragments with no leftover digit or space
 * between them. Safe globally: this text contains no genuine Arabic numerals anywhere (all of Dante's own
 * numbers are spelled out in Latin words; the syllogism examples use letter-labels A-F).
 * A trailing line-end hyphen (a word split across a PAGE boundary, e.g. "...quod Con-" at the end of p.371,
 * continuing "stantinus..." at the top of p.372) is left marked with HYPHEN_MARKER rather than resolved here,
 * since resolving it needs the next page's text too - see joinPages() in main(). */
function stripLineNumbersAndDehyphenate(text: string): string {
  const noMarginNumbers = text
    .split('\n')
    .map((line) =>
      line
        .replace(/^\d{1,3}\s+/, '') // leading marginal line-number
        .replace(/\s+\d{1,3}$/, ''), // trailing marginal line-number
    )
    .join('\n');
  const joined = noMarginNumbers
    .split('\n')
    .map((line) => line.replace(/-$/, HYPHEN_MARKER)) // mark a line-end hyphen for dehyphenation
    .join(' ');
  const dehyphenated = joined.replace(new RegExp(`${HYPHEN_MARKER} `, 'g'), ''); // resolve hyphens that fell mid-page
  // Normalise a space before closing punctuation (";", ":", "?", "!", ",", ".") to no space: the source scan's
  // own line-wrapped justification produces this inconsistently (sometimes a genuine printed thin space before
  // ";"/":" in this Oxford Press house style, sometimes just an OCR line-break artifact) with no reliable way to
  // tell the two apart pre-cleanup; normalising throughout is a disclosed whitespace-only change, not textual.
  const noSpaceBeforePunct = dehyphenated.replace(/\s+([;:?!,.])/g, '$1');
  return cleanText(noSpaceBeforePunct.replace(/\s+/g, ' '));
}

/** Join per-page cleaned texts into one string, resolving any hyphen that fell exactly at a page boundary
 * (a trailing HYPHEN_MARKER left by stripLineNumbersAndDehyphenate) by joining directly with no space instead of
 * the normal single space between pages. */
function joinPages(pages: string[]): string {
  let out = '';
  for (const page of pages) {
    if (out.endsWith(HYPHEN_MARKER)) out = out.slice(0, -HYPHEN_MARKER.length) + page;
    else out += (out.length > 0 ? ' ' : '') + page;
  }
  if (out.includes(HYPHEN_MARKER)) {
    process.stderr.write('STOP (monarchia-la): unresolved page-boundary hyphen marker remains in joined text\n');
    process.exit(1);
  }
  return out;
}

interface ChapterBreak {
  number: number;
  startIndex: number; // index of the character right after "N. "
}

/** Strict sequential scan for this edition's bare Witte chapter-numeral markers (I., II., ... ), resetting at `expectedMax`+1 back to 1 is NOT handled here - call once per book slice. */
function findChapterBreaks(text: string, where: string): ChapterBreak[] {
  const re = /\b([IVXLCDM]+)\.\s+(?=['"]?[A-Z])/g;
  const breaks: ChapterBreak[] = [];
  let expected = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const roman = m[1]!;
    // romanToArabicSafe() (below) returns -1 for anything malformed rather than throwing, so non-numeral-shaped
    // tokens (there are none expected, but be defensive) are just skipped, not fatal.
    if (!/^[IVXLCDM]+$/.test(roman)) continue;
    const value = romanToArabicSafe(roman);
    if (value === expected) {
      breaks.push({ number: value, startIndex: m.index + m[0].length });
      expected += 1;
    }
  }
  if (breaks.length === 0) {
    process.stderr.write(`STOP (monarchia-la): no chapter breaks found in ${where}\n`);
    process.exit(1);
  }
  return breaks;
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

function splitBookIntoChapters(bookText: string, book: 1 | 2 | 3): string[] {
  const breaks = findChapterBreaks(bookText, `${WORK_ID} / book-${book}`);
  const expected = EXPECTED_CHAPTERS[book];
  if (breaks.length !== expected) {
    process.stderr.write(
      `STOP (monarchia-la): book ${book} found ${breaks.length} chapters, expected ${expected} (numbers: ${breaks.map((b) => b.number).join(',')})\n`,
    );
    process.exit(1);
  }
  const chapters: string[] = [];
  for (let i = 0; i < breaks.length; i++) {
    const start = breaks[i]!.startIndex;
    const end = i + 1 < breaks.length ? findMarkerStart(bookText, breaks[i + 1]!) : bookText.length;
    chapters.push(cleanText(bookText.slice(start, end)));
  }
  return chapters;
}

/** Recover the index where the NEXT chapter's roman-numeral marker itself begins (breaks[].startIndex points just after it). */
function findMarkerStart(text: string, brk: ChapterBreak): number {
  // Walk back from startIndex over the marker "N. " (numeral + period + whitespace) we matched.
  let i = brk.startIndex;
  // skip back over the trailing whitespace the regex consumed
  while (i > 0 && /\s/.test(text[i - 1]!)) i--;
  // skip back over the period
  if (text[i - 1] === '.') i--;
  // skip back over the roman numeral letters
  while (i > 0 && /[IVXLCDM]/.test(text[i - 1]!)) i--;
  return i;
}

/**
 * A handful of OCR misreadings recur so often throughout this scan (dozens of times each, confirmed always wrong
 * whenever they appear as a standalone word: e.g. "nee" is never a genuine Latin word, always a misread of "nec")
 * that hand-editing every single occurrence into raw/corrections/p<NNN>.json individually is repetitive to the
 * point of adding transcription risk rather than removing it (having already found and fixed well over a
 * thousand less systematic misreadings that way - see raw/corrections/). These are applied once, globally, as a
 * whole-word regex substitution over the fully assembled and page-corrected text, and are logged here as a
 * single disclosed class of correction rather than one anomalies.json entry per occurrence.
 */
const GLOBAL_WORD_FIXES: Array<[RegExp, string]> = [
  [/\bnee\b/g, 'nec'],
  [/\bilia\b/g, 'illa'],
  [/\bIlia\b/g, 'Illa'],
  [/\bliaec\b/g, 'haec'],
  [/\bliabens\b/g, 'habens'],
];

function applyGlobalWordFixes(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const [re, replacement] of GLOBAL_WORD_FIXES) {
    out = out.replace(re, () => {
      count += 1;
      return replacement;
    });
  }
  return { text: out, count };
}

function main(): void {
  const oxfordPages = loadOxfordPages();
  const anomalies: Anomaly[] = [];
  let totalCorrections = 0;

  const cleanedPages: string[] = [];
  for (let page = FIRST_PAGE; page <= LAST_PAGE; page++) {
    const leaf = page - PAGE_OFFSET;
    const raw = oxfordPages.get(leaf);
    if (raw === undefined) {
      process.stderr.write(`STOP (monarchia-la): missing OCR text for printed page ${page} (leaf ${leaf})\n`);
      process.exit(1);
    }
    const headerStripped = stripRunningHeader(raw);
    const { text: corrected, count } = applyCorrections(page, headerStripped);
    totalCorrections += count;
    anomalies.push({ where: `${WORK_ID} / p.${page}`, note: `${count} OCR correction(s) applied against the page image; see raw/corrections/p${page}.json.` });
    cleanedPages.push(stripLineNumbersAndDehyphenate(corrected));
  }

  let fullText = joinPages(cleanedPages);
  const globalFix = applyGlobalWordFixes(fullText);
  fullText = globalFix.text;

  // Page 341 leads with "LIBER PRIMUS." (its own running title "DE MONARCHIA" and the Italian
  // numbering-editorial-note that precedes "LIBER PRIMUS." on that page image were already
  // stripped by stripRunningHeader/only the header line - the Italian note is removed here).
  const libPrimusIdx = fullText.indexOf('LIBER PRIMUS.');
  if (libPrimusIdx === -1) {
    process.stderr.write('STOP (monarchia-la): "LIBER PRIMUS." marker not found\n');
    process.exit(1);
  }
  const italianNote = fullText.slice(0, libPrimusIdx).trim();
  if (italianNote.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / front matter`,
      note: `Excluded editorial apparatus preceding "LIBER PRIMUS.": the edition's own Italian note on chapter-numbering conventions ("La numerazione dei capitoli e quella del Witte; ma quella delle edizioni del Fraticelli e d'altri editori e indicata con questi segni ( )."), and the running work-title "DE MONARCHIA" printed above it.`,
    });
  }

  const libSecundusIdx = fullText.indexOf('LIBER SECUNDUS.');
  const libTertiusIdx = fullText.indexOf('LIBER TERTIUS.', libSecundusIdx + 1);
  if (libSecundusIdx === -1 || libTertiusIdx === -1) {
    process.stderr.write('STOP (monarchia-la): "LIBER SECUNDUS." / "LIBER TERTIUS." markers not found\n');
    process.exit(1);
  }

  const book1Text = fullText.slice(libPrimusIdx + 'LIBER PRIMUS.'.length, libSecundusIdx).replace(BOOK_HEADINGS[1], '');
  // book1Text still starts with the (garbled-free) heading "De Necessitate Monarchiae." literal; strip it.
  const book1Clean = book1Text.replace('De Necessitate Monarchiae.', '').trim();

  const afterLibSecundus = fullText.slice(libSecundusIdx + 'LIBER SECUNDUS.'.length, libTertiusIdx);
  const ch1MarkerBook2 = afterLibSecundus.indexOf("I. 'Quare fremuerunt");
  if (ch1MarkerBook2 === -1) {
    process.stderr.write('STOP (monarchia-la): book 2 chapter I opening not found after LIBER SECUNDUS heading\n');
    process.exit(1);
  }
  const book2Clean = afterLibSecundus.slice(ch1MarkerBook2).trim();

  const afterLibTertius = fullText.slice(libTertiusIdx + 'LIBER TERTIUS.'.length);
  const ch1MarkerBook3 = afterLibTertius.indexOf("I. 'Conclusit ora leonum");
  if (ch1MarkerBook3 === -1) {
    process.stderr.write('STOP (monarchia-la): book 3 chapter I opening not found after LIBER TERTIUS heading\n');
    process.exit(1);
  }
  const book3Clean = afterLibTertius.slice(ch1MarkerBook3).trim();

  const bookTexts: Record<1 | 2 | 3, string> = { 1: book1Clean, 2: book2Clean, 3: book3Clean };

  const bookDivisions: Division[] = [];
  let totalChapters = 0;
  for (const book of [1, 2, 3] as const) {
    const chapters = splitBookIntoChapters(bookTexts[book], book);
    const chDivs: Division[] = chapters.map((text, i) => ({
      id: `book-${book}-ch-${i + 1}`,
      number: String(i + 1),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text, ref: null }],
    }));
    bookDivisions.push({
      id: `book-${book}`,
      number: String(book),
      ref: null,
      sourceHeading: BOOK_HEADINGS[book],
      editorialTitle: null,
      children: chDivs,
      passages: [],
    });
    totalChapters += chapters.length;
  }

  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      'Excluded from the reading text: W. H. V. Reade\'s English introduction "The Political Theory of Dante" ' +
      '(pp. v-xxxi) and all other front/back matter; the "SERIES CAPITULORUM" table of chapter arguments (this ' +
      "edition does not repeat a chapter argument at each chapter's own head in the body, unlike Giuliani's De " +
      'Vulgari Eloquentia edition in this same batch); this edition\'s own marginal every-5th-line citation numbers ' +
      '(apparatus, not Dante\'s text); printer\'s gathering-signature marks at a handful of page feet ("A a", ' +
      '"A a 2", "b", "b2" - bookbinding apparatus); and, within Book I only, the parenthetical alternative chapter ' +
      "numbers this edition prints next to Witte's own numbering for \"the editions of Fraticelli and other " +
      'editors" (e.g. "(IV.)" next to Witte\'s own "III.") - Witte\'s own bare numeral defines this import\'s ' +
      "chapter structure throughout, matching Church's English translation (dante-monarchia-en) and requiring no " +
      'numbering-mismatch disclosure.',
  });
  anomalies.push({
    where: `${WORK_ID} / recurring OCR misreadings`,
    note:
      `${globalFix.count} instances of a handful of OCR misreadings that recur throughout this scan (each ` +
      'confirmed always wrong wherever it appears as a standalone word - "nee" is never a genuine Latin word, ' +
      'always a misread of "nec"; likewise "ilia"/"Ilia" for "illa"/"Illa", "liaec" for "haec", "liabens" for ' +
      '"habens") were fixed by a single global whole-word substitution (applyGlobalWordFixes() in index.ts), ' +
      'rather than by individually hand-editing every occurrence in raw/corrections/.',
  });
  anomalies.push({
    where: `${WORK_ID} / whitespace normalisation`,
    note:
      'A space before closing punctuation (";", ":", "?", "!", ",", ".") produced inconsistently by this scan\'s ' +
      "own line-wrapped justification (with no reliable way, after OCR, to tell a genuine printed space from a " +
      'line-break artifact) was normalised to no space throughout, by stripLineNumbersAndDehyphenate() in ' +
      'index.ts. This is a disclosed whitespace-only normalisation, not a textual change.',
  });
  anomalies.push({
    where: `${WORK_ID} / paragraphs`,
    note:
      "This edition's own paragraph subdivisions (marked in print only by first-line indentation, not blank " +
      'lines) are not recoverable from the page-image/OCR-text-layer transcription route used here; each chapter ' +
      'is therefore emitted as one continuous Passage of running prose, verbatim at the word level throughout.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions: bookDivisions };
  const totalChars = countChars(work);

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Monarchia',
    author: 'Dante Alighieri',
    language: 'la',
    editor: 'Edward Moore',
    edition: '"De Monarchia, the Oxford Text", with an introduction by W. H. V. Reade (Oxford: at the Clarendon Press, 1916)',
    provenance:
      'archive.org item demonarchiaoxfor00dantuoft ("De Monarchia, the Oxford text"; contributed by Robarts - ' +
      'University of Toronto; NOT_IN_COPYRIGHT; 84 scanned images, 400ppi). Its djvu.txt/djvu.xml OCR text layer ' +
      '(ABBYY) was fetched once and cached under scripts/import-dante/monarchia-la/raw/oxford-djvu.txt, ' +
      'oxford-pages.json (the latter extracted per leaf from oxford-djvu.xml by raw/extractPages.mjs); the IIIF ' +
      'manifest and archive.org /metadata response are cached as oxford-manifest.json and oxford-metadata.json. ' +
      'Page images for every one of the 36 pages bearing De Monarchia\'s own text (printed pages 341-376, covering ' +
      'the whole work) were downloaded once from the IIIF image service to raw/images/ and viewed directly to ' +
      "correct this edition's OCR text against the actual page; every correction is logged, one file per printed " +
      'page, under raw/corrections/p<NNN>.json (find/replace/note triples), and applied deterministically by ' +
      'scripts/import-dante/monarchia-la/index.ts. Also checked and not used as a source: Karl Witte\'s 1874 ' +
      'critical edition (archive.org dantisalligheri01wittgoog and bub_gb_7FBb66mwKsQC - both have IIIF scans, but ' +
      "carry a large apparatus criticus and ~230 pages of front matter before the text proper); Latin Wikisource's " +
      '"De monarchia" (its own page header states "editio: incognita, fons: incognitus", and its own ' +
      '{{textquality}} template marks it 25%/unproofread - both disqualifying it as a base text per this batch\'s ' +
      'house rule). Imported by scripts/import-dante/monarchia-la.',
    license:
      "Dante's Latin original (c. 1312-13) and Moore's 1916 critical text are both in the public domain worldwide. " +
      'The archive.org digital scan carries no additional restriction (possible-copyright-status: NOT_IN_COPYRIGHT).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's De Monarchia, his Latin political treatise arguing for the independent, God-given authority of " +
            'universal secular monarchy (embodied by the Holy Roman Emperor) alongside, not subordinate to, the ' +
            "authority of the Papacy - in Edward Moore's critical Latin text, \"the Oxford text\", first published " +
            '1916 as a compact standalone volume (Latin text only, no per-page critical apparatus) with W. H. V. ' +
            "Reade's English introduction on Dante's political theory. This edition prints Karl Witte's own 1874 " +
            'chapter numbering throughout (its own note: "the numbering of the chapters is that of Witte"), with ' +
            "the alternative numbering used by Fraticelli and other editors noted parenthetically in Book I only - " +
            'this import follows Witte\'s numbering, discarding the parenthetical alternative, exactly as Church\'s ' +
            'English translation of this same work (dante-monarchia-en) already does in this library.',
          'The text here is verbatim throughout. Nothing is modernised, paraphrased, or silently corrected beyond ' +
            "genuine OCR misreadings fixed against the scanned page image (see \"How it was imported\").",
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'archive.org item demonarchiaoxfor00dantuoft, a 1916 Oxford Clarendon Press printing digitised from the ' +
            'University of Toronto (Robarts Library) collection at 400ppi, NOT_IN_COPYRIGHT, with an unrestricted ' +
            'IIIF image service. (A second 1916 Oxford scan was found, dantedemonarchia0000dant, but it sits in ' +
            "archive.org's \"printdisabled\" controlled-digital-lending collection - access-restricted - and was " +
            'not used.)',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Direct OCR correction against page images (not the wikisource-base route): this edition\'s own ABBYY ' +
            'OCR text layer was fetched programmatically and cached as the working draft; every one of the 36 ' +
            "pages carrying the Monarchia's own text (printed pages 341-376) was then viewed as a downloaded page " +
            "image and its OCR corrected by hand against what the image actually shows, logged as an explicit " +
            'find/replace list per page (raw/corrections/p<NNN>.json) and applied deterministically. Latin ' +
            "Wikisource's parallel text of this same work was checked as a possible faster base but rejected: its " +
            'own page header discloses an unknown source edition ("editio: incognita, fons: incognitus") and its ' +
            'own quality template marks it only 25%/unproofread.',
          'Each of the three books is a top-level Division carrying this edition\'s own printed book-heading as ' +
            'sourceHeading (the Book II and Book III headings are printed in small capitals in the source and are ' +
            'normalised here to ordinary sentence capitalisation - a typographic-only normalisation); each of its ' +
            "numbered chapters (marked by Witte's bare roman numeral at the head of its first sentence) is a child " +
            "Division holding a single Passage of that chapter's continuous running prose. This edition's own " +
            'paragraph subdivisions (marked in print only by first-line indentation) are not recoverable from the ' +
            'page-image transcription route and are therefore not preserved; each chapter is one continuous block ' +
            'of prose, verbatim at the word level throughout.',
          `${totalChapters} chapters across 3 books (16 + 13 + 16), ${totalChars} characters total. This matches ` +
            "Church's English translation's own 16+13+16 division exactly (dante-monarchia-en), since both " +
            "ultimately follow Witte's numbering - independently confirmed here by directly counting this " +
            "edition's own chapter markers rather than assumed from the English sibling.",
        ],
      },
      {
        heading: 'Residual-error audit',
        paragraphs: [
          'After the page-by-page correction pass, every word of the emitted text was cross-checked against the ' +
            "vocabulary of Latin Wikisource's independent digitisation of the same work (used purely as a " +
            'spell-list, never as a text source; both sides normalised for ae/oe, u/v, i/j, y, ti/ci, h, doubled ' +
            'letters and prefix assimilation so that orthographic differences do not count) by ' +
            'scripts/import-dante/monarchia-la/residualCheck.ts. Every token absent from that vocabulary was then ' +
            'looked at individually against its page image (zoomed IIIF region crops where the full-page image ' +
            'was ambiguous, e.g. "Maxime" p.341, "cubuliam" p.356, "epiichiam" p.349) and either corrected - the ' +
            'entries marked "residual audit" in raw/corrections/ - or confirmed as printed (Moore\'s own ' +
            'orthography such as unassimilated "adsumere", "quum", "exsistens", "litera", "sequuta", "diremtio"; ' +
            'proper names; and readings the wikisource digitisation simply lacks). residualCheck.ts records each ' +
            'confirmed token with its reason, prints any unconfirmed one, and exits non-zero if there is any, so it ' +
            'doubles as a regression guard; at import time it reports zero unconfirmed tokens.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Division.ref and Passage.ref are null throughout: citation is by book and chapter number only, which the Division id and number already carry.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `${totalCorrections} individual OCR corrections were applied across the 36 pages (see anomalies.json ` +
            'for the per-page count and raw/corrections/p<NNN>.json for the exact list), plus ' +
            `${globalFix.count} further instances of a handful of always-wrong recurring misreadings ("nee" for ` +
            '"nec", "ilia" for "illa", etc.) fixed by a single global whole-word substitution rather than ' +
            'individually - see the "recurring OCR misreadings" anomaly entry. The excluded front/back matter, ' +
            'table of chapter arguments, marginal line-numbers, printer\'s gathering-signature marks, and ' +
            'Fraticelli parenthetical numbering; the paragraph-subdivision limitation; and this ' +
            'whitespace-before-punctuation normalisation, are all logged in anomalies.json.',
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(`\n${totalChapters} chapters across 3 books, ${totalChars} chars, ${totalCorrections} OCR corrections, ${anomalies.length} anomaly entries\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
