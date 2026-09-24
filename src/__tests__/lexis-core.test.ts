// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { __configureLexis, lexisAvailable, loadEntry, loadManifest, loadWorkLexis, readingsFor } from '../lexis/index.ts';
import { describeMorph, morphShort, posLabel } from '../lexis/morph.ts';
import { __clearLexisSettingsCache, getLexisSettings, setLexisSettings, useLexisSettings } from '../lexis/settings.ts';
import { __resetDb, isDbAvailable } from '../lexis/db.ts';
import {
  __resetVocab,
  exportVocab,
  importVocab,
  markAllKnown,
  recordLookup,
  recordRead,
  setStatus,
  useStatuses,
  vocabCounts,
} from '../lexis/vocab.ts';
import { divisionCoverage, workCoverage } from '../lexis/coverage.ts';
import { DEFAULT_LEXIS_SETTINGS, type KnownWord, type WorkLexis } from '../lexis/types.ts';

const fixturesDir = resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'lexis');

function installLexisFetch(): typeof fetch {
  return (async (input: unknown) => {
    const url = String(input);
    const idx = url.indexOf('lexis/');
    if (idx < 0) throw new Error(`unexpected fetch in lexis test: ${url}`);
    const rel = url.slice(idx + 'lexis/'.length).split('?')[0]!;
    const path = join(fixturesDir, rel);
    try {
      const text = await readFile(path, 'utf8');
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(text),
        text: async () => text,
      } as Response;
    } catch {
      return { ok: false, status: 404, json: async () => { throw new Error('404'); } } as unknown as Response;
    }
  }) as typeof fetch;
}

beforeEach(() => {
  __configureLexis({ baseUrl: '', fetchImpl: installLexisFetch() });
});

describe('lexisAvailable', () => {
  it('is true for grc/la/it and false for en, in this (non-"en") test build', () => {
    expect(lexisAvailable('grc')).toBe(true);
    expect(lexisAvailable('la')).toBe(true);
    expect(lexisAvailable('it')).toBe(true);
    expect(lexisAvailable('en')).toBe(false);
  });
});

describe('loadManifest / loadWorkLexis', () => {
  it('loads the fixture manifest and memoises it', async () => {
    const m1 = await loadManifest();
    const m2 = await loadManifest();
    expect(m1).toBe(m2);
    expect(m1.languages.grc?.lexemes).toBe(3);
    expect(m1.works['fixture-grc']?.lang).toBe('grc');
  });

  it('loads a work bundle by manifest file name and memoises it', async () => {
    const b1 = await loadWorkLexis('fixture-la');
    const b2 = await loadWorkLexis('fixture-la');
    expect(b1).toBe(b2);
    expect(b1?.lang).toBe('la');
    expect(b1?.forms['amat']).toBeDefined();
  });

  it('returns null (never throws) when the manifest lists no bundle for the work', async () => {
    const bundle = await loadWorkLexis('no-such-work');
    expect(bundle).toBeNull();
  });

  it('clears the memo on a failed fetch so a retry can succeed', async () => {
    let fail = true;
    __configureLexis({
      baseUrl: '',
      fetchImpl: (async (input: unknown) => {
        const url = String(input);
        if (url.includes('manifest.json') && fail) {
          fail = false;
          return { ok: false, status: 500, json: async () => { throw new Error('boom'); } } as unknown as Response;
        }
        return installLexisFetch()(input as never);
      }) as typeof fetch,
    });
    await expect(loadManifest()).rejects.toThrow();
    const m = await loadManifest();
    expect(m.version).toBe(1);
  });
});

describe('readingsFor', () => {
  it('hits the loose key directly when present', async () => {
    const bundle = (await loadWorkLexis('fixture-grc'))!;
    const readings = readingsFor(bundle, 'λόγος', 'grc');
    expect(readings).toHaveLength(1);
    expect(readings[0]![0]).toBe('grc:noun:λόγος');
  });

  it('falls back to the fold map when the loose key misses (accent-insensitive lookup)', async () => {
    const bundle = (await loadWorkLexis('fixture-grc'))!;
    // "λογος" (no accent) is not a stored loose key, but its fold key matches
    // the fold of the stored "λόγος".
    expect(bundle.forms['λογος']).toBeUndefined();
    const readings = readingsFor(bundle, 'λογος', 'grc');
    expect(readings).toHaveLength(1);
    expect(readings[0]![0]).toBe('grc:noun:λόγος');
  });

  it('returns [] for a word with no reading at all', async () => {
    const bundle = (await loadWorkLexis('fixture-grc'))!;
    expect(readingsFor(bundle, 'καί', 'grc')).toEqual([]);
  });
});

