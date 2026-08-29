/**
 * Full-text Latin search over search-index.json, plus original-case snippet
 * extraction from a loaded article.
 *
 * Query folding uses exactly the same rules as the index (see fold.ts), so the
 * folded query lines up with `record.text`. Ranking: exact folded phrase first,
 * then all-tokens-present (AND), then partial (some tokens). No English, fuzzy,
 * or theological expansion.
 */
import { PARTS } from './corpus.ts';
import { fold, tokenize } from './fold.ts';
import type { Article, SearchRecord } from './types.ts';

export const Rank = { Phrase: 0, AllTokens: 1, SomeTokens: 2 } as const;
export type Rank = (typeof Rank)[keyof typeof Rank];

export interface SearchHit {
  record: SearchRecord;
  rank: Rank;
}

const partOrder = new Map(PARTS.map((p, i) => [p.code, i]));

function citationSortKey(r: SearchRecord): number {
  const p = partOrder.get(r.partCode) ?? 9;
  return p * 1_000_000 + r.q * 1000 + (r.a ?? 0);
}

export function runSearch(query: string, records: SearchRecord[], limit = 200): SearchHit[] {
  const fq = fold(query);
  if (!fq) return [];
  const tokens = tokenize(fq);
  if (!tokens.length) return [];
  const multi = tokens.length > 1;

  const hits: SearchHit[] = [];
  for (const record of records) {
    const text = record.text;
    let rank: Rank | null = null;

    if (multi && text.includes(fq)) {
      rank = Rank.Phrase;
    } else {
      let present = 0;
      for (const t of tokens) if (text.includes(t)) present += 1;
      if (present === tokens.length) rank = multi ? Rank.AllTokens : Rank.Phrase;
      else if (present > 0) rank = Rank.SomeTokens;
    }

    if (rank != null) hits.push({ record, rank });
  }

  hits.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return citationSortKey(a.record) - citationSortKey(b.record);
  });

  return hits.slice(0, limit);
}

/** Concatenate an article's Latin in reading order, original case. */
export function articleText(a: Article): string {
  const parts: string[] = [];
  if (a.title) parts.push(a.title);
  for (const o of a.objections) parts.push(o.text);
  for (const s of a.sedContra) parts.push(s.text);
  if (a.respondeo) parts.push(a.respondeo);
  for (const r of a.replies) parts.push(r.text);
  return parts.join('\n\n');
}

interface FoldMap {
  folded: string;
  /** map[i] = index in the original string of folded char i. */
  map: number[];
}

function foldWithMap(input: string): FoldMap {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '');
    for (let k = 0; k < ch.length; k += 1) {
      folded += ch[k];
      map.push(i);
    }
  }
  map.push(input.length);
  return { folded, map };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
  /** Whether a hit was located at all. */
  found: boolean;
}

/**
 * Build a ±window original-case snippet around the first fold-aware hit for
 * `query` inside `source`. Falls back to the first matching token, then to the
 * head of the text.
 */
export function buildSnippet(source: string, query: string, window = 120): Snippet {
  const { folded, map } = foldWithMap(source);
  const fq = fold(query);
  const tokens = tokenize(fq);

  let start = -1;
  let end = -1;

  if (fq) {
    const phraseRe = new RegExp(
      fq.split(' ').map(escapeRe).join('\\s+'),
      'i',
    );
    const m = phraseRe.exec(folded);
    if (m) {
      start = m.index;
      end = m.index + m[0].length;
    }
  }

  if (start < 0) {
    for (const t of tokens) {
      const idx = folded.indexOf(t);
      if (idx >= 0) {
        start = idx;
        end = idx + t.length;
        break;
      }
    }
  }

  if (start < 0) {
    const head = source.slice(0, window * 2).trim();
    return {
      before: '',
      match: '',
      after: head + (source.length > window * 2 ? '…' : ''),
      found: false,
    };
  }

  const oStart = map[start] ?? 0;
  const oEnd = map[end] ?? source.length;

  let winStart = Math.max(0, oStart - window);
  let winEnd = Math.min(source.length, oEnd + window);

  // Trim to whitespace so we don't cut mid-word.
  if (winStart > 0) {
    const sp = source.indexOf(' ', winStart);
    if (sp >= 0 && sp < oStart) winStart = sp + 1;
  }
  if (winEnd < source.length) {
    const sp = source.lastIndexOf(' ', winEnd);
    if (sp > oEnd) winEnd = sp;
  }

  const before = (winStart > 0 ? '…' : '') + source.slice(winStart, oStart);
  const match = source.slice(oStart, oEnd);
  const after = source.slice(oEnd, winEnd) + (winEnd < source.length ? '…' : '');
  return { before, match, after, found: true };
}
