/**
 * Minimal page-scan (rendered-HTML) unit collector for this Dante batch's
 * De Vulgari Eloquentia (LA + EN) page-scan sources.
 *
 * Simplified relative to scripts/import-aristotle-rest-en-shared/pagescan.ts
 * (no Bekker markers, no book-heading splitting, no tables): this batch's
 * two sources need only (a) recovery of reading text NOT wrapped in a <p>
 * because a printed paragraph straddles a scanned page boundary (the same
 * gotcha documented at length in that module - confirmed present here too,
 * by direct inspection: De Vulgari Eloquentia Book I's chapters II-VII are
 * entirely absent from this page's <p> elements and exist only as loose
 * text/inline nodes between the <p>s that hold its footnotes), and
 * (b) recognising a "CHAPTER <roman>" (English) / a bare roman numeral
 * (Latin) standalone unit as a chapter boundary rather than content.
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText } from './text.ts';

export interface Unit {
  text: string;
  synthetic: boolean;
}

/** Walk every div.prp-pages-output block and return paragraph-or-loose-run units, in document order. */
export function collectUnits(html: string): Unit[] {
  const doc = new JSDOM(html).window.document;
  const blocks = [...doc.querySelectorAll('div.prp-pages-output')];
  if (blocks.length === 0) {
    process.stderr.write('STOP (pagescanLite): no div.prp-pages-output found\n');
    process.exit(1);
  }
  for (const b of blocks) b.querySelectorAll('style, link').forEach((e) => e.remove());
  // Marginal chapter-summary sidenotes and footnote reference superscripts
  // are apparatus, not Dante's/the translator's running text.
  for (const b of blocks) b.querySelectorAll('span.wst-sidenote, sup.reference, span.mw-editsection, span.pagenum, span.ws-pagenum').forEach((e) => e.remove());

  const units: Unit[] = [];
  let loose: JSDOMElement[] = [];

  const ZERO_WIDTH_RE = new RegExp(`[${String.fromCharCode(0x200b)}${String.fromCharCode(0xfeff)}]`, 'g');
  const visible = (s: string | null | undefined): string => cleanText((s ?? '').replace(ZERO_WIDTH_RE, ''));

  const flush = (): void => {
    if (loose.length === 0) return;
    const pending = loose;
    loose = [];
    const synthetic = doc.createElement('p');
    for (const n of pending) synthetic.appendChild(n.cloneNode(true));
    const text = visible(synthetic.textContent);
    if (text.length > 0) units.push({ text, synthetic: true });
  };

  const BLOCK_TAGS = new Set(['P', 'DIV', 'TABLE', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'H1', 'H2', 'H3', 'H4']);

  const walk = (node: JSDOMElement): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        loose.push(child as unknown as JSDOMElement);
        continue;
      }
      if (child.nodeType !== 1) continue;
      const el = child as JSDOMElement;
      if (el.tagName === 'P') {
        flush();
        const text = visible(el.textContent);
        if (text.length > 0) units.push({ text, synthetic: false });
        continue;
      }
      if (BLOCK_TAGS.has(el.tagName)) {
        flush();
        walk(el);
        flush();
        continue;
      }
      loose.push(el);
    }
  };

  for (const block of blocks) walk(block);
  flush();
  return units.filter((u) => u.text.length > 0);
}
