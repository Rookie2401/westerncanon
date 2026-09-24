// Whitaker's Words parse -> Lexis plan morph tags (docs/LEXIS-PLAN.md §3).
// Adapted from C:\Users\CJWal\dev\vetus-v0\scripts\latin-morph.mjs (toProiel), re-targeted at the
// plan's own tag vocabulary instead of the PROIEL tagset, and without the Vulgate-NT gold corpus
// (this build has no per-work treebank to train reading weights from, so ranking uses Whitaker's
// own frequency/age marks plus a static case/number/mood prior instead of learned weights).
import { dictionaryForm } from 'whitakers-words/node';

export const ENCLITICS = ['que', 'ne', 've'];

// Whitaker's citation forms for a few pronouns are bare stems or placeholders, not words
// (confirmed by running the engine): qui/quae/quod prints as "qu", aliquis as "aliqu", nos as
// "n", vos as "v", the reflexive as "zzz". Fixed to the real citation form (same table vetus uses).
const LEMMA_FIX = { qu: 'qui', aliqu: 'aliquis', n: 'nos', v: 'vos', zzz: 'se', Deus: 'deus' };

const CASE = { NOM: 'nom', VOC: 'voc', GEN: 'gen', LOC: 'loc', DAT: 'dat', ABL: 'abl', ACC: 'acc', X: null };
const NUMBER = { S: 'sg', P: 'pl', X: null };
const GENDER = { M: 'm', F: 'f', N: 'n', C: null, X: null };
const TENSE = { PRES: 'pres', IMPF: 'impf', FUT: 'fut', PERF: 'perf', PLUP: 'plup', FUTP: 'futperf', X: null };
const MOOD = { IND: 'ind', SUB: 'subj', IMP: 'imp', INF: 'inf', PPL: 'ptcp', X: null };
const VOICE = { ACTIVE: 'act', PASSIVE: 'pass', X: null };
const DEGREE = { COMP: 'comp', SUPER: 'sup', POS: null, X: null };

// Frequency/age marks straight from Whitaker's own dictionary line (data/build's FREQ_SCORE /
// AGE_MALUS in vetus, reused): A = most common. The corpus here spans classical Cicero/Vergil to
// medieval Boethius/Dante and 17th-c. Newton, so the age malus is kept small (a tiebreaker only,
// not a filter) rather than vetus's Vulgate-tuned "prefer classical" weight.
const FREQ_SCORE = { A: 3, B: 2.5, C: 2, D: 1.5, E: 1, F: 0.5, I: 1, M: 0.5, N: 0.5, X: 1 };
const AGE_MALUS = { A: 0.3, F: 0.2, G: 0.2, H: 0.2, B: 0, C: 0, D: 0, E: 0, X: 0 };
// Static "more common reading of an ending" prior: nominative/accusative singular readings beat
// oblique/plural ones when Whitaker offers both for the same ending, absent any corpus to learn
// weights from (the plan's "preference for the more common reading of an ending").
const CASE_WEIGHT = { nom: 0.6, acc: 0.5, gen: 0.4, dat: 0.3, abl: 0.3, voc: 0.15, loc: 0.1 };
const NUMBER_WEIGHT = { sg: 0.2, pl: 0.1, du: 0 };
const MOOD_WEIGHT = { ind: 0.3, ptcp: 0.15, inf: 0.15, subj: 0, imp: 0, gdv: 0.1, sup: 0 };

const tagStr = (parts) => parts.filter((p) => p).join(' ');

/** Whitaker's citation form, LEMMA_FIX'd and with "(e)"-style optional letters resolved to the
 * fuller spelling (dext(e)ra -> dextera) — exactly vetus's lemmaOf, minus its extra lemmaSpelling
 * step (macron/i-j normalisation happens once globally, after Lewis & Short reconciliation). */
export function whitakerLemma(de) {
  const first = dictionaryForm(de).split(/[,\s]/)[0].replace(/\(([^)]*)\)/g, '$1');
  return LEMMA_FIX[first] ?? first;
}

/** macrons stripped, j/J -> i/I (docs/LEXIS-PLAN.md §3's lemma reconciliation rule; also used to
 * normalise a Lewis & Short headword down to the same spelling convention as the app's Latin). */
export function stripMacronsJtoI(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0304\u0306]/g, '')
    .normalize('NFC')
    .replace(/j/g, 'i')
    .replace(/J/g, 'I');
}

/**
 * One Whitaker `ParseResult` -> a raw candidate reading, or null for a part of speech with no
 * card (TACKON/PREFIX/SUFFIX/X). `srcTag` is 'r' (regular), 's' (syncopated), 't' (spelling
 * trick) or 'e' (base of an enclitic compound) — carried through only for diagnostics.
 */
