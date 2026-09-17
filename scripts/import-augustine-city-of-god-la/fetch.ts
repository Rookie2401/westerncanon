/**
 * One-time fetch step for Augustine, *De civitate Dei* (Latin Wikisource).
 *
 *   npx tsx scripts/import-augustine-city-of-god-la/fetch.ts
 *
 * Fetches, via the MediaWiki `action=parse&prop=wikitext` API:
 *   - "De civitate Dei/Prologus"      (Augustine's dedicatory letter to Firmus)
 *   - "De civitate Dei/Liber I" .. "De civitate Dei/Liber XXII"
 * and caches each raw JSON response under raw/ (one file per page). Idempotent
 * and resumable: a page whose cache file already exists is skipped, so re-runs
 * never re-fetch. Only 23 requests total, but still polite: ~200ms between
 * requests.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');

const ROMANS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII',
];

interface PageJob {
  slug: string; // cache filename stem
  title: string; // MediaWiki page title
}

const jobs: PageJob[] = [
  { slug: 'prologus', title: 'De civitate Dei/Prologus' },
  ...ROMANS.map((r, i) => ({
    slug: `liber-${String(i + 1).padStart(2, '0')}-${r}`,
    title: `De civitate Dei/Liber ${r}`,
  })),
];

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchPage(title: string): Promise<unknown> {
  const url =
    'https://la.wikisource.org/w/api.php?action=parse&page=' +
    encodeURIComponent(title) +
    '&prop=wikitext&format=json';
  for (let attempt = 1; attempt <= 10; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'summa-app-importer/1.0 (offline PWA corpus build)' } });
    if (res.status === 429 || res.status === 503) {
      const wait = 5000 * attempt;
      process.stdout.write(`  HTTP ${res.status} for "${title}", backing off ${wait}ms (attempt ${attempt}/10) ...\n`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${title}`);
    const json = (await res.json()) as { parse?: { wikitext?: unknown }; error?: unknown };
    if (json.error || !json.parse?.wikitext) {
      throw new Error(`MediaWiki error / missing wikitext for ${title}: ${JSON.stringify(json).slice(0, 300)}`);
    }
    return json;
  }
  throw new Error(`Gave up on ${title} after repeated 429/503`);
}

async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  let fetched = 0;
  let skipped = 0;
  for (const job of jobs) {
    const file = join(RAW_DIR, `${job.slug}.json`);
    if (existsSync(file)) {
      skipped += 1;
      continue;
    }
    process.stdout.write(`fetching "${job.title}" ...\n`);
    const json = await fetchPage(job.title);
    writeFileSync(file, JSON.stringify(json), 'utf8');
    fetched += 1;
    await sleep(1500);
  }
  process.stdout.write(`\nDone. ${fetched} fetched, ${skipped} already cached, ${jobs.length} total.\n`);
}

main().catch((err) => {
  process.stderr.write(`STOP: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
