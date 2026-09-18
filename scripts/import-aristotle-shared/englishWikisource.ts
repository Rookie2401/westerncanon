/**
 * Shared HTML parser for the two English-translation Aristotle importers -
 * Categoriae and De Interpretatione - both sourced from English Wikisource's
 * page-scan transclusion of Ella Mary Edghill's 1928 Oxford translation
 * ("The Works of Aristotle", vol. 1, ed. W. D. Ross).
 *
 * Unlike the Latin/Greek sources (plain wikitext or TEI XML), English
 * Wikisource's `action=parse&prop=wikitext` for these pages returns only
 * `<pages index="..." from=X to=Y />` transclusion markup - not the text - so
 * the importers fetch the RENDERED HTML instead (`action=parse&prop=text`)
 * and this module parses that HTML with jsdom.
 *
 * Verified page shape (both works, by direct inspection):
 *   - the reading text lives in one `<div class="prp-pages-output">` block
 *     that contains all `<span id="Chapter_N">` anchors (one per chapter,
 *     each at the very start of the `<p>` that opens that chapter); a
 *     *different*, earlier `prp-pages-output` block holds the editorial
 *     "TABLE OF CONTENTS" transclusion (chapter one-line summaries + anchor
 *     links) and must not be read as reading text.
 *   - within that block, direct children are `<p>` (running prose),
 *     occasional `<table>` (De Interpretatione ch. 12-13's "square of
 *     opposition" tables of contradictory/contrary modal propositions -
 *     genuine argument content, not apparatus), `<figure>` (De
 *     Interpretatione ch. 10's three scanned-diagram illustrations, no
 *     transcribed text available for them), `<div class="__nop wst-nop">`
 *     (an empty page-transition spacer) and `<style>`/`<link>` (per-template
 *     CSS reset, pure transport noise - critically, a `<style>` element's
 *     `.textContent` is its raw CSS text, so these MUST be stripped before
 *     reading any `.textContent`, or the CSS leaks into the "prose").
 *   - Bekker page/column boundaries are marked inline by
 *     `<span class="wst-anchor" id="1a">1<span class="wst-caret-raised-text">a</span></span>`
 *     (visually floated into the margin, but present in reading order in the
 *     DOM); Bekker line numbers are marked every 5th line by
 *     `<span class="wst-verse ..." id="5"><sup>5</sup></span>`. Both are
 *     margin decoration, not part of Aristotle's sentence, and are stripped
 *     from the extracted prose - but their `id`s are read, in document
 *     order, to reconstruct each chapter's Bekker start/end position. Line
 *     numbering resets to 1 at every page/column anchor (that is what
 *     "id=1a" = Bekker 1a1 means), and is otherwise only printed every 5th
 *     line, so a chapter's Bekker *end* is only as precise as the nearest
 *     printed marker - see the `endRef` doc below.
 *   - footnote references are `<sup class="reference"><a href="#cite_note-N">
 *     [N]</a></sup>` inline in the prose; the footnotes themselves (Ross's
 *     editorial annotation) live in a wholly separate part of the page
 *     (a "Footnotes" heading + list, outside the `prp-pages-output` reading
 *     block used here) and are never read by this module at all. The inline
 *     `<sup class="reference">` markers are stripped and counted.
 *   - a lone `<span class="smallcaps">` wraps the very first word of each
 *     work ("Things...", "First we must...") as a typographic drop-cap
 *     convention; it is real CSS styling of real prose, so no special
 *     handling beyond ordinary text extraction is needed.
 *   - `\u200B` (zero-width space) appears at some page-transition points as a
 *     transport artefact (prevents an inadvertent paragraph merge across two
 *     transcluded source pages); stripped as transport noise, same tier as
 *     `<div class="__nop wst-nop">`.
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from '../import-isagoge-shared/text.ts';

const PAGE_COL_RE = /^(\d+)([ab])$/;
const CHAPTER_ID_RE = /^Chapter_(\d+)$/;

interface Pos {
  page: number;
  col: 'a' | 'b';
  line: number;
}

function labelOf(pos: Pos | null): string {
  return pos ? `${pos.page}${pos.col}${pos.line}` : '?';
}

export interface ParsedPassage {
  text: string;
  /** true if this passage was built by flattening a <table> element. */
  isTable: boolean;
  /** Wikimedia Commons filename(s) of any <figure> scan(s) immediately preceding this passage's own node, attached here (schema allows one figure per Passage - see attach logic in the caller). */
  figureFiles: string[];
}

export interface ParsedChapter {
  number: number;
  /** Bekker position at the first word of the chapter, e.g. "1a1". */
  startRef: string;
  /** Bekker position at the last word of the chapter, i.e. the position in
   *  effect when the NEXT chapter begins (continuous Bekker numbering - a
   *  chapter's end and the next chapter's start are the same position).
   *  Precise to the nearest printed marker (every line at a page/column
   *  change, every 5th line otherwise) - see `WorkParseResult.markerNotes`. */
  endRef: string;
  passages: ParsedPassage[];
}

