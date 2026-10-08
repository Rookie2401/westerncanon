/**
 * Dexie (IndexedDB) schema for language-help vocabulary tracking
 * (docs/LEXIS-PLAN.md §6, vocab.ts). Kept in its own tiny module so vocab.ts
 * can stay focused on the store logic.
 *
 * IndexedDB is not available everywhere (jsdom tests have no `indexedDB`
 * global at all; some private-browsing modes refuse to open a database).
 * `getDb()` never throws: it returns null when IndexedDB can't be used, and
 * vocab.ts falls back to an in-memory store so the feature still works for
 * the session, just without persistence.
 */
import Dexie, { type Table } from 'dexie';
import type { KnownWord } from './types.ts';

export interface LookupRow {
  id?: number;
  /** lexeme id */
  key: string;
  workId: string;
  /** absent on rows from before the course */
  divId?: string;
  at: number;
}

export interface ReadRow {
  id?: number;
  workId: string;
  divId: string;
  at: number;
  /** running words of the division (course evidence: lookups per 100 words); absent on rows from before the course */
  words?: number;
}

/** An append-only course event (docs/COURSE-PLAN.md §3): the CourseEvent fields plus id and time. */
export interface EventRowStored {
  id?: number;
  type: string;
  lang: string;
  at: number;
  workId?: string;
  [key: string]: unknown;
}

export class LexisDb extends Dexie {
  known_words!: Table<KnownWord, number>;
  lookups!: Table<LookupRow, number>;
  reads!: Table<ReadRow, number>;
  events!: Table<EventRowStored, number>;

  constructor() {
    super('westerncanon-lexis');
    this.version(1).stores({
      known_words: '++id, &key, lang, status, updated_at',
      lookups: '++id, key, workId, at',
      reads: '++id, [workId+divId], at',
    });
    // v2 (course, docs/COURSE-PLAN.md §3): the append-only event log. The
    // existing tables keep their indexes; new optional fields need no index.
    this.version(2).stores({
      known_words: '++id, &key, lang, status, updated_at',
      lookups: '++id, key, workId, at',
      reads: '++id, [workId+divId], at',
      events: '++id, type, lang, workId, at',
    });
  }
}

let instance: LexisDb | null = null;
let unavailable = false;

function indexedDbSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/** The shared db instance, or null when IndexedDB can't be used. */
export function getDb(): LexisDb | null {
  if (unavailable) return null;
  if (!indexedDbSupported()) {
    unavailable = true;
    return null;
  }
  if (!instance) {
    try {
      instance = new LexisDb();
    } catch {
      unavailable = true;
      return null;
    }
  }
  return instance;
}

/** Called by vocab.ts when a Dexie operation throws at runtime (e.g. quota,
 *  blocked upgrade) so later calls fall back to memory-only for the session. */
export function markDbUnavailable(): void {
  unavailable = true;
}

export function isDbAvailable(): boolean {
  return !unavailable && indexedDbSupported();
}

/** Test-only: forget the cached instance/availability so a fresh test can
 *  reconfigure `indexedDB` and get a clean db. */
export function __resetDb(): void {
  instance = null;
  unavailable = false;
}
