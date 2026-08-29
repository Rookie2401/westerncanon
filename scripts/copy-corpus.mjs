// Copy the generated, committed corpus JSON from data/summa/ into public/summa/
// so Vite serves it at ${BASE_URL}summa/*.json and Workbox precaches it into
// dist/ for full offline use. The app fetches these at runtime (same-origin);
// it never hits the network for anything else.
//
// This is build glue only. It does not read or modify the import pipeline and
// never regenerates the corpus — data/summa/*.json is treated as read-only input.
// Wired as `predev` + `prebuild` (and runnable directly via `npm run copy-corpus`).

import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'data', 'summa');
const outDir = join(root, 'public', 'summa');

const WANTED = [
  'index.json',
  'prooemium.json',
  'gaps.json',
  'search-index.json',
  'part-I.json',
  'part-I-II.json',
  'part-II-II.json',
  'part-III.json',
];

mkdirSync(outDir, { recursive: true });

let copied = 0;
let bytes = 0;
for (const name of WANTED) {
  const from = join(srcDir, name);
  const to = join(outDir, name);
  try {
    cpSync(from, to);
    bytes += statSync(to).size;
    copied += 1;
  } catch (err) {
    console.error(`[copy-corpus] FAILED to copy ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

const present = readdirSync(outDir).filter((f) => f.endsWith('.json'));
console.log(
  `[copy-corpus] ${copied}/${WANTED.length} files -> public/summa/ ` +
    `(${(bytes / 1024 / 1024).toFixed(1)} MB). Present: ${present.join(', ')}`,
);

if (copied !== WANTED.length) {
  process.exit(1);
}