export interface WorkParseResult {
  /** The work's title heading as printed (e.g. "CATEGORIAE"). */
  workHeading: string;
  chapters: ParsedChapter[];
  /** total <sup class="reference"> footnote markers stripped from the reading text. */
  totalRefsStripped: number;
  /** <p>/<table> nodes that cleaned to empty text and were skipped (no reading text lost - only transport-scaffolding nodes clean to empty). */
  emptyNodesSkipped: number;
  /** Non-fatal irregularities found while walking the Bekker page/column/line markers (e.g. a duplicate or non-increasing id) - recorded, not corrected. */
  markerIrregularities: string[];
}

function extractFigureFile(fig: JSDOMElement): string {
  const a = fig.querySelector('a.mw-file-description');
  const href = a?.getAttribute('href') ?? '';
  const m = /\/wiki\/File:(.+)$/.exec(href);
  if (!m) return (a?.textContent ?? '').trim() || 'unknown file';
  return decodeURIComponent(m[1]).replace(/_/g, ' ');
}

/** Remove transport-only elements from a cloned node and return its cleaned text plus the count of footnote refs stripped. */
function extractProse(node: JSDOMElement): { text: string; refsStripped: number } {
  const clone = node.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link, br').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference').forEach((e) => {
    refsStripped += 1;
    e.remove();
  });
  clone.querySelectorAll('[id]').forEach((e) => {
    if (CHAPTER_ID_RE.test(e.id) || PAGE_COL_RE.test(e.id) || e.classList.contains('wst-verse')) e.remove();
  });
  clone.querySelectorAll('.wst-gap').forEach((e) => e.remove());
  const text = cleanText((clone.textContent ?? '').replace(/\u200B/g, ''));
  return { text, refsStripped };
}

/** Flatten a <table> (the ch. 12/13 "square of opposition" tables) into one
 *  Passage of prose: each row's non-empty cells joined with " — ", rows
 *  joined with " / ". This is the only structural transform in this module;
 *  every cell's own words are kept verbatim, nothing is reordered, and the
 *  transform is recorded as a passage-level anomaly by the caller. */
function extractTable(table: JSDOMElement): { text: string; refsStripped: number } {
  const clone = table.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll('style, link, br').forEach((e) => e.remove());
  let refsStripped = 0;
  clone.querySelectorAll('sup.reference').forEach((e) => {
    refsStripped += 1;
    e.remove();
  });
  clone.querySelectorAll('[id]').forEach((e) => {
    if (PAGE_COL_RE.test(e.id) || e.classList.contains('wst-verse')) e.remove();
  });
  clone.querySelectorAll('.wst-gap').forEach((e) => e.remove());
  const rowTexts = [...clone.querySelectorAll('tr')]
    .map((tr) =>
      [...tr.querySelectorAll('td, th')]
        .map((c) => cleanText((c.textContent ?? '').replace(/\u200B/g, '')))
        .filter((t) => t.length > 0)
        .join(' — '),
    )
    .filter((t) => t.length > 0);
  return { text: rowTexts.join(' / '), refsStripped };
}