describe('loadEntry (shard resolution)', () => {
  it('resolves a direct two-letter prefix hit', async () => {
    const entry = await loadEntry('grc', 'grc:noun:λόγος');
    expect(entry?.lemma).toBe('λόγος');
    expect(entry?.dict).toBe('lsj');
  });

  it('falls back to the first-letter prefix when the two-letter shard is absent', async () => {
    // shardPrefix('grc:verb:λέγω') === 'λε', not in the manifest's lex_shards;
    // 'λ' is, so it should resolve to grc-l.json.
    const entry = await loadEntry('grc', 'grc:verb:λέγω');
    expect(entry?.lemma).toBe('λέγω');
  });

  it('falls back to "_" when neither the prefix nor its first letter has a shard', async () => {
    // shardPrefix('grc:verb:εἰμί') === 'ει', and 'ε' is also absent.
    const entry = await loadEntry('grc', 'grc:verb:εἰμί');
    expect(entry?.lemma).toBe('εἰμί');
  });

  it('returns null for an unknown language or a lexeme with no shard entry', async () => {
    // @ts-expect-error -- deliberately invalid language for the null-path test
    expect(await loadEntry('xx', 'xx:noun:foo')).toBeNull();
    expect(await loadEntry('grc', 'grc:noun:nonexistent')).toBeNull();
  });
});

describe('morph — describeMorph / posLabel / morphShort', () => {
  it('renders a verb reading as prose', () => {
    expect(describeMorph('verb aor ind act 3 sg')).toBe('aorist indicative active, 3rd person singular');
  });

  it('renders a nominal reading as prose', () => {
    expect(describeMorph('noun gen pl f')).toBe('genitive plural feminine');
  });

  it('renders a bare degree tag as itself', () => {
    expect(describeMorph('adj comp')).toBe('comparative');
  });

  it('handles a participle (verb + case/number/gender together)', () => {
    expect(describeMorph('verb ptcp perf mp nom sg n')).toBe(
      'perfect participle middle/passive, nominative singular neuter',
    );
  });

  it('is robust to unknown tags: echoes them verbatim rather than dropping them', () => {
    expect(describeMorph('verb frobnicate')).toBe('frobnicate');
    expect(describeMorph('zzz qqq')).toBe('zzz qqq');
  });

  it('returns "" for an empty tag string', () => {
    expect(describeMorph('')).toBe('');
    expect(describeMorph('   ')).toBe('');
  });

  it('posLabel maps every Pos to an English label', () => {
    expect(posLabel('verb')).toBe('verb');
    expect(posLabel('adj')).toBe('adjective');
    expect(posLabel('art')).toBe('article');
  });

  it('morphShort abbreviates', () => {
    expect(morphShort('verb aor ind act 3 sg')).toBe('aor. ind. act. 3 sg.');
    expect(morphShort('noun gen pl f')).toBe('gen. pl. f.');
  });
});

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
    __clearLexisSettingsCache();
  });

  it('defaults match DEFAULT_LEXIS_SETTINGS when nothing is stored', () => {
    expect(getLexisSettings()).toEqual(DEFAULT_LEXIS_SETTINGS);
  });

  it('round-trips a partial patch through localStorage under lexis:settings', () => {
    setLexisSettings({ highlight: 'all', autoKnownAfter: 3 });
    const raw = localStorage.getItem('lexis:settings');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.highlight).toBe('all');
    expect(stored.autoKnownAfter).toBe(3);
    // unpatched fields keep their previous (default) values
    expect(getLexisSettings().enabled).toBe(true);
    expect(getLexisSettings().morphOnFirstLevel).toBe(true);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('lexis:settings', '{not json');
    expect(getLexisSettings()).toEqual(DEFAULT_LEXIS_SETTINGS);
  });

  it('rejects an invalid highlight/autoKnownAfter value', () => {
    localStorage.setItem('lexis:settings', JSON.stringify({ highlight: 'bogus', autoKnownAfter: -5 }));
    const s = getLexisSettings();
    expect(s.highlight).toBe(DEFAULT_LEXIS_SETTINGS.highlight);
    expect(s.autoKnownAfter).toBe(DEFAULT_LEXIS_SETTINGS.autoKnownAfter);
  });

  it('useLexisSettings is a live hook', async () => {
    const { result } = renderHook(() => useLexisSettings());
    expect(result.current).toEqual(DEFAULT_LEXIS_SETTINGS);
    act(() => setLexisSettings({ enabled: false }));
    await waitFor(() => expect(result.current.enabled).toBe(false));
  });
});

