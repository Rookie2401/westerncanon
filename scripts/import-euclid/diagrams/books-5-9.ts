/**
 * Real diagram images for Euclid's Elements Books V-IX, sourced the same
 * way as Books I-IV (see scripts/import-euclid/index.ts REAL_DIAGRAMS and
 * this directory's books-5-9.report.md): rendered from the actual scanned
 * pages of Heiberg, Euclidis Opera Omnia vol. II (Books V-IX; archive.org
 * identifier euclidisoperaomn02eucluoft), and cropped tightly to just the
 * diagram's own ink - pure black on a transparent PNG, used as a CSS mask
 * so it tints to the app's own accent colour. Diagrams sit on the LATIN
 * facing page in this print (never the Greek page), same as Books II-IV.
 *
 * Keyed by leaf division id (e.g. 'book-6-prop-7'), value is the ordered
 * list of that division's own printed diagrams, consumed in <figure/>
 * marker order. A leaf with N figure markers but only M < N printed
 * diagrams has only M entries here; a leaf whose printed edition has NO
 * diagram at all (confirmed by inspecting both the Greek and Latin pages)
 * is simply absent from this map, exactly like the existing REAL_DIAGRAMS
 * convention for Book IV.16 and all of Books V/VII-XIII's undiagrammed
 * markers. Book V (25 propositions) has NO entries at all: every one of
 * its 25 <figure/> markers was hand-checked against the printed page and
 * confirmed to have no diagram in this edition (pure algebraic/verbal
 * proofs about abstract magnitudes, no drawn figure anywhere in the book).
 */

export const DIAGRAMS_BOOKS_5_9: Record<
  string,
  Array<{ image: string; width: number; height: number; source: string }>
