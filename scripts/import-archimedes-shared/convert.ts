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
  // --- BEGIN GENERATED (phase 3a, scratchpad/gen-archimedes-diagrams.mjs) ---

  /**
   * On the Sphere and Cylinder, Book II - same volume/technique as Book I
   * above (archive.org archimedisoperao01arch, Heiberg 1st ed. vol. 1). Book
   * II's propositions 1-9 sit on the even (Greek) leaves 212-272. Prop. 4's
   * second marker (its synthesis) and all of prop. 6 were checked page by
   * page and print no diagram (explicit null / no entry); prop. 8's second
   * entry is its ΑΛΛΩΣ alternate proof's own distinct figure. See
   * aboutText.ts KNOWN_GAPS for the full accounting.
   */
  'archimedes-sphere-cylinder-book-2-ch-1': [
    { image: 'images/book-2-ch-1.png', width: 1086, height: 1444 }, // Heiberg, Archimedis opera omnia vol. I, p. 192, leaf 212; QC re-threshold 2026-09-23 (dense background speckle from the linear alpha ramp removed; see reportLines note)
  ],
  'archimedes-sphere-cylinder-book-2-ch-2': [
    { image: 'images/book-2-ch-2-1.png', width: 1871, height: 830 }, // Heiberg, Archimedis opera omnia vol. I, p. 196, leaf 216; QC re-threshold 2026-09-23 (dense speckle, incl. a noisy page-edge strip at the right, removed; see reportLines note)
    { image: 'images/book-2-ch-2-2.png', width: 1593, height: 960 }, // Heiberg, Archimedis opera omnia vol. I, p. 202, leaf 222; QC re-threshold 2026-09-23 (background speckle removed; see reportLines note)
  ],
  'archimedes-sphere-cylinder-book-2-ch-3': [
    { image: 'images/book-2-ch-3.png', width: 1711, height: 990 }, // Heiberg, Archimedis opera omnia vol. I, p. 208, leaf 228; QC re-threshold 2026-09-23 (background speckle removed; see reportLines note)
  ],
  'archimedes-sphere-cylinder-book-2-ch-4': [
    { image: 'images/book-2-ch-4-1.png', width: 1801, height: 656 }, // Heiberg, Archimedis opera omnia vol. I, p. 210, leaf 230; QC re-threshold 2026-09-23 (background speckle removed; see reportLines note)
    null,
  ],
  'archimedes-sphere-cylinder-book-2-ch-5': [
    { image: 'images/book-2-ch-5.png', width: 1938, height: 1410 }, // Heiberg, Archimedis opera omnia vol. I, p. 220, leaf 240; QC re-threshold + trim 2026-09-23: background speckle removed and a stray footnote-apparatus text fragment bleeding in at the very bottom edge trimmed off (height 1440→1410); see reportLines note
  ],
  'archimedes-sphere-cylinder-book-2-ch-7': [
    { image: 'images/book-2-ch-7-1.png', width: 958, height: 700 }, // Heiberg, Archimedis opera omnia vol. I, p. 232, leaf 252; QC re-threshold 2026-09-23 (background speckle removed; see reportLines note)
    { image: 'images/book-2-ch-7-2.png', width: 875, height: 859 }, // Heiberg, Archimedis opera omnia vol. I, p. 234, leaf 254; QC re-threshold 2026-09-23 (background speckle removed; see reportLines note)
  ],
  'archimedes-sphere-cylinder-book-2-ch-8': [
    { image: 'images/book-2-ch-8-1.png', width: 2151, height: 688 }, // Heiberg, Archimedis opera omnia vol. I, p. 236, leaf 256; QC re-threshold + trim 2026-09-23: background speckle removed and a stray line of body text bleeding in at the top edge trimmed off (height 730→688); see reportLines note
    { image: 'images/book-2-ch-8-2.png', width: 1730, height: 767 }, // Heiberg, Archimedis opera omnia vol. I, p. 244, leaf 264 (ΑΛΛΩΣ, alternate proof); QC re-threshold + trim 2026-09-23: grey apparatus/verso-bleed-through text at the right and a stray page-number fragment at the top edge removed by a hard binary alpha cutoff plus an 16px top trim (height 783→767)
  ],
  'archimedes-sphere-cylinder-book-2-ch-9': [
    { image: 'images/book-2-ch-9.png', width: 1820, height: 1600 }, // Heiberg, Archimedis opera omnia vol. I, p. 252, leaf 272; QC re-threshold 2026-09-23 (background speckle removed; see reportLines note)
  ],

  /**
   * On Spirals - archive.org archimedisoperao02arch (Heiberg 1st ed. vol. 2,
   * Teubner 1881), Greek pages, leaves 32-166. Props. 2, 5, 14, 15, 22 and
   * 28 carry a marker but print no diagram (checked page by page - no entry
   * here, so their marker keeps the honest note); prop. 18's second marker
   * reuses the p. 72 construction unchanged (repeat-last-entry). See
   * aboutText.ts KNOWN_GAPS.
   */
  'archimedes-spirals-ch-1': [
    { image: 'images/ch-1.png', width: 1288, height: 201 }, // Heiberg, Archimedis opera omnia vol. II, p. 16, leaf 32
  ],
  'archimedes-spirals-ch-6': [
    { image: 'images/ch-6.png', width: 950, height: 683 }, // Heiberg, Archimedis opera omnia vol. II, p. 24, leaf 40
  ],
  'archimedes-spirals-ch-7': [
    { image: 'images/ch-7.png', width: 873, height: 718 }, // Heiberg, Archimedis opera omnia vol. II, p. 26, leaf 44
  ],
  'archimedes-spirals-ch-8': [
    { image: 'images/ch-8.png', width: 883, height: 902 }, // Heiberg, Archimedis opera omnia vol. II, p. 30, leaf 48
  ],
  'archimedes-spirals-ch-9': [
    { image: 'images/ch-9.png', width: 1039, height: 929 }, // Heiberg, Archimedis opera omnia vol. II, p. 32, leaf 50
  ],
  'archimedes-spirals-ch-10': [
    { image: 'images/ch-10.png', width: 729, height: 806 }, // Heiberg, Archimedis opera omnia vol. II, p. 36, leaf 54
  ],
  'archimedes-spirals-ch-11': [
    { image: 'images/ch-11.png', width: 656, height: 823 }, // Heiberg, Archimedis opera omnia vol. II, p. 46, leaf 66
  ],
  'archimedes-spirals-ch-12': [
    { image: 'images/ch-12.png', width: 777, height: 530 }, // Heiberg, Archimedis opera omnia vol. II, p. 54, leaf 76
  ],
  'archimedes-spirals-ch-13': [
    { image: 'images/ch-13.png', width: 904, height: 581 }, // Heiberg, Archimedis opera omnia vol. II, p. 56, leaf 78
  ],
  'archimedes-spirals-ch-16': [
    { image: 'images/ch-16.png', width: 1065, height: 1074 }, // Heiberg, Archimedis opera omnia vol. II, p. 64, leaf 86
  ],
  'archimedes-spirals-ch-17': [
    { image: 'images/ch-17.png', width: 1077, height: 1024 }, // Heiberg, Archimedis opera omnia vol. II, p. 68, leaf 90
  ],
  'archimedes-spirals-ch-18': [
    { image: 'images/ch-18.png', width: 1789, height: 555 }, // Heiberg, Archimedis opera omnia vol. II, p. 72, leaf 94
  ],
  'archimedes-spirals-ch-19': [
    { image: 'images/ch-19.png', width: 1597, height: 778 }, // Heiberg, Archimedis opera omnia vol. II, p. 80, leaf 104
  ],
  'archimedes-spirals-ch-20': [
    { image: 'images/ch-20.png', width: 1741, height: 591 }, // Heiberg, Archimedis opera omnia vol. II, p. 84, leaf 108
  ],
  'archimedes-spirals-ch-21': [
    { image: 'images/ch-21.png', width: 962, height: 874 }, // Heiberg, Archimedis opera omnia vol. II, p. 88, leaf 112
  ],
  'archimedes-spirals-ch-23': [
    { image: 'images/ch-23.png', width: 769, height: 763 }, // Heiberg, Archimedis opera omnia vol. II, p. 98, leaf 126
  ],
  'archimedes-spirals-ch-24': [
    { image: 'images/ch-24-1.png', width: 900, height: 1272 }, // Heiberg, Archimedis opera omnia vol. II, p. 100, leaf 128
    { image: 'images/ch-24-2.png', width: 902, height: 1326 }, // Heiberg, Archimedis opera omnia vol. II, p. 104, leaf 134
  ],
  'archimedes-spirals-ch-25': [
    { image: 'images/ch-25-1.png', width: 887, height: 1278 }, // Heiberg, Archimedis opera omnia vol. II, p. 108, leaf 138
    { image: 'images/ch-25-2.png', width: 855, height: 1210 }, // Heiberg, Archimedis opera omnia vol. II, p. 112, leaf 142
  ],
  'archimedes-spirals-ch-26': [
    { image: 'images/ch-26-1.png', width: 818, height: 1400 }, // Heiberg, Archimedis opera omnia vol. II, p. 118, leaf 148
    { image: 'images/ch-26-2.png', width: 855, height: 1255 }, // Heiberg, Archimedis opera omnia vol. II, p. 122, leaf 154; QC re-crop 2026-09-23: original crop included a full column of Greek body text bleeding in from the right margin (and a text fragment at the top edge); re-cropped tighter around the two circles only, with the marginal line-numbers 15/20/25 masked to paper tone before thresholding (threshold 170, lower than the 200 default, to suppress faint verso bleed-through)
  ],
  'archimedes-spirals-ch-27': [
    { image: 'images/ch-27.png', width: 915, height: 767 }, // Heiberg, Archimedis opera omnia vol. II, p. 126, leaf 158
  ],

  /**
   * Quadrature of the Parabola - archive.org archimedisoperao02arch (Heiberg
   * 1st ed. vol. 2), leaves 336-389; most diagrams sit on the Greek (even)
   * leaf but several (props. 4, 13, 15, 16, 19, 22's and 24's second figure)
   * are printed on the Latin (odd) facing page only. Prop. 2 prints no
   * diagram on either page. Prop. 4's page prints two alternate figures
   * captioned "1." and "2."; Heiberg's own note says only fig. 2 is used by
   * the proof, so fig. 2 is the one shipped. See aboutText.ts KNOWN_GAPS.
   */
  'archimedes-quadrature-parabola-ch-1': [
    { image: 'images/ch-1.png', width: 610, height: 879 }, // Heiberg, Archimedis opera omnia vol. II, p. 298, leaf 336
  ],
  'archimedes-quadrature-parabola-ch-3': [
    { image: 'images/ch-3.png', width: 702, height: 579 }, // Heiberg, Archimedis opera omnia vol. II, p. 300, leaf 338
  ],
  'archimedes-quadrature-parabola-ch-4': [
    { image: 'images/ch-4.png', width: 921, height: 930 }, // Heiberg, Archimedis opera omnia vol. II, p. 301, leaf 339 (fig. 2, the only figure actually cited in the proof per the editor's footnote)
  ],
  'archimedes-quadrature-parabola-ch-5': [
    { image: 'images/ch-5.png', width: 599, height: 1083 }, // Heiberg, Archimedis opera omnia vol. II, p. 304, leaf 342
  ],
  'archimedes-quadrature-parabola-ch-6': [
    { image: 'images/ch-6.png', width: 994, height: 584 }, // Heiberg, Archimedis opera omnia vol. II, p. 306, leaf 344
  ],
  'archimedes-quadrature-parabola-ch-7': [
    { image: 'images/ch-7.png', width: 861, height: 527 }, // Heiberg, Archimedis opera omnia vol. II, p. 308, leaf 346
  ],
  'archimedes-quadrature-parabola-ch-8': [
    { image: 'images/ch-8.png', width: 898, height: 587 }, // Heiberg, Archimedis opera omnia vol. II, p. 310, leaf 348
  ],
  'archimedes-quadrature-parabola-ch-9': [
    { image: 'images/ch-9.png', width: 900, height: 597 }, // Heiberg, Archimedis opera omnia vol. II, p. 312, leaf 350
  ],
  'archimedes-quadrature-parabola-ch-10': [
    { image: 'images/ch-10.png', width: 918, height: 656 }, // Heiberg, Archimedis opera omnia vol. II, p. 314, leaf 352
  ],
  'archimedes-quadrature-parabola-ch-11': [
    { image: 'images/ch-11.png', width: 935, height: 582 }, // Heiberg, Archimedis opera omnia vol. II, p. 314, leaf 352
  ],
  'archimedes-quadrature-parabola-ch-12': [
    { image: 'images/ch-12.png', width: 1115, height: 704 }, // Heiberg, Archimedis opera omnia vol. II, p. 316, leaf 354
  ],
  'archimedes-quadrature-parabola-ch-13': [
    { image: 'images/ch-13.png', width: 1129, height: 643 }, // Heiberg, Archimedis opera omnia vol. II, p. 319, leaf 357
  ],
  'archimedes-quadrature-parabola-ch-14': [
    { image: 'images/ch-14.png', width: 1698, height: 1163 }, // Heiberg, Archimedis opera omnia vol. II, p. 322, leaf 360
  ],
  'archimedes-quadrature-parabola-ch-15': [
    { image: 'images/ch-15.png', width: 1150, height: 1178 }, // Heiberg, Archimedis opera omnia vol. II, p. 329, leaf 367
  ],
  'archimedes-quadrature-parabola-ch-16': [
    { image: 'images/ch-16.png', width: 949, height: 1466 }, // Heiberg, Archimedis opera omnia vol. II, p. 331, leaf 369
  ],
  'archimedes-quadrature-parabola-ch-17': [
    { image: 'images/ch-17.png', width: 578, height: 1198 }, // Heiberg, Archimedis opera omnia vol. II, p. 334, leaf 372
  ],
  'archimedes-quadrature-parabola-ch-18': [
    { image: 'images/ch-18.png', width: 697, height: 410 }, // Heiberg, Archimedis opera omnia vol. II, p. 338, leaf 376
  ],
  'archimedes-quadrature-parabola-ch-19': [
    { image: 'images/ch-19.png', width: 712, height: 437 }, // Heiberg, Archimedis opera omnia vol. II, p. 339, leaf 377
  ],
  'archimedes-quadrature-parabola-ch-20': [
    { image: 'images/ch-20.png', width: 799, height: 485 }, // Heiberg, Archimedis opera omnia vol. II, p. 340, leaf 378
  ],
  'archimedes-quadrature-parabola-ch-21': [
    { image: 'images/ch-21.png', width: 1194, height: 620 }, // Heiberg, Archimedis opera omnia vol. II, p. 342, leaf 380
  ],
  'archimedes-quadrature-parabola-ch-22': [
    { image: 'images/ch-22-1.png', width: 1109, height: 562 }, // Heiberg, Archimedis opera omnia vol. II, p. 346, leaf 384
    { image: 'images/ch-22-2.png', width: 1120, height: 471 }, // Heiberg, Archimedis opera omnia vol. II, p. 347, leaf 385
  ],
  'archimedes-quadrature-parabola-ch-23': [
    { image: 'images/ch-23.png', width: 1045, height: 1298 }, // Heiberg, Archimedis opera omnia vol. II, p. 348, leaf 386
  ],
  'archimedes-quadrature-parabola-ch-24': [
    { image: 'images/ch-24-1.png', width: 1180, height: 667 }, // Heiberg, Archimedis opera omnia vol. II, p. 350, leaf 388
    { image: 'images/ch-24-2.png', width: 1425, height: 849 }, // Heiberg, Archimedis opera omnia vol. II, p. 351, leaf 389
  ],

  /**
   * On Floating Bodies - archive.org archimedisoperao02arch (Heiberg 1st ed.
   * vol. 2, 1881), leaves 398-466. In this first edition the work is printed
   * only in William of Moerbeke's medieval LATIN translation (the Greek was
   * recovered from the Palimpsest after 1906), so the diagrams' point-letters
   * are Latin (A B C D E F G ... for Α Β Γ Δ Ε Ζ Η ...) while this app's
   * reading text is Mugler's Greek - disclosed on the About page. Book II
   * prop. 10 prints a master figure plus eleven step figures across its five
   * parts; every one is bundled in marker order. See aboutText.ts KNOWN_GAPS.
   */
  'archimedes-floating-bodies-book-1-ch-1': [
    { image: 'images/book-1-ch-1.png', width: 635, height: 590 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 360, leaf 398
  ],
  'archimedes-floating-bodies-book-1-ch-2': [
    { image: 'images/book-1-ch-2.png', width: 1130, height: 670 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 361, leaf 399
  ],
  'archimedes-floating-bodies-book-1-ch-3': [
    { image: 'images/book-1-ch-3.png', width: 1126, height: 710 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 363, leaf 401
  ],
  'archimedes-floating-bodies-book-1-ch-4': [
    { image: 'images/book-1-ch-4.png', width: 1116, height: 756 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 365, leaf 403
  ],
  'archimedes-floating-bodies-book-1-ch-5': [
    { image: 'images/book-1-ch-5.png', width: 1346, height: 773 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 367, leaf 405 — same diagram as Prop. II, reprinted (text says "disponantur autem eadem prioribus")
  ],
  'archimedes-floating-bodies-book-1-ch-6': [
    { image: 'images/book-1-ch-6.png', width: 710, height: 700 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 368, leaf 406
  ],
  'archimedes-floating-bodies-book-1-ch-7': [
    { image: 'images/book-1-ch-7.png', width: 600, height: 640 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 370, leaf 408
  ],
  'archimedes-floating-bodies-book-1-ch-8': [
    { image: 'images/book-1-ch-8.png', width: 2107, height: 520 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 371, leaf 409 — Prop. VIII's own demonstration is lost in the Tartalea manuscript (Heiberg's apparatus notes the printed diagrams here are mixed with Prop. IX's); these three small figures are the ones the edition prints under the Prop. VIII/Suppositio II heading
  ],
  'archimedes-floating-bodies-book-1-ch-9': [
    { image: 'images/book-1-ch-9.png', width: 1950, height: 1300 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 373, leaf 411 — Prop. IX's own worked diagrams (distinct from the smaller p.371 set shared with Prop. VIII)
  ],
  'archimedes-floating-bodies-book-2-ch-1': [
    { image: 'images/book-2-ch-1.png', width: 510, height: 1140 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 375, leaf 413
  ],
  'archimedes-floating-bodies-book-2-ch-2': [
    { image: 'images/book-2-ch-2.png', width: 1240, height: 810 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 377, leaf 415
  ],
  'archimedes-floating-bodies-book-2-ch-3': [
    { image: 'images/book-2-ch-3.png', width: 1280, height: 890 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 378, leaf 418 — two archive.org scan frames (leaves 416-417) between this and the previous division are QC re-photographs of pp.376-377 (a ruler/finger visible), not new page content; skipped
  ],
  'archimedes-floating-bodies-book-2-ch-4': [
    { image: 'images/book-2-ch-4.png', width: 860, height: 820 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 380, leaf 420
  ],
  'archimedes-floating-bodies-book-2-ch-5': [
    { image: 'images/book-2-ch-5.png', width: 960, height: 840 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 384, leaf 424
  ],
  'archimedes-floating-bodies-book-2-ch-6': [
    { image: 'images/book-2-ch-6-1.png', width: 1060, height: 940 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 387, leaf 427 — "prima figura"
    { image: 'images/book-2-ch-6-2.png', width: 900, height: 1060 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 388, leaf 428 — "secunda figura", explicitly cross-referenced in the text ("sicut in secunda figura descriptum est")
  ],
  'archimedes-floating-bodies-book-2-ch-7': [
    { image: 'images/book-2-ch-7-1.png', width: 1230, height: 1000 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 390, leaf 430
    { image: 'images/book-2-ch-7-2.png', width: 1220, height: 1050 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 391, leaf 431 — second case; Heiberg's apparatus notes "fig. 2 om. Tartalea" (his own reconstruction based on the mathematics)
  ],
  'archimedes-floating-bodies-book-2-ch-8': [
    { image: 'images/book-2-ch-8-1.png', width: 1440, height: 1050 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 393, leaf 433 — first case (axis angle > B)
    { image: 'images/book-2-ch-8-2.png', width: 1620, height: 1260 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 397, leaf 437 — second case (axis angle < B); apparatus notes "fig. 2 om. Tartalea"
  ],
  'archimedes-floating-bodies-book-2-ch-9': [
    { image: 'images/book-2-ch-9.png', width: 1180, height: 1200 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 399, leaf 439
  ],
  'archimedes-floating-bodies-book-2-ch-10': [
    { image: 'images/book-2-ch-10-1.png', width: 1550, height: 1350 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 404, leaf 444 — main construction diagram introducing Prop. X (referenced throughout Parts I-V)
    { image: 'images/book-2-ch-10-2.png', width: 1230, height: 1150 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 410, leaf 450 — Demonstratio partis II, figure 1
    { image: 'images/book-2-ch-10-3.png', width: 910, height: 890 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 412, leaf 452 — Demonstratio partis II, figure 2 (continuation)
    { image: 'images/book-2-ch-10-4.png', width: 1280, height: 1220 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 414, leaf 454 — Demonstratio partis III, figure 1
    { image: 'images/book-2-ch-10-5.png', width: 980, height: 970 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 416, leaf 456 — Demonstratio partis III, figure 2; QC re-crop 2026-09-23: original crop clipped points A and O at the right edge and included stray marginal line-numbers "5"/"10" at the left; re-cropped from the cached leaf with those two line-number digits masked to paper tone before thresholding (threshold 170, lower than the 200 default, to suppress faint verso bleed-through in this crop region) so the full figure (through A, O and the second point A₁) is included with no stray text
    { image: 'images/book-2-ch-10-6.png', width: 930, height: 860 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 417, leaf 457 — Demonstratio partis III, "tertia figura" (explicitly named in the text on p.416); QC trim 2026-09-23: top ~40px trimmed to remove stray descender fragments bleeding in from the text line above the figure on the printed page
    { image: 'images/book-2-ch-10-7.png', width: 1170, height: 1050 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 419, leaf 459 — Demonstratio partis IV, figure 1
    { image: 'images/book-2-ch-10-8.png', width: 860, height: 950 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 420, leaf 460 — Demonstratio partis IV, figure 2
    { image: 'images/book-2-ch-10-9.png', width: 900, height: 820 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 421, leaf 461 — Demonstratio partis IV, "fig. 3" (explicitly cited in a footnote)
    { image: 'images/book-2-ch-10-10.png', width: 1250, height: 1270 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 423, leaf 463 — Demonstratio partis V, figure 1
    { image: 'images/book-2-ch-10-11.png', width: 1230, height: 970 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 424, leaf 464 — Demonstratio partis V, figure 2
    { image: 'images/book-2-ch-10-12.png', width: 950, height: 980 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 426, leaf 466 — Demonstratio partis V, figure 3
  ],

  /**
   * The Method - archive.org methodofarchimed00arch: T. L. Heath, The Method
   * of Archimedes (Cambridge, 1912), which reproduces Heiberg's own figures
   * for props. 1-13 (Heiberg's 1913 2nd-edition volume is not on
   * archive.org). Props. 8, 10 and 11 carry no marker; prop. 9 prints no
   * figure of its own (Heath: the same figure as 8 "with a slight change" -
   * explicit null); props. 12 and 15 have two markers on one figure each.
   * CAVEAT (also on the About page): the figures for props. 14 and 15 are
   * NOT Archimedes'/Heiberg's - the ancient proof of 14 is fragmentary and 15
   * is wholly lost; Heath prints his own (14) and H. G. Zeuthen's (15)
   * modern reconstructions, and those are what is shown, labelled as such.
   */
  'archimedes-method-ch-1': [
    { image: 'images/ch-1.png', width: 1100, height: 1050 }, // Heath, The Method of Archimedes (1912), p. 16, leaf 20 (after Heiberg)
  ],
  'archimedes-method-ch-2': [
    { image: 'images/ch-2.png', width: 1115, height: 1055 }, // Heath, The Method of Archimedes (1912), p. 19, leaf 23 (after Heiberg)
  ],
  'archimedes-method-ch-3': [
    { image: 'images/ch-3.png', width: 920, height: 1090 }, // Heath, The Method of Archimedes (1912), p. 22, leaf 26 (after Heiberg)
  ],
  'archimedes-method-ch-4': [
    { image: 'images/ch-4.png', width: 830, height: 880 }, // Heath, The Method of Archimedes (1912), p. 24, leaf 28 (after Heiberg)
  ],
  'archimedes-method-ch-5': [
    { image: 'images/ch-5.png', width: 770, height: 1020 }, // Heath, The Method of Archimedes (1912), p. 26, leaf 30 (after Heiberg)
  ],
  'archimedes-method-ch-6': [
    { image: 'images/ch-6.png', width: 580, height: 1010 }, // Heath, The Method of Archimedes (1912), p. 28, leaf 32 (after Heiberg)
  ],
  'archimedes-method-ch-7': [
    { image: 'images/ch-7.png', width: 1085, height: 1025 }, // Heath, The Method of Archimedes (1912), p. 30, leaf 34 (after Heiberg)
  ],
  'archimedes-method-ch-9': [
    null,
  ],
  'archimedes-method-ch-12': [
    { image: 'images/ch-12.png', width: 682, height: 685 }, // Heath, The Method of Archimedes (1912), p. 39, leaf 43 (after Heiberg)
    { image: 'images/ch-12.png', width: 682, height: 685 }, // Heath, The Method of Archimedes (1912), p. 39, leaf 43 (after Heiberg)
  ],
  'archimedes-method-ch-13': [
    { image: 'images/ch-13.png', width: 680, height: 715 }, // Heath, The Method of Archimedes (1912), p. 41, leaf 45 (after Heiberg)
  ],
  'archimedes-method-ch-14': [
    { image: 'images/ch-14.png', width: 1100, height: 990 }, // Heath, The Method of Archimedes (1912), p. 45, leaf 49 (Heath's own reconstruction, not Heiberg's)
  ],
  'archimedes-method-ch-15': [
    { image: 'images/ch-15.png', width: 1000, height: 995 }, // Heath, The Method of Archimedes (1912), p. 49, leaf 53 (H.G. Zeuthen's reconstruction, per Heath, not Heiberg's)
    { image: 'images/ch-15.png', width: 1000, height: 995 }, // Heath, The Method of Archimedes (1912), p. 49, leaf 53 (H.G. Zeuthen's reconstruction, per Heath, not Heiberg's)
  ],

  /**
   * Liber Assumptorum (Book of Lemmas) - archive.org archimedisoperao02arch
   * (Heiberg 1st ed. vol. 2), leaves 468-487, one figure per proposition
   * (Latin point-letters, as printed). See aboutText.ts KNOWN_GAPS.
   */
  'archimedes-liber-assumptorum-ch-1': [
    { image: 'images/ch-1.png', width: 868, height: 610 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 428, leaf 468
  ],
  'archimedes-liber-assumptorum-ch-2': [
    { image: 'images/ch-2.png', width: 853, height: 815 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 430, leaf 472
  ],
  'archimedes-liber-assumptorum-ch-3': [
    { image: 'images/ch-3.png', width: 878, height: 509 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 431, leaf 473
  ],
  'archimedes-liber-assumptorum-ch-4': [
    { image: 'images/ch-4.png', width: 958, height: 566 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 432, leaf 474
  ],
  'archimedes-liber-assumptorum-ch-5': [
    { image: 'images/ch-5.png', width: 1370, height: 847 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 433, leaf 475
  ],
  'archimedes-liber-assumptorum-ch-6': [
    { image: 'images/ch-6.png', width: 1384, height: 690 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 435, leaf 477
  ],
  'archimedes-liber-assumptorum-ch-7': [
    { image: 'images/ch-7.png', width: 903, height: 814 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 437, leaf 481
  ],
  'archimedes-liber-assumptorum-ch-8': [
    { image: 'images/ch-8.png', width: 798, height: 614 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 437, leaf 481
  ],
  'archimedes-liber-assumptorum-ch-9': [
    { image: 'images/ch-9.png', width: 628, height: 600 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 438, leaf 482
  ],
  'archimedes-liber-assumptorum-ch-10': [
    { image: 'images/ch-10.png', width: 1024, height: 655 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 439, leaf 483
  ],
  'archimedes-liber-assumptorum-ch-11': [
    { image: 'images/ch-11.png', width: 743, height: 705 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 440, leaf 484
  ],
  'archimedes-liber-assumptorum-ch-12': [
    { image: 'images/ch-12.png', width: 553, height: 857 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 441, leaf 485
  ],
  'archimedes-liber-assumptorum-ch-13': [
    { image: 'images/ch-13.png', width: 724, height: 846 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 442, leaf 486
  ],
  'archimedes-liber-assumptorum-ch-14': [
    { image: 'images/ch-14.png', width: 1031, height: 870 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 443, leaf 487
  ],

  /**
   * The Sand-Reckoner - archive.org archimedisoperao02arch (Heiberg 1st ed.
   * vol. 2), leaf 294 (printed p. 256): the one lettered figure in the work,
   * the sun's-angular-diameter construction. See aboutText.ts KNOWN_GAPS.
   */
  'archimedes-sand-reckoner-ch-1': [
    { image: 'images/ch-1.png', width: 1815, height: 1563 }, // Heiberg, Archimedis opera omnia (1st ed.) vol. II, p. 256, leaf 294
  ],

  /**
   * Stomachion - NO image. The palimpsest fragment's own figure was never
   * printed in a public-domain edition found on archive.org; the only PD
   * diagram located (Suter 1899, an Arabic-tradition "loculus Archimedius")
   * is a different, symmetric dissection and was deliberately rejected. Both
   * markers are explicit nulls (confirmed absence). See aboutText.ts.
   */
  'archimedes-stomachion-ch-1': [
    null,
    null,
  ],
  // --- END GENERATED ---
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
    const start = figureOccurrence.n;
    const diagram = diagrams?.[Math.min(start, diagrams.length - 1)];
    figureOccurrence.n += wp.figureCount;
    const source = figureSource(entry, bookNumber, chapterLabel);
    if (diagram) {
      const figure: PassageFigure = {
        image: diagram.image,
        imageWidth: diagram.width,
        imageHeight: diagram.height,
        alt: `Diagram for ${source}, from the printed edition (${entry.workId === 'archimedes-method' ? 'Heath, The Method of Archimedes, 1912, after Heiberg' : 'Heiberg, Archimedis Opera Omnia'}).`,
        source,
      };
      // A passage carrying several markers whose printed edition shows
      // several DISTINCT figures for them shows the rest as `more`.
      const more: NonNullable<PassageFigure['more']> = [];
      for (let k = start + 1; k < start + wp.figureCount && diagrams && k < diagrams.length; k++) {
        const e = diagrams[k];
        if (!e || e.image === diagram.image) continue;
        more.push({ image: e.image, imageWidth: e.width, imageHeight: e.height, alt: `Further diagram for ${source}, from the same printed edition.` });
      }
      if (more.length) figure.more = more;
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
