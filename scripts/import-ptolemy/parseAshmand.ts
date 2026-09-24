/**
 * Parses one sacred-texts.com "reader shell" chapter page (see
 * fetchAshmand.ts) into a chapter's heading/title/paragraphs.
 *
 * Page shape (confirmed by direct inspection of every fetched page before
 * writing this): a `[data-slot="reader-prose"] .contents` element (it
 * actually occurs 2-3 times per page, byte-identical each time - a
 * progressive-enhancement/hydration artefact of the site's framework; only
 * the FIRST is used) containing, in document order:
 *   - on the very FIRST chapter of the whole work only: the treatise's
 *     own title-page banner (`<h1>PTOLEMY'S TETRABIBLOS</h1> <h6>OR</h6>
 *     <h2>FOUR BOOKS</h2> <h6>OF THE</h6> <h3>INFLUENCE OF THE STARS</h3>`)
 *     - discarded, never part of any chapter's own reading text.
 *   - on the FIRST chapter of EACH of the 4 books: `<h1>BOOK THE
 *     FIRST/SECOND/THIRD/FOURTH</h1>` - captured (not discarded) as the
 *     signal for which book this chapter opens; absent on every other page.
 *   - `<h3>CHAPTER <roman>`</h3>` then `<h3><chapter title></h3>` - always
 *     present, always in that order, exactly once each.
 *   - the chapter's own `<p>` paragraphs, interspersed with:
 *       - occasional empty `<p> </p>` spacer paragraphs (discarded, no text)
 *       - an original-page-number marker of the exact shape `<p><a>p.
 *         N</a></p>` (discarded, counted - this is the print-scan's own
 *         pagination, not Ashmand's text)
 *       - occasionally, immediately after such a page break lands MID-
 *         SENTENCE, the site's OWN explicit continuation marker: a `<p>`
 *         whose text begins with the literal string "[paragraph
 *         continues] " - this is sacred-texts.com's own disambiguator
 *         (proving the page break split one paragraph, not a printer's
 *         indent starting a new one) - the marker text is stripped and the
 *         remainder is MERGED (space-joined) onto the end of the previous
 *         paragraph, not pushed as a new one. Every other page-number
 *         marker with no such following marker is a genuine paragraph
 *         boundary (nothing is merged there).
 *       - occasional `<div data-ad-inline="…">` / bare `<hr>` layout
 *         furniture - discarded (empty of text either way).
 *   - a trailing `<section data-slot="reader-footnotes">` holding
 *     Ashmand's own footnotes (`<li data-slot="reader-footnote">`, one per
 *     `<a data-footnote-ref>` inline marker in the body) - the whole
 *     section, and every inline `[data-footnote-ref]` marker in the body
 *     text, is removed BEFORE the walk above (matching this app's uniform
 *     policy of excluding translator/editorial apparatus - see the Greek
 *     importer's <note> handling in teiWalker.ts); each is individually
 *     counted, not silently dropped from the count.
 *
 * Any element this walk does not recognise makes it THROW rather than
 * silently drop or misfile content - a future re-fetch of a changed page
 * fails loudly instead of quietly losing text.
 */

import { JSDOM } from 'jsdom';
import { cleanText } from './text.ts';

export interface ParsedAshmandChapter {
  /** "BOOK THE FIRST" etc, only on a book-opening chapter's page, else null */
  bookHeading: string | null;
  /** roman numeral exactly as printed, e.g. "XXVII" */
  chapterRoman: string;
  chapterTitle: string;
  /** paragraphs in document order, mid-sentence page-break continuations already merged */
  paragraphs: string[];
  /** Ashmand's own footnote texts, in document order (excluded from reading text - see about.json) */
  footnotes: string[];
  pageMarkerCount: number;
  continuationCount: number;
  /** how many <table> elements (astrological data tables) were kept as row-serialised paragraphs */
  tableCount: number;
  sawTheEnd: boolean;
}


const PAGE_MARKER_RE = /^p\.\s*\d+\.?$/i;
const CONTINUES_PREFIX = '[paragraph continues]';
/** The printer's end-of-treatise colophon (its own bare `<p>THE END</p>`,
 *  seen once, closing Book IV's last chapter) - furniture, not Ptolemy's or
 *  Ashmand's own words; matches the convention already used elsewhere in
 *  this repo for the same printer's mark (see import-aristotle-rest-en-
 *  shared/wikitext.ts's RE_THE_END). */
const THE_END_RE = /^THE END\.?$/i;

