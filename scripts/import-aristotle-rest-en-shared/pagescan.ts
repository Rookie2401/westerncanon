/**
 * PAGE-SCAN TRANSCLUSION parser for the English Wikisource pages of the
 * Oxford "Works of Aristotle" translations imported by this batch.
 *
 * Which works actually need this (confirmed page by page, never assumed):
 *   Eudemian Ethics/Book 1, 2, 3, 7           (Solomon)   - 263-525 B of wikitext
 *   Virtues and Vices                         (Solomon)   - 558 B of wikitext
 *   On Plants                                 (Forster)   - 663 B of wikitext
 *   The Works of Aristotle/Prior Analytics/Book I, II (Jenkinson) - ~970 B each
 * For each of these, `action=parse&prop=wikitext` returns only a
 * `<pages index="....djvu" from=X to=Y />` transclusion marker (a few hundred
 * bytes), NOT the text - so the RENDERED HTML is fetched instead via
 * `action=parse&prop=text` and parsed here with jsdom, exactly as
 * scripts/import-aristotle-metaphysics-en does. Every other work in this
 * batch turned out to be ordinary wikitext; see ./wikitext.ts.
 *
 * CHAPTER-MARKER SHAPES found in this batch (each verified by inspection of
 * the fetched HTML; genuinely different from Metaphysics's four shapes, so
 * parseRoss1908.ts is NOT reused blindly):
 *   1. `<p><b>N</b> ...prose...</p>` - the chapter number is a BOLD element
 *      that is the paragraph's FIRST child, followed by that chapter's first
 *      words in the same paragraph. (Eudemian Ethics Books 1/2/3/7,
 *      Virtues and Vices.)  CAUTION, and the reason a naive "any <b> that
 *      looks like a number" rule is wrong here: this same source renders its
 *      Bekker page markers as `<b>1219a</b>` INSIDE a `span.wst-verse`, mid-
 *      paragraph. Only a `<b>` that is the paragraph's first child AND whose
 *      text is a bare 1-2 digit integer is treated as a chapter marker.
 *   2. `<span class="wst-woach"><span ...><span id="Chapter_N"
 *      class="wst-anchor"><b>N</b></span></span></span>` at the head of the
 *      paragraph. (Prior Analytics Books I and II.)
 *   3. `<span class="wst-sidenote"><span class="wst-sidenote-inner"><b>N</b>
 *      </span></span>` in the margin - the same sidenote mechanism that
 *      carries the Bekker page numbers, so a sidenote is a chapter marker
 *      only when its text is a bare 1-2 digit integer and NOT a Bekker
 *      page/column token like "815a" or a line range like "9-11".
 *      (On Plants.)
 *
 * BEKKER REFERENCES. Unlike data/metaphysics-en (where only Book 1 carried
 * any), every work parsed by this module prints Bekker page/column markers,
 * in one of three containers - `span.wst-verse` (Eudemian Ethics, Virtues and
 * Vices), `span.wst-bekker` (Prior Analytics) or `span.wst-sidenote`
 * (On Plants). They are collected per chapter so Division.ref can be a real
 * page range; each importer states which container its source used.
 *
 * RED-LINK (unproofread page) DETECTION is carried over from
 * parseRoss1908.ts: an `<a class="new" title="...(page does not exist)">`
 * means the underlying djvu page was never transcribed. Text is kept up to
 * that point and nothing further in that page is imported - never fabricated.
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText, type Anomaly } from './text.ts';

export type BekkerContainer = 'span.wst-verse' | 'span.wst-bekker' | 'span.wst-sidenote';
export type ChapterMarkerShape = 'leading-bold' | 'wst-anchor' | 'sidenote-number';

export interface PsPassage {
  text: string;
  anomaly?: string;
}

export interface PsChapter {
  number: number;
  /** Bekker page range assembled from this chapter's own markers, or null if it carries none. */
  ref: string | null;
  passages: PsPassage[];
  /**
   * The book this chapter belongs to - set ONLY when the page marks its own
   * book boundaries (i.e. `bookHeadingRe` was supplied, which in this batch
   * means On Plants). Left undefined otherwise, so that a caller whose books
   * are one-per-page keeps using its own page-level book number rather than
   * having every chapter silently claim to be in book 1.
   */
  book?: number;
}

