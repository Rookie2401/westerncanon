/**
 * Card boundaries (starting Greek line numbers) for each of the three
 * Hesiodic poems, plus each poem's final printed line number.
 *
 * Source of truth: each work's own <milestone unit="card" n="N"/> markers,
 * which are present natively in BOTH the Greek and the English TEI file of
 * every one of the three works (verified by direct inspection: all six
 * files carry them, and for each work the Greek and English milestone n
 * lists are byte-identical) - see scripts/import-hesiod-shared/xml.ts's
 * top-of-file comment for the full derivation rationale.
 *
 * Hardcoded here (rather than re-derived from one file by every importer)
 * so all six importers read from this one table; each importer still
 * cross-checks its own file's native milestone list against it at import
 * time and fails loudly on any mismatch, so the Greek and English importer
 * of a given work never risk silently disagreeing about where a card starts.
 */

export const THEOGONY_CARD_BOUNDARIES: number[] = [
  1, 29, 53, 63, 104, 139, 173, 207, 240, 270, 304, 337, 371, 404, 453, 492, 507, 545, 585, 617, 654, 687, 729, 767,
  807, 820, 853, 886, 901, 938, 963, 1003,
];
/** Highest numbered Greek line printed in the source (excludes the lettered 929a-929s interpolation). */
export const THEOGONY_FINAL_LINE = 1022;

export const WORKS_AND_DAYS_CARD_BOUNDARIES: number[] = [
  1, 11, 42, 59, 83, 109, 140, 174, 202, 238, 274, 320, 370, 405, 448, 479, 504, 536, 571, 609, 641, 678, 706, 737,
  765, 800,
];
/** Highest numbered Greek line printed in the source (excludes the lettered 169a-169d interpolation). */
export const WORKS_AND_DAYS_FINAL_LINE = 828;

export const SHIELD_CARD_BOUNDARIES: number[] = [1, 39, 78, 115, 154, 178, 216, 245, 280, 327, 365, 402, 443];
export const SHIELD_FINAL_LINE = 480;
