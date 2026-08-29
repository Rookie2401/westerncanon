import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Rank, buildSnippet, runSearch } from '../corpus/search.ts';
import type { SearchRecord } from '../corpus/types.ts';

const records: SearchRecord[] = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../data/summa/search-index.json', import.meta.url)),
    'utf8',
  ),
);

describe('runSearch', () => {
  it('finds "quinque viis" and includes I q. 2 a. 3', () => {
    const hits = runSearch('quinque viis', records);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.record.citation === 'I q. 2 a. 3')).toBe(true);
  });

  it('ranks exact-phrase matches above scattered-token matches', () => {
    const hits = runSearch('quinque viis', records);
    const firstNonPhrase = hits.findIndex((h) => h.rank !== Rank.Phrase);
    const lastPhrase = hits.map((h) => h.rank).lastIndexOf(Rank.Phrase);
    if (firstNonPhrase !== -1) {
      expect(lastPhrase).toBeLessThan(firstNonPhrase);
    }
    // The canonical hit is a phrase hit.
    expect(hits.find((h) => h.record.citation === 'I q. 2 a. 3')!.rank).toBe(
      Rank.Phrase,
    );
  });

  it('folds the query the same way as the index', () => {
    const a = runSearch('grātiā', records).map((h) => h.record.citation);
    const b = runSearch('gratia', records).map((h) => h.record.citation);
    expect(a).toEqual(b);
    expect(b.length).toBeGreaterThan(0);
  });

  it('AND-matches every token for a multi-word query', () => {
    const hits = runSearch('deum esse probari', records);
    expect(hits.some((h) => h.record.citation === 'I q. 2 a. 3')).toBe(true);
  });

  it('returns nothing for an empty query', () => {
    expect(runSearch('   ', records)).toEqual([]);
  });
});

describe('buildSnippet', () => {
  const respondeo =
    'Respondeo dicendum quod Deum esse quinque viis probari potest. Prima autem et manifestior via est, quae sumitur ex parte motus.';

  it('wraps the matched phrase in original case with context', () => {
    const s = buildSnippet(respondeo, 'quinque viis');
    expect(s.found).toBe(true);
    expect(s.match).toBe('quinque viis');
    expect(s.before + s.match + s.after).toContain('Deum esse quinque viis probari');
  });

  it('is fold-aware: a plain query locates a ligature in the source and maps back', () => {
    const s = buildSnippet('lex ponit pœnam culpae debitam', 'poenam');
    expect(s.found).toBe(true);
    expect(s.match).toBe('pœnam');
  });

  it('falls back to the head of the text when there is no hit', () => {
    const s = buildSnippet(respondeo, 'zzzznotfound');
    expect(s.found).toBe(false);
    expect(s.after.length).toBeGreaterThan(0);
  });
});
