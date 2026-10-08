/**
 * Course loader — the ladders and Stage 0 packs of the original-language
 * edition (docs/COURSE-PLAN.md §2). Same caching style as src/lexis/index.ts:
 * each file is fetched at most once, a failed fetch drops its memo so a later
 * call retries. Nothing here is reachable from the English edition:
 * `courseAvailable` gates on `lexisAvailable`, which gates on the edition.
 */
import { lexisAvailable } from '../lexis/index.ts';
import type { Lang } from '../library/types.ts';
import type { LexLang } from '../lexis/types.ts';
import type { CourseLadder, LadderUnit, Stage0Pack } from './types.ts';

/** The languages with a bundled ladder (data/course/ladder.<lang>.json). */
export const COURSE_LANGS: readonly LexLang[] = ['grc', 'la', 'it'];

export function courseAvailable(lang: Lang): lang is LexLang {
  return lexisAvailable(lang) && (COURSE_LANGS as readonly string[]).includes(lang);
}

let base = import.meta.env.BASE_URL || '/';
let fetchImpl: typeof fetch = (...args) => fetch(...args);
const ladderCache = new Map<string, Promise<CourseLadder>>();
const stage0Cache = new Map<string, Promise<Stage0Pack>>();
const indexCache = new WeakMap<CourseLadder, LadderIndex>();

/** Test-only: point the loader at a fake fetch/base and drop every memo. */
export function __configureCourse(opts: { baseUrl?: string; fetchImpl?: typeof fetch }): void {
  if (opts.baseUrl !== undefined) base = opts.baseUrl;
  if (opts.fetchImpl !== undefined) fetchImpl = opts.fetchImpl;
  ladderCache.clear();
  stage0Cache.clear();
}

function loadJson<T>(path: string): Promise<T> {
  return fetchImpl(`${base}${path}`).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json() as Promise<T>;
  });
}

function memo<T>(cache: Map<string, Promise<T>>, key: string, path: string): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = loadJson<T>(path);
  p.catch(() => {
    if (cache.get(key) === p) cache.delete(key);
  });
  cache.set(key, p);
  return p;
}

export function loadLadder(lang: LexLang): Promise<CourseLadder> {
  return memo(ladderCache, lang, `course/ladder.${lang}.json`);
}

export function loadStage0(lang: LexLang): Promise<Stage0Pack> {
  return memo(stage0Cache, lang, `course/stage0.${lang}.json`);
}

/* --- index ------------------------------------------------------------- */

export interface LadderIndex {
  /** unit id -> position in `units` */
  byId: Map<string, number>;
  /** `${workId}/${divId}` -> position of the unit containing that stop */
  byStop: Map<string, number>;
}

export function ladderIndex(ladder: CourseLadder): LadderIndex {
  const hit = indexCache.get(ladder);
  if (hit) return hit;
  const byId = new Map<string, number>();
  const byStop = new Map<string, number>();
  ladder.units.forEach((u, i) => {
    byId.set(u.id, i);
    for (const d of u.divs) byStop.set(`${u.work}/${d}`, i);
  });
  const idx = { byId, byStop };
  indexCache.set(ladder, idx);
  return idx;
}

/** The unit a reader stop belongs to, with its position, or null when the stop is off the ladder. */
export function unitOfStop(ladder: CourseLadder, workId: string, divId: string): { unit: LadderUnit; index: number } | null {
  const i = ladderIndex(ladder).byStop.get(`${workId}/${divId}`);
  return i === undefined ? null : { unit: ladder.units[i]!, index: i };
}

export function unitById(ladder: CourseLadder, unitId: string): { unit: LadderUnit; index: number } | null {
  const i = ladderIndex(ladder).byId.get(unitId);
  return i === undefined ? null : { unit: ladder.units[i]!, index: i };
}

/** Human stage name. */
export function stageName(stage: string): string {
  return stage === '0' ? 'Stage 0' : `Stage ${stage}`;
}

export const STAGE_WORDS: Record<string, string> = {
  '0': 'the script and the first words',
  I: 'first readings: expect to look most words up',
  II: 'the vocabulary is taking shape',
  III: 'reading with occasional help',
  IV: 'reading widely',
  V: 'the library is yours',
};
