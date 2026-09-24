/**
 * J. M. Ashmand's 1822 English translation of the Tetrabiblos, via
 * sacred-texts.com (https://sacred-texts.com/book/ptolemy-s-tetrabiblos/).
 *
 * FETCH POLICY (matches this repo's Wikisource convention - see
 * scripts/import-aristotle-rest-en-shared/pagescan.ts - even though this is
 * a different site): at most 1 request per 3 seconds, a real identifying
 * User-Agent, everything cached to raw/ashmand/<slug>.htm and never
 * re-fetched once present (idempotent - re-running the importer touches no
 * network at all when the cache is warm, which it always is in this repo:
 * every file this importer needs is committed).
 *
 * WHY THIS URL SHAPE, NOT THE OLD PAGE-NUMBERED ptbNN.htm FILES
 * ===============================================================
 * sacred-texts.com's classic layout (ptb02.htm, ptb04.htm, ...) still
 * exists and IS server-rendered, but its physical "pages" do not align to
 * chapter boundaries (confirmed by direct inspection: ptb04.htm renders
 * only Chapter I in full, then a bare `<hr>` with nothing further - Chapter
 * II turned out to live on a LATER physical page with no chapter-numbered
 * anchor of its own, so reconstructing the chapter stream from that
 * pagination would have needed the exact page-break list, which the site's
 * own "jump to page" widget does not expose completely - it skips pages
 * with no separately-indexed anchor).
 *
 * The site's modern "reader" layer instead publishes ONE clean, fully
 * server-rendered page per chapter, at a stable slug -
 * `/book/ptolemy-s-tetrabiblos/shell/<chapter-slug>` (confirmed directly:
 * every book-opening chapter page's own `<link rel="next" href="…">`
 * points at exactly the next chapter's `shell/<slug>` URL, and the site's
 * own table-of-contents page, ptb02.htm, links every one of the 70 chapter
 * titles to this same URL shape via `data-track-surface="reader-shell-
 * chapter-link"`). This importer fetches THAT: one request per chapter, no
 * page-boundary reconstruction needed. (The visually similar `reader/
 * <slug>` URL was tried first and found to render NO content server-side -
 * confirmed empty by direct fetch - so it is not used.)
 *
 * The 70-chapter slug/title list itself was fetched once from ptb02.htm's
 * own table of contents and is committed as raw/ashmand-chapters.json (see
 * that file for the exact list, in print order, with sacred-texts.com's own
 * chapter titles - used by validate.ts to confirm nothing was skipped).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const USER_AGENT = 'Mozilla/5.0 (compatible; summa-app-importer/1.0; contact: cjwalker117@outlook.com)';
const MIN_INTERVAL_MS = 3000;
let lastFetch = 0;

async function politeFetch(url: string): Promise<string> {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastFetch);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

export async function fetchChapterPage(rawDir: string, slug: string): Promise<string> {
  const dir = join(rawDir, 'ashmand');
  mkdirSync(dir, { recursive: true });
  const cachePath = join(dir, `${slug}.htm`);
  if (existsSync(cachePath)) return readFileSync(cachePath, 'utf8');
  const html = await politeFetch(`https://sacred-texts.com/book/ptolemy-s-tetrabiblos/shell/${slug}`);
  writeFileSync(cachePath, html, 'utf8');
  return html;
}

export interface AshmandChapterListing {
  slug: string;
  text: string;
}

export function loadChapterListing(rawDir: string): AshmandChapterListing[] {
  return JSON.parse(readFileSync(join(rawDir, 'ashmand-chapters.json'), 'utf8')) as AshmandChapterListing[];
}
