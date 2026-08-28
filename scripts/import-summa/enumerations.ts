/**
 * Parse the ordered "utrum ..." list of articles out of a question's prooemium.
 *
 * A quaestio prooemium ends with an enumerated list:
 *   "... Circa primum quaeruntur tria. Primo, utrum ... Secundo, utrum ... Tertio, an ..."
 * Some prooemia first describe the structure of a whole treatise (with their own
 * "Primo ... Secundo ..." runs) and only then give the per-article list, so we
 * must pick the *right* run, not the first.
 *
 * Strategy:
 *  1. Find every ordinal word (primo..vigesimo, both "decimotertio" and
 *     "tertiodecimo" shapes; "secundum" as a spelling of "secundo").
 *  2. From every "primo" occurrence, greedily build the longest ascending run
 *     (primo, secundo, tertio, ...), allowing intervening non-matching ordinals
 *     to be skipped as long as the next expected ordinal appears within a
 *     reasonable window. This defeats false hits like "in primo instanti" or
 *     "quarto capitulo".
 *  3. Prefer runs whose ordinals are capitalised (real list items almost always
 *     start a sentence). Fall back to a case-insensitive pass for the handful of
 *     questions that use a lower-case "et primo ... secundo ..." list.
 *  4. Among candidate runs pick the longest; ties break to the latest-starting
 *     run (the real list comes after any structural preamble).
 *
 * The item text is authentic Aquinas phrasing and is returned as-is (only
 * trimmed of surrounding punctuation/space). Never fabricated.
 */

const ORDINALS: Record<string, number> = {
  primo: 1,
  secundo: 2,
  secundum: 2,
  tertio: 3,
  quarto: 4,
  quinto: 5,
  sexto: 6,
  septimo: 7,
  octavo: 8,
  nono: 9,
  decimo: 10,
  undecimo: 11,
  duodecimo: 12,
  tertiodecimo: 13,
  decimotertio: 13,
  quartodecimo: 14,
  decimoquarto: 14,
  quintodecimo: 15,
  decimoquinto: 15,
  sextodecimo: 16,
  decimosexto: 16,
  septimodecimo: 17,
  decimoseptimo: 17,
  octavodecimo: 18,
  decimooctavo: 18,
  nonodecimo: 19,
  decimonono: 19,
  vigesimo: 20,
};

// Longer alternatives first so "decimotertio" wins over "decimo".
const ORDINAL_ALTERNATION = Object.keys(ORDINALS)
  .sort((a, b) => b.length - a.length)
  .join('|');
const ORDINAL_RE = new RegExp(`\\b(${ORDINAL_ALTERNATION})\\b`, 'gi');

/** Max characters allowed between one list item's ordinal and the next. */
const WINDOW = 900;

interface Token {
  value: number;
  /** index of the first char of the ordinal word */
  start: number;
  /** index just past the ordinal word */
  end: number;
  capitalised: boolean;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  ORDINAL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ORDINAL_RE.exec(text)) !== null) {
    const word = m[1];
    tokens.push({
      value: ORDINALS[word.toLowerCase()],
      start: m.index,
      end: m.index + word.length,
      capitalised: /^[A-Z]/.test(word),
    });
  }
  return tokens;
}

/**
 * Build the longest ascending run starting at token index `startIdx`.
 * Continuation tokens may be any case (the source sometimes drops the sentence
 * separator, leaving a lower-case ordinal glued to the previous item, e.g.
 * "... ad bonum commune duodecimo, utrum ..."). Only the START token's case is
 * constrained by the caller.
 */
function runFrom(tokens: Token[], startIdx: number): Token[] {
  const run: Token[] = [tokens[startIdx]];
  let expected = 2;
  let searchFrom = startIdx + 1;
  let anchorEnd = tokens[startIdx].end;
  while (true) {
    let found = -1;
    for (let i = searchFrom; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.start - anchorEnd > WINDOW) break;
      if (t.value !== expected) continue;
      found = i;
      break;
    }
    if (found === -1) break;
    run.push(tokens[found]);
    anchorEnd = tokens[found].end;
    searchFrom = found + 1;
    expected += 1;
  }
  return run;
}

