/**
 * Coverage math (docs/LEXIS-PLAN.md §1, §6): "you know N% of the running
 * words of this work". A running word token counts as known when its best
 * (first-listed) reading's lexeme has status known/mastered/ignored — an
 * ignored word is one the reader chose to stop being asked about (a proper
 * name, a particle), which reads the same as "known" for coverage purposes.
 * An unrecognised token (no reading at all) never counts as known.
 */
import { wordTokens } from './tokenize.ts';
import { readingsFor } from './index.ts';
import type { KnownWord, LexLang, WorkLexis } from './types.ts';

export interface Coverage {
  tokens: number;
  knownTokens: number;
  /** distinct lexeme ids referenced by the counted tokens */
  lexemes: number;
  knownLexemes: number;
}

const COUNTS_AS_KNOWN = new Set(['known', 'mastered', 'ignored']);

function isKnown(statuses: Map<string, KnownWord>, lexemeId: string): boolean {
  const kw = statuses.get(lexemeId);
  return !!kw && COUNTS_AS_KNOWN.has(kw.status);
}

/** Coverage of a whole work's bundle (tokens/recognized as shipped in the
 *  bundle; known/knownLexemes computed against the reader's own statuses). */
export function workCoverage(bundle: WorkLexis, statuses: Map<string, KnownWord>): Coverage {
  const lexemeIds = new Set<string>();
  const knownLexemeIds = new Set<string>();

  for (const key of Object.keys(bundle.forms)) {
    const readings = bundle.forms[key]!;
    if (!readings.length) continue;
    lexemeIds.add(readings[0]![0]);
  }
  for (const id of lexemeIds) if (isKnown(statuses, id)) knownLexemeIds.add(id);

  // Running-token count: walk every form key's occurrence count isn't stored
  // per-token in the bundle (only aggregate `tokens`/`recognized`), so token
  // coverage is estimated by scaling the bundle's own recognized-token count
  // by the fraction of recognized *forms* whose best reading is known. This
  // keeps workCoverage cheap (no need to re-tokenize the whole work's text)
  // while staying consistent with divisionCoverage's exact per-token count.
  let recognizedForms = 0;
  let knownForms = 0;
  for (const key of Object.keys(bundle.forms)) {
    const readings = bundle.forms[key]!;
    if (!readings.length) continue;
    recognizedForms++;
    if (isKnown(statuses, readings[0]![0])) knownForms++;
  }
  const knownTokens = recognizedForms > 0
    ? Math.round((bundle.recognized * knownForms) / recognizedForms)
    : 0;

  return {
    tokens: bundle.tokens,
    knownTokens,
    lexemes: lexemeIds.size,
    knownLexemes: knownLexemeIds.size,
  };
}

/** Exact per-token coverage of one passage of text (Work screen's per-division
 *  number, or any excerpt): tokenizes `text` and checks each word token's
 *  best reading against `statuses`. */
export function divisionCoverage(
  bundle: WorkLexis,
  text: string,
  lang: LexLang,
  statuses: Map<string, KnownWord>,
): Coverage {
  const words = wordTokens(text, lang);
  const lexemeIds = new Set<string>();
  const knownLexemeIds = new Set<string>();
  let knownTokens = 0;

  for (const tok of words) {
    const readings = readingsFor(bundle, tok.key, lang);
    if (!readings.length) continue;
    const id = readings[0]![0];
    lexemeIds.add(id);
    if (isKnown(statuses, id)) {
      knownTokens++;
      knownLexemeIds.add(id);
    }
  }

  return {
    tokens: words.length,
    knownTokens,
    lexemes: lexemeIds.size,
    knownLexemes: knownLexemeIds.size,
  };
}
