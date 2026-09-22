/**
 * Parser for English Wikisource's page-scan transclusion of Charles
 * Reginald Haines's 1916 Loeb Classical Library translation of Marcus
 * Aurelius's Meditations ("Marcus Aurelius (Haines 1916)", 12 book
 * subpages, "The communings with himself of Marcus Aurelius Antoninus").
 * Used by scripts/import-meditations-en/index.ts.
 *
 * Structure (confirmed by direct inspection of all 12 fetched book
 * subpages' RENDERED HTML - action=parse&prop=text, NOT prop=wikitext,
 * which for a `<pages index=... include=A,B,C,.../>` transclusion returns
 * only the marker, not the assembled text): each book page's rendered HTML
 * carries exactly TWO `div.prp-pages-output` blocks - the first is the
 * book's own reading text (chapters + verse quotations), the second is
 * that book's endnotes/footnotes apparatus (0 <p> elements; its content is
 * assembled from <li>s inside `div.reflist.wst-smallrefs`, i.e. the
 * `{{smallrefs}}` footnote block). ONLY the first is used here; the second
 * is skipped entirely by construction (never even queried).
 *
 * Chapter numbering: unlike a separate heading element, Haines's numbered
 * entries are marked by PLAIN LEADING TEXT at the very start of a <p> -
 * "N. " (e.g. "1. From my Grandfather Verus, ..."). A chapter's remaining
 * text, when it runs past this first <p>, continues in one or more further
 * un-numbered <p> elements (ordinary prose paragraph breaks within the
 * same numbered entry) and, for a handful of entries that quote verse, in
 * `<div class="tiInherit" style="text-indent:-2em; margin-left:2em;">`
 * blocks (sometimes wrapped in an outer `div.wst-block-center`) or
 * `<div style="text-align:left; margin-left:2em">` blocks (Books 7 and 11
 * only, holding multiple `<i>`-italicised verse lines joined by `<br/>`) -
 * genuine reading text (Marcus's/Haines's own quoted verse), not page
 * furniture, so this parser walks `p, div.tiInherit, div[style*="text-
 * align:left"]` together, in document order, rather than `<p>` alone (a
 * `<p>`-only walk would silently drop every quoted verse line in Books 5,
 * 7, 10, 11, 12). Every such node that is NOT itself a new "N. " marker is
 * treated as a continuation of the currently open chapter.
 *
 * Page/book furniture skipped: `<span class="pagenum ws-pagenum">` (mid-
 * paragraph page-scan boundary markers - always immediately preceded by a
 * literal space in this source, confirmed by inspection, so removing the
 * element outright leaves correctly-spaced running text), `<sup
 * class="reference">` (Haines's own translator footnote markers, counted
 * and stripped - the footnotes themselves are apparatus, not part of the
 * translation, matching this library's Ross/Metaphysics-en convention), a
 * lone `<p><span style="font-size:120%;">BOOK N</span></p>` title line
 * (Wikisource page furniture, one per book), and, in Book 1 only, a half-
 * title block ("MARCUS AURELIUS ANTONINUS") preceding "BOOK I" - handled
 * generically (see below), not hardcoded to that exact wording.
 *
 * Front-matter rule (generic, not hardcoded to Book 1's specific text):
 * ANY node encountered before the first "N. " chapter marker is treated as
 * front matter and skipped (logged individually) rather than crashing or
 * being forced into a chapter that does not yet exist.
 *
 * `<br/>` handling: substituted with a single literal space in the raw HTML
 * STRING, before it is ever parsed (not deleted outright) - it is
 * load-bearing inside the verse-quotation divs, where two `<i>` lines are
 * joined only by a `<br/>` with no other whitespace between them ("...gods
 * have spurned,<br/>For this too there is reason;" - deleting the tag
 * outright would glue the lines into one word-run).
 *
 * Known genuine gap: Book 12's own numbering skips entry 15 entirely (the
 * sequence runs ...14, 16, 17...) - confirmed by direct inspection, not a
 * parsing artifact. This is a DIFFERENT number than the Greek sibling's own
 * gap in the same book (18, not 15) - the two are not reconciled against
 * each other. See index.ts's own doc comment.
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from '../import-isagoge-shared/text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export interface ParsedChapter {
  number: number;
  /** one string per surviving <p>/quote-block for this chapter, in document order - joined with "\n\n" by the caller into that chapter's single Passage */
  paragraphs: string[];
}

export interface BookParseResult {
  chapters: ParsedChapter[];
  anomalies: Anomaly[];
  totalFootnoteRefsStripped: number;
  totalPagenumSpansStripped: number;
  bookTitleLinesSkipped: number;
  frontMatterNodesSkipped: number;
}

function fail(bookLabel: string, msg: string): never {
  process.stderr.write(`STOP (meditations-en parser, ${bookLabel}): ${msg}\n`);
  process.exit(1);
}

const CHAPTER_MARKER_RE = /^(\d+)\.\s*([\s\S]*)$/;
const BOOK_TITLE_RE = /^BOOK\s+[IVXLCDM]+$/;

