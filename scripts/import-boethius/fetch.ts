/**
 * One-time fetch step for the Boethius corpus (Perseus canonical-latinLit,
 * raw.githubusercontent.com). Idempotent and resumable: a file already
 * cached under raw/ is never re-downloaded.
 *
 *   npx tsx scripts/import-boethius/fetch.ts
 *
 * Polite fetching: a descriptive User-Agent and a fixed >=3s pause between
 * requests (≤1 request/3s), matching this app's stated convention for
 * fetching third-party sources.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');
const BASE = 'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0058';
const UA = 'summa-app-importer/1.0 (offline PWA corpus build)';

const FILES = [
  'stoa001/stoa0058.stoa001.perseus-lat2.xml',
  'stoa001/stoa0058.stoa001.perseus-eng1.xml',
  'stoa003/stoa0058.stoa003.perseus-lat1.xml',
  'stoa003/stoa0058.stoa003.perseus-eng1.xml',
  'stoa006/stoa0058.stoa006.perseus-lat1.xml',
  'stoa006/stoa0058.stoa006.perseus-eng1.xml',
  'stoa023/stoa0058.stoa023.perseus-lat1.xml',
  'stoa023/stoa0058.stoa023.perseus-eng1.xml',
  'stoa025/stoa0058.stoa025.perseus-lat1.xml',
  'stoa025/stoa0058.stoa025.perseus-eng1.xml',
  'stoa028/stoa0058.stoa028.perseus-lat1.xml',
  'stoa028/stoa0058.stoa028.perseus-eng1.xml',
];

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

async function fetchOnce(url: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= 8; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status === 503) {
      const wait = 5000 * attempt;
      process.stdout.write(`  HTTP ${res.status}, backing off ${wait}ms (attempt ${attempt}/8) ...\n`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`gave up on ${url} after repeated 429/503`);
}

async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  let fetched = 0;
  let skipped = 0;
  for (const rel of FILES) {
    const out = join(RAW_DIR, rel.split('/').pop()!);
    if (existsSync(out)) {
      skipped += 1;
      continue;
    }
    const url = `${BASE}/${rel}`;
    process.stdout.write(`fetching ${rel} ...\n`);
    const buf = await fetchOnce(url);
    writeFileSync(out, buf);
    process.stdout.write(`  saved ${buf.length} bytes\n`);
    fetched += 1;
    await sleep(3000);
  }
  process.stdout.write(`\nDone. ${fetched} fetched, ${skipped} already cached, ${FILES.length} total.\n`);
}

main().catch((err) => {
  process.stderr.write(`STOP: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
