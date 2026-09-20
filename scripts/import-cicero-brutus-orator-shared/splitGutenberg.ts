/**
 * Shared Gutenberg fetch/split/clean logic for the two English editions
 * that come from ONE shared plain-text file:
 *   scripts/import-brutus-en  (Cicero, Brutus, trans. E. Jones, 1776)
 *   scripts/import-orator-en  (Cicero, Orator, trans. E. Jones, 1776)
 *
 * Source: Project Gutenberg ebook #9776, "Cicero's Brutus, or History of
 * Famous Orators; also His Orator, or Accomplished Speaker", trans. E.
 * Jones (London: B. White, 1776) - fetched once from
 * https://www.gutenberg.org/cache/epub/9776/pg9776.txt and committed at
 * scripts/import-cicero-brutus-orator-shared/raw/pg9776.txt; nothing is
 * downloaded at import time.
 *
 * Facts about this source, confirmed by reading the ENTIRE file directly
 * before writing this module (not assumed from the task brief):
 *
 *   - Gutenberg boilerplate: standard START/END markers
 *     ("*** START OF THE PROJECT GUTENBERG EBOOK ... ***" /
 *     "*** END OF THE PROJECT GUTENBERG EBOOK ... ***"); the license text
 *     and metadata block sit entirely outside them.
 *   - Between those markers, in order: (1) a title-page block, (2) E.
 *     Jones's own "PREFACE." (his translator's preface, describing BOTH
 *     works - not part of either work's translated text, excluded from
 *     both editions), (3) Brutus's own heading "BRUTUS, OR THE HISTORY OF
 *     ELOQUENCE.", (4) Brutus's full translated text, ending
 *     mid-sentence at the bracketed note "[_Caetera defunt._]" (Jones's
 *     own marker matching the Latin manuscript's own lacuna at this exact
 *     point - kept, not apparatus), (5) a second title-page block for
 *     Orator ("THE ORATOR, BY MARCUS TULLIUS CICERO; ... " plus a Milton
 *     epigraph - excluded as front matter, same treatment as (1)), (6)
 *     Orator's own heading "THE ORATOR." (a standalone line ending in a
 *     period - distinct from the title-page line "THE ORATOR," which ends
 *     in a comma, so a regex anchored on the period picks out the real
 *     heading unambiguously), (7) Orator's full translated text, ending at
 *     its natural closing paragraph ("Thus, my Brutus, I have given you my
 *     opinion of a complete Orator...").
 *   - Jones's translation prints NO chapter/section numbers of any kind in
 *     either work (verified: no Roman numerals, no bracketed numbers
 *     anywhere in the real text of either work - the ONLY structural
 *     device found is a single decorative type ornament, a row of
 *     asterisks, right before Orator's closing paragraph; not a general
 *     section-break convention, so not used as one - see
 *     data/brutus-en/types.ts and data/orator-en/types.ts for the
 *     resulting "handful of large sequential sections" chunking scheme).
 *   - 38 "[Footnote: ...]" (one instance spelled lower-case
 *     "[footnote:") translator/transcriber footnotes are embedded inline,
 *     bracket-delimited (with possible nested brackets, e.g. a
 *     "[Greek: ...]" transliteration marker inside a footnote) - Jones's
 *     own explanatory asides (glossing a name, a Greek term, a textual
 *     point), not part of his translated running text. Stripped entirely
 *     (bracket-depth-aware, so a nested "[...]" is handled correctly; 2 of
 *     the 38 spans a paragraph's blank-line break internally, so this
 *     runs on the whole undivided body, before paragraph splitting).
 *   - Other, non-footnote, square-bracket text (e.g.
 *     "[which he had deduced from certain imaginary ill consequences to
 *     the Public]", "[where he lately died]", "[_Caetera defunt._]", and
 *     six "[Greek: WORD]" transliteration markers standing in for
 *     untranslated Greek script the plain-text file cannot render) is
 *     Jones's own bracketed text or Gutenberg's own transliteration
 *     convention for real Greek words - genuine content, kept verbatim.
 *   - Gutenberg's plain-text convention wraps italicised words in a pair
 *     of underscores (e.g. "_Civil War_"); this schema has no rich-text
 *     field, so every underscore character is stripped (2,235 in the
 *     combined real-text region after footnote removal - one instance is
 *     a doubled "__metaphorical_" transcription glitch, normalised away
 *     the same way as every other underscore since only the markup
 *     character is removed, never a letter of the word itself).
 *   - Hard line-wrapping: a paragraph's lines are normally joined with a
 *     single space, EXCEPT when a line ends in one-or-more literal "-"
 *     characters (either a genuine compound-word hyphen that happens to
 *     fall at the wrap point, e.g. "fellow-\ncitizens", or Jones's em-dash
 *     convention "--", always printed with no following space, e.g.
 *     "them:--but") - those join with NO space, confirmed by checking
 *     every one of the 41 hyphen-final-line cases in the source by hand
 *     before writing this module.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RAW_TXT = join(HERE, 'raw', 'pg9776.txt');

const START_MARKER =
  "*** START OF THE PROJECT GUTENBERG EBOOK CICERO'S BRUTUS OR HISTORY OF FAMOUS ORATORS; ALSO HIS ORATOR, OR ACCOMPLISHED SPEAKER. ***";
const END_MARKER =
  "*** END OF THE PROJECT GUTENBERG EBOOK CICERO'S BRUTUS OR HISTORY OF FAMOUS ORATORS; ALSO HIS ORATOR, OR ACCOMPLISHED SPEAKER. ***";
const BRUTUS_HEADING = 'BRUTUS, OR THE HISTORY OF ELOQUENCE.';
const CAETERA_DEFUNT = '[_Caetera defunt._]';
/** The real Orator heading: standalone line, ends in a period (the title-page line ends in a comma, so this regex never matches it). */
const ORATOR_HEADING_RE = /^THE ORATOR\.[ \t]*$/m;