export function toCandidate(pr, srcTag) {
  const q = pr.ir.qual;
  const de = pr.de;
  const lemma = whitakerLemma(de);
  const freq = de.tran.freq;
  const age = de.tran.age;
  const sig = `${dictionaryForm(de)}|${q.pofs}`; // groups distinct Whitaker dictionary lines that share a cleaned lemma (true homographs)
  const mean = de.mean;
  const score = (FREQ_SCORE[freq] ?? 1) - (AGE_MALUS[age] ?? 0);
  let pos;
  let morph;
  switch (q.pofs) {
    case 'N': {
      const r = q.noun;
      pos = 'noun';
      const c = CASE[r.cs];
      const n = NUMBER[r.number];
      morph = tagStr([c, n, GENDER[r.gender]]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (CASE_WEIGHT[c] ?? 0) + (NUMBER_WEIGHT[n] ?? 0) };
    }
    case 'PRON':
    case 'PACK': {
      const r = q.pofs === 'PRON' ? q.pron : q.pack;
      pos = 'pron';
      const c = CASE[r.cs];
      const n = NUMBER[r.number];
      morph = tagStr([c, n, GENDER[r.gender]]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (CASE_WEIGHT[c] ?? 0) + (NUMBER_WEIGHT[n] ?? 0) };
    }
    case 'ADJ': {
      const r = q.adj;
      pos = 'adj';
      const c = CASE[r.cs];
      const n = NUMBER[r.number];
      morph = tagStr([c, n, GENDER[r.gender], DEGREE[r.comparison]]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (CASE_WEIGHT[c] ?? 0) + (NUMBER_WEIGHT[n] ?? 0) };
    }
    case 'NUM': {
      const r = q.num;
      if (r.sort === 'ADVERB') {
        pos = 'adv';
        morph = '';
        return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score };
      }
      pos = 'num';
      const c = CASE[r.cs];
      const n = NUMBER[r.number];
      morph = tagStr([c, n, GENDER[r.gender]]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (CASE_WEIGHT[c] ?? 0) + (NUMBER_WEIGHT[n] ?? 0) };
    }
    case 'ADV': {
      pos = 'adv';
      morph = tagStr([DEGREE[q.adv.comparison]]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score };
    }
    case 'V': {
      const r = q.verb;
      const tvm = r.tenseVoiceMood;
      pos = 'verb';
      const mood = MOOD[tvm.mood];
      const person = tvm.mood === 'INF' || !r.person ? null : String(r.person);
      const number = tvm.mood === 'INF' ? null : NUMBER[r.number];
      morph = tagStr([TENSE[tvm.tense], mood, VOICE[tvm.voice], person, number]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (MOOD_WEIGHT[mood] ?? 0) + (NUMBER_WEIGHT[number] ?? 0) };
    }
    case 'VPAR': {
      const r = q.vpar;
      const tvm = r.tenseVoiceMood;
      pos = 'verb';
      const c = CASE[r.cs];
      const n = NUMBER[r.number];
      const isGerundive = tvm.tense === 'FUT' && tvm.voice === 'PASSIVE';
      const mood = isGerundive ? 'gdv' : 'ptcp';
      morph = isGerundive ? tagStr([mood, c, n, GENDER[r.gender]]) : tagStr([mood, TENSE[tvm.tense], VOICE[tvm.voice], c, n, GENDER[r.gender]]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (MOOD_WEIGHT[mood] ?? 0) + (CASE_WEIGHT[c] ?? 0) + (NUMBER_WEIGHT[n] ?? 0) };
    }
    case 'SUPINE': {
      const r = q.supine;
      pos = 'verb';
      const c = CASE[r.cs];
      const n = NUMBER[r.number];
      morph = tagStr(['sup', c, n]);
      return { lemma, pos, morph, sig, freq, age, mean, src: srcTag, score: score + (CASE_WEIGHT[c] ?? 0) };
    }
    case 'PREP':
      return { lemma, pos: 'prep', morph: '', sig, freq, age, mean, src: srcTag, score };
    case 'CONJ':
      return { lemma, pos: 'conj', morph: '', sig, freq, age, mean, src: srcTag, score };
    case 'INTERJ':
      return { lemma, pos: 'interj', morph: '', sig, freq, age, mean, src: srcTag, score };
    default:
      return null; // TACKON, PREFIX, SUFFIX, X: no card for these
  }
}

/**
 * Every candidate reading Whitaker offers for a printed form (already de-elided/lower-cased by
 * the caller), trying: the form as given; v<->u spelling variants (older texts print V for
 * consonantal v, or vice versa); then, if still nothing, an enclitic split of -que/-ne/-ve (the
 * engine's own addonResults, same as vetus's `e` source). Returns { candidates, encl, variant }.
 */
export function analyzeForm(engine, formLower) {
  const variants = [formLower];
  if (formLower.includes('v')) variants.push(formLower.replace(/v/g, 'u'));
  if (formLower.includes('u')) variants.push(formLower.replace(/u/g, 'v'));
  for (const variant of variants) {
    const a = engine.parseWord(variant);
    const cands = [];
    const add = (results, src) => {
      for (const pr of results) {
        const c = toCandidate(pr, src);
        if (c) cands.push(c);
      }
    };
    add(a.results, 'r');
    if (!cands.length && a.syncopeResult) add(a.syncopeResult.results, 's');
    if (!cands.length) add(a.trickResults, 't');
    if (cands.length) return { candidates: cands, encl: '', variant };
  }
  // enclitic split, tried on the original form only (Whitaker's own addon engine already handles
  // v/u internally when it re-parses the base after stripping -que/-ne/-ve)
  const a = engine.parseWord(formLower);
  for (const ar of a.addonResults ?? []) {
    if (ar.type !== 'tackon' || !ENCLITICS.includes(ar.addon.word)) continue;
    const cands = [];
    for (const pr of ar.baseResults ?? []) {
      const c = toCandidate(pr, 'e');
      if (c) cands.push(c);
    }
    if (cands.length) return { candidates: cands, encl: ar.addon.word, variant: formLower };
  }
  return { candidates: [], encl: '', variant: formLower };
}
