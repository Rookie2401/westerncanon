// Copy the generated, committed corpus JSON from data/ into public/ so Vite
// serves it at ${BASE_URL}<dir>/*.json and Workbox precaches it into dist/ for
// full offline use. The app fetches these at runtime (same-origin); it never
// hits the network for anything else.
//
// This is build glue only. It does not read or modify any import pipeline and
// never regenerates a corpus — data/**/*.json is treated as read-only input.
// Wired as `predev` + `prebuild` (and runnable directly via `npm run copy-corpus`).

import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dataRoot = join(root, 'data');
const publicRoot = join(root, 'public');

// The Summa: hard-required. A missing file here fails the build.
const SUMMA_DIR = 'summa';
const SUMMA_FILES = [
  'index.json',
  'prooemium.json',
  'gaps.json',
  'search-index.json',
  'part-I.json',
  'part-I-II.json',
  'part-II-II.json',
  'part-III.json',
];

// Generic works: soft. A parallel task may not have landed these yet, so a
// missing file is a WARNING, not a failure.
const GENERIC_DIRS = ['isagoge-grc', 'isagoge-la'];
const GENERIC_FILES = ['work.json', 'about.json'];

let hardFailures = 0;
let copied = 0;
let bytes = 0;

/** @param {string} dir @param {string} name @param {boolean} required */
function copyOne(dir, name, required) {
  const from = join(dataRoot, dir, name);
  const to = join(publicRoot, dir, name);
  try {
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
    bytes += statSync(to).size;
    copied += 1;
  } catch (err) {
    if (required) {
      console.error(`[copy-corpus] FAILED to copy ${dir}/${name}: ${err.message}`);
      hardFailures += 1;
      process.exitCode = 1;
    } else {
      console.warn(
        `[copy-corpus] skipped ${dir}/${name} (not present yet): ${err.message}`,
      );
    }
  }
}

mkdirSync(join(publicRoot, SUMMA_DIR), { recursive: true });
for (const name of SUMMA_FILES) copyOne(SUMMA_DIR, name, true);
for (const dir of GENERIC_DIRS) {
  for (const name of GENERIC_FILES) copyOne(dir, name, false);
}

const summaPresent = readdirSync(join(publicRoot, SUMMA_DIR)).filter((f) =>
  f.endsWith('.json'),
);
console.log(
  `[copy-corpus] ${copied} files copied into public/ ` +
    `(${(bytes / 1024 / 1024).toFixed(1)} MB). ` +
    `Summa present: ${summaPresent.join(', ')}`,
);

if (hardFailures > 0) process.exit(1);
