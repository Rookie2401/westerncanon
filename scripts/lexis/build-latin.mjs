#!/usr/bin/env node
// Lexis D-LA/IT package — Latin. Builds data/lexis/works/<workId>.json for every la work,
// data/lexis/lex/la/*.json shards, and merges into scripts/lexis/coverage.json.
// docs/LEXIS-PLAN.md §3 (keys/ids/tags), §"LATIN" (analyser + dictionary).
//
// COORDINATOR FIX BATCH 1 (2026-09-24): an independent probe found whitakers-words 0.1.1 giving
// wrong lemmas/parses (hominum -> "omen"?!) and Lewis & Short's short-gloss heuristic surfacing
// grammar notes ("N. cr", "indic. pres") instead of meanings when used as a PRIMARY source. Kaikki
// is now primary; Whitaker is a gated fallback (only for a lemma some OTHER dictionary also knows);
// Lewis & Short is now used only for the html article, and as a gloss fallback with a much
// stricter filter. See "## Fix batch 1" near the end of this file / REPORT-latin.md.
//
// Pipeline:
//   A. tokenize every Latin work; collect every unique loose key across all 44 works, with counts
//      and the original (case-preserved) surfaces seen for it.
//   B. index scripts/lexis/raw/kaikki-la-filtered.json (built by fetch-latin.mjs, which streamed
//      the 1.2 GB kaikki.org Latin extract already on disk at romance-v0 and kept only entries
//      relevant to our key set) by word and by every inflected form in its own forms[] table.
//   C. PRIMARY: for each key, find its kaikki cell(s) (trying v/u spelling and enclitic split),
//      turn each into a Reading via scripts/lexis/shared/kaikki-latin.mjs's tag mapping (ported
//      from romance-v0/scripts/dict-lib.mjs), ordered by case prior + number, confidence 0.9 for a
//      unique cell else 0.8.
//   D. FALLBACK: a key kaikki's tables never mention is tried with Whitaker's Words — but a
//      resulting lemma is kept ONLY if kaikki or Lewis & Short also knows it (confidence 0.7).
//   E. LAST: an unresolved, ever-capitalised key becomes a proper name (confidence 0.5).
//   F. assemble each work's WorkLexis bundle and the lex/la shards (Lewis & Short only for html +
//      gloss-fallback; kaikki senses otherwise).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from 'whitakers-words/node';
import { tokenize, workPassages } from './lib.mjs';
import { analyzeForm, stripMacronsJtoI } from './shared/latin-morph.mjs';
import { loadLewisShort, renderTei, shortGloss, shortSenses, inflectionNote } from './shared/lewis-short.mjs';
import { writeLexShards } from './shared/shard-writer.mjs';
import {
  stripMacrons, posOf, nominalCellToTags, adjectivalCellToTags, verbCellToTags, lemmaGenderFromForms,
  morphSortKey, parseGloss, skipEntryPos, isValidLatinLemma,
} from './shared/kaikki-latin.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = path.join(root, 'data');
const lexisDir = path.join(root, 'data', 'lexis');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
fs.mkdirSync(path.join(lexisDir, 'works'), { recursive: true });
fs.mkdirSync(path.join(lexisDir, 'lex', 'la'), { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const LATIN_WORKS = fs.readdirSync(dataDir).filter((d) => /-la$/.test(d) && fs.existsSync(path.join(dataDir, d, 'work.json')));
log(`Latin works: ${LATIN_WORKS.length}`, LATIN_WORKS.length === 44 ? '(matches contract)' : '(!= 44, contract expected 44)');

// ---- A. tokenize every work, collect the global key set -----------------------------------------
const perWork = new Map();
const globalKeys = new Map(); // key -> { count, surfaces: Map<surface,count> }

for (const dir of LATIN_WORKS) {
  const work = JSON.parse(fs.readFileSync(path.join(dataDir, dir, 'work.json'), 'utf8'));
  const passages = workPassages({ divisions: work.divisions });
  const keyCounts = new Map();
  let tokensTotal = 0;
  for (const { text } of passages) {
    for (const tok of tokenize(text, 'la')) {
      if (tok.kind !== 'word') continue;
      tokensTotal++;
      keyCounts.set(tok.key, (keyCounts.get(tok.key) ?? 0) + 1);
      let g = globalKeys.get(tok.key);
      if (!g) globalKeys.set(tok.key, (g = { count: 0, surfaces: new Map() }));
      g.count++;
      g.surfaces.set(tok.surface, (g.surfaces.get(tok.surface) ?? 0) + 1);
    }
  }
  perWork.set(dir, { workId: dir, tokensTotal, keyCounts });
}
log(`unique loose keys across the corpus: ${globalKeys.size}, total word tokens: ${[...perWork.values()].reduce((s, w) => s + w.tokensTotal, 0)}`);

// ---- B. index the kaikki filtered subset ---------------------------------------------------------
const kaikkiPath = path.join(rawDir, 'kaikki-la-filtered.json');
if (!fs.existsSync(kaikkiPath)) {
  console.error(`Missing ${path.relative(root, kaikkiPath)} — run: node scripts/lexis/fetch-latin.mjs`);
  process.exit(1);
}
const kaikki = JSON.parse(fs.readFileSync(kaikkiPath, 'utf8'));
log(`loaded ${kaikki.length} filtered kaikki entries.`);

const byWordStripped = new Map(); // stripped-lower word -> entry[]
const byFormStripped = new Map(); // stripped-lower form -> [{owner, tags}]
for (const entry of kaikki) {
  if (skipEntryPos(entry.pos) || !isValidLatinLemma(entry.word)) continue;
  const w = stripMacrons(entry.word).toLowerCase();
  (byWordStripped.get(w) ?? byWordStripped.set(w, []).get(w)).push(entry);
  if (Array.isArray(entry.forms)) {
    for (const f of entry.forms) {
      if (!f?.form || f.tags?.includes('table-tags') || f.tags?.includes('inflection-template')) continue;
      const fl = stripMacrons(f.form).toLowerCase();
      (byFormStripped.get(fl) ?? byFormStripped.set(fl, []).get(fl)).push({ owner: entry, tags: f.tags ?? [] });
    }
  }
}
log(`indexed: ${byWordStripped.size} distinct words, ${byFormStripped.size} distinct inflected forms.`);

function findKaikkiPool(key) {
  const variants = new Set([key]);
  if (key.includes('v')) variants.add(key.replace(/v/g, 'u'));
  if (key.includes('u')) variants.add(key.replace(/u/g, 'v'));
  const pool = [];
  for (const v of variants) {
    for (const e of byWordStripped.get(v) ?? []) pool.push({ entry: e, form: null });
    for (const x of byFormStripped.get(v) ?? []) pool.push({ entry: x.owner, form: x });
  }
  return pool;
}
function kaikkiPoolWithEnclitic(key) {
  let pool = findKaikkiPool(key);
  if (pool.length) return { pool, encl: '' };
  for (const enc of ['que', 'ne', 've']) {
    if (key.length > enc.length + 2 && key.endsWith(enc)) {
      const p2 = findKaikkiPool(key.slice(0, -enc.length));
      if (p2.length) return { pool: p2, encl: enc };
    }
  }
  return { pool: [], encl: '' };
}

/** Raw {entry, pos, morph, direct} candidates from a kaikki pool (skips unmapped/junk cells). */
// kaikki mints a separate top-level entry for most inflected Latin surface forms too (mirroring
// what fix batch 1's addendum found in Italian): word="hominum", senses[0].form_of=[{word:"homō̆"}],
// senses[0].tags=["form-of","genitive","masculine","plural"]. Treating that as if `word` itself
// were a bare citation form (this build's original bug) makes the LEXEME "hominum" with a fake
// "nom sg" reading — confirmed directly against the coordinator's probe. A "form" stub instead
// resolves to its target's REAL entry (so it shares that lemma's real gloss/weight/homograph
// group), synthesising a minimal placeholder only when the target has no headword entry of its own
// among our filtered kaikki subset (never inventing a gloss — L&S/placeholder fallback still runs).
const syntheticEntries = new Map(); // "pos|strippedLemma" -> synthetic entry object
function resolveTargetEntry(targetLemmaRaw, pos) {
  const key = stripMacrons(targetLemmaRaw).toLowerCase();
  const real = (byWordStripped.get(key) ?? []).filter((e) => posOf(e.pos) === pos && !e.senses?.[0]?.form_of?.length);
  if (real.length === 1) return real[0];
  if (real.length > 1) return real.slice().sort((a, b) => (b.senses?.length ?? 0) - (a.senses?.length ?? 0))[0];
  const sKey = `${pos}|${key}`;
  let syn = syntheticEntries.get(sKey);
  if (!syn) syntheticEntries.set(sKey, (syn = { word: targetLemmaRaw, pos, senses: [], forms: [], _synthetic: true }));
  return syn;
}

function cellTagsFor(pos, tags, ownerFormsForGender) {
  if (pos === 'noun' || pos === 'name') return nominalCellToTags(tags, lemmaGenderFromForms(ownerFormsForGender));
  if (pos === 'adj') return adjectivalCellToTags(tags, tags.includes('comparative') ? 'comparative' : tags.includes('superlative') ? 'superlative' : undefined);
  if (pos === 'pron') return adjectivalCellToTags(tags);
  if (pos === 'num') return adjectivalCellToTags(tags).length ? adjectivalCellToTags(tags) : nominalCellToTags(tags, undefined);
  if (pos === 'verb') {
    const m = verbCellToTags(tags);
    return m ? [m] : [];
  }
  return [];
}

function rawCandidatesFromPool(pool) {
  const raw = [];
  for (const { entry, form } of pool) {
    const pos = posOf(entry.pos);
    if (form) {
      for (const m of cellTagsFor(pos, form.tags, entry.forms)) raw.push({ entry, pos, morph: m, direct: false });
      continue;
    }
    const sense0 = entry.senses?.[0];
    if (sense0?.form_of?.length) {
      for (const fo of sense0.form_of) {
        if (!isValidLatinLemma(fo.word)) continue;
        const target = resolveTargetEntry(fo.word, pos);
        const morphs = cellTagsFor(pos, sense0.tags ?? [], target.forms);
        for (const m of morphs) raw.push({ entry: target, pos, morph: m, direct: false });
      }
      continue;
    }
    // a genuine citation-form headword
    let morph;
    if (pos === 'verb') morph = 'pres ind act 1 sg'; // a Latin verb's citation word IS this cell
    else if (pos === 'noun' || pos === 'name') morph = ['nom', 'sg', lemmaGenderFromForms(entry.forms)].filter(Boolean).join(' ');
    else if (pos === 'adj') morph = 'nom sg m';
    else if (pos === 'pron' || pos === 'num') morph = 'nom sg';
    else morph = '';
    raw.push({ entry, pos, morph, direct: true });
  }
  return raw;
}

// ---- C. PRIMARY pass: every key's kaikki candidates, and the global lexeme registry -------------
const keyKaikki = new Map(); // key -> { raw: candidate[], encl }
const entryWeight = new Map(); // entry (object identity) -> corpus weight
for (const [key, g] of globalKeys) {
  const { pool, encl } = kaikkiPoolWithEnclitic(key);
  const raw = rawCandidatesFromPool(pool);
  keyKaikki.set(key, { raw, encl });
  for (const c of raw) entryWeight.set(c.entry, (entryWeight.get(c.entry) ?? 0) + g.count);
}
const kaikkiHitKeys = [...keyKaikki.values()].filter((v) => v.raw.length).length;
log(`keys with a kaikki hit: ${kaikkiHitKeys}/${globalKeys.size}`);

log('loading Lewis & Short…');
const ls = loadLewisShort();
log('Lewis & Short loaded.');

// group entries by (pos, macron-stripped lemma) for homograph numbering
const byPosLemma = new Map(); // "pos|lemma" -> entry[]
for (const entry of entryWeight.keys()) {
  // pos is recoverable from any raw candidate referencing this entry; cheaper to just recompute
  const pos = posOf(entry.pos);
  const lemma = stripMacronsJtoI(entry.word);
  const k = `${pos}|${lemma}`;
  (byPosLemma.get(k) ?? byPosLemma.set(k, []).get(k)).push(entry);
}

/** entry (object identity) -> final lexeme record. */
const entryToLexeme = new Map();
let lsHtmlHits = 0;
let kaikkiGlossHits = 0;
let lsGlossFallbackHits = 0;

function firstUsableKaikkiGloss(entry, depth = 0) {
  for (const sense of entry.senses ?? []) {
    const glossList = sense.glosses ?? [];
    let raw = glossList[0];
    if (!raw) continue;
    // a relation note ("comparative degree of parvus:", "Inflection of respondeō:") is sometimes
    // followed by the REAL plain definition as a second element in the same array — confirmed
    // directly ("minor"/adj: glosses = ["comparative degree of parvus:", "less; lesser; inferior;
    // smaller"]). When present, that second element is what should actually ship as the gloss.
    if (/:\s*$/.test(raw) && glossList[1]) raw = glossList[1];
    const { text, formOfTarget } = parseGloss(raw);
    if (formOfTarget && depth < 4) {
      const targetLower = stripMacrons(formOfTarget.split(/\s+/)[0]).toLowerCase();
      const targetEntries = byWordStripped.get(targetLower);
      if (targetEntries) {
        for (const te of targetEntries) {
          if (te === entry) continue;
          const resolved = firstUsableKaikkiGloss(te, depth + 1);
          if (resolved) return { text: `${text} — ${resolved.text}`, resolvedText: resolved.resolvedText };
        }
      }
      // no resolvable target: keep the relation text itself rather than nothing
      if (text) return { text, resolvedText: text };
      continue;
    }
    if (text) return { text, resolvedText: text };
  }
  return undefined;
}

for (const [, group] of byPosLemma) {
  group.sort((a, b) => (entryWeight.get(b) ?? 0) - (entryWeight.get(a) ?? 0));
  const pos = posOf(group[0].pos);
  const baseLemmaText = stripMacronsJtoI(group[0].word);
  group.forEach((entry, i) => {
    const suffix = i === 0 ? '' : `#${i + 1}`;
    const id = `la:${pos}:${baseLemmaText}${suffix}`;
    const lsVariants = ls.lookupAll(baseLemmaText, pos);
    const lsHit = lsVariants[0];
    let html;
    let inflection;
    if (lsHit) {
      html = renderTei(lsHit.body);
      inflection = inflectionNote(lsHit.body);
      lsHtmlHits++;
    }
    // gloss: kaikki first (resolving "form of X"), Lewis & Short (strict filter) only if kaikki has none
    const kg = firstUsableKaikkiGloss(entry);
    let gloss = kg?.resolvedText ?? '';
    let senses;
    let dict;
    if (gloss) {
      kaikkiGlossHits++;
      dict = 'kaikki';
      const senseText = (s) => {
        const gl = s.glosses ?? [];
        const r = /:\s*$/.test(gl[0] ?? '') && gl[1] ? gl[1] : gl[0];
        return parseGloss(r ?? '').text;
      };
      senses = [...new Set((entry.senses ?? []).map(senseText).filter(Boolean))].slice(0, 10);
    }
    if (!gloss && lsHit) {
      const firstSense = (lsHit.body.match(/<sense level="1"[^>]*>[\s\S]*?(?=<sense level="1"|$)/) ?? [lsHit.body])[0];
      const lsSenses = shortSenses(lsHit.body);
      const lsGloss = shortGloss(firstSense) || lsSenses[0] || '';
      if (lsGloss) {
        gloss = lsGloss;
        senses = lsSenses;
        dict = 'lewis-short';
        lsGlossFallbackHits++;
      }
    }
    if (!gloss) gloss = `(${pos}, no gloss found)`;
    entryToLexeme.set(entry, { id, lemma: baseLemmaText + suffix, pos, gloss, senses, html, inflection, dict });
  });
}
log(`kaikki lexeme registry: ${entryToLexeme.size} lexemes (${byPosLemma.size} pos/lemma groups); gloss source: kaikki ${kaikkiGlossHits}, lewis-short fallback ${lsGlossFallbackHits}; html from Lewis & Short: ${lsHtmlHits}.`);

const lexemeById = new Map();
for (const lex of entryToLexeme.values()) lexemeById.set(lex.id, lex);

// ---- D. FALLBACK: Whitaker's Words for keys kaikki's tables never mention, gated to a lemma some
// OTHER dictionary (kaikki or Lewis & Short) also knows — "never trust a Whitaker lemma that no
// dictionary knows" (coordinator fix batch 1). Flat confidence 0.7 regardless of ambiguity.
const cachePath = path.join(rawDir, 'la-analyses.json');
const analysisCache = new Map();
if (fs.existsSync(cachePath)) {
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    for (const [k, v] of Object.entries(cached)) analysisCache.set(k, v);
    log(`loaded ${analysisCache.size} cached Whitaker analyses.`);
  } catch {
    log('Whitaker cache unreadable, starting fresh.');
  }
}
const engine = createEngine();
const fallbackKeys = [...globalKeys.keys()].filter((k) => !keyKaikki.get(k).raw.length);
let analysed = 0;
for (const key of fallbackKeys) {
  if (analysisCache.has(key)) continue;
  analysisCache.set(key, analyzeForm(engine, key));
  analysed++;
}
log(`Whitaker fallback analysed ${analysed} new of ${fallbackKeys.length} kaikki-unresolved keys.`);
{
  const obj = {};
  for (const [k, v] of analysisCache) obj[k] = v;
  fs.writeFileSync(cachePath, JSON.stringify(obj));
}

function kaikkiOrLsKnows(whitakerLemma, pos) {
  if (byWordStripped.has(whitakerLemma.toLowerCase())) return true;
  return ls.lookupAll(whitakerLemma, pos).length > 0;
}

// group GATED Whitaker sigs by (pos, lemma) for homograph numbering, same shape as the kaikki pass
const whitakerSigInfo = new Map(); // "pos|sig" -> { pos, lemma, sig, weight, mean }
for (const key of fallbackKeys) {
  const { candidates } = analysisCache.get(key) ?? { candidates: [] };
  const w = globalKeys.get(key)?.count ?? 1;
  for (const c of candidates) {
    if (!kaikkiOrLsKnows(c.lemma, c.pos)) continue; // the gate
    const sigKey = `${c.pos}|${c.sig}`;
    let info = whitakerSigInfo.get(sigKey);
    if (!info) whitakerSigInfo.set(sigKey, (info = { pos: c.pos, lemma: c.lemma, sig: c.sig, weight: 0, mean: c.mean }));
    info.weight += w;
  }
}
const whitakerByPosLemma = new Map();
for (const info of whitakerSigInfo.values()) {
  const k = `${info.pos}|${info.lemma}`;
  (whitakerByPosLemma.get(k) ?? whitakerByPosLemma.set(k, []).get(k)).push(info);
}
const whitakerSigToLexeme = new Map();
for (const [, group] of whitakerByPosLemma) {
  group.sort((a, b) => b.weight - a.weight || (a.sig < b.sig ? -1 : 1));
  const pos = group[0].pos;
  const whitakerLemma = group[0].lemma;
  const variants = ls.lookupAll(whitakerLemma, pos);
  const baseLemmaText = stripMacronsJtoI(variants.length ? variants[0].key.replace(/\d+$/, '') : whitakerLemma);
  group.forEach((info, i) => {
    const suffix = i === 0 ? '' : `#${i + 1}`;
    const id = `la:${pos}:${baseLemmaText}${suffix}`;
    // does an existing kaikki-sourced lexeme already occupy this exact id? then reuse ITS gloss/html
    // rather than creating a duplicate entry for the same word.
    if (lexemeById.has(id)) {
      whitakerSigToLexeme.set(`${pos}|${info.sig}`, lexemeById.get(id));
      return;
    }
    const variant = variants[i] ?? variants[0];
    let gloss = '';
    let senses;
    let html;
    let inflection;
    let dict;
    if (variant) {
      senses = shortSenses(variant.body);
      html = renderTei(variant.body);
      inflection = inflectionNote(variant.body);
      dict = 'lewis-short';
      const firstSense = (variant.body.match(/<sense level="1"[^>]*>[\s\S]*?(?=<sense level="1"|$)/) ?? [variant.body])[0];
      gloss = shortGloss(firstSense) || senses[0] || '';
    }
    if (!gloss && info.mean) {
      gloss = info.mean.split(';')[0].replace(/[,.]$/, '').trim().slice(0, 120);
      dict = dict ?? 'whitaker';
    }
    if (!gloss) gloss = `(${pos}, no gloss found)`;
    const lex = { id, lemma: baseLemmaText + suffix, pos, gloss, senses, html, inflection, dict, src: dict };
    whitakerSigToLexeme.set(`${pos}|${info.sig}`, lex);
    lexemeById.set(id, lex);
  });
}
log(`Whitaker fallback lexemes (gated, kaikki/L&S-known only): ${new Set([...whitakerSigToLexeme.values()].map((l) => l.id)).size}.`);

// ---- proper-name fallback (lazy per printed Form) -------------------------------------------------
const nameLexemes = new Map();
function nameLexemeFor(form) {
  const id = `la:name:${form}`;
  let rec = nameLexemes.get(id);
  if (!rec) {
    nameLexemes.set(id, (rec = { id, lemma: form, pos: 'name', gloss: 'proper name', src: 'name', dict: undefined }));
    lexemeById.set(id, rec);
  }
  return rec;
}

// ---- final per-key Readings ------------------------------------------------------------------------
const globalForms = new Map(); // key -> Reading[]
let recognizedKeyCount = 0;
let kaikkiKeyCount = 0;
let whitakerFallbackKeyCount = 0;
let nameKeyCount = 0;
for (const key of globalKeys.keys()) {
  const { raw, encl } = keyKaikki.get(key);
  if (raw.length) {
    const bySig = new Map(); // "id|morph" -> {id, morph, weight}
    for (const c of raw) {
      const lex = entryToLexeme.get(c.entry);
      if (!lex) continue;
      const morph = encl ? (c.morph ? `${c.morph} encl` : 'encl') : c.morph;
      bySig.set(`${lex.id}|${morph}`, { id: lex.id, morph, weight: entryWeight.get(c.entry) ?? 0 });
    }
    // best-first: the lexeme's own corpus frequency FIRST (so a common verb's infinitive beats a
    // rare noun homograph that happens to share the same spelling — confirmed necessary directly:
    // "esse" was ranking the rare noun "esse" [state] above "sum"'s infinitive "to be" because case
    // prior alone has no opinion about verb cells), THEN the coordinator's case/number prior among
    // several cells of the SAME lexeme (declension syncretism, e.g. dat/abl singular).
    const arr = [...bySig.values()].sort((a, b) => b.weight - a.weight || morphSortKey(a.morph) - morphSortKey(b.morph));
    if (arr.length) {
      const conf = arr.length === 1 ? 0.9 : 0.8;
      // plan §3: morph tags are pos FIRST, then features ("noun gen sg m", not "gen sg m") —
      // sorting above deliberately used the pos-free cell string; prepend pos only now.
      globalForms.set(key, arr.map((r) => [r.id, [lexemeById.get(r.id)?.pos, r.morph].filter(Boolean).join(' '), conf]));
      recognizedKeyCount++;
      kaikkiKeyCount++;
      continue;
    }
  }
  // Whitaker fallback (gated)
  const wa = analysisCache.get(key);
  if (wa && wa.candidates.length) {
    const bySig = new Map();
    for (const c of wa.candidates) {
      const lex = whitakerSigToLexeme.get(`${c.pos}|${c.sig}`);
      if (!lex) continue; // ungated: dropped, not just deprioritised
      const morph = wa.encl ? (c.morph ? `${c.morph} encl` : 'encl') : c.morph;
      bySig.set(`${lex.id}|${morph}`, { id: lex.id, morph, pos: lex.pos });
    }
    if (bySig.size) {
      const readings = [...bySig.values()].map((r) => [r.id, [r.pos, r.morph].filter(Boolean).join(' '), 0.7]);
      globalForms.set(key, readings);
      recognizedKeyCount++;
      whitakerFallbackKeyCount++;
      continue;
    }
  }
  // proper-name fallback
  const g = globalKeys.get(key);
  let bestForm;
  let bestCount = 0;
  if (g) {
    for (const [surface, count] of g.surfaces) {
      if (/^[A-ZÀ-Þ]/.test(surface) && count > bestCount) {
        bestForm = surface;
        bestCount = count;
      }
    }
  }
  if (bestForm) {
    const lex = nameLexemeFor(bestForm);
    globalForms.set(key, [[lex.id, 'name', 0.5]]);
    recognizedKeyCount++;
    nameKeyCount++;
  }
}
log(`keys with >=1 reading: ${recognizedKeyCount}/${globalKeys.size} — kaikki: ${kaikkiKeyCount}, Whitaker fallback: ${whitakerFallbackKeyCount}, proper-name: ${nameKeyCount}.`);

// ---- E. per-work bundles + coverage -------------------------------------------------------------
const workForms = new Map();
const allLexemesUsed = new Map();
const coveragePerWork = {};
let corpusTokens = 0;
let corpusRecognized = 0;

for (const [dir, w] of perWork) {
  const forms = {};
  const lexemesForWork = {};
  let recognized = 0;
  let formsCount = 0;
  let recognizedForms = 0;
  for (const [key, count] of w.keyCounts) {
    formsCount++;
    const readings = globalForms.get(key);
    if (!readings) continue;
    recognized += count;
    recognizedForms++;
    forms[key] = readings;
    for (const [lexId] of readings) {
      if (lexemesForWork[lexId]) continue;
      const lex = lexemeById.get(lexId);
      if (lex) {
        lexemesForWork[lexId] = { id: lex.id, lemma: lex.lemma, pos: lex.pos, gloss: lex.gloss, src: lex.src ?? lex.dict };
        allLexemesUsed.set(lex.id, lex);
      }
    }
  }
  const bundle = {
    workId: dir,
    lang: 'la',
    tokens: w.tokensTotal,
    recognized,
    forms,
    lexemes: lexemesForWork,
    analysis: 'kaikki.org la wiktionary extract (primary) + whitakers-words 0.1.1 (gated fallback) + lewis-short (html/gloss-fallback)',
  };
  fs.writeFileSync(path.join(lexisDir, 'works', `${dir}.json`), JSON.stringify(bundle));
  workForms.set(dir, forms);
  coveragePerWork[dir] = { tokens: w.tokensTotal, recognized, forms: formsCount, recognizedForms };
  corpusTokens += w.tokensTotal;
  corpusRecognized += recognized;
}
log(`wrote ${perWork.size} Latin WorkLexis bundles.`);
log(`corpus running-token recognition: ${corpusRecognized}/${corpusTokens} = ${((100 * corpusRecognized) / corpusTokens).toFixed(2)}%`);

// ---- lex/la shards ----------------------------------------------------------------------------
const entries = [...allLexemesUsed.values()].map((lex) => ({
  id: lex.id, lemma: lex.lemma, pos: lex.pos, gloss: lex.gloss, src: lex.src ?? lex.dict,
  senses: lex.senses, html: lex.html, inflection: lex.inflection, dict: lex.dict,
}));
log(`lexicon entries actually referenced by a work: ${entries.length}`);
const shardFiles = writeLexShards(path.join(lexisDir, 'lex', 'la'), entries);
log(`lex/la shards written: ${shardFiles.length}`);

// ---- coverage.json (merge, never drop another language) -----------------------------------------
const coveragePath = path.join(root, 'scripts', 'lexis', 'coverage.json');
let coverage = {};
if (fs.existsSync(coveragePath)) {
  try {
    coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  } catch {
    coverage = {};
  }
}
coverage.works = { ...(coverage.works ?? {}), ...coveragePerWork };
coverage.languages = { ...(coverage.languages ?? {}) };
coverage.languages.la = {
  tokens: corpusTokens,
  recognized: corpusRecognized,
  forms: Object.values(coveragePerWork).reduce((s, w) => s + w.forms, 0),
  recognizedForms: Object.values(coveragePerWork).reduce((s, w) => s + w.recognizedForms, 0),
};
fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));
log(`coverage.json updated (${path.relative(root, coveragePath)}).`);

