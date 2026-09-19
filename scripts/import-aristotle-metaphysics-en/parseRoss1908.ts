/**
 * Parser for English Wikisource's page-scan transclusion of W. D. Ross's own
 * 1908 translation of Aristotle's Metaphysics ("Metaphysics (Ross, 1908)",
 * 14 book subpages). Used by scripts/import-aristotle-metaphysics-en/index.ts.
 *
 * IMPORTANT, load-bearing finding from direct inspection of all 14 fetched
 * book subpages (not assumed from the Categories/De Interpretatione
 * Edghill-translation pattern, per this import's own brief): this Wikisource
 * work is, as of 2026-09-19, GENUINELY INCOMPLETE - the parent page itself
 * says so in as many words ("This work is incomplete. If you'd like to help
 * expand it..."), and seven of the fourteen book subpages are mostly or
 * entirely unproofread stubs whose `<pages index=... />` transclusion
 * resolves to red links ("Page:...djvu/NNN (page does not exist)") rather
 * than real text - confirmed both via the action=parse API and a direct
 * fetch of the live rendered page for Book 8. This importer therefore
 * imports ONLY the books/chapters that are genuinely, verifiably present as
 * clean prose; nothing is fabricated to fill the gaps. See index.ts's own
 * book-by-book manifest and data/metaphysics-en/about.json for the full
 * account.
 *
 * Heading-style census (verified by direct inspection of every one of the
 * 14 fetched book subpages - genuinely different from Categories/De
 * Interpretatione's single uniform `<span id="Chapter_N">` style, so NOT
 * reused from englishWikisource.ts): this source uses up to FOUR different
 * chapter-heading representations, sometimes mixed within the same book:
 *   1. `<div class="mw-heading mw-heading3"><h3 id="Chapter_N">Chapter N</h3>
 *      <span class="mw-editsection">...</span></div>` - the modern MediaWiki
 *      auto-heading (Book 1 chs 3-10, Book 2, Book 3).
 *   2. `<div class="wst-center ..."><p>...<span id="Chapter_N"
 *      title="Anchor:Chapter_N" class="wst-anchor">CHAPTER <roman></span>
 *      ...</p></div>` - the older {{anchor}}-template style, roman numeral
 *      visible text but an arabic `id` (Book 1 chs 1-2).
 *   3. `<p><span style="font-size:120%;"><b>Chapter N</b></span><br /></p>` -
 *      a bare bold span, NO id at all (Books 4 [chs 6-8], 5, 6, 7 [chs 1-4],
 *      9 [ch 1]).
 *   4. A lone `<p>CHAPTER <roman></p>` - plain text, no styling, no id at
 *      all (Book 13 ch 1's only occurrence used by this importer).
 * A `<p><span style="font-size:120%;">BOOK N (<letter>)</span></p>` book-
 * title line (styles 2/4's books only) is neither prose nor a chapter
 * marker - skipped, logged once per occurrence.
 *
 * Because headings are NOT uniformly represented as one direct-child shape,
 * this parser walks `div.prp-pages-output`'s `querySelectorAll('p, h3')` -
 * every <p> and <h3> in the block, in document order regardless of nesting
 * depth - rather than assuming direct children, which correctly visits
 * style-2/4 headings (nested one level inside a wrapper <div>) in the same
 * pass as style-1/3 ones.
 *
 * Bekker page/line markers: PRESENT (via the same `span.wst-verse` id
 * convention as Categories/De Interpretatione) only in Book 1; every other
 * book used by this importer carries none. Division.ref for an English
 * chapter is therefore null except where Book 1 supplies markers - a real,
 * confirmed difference from the Greek edition, not a parser gap.
 *
 * Mid-transcription truncation: two included chapters (Book 7 ch. 4, Book
 * 13 ch. 1) run genuinely clean for a while and then the SAME <p> element's
 * content crosses into the red-link stub - i.e. the words stop mid-sentence
 * exactly where the underlying page scan was never proofread. This parser
 * detects the first `<a class="new" title="...(page does not exist)">`
 * DIRECT CHILD of a paragraph (confirmed by inspection: the redlink anchor
 * and its preceding page-number span are always direct children of the
 * paragraph, never nested deeper), keeps only the paragraph's content
 * before that point, and then stops parsing the rest of that BOOK entirely
 * (verified for both occurrences that nothing usable follows the first
 * red link in that book).
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from '../import-aristotle-shared/text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export interface ParsedPassage {
  text: string;
  anomaly?: string;
}

export interface ParsedChapter {
  number: number;
  /** Bekker page range built from span.wst-verse page markers inside this chapter, or null (this source carries none outside Book 1). */
  ref: string | null;
  passages: ParsedPassage[];
}

