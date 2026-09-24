// One-off dev helper (not part of the importer): splits oxford-pages.json
// (per-leaf OCR text extracted from the djvu.xml HIDDENTEXT layer) into
// individual raw/ocr/pNNN.txt files keyed by PRINTED page number, using the
// leaf offset confirmed by direct image inspection: printed page 341 =
// djvu.xml leaf 41 ... printed page 376 = djvu.xml leaf 76 (leaf N's own
// HIDDENTEXT is one page "behind" the page images actually served at IIIF
// canvas $N, a discovered quirk of this archive.org item's derivation
// pipeline). Written once to help build the corrections/*.json files by
// hand; the importer itself (index.ts) reads oxford-pages.json directly.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const pages = JSON.parse(readFileSync(join(HERE, 'oxford-pages.json'), 'utf8'));
mkdirSync(join(HERE, 'ocr'), { recursive: true });

for (let printedPage = 341; printedPage <= 376; printedPage++) {
  const leaf = printedPage - 300; // 341 -> 41 ... 376 -> 76
  const p = pages.find((x) => x.leaf === leaf);
  if (!p) {
    console.error('MISSING leaf', leaf, 'for page', printedPage);
    continue;
  }
  writeFileSync(join(HERE, 'ocr', `p${printedPage}.txt`), p.text, 'utf8');
}
console.log('done');
