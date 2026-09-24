/**
 * Real diagram images for Euclid's *Elements* Books XI-XIII (solid geometry),
 * sourced from Heiberg, Euclidis Opera Omnia vol. IV (1885, Books XI-XIII;
 * archive.org identifier euclidisoperaomn04eucl), the same public-domain
 * scanned edition and cropping technique as BOOK_1_DIAGRAMS..BOOK_4_DIAGRAMS
 * in scripts/import-euclid/index.ts (black ink on a transparent PNG, cropped
 * tightly to the diagram's own lines, checked by hand against the source
 * page). Also includes a single Book IV.16 correction (see below).
 *
 * Keyed by leaf id (e.g. "book-11-prop-21"), each entry is an ordered array
 * of that division's own diagrams, consumed in source order as <figure/>
 * markers are encountered - mirrors the Archimedes DIAGRAMS convention in
 * scripts/import-archimedes-shared/convert.ts. A division with a single
 * marker has a one-element array; a division whose print shows the SAME
 * diagram again for a second marker (no new figure drawn) repeats that
 * element rather than re-cropping a duplicate - this happens for:
 *   - book-11-prop-33, book-11-prop-34: two DIFFERENT diagrams, one per marker
 *   - book-12-prop-5, book-13-prop-13: two DIFFERENT diagrams, one per marker
 *   - book-11-prop-22 (2 markers), book-11-prop-23 (3 markers): different
 *     diagrams at different points in the (long) proof
 *   - book-11-prop-31, book-13-prop-16: two <figure/> markers fall inside
 *     the SAME passage (per EXPECTED_TOTAL_FIGURE_OBJECTS in structure.ts,
 *     these merge into a single Passage.figure in the app's data model
 *     anyway) - prop.31 has two genuinely different printed diagrams
 *     (both included); prop.16 has only ONE printed diagram for its pair
 *     of markers, so the array repeats it
 *   - book-13-prop-5: two separate enunciation+proof passages share the
 *     printed page range but only the first has its own diagram (a second
 *     construction was not found printed anywhere in the proof's page
 *     range after a page-by-page check) - repeats the one diagram found
 *   - book-13-prop-18: the second half of the proof (comparing icosahedron
 *     vs dodecahedron side lengths) reuses the SAME lettered figure as the
 *     first half rather than printing a new one - repeats the one diagram
 *
 * NOT included (no image, by design - never fabricated):
 *   - book-13-prop-4: this division's own passages carry ZERO <figure/>
 *     markers in the transcription (confirmed against anomalies.json), yet
 *     the printed edition DOES show a diagram for it (vol. IV leaf 269, p.
 *     259) - a genuine diagram-exists-but-no-marker-to-hang-it-on gap, the
 *     mirror image of the usual case and the same situation documented for
 *     Archimedes Sphere & Cylinder I.40/44 in aboutText.ts. Not included
 *     here since there is no <figure/> marker for this map to be consumed
 *     against; see books-11-13.report.md for the page reference.
 *
 * Book IV.16 correction: the existing BOOK_4_DIAGRAMS in index.ts (and the
 * About page prose) states this proposition "has no printed diagram in this
 * edition at all". Direct inspection of the vol. I scan (identifier
 * euclidisoperaomn01eucluoft) during this task found that this is WRONG:
 * a real diagram (the inscribed regular 15-gon) is printed two pages after
 * the enunciation, on the GREEK page (leaf 334, p. 320) rather than the
 * Latin-facing page every other Book I-IV diagram sits on - which is
 * presumably why it was missed the first time around. Included here as
 * 'book-4-prop-16' so it is available; index.ts/about.json were NOT edited
 * (out of scope for this task) and still assert the old "no diagram" claim
 * until someone wires this in - see the report for detail.
 */
export const DIAGRAMS_BOOKS_11_13: Record<
  string,
  Array<{ image: string; width: number; height: number; source: string }>
