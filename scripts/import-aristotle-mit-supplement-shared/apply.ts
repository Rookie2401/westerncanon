/**
 * NEW, standalone helper (not part of scripts/import-aristotle-rest-en-shared,
 * and does not modify anything in that directory) used by exactly three
 * importers — import-de-caelo-en, import-de-partibus-animalium-en and
 * import-historia-animalium-en — to complete books whose English Wikisource
 * transcription itself stops mid-sentence, from the MIT Internet Classics
 * Archive copy of the SAME Oxford translation.
 *
 * Each of those three importers still runs its ordinary
 * `runWikitextImport()` first (unmodified, from the existing shared driver)
 * exactly as before, which parses only the chapters actually present on
 * Wikisource and writes data/<work>/work.json. THIS module then does one
 * thing only, as a second pass over that already-written work.json:
 *   1. appends MIT's continuation text onto the last present chapter's
 *      Passage.text (the "tail"), and
 *   2. appends whole new Chapter Divisions for chapters Wikisource never
 *      carried at all,
 * both taken from `raw/supplement-*.txt` files that each importer's own
 * raw/ directory holds. It does not touch about.json or anomalies.json —
 * each importer authors those directly (its `about` object literal and its
 * `passageAnomalies`/`extraAnomalies` arrays), since that prose is static
 * and known in advance, not something to compute from the parsed tree.
 *
 * PROVENANCE COMMON TO ALL THREE WORKS (verified 2026-09-22, see each
 * importer's own module doc for the per-work specifics): MIT's own LIVE
 * copy of every one of these six book pages is *itself* truncated, at
 * exactly the same word Wikisource's transcription stops at (Wikisource's
 * transcription was evidently copied from MIT's page verbatim, including
 * its defect). This is a genuine, confirmed server-side bug — a direct
 * `curl` fetch of each live page returns a response whose received byte
 * count exactly matches the server's own declared Content-Length header (so
 * nothing was lost in transit), and every one of the six pages needed here
 * cuts off within a few bytes of the same ~101.5KB mark, regardless of the
 * work, strongly suggesting a fixed-size output-buffer bug on MIT's server
 * that is not specific to any one book. Recent Wayback Machine captures
 * (2025/2026) reproduce the identical cutoff, confirming the live bug has
 * persisted for some time. A COMPLETE capture of each page — both the
 * `<A NAME="start">`/`<A NAME="end">` markers present, and the ordinary
 * closing navigation footer present — was located instead in the Wayback
 * Machine's own year-2000 capture of that same MIT URL (the earliest
 * capture on file for each), fetched via
 * `http://web.archive.org/web/<timestamp>id_/http://classics.mit.edu/...`.
 * Each fetched page's own on-page credit line ("Translated by ...") was
 * checked and matches the Wikisource-credited translator exactly (Stocks /
 * Ogle / D'Arcy Wentworth Thompson respectively — see each importer for the
 * quoted line). The overlap between Wikisource's own last surviving words
 * and MIT's text was checked by exact substring search (not approximate)
 * and matched byte-for-byte with no wording difference at all in every one
 * of the six cases — unsurprising, since both sides are transcriptions of
 * the identical MIT digitisation, one before and one after the page broke.
 *
 * raw/supplement-<slug>-<book>-<chapter>[-tail].txt file shape: a run of
 * leading `#`-prefixed provenance-header lines (stripped here), then the
 * MIT continuation text itself, paragraphs separated by a blank line,
 * already HTML-stripped and whitespace-collapsed (produced mechanically by
 * parsing MIT's own `<B>Part N</B>` / `<BR><BR>` markup — the same shape
 * scripts/import-de-generatione-et-corruptione-en/index.ts's
 * `parseMitBookPage` reads for this same MIT archive elsewhere in this
 * repo — never hand-retyped). For a `-tail.txt` file, the text picks up
 * exactly where Wikisource's own surviving text stops: with NO leading
 * space when the cut fell mid-word (so the file's first characters
 * complete that same word), or with the leading space already stripped
 * when the cut fell at a word boundary (so this module's own single-space
 * join produces exactly one space, never two, never zero).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
}

interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
  passages: Passage[];
}

interface GenericWork {
  workId: string;
  language: 'en';
  divisions: Division[];
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const cp = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : whole;
    }
    const rep = NAMED_ENTITIES[body.toLowerCase()];
    return rep ?? whole;
  });
}
function collapseWs(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}
function cleanText(input: string): string {
  return collapseWs(decodeEntities(input));
}

function fail(label: string, msg: string): never {
  process.stderr.write(`STOP (${label}): ${msg}\n`);
  process.exit(1);
}

/** Reads a `raw/supplement-*.txt` file: strips `#` header lines, splits the rest into cleaned paragraphs on blank lines. */
export function readSupplementParagraphs(file: string): string[] {
  const raw = readFileSync(file, 'utf8');
  const body = raw.split('\n').filter((line) => !line.startsWith('#')).join('\n');
  return body.split(/\n\s*\n/).map((p) => cleanText(p)).filter((p) => p.length > 0);
}

