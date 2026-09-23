/**
 * The common run-once ingestion flow shared by this batch's English Aristotle
 * importers, so each scripts/import-<slug>-en/index.ts carries only what is
 * genuinely specific to its own work: its page manifest (which Wikisource
 * page supplies which book/chapters, verified by inspection BEFORE the
 * importer was written), its About prose, and its own work-level anomalies.
 *
 * Two entry points, matching the two source techniques this batch needs:
 *   runWikitextImport  - pages whose wikitext IS the text (see ./wikitext.ts)
 *   runPageScanImport  - pages that are `<pages index=.../>` transclusions and
 *                        must be read as rendered HTML (see ./pagescan.ts)
 *
 * MANIFEST DISCIPLINE (mirrors scripts/import-aristotle-metaphysics-en's
 * BOOK_MANIFEST): every page declares the exact chapter numbers it is
 * expected to yield. If the parse disagrees, the importer STOPS loudly rather
 * than shipping a silently different division - the source may have changed
 * since it was verified, and this repo never guesses. Gaps inside a declared
 * run (a chapter number the source itself never prints) are logged as
 * anomalies, never filled in.
 *
 * Determinism: no clock, no directory iteration, no randomness - the manifest
 * fixes the order, so running an importer twice writes byte-identical files.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseWikitextChapters, type WtChapter } from './wikitext.ts';
import { parsePageScanHtml, type ChapterMarkerShape, type BekkerContainer, type PsChapter } from './pagescan.ts';
import { buildBookChapterWork, buildFlatWork, printSummary, writeOutputs, type ChapterInput, type WorkAbout } from './emit.ts';
import type { Anomaly } from './text.ts';
import { summariseRun } from './validateCore.ts';

export interface PageSpec {
  /** file under the importer's own raw/ directory */
  rawFile: string;
  /** the English Wikisource page title this raw file caches */
  pageTitle: string;
  /** anomaly label suffix, e.g. 'book-1' or 'section-1' */
  label: string;
  /** the chapter numbers this page must yield, in order (verified before writing the importer) */
  expectedChapters: number[];
  /** book number for a two-level work; omit for a flat work */
  book?: number;
  /**
   * When ONE source page carries several books and is split on the source's
   * own "BOOK N" headings (only On Plants, in this batch), the expected
   * chapter numbers per book. Checked exactly like `expectedChapters`, so a
   * multi-book page is never shipped unverified either.
   */
  expectedByBook?: Record<number, number[]>;
}

export interface ImportConfigBase {
  workId: string;
  /** directory holding the cached raw responses */
  rawDir: string;
  /** data/<workId>/ */
  outDir: string;
  shape: 'book-chapter' | 'flat';
  pages: PageSpec[];
  about: WorkAbout;
  /** work-level disclosures written verbatim into anomalies.json */
  extraAnomalies?: Anomaly[];
  /**
   * The full traditional chapter count per book (or, for a flat work, under
   * key 0), used only to report "only N of the standard M chapters are
   * present" - reporting, never filling in.
   */
  traditionalChapterCounts?: Record<number, number>;
  /**
   * Per-chapter Passage.anomaly text, keyed `"<page label>:<chapter number>"`
   * - used where the SOURCE's own text is defective at a place the parser
   * cannot detect mechanically (e.g. a plain-wikitext page that simply stops
   * mid-sentence, with no red link to mark it). The key must name a chapter
   * the manifest already expects, or the run stops.
   */
  passageAnomalies?: Record<string, string>;
}

function fail(workId: string, msg: string): never {
  process.stderr.write(`STOP (${workId}): ${msg}\n`);
  process.exit(1);
}

function checkManifest(workId: string, label: string, got: number[], want: number[]): void {
  if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
    fail(workId, `${label}: manifest expected chapters [${summariseRun(want)}] (${want.join(',')}), parser produced [${got.join(',')}] - the source has changed since this importer was verified, or the manifest is wrong. Refusing to ship a division that was not checked by hand.`);
  }
}

/** Log a chapter number the source's own numbering skips, per page. */
function logInternalGaps(workId: string, label: string, chapters: number[], anomalies: Anomaly[]): void {
  if (chapters.length < 2) return;
  const gaps: number[] = [];
  for (let n = chapters[0]!; n < chapters[chapters.length - 1]!; n++) if (!chapters.includes(n)) gaps.push(n);
  if (gaps.length > 0) {
    anomalies.push({
      where: `${workId} / ${label}`,
      note: `The source's own chapter numbering skips ${gaps.length > 1 ? 'numbers' : 'number'} ${gaps.join(', ')}: no such heading or marker is printed on the page, the text running straight on from the previous numbered chapter into the next. The surrounding text is complete and verbatim; only the number is absent, and nothing is renumbered or fabricated to close the gap.`,
    });
  }
}

