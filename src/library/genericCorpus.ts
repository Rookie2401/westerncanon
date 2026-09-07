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
 * A "section-type" group (Division with children) whose children are all
 * bare leaves (no further nesting) and whose editorial title is one of
 * Euclid's non-Proposition preliminary categories — "Definitions",
 * "Postulates", "Common Notions", or a Book X repeat like "Definitions II".
 * Such a group is read as ONE consolidated page (see GenericReader) rather
 * than expanded into N individually-clickable leaves in the Work tree — the
 * whole reason a reader wants Book I's 23 short definitions on one page
 * instead of 23 separate taps, while Propositions (long proofs, often with
 * a diagram) keep today's one-page-per-item treatment. Purely
 * structural/label-driven, so it only ever matches this shape — every other
 * generic-profile work's groups (e.g. Archimedes' per-book Propositions)
 * have editorialTitle === null or a "Propositions..." title and never match.
 */
const CONSOLIDATABLE_TITLE = /^(?:Definitions|Postulates|Common Notions)(?: [IVXLCDM]+)?$/;

export function isConsolidatableGroup(d: Division): boolean {
  return (
    d.children.length > 0 &&
    d.children.every((c) => c.children.length === 0) &&
    d.editorialTitle !== null &&
    CONSOLIDATABLE_TITLE.test(d.editorialTitle)
  );
}

function siblingsContaining(list: Division[], id: string): Division[] | undefined {
  if (list.some((d) => d.id === id)) return list;
  for (const d of list) {
    const found = siblingsContaining(d.children, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * The maximal run of consecutive sibling groups (same parent, adjacent in
 * document order) that are all consolidatable and include `groupId` — e.g.
 * Book I's Definitions/Postulates/Common Notions are three-in-a-row and are
 * read and tabbed together as one "Preliminaries" page; Book X's three
 * separate Definitions groups are each isolated by an intervening
 * Propositions group in between, so each gets its own single-group (no-tab)
 * run. Returns [] if `groupId` doesn't name a consolidatable group at all.
 */
export function consolidatedRun(work: GenericWork, groupId: string): Division[] {
  const siblings = siblingsContaining(work.divisions, groupId);
  if (!siblings) return [];
  const idx = siblings.findIndex((d) => d.id === groupId);
  if (idx < 0 || !isConsolidatableGroup(siblings[idx])) return [];
  let lo = idx;
  let hi = idx;
  while (lo > 0 && isConsolidatableGroup(siblings[lo - 1])) lo--;
  while (hi < siblings.length - 1 && isConsolidatableGroup(siblings[hi + 1])) hi++;
  return siblings.slice(lo, hi + 1);
}

/**
 * The ordered list used for prev/next: leaf divisions in document order,
 * except a consolidatable run (see above) collapses to ONE stop — its first
 * group — so paging past Book I's Preliminaries goes straight from nothing
 * to Proposition 1, not through all 23+5+9 individual entries. Falls back to
 * the top-level divisions when the tree is a flat list with no nesting.
 */
export function navigableDivisions(work: GenericWork): Division[] {
  const out: Division[] = [];
  const walk = (list: Division[]) => {
    let i = 0;
    while (i < list.length) {
      const d = list[i];
      if (isConsolidatableGroup(d)) {
        out.push(d);
        while (i < list.length && isConsolidatableGroup(list[i])) i++;
        continue;
      }
      if (d.children.length === 0) {
        out.push(d);
      } else {
        walk(d.children);
      }
      i++;
    }
  };
  walk(work.divisions);
  return out.length ? out : work.divisions;
}

export function genericNeighbors(
  work: GenericWork,
  divId: string,
): { prev: Division | null; next: Division | null } {
  // A group mid-way through a consolidated run (e.g. viewing the Postulates
  // tab) has no entry of its own in navigableDivisions — the whole run is
  // one stop, keyed by its first group — so resolve to that canonical id
  // first; Prev/Next always step past the run as a whole, leaving in-run
  // movement to the tab bar.
  const run = consolidatedRun(work, divId);
  const canonicalId = run.length > 0 ? run[0].id : divId;
  const list = navigableDivisions(work);
  const i = list.findIndex((d) => d.id === canonicalId);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i < list.length - 1 ? list[i + 1] : null,
  };
}

/** Short division label, e.g. "§ I", "Praefatio", or a group's own editorial
 *  title ("Definitions") when it has none of its own §-number. */
export function divisionShortLabel(d: Division): string {
  if (d.number !== null) return `§ ${d.number}`;
  if (d.children.length > 0) return d.editorialTitle ?? d.sourceHeading ?? 'Praefatio';
  return d.sourceHeading ?? 'Praefatio';
}

/** Division label with its editorial title, e.g. "§ I · On Genus". */
export function divisionFullLabel(d: Division): string {
  const short = divisionShortLabel(d);
  return d.editorialTitle ? `${short} · ${d.editorialTitle}` : short;
}