describe('vocab — Dexie unavailable in jsdom degrades to the in-memory fallback', () => {
  it('reports IndexedDB unavailable in this environment', () => {
    expect(isDbAvailable()).toBe(false);
  });
});

describe('vocab — promotion rules', () => {
  beforeEach(() => {
    __resetVocab();
    __resetDb();
    localStorage.clear();
    __clearLexisSettingsCache();
  });

  async function wordOf(key: string): Promise<KnownWord | undefined> {
    const data = JSON.parse(await exportVocab()) as { words: KnownWord[] };
    return data.words.find((w) => w.key === key);
  }

  it('a fresh lexeme is untracked (no row) until touched', async () => {
    expect(await wordOf('la:verb:amo')).toBeUndefined();
  });

  it('a lookup on an untracked word promotes it to "seen"', async () => {
    await recordLookup('la:verb:amo', { workId: 'fixture-la', divId: 'd1' });
    const w = await wordOf('la:verb:amo');
    expect(w?.status).toBe('seen');
    expect(w?.lookups).toBe(1);
  });

  it('a second lookup on a "seen" word leaves the status but counts the lookup', async () => {
    await recordLookup('la:verb:amo', { workId: 'fixture-la', divId: 'd1' });
    await recordLookup('la:verb:amo', { workId: 'fixture-la', divId: 'd1' });
    const w = await wordOf('la:verb:amo');
    expect(w?.status).toBe('seen');
    expect(w?.lookups).toBe(2);
  });

  it('a lookup on a "known"/"mastered" word demotes it to "recognizing"', async () => {
    await setStatus('la:verb:amo', 'known', 'manual');
    await recordLookup('la:verb:amo', { workId: 'fixture-la', divId: 'd1' });
    expect((await wordOf('la:verb:amo'))?.status).toBe('recognizing');

    await setStatus('la:noun:puella', 'mastered', 'manual');
    await recordLookup('la:noun:puella', { workId: 'fixture-la', divId: 'd1' });
    expect((await wordOf('la:noun:puella'))?.status).toBe('recognizing');
  });

  it('recordRead counts an unaided encounter once per division per day (dedup)', async () => {
    await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: 'd1' });
    await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: 'd1' });
    const w = await wordOf('la:verb:amo');
    expect(w?.encounters).toBe(1); // second call same division/day is a no-op
  });

  it('promotes to "known" after autoKnownAfter unaided encounters across different divisions', async () => {
    setLexisSettings({ autoKnownAfter: 3 });
    await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: 'd1' });
    await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: 'd2' });
    let w = await wordOf('la:verb:amo');
    expect(w?.status).toBe('new');
    expect(w?.encounters).toBe(2);
    await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: 'd3' });
    w = await wordOf('la:verb:amo');
    expect(w?.status).toBe('known');
    expect(w?.encounters).toBe(3);
  });

  it('never promotes via encounters when autoKnownAfter is 0', async () => {
    setLexisSettings({ autoKnownAfter: 0 });
    for (let i = 0; i < 10; i++) {
      await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: `d${i}` });
    }
    expect((await wordOf('la:verb:amo'))?.status).toBe('new');
  });

  it('encounters never demote an already-known/mastered/ignored word', async () => {
    setLexisSettings({ autoKnownAfter: 1 });
    await setStatus('la:verb:amo', 'ignored', 'manual');
    await recordRead(['la:verb:amo'], { workId: 'fixture-la', divId: 'd1' });
    expect((await wordOf('la:verb:amo'))?.status).toBe('ignored');
  });

  it('markAllKnown marks the given lexemes known and returns the count actually changed', async () => {
    await setStatus('la:verb:volo', 'known', 'manual'); // already known
    const changed = await markAllKnown(['la:verb:amo', 'la:noun:puella', 'la:verb:volo']);
    expect(changed).toBe(2);
    expect((await wordOf('la:verb:amo'))?.status).toBe('known');
    expect((await wordOf('la:noun:puella'))?.status).toBe('known');
  });

  it('vocabCounts tallies every status, including zero counts', async () => {
    await setStatus('la:verb:amo', 'known', 'manual');
    await setStatus('la:noun:puella', 'known', 'manual');
    await recordLookup('la:verb:volo', { workId: 'fixture-la', divId: 'd1' });
    const counts = await vocabCounts();
    expect(counts.known).toBe(2);
    expect(counts.seen).toBe(1);
    expect(counts.new).toBe(0);
    expect(counts.mastered).toBe(0);
  });

  it('exportVocab / importVocab round-trip, merging by key and keeping the higher status', async () => {
    await setStatus('la:verb:amo', 'seen', 'manual');
    const exported = await exportVocab();
    const payload = JSON.parse(exported) as { version: number; words: KnownWord[] };
    expect(payload.version).toBe(1);

    __resetVocab();
    // Import into a fresh store: seen word should land as seen.
    const n1 = await importVocab(exported);
    expect(n1).toBe(1);
    expect((await wordOf('la:verb:amo'))?.status).toBe('seen');

    // Now the local copy is promoted to 'known'; importing the old ('seen')
    // export again must NOT downgrade it.
    await setStatus('la:verb:amo', 'known', 'manual');
    const n2 = await importVocab(exported);
    expect(n2).toBe(0);
    expect((await wordOf('la:verb:amo'))?.status).toBe('known');

    // A higher-status import DOES win.
    const higher = JSON.stringify({
      version: 1,
      exported_at: Date.now(),
      words: [{ key: 'la:verb:amo', lang: 'la', status: 'mastered', reason: 'manual', lookups: 0, encounters: 0, first_seen: 0, last_seen: 0, updated_at: 0 }],
    });
    const n3 = await importVocab(higher);
    expect(n3).toBe(1);
    expect((await wordOf('la:verb:amo'))?.status).toBe('mastered');
  });

  it('importVocab tolerates invalid JSON and returns 0', async () => {
    expect(await importVocab('not json')).toBe(0);
    expect(await importVocab(JSON.stringify({ version: 1 }))).toBe(0);
  });

  it('useStatuses is a live hook that reflects setStatus', async () => {
    const { result } = renderHook(() => useStatuses(['la:verb:amo']));
    expect(result.current.get('la:verb:amo')).toBeUndefined();
    await act(async () => {
      await setStatus('la:verb:amo', 'known', 'manual');
    });
    await waitFor(() => expect(result.current.get('la:verb:amo')?.status).toBe('known'));
  });
});

