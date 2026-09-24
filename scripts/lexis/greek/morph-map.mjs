// Diorisis (POS attribute + <analysis morph="…"> string) -> this app's morph-tag vocabulary
// (docs/LEXIS-PLAN.md §3). Built from the actual token vocabulary found across the whole
// Diorisis corpus (sampled ~20 of the 820 files, ~470k analyses) — see REPORT-greek.md for the
// frequency table. Anything not in the maps below (dialect notes like "attic"/"epic"/"doric",
// "proclitic", "contr", "nu_movable", "adverbial", "a_priv"…) carries no plan-vocabulary tag and
// is dropped rather than invented; it is never silently promoted into a fabricated tag.

export const POS_MAP = {
  verb: 'verb', noun: 'noun', article: 'art', adjective: 'adj', pronoun: 'pron',
  conjunction: 'conj', particle: 'part', preposition: 'prep', adverb: 'adv',
  proper: 'name', interjection: 'interj', numeral: 'num',
};

const GENDER = { masc: 'm', fem: 'f', neut: 'n' };
const CASE = { nom: 'nom', gen: 'gen', dat: 'dat', acc: 'acc', voc: 'voc' };
const NUMBER = { sg: 'sg', pl: 'pl', dual: 'du' };
const PERSON = { '1st': '1', '2nd': '2', '3rd': '3' };
const TENSE = { pres: 'pres', imperf: 'impf', fut: 'fut', aor: 'aor', perf: 'perf', plup: 'plup', futperf: 'futperf' };
// Diorisis spells the participle mood "part" (collides with this app's POS abbreviation for
// "particle" — unrelated axis, no ambiguity once mapped) and the imperative "imperat".
const MOOD = { ind: 'ind', subj: 'subj', opt: 'opt', imperat: 'imp', inf: 'inf', part: 'ptcp' };
const VOICE = { act: 'act', mid: 'mid', pass: 'pass', mp: 'mp' };
const DEGREE = { comp: 'comp', superl: 'sup', irreg_comp: 'comp', irreg_superl: 'sup' };
const INDECL = new Set(['indeclform']);
const ENCLITIC = new Set(['enclitic']);
// recognised-but-dropped: no plan-vocabulary tag exists for these
const DROP = new Set(['proclitic', 'adverbial', 'contr', 'nu_movable', 'a_priv']);

// fix batch 2: a non-Attic-prose dialect qualifier in the parenthetical (Diorisis's own words —
// see the corpus-wide token frequency table in REPORT-greek.md §... "attic"/"koine"/"prose" are
// deliberately NOT included: they're either the standard or an explicit "this is normal prose"
// note, not a marked/rarer dialect form) — used only as a reading-ranking signal
// (build-greek.mjs), never as a plan-vocabulary tag.
const DIALECT_QUALIFIER = /\b(epic|doric|aeolic|ionic|poetic|homeric)\b/;
export function hasDialectQualifier(morph) {
  for (const m of morph.matchAll(/\(([^)]*)\)/g)) if (DIALECT_QUALIFIER.test(m[1])) return true;
  return false;
}

/**
 * Parse one Diorisis `<analysis morph="…">` string into zero or more plan-vocabulary tag
 * combinations (without the leading pos, which the caller prepends from the lemma's own POS
 * attribute). A morph string can name more than one value on the same axis with a slash
 * ("masc/neut gen sg", "nom/voc/acc") meaning "the form doesn't disambiguate between these";
 * each such axis is expanded into the cartesian product of single-valued tag strings, since
 * `Reading[1]` in this app is one concrete combination, not a set. Dialect parentheticals
 * ("(attic)", "(epic doric aeolic)") are informational only and dropped entirely.
 */
export function morphToTagCombos(morph) {
  const main = morph.replace(/\([^)]*\)/g, ' ');
  // insertion order = the plan's own example ordering (tense mood voice person case number
  // gender degree); describeMorph() reads tags by keyword so this is cosmetic, not functional.
  const axes = { tense: [], mood: [], voice: [], person: [], case: [], number: [], gender: [], degree: [] };
  const flags = new Set();
  for (const rawTok of main.split(/\s+/).filter(Boolean)) {
    for (const tok of rawTok.split('/')) {
      if (GENDER[tok]) axes.gender.push(GENDER[tok]);
      else if (CASE[tok]) axes.case.push(CASE[tok]);
      else if (NUMBER[tok]) axes.number.push(NUMBER[tok]);
      else if (PERSON[tok]) axes.person.push(PERSON[tok]);
      else if (TENSE[tok]) axes.tense.push(TENSE[tok]);
      else if (MOOD[tok]) axes.mood.push(MOOD[tok]);
      else if (VOICE[tok]) axes.voice.push(VOICE[tok]);
      else if (DEGREE[tok]) axes.degree.push(DEGREE[tok]);
      else if (INDECL.has(tok)) flags.add('indecl');
      else if (ENCLITIC.has(tok)) flags.add('encl');
      else if (DROP.has(tok)) continue;
      // unrecognised token (dialect name, punctuation remnant, etc.): silently dropped
    }
  }
  // de-duplicate each axis's candidate values, preserving first-seen order
  for (const k of Object.keys(axes)) axes[k] = [...new Set(axes[k])];
  const axisKeys = Object.keys(axes).filter((k) => axes[k].length > 0);
  // cartesian product across axes that have >1 candidate value (bounded: at most 3 axes ever
  // carry a slash-combo in the observed data, each with at most 3 values)
  let combos = [[]];
  for (const k of axisKeys) {
    const next = [];
    for (const c of combos) for (const v of axes[k]) next.push([...c, v]);
    combos = next;
    if (combos.length > 24) break; // safety valve; never hit in the observed vocabulary
  }
  const flagTags = [...flags];
  if (combos.length === 1 && combos[0].length === 0) {
    return flagTags.length ? [flagTags.join(' ')] : [];
  }
  return combos.map((c) => [...c, ...flagTags].join(' ')).filter(Boolean);
}
