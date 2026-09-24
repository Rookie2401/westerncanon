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
  at: number;
}

export interface ReadRow {
  id?: number;
  workId: string;
  divId: string;
  at: number;
}

export class LexisDb extends Dexie {
  known_words!: Table<KnownWord, number>;
  lookups!: Table<LookupRow, number>;
  reads!: Table<ReadRow, number>;

  constructor() {
    super('westerncanon-lexis');
    this.version(1).stores({
      known_words: '++id, &key, lang, status, updated_at',
      lookups: '++id, key, workId, at',
      reads: '++id, [workId+divId], at',
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
