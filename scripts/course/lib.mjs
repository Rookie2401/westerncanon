// Shared helpers for the course build (docs/COURSE-PLAN.md §2). Plain JS, like
// scripts/lexis/lib.mjs, which it reuses for the tokenizer and bundle reader.
//
// A "stop" mirrors the reader's Prev/Next list (src/library/genericCorpus.ts
// navigableDivisions): a leaf division, or a consolidated group (Euclid's
// Definitions / Postulates / Common Notions) read as one page. Units group
// consecutive stops of one work (docs §2.1); sections are the candidates the
// ladder places (a Book's run of units, or one grouped unit of tiny tops).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { foldKey, looseKey, readWorkLexis, wordTokens } from '../lexis/lib.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = join(ROOT, 'data');
export const COURSE_DIR = join(DATA, 'course');

export const UNIT_WORDS = { min: 800, max: 2500, tail: 300 };
export const MIN_ENCOUNTERS = 3;
/**
 * Variety (docs §2.2): a candidate by the same author as the sections just
 * placed loses `perSection` of coverage for every consecutive section of that
 * author beyond the first, up to `max`, so an author's whole corpus does not
 * monopolise a stage when another author's text reads nearly as easily.
 */
export const SAME_AUTHOR_PENALTY = { perSection: 0.03, max: 0.12 };
/** Stage 0 teaches the commonest lemmas of the language; the ladder counts them as met (docs §2.2). */
export const CORE_WORDS = 300;
/** Stage bands by the pool of lemmas met >= MIN_ENCOUNTERS times after the unit (docs §2.3). */
export const STAGES = [
  { id: 'I', poolMax: 1000 },
  { id: 'II', poolMax: 2500 },
  { id: 'III', poolMax: 5000 },
  { id: 'IV', poolMax: 10000 },
  { id: 'V', poolMax: Infinity },
];

export function stageForPool(pool) {
  for (const s of STAGES) if (pool < s.poolMax) return s.id;
  return STAGES[STAGES.length - 1].id;
}

export function readManifest() {
  return JSON.parse(readFileSync(join(DATA, 'lexis', 'manifest.json'), 'utf8'));
}

export function readWork(workId) {
  return JSON.parse(readFileSync(join(DATA, workId, 'work.json'), 'utf8'));
}

