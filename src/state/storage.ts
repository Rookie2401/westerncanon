/**
 * localStorage-backed state: reading preferences, bookmarks, last position,
 * and the Library screen's expanded-author set.
 *
 * Preferences stay under `summa:prefs` (unchanged; the pre-paint script in
 * index.html reads that key). Bookmarks and last-position moved to a
 * library-wide, work-agnostic model under `library:*`. A one-time migration
 * lifts any pre-existing `summa:bookmarks` / `summa:last` into the new shape on
 * first read and LEAVES THE OLD KEYS IN PLACE as a backup — a user's Summa
 * bookmarks and reading position are never wiped.
 *
 * Everything degrades gracefully if storage is unavailable or corrupt.
 */
import { useSyncExternalStore } from 'react';

export const KEYS = {
  prefs: 'summa:prefs',
  bookmarks: 'library:bookmarks',
  last: 'library:last',
  expandedAuthors: 'library:expandedAuthors',
  expandedGroups: 'library:expandedGroups',
  legacyBookmarks: 'summa:bookmarks',
  legacyLast: 'summa:last',
} as const;

/** Canonical work id for the Latin Summa (kept in sync with src/library/registry.ts). */
export const SUMMA_WORK_ID = 'summa-theologiae';

/**
 * Every `profile: 'summa'` work id (kept in sync with src/library/registry.ts,
 * not imported from it to avoid a cross-module dependency in this
 * storage-only file). A Summa-profile work's reader route is the 3-segment
 * `/read/:partId/:qNum/:aParam` (no workId segment — src/corpus/corpus.ts's
 * `PartInfo.workId` already tells you which work a given partId belongs to),
 * unlike every generic-profile work's 2-segment `/read/:workId/:divId`. New
 * Summa-profile editions must be added here too, or their bookmarks/last-read
 * position will build the wrong kind of href (see `refHref` below).
 */
const SUMMA_PROFILE_WORK_IDS: readonly string[] = [SUMMA_WORK_ID, 'summa-theologiae-en'];

function rawItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Stable-identity snapshot cache. `useSyncExternalStore` compares snapshots with
 * Object.is, so getSnapshot MUST return the same reference until the underlying
 * value actually changes — otherwise it re-renders forever. We key the cached
 * parsed value on the raw stored string.
 */
const snapCache = new Map<string, { raw: string | null; value: unknown }>();

function readCached<T>(key: string, parse: (raw: string | null) => T): T {
  const raw = rawItem(key);
  const hit = snapCache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = parse(raw);
  snapCache.set(key, { raw, value });
  return value;
}

/**
 * Test-only: drop the in-memory snapshot cache. The cache keys parsed values on
 * the raw stored string; a test that mutates `localStorage` directly (e.g.
 * `localStorage.clear()`) can otherwise leave a stale `{raw: null}` entry that
 * collides with a genuinely-absent key. The running app never clears keys out
 * from under the cache, so this is not needed in production.
 */
export function __clearSnapshotCache(): void {
  snapCache.clear();
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / unavailable */
  }
}

// --- tiny pub/sub so hooks re-render on our own writes (storage event only
// fires cross-tab) -------------------------------------------------------------
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('summa:') || e.key.startsWith('library:')) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

// --- preferences -------------------------------------------------------------
export type ThemeChoice = 'light' | 'dark' | 'system';

export interface Prefs {
  /** index into FONT_SIZES */
  fontSize: number;
  /** index into LINE_HEIGHTS */
  lineSpacing: number;
  theme: ThemeChoice;
}

export const FONT_SIZES = ['0.98rem', '1.06rem', '1.19rem', '1.32rem', '1.46rem'] as const;
export const LINE_HEIGHTS = ['1.5', '1.62', '1.78'] as const;

export const DEFAULT_PREFS: Prefs = { fontSize: 2, lineSpacing: 1, theme: 'system' };

export function getPrefs(): Prefs {
  return readCached(KEYS.prefs, (raw) => {
    const p = parseJson<Partial<Prefs>>(raw, {});
    return {
      fontSize: clampIndex(p.fontSize, FONT_SIZES.length, DEFAULT_PREFS.fontSize),
      lineSpacing: clampIndex(p.lineSpacing, LINE_HEIGHTS.length, DEFAULT_PREFS.lineSpacing),
      theme:
        p.theme === 'light' || p.theme === 'dark' || p.theme === 'system'
          ? p.theme
          : 'system',
    };
  });
}

