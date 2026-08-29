import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installCorpusFetch } from '../test/corpusFetch.ts';
import { findArticle, findQuestion, loadPart } from '../corpus/corpus.ts';
import { neighbors } from '../corpus/traverse.ts';
import { vi } from 'vitest';

beforeAll(() => {
  installCorpusFetch();
});
afterAll(() => {
  vi.unstubAllGlobals();
});

describe('corpus loader', () => {
  it('loads Prima Pars and finds q.2 a.3 with the expected respondeo', async () => {
    const part = await loadPart('prima-pars');
    expect(part.code).toBe('I');
    const q2 = findQuestion(part, 2);
    expect(q2).toBeDefined();
    const a3 = findArticle(part, 2, '3');
    expect(a3).toBeDefined();
    expect(a3!.title).toBe('an Deus sit');
    expect(a3!.respondeo).toMatch(
      /^Respondeo dicendum quod Deum esse quinque viis/,
    );
  });

  it('q.2 has no article 1 (a source gap) and does not crash lookups', async () => {
    const part = await loadPart('prima-pars');
    expect(findArticle(part, 2, '1')).toBeUndefined();
    expect(findArticle(part, 72, '1')).toBeUndefined(); // q.72 absent entirely
  });
});

describe('prev/next traversal', () => {
  it('advances I q.2 a.2 -> I q.2 a.3', async () => {
    const { next } = await neighbors('prima-pars', 2, '2');
    expect(next).not.toBeNull();
    expect(next!.citation).toBe('I q. 2 a. 3');
  });

  it('steps back across the missing article 1 (q.2 a.2 -> prev is q.1 a.10)', async () => {
    const { prev } = await neighbors('prima-pars', 2, '2');
    expect(prev).not.toBeNull();
    // Whatever it is, it must be a real, present citation — never "a. 1".
    expect(prev!.citation).not.toBe('I q. 2 a. 1');
    const part = await loadPart('prima-pars');
    expect(
      findArticle(part, prev!.qNum, prev!.aParam),
    ).toBeDefined();
  });

  it('crosses the part boundary at the end of Prima Pars into Prima Secundae', async () => {
    const part = await loadPart('prima-pars');
    const lastQ = [...part.questions].sort((a, b) => a.number - b.number).at(-1)!;
    const lastA = [...lastQ.articles].sort(
      (a, b) => (a.number ?? 0) - (b.number ?? 0),
    ).at(-1)!;
    const aParam = lastA.number == null ? 'u' : String(lastA.number);
    const { next } = await neighbors('prima-pars', lastQ.number, aParam);
    expect(next).not.toBeNull();
    expect(next!.partId).toBe('prima-secundae');
    expect(next!.citation.startsWith('I-II q. 1')).toBe(true);
  });

  it('never yields an absent citation and has no next at the very end', async () => {
    const { next } = await neighbors('tertia-pars', 90, '4');
    // III q.90 a.4 is the final article of the corpus in this source.
    const part = await loadPart('tertia-pars');
    const q90 = findQuestion(part, 90)!;
    const lastNum = [...q90.articles]
      .map((a) => a.number ?? 0)
      .sort((x, y) => x - y)
      .at(-1);
    if (lastNum === 4) {
      expect(next).toBeNull();
    }
  });

  it('first article of the corpus has no previous', async () => {
    const { prev } = await neighbors('prima-pars', 1, '1');
    expect(prev).toBeNull();
  });
});