export function readAbout(workId) {
  const p = join(DATA, workId, 'about.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

export function readBundle(manifest, workId) {
  const entry = manifest.works[workId];
  if (!entry) return null;
  return readWorkLexis(join(DATA, 'lexis', 'works', entry.file));
}

/* --- division labels (mirror of src/library/genericCorpus.ts) ------------- */

const CONSOLIDATABLE_TITLE = /^(?:Definitions|Postulates|Common Notions)(?: [IVXLCDM]+)?$/;
const BOOK_ID = /^(book-\d+|actio-\d+-book-\d+)$/;
const PROPOSITION_ID = /-prop[123]?-\d+$/;
const CHAPTER_ID = /^book-\d+-ch-\d+[A-Za-z]?$/;
const SPEECH_ID = /^speech-\d+$/;
const ACTIO_ID = /^actio-\d+$/;
const ACT_ID = /^act-\d+$/;
const SCENE_ID = /^act-\d+-scene-\d+$/;
const CANTO_ID = /^(?:inferno|purgatorio|paradiso)-canto-\d+$/;
const SONNET_ID = /^sonnet-\d+$/;
const LEMMA_ID = /^book-\d+-lemma-\d+$/;
const PROBLEM_ID = /^problem-\d+$/;

function kindLabel(d) {
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

export function isConsolidatableGroup(d) {
  return (
    d.children.length > 0 &&
    d.children.every((c) => c.children.length === 0) &&
    d.editorialTitle !== null &&
    CONSOLIDATABLE_TITLE.test(d.editorialTitle)
  );
}

export function divisionShortLabel(d) {
  const pm = d.id.match(/^book-\d+-sec-([PM])(\d+)$/);
  if (pm) return `${pm[1] === 'P' ? 'Prose' : 'Metre'} ${pm[2]}`;
  if (d.number !== null && d.number !== undefined) {
    const kind = kindLabel(d);
    return kind ? `${kind} ${d.number}` : `§ ${d.number}`;
  }
  if (d.children.length > 0) return d.editorialTitle ?? d.sourceHeading ?? 'Praefatio';
  return d.sourceHeading ?? 'Praefatio';
}

/* --- stops ----------------------------------------------------------------- */

/**
 * The reader's stops of a work in order: { id, top, topLabel, label, number,
 * text }. `top` is the id of the top-level division the stop belongs to.
 */
export function workStops(work) {
  const out = [];
  const walk = (list, top) => {
    for (const d of list) {
      const t = top ?? d;
      if (isConsolidatableGroup(d)) {
        out.push(stop(d, t, d.children.flatMap((c) => c.passages)));
      } else if (d.children.length === 0) {
        out.push(stop(d, t, d.passages));
      } else {
        walk(d.children, t);
      }
    }
  };
  walk(work.divisions, null);
  if (!out.length) for (const d of work.divisions) out.push(stop(d, d, d.passages));
  return out;
}

function stop(d, top, passages) {
  return {
    id: d.id,
    top: top.id,
    topLabel: divisionShortLabel(top),
    label: divisionShortLabel(d),
    number: d.number,
    text: passages.map((p) => p.text).join('\n'),
  };
}

/* --- lexeme per token --------------------------------------------------- */

const foldMaps = new WeakMap();
function foldMapFor(bundle, lang) {
  let m = foldMaps.get(bundle);
  if (m) return m;
  m = new Map();
  for (const key of Object.keys(bundle.forms)) {
    const fk = foldKey(key, lang);
    if (!m.has(fk)) m.set(fk, bundle.forms[key]);
  }
  foldMaps.set(bundle, m);
  return m;
}

/** Mirror of src/lexis/index.ts readingsFor: loose key first, fold key second. */
export function readingsFor(bundle, key, lang) {
  const loose = looseKey(key, lang);
  const direct = bundle.forms[loose] ?? bundle.forms[key];
  if (direct) return direct;
  return foldMapFor(bundle, lang).get(foldKey(key, lang)) ?? [];
}

/**
 * Lemma statistics of a text against its work's bundle: running words, the
 * count per best-reading lexeme id, and the unrecognised token count.
 */
export function lemmaCounts(bundle, text, lang) {
  const counts = new Map();
  let words = 0;
  let unrec = 0;
  for (const t of wordTokens(text, lang)) {
    words++;
    const top = readingsFor(bundle, t.key, lang)[0];
    if (!top) {
      unrec++;
      continue;
    }
    counts.set(top[0], (counts.get(top[0]) ?? 0) + 1);
  }
  return { words, unrec, counts };
}

export function isName(lexemeId, bundle) {
  const lx = bundle.lexemes[lexemeId];
  return lx ? lx.pos === 'name' : lexemeId.split(':')[1] === 'name';
}

/* --- units and sections --------------------------------------------------- */

function rangeLabel(first, last) {
  if (first.id === last.id) return first.label;
  const stripNumber = (label, number) =>
    number !== null && number !== undefined && label.endsWith(String(number))
      ? label.slice(0, -String(number).length).trim()
      : null;
  const k1 = stripNumber(first.label, first.number);
  const k2 = stripNumber(last.label, last.number);
  if (k1 !== null && k1 === k2) return `${first.label}–${last.number}`;
  return `${first.label} – ${last.label}`;
}

export function unitLabel(unit) {
  const first = unit.stops[0];
  const last = unit.stops[unit.stops.length - 1];
  if (unit.mixed) {
    const side = (s) => (s.top === s.id ? s.label : `${s.topLabel} ${s.label}`);
    return `${side(first)} – ${side(last)}`;
  }
  if (first.top === first.id && unit.stops.length === 1) return first.label;
  if (first.top === first.id) return rangeLabel(first, last);
  return `${first.topLabel} · ${rangeLabel(first, last)}`;
}

/**
 * Group a work's stops into units (docs §2.1). Each unit: { stops, top,
 * mixed, words, unrec, counts (lemma -> n) }. `stops` carry their stats.
 */
export function makeUnits(stops, bounds = UNIT_WORDS) {
  const units = [];
  let cur = null;
  const close = () => {
    if (cur) units.push(cur);
    cur = null;
  };
  const start = (s) => {
    cur = { stops: [s], top: s.top, mixed: false, words: s.words, unrec: s.unrec, counts: new Map(s.counts) };
  };
  const add = (s) => {
    cur.stops.push(s);
    cur.words += s.words;
    cur.unrec += s.unrec;
    for (const [k, n] of s.counts) cur.counts.set(k, (cur.counts.get(k) ?? 0) + n);
    if (s.top !== cur.top) cur.mixed = true;
  };
  for (const s of stops) {
    if (!cur) {
      start(s);
      continue;
    }
    const sameTop = s.top === cur.top;
    if (!sameTop && cur.words >= bounds.min) {
      close();
      start(s);
    } else if (cur.words + s.words > bounds.max && cur.words >= bounds.min) {
      close();
      start(s);
    } else {
      add(s);
    }
  }
  close();
  // A tiny tail left over when a top was split at `max` (a 129-word last
  // section) is folded back into the unit before it rather than standing alone.
  const merged = [];
  for (const u of units) {
    const prev = merged[merged.length - 1];
    if (prev && u.words < bounds.tail && prev.words + u.words <= bounds.max * 1.25) {
      for (const s of u.stops) prev.stops.push(s);
      prev.words += u.words;
      prev.unrec += u.unrec;
      for (const [k, n] of u.counts) prev.counts.set(k, (prev.counts.get(k) ?? 0) + n);
      if (u.top !== prev.top || u.mixed) prev.mixed = true;
    } else {
      merged.push(u);
    }
  }
  return merged;
}

/** Sections: consecutive units of one top (a mixed unit is its own section). */
export function makeSections(units) {
  const sections = [];
  let cur = null;
  units.forEach((u, i) => {
    const key = u.mixed ? `unit:${i}` : `top:${u.top}`;
    if (cur && cur.key === key) {
      cur.units.push(u);
    } else {
      cur = { key, units: [u] };
      sections.push(cur);
    }
  });
  return sections;
}

/** Everything the ladder needs for one work: stops with stats, units, sections. */
export function analyseWork(manifest, workId, lang) {
  const work = readWork(workId);
  const bundle = readBundle(manifest, workId);
  if (!bundle) return null;
  const stops = workStops(work).map((s) => {
    const { words, unrec, counts } = lemmaCounts(bundle, s.text, lang);
    return { id: s.id, top: s.top, topLabel: s.topLabel, label: s.label, number: s.number, words, unrec, counts };
  });
  const units = makeUnits(stops).map((u) => ({ ...u, label: unitLabel(u) }));
  return { workId, bundle, units, sections: makeSections(units) };
}

/**
 * The language's commonest non-name lemmas by running-token frequency over
 * every analysed work: Stage 0's "first words", and the ladder's seed.
 */
export function coreLemmas(works, n = CORE_WORDS) {
  const totals = new Map();
  let tokens = 0;
  for (const w of works) {
    for (const u of w.units) {
      tokens += u.words;
      for (const [id, c] of u.counts) {
        if (isName(id, w.bundle)) continue;
        totals.set(id, (totals.get(id) ?? 0) + c);
      }
    }
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const core = sorted.slice(0, n).map(([id, count]) => ({ id, count }));
  const covered = core.reduce((a, c) => a + c.count, 0);
  return { core, tokens, share: tokens ? covered / tokens : 0 };
}

/** `<id>-en` sibling of an original-language work id, if its data exists. */
export function englishSibling(workId) {
  const base = workId.replace(/-(grc|la|it)$/, '');
  const en = `${base}-en`;
  if (en === workId) return null;
  return existsSync(join(DATA, en, 'work.json')) ? en : null;
}

export function alignedWithSibling(stops, enWorkId) {
  const enStops = new Set(workStops(readWork(enWorkId)).map((s) => s.id));
  const shared = stops.filter((s) => enStops.has(s.id)).length;
  return stops.length > 0 && shared / stops.length >= 0.95;
}