// ---- REPORT-latin.md ------------------------------------------------------------------------------
const unrecognised = [];
for (const [key, g] of globalKeys) {
  if (globalForms.has(key)) continue;
  unrecognised.push({ key, count: g.count, surface: [...g.surfaces.keys()][0] });
}
unrecognised.sort((a, b) => b.count - a.count);
const top200 = unrecognised.slice(0, 200);
function guessReason(key) {
  if (key.length <= 2) return 'very short — likely an abbreviation or OCR fragment';
  if (/[^a-z]/.test(key)) return 'non-Latin-letter characters — OCR noise or transliteration';
  if (/que$|ne$|ve$/.test(key)) return 'possible enclitic that still could not be split';
  return 'not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling';
}

const workSizes = [...perWork.keys()].map((dir) => ({ dir, bytes: fs.statSync(path.join(lexisDir, 'works', `${dir}.json`)).size }));
const laLexDirForSizes = path.join(lexisDir, 'lex', 'la');
const shardSizes = shardFiles.map((f) => ({ f, bytes: fs.statSync(path.join(laLexDirForSizes, f)).size }));
const totalWorkBytes = workSizes.reduce((s, w) => s + w.bytes, 0);
const totalShardBytes = shardSizes.reduce((s, w) => s + w.bytes, 0);
const largestWork = workSizes.reduce((a, b) => (b.bytes > a.bytes ? b : a));
const largestShard = shardSizes.reduce((a, b) => (b.bytes > a.bytes ? b : a));

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260924);
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};
const sampleWorks = pickN([...workForms.keys()], 5);
const spotCheck = [];
for (const dir of sampleWorks) {
  const formsObj = workForms.get(dir);
  const keys = Object.keys(formsObj);
  for (const key of pickN(keys, 6)) {
    const [lexId, morph, conf] = formsObj[key][0];
    const lex = lexemeById.get(lexId);
    const surface = [...(globalKeys.get(key)?.surfaces.keys() ?? [key])][0];
    spotCheck.push({ dir, surface, key, lexId, lemma: lex?.lemma, pos: lex?.pos, morph, conf, gloss: lex?.gloss });
  }
}

