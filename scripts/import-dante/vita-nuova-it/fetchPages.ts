/**
 * One-off fetch helper: pulls the raw wikitext of Page:Vita nuova.djvu/307
 * through /409 (the djvu pages spanning the Vita Nuova text itself, per
 * Indice:Vita nuova.djvu's own page-range table) via MediaWiki's
 * action=query&prop=revisions, batched up to 50 titles per request (3
 * requests total) with a >=3s gap between requests per this repo's
 * Wikisource rate-limit rule. Writes raw/pages-307-409.json (an array of
 * {title, content}), then this script is not run again - the importer
 * reads the cached file.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = 'summa-app-dante-import/1.0 (offline PWA classical-texts reader; contact: cjwalker117@outlook.com)';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBatch(titles: string[]): Promise<Array<{ title: string; content: string }>> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvslots: 'main',
    rvprop: 'content',
    titles: titles.join('|'),
    format: 'json',
  });
  const res = await fetch(`https://it.wikisource.org/w/api.php?${params.toString()}`, { headers: { 'User-Agent': UA } });
  const json = (await res.json()) as { query: { pages: Record<string, { title: string; revisions?: Array<{ slots: { main: { '*': string } } }> }> } };
  const out: Array<{ title: string; content: string }> = [];
  for (const page of Object.values(json.query.pages)) {
    out.push({ title: page.title, content: page.revisions?.[0]?.slots.main['*'] ?? '' });
  }
  return out;
}

async function main(): Promise<void> {
  const titles: string[] = [];
  for (let i = 307; i <= 409; i++) titles.push(`Page:Vita nuova.djvu/${i}`);
  const batches: string[][] = [];
  for (let i = 0; i < titles.length; i += 50) batches.push(titles.slice(i, i + 50));

  const all: Array<{ title: string; content: string }> = [];
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(3000);
    const got = await fetchBatch(batches[i]!);
    all.push(...got);
    process.stdout.write(`batch ${i + 1}/${batches.length}: ${got.length} pages\n`);
  }
  writeFileSync(join(HERE, 'raw', 'pages-307-409.json'), JSON.stringify(all, null, 2), 'utf8');
  process.stdout.write(`wrote ${all.length} pages\n`);
}

main();
