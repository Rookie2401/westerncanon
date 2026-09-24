// kaikki.org Latin Wiktionary extract -> docs/LEXIS-PLAN.md §3 Reading tags. Tag-mapping IDEAS
// (which kaikki tag combination means which grammatical cell, per part of speech) are ported from
// C:\Users\CJWal\dev\romance-v0\scripts\dict-lib.mjs's nominalTagsToCode/adjectivalTagsToCode/
// verbTagsToCode — re-targeted at the plan's own tag vocabulary (space-separated words, not
// romance-v0's "n:sg:nom" FeatureCode strings) and its canonical tag ORDER (pos is separate;
// noun/pron/num: case number gender; adj: case number gender degree; verb finite: tense mood
// voice person number; verb participle: mood tense voice case number gender).
import { stripMacronsJtoI } from './latin-morph.mjs';

export const stripMacrons = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
export { stripMacronsJtoI };

export const KAIKKI_POS_MAP = {
  noun: 'noun', proper: 'name', verb: 'verb', adj: 'adj', adv: 'adv', particle: 'adv',
  pron: 'pron', pronoun: 'pron', determiner: 'pron', prep: 'prep', preposition: 'prep',
  conj: 'conj', conjunction: 'conj', num: 'num', numeral: 'num', interj: 'interj', interjection: 'interj',
};
export const posOf = (p) => KAIKKI_POS_MAP[p] ?? 'other';

const CASE_TAGS = { nominative: 'nom', genitive: 'gen', dative: 'dat', accusative: 'acc', ablative: 'abl', vocative: 'voc', locative: 'loc' };
const GENDER_TAGS = { masculine: 'm', feminine: 'f', neuter: 'n' };
// coordinator fix batch 1: readings ordered by this case prior, sg before pl
export const CASE_PRIOR = { nom: 0, acc: 1, gen: 2, dat: 3, abl: 4, voc: 5, loc: 6 };
export const NUMBER_PRIOR = { sg: 0, pl: 1, du: 2 };

function findCase(set) {
  for (const [tag, code] of Object.entries(CASE_TAGS)) if (set.has(tag)) return code;
  return undefined;
}
function findNumber(set) {
  if (set.has('plural')) return 'pl';
  if (set.has('singular')) return 'sg';
  return undefined;
}
function findGenders(set) {
  const out = [];
  for (const [tag, code] of Object.entries(GENDER_TAGS)) if (set.has(tag)) out.push(code);
  return out;
}

/** A noun/numeral declension cell -> ["case sg gender"] (gender is the lemma's own, passed in —
 * Latin nouns don't inflect for gender, so it's constant across every cell). Bare rows with no
 * explicit number tag default to singular (kaikki's own convention for a citation genitive). */
export function nominalCellToTags(tags, lemmaGender) {
  const set = new Set(tags);
  const case_ = findCase(set);
  if (!case_) return [];
  const number = findNumber(set) ?? 'sg';
  return [[case_, number, lemmaGender].filter(Boolean).join(' ')];
}

/** An adjective/pronoun/determiner declension cell -> one tag string PER gender the row covers
 * (kaikki syncretises identical forms across genders into one row, e.g.
 * "feminine|masculine|plural|vocative" — this becomes 2 Readings sharing that printed form). */
export function adjectivalCellToTags(tags, degree) {
  const set = new Set(tags);
  const case_ = findCase(set);
  if (!case_) return [];
  const number = findNumber(set) ?? 'sg';
  const genders = findGenders(set);
  const deg = degree === 'comparative' ? 'comp' : degree === 'superlative' ? 'sup' : undefined;
  if (!genders.length) return [[case_, number, deg].filter(Boolean).join(' ')];
  return genders.map((g) => [case_, number, g, deg].filter(Boolean).join(' '));
}

const IGNORED_VERB_TAGS = new Set(['potential', 'aorist', 'sigmatic', 'preterite', 'conditional', 'conditional-ii', 'clitic', 'romanization', 'multiword-construction']);

/** A verb conjugation cell -> a single canonically-ordered tag string, or undefined for an
 * archaic/rare row this build deliberately doesn't map (documented in the report). */
export function verbCellToTags(tags) {
  const set = new Set(tags.filter((t) => !IGNORED_VERB_TAGS.has(t)));
  if (set.has('gerund')) {
    const case_ = findCase(set);
    return case_ ? `ger ${case_}` : 'ger';
  }
  if (set.has('supine')) {
    const case_ = findCase(set);
    return case_ ? `sup ${case_}` : 'sup';
  }
  if (set.has('infinitive')) {
    const voice = set.has('passive') ? 'pass' : 'act';
    const tense = set.has('perfect') ? (set.has('future') ? 'futperf' : 'perf') : set.has('future') ? 'fut' : 'pres';
    return `${tense} inf ${voice}`;
  }
  if (set.has('participle')) {
    const voice = set.has('passive') ? 'pass' : 'act';
    if (set.has('future') && voice === 'pass') return 'gdv nom sg m'; // gerundive citation row
    const tense = set.has('perfect') ? 'perf' : set.has('future') ? 'fut' : 'pres';
    return `ptcp ${tense} ${voice} nom sg m`;
  }
  let mood;
  if (set.has('imperative')) mood = 'imp';
  else if (set.has('subjunctive')) mood = 'subj';
  else if (set.has('indicative')) mood = 'ind';
  else return undefined;
  const voice = set.has('passive') ? 'pass' : 'act';
  let tense;
  if (mood === 'imp') tense = set.has('future') ? 'fut' : 'pres';
  else if (set.has('perfect') && set.has('future')) tense = 'futperf';
  else if (set.has('pluperfect')) tense = 'plup';
  else if (set.has('perfect')) tense = 'perf';
  else if (set.has('future')) tense = 'fut';
  else if (set.has('imperfect')) tense = 'impf';
  else tense = 'pres';
  let person;
  if (set.has('first-person')) person = '1';
  else if (set.has('second-person')) person = '2';
  else if (set.has('third-person')) person = '3';
  const number = findNumber(set);
  if (!number || !person) return undefined;
  return [tense, mood, voice, person, number].join(' ');
}