function reportShortBooks(cfg: ImportConfigBase, anomalies: Anomaly[]): void {
  if (!cfg.traditionalChapterCounts) return;
  for (const p of cfg.pages) {
    const key = p.book ?? 0;
    const traditional = cfg.traditionalChapterCounts[key];
    if (traditional === undefined) continue;
    const last = p.expectedChapters[p.expectedChapters.length - 1]!;
    if (p.expectedChapters.length < traditional) {
      anomalies.push({
        where: `${cfg.workId} / ${p.label}`,
        note: `${p.expectedChapters.length} of the ${traditional} chapters of the standard division are present in this source (highest number present: ${last}). The remainder is not transcribed on English Wikisource and is not fabricated here.`,
      });
    }
  }
}

function assemble(cfg: ImportConfigBase, perPage: { spec: PageSpec; chapters: ChapterInput[] }[], anomalies: Anomaly[]): void {
  let work;
  if (cfg.shape === 'book-chapter') {
    const byBook = new Map<number, ChapterInput[]>();
    const order: number[] = [];
    for (const { spec, chapters } of perPage) {
      const b = spec.book;
      if (b === undefined) fail(cfg.workId, `${spec.label}: a book-chapter work needs a book number on every page spec`);
      if (!byBook.has(b)) { byBook.set(b, []); order.push(b); }
      byBook.get(b)!.push(...chapters);
    }
    work = buildBookChapterWork(cfg.workId, order.map((n) => ({ number: n, chapters: byBook.get(n)! })));
  } else {
    work = buildFlatWork(cfg.workId, perPage.flatMap((p) => p.chapters));
  }
  writeOutputs(cfg.outDir, work, cfg.about, anomalies);
  printSummary(cfg.workId, work, anomalies);
}

/** Ingest a work whose Wikisource pages are ordinary wikitext. */
export function runWikitextImport(cfg: ImportConfigBase): void {
  const anomalies: Anomaly[] = [];
  const perPage: { spec: PageSpec; chapters: ChapterInput[] }[] = [];
  const shapesSeen = new Set<string>();
  let footnotes = 0;

  for (const spec of cfg.pages) {
    const raw = JSON.parse(readFileSync(join(cfg.rawDir, spec.rawFile), 'utf8')) as { title?: string; content?: string };
    if (typeof raw.content !== 'string') fail(cfg.workId, `${spec.rawFile}: cached response has no .content wikitext string`);
    const where = `${cfg.workId} / ${spec.label}`;
    const parsed = parseWikitextChapters(raw.content, where);
    anomalies.push(...parsed.anomalies);
    footnotes += parsed.footnotesStripped;
    for (const s of parsed.shapes) shapesSeen.add(s);

    checkManifest(cfg.workId, spec.label, parsed.chapters.map((c) => c.number), spec.expectedChapters);
    logInternalGaps(cfg.workId, spec.label, spec.expectedChapters, anomalies);

    perPage.push({ spec, chapters: parsed.chapters.map((c: WtChapter) => {
      const out: ChapterInput = { number: c.number, ref: bekkerRange(c.bekkerMarkers), paragraphs: c.paragraphs };
      const flag = cfg.passageAnomalies?.[`${spec.label}:${c.number}`];
      if (flag) out.passageAnomaly = flag;
      return out;
    }) });
  }

  for (const key of Object.keys(cfg.passageAnomalies ?? {})) {
    const [label, num] = key.split(':');
    const page = cfg.pages.find((p) => p.label === label);
    if (!page || !page.expectedChapters.includes(Number(num))) {
      fail(cfg.workId, `passageAnomalies key ${JSON.stringify(key)} does not name a chapter this manifest expects`);
    }
  }

  anomalies.push({
    where: `${cfg.workId} / source technique`,
    note: `Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup${shapesSeen.size ? `, and marks its chapters with ${[...shapesSeen].sort().join(' and ')} marker(s)` : ''}. Disclosed rather than described as a page-scan provenance it does not have.`,
  });
  anomalies.push({ where: `${cfg.workId} / footnotes stripped`, note: `${footnotes} inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.` });
  reportShortBooks(cfg, anomalies);
  anomalies.push(...(cfg.extraAnomalies ?? []));

  assemble(cfg, perPage, anomalies);
}

export interface PageScanImportConfig extends ImportConfigBase {
  markerShape: ChapterMarkerShape;
  bekkerContainer: BekkerContainer;
  furnitureExact?: string[];
  startAtFirstBookHeading?: boolean;
  bookHeadingRe?: RegExp;
  /** pages whose parse is expected to stop early at an unproofread red link */
  expectTruncated?: string[];
}

