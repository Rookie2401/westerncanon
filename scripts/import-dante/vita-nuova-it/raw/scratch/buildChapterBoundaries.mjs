/**
 * One-off helper (NOT part of the shipped importer): walks
 * raw/corrected-pages.json in djvu order, splitting on the
 * "###CHAPTER-BREAK:N###" markers embedded in each page's text (chapter 1
 * has no marker - it simply starts at page 307, the first page in range),
 * to produce raw/chapter-boundaries.json: an array of
 * {chapter, startPage, startsAtPageTop} for each of the 42 chapters, plus a
 * sanity check that all 42 are found in order 1..42 with no gaps.
 *
 * Run once: node raw/scratch/buildChapterBoundaries.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, '..');

const pages = JSON.parse(readFileSync(join(RAW_DIR, 'corrected-pages.json'), 'utf8'));

const boundaries = [{ chapter: 1, startPage: 307, startsAtPageTop: true }];
let seenChapters = [1];

for (const { page, text } of pages) {
  if (!text) continue;
  const re = /###CHAPTER-BREAK:(\d+)###/g;
  let m;
  let firstMatchIdx = null;
  while ((m = re.exec(text))) {
    const chapter = Number(m[1]);
    if (firstMatchIdx === null) firstMatchIdx = m.index;
    boundaries.push({ chapter, startPage: page, startsAtPageTop: m.index === 0 });
    seenChapters.push(chapter);
  }
}

const expected = Array.from({ length: 42 }, (_, i) => i + 1);
const ok = seenChapters.length === 42 && seenChapters.every((c, i) => c === expected[i]);
if (!ok) {
  console.error('STOP: chapter sequence mismatch');
  console.error('found:', seenChapters.join(','));
  process.exit(1);
}

writeFileSync(join(RAW_DIR, 'chapter-boundaries.json'), JSON.stringify(boundaries, null, 2) + '\n', 'utf8');
process.stdout.write(`OK: 42 chapters found in order. Boundaries:\n`);
for (const b of boundaries) process.stdout.write(`  ch-${b.chapter}: page ${b.startPage}${b.startsAtPageTop ? ' (top)' : ' (mid-page)'}\n`);
