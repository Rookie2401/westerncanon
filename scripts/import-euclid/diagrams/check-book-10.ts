/**
 * Asserts that every image referenced by DIAGRAMS_BOOK_10 (book-10.ts)
 * actually exists under data/euclid-elements/images/ and that its real pixel
 * dimensions match the width/height recorded in the map exactly.
 *
 * Run-once verification script, not part of the Euclid importer itself and
 * not wired into `npm run import:euclid` / `npm run validate:euclid` - this
 * only checks the Book X diagram sourcing work done in this directory.
 *
 *   npx tsx scripts/import-euclid/diagrams/check-book-10.ts
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp, { type Metadata } from 'sharp';
import { DIAGRAMS_BOOK_10 } from './book-10.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const IMAGES_DIR = join(REPO_ROOT, 'data', 'euclid-elements', 'images');

function fail(message: string): never {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exitCode = 1;
  throw new Error(message);
}

async function main(): Promise<void> {
  const leafIds = Object.keys(DIAGRAMS_BOOK_10);
  let totalImages = 0;
  let ok = 0;
  const problems: string[] = [];

  for (const leafId of leafIds) {
    const entries = DIAGRAMS_BOOK_10[leafId]!;
    if (entries.length === 0) {
      problems.push(`${leafId}: empty array (should be omitted from the map entirely if there's no image)`);
      continue;
    }
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      totalImages += 1;
      const label = entries.length > 1 ? `${leafId}[${i}] (${entry.image})` : `${leafId} (${entry.image})`;

      if (!entry.image.startsWith('images/')) {
        problems.push(`${label}: image path should start with "images/"`);
        continue;
      }
      const abs = join(IMAGES_DIR, entry.image.slice('images/'.length));
      if (!existsSync(abs)) {
        problems.push(`${label}: file does not exist at ${abs}`);
        continue;
      }
      let meta: Metadata;
      try {
        meta = await sharp(abs).metadata();
      } catch (e) {
        problems.push(`${label}: sharp failed to read image - ${(e as Error).message}`);
        continue;
      }
      if (meta.width !== entry.width || meta.height !== entry.height) {
        problems.push(
          `${label}: recorded size ${entry.width}x${entry.height} does not match actual ${meta.width}x${meta.height}`,
        );
        continue;
      }
      if (meta.format !== 'png') {
        problems.push(`${label}: expected PNG, got ${meta.format}`);
        continue;
      }
      if (!meta.hasAlpha) {
        problems.push(`${label}: expected an alpha channel (transparent background), image has none`);
        continue;
      }
      if (!entry.source || entry.source.trim().length === 0) {
        problems.push(`${label}: missing source citation`);
        continue;
      }
      ok += 1;
    }
  }

  process.stdout.write(`Checked ${leafIds.length} leaf id(s), ${totalImages} image(s): ${ok} OK, ${problems.length} problem(s).\n`);
  if (problems.length > 0) {
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    fail(`${problems.length} image(s) failed verification`);
  }
  process.stdout.write('All Book X diagram images verified against DIAGRAMS_BOOK_10.\n');
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).message}\n`);
  process.exitCode = 1;
});
