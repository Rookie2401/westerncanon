/**
 * Known-word tracking (docs/LEXIS-PLAN.md §1, §6). Backed by Dexie/IndexedDB
 * (src/lexis/db.ts, db name 'westerncanon-lexis' — see db.ts) but the actual
 * source of truth for reads is a synchronous in-memory cache, mirrored to
 * IndexedDB on every write (best effort) and hydrated from it once per
 * session on first use. That split is what lets `useStatuses` be a plain
 * `useSyncExternalStore` hook (getSnapshot must be synchronous) while still
 * persisting across reloads, and it's also what makes everything degrade
 * gracefully when IndexedDB is unavailable (see db.ts): the memory cache
 * keeps working; only persistence is lost for that session.
 *
 * Promotion rules (plan §1):
 *  - a fresh lexeme starts untracked ("new" — no row at all);
 *  - a lookup on an untracked/'new' word promotes it to 'seen';
 *  - a lookup on a 'known'/'mastered' word demotes it to 'recognizing' (the
 *    reader needed help with a word they'd marked known);
 *  - a lookup on 'seen'/'recognizing'/'ignored' just counts (status unchanged);
 *  - `recordRead` counts an unaided encounter for every lexeme in a division,
 *    once per division per calendar day (see `reads` table / `readLog`); once
 *    a lexeme's encounter count reaches `autoKnownAfter` (settings.ts) it is
 *    promoted to 'known' — unless it's already 'known'/'mastered'/'ignored'.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { getDb, markDbUnavailable, type LookupRow, type ReadRow } from './db.ts';
import { getLexisSettings } from './settings.ts';
import { WORD_STATUSES, type KnownWord, type LexLang, type WordStatus } from './types.ts';

function langFromLexemeId(id: string): LexLang {
  const lang = id.split(':')[0];
  return lang === 'grc' || lang === 'la' || lang === 'it' ? lang : 'la';
}

function now(): number {
  return Date.now();
}

/* --- in-memory source of truth -------------------------------------------- */

const cache = new Map<string, KnownWord>();
/** `${workId}::${divId}` -> last-recorded-read timestamp, for the once-per-day dedup. */
const readLog = new Map<string, number>();

let version = 0;
const listeners = new Set<() => void>();
function notify(): void {
  version++;
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function dayKey(ts: number): string {
  return new Date(ts).toDateString();
}

function touch(kw: KnownWord): KnownWord {
  cache.set(kw.key, kw);
  notify();
  return kw;
}

async function persist(kw: KnownWord): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await db.known_words.put(kw);
  } catch {
    markDbUnavailable();
  }
}

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function ensureHydrated(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.known_words.toArray();
        for (const r of rows) if (!cache.has(r.key)) cache.set(r.key, r);
        const reads = await db.reads.toArray();
        for (const r of reads) {
          const rk = `${r.workId}::${r.divId}`;
          const prev = readLog.get(rk);
          if (prev === undefined || r.at > prev) readLog.set(rk, r.at);
        }
        if (rows.length || reads.length) notify();
      } catch {
        markDbUnavailable();
      }
    }
    hydrated = true;
  })();
  return hydratePromise;
}

/** Test-only: reset the in-memory store (cache, dedup log, hydration state). */
export function __resetVocab(): void {
  cache.clear();
  readLog.clear();
  hydrated = false;
  hydratePromise = null;
  version = 0;
}

function newRow(key: string, patch: Partial<KnownWord> = {}): KnownWord {
  const t = now();
  return {
    key,
    lang: langFromLexemeId(key),
    status: 'new',
    reason: 'manual',
    lookups: 0,
    encounters: 0,
    first_seen: t,
    last_seen: t,
    updated_at: t,
    ...patch,
  };
}

/* --- writes ----------------------------------------------------------------- */

export async function setStatus(lexemeId: string, status: WordStatus, reason: string): Promise<void> {
  await ensureHydrated();
  const t = now();
  const existing = cache.get(lexemeId);
  const kw = touch(
    existing
      ? { ...existing, status, reason, updated_at: t, last_seen: t }
      : newRow(lexemeId, { status, reason }),
  );
  await persist(kw);
}

export async function recordLookup(lexemeId: string, ref: { workId: string; divId: string }): Promise<void> {
  await ensureHydrated();
  const t = now();
  const existing = cache.get(lexemeId);
  const curStatus = existing?.status ?? 'new';
  const status: WordStatus =
    curStatus === 'new' ? 'seen'
      : curStatus === 'known' || curStatus === 'mastered' ? 'recognizing'
        : curStatus;
  const kw = touch(
    existing
      ? { ...existing, status, reason: 'lookup', lookups: existing.lookups + 1, updated_at: t, last_seen: t }
      : newRow(lexemeId, { status, reason: 'lookup', lookups: 1 }),
  );
  await persist(kw);
  const db = getDb();
  if (db) {
    try {
      const row: LookupRow = { key: lexemeId, workId: ref.workId, at: t };
      await db.lookups.add(row);
    } catch {
      markDbUnavailable();
    }
  }
}

