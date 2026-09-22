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
  'part-suppl.json',
  'suppl-anomalies.json',
];

// The English Summa: soft, unlike its Latin counterpart above — a much
// larger, more recent addition, so a missing file here is a warning, not a
// build failure.
const SUMMA_EN_DIR = 'summa-en';
const SUMMA_EN_FILES = [
  'part-I.json',
  'part-I-II.json',
  'part-II-II.json',
  'part-III.json',
  'part-suppl.json',
  'anomalies.json',
];

// Generic works: soft. A parallel task may not have landed these yet, so a
// missing file is a WARNING, not a failure.
const GENERIC_DIRS = [
  'isagoge-grc',
  'isagoge-la',
  'categoriae-grc',
  'categoriae-la',
  'de-interpretatione-grc',
  'de-interpretatione-la',
  'euclid-elements',
  'euclid-elements-en',
  'archimedes-sphere-cylinder',
  'archimedes-measurement-circle',
  'archimedes-conoids-spheroids',
  'archimedes-spirals',
  'archimedes-plane-equilibrium',
  'archimedes-sand-reckoner',
  'archimedes-quadrature-parabola',
  'archimedes-floating-bodies',
  'archimedes-stomachion',
  'archimedes-method',
  'archimedes-liber-assumptorum',
  'archimedes-cattle-problem',
  'archimedes-fragments',
  'categoriae-en',
  'de-interpretatione-en',
  'isagoge-en',
  'augustine-confessions-la',
  'augustine-confessions-en',
  'augustine-city-of-god-la',
  'augustine-city-of-god-en',
  'augustine-christian-doctrine-la',
  'augustine-christian-doctrine-en',
  'iliad-grc',
  'iliad-en',
  'odyssey-grc',
  'odyssey-en',
  'theogony-grc',
  'theogony-en',
  'works-and-days-grc',
  'works-and-days-en',
  'shield-of-heracles-grc',
  'shield-of-heracles-en',
  'aeneid-la',
  'aeneid-en',
  'plato-euthyphro-grc',
  'plato-euthyphro-en',
  'plato-apology-grc',
  'plato-apology-en',
  'plato-crito-grc',
  'plato-crito-en',
  'plato-phaedo-grc',
  'plato-phaedo-en',
  'plato-symposium-grc',
  'plato-symposium-en',
  'plato-phaedrus-grc',
  'plato-phaedrus-en',
  'plato-protagoras-grc',
  'plato-protagoras-en',
  'plato-gorgias-grc',
  'plato-gorgias-en',
  'plato-meno-grc',
  'plato-meno-en',
  'plato-ion-grc',
  'plato-ion-en',
  'plato-timaeus-grc',
  'plato-timaeus-en',
  'plato-laws-grc',
  'plato-laws-en',
  'plato-republic-grc',
  'plato-republic-en',
  'physics-grc',
  'metaphysics-grc',
  'metaphysics-en',
  'posterior-analytics-grc',
  'posterior-analytics-en',
  'nicomachean-ethics-grc',
  'nicomachean-ethics-en',
  'pro-archia-la',
  'pro-archia-en',
  'pro-roscio-amerino-la',
  'pro-roscio-amerino-en',
  'pro-caelio-la',
  'in-catilinam-la',
  'in-catilinam-en',
  'philippics-la',
  'philippics-en',
  'in-verrem-la',
  'in-verrem-en',
  'pro-sestio-la',
  'pro-milone-la',
  'pro-marcello-la',
  'pro-ligario-la',
  'de-oratore-la',
  'brutus-la',
  'brutus-en',
  'orator-la',
  'orator-en',
  'de-republica-la',
  'de-legibus-la',
  'de-officiis-la',
  'de-officiis-en',
  'de-finibus-la',
  'de-finibus-en',
  'tusculan-disputations-la',
  'tusculan-disputations-en',
  'de-natura-deorum-la',
  'de-natura-deorum-en',
  'de-divinatione-la',
  'de-divinatione-en',
  'de-amicitia-la',
  'de-amicitia-en',
  'de-senectute-la',
  'de-senectute-en',
  'ad-atticum-selection-la',
  'ad-atticum-selection-en',
  'ad-familiares-selection-la',
  'ad-familiares-selection-en',
  'ad-quintum-fratrem-selection-la',
  'ad-quintum-fratrem-selection-en',
  'ad-brutum-selection-la',
  'ad-brutum-selection-en',
];
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

/**
 * Copy a work's optional `images/` subdirectory (real diagram/plate assets
 * referenced by a passage's `figure.image`) whole. Soft: most works have no
 * images directory yet, so a missing one is silent, not even a warning.
 */
function copyImagesDir(dir) {
  const from = join(dataRoot, dir, 'images');
  const to = join(publicRoot, dir, 'images');
  let files;
  try {
    files = readdirSync(from);
  } catch {
    return;
  }
  mkdirSync(to, { recursive: true });
  for (const file of files) {
    cpSync(join(from, file), join(to, file));
    bytes += statSync(join(to, file)).size;
    copied += 1;
  }
}

mkdirSync(join(publicRoot, SUMMA_DIR), { recursive: true });
for (const name of SUMMA_FILES) copyOne(SUMMA_DIR, name, true);
for (const name of SUMMA_EN_FILES) copyOne(SUMMA_EN_DIR, name, false);
for (const dir of GENERIC_DIRS) {
  for (const name of GENERIC_FILES) copyOne(dir, name, false);
  copyImagesDir(dir);
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
