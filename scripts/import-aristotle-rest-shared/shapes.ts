/**
 * Maps a generic WalkDiv tree (teiWalker.ts) onto the app's Division scheme
 * (Book -> Chapter, or a flat list of Chapters - see data/physics-grc/types.ts
 * for the scheme this mirrors). The ~40 works covered by this importer nest
 * very differently in their own source XML (see workTable.ts's per-work
 * `shape`), but every one of them folds onto that same two-level target
 * scheme: anything BELOW the chosen "chapter" div (e.g. a `section` or
 * `subsection` level) is folded into that chapter's Passage array (one
 * Passage per deepest paragraph-bearing div, Passage.n = the dotted path of
 * n-values from the chapter down to it), never into extra Division levels.
 *
 * Book numbering is always assigned by POSITION (1, 2, 3, ... in document
 * order), not by the source's own `n` label - for the ordinary case (book
 * n="1","2","3"...) these coincide exactly; for the handful of works whose
 * source labels a book/part with a non-numeric name (Prior Analytics'
 * `part n="1"/"2"` is already numeric and passes through unchanged, but
 * De Melisso/Xenophane/Gorgia's `part n="Xenoph"/"Zenon"/"Georg"` and
 * De Plantis' `part n="prol"/"1"/"2"` are not), the source's own label is
 * preserved as that Book's `editorialTitle` and logged, rather than lost.
 */
import type { Anomaly, Division, Passage } from './genericTypes.ts';
import { cleanBekkerMark, cleanText } from './text.ts';
import type { WalkDiv } from './teiWalker.ts';

/** Recursively find every div matching `subtype`, without descending further
 *  into a match's own children (those become that chapter's Passages, not
 *  further search targets) - lets a work's own irrelevant wrapper divs
 *  (e.g. Mechanica's single `chapter n="0"` wrapping all its `section`s) be
 *  transparently skipped through. */
export function findAllBySubtype(div: WalkDiv, subtype: string): WalkDiv[] {
  const out: WalkDiv[] = [];
  const walk = (d: WalkDiv) => {
    for (const c of d.children) {
      if (c.subtype === subtype) out.push(c);
      else walk(c);
    }
  };
  walk(div);
  return out;
}

function marksToRef(marks: string[], where: string, anomalies: Anomaly[]): string | null {
  const cleaned: string[] = [];
  for (const raw of marks) {
    const c = cleanBekkerMark(raw);
    if (c) cleaned.push(c);
    else anomalies.push({ where, note: `An in-text citation mark ${JSON.stringify(raw)} did not parse as a Bekker page/column reference (kept out of Division.ref; it is likely a line number tagged the same way as page marks in this source file).` });
  }
  if (cleaned.length === 0) return null;
  const first = cleaned[0]!;
  const last = cleaned[cleaned.length - 1]!;
  return first === last ? first : `${first}–${last}`;
}

interface FoldStats {
  emptyParagraphsDropped: number;
  delCount: number;
  addCount: number;
  ellipsisGapCount: number;
  lostGapCount: number;
}

/** Fold everything at or below `div` into a flat Passage[] (document order).
 *  `path` is the dotted n-value path from the chapter div down to `div`
 *  itself (empty at the chapter div, so its own direct paragraphs get n=""). */
function foldToPassages(div: WalkDiv, path: string[], stats: FoldStats): Passage[] {
  const passages: Passage[] = [];
  for (const p of div.paragraphs) {
    if (p.text.length === 0) {
      stats.emptyParagraphsDropped += 1;
      continue;
    }
    stats.delCount += p.delCount;
    stats.addCount += p.addCount;
    stats.ellipsisGapCount += p.ellipsisGapCount;
    stats.lostGapCount += p.lostGapCount;
    const passage: Passage = { n: path.join('.'), text: p.text, ref: null };
    if (p.addExcerpts.length > 0) {
      passage.anomaly = `contains editorial insertion${p.addExcerpts.length > 1 ? 's' : ''} <add> kept verbatim: ${p.addExcerpts.map((t) => `"${t}"`).join(', ')}`;
    }
    passages.push(passage);
  }
  for (const child of div.children) {
    passages.push(...foldToPassages(child, [...path, child.n ?? ''], stats));
  }
  return passages;
}

