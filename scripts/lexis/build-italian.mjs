#!/usr/bin/env node
// Lexis D-LA/IT package — Italian (1 work: data/dante-vita-nuova-it). Builds
// data/lexis/works/dante-vita-nuova-it.json and data/lexis/lex/it/*.json from the kaikki.org
// Italian Wiktionary extract already filtered by scripts/lexis/fetch-italian.mjs into
// scripts/lexis/raw/kaikki-it-filtered.json. docs/LEXIS-PLAN.md §"ITALIAN".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, workPassages } from './lib.mjs';
import { ELISION_MAP } from './shared/italian-elision.mjs';
import { writeLexShards } from './shared/shard-writer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = path.join(root, 'data');
const lexisDir = path.join(root, 'data', 'lexis');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
fs.mkdirSync(path.join(lexisDir, 'works'), { recursive: true });

const filteredPath = path.join(rawDir, 'kaikki-it-filtered.json');
if (!fs.existsSync(filteredPath)) {
  console.error(`Missing ${path.relative(root, filteredPath)} — run: node scripts/lexis/fetch-italian.mjs`);
  process.exit(1);
}
const kaikki = JSON.parse(fs.readFileSync(filteredPath, 'utf8'));
console.log(`loaded ${kaikki.length} filtered kaikki entries.`);

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');

const POS_MAP = { noun: 'noun', verb: 'verb', adj: 'adj', adv: 'adv', prep: 'prep', pron: 'pron', conj: 'conj', name: 'name', intj: 'interj', article: 'art', num: 'num', det: 'adj', contraction: 'prep', particle: 'part' };
const posOf = (p) => POS_MAP[p] ?? 'other';

// Bookkeeping/usage-register tags kaikki attaches that are NOT part of docs/LEXIS-PLAN.md §3's
// morph vocabulary: dropped rather than passed through, since scripts/lexis/shared/check-bundles.mjs
// enforces "morph tags only from the plan's vocabulary" as a hard build invariant (the runtime's
// tolerance for unknown tags is a display fallback, not licence to ship non-vocabulary tags).
const SKIP_TAGS = new Set([
  'form-of', 'canonical', 'alternative', 'apocopic', 'traditional', 'auxiliary', 'table-tags',
  'past', 'rare', 'poetic', 'archaic', 'obsolete', 'informal', 'literary', 'possessive', 'conditional',
  'regional', 'dialectal', 'uncommon', 'vulgar', 'colloquial', 'dated', 'euphemistic', 'honorific', 'misspelling',
]);
// a form whose tags include one of these means kaikki's own template failed to render for that
// row (a real, if rare, data defect) — the whole candidate is dropped rather than kept with junk
// tags or a broken gloss.
const BAD_TEMPLATE_TAGS = new Set(['inflectiontemplate', 'errorunrecognizedform', 'error', 'abbreviation']);
const TAG_MAP = {
  feminine: 'f', masculine: 'm', singular: 'sg', plural: 'pl',
  'first-person': '1', 'second-person': '2', 'third-person': '3',
  present: 'pres', imperfect: 'impf', future: 'fut', historic: 'perf', // passato remoto ~ plan's "perf"
  subjunctive: 'subj', indicative: 'ind', imperative: 'imp', infinitive: 'inf', participle: 'ptcp', gerund: 'ger',
  comparative: 'comp', superlative: 'sup', invariable: 'indecl',
};
function hasBadTemplateTag(tags) {
  return Array.isArray(tags) && tags.some((t) => BAD_TEMPLATE_TAGS.has(t));
}