// coordinator fix batch 1: exact probe list, printed with their new top reading + gloss
const PROBE_KEYS = ['hominum', 'civium', 'viros', 'dominorum', 'civitatis', 'civitas', 'esse', 'fuit', 'omnia', 'quae', 'urbem', 'libros', 'auctoritate', 'respondere', 'amici', 'minus', 'qui', 'ille'];
const probeRows = PROBE_KEYS.map((key) => {
  const readings = globalForms.get(key);
  if (!readings) return { key, top: '(unrecognised)', gloss: '', conf: '' };
  const [lexId, morph, conf] = readings[0];
  const lex = lexemeById.get(lexId);
  return { key, top: `${lex?.lemma ?? '?'} (${morph || lex?.pos || '?'})`, gloss: lex?.gloss ?? '', conf, altCount: readings.length };
});

const reportLines = [];
reportLines.push('# Lexis — Latin data package report');
reportLines.push('');
reportLines.push(`Built ${new Date().toISOString()}. Primary analyser: kaikki.org Latin Wiktionary extract (CC BY-SA). Fallback: whitakers-words 0.1.1 (MIT), gated to lemmas kaikki or Lewis & Short also know. Lewis & Short (Perseus TEI, CC BY-SA 4.0) supplies the full html article always, and the gloss only when kaikki has none.`);
reportLines.push('');
reportLines.push('## Fix batch 1 (coordinator probe fixes, 2026-09-24)');
reportLines.push('');
reportLines.push('Rebuilt with kaikki.org as the PRIMARY analyser (romance-v0’s local copy of kaikki-la.jsonl, tag-mapping ideas ported from romance-v0/scripts/dict-lib.mjs); Whitaker’s Words is now a fallback gated to lemmas some other dictionary also knows; Lewis & Short gloss extraction uses a much stricter grammar-note filter. Exact probes requested:');
reportLines.push('');
reportLines.push('| key | new top reading | gloss | confidence | alt. readings |');
reportLines.push('|---|---|---|---:|---:|');
for (const p of probeRows) reportLines.push(`| ${p.key} | ${p.top} | ${(p.gloss ?? '').replace(/\|/g, '/')} | ${p.conf} | ${p.altCount ?? 0} |`);
reportLines.push('');
reportLines.push(`New coverage after fix batch 1: **${((100 * corpusRecognized) / corpusTokens).toFixed(2)}%** running tokens (${corpusRecognized.toLocaleString()}/${corpusTokens.toLocaleString()}), of which kaikki resolved ${kaikkiKeyCount.toLocaleString()} keys directly, Whitaker’s (gated) fallback resolved ${whitakerFallbackKeyCount.toLocaleString()} more, and ${nameKeyCount.toLocaleString()} were proper-name fallbacks.`);
reportLines.push('');
reportLines.push('## Coverage');
reportLines.push('');
reportLines.push(`- Corpus: ${perWork.size} Latin works, ${corpusTokens.toLocaleString()} running word tokens, ${globalKeys.size.toLocaleString()} unique loose keys.`);
reportLines.push(`- **Running-token recognition: ${((100 * corpusRecognized) / corpusTokens).toFixed(2)}%** (${corpusRecognized.toLocaleString()}/${corpusTokens.toLocaleString()}) — target was ≥ 96%.`);
reportLines.push(`- Unique-key recognition: ${((100 * recognizedKeyCount) / globalKeys.size).toFixed(2)}% (${recognizedKeyCount.toLocaleString()}/${globalKeys.size.toLocaleString()}).`);
reportLines.push(`- Lexicon entries shipped: ${entries.length.toLocaleString()}; gloss source kaikki ${kaikkiGlossHits.toLocaleString()}, Lewis & Short fallback ${lsGlossFallbackHits.toLocaleString()}; ${nameLexemes.size.toLocaleString()} proper-name-fallback lexemes; html article present for ${lsHtmlHits.toLocaleString()} lexemes.`);
reportLines.push(`- lex/la shards: ${shardFiles.length}.`);
reportLines.push('');
reportLines.push('## Per-work coverage');
reportLines.push('');
reportLines.push('| work | tokens | recognized | % |');
reportLines.push('|---|---:|---:|---:|');
for (const [dir, c] of Object.entries(coveragePerWork).sort((a, b) => b[1].tokens - a[1].tokens)) {
  reportLines.push(`| ${dir} | ${c.tokens.toLocaleString()} | ${c.recognized.toLocaleString()} | ${((100 * c.recognized) / c.tokens).toFixed(1)}% |`);
}
reportLines.push('');
reportLines.push('## Sizes');
reportLines.push('');
reportLines.push(`- data/lexis/works/*.json (44 Latin bundles): ${(totalWorkBytes / 1024).toFixed(0)} KB total; largest ${largestWork.dir}.json at ${(largestWork.bytes / 1024).toFixed(0)} KB.`);
reportLines.push(`- data/lexis/lex/la/*.json (${shardFiles.length} shards): ${(totalShardBytes / 1024).toFixed(0)} KB total; largest ${largestShard.f} at ${(largestShard.bytes / 1024).toFixed(0)} KB${largestShard.bytes > 250 * 1024 ? ' (over the ~250 KB target)' : ''}.`);
reportLines.push(`- Grand total (works + lex/la): ${((totalWorkBytes + totalShardBytes) / 1024 / 1024).toFixed(1)} MB.`);
reportLines.push('');
reportLines.push('## 30 random Latin tokens, 5 works — for hand spot-checking');
reportLines.push('');
reportLines.push('| work | surface | top reading | gloss | confidence |');
reportLines.push('|---|---|---|---|---:|');
for (const s of spotCheck) {
  const reading = s.lemma ? `${s.lemma} (${s.morph || s.pos})` : '(unresolved)';
  reportLines.push(`| ${s.dir} | ${s.surface} | ${reading} | ${(s.gloss ?? '').replace(/\|/g, '/')} | ${s.conf} |`);
}
reportLines.push('');
reportLines.push('## 200 most frequent unrecognised Latin forms');
reportLines.push('');
reportLines.push('No reading is fabricated for any of these; each is simply absent from `forms` in every bundle that uses it.');
reportLines.push('');
reportLines.push('| form | corpus count | guessed reason |');
reportLines.push('|---|---:|---|');
for (const u of top200) reportLines.push(`| ${u.surface} | ${u.count} | ${guessReason(u.key)} |`);
reportLines.push('');
fs.writeFileSync(path.join(root, 'scripts', 'lexis', 'REPORT-latin.md'), reportLines.join('\n'));
log('REPORT-latin.md written.');

log('Done.');
