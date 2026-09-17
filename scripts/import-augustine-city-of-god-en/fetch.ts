/**
 * One-time fetch step for Augustine, *City of God*, trans. Marcus Dods
 * (English Wikisource, Nicene and Post-Nicene Fathers Series I, Vol. II).
 *
 *   npx tsx scripts/import-augustine-city-of-god-en/fetch.ts
 *
 * Two phases, both idempotent/resumable (a page whose cache file already
 * exists is never re-fetched, so re-running this script after an interruption
 * or a rate-limit just picks up where it left off):
 *
 *   1. TOC phase - fetch each Book's own page (22 requests) to discover its
 *      Preface (if any) and its exact Chapter count. Cached under
 *      raw/toc/book-NN.json.
 *   2. Chapter phase - fetch every discovered Preface/Chapter page (~650-750
 *      requests, one wiki page per chapter). Cached under raw/pages/.
 *
 * Progress is printed every 25 chapter-phase fetches. ~250-400ms delay between
 * requests plus exponential backoff on HTTP 429/503 (Wikisource has a shared
 * rate limit; this project fetches THREE Augustine works from the same IP in
 * parallel, so backoff is generous).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOC_DIR = join(HERE, 'raw', 'toc');
const PAGES_DIR = join(HERE, 'raw', 'pages');

const ROMANS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII',
];

const TITLE_PREFIX = 'Nicene and Post-Nicene Fathers: Series I/Volume II/City of God';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface ParseJson {
  parse?: { wikitext?: { '*'?: string } };
  error?: unknown;
}

function wikitextOf(json: ParseJson): string {
  const wt = json.parse?.wikitext?.['*'];
  if (typeof wt !== 'string') throw new Error(`missing .parse.wikitext.* in cached JSON`);
  return wt;
}

async function fetchParseJson(title: string): Promise<ParseJson> {
  const url =
    'https://en.wikisource.org/w/api.php?action=parse&page=' +
    encodeURIComponent(title) +
    '&prop=wikitext&format=json';
  // This repo fetches THREE Augustine works from Wikisource in parallel (this
  // script plus two sibling importers), so 429s are frequent and sustained
  // rather than a brief spike - a fixed, moderately generous backoff (with a
  // high attempt cap) recovers far better here than aggressive exponential
  // growth, which just burns minutes per page without the shared rate limit
  // actually clearing any faster.
  for (let attempt = 1; attempt <= 30; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'summa-app-importer/1.0 (offline PWA corpus build)' } });
    if (res.status === 429 || res.status === 503) {
      const wait = 12000;
      if (attempt === 1 || attempt % 5 === 0) {
        process.stdout.write(`  HTTP ${res.status} for "${title}", backing off ${wait}ms (attempt ${attempt}/30) ...\n`);
      }
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${title}`);
    const json = (await res.json()) as ParseJson;
    if (json.error || typeof json.parse?.wikitext?.['*'] !== 'string') {
      throw new Error(`MediaWiki error / missing wikitext for ${title}: ${JSON.stringify(json).slice(0, 300)}`);
    }
    return json;
  }
  throw new Error(`Gave up on ${title} after repeated 429/503`);
}

/** Fetch-and-cache the RAW JSON envelope (matching the repo's raw/ convention). Returns its wikitext. */
async function fetchAndCache(title: string, file: string): Promise<string> {
  if (existsSync(file)) return wikitextOf(JSON.parse(readFileSync(file, 'utf8')) as ParseJson);
  const json = await fetchParseJson(title);
  writeFileSync(file, JSON.stringify(json), 'utf8');
  await sleep(300);
  return wikitextOf(json);
}

/** Parse a Book TOC page's wikitext: [[.../Book N/Preface|Preface]] (optional) + [[.../Book N/Chapter M|Chapter M]]* */
function parseBookToc(wt: string): { hasPreface: boolean; chapterCount: number } {
  const contentsIdx = wt.indexOf('== Contents ==');
  const block = contentsIdx >= 0 ? wt.slice(contentsIdx) : wt;
  const hasPreface = /\[\[[^\]]*\/Preface\|Preface\]\]/.test(block);
  const chapterMatches = [...block.matchAll(/\[\[[^\]]*\/Chapter (\d+)\|Chapter \d+\]\]/g)];
  const chapterCount = chapterMatches.length;
  return { hasPreface, chapterCount };
}

async function main(): Promise<void> {
  mkdirSync(TOC_DIR, { recursive: true });
  mkdirSync(PAGES_DIR, { recursive: true });

  // --- phase 1: TOC pages -------------------------------------------------
  const books: { roman: string; hasPreface: boolean; chapterCount: number }[] = [];
  for (let i = 0; i < ROMANS.length; i++) {
    const roman = ROMANS[i];
    const title = `${TITLE_PREFIX}/Book ${roman}`;
    const file = join(TOC_DIR, `book-${String(i + 1).padStart(2, '0')}-${roman}.json`);
    const cachedNow = existsSync(file);
    const wt = await fetchAndCache(title, file);
    if (!cachedNow) process.stdout.write(`fetched TOC "${title}"\n`);
    const { hasPreface, chapterCount } = parseBookToc(wt);
    if (chapterCount === 0) {
      process.stderr.write(`STOP: Book ${roman} TOC parsed to 0 chapters - page shape unexpected.\n`);
      process.exit(1);
    }
    books.push({ roman, hasPreface, chapterCount });
  }
  process.stdout.write(
    `\nTOC phase done. Per-book chapter counts:\n` +
      books.map((b, i) => `  Book ${b.roman} (${i + 1}): ${b.hasPreface ? 'Preface + ' : ''}${b.chapterCount} chapters`).join('\n') +
      '\n\n',
  );

  // --- phase 2: chapter/preface pages -------------------------------------
  const jobs: { slug: string; title: string }[] = [];
  books.forEach((b, i) => {
    const bookSlug = `book-${String(i + 1).padStart(2, '0')}-${b.roman}`;
    if (b.hasPreface) {
      jobs.push({ slug: `${bookSlug}-preface`, title: `${TITLE_PREFIX}/Book ${b.roman}/Preface` });
    }
    for (let ch = 1; ch <= b.chapterCount; ch++) {
      jobs.push({ slug: `${bookSlug}-ch-${String(ch).padStart(2, '0')}`, title: `${TITLE_PREFIX}/Book ${b.roman}/Chapter ${ch}` });
    }
  });

  process.stdout.write(`Chapter phase: ${jobs.length} pages total.\n`);
  let fetched = 0;
  let skipped = 0;
  for (const job of jobs) {
    const file = join(PAGES_DIR, `${job.slug}.json`);
    if (existsSync(file)) {
      skipped += 1;
      continue;
    }
    const json = await fetchParseJson(job.title);
    writeFileSync(file, JSON.stringify(json), 'utf8');
    fetched += 1;
    if ((fetched + skipped) % 25 === 0 || fetched + skipped === jobs.length) {
      process.stdout.write(`  progress: ${fetched + skipped}/${jobs.length} (${fetched} fetched this run, ${skipped} from cache)\n`);
    }
    await sleep(1200);
  }
  process.stdout.write(`\nDone. ${fetched} fetched, ${skipped} already cached, ${jobs.length} total.\n`);
}

main().catch((err) => {
  process.stderr.write(`STOP: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