export interface TailSpec {
  /** book number, e.g. 1 */
  book: number;
  /** the chapter number Wikisource's own text already carries, whose Passage.text gets MIT's continuation appended */
  chapter: number;
  /** absolute path to the raw/supplement-...-tail.txt file */
  supplementFile: string;
  /** true when Wikisource's own text cut off mid-word (direct concatenation); false when it cut at a word boundary (single-space join) */
  midWord: boolean;
  /** replaces this chapter's Passage.anomaly with this SUPPLEMENTED disclosure */
  anomaly: string;
}

export interface WholeChapterSpec {
  book: number;
  /** the new chapter number, absent from Wikisource entirely */
  chapter: number;
  /** absolute path to the raw/supplement-...-<chapter>.txt file (the whole chapter) */
  supplementFile: string;
  anomaly: string;
}

/**
 * Second-pass mutation of an already-written data/<work>/work.json: splices
 * MIT continuation text onto specified existing chapters and appends whole
 * new chapter Divisions, both from raw/supplement-*.txt files. Idempotent:
 * running the whole importer twice re-reads runWikitextImport's freshly
 * regenerated work.json (which never itself contains any MIT text) and
 * reapplies the same supplement, byte for byte.
 */
export function applyMitSupplements(
  outDir: string,
  opts: { tails: TailSpec[]; wholeChapters: WholeChapterSpec[] },
): void {
  const workJsonPath = join(outDir, 'work.json');
  const work = JSON.parse(readFileSync(workJsonPath, 'utf8')) as GenericWork;

  const findBook = (n: number): Division => {
    const b = work.divisions.find((d) => d.id === `book-${n}`);
    if (!b) fail(outDir, `book-${n} not found in work.json`);
    return b;
  };
  const findChapter = (book: Division, n: number): Division => {
    const c = book.children.find((d) => d.id === `${book.id}-ch-${n}`);
    if (!c) fail(outDir, `${book.id}-ch-${n} not found in work.json`);
    return c;
  };

  for (const t of opts.tails) {
    const book = findBook(t.book);
    const chapter = findChapter(book, t.chapter);
    const passage = chapter.passages[0];
    if (!passage) fail(outDir, `${chapter.id}: no passage to supplement`);
    const tailParagraphs = readSupplementParagraphs(t.supplementFile);
    if (tailParagraphs.length === 0) fail(outDir, `${t.supplementFile}: zero paragraphs`);
    const mergedParagraphs = passage.text.split('\n\n');
    const lastIdx = mergedParagraphs.length - 1;
    mergedParagraphs[lastIdx] = mergedParagraphs[lastIdx] + (t.midWord ? '' : ' ') + tailParagraphs[0];
    for (const p of tailParagraphs.slice(1)) mergedParagraphs.push(p);
    passage.text = mergedParagraphs.join('\n\n');
    passage.anomaly = t.anomaly;
  }

  for (const w of opts.wholeChapters) {
    const book = findBook(w.book);
    const paragraphs = readSupplementParagraphs(w.supplementFile);
    if (paragraphs.length === 0) fail(outDir, `${w.supplementFile}: zero paragraphs`);
    const passage: Passage = { n: '', text: paragraphs.join('\n\n'), ref: null, anomaly: w.anomaly };
    const division: Division = {
      id: `${book.id}-ch-${w.chapter}`,
      number: String(w.chapter),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    book.children.push(division);
  }

  writeFileSync(workJsonPath, JSON.stringify(work, null, 2) + '\n', 'utf8');
  process.stdout.write(`  (MIT supplement) rewrote work.json with ${opts.tails.length} tail(s) and ${opts.wholeChapters.length} whole chapter(s)\n`);
}
