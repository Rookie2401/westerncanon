// Small Greek-specific key helpers used only by the build (not part of the shared lib.mjs
// contract, which owns looseKey/foldKey). Both address gaps GREEK-MORPHOLOGY-RESEARCH.md found
// between kaikki's raw data and this app's own text:
//  - kaikki marks vowel *length* (breve/macron combining marks, e.g. σκῠ́λος) that Perseus
//    editions never mark; stripping them is required for kaikki forms to match our tokens at all.
//  - kaikki's inflection tables are overwhelmingly cited with the acute/citation accent, while
//    running Greek prose uses the grave whenever a word isn't clause-final (a purely positional
//    variant, not phonemic) — worth +23-25 points of token coverage per the research measurement.
import { looseKey } from '../lib.mjs';

const LENGTH_MARKS = /[̄̆]/g;

/** Strip vowel-length (macron/breve) marks, keeping breathing/accent/subscript intact. */
export function stripLength(s) {
  return s.normalize('NFD').replace(LENGTH_MARKS, '').normalize('NFC');
}

/** Grave accent (U+0300, or precomposed with it) -> acute (U+0301), used only as a fallback
 * lookup key against kaikki, which almost never lists the grave-accented form. */
export function graveToAcute(s) {
  return s.normalize('NFD').replace(/̀/g, '́').normalize('NFC');
}

/** kaikki surface form -> the loose key we'd index it under (length stripped first). */
export function kaikkiLooseKey(surface) {
  return looseKey(stripLength(surface), 'grc');
}
