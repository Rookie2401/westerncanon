/**
 * Resolves one `<figure>...</figure>` span's inner XML (as captured by
 * teiWalker.ts) into either "this is a pure diagram marker" or "this is a
 * numeric table the transcription itself carries as text" - the Almagest is
 * the only source with any of this (Tetrabiblos's two `<figure>` spans are
 * both empty - a lost/unrecovered equation marker, `<figure n="e#3uation">
 * </figure>`).
 *
 * Verified by direct inspection of every `<figure>`/`<figDesc>` in the
 * Almagest source before writing this: 295 `<figure>` elements total, of
 * which exactly 6 carry a `<figDesc>` (5 with a nested `<list rend="table">`
 * of `<list rend="row">` rows - Book I's Table of Chords, split across
 * several page images; 1 empty). The other 289 are a bare `<graphic/>`
 * pointing at a dead-in-practice archive.org page-scan URL (a real page
 * image exists there, but is NOT a transcription - never used as a text
 * source, only as the figure's own citation). `<list>`/`<item>`/`<label>`/
 * `<num>` occur ONLY inside a `<figDesc>` in this corpus (confirmed: 0
 * occurrences of any of the four outside one) - so this module is the only
 * place that ever has to interpret them.
 *
 * Row serialisation deliberately uses ONLY whitespace as a cell/row
 * separator (a single space between cells, "\n" between rows) - no added
 * punctuation like "|" - so that validate.ts's whitespace-insensitive raw-
 * vs-imported character accounting reconciles exactly: every non-whitespace
 * character in the serialised table text is a character that was already in
 * the source's own `<item>`/`<label>`/`<num>` text content, nothing added.
 */

import { JSDOM } from 'jsdom';
import { cleanText } from './text.ts';

export interface FigureResult {
  /** null for a pure diagram marker; the row-serialised table text otherwise */
  tableText: string | null;
  rowCount: number;
  /** the figure's own <graphic url="…"/> - the archive.org page-scan leaf
   *  this figure was printed on (294 of 295 figures carry exactly one;
   *  recorded for every figure, table or diagram, so a later diagram-import
   *  phase can fetch exactly the right pages - see index.ts/aboutText.ts). */
  graphicUrl: string | null;
}

export function extractFigure(innerXml: string, fileLabel: string, path: string): FigureResult {
  const trimmed = innerXml.trim();
  if (trimmed.length === 0) return { tableText: null, rowCount: 0, graphicUrl: null };

  let dom: JSDOM;
  try {
    dom = new JSDOM(`<root>${innerXml}</root>`, { contentType: 'text/xml' });
  } catch (err) {
    throw new Error(`${fileLabel}: ${path}: failed to parse <figure> inner XML for table extraction: ${(err as Error).message}`, { cause: err });
  }
  const doc = dom.window.document;
  const parserError = doc.querySelector('parsererror');
  if (parserError) throw new Error(`${fileLabel}: ${path}: <figure> inner XML did not parse: ${parserError.textContent}`);

  const graphicUrl = doc.querySelector('graphic')?.getAttribute('url') ?? null;

  const figDesc = doc.querySelector('figDesc');
  if (!figDesc || cleanText(figDesc.textContent ?? '').length === 0) {
    return { tableText: null, rowCount: 0, graphicUrl };
  }

  const rows = Array.from(figDesc.querySelectorAll('list[rend="row"]'));
  if (rows.length === 0) {
    // A non-empty figDesc with no row-structured table (not seen in the
    // Almagest today, but handled rather than silently dropped if a future
    // re-run's upstream file adds one): keep its whole text verbatim.
    return { tableText: cleanText(figDesc.textContent ?? ''), rowCount: 0, graphicUrl };
  }

  const lines: string[] = [];
  for (const row of rows) {
    const cells = Array.from(row.children).filter((c) => c.tagName.toLowerCase() === 'item');
    const cellTexts = cells.map((c) => cleanText(c.textContent ?? '')).filter((t) => t.length > 0);
    if (cellTexts.length > 0) lines.push(cellTexts.join(' '));
  }
  return { tableText: lines.join('\n'), rowCount: lines.length, graphicUrl };
}
