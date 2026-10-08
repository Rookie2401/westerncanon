/**
 * Course evidence (docs/COURSE-PLAN.md §3): the append-only event log, kept
 * in memory as the source of truth for reads (like src/lexis/vocab.ts) and
 * mirrored to Dexie's `events` table best-effort; plus the folds that read
 * it together with Lexis' read (exposure) and lookup logs.
 *
 * GoLearn's five notions stay apart:
 *   displayed   nothing here records a mere visit
 *   seen        a read row (a stop the reader dwelt on) — from vocab.ts
 *   finished    a `UnitCompleted` event, explicit, never inferred
 *   understood  a `ComprehensionReported` event, the reader's own words
 *   estimated   familiarity.ts, from the word rows — never progress
 */
import { useEffect, useSyncExternalStore } from 'react';
import { getDb, markDbUnavailable } from '../lexis/db.ts';
import type { LookupRow, ReadRow } from '../lexis/db.ts';
import { listLookups, listReads } from '../lexis/vocab.ts';
import type { LexLang } from '../lexis/types.ts';
import type { CourseEvent, Degree, EventRow, LadderUnit, UnitProgress } from './types.ts';

const events: EventRow[] = [];
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

let hydrated = false;
let hydratePromise: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.events.toArray();
        const have = new Set(events.map((e) => `${e.type}:${e.at}`));
        for (const r of rows) if (!have.has(`${r.type}:${r.at}`)) events.push(r as unknown as EventRow);
        events.sort((a, b) => a.at - b.at);
        if (rows.length) notify();
      } catch {
        markDbUnavailable();
      }
    }
    hydrated = true;
  })();
  return hydratePromise;
}

/** Test-only. */
export function __resetEvidence(): void {
  events.length = 0;
  hydrated = false;
  hydratePromise = null;
  version = 0;
}

export async function recordEvent(e: CourseEvent, at: number = Date.now()): Promise<void> {
  await ensureHydrated();
  const row: EventRow = { ...e, at };
  events.push(row);
  notify();
  const db = getDb();
  if (db) {
    try {
      await db.events.add(row as never);
    } catch {
      markDbUnavailable();
    }
  }
}

export async function listEvents(): Promise<EventRow[]> {
  await ensureHydrated();
  return [...events];
}

/** Re-renders whenever an event is recorded (or the log hydrates). */
export function useEvidenceVersion(): number {
  useEffect(() => {
    void ensureHydrated();
  }, []);
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

/* --- folds ------------------------------------------------------------------ */

export interface Evidence {
  reads: ReadRow[];
  lookups: LookupRow[];
  events: EventRow[];
}

export async function loadEvidence(): Promise<Evidence> {
  const [reads, lookups, ev] = await Promise.all([listReads(), listLookups(), listEvents()]);
  return { reads, lookups, events: ev };
}

/** Set of `${workId}/${divId}` the reader has dwelt on. */
export function seenStops(reads: ReadRow[]): Set<string> {
  const out = new Set<string>();
  for (const r of reads) out.add(`${r.workId}/${r.divId}`);
  return out;
}

export function unitProgress(unit: LadderUnit, ev: Evidence, seen: Set<string> = seenStops(ev.reads)): UnitProgress {
  let seenDivs = 0;
  for (const d of unit.divs) if (seen.has(`${unit.work}/${d}`)) seenDivs++;
  let finishedAt: number | null = null;
  let reported: Degree | null = null;
  for (const e of ev.events) {
    if (e.type === 'UnitCompleted' && e.unitId === unit.id) finishedAt = e.at;
    if (e.type === 'ComprehensionReported' && e.unitId === unit.id) reported = e.degree;
  }
  return { unitId: unit.id, seenDivs, totalDivs: unit.divs.length, finishedAt, reported };
}

/** Progress of many units with the seen set computed once. */
export function unitProgressMany(units: LadderUnit[], ev: Evidence): Map<string, UnitProgress> {
  const seen = seenStops(ev.reads);
  const finished = new Map<string, number>();
  const reports = new Map<string, Degree>();
  for (const e of ev.events) {
    if (e.type === 'UnitCompleted') finished.set(e.unitId, e.at);
    if (e.type === 'ComprehensionReported') reports.set(e.unitId, e.degree);
  }
  const out = new Map<string, UnitProgress>();
  for (const u of units) {
    let seenDivs = 0;
    for (const d of u.divs) if (seen.has(`${u.work}/${d}`)) seenDivs++;
    out.set(u.id, {
      unitId: u.id,
      seenDivs,
      totalDivs: u.divs.length,
      finishedAt: finished.get(u.id) ?? null,
      reported: reports.get(u.id) ?? null,
    });
  }
  return out;
}

/** Stage 0 steps the reader has marked done, per language. */
export function stage0StepsDone(ev: Evidence, lang: LexLang): Set<string> {
  const out = new Set<string>();
  for (const e of ev.events) if (e.type === 'Stage0StepCompleted' && e.lang === lang) out.add(e.step);
  return out;
}

/** The latest decode / match answers of a language, oldest first. */
export function drillAnswers(ev: Evidence, lang: LexLang, type: 'Stage0DecodeAnswered' | 'Stage0MatchAnswered') {
  return ev.events.filter((e) => e.type === type && e.lang === lang) as Extract<EventRow, { type: typeof type }>[];
}
