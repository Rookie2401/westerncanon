import { describe, expect, it } from 'vitest';
import { parseReference } from '../corpus/reference.ts';

describe('parseReference — accepted forms', () => {
  const cases: [string, { partCode: string; q: number; a: number | null }][] = [
    ['I q 2 a 3', { partCode: 'I', q: 2, a: 3 }],
    ['I q. 2 a. 3', { partCode: 'I', q: 2, a: 3 }],
    ['i q.2 a.3', { partCode: 'I', q: 2, a: 3 }],
    ['I-II 94 2', { partCode: 'I-II', q: 94, a: 2 }],
    ['II-II q.23 a.1', { partCode: 'II-II', q: 23, a: 1 }],
    ['III 1 1', { partCode: 'III', q: 1, a: 1 }],
    ['1 2 3', { partCode: 'I', q: 2, a: 3 }],
    ['iaiiae 5 1', { partCode: 'I-II', q: 5, a: 1 }],
    ['2a2ae 23 1', { partCode: 'II-II', q: 23, a: 1 }],
    ['prima secundae 10 4', { partCode: 'I-II', q: 10, a: 4 }],
    ['tertia 60 6', { partCode: 'III', q: 60, a: 6 }],
    ['I q 2', { partCode: 'I', q: 2, a: null }],
    ['iii q 7', { partCode: 'III', q: 7, a: null }],
  ];

  for (const [input, want] of cases) {
    it(`parses "${input}"`, () => {
      const got = parseReference(input);
      expect(got).not.toBeNull();
      expect(got!.partCode).toBe(want.partCode);
      expect(got!.q).toBe(want.q);
      expect(got!.a).toBe(want.a);
    });
  }

  it('sets exact only when an article number is present', () => {
    expect(parseReference('I q 2 a 3')!.exact).toBe(true);
    expect(parseReference('I q 2')!.exact).toBe(false);
  });

  it('builds a corpus-shaped citation string', () => {
    expect(parseReference('I q 2 a 3')!.citation).toBe('I q. 2 a. 3');
    expect(parseReference('II-II 23 1')!.citation).toBe('II-II q. 23 a. 1');
    expect(parseReference('I q 2')!.citation).toBe('I q. 2');
  });

  it('bare leading 2 resolves to II-II (documented choice)', () => {
    expect(parseReference('2 3 1')!.partCode).toBe('II-II');
  });
});

describe('parseReference — rejected', () => {
  for (const bad of [
    '',
    '   ',
    'quinque viis',
    'de deo',
    'q 2 a 3', // no part
    '11 2', // leading multi-digit is not a part token
    'IV 1 1', // no such part
    'I q abc',
    'random text 42',
  ]) {
    it(`rejects "${bad}"`, () => {
      expect(parseReference(bad)).toBeNull();
    });
  }
});

describe('parseReference — gap citation still parses (resolution is caller job)', () => {
  it('parses "I q 2 a 1" (which is a known source gap)', () => {
    const got = parseReference('I q 2 a 1');
    expect(got).not.toBeNull();
    expect(got!.citation).toBe('I q. 2 a. 1');
  });
});