export interface ChapterResult {
  division: Division;
  stats: FoldStats;
}

function buildChapterDivision(
  chapterDiv: WalkDiv,
  id: string,
  number: string,
  where: string,
  anomalies: Anomaly[],
): ChapterResult {
  const stats: FoldStats = { emptyParagraphsDropped: 0, delCount: 0, addCount: 0, ellipsisGapCount: 0, lostGapCount: 0 };
  const passages = foldToPassages(chapterDiv, [], stats);
  const ref = marksToRef(chapterDiv.allMarks, where, anomalies);
  const division: Division = {
    id,
    number,
    ref,
    sourceHeading: chapterDiv.head,
    editorialTitle: null,
    children: [],
    passages,
  };
  return { division, stats };
}

export interface FoldResult {
  divisions: Division[];
  chapterStats: FoldStats;
  chaptersWithoutRef: number;
  totalChapters: number;
}

function emptyStats(): FoldStats {
  return { emptyParagraphsDropped: 0, delCount: 0, addCount: 0, ellipsisGapCount: 0, lostGapCount: 0 };
}
function addStats(a: FoldStats, b: FoldStats): void {
  a.emptyParagraphsDropped += b.emptyParagraphsDropped;
  a.delCount += b.delCount;
  a.addCount += b.addCount;
  a.ellipsisGapCount += b.ellipsisGapCount;
  a.lostGapCount += b.lostGapCount;
}

/** Flat list of chapters directly (id `ch-N`); `chapterSubtype` is searched
 *  for recursively from the root, transparently skipping any wrapper div
 *  that isn't itself a match. */
export function mapFlatChapters(root: WalkDiv, chapterSubtype: string, workId: string, anomalies: Anomaly[]): FoldResult {
  const chapters = findAllBySubtype(root, chapterSubtype);
  if (chapters.length === 0) throw new Error(`${workId}: no "${chapterSubtype}" divisions found under root`);
  const divisions: Division[] = [];
  const chapterStats = emptyStats();
  let chaptersWithoutRef = 0;
  chapters.forEach((c, i) => {
    const number = c.n ?? String(i + 1);
    const id = `ch-${number}`;
    const where = `${workId} / ${id}`;
    const { division, stats } = buildChapterDivision(c, id, number, where, anomalies);
    if (division.ref === null) chaptersWithoutRef += 1;
    addStats(chapterStats, stats);
    divisions.push(division);
  });
  return { divisions, chapterStats, chaptersWithoutRef, totalChapters: divisions.length };
}

/** Each direct <p> of the (single) `wrapperSubtype` div becomes its own flat
 *  chapter (id `ch-N`, 1-based sequential) - for De Virtutibus et Vitiis,
 *  whose source has no chapter-level division at all, only 8 bare <p>s. */
