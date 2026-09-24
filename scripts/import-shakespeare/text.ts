/**
 * Shared text helpers for the Shakespeare (PG #100 / Globe-edition-derived)
 * importer. Mirrors the guiding rule used throughout this repo's importers:
 * never discard or silently correct source text; only unwrap the plain-text
 * transport markup (PG's underscore italics) and normalise Unicode/incidental
 * whitespace. Nothing archaic is modernised.
 */

export interface Anomaly {
  where: string;
  note: string;
}

/**
 * PG100 marks italicised runs with a leading/trailing underscore, e.g.
 * "[_Exeunt._]" or "_Mor du vinager!_". This is transcription markup, not
 * printed text (the Globe edition sets these in italics, not with literal
 * underscore characters), so it is unwrapped here exactly like the '' / '''
 * wikitext markers are unwrapped in the Aristophanes importer. Brackets
 * around a stage direction ARE real printed punctuation and are kept as-is.
 */
export function stripItalicMarkers(s: string): string {
  // Repeatedly strip a matched leading/trailing underscore pair; PG100 never
  // nests these for Shakespeare, but guard with a loop in case of adjacent
  // italic runs split by punctuation (e.g. "_Enter Ghost._ _Exit._").
  let out = s;
  for (let guard = 0; guard < 20; guard++) {
    const next = out.replace(/_([^_]*)_/g, '$1');
    if (next === out) break;
    out = next;
  }
  return out;
}

export function collapseWs(input: string): string {
  return input.replace(/[ \t]+/g, ' ').trim();
}

/** stripItalicMarkers -> NFC -> collapseWs. Applied to every individual line. */
export function cleanLine(input: string): string {
  return collapseWs(stripItalicMarkers(input).normalize('NFC'));
}

const ROMAN_MAP: [string, number][] = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
];

export function romanToInt(roman: string): number {
  let n = 0;
  let s = roman.toUpperCase();
  for (const [sym, val] of ROMAN_MAP) {
    while (s.startsWith(sym)) {
      n += val;
      s = s.slice(sym.length);
    }
  }
  return n;
}

export function hasCombining(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) || (cp >= 0x1dc0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff) || (cp >= 0xfe20 && cp <= 0xfe2f)) return true;
  }
  return false;
}

/**
 * A "speaker cue" line in PG100's Globe-derived text: an all-caps label
 * (letters, digits, spaces, apostrophes/curly-apostrophes, commas, periods,
 * ampersands, hyphens), ending in a period, with at least one letter. Title-
 * case stage directions ("Enter ...") and bracketed directions ("[_Exit._]")
 * never match this (they contain lowercase letters or open with "[").
 */
const SPEAKER_CUE_RE = /^[A-Z][A-Z0-9 .,'’&-]*\.$/;

export function isSpeakerCue(line: string): boolean {
  if (!SPEAKER_CUE_RE.test(line)) return false;
  return /[A-Z]/.test(line);
}

/** First word of a line, stripped of leading brackets/quotes, for the
 *  prose/verse wrap heuristic. */
export function firstWord(line: string): string {
  const m = line.trim().match(/^[[“"']*([A-Za-z’']+)/);
  return m ? m[1]! : '';
}