function clampIndex(v: unknown, len: number, dflt: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < len ? v : dflt;
}

export function setPrefs(patch: Partial<Prefs>): void {
  const next = { ...getPrefs(), ...patch };
  write(KEYS.prefs, next);
  emit();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => DEFAULT_PREFS);
}

// --- shared position model -------------------------------------------------

/**
 * A location anywhere in the Library. `path` is work-relative:
 *   Summa   -> [partId, String(qNum), aParam]   e.g. ['prima-pars', '2', '3']
 *   generic -> [divisionId]                      e.g. ['de-genere']
 */
export interface LibraryRef {
  workId: string;
  path: string[];
}

/** Stable identity string for a LibraryRef (bookmark key, equality checks). */
export function refKey(r: LibraryRef): string {
  return `${r.workId}::${r.path.join('/')}`;
}

/** The in-app route for a LibraryRef. */
export function refHref(r: LibraryRef): string {
  return SUMMA_PROFILE_WORK_IDS.includes(r.workId)
    ? `/read/${r.path.join('/')}`
    : `/read/${r.workId}/${r.path[0] ?? ''}`;
}

// --- bookmarks ------------------------------------------------------------------
export interface Bookmark extends LibraryRef {
  /** Human label, e.g. "I q. 2 a. 3" or "Isagoge · § I". */
  label: string;
  /** Secondary line (utrum / editorial section title), or null. */
  title: string | null;
  added: number;
}

interface LegacyBookmark {
  citation?: string;
  partId?: string;
  qNum?: number;
  aParam?: string;
  title?: string | null;
  added?: number;
}

function migrateBookmark(b: LegacyBookmark): Bookmark | null {
  if (!b || typeof b.partId !== 'string' || typeof b.aParam !== 'string') return null;
  return {
    workId: SUMMA_WORK_ID,
    path: [b.partId, String(b.qNum ?? ''), b.aParam],
    label: b.citation ?? `${b.partId} ${b.qNum ?? ''} ${b.aParam}`.trim(),
    title: b.title ?? null,
    added: typeof b.added === 'number' ? b.added : Date.now(),
  };
}

function isBookmark(v: unknown): v is Bookmark {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as Bookmark).workId === 'string' &&
    Array.isArray((v as Bookmark).path)
  );
}

export function getBookmarks(): Bookmark[] {
  return readCached(KEYS.bookmarks, (raw) => {
    if (raw != null) {
      const list = parseJson<unknown[]>(raw, []);
      return Array.isArray(list) ? list.filter(isBookmark) : [];
    }
    // No new-key data — migrate from the legacy Summa key (kept intact).
    const legacy = parseJson<LegacyBookmark[]>(rawItem(KEYS.legacyBookmarks), []);
    const migrated = Array.isArray(legacy)
      ? legacy.map(migrateBookmark).filter((b): b is Bookmark => b !== null)
      : [];
    if (migrated.length) write(KEYS.bookmarks, migrated);
    return migrated;
  });
}

export function isBookmarked(key: string): boolean {
  return getBookmarks().some((b) => refKey(b) === key);
}

export function toggleBookmark(bm: Omit<Bookmark, 'added'>): boolean {
  const key = refKey(bm);
  const current = getBookmarks();
  const without = current.filter((b) => refKey(b) !== key);
  const nowOn = without.length === current.length;
  if (nowOn) without.push({ ...bm, added: Date.now() });
  write(KEYS.bookmarks, without);
  emit();
  return nowOn;
}

export function removeBookmark(key: string): void {
  write(KEYS.bookmarks, getBookmarks().filter((b) => refKey(b) !== key));
  emit();
}

export function useBookmarks(): Bookmark[] {
  return useSyncExternalStore(subscribe, getBookmarks, () => []);
}

export function useIsBookmarked(key: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isBookmarked(key),
    () => false,
  );
}

// --- last position -----------------------------------------------------------
export interface LastPosition extends LibraryRef {
  scrollRatio: number;
  /** Human label for the Continue card, e.g. "I q. 2 a. 3" or "Isagoge · § I". */
  label?: string;
  /** Secondary line (utrum / editorial section title). */
  title?: string | null;
}