export async function recordRead(lexemeIds: string[], ref: { workId: string; divId: string }): Promise<void> {
  await ensureHydrated();
  const t = now();
  const rk = `${ref.workId}::${ref.divId}`;
  const lastAt = readLog.get(rk);
  if (lastAt !== undefined && dayKey(lastAt) === dayKey(t)) return; // already counted today
  readLog.set(rk, t);
  const db = getDb();
  if (db) {
    try {
      const row: ReadRow = { workId: ref.workId, divId: ref.divId, at: t };
      await db.reads.add(row);
    } catch {
      markDbUnavailable();
    }
  }
  const { autoKnownAfter } = getLexisSettings();
  for (const lexemeId of lexemeIds) {
    const existing = cache.get(lexemeId);
    const encounters = (existing?.encounters ?? 0) + 1;
    const curStatus = existing?.status ?? 'new';
    let status: WordStatus = curStatus;
    let reason = existing?.reason ?? 'encounter';
    const locked = curStatus === 'known' || curStatus === 'mastered' || curStatus === 'ignored';
    if (!locked && autoKnownAfter > 0 && encounters >= autoKnownAfter) {
      status = 'known';
      reason = 'encounter';
    }
    const kw = touch(
      existing
        ? { ...existing, status, reason, encounters, updated_at: t, last_seen: t }
        : newRow(lexemeId, { status, reason, encounters }),
    );
    await persist(kw);
  }
}

/** Bulk "mark the rest as known". Returns how many rows actually changed
 *  (already-known/mastered lexemes are left as they are). */
export async function markAllKnown(lexemeIds: string[]): Promise<number> {
  await ensureHydrated();
  const t = now();
  let changed = 0;
  for (const lexemeId of lexemeIds) {
    const existing = cache.get(lexemeId);
    if (existing && (existing.status === 'known' || existing.status === 'mastered')) continue;
    changed++;
    const kw = touch(
      existing
        ? { ...existing, status: 'known', reason: 'bulk', updated_at: t, last_seen: t }
        : newRow(lexemeId, { status: 'known', reason: 'bulk' }),
    );
    await persist(kw);
  }
  return changed;
}

/* --- export / import --------------------------------------------------------- */

interface VocabExport {
  version: number;
  exported_at: number;
  words: KnownWord[];
}

/**
 * Every tracked lexeme's row — a snapshot of the whole known_words table.
 * Not in plan §6's surface (which only offers `useStatuses(keys)`, keyed by
 * a caller-supplied list, and the aggregate `vocabCounts()`); added because
 * the Vocabulary screen (src/screens/Vocabulary.tsx, R-UI) needs to
 * enumerate "every word the reader has ever marked" to build its list and
 * per-language counts, which neither §6 export supports.
 */
export async function listKnownWords(): Promise<KnownWord[]> {
  await ensureHydrated();
  return [...cache.values()];
}

export async function exportVocab(): Promise<string> {
  await ensureHydrated();
  const payload: VocabExport = { version: 1, exported_at: now(), words: [...cache.values()] };
  return JSON.stringify(payload);
}

function statusRank(s: WordStatus): number {
  const i = WORD_STATUSES.indexOf(s);
  return i < 0 ? 0 : i;
}

/** Import a JSON export, merging by key and keeping the higher status
 *  (WORD_STATUSES order: new < seen < recognizing < known < mastered < ignored).
 *  Returns how many rows were imported/updated. */
export async function importVocab(json: string): Promise<number> {
  await ensureHydrated();
  let payload: VocabExport;
  try {
    payload = JSON.parse(json) as VocabExport;
  } catch {
    return 0;
  }
  if (!payload || !Array.isArray(payload.words)) return 0;
  const t = now();
  let count = 0;
  for (const w of payload.words) {
    if (!w || typeof w.key !== 'string' || typeof w.status !== 'string') continue;
    const existing = cache.get(w.key);
    if (existing && statusRank(existing.status) >= statusRank(w.status)) continue;
    const merged: KnownWord = {
      key: w.key,
      lang: existing?.lang ?? langFromLexemeId(w.key),
      status: w.status,
      reason: 'import',
      lookups: Math.max(existing?.lookups ?? 0, w.lookups ?? 0),
      encounters: Math.max(existing?.encounters ?? 0, w.encounters ?? 0),
      first_seen: existing?.first_seen ?? w.first_seen ?? t,
      last_seen: t,
      updated_at: t,
    };
    touch(merged);
    await persist(merged);
    count++;
  }
  return count;
}

export async function vocabCounts(): Promise<Record<WordStatus, number>> {
  await ensureHydrated();
  const out = Object.fromEntries(WORD_STATUSES.map((s) => [s, 0])) as Record<WordStatus, number>;
  for (const kw of cache.values()) out[kw.status]++;
  return out;
}

/* --- reads (hook) ------------------------------------------------------------- */

const EMPTY_MAP: ReadonlyMap<string, KnownWord> = new Map();
const snapshotCache = new Map<string, { version: number; map: Map<string, KnownWord> }>();

function snapshotFor(keys: string[], sig: string): Map<string, KnownWord> {
  const hit = snapshotCache.get(sig);
  if (hit && hit.version === version) return hit.map;
  const map = new Map<string, KnownWord>();
  for (const k of keys) {
    const v = cache.get(k);
    if (v) map.set(k, v);
  }
  snapshotCache.set(sig, { version, map });
  return map;
}

/** Live view of the given lexeme ids' KnownWord rows; re-renders whenever any
 *  of this module's writes change the cache (own subscription + useSyncExternalStore,
 *  since Dexie is not the synchronous source of truth here — see file header). */
export function useStatuses(keys: string[]): Map<string, KnownWord> {
  useEffect(() => {
    void ensureHydrated();
  }, []);
  const sig = keys.join(' ');
  return useSyncExternalStore(
    subscribe,
    () => (keys.length ? snapshotFor(keys, sig) : (EMPTY_MAP as Map<string, KnownWord>)),
    () => EMPTY_MAP as Map<string, KnownWord>,
  );
}
