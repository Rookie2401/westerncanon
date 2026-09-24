/**
 * Language-help settings (docs/LEXIS-PLAN.md §1, §6), localStorage-backed
 * like src/state/storage.ts's `Prefs`: a small `useSyncExternalStore` hook
 * plus a plain getter/setter, degrading gracefully when storage throws.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_LEXIS_SETTINGS, type LexisSettings } from './types.ts';

const KEY = 'lexis:settings';

function rawItem(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(value: LexisSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / unavailable */
  }
}

// Stable-identity snapshot cache, same pattern as src/state/storage.ts:
// useSyncExternalStore compares with Object.is, so getSnapshot must return
// the same reference until the raw stored string actually changes.
let cache: { raw: string | null; value: LexisSettings } | null = null;

function parse(raw: string | null): LexisSettings {
  if (!raw) return DEFAULT_LEXIS_SETTINGS;
  try {
    const p = JSON.parse(raw) as Partial<LexisSettings>;
    const highlight = p.highlight === 'none' || p.highlight === 'new' || p.highlight === 'all'
      ? p.highlight
      : DEFAULT_LEXIS_SETTINGS.highlight;
    return {
      enabled: typeof p.enabled === 'boolean' ? p.enabled : DEFAULT_LEXIS_SETTINGS.enabled,
      highlight,
      autoKnownAfter:
        typeof p.autoKnownAfter === 'number' && Number.isFinite(p.autoKnownAfter) && p.autoKnownAfter >= 0
          ? p.autoKnownAfter
          : DEFAULT_LEXIS_SETTINGS.autoKnownAfter,
      morphOnFirstLevel:
        typeof p.morphOnFirstLevel === 'boolean' ? p.morphOnFirstLevel : DEFAULT_LEXIS_SETTINGS.morphOnFirstLevel,
    };
  } catch {
    return DEFAULT_LEXIS_SETTINGS;
  }
}

/** Plain getter (non-hook): used internally by vocab.ts's promotion rule. */
export function getLexisSettings(): LexisSettings {
  const raw = rawItem();
  if (cache && cache.raw === raw) return cache.value;
  const value = parse(raw);
  cache = { raw, value };
  return value;
}

export function setLexisSettings(patch: Partial<LexisSettings>): void {
  const next = { ...getLexisSettings(), ...patch };
  write(next);
  emit();
}

/** Test-only: drop the in-memory snapshot cache (mirrors storage.ts). */
export function __clearLexisSettingsCache(): void {
  cache = null;
}

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLexisSettings(): LexisSettings {
  return useSyncExternalStore(subscribe, getLexisSettings, () => DEFAULT_LEXIS_SETTINGS);
}
