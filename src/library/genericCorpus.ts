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

/**
 * The ordered list used for prev/next: leaf divisions in document order,
 * except a consolidatable group (see above) is one stop in its own right —
 * so Definitions, Postulates and Common Notions are each their own Prev/Next
 * stop (matching their own separate row in the Work tree — see Work.tsx),
 * and paging past any of them still doesn't walk all of its individual
 * entries one at a time. Falls back to the top-level divisions when the tree
 * is a flat list with no nesting.
 */
export function navigableDivisions(work: GenericWork): Division[] {
  const out: Division[] = [];
  const walk = (list: Division[]) => {
    for (const d of list) {
      if (isConsolidatableGroup(d)) {
        out.push(d);
      } else if (d.children.length === 0) {
        out.push(d);
      } else {
        walk(d.children);
      }
    }
  };
  walk(work.divisions);
  return out.length ? out : work.divisions;
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

/**
 * "Book" for a book division — top-level `book-N` (e.g. De Officiis), or
 * nested under an Actio as `actio-N-book-M` (In Verrem, the one 3-level
 * generic work) — "Proposition" for a Euclid proposition leaf (including
 * Book X's split Propositions I/II/III), "Chapter" for an Augustine chapter
 * leaf, "Speech" for a Cicero oration division (`speech-N`, e.g. each of the
 * four In Catilinam orations or the fourteen Philippics), and "Actio" for
 * the two actiones of In Verrem (`actio-N`) — derived from the id shapes
 * each importer produces — so these read as what they are rather than as an
 * anonymous numbered "§". A Cicero section leaf (`book-N-sec-M`,
 * `speech-N-sec-M`, `actio-N-book-M-sec-K`, or a flat `sec-N` for a
 * single-speech/undivided work) matches none of these shapes and falls
 * through to the plain "§ N" label, same as every other generic-profile
 * work's non-matching divisions — this notably includes Archimedes'
 * `<workId>-book-N[-ch-M]` division ids (e.g.
 * `archimedes-sphere-cylinder-book-1`, `...-book-1-ch-1`), which predate
 * both the Cicero `book-N` and the Augustine/Aristotle `book-N-ch-M`
 * conventions and are NOT meant to render as "Book"/"Chapter" — a leaf
 * there is a numbered proposition, not a chapter, and the app's own
 * citation scheme for these works is section-number based. BOOK_ID and
 * CHAPTER_ID are both anchored to the UNPREFIXED `book-N`/`book-N-ch-M`
 * shape specifically (not a bare `-book-`/`-ch-` suffix anywhere in the
 * id) so a work-id-prefixed id like Archimedes' never matches either.
 */
const BOOK_ID = /^(book-\d+|actio-\d+-book-\d+)$/;
const PROPOSITION_ID = /-prop[123]?-\d+$/;
// A single trailing letter admits the lettered chapter numbers some editions
// print (Herodotus 6.121A, Polybius 12.4a) so they label as "Chapter 121A".
const CHAPTER_ID = /^book-\d+-ch-\d+[A-Za-z]?$/;
const SPEECH_ID = /^speech-\d+$/;
const ACTIO_ID = /^actio-\d+$/;
// Phase 2 shapes: Shakespeare acts/scenes, Dante cantos, the Sonnets, and
// Newton's lemmas (Principia) alongside its propositions.
const ACT_ID = /^act-\d+$/;
const SCENE_ID = /^act-\d+-scene-\d+$/;
const CANTO_ID = /^(?:inferno|purgatorio|paradiso)-canto-\d+$/;
const SONNET_ID = /^sonnet-\d+$/;
const LEMMA_ID = /^book-\d+-lemma-\d+$/;
// pseudo-Aristotle's Mechanica: the 35 numbered problems (`problem-N`); their
// `problem-N-ch-M` / `preface-ch-M` sections fall through to "§ M".
const PROBLEM_ID = /^problem-\d+$/;

function kindLabel(d: Division): string | null {
  if (BOOK_ID.test(d.id)) return 'Book';
  if (PROPOSITION_ID.test(d.id)) return 'Proposition';
  if (CHAPTER_ID.test(d.id)) return 'Chapter';
  if (SCENE_ID.test(d.id)) return 'Scene';
  if (ACT_ID.test(d.id)) return 'Act';
  if (CANTO_ID.test(d.id)) return 'Canto';
  if (SONNET_ID.test(d.id)) return 'Sonnet';
  if (LEMMA_ID.test(d.id)) return 'Lemma';
  if (PROBLEM_ID.test(d.id)) return 'Problem';
  if (SPEECH_ID.test(d.id)) return 'Speech';
  if (ACTIO_ID.test(d.id)) return 'Actio';
  return null;
}

/** Short division label, e.g. "Book I", "Proposition 1", "§ 5", "Praefatio",
 *  or a group's own editorial title ("Definitions") when it has no number of
 *  its own. */
export function divisionShortLabel(d: Division): string {
  // Boethius' Consolatio alternates prose and verse sections, numbered P1,
  // M1, P2, ... (`book-N-sec-P1` / `book-N-sec-M1`); label them as such
  // rather than "§ P1".
  const pm = d.id.match(/^book-\d+-sec-([PM])(\d+)$/);
  if (pm) return `${pm[1] === 'P' ? 'Prose' : 'Metre'} ${pm[2]}`;
  if (d.number !== null) {
    const kind = kindLabel(d);
    return kind ? `${kind} ${d.number}` : `§ ${d.number}`;
  }
  if (d.children.length > 0) return d.editorialTitle ?? d.sourceHeading ?? 'Praefatio';
  return d.sourceHeading ?? 'Praefatio';
}

/** Division label with its editorial title, e.g. "§ I · On Genus". */
export function divisionFullLabel(d: Division): string {
  const short = divisionShortLabel(d);
  return d.editorialTitle ? `${short} · ${d.editorialTitle}` : short;
}