export interface BookParseResult {
  chapters: ParsedChapter[];
  anomalies: Anomaly[];
  truncated: { chapterNumber: number } | null;
  totalFootnoteRefsStripped: number;
  bookTitleLinesSkipped: number;
}

function fail(bookLabel: string, msg: string): never {
  process.stderr.write(`STOP (metaphysics-en parser, ${bookLabel}): ${msg}\n`);
  process.exit(1);
}

const CHAPTER_ARABIC_RE = /^Chapter\s+(\d+)$/;
const CHAPTER_ROMAN_RE = /^CHAPTER\s+([IVXLCDM]+)$/;
const BOOK_TITLE_RE = /^BOOK\s+[IVXLCDM]+(\s*\([^)]*\))?$/;
const H3_ID_RE = /^Chapter_(\d+)$/;
const WST_ANCHOR_ID_RE = /^Chapter_(\d+)$/;
const PAGE_COL_RE = /^(\d+)([ab])$/;

/** Small roman-numeral reader, I..XXX range (this work needs at most "XIV"/"XVII"). */
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

/** Remove known transport-only elements from a cloned <p>/<h3>-adjacent node and return cleaned text plus footnote-ref count. */
function extractProse(node: JSDOMElement): { text: string; refsStripped: number } {
  const clone = node.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link, br').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference').forEach((e) => {
    refsStripped += 1;
    e.remove();
  });
  clone.querySelectorAll('.pagenum, span.mw-editsection, span.wst-anchor').forEach((e) => e.remove());
  const text = cleanText((clone.textContent ?? '').replace(/\u200B/g, ''));
  return { text, refsStripped };
}

/** Internal accumulator - ParsedChapter plus the raw wst-verse page markers seen while it was current. */
interface ChapterAccum extends ParsedChapter {
  pageMarkers: string[];
}

