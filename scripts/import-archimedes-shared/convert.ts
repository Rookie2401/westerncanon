/**
 * Converts a walked TEI tree (scripts/import-archimedes-shared/teiWalker.ts)
 * into this app's Division/Passage tree for one Archimedes work, per the
 * ground-truth structure table (scripts/import-archimedes-shared/workTable.ts).
 *
 * Throws StopError (caught by the driver, which exits non-zero) whenever the
 * actually-parsed structure disagrees with the ground truth, or a passage
 * would otherwise be empty - never force-fits or silently renumbers.
 */

import type { WalkDiv, WalkParagraph } from './teiWalker.ts';
import { walkEdition } from './teiWalker.ts';
import type { ArchimedesWorkEntry, Structure } from './workTable.ts';
import { bookRoman } from './workTable.ts';
import type { Division, Passage, PassageFigure } from './genericTypes.ts';

export class StopError extends Error {}

export interface Anomaly {
  where: string;
  note: string;
}

export interface ConvertStats {
  totalPassages: number;
  totalChars: number;
  gapCount: number;
  addCount: number;
  delCount: number;
  figureCount: number;
}

export interface ConvertResult {
  divisions: Division[];
  anomalies: Anomaly[];
  stats: ConvertStats;
  pbValues: string[];
}

/** A printed head that is nothing but the division's own numeral (e.g. "α΄.",
 *  "ϛ΄.", "ή.") carries no information beyond `number` and is dropped
 *  (sourceHeading = null). Anything longer, or containing non-Greek
 *  characters (a Latin title, e.g. "PROBLEMA BOVINUM"), is kept verbatim. */