/**
 * Best ascending run whose START ordinal is capitalised (`capitalisedStart`) or
 * any case. "Best" = longest; ties break to the latest-starting run, since the
 * real per-article list follows any structural preamble.
 */
function bestRun(tokens: Token[], capitalisedStart: boolean): Token[] | null {
  let best: Token[] | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.value !== 1) continue;
    if (capitalisedStart && !t.capitalised) continue;
    const run = runFrom(tokens, i);
    if (run.length < 2) continue;
    if (
      best === null ||
      run.length > best.length ||
      (run.length === best.length && run[0].start > best[0].start)
    ) {
      best = run;
    }
  }
  return best;
}

function extractItems(text: string, run: Token[]): string[] {
  const items: string[] = [];
  for (let i = 0; i < run.length; i++) {
    const from = run[i].end;
    const to = i + 1 < run.length ? run[i + 1].start : text.length;
    let seg = text.slice(from, to).trim();
    seg = seg.replace(/^[,;:.\s]+/, '').replace(/[;,.\s]+$/, '').trim();
    seg = seg.replace(/\s+/g, ' ');
    items.push(seg);
  }
  return items;
}

/**
 * Parse candidate ordered article-title lists from a question prooemium, best
 * first: the capitalised-start run, then (if different) the any-case-start run.
 * Returns `[]` when no usable enumeration run is found.
 */
export function parseArticleEnumeration(prooemium: string | null | undefined): string[][] {
  if (!prooemium) return [];
  const text = prooemium.replace(/\s+/g, ' ').trim();
  const tokens = tokenize(text);
  if (tokens.length < 2) return [];

  const runs = [bestRun(tokens, true), bestRun(tokens, false)];
  const candidates: string[][] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    if (!run || run.length < 2) continue;
    const items = extractItems(text, run);
    if (items.some((s) => s.length === 0)) continue;
    const key = `${run[0].start}:${run.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(items);
  }
  return candidates;
}

export interface TitleAssignment {
  /** Map of article number -> title. Unnumbered articles are never assigned here. */
  byNumber: Map<number, string>;
  /** Reason the enumeration was rejected, if it was. */
  rejected: 'no-prooemium' | 'parse-failed' | 'count-mismatch' | null;
  /** Parsed item count (for reporting), or null. */
  itemCount: number | null;
}

/**
 * Decide article titles for a question.
 *
 * @param prooemium  question-level prooemium text (or null)
 * @param articleNumbers  sorted list of *numbered* article numbers present in the source
 */
export function assignArticleTitles(
  prooemium: string | null,
  articleNumbers: number[],
): TitleAssignment {
  const byNumber = new Map<number, string>();
  if (!prooemium) return { byNumber, rejected: 'no-prooemium', itemCount: null };

  const candidates = parseArticleEnumeration(prooemium);
  if (candidates.length === 0) return { byNumber, rejected: 'parse-failed', itemCount: null };

  if (articleNumbers.length === 0) {
    // Unnumbered single-article question: nothing to line up against.
    return { byNumber, rejected: 'count-mismatch', itemCount: candidates[0].length };
  }

  const count = articleNumbers.length;
  const maxNum = articleNumbers[articleNumbers.length - 1];
  const contiguous = maxNum === count;

  // Accept a candidate when its list plausibly covers every present article:
  //  - exact match to a contiguous 1..N article set, or
  //  - one item per article *slot* up to the highest number present
  //    (source occasionally drops a middle or trailing article), within slack.
  const accepts = (len: number): boolean =>
    (contiguous && len === count) ||
    (len >= maxNum && len <= maxNum + 3) ||
    (contiguous && len >= count && len <= count + 3);

  const chosen = candidates.find((c) => accepts(c.length));
  if (!chosen) {
    return { byNumber, rejected: 'count-mismatch', itemCount: candidates[0].length };
  }

  for (const n of articleNumbers) {
    const idx = n - 1;
    if (idx >= 0 && idx < chosen.length) byNumber.set(n, chosen[idx]);
  }
  return { byNumber, rejected: null, itemCount: chosen.length };
}