export interface FootnoteStripResult {
  out: string;
  count: number;
}

/** Bracket-depth-aware removal of every `[Footnote: ...]` / `[footnote: ...]` span (handles nested brackets, e.g. a Greek-transliteration marker inside a footnote). */
export function stripFootnotes(input: string): FootnoteStripResult {
  let out = '';
  let i = 0;
  let count = 0;
  const openerRe = /\[footnote:/i;
  while (i < input.length) {
    const rel = input.slice(i).search(openerRe);
    if (rel === -1) {
      out += input.slice(i);
      break;
    }
    const abs = i + rel;
    out += input.slice(i, abs);
    let depth = 0;
    let j = abs;
    for (; j < input.length; j++) {
      if (input[j] === '[') depth++;
      else if (input[j] === ']') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    count += 1;
    i = j;
  }
  return { out, count };
}

/** Strip every underscore character (Gutenberg's plain-text italic-markup convention; no rich-text field in this schema). Returns the count removed. */
export function stripItalicUnderscores(input: string): { out: string; count: number } {
  const count = (input.match(/_/g) ?? []).length;
  return { out: input.replace(/_/g, ''), count };
}

/**
 * Join a hard-wrapped paragraph block's lines into one line. A line ending
 * in one-or-more "-" (compound-word hyphen or Jones's no-space em-dash "--")
 * joins directly to the next line with NO inserted space; every other line
 * joins with a single space. (See module doc: verified against every
 * hyphen-final-line case in this source.)
 */
export function unwrapHardWrap(block: string): string {
  const lines = block.split(/\r?\n/);
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (i === 0) {
      out = line;
      continue;
    }
    if (/-$/.test(lines[i - 1]!)) {
      out += line;
    } else {
      out += ' ' + line;
    }
  }
  return out;
}

export interface ParagraphSplitResult {
  paragraphs: string[];
  ornamentsDropped: number;
}

/** Splits a chunk of cleaned Gutenberg plain text into paragraphs (blank-line separated), unwrapping hard-wrap and dropping any purely-decorative ornament line (e.g. a row of asterisks). */
export function splitParagraphs(chunk: string): ParagraphSplitResult {
  const blocks = chunk.split(/\r?\n[ \t]*\r?\n+/);
  const paragraphs: string[] = [];
  let ornamentsDropped = 0;
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;
    if (/^[*\s]+$/.test(trimmed)) {
      ornamentsDropped += 1;
      continue;
    }
    const joined = unwrapHardWrap(trimmed);
    const cleaned = cleanText(joined);
    if (cleaned.length > 0) paragraphs.push(cleaned);
  }
  return { paragraphs, ornamentsDropped };
}