export function mapFlatParagraphsAsChapters(root: WalkDiv, wrapperSubtype: string, workId: string, anomalies: Anomaly[]): FoldResult {
  const wrappers = findAllBySubtype(root, wrapperSubtype);
  if (wrappers.length !== 1) throw new Error(`${workId}: expected exactly 1 "${wrapperSubtype}" wrapper div, found ${wrappers.length}`);
  const wrapper = wrappers[0]!;
  if (wrapper.paragraphs.length === 0) throw new Error(`${workId}: wrapper div has no direct <p> paragraphs`);
  const divisions: Division[] = [];
  const chapterStats = emptyStats();
  let chaptersWithoutRef = 0;
  wrapper.paragraphs.forEach((p, i) => {
    const number = String(i + 1);
    const id = `ch-${number}`;
    const where = `${workId} / ${id}`;
    if (p.text.length === 0) throw new Error(`${where}: paragraph ${i + 1} is empty after cleaning`);
    const ref = marksToRef(p.marks, where, anomalies);
    if (ref === null) chaptersWithoutRef += 1;
    chapterStats.delCount += p.delCount;
    chapterStats.addCount += p.addCount;
    chapterStats.ellipsisGapCount += p.ellipsisGapCount;
    chapterStats.lostGapCount += p.lostGapCount;
    const passage: Passage = { n: '', text: p.text, ref: null };
    if (p.addExcerpts.length > 0) {
      passage.anomaly = `contains editorial insertion${p.addExcerpts.length > 1 ? 's' : ''} <add> kept verbatim: ${p.addExcerpts.map((t) => `"${t}"`).join(', ')}`;
    }
    divisions.push({ id, number, ref, sourceHeading: null, editorialTitle: null, children: [], passages: [passage] });
  });
  return { divisions, chapterStats, chaptersWithoutRef, totalChapters: divisions.length };
}

/** Book -> Chapter (any deeper nesting folded into Passages). `bookRoot` may
 *  be `root` itself, or a single pre-filtered book-level div (Prior
 *  Analytics: only the "priora" book, with `bookSubtype` then = "part"). */
export function mapBookChapter(
  bookRoot: WalkDiv,
  bookSubtype: string,
  chapterSubtype: string,
  workId: string,
  anomalies: Anomaly[],
): FoldResult {
  const books = findAllBySubtype(bookRoot, bookSubtype);
  if (books.length === 0) throw new Error(`${workId}: no "${bookSubtype}" divisions found`);
  const divisions: Division[] = [];
  const chapterStats = emptyStats();
  let chaptersWithoutRef = 0;
  let totalChapters = 0;
  books.forEach((b, bi) => {
    const bookNumber = String(bi + 1);
    const rawN = b.n ?? '';
    let editorialTitle: string | null = null;
    if (rawN !== bookNumber && !/^\d+$/.test(rawN)) {
      editorialTitle = rawN;
    } else if (rawN !== bookNumber) {
      anomalies.push({
        where: `${workId} / book-${bookNumber}`,
        note: `The source's own book/part label for this book is "${rawN}", not "${bookNumber}"; renumbered sequentially by document position (this app's Book/Chapter id scheme requires arabic numerals) - nothing besides the numeral itself changed.`,
      });
    }
    const chapters = findAllBySubtype(b, chapterSubtype);
    if (chapters.length === 0) throw new Error(`${workId} / book-${bookNumber}: no "${chapterSubtype}" divisions found`);
    const chapterDivisions: Division[] = chapters.map((c) => {
      const number = c.n ?? '?';
      const id = `book-${bookNumber}-ch-${number}`;
      const where = `${workId} / ${id}`;
      const { division, stats } = buildChapterDivision(c, id, number, where, anomalies);
      if (division.ref === null) chaptersWithoutRef += 1;
      addStats(chapterStats, stats);
      totalChapters += 1;
      return division;
    });
    divisions.push({
      id: `book-${bookNumber}`,
      number: bookNumber,
      ref: null,
      sourceHeading: b.head,
      editorialTitle,
      children: chapterDivisions,
      passages: [],
    });
  });
  return { divisions, chapterStats, chaptersWithoutRef, totalChapters };
}

/** Problem -> Section (Mechanica only). The source's `problemSubtype` divs
 *  are numbered n="0" (the unnumbered preface) then n="1".."K" (the
 *  traditional Problems), in document order, and each holds `sectionSubtype`
 *  divs whose own numbering restarts at 1 - so a flat `ch-N` list would NOT
 *  be unique. Emits `preface` (number null, editorialTitle "Preface") with
 *  children `preface-ch-M`, and `problem-N` (number N) with children
 *  `problem-N-ch-M`. The problem numbers must be exactly 0..K in document
 *  order (hard-checked): the diagram map in diagrams/aristotle.ts is keyed
 *  by these ids. */
