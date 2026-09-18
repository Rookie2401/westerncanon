/**
 * One-time fetch step for the English Summa Theologiae (trans. Fathers of
 * the English Dominican Province, 2nd/revised ed. 1920), hosted at
 * newadvent.org.
 *
 *   npx tsx scripts/import-summa-en/fetch.ts
 *
 * URL pattern: https://www.newadvent.org/summa/{partDigit}{qNum:03d}.htm
 *   1 = Prima Pars        (1001..1119, 119 questions)
 *   2 = Prima Secundae    (2001..2114, 114 questions)
 *   3 = Secunda Secundae  (3001..3189, 189 questions)
 *   4 = Tertia Pars       (4001..4090,  90 questions)
 *   5 = Supplementum      (5001..5099,  99 questions)
 * plus 3 appendix pages: 6001.htm, 6002.htm (Appendix I, 2 questions) and
 * 7001.htm (Appendix II, 1 question) — 614 pages total.
 *
 * Every page is ONE Question; all its Articles live on that single page
 * (anchored by #articleN), so there is no separate per-article fetch.
 *
 * Idempotent/resumable: a page whose cache file already exists is never
 * re-fetched, so re-running after an interruption just picks up where it
 * left off. Raw HTML is cached verbatim (not re-encoded) under raw/, one
 * file per page, so the parser (index.ts) never needs the network.
 *
 * Polite fetching: this is a small public site, not a CDN — User-Agent
 * Mozilla/5.0, 20s timeout, at most 1 retry per page, ~150-250ms delay
 * between requests.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, 'raw');

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const jitter = () => 150 + Math.floor(Math.random() * 100); // 150-250ms

interface Job {
  file: string;
  url: string;
  label: string;
}

const PART_DIGITS: { digit: string; count: number }[] = [
  { digit: '1', count: 119 }, // Prima Pars
  { digit: '2', count: 114 }, // Prima Secundae
  { digit: '3', count: 189 }, // Secunda Secundae
  { digit: '4', count: 90 }, // Tertia Pars
  { digit: '5', count: 99 }, // Supplementum
];

function buildJobs(): Job[] {
  const jobs: Job[] = [];
  for (const { digit, count } of PART_DIGITS) {
    for (let q = 1; q <= count; q++) {
      const qStr = String(q).padStart(3, '0');
      const slug = `${digit}${qStr}`;
      jobs.push({ file: `${slug}.html`, url: `https://www.newadvent.org/summa/${slug}.htm`, label: slug });
    }
  }
  jobs.push({ file: 'appendix-1-1.html', url: 'https://www.newadvent.org/summa/6001.htm', label: 'appendix-1-1 (6001)' });
  jobs.push({ file: 'appendix-1-2.html', url: 'https://www.newadvent.org/summa/6002.htm', label: 'appendix-1-2 (6002)' });
  jobs.push({ file: 'appendix-2-1.html', url: 'https://www.newadvent.org/summa/7001.htm', label: 'appendix-2-1 (7001)' });
  return jobs;
}

async function fetchOnce(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (summa-app-importer; offline PWA corpus build)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string): Promise<string> {
  try {
    return await fetchOnce(url);
  } catch (err) {
    process.stdout.write(`  retrying ${url} after error: ${err instanceof Error ? err.message : String(err)}\n`);
    await sleep(1500);
    return fetchOnce(url);
  }
}

async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  const jobs = buildJobs();
  process.stdout.write(`${jobs.length} pages total.\n`);

  let fetched = 0;
  let skipped = 0;
  for (const job of jobs) {
    const file = join(RAW_DIR, job.file);
    if (existsSync(file)) {
      skipped += 1;
      continue;
    }
    const html = await fetchWithRetry(job.url);
    if (!html || html.length < 500) {
      throw new Error(`STOP: suspiciously short/empty response for ${job.url} (${html.length} bytes)`);
    }
    writeFileSync(file, html, 'utf8');
    fetched += 1;
    if ((fetched + skipped) % 25 === 0 || fetched + skipped === jobs.length) {
      process.stdout.write(`  progress: ${fetched + skipped}/${jobs.length} (${fetched} fetched this run, ${skipped} from cache)\n`);
    }
    await sleep(jitter());
  }
  process.stdout.write(`\nDone. ${fetched} fetched, ${skipped} already cached, ${jobs.length} total.\n`);
}

main().catch((err) => {
  process.stderr.write(`STOP: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
