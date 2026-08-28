import { describe, expect, it } from 'vitest';
import { fold, tokenize } from '../corpus/fold.ts';

describe('fold', () => {
  it('lowercases', () => {
    expect(fold('QUINQUE Viis')).toBe('quinque viis');
  });

  it('folds œ/æ ligatures both directions of a lookup', () => {
    expect(fold('pœna')).toBe('poena');
    expect(fold('POENA')).toBe('poena');
    expect(fold('cælum')).toBe('caelum');
  });

  it('strips combining accents', () => {
    expect(fold('grātiā')).toBe('gratia');
    expect(fold('démonstrábile')).toBe('demonstrabile');
  });

  it('collapses whitespace and trims', () => {
    expect(fold('  quinque   \n viis  ')).toBe('quinque viis');
  });

  it('folds ß', () => {
    expect(fold('Weiß')).toBe('weiss');
  });

  it('is idempotent', () => {
    const once = fold('Prōœmium  cælī');
    expect(fold(once)).toBe(once);
  });
});

describe('tokenize', () => {
  it('splits a folded string into word tokens', () => {
    expect(tokenize(fold('Deum esse, quinque viis'))).toEqual([
      'deum',
      'esse',
      'quinque',
      'viis',
    ]);
  });

  it('returns [] for punctuation-only input', () => {
    expect(tokenize(fold('  ,.;  '))).toEqual([]);
  });
});