/**
 * Remove known transport-only elements from a cloned node and return its
 * cleaned text. `<br/>` is handled BEFORE this function ever sees the node -
 * see `parseBookHtml`'s own html-string preprocessing step - because it is
 * load-bearing inside the verse-quotation blocks (two `<i>` lines joined by
 * nothing but a `<br/>`) and this project's local jsdom.d.ts shim has no
 * `replaceWith`/`ownerDocument`/`createTextNode` members to do that
 * DOM-side; a plain string substitution on the raw HTML, before it is ever
 * parsed, does the same job without needing new ambient declarations.
 */
function extractProse(node: JSDOMElement): { text: string; refsStripped: number; pagenumsStripped: number } {
  const clone = node.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference').forEach((e) => {
    refsStripped += 1;
    e.remove();
  });
  let pagenumsStripped = 0;
  clone.querySelectorAll('.pagenum').forEach((e) => {
    pagenumsStripped += 1;
    e.remove();
  });
  const raw = (clone.textContent ?? '').replace(/[\u200B\uFEFF]/g, '');
  return { text: cleanText(raw), refsStripped, pagenumsStripped };
}

export function parseBookHtml(html: string, bookNum: number): BookParseResult {
  const bookLabel = `book-${bookNum}`;
  const anomalies: Anomaly[] = [];
  let totalFootnoteRefsStripped = 0;
  let totalPagenumSpansStripped = 0;
  let bookTitleLinesSkipped = 0;
  let frontMatterNodesSkipped = 0;

  // `<br/>` -> a single literal space, BEFORE parsing: load-bearing inside
  // the verse-quotation blocks, where two `<i>` lines are joined by nothing
  // but a `<br/>` with no other whitespace between them ("...gods have
  // spurned,<br/>For this too there is reason;") - deleting it outright
  // (the DOM-side default for an unhandled element) would glue the lines
  // into one run with no separating space.
  const dom = new JSDOM(html.replace(/<br\s*\/?>/gi, ' '));
  const doc = dom.window.document;
  const mainBodies = doc.querySelectorAll('div.prp-pages-output');
  if (mainBodies.length < 1) fail(bookLabel, `expected at least one div.prp-pages-output, found ${mainBodies.length}`);
  const mainBody = mainBodies[0]!;

  // NOTE: `div.tiInherit:not(.wst-center)` deliberately excludes the
  // "BOOK N" / half-title wrapper divs, which carry BOTH `wst-center` AND
  // `tiInherit` classes on the SAME element (confirmed by inspection) and
  // whose own <p> child is already picked up by the plain `p` selector -
  // without the `:not()`, that title text would be extracted twice (once
  // via the wrapper div, once via its child <p>). Genuine verse-quotation
  // divs carry `tiInherit` alone (optionally inside a non-`tiInherit`
  // `wst-block-center` wrapper), never combined with `wst-center`.
  const nodes = [...mainBody.querySelectorAll('p, div.tiInherit:not(.wst-center), div[style*="text-align:left"]')];

  const chapters: ParsedChapter[] = [];
  let cur: ParsedChapter | null = null;

  for (const node of nodes) {
    const { text, refsStripped, pagenumsStripped } = extractProse(node);
    totalFootnoteRefsStripped += refsStripped;
    totalPagenumSpansStripped += pagenumsStripped;

    if (text.length === 0) continue; // page-transition spacer or similar, no reading text lost

    if (BOOK_TITLE_RE.test(text)) {
      bookTitleLinesSkipped += 1;
      anomalies.push({ where: `meditations-en / ${bookLabel}`, note: `Book-title line "${text}" (Wikisource page furniture, not Haines's translation) skipped.` });
      continue;
    }

    const marker = CHAPTER_MARKER_RE.exec(text);
    if (marker) {
      const n = Number(marker[1]);
      cur = { number: n, paragraphs: [] };
      chapters.push(cur);
      const remainder = marker[2]!.trim();
      if (remainder.length > 0) cur.paragraphs.push(remainder);
      continue;
    }

    if (!cur) {
      // front matter preceding the first numbered entry (e.g. Book 1's
      // half-title block "MARCUS AURELIUS ANTONINUS") - skipped generically,
      // not hardcoded to any particular wording.
      frontMatterNodesSkipped += 1;
      anomalies.push({
        where: `meditations-en / ${bookLabel}`,
        note: `Front-matter text preceding the first numbered entry, skipped (Wikisource page furniture, not part of the translation): "${text.slice(0, 120)}"`,
      });
      continue;
    }

    // continuation of the currently open chapter (an ordinary paragraph
    // break within a long entry, or a quoted-verse block)
    cur.paragraphs.push(text);
  }

  // --- verify strictly increasing chapter numbers (never renumber to force a match) ---
  let prev = 0;
  for (const c of chapters) {
    if (c.number <= prev) {
      fail(bookLabel, `chapter numbers are not strictly increasing (${c.number} after ${prev}) - the parser may have mis-detected a marker`);
    }
    prev = c.number;
  }

  return { chapters, anomalies, totalFootnoteRefsStripped, totalPagenumSpansStripped, bookTitleLinesSkipped, frontMatterNodesSkipped };
}
