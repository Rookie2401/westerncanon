/**
 * Shared paragraph/verse-block splitting used by this Dante batch's English
 * prose-with-embedded-verse importers (Vita Nuova, Convivio, De Monarchia).
 *
 * A run of lines bounded by blank lines is one "block". A block is VERSE
 * when any of its own continuation lines (2nd line onward) carries the
 * print's hanging indent (4+ leading spaces) - the same convention used by
 * this batch's Commedia import - and its lines are kept one-per-line,
 * joined by "\n", each trimmed of that hanging indent. Otherwise the block
 * is PROSE and its print-width-wrapped lines are joined with a single space.
 */

import { cleanText } from './text.ts';

export function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (cur.length > 0) blocks.push(cur);
      cur = [];
      continue;
    }
    cur.push(line);
  }
  if (cur.length > 0) blocks.push(cur);
  return blocks;
}

export function isVerseBlock(block: string[]): boolean {
  return block.length > 1 && block.slice(1).some((l) => /^ {4,}\S/.test(l));
}

/** Render one block to its Passage-ready text, stripping italic-markup underscores. */
export function renderBlock(block: string[]): string {
  const noItalics = block.map((l) => l.replace(/_/g, ''));
  if (isVerseBlock(block)) {
    return noItalics.map((l) => cleanText(l)).join('\n');
  }
  return cleanText(noItalics.join(' '));
}
