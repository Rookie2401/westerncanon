/**
 * English prose for morph tag strings (docs/LEXIS-PLAN.md §3). Tags are
 * space-separated, language-neutral, lower-case, pos first. Unknown tags are
 * echoed back verbatim (never silently dropped) so an unfamiliar reading is
 * still shown honestly rather than hidden.
 */
import type { Pos } from './types.ts';

export const POS_LABELS: Record<Pos, string> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  pron: 'pronoun',
  prep: 'preposition',
  conj: 'conjunction',
  part: 'particle',
  num: 'numeral',
  interj: 'interjection',
  art: 'article',
  name: 'proper name',
  other: 'other',
};

export function posLabel(pos: Pos): string {
  return POS_LABELS[pos] ?? pos;
}

const CASE: Record<string, string> = {
  nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative',
  abl: 'ablative', voc: 'vocative', loc: 'locative',
};
const CASE_SHORT: Record<string, string> = {
  nom: 'nom.', gen: 'gen.', dat: 'dat.', acc: 'acc.', abl: 'abl.', voc: 'voc.', loc: 'loc.',
};
const NUMBER: Record<string, string> = { sg: 'singular', pl: 'plural', du: 'dual' };
const NUMBER_SHORT: Record<string, string> = { sg: 'sg.', pl: 'pl.', du: 'du.' };
const GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter' };
const GENDER_SHORT: Record<string, string> = { m: 'm.', f: 'f.', n: 'n.' };
const PERSON = new Set(['1', '2', '3']);
const TENSE: Record<string, string> = {
  pres: 'present', impf: 'imperfect', fut: 'future', aor: 'aorist', perf: 'perfect',
  plup: 'pluperfect', futperf: 'future perfect',
};
const TENSE_SHORT: Record<string, string> = {
  pres: 'pres.', impf: 'impf.', fut: 'fut.', aor: 'aor.', perf: 'perf.',
  plup: 'plup.', futperf: 'fut. perf.',
};
const MOOD: Record<string, string> = {
  ind: 'indicative', subj: 'subjunctive', opt: 'optative', imp: 'imperative',
  inf: 'infinitive', ptcp: 'participle', ger: 'gerund', gdv: 'gerundive', sup: 'supine',
};
const MOOD_SHORT: Record<string, string> = {
  ind: 'ind.', subj: 'subj.', opt: 'opt.', imp: 'imp.', inf: 'inf.', ptcp: 'ptcp.',
  ger: 'ger.', gdv: 'gdv.', sup: 'sup.',
};
const VOICE: Record<string, string> = { act: 'active', mid: 'middle', pass: 'passive', mp: 'middle/passive' };
const VOICE_SHORT: Record<string, string> = { act: 'act.', mid: 'mid.', pass: 'pass.', mp: 'mp.' };
const DEGREE: Record<string, string> = { comp: 'comparative', sup: 'superlative' };
const DEGREE_SHORT: Record<string, string> = { comp: 'comp.', sup: 'sup.' };
const MISC: Record<string, string> = { indecl: 'indeclinable', encl: 'enclitic' };
const MISC_SHORT: Record<string, string> = { indecl: 'indecl.', encl: 'encl.' };

const POS_SET = new Set<string>([
  'noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'part', 'num',
  'interj', 'art', 'name', 'other',
]);

/**
 * "aorist indicative active, 3rd person singular" / "genitive plural
 * feminine" / "comparative" — a plain-English rendering of a morph-tag
 * string. Verb tags (tense/mood/voice) always read in that fixed order
 * regardless of how they appear in the tag string, so e.g. `ptcp perf mp`
 * (mood-tense-voice, as a participle's tags are written) still reads as
 * "perfect participle middle/passive". A person digit picks up an adjacent
 * number tag as "3rd person singular"; a case/number/gender combination
 * with no person reads as "<case> <number> <gender>". Any tag this
 * vocabulary doesn't recognise is appended verbatim rather than dropped.
 */
export function describeMorph(tags: string): string {
  const parts = tags.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';

  const pos = parts[0] && POS_SET.has(parts[0]) ? parts[0] : null;
  const rest = pos ? parts.slice(1) : parts;

  let tenseWord: string | null = null;
  let moodWord: string | null = null;
  let voiceWord: string | null = null;
  let personDigit: string | null = null;
  let personNumber: string | null = null;
  const nominal: string[] = [];
  const other: string[] = [];

  for (const tag of rest) {
    if (TENSE[tag]) { tenseWord = TENSE[tag]; continue; }
    if (MOOD[tag]) { moodWord = MOOD[tag]; continue; }
    if (VOICE[tag]) { voiceWord = VOICE[tag]; continue; }
    if (PERSON.has(tag)) { personDigit = tag; continue; }
    if (CASE[tag]) { nominal.push(CASE[tag]); continue; }
    if (NUMBER[tag]) {
      // A number right after a person digit belongs to that person ("3 sg"
      // -> "3rd person singular"); otherwise it's a plain nominal number.
      if (personDigit !== null) personNumber = NUMBER[tag];
      else nominal.push(NUMBER[tag]);
      continue;
    }
    if (GENDER[tag]) { nominal.push(GENDER[tag]); continue; }
    if (DEGREE[tag]) { other.push(DEGREE[tag]); continue; }
    if (MISC[tag]) { other.push(MISC[tag]); continue; }
    other.push(tag);
  }

  const segments: string[] = [];
  const verbWords = [tenseWord, moodWord, voiceWord].filter((w): w is string => w !== null);
  if (verbWords.length) segments.push(verbWords.join(' '));
  if (personDigit !== null) {
    segments.push(`${ordinal(personDigit)} person${personNumber ? ` ${personNumber}` : ''}`);
  }
  if (nominal.length) segments.push(nominal.join(' '));
  if (other.length) segments.push(other.join(' '));

  if (segments.length) return segments.join(', ');
  // Nothing matched at all (fully unknown tag string) — echo verbatim.
  return rest.join(' ');
}

function ordinal(digit: string): string {
  return digit === '1' ? '1st' : digit === '2' ? '2nd' : digit === '3' ? '3rd' : `${digit}th`;
}

/** Abbreviated form, e.g. "aor. ind. act. 3 sg.". Unknown tags echoed verbatim. */
export function morphShort(tags: string): string {
  const parts = tags.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const pos = parts[0] && POS_SET.has(parts[0]) ? parts[0] : null;
  const rest = pos ? parts.slice(1) : parts;
  const out: string[] = [];
  for (const tag of rest) {
    if (TENSE_SHORT[tag]) { out.push(TENSE_SHORT[tag]); continue; }
    if (MOOD_SHORT[tag]) { out.push(MOOD_SHORT[tag]); continue; }
    if (VOICE_SHORT[tag]) { out.push(VOICE_SHORT[tag]); continue; }
    if (PERSON.has(tag)) { out.push(tag); continue; }
    if (CASE_SHORT[tag]) { out.push(CASE_SHORT[tag]); continue; }
    if (NUMBER_SHORT[tag]) { out.push(NUMBER_SHORT[tag]); continue; }
    if (GENDER_SHORT[tag]) { out.push(GENDER_SHORT[tag]); continue; }
    if (DEGREE_SHORT[tag]) { out.push(DEGREE_SHORT[tag]); continue; }
    if (MISC_SHORT[tag]) { out.push(MISC_SHORT[tag]); continue; }
    out.push(tag);
  }
  return out.join(' ');
}