export function parseEnglishWikisourceWork(html: string, expectedChapters: number): WorkParseResult {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const ch1Anchor = doc.getElementById('Chapter_1');
  if (!ch1Anchor) throw new Error('no #Chapter_1 anchor found in the rendered HTML');
  const mainBody = ch1Anchor.closest('div.prp-pages-output');
  if (!mainBody) throw new Error('#Chapter_1 anchor is not inside a div.prp-pages-output block');

  const headingEl = mainBody.querySelector('div.wst-heading');
  const workHeading = headingEl ? cleanText(headingEl.textContent ?? '') : '';

  if (mainBody.querySelector('div.wst-center')) {
    throw new Error('a "Footnotes"-style centred heading (div.wst-center) appears inside the reading-text block - expected footnotes to live outside it');
  }

  const chapterPs: JSDOMElement[] = [];
  for (let n = 1; n <= expectedChapters; n++) {
    const a = doc.getElementById(`Chapter_${n}`);
    if (!a) throw new Error(`missing #Chapter_${n} anchor`);
    const p = a.closest('p');
    if (!p) throw new Error(`#Chapter_${n} anchor is not inside a <p>`);
    if (p.closest('div.prp-pages-output') !== mainBody) {
      throw new Error(`#Chapter_${n} anchor is outside the main reading-text block (likely the table-of-contents transclusion, not the reading text)`);
    }
    chapterPs.push(p);
  }
  if (doc.getElementById(`Chapter_${expectedChapters + 1}`)) {
    throw new Error(`found a #Chapter_${expectedChapters + 1} anchor - expected exactly ${expectedChapters} chapters`);
  }

  const kids = [...mainBody.children];
  const chapterStartIdx = chapterPs.map((p) => kids.indexOf(p));
  if (chapterStartIdx.some((i) => i < 0)) throw new Error('a chapter-opening <p> is not a direct child of the reading-text block');
  for (let i = 1; i < chapterStartIdx.length; i++) {
    if (chapterStartIdx[i]! <= chapterStartIdx[i - 1]!) {
      throw new Error(`chapter ${i + 1} anchor does not come after chapter ${i} in document order`);
    }
  }

  // --- gate: nothing but the heading precedes chapter 1 -------------------
  const preNodes = kids.slice(0, chapterStartIdx[0]).filter((n) => n !== headingEl && n.tagName !== 'STYLE' && n.tagName !== 'LINK');
  const preText = preNodes
    .map((n) => n.textContent ?? '')
    .join('')
    .replace(/\u200B/g, '')
    .replace(/\s+/g, '');
  if (preText.length > 0) {
    throw new Error(`unexpected non-whitespace content before chapter 1 (besides the "${workHeading}" heading): ${JSON.stringify(preText.slice(0, 120))}`);
  }

  // --- walk the block, tracking Bekker position + building passages -------
  let state: Pos | null = null;
  let firstMarkerState: Pos | null = null;
  const markerIrregularities: string[] = [];
  let totalRefsStripped = 0;
  let emptyNodesSkipped = 0;

  function applyMarkers(node: JSDOMElement, chapterNum: number): void {
    for (const m of [...node.querySelectorAll('span[id]')]) {
      const pm = PAGE_COL_RE.exec(m.id);
      if (pm) {
        const page = Number(pm[1]);
        const col = pm[2] as 'a' | 'b';
        if (state && (page < state.page || (page === state.page && col < state.col))) {
          markerIrregularities.push(`ch${chapterNum}: page/column marker "${m.id}" goes backward from "${labelOf(state)}"`);
        }
        state = { page, col, line: 1 };
        firstMarkerState ??= state;
        continue;
      }
      if (m.classList.contains('wst-verse')) {
        const line = Number(m.id);
        if (!Number.isFinite(line)) {
          markerIrregularities.push(`ch${chapterNum}: unparseable wst-verse id "${m.id}"`);
          continue;
        }
        if (state && state.line !== 1 && line <= state.line) {
          markerIrregularities.push(`ch${chapterNum}: line marker "${m.id}" does not increase from previous "${labelOf(state)}"`);
        }
        state = state ? { ...state, line } : null;
        firstMarkerState ??= state;
      }
    }
  }

  interface ChapterAccum {
    number: number;
    startRef: Pos | null;
    passages: ParsedPassage[];
  }

  const chapters: ChapterAccum[] = [];
  let cur: ChapterAccum | null = null;
  let pendingFigures: string[] = [];

  function pushPassage(text: string, isTable: boolean): void {
    if (!cur) return;
    cur.passages.push({ text, isTable, figureFiles: pendingFigures });
    pendingFigures = [];
  }

  for (let idx = chapterStartIdx[0]!; idx < kids.length; idx++) {
    const node = kids[idx]!;
    const newChapterAt = chapterStartIdx.indexOf(idx);
    if (newChapterAt >= 0) {
      chapters.push(...(cur ? [cur] : []));
      cur = { number: newChapterAt + 1, startRef: state, passages: [] };
      pendingFigures = [];
    }

    if (node.tagName === 'P') {
      applyMarkers(node, cur!.number);
      const { text, refsStripped } = extractProse(node);
      totalRefsStripped += refsStripped;
      if (text.length === 0) {
        emptyNodesSkipped += 1;
        continue;
      }
      pushPassage(text, false);
    } else if (node.tagName === 'TABLE') {
      applyMarkers(node, cur!.number);
      const { text, refsStripped } = extractTable(node);
      totalRefsStripped += refsStripped;
      if (text.length === 0) {
        emptyNodesSkipped += 1;
        continue;
      }
      pushPassage(text, true);
    } else if (node.tagName === 'FIGURE') {
      pendingFigures.push(extractFigureFile(node));
    }
    // STYLE / LINK / DIV(__nop) / bare SPAN(zwsp) / etc: no reading text.
  }
  if (cur) chapters.push(cur);

  if (pendingFigures.length > 0) {
    const lastChapter = chapters[chapters.length - 1];
    const lastPassage = lastChapter?.passages[lastChapter.passages.length - 1];
    if (lastPassage) lastPassage.figureFiles.push(...pendingFigures);
  }

  if (chapters.length !== expectedChapters) {
    throw new Error(`expected ${expectedChapters} chapters, assembled ${chapters.length}`);
  }
  chapters.forEach((c, i) => {
    if (c.number !== i + 1) throw new Error(`chapter at position ${i} carries number ${c.number}, expected ${i + 1}`);
    if (c.passages.length === 0) throw new Error(`chapter ${c.number} has no passages`);
  });

  if (chapters[0]!.startRef === null) chapters[0]!.startRef = firstMarkerState;

  const result: ParsedChapter[] = chapters.map((c, i) => {
    const endRef = i + 1 < chapters.length ? chapters[i + 1]!.startRef : state;
    return { number: c.number, startRef: labelOf(c.startRef), endRef: labelOf(endRef), passages: c.passages };
  });

  return { workHeading, chapters: result, totalRefsStripped, emptyNodesSkipped, markerIrregularities };
}