// coordinator addendum: emit morph tags in the plan's canonical order — pos is separate; a finite
// verb cell is tense, mood, voice, person, number ("perf ind act 1 sg", not "1 perf sg"); a
// participle/gerundive cell is mood, tense, voice, number, gender (case doesn't exist in Italian).
// Same order Latin already uses (docs/LEXIS-PLAN.md §3's own examples).
const FINITE_ORDER = { pres: 0, impf: 0, fut: 0, perf: 0, plup: 0, futperf: 0, ind: 1, subj: 1, imp: 1, inf: 1, ger: 1, gdv: 1, act: 2, pass: 2, mid: 2, mp: 2, 1: 3, 2: 3, 3: 3, sg: 4, pl: 4, du: 4, m: 5, f: 5, n: 5, comp: 6, sup: 6, indecl: 7, encl: 7 };
const PARTICIPLE_ORDER = { ptcp: 0, gdv: 0, pres: 1, impf: 1, fut: 1, perf: 1, plup: 1, futperf: 1, act: 2, pass: 2, mid: 2, mp: 2, sg: 3, pl: 3, du: 3, m: 4, f: 4, n: 4, comp: 6, sup: 6, indecl: 7, encl: 7 };
function canonicalOrder(tags) {
  const order = tags.includes('ptcp') ? PARTICIPLE_ORDER : FINITE_ORDER;
  return [...tags].sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
}

/** Returns null (candidate should be dropped) if the tag set signals a broken kaikki template. */
function mapTags(tags) {
  if (!tags) return '';
  if (hasBadTemplateTag(tags)) return null;
  const out = [];
  for (const t of tags) {
    if (SKIP_TAGS.has(t)) continue;
    const mapped = TAG_MAP[t];
    if (mapped) out.push(mapped); // an unmapped, non-skipped tag is dropped (not invented as a new vocabulary word)
  }
  return canonicalOrder(out).filter(Boolean).join(' ');
}

function genderOf(entry) {
  const g = entry.head_templates?.[0]?.args?.['1'];
  return g === 'm' ? 'm' : g === 'f' ? 'f' : g === 'mf' || g === 'm-f' ? '' : '';
}

// ---- index the filtered kaikki entries: by own headword, and by every form inside forms[] -------
const byWord = new Map(); // lowercase word -> entry[]
const byForm = new Map(); // lowercase form -> [{ owner: entry, tags }]
for (const entry of kaikki) {
  if (!entry.word) continue;
  const w = entry.word.toLowerCase();
  (byWord.get(w) ?? byWord.set(w, []).get(w)).push(entry);
  if (Array.isArray(entry.forms)) {
    for (const f of entry.forms) {
      if (!f?.form || f.tags?.includes('auxiliary')) continue;
      const fl = f.form.toLowerCase();
      (byForm.get(fl) ?? byForm.set(fl, []).get(fl)).push({ owner: entry, tags: f.tags });
    }
  }
}
// stripped-accent indexes, for the same accent-blind fallback fetch-italian.mjs used
const byWordStripped = new Map();
for (const [w, list] of byWord) {
  const s = stripAccents(w);
  (byWordStripped.get(s) ?? byWordStripped.set(s, []).get(s)).push(...list);
}
const byFormStripped = new Map();
for (const [f, list] of byForm) {
  const s = stripAccents(f);
  (byFormStripped.get(s) ?? byFormStripped.set(s, []).get(s)).push(...list);
}

