/**
 * Asserts every image referenced by DIAGRAMS_BOOKS_5_9 (scripts/import-euclid/
 * diagrams/books-5-9.ts) exists on disk under data/euclid-elements/ and has
 * exactly the width/height recorded in the map. Run with:
 *
 *   npx tsx scripts/import-euclid/diagrams/check-books-5-9.ts
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp, { type Metadata } from 'sharp';
import { DIAGRAMS_BOOKS_5_9 } from './books-5-9.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', '..', 'data', 'euclid-elements');

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const leafIds = Object.keys(DIAGRAMS_BOOKS_5_9);
  let totalImages = 0;
  const errors: string[] = [];
  const seenFiles = new Set<string>();

  for (const leafId of leafIds) {
    const entries = DIAGRAMS_BOOKS_5_9[leafId]!;
    if (entries.length === 0) {
      errors.push(`${leafId}: empty array (should be omitted entirely if there is no diagram)`);
      continue;
    }
    for (const entry of entries) {
      totalImages += 1;
      const relPath = entry.image;
      if (!relPath.startsWith('images/') || !relPath.endsWith('.png')) {
        errors.push(`${leafId}: unexpected image path "${relPath}" (expected images/*.png)`);
        continue;
      }
      if (seenFiles.has(relPath)) {
        errors.push(`${leafId}: image "${relPath}" is referenced more than once across the map`);
      }
      seenFiles.add(relPath);

      const absPath = join(DATA_DIR, relPath);
      if (!existsSync(absPath)) {
        errors.push(`${leafId}: missing file ${relPath} (expected at ${absPath})`);
        continue;
      }
      const stat = statSync(absPath);
      if (stat.size === 0) {
        errors.push(`${leafId}: ${relPath} is a zero-byte file`);
        continue;
      }

      let meta: Metadata;
      try {
        meta = await sharp(absPath).metadata();
      } catch (e) {
        errors.push(`${leafId}: ${relPath} could not be read as an image (${(e as Error).message})`);
        continue;
      }
      if (meta.format !== 'png') {
        errors.push(`${leafId}: ${relPath} is not a PNG (got "${meta.format}")`);
      }
      if (!meta.hasAlpha) {
        errors.push(`${leafId}: ${relPath} has no alpha channel (expected black-ink-on-transparent)`);
      }
      if (meta.width !== entry.width || meta.height !== entry.height) {
        errors.push(
          `${leafId}: ${relPath} is ${meta.width}x${meta.height}px, but the map records ` +
            `${entry.width}x${entry.height}px`,
        );
      }
      if (!entry.source || entry.source.trim().length === 0) {
        errors.push(`${leafId}: ${relPath} has an empty source citation`);
      }
    }
  }

  if (errors.length > 0) {
    process.stderr.write(`${errors.length} problem(s) found:\n`);
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    fail(`check-books-5-9 failed (${errors.length} problem(s))`);
  }

  process.stdout.write(
    `OK: ${leafIds.length} leaf divisions, ${totalImages} images, all present on disk with matching ` +
      `dimensions and alpha channel.\n`,
  );
}

main();
