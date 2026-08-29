/**
 * Citation reference parser for the search box. Pure and synchronous; the Search
 * screen resolves the result against the loaded corpus (and gaps.json).
 *
 * Accepted (case-insensitive, `.`/`,` optional, spacing loose):
 *   "I q 2 a 3"      "I q. 2 a. 3"    "I-II 94 2"     "II-II q.23 a.1"
 *   "III 1 1"        "1 2 3"          "prima 2 3"     "I q 2"
 *
 * Part token normalization:
 *   i | ia | 1 | prima                              -> I
 *   i-ii | iaiiae | ia-iiae | 1-2 | 1a2ae | prima secundae   -> I-II
 *   ii-ii | iiaiiae | iia-iiae | 2-2 | 2a2ae | secunda secundae -> II-II
 *   iii | iiia | 3 | tertia                         -> III
 *
 * Documented ambiguity choices:
 *   - A bare leading digit is treated as a PART only when immediately followed
 *     by another number token (`1 2 3` -> I q.2 a.3). Otherwise `11 2` etc. is
 *     left unparsed and falls through to full-text search.
 *   - Bare leading `2` resolves to II-II (the conventional short form for the
 *     largest part); `1` -> I, `3` -> III.
 *   - A reference with no recognizable part does not resolve (there is nothing
 *     to jump to) and falls through to full-text search.
 */
import type { PartCode } from './types.ts';

export interface ParsedRef {
  partCode: PartCode;
  q: number;
  /** Article number, or `null` when the query names only a question. */
  a: number | null;
  /** Canonical citation string, matching the corpus (`"I q. 2 a. 3"` / `"I q. 2"`). */
  citation: string;
  /** True when the user supplied an article number (exact-parse -> Enter jumps). */
  exact: boolean;
}

const NAMED_PART: [RegExp, PartCode][] = [
  [/^(i-ii|ia-iiae|iaiiae|1-2|1a2ae|prima secundae)(?![a-z0-9])/, 'I-II'],
  [/^(ii-ii|iia-iiae|iiaiiae|2-2|2a2ae|secunda secundae)(?![a-z0-9])/, 'II-II'],
  [/^(iii|iiia|tertia)(?![a-z0-9])/, 'III'],
  [/^(i|ia|prima)(?![a-z0-9])/, 'I'],
];

const BARE_DIGIT_PART: Record<string, PartCode> = { '1': 'I', '2': 'II-II', '3': 'III' };

const REST_RE =
  /^(?:q(?:uaestio|uaest|u)?\s*)?(\d{1,3})(?:\s*(?:a(?:rticulus|rt)?\s*)?(\d{1,3}))?$/;

export function parseReference(input: string): ParsedRef | null {
  if (!input) return null;
  let s = input
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  let partCode: PartCode | null = null;

  for (const [re, code] of NAMED_PART) {
    const m = re.exec(s);
    if (m) {
      partCode = code;
      s = s.slice(m[0].length).trim();
      break;
    }
  }

  if (!partCode) {
    const m = /^([123])\s+(?=\d)/.exec(s);
    if (m) {
      partCode = BARE_DIGIT_PART[m[1]];
      s = s.slice(m[0].length).trim();
    }
  }

  if (!partCode) return null;

  const rest = REST_RE.exec(s);
  if (!rest) return null;

  const q = Number(rest[1]);
  const a = rest[2] != null ? Number(rest[2]) : null;
  if (!Number.isFinite(q) || q < 1) return null;
  if (a != null && (!Number.isFinite(a) || a < 1)) return null;

  const citation = a == null ? `${partCode} q. ${q}` : `${partCode} q. ${q} a. ${a}`;
  return { partCode, q, a, citation, exact: a != null };
}