export function isBareNumeralHeading(head: string): boolean {
  const stripped = head.replace(/[.\s΄᾽']/gu, '');
  if (stripped.length === 0) return true;
  if (stripped.length > 3) return false;
  return /^[Ͱ-Ͽἀ-῿]+$/u.test(stripped);
}

export function pageRef(vol: number, page: string): string | null {
  return page ? `Mugler vol. ${vol} p. ${page}` : null;
}

export function spanRef(vol: number, pages: string[]): string | null {
  const nums = pages.filter((p) => p !== '');
  if (nums.length === 0) return null;
  const lo = nums[0];
  const hi = nums[nums.length - 1];
  return lo === hi ? `Mugler vol. ${vol} p. ${lo}` : `Mugler vol. ${vol} pp. ${lo}–${hi}`;
}

function figureSource(entry: ArchimedesWorkEntry, bookNumber: string | null, chapterLabel: string): string {
  const label = bookNumber ? `${bookRoman(bookNumber)}.${chapterLabel}` : chapterLabel;
  return `Mugler, ${entry.latinTitle} ${label}`;
}

function figureNote(count: number): string {
  return count > 1
    ? `${count} diagrams appear here in the printed edition; not yet available in this build.`
    : 'A diagram appears here in the printed edition; not yet available in this build.';
}

function gapAnomalyNote(count: number): string {
  return count > 1
    ? `${count} lacunae (editorial gaps, reason: "omitted") occur in this passage; no text is supplied for the gaps.`
    : 'A lacuna (editorial gap, reason: "omitted") occurs in this passage; no text is supplied for the gap.';
}

function checkSequence(workId: string, label: string, actual: readonly string[], expected: readonly string[]): void {
  const ok = actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  if (!ok) {
    throw new StopError(
      `${workId}: ${label} sequence mismatch.\n` +
        `  expected (${expected.length}): ${expected.join(', ')}\n` +
        `  got      (${actual.length}): ${actual.join(', ')}`,
    );
  }
}

function buildPassage(
  entry: ArchimedesWorkEntry,
  bookNumber: string | null,
  chapterLabel: string,
  wp: WalkParagraph,
  ref: string | null,
  anomalies: Anomaly[],
  stats: ConvertStats,
  where: string,
): Passage | null {
  // Markup-occurrence counts are tallied regardless of whether this paragraph
  // ends up producing a Passage (see the empty-text branch below).
  stats.gapCount += wp.gapCount;
  stats.addCount += wp.addCount;
  stats.delCount += wp.delExcerpts.length;
  stats.figureCount += wp.figureCount;

  if (wp.text.length === 0) {
    // The only way a <p> in this corpus ends up empty after cleaning is a
    // paragraph whose ENTIRE content was struck by the editor (verified: one
    // occurrence corpus-wide, tlg001 "<p><del>ΠΟΡΙΣΜΑ.</del></p>" - the
    // corollary heading, marked spurious). There is nothing left to keep, so
    // no Passage is produced for it; the deletion is still fully logged. Any
    // OTHER cause of an empty paragraph is an unexplained data problem and
    // must STOP rather than silently drop a passage.
    if (wp.delExcerpts.length > 0) {
      anomalies.push({
        where,
        note: `The entire <p> consisted solely of deleted text (<del>: ${wp.delExcerpts
          .map((e) => `"${e}"`)
          .join('; ')}); nothing else remained in the paragraph, so no reading-text passage was created for it - a deliberate, logged omission, not a bug.`,
      });
      return null;
    }
    throw new StopError(`${entry.workId}: ${where} has empty text after cleaning (no <del> present to explain it)`);
  }

  stats.totalPassages += 1;
  stats.totalChars += wp.text.length;

  const passage: Passage = { n: '', text: wp.text, ref };

  if (wp.gapCount > 0) {
    passage.anomaly = gapAnomalyNote(wp.gapCount);
    anomalies.push({
      where,
      note: `<gap reason="omitted"/> x${wp.gapCount}: a lacuna in the source; no text supplied.`,
    });
  }
  for (const excerpt of wp.delExcerpts) {
    anomalies.push({ where, note: `<del> excluded from reading text: "${excerpt}"` });
  }
  for (const excerpt of wp.addExcerpts) {
    anomalies.push({
      where,
      note: `<add cause="omitted"> editorial restoration included in reading text: "${excerpt}"`,
    });
  }
  if (wp.figureCount > 0) {
    const figure: PassageFigure = {
      source: figureSource(entry, bookNumber, chapterLabel),
      note: figureNote(wp.figureCount),
    };
    passage.figure = figure;
    anomalies.push({
      where,
      note: `<figure> diagram marker (${wp.figureCount}) present in the source; no legitimately-sourced image found (dead heml.mta.ca URL) - honest marker only, no image bundled.`,
    });
  }
  return passage;
}

function buildChapterDivision(
  entry: ArchimedesWorkEntry,
  bookNumber: string | null,
  chapterDiv: WalkDiv,
  idPrefix: string,
  anomalies: Anomaly[],
  stats: ConvertStats,
): Division {
  const n = chapterDiv.n as string;
  const id = `${idPrefix}-ch-${n}`;
  const sourceHeading =
    chapterDiv.head !== null && !isBareNumeralHeading(chapterDiv.head) ? chapterDiv.head : null;

  const passages: Passage[] = chapterDiv.paragraphs
    .map((wp, i) =>
      buildPassage(
        entry,
        bookNumber,
        n,
        wp,
        pageRef(entry.muglerVolume, wp.startPage),
        anomalies,
        stats,
        `${entry.workId} / division ${id} / passage[${i}]`,
      ),
    )
    .filter((p): p is Passage => p !== null);

  if (passages.length === 0) {
    throw new StopError(`${entry.workId}: division ${id} has no passages`);
  }

  return {
    id,
    number: n,
    ref: spanRef(entry.muglerVolume, chapterDiv.paragraphs.flatMap((p) => [p.startPage, p.endPage])),
    sourceHeading,
    editorialTitle: null,
    children: [],
    passages,
  };
}

function convertFlat(
  entry: ArchimedesWorkEntry,
  root: WalkDiv,
  structure: Extract<Structure, { kind: 'flat' }>,
  anomalies: Anomaly[],
  stats: ConvertStats,
): Division[] {
  const chapters = root.children.filter((d) => d.kind === 'chapter');
  checkSequence(
    entry.workId,
    'top-level chapter',
    chapters.map((c) => c.n as string),
    structure.numbers,
  );
  return chapters.map((ch) => buildChapterDivision(entry, null, ch, entry.workId, anomalies, stats));
}

function convertBooks(
  entry: ArchimedesWorkEntry,
  root: WalkDiv,
  structure: Extract<Structure, { kind: 'books' }>,
  anomalies: Anomaly[],
  stats: ConvertStats,
): Division[] {
  const books = root.children.filter((d) => d.kind === 'book');
  checkSequence(
    entry.workId,
    'book',
    books.map((b) => b.n as string),
    structure.books.map((b) => b.number),
  );
  return books.map((bookDiv, i) => {
    const spec = structure.books[i];
    const chapters = bookDiv.children.filter((d) => d.kind === 'chapter');
    checkSequence(
      entry.workId,
      `book ${spec.number} chapter`,
      chapters.map((c) => c.n as string),
      spec.numbers,
    );
    const idPrefix = `${entry.workId}-book-${spec.number}`;
    const children = chapters.map((ch) => buildChapterDivision(entry, spec.number, ch, idPrefix, anomalies, stats));
    return {
      id: `${entry.workId}-book-${spec.number}`,
      number: bookRoman(spec.number),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children,
      passages: [],
    };
  });
}

function convertFragments(
  entry: ArchimedesWorkEntry,
  root: WalkDiv,
  structure: Extract<Structure, { kind: 'fragments' }>,
  anomalies: Anomaly[],
  stats: ConvertStats,
): Division[] {
  const chapters = root.children.filter((d) => d.kind === 'chapter');
  checkSequence(
    entry.workId,
    'fragment chapter',
    chapters.map((c) => c.n as string),
    structure.chapters.map((c) => c.number),
  );

  return chapters.map((chapterDiv, ci) => {
    const spec = structure.chapters[ci];
    const sections = chapterDiv.children.filter((d) => d.kind === 'section');
    checkSequence(
      entry.workId,
      `chapter ${spec.number} section`,
      sections.map((s) => s.n as string),
      spec.sections,
    );

    const id = `${entry.workId}-ch-${chapterDiv.n}`;

    // Chapter head is e.g. "Ι. DE POLYEDRIS." or "ΙΙ. GATOPTRICA." - strip the
    // leading Greek-numeral token, keep the rest verbatim (incl. the source's
    // own "GATOPTRICA" spelling - preserved, not corrected to "Catoptrica";
    // logged as an anomaly below).
    let sourceHeading: string | null = null;
    if (chapterDiv.head) {
      const stripped = chapterDiv.head.replace(/^[Α-Ω]+\.\s*/u, '');
      sourceHeading = stripped.length > 0 ? stripped : chapterDiv.head;
    }

    const passages: Passage[] = [];
    sections.forEach((sec) => {
      // Section head e.g. "1. Pappus V, 34, ed. Hultsch, p. 352." names the
      // ancient secondary source this fragment is quoted from - strip the
      // leading section number and use the rest as this passage's `ref`
      // (deliberately NOT the Mugler-page scheme used elsewhere: each
      // testimonium's own citation is more informative and is itself
      // verbatim source content, not an importer invention).
      const citation = sec.head ? sec.head.replace(/^\d+\.\s*/, '') : null;
      sec.paragraphs.forEach((wp, pi) => {
        const where = `${entry.workId} / division ${id} / section ${sec.n} / passage[${pi}]`;
        const passage = buildPassage(entry, null, `${chapterDiv.n}.${sec.n}`, wp, citation, anomalies, stats, where);
        if (passage) passages.push(passage);
      });
    });

    if (passages.length === 0) {
      throw new StopError(`${entry.workId}: division ${id} has no passages`);
    }

    const pages = sections.flatMap((s) => s.paragraphs.flatMap((p) => [p.startPage, p.endPage]));
    return {
      id,
      number: chapterDiv.n,
      ref: spanRef(entry.muglerVolume, pages),
      sourceHeading,
      editorialTitle: null,
      children: [],
      passages,
    };
  });
}

export function convertWork(entry: ArchimedesWorkEntry, xml: string): ConvertResult {
  const { root, pbValues } = walkEdition(xml, entry.workId);
  const anomalies: Anomaly[] = [];
  const stats: ConvertStats = {
    totalPassages: 0,
    totalChars: 0,
    gapCount: 0,
    addCount: 0,
    delCount: 0,
    figureCount: 0,
  };

  let divisions: Division[];
  if (entry.structure.kind === 'flat') {
    divisions = convertFlat(entry, root, entry.structure, anomalies, stats);
  } else if (entry.structure.kind === 'books') {
    divisions = convertBooks(entry, root, entry.structure, anomalies, stats);
  } else {
    divisions = convertFragments(entry, root, entry.structure, anomalies, stats);
  }

  return { divisions, anomalies, stats, pbValues };
}
