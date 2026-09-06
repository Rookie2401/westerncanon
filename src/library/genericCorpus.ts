/**
 * Lazy, memoized access to generic-work content served from
 * `${BASE_URL}<workId>/work.json` and `${BASE_URL}<workId>/about.json`
 * (copied out of data/<workId>/ by scripts/copy-corpus.mjs).
 *
 * Mirrors the caching style of src/corpus/corpus.ts: each URL is fetched at
 * most once; the parsed result (and the in-flight promise) is cached for the
 * session, and a failed fetch drops its cache entry so a later call retries.
 */
import type { Division, GenericWork, WorkAbout } from './types.ts';

const base = import.meta.env.BASE_URL || '/';

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const p = fetch(`${base}${path}`).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json() as Promise<T>;
  });
  p.catch(() => cache.delete(path));
  cache.set(path, p);
  return p;
}

export function loadGenericWork(workId: string): Promise<GenericWork> {
  return loadJson<GenericWork>(`${workId}/work.json`);
}

export function loadWorkAbout(workId: string): Promise<WorkAbout> {
  return loadJson<WorkAbout>(`${workId}/about.json`);
}

/**
 * Resolve a `PassageFigure.image` path (relative to the work's own data
 * directory, e.g. "images/book-1-prop-1.jpg") to a fetchable URL, the same
 * way loadJson resolves work.json/about.json paths.
 */
export function genericAssetUrl(workId: string, path: string): string {
  return `${base}${workId}/${path}`;
}

/* --- Division[] tree traversal ------------------------------------------- */

/** Every division, parents before their children, in document order. */
export function flattenDivisions(work: GenericWork): Division[] {
  const out: Division[] = [];
  const walk = (ds: Division[]) => {
    for (const d of ds) {
      out.push(d);
      if (d.children.length) walk(d.children);
    }
  };
  walk(work.divisions);
  return out;
}

export function divisionById(
  work: GenericWork,
  id: string,
): Division | undefined {
  return flattenDivisions(work).find((d) => d.id === id);
}

/**
 * The ordered list used for prev/next: leaf divisions in document order, or —
 * when the tree is a flat list with no nesting — the top-level divisions.
 */
export function navigableDivisions(work: GenericWork): Division[] {
  const leaves = flattenDivisions(work).filter((d) => d.children.length === 0);
  return leaves.length ? leaves : work.divisions;
}

export function genericNeighbors(
  work: GenericWork,
  divId: string,
): { prev: Division | null; next: Division | null } {
  const list = navigableDivisions(work);
  const i = list.findIndex((d) => d.id === divId);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i < list.length - 1 ? list[i + 1] : null,
  };
}

/** Short division label, e.g. "§ I" or "Praefatio". */
export function divisionShortLabel(d: Division): string {
  return d.number === null ? d.sourceHeading ?? 'Praefatio' : `§ ${d.number}`;
}

/** Division label with its editorial title, e.g. "§ I · On Genus". */
export function divisionFullLabel(d: Division): string {
  const short = divisionShortLabel(d);
  return d.editorialTitle ? `${short} · ${d.editorialTitle}` : short;
}
