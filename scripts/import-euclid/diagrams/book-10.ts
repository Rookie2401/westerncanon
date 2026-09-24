/**
 * Real diagram images for Euclid's Elements Book X (115 propositions),
 * sourced from the public-domain scan of Heiberg's critical edition -
 * Euclidis Opera Omnia vol. III ("Librum X continens", Teubner 1886),
 * archive.org identifier euclidisoperaomn03eucl - with the same technique
 * as Books I-IV (scripts/import-euclid/index.ts) and V-IX / XI-XIII (this
 * directory): the page rendered via IIIF, the figure cropped to its own ink,
 * black on a transparent PNG, never redrawn. This volume alternates one
 * language per page: even leaves carry the Greek (with each proposition's
 * numeral heading), odd leaves Heiberg's Latin translation, and every
 * diagram in this print sits on a LATIN page - usually the one facing the
 * Greek heading, but for long proofs sometimes the second or third Latin
 * page after it; each was located by eye, not by arithmetic.
 *
 * Keyed by leaf id exactly as in data/euclid-elements/work.json
 * ("book-10-prop1-13" ... "book-10-prop3-115"), arrays in <figure/> marker
 * order (book-10-prop2-71 is the one leaf with two markers on one passage).
 * Leaf ids absent from this map print no figure in this edition - see
 * book-10.report.md for the marker-by-marker accounting, including every
 * "no printed figure" case. Book X's 16 definitions carry no markers.
 *
 * Generated from raw/heiberg-vol3/partial-book-10-{A,B}.json by the
 * orchestrator's merge script; check-book-10.ts verifies files and sizes.
 */

