/**
 * Augustine, *On Christian Doctrine* - English translation by Rev. Professor
 * J. F. Shaw (Nicene and Post-Nicene Fathers, Series I, Vol. II, 1887), from
 * English Wikisource. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-augustine-christian-doctrine-en/fetch.ts   (run first)
 *   npx tsx scripts/import-augustine-christian-doctrine-en/index.ts
 *
 * Reads scripts/import-augustine-christian-doctrine-en/raw/{preface,
 * toc-book-<roman>,book-<roman>-ch-<n>}.json (fetched by fetch.ts via the
 * MediaWiki `action=parse&prop=wikitext` API from the page family "Nicene
 * and Post-Nicene Fathers: Series I/Volume II/On Christian Doctrine" - one
 * Preface page, one Book-level TOC page per Book, and one page per chapter).
 * Writes:
 *   data/augustine-christian-doctrine-en/work.json       - the GenericWork
 *   data/augustine-christian-doctrine-en/about.json      - provenance / licence / prose
 *   data/augustine-christian-doctrine-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-augustine-christian-doctrine-shared/validate.ts`.
 *
 * SOURCE SHAPE (verified by direct inspection): every chapter page opens with
 * a `{{header ...}}` navigation template, then a heading block of the form
 * "Chapter N.—Title text" (word-wrapped across several lines, joined here by
 * spaces; the text after the em-dash becomes Division.sourceHeading), then
 * the chapter's own numbered paragraphs ("1.", "2." ...), then a trailing
 * "==Footnotes==\n<references />" marker. The Preface page is laid out
 * slightly differently: "Preface." on its own, then a separate one-line
 * description (used as that chapter's sourceHeading the same way), then its
 * own numbered paragraphs.
 *
 * This work's citation scheme (registry.ts) is 'book-chapter', not the Latin
 * edition's 'book-chapter-section': every Chapter division holds exactly one
 * Passage (n: ""), and where a chapter prints more than one numbered
 * paragraph, they are all joined into that single Passage (source paragraph
 * numbers kept inline, not stripped - see about.json).
 *
 * Faithfulness rules (mirrors every importer in this repo): verbatim English
 * reading text only; no spelling/wording "fixes". Only wiki/HTML TRANSPORT
 * scaffolding is removed: the {{header}} template, every <ref>...</ref>
 * footnote (apparatus, not Augustine's text), the trailing Footnotes marker,
 * and MediaWiki's italic/bold apostrophe-run markup (no rich-text field to
 * carry it). HTML entities are decoded. Nothing else is discarded, corrected,
 * or reordered.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../import-augustine-christian-doctrine-shared/bookMeta.ts';
import { cleanText, stripQuoteMarkup, stripRefs } from '../import-augustine-christian-doctrine-shared/text.ts';
import { EN_ABOUT_SECTIONS, EN_LICENSE, EN_PROVENANCE } from './aboutText.ts';
import type { Division, GenericWork, Passage } from '../../data/augustine-christian-doctrine-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'augustine-christian-doctrine-en');

const ROMAN = ['I', 'II', 'III', 'IV'];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

function loadWikitext(file: string): string {
  const path = join(RAW_DIR, file);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    parse?: { wikitext?: string | { '*'?: string } };
  };
  const wt = raw.parse?.wikitext;
  const wikitext = typeof wt === 'string' ? wt : wt?.['*'];
  if (!wikitext) fail(`${file}: could not find .parse.wikitext string in the raw JSON`);
  return wikitext;
}

const CHAPTER_LINK_RE = /\[\[[^|\]]*\/Chapter (\d+)\|Chapter \d+\]\]/g;

/** Read a Book's chapter count from its own TOC page (never assumed). */
function chapterCountFromToc(roman: string): number {
  const wt = loadWikitext(`toc-book-${roman}.json`);
  const contentsIdx = wt.indexOf('== Contents ==');
  if (contentsIdx < 0) fail(`toc-book-${roman}: no "== Contents ==" section found`);
  const block = wt.slice(contentsIdx);
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  CHAPTER_LINK_RE.lastIndex = 0;
  while ((m = CHAPTER_LINK_RE.exec(block))) nums.push(Number(m[1]));
  if (nums.length === 0) fail(`toc-book-${roman}: no chapter links found`);
  nums.forEach((n, i) => {
    if (n !== i + 1) fail(`toc-book-${roman}: chapter links out of order/gapped at position ${i} (got ${n})`);
  });
  return nums.length;
}

function stripHeaderTemplate(wikitext: string, label: string): string {
  const m = /\{\{header[\s\S]*?\n\}\}\s*\n*/.exec(wikitext);
  if (!m || m.index !== 0) fail(`${label}: {{header ...}} template not found at the start of the page`);
  return wikitext.slice(m[0].length);
}