export function parseAshmandChapterPage(html: string, slug: string): ParsedAshmandChapter {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const footnoteSection = doc.querySelector('section[data-slot="reader-footnotes"]');
  const footnotes = footnoteSection
    ? Array.from(footnoteSection.querySelectorAll('[data-slot="reader-footnote-body"]')).map((el) => cleanText(el.textContent ?? ''))
    : [];
  footnoteSection?.remove();
  for (const ref of Array.from(doc.querySelectorAll('[data-footnote-ref]'))) ref.remove();

  const container = doc.querySelector('[data-slot="reader-prose"] .contents');
  if (!container) throw new Error(`${slug}: no [data-slot="reader-prose"] .contents container found`);

  let bookHeading: string | null = null;
  let chapterRoman: string | null = null;
  let chapterTitle: string | null = null;
  let sawChapterHeading = false;
  const paragraphs: string[] = [];
  let pageMarkerCount = 0;
  let continuationCount = 0;
  let tableCount = 0;
  let sawTheEnd = false;

  // A genuine astrological data table (3 of the 70 chapters print one, 5
  // tables total - see workTable.ts) - kept verbatim as its own
  // "paragraph", one printed row per line, cells space-joined (ONLY
  // whitespace as a separator - no added punctuation - so validateEn.ts's
  // raw-vs-imported text accounting, which strips all whitespace before
  // comparing, reconciles exactly against the same table's <td> text on the
  // raw side; mirrors the Greek importer's tableOrFigure.ts row-
  // serialisation convention exactly).
  function pushTable(table: NonNullable<typeof container>['children'][number]): void {
    const rowLines = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('td, th'))
        .map((c) => cleanText(c.textContent ?? ''))
        .join(' '),
    );
    paragraphs.push(rowLines.join('\n'));
    tableCount += 1;
  }

  for (const child of Array.from(container.children)) {
    const tag = child.tagName.toLowerCase();
    const text = cleanText(child.textContent ?? '');

    if (tag === 'h1') {
      // title-page banner text (e.g. "PTOLEMY'S TETRABIBLOS"), when present,
      // is only ever seen on the very first chapter's page, before "BOOK THE
      // FIRST" - discarded either way, never part of any chapter's own text.
      if (/^BOOK THE\s+\w+$/i.test(text)) bookHeading = text;
      continue;
    }
    if (tag === 'h2' || tag === 'h6') continue; // title-page banner furniture only
    if (tag === 'h3') {
      if (!sawChapterHeading) {
        const m = /^CHAPTER\s+([IVXLC]+)\.?$/i.exec(text);
        if (!m) {
          // The very first chapter's page prints the treatise's own
          // title-page banner before "BOOK THE FIRST" (see module doc) -
          // its last line is an <h3> ("INFLUENCE OF THE STARS"), not a
          // chapter heading. Discarded as title-page furniture rather than
          // treated as an error, but ONLY before any book/chapter heading
          // has been seen on this page - after that point an unmatched <h3>
          // is unexpected and still throws.
          if (!bookHeading) continue;
          throw new Error(`${slug}: expected "CHAPTER <roman>" heading, got ${JSON.stringify(text)}`);
        }
        chapterRoman = m[1]!.toUpperCase();
        sawChapterHeading = true;
        continue;
      }
      if (chapterTitle === null) {
        chapterTitle = text;
        continue;
      }
      if (text.length === 0) continue; // stray empty <h3>, seen nowhere but tolerated
      // A genuine in-chapter sub-heading (2 of the 70 chapters print one -
      // e.g. Book II ch.3's "TABLE SHOWING ALL THE COUNTRIES BELONGING TO
      // EACH SIGN RESPECTIVELY", Book I ch.23's "THE TERMS ACCORDING TO THE
      // ÆGYPTIANS") - real Ashmand text, not furniture, kept as its own
      // "paragraph" in the reading-text flow (verbatim, just without any
      // distinct heading styling this app's generic Division/Passage shape
      // has no slot for below chapter level).
      paragraphs.push(text);
      continue;
    }
    if (tag === 'p') {
      if (text.length === 0) continue;
      if (THE_END_RE.test(text)) {
        sawTheEnd = true;
        continue;
      }
      if (PAGE_MARKER_RE.test(text)) {
        pageMarkerCount += 1;
        continue;
      }
      if (text.startsWith(CONTINUES_PREFIX)) {
        const rest = text.slice(CONTINUES_PREFIX.length).trim();
        const last = paragraphs[paragraphs.length - 1];
        if (last === undefined) throw new Error(`${slug}: "[paragraph continues]" with no preceding paragraph to merge onto`);
        paragraphs[paragraphs.length - 1] = `${last} ${rest}`;
        continuationCount += 1;
        continue;
      }
      paragraphs.push(text);
      continue;
    }
    if (tag === 'table') {
      pushTable(child);
      continue;
    }
    if (tag === 'div') {
      // Most <div> siblings here are empty ad-slot/layout furniture - but a
      // wide table (Book I ch.23/24's two-tables-per-chapter case) is itself
      // wrapped in a responsive-scroll <div>, not a direct child of
      // .contents (confirmed by direct inspection - a bug in an earlier
      // version of this parser silently dropped both tables by treating
      // every <div> as empty furniture; caught by validateEn.ts's per-
      // chapter text-accounting check). A <div> with no <table> inside it
      // is still assumed empty of text (true of every such div actually
      // found - if a future page proves otherwise, the unhandled-element
      // throw below never fires for divs, so this would need re-checking,
      // but is deliberately not over-engineered for a case never observed).
      const tables = Array.from(child.querySelectorAll('table'));
      for (const t of tables) pushTable(t);
      continue;
    }
    if (tag === 'hr') continue; // layout furniture, always empty of text
    throw new Error(`${slug}: unexpected element <${tag}> ${JSON.stringify(text.slice(0, 60))}`);
  }

  if (!chapterRoman || chapterTitle === null) throw new Error(`${slug}: missing CHAPTER heading/title`);
  if (paragraphs.length === 0) throw new Error(`${slug}: no paragraph text found`);

  return { bookHeading, chapterRoman, chapterTitle, paragraphs, footnotes, pageMarkerCount, continuationCount, tableCount, sawTheEnd };
}
