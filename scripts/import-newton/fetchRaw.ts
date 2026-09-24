/**
 * One-time fetcher for the Newton importer's raw Wikisource pages.
 *
 *   npx tsx scripts/import-newton/fetchRaw.ts
 *
 * Fetches (rendered HTML via action=parse&prop=text — needed for this
 * source's <figure>/diagram markup and <math> MathML, neither of which
 * survives in plain wikitext) every page listed in pages.ts, at most one
 * request per 3.5 seconds (a descriptive User-Agent is sent throughout, per
 * Wikimedia API etiquette), and caches each response verbatim as JSON under
 * scripts/import-newton/raw/<lang>/<file>. A page already cached is never
 * re-fetched.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGLISH_PAGES, LATIN_PAGES, type PagePlan } from './pages.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = 'summa-app-newton-importer/1.0 (offline PWA classical-library reader; contact: repository issue tracker; one-time research fetch, cached and rate-limited)';

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchPage(apiBase: string, title: string): Promise<string> {
  const url = `${apiBase}?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status === 503) {
      const wait = 15000 * attempt;
      process.stdout.write(`    HTTP ${res.status}, backing off ${wait / 1000}s (attempt ${attempt}/6) ...\n`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${title}`);
    const j = (await res.json()) as { parse?: { text?: { '*': string } }; error?: { code: string; info: string } };
    if (j.error) throw new Error(`API error for "${title}": ${j.error.code} - ${j.error.info}`);
    const html = j.parse?.text?.['*'];
    if (!html) throw new Error(`no parse.text for "${title}"`);
    return html;
  }
  throw new Error(`gave up on "${title}" after repeated 429/503`);
}

async function run(apiBase: string, lang: 'la' | 'en', pages: PagePlan[]): Promise<void> {
  const dir = join(HERE, 'raw', lang);
  mkdirSync(dir, { recursive: true });
  for (const p of pages) {
    const file = join(dir, p.file);
    if (existsSync(file)) {
      process.stdout.write(`  [cached] ${lang}/${p.file}\n`);
      continue;
    }
    process.stdout.write(`  fetching ${lang}: "${p.title}" ...\n`);
    const html = await fetchPage(apiBase, p.title);
    writeFileSync(file, JSON.stringify({ title: p.title, section: p.section, html }, null, 0), 'utf8');
    process.stdout.write(`    saved ${html.length} chars -> ${p.file}\n`);
    await sleep(6000);
  }
}

async function main(): Promise<void> {
  await run('https://la.wikisource.org/w/api.php', 'la', LATIN_PAGES);
  await run('https://en.wikisource.org/w/api.php', 'en', ENGLISH_PAGES);
  process.stdout.write('\nAll raw pages fetched/cached.\n');
}

main().catch((e) => {
  process.stderr.write(`FETCH FAILED: ${(e as Error).message}\n`);
  process.exit(1);
});