export interface PsResult {
  chapters: PsChapter[];
  anomalies: Anomaly[];
  footnoteRefsStripped: number;
  /** verbatim short furniture lines skipped (running titles, imprint lines, ...) */
  furnitureSkipped: string[];
  truncated: { chapterNumber: number } | null;
  /** how many paragraphs had to be rebuilt from loose page-break runs (see collectUnits) */
  syntheticParagraphs: number;
  /** how many div.prp-pages-output blocks the page carried */
  blockCount: number;
}

export interface PsOptions {
  /** anomaly-log label, e.g. "eudemian-ethics-en / book-1" */
  where: string;
  markerShape: ChapterMarkerShape;
  bekkerContainer: BekkerContainer;
  /**
   * Exact texts of paragraphs that are page furniture rather than Aristotle's
   * words (running titles like "BOOK II", imprint lines, the source's own
   * "BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII." note). Compared after
   * whitespace collapsing. Anything else short is kept as reading text.
   */
  furnitureExact?: string[];
  /**
   * When true, everything before the FIRST book heading is editorial front
   * matter and is skipped - used by On Plants to drop its 1913 title page,
   * the translator's own signed Preface and a contents list. Expressed as a
   * structural rule rather than as a paragraph index, so that it cannot go
   * stale when the paragraph-counting changes (an earlier index-based version
   * of this option did exactly that).
   */
  startAtFirstBookHeading?: boolean;
  /** A `div.wst-heading` whose text matches this starts a new book (On Plants: "BOOK I"/"BOOK II"). */
  bookHeadingRe?: RegExp;
}

function fail(where: string, msg: string): never {
  process.stderr.write(`STOP (page-scan parser, ${where}): ${msg}\n`);
  process.exit(1);
}

/**
 * A Bekker page/column token.
 *
 * Two alternatives, because this batch spans both ends of the Bekker
 * numbering and one source reuses the same container for two different kinds
 * of marker:
 *   - `\d{2,4}[ab]` — a page WITH its column letter. Prior Analytics starts
 *     at Bekker 24a, so two-digit pages are real and must be accepted.
 *   - `\d{3,4}` — a three- or four-digit page, column letter optional.
 * The letter is required for two-digit numbers precisely so that On Plants,
 * which puts its Bekker pages AND its chapter numbers in the same
 * `span.wst-sidenote` container, cannot have a chapter number like "10"
 * mistaken for a page reference. A line range such as "9–11" fails both
 * alternatives and is ignored as well.
 */
const BEKKER_PAGE_RE = /^(?:\d{2,4}[ab]|\d{3,4})$/;
const SMALL_INT_RE = /^(\d{1,2})$/;

/**
 * An UNRENDERED sidenote template, left literal in the page because the
 * Wikisource proofreader mistyped the template name (`{{left sidenote|...`
 * and `{{Right sidenote|...` instead of the working one) and never closed it.
 * MediaWiki therefore emits the wiki markup as visible characters in the
 * middle of a sentence.
 *
 * Two real occurrences, both in On Plants (Book II chapters 4 and 9). This is
 * transport scaffolding that failed to render, not a word the translator
 * wrote, so it is removed from the reading text like any other wiki
 * furniture - and the Bekker page number it carries is recovered rather than
 * thrown away. Its column letter is NOT recoverable here: the source puts it
 * in a separate `<sup>` that has already been stripped as a marker by the
 * time this runs, so the page is recorded without its letter and the loss is
 * logged. Every occurrence is reported; none is silently swallowed.
 */
