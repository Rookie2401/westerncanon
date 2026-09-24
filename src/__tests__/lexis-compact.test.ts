import { describe, expect, it } from 'vitest';
import { decodeWorkLexis, encodeWorkLexis, isCompact } from '../lexis/compact.ts';
import type { WorkLexis } from '../lexis/types.ts';

const bundle: WorkLexis = {
  workId: 'x-grc',
  lang: 'grc',
  tokens: 5,
  recognized: 4,
  analysis: 'test',
  lexemes: { 'grc:noun:λόγος': { id: 'grc:noun:λόγος', lemma: 'λόγος', pos: 'noun', gloss: 'word' }, 'grc:art:ὁ': { id: 'grc:art:ὁ', lemma: 'ὁ', pos: 'art', gloss: 'the' } },
  forms: {
    'λόγος': [['grc:noun:λόγος', 'noun nom sg m'], ['grc:noun:λόγος', 'noun voc sg m', 0.8]],
    'τῶν': [['grc:art:ὁ', 'art gen pl m'], ['grc:art:ὁ', 'art gen pl f', 0.9]],
  },
};

describe('compact bundle encoding', () => {
  it('round-trips a bundle exactly and interns repeated strings', () => {
    const enc = encodeWorkLexis(bundle);
    expect(isCompact(enc)).toBe(true);
    expect(enc.lx).toEqual(['grc:noun:λόγος', 'grc:art:ὁ']);
    expect(enc.mo).toHaveLength(4);
    expect(enc.forms['λόγος']).toEqual([0, 0, 100, 0, 1, 80]);
    expect(decodeWorkLexis(enc)).toEqual(bundle);
  });
  it('recognises a v1 bundle as not compact', () => {
    expect(isCompact(bundle)).toBe(false);
  });
});