/** The lemma's OWN gender, from its "canonical" form row (nouns: fixed per lemma). The plan's
 * gender vocabulary is only m/f/n (no combined "common gender" tag), so a genuinely common-gender
 * 3rd-declension noun (cīvis, mīles, adulēscēns — same form for both sexes) just reports its first
 * listed gender rather than an invalid concatenated "mf"/"fn" tag (found by check-bundles.mjs). */
export function lemmaGenderFromForms(forms) {
  for (const f of forms ?? []) {
    if (!f.tags?.includes('canonical')) continue;
    const set = new Set(f.tags);
    const g = findGenders(set);
    if (g.length) return g[0];
  }
  return undefined;
}

// Verb-cell tie-break for when case/number say nothing (two cells of the SAME lexeme, e.g.
// "respondere" is genuinely both respondeo's present infinitive AND a classical alternate 3rd-plural
// perfect ending "-ere" for "responderunt") — confirmed necessary directly: without it, the rare
// perfect-plural alternate was outranking the overwhelmingly more usual infinitive on tie-break
// order alone. Infinitive/indicative and present tense are preferred as the "more expected" cell.
const MOOD_PRIOR = { inf: 0, ind: 1, ptcp: 2, gdv: 3, subj: 4, imp: 5, ger: 6, sup: 7 };
const TENSE_PRIOR = { pres: 0, perf: 1, impf: 2, fut: 3, plup: 4, futperf: 5 };

/** Sort key for best-first ordering among readings ALREADY tied on lexeme weight: the
 * coordinator's case prior + number prior for a nominal cell; a mood/tense prior for a verb cell
 * that carries no case at all (so the two scales never fight each other). */
export function morphSortKey(morph) {
  const tags = morph.split(' ');
  let caseRank;
  let numRank = 0;
  let moodRank = 9;
  let tenseRank = 9;
  for (const t of tags) {
    if (CASE_PRIOR[t] !== undefined) caseRank = CASE_PRIOR[t];
    if (NUMBER_PRIOR[t] !== undefined) numRank = NUMBER_PRIOR[t];
    if (MOOD_PRIOR[t] !== undefined) moodRank = MOOD_PRIOR[t];
    if (TENSE_PRIOR[t] !== undefined) tenseRank = TENSE_PRIOR[t];
  }
  // number ranks ABOVE case: confirmed against the coordinator's own worked example — "civitatis"
  // must rank its (extremely common) genitive SINGULAR above its (rare, alternate "-is" ending)
  // accusative PLURAL, even though accusative outranks genitive in the case prior taken alone.
  if (caseRank !== undefined) return numRank * 10 + caseRank; // 0..69: nominal cell
  return 100 + moodRank * 10 + tenseRank; // 100+: verb/bare cell, mood/tense tie-break
}

// ---- gloss cleaning -------------------------------------------------------------------------------
// Strips a leading "(...)" register/topic qualifier kaikki prepends to many glosses (e.g.
// "(poetic) to burn with love"), and recognises "alternative/apocopic/dialectal/obsolete form of X"
// / "misspelling of X" so the caller can resolve X's own gloss instead of shipping a circular one.
const LEADING_PAREN = /^\([^)]*\)\s*/;
const FORM_OF_RE = /^(?:alternative|apocopic|dialectal|obsolete|archaic|rare|poetic)?\s*(?:form|spelling)\s+of\s+(.+)$/i;
const DEGREE_OF_RE = /^(?:comparative|superlative)\s+degree\s+of\s+(.+?):?$/i;
const MISSPELLING_RE = /^misspelling of\s+(.+)$/i;

export function cleanGlossText(raw) {
  if (!raw) return '';
  return raw.replace(LEADING_PAREN, '').trim();
}

/** { text, formOfTarget } — formOfTarget is the bare lemma text a "form of X" gloss points at. */
export function parseGloss(raw) {
  const text = cleanGlossText(raw);
  const m = FORM_OF_RE.exec(text) ?? MISSPELLING_RE.exec(text) ?? DEGREE_OF_RE.exec(text);
  if (m) return { text, formOfTarget: m[1].replace(/\s*\([^)]*\)\s*$/, '').trim() };
  return { text, formOfTarget: undefined };
}

// ---- junk-entry filters (ported from romance-v0/scripts/dict-lib.mjs isAffixWord/isValidLatinLemma) --
const SKIP_POS = new Set(['root', 'suffix', 'prefix', 'circumfix', 'infix', 'interfix', 'character', 'punct', 'punctuation', 'symbol', 'phrase']);
export const skipEntryPos = (pos) => SKIP_POS.has(pos);
export const isAffixWord = (word) => typeof word === 'string' && word.length > 0 && (word.startsWith('-') || word.endsWith('-'));
const VALID_LEMMA_RE = /^[A-Za-zĀ-ſƀ-ɏÆŒæœ'’-]+$/;
export const isValidLatinLemma = (word) => typeof word === 'string' && word.length > 0 && word.length <= 30 && VALID_LEMMA_RE.test(word) && !isAffixWord(word);