const BROKEN_SIDENOTE_RE = /\{\{\s*(?:left|right)\s+sidenote\s*\|\s*(\d{2,4})\s*/gi;

/**
 * Strip transport-only elements from a clone of `node` and return its reading
 * text.
 *
 * Note the `leading-bold` case. For the other two marker shapes the chapter
 * number lives inside an element this function already removes wholesale
 * (`span.wst-anchor` for Prior Analytics, `span.wst-sidenote` for On Plants),
 * so it never reaches the text. A leading `<b>N</b>` does not, and if it is
 * left alone the chapter figure is prepended to that chapter's first words -
 * "1 The man who stated his judgement..." - which is marginal apparatus
 * masquerading as translation. So for that shape the paragraph's first child
 * is dropped when it is a `<b>` holding nothing but a 1-2 digit number: the
 * marker itself, and only ever the marker.
 */
function extractProse(node: JSDOMElement, opts: PsOptions): { text: string; refsStripped: number; brokenSidenotePages: string[] } {
  const clone = node.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link, br').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference, sup.wst-sup').forEach((e) => { refsStripped += 1; e.remove(); });
  clone.querySelectorAll('.pagenum, span.mw-editsection, span.wst-anchor, span.wst-woach, span.wst-verse, span.wst-bekker, span.wst-sidenote').forEach((e) => e.remove());
  if (opts.markerShape === 'leading-bold') {
    // Remove the marker with the SAME rule that detected it (see
    // leadingBoldMarker), rather than looking only at children[0]: in a
    // synthetic paragraph rebuilt from loose page-break nodes the `<b>` is
    // typically preceded by an empty zero-width span, so a children[0] test
    // would leave the chapter figure glued to the first words of the text.
    leadingBoldMarker(clone)?.el.remove();
  }
  const raw = cleanText((clone.textContent ?? '').replace(/\u200B/g, ''));
  const brokenSidenotePages: string[] = [];
  const text = cleanText(
    raw.replace(BROKEN_SIDENOTE_RE, (_m, page: string) => {
      brokenSidenotePages.push(page);
      return ' ';
    }),
  );
  return { text, refsStripped, brokenSidenotePages };
}

/** All Bekker page/column tokens inside `node`, in document order. */
function bekkerMarkers(node: JSDOMElement, container: BekkerContainer): string[] {
  const out: string[] = [];
  for (const el of node.querySelectorAll(container)) {
    const t = cleanText(el.textContent ?? '');
    if (BEKKER_PAGE_RE.test(t)) out.push(t);
  }
  return out;
}

/**
 * Elements that occupy a position in the markup but contribute no reading
 * text: page-number anchors, Bekker page/line markers, chapter anchors, and
 * the zero-width spacer spans the transclusion sprinkles about. A chapter's
 * bold number may sit behind any number of these, so they are skipped when
 * looking for the marker.
 */
function isMarginalOrEmpty(el: JSDOMElement): boolean {
  const cls = String(el.className ?? '');
  if (/\b(pagenum|wst-verse|wst-bekker|wst-sidenote|wst-anchor|wst-woach|mw-editsection|wst-pagebreak)\b/.test(cls)) return true;
  if (el.tagName === 'LINK' || el.tagName === 'STYLE' || el.tagName === 'BR') return true;
  return visibleText(el.textContent).length === 0;
}

/**
 * Cleaned text with zero-width characters removed first.
 *
 * The page-scan rendering wraps each page-number anchor in an unclassed
 * `<span>` whose only content is a zero-width space. U+200B is not
 * whitespace, so a plain cleanText() call reports such a span as one
 * character of content rather than as empty - which was enough to stop the
 * chapter-marker scan dead at the head of a paragraph and lose the division
 * (Eudemian Ethics Book 7 chapter 13 was lost exactly this way).
 */
function visibleText(s: string | null | undefined): string {
  return cleanText((s ?? '').replace(/[\u200B\uFEFF]/g, ''));
}

/**
 * The `<b>N</b>` chapter marker at the head of a paragraph, or null.
 *
 * "At the head" means: nothing but marginalia and empty spacers precedes it.
 * A children[0] test is NOT enough, because a paragraph rebuilt from a loose
 * page-break run begins with the page-number span that caused the break.
 *
 * Deliberately narrow in the other direction too: only a bare 1-2 digit
 * integer qualifies, because these sources render their Bekker page
 * references as bold numbers as well (e.g. `<b>1219a</b>`), mid-paragraph,
 * and a looser rule would shred the text into hundreds of false chapters.
 */
function leadingBoldMarker(node: JSDOMElement): { el: JSDOMElement; num: number } | null {
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      if (visibleText(child.textContent).length === 0) continue;
      return null; // real text before any bold: not a chapter opening
    }
    if (child.nodeType !== 1) continue;
    const el = child as JSDOMElement;
    if (el.tagName === 'B') {
      const m = SMALL_INT_RE.exec(cleanText(el.textContent ?? ''));
      return m ? { el, num: Number(m[1]) } : null;
    }
    // The bold number may be WRAPPED in an anchor span rather than standing
    // free. Eudemian Ethics Book 7 chapter 13 - the first of the three
    // sections that carry the material of Book VIII - arrives as
    // `<span id="book8" class="wst-anchor"><b>13</b></span>`, and treating
    // that span as mere marginalia (which its class otherwise implies) loses
    // the chapter division entirely.
    const t = cleanText(el.textContent ?? '');
    const wrapped = SMALL_INT_RE.exec(t);
    if (wrapped && el.querySelector('b')) return { el, num: Number(wrapped[1]) };
    if (isMarginalOrEmpty(el)) continue;
    return null;
  }
  return null;
}

