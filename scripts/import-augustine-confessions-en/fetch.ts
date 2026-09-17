/**
 * One-time fetch-and-cache helper for the English Confessions importer.
 *
 *   npx tsx scripts/import-augustine-confessions-en/fetch.ts
 *
 * Fetches, via the MediaWiki `action=parse&prop=wikitext` API:
 *   - the 13 Book-level TOC pages ("Nicene and Post-Nicene Fathers: Series I/
 *     Volume I/Confessions/Book <roman>"), to enumerate each book's chapters
 *   - every individual chapter page found in each TOC's "== Contents ==" list
 *
 * and caches each raw JSON response under scripts/import-augustine-confessions-en/raw/
 * so re-running the importer (index.ts) never re-fetches anything. Safe to
 * re-run: any file already present on disk is skipped. Polite to Wikisource:
 * a small delay between requests, plus retry-with-backoff on HTTP 429.
 *
 * This is a run-once ingestion script, not a live fetch used by the app or by
 * index.ts at build/runtime - see the doc comment at the top of
 * scripts/import-isagoge-la/index.ts for this repo's general pattern.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

const API = 'https://en.wikisource.org/w/api.php';
const UA = 'summa-app-offline-reader-importer/1.0 (one-time bundled-corpus ingestion; contact via repo)';

function tocPageTitle(roman: string): string {
  return `Nicene and Post-Nicene Fathers: Series I/Volume I/Confessions/Book ${roman}`;
}
function chapterPageTitle(roman: string, chapter: number): string {
  return `${tocPageTitle(roman)}/Chapter ${chapter}`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

interface ParseResult {
  parse?: { title?: string; wikitext?: string | { '*'?: string } };
}

async function fetchWikitext(title: string): Promise<ParseResult> {
  const url = `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`;
  for (let attempt = 1; attempt <= 20; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status === 503) {
      const backoff = Math.min(1000 * attempt, 15000);
      process.stdout.write(`    HTTP ${res.status} for "${title}", retrying in ${backoff}ms (attempt ${attempt})...\n`);
      await sleep(backoff);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching "${title}"`);
    return (await res.json()) as ParseResult;
  }
  throw new Error(`gave up fetching "${title}" after repeated 429/503`);
}

function wikitextOf(r: ParseResult): string {
  const wt = r.parse?.wikitext;
  const s = typeof wt === 'string' ? wt : wt?.['*'];
  if (!s) throw new Error('no .parse.wikitext string in response');
  return s;
}

async function cacheFetch(cacheFile: string, title: string): Promise<string> {
  const path = join(RAW_DIR, cacheFile);
  if (existsSync(path)) {
    return wikitextOf(JSON.parse(readFileSync(path, 'utf8')) as ParseResult);
  }
  const result = await fetchWikitext(title);
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n', 'utf8');
  await sleep(700);
  return wikitextOf(result);
}

/** `[[...Chapter N|Chapter N]]` link inside a TOC's "== Contents ==" list. */
const CHAPTER_LINK_RE = /\[\[[^|\]]*\/Chapter (\d+)\|Chapter \d+\]\]/g;

async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });

  const summary: { book: number; roman: string; chapters: number }[] = [];

  for (let bi = 0; bi < ROMAN.length; bi++) {
    const bookNum = bi + 1;
    const roman = ROMAN[bi]!;
    process.stdout.write(`Book ${roman} (${bookNum}/13): fetching TOC...\n`);
    const tocWikitext = await cacheFetch(`toc-book-${bookNum}.json`, tocPageTitle(roman));

    const contentsIdx = tocWikitext.indexOf('== Contents ==');
    if (contentsIdx < 0) throw new Error(`Book ${roman} TOC: no "== Contents ==" section found`);
    const contentsBlock = tocWikitext.slice(contentsIdx);

    const chapterNums: number[] = [];
    let m: RegExpExecArray | null;
    CHAPTER_LINK_RE.lastIndex = 0;
    while ((m = CHAPTER_LINK_RE.exec(contentsBlock))) chapterNums.push(Number(m[1]));
    if (chapterNums.length === 0) throw new Error(`Book ${roman} TOC: no chapter links found in Contents`);
    chapterNums.forEach((n, i) => {
      if (n !== i + 1) throw new Error(`Book ${roman} TOC: chapter links out of order/gapped at position ${i} (got ${n})`);
    });

    summary.push({ book: bookNum, roman, chapters: chapterNums.length });
    process.stdout.write(`  ${chapterNums.length} chapters listed. Fetching each chapter page...\n`);

    for (const c of chapterNums) {
      const cacheFile = `book-${bookNum}-ch-${c}.json`;
      const already = existsSync(join(RAW_DIR, cacheFile));
      await cacheFetch(cacheFile, chapterPageTitle(roman, c));
      process.stdout.write(`    ch ${c}${already ? ' (cached)' : ''}\n`);
    }
  }

  process.stdout.write('\nDone fetching. Chapter counts per book:\n');
  for (const s of summary) process.stdout.write(`  Book ${s.roman.padEnd(5)} book-${s.book}: ${s.chapters} chapters\n`);
  process.stdout.write(`\nTotal chapter pages: ${summary.reduce((n, s) => n + s.chapters, 0)}\n`);
  process.stdout.write('Now run `npx tsx scripts/import-augustine-confessions-en/index.ts`.\n');
}

main().catch((err) => {
  process.stderr.write(`STOP: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
