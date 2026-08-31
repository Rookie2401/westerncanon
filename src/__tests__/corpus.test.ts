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

  it('q.2 a.1 and q.72 (former lacunae) are now present and witness-tagged', async () => {
    const part = await loadPart('prima-pars');
    const a1 = findArticle(part, 2, '1');
    expect(a1).toBeDefined();
    expect(a1!.title).toBe('utrum Deum esse sit per se notum');
    expect(a1!.witness).toBe('wikisource-la');
    // q.72 is a single unnumbered article ("a. un.")
    const q72 = findQuestion(part, 72);
    expect(q72).toBeDefined();
    expect(q72!.articles).toHaveLength(1);
    expect(q72!.articles[0].number).toBeNull();
    expect(findArticle(part, 72, 'u')).toBeDefined();
    expect(findArticle(part, 72, '1')).toBeUndefined();
  });
});

describe('prev/next traversal', () => {
  it('advances I q.2 a.2 -> I q.2 a.3', async () => {
    const { next } = await neighbors('prima-pars', 2, '2');
    expect(next).not.toBeNull();
    expect(next!.citation).toBe('I q. 2 a. 3');
  });

  it('q.2 a.2 -> prev is the now-present q.2 a.1', async () => {
    const { prev } = await neighbors('prima-pars', 2, '2');
    expect(prev).not.toBeNull();
    expect(prev!.citation).toBe('I q. 2 a. 1');
    const part = await loadPart('prima-pars');
    expect(findArticle(part, prev!.qNum, prev!.aParam)).toBeDefined();
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

  it('Tertia Pars now flows into the Supplementum, not off the end', async () => {
    const { next } = await neighbors('tertia-pars', 90, '4');
    expect(next).not.toBeNull();
    expect(next!.partId).toBe('supplementum');
    expect(next!.citation).toBe('Suppl. q. 1 a. 1');
  });

  it('the very last article of the corpus is in Appendix II and has no next', async () => {
    const suppl = await loadPart('supplementum');
    const lastQ = [...suppl.questions].sort((a, b) => a.number - b.number).at(-1)!;
    expect(lastQ.citation).toBe('Suppl. App. II q. 1');
    const lastA = [...lastQ.articles].sort(
      (a, b) => (a.number ?? 0) - (b.number ?? 0),
    ).at(-1)!;
    const aParam = lastA.number == null ? 'u' : String(lastA.number);
    const { next } = await neighbors('supplementum', lastQ.number, aParam);
    expect(next).toBeNull();
  });

  it('first article of the corpus has no previous', async () => {
    const { prev } = await neighbors('prima-pars', 1, '1');
    expect(prev).toBeNull();
  });
});
