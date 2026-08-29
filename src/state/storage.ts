/**
 * localStorage-backed state: reading preferences, bookmarks, last position.
 * All keys are namespaced `summa:*`. Everything degrades gracefully if storage
 * is unavailable or corrupt (private mode, cleared data, hand-edited JSON).
 */
import { useSyncExternalStore } from 'react';

export const KEYS = {
  prefs: 'summa:prefs',
  bookmarks: 'summa:bookmarks',
  last: 'summa:last',
} as const;

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
    if (!e.key || e.key.startsWith('summa:')) cb();
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

// --- bookmarks ------------------------------------------------------------------
export interface Bookmark {
  citation: string;
  partId: string;
  qNum: number;
  aParam: string;
  title: string | null;
  added: number;
}

export function getBookmarks(): Bookmark[] {
  return readCached(KEYS.bookmarks, (raw) => {
    const list = parseJson<Bookmark[]>(raw, []);
    return Array.isArray(list)
      ? list.filter((b) => b && typeof b.citation === 'string')
      : [];
  });
}

export function isBookmarked(citation: string): boolean {
  return getBookmarks().some((b) => b.citation === citation);
}

export function toggleBookmark(bm: Omit<Bookmark, 'added'>): boolean {
  const list = getBookmarks();
  const i = list.findIndex((b) => b.citation === bm.citation);
  let nowOn: boolean;
  if (i >= 0) {
    list.splice(i, 1);
    nowOn = false;
  } else {
    list.push({ ...bm, added: Date.now() });
    nowOn = true;
  }
  write(KEYS.bookmarks, list);
  emit();
  return nowOn;
}

export function removeBookmark(citation: string): void {
  write(KEYS.bookmarks, getBookmarks().filter((b) => b.citation !== citation));
  emit();
}

export function useBookmarks(): Bookmark[] {
  return useSyncExternalStore(subscribe, getBookmarks, () => []);
}

export function useIsBookmarked(citation: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isBookmarked(citation),
    () => false,
  );
}

// --- last position -----------------------------------------------------------
export interface LastPosition {
  partId: string;
  qNum: number;
  aParam: string;
  scrollRatio: number;
  title?: string | null;
  citation?: string;
}

export function getLast(): LastPosition | null {
  return readCached(KEYS.last, (raw) => {
    const v = parseJson<LastPosition | null>(raw, null);
    if (
      !v ||
      typeof v.partId !== 'string' ||
      typeof v.qNum !== 'number' ||
      typeof v.aParam !== 'string'
    ) {
      return null;
    }
    return v;
  });
}

export function setLast(v: LastPosition): void {
  write(KEYS.last, v);
  emit();
}

export function useLast(): LastPosition | null {
  return useSyncExternalStore(subscribe, getLast, () => null);
}
