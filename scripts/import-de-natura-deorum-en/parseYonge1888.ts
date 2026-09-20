/**
 * Parser for English Wikisource's page-scan transclusion of Charles Duke
 * Yonge's 1888 translation of Cicero's De Natura Deorum ("On the Nature of
 * the Gods"), 3 book subpages under "Cicero's Tusculan Disputations/On the
 * Nature of the Gods/Book N". Used by
 * scripts/import-de-natura-deorum-en/index.ts.
 *
 * Verified by direct inspection of all 3 fetched book subpages: all three
 * carry genuine, complete page-scan content (no red-linked/unproofread
 * stubs anywhere) — Book 1 pages 209-253ish, Book 2 pages 254-317ish, Book 3
 * pages 318-361ish (djvu "1888 Cicero's Tusculan Disputations.djvu"),
 * matching the from/to page-scan ranges this import was told to expect.
 *
 * Section numbering: unlike Categories/De Interpretatione's Edghill
 * translation or Metaphysics's Ross translation, this 1888 source carries no
 * `<h3 id="Chapter_N">`-style structural headings and no Bekker milestones
 * at all. Instead, each numbered section starts with its own ROMAN NUMERAL
 * (I, II, III, … up to XLIV in Book 1, LXVII in Book 2, XL in Book 3)
 * printed as the very first thing in a `<p>`, e.g. "I. There are many things
 * …" — this is this edition's own (coarser) numbering, not the fine `§`
 * section numbers of the modern Plasberg Latin edition in this library
 * (data/de-natura-deorum-la), so Division.number here is simply this
 * source's own arabic-converted roman count; Division.ref is null
 * throughout (see index.ts).
 *
 * TWO non-uniform ways this numeral is actually printed (both confirmed by
 * direct inspection, not assumed uniform):
 *   1. Ordinary: `<p>I. <span class="smallcaps">There</span> are …` — the
 *      numeral is plain text at the very start of the paragraph.
 *   2. Page-break-interrupted: a `<span class="pagenum">` (zero-width page
 *      marker, injected by the {{pagenum}} template at the exact byte
 *      offset the underlying page scan breaks) sits BETWEEN `<p>` and the
 *      numeral, e.g. `<p><span class="pagenum">\u200B</span>XVI. Thus far …`.
 *      Stripping the pagenum span before matching resolves this uniformly
 *      with case 1 — no special branch needed.
 *   3. Anchor-template: a small number of numerals (Book 1's "XXX") use the
 *      OLDER `{{anchor}}`-template style also seen in Metaphysics's parser:
 *      `<span id="XXX" class="wst-anchor">XXX</span>. Therefore …`. UNLIKE
 *      Metaphysics (where the anchor span was the paragraph's ONLY content
 *      and was removed, its `id` supplying the number), here the anchor's
 *      own VISIBLE TEXT is the printed numeral, immediately followed by
 *      more prose in the SAME paragraph — so this parser does NOT strip
 *      `span.wst-anchor` at all; keeping its text intact reproduces
 *      "XXX. Therefore …" and case 1's ordinary matching handles it with no
 *      extra code.
 *
 * A `<p>BOOK N.</p>` title line (inside a `<div class="wst-center">`
 * wrapper) precedes the first numbered paragraph in every book — Wikisource
 * page furniture, not Yonge's translated text, skipped. Yonge's own
 * translator footnotes render as a `{{smallrefs}}`-generated
 * `<div class="reflist"><ol class="references">…</ol></div>` block INSIDE
 * `div.prp-pages-output` itself (not a `<p>`, but removed explicitly before
 * walking anyway, defensively) — editorial commentary, not part of the
 * translated running text; only the inline `<sup class="reference">`
 * citation-number markers appear within the prose itself, stripped as
 * zero-width scaffolding (their target footnote text is not reproduced
 * anywhere in this build, matching this app's treatment of a Loeb
 * translator's footnotes elsewhere).
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from '../import-isagoge-shared/text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export interface ParsedPassage {
  text: string;
}

export interface ParsedSection {
  number: number;
  passages: ParsedPassage[];
}

export interface BookParseResult {
  sections: ParsedSection[];
  anomalies: Anomaly[];
  totalFootnoteRefsStripped: number;
  totalAnchorStyleNumerals: number;
  totalPageBreakInterruptedNumerals: number;
}

function fail(bookLabel: string, msg: string): never {
  process.stderr.write(`STOP (de-natura-deorum-en parser, ${bookLabel}): ${msg}\n`);
  process.exit(1);
}

const BOOK_TITLE_RE = /^BOOK\s+[IVXLCDM]+\.?$/;
const NUMBERED_START_RE = /^([IVXLCDM]+)\.\s*(.*)$/s;

/** Roman-numeral reader, I..LXX range (this work needs at most "LXVII"). */
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

/** Remove known transport-only elements from a cloned <p> and return cleaned
 *  text plus a footnote-ref count. Deliberately does NOT touch
 *  span.wst-anchor (see module doc: here its visible text IS part of the
 *  printed numeral, unlike Metaphysics's anchor-only-paragraph usage). */