export function parseBookHtml(html: string, bookNum: number): BookParseResult {
  const bookLabel = `book-${bookNum}`;
  const anomalies: Anomaly[] = [];
  let totalFootnoteRefsStripped = 0;
  let bookTitleLinesSkipped = 0;

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const mainBodies = doc.querySelectorAll('div.prp-pages-output');
  if (mainBodies.length !== 1) fail(bookLabel, `expected exactly one div.prp-pages-output, found ${mainBodies.length}`);
  const mainBody = mainBodies[0]!;
  mainBody.querySelectorAll('style, link').forEach((e) => e.remove());

  const nodes = [...mainBody.querySelectorAll('p, h3')];

  const chapters: ChapterAccum[] = [];
  let cur: ChapterAccum | null = null;
  let truncated: { chapterNumber: number } | null = null;

  function startChapter(n: number): void {
    if (cur) chapters.push(cur);
    cur = { number: n, ref: null, passages: [], pageMarkers: [] };
  }

  function recordWstVerseMarkers(node: JSDOMElement): void {
    if (!cur) return;
    for (const m of [...node.querySelectorAll('span.wst-verse[id]')]) {
      if (PAGE_COL_RE.test(m.id)) cur.pageMarkers.push(m.id);
    }
  }

  outer: for (const node of nodes) {
    if (node.tagName === 'H3') {
      const m = H3_ID_RE.exec(node.id);
      if (!m) fail(bookLabel, `<h3> with unexpected id "${node.id}"`);
      const visibleText = cleanText(node.textContent ?? '');
      if (visibleText !== `Chapter ${m[1]}`) {
        fail(bookLabel, `<h3 id="${node.id}"> visible text "${visibleText}" does not match its id`);
      }
      startChapter(Number(m[1]));
      continue;
    }

    // node.tagName === 'P'
    const wstAnchor = node.querySelector('span.wst-anchor[id]');
    if (wstAnchor) {
      const idNum = WST_ANCHOR_ID_RE.exec(wstAnchor.id);
      const { text: withoutAnchor } = extractProse(node);
      if (idNum && withoutAnchor.length === 0) {
        startChapter(Number(idNum[1]));
        continue;
      }
      fail(bookLabel, `<p> contains a span.wst-anchor#${wstAnchor.id} alongside other content - expected it to be the paragraph's ONLY content`);
    }

    const { text: plainText } = extractProse(node);
    if (plainText.length === 0) continue; // page-transition spacer or similar, no reading text lost

    const arabicMarker = CHAPTER_ARABIC_RE.exec(plainText);
    if (arabicMarker) {
      startChapter(Number(arabicMarker[1]));
      continue;
    }
    const romanMarker = CHAPTER_ROMAN_RE.exec(plainText);
    if (romanMarker) {
      const n = romanToArabic(romanMarker[1]!);
      if (n === null) fail(bookLabel, `unparseable roman numeral chapter heading "${plainText}"`);
      startChapter(n!);
      continue;
    }
    if (BOOK_TITLE_RE.test(plainText)) {
      bookTitleLinesSkipped += 1;
      anomalies.push({ where: `metaphysics-en / ${bookLabel}`, note: `Book-title line "${plainText}" (Wikisource page furniture, not Aristotle's text) skipped.` });
      continue;
    }

    // --- defensive: a bold "Chapter N" marker EMBEDDED mid-paragraph -------
    // (confirmed one real occurrence: Book 5's Chapter 18 heading is glued
    // onto the end of Chapter 17's own <p> rather than starting its own -
    // `...not every limit is a beginning.<br/><span style="font-size:120%;">
    // <b>Chapter 18</b></span><br/></p><p>'Tha...` - a genuine transclusion-
    // stitching quirk in the source, not a parser assumption to paper over
    // silently; split the paragraph at the marker instead of failing).
    {
      const embeddedMarker = [...node.childNodes].find(
        (n) =>
          n.nodeType === 1 &&
          (n as JSDOMElement).tagName === 'SPAN' &&
          ((n as JSDOMElement).getAttribute('style') ?? '').includes('font-size:120%') &&
          CHAPTER_ARABIC_RE.test(cleanText((n as JSDOMElement).textContent ?? '')),
      ) as JSDOMElement | undefined;
      if (embeddedMarker) {
        const markerIdx = [...node.childNodes].indexOf(embeddedMarker);
        const beforeClone = node.cloneNode(true) as JSDOMElement;
        const beforeChildren = [...beforeClone.childNodes];
        for (let i = beforeChildren.length - 1; i >= markerIdx; i--) beforeClone.removeChild(beforeChildren[i]!);
        const afterClone = node.cloneNode(true) as JSDOMElement;
        const afterChildren = [...afterClone.childNodes];
        for (let i = markerIdx; i >= 0; i--) afterClone.removeChild(afterChildren[i]!);

        if (!cur) fail(bookLabel, 'embedded chapter marker found before any chapter heading');
        const chapterBeforeMarker: ChapterAccum = cur!;
        recordWstVerseMarkers(beforeClone);
        const { text: beforeText, refsStripped: beforeRefs } = extractProse(beforeClone);
        totalFootnoteRefsStripped += beforeRefs;
        if (beforeText.length > 0) chapterBeforeMarker.passages.push({ text: beforeText });

        const markerText = cleanText(embeddedMarker.textContent ?? '');
        const newChapterNum = Number(CHAPTER_ARABIC_RE.exec(markerText)![1]);
        anomalies.push({
          where: `metaphysics-en / ${bookLabel}`,
          note: `"${markerText}" heading found embedded mid-paragraph (glued onto the end of the previous chapter's own <p> rather than starting its own) - split at that point rather than failing or merging the two chapters' text together.`,
        });
        startChapter(newChapterNum);

        recordWstVerseMarkers(afterClone);
        const { text: afterText, refsStripped: afterRefs } = extractProse(afterClone);
        totalFootnoteRefsStripped += afterRefs;
        if (afterText.length > 0 && cur) (cur as ChapterAccum).passages.push({ text: afterText });
        continue;
      }
    }

    // --- ordinary prose paragraph, with redlink-truncation detection -----
    const children = [...node.childNodes];
    let redlinkIdx = -1;
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      if (child.nodeType === 1) {
        const el = child as JSDOMElement;
        if (el.tagName === 'A' && el.classList.contains('new')) {
          const title = el.getAttribute('title') ?? '';
          if (/\(page does not exist\)/.test(title)) {
            redlinkIdx = i;
            break;
          }
        }
      }
    }

    let workingNode: JSDOMElement = node;
    if (redlinkIdx >= 0) {
      const clone = node.cloneNode(true) as JSDOMElement;
      const cloneChildren = [...clone.childNodes];
      for (let i = cloneChildren.length - 1; i >= redlinkIdx; i--) clone.removeChild(cloneChildren[i]!);
      workingNode = clone;
    }

    if (!cur) fail(bookLabel, 'prose paragraph found before any chapter heading');
    const activeChapter: ChapterAccum = cur!;
    recordWstVerseMarkers(workingNode);
    const { text, refsStripped } = extractProse(workingNode);
    totalFootnoteRefsStripped += refsStripped;

    if (redlinkIdx >= 0) {
      truncated = { chapterNumber: activeChapter.number };
      if (text.length > 0) {
        activeChapter.passages.push({
          text,
          anomaly:
            'TRUNCATED: the Wikisource page-scan transcription becomes unavailable (red-linked, unproofread) immediately after this point; the remainder of this chapter/book is not present in the source and is not fabricated here.',
        });
        anomalies.push({
          where: `metaphysics-en / ${bookLabel}-ch-${activeChapter.number}`,
          note: `Mid-sentence truncation: the source's own page-scan transclusion becomes a red link ("page does not exist") partway through this paragraph; nothing further in this book is imported. Last surviving words: "${text.slice(-120)}"`,
        });
      } else {
        anomalies.push({
          where: `metaphysics-en / ${bookLabel}`,
          note: `Book stops here: chapter ${activeChapter.number} itself ends cleanly, but the very next block in the source is already an unproofread red link ("page does not exist") with no surviving text of its own; nothing further in this book is imported.`,
        });
      }
      break outer;
    }

    if (text.length > 0) activeChapter.passages.push({ text });
  }
  if (cur) chapters.push(cur);

  // --- finalize each chapter's Bekker ref from its own accumulated markers ---
  const finalChapters: ParsedChapter[] = chapters.map((c) => {
    let ref: string | null = null;
    if (c.pageMarkers.length === 1) ref = c.pageMarkers[0]!;
    else if (c.pageMarkers.length > 1) ref = `${c.pageMarkers[0]}–${c.pageMarkers[c.pageMarkers.length - 1]}`;
    return { number: c.number, ref, passages: c.passages };
  });

  return { chapters: finalChapters, anomalies, truncated, totalFootnoteRefsStripped, bookTitleLinesSkipped };
}