/** Ingest a work whose Wikisource pages are page-scan transclusions (rendered HTML). */
export function runPageScanImport(cfg: PageScanImportConfig): void {
  const anomalies: Anomaly[] = [];
  const perPage: { spec: PageSpec; chapters: ChapterInput[] }[] = [];
  let footnotes = 0;
  let refsFound = 0;

  for (const spec of cfg.pages) {
    const raw = JSON.parse(readFileSync(join(cfg.rawDir, spec.rawFile), 'utf8')) as { parse?: { text?: { '*'?: string } } };
    const html = raw.parse?.text?.['*'];
    if (!html) fail(cfg.workId, `${spec.rawFile}: could not find .parse.text["*"] rendered HTML in the cached response`);
    const where = `${cfg.workId} / ${spec.label}`;
    const parsed = parsePageScanHtml(html, {
      where,
      markerShape: cfg.markerShape,
      bekkerContainer: cfg.bekkerContainer,
      furnitureExact: cfg.furnitureExact,
      startAtFirstBookHeading: cfg.startAtFirstBookHeading,
      bookHeadingRe: cfg.bookHeadingRe,
    });
    anomalies.push(...parsed.anomalies);
    footnotes += parsed.footnoteRefsStripped;

    const wantTruncated = (cfg.expectTruncated ?? []).includes(spec.label);
    if ((parsed.truncated !== null) !== wantTruncated) {
      fail(cfg.workId, `${spec.label}: truncation expectation mismatch (manifest says ${wantTruncated}, parser found ${parsed.truncated !== null})`);
    }

    // For a page that marks its own book boundaries (On Plants), split here.
    const groups = new Map<number, PsChapter[]>();
    const order: number[] = [];
    for (const c of parsed.chapters) {
      const b = c.book ?? spec.book ?? 1;
      if (!groups.has(b)) { groups.set(b, []); order.push(b); }
      groups.get(b)!.push(c);
    }
    for (const b of order) {
      const chapters = groups.get(b)!;
      const label = order.length > 1 ? `${spec.label} / book-${b}` : spec.label;
      const want = order.length > 1 ? spec.expectedByBook?.[b] : spec.expectedChapters;
      if (!want) fail(cfg.workId, `${label}: no expected chapter list declared for this book — a multi-book page needs expectedByBook, so nothing ships unverified`);
      checkManifest(cfg.workId, label, chapters.map((c) => c.number), want);
      logInternalGaps(cfg.workId, label, chapters.map((c) => c.number), anomalies);
      refsFound += chapters.filter((c) => c.ref !== null).length;
      perPage.push({
        spec: { ...spec, book: b, label },
        chapters: chapters.map((c) => ({
          number: c.number,
          ref: c.ref,
          paragraphs: c.passages.map((p) => p.text),
          passageAnomaly: c.passages.find((p) => p.anomaly)?.anomaly,
        })),
      });
    }
    if (order.length > 1) {
      const all = parsed.chapters.map((c) => `${c.book}:${c.number}`);
      anomalies.push({ where, note: `This single Wikisource page carries more than one book; it was split on the source's own "BOOK N" headings into ${order.length} books (chapters found, as book:chapter — ${all.join(', ')}).` });
    }
  }

  anomalies.push({
    where: `${cfg.workId} / source technique`,
    note: `This work's Wikisource pages are djvu PAGE-SCAN TRANSCLUSIONS: their wikitext is only a few hundred bytes of <pages index="..." from=X to=Y /> markup, so action=parse&prop=wikitext returns no text at all. The RENDERED HTML was fetched once per page via action=parse&prop=text and parsed with jsdom, exactly as scripts/import-aristotle-metaphysics-en does. Chapter markers in this source take the "${cfg.markerShape}" form and Bekker page markers the "${cfg.bekkerContainer}" form — both verified by direct inspection of this work's own HTML, not assumed from any other work in the library.`,
  });
  anomalies.push({ where: `${cfg.workId} / footnotes stripped`, note: `${footnotes} inline footnote/superscript marker(s) were removed from the reading text; the translator's notes themselves are editorial apparatus, are rendered by the source in a separate block, and are not preserved anywhere in this build.` });
  anomalies.push({ where: `${cfg.workId} / reference scheme`, note: `${refsFound} chapter(s) carry a Bekker page reference reconstructed from the source's own ${cfg.bekkerContainer} markers, in document order (a single page token when the chapter falls on one page, otherwise first–last). Passage.ref is null throughout: the source prints no marker at every paragraph break, so a per-paragraph reference would have to be invented.` });
  reportShortBooks(cfg, anomalies);
  anomalies.push(...(cfg.extraAnomalies ?? []));

  assemble(cfg, perPage, anomalies);
}

/** "1094a" for a single marker, "1094a–1095a" for a run, null for none. */
export function bekkerRange(markers: string[]): string | null {
  if (markers.length === 0) return null;
  if (markers.length === 1) return markers[0]!;
  return `${markers[0]}–${markers[markers.length - 1]}`;
}
