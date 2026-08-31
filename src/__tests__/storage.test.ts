// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearSnapshotCache,
  getBookmarks,
  getLast,
  refHref,
  refKey,
  toggleBookmark,
} from '../state/storage.ts';

beforeEach(() => {
  localStorage.clear();
  __clearSnapshotCache();
});

describe('storage — legacy Summa migration', () => {
  it('migrates summa:bookmarks (citation shape) to the generalized model and keeps the old key', () => {
    localStorage.setItem(
      'summa:bookmarks',
      JSON.stringify([
        {
          citation: 'I q. 2 a. 3',
          partId: 'prima-pars',
          qNum: 2,
          aParam: '3',
          title: 'an Deus sit',
          added: 1000,
        },
      ]),
    );

    const bms = getBookmarks();
    expect(bms).toHaveLength(1);
    expect(bms[0].workId).toBe('summa-theologiae');
    expect(bms[0].path).toEqual(['prima-pars', '2', '3']);
    expect(bms[0].label).toBe('I q. 2 a. 3');
    expect(bms[0].title).toBe('an Deus sit');

    // Old key is preserved as a backup; new key now written.
    expect(localStorage.getItem('summa:bookmarks')).not.toBeNull();
    expect(localStorage.getItem('library:bookmarks')).not.toBeNull();

    expect(refHref(bms[0])).toBe('/read/prima-pars/2/3');
  });

  it('migrates summa:last to a LibraryRef and Continue link still resolves', () => {
    localStorage.setItem(
      'summa:last',
      JSON.stringify({
        partId: 'tertia-pars',
        qNum: 7,
        aParam: 'u',
        scrollRatio: 0.42,
        citation: 'III q. 7',
        title: null,
      }),
    );

    const last = getLast();
    expect(last).not.toBeNull();
    expect(last!.workId).toBe('summa-theologiae');
    expect(last!.path).toEqual(['tertia-pars', '7', 'u']);
    expect(last!.scrollRatio).toBeCloseTo(0.42);
    expect(refHref(last!)).toBe('/read/tertia-pars/7/u');
  });
});

describe('storage — generic works', () => {
  it('bookmarks a generic division and round-trips its key + href', () => {
    const ref = { workId: 'isagoge-grc', path: ['de-genere'] };
    const on = toggleBookmark({ ...ref, label: 'Isagoge · § I', title: 'On Genus' });
    expect(on).toBe(true);

    const bms = getBookmarks();
    expect(bms.some((b) => refKey(b) === refKey(ref))).toBe(true);
    expect(refHref(ref)).toBe('/read/isagoge-grc/de-genere');

    // toggling again removes it
    expect(toggleBookmark({ ...ref, label: 'x', title: null })).toBe(false);
    expect(getBookmarks()).toHaveLength(0);
  });
});
