/**
 * Locates the 44 works inside scripts/import-shakespeare/raw/pg100.txt (PG
 * eBook #100, "The Complete Works of William Shakespeare") and builds the
 * table this importer drives over. Table-driven, built by parsing the PG
 * file's own table of contents - not hand-typed.
 *
 * TWO passes are used, not one, because the file's own global "Contents"
 * page (right after the title/byline) prints SHORT titles for some plays
 * (e.g. "KING RICHARD THE SECOND") while the play's own body heading prints
 * a FULLER title (e.g. "THE LIFE AND DEATH OF KING RICHARD THE SECOND") -
 * confirmed by direct inspection (see the module's own verification run).
 * Matching the global Contents text verbatim against the body therefore
 * finds the wrong line for that play (and, as a knock-on, the wrong END line
 * for the play immediately before it). The fix: independently re-locate
 * every PLAY's own body heading by its own structural signature - an all-
 * caps line immediately (within a few blank lines) followed by a line that
 * is exactly "Contents" (every one of the 38 plays, and only the plays,
 * carries this pattern: a per-play Act/Scene contents listing). This always
 * finds the play's real printed heading regardless of whether it matches the
 * global Contents page's shorter wording. The 6 non-play works (Sonnets + 5
 * narrative poems) carry no such "Contents" listing, so those 6 are found by
 * ordinary exact-line matching against the global Contents page instead
 * (verified unambiguous: each of those 6 titles occurs exactly once in the
 * body, found by a strictly-forward sequential scan).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RAW_PATH = join(HERE, 'raw', 'pg100.txt');

export type WorkKind = 'sonnets' | 'poem' | 'play';

export interface WorkBound {
  /** exact body heading text as printed (the play/poem/"THE SONNETS" title
   *  line itself) */
  sourceTitle: string;
  /** the global Contents page's own (possibly shorter) entry for this work;
   *  always equal to sourceTitle for the 6 non-play works. */
  tocTitle: string;
  kind: WorkKind;
  /** 0-based line index of the title line itself */
  startLine: number;
  /** 0-based line index one past this work's last line (exclusive) */
  endLine: number;
}

export interface SourceFile {
  lines: string[];
  works: WorkBound[];
  /** the file's own front-matter lines (Title/Author/Release date/etc,
   *  before "*** START OF ... ***"), kept for about.json's licence section */
  header: string[];
  /** true if the file's own header/front matter states the printed edition
   *  (Globe / Clark & Wright / Moby) in so many words - recorded, not
   *  assumed; see index.ts's module doc for what was actually found. */
  startMarkerLine: number;
  endMarkerLine: number;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (shakespeare source): ${msg}\n`);
  process.exit(1);
}

export function loadSource(): SourceFile {
  const raw = readFileSync(RAW_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);
  const startMarkerLine = lines.findIndex((l) => l.includes('*** START OF THE PROJECT GUTENBERG EBOOK'));
  const endMarkerLine = lines.findIndex((l) => l.includes('*** END OF THE PROJECT GUTENBERG EBOOK'));
  if (startMarkerLine === -1 || endMarkerLine === -1) fail('could not find PG start/end markers - is raw/pg100.txt the expected transcription?');
  const header = lines.slice(0, startMarkerLine).filter((l) => l.trim().length > 0);

  // --- pass 1: the global Contents page (for the 6 non-play works) ---
  let i = startMarkerLine;
  while (!lines[i]!.trim().startsWith('Contents')) i++;
  const tocTitles: string[] = [];
  i++;
  while (true) {
    const l = lines[i]!.trim();
    if (l === '') {
      i++;
      if (tocTitles.length && lines[i]!.trim() === '') break;
      else continue;
    }
    tocTitles.push(l);
    i++;
  }
  if (tocTitles.length !== 44) fail(`expected exactly 44 titles on the global Contents page, found ${tocTitles.length}`);
  const playTocTitles = tocTitles.slice(1, 39);
  const nonPlayTitles = [tocTitles[0]!, ...tocTitles.slice(39)];

  // --- pass 2: the 38 play headings, by their own "Contents" (per-play Act/
  // Scene listing) proximity signature ---
  const playHeadings: { line: number; text: string }[] = [];
  for (let j = startMarkerLine; j < endMarkerLine; j++) {
    const l = lines[j]!.trim();
    if (l === '' || l === 'by William Shakespeare') continue;
    for (let k = j + 1; k < Math.min(j + 7, endMarkerLine); k++) {
      if (lines[k]!.trim() === 'Contents') {
        playHeadings.push({ line: j, text: l });
        break;
      }
      if (lines[k]!.trim() !== '') break;
    }
  }
  if (playHeadings.length !== 38) fail(`expected exactly 38 play headings (all-caps line immediately followed by "Contents"), found ${playHeadings.length}`);
  for (let k = 0; k < 38; k++) {
    const toc = playTocTitles[k]!;
    const body = playHeadings[k]!.text;
    if (body !== toc && !body.endsWith(toc)) fail(`play #${k + 1}: global-Contents title ${JSON.stringify(toc)} is not a suffix of body heading ${JSON.stringify(body)} - ordering assumption broken`);
  }

  // --- non-play boundaries: sequential exact-line match, in document order ---
  let searchFrom = i;
  const nonPlayBounds: { title: string; line: number }[] = [];
  for (const t of nonPlayTitles) {
    let idx = -1;
    for (let j = searchFrom; j < endMarkerLine; j++) {
      if (lines[j]!.trim() === t) {
        idx = j;
        break;
      }
    }
    if (idx === -1) fail(`non-play title not found in body: ${JSON.stringify(t)}`);
    nonPlayBounds.push({ title: t, line: idx });
    searchFrom = idx + 1;
  }

  const sonnetsBound = nonPlayBounds[0]!;
  const poemBounds = nonPlayBounds.slice(1);
  const works: WorkBound[] = [
    { sourceTitle: sonnetsBound.title, tocTitle: sonnetsBound.title, kind: 'sonnets', startLine: sonnetsBound.line, endLine: -1 },
  ];
  playHeadings.forEach((h, k) => works.push({ sourceTitle: h.text, tocTitle: playTocTitles[k]!, kind: 'play', startLine: h.line, endLine: -1 }));
  poemBounds.forEach((p) => works.push({ sourceTitle: p.title, tocTitle: p.title, kind: 'poem', startLine: p.line, endLine: -1 }));
  works.sort((a, b) => a.startLine - b.startLine);
  for (let k = 0; k < works.length; k++) works[k]!.endLine = k + 1 < works.length ? works[k + 1]!.startLine : endMarkerLine;
  if (works.length !== 44) fail(`expected exactly 44 works total, got ${works.length}`);

  return { lines, works, header, startMarkerLine, endMarkerLine };
}