/** The chapter number this paragraph starts, or null. See the module doc for why each shape is matched so narrowly. */
function chapterMarkerOf(node: JSDOMElement, shape: ChapterMarkerShape): number | null {
  if (shape === 'leading-bold') return leadingBoldMarker(node)?.num ?? null;
  if (shape === 'wst-anchor') {
    const anchor = node.querySelector('span.wst-anchor[id]');
    if (!anchor) return null;
    const m = /^Chapter_(\d{1,3})$/.exec(anchor.id);
    return m ? Number(m[1]) : null;
  }
  // 'sidenote-number'
  for (const sn of node.querySelectorAll('span.wst-sidenote')) {
    const t = cleanText(sn.textContent ?? '');
    const m = SMALL_INT_RE.exec(t);
    if (m) return Number(m[1]);
  }
  return null;
}

/** One thing to be processed in document order: a paragraph of text, or a book heading. */
interface Unit {
  kind: 'paragraph' | 'heading';
  el: JSDOMElement;
  /** true when this paragraph was rebuilt from loose nodes rather than read from a real <p> */
  synthetic?: boolean;
}

/** Block-level tags: anything else is inline and belongs to the surrounding run of text. */
const BLOCK_TAGS = new Set(['P', 'DIV', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'HR', 'CENTER', 'PRE', 'FIGURE', 'SECTION']);

/**
 * Footnote apparatus: the rendered `<references/>` list and the body of an
 * individual note. Skipped wholesale - never descended into - so that a
 * translator's annotation can never be mistaken for a paragraph of the
 * translation. Identified structurally rather than by block position, because
 * On Plants keeps a rendered note inside the same block as its reading text.
 */
function isApparatus(el: JSDOMElement): boolean {
  const cls = String(el.className ?? '');
  if (el.tagName === 'OL' && /\breferences\b/.test(cls)) return true;
  if (el.tagName === 'DIV' && /\breflist\b/.test(cls)) return true;
  if (el.tagName === 'SPAN' && /\breference-text\b/.test(cls)) return true;
  if (el.tagName === 'SUP' && /\breference\b/.test(cls)) return true;
  return false;
}