/** Not every chapter carries footnotes; the trailer is stripped when present, left alone otherwise. */
function stripFootnoteTrailer(wikitext: string): string {
  const idx = wikitext.search(/\n==\s*Footnotes\s*==/);
  return idx < 0 ? wikitext : wikitext.slice(0, idx);
}

interface CleanResult {
  text: string;
  refsRemoved: number;
  quoteMarksRemoved: number;
}

function buildPassageText(rawBody: string): CleanResult {
  const { text: noRefs, removed } = stripRefs(rawBody);
  const { text: noQuotes, count } = stripQuoteMarkup(noRefs);
  const text = cleanText(noQuotes);
  return { text, refsRemoved: removed.length, quoteMarksRemoved: count };
}

/** Split into blank-line-delimited blocks, each with internal whitespace collapsed to single spaces. */
function splitBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

function parseChapterPage(
  file: string,
  roman: string,
  chapterNum: number,
  anomalies: Anomaly[],
): { sourceHeading: string; passageText: string } {
  const label = `book-${roman}-ch-${chapterNum}`;
  let wt = loadWikitext(file);
  wt = stripHeaderTemplate(wt, label);
  wt = stripFootnoteTrailer(wt);

  const blocks = splitBlocks(wt);
  if (blocks.length < 2) fail(`${label}: expected a heading block followed by body paragraphs, found ${blocks.length} block(s)`);
  const headingBlock = blocks[0]!.replace(/\s+/g, ' ').trim();

  const headingMatch = /^Chapter\s+(\d+)\s*\.—(.+)$/.exec(headingBlock);
  if (!headingMatch) fail(`${label}: heading block does not match "Chapter N.—Title": ${JSON.stringify(headingBlock.slice(0, 80))}`);
  const printedChapterNum = Number(headingMatch[1]);
  if (printedChapterNum !== chapterNum) {
    anomalies.push({
      where: label,
      note: `page heading prints "Chapter ${printedChapterNum}" but this page was fetched as chapter ${chapterNum} per the Book's own table of contents; kept as fetched/positioned, heading text preserved verbatim.`,
    });
  }
  const sourceHeading = cleanText(headingMatch[2]!);

  const bodyRaw = blocks.slice(1).join('\n\n');
  const { text, refsRemoved, quoteMarksRemoved } = buildPassageText(bodyRaw);
  if (text.length === 0) fail(`${label}: passage text is empty after cleaning`);

  totalRefsStripped += refsRemoved;
  totalQuoteMarksStripped += quoteMarksRemoved;

  return { sourceHeading, passageText: text };
}

function parsePreface(): { pageHeading: string; sourceHeading: string; passageText: string } {
  const label = 'preface';
  let wt = loadWikitext('preface.json');
  wt = stripHeaderTemplate(wt, label);
  wt = stripFootnoteTrailer(wt);

  const blocks = splitBlocks(wt);
  if (blocks.length < 3) fail(`${label}: expected "Preface." + description + body blocks, found ${blocks.length} block(s)`);
  const pageHeading = blocks[0]!.replace(/\s+/g, ' ').trim();
  if (!/^Preface\.?$/.test(pageHeading)) fail(`${label}: first block is not "Preface.": ${JSON.stringify(pageHeading)}`);

  const sourceHeading = cleanText(blocks[1]!.replace(/\s+/g, ' '));

  const bodyRaw = blocks.slice(2).join('\n\n');
  const { text, refsRemoved, quoteMarksRemoved } = buildPassageText(bodyRaw);
  if (text.length === 0) fail(`${label}: passage text is empty after cleaning`);

  totalRefsStripped += refsRemoved;
  totalQuoteMarksStripped += quoteMarksRemoved;

  return { pageHeading, sourceHeading, passageText: text };
}

