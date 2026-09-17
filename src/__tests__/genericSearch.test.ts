/**
 * Regression test for searchGenericWorks' tree traversal.
 *
 * searchGenericWorks() used to scan only each top-level division's OWN
 * `passages` array, never recursing into `children`. That is correct for a
 * flat one-level work (Isagoge, Categories) but silently finds nothing in any
 * multi-level work — Euclid's Book -> group -> leaf tree, or Augustine's
 * Book -> Chapter tree — because those top-level Book divisions hold their
 * real text several levels down, not on themselves. This test proves the fix
 * (a depth-first walk over `children`) against a synthetic 3-level tree, the
 * same shape used by the "Work (generic) — nested Division groups" fixture in
 * render.test.tsx.
 *
 * `searchGenericWorks` caches its combined corpus in a module-level Promise
 * the first time it's called and never invalidates it, so this file keeps a
 * single describe block with one search call — splicing the fixture Work in
 * before that first (and only) call, rather than risking a stale cache from
 * an earlier call with a different WORKS snapshot.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { searchGenericWorks } from '../library/genericSearch.ts';
import { WORKS } from '../library/registry.ts';
import type { GenericWork, Work } from '../library/types.ts';

const TEST_WORK_ID = 'test-generic-search-nested-work';
const TEST_WORK: Work = {
  id: TEST_WORK_ID,
  authorId: 'euclid',
  title: 'Test Nested Search Work',
  language: 'grc',
  citationScheme: 'test',
  profile: 'generic',
  meta: 'Test fixture',
  source: { provenance: 'test fixture', license: 'n/a' },
};

// Book -> group -> leaf, mirroring the real Euclid/Augustine tree shapes.
// The needle text sits only on the deepest leaf's passage.
const NESTED_WORK: GenericWork = {
  workId: TEST_WORK_ID,
  language: 'grc',
  divisions: [
    {
      id: 'book-1',
      number: 'I',
      ref: null,
      sourceHeading: null,
      editorialTitle: 'Book One',
      children: [
        {
          id: 'book-1-ch-1',
          number: '1',
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [{ n: '', text: 'an unrelated opening sentence.', ref: null }],
        },
        {
          id: 'book-1-group',
          number: null,
          ref: null,
          sourceHeading: 'Group',
          editorialTitle: null,
          children: [
            {
              id: 'book-1-group-leaf-1',
              number: '1',
              ref: null,
              sourceHeading: null,
              editorialTitle: null,
              children: [],
              passages: [{ n: '', text: 'the needle phrase lives here.', ref: null }],
            },
          ],
          passages: [],
        },
      ],
      passages: [],
    },
  ],
};

beforeAll(() => {
  WORKS.push(TEST_WORK);
  // loadAllGeneric() fetches every profile:'generic' Work in the registry, not
  // just the fixture — so every OTHER real work must resolve too. They don't
  // need real content (the needle text only lives in NESTED_WORK), just a
  // well-formed empty GenericWork so they load without throwing.
  vi.stubGlobal('fetch', async (input: unknown) => {
    const url = String(input);
    if (url.includes(`${TEST_WORK_ID}/work.json`)) {
      return {
        ok: true,
        status: 200,
        json: async () => NESTED_WORK,
        text: async () => JSON.stringify(NESTED_WORK),
      } as Response;
    }
    const empty: GenericWork = { workId: 'other', language: 'la', divisions: [] };
    return {
      ok: true,
      status: 200,
      json: async () => empty,
      text: async () => JSON.stringify(empty),
    } as Response;
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
  const i = WORKS.indexOf(TEST_WORK);
  if (i >= 0) WORKS.splice(i, 1);
});

describe('searchGenericWorks — multi-level division trees', () => {
  it('finds a match on a doubly-nested leaf (Book -> group -> leaf), not just on top-level divisions', async () => {
    const hits = await searchGenericWorks('needle phrase');
    expect(hits.length).toBeGreaterThan(0);
    const hit = hits.find((h) => h.workId === TEST_WORK_ID);
    expect(hit).toBeTruthy();
    expect(hit!.divId).toBe('book-1-group-leaf-1');
    expect(hit!.snippet).toContain('needle phrase');
  });

  it('does not match text that only appears in a sibling leaf', async () => {
    const hits = await searchGenericWorks('unrelated opening');
    const hit = hits.find((h) => h.workId === TEST_WORK_ID);
    expect(hit).toBeTruthy();
    expect(hit!.divId).toBe('book-1-ch-1');
  });
});
