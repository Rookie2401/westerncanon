/**
 * Augustine, *Confessions* - English translation by J. G. Pilkington (Nicene
 * and Post-Nicene Fathers, Series I, Vol. I, 1887), from English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npm run import:augustine-confessions-en
 *
 * Reads scripts/import-augustine-confessions-en/raw/{toc-book-N,book-N-ch-M}.json
 * (already in the repo - fetch.ts's cache of the MediaWiki
 * `action=parse&prop=wikitext` API for the 13 Book TOC pages and every
 * individual chapter page they list; see fetch.ts's own doc comment). Writes:
 *   data/augustine-confessions-en/work.json       - the GenericWork
 *   data/augustine-confessions-en/about.json      - provenance / licence / prose
 *   data/augustine-confessions-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:augustine-confessions`.
 *
 * Source shape (verified by direct inspection of every fetched chapter page):
 * each chapter page opens with a `{{header ...}}` template, optionally
 * followed by `<br/>` (present on some pages, absent on others - both are
 * genuine, not a parsing error), then a heading paragraph "Chapter
 * <roman>.—<Title>." (the title may wrap across several source lines), then
 * the chapter's prose - which itself carries the traditional Latin section
 * numbers inline (e.g. "5. ... 6. ...") wherever a chapter spans more than
 * one Latin section - then, only on chapters that actually carry a footnote,
 * a trailing "==Footnotes==\n<references />" section.
 *
 * Chapter division shape: this translation's own citation scheme
 * (registry.ts: 'book-chapter') has no slot below chapter level, so - per
 * data/augustine-confessions-en/types.ts - each Chapter division gets exactly
 * ONE Passage (n: ''). The inline Latin-section numerals inside a chapter's
 * prose are therefore genuine printed content with nowhere else to go; they
 * are kept verbatim in the passage text rather than stripped or silently
 * discarded (see the corpus-level anomaly logged below).
 *
 * Faithfulness rules (mirrors every other importer in this repo): verbatim
 * English reading text only; no spelling/wording "fixes". Only wiki/HTML
 * TRANSPORT scaffolding is removed:
 *   - the `{{header}}` template and the leading `<br/>` (where present)
 *   - the trailing `==Footnotes==` / `<references />` section (where present)
 *   - every `<ref>...</ref>` footnote inline in the prose (Pilkington's own
 *     extensive annotation - translator/editorial apparatus, not Augustine's
 *     text; not preserved anywhere, per this importer's brief)
 *   - MediaWiki italic markup (`''...''`), for the same reason as the Latin
 *     importer: Passage.text has no rich-text field, so the markers are
 *     dropped and the enclosed words kept
 * All HTML entities (named and numeric) are decoded. Nothing else is
 * discarded, corrected, or reordered.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../import-augustine-confessions-shared/bookMeta.ts';
import { fromRoman } from '../import-augustine-confessions-shared/roman.ts';
import { cleanText, decodeEntities, stripItalicMarkup, stripRefs } from '../import-augustine-confessions-shared/text.ts';
import { EN_ABOUT_SECTIONS, EN_LICENSE, EN_PROVENANCE } from './aboutText.ts';
import type { Division, GenericWork } from '../../data/augustine-confessions-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'augustine-confessions-en');

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

interface ParseResult {
  parse?: { wikitext?: string | { '*'?: string } };
}

function readWikitext(file: string): string {
  const raw = JSON.parse(readFileSync(join(RAW_DIR, file), 'utf8')) as ParseResult;
  const wt = raw.parse?.wikitext;
  const s = typeof wt === 'string' ? wt : wt?.['*'];
  if (!s) fail(`${file}: could not find .parse.wikitext string in the raw JSON`);
  return s;
}

/** `[[...Chapter N|Chapter N]]` link inside a TOC's "== Contents ==" list - kept identical to fetch.ts's own regex. */
const CHAPTER_LINK_RE = /\[\[[^|\]]*\/Chapter (\d+)\|Chapter \d+\]\]/g;

