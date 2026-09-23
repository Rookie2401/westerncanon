/**
 * TEXT ACCOUNTING: reconcile every paragraph of the cached RAW source against
 * the reading text actually shipped in data/<slug>-en/work.json.
 *
 * Why this exists. The page-scan importers in this batch once dropped real
 * translation - about 19,700 characters of Eudemian Ethics Book VII alone -
 * and every structural check still passed, because those checks only ever
 * asked whether what WAS imported looked well-formed. Nothing compared the
 * output against the input. This module closes that gap: it rebuilds the
 * source's paragraphs from the committed raw response and asserts that each
 * one survives into the work, naming any that do not.
 *
 * It is written as a SEPARATE, independent traversal rather than by calling
 * the importer's own parser. That is the whole point: if the parser regresses
 * to walking only `<p>` elements, or to reading only the first
 * `div.prp-pages-output` block, this check must still see the text it lost
 * and fail. Sharing the traversal would make the check agree with the bug.
 *
 * Paragraphs that are genuinely NOT translation - the rendered footnote
 * apparatus, Wikisource's editorial header notes and licence boxes, running
 * titles, and (for On Plants) the translator's own front matter - are
 * excluded by the same structural rules the importers use, and anything a
 * caller additionally expects to be absent must be declared explicitly. An
 * undeclared missing paragraph is an ERROR.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from './text.ts';

export interface AccountingSpec {
  kind: 'page-scan' | 'wikitext';
  /** the importer's raw/ directory */
  rawDir: string;
  /** cached response files, in manifest order */
  files: string[];
  /** exact paragraph texts that are page furniture (running titles etc.) */
  furnitureExact?: string[];
  /** page-scan only: ignore everything before the first heading matching this */
  skipBeforeBookHeading?: RegExp;
  /**
   * Paragraphs that are legitimately absent from the reading text and must
   * not fail the check. Each entry is matched against the paragraph's start.
   * Every entry must be justified in the work's anomalies.json.
   */
  editorialAllowList?: string[];
}

export interface AccountingResult {
  rawParagraphs: number;
  checkedParagraphs: number;
  allowedAbsent: number;
  missing: { file: string; text: string }[];
}

const ZW = /[\u200B\uFEFF]/g;
const visible = (s: string | null | undefined): string => cleanText((s ?? '').replace(ZW, ''));

const BLOCK_TAGS = new Set(['P', 'DIV', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'HR', 'CENTER', 'PRE', 'FIGURE', 'SECTION']);

function isApparatus(el: JSDOMElement): boolean {
  const cls = String(el.className ?? '');
  if (el.tagName === 'OL' && /\breferences\b/.test(cls)) return true;
  if (el.tagName === 'DIV' && /\breflist\b/.test(cls)) return true;
  if (el.tagName === 'SPAN' && /\breference-text\b/.test(cls)) return true;
  if (el.tagName === 'SUP' && /\breference\b/.test(cls)) return true;
  return false;
}

/** Marginalia: page numbers, Bekker markers, chapter anchors - present in the markup, absent from the reading text by design. */
const MARGINALIA = '.pagenum, span.mw-editsection, span.wst-anchor, span.wst-woach, span.wst-verse, span.wst-bekker, span.wst-sidenote, sup.reference, sup.wst-sup, style, link';

interface RawUnit { kind: 'paragraph' | 'heading'; text: string }

/** Rebuild the source's paragraphs from one rendered page-scan response. */
function pageScanParagraphs(html: string): RawUnit[] {
  const doc = new JSDOM(html).window.document;
  const blocks = [...doc.querySelectorAll('div.prp-pages-output')];
  const units: RawUnit[] = [];
  let loose: string[] = [];

  const flush = (): void => {
    const t = visible(loose.join(' '));
    loose = [];
    if (t.length > 0) units.push({ kind: 'paragraph', text: t });
  };
  const textOf = (el: JSDOMElement): string => {
    const c = el.cloneNode(true) as JSDOMElement;
    c.querySelectorAll(MARGINALIA).forEach((e) => e.remove());
    c.querySelectorAll('ol.references, div.reflist, span.reference-text').forEach((e) => e.remove());
    return visible(c.textContent);
  };
  const walk = (node: JSDOMElement): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) { loose.push(child.textContent ?? ''); continue; }
      if (child.nodeType !== 1) continue;
      const el = child as JSDOMElement;
      if (isApparatus(el)) { flush(); continue; }
      if (el.tagName === 'P' || el.tagName === 'TABLE') {
        flush();
        const t = textOf(el);
        if (t.length > 0) units.push({ kind: 'paragraph', text: t });
        continue;
      }
      if (el.tagName === 'DIV' && /\bwst-heading\b/.test(String(el.className ?? ''))) {
        flush();
        units.push({ kind: 'heading', text: visible(el.textContent) });
        continue;
      }
      if (BLOCK_TAGS.has(el.tagName)) { flush(); walk(el); flush(); continue; }
      if (/\b(pagenum|wst-verse|wst-bekker|wst-sidenote|wst-anchor|wst-woach|mw-editsection)\b/.test(String(el.className ?? ''))) continue;
      if (el.tagName === 'STYLE' || el.tagName === 'LINK') continue;
      loose.push(el.textContent ?? '');
    }
  };
  for (const b of blocks) { walk(b); flush(); }
  return units;
}

