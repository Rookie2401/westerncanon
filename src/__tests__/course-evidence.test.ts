// @vitest-environment jsdom
/**
 * The course's evidence model (docs/COURSE-PLAN.md §3–4): the five notions
 * kept apart, the familiarity estimate, the path view, readiness, drills and
 * the stage help profiles. No IndexedDB in jsdom: the in-memory stores stand
 * in, exactly as they do in a browser that refuses a database.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { __resetDb } from '../lexis/db.ts';
import { __resetVocab, recordLookup, recordRead, setStatus, listKnownWords, listReads, listLookups } from '../lexis/vocab.ts';
import { __clearLexisSettingsCache, setLexisSettings } from '../lexis/settings.ts';
import type { KnownWord, WorkLexis } from '../lexis/types.ts';
import { __resetEvidence, loadEvidence, recordEvent, unitProgress, unitProgressMany } from '../course/evidence.ts';
import { familiarityOf } from '../course/familiarity.ts';
import { pathView, stage0StepsFor } from '../course/path.ts';
import { readiness } from '../course/readiness.ts';
import { forecastText } from '../course/forecast.ts';
import { assistanceFor, effectiveSettings } from '../course/assistance.ts';
import { hintShown, makeRound, seededRandom } from '../course/drills.ts';
import { ladderIndex, unitOfStop } from '../course/index.ts';
import type { CourseLadder, CoreWord, LadderUnit } from '../course/types.ts';
import { DEFAULT_LEXIS_SETTINGS } from '../lexis/types.ts';

const DAY = 24 * 60 * 60 * 1000;

function unit(id: string, work: string, divs: string[], stage: LadderUnit['stage'], pool: number, words = 1000): LadderUnit {
  return { id, work, divs, label: id, words, lemmas: 100, cov3: 0.9, cov1: 0.95, newPer100: 2, unrec: 0, pool, stage, section: 0 };
}

const ladder: CourseLadder = {
  lang: 'la',
  version: 1,
  built_at: 't',
  policy: { minEncounters: 3, coreWords: 2, coreShare: 0.5, unitWords: [800, 2500], stages: [] },
  works: { 'w-la': { title: 'W', author: 'A', en: { workId: 'w-en', aligned: true } } },
  core: ['la:verb:sum', 'la:conj:et'],
  units: [
    unit('w-la/d1', 'w-la', ['d1', 'd2'], 'I', 400),
    unit('w-la/d3', 'w-la', ['d3'], 'I', 500),
    unit('w-la/d4', 'w-la', ['d4', 'd5'], 'II', 1200),
  ],
};

beforeEach(() => {
  __resetDb();
  __resetVocab();
  __resetEvidence();
  __clearLexisSettingsCache();
  localStorage.clear();
});

describe('five notions, never merged', () => {
  it('a read (exposure) is "seen", never "finished"; a report never fabricates a view; only UnitCompleted finishes', async () => {
    await recordRead(['la:verb:sum'], { workId: 'w-la', divId: 'd1', words: 500 });
    let ev = await loadEvidence();
    let p = unitProgress(ladder.units[0]!, ev);
    expect(p.seenDivs).toBe(1);
    expect(p.totalDivs).toBe(2);
    expect(p.finishedAt).toBeNull();
    expect(p.reported).toBeNull();

    await recordEvent({ type: 'ComprehensionReported', lang: 'la', unitId: 'w-la/d1', workId: 'w-la', degree: 'most' });
    ev = await loadEvidence();
    p = unitProgress(ladder.units[0]!, ev);
    expect(p.reported).toBe('most');
    expect(p.seenDivs).toBe(1); // the report added no view
    expect(p.finishedAt).toBeNull();

    await recordEvent({ type: 'UnitCompleted', lang: 'la', unitId: 'w-la/d1', workId: 'w-la' });
    ev = await loadEvidence();
    p = unitProgress(ladder.units[0]!, ev);
    expect(p.finishedAt).not.toBeNull();
    expect(p.seenDivs).toBe(1); // completion does not pretend the second stop was seen
  });

  it('the path view: next follows the last finished unit; a started unit stays "started"', async () => {
    let ev = await loadEvidence();
    let view = pathView(ladder, ev, stage0StepsFor('la'));
    expect(view.next?.unit.id).toBe('w-la/d1');
    expect(view.currentStage).toBe('0'); // Stage 0 not done, nothing finished
    expect(view.stages.map((s) => s.id)).toEqual(['I', 'II']);

    await recordRead(['la:verb:sum'], { workId: 'w-la', divId: 'd4' });
    await recordEvent({ type: 'UnitCompleted', lang: 'la', unitId: 'w-la/d1', workId: 'w-la' });
    ev = await loadEvidence();
    view = pathView(ladder, ev, stage0StepsFor('la'));
    expect(view.next?.unit.id).toBe('w-la/d3');
    expect(view.currentStage).toBe('I');
    const states = Object.fromEntries(view.stages.flatMap((s) => s.units).map((u) => [u.unit.id, u.state]));
    expect(states).toEqual({ 'w-la/d1': 'done', 'w-la/d3': 'next', 'w-la/d4': 'started' });
    expect(view.done).toBe(1);

    for (const step of stage0StepsFor('la')) await recordEvent({ type: 'Stage0StepCompleted', lang: 'la', step });
    ev = await loadEvidence();
    expect(pathView(ladder, ev, stage0StepsFor('la')).stage0.complete).toBe(true);
    expect(stage0StepsFor('grc')).toContain('decode');
    expect(stage0StepsFor('la')).not.toContain('decode');
  });

  it('unitProgressMany agrees with unitProgress', async () => {
    await recordRead(['la:verb:sum'], { workId: 'w-la', divId: 'd5' });
    const ev = await loadEvidence();
    const many = unitProgressMany(ladder.units, ev);
    for (const u of ladder.units) expect(many.get(u.id)).toEqual(unitProgress(u, ev));
  });

  it('the ladder index resolves a stop to its unit', () => {
    expect(unitOfStop(ladder, 'w-la', 'd5')?.unit.id).toBe('w-la/d4');
    expect(unitOfStop(ladder, 'w-la', 'nope')).toBeNull();
    expect(ladderIndex(ladder).byId.get('w-la/d3')).toBe(1);
  });
});

describe('familiarity estimate', () => {
  const base: KnownWord = { key: 'la:noun:x', lang: 'la', status: 'seen', reason: 'encounter', lookups: 0, encounters: 0, first_seen: 0, last_seen: 0, updated_at: 0 };
  it('classes', () => {
    expect(familiarityOf(undefined)).toBe('new');
    expect(familiarityOf({ ...base, status: 'known' })).toBe('known');
    expect(familiarityOf({ ...base, status: 'ignored' })).toBe('known');
    expect(familiarityOf({ ...base, encounters: 1 })).toBe('met');
    expect(familiarityOf({ ...base, lookups: 1 })).toBe('met');
    expect(familiarityOf({ ...base, encounters: 4, days: 2, last_seen: 10 * DAY })).toBe('likely-familiar');
    expect(familiarityOf({ ...base, encounters: 4, days: 1, last_seen: 10 * DAY })).toBe('met'); // one day only
    expect(familiarityOf({ ...base, encounters: 4, days: 2, last_seen: 10 * DAY, last_lookup: 10 * DAY - 1000 })).toBe('met'); // looked up just now
    expect(familiarityOf({ ...base, encounters: 4, days: 2, last_seen: 10 * DAY, last_lookup: 5 * DAY })).toBe('likely-familiar');
  });

  it('vocab.ts records days and last_lookup, and the read/lookup logs', async () => {
    setLexisSettings({ autoKnownAfter: 0 });
    await recordRead(['la:noun:x'], { workId: 'w-la', divId: 'd1', words: 120 });
    await recordLookup('la:noun:x', { workId: 'w-la', divId: 'd1' });
    const w = (await listKnownWords()).find((k) => k.key === 'la:noun:x');
    expect(w?.days).toBe(1);
    expect(w?.last_lookup).toBeTypeOf('number');
    expect((await listReads())[0]).toMatchObject({ workId: 'w-la', divId: 'd1', words: 120 });
    expect((await listLookups())[0]).toMatchObject({ key: 'la:noun:x', workId: 'w-la', divId: 'd1' });
  });
});

describe('forecast', () => {
  const bundle: WorkLexis = {
    workId: 'w-la',
    lang: 'la',
    tokens: 4,
    recognized: 4,
    analysis: 'test',
    forms: { amo: [['la:verb:amo', 'verb pres ind act 1 sg']], roma: [['la:name:Roma', 'name']], puella: [['la:noun:puella', 'noun nom sg f']] },
    lexemes: {
      'la:verb:amo': { id: 'la:verb:amo', lemma: 'amo', pos: 'verb', gloss: 'love' },
      'la:name:Roma': { id: 'la:name:Roma', lemma: 'Roma', pos: 'name', gloss: 'Rome' },
      'la:noun:puella': { id: 'la:noun:puella', lemma: 'puella', pos: 'noun', gloss: 'girl' },
    },
  };
  it('weights known and likely-familiar fully, met by half, names as known, unrecognised never', () => {
    const statuses = new Map<string, KnownWord>([
      ['la:verb:amo', { key: 'la:verb:amo', lang: 'la', status: 'known', reason: 'manual', lookups: 0, encounters: 0, first_seen: 0, last_seen: 0, updated_at: 0 }],
      ['la:noun:puella', { key: 'la:noun:puella', lang: 'la', status: 'seen', reason: 'lookup', lookups: 1, encounters: 0, first_seen: 0, last_seen: 0, updated_at: 0 }],
    ]);
    const f = forecastText('amo Roma puella xyzzy', 'la', bundle, statuses);
    expect(f.tokens).toBe(4);
    expect(f.unrec).toBe(1);
    expect(f.classes).toEqual({ known: 2, 'likely-familiar': 0, met: 1, new: 0 });
    expect(f.coverage).toBeCloseTo((2 + 0.5) / 4);
  });
});

describe('readiness', () => {
  it('is insufficient-data with little evidence, and never reads completion as a signal', async () => {
    for (const u of ladder.units) await recordEvent({ type: 'UnitCompleted', lang: 'la', unitId: u.id, workId: u.work });
    const ev = await loadEvidence();
    const r = readiness({ ladder, stage: 'I', ev, words: [] });
    expect(r.verdict).toBe('insufficient-data');
    expect(r.signals.find((s) => s.key === 'lookup-rate')?.met).toBeUndefined();
  });

  it('says ready when every signal with data is met, stay when one is not', async () => {
    const now = 100 * DAY;
    // a stage with 12 stops, all seen with words, few lookups, no rescues
    const big: CourseLadder = { ...ladder, units: [unit('w-la/s1', 'w-la', Array.from({ length: 12 }, (_, i) => `s${i + 1}`), 'I', 400)] };
    const reads = Array.from({ length: 12 }, (_, i) => ({ workId: 'w-la', divId: `s${i + 1}`, at: now - (12 - i) * 1000, words: 500 }));
    const lookups = [{ key: 'la:noun:x', workId: 'w-la', divId: 's1', at: now - 11_500 }];
    const events = [
      { type: 'ComprehensionReported' as const, lang: 'la' as const, unitId: 'w-la/s1', workId: 'w-la', degree: 'all' as const, at: now },
      { type: 'ComprehensionReported' as const, lang: 'la' as const, unitId: 'w-la/s1', workId: 'w-la', degree: 'most' as const, at: now },
    ];
    const words: KnownWord[] = Array.from({ length: 40 }, (_, i) => ({
      key: `la:noun:w${i}`, lang: 'la', status: 'seen', reason: 'encounter', lookups: 0, encounters: 3, first_seen: now - 20 * DAY, last_seen: now - DAY, updated_at: now,
    }));
    let r = readiness({ ladder: big, stage: 'I', ev: { reads, lookups, events }, words, forecast: [0.95, 0.92], now });
    const by = Object.fromEntries(r.signals.map((s) => [s.key, s.met]));
    expect(by['lookup-rate']).toBe(true); // 1 lookup / 6000 words
    expect(by['rescue-rate']).toBe(true);
    expect(by['retention']).toBe(true);
    expect(by['unfamiliar-material']).toBe(true);
    expect(by['reported-comprehension']).toBeUndefined(); // one unit reported: fewer than 3 reports
    expect(r.verdict).toBe('ready-to-advance');

    // many rescues: stay
    const rescues = Array.from({ length: 5 }, (_, i) => ({ type: 'RescueOpened' as const, lang: 'la' as const, workId: 'w-la', divId: `s${i + 1}`, at: now - 500 }));
    r = readiness({ ladder: big, stage: 'I', ev: { reads, lookups, events: [...events, ...rescues] }, words, forecast: [0.95], now });
    expect(r.verdict).toBe('stay');
    expect(r.summary).toContain('open the English');
  });

  it('Stage 0 reads the decoding drill', () => {
    const ev = { reads: [], lookups: [], events: Array.from({ length: 10 }, (_, i) => ({ type: 'Stage0DecodeAnswered' as const, lang: 'grc' as const, item: `d${i}`, correct: i < 9, hinted: false, at: i })) };
    const r = readiness({ ladder: { ...ladder, lang: 'grc' }, stage: '0', ev, words: [] });
    expect(r.verdict).toBe('ready-to-advance');
    expect(readiness({ ladder: { ...ladder, lang: 'grc' }, stage: '0', ev: { ...ev, events: ev.events.slice(0, 5) }, words: [] }).verdict).toBe('insufficient-data');
  });
});

describe('help that fades by stage', () => {
  it('profiles', () => {
    expect(assistanceFor('I')).toMatchObject({ highlight: 'all', morphOnFirstLevel: true });
    expect(assistanceFor('II')).toMatchObject({ highlight: 'new', morphOnFirstLevel: true });
    expect(assistanceFor('III')).toMatchObject({ highlight: 'new', morphOnFirstLevel: false });
    expect(assistanceFor('V')).toMatchObject({ highlight: 'none', morphOnFirstLevel: false });
  });
  it('the reader’s manual choices win when "follows your path" is off, or off the ladder', () => {
    const manual = { ...DEFAULT_LEXIS_SETTINGS, highlight: 'none' as const, morphOnFirstLevel: false, followPath: false };
    expect(effectiveSettings(manual, 'I')).toEqual({ highlight: 'none', morphOnFirstLevel: false });
    const follow = { ...manual, followPath: true };
    expect(effectiveSettings(follow, 'I')).toEqual({ highlight: 'all', morphOnFirstLevel: true });
    expect(effectiveSettings(follow, null)).toEqual({ highlight: 'none', morphOnFirstLevel: false });
  });
});

describe('drills', () => {
  const core: CoreWord[] = Array.from({ length: 12 }, (_, i) => ({ id: `grc:noun:w${i}`, lemma: `λ${i}`, pos: 'noun', gloss: `gloss ${i}`, count: 10, share: 0.01, translit: `l${i}` }));
  it('rounds are deterministic for a seed, four options, the answer among them', () => {
    const a = makeRound(core, 'decode', 7, 5);
    const b = makeRound(core, 'decode', 7, 5);
    expect(a).toEqual(b);
    expect(a.length).toBe(5);
    for (const item of a) {
      expect(item.options.length).toBe(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options[item.answer]).toBe(item.word.translit);
    }
    expect(makeRound(core, 'decode', 8, 5)).not.toEqual(a);
    const m = makeRound(core, 'match', 1, 3);
    expect(m[0]!.options[m[0]!.answer]).toBe(m[0]!.word.gloss);
  });
  it('the hint fades after three unaided right answers in a row', () => {
    expect(hintShown([])).toBe(true);
    expect(hintShown([{ correct: true, hinted: false }, { correct: true, hinted: false }])).toBe(true);
    expect(hintShown([{ correct: true, hinted: false }, { correct: true, hinted: false }, { correct: true, hinted: false }])).toBe(false);
    expect(hintShown([{ correct: true, hinted: false }, { correct: true, hinted: true }, { correct: true, hinted: false }])).toBe(true);
    expect(hintShown([{ correct: true, hinted: false }, { correct: true, hinted: false }, { correct: true, hinted: false }, { correct: false, hinted: false }])).toBe(true);
  });
  it('seededRandom is stable', () => {
    const r = seededRandom(42);
    const xs = [r(), r(), r()];
    const r2 = seededRandom(42);
    expect([r2(), r2(), r2()]).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('status helper', () => {
  it('setStatus still works with the new optional fields', async () => {
    await setStatus('la:noun:y', 'known', 'manual');
    const w = (await listKnownWords()).find((k) => k.key === 'la:noun:y');
    expect(w?.status).toBe('known');
    expect(familiarityOf(w)).toBe('known');
  });
});