export function mapProblemSection(
  root: WalkDiv,
  problemSubtype: string,
  sectionSubtype: string,
  workId: string,
  anomalies: Anomaly[],
): FoldResult {
  const problems = findAllBySubtype(root, problemSubtype);
  if (problems.length === 0) throw new Error(`${workId}: no "${problemSubtype}" divisions found`);
  const divisions: Division[] = [];
  const chapterStats = emptyStats();
  let chaptersWithoutRef = 0;
  let totalChapters = 0;
  problems.forEach((p, pi) => {
    const rawN = p.n ?? '';
    if (rawN !== String(pi)) {
      throw new Error(`${workId}: expected "${problemSubtype}" div #${pi + 1} to carry n="${pi}" (0 = preface, then Problems 1..), got n="${rawN}"`);
    }
    const isPreface = pi === 0;
    const prefix = isPreface ? 'preface' : `problem-${rawN}`;
    const sections = findAllBySubtype(p, sectionSubtype);
    if (sections.length === 0) throw new Error(`${workId} / ${prefix}: no "${sectionSubtype}" divisions found`);
    const children: Division[] = sections.map((s, si) => {
      const number = s.n ?? String(si + 1);
      const id = `${prefix}-ch-${number}`;
      const where = `${workId} / ${id}`;
      const { division, stats } = buildChapterDivision(s, id, number, where, anomalies);
      if (division.ref === null) chaptersWithoutRef += 1;
      addStats(chapterStats, stats);
      totalChapters += 1;
      return division;
    });
    divisions.push({
      id: prefix,
      number: isPreface ? null : rawN,
      ref: null,
      sourceHeading: p.head,
      editorialTitle: isPreface ? 'Preface' : null,
      children,
      passages: [],
    });
  });
  return { divisions, chapterStats, chaptersWithoutRef, totalChapters };
}

/** Book -> Bekker-page (Politics only): the source itself divides directly
 *  at every Bekker page, with no chapter level. Each `bekker_page` div
 *  becomes one Chapter, numbered sequentially within its Book; its
 *  Division.ref is that page's own citation (its `n`, e.g. "1252a") rather
 *  than built from internal marks (the two coincide in every case checked,
 *  but the div's own `n` is authoritative and simpler). */
export function mapBookPage(root: WalkDiv, bookSubtype: string, pageSubtype: string, workId: string, anomalies: Anomaly[]): FoldResult {
  const books = findAllBySubtype(root, bookSubtype);
  if (books.length === 0) throw new Error(`${workId}: no "${bookSubtype}" divisions found`);
  const divisions: Division[] = [];
  const chapterStats = emptyStats();
  let chaptersWithoutRef = 0;
  let totalChapters = 0;
  books.forEach((b, bi) => {
    const bookNumber = String(bi + 1);
    const pages = findAllBySubtype(b, pageSubtype);
    if (pages.length === 0) throw new Error(`${workId} / book-${bookNumber}: no "${pageSubtype}" divisions found`);
    const chapterDivisions: Division[] = pages.map((p, pi) => {
      const number = String(pi + 1);
      const id = `book-${bookNumber}-ch-${number}`;
      const where = `${workId} / ${id}`;
      const stats = emptyStats();
      const passages = foldToPassages(p, [], stats);
      addStats(chapterStats, stats);
      totalChapters += 1;
      const ref = cleanBekkerMark(p.n ?? '') ?? marksToRef(p.allMarks, where, anomalies);
      if (ref === null) chaptersWithoutRef += 1;
      return {
        id,
        number,
        ref,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages,
      };
    });
    divisions.push({
      id: `book-${bookNumber}`,
      number: bookNumber,
      ref: null,
      sourceHeading: b.head,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    });
  });
  return { divisions, chapterStats, chaptersWithoutRef, totalChapters };
}

export function cleanHead(s: string | null): string | null {
  if (s === null) return null;
  const c = cleanText(s);
  return c.length ? c : null;
}