// running totals, referenced by the parse functions above
let totalRefsStripped = 0;
let totalQuoteMarksStripped = 0;

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const anomalies: Anomaly[] = [];

  const divisions: Division[] = [];

  // --- book-0: Preface -----------------------------------------------------
  const preface = parsePreface();
  const prefaceMeta = BOOKS[0]!;
  const prefacePassage: Passage = { n: '', text: preface.passageText, ref: null };
  const prefaceChapter: Division = {
    id: 'book-0-ch-1',
    number: null,
    ref: null,
    sourceHeading: preface.sourceHeading,
    editorialTitle: null,
    children: [],
    passages: [prefacePassage],
  };
  divisions.push({
    id: 'book-0',
    number: null,
    ref: null,
    sourceHeading: preface.pageHeading,
    editorialTitle: prefaceMeta.en,
    children: [prefaceChapter],
    passages: [],
  });

  // --- books I-IV ------------------------------------------------------------
  for (let bi = 0; bi < ROMAN.length; bi++) {
    const bookNum = bi + 1;
    const roman = ROMAN[bi]!;
    const meta = BOOKS[bookNum]!;
    const chapterCount = chapterCountFromToc(roman);

    const children: Division[] = [];
    for (let c = 1; c <= chapterCount; c++) {
      const { sourceHeading, passageText } = parseChapterPage(`book-${roman}-ch-${c}.json`, roman, c, anomalies);
      const passage: Passage = { n: '', text: passageText, ref: null };
      children.push({
        id: `book-${bookNum}-ch-${c}`,
        number: String(c),
        ref: null,
        sourceHeading,
        editorialTitle: null,
        children: [],
        passages: [passage],
      });
    }

    divisions.push({
      id: `book-${bookNum}`,
      number: meta.roman,
      ref: null,
      sourceHeading: `Book ${roman}`,
      editorialTitle: meta.en,
      children,
      passages: [],
    });
  }

  // --- corpus-level anomaly notes ------------------------------------------
  anomalies.push({
    where: 'augustine-christian-doctrine-en / all refs',
    note:
      'This Wikisource transcription carries no physical page/line reference of its own. Division.ref and ' +
      "Passage.ref are null throughout; citation is 'book-chapter' (registry.ts): Division.number / Division.id " +
      'carry the printed Book roman numeral and Chapter number, and every Passage.n is "" (this edition\'s ' +
      'Chapter divisions are not further subdivided into separate Passages - see "How it was imported" in about.json).',
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-en / footnotes',
    note: `${totalRefsStripped} editorial <ref>...</ref> footnote(s) (translator/editor apparatus, chiefly Scripture cross-references) were removed from the reading text across the Preface and all four Books; counted in aggregate rather than quoted individually given the volume.`,
  });
  if (totalQuoteMarksStripped > 0) {
    anomalies.push({
      where: 'augustine-christian-doctrine-en / italic-bold markup',
      note: `${totalQuoteMarksStripped} run(s) of MediaWiki italic/bold apostrophe markup ('' or ''') were stripped from the reading text (this app's Passage.text has no rich-text field); every enclosed word was kept verbatim.`,
    });
  }
  anomalies.push({
    where: 'augustine-christian-doctrine-en / book-2 and book-3 vs. Latin edition',
    note:
      'This English translation preserves the traditional 42-chapter (Book II) and 37-chapter (Book III) ' +
      'division. The Latin De Doctrina Christiana bundled alongside this work does NOT preserve that division ' +
      "for its own Books II/III (its Wikisource transcription prints no chapter numerals there at all - see " +
      "that edition's own anomalies.json); this is a property of the two independent Wikisource transcriptions, " +
      'not something introduced by either importer.',
  });
  anomalies.push({
    where: 'augustine-christian-doctrine-en / interior paragraph numbers',
    note:
      'Where a chapter page prints more than one numbered paragraph ("1.", "2." ...), all of them are joined ' +
      "into that Chapter's single Passage per this work's 'book-chapter' citation scheme, with the source's own " +
      'paragraph numbers kept inline exactly as printed rather than stripped or split into separate Passages.',
  });

  // --- write outputs ---------------------------------------------------------
  const work: GenericWork = {
    workId: 'augustine-christian-doctrine-en',
    language: 'en',
    divisions,
  };
  const about = {
    workId: 'augustine-christian-doctrine-en',
    title: 'On Christian Doctrine',
    author: 'Augustine of Hippo',
    language: 'en' as const,
    translator: 'J. F. Shaw',
    edition: 'Nicene and Post-Nicene Fathers, Series I, Vol. II (1887)',
    provenance: EN_PROVENANCE,
    license: EN_LICENSE,
    sections: EN_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary --------------------------------------------------
  let totalChapters = 0;
  let totalPassages = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const chapters = b.children.length;
    const passages = b.children.reduce((n, c) => n + c.passages.length, 0);
    const chars = b.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);
    totalChapters += chapters;
    totalPassages += passages;
    totalChars += chars;
    process.stdout.write(
      `  ${(b.number ?? '(preface)').padEnd(9)} ${b.id.padEnd(9)} ${String(chapters).padStart(3)} chapter(s)  ${String(passages).padStart(3)} passage(s)  ${chars} chars\n`,
    );
  }
  process.stdout.write(
    `\n  5 books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars\n` +
      `  ${totalRefsStripped} <ref> footnote(s) stripped  ${totalQuoteMarksStripped} italic/bold-markup run(s) stripped\n` +
      `  ${anomalies.length} anomalies logged\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-augustine-christian-doctrine-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