/**
 * Walk every block in document order and return the paragraphs and book
 * headings it contains.
 *
 * The subtle part is the "loose run". English Wikisource's page-scan
 * rendering does not wrap every run of reading text in a `<p>`: where a
 * printed paragraph straddles a scanned page boundary, the transclusion
 * closes `</p>` at the break and emits the continuation as bare text and
 * inline elements sitting directly under the block until the next `<p>`
 * opens. Those runs are genuine translation - in Virtues and Vices the whole
 * opening of chapter 6, bold chapter number and all, arrives that way - so
 * they are accumulated and packed into a synthetic `<p>` that goes through
 * exactly the same cleaning, marker-detection and Bekker-collection code as a
 * real paragraph. A `querySelectorAll('p')` parser cannot see them at all,
 * which is what originally lost them.
 */
function collectUnits(blocks: JSDOMElement[], doc: { createElement(tag: string): JSDOMElement }, where: string): { units: Unit[]; tablesFlattened: number } {
  const units: Unit[] = [];
  let loose: JSDOMElement[] = [];
  let tablesFlattened = 0;

  const flush = (): void => {
    if (loose.length === 0) return;
    const pending = loose;
    loose = [];
    const synthetic = doc.createElement('p');
    for (const n of pending) synthetic.appendChild(n.cloneNode(true));
    // Zero-width spaces are not whitespace, so a run consisting only of the
    // page-break spacer spans the transclusion sprinkles between paragraphs
    // would otherwise count as a (text-free) paragraph and inflate the
    // synthetic-paragraph tally reported in anomalies.json.
    if (cleanText((synthetic.textContent ?? '').replace(/[\u200B\uFEFF]/g, '')).length === 0) return;
    units.push({ kind: 'paragraph', el: synthetic, synthetic: true });
  };

  const walk = (node: JSDOMElement): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) { loose.push(child); continue; } // text node
      if (child.nodeType !== 1) continue;
      const el = child as JSDOMElement;
      if (isApparatus(el)) { flush(); continue; }
      if (el.tagName === 'P') { flush(); units.push({ kind: 'paragraph', el }); continue; }
      if (el.tagName === 'DIV' && /\bwst-heading\b/.test(String(el.className ?? ''))) {
        flush();
        units.push({ kind: 'heading', el });
        continue;
      }
      // A TABLE is taken WHOLE, as one paragraph, rather than descended into.
      // Eudemian Ethics Book 2 chapter 3 sets out Aristotle's tabulation of
      // excesses, deficiencies and means as a three-column table; walking into
      // its cells would emit ~45 one-word "paragraphs" and lose the shape of
      // the list entirely. The cells are newline-separated in the markup, so
      // taking the table's text in document order preserves every word in
      // reading order, row by row and left to right. (Before this parser was
      // fixed the table was not captured at all, being outside any <p>.)
      if (el.tagName === 'TABLE') {
        flush();
        tablesFlattened += 1;
        units.push({ kind: 'paragraph', el, synthetic: true });
        continue;
      }
      if (BLOCK_TAGS.has(el.tagName)) { flush(); walk(el); flush(); continue; }
      loose.push(el); // inline element: part of the current run of text
    }
  };

  for (const block of blocks) { walk(block); flush(); }
  if (units.length === 0) fail(where, 'the page contains blocks but no readable paragraphs');
  return { units, tablesFlattened };
}