interface LegacyLast {
  partId?: string;
  qNum?: number;
  aParam?: string;
  scrollRatio?: number;
  title?: string | null;
  citation?: string;
}

export function getLast(): LastPosition | null {
  return readCached(KEYS.last, (raw) => {
    const parse = (v: unknown): LastPosition | null => {
      if (
        !v ||
        typeof v !== 'object' ||
        typeof (v as LastPosition).workId !== 'string' ||
        !Array.isArray((v as LastPosition).path)
      ) {
        return null;
      }
      const p = v as LastPosition;
      return {
        workId: p.workId,
        path: p.path.map(String),
        scrollRatio: typeof p.scrollRatio === 'number' ? p.scrollRatio : 0,
        label: p.label,
        title: p.title ?? null,
      };
    };
    if (raw != null) return parse(parseJson<unknown>(raw, null));
    // Migrate from the legacy Summa key (kept intact).
    const legacy = parseJson<LegacyLast | null>(rawItem(KEYS.legacyLast), null);
    if (!legacy || typeof legacy.partId !== 'string' || typeof legacy.aParam !== 'string') {
      return null;
    }
    const migrated: LastPosition = {
      workId: SUMMA_WORK_ID,
      path: [legacy.partId, String(legacy.qNum ?? ''), legacy.aParam],
      scrollRatio: typeof legacy.scrollRatio === 'number' ? legacy.scrollRatio : 0,
      label: legacy.citation,
      title: legacy.title ?? null,
    };
    write(KEYS.last, migrated);
    return migrated;
  });
}

export function setLast(v: LastPosition): void {
  write(KEYS.last, v);
  emit();
}

export function useLast(): LastPosition | null {
  return useSyncExternalStore(subscribe, getLast, () => null);
}

// --- Library screen: expanded-author accordion state -----------------------
export function getExpandedAuthors(): string[] {
  return readCached(KEYS.expandedAuthors, (raw) => {
    const list = parseJson<string[]>(raw, []);
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  });
}

/** Whether the user has ever toggled the accordion (vs. the computed default). */
export function expandedAuthorsInitialized(): boolean {
  return rawItem(KEYS.expandedAuthors) != null;
}

/** Persist an explicit set only if the key has never been written. */
export function seedExpandedAuthors(ids: string[]): void {
  if (rawItem(KEYS.expandedAuthors) == null) {
    write(KEYS.expandedAuthors, ids);
    emit();
  }
}

export function toggleExpandedAuthor(authorId: string): void {
  const cur = getExpandedAuthors();
  const next = cur.includes(authorId)
    ? cur.filter((a) => a !== authorId)
    : [...cur, authorId];
  write(KEYS.expandedAuthors, next);
  emit();
}

export function useExpandedAuthors(): string[] {
  return useSyncExternalStore(subscribe, getExpandedAuthors, () => []);
}

// --- Library screen: expanded work-family (per-text dropdown) state ---------
// Parallel to the expanded-author accordion above, keyed by `authorId/family`.
// Families default COLLAPSED, so the computed default is simply the empty set
// and no seeding is required for first paint.
export function getExpandedGroups(): string[] {
  return readCached(KEYS.expandedGroups, (raw) => {
    const list = parseJson<string[]>(raw, []);
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  });
}

/** Whether the user has ever toggled a family (vs. the all-collapsed default). */
export function expandedGroupsInitialized(): boolean {
  return rawItem(KEYS.expandedGroups) != null;
}

/** Persist an explicit set only if the key has never been written. */
export function seedExpandedGroups(keys: string[]): void {
  if (rawItem(KEYS.expandedGroups) == null) {
    write(KEYS.expandedGroups, keys);
    emit();
  }
}

export function toggleExpandedGroup(key: string): void {
  const cur = getExpandedGroups();
  const next = cur.includes(key)
    ? cur.filter((k) => k !== key)
    : [...cur, key];
  write(KEYS.expandedGroups, next);
  emit();
}

export function useExpandedGroups(): string[] {
  return useSyncExternalStore(subscribe, getExpandedGroups, () => []);
}