export const DIAGRAMS_BOOK_10: Record<string, Array<{ image: string; width: number; height: number; source: string }>> = {
  'book-10-prop1-1': [
    { image: 'images/book-10-prop-1.png', width: 770, height: 290, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 5, leaf 13' },
  ],
  'book-10-prop1-2': [
    { image: 'images/book-10-prop-2.png', width: 1075, height: 320, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 7, leaf 15' },
  ],
  'book-10-prop1-3': [
    { image: 'images/book-10-prop-3.png', width: 1382, height: 337, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 11, leaf 19' },
  ],
  'book-10-prop1-4': [
    { image: 'images/book-10-prop-4.png', width: 560, height: 445, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 13, leaf 21' },
  ],
  'book-10-prop1-5': [
    { image: 'images/book-10-prop-5.png', width: 624, height: 330, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 17, leaf 25' },
  ],
  'book-10-prop1-6': [
    { image: 'images/book-10-prop-6.png', width: 950, height: 292, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 19, leaf 27' },
  ],
  'book-10-prop1-7': [
    { image: 'images/book-10-prop-7.png', width: 244, height: 240, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 23, leaf 31' },
  ],
  'book-10-prop1-8': [
    { image: 'images/book-10-prop-8.png', width: 267, height: 212, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 23, leaf 31' },
  ],
  'book-10-prop1-9': [
    { image: 'images/book-10-prop-9.png', width: 650, height: 400, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 25, leaf 33' },
  ],
  'book-10-prop1-10': [
    { image: 'images/book-10-prop-10.png', width: 556, height: 460, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 33, leaf 41' },
  ],
  'book-10-prop1-11': [
    { image: 'images/book-10-prop-11.png', width: 829, height: 179, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 35, leaf 43' },
  ],
  'book-10-prop1-12': [
    { image: 'images/book-10-prop-12.png', width: 1080, height: 510, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 37, leaf 45' },
  ],
  'book-10-prop1-13': [
    { image: 'images/book-10-prop-13-a.png', width: 578, height: 239, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 39, leaf 47' },
    { image: 'images/book-10-prop-13-b.png', width: 800, height: 380, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 39, leaf 47' },
  ],
  'book-10-prop1-14': [
    { image: 'images/book-10-prop-14.png', width: 600, height: 590, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 41, leaf 49' },
  ],
  'book-10-prop1-15': [
    { image: 'images/book-10-prop-15.png', width: 870, height: 220, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 43, leaf 51' },
  ],
  'book-10-prop1-16': [
    { image: 'images/book-10-prop-16.png', width: 293, height: 656, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 47, leaf 55' },
  ],
  'book-10-prop1-17': [
    { image: 'images/book-10-prop-17.png', width: 499, height: 320, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 49, leaf 57' },
  ],
  'book-10-prop1-18': [
    { image: 'images/book-10-prop-18.png', width: 336, height: 570, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 53, leaf 61' },
  ],
  'book-10-prop1-19': [
    { image: 'images/book-10-prop-19.png', width: 468, height: 380, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 59, leaf 67' },
  ],
  'book-10-prop1-20': [
    { image: 'images/book-10-prop-20.png', width: 386, height: 612, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 59, leaf 67' },
  ],
  'book-10-prop1-21': [
    { image: 'images/book-10-prop-21-a.png', width: 370, height: 663, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 61, leaf 69' },
    { image: 'images/book-10-prop-21-b.png', width: 649, height: 335, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 63, leaf 71' },
  ],
  'book-10-prop1-22': [
    { image: 'images/book-10-prop-22.png', width: 610, height: 499, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 65, leaf 73' },
  ],
  'book-10-prop1-23': [
    { image: 'images/book-10-prop-23.png', width: 620, height: 626, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 67, leaf 75' },
  ],
  'book-10-prop1-24': [
    { image: 'images/book-10-prop-24.png', width: 280, height: 566, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 71, leaf 79' },
  ],
  'book-10-prop1-25': [
    { image: 'images/book-10-prop-25.png', width: 746, height: 480, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 71, leaf 79' },
  ],
  'book-10-prop1-26': [
    { image: 'images/book-10-prop-26.png', width: 407, height: 913, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 75, leaf 83' },
  ],
  'book-10-prop1-27': [
    { image: 'images/book-10-prop-27.png', width: 323, height: 580, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 77, leaf 85' },
  ],
  'book-10-prop1-28': [
    { image: 'images/book-10-prop-28-a.png', width: 768, height: 350, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 79, leaf 87' },
    { image: 'images/book-10-prop-28-b.png', width: 105, height: 449, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 81, leaf 89' },
    { image: 'images/book-10-prop-28-c.png', width: 123, height: 667, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 83, leaf 91' },
  ],
  'book-10-prop1-29': [
    { image: 'images/book-10-prop-29.png', width: 492, height: 407, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 87, leaf 95' },
  ],
  'book-10-prop1-30': [
    { image: 'images/book-10-prop-30.png', width: 620, height: 510, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 89, leaf 97' },
  ],
  'book-10-prop1-31': [
    { image: 'images/book-10-prop-31.png', width: 389, height: 385, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 91, leaf 99' },
  ],
  'book-10-prop1-32': [
    { image: 'images/book-10-prop-32.png', width: 900, height: 330, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 95, leaf 103' },
  ],
  'book-10-prop1-33': [
    { image: 'images/book-10-prop-33.png', width: 1030, height: 350, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 99, leaf 107' },
  ],
  'book-10-prop1-34': [
    { image: 'images/book-10-prop-34.png', width: 978, height: 266, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 103, leaf 111' },
  ],
  'book-10-prop1-35': [
    { image: 'images/book-10-prop-35.png', width: 1036, height: 334, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 105, leaf 113' },
  ],
  'book-10-prop1-36': [
    { image: 'images/book-10-prop-36.png', width: 780, height: 180, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 107, leaf 115' },
  ],
  'book-10-prop1-37': [
    { image: 'images/book-10-prop-37.png', width: 448, height: 128, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 109, leaf 117' },
  ],
  'book-10-prop1-38': [
    { image: 'images/book-10-prop-38.png', width: 1050, height: 500, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 111, leaf 119' },
  ],
  'book-10-prop1-39': [
    { image: 'images/book-10-prop-39.png', width: 602, height: 89, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 115, leaf 123' },
  ],
  'book-10-prop1-40': [
    { image: 'images/book-10-prop-40.png', width: 172, height: 480, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 115, leaf 123' },
  ],
  'book-10-prop1-41': [
    { image: 'images/book-10-prop-41.png', width: 431, height: 652, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 117, leaf 125' },
  ],
  'book-10-prop1-42': [
    { image: 'images/book-10-prop-42.png', width: 213, height: 708, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 123, leaf 131' },
  ],
  'book-10-prop1-43': [
    { image: 'images/book-10-prop-43.png', width: 724, height: 130, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 125, leaf 133' },
  ],
  'book-10-prop1-44': [
    { image: 'images/book-10-prop-44.png', width: 1159, height: 395, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 127, leaf 135' },
  ],
  'book-10-prop1-45': [
    { image: 'images/book-10-prop-45.png', width: 220, height: 570, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 131, leaf 139' },
  ],
  'book-10-prop1-46': [
    { image: 'images/book-10-prop-46.png', width: 129, height: 603, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 133, leaf 141' },
  ],
  'book-10-prop1-47': [
    { image: 'images/book-10-prop-47.png', width: 794, height: 686, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 135, leaf 143' },
  ],
  'book-10-prop2-48': [
    { image: 'images/book-10-prop-48.png', width: 1010, height: 420, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 139, leaf 147' },
  ],
  'book-10-prop2-49': [
    { image: 'images/book-10-prop-49.png', width: 439, height: 500, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 141, leaf 149' },
  ],
  'book-10-prop2-50': [
    { image: 'images/book-10-prop-50.png', width: 1100, height: 360, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 143, leaf 151' },
  ],
  'book-10-prop2-51': [
    { image: 'images/book-10-prop-51.png', width: 419, height: 697, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 147, leaf 155' },
  ],
  'book-10-prop2-52': [
    { image: 'images/book-10-prop-52.png', width: 458, height: 596, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 151, leaf 159' },
  ],
  'book-10-prop2-53': [
    { image: 'images/book-10-prop-53.png', width: 341, height: 799, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 153, leaf 161' },
  ],
  'book-10-prop2-54': [
    { image: 'images/book-10-prop-54.png', width: 750, height: 900, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 159, leaf 167' },
  ],
  'book-10-prop2-55': [
    { image: 'images/book-10-prop-55.png', width: 863, height: 830, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 167, leaf 175' },
  ],
  'book-10-prop2-56': [
    { image: 'images/book-10-prop-56.png', width: 869, height: 850, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 171, leaf 179' },
  ],
  'book-10-prop2-57': [
    { image: 'images/book-10-prop-57.png', width: 811, height: 867, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 173, leaf 181' },
  ],
  'book-10-prop2-58': [
    { image: 'images/book-10-prop-58.png', width: 870, height: 900, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 177, leaf 185' },
  ],
  'book-10-prop2-59': [
    { image: 'images/book-10-prop-59-a.png', width: 870, height: 830, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 179, leaf 187' },
    { image: 'images/book-10-prop-59-b.png', width: 79, height: 560, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 181, leaf 189' },
  ],
  'book-10-prop2-60': [
    { image: 'images/book-10-prop-60.png', width: 640, height: 450, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 183, leaf 191' },
  ],
  'book-10-prop2-61': [
    { image: 'images/book-10-prop-61.png', width: 640, height: 430, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 187, leaf 195' },
  ],
  'book-10-prop2-62': [
    { image: 'images/book-10-prop-62.png', width: 630, height: 490, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 189, leaf 197' },
  ],
  'book-10-prop2-63': [
    { image: 'images/book-10-prop-63.png', width: 640, height: 470, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 193, leaf 201' },
  ],
  'book-10-prop2-64': [
    { image: 'images/book-10-prop-64.png', width: 640, height: 420, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 195, leaf 203' },
  ],
  'book-10-prop2-65': [
    { image: 'images/book-10-prop-65.png', width: 595, height: 401, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 199, leaf 207' },
  ],
  'book-10-prop2-66': [
    { image: 'images/book-10-prop-66.png', width: 750, height: 250, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 201, leaf 209' },
  ],
  'book-10-prop2-67': [
    { image: 'images/book-10-prop-67.png', width: 324, height: 196, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 205, leaf 213' },
  ],
  'book-10-prop2-68': [
    { image: 'images/book-10-prop-68.png', width: 217, height: 443, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 207, leaf 215' },
  ],
  'book-10-prop2-69': [
    { image: 'images/book-10-prop-69.png', width: 250, height: 502, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 211, leaf 219' },
  ],
  'book-10-prop2-70': [
    { image: 'images/book-10-prop-70.png', width: 232, height: 476, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 211, leaf 219' },
  ],
  'book-10-prop2-71': [
    { image: 'images/book-10-prop-71-a.png', width: 815, height: 620, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 213, leaf 221' },
    { image: 'images/book-10-prop-71-b.png', width: 765, height: 610, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 217, leaf 225' },
  ],
  'book-10-prop2-72': [
    { image: 'images/book-10-prop-72.png', width: 808, height: 700, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 219, leaf 227' },
  ],
  'book-10-prop2-73': [
    { image: 'images/book-10-prop-73.png', width: 650, height: 189, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 225, leaf 233' },
  ],
  'book-10-prop2-74': [
    { image: 'images/book-10-prop-74.png', width: 124, height: 559, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 227, leaf 235' },
  ],
  'book-10-prop2-75': [
    { image: 'images/book-10-prop-75.png', width: 900, height: 623, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 229, leaf 237' },
  ],
  'book-10-prop2-76': [
    { image: 'images/book-10-prop-76.png', width: 750, height: 250, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 231, leaf 239' },
  ],
  'book-10-prop2-78': [
    { image: 'images/book-10-prop-78.png', width: 756, height: 418, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 235, leaf 243' },
  ],
  'book-10-prop2-79': [
    { image: 'images/book-10-prop-79.png', width: 182, height: 1000, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 239, leaf 247' },
  ],
  'book-10-prop2-80': [
    { image: 'images/book-10-prop-80.png', width: 163, height: 869, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 241, leaf 249' },
  ],
  'book-10-prop2-81': [
    { image: 'images/book-10-prop-81.png', width: 800, height: 774, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 243, leaf 251' },
  ],
  'book-10-prop2-82': [
    { image: 'images/book-10-prop-82.png', width: 850, height: 130, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 247, leaf 255' },
  ],
  'book-10-prop2-83': [
    { image: 'images/book-10-prop-83.png', width: 700, height: 140, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 249, leaf 257' },
  ],
  'book-10-prop2-84': [
    { image: 'images/book-10-prop-84.png', width: 800, height: 583, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 251, leaf 259' },
  ],
  'book-10-prop3-85': [
    { image: 'images/book-10-prop-85.png', width: 900, height: 249, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 257, leaf 265' },
  ],
  'book-10-prop3-86': [
    { image: 'images/book-10-prop-86.png', width: 800, height: 565, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 259, leaf 267' },
  ],
  'book-10-prop3-87': [
    { image: 'images/book-10-prop-87.png', width: 800, height: 578, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 261, leaf 269' },
  ],
  'book-10-prop3-88': [
    { image: 'images/book-10-prop-88.png', width: 780, height: 235, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 267, leaf 275' },
  ],
  'book-10-prop3-89': [
    { image: 'images/book-10-prop-89.png', width: 328, height: 648, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 269, leaf 277' },
  ],
  'book-10-prop3-90': [
    { image: 'images/book-10-prop-90.png', width: 610, height: 560, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 271, leaf 279' },
  ],
  'book-10-prop3-91': [
    { image: 'images/book-10-prop-91.png', width: 820, height: 900, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 275, leaf 283' },
  ],
  'book-10-prop3-92': [
    { image: 'images/book-10-prop-92.png', width: 820, height: 830, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 281, leaf 289' },
  ],
  'book-10-prop3-93': [
    { image: 'images/book-10-prop-93.png', width: 816, height: 830, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 287, leaf 295' },
  ],
  'book-10-prop3-94': [
    { image: 'images/book-10-prop-94.png', width: 820, height: 828, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 293, leaf 301' },
  ],
  'book-10-prop3-95': [
    { image: 'images/book-10-prop-95.png', width: 820, height: 980, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 297, leaf 305' },
  ],
  'book-10-prop3-96': [
    { image: 'images/book-10-prop-96.png', width: 780, height: 900, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 301, leaf 309' },
  ],
  'book-10-prop3-97': [
    { image: 'images/book-10-prop-97.png', width: 712, height: 471, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 305, leaf 313' },
  ],
  'book-10-prop3-98': [
    { image: 'images/book-10-prop-98.png', width: 620, height: 480, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 311, leaf 319' },
  ],
  'book-10-prop3-99': [
    { image: 'images/book-10-prop-99.png', width: 620, height: 480, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 315, leaf 323' },
  ],
  'book-10-prop3-100': [
    { image: 'images/book-10-prop-100.png', width: 595, height: 473, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 319, leaf 327' },
  ],
  'book-10-prop3-101': [
    { image: 'images/book-10-prop-101.png', width: 614, height: 465, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 325, leaf 333' },
  ],
  'book-10-prop3-102': [
    { image: 'images/book-10-prop-102.png', width: 700, height: 420, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 329, leaf 337' },
  ],
  'book-10-prop3-104': [
    { image: 'images/book-10-prop-104.png', width: 330, height: 605, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 335, leaf 343' },
  ],
  'book-10-prop3-105': [
    { image: 'images/book-10-prop-105.png', width: 330, height: 650, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 337, leaf 345' },
  ],
  'book-10-prop3-106': [
    { image: 'images/book-10-prop-106.png', width: 330, height: 611, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 341, leaf 349' },
  ],
  'book-10-prop3-107': [
    { image: 'images/book-10-prop-107.png', width: 290, height: 562, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 341, leaf 349' },
  ],
  'book-10-prop3-108': [
    { image: 'images/book-10-prop-108.png', width: 973, height: 803, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 343, leaf 351' },
  ],
  'book-10-prop3-109': [
    { image: 'images/book-10-prop-109.png', width: 870, height: 900, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 347, leaf 355' },
  ],
  'book-10-prop3-110': [
    { image: 'images/book-10-prop-110.png', width: 749, height: 609, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 349, leaf 357' },
  ],
  'book-10-prop3-111': [
    { image: 'images/book-10-prop-111.png', width: 657, height: 800, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 351, leaf 359' },
  ],
  'book-10-prop3-112': [
    { image: 'images/book-10-prop-112.png', width: 1371, height: 397, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 357, leaf 365' },
  ],
  'book-10-prop3-113': [
    { image: 'images/book-10-prop-113.png', width: 519, height: 702, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 363, leaf 371' },
  ],
  'book-10-prop3-114': [
    { image: 'images/book-10-prop-114.png', width: 602, height: 603, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 367, leaf 375' },
  ],
  'book-10-prop3-115': [
    { image: 'images/book-10-prop-115.png', width: 700, height: 350, source: 'Heiberg, Euclidis Opera Omnia vol. III, p. 371, leaf 379' },
  ],
};
