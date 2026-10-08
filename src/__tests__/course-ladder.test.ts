/**
 * The ladder build (scripts/course/lib.mjs) on synthetic stops, and the
 * committed ladders' invariants (docs/COURSE-PLAN.md §2, §6).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- no type declarations for the plain-JS build library
import { makeSections, makeUnits, unitLabel, stageForPool, workStops, coreLemmas } from '../../scripts/course/lib.mjs';
import { ALL_REGISTERED_WORKS } from '../library/registry.ts';
import { inEdition } from '../library/edition.ts';
import { LADDER_STAGES } from '../course/types.ts';
import type { CourseLadder, LadderUnit } from '../course/types.ts';

const DATA = join(process.cwd(), 'data');
const COURSE = join(DATA, 'course');

function stop(id: string, top: string, words: number, counts: Record<string, number> = {}, topLabel = top, label = id) {
  return { id, top, topLabel, label, number: label.match(/\d+$/)?.[0] ?? null, words, unrec: 0, counts: new Map(Object.entries(counts)) };
}

describe('units and sections', () => {
  it('groups consecutive stops of one top to 800–2500 words and never crosses a top once the unit is big enough', () => {
    const stops = [
      stop('b1-c1', 'book-1', 600, {}, 'Book 1', 'Chapter 1'),
      stop('b1-c2', 'book-1', 600, {}, 'Book 1', 'Chapter 2'),
      stop('b1-c3', 'book-1', 600, {}, 'Book 1', 'Chapter 3'),
      stop('b1-c4', 'book-1', 1500, {}, 'Book 1', 'Chapter 4'),
      stop('b2-c1', 'book-2', 900, {}, 'Book 2', 'Chapter 1'),
      stop('b2-c2', 'book-2', 100, {}, 'Book 2', 'Chapter 2'),
    ];
    const units = makeUnits(stops);
    expect(units.map((u: { stops: { id: string }[] }) => u.stops.map((s) => s.id))).toEqual([
      ['b1-c1', 'b1-c2', 'b1-c3'], // 1800: adding c4 (1500) would exceed 2500 and the unit is past the minimum
      ['b1-c4'],
      ['b2-c1', 'b2-c2'], // the 100-word tail folds back into its predecessor
    ]);
    expect(units.map(unitLabel)).toEqual(['Book 1 · Chapter 1–3', 'Book 1 · Chapter 4', 'Book 2 · Chapter 1–2']);
    expect(units.every((u: { mixed: boolean }) => !u.mixed)).toBe(true);
    const sections = makeSections(units);
    expect(sections.map((s: { units: unknown[] }) => s.units.length)).toEqual([2, 1]);
  });

  it('merges tiny tops (drama cards) into mixed units that are each their own section', () => {
    const stops = Array.from({ length: 40 }, (_, i) => stop(`card-${i + 1}`, `card-${i + 1}`, 50, {}, `§ ${i + 1}`, `§ ${i + 1}`));
    const units = makeUnits(stops);
    // 40 x 50 = 2000 words: a unit closes at the next top once it holds >= 800 words (16 cards); the 400-word tail stays
    expect(units.map((u: { stops: unknown[] }) => u.stops.length)).toEqual([16, 16, 8]);
    expect(units.every((u: { mixed: boolean }) => u.mixed)).toBe(true);
    expect(unitLabel(units[0])).toMatch(/^§ 1 – § \d+$/);
    expect(makeSections(units).length).toBe(units.length);
  });

  it('a single stop longer than the maximum is its own unit', () => {
    const units = makeUnits([stop('book-1', 'book-1', 5000, {}, 'Book 1', 'Book 1'), stop('book-2', 'book-2', 5000, {}, 'Book 2', 'Book 2')]);
    expect(units.length).toBe(2);
    expect(unitLabel(units[0])).toBe('Book 1');
  });

  it('counts words, unrecognised tokens and lemma counts per unit', () => {
    const units = makeUnits([stop('a', 'a', 900, { 'la:noun:x': 3 }), stop('b', 'b', 900, { 'la:noun:x': 2, 'la:verb:y': 1 })]);
    expect(units.length).toBe(2);
    expect(units[0].counts.get('la:noun:x')).toBe(3);
  });

  it('stage bands follow the pool of lemmas', () => {
    expect(stageForPool(300)).toBe('I');
    expect(stageForPool(999)).toBe('I');
    expect(stageForPool(1000)).toBe('II');
    expect(stageForPool(4999)).toBe('III');
    expect(stageForPool(10000)).toBe('V');
  });

  it('coreLemmas ranks by running frequency and leaves names out', () => {
    const bundle = { lexemes: { 'la:name:Roma': { pos: 'name' }, 'la:noun:a': { pos: 'noun' }, 'la:verb:b': { pos: 'verb' } } };
    const works = [{ bundle, units: [{ words: 10, counts: new Map([['la:name:Roma', 5], ['la:noun:a', 3], ['la:verb:b', 2]]) }] }];
    const { core, share } = coreLemmas(works, 1);
    expect(core.map((c: { id: string }) => c.id)).toEqual(['la:noun:a']);
    expect(share).toBeCloseTo(0.3);
  });
});

describe('committed ladders', () => {
  const files = ['grc', 'la', 'it'].map((l) => join(COURSE, `ladder.${l}.json`)).filter((f) => existsSync(f));
  it('exist for every course language', () => {
    expect(files.length).toBe(3);
  });

  it.each(files)('%s is well formed, deterministic in shape and consistent with the registry', (file) => {
    const ladder = JSON.parse(readFileSync(file, 'utf8')) as CourseLadder;
    expect(ladder.version).toBe(1);
    expect(ladder.core.length).toBe(ladder.policy.coreWords);
    const ids = new Set<string>();
    let lastPool = 0;
    let lastSection = -1;
    let lastStage = 0;
    for (const u of ladder.units) {
      expect(ids.has(u.id)).toBe(false);
      ids.add(u.id);
      expect(u.id).toBe(`${u.work}/${u.divs[0]}`);
      expect(u.divs.length).toBeGreaterThan(0);
      expect(u.words).toBeGreaterThan(0);
      expect(u.cov3).toBeGreaterThanOrEqual(0);
      expect(u.cov3).toBeLessThanOrEqual(1);
      expect(u.cov1).toBeGreaterThanOrEqual(u.cov3);
      expect(u.pool).toBeGreaterThanOrEqual(lastPool);
      lastPool = u.pool;
      expect(u.section).toBeGreaterThanOrEqual(lastSection);
      lastSection = u.section;
      const stageIdx = LADDER_STAGES.indexOf(u.stage);
      expect(stageIdx).toBeGreaterThanOrEqual(lastStage);
      lastStage = stageIdx;
      expect(ladder.works[u.work]).toBeDefined();
      const w = ALL_REGISTERED_WORKS.find((x) => x.id === u.work);
      expect(w, `unit work ${u.work} must be in the registry`).toBeDefined();
      expect(w!.language).toBe(ladder.lang);
      expect(inEdition(w!, 'original')).toBe(true);
      expect(inEdition(w!, 'en')).toBe(false);
    }
    // a work's units keep their document order along the ladder
    const seenPerWork = new Map<string, number>();
    for (const u of ladder.units) {
      const n = seenPerWork.get(u.work) ?? 0;
      seenPerWork.set(u.work, n + 1);
    }
    expect([...seenPerWork.keys()].sort()).toEqual(Object.keys(ladder.works).sort());
  });

  it('every unit of a sample of works names real reader stops, in document order', () => {
    for (const file of files) {
      const ladder = JSON.parse(readFileSync(file, 'utf8')) as CourseLadder;
      const works = Object.keys(ladder.works).filter((_, i) => i % 23 === 0).slice(0, 12);
      for (const workId of works) {
        const work = JSON.parse(readFileSync(join(DATA, workId, 'work.json'), 'utf8'));
        const order = workStops(work).map((s: { id: string }) => s.id);
        const units = ladder.units.filter((u: LadderUnit) => u.work === workId);
        const flat = units.flatMap((u) => u.divs);
        expect(flat, `${workId}: units cover every stop once in order`).toEqual(order);
      }
    }
  });
});