> = {
  'book-4-prop-16': [
    { image: 'images/book-4-prop-16.png', width: 954, height: 972, source: 'Heiberg, Euclidis Opera Omnia vol. I, p. 320, leaf 334' },
  ],
  'book-11-prop-1': [
    { image: 'images/book-11-prop-1.png', width: 393, height: 574, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 9, leaf 19' },
  ],
  'book-11-prop-2': [
    { image: 'images/book-11-prop-2.png', width: 442, height: 511, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 11, leaf 21' },
  ],
  'book-11-prop-3': [
    { image: 'images/book-11-prop-3.png', width: 398, height: 559, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 13, leaf 23' },
  ],
  'book-11-prop-4': [
    { image: 'images/book-11-prop-4.png', width: 630, height: 537, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 13, leaf 23' },
  ],
  'book-11-prop-5': [
    { image: 'images/book-11-prop-5.png', width: 548, height: 554, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 19, leaf 29' },
  ],
  'book-11-prop-6': [
    { image: 'images/book-11-prop-6.png', width: 629, height: 686, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 21, leaf 31' },
  ],
  'book-11-prop-7': [
    { image: 'images/book-11-prop-7.png', width: 699, height: 491, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 23, leaf 33' },
  ],
  'book-11-prop-8': [
    { image: 'images/book-11-prop-8.png', width: 554, height: 749, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 25, leaf 35' },
  ],
  'book-11-prop-9': [
    { image: 'images/book-11-prop-9.png', width: 837, height: 420, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 29, leaf 39' },
  ],
  'book-11-prop-10': [
    { image: 'images/book-11-prop-10.png', width: 877, height: 766, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 31, leaf 41' },
  ],
  'book-11-prop-11': [
    { image: 'images/book-11-prop-11.png', width: 633, height: 596, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 33, leaf 43' },
  ],
  'book-11-prop-12': [
    { image: 'images/book-11-prop-12.png', width: 629, height: 549, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 35, leaf 45' },
  ],
  'book-11-prop-13': [
    { image: 'images/book-11-prop-13.png', width: 570, height: 552, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 37, leaf 47' },
  ],
  'book-11-prop-14': [
    { image: 'images/book-11-prop-14.png', width: 1089, height: 554, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 39, leaf 49' },
  ],
  'book-11-prop-15': [
    { image: 'images/book-11-prop-15.png', width: 679, height: 814, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 41, leaf 51' },
  ],
  'book-11-prop-16': [
    { image: 'images/book-11-prop-16.png', width: 1144, height: 759, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 43, leaf 53' },
  ],
  'book-11-prop-17': [
    { image: 'images/book-11-prop-17.png', width: 1216, height: 984, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 47, leaf 57' },
  ],
  'book-11-prop-18': [
    { image: 'images/book-11-prop-18.png', width: 634, height: 514, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 49, leaf 59' },
  ],
  'book-11-prop-19': [
    { image: 'images/book-11-prop-19.png', width: 814, height: 794, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 51, leaf 61' },
  ],
  'book-11-prop-20': [
    { image: 'images/book-11-prop-20.png', width: 979, height: 574, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 53, leaf 63' },
  ],
  'book-11-prop-21': [
    { image: 'images/book-11-prop-21.png', width: 754, height: 539, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 57, leaf 67' },
  ],
  'book-11-prop-22': [
    { image: 'images/book-11-prop-22-a.png', width: 1814, height: 544, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 59, leaf 69' },
    { image: 'images/book-11-prop-22-b.png', width: 808, height: 427, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 61, leaf 71' },
  ],
  'book-11-prop-23': [
    { image: 'images/book-11-prop-23-a.png', width: 1750, height: 511, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 63, leaf 73' },
    { image: 'images/book-11-prop-23-b.png', width: 732, height: 622, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 65, leaf 75' },
    { image: 'images/book-11-prop-23-c.png', width: 554, height: 342, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 71, leaf 81' },
  ],
  'book-11-prop-24': [
    { image: 'images/book-11-prop-24.png', width: 1006, height: 653, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 73, leaf 83' },
  ],
  'book-11-prop-25': [
    { image: 'images/book-11-prop-25.png', width: 1492, height: 716, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 75, leaf 85' },
  ],
  'book-11-prop-26': [
    { image: 'images/book-11-prop-26.png', width: 1552, height: 795, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 79, leaf 89' },
  ],
  'book-11-prop-27': [
    { image: 'images/book-11-prop-27.png', width: 1145, height: 669, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 85, leaf 95' },
  ],
  'book-11-prop-28': [
    { image: 'images/book-11-prop-28.png', width: 689, height: 496, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 85, leaf 95' },
  ],
  'book-11-prop-29': [
    { image: 'images/book-11-prop-29.png', width: 956, height: 590, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 87, leaf 97' },
  ],
  'book-11-prop-30': [
    { image: 'images/book-11-prop-30.png', width: 937, height: 842, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 89, leaf 99' },
  ],
  'book-11-prop-31': [
    { image: 'images/book-11-prop-31-a.png', width: 1401, height: 1647, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 95, leaf 105' },
    { image: 'images/book-11-prop-31-b.png', width: 1507, height: 676, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 97, leaf 107' },
  ],
  'book-11-prop-32': [
    { image: 'images/book-11-prop-32.png', width: 1399, height: 471, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 99, leaf 109' },
  ],
  'book-11-prop-33': [
    { image: 'images/book-11-prop-33-a.png', width: 490, height: 559, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 101, leaf 111' },
    { image: 'images/book-11-prop-33-b.png', width: 1155, height: 870, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 103, leaf 113' },
  ],
  'book-11-prop-34': [
    { image: 'images/book-11-prop-34-a.png', width: 1204, height: 873, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 107, leaf 117' },
    { image: 'images/book-11-prop-34-b.png', width: 1036, height: 1150, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 115, leaf 125' },
  ],
  'book-11-prop-35': [
    { image: 'images/book-11-prop-35.png', width: 732, height: 656, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 119, leaf 129' },
  ],
  'book-11-prop-36': [
    { image: 'images/book-11-prop-36.png', width: 1279, height: 747, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 125, leaf 135' },
  ],
  'book-11-prop-37': [
    { image: 'images/book-11-prop-37.png', width: 1175, height: 653, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 129, leaf 139' },
  ],
  'book-11-prop-38': [
    { image: 'images/book-11-prop-38.png', width: 972, height: 1068, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 133, leaf 143' },
  ],
  'book-11-prop-39': [
    { image: 'images/book-11-prop-39.png', width: 870, height: 396, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 135, leaf 145' },
  ],
  'book-12-prop-1': [
    { image: 'images/book-12-prop-1.png', width: 1324, height: 669, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 139, leaf 149' },
  ],
  'book-12-prop-2': [
    { image: 'images/book-12-prop-2.png', width: 1948, height: 747, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 143, leaf 153' },
  ],
  'book-12-prop-3': [
    { image: 'images/book-12-prop-3.png', width: 917, height: 889, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 155, leaf 165' },
  ],
  'book-12-prop-4': [
    { image: 'images/book-12-prop-4.png', width: 1333, height: 873, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 159, leaf 169' },
  ],
  'book-12-prop-5': [
    { image: 'images/book-12-prop-5-a.png', width: 1085, height: 1065, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 167, leaf 177' },
    { image: 'images/book-12-prop-5-b.png', width: 599, height: 376, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 169, leaf 179' },
  ],
  'book-12-prop-6': [
    { image: 'images/book-12-prop-6.png', width: 1265, height: 708, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 171, leaf 181' },
  ],
  'book-12-prop-7': [
    { image: 'images/book-12-prop-7.png', width: 699, height: 810, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 175, leaf 185' },
  ],
  'book-12-prop-8': [
    { image: 'images/book-12-prop-8.png', width: 937, height: 559, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 177, leaf 187' },
  ],
  'book-12-prop-9': [
    { image: 'images/book-12-prop-9.png', width: 867, height: 700, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 183, leaf 193' },
  ],
  'book-12-prop-10': [
    { image: 'images/book-12-prop-10.png', width: 888, height: 867, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 187, leaf 197' },
  ],
  'book-12-prop-11': [
    { image: 'images/book-12-prop-11.png', width: 1988, height: 810, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 199, leaf 209' },
  ],
  'book-12-prop-12': [
    { image: 'images/book-12-prop-12.png', width: 1052, height: 927, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 205, leaf 215' },
  ],
  'book-12-prop-13': [
    { image: 'images/book-12-prop-13.png', width: 1056, height: 364, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 217, leaf 227' },
  ],
  'book-12-prop-14': [
    { image: 'images/book-12-prop-14.png', width: 599, height: 449, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 221, leaf 231' },
  ],
  'book-12-prop-15': [
    { image: 'images/book-12-prop-15.png', width: 1265, height: 443, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 223, leaf 233' },
  ],
  'book-12-prop-16': [
    { image: 'images/book-12-prop-16.png', width: 649, height: 527, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 227, leaf 237' },
  ],
  'book-12-prop-17': [
    { image: 'images/book-12-prop-17.png', width: 1849, height: 1848, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 231, leaf 241' },
  ],
  'book-12-prop-18': [
    { image: 'images/book-12-prop-18.png', width: 1316, height: 1095, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 243, leaf 253' },
  ],
  'book-13-prop-1': [
    { image: 'images/book-13-prop-1.png', width: 556, height: 750, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 249, leaf 259' },
  ],
  'book-13-prop-2': [
    { image: 'images/book-13-prop-2.png', width: 824, height: 1024, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 253, leaf 263' },
  ],
  'book-13-prop-3': [
    { image: 'images/book-13-prop-3.png', width: 774, height: 774, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 257, leaf 267' },
  ],
  'book-13-prop-5': [
    { image: 'images/book-13-prop-5-a.png', width: 802, height: 590, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 261, leaf 271' },
    { image: 'images/book-13-prop-5-b.png', width: 802, height: 590, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 261, leaf 271' },
  ],
  'book-13-prop-6': [
    { image: 'images/book-13-prop-6.png', width: 916, height: 173, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 263, leaf 273' },
  ],
  'book-13-prop-7': [
    { image: 'images/book-13-prop-7.png', width: 824, height: 804, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 267, leaf 277' },
  ],
  'book-13-prop-8': [
    { image: 'images/book-13-prop-8.png', width: 738, height: 804, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 269, leaf 279' },
  ],
  'book-13-prop-9': [
    { image: 'images/book-13-prop-9.png', width: 974, height: 1059, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 273, leaf 283' },
  ],
  'book-13-prop-10': [
    { image: 'images/book-13-prop-10.png', width: 1094, height: 1074, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 277, leaf 287' },
  ],
  'book-13-prop-11': [
    { image: 'images/book-13-prop-11.png', width: 1214, height: 1034, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 281, leaf 291' },
  ],
  'book-13-prop-12': [
    { image: 'images/book-13-prop-12.png', width: 804, height: 809, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 287, leaf 297' },
  ],
  'book-13-prop-13': [
    { image: 'images/book-13-prop-13-a.png', width: 924, height: 1134, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 289, leaf 299' },
    { image: 'images/book-13-prop-13-b.png', width: 974, height: 1024, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 295, leaf 305' },
  ],
  'book-13-prop-14': [
    { image: 'images/book-13-prop-14.png', width: 609, height: 848, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 297, leaf 307' },
  ],
  'book-13-prop-15': [
    { image: 'images/book-13-prop-15.png', width: 842, height: 874, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 301, leaf 311' },
  ],
  'book-13-prop-16': [
    { image: 'images/book-13-prop-16.png', width: 807, height: 1255, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 315, leaf 325' },
    { image: 'images/book-13-prop-16.png', width: 807, height: 1255, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 315, leaf 325' },
  ],
  'book-13-prop-17': [
    { image: 'images/book-13-prop-17.png', width: 947, height: 1241, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 323, leaf 333' },
  ],
  'book-13-prop-18': [
    { image: 'images/book-13-prop-18-a.png', width: 826, height: 662, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 329, leaf 339' },
    { image: 'images/book-13-prop-18-b.png', width: 826, height: 662, source: 'Heiberg, Euclidis Opera Omnia vol. IV, p. 329, leaf 339' },
  ],
};