/** Rebuild the source's paragraphs from one raw wikitext response. */
function wikitextParagraphs(wikitext: string): RawUnit[] {
  let s = wikitext;
  // leading {{header ...}} block
  if (/^\s*\{\{header\b/i.test(s)) {
    let depth = 0;
    for (let i = s.indexOf('{{'); i < s.length - 1; i++) {
      if (s[i] === '{' && s[i + 1] === '{') { depth++; i++; continue; }
      if (s[i] === '}' && s[i + 1] === '}') { depth--; i++; if (depth === 0) { s = s.slice(i + 1); break; } }
    }
  }
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ').replace(/<ref[^>]*\/>/gi, ' ').replace(/<references\s*\/?>/gi, ' ');
  // drop trailing External links / Notes sections
  s = s.replace(/^==+\s*(external\s+links?|notes|references|see\s+also)\s*==+[\s\S]*$/im, '');
  // templates, innermost first
  for (let guard = 0; guard < 400; guard++) {
    const close = s.indexOf('}}');
    if (close === -1) break;
    const open = s.lastIndexOf('{{', close);
    if (open === -1) break;
    const inner = s.slice(open + 2, close);
    const name = (inner.split('|')[0] ?? '').trim().toLowerCase();
    let rep = ' ';
    if (name === 'sic') rep = ` ${(inner.split('|')[1] ?? '').trim()} `;
    else if (['x-larger', 'xx-larger', 'uc', 'larger', 'smaller'].includes(name)) rep = ` ${(inner.split('|').pop() ?? '').trim()} `;
    else if (name === 'ppoem') rep = ` ${inner.split('|').slice(1).join('|').replace(/^\s*1\s*=\s*/, '').replace(/\{[a-z-]+\}/gi, ' ')} `;
    s = s.slice(0, open) + rep + s.slice(close + 2);
  }
  s = s
    .replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1')
    .replace(/\[(?:https?|\/\/)[^\s\]]*\s*([^\]]*)\]/g, '$1')
    .replace(/'''''|'''|''/g, '')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/<\/?[a-zA-Z][^>]*$/gm, '');

  const units: RawUnit[] = [];
  for (const chunk of s.split(/\n\s*\n/)) {
    const line = chunk.trim();
    if (line.length === 0) continue;
    const heading = /^\s*(={2,6})\s*(.+?)\s*\1\s*$/.exec(line);
    if (heading) { units.push({ kind: 'heading', text: visible(heading[2]) }); continue; }
    units.push({ kind: 'paragraph', text: visible(line) });
  }
  return units;
}

/**
 * Run the reconciliation. `workText` is every Passage.text in the work,
 * joined; a paragraph counts as present when a 60-character probe taken from
 * its middle occurs there.
 */
export function runAccounting(spec: AccountingSpec, workText: string): AccountingResult {
  const haystack = visible(workText);
  const furniture = new Set((spec.furnitureExact ?? []).map((s) => visible(s)));
  const allow = spec.editorialAllowList ?? [];
  const missing: { file: string; text: string }[] = [];
  let rawParagraphs = 0;
  let checkedParagraphs = 0;
  let allowedAbsent = 0;

  for (const file of spec.files) {
    const raw = readFileSync(join(spec.rawDir, file), 'utf8');
    let units: RawUnit[];
    if (spec.kind === 'page-scan') {
      const parsed = JSON.parse(raw) as { parse?: { text?: { '*'?: string } } };
      units = pageScanParagraphs(parsed.parse?.text?.['*'] ?? '');
    } else {
      const parsed = JSON.parse(raw) as { content?: string };
      units = wikitextParagraphs(parsed.content ?? '');
    }

    let seenBookHeading = false;
    for (const u of units) {
      if (u.kind === 'heading') {
        if (spec.skipBeforeBookHeading && spec.skipBeforeBookHeading.test(u.text)) seenBookHeading = true;
        continue;
      }
      rawParagraphs += 1;
      if (spec.skipBeforeBookHeading && !seenBookHeading) { allowedAbsent += 1; continue; }
      if (u.text.length < 40) continue;
      if (furniture.has(u.text)) { allowedAbsent += 1; continue; }
      if (allow.some((a) => u.text.startsWith(a))) { allowedAbsent += 1; continue; }
      checkedParagraphs += 1;
      const mid = Math.max(0, Math.floor(u.text.length / 2) - 30);
      const probe = u.text.slice(mid, mid + 60);
      if (!haystack.includes(probe)) missing.push({ file, text: u.text });
    }
  }
  return { rawParagraphs, checkedParagraphs, allowedAbsent, missing };
}