function extractProse(node: JSDOMElement): { text: string; refsStripped: number } {
  const clone = node.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link, br').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference').forEach((e) => {
    refsStripped += 1;
    e.remove();
  });
  clone.querySelectorAll('.pagenum, span.mw-editsection').forEach((e) => e.remove());
  const text = cleanText((clone.textContent ?? '').replace(/\u200B/g, ''));
  return { text, refsStripped };
}

export function parseBookHtml(html: string, bookNum: number): BookParseResult {
  const bookLabel = `book-${bookNum}`;
  const anomalies: Anomaly[] = [];
  let totalFootnoteRefsStripped = 0;
  let totalAnchorStyleNumerals = 0;
  let totalPageBreakInterruptedNumerals = 0;

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  // Two SEPARATE div.prp-pages-output blocks appear on every one of these
  // pages (confirmed by direct inspection, not assumed uniform with
  // Metaphysics's single-block pages): the main page-scan content, and a
  // second one wrapping ONLY the {{smallrefs}}-generated footnote block
  // right after it. Both are walked (in document order, so their content
  // never interleaves oddly), with the footnote block's own <div class=
  // "reflist">/<ol class="references"> removed from whichever one it is in.
  const mainBodies = doc.querySelectorAll('div.prp-pages-output');
  if (mainBodies.length === 0) fail(bookLabel, 'expected at least one div.prp-pages-output, found none');
  const paragraphs: JSDOMElement[] = [];
  for (const mainBody of mainBodies) {
    mainBody.querySelectorAll('style, link').forEach((e) => e.remove());
    // Yonge's own translator footnotes ({{smallrefs}}-generated) - editorial
    // apparatus, not the translated running text.
    mainBody.querySelectorAll('div.reflist, ol.references').forEach((e) => e.remove());
    paragraphs.push(...mainBody.querySelectorAll('p'));
  }

  const sections: ParsedSection[] = [];
  let cur: ParsedSection | null = null;
  let sawFirstSection = false;

  function startSection(n: number): void {
    if (cur) sections.push(cur);
    cur = { number: n, passages: [] };
    sawFirstSection = true;
  }

  for (const p of paragraphs) {
    const rawText = (p.textContent ?? '').replace(/\u200B/g, '').trim();
    if (rawText.length === 0) continue; // pure page-marker/spacer paragraph

    if (!sawFirstSection && BOOK_TITLE_RE.test(cleanText(rawText))) {
      continue; // "BOOK N." title line - page furniture, not Yonge's text
    }

    const anchorBefore = p.querySelector('span.wst-anchor[id]');
    // a pagenum marker anywhere in this <p> means the page-scan break falls
    // right before (or within) the printed numeral (see module doc's case
    // 2) - detected here purely for anomaly reporting; removing it (in
    // extractProse) is what makes the numeral match at the start of text.
    const hasPagenumMarker = p.querySelector('.pagenum') !== null;
    const { text, refsStripped } = extractProse(p);
    totalFootnoteRefsStripped += refsStripped;
    if (text.length === 0) continue;

    const m = NUMBERED_START_RE.exec(text);
    if (m) {
      const romanRaw = m[1]!;
      const rest = m[2]!.trim();
      const n = romanToArabic(romanRaw);
      if (n === null) fail(bookLabel, `unparseable roman numeral "${romanRaw}" at the start of a paragraph: "${text.slice(0, 80)}"`);
      if (sawFirstSection && cur !== null) {
        const prevNumber = cur!.number;
        if (n !== prevNumber + 1) {
          anomalies.push({
            where: `de-natura-deorum-en / ${bookLabel}`,
            note: `Numbering goes from ${prevNumber} to ${n} (not simply +1) - this witness's own numbering, not forced to be contiguous.`,
          });
        }
      }
      if (anchorBefore) {
        totalAnchorStyleNumerals += 1;
        anomalies.push({
          where: `de-natura-deorum-en / ${bookLabel}`,
          note: `Section ${n}'s numeral is printed via the older {{anchor}}-template style (<span class="wst-anchor" id="${romanRaw}">${romanRaw}</span>) rather than plain text; its visible text was kept in place (not stripped, unlike Metaphysics's anchor-only-paragraph convention) since here it carries the actual printed numeral.`,
        });
      } else if (hasPagenumMarker) {
        totalPageBreakInterruptedNumerals += 1;
      }
      startSection(n);
      if (rest.length > 0) cur!.passages.push({ text: rest });
      continue;
    }

    if (cur === null) fail(bookLabel, `prose paragraph found before any numbered section: "${text.slice(0, 120)}"`);
    (cur as ParsedSection).passages.push({ text });
  }
  if (cur) sections.push(cur);

  if (sections.length === 0) fail(bookLabel, 'no numbered sections found at all');
  for (const s of sections) {
    if (s.passages.length === 0) fail(bookLabel, `section ${s.number} has no surviving paragraph text`);
  }

  return { sections, anomalies, totalFootnoteRefsStripped, totalAnchorStyleNumerals, totalPageBreakInterruptedNumerals };
}