export function parsePageScanHtml(html: string, opts: PsOptions): PsResult {
  const { where } = opts;
  const anomalies: Anomaly[] = [];
  const furnitureSkipped: string[] = [];
  let footnoteRefsStripped = 0;
  let truncated: { chapterNumber: number } | null = null;

  const doc = new JSDOM(html).window.document;
  const blocks = [...doc.querySelectorAll('div.prp-pages-output')];
  if (blocks.length === 0) fail(where, 'no div.prp-pages-output found - this page is not the rendered page-scan transclusion it was expected to be');
  for (const b of blocks) b.querySelectorAll('style, link').forEach((e) => e.remove());

  // EVERY block is read, in document order. A Wikisource page emits one
  // div.prp-pages-output per `<pages .../>` tag, so a page built from several
  // transclusions has several TEXT blocks - Eudemian Ethics Book 7 has two,
  // the second holding its sections 13-15 (the material of Book VIII). Taking
  // only the first block, as this parser originally did, silently dropped
  // ~19,700 characters of Solomon's translation. Footnote apparatus is
  // excluded structurally instead (see isApparatus), which also handles
  // On Plants, whose FIRST block contains both reading text and a rendered
  // note - so "block 0 is text, the rest is notes" was wrong twice over.
  const { units, tablesFlattened } = collectUnits(blocks, doc, where);
  if (units.length === 0) fail(where, 'no paragraphs or headings found in any div.prp-pages-output block');
  if (tablesFlattened > 0) {
    anomalies.push({
      where,
      note: `${tablesFlattened} tabulation(s) in the source were flattened into a single paragraph each, their cells taken in document order (row by row, left to right). The source sets these out as HTML tables — in the Eudemian Ethics, Aristotle's three-column table of excesses, deficiencies and means — and this schema has no table tier; every word is preserved in reading order, but the column layout is not. Note that such tables lie outside any <p> element and were captured only after this parser learned to read loose runs.`,
    });
  }

  const furniture = new Set((opts.furnitureExact ?? []).map((s) => cleanText(s)));

  const chapters: PsChapter[] = [];
  let cur: PsChapter | null = null;
  let currentBook = 1;
  let seenBookHeading = false;
  let syntheticParagraphs = 0;

  outer: for (const unit of units) {
    const node = unit.el;
    if (unit.kind === 'heading') {
      const t = cleanText(node.textContent ?? '');
      if (opts.bookHeadingRe && opts.bookHeadingRe.test(t)) {
        const roman = /BOOK\s+([IVXLCDM]+)/i.exec(t);
        currentBook = roman ? romanToArabic(roman[1]!, where) : currentBook + 1;
        seenBookHeading = true;
        cur = null;
      }
      furnitureSkipped.push(t);
      continue;
    }
    // Front matter: when the caller says the treatise starts at the first
    // book heading, everything before that heading (title page, the
    // translator's own preface, a contents list) is editorial apparatus.
    if (opts.startAtFirstBookHeading && !seenBookHeading) {
      furnitureSkipped.push(cleanText(node.textContent ?? '').slice(0, 80));
      continue;
    }
    if (unit.synthetic) syntheticParagraphs += 1;

    const marker = chapterMarkerOf(node, opts.markerShape);

    // --- red-link truncation detection (same rule as parseRoss1908.ts) ----
    const children = [...node.childNodes];
    let redlinkIdx = -1;
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      if (child.nodeType !== 1) continue;
      const el = child as JSDOMElement;
      if (el.tagName === 'A' && el.classList.contains('new') && /\(page does not exist\)/.test(el.getAttribute('title') ?? '')) { redlinkIdx = i; break; }
    }
    let workingNode: JSDOMElement = node;
    if (redlinkIdx >= 0) {
      const clone = node.cloneNode(true) as JSDOMElement;
      const cloneChildren = [...clone.childNodes];
      for (let i = cloneChildren.length - 1; i >= redlinkIdx; i--) clone.removeChild(cloneChildren[i]!);
      workingNode = clone;
    }

    const { text, refsStripped, brokenSidenotePages } = extractProse(workingNode, opts);
    footnoteRefsStripped += refsStripped;
    for (const page of brokenSidenotePages) {
      anomalies.push({
        where,
        note: `Unrendered sidenote template removed from the reading text: the source contains a mistyped, unclosed "{{... sidenote|${page}" marker, which MediaWiki emits as literal wiki markup in the middle of a sentence rather than as a margin note. It is transport scaffolding that failed to render, not a word of the translation, so it is stripped; the Bekker page ${page} it carries is kept as a reference for this chapter. Its column letter is not recoverable at this point (the source places it in a separate superscript element), so the page is recorded without one.`,
      });
    }

    if (marker !== null) {
      cur = { number: marker, ref: null, passages: [], ...(opts.bookHeadingRe ? { book: currentBook } : {}) };
      chapters.push(cur);
      (cur as PsChapter & { markers?: string[] }).markers = [];
    }

    if (text.length === 0) continue;
    if (furniture.has(text)) { furnitureSkipped.push(text); continue; }

    if (!cur) {
      anomalies.push({ where, note: `Reading text found before this page's first chapter marker; the source prints no number there, so it was kept as chapter 1 of book ${currentBook}: ${JSON.stringify(text.slice(0, 80))}` });
      cur = { number: 1, ref: null, passages: [], ...(opts.bookHeadingRe ? { book: currentBook } : {}) };
      chapters.push(cur);
      (cur as PsChapter & { markers?: string[] }).markers = [];
    }

    const holder = cur as PsChapter & { markers: string[] };
    holder.markers.push(...bekkerMarkers(workingNode, opts.bekkerContainer));
    // Pages recovered from a mistyped, unrendered sidenote template count as
    // this chapter's markers too - the reference is real even though the
    // source's markup for it is broken.
    holder.markers.push(...brokenSidenotePages.filter((p) => BEKKER_PAGE_RE.test(p)));

    if (redlinkIdx >= 0) {
      truncated = { chapterNumber: cur.number };
      if (text.length > 0) {
        cur.passages.push({
          text,
          anomaly: 'TRUNCATED: the Wikisource page-scan transcription becomes unavailable (red-linked, unproofread) immediately after this point; the remainder is not present in the source and is not fabricated here.',
        });
        anomalies.push({ where: `${where} / ch-${cur.number}`, note: `Mid-paragraph truncation: the source's page-scan transclusion becomes a red link ("page does not exist") partway through; nothing further on this page is imported. Last surviving words: ${JSON.stringify(text.slice(-120))}` });
      } else {
        anomalies.push({ where, note: `Page stops at chapter ${cur.number}: the next block in the source is an unproofread red link ("page does not exist") with no surviving text of its own.` });
      }
      break outer;
    }

    cur.passages.push({ text });
  }

  for (const c of chapters) {
    const markers = (c as PsChapter & { markers?: string[] }).markers ?? [];
    if (markers.length === 1) c.ref = markers[0]!;
    else if (markers.length > 1) c.ref = `${markers[0]}–${markers[markers.length - 1]}`;
    delete (c as PsChapter & { markers?: string[] }).markers;
  }

  if (syntheticParagraphs > 0) {
    anomalies.push({
      where,
      note: `${syntheticParagraphs} paragraph(s) on this page are not wrapped in a <p> element by the source: where a printed paragraph straddles a scanned page boundary, the transclusion closes the paragraph at the break and emits the continuation as loose text and inline elements. Those runs are genuine translation (in one case an entire chapter opening, bold chapter number included) and are recovered and read exactly like ordinary paragraphs; a parser that walked only <p> elements would drop them silently.`,
    });
  }
  if (blocks.length > 1) {
    anomalies.push({
      where,
      note: `This page renders as ${blocks.length} separate div.prp-pages-output blocks (one per <pages .../> transclusion tag). ALL of them are read, in document order: footnote apparatus is excluded structurally (the rendered <references/> list and each note's body), not by assuming that only the first block holds text — an assumption that was false here and cost real reading text.`,
    });
  }
  return { chapters, anomalies, footnoteRefsStripped, furnitureSkipped, truncated, syntheticParagraphs, blockCount: blocks.length };
}

export function romanToArabic(roman: string, where: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = VALUES[roman[i]!.toUpperCase()];
    const next = VALUES[(roman[i + 1] ?? '').toUpperCase()];
    if (cur === undefined) fail(where, `unrecognised roman numeral "${roman}"`);
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  if (total <= 0) fail(where, `roman numeral "${roman}" resolved to ${total}`);
  return total;
}
