/**
 * Verifies every image referenced by DIAGRAMS_BOOKS_11_13 (books-11-13.ts)
 * actually exists on disk under data/euclid-elements/ and has exactly the
 * width/height recorded in the map. Run with:
 *
 *   npx tsx scripts/import-euclid/diagrams/check-books-11-13.ts
 *
 * Exits non-zero and prints every failure (never stops at the first one) so
 * a single run surfaces the whole picture. Read-only - never edits images,
 * never touches work.json/about.json/anomalies.json, and does not run the
 * main Euclid importer.
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DIAGRAMS_BOOKS_11_13 } from './books-11-13.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const DATA_DIR = join(REPO_ROOT, 'data', 'euclid-elements');

function fail(message: string): void {
  process.stderr.write(`FAIL: ${message}\n`);
  failures += 1;
}

let failures = 0;
let checked = 0;

async function main(): Promise<void> {
  const leafIds = Object.keys(DIAGRAMS_BOOKS_11_13);
  if (leafIds.length === 0) fail('DIAGRAMS_BOOKS_11_13 is empty');

  // every image path referenced more than once (e.g. repeat-last-entry
  // markers) should only be verified once, but every array entry's
  // recorded width/height must still match - so we check per-entry, not
  // per-unique-path.
  for (const leafId of leafIds) {
    const entries = DIAGRAMS_BOOKS_11_13[leafId]!;
    if (entries.length === 0) {
      fail(`${leafId}: empty diagrams array (should either be omitted or have >=1 entry)`);
      continue;
    }
    entries.forEach((entry, i) => {
      checked += 1;
      const marker = entries.length > 1 ? ` (marker ${i + 1} of ${entries.length})` : '';
      const filePath = join(DATA_DIR, entry.image);
      if (!existsSync(filePath)) {
        fail(`${leafId}${marker}: missing file ${entry.image}`);
        return;
      }
      const stat = statSync(filePath);
      if (stat.size === 0) {
        fail(`${leafId}${marker}: ${entry.image} is a zero-byte file`);
        return;
      }
      if (!entry.source || entry.source.trim().length === 0) {
        fail(`${leafId}${marker}: ${entry.image} has no source citation`);
      }
    });
  }

  // width/height verification needs sharp (async); do it as a second pass
  // so the synchronous existence checks above always run in full first.
  for (const leafId of leafIds) {
    const entries = DIAGRAMS_BOOKS_11_13[leafId]!;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const marker = entries.length > 1 ? ` (marker ${i + 1} of ${entries.length})` : '';
      const filePath = join(DATA_DIR, entry.image);
      if (!existsSync(filePath)) continue; // already reported above
      let meta;
      try {
        meta = await sharp(filePath).metadata();
      } catch (e) {
        fail(`${leafId}${marker}: ${entry.image} could not be read by sharp (${(e as Error).message})`);
        continue;
      }
      if (meta.width !== entry.width || meta.height !== entry.height) {
        fail(
          `${leafId}${marker}: ${entry.image} is ${meta.width}x${meta.height}, ` +
            `map says ${entry.width}x${entry.height}`,
        );
      }
      if (!meta.hasAlpha) {
        fail(`${leafId}${marker}: ${entry.image} has no alpha channel (should be transparent PNG)`);
      }
    }
  }

  // book-4-prop-16 is the one Book I-IV correction bundled in this file;
  // make sure it didn't silently vanish from the map.
  if (!DIAGRAMS_BOOKS_11_13['book-4-prop-16']) {
    fail("'book-4-prop-16' entry (the Book IV.16 diagram correction) is missing from the map");
  }

  // book-13-prop-4 must NEVER appear - it has no <figure/> marker in the
  // transcription to attach an image to (see books-11-13.ts header comment
  // and the report), even though a diagram is genuinely printed for it.
  if (DIAGRAMS_BOOKS_11_13['book-13-prop-4']) {
    fail("'book-13-prop-4' should NOT be in the map (no <figure/> marker exists for it - see report)");
  }

  process.stdout.write(`\nChecked ${checked} diagram entries across ${leafIds.length} leaf ids.\n`);
  if (failures > 0) {
    process.stderr.write(`\n${failures} failure(s).\n`);
    process.exit(1);
  }
  process.stdout.write('All good.\n');
}

main();