describe('coverage', () => {
  const bundle: WorkLexis = {
    workId: 'fixture-la',
    lang: 'la',
    tokens: 4,
    recognized: 3,
    forms: {
      amat: [['la:verb:amo', 'verb pres ind act 3 sg', 1]],
      amabit: [['la:verb:amo', 'verb fut ind act 3 sg', 1]],
      puellam: [['la:noun:puella', 'noun acc sg f', 1]],
    },
    lexemes: {
      'la:verb:amo': { id: 'la:verb:amo', lemma: 'amo', pos: 'verb', gloss: 'to love' },
      'la:noun:puella': { id: 'la:noun:puella', lemma: 'puella', pos: 'noun', gloss: 'girl' },
    },
    analysis: 'fixture',
  };

  function statusMap(known: string[]): Map<string, KnownWord> {
    const m = new Map<string, KnownWord>();
    const t = Date.now();
    for (const key of known) {
      m.set(key, {
        key, lang: 'la', status: 'known', reason: 'manual',
        lookups: 0, encounters: 0, first_seen: t, last_seen: t, updated_at: t,
      });
    }
    return m;
  }

  it('divisionCoverage counts exact running tokens against a passage of text', () => {
    const statuses = statusMap(['la:verb:amo']);
    const c = divisionCoverage(bundle, 'Amat puellam.', 'la', statuses);
    expect(c.tokens).toBe(2);
    expect(c.knownTokens).toBe(1);
    expect(c.lexemes).toBe(2);
    expect(c.knownLexemes).toBe(1);
  });

  it('divisionCoverage counts 0 known when nothing is marked known', () => {
    const c = divisionCoverage(bundle, 'Amat puellam.', 'la', new Map());
    expect(c.knownTokens).toBe(0);
  });

  it('workCoverage aggregates the bundle-level stats against the reader\'s statuses', () => {
    const statuses = statusMap(['la:verb:amo']);
    const c = workCoverage(bundle, statuses);
    expect(c.tokens).toBe(4);
    expect(c.lexemes).toBe(2);
    expect(c.knownLexemes).toBe(1);
    // 2 of the bundle's 3 recognized forms (amat, amabit) resolve to the
    // known lexeme; scaled against the bundle's own recognized-token count.
    expect(c.knownTokens).toBe(2);
  });
});