> = {
  'book-6-prop-1': [
    { image: 'images/book-6-prop-1.png', width: 856, height: 452, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 75, leaf 101' },
  ],
  'book-6-prop-2': [
    { image: 'images/book-6-prop-2.png', width: 718, height: 505, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 79, leaf 105' },
  ],
  'book-6-prop-3': [
    { image: 'images/book-6-prop-3.png', width: 779, height: 536, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 83, leaf 109' },
  ],
  'book-6-prop-4': [
    { image: 'images/book-6-prop-4.png', width: 767, height: 619, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 87, leaf 113' },
  ],
  'book-6-prop-5': [
    { image: 'images/book-6-prop-5.png', width: 698, height: 702, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 89, leaf 115' },
  ],
  'book-6-prop-6': [
    { image: 'images/book-6-prop-6.png', width: 625, height: 561, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 93, leaf 119' },
  ],
  'book-6-prop-7': [
    { image: 'images/book-6-prop-7-a.png', width: 597, height: 591, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 95, leaf 121' },
    { image: 'images/book-6-prop-7-b.png', width: 573, height: 633, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 99, leaf 125' },
  ],
  'book-6-prop-8': [
    { image: 'images/book-6-prop-8.png', width: 811, height: 464, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 101, leaf 127' },
  ],
  'book-6-prop-9': [
    { image: 'images/book-6-prop-9.png', width: 710, height: 465, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 105, leaf 131' },
  ],
  'book-6-prop-10': [
    { image: 'images/book-6-prop-10.png', width: 725, height: 609, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 107, leaf 133' },
  ],
  'book-6-prop-11': [
    { image: 'images/book-6-prop-11.png', width: 859, height: 780, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 109, leaf 135' },
  ],
  'book-6-prop-12': [
    { image: 'images/book-6-prop-12.png', width: 476, height: 207, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 109, leaf 135' },
  ],
  'book-6-prop-13': [
    { image: 'images/book-6-prop-13.png', width: 770, height: 497, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 111, leaf 137' },
  ],
  'book-6-prop-14': [
    { image: 'images/book-6-prop-14.png', width: 685, height: 660, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 113, leaf 139' },
  ],
  'book-6-prop-15': [
    { image: 'images/book-6-prop-15.png', width: 857, height: 739, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 117, leaf 143' },
  ],
  'book-6-prop-16': [
    { image: 'images/book-6-prop-16.png', width: 1325, height: 493, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 119, leaf 145' },
  ],
  'book-6-prop-17': [
    { image: 'images/book-6-prop-17.png', width: 865, height: 243, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 123, leaf 149' },
  ],
  'book-6-prop-18': [
    { image: 'images/book-6-prop-18.png', width: 775, height: 381, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 125, leaf 151' },
  ],
  'book-6-prop-19': [
    { image: 'images/book-6-prop-19.png', width: 710, height: 449, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 129, leaf 155' },
  ],
  'book-6-prop-20': [
    { image: 'images/book-6-prop-20.png', width: 728, height: 604, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 133, leaf 159' },
  ],
  'book-6-prop-21': [
    { image: 'images/book-6-prop-21.png', width: 561, height: 588, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 141, leaf 167' },
  ],
  'book-6-prop-22': [
    { image: 'images/book-6-prop-22-a.png', width: 524, height: 489, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 143, leaf 169' },
    { image: 'images/book-6-prop-22-b.png', width: 190, height: 424, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 143, leaf 169' },
  ],
  'book-6-prop-23': [
    { image: 'images/book-6-prop-23.png', width: 859, height: 686, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 147, leaf 173' },
  ],
  'book-6-prop-24': [
    { image: 'images/book-6-prop-24.png', width: 720, height: 481, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 151, leaf 177' },
  ],
  'book-6-prop-25': [
    { image: 'images/book-6-prop-25.png', width: 1513, height: 591, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 155, leaf 181' },
  ],
  'book-6-prop-26': [
    { image: 'images/book-6-prop-26.png', width: 958, height: 560, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 157, leaf 183' },
  ],
  'book-6-prop-27': [
    { image: 'images/book-6-prop-27.png', width: 583, height: 361, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 161, leaf 187' },
  ],
  'book-6-prop-29': [
    { image: 'images/book-6-prop-29.png', width: 1205, height: 757, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 169, leaf 195' },
  ],
  'book-6-prop-30': [
    { image: 'images/book-6-prop-30.png', width: 561, height: 686, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 171, leaf 197' },
  ],
  'book-6-prop-31': [
    { image: 'images/book-6-prop-31.png', width: 700, height: 447, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 173, leaf 199' },
  ],
  'book-6-prop-32': [
    { image: 'images/book-6-prop-32.png', width: 549, height: 485, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 177, leaf 203' },
  ],
  'book-6-prop-33': [
    { image: 'images/book-6-prop-33.png', width: 1494, height: 634, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 179, leaf 205' },
  ],
  'book-7-prop-1': [
    { image: 'images/book-7-prop-1.png', width: 352, height: 571, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 189, leaf 215' },
  ],
  'book-7-prop-2': [
    { image: 'images/book-7-prop-2.png', width: 345, height: 432, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 193, leaf 219' },
  ],
  'book-7-prop-3': [
    { image: 'images/book-7-prop-3.png', width: 659, height: 423, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 195, leaf 221' },
  ],
  'book-7-prop-4': [
    { image: 'images/book-7-prop-4.png', width: 338, height: 576, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 201, leaf 227' },
  ],
  'book-7-prop-5': [
    { image: 'images/book-7-prop-5.png', width: 463, height: 394, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 201, leaf 227' },
  ],
  'book-7-prop-6': [
    { image: 'images/book-7-prop-6.png', width: 444, height: 433, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 205, leaf 231' },
  ],
  'book-7-prop-7': [
    { image: 'images/book-7-prop-7.png', width: 1103, height: 282, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 207, leaf 233' },
  ],
  'book-7-prop-8': [
    { image: 'images/book-7-prop-8.png', width: 613, height: 347, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 209, leaf 235' },
  ],
  'book-7-prop-9': [
    { image: 'images/book-7-prop-9.png', width: 460, height: 532, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 211, leaf 237' },
  ],
  'book-7-prop-10': [
    { image: 'images/book-7-prop-10.png', width: 449, height: 342, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 213, leaf 239' },
  ],
  'book-7-prop-11': [
    { image: 'images/book-7-prop-11.png', width: 332, height: 520, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 217, leaf 243' },
  ],
  'book-7-prop-12': [
    { image: 'images/book-7-prop-12.png', width: 221, height: 306, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 217, leaf 243' },
  ],
  'book-7-prop-13': [
    { image: 'images/book-7-prop-13.png', width: 414, height: 534, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 219, leaf 245' },
  ],
  'book-7-prop-14': [
    { image: 'images/book-7-prop-14.png', width: 977, height: 412, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 219, leaf 245' },
  ],
  'book-7-prop-15': [
    { image: 'images/book-7-prop-15.png', width: 898, height: 403, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 221, leaf 247' },
  ],
  'book-7-prop-16': [
    { image: 'images/book-7-prop-16.png', width: 646, height: 456, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 223, leaf 249' },
  ],
  'book-7-prop-17': [
    { image: 'images/book-7-prop-17.png', width: 1010, height: 359, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 225, leaf 251' },
  ],
  'book-7-prop-18': [
    { image: 'images/book-7-prop-18.png', width: 762, height: 360, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 227, leaf 253' },
  ],
  'book-7-prop-19': [
    { image: 'images/book-7-prop-19.png', width: 656, height: 484, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 227, leaf 253' },
  ],
  'book-7-prop-20': [
    { image: 'images/book-7-prop-20.png', width: 227, height: 1100, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 231, leaf 257' },
  ],
  'book-7-prop-21': [
    { image: 'images/book-7-prop-21.png', width: 296, height: 676, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 233, leaf 259' },
  ],
  'book-7-prop-22': [
    { image: 'images/book-7-prop-22.png', width: 453, height: 303, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 235, leaf 261' },
  ],
  'book-7-prop-23': [
    { image: 'images/book-7-prop-23.png', width: 334, height: 498, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 237, leaf 263' },
  ],
  'book-7-prop-24': [
    { image: 'images/book-7-prop-24.png', width: 400, height: 480, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 239, leaf 265' },
  ],
  'book-7-prop-25': [
    { image: 'images/book-7-prop-25.png', width: 225, height: 452, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 241, leaf 267' },
  ],
  'book-7-prop-26': [
    { image: 'images/book-7-prop-26.png', width: 899, height: 335, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 243, leaf 269' },
  ],
  'book-7-prop-27': [
    { image: 'images/book-7-prop-27.png', width: 478, height: 464, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 245, leaf 271' },
  ],
  'book-7-prop-28': [
    { image: 'images/book-7-prop-28.png', width: 628, height: 265, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 247, leaf 273' },
  ],
  'book-7-prop-29': [
    { image: 'images/book-7-prop-29.png', width: 502, height: 269, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 249, leaf 275' },
  ],
  'book-7-prop-30': [
    { image: 'images/book-7-prop-30.png', width: 530, height: 418, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 249, leaf 275' },
  ],
  'book-7-prop-31': [
    { image: 'images/book-7-prop-31.png', width: 399, height: 376, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 251, leaf 277' },
  ],
  'book-7-prop-32': [
    { image: 'images/book-7-prop-32.png', width: 93, height: 276, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 253, leaf 279' },
  ],
  'book-7-prop-33': [
    { image: 'images/book-7-prop-33.png', width: 579, height: 607, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 255, leaf 281' },
  ],
  'book-7-prop-34': [
    { image: 'images/book-7-prop-34-a.png', width: 620, height: 243, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 257, leaf 283' },
    { image: 'images/book-7-prop-34-b.png', width: 594, height: 532, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 259, leaf 285' },
  ],
  'book-7-prop-35': [
    { image: 'images/book-7-prop-35.png', width: 649, height: 250, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 261, leaf 287' },
  ],
  'book-7-prop-36': [
    { image: 'images/book-7-prop-36-a.png', width: 496, height: 386, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 263, leaf 289' },
    { image: 'images/book-7-prop-36-b.png', width: 552, height: 553, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 265, leaf 291' },
  ],
  'book-7-prop-37': [
    { image: 'images/book-7-prop-37.png', width: 443, height: 339, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 267, leaf 293' },
  ],
  'book-7-prop-38': [
    { image: 'images/book-7-prop-38.png', width: 658, height: 382, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 267, leaf 293' },
  ],
  'book-7-prop-39': [
    { image: 'images/book-7-prop-39.png', width: 817, height: 472, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 269, leaf 295' },
  ],
  'book-8-prop-1': [
    { image: 'images/book-8-prop-1.png', width: 1014, height: 335, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 271, leaf 297' },
  ],
  'book-8-prop-2': [
    { image: 'images/book-8-prop-2.png', width: 1022, height: 592, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 273, leaf 299' },
  ],
  'book-8-prop-3': [
    { image: 'images/book-8-prop-3.png', width: 1069, height: 377, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 277, leaf 303' },
  ],
  'book-8-prop-4': [
    { image: 'images/book-8-prop-4-a.png', width: 1246, height: 690, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 281, leaf 307' },
    { image: 'images/book-8-prop-4-b.png', width: 1292, height: 694, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 283, leaf 309' },
  ],
  'book-8-prop-5': [
    { image: 'images/book-8-prop-5.png', width: 815, height: 796, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 287, leaf 313' },
  ],
  'book-8-prop-6': [
    { image: 'images/book-8-prop-6.png', width: 843, height: 784, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 289, leaf 315' },
  ],
  'book-8-prop-7': [
    { image: 'images/book-8-prop-7.png', width: 456, height: 368, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 291, leaf 317' },
  ],
  'book-8-prop-8': [
    { image: 'images/book-8-prop-8.png', width: 1009, height: 705, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 293, leaf 319' },
  ],
  'book-8-prop-9': [
    { image: 'images/book-8-prop-9.png', width: 1096, height: 810, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 297, leaf 323' },
  ],
  'book-8-prop-10': [
    { image: 'images/book-8-prop-10.png', width: 803, height: 613, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 299, leaf 325' },
  ],
  'book-8-prop-11': [
    { image: 'images/book-8-prop-11.png', width: 490, height: 326, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 303, leaf 329' },
  ],
  'book-8-prop-12': [
    { image: 'images/book-8-prop-12.png', width: 1032, height: 434, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 305, leaf 331' },
  ],
  'book-8-prop-13': [
    { image: 'images/book-8-prop-13.png', width: 1397, height: 423, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 309, leaf 335' },
  ],
  'book-8-prop-14': [
    { image: 'images/book-8-prop-14.png', width: 647, height: 355, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 311, leaf 337' },
  ],
  'book-8-prop-15': [
    { image: 'images/book-8-prop-15.png', width: 293, height: 419, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 313, leaf 339' },
  ],
  'book-8-prop-16': [
    { image: 'images/book-8-prop-16.png', width: 486, height: 338, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 315, leaf 341' },
  ],
  'book-8-prop-17': [
    { image: 'images/book-8-prop-17.png', width: 825, height: 402, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 317, leaf 343' },
  ],
  'book-8-prop-18': [
    { image: 'images/book-8-prop-18.png', width: 1261, height: 310, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 319, leaf 345' },
  ],
  'book-8-prop-19': [
    { image: 'images/book-8-prop-19.png', width: 1263, height: 719, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 321, leaf 347' },
  ],
  'book-8-prop-20': [
    { image: 'images/book-8-prop-20.png', width: 978, height: 654, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 327, leaf 353' },
  ],
  'book-8-prop-22': [
    { image: 'images/book-8-prop-22.png', width: 620, height: 540, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 333, leaf 359' },
  ],
  'book-8-prop-23': [
    { image: 'images/book-8-prop-23.png', width: 561, height: 465, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 335, leaf 361' },
  ],
  'book-8-prop-24': [
    { image: 'images/book-8-prop-24.png', width: 740, height: 717, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 335, leaf 361' },
  ],
  'book-8-prop-25': [
    { image: 'images/book-8-prop-25.png', width: 1257, height: 591, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 337, leaf 363' },
  ],
  'book-8-prop-26': [
    { image: 'images/book-8-prop-26.png', width: 1157, height: 497, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 339, leaf 365' },
  ],
  'book-8-prop-27': [
    { image: 'images/book-8-prop-27.png', width: 1455, height: 623, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 339, leaf 365' },
  ],
  'book-9-prop-1': [
    { image: 'images/book-9-prop-1.png', width: 620, height: 402, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 341, leaf 367' },
  ],
  'book-9-prop-2': [
    { image: 'images/book-9-prop-2.png', width: 501, height: 352, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 343, leaf 369' },
  ],
  'book-9-prop-4': [
    { image: 'images/book-9-prop-4.png', width: 342, height: 245, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 347, leaf 373' },
  ],
  'book-9-prop-5': [
    { image: 'images/book-9-prop-5.png', width: 409, height: 282, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 347, leaf 373' },
  ],
  'book-9-prop-6': [
    { image: 'images/book-9-prop-6.png', width: 501, height: 273, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 349, leaf 375' },
  ],
  'book-9-prop-7': [
    { image: 'images/book-9-prop-7.png', width: 564, height: 333, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 351, leaf 377' },
  ],
  'book-9-prop-8': [
    { image: 'images/book-9-prop-8.png', width: 839, height: 582, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 353, leaf 379' },
  ],
  'book-9-prop-10': [
    { image: 'images/book-9-prop-10.png', width: 573, height: 557, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 359, leaf 385' },
  ],
  'book-9-prop-11': [
    { image: 'images/book-9-prop-11.png', width: 706, height: 484, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 363, leaf 389' },
  ],
  'book-9-prop-12': [
    { image: 'images/book-9-prop-12.png', width: 777, height: 346, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 363, leaf 389' },
  ],
  'book-9-prop-14': [
    { image: 'images/book-9-prop-14.png', width: 626, height: 273, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 373, leaf 399' },
  ],
  'book-9-prop-15': [
    { image: 'images/book-9-prop-15.png', width: 771, height: 371, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 375, leaf 401' },
  ],
  'book-9-prop-16': [
    { image: 'images/book-9-prop-16.png', width: 461, height: 317, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 379, leaf 405' },
  ],
  'book-9-prop-17': [
    { image: 'images/book-9-prop-17.png', width: 899, height: 292, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 381, leaf 407' },
  ],
  'book-9-prop-18': [
    { image: 'images/book-9-prop-18.png', width: 998, height: 308, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 383, leaf 409' },
  ],
  'book-9-prop-19': [
    { image: 'images/book-9-prop-19.png', width: 700, height: 497, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 387, leaf 413' },
  ],
  'book-9-prop-20': [
    { image: 'images/book-9-prop-20.png', width: 1170, height: 377, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 389, leaf 415' },
  ],
  'book-9-prop-21': [
    { image: 'images/book-9-prop-21.png', width: 958, height: 202, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 391, leaf 417' },
  ],
  'book-9-prop-22': [
    { image: 'images/book-9-prop-22.png', width: 1251, height: 237, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 393, leaf 419' },
  ],
  'book-9-prop-23': [
    { image: 'images/book-9-prop-23.png', width: 651, height: 114, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 393, leaf 419' },
  ],
  'book-9-prop-24': [
    { image: 'images/book-9-prop-24.png', width: 499, height: 126, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 395, leaf 421' },
  ],
  'book-9-prop-25': [
    { image: 'images/book-9-prop-25.png', width: 1183, height: 134, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 395, leaf 421' },
  ],
  'book-9-prop-26': [
    { image: 'images/book-9-prop-26.png', width: 817, height: 193, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 395, leaf 421' },
  ],
  'book-9-prop-27': [
    { image: 'images/book-9-prop-27.png', width: 1221, height: 144, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 397, leaf 423' },
  ],
  'book-9-prop-28': [
    { image: 'images/book-9-prop-28.png', width: 589, height: 366, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 397, leaf 423' },
  ],
  'book-9-prop-29': [
    { image: 'images/book-9-prop-29.png', width: 589, height: 317, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 399, leaf 425' },
  ],
  'book-9-prop-30': [
    { image: 'images/book-9-prop-30.png', width: 402, height: 513, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 399, leaf 425' },
  ],
  'book-9-prop-31': [
    { image: 'images/book-9-prop-31.png', width: 589, height: 308, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 401, leaf 427' },
  ],
  'book-9-prop-32': [
    { image: 'images/book-9-prop-32.png', width: 919, height: 386, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 403, leaf 429' },
  ],
  'book-9-prop-33': [
    { image: 'images/book-9-prop-33.png', width: 896, height: 180, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 403, leaf 429' },
  ],
  'book-9-prop-34': [
    { image: 'images/book-9-prop-34.png', width: 521, height: 245, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 405, leaf 431' },
  ],
  'book-9-prop-35': [
    { image: 'images/book-9-prop-35.png', width: 1053, height: 454, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 407, leaf 433' },
  ],
  'book-9-prop-36': [
    { image: 'images/book-9-prop-36-a.png', width: 1863, height: 409, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 409, leaf 435' },
    { image: 'images/book-9-prop-36-b.png', width: 1952, height: 528, source: 'Heiberg, Euclidis Opera Omnia vol. II, p. 409, leaf 435' },
  ],
};