/** Groups paragraphs, in order, into chunks of roughly `targetChars` characters each; never splits a paragraph; the final chunk absorbs any remainder. */
export function chunkParagraphs(paragraphs: string[], targetChars: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;
  for (const p of paragraphs) {
    if (current.length > 0 && currentChars + p.length > targetChars) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(p);
    currentChars += p.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export interface SharedSplitResult {
  prefaceExcludedChars: number;
  titlePageExcludedChars: number;
  footnoteCount: number;
  underscoreCount: number;
  brutus: { paragraphs: string[]; ornamentsDropped: number; underscoresStripped: number };
  orator: { paragraphs: string[]; ornamentsDropped: number; underscoresStripped: number };
}

/** Fetches (from the committed raw file), strips footnotes/underscores, and splits the shared source into Brutus's and Orator's own paragraph arrays. Independent of either importer's own division-chunking - each importer calls this and then chunks paragraphs itself. */
export function loadAndSplit(): SharedSplitResult {
  const raw = readFileSync(RAW_TXT, 'utf8');

  const s = raw.indexOf(START_MARKER);
  const e = raw.indexOf(END_MARKER);
  if (s < 0 || e < 0 || e <= s) throw new Error('could not locate Gutenberg START/END boundary markers');
  const body = raw.slice(s + START_MARKER.length, e);

  const { out: noFootnotes, count: footnoteCount } = stripFootnotes(body);

  // Locate structural boundaries BEFORE stripping underscores (CAETERA_DEFUNT
  // itself is printed in italics, i.e. underscore-wrapped, in the source).
  const brutusHeadingIdx = noFootnotes.indexOf(BRUTUS_HEADING);
  if (brutusHeadingIdx < 0) throw new Error(`could not locate Brutus heading ${JSON.stringify(BRUTUS_HEADING)}`);
  const prefaceExcludedChars = brutusHeadingIdx;

  const caeteraIdx = noFootnotes.indexOf(CAETERA_DEFUNT);
  if (caeteraIdx < 0) throw new Error(`could not locate ${JSON.stringify(CAETERA_DEFUNT)}`);
  const brutusEnd = caeteraIdx + CAETERA_DEFUNT.length;
  const brutusChunkRaw = noFootnotes.slice(brutusHeadingIdx + BRUTUS_HEADING.length, brutusEnd);

  const oratorHeadingMatch = ORATOR_HEADING_RE.exec(noFootnotes);
  if (!oratorHeadingMatch) throw new Error('could not locate the real "THE ORATOR." heading line');
  const oratorHeadingIdx = oratorHeadingMatch.index;
  const titlePageExcludedChars = oratorHeadingIdx - brutusEnd;
  const oratorChunkRaw = noFootnotes.slice(oratorHeadingIdx + oratorHeadingMatch[0].length).trimEnd();

  const { out: brutusChunk, count: brutusUnderscores } = stripItalicUnderscores(brutusChunkRaw);
  const { out: oratorChunk, count: oratorUnderscores } = stripItalicUnderscores(oratorChunkRaw);
  const underscoreCount = brutusUnderscores + oratorUnderscores;

  const brutusSplit = splitParagraphs(brutusChunk);
  const oratorSplit = splitParagraphs(oratorChunk);

  return {
    prefaceExcludedChars,
    titlePageExcludedChars,
    footnoteCount,
    underscoreCount,
    brutus: { ...brutusSplit, underscoresStripped: brutusUnderscores },
    orator: { ...oratorSplit, underscoresStripped: oratorUnderscores },
  };
}