// kaikki's own form_of[].word is occasionally not a clean single lemma — a handful of irregular
// or link/disambiguation-page entries carry malformed values like "i/languages A to L", "the
// article i", "avere and (obsolete) havere" split oddly, "(archaic) redurre". A candidate whose
// lemma doesn't look like a real Italian word/phrase is dropped rather than turned into a lexeme
// (confirmed by inspection of the actual data, not a hypothetical) — the key just falls back to
// its other candidates, or stays unrecognised if that was the only one.
const VALID_LEMMA = /^[\p{L}'-]+$/u;
const validLemma = (s) => typeof s === 'string' && s.length <= 30 && VALID_LEMMA.test(s);

/** Every {lemma, pos, morph, gloss, exact} candidate for a single un-elided search word. */
function candidatesFor(searchWord) {
  const out = [];
  const exactWord = byWord.get(searchWord) ?? [];
  const exactForm = byForm.get(searchWord) ?? [];
  let pool = [...exactWord.map((e) => ({ entry: e, form: null })), ...exactForm.map((x) => ({ entry: x.owner, form: x }))];
  let exact = true;
  if (!pool.length && searchWord.length >= 4) {
    const sw = stripAccents(searchWord);
    const stWord = byWordStripped.get(sw) ?? [];
    const stForm = byFormStripped.get(sw) ?? [];
    pool = [...stWord.map((e) => ({ entry: e, form: null })), ...stForm.map((x) => ({ entry: x.owner, form: x }))];
    exact = false;
  }
  for (const { entry, form } of pool) {
    if (entry.pos === 'character') continue; // alphabet-letter entries ("i" = "the ninth letter…") are never a useful reading for running text
    const pos = posOf(entry.pos);
    if (form) {
      // a hit inside the owning entry's own form table: the owner IS the lemma
      const morph = mapTags(form.tags);
      if (morph !== null && validLemma(entry.word)) out.push({ lemma: entry.word, pos, morph, gloss: entry.senses?.[0]?.glosses?.[0], exact, direct: false });
      continue;
    }
    // a hit on an entry's own headword: either the lemma itself, or a "form-of" stub entry
    const sense0 = entry.senses?.[0];
    if (sense0?.form_of?.length) {
      const morph = mapTags(sense0.tags);
      if (morph === null) continue;
      for (const fo of sense0.form_of) {
        if (!validLemma(fo.word)) continue;
        out.push({ lemma: fo.word, pos, morph, gloss: sense0.glosses?.[0], exact, direct: false });
      }
    } else if (validLemma(entry.word)) {
      const base = pos === 'verb' ? 'inf' : pos === 'noun' ? ['sg', genderOf(entry)].filter(Boolean).join(' ') : pos === 'adj' ? ['sg', 'm'].join(' ') : '';
      out.push({ lemma: entry.word, pos, morph: base, gloss: sense0?.glosses?.[0], exact, direct: true });
    }
  }
  return out;
}

// ---- work: tokenize, build per-key candidates, resolve lexemes -----------------------------------
const workId = 'dante-vita-nuova-it';
const work = JSON.parse(fs.readFileSync(path.join(dataDir, workId, 'work.json'), 'utf8'));
const passages = workPassages({ divisions: work.divisions });
const keyCounts = new Map();
let tokensTotal = 0;
for (const { text } of passages) {
  for (const t of tokenize(text, 'it')) {
    if (t.kind !== 'word') continue;
    tokensTotal++;
    keyCounts.set(t.key, (keyCounts.get(t.key) ?? 0) + 1);
  }
}
console.log(`${workId}: ${tokensTotal} word tokens, ${keyCounts.size} unique keys.`);

// A form-of candidate's own gloss describes the INFLECTED surface ("feminine singular of quello"),
// which is a fine reading for the inflected token but a bad, circular description of the lemma
// itself. Whenever the base headword (no form_of, matching pos) is ALSO among our fetched kaikki
// entries, its own first-sense gloss ("that") is what the lexeme should show, regardless of which
// candidate happened to create the lexeme record first.
function baseGlossRaw(lemma, pos) {
  for (const e of byWord.get(lemma.toLowerCase()) ?? []) {
    if (pos !== undefined && posOf(e.pos) !== pos) continue;
    const s0 = e.senses?.[0];
    if (s0 && !s0.form_of?.length && s0.glosses?.[0]) return s0.glosses[0];
  }
  return undefined;
}

// coordinator addendum: "alternative form of cuore" / "apocopic form of che" style glosses (a
// SPELLING variant, not a grammatical inflection — "core" for "cuore" is archaic Dante Italian, a
// distinct lexeme worth its own card, not folded into cuore's) should resolve to the target's own
// gloss ("heart"), keeping the relation as a note: senses[0] = "alternative form of cuore — heart".
const IT_RELATION_RE = /^(?:alternative|apocopic|dialectal|obsolete|archaic|rare|poetic)?\s*(?:form|spelling)\s+of\s+(.+?)[.:]?$/i;
function resolveGlossRelation(rawText, pos, depth = 0) {
  if (!rawText) return { text: rawText, note: undefined };
  const m = depth < 3 ? IT_RELATION_RE.exec(rawText.trim()) : null;
  if (!m) return { text: rawText, note: undefined };
  const target = m[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
  const targetRaw = baseGlossRaw(target, pos) ?? baseGlossRaw(target, undefined);
  if (!targetRaw) return { text: rawText, note: undefined }; // no resolvable target: keep the relation text itself, not nothing
  const inner = resolveGlossRelation(targetRaw, pos, depth + 1);
  return { text: inner.text, note: rawText.replace(/[.:]$/, '') };
}
function baseGlossFor(lemma, pos) {
  const raw = baseGlossRaw(lemma, pos);
  return raw ? resolveGlossRelation(raw, pos) : undefined;
}

const lexemes = new Map(); // id -> { id, lemma, pos, gloss, note, src }
function lexemeFor(lemma, pos, rawGloss) {
  const id = `it:${pos}:${lemma}`;
  let lex = lexemes.get(id);
  const base = baseGlossFor(lemma, pos);
  const fallback = rawGloss ? resolveGlossRelation(rawGloss, pos) : undefined;
  const resolved = base ?? fallback;
  if (!lex) lexemes.set(id, (lex = { id, lemma, pos, gloss: resolved?.text || `(${pos}, no gloss found)`, note: resolved?.note, src: 'wiktionary' }));
  else if (base) {
    lex.gloss = base.text; // the real headword gloss always wins over an inflected-form description
    lex.note = base.note;
  } else if ((!lex.gloss || lex.gloss.startsWith('(')) && fallback) {
    lex.gloss = fallback.text;
    lex.note = fallback.note;
  }
  return lex;
}

const forms = {};
let recognized = 0;
let recognizedForms = 0;
const unrecognisedKeys = [];
for (const [key, count] of keyCounts) {
  const searchWords = [key, ...(ELISION_MAP[key] ?? [])];
  const raw = [];
  for (const sw of searchWords) raw.push(...candidatesFor(sw));
  if (!raw.length) {
    unrecognisedKeys.push({ key, count });
    continue;
  }
  const bySig = new Map(); // "id|morph" -> { id, morph, pos, score }
  for (const c of raw) {
    const lex = lexemeFor(c.lemma, c.pos, c.gloss);
    const score = (c.exact ? 1 : 0) + (c.direct ? 0.5 : 0);
    const dedupeKey = `${lex.id}|${c.morph}`;
    const existing = bySig.get(dedupeKey);
    if (!existing || score > existing.score) bySig.set(dedupeKey, { id: lex.id, morph: c.morph, pos: c.pos, score });
  }
  // a highly ambiguous elided function word (l' = lo/la, each themselves multi-sense) can pull in
  // a long tail of low-value candidates (e.g. "la" the musical note); cap the chip list to a
  // usable size while keeping best-first order — never drops the top reading.
  const ranked = [...bySig.values()].sort((a, b) => b.score - a.score).slice(0, 6);
  // plan §3: morph tags are pos FIRST, then features ("noun gen sg m", not "gen sg m").
  const readings = ranked.map((r, i) => [r.id, [r.pos, r.morph].filter(Boolean).join(' '), ranked.length === 1 ? 1 : i === 0 ? 0.8 : 0.6]);
  forms[key] = readings;
  recognized += count;
  recognizedForms++;
}
console.log(`recognized keys: ${recognizedForms}/${keyCounts.size}; recognized tokens: ${recognized}/${tokensTotal} (${((100 * recognized) / tokensTotal).toFixed(2)}%).`);

// ---- only the lexemes actually referenced by `forms` ship in the bundle --------------------------
const referencedIds = new Set();
for (const readings of Object.values(forms)) for (const [id] of readings) referencedIds.add(id);
const lexemesForWork = {};
for (const id of referencedIds) {
  const lex = lexemes.get(id);
  lexemesForWork[id] = { id: lex.id, lemma: lex.lemma, pos: lex.pos, gloss: lex.gloss, src: lex.src };
}

const bundle = {
  workId,
  lang: 'it',
  tokens: tokensTotal,
  recognized,
  forms,
  lexemes: lexemesForWork,
  analysis: 'kaikki it wiktionary extract (2026-09) form-table lookup',
};
fs.writeFileSync(path.join(lexisDir, 'works', `${workId}.json`), JSON.stringify(bundle));
console.log(`wrote ${path.relative(root, path.join(lexisDir, 'works', `${workId}.json`))}.`);

// ---- lex/it shard(s): every full LexEntry for a referenced lexeme --------------------------------
const entries = [...referencedIds].map((id) => {
  const lex = lexemes.get(id);
  const candidates = byWord.get(lex.lemma.toLowerCase()) ?? [];
  const kEntry = candidates.find((e) => posOf(e.pos) === lex.pos && !e.senses?.[0]?.form_of?.length) ?? candidates[0];
  const kSenses = kEntry?.senses
    ?.flatMap((s) => s.glosses ?? [])
    .filter(Boolean)
    .filter((g) => !lex.note || !IT_RELATION_RE.test(g.trim())) // don't duplicate the relation note senses[0] already carries
    .slice(0, 8);
  // coordinator addendum: senses[0] keeps the relation note when the gloss was resolved through
  // one ("alternative form of cuore — heart"), ahead of the target's own further senses.
  const senses = lex.note ? [`${lex.note} — ${lex.gloss}`, ...(kSenses ?? [])].slice(0, 8) : kSenses;
  const html = senses?.length ? `<p>${senses.map((s) => escapeHtml(s)).join('</p><p>')}</p>` : undefined;
  return { id: lex.id, lemma: lex.lemma, pos: lex.pos, gloss: lex.gloss, src: lex.src, senses: senses?.length ? senses : undefined, html, dict: 'wiktionary' };
});
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const shardFiles = writeLexShards(path.join(lexisDir, 'lex', 'it'), entries);
console.log(`lex/it shards written: ${shardFiles.length} (${entries.length} entries).`);

// ---- coverage.json merge (never drop another language's entry) -----------------------------------
const coveragePath = path.join(root, 'scripts', 'lexis', 'coverage.json');
let coverage = {};
if (fs.existsSync(coveragePath)) {
  try {
    coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  } catch {
    coverage = {};
  }
}
coverage.works = { ...(coverage.works ?? {}), [workId]: { tokens: tokensTotal, recognized, forms: keyCounts.size, recognizedForms } };
coverage.languages = { ...(coverage.languages ?? {}) };
coverage.languages.it = { tokens: tokensTotal, recognized, forms: keyCounts.size, recognizedForms };
fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));
console.log(`coverage.json updated (${path.relative(root, coveragePath)}).`);

// ---- unrecognised-form record (no dedicated report file is owned for Italian; kept as raw data) --
unrecognisedKeys.sort((a, b) => b.count - a.count);
fs.writeFileSync(path.join(rawDir, 'it-unrecognised.json'), JSON.stringify(unrecognisedKeys, null, 1));
console.log(`unrecognised keys: ${unrecognisedKeys.length} (written to raw/it-unrecognised.json); top 15:`, unrecognisedKeys.slice(0, 15).map((u) => `${u.key}(${u.count})`).join(' '));

console.log('Done.');
