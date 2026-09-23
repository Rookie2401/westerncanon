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

/**
 * Real diagram images, keyed by division id. Each entry is an ordered list of
 * the division's own diagrams, consumed in source order as <figure> markers
 * are encountered within that division - a division with N distinct printed
 * diagrams referenced by M >= N markers repeats its last entry for any
 * marker past the end of the list (the same printed diagram is being shown
 * again, not a missing one). Every image was sourced by rendering the actual
 * printed page from Heiberg's edition (archive.org euclidisoperaomn01... for
 * Archimedes: wilbourhall.org / archive.org scans of Archimedis Opera Omnia,
 * ed. Heiberg) and cropping tightly to just the diagram's own ink; each crop
 * was checked by hand against the source page. Ships as pure black ink on a
 * transparent PNG, used as a CSS mask (see .gr-figure__img) - never
 * pre-tinted, so it renders in the app's own accent colour automatically.
 */
const DIAGRAMS: Record<
  string,
  readonly ({ image: string; width: number; height: number } | null)[]
> = {
  'archimedes-measurement-circle-ch-1': [{ image: 'images/ch-1.png', width: 509, height: 498 }],
  'archimedes-measurement-circle-ch-2': [{ image: 'images/ch-2.png', width: 1032, height: 357 }],
  'archimedes-measurement-circle-ch-3': [
    { image: 'images/ch-3-circumscribed.png', width: 877, height: 520 },
    { image: 'images/ch-3-inscribed.png', width: 757, height: 385 },
  ],

  /**
   * On the Sphere and Cylinder, Book I - sourced from the SAME Heiberg
   * scan/technique as above (archive.org identifier archimedisoperao01arch,
   * J. L. Heiberg's 1st edition of Archimedis Opera Omnia cum Commentariis
   * Eutocii, vol. 1, Teubner 1880 - IIIF leaves 30, 34, 40, 44, 46, 50, 52,
   * 60, 64, 72 for propositions 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, and leaves
   * 96, 104, 108, 112, 116, 118, 124, 128, 132, 138/140 (duplicate scan of
   * printed p. 120 - the odd-numbered one is a raw calibration photo with a
   * ruler in frame, unusable; the even one is a normal clean page and was
   * used instead), 154, 156, 162, 170, 174, 178, 198, 200 for propositions
   * 16, 18, 19, 20, 21, 22, 24, 25, 26, 28, 32, 33, 34, 35, 37, 38, 42, 43
   * respectively. Only a hand-verified subset of Book I's 45 divisions
   * (pr, 1-44) is covered so far; see KNOWN_GAPS in aboutText.ts for the
   * exact count, the divisions confirmed genuinely diagram-less vs the
   * remainder not yet attempted (and, for propositions 40 and 44, the
   * opposite gap: a diagram genuinely printed in the source but with no
   * <figure> marker in this corpus's own TEI transcription to hang an
   * image on - see KNOWN_GAPS for detail). Propositions 7 and 11 each print
   * a single diagram reused for both of their <figure> markers (7's
   * bracketed "clearer" alternative proof and 11's inductive continuation
   * add no new figure of their own), per this map's own repeat-last-entry
   * convention. Proposition 16 is the opposite case: its first <figure>
   * marker (the main construction) has a real printed diagram, but its
   * second marker (a bracketed interpolated ΛΗΜΜΑ about an unrelated
   * parallelogram gnomon) was checked against its own printed page and
   * confirmed to have no diagram of its own - `null` in that entry's list
   * marks this explicitly rather than letting the repeat-last-entry
   * convention wrongly re-show the first diagram there.
   */
  'archimedes-sphere-cylinder-book-1-ch-1': [
    { image: 'images/book-1-ch-1.png', width: 288, height: 1378 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-3': [
    { image: 'images/book-1-ch-3.png', width: 945, height: 1410 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-5': [
    { image: 'images/book-1-ch-5.png', width: 930, height: 990 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-6': [
    { image: 'images/book-1-ch-6.png', width: 710, height: 1040 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-7': [
    { image: 'images/book-1-ch-7-inscribed.png', width: 900, height: 1030 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-8': [
    { image: 'images/book-1-ch-8.png', width: 680, height: 1600 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-9': [
    { image: 'images/book-1-ch-9.png', width: 730, height: 1400 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-10': [
    { image: 'images/book-1-ch-10.png', width: 750, height: 1180 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-11': [
    { image: 'images/book-1-ch-11.png', width: 500, height: 1320 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-12': [
    { image: 'images/book-1-ch-12.png', width: 950, height: 1270 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-16': [
    { image: 'images/book-1-ch-16.png', width: 642, height: 1147 },
    null,
  ],
  'archimedes-sphere-cylinder-book-1-ch-18': [
    { image: 'images/book-1-ch-18.png', width: 1902, height: 670 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-19': [
    { image: 'images/book-1-ch-19.png', width: 921, height: 1370 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-20': [
    { image: 'images/book-1-ch-20.png', width: 1694, height: 1119 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-21': [
    { image: 'images/book-1-ch-21.png', width: 1076, height: 1007 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-22': [
    { image: 'images/book-1-ch-22.png', width: 847, height: 851 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-24': [
    { image: 'images/book-1-ch-24.png', width: 1711, height: 780 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-25': [
    { image: 'images/book-1-ch-25.png', width: 975, height: 1420 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-26': [
    { image: 'images/book-1-ch-26.png', width: 826, height: 1358 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-28': [
    { image: 'images/book-1-ch-28.png', width: 1080, height: 1110 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-32': [
    { image: 'images/book-1-ch-32.png', width: 1871, height: 960 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-33': [
    { image: 'images/book-1-ch-33.png', width: 1453, height: 930 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-34': [
    { image: 'images/book-1-ch-34.png', width: 1174, height: 611 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-35': [
    { image: 'images/book-1-ch-35.png', width: 1454, height: 680 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-37': [
    { image: 'images/book-1-ch-37.png', width: 800, height: 832 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-38': [
    { image: 'images/book-1-ch-38.png', width: 784, height: 678 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-42': [
    { image: 'images/book-1-ch-42.png', width: 862, height: 835 },
  ],
  'archimedes-sphere-cylinder-book-1-ch-43': [
    { image: 'images/book-1-ch-43.png', width: 1077, height: 941 },
  ],

  /**
   * On Conoids and Spheroids - sourced from the SAME Heiberg scan/technique
   * as the works above, but not from a fresh volume: archive.org identifier
   * archimedisoperao01arch also contains this work (it follows On the Sphere
   * and Cylinder and Measurement of a Circle later in the same Heiberg
   * volume 1), at IIIF leaves 312, 320, 330, 336, 348, 368, 374, 382, 390,
   * 400, 404, 428, 434, 440, 454, 466, 488, 504, 510 and 518 for propositions
   * 1, 2, 4, 5, 8, 12, 14, 15, 18, 19, 20, 22, 23, 24, 25, 26, 27, 30, 31 and
   * 32 respectively (printed pages 292, 298, 308, 314, 326, 346, 352, 360,
   * 368, 378, 382, 406, 412, 418, 432, 442, 462, 478, 484, 492). This work
   * has no book-level division, so its images are keyed 'ch-N' with no
   * 'book-1-' prefix. Only a hand-verified subset of the work's 32 divisions
   * (pr, 1-28, 30-32 - proposition 29 does not exist in the traditional
   * numbering) is covered; see KNOWN_GAPS in aboutText.ts for the exact
   * count and the divisions confirmed genuinely diagram-less vs the rest.
   */
  'archimedes-conoids-spheroids-ch-1': [{ image: 'images/ch-1.png', width: 1800, height: 760 }],
  'archimedes-conoids-spheroids-ch-2': [{ image: 'images/ch-2.png', width: 1386, height: 530 }],
  'archimedes-conoids-spheroids-ch-4': [{ image: 'images/ch-4.png', width: 1330, height: 1920 }],
  'archimedes-conoids-spheroids-ch-5': [{ image: 'images/ch-5.png', width: 1085, height: 1650 }],
  'archimedes-conoids-spheroids-ch-8': [{ image: 'images/ch-8.png', width: 1365, height: 1530 }],
  'archimedes-conoids-spheroids-ch-12': [
    { image: 'images/ch-12.png', width: 1270, height: 1220 },
  ],
  'archimedes-conoids-spheroids-ch-14': [{ image: 'images/ch-14.png', width: 1450, height: 800 }],
  'archimedes-conoids-spheroids-ch-15': [
    { image: 'images/ch-15.png', width: 1420, height: 1500 },
  ],
  'archimedes-conoids-spheroids-ch-18': [{ image: 'images/ch-18.png', width: 1176, height: 780 }],
  'archimedes-conoids-spheroids-ch-19': [
    { image: 'images/ch-19.png', width: 1395, height: 1470 },
  ],
  'archimedes-conoids-spheroids-ch-20': [
    { image: 'images/ch-20.png', width: 1463, height: 1450 },
  ],
  'archimedes-conoids-spheroids-ch-22': [
    { image: 'images/ch-22.png', width: 1764, height: 1382 },
  ],
  'archimedes-conoids-spheroids-ch-23': [
    { image: 'images/ch-23.png', width: 1193, height: 1227 },
  ],
  'archimedes-conoids-spheroids-ch-24': [
    { image: 'images/ch-24.png', width: 1380, height: 1846 },
  ],
  'archimedes-conoids-spheroids-ch-25': [
    { image: 'images/ch-25.png', width: 1214, height: 1800 },
  ],
  'archimedes-conoids-spheroids-ch-26': [
    { image: 'images/ch-26.png', width: 1377, height: 1723 },
  ],
  'archimedes-conoids-spheroids-ch-27': [{ image: 'images/ch-27.png', width: 844, height: 1990 }],
  'archimedes-conoids-spheroids-ch-30': [
    { image: 'images/ch-30.png', width: 1444, height: 1760 },
  ],
  'archimedes-conoids-spheroids-ch-31': [
    { image: 'images/ch-31.png', width: 1740, height: 1330 },
  ],
  'archimedes-conoids-spheroids-ch-32': [
    { image: 'images/ch-32.png', width: 1512, height: 1340 },
  ],

  /**
   * On the Equilibrium of Planes, Books I-II - same Heiberg scan/technique
   * as above, but a DIFFERENT volume: archive.org identifier
   * archimedisoperao02arch, J. L. Heiberg's 1st edition of Archimedis Opera
   * Omnia cum Commentariis Eutocii, vol. 2 (Teubner, 1880) - confirmed by
   * locating this work's own Greek incipit and postulates on the scan before
   * treating the identifier as correct (see KNOWN_GAPS in aboutText.ts for
   * the full sourcing note, leaf numbers, and the two divisions - Book I
   * ch-10's second marker and Book II ch-10 - confirmed to have no diagram
   * of their own despite a <figure> marker, plus Book II ch-3's opposite
   * case: a real printed diagram with no marker to hang it on).
   */
  'archimedes-plane-equilibrium-book-1-ch-3': [
    { image: 'images/book-1-ch-3.png', width: 1459, height: 559 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-4': [
    { image: 'images/book-1-ch-4.png', width: 945, height: 376 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-5': [
    { image: 'images/book-1-ch-5-1.png', width: 1063, height: 614 },
    { image: 'images/book-1-ch-5-2.png', width: 1308, height: 455 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-6': [
    { image: 'images/book-1-ch-6.png', width: 1258, height: 682 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-7': [
    { image: 'images/book-1-ch-7.png', width: 1031, height: 513 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-8': [
    { image: 'images/book-1-ch-8.png', width: 1149, height: 483 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-9': [
    { image: 'images/book-1-ch-9.png', width: 1087, height: 485 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-10': [
    { image: 'images/book-1-ch-10.png', width: 930, height: 494 },
    null,
  ],
  'archimedes-plane-equilibrium-book-1-ch-11': [
    { image: 'images/book-1-ch-11.png', width: 1333, height: 642 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-12': [
    { image: 'images/book-1-ch-12.png', width: 1252, height: 631 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-13': [
    { image: 'images/book-1-ch-13-1.png', width: 1540, height: 974 },
    { image: 'images/book-1-ch-13-2.png', width: 1055, height: 951 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-14': [
    { image: 'images/book-1-ch-14.png', width: 936, height: 849 },
  ],
  'archimedes-plane-equilibrium-book-1-ch-15': [
    { image: 'images/book-1-ch-15.png', width: 1681, height: 1217 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-1': [
    { image: 'images/book-2-ch-1.png', width: 1724, height: 770 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-2': [
    { image: 'images/book-2-ch-2.png', width: 1393, height: 777 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-4': [
    { image: 'images/book-2-ch-4.png', width: 1902, height: 927 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-5': [
    { image: 'images/book-2-ch-5-1.png', width: 1115, height: 558 },
    { image: 'images/book-2-ch-5-2.png', width: 1281, height: 725 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-6': [
    { image: 'images/book-2-ch-6.png', width: 995, height: 1081 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-7': [
    { image: 'images/book-2-ch-7.png', width: 1000, height: 1110 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-8': [
    { image: 'images/book-2-ch-8.png', width: 1305, height: 855 },
  ],
  'archimedes-plane-equilibrium-book-2-ch-9': [
    { image: 'images/book-2-ch-9.png', width: 300, height: 1540 },
  ],
};

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
  divisionId: string,
  figureOccurrence: { n: number },
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
    const diagrams = DIAGRAMS[divisionId];
    const diagram = diagrams?.[Math.min(figureOccurrence.n, diagrams.length - 1)];
    figureOccurrence.n += wp.figureCount;
    const source = figureSource(entry, bookNumber, chapterLabel);
    if (diagram) {
      const figure: PassageFigure = {
        image: diagram.image,
        imageWidth: diagram.width,
        imageHeight: diagram.height,
        alt: `Diagram for ${source}, from the printed edition (Heiberg, Archimedis Opera Omnia).`,
        source,
      };
      passage.figure = figure;
      anomalies.push({
        where,
        note: `<figure> diagram marker (${wp.figureCount}) present in the source; a real diagram image is shown, sourced from the printed edition's scanned page (see data/${entry.workId}/images/).`,
      });
    } else {
      const figure: PassageFigure = { source, note: figureNote(wp.figureCount) };
      passage.figure = figure;
      anomalies.push({
        where,
        note: `<figure> diagram marker (${wp.figureCount}) present in the source; no legitimately-sourced image found (dead heml.mta.ca URL) - honest marker only, no image bundled.`,
      });
    }
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

  const figureOccurrence = { n: 0 };
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
        id,
        figureOccurrence,
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
    const figureOccurrence = { n: 0 };
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
        const passage = buildPassage(
          entry,
          null,
          `${chapterDiv.n}.${sec.n}`,
          wp,
          citation,
          anomalies,
          stats,
          where,
          id,
          figureOccurrence,
        );
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