const HEADER_TEMPLATE_RE = /\{\{header[\s\S]*?\n\}\}/;
/** Book XII Chapter 1 prints an irregular "Chapter I .—" (stray space before the
 *  period) - confirmed by direct inspection; tolerated here like isagoge's "==  XIX."
 *  irregular-spacing headings, not treated as a parse error. */
const HEADING_RE = /^Chapter\s+([IVXLCDM]+)\s*\.—([\s\S]*?)\n\s*\n/;
const FOOTNOTES_RE = /\n?==\s*Footnotes\s*==[\s\S]*$/;

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  let totalRefsStripped = 0;
  let totalItalicPairs = 0;
  let totalChaptersWithInlineNumerals = 0;
  let totalHeadingRomanMismatches = 0;

  for (let bi = 0; bi < BOOKS.length; bi++) {
    const bookNum = bi + 1;
    const meta = BOOKS[bi]!;

    const tocWikitext = readWikitext(`toc-book-${bookNum}.json`);
    const contentsIdx = tocWikitext.indexOf('== Contents ==');
    if (contentsIdx < 0) fail(`toc-book-${bookNum}.json: no "== Contents ==" section found`);
    const contentsBlock = tocWikitext.slice(contentsIdx);
    const chapterNums: number[] = [];
    let cm: RegExpExecArray | null;
    CHAPTER_LINK_RE.lastIndex = 0;
    while ((cm = CHAPTER_LINK_RE.exec(contentsBlock))) chapterNums.push(Number(cm[1]));
    if (chapterNums.length === 0) fail(`toc-book-${bookNum}.json: no chapter links found`);
    chapterNums.forEach((n, i) => {
      if (n !== i + 1) fail(`toc-book-${bookNum}.json: chapter links out of order/gapped at position ${i} (got ${n})`);
    });

    const bookDiv: Division = {
      id: `book-${bookNum}`,
      number: meta.roman,
      ref: null,
      sourceHeading: null,
      editorialTitle: meta.en,
      children: [],
      passages: [],
    };

    for (const c of chapterNums) {
      const file = `book-${bookNum}-ch-${c}.json`;
      let text = readWikitext(file);

      const beforeHeader = text.length;
      text = text.replace(HEADER_TEMPLATE_RE, '');
      if (text.length === beforeHeader) fail(`${file}: {{header ...}} template not found / not stripped`);

      // A leading `<br/>` rule (used to separate the header template from the
      // heading) is present on some chapter pages and absent on others -
      // confirmed by direct inspection across all fetched pages. Strip it
      // when present; its absence is not an error.
      text = text.replace(/^\s*<br\s*\/?>\s*/, '');

      text = decodeEntities(text);
      text = text.trimStart();

      const hm = HEADING_RE.exec(text);
      if (!hm) fail(`${file}: could not locate "Chapter <roman>.—<title>" heading at the top of the page body`);
      const headingRoman = hm[1]!;
      // Book XII chapter 22's own title carries a trailing <ref> footnote
      // (confirmed by direct inspection); strip it here exactly like every
      // other footnote, rather than leaving it embedded in sourceHeading.
      const { text: headingNoRefs, removed: headingRefsRemoved } = stripRefs(hm[2]!);
      const sourceHeading = cleanText(headingNoRefs);

      if (/[IVXLCDM]\s+\./.test(hm[0])) {
        anomalies.push({
          where: `book-${bookNum}-ch-${c}`,
          note: 'printed chapter heading has an irregular stray space before the period ("Chapter I .—..."); tolerated, not corrected.',
        });
      }

      let chapterRomanValue: number;
      try {
        chapterRomanValue = fromRoman(headingRoman);
      } catch {
        fail(`${file}: heading roman numeral "${headingRoman}" could not be parsed`);
      }
      if (chapterRomanValue !== c) {
        totalHeadingRomanMismatches += 1;
        anomalies.push({
          where: `book-${bookNum}-ch-${c}`,
          note: `printed chapter heading numeral "${headingRoman}" (= ${chapterRomanValue}) does not match this chapter's position (${c}) in the Book's Contents list`,
        });
      }

      // A trailing "==Footnotes==\n<references />" section is present only
      // when the chapter actually carries at least one <ref> footnote -
      // confirmed by direct inspection: several chapters (e.g. Book I
      // chapter 10) have neither a <ref> nor a Footnotes section at all.
      // Strip it when present; its absence is not an error.
      let body = text.slice(hm.index + hm[0].length);
      body = body.replace(FOOTNOTES_RE, '');

      totalRefsStripped += headingRefsRemoved.length;
      const { text: noRefs, removed } = stripRefs(body);
      totalRefsStripped += removed.length;
      const { text: noItalics, count: italicPairs } = stripItalicMarkup(noRefs);
      totalItalicPairs += italicPairs;

      const passageText = cleanText(noItalics);
      if (passageText.length === 0) fail(`${file}: passage text is empty after cleaning`);
      if (/^\d+\.\s/.test(passageText)) {
        totalChaptersWithInlineNumerals += 1;
      }

      const chapterDiv: Division = {
        id: `book-${bookNum}-ch-${c}`,
        number: String(c),
        ref: null,
        sourceHeading,
        editorialTitle: null,
        children: [],
        passages: [{ n: '', text: passageText, ref: null }],
      };
      bookDiv.children.push(chapterDiv);
    }

    divisions.push(bookDiv);
  }

  anomalies.push({
    where: 'augustine-confessions-en / all books',
    note:
      `${totalRefsStripped} <ref>...</ref> footnotes (Pilkington's translator/editorial annotation) were removed ` +
      'from the reading text across all 13 books; their content is not preserved anywhere, per this importer\'s brief.',
  });
  if (totalItalicPairs > 0) {
    anomalies.push({
      where: 'augustine-confessions-en / all books',
      note:
        `${totalItalicPairs} pair(s) of MediaWiki italic markup ('' ... '') were stripped from the reading text ` +
        '(used around quoted Latin phrases and emphasised English words). Passage.text has no rich-text field, so ' +
        'the markers were removed while every enclosed word was kept verbatim.',
    });
  }
  anomalies.push({
    where: 'augustine-confessions-en / inline section numerals',
    note:
      `${totalChaptersWithInlineNumerals} of ${divisions.reduce((n, d) => n + d.children.length, 0)} chapters carry ` +
      'one or more inline numerals (e.g. "5. ... 6. ...") in their prose, printed by this edition wherever a chapter ' +
      "spans more than one of the Latin work's traditional section numbers. This translation's own citation scheme " +
      "is book-chapter only (registry.ts), with nothing below chapter level, so each Chapter division holds exactly " +
      'one Passage (n: \'\') and these numerals are kept verbatim as part of that passage\'s printed text rather than ' +
      'stripped or moved to a field this edition does not use.',
  });
  if (totalHeadingRomanMismatches > 0) {
    anomalies.push({
      where: 'augustine-confessions-en / chapter heading numerals',
      note: `${totalHeadingRomanMismatches} chapter heading(s) print a roman numeral that does not match their position in the Book's Contents list; see the individually-logged entries above.`,
    });
  }

  // --- write outputs -------------------------------------------------------
  const work: GenericWork = {
    workId: 'augustine-confessions-en',
    language: 'en',
    divisions,
  };

  const about = {
    workId: 'augustine-confessions-en',
    title: 'Confessions',
    author: 'Augustine of Hippo',
    language: 'en' as const,
    translator: 'J. G. Pilkington',
    edition: 'Nicene and Post-Nicene Fathers, Series I, Vol. I (1887)',
    provenance: EN_PROVENANCE,
    license: EN_LICENSE,
    sections: EN_ABOUT_SECTIONS,
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary -------------------------------------------------------
  let totalChapters = 0;
  let totalChars = 0;
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const chapters = b.children.length;
    const chars = b.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);
    totalChapters += chapters;
    totalChars += chars;
    process.stdout.write(`  ${b.number!.padEnd(6)} ${b.id.padEnd(9)} ${String(chapters).padStart(2)} chapter(s)  ${chars} chars\n`);
  }
  process.stdout.write(
    `\n  13 books  ${totalChapters} chapters  ${totalChapters} passages  ${totalChars} chars\n` +
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
