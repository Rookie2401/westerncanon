/**
 * Lexis loader — language help data for the original-language edition
 * (docs/LEXIS-PLAN.md §6). Mirrors the caching style of
 * src/library/genericCorpus.ts: each URL is fetched at most once, the parsed
 * result (and in-flight promise) is cached for the session, and a failed
 * fetch drops its cache entry so a later call retries.
 *
 * Nothing here is reachable from the English edition: `lexisAvailable`
 * gates on `EDITION !== 'en'`, and every exported loader is a no-op/`null`
 * for a language it returns false for.
 */
import { EDITION } from '../library/edition.ts';
import type { Lang } from '../library/types.ts';
import { foldKey, looseKey, shardCandidates } from './tokenize.ts';
import type { LexEntry, LexisManifest, LexLang, Reading, WorkLexis } from './types.ts';
import { decodeWorkLexis, isCompact } from './compact.ts';
import type { WorkLexisCompact } from './compact.ts';

const LEX_LANGS: readonly LexLang[] = ['grc', 'la', 'it'];

/** EDITION==='original' (or 'all', for dev/tests) and the language ships help. */
export function lexisAvailable(lang: Lang): lang is LexLang {
  if (EDITION === 'en') return false;
  return (LEX_LANGS as readonly string[]).includes(lang);
}

let base = import.meta.env.BASE_URL || '/';
let fetchImpl: typeof fetch = (...args) => fetch(...args);

/** Test-only: point the loader at a fake fetch/base. */
export function __configureLexis(opts: { baseUrl?: string; fetchImpl?: typeof fetch }): void {
  if (opts.baseUrl !== undefined) base = opts.baseUrl;
  if (opts.fetchImpl !== undefined) fetchImpl = opts.fetchImpl;
  manifestCache = null;
  workCache.clear();
  shardCache.clear();
  foldMapCache = new WeakMap();
}

function loadJson<T>(path: string): Promise<T> {
  const p = fetchImpl(`${base}${path}`).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json() as Promise<T>;
  });
  return p;
}

/* --- manifest --------------------------------------------------------- */

let manifestCache: Promise<LexisManifest> | null = null;

export function loadManifest(): Promise<LexisManifest> {
  if (manifestCache) return manifestCache;
  const p = loadJson<LexisManifest>('lexis/manifest.json');
  p.catch(() => {
    if (manifestCache === p) manifestCache = null;
  });
  manifestCache = p;
  return p;
}

/* --- work bundles ------------------------------------------------------- */

const workCache = new Map<string, Promise<WorkLexis | null>>();

/**
 * Load the language-help bundle for a work, per the manifest's `works` entry.
 * Fetched relative to BASE_URL (`lexis/works/<file>`), matching how
 * src/library/genericCorpus.ts resolves `work.json`. Returns null (never
 * throws) when the manifest lists no bundle for this work; a failed fetch
 * clears the memo so a retry can succeed later.
 */
export function loadWorkLexis(workId: string): Promise<WorkLexis | null> {
  const hit = workCache.get(workId);
  if (hit) return hit;
  const p = (async () => {
    const manifest = await loadManifest();
    const entry = manifest.works[workId];
    if (!entry) return null;
    const raw = await loadJson<WorkLexis | WorkLexisCompact>(`lexis/works/${entry.file}`);
    return isCompact(raw) ? decodeWorkLexis(raw) : raw;
  })();
  p.catch(() => {
    if (workCache.get(workId) === p) workCache.delete(workId);
  });
  workCache.set(workId, p);
  return p;
}

/* --- readings ------------------------------------------------------------ */

/** Fold map built lazily once per bundle, from its own form keys. */
let foldMapCache: WeakMap<WorkLexis, Map<string, Reading[]>> = new WeakMap();

function foldMapFor(bundle: WorkLexis, lang: LexLang): Map<string, Reading[]> {
  const hit = foldMapCache.get(bundle);
  if (hit) return hit;
  const map = new Map<string, Reading[]>();
  for (const key of Object.keys(bundle.forms)) {
    const fk = foldKey(key, lang);
    if (!map.has(fk)) map.set(fk, bundle.forms[key]!);
  }
  foldMapCache.set(bundle, map);
  return map;
}

/**
 * Readings for a surface form: the loose key first (bundle's own keys, as
 * stored), then a fold-key fallback built lazily from the bundle's keys.
 * `key` may be a raw surface or an already-computed loose key; both are
 * tried loosely via looseKey() so callers can pass either.
 */
export function readingsFor(bundle: WorkLexis, key: string, lang: LexLang): Reading[] {
  const loose = looseKey(key, lang);
  const direct = bundle.forms[loose] ?? bundle.forms[key];
  if (direct) return direct;
  const fold = foldMapFor(bundle, lang);
  return fold.get(foldKey(key, lang)) ?? [];
}

/* --- dictionary entries (shards) ----------------------------------------- */

const shardCache = new Map<string, Promise<Record<string, LexEntry>>>();

function loadShard(lang: LexLang, file: string): Promise<Record<string, LexEntry>> {
  const cacheKey = `${lang}/${file}`;
  const hit = shardCache.get(cacheKey);
  if (hit) return hit;
  const p = loadJson<Record<string, LexEntry>>(`lexis/lex/${lang}/${file}`);
  p.catch(() => {
    if (shardCache.get(cacheKey) === p) shardCache.delete(cacheKey);
  });
  shardCache.set(cacheKey, p);
  return p;
}

/**
 * Resolve a lexeme id's shard via the manifest (longest prefix of its
 * shardPrefix() first, then the prefix's first letter, then '_'). The
 * client never guesses a shard file name.
 */
function resolveShardFile(shards: Record<string, string>, lexemeId: string): string | null {
  // Longest lemma prefix listed in the manifest wins (4 letters, then 3, 2, 1, then '_').
  for (const prefix of shardCandidates(lexemeId)) {
    const file = shards[prefix];
    if (file) return file;
  }
  return null;
}

export async function loadEntry(lang: LexLang, lexemeId: string): Promise<LexEntry | null> {
  const manifest = await loadManifest();
  const langInfo = manifest.languages[lang];
  if (!langInfo) return null;
  const file = resolveShardFile(langInfo.lex_shards, lexemeId);
  if (!file) return null;
  const shard = await loadShard(lang, file);
  return shard[lexemeId] ?? null;
}
