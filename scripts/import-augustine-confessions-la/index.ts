/**
 * Augustine, *Confessiones* - Latin text, from Latin Wikisource. Run-once
 * ingestion pipeline.
 *
 *   npm run import:augustine-confessions-la
 *
 * Reads scripts/import-augustine-confessions-la/raw/book-NN-*.json (already
 * in the repo - the result of the MediaWiki `action=parse&prop=wikitext` API
 * for the 13 Latin Wikisource pages "Confessiones/Liber Primus" .. "Liber
 * Tertius Decimus"). Writes:
 *   data/augustine-confessions-la/work.json       - the GenericWork
 *   data/augustine-confessions-la/about.json      - provenance / licence / prose
 *   data/augustine-confessions-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:augustine-confessions`.
 *
 * Source shape (verified by direct inspection of all 13 fetched pages): each
 * page opens with a `{{titulus2 ...}}` header template and `__NOTOC__`, then a
 * flat run of `== B.C.S ==` headings (book.chapter.section - the book number
 * is redundant with the page/Liber; only chapter C and section S are used
 * here), each followed by exactly the running prose up to the next heading
 * (one exception: 9.12.32 contains an internal blank line before a quoted
 * Ambrosian hymn - handled by NOT splitting on blank lines at all, since this
 * source's passage granularity is one passage per printed section number, not
 * per blank-line paragraph). The page ends with `{{finis}}` and
 * `{{Textquality|75%}}`, both stripped as transport scaffolding.
 *
 * Faithfulness rules (mirrors scripts/import-isagoge-la and scripts/import-euclid):
 * verbatim Latin reading text only; no accent/spelling/capitalisation fixes
 * (this text is printed entirely in lowercase, sentence-initial included, and
 * is kept exactly so); u/v and i/j exactly as transcribed. Only wiki/HTML
 * TRANSPORT scaffolding is removed:
 *   - the `{{titulus2}}` header template, `__NOTOC__`, `{{finis}}`, `{{Textquality}}`
 *   - one editorial `<ref>...</ref>` footnote (Book X, 10.6.10 - a de
 *     Labriolle variant-reading note), removed like any apparatus footnote
 *     and logged verbatim to anomalies.json
 *   - MediaWiki italic markup (`''...''`) around quoted material - this app's
 *     Passage.text has no rich-text/formatting model, so the two-apostrophe
 *     markers are stripped while every literal apostrophe/quote-mark
 *     character and all enclosed words are kept; every occurrence is counted
 *     and logged as a single corpus-level anomaly
 * Nothing else is discarded, corrected, or reordered.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../import-augustine-confessions-shared/bookMeta.ts';
import { cleanText, stripItalicMarkup, stripRefs } from '../import-augustine-confessions-shared/text.ts';
import {
  LA_ABOUT_SECTIONS,
  LA_LICENSE,
  LA_PROVENANCE,
} from './aboutText.ts';
import type { Division, GenericWork, Passage } from '../../data/augustine-confessions-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'augustine-confessions-la');

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

/** `== B.C.S ==` heading line - book.chapter.section, all plain arabic. */
const HEADING_RE = /^==\s*(\d+)\.(\d+)\.(\d+)\s*==[ \t]*$/gm;

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const files = readdirSync(RAW_DIR)
    .filter((f) => f.startsWith('book-') && f.endsWith('.json'))
    .sort();
  if (files.length !== 13) {
    fail(`expected 13 raw book JSON files in ${RAW_DIR}, found ${files.length}: ${files.join(', ')}`);
  }

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  let totalRefsStripped = 0;
  let totalItalicPairs = 0;

  for (let bi = 0; bi < files.length; bi++) {
    const bookNum = bi + 1;
    const meta = BOOKS[bi];
    if (!meta || meta.n !== bookNum) fail(`bookMeta.ts entry ${bi} does not match expected book number ${bookNum}`);

    const file = files[bi]!;
    const raw = JSON.parse(readFileSync(join(RAW_DIR, file), 'utf8')) as {
      parse?: { wikitext?: string | { '*'?: string } };
    };
    const wt = raw.parse?.wikitext;
    const wikitext = typeof wt === 'string' ? wt : wt?.['*'];
    if (!wikitext) fail(`${file}: could not find .parse.wikitext string in the raw JSON`);

    // --- strip wiki-transport scaffolding ---------------------------------
    let text = wikitext;
    const beforeTitulus = text.length;
    text = text.replace(/\{\{titulus2[\s\S]*?\n\}\}/, '');
    if (text.length === beforeTitulus) fail(`${file}: {{titulus2 ...}} template not found / not stripped`);
    const beforeNotoc = text.length;
    text = text.replace(/^__NOTOC__\s*/m, '');
    if (text.length === beforeNotoc) fail(`${file}: __NOTOC__ marker not found / not stripped`);

    const finisIdx = text.indexOf('{{finis}}');
    if (finisIdx < 0) fail(`${file}: {{finis}} marker not found`);
    const tqCount = (text.match(/\{\{Textquality\|/g) ?? []).length;
    if (tqCount !== 1) fail(`${file}: expected exactly one {{Textquality|...}} marker, found ${tqCount}`);
    const body = text.slice(0, finisIdx);

    // --- locate headings ----------------------------------------------------
    const headings: { idx: number; len: number; book: number; chapter: number; section: number }[] = [];
    let hm: RegExpExecArray | null;
    HEADING_RE.lastIndex = 0;
    while ((hm = HEADING_RE.exec(body))) {
      headings.push({
        idx: hm.index,
        len: hm[0].length,
        book: Number(hm[1]),
        chapter: Number(hm[2]),
        section: Number(hm[3]),
      });
    }
    if (headings.length === 0) fail(`${file}: no "== B.C.S ==" headings found`);

    const gap = body.slice(0, headings[0]!.idx).trim();
    if (gap.length > 0) fail(`${file}: non-empty content between header scaffolding and the first heading: ${JSON.stringify(gap)}`);

    // --- validate the heading sequence for this book ------------------------
    for (const h of headings) {
      if (h.book !== bookNum) fail(`${file}: heading "${h.book}.${h.chapter}.${h.section}" carries book number ${h.book}, expected ${bookNum}`);
    }
    headings.forEach((h, i) => {
      if (h.section !== i + 1) {
        fail(`${file}: heading position ${i} has section ${h.section}, expected ${i + 1} (section numbers must run 1..N without gaps)`);
      }
    });
    for (let i = 1; i < headings.length; i++) {
      if (headings[i]!.chapter < headings[i - 1]!.chapter) {
        fail(`${file}: chapter number decreases at heading ${i} (${headings[i]!.chapter} after ${headings[i - 1]!.chapter})`);
      }
    }
    const chapterSet = new Set(headings.map((h) => h.chapter));
    const maxChapter = Math.max(...headings.map((h) => h.chapter));
    for (let c = 1; c <= maxChapter; c++) {
      if (!chapterSet.has(c)) fail(`${file}: chapter ${c} has no headings (gap in 1..${maxChapter})`);
    }

    // --- build the Book division + its Chapter children ---------------------
    const bookDiv: Division = {
      id: `book-${bookNum}`,
      number: meta.roman,
      ref: null,
      sourceHeading: null,
      editorialTitle: meta.en,
      children: [],
      passages: [],
    };

    let chapterDiv: Division | null = null;
    let currentChapter = -1;

    for (let hi = 0; hi < headings.length; hi++) {
      const h = headings[hi]!;
      const start = h.idx + h.len;
      const end = hi + 1 < headings.length ? headings[hi + 1]!.idx : body.length;
      const rawBlock = body.slice(start, end);

      const { text: noRefs, removed: refsRemoved } = stripRefs(rawBlock);
      for (const r of refsRemoved) {
        totalRefsStripped += 1;
        anomalies.push({
          where: `book-${bookNum}-ch-${h.chapter} / section ${h.section}`,
          note: `an editorial <ref>...</ref> footnote was removed from the reading text (apparatus, not Augustine's text): "${r}"`,
        });
      }
      const { text: noItalics, count: italicPairs } = stripItalicMarkup(noRefs);
      totalItalicPairs += italicPairs;

      const passageText = cleanText(noItalics);
      if (passageText.length === 0) fail(`book-${bookNum} section ${h.section}: passage text is empty after cleaning`);

      if (h.chapter !== currentChapter) {
        currentChapter = h.chapter;
        chapterDiv = {
          id: `book-${bookNum}-ch-${h.chapter}`,
          number: String(h.chapter),
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        bookDiv.children.push(chapterDiv);
      }
      const passage: Passage = { n: String(h.section), text: passageText, ref: null };
      chapterDiv!.passages.push(passage);
    }

    divisions.push(bookDiv);
  }

  if (totalItalicPairs > 0) {
    anomalies.push({
      where: 'augustine-confessions-la / all books',
      note:
        `${totalItalicPairs} pair(s) of MediaWiki italic markup ('' ... '') were stripped from the reading text ` +
        '(this source uses them around quoted Scripture/speech within a quotation, e.g. Book III 3.4.7 and Book XII ' +
        '12.29.40). Passage.text has no rich-text/formatting field, so the markup was removed while every literal ' +
        'apostrophe/quote-mark character and all enclosed words were kept verbatim.',
    });
  }
  anomalies.push({
    where: 'augustine-confessions-la / all refs, all division & passage refs',
    note:
      'This Wikisource transcription carries no physical page/line reference. Division.ref and Passage.ref are ' +
      "null throughout; the citation scheme for this work is 'book-chapter-section' (registry.ts), reflected " +
      'directly in the Book/Chapter/Passage id and number/n fields.',
  });
  anomalies.push({
    where: 'augustine-confessions-la / passage 9.12.32',
    note:
      'Book IX, chapter 12, section 32 contains an internal blank line in the source before eight lines of Ambrose\'s ' +
      'hymn "Deus creator omnium", quoted with a leading double-quote/apostrophe on each line as printed. This is the ' +
      'only section in the whole work with a blank line inside its heading-to-heading span; it is kept as a single ' +
      'passage (matching every other section) with the internal blank line collapsed to a single space by the shared ' +
      'whitespace-collapsing rule, not treated as a paragraph break.',
  });
  anomalies.push({
    where: 'augustine-confessions-la / division scheme',
    note:
      '13 Books, each with book.chapter.section headings printed by the source itself; chapter counts per book as ' +
      'parsed (20, 10, 12, 16, 14, 16, 21, 12, 13, 43, 31, 32, 38 for Books I-XIII) match the traditional chapter ' +
      "count for each book of the Confessions. Every chapter's section numbers run contiguously 1..N through the " +
      'whole book (not reset per chapter), exactly as printed; Division.number for a Chapter is the plain arabic ' +
      'chapter number, and Passage.n is the plain arabic section number, both taken directly from the source heading.',
  });
  anomalies.push({
    where: 'augustine-confessions-la / orthography',
    note:
      'No capitalisation, u/v, or i/j regularisation of any kind. The source prints the entire text in lowercase, ' +
      'including the first word of the work ("magnus es, domine...") and every sentence-initial word thereafter; ' +
      'this is exactly as transcribed and is preserved verbatim.',
  });

  // --- write outputs -------------------------------------------------------
  const work: GenericWork = {
    workId: 'augustine-confessions-la',
    language: 'la',
    divisions,
  };

  const about = {
    workId: 'augustine-confessions-la',
    title: 'Confessiones',
    author: 'Augustine of Hippo',
    language: 'la' as const,
    provenance: LA_PROVENANCE,
    license: LA_LICENSE,
    sections: LA_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary -------------------------------------------------------
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
      `  ${b.number!.padEnd(6)} ${b.id.padEnd(9)} ${String(chapters).padStart(2)} chapter(s)  ${String(passages).padStart(3)} passage(s)  ${chars} chars\n`,
    );
  }
  process.stdout.write(
    `\n  13 books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars\n` +
      `  ${totalRefsStripped} <ref> footnote(s) stripped  ${totalItalicPairs} italic-markup pair(s) stripped\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:augustine-confessions` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
