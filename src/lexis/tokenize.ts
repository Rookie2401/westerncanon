/**
 * Lexis tokenizer and keys (contract, docs/LEXIS-PLAN.md §3). Offsets into the
 * passage text; the text itself is never changed. scripts/lexis/lib.mjs is a
 * line-for-line mirror for the build scripts; src/__tests__/lexis-tokenize.test.ts
 * asserts the two agree on a battery of fixtures.
 */
import type { LexLang } from './types.ts';

export type TokenKind = 'word' | 'number' | 'punct' | 'space' | 'other';

export interface Token {
  kind: TokenKind;
  start: number;
  end: number;
  /** the slice of the text exactly as printed */
  surface: string;
  /** looseKey(surface) for word tokens, '' otherwise */
  key: string;
}

// Greek letters (basic + extended polytonic) and the combining marks a decomposed
// text may carry; Latin letters with the diacritics older editions use; digits.
const GREEK_LETTER = /[Ͱ-Ͽἀ-῿]/u;
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/u;
/** Combining marks (a decomposed text carries accents/breathings/macrons as separate code points). */
const COMBINING = /[̀-ͯ]/u;
const DIGIT = /[0-9]/;
/** Elision / apostrophe marks that may close an elided word (Greek δ᾽, Italian l'). */
const ELISION = /[ʼ’᾽᾿']/u;

function isLetter(ch: string, lang: LexLang): boolean {
  return COMBINING.test(ch) || (lang === 'grc' ? GREEK_LETTER.test(ch) : LATIN_LETTER.test(ch));
}

/** Loose key (plan §3): the lookup key of WorkLexis.forms. */
export function looseKey(surface: string, lang: LexLang): string {
  let s = surface.normalize('NFC');
  if (lang === 'grc') {
    s = s.replace(/[ʼ’᾽᾿']+$/u, '');
    return s.toLowerCase();
  }
  if (lang === 'la') {
    return s
      .normalize('NFD')
      .replace(/[̄̆]/g, '')
      .normalize('NFC')
      .replace(/[ĀĂ]/g, 'A').replace(/[āă]/g, 'a')
      .replace(/[ĒĔ]/g, 'E').replace(/[ēĕ]/g, 'e')
      .replace(/[ĪĬ]/g, 'I').replace(/[īĭ]/g, 'i')
      .replace(/[ŌŎ]/g, 'O').replace(/[ōŏ]/g, 'o')
      .replace(/[ŪŬ]/g, 'U').replace(/[ūŭ]/g, 'u')
      .replace(/Ȳ/g, 'Y').replace(/ȳ/g, 'y')
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .replace(/j/g, 'i');
  }
  // it: keep an elision apostrophe as part of the token ("l'", "dell'"), unify its shape
  return s.replace(/[ʼ’᾽᾿]/gu, "'").toLowerCase();
}

/** Fold key (plan §3): runtime fallback when the loose key misses. */
export function foldKey(surface: string, lang: LexLang): string {
  const k = looseKey(surface, lang);
  if (lang === 'grc') {
    return k.normalize('NFD').replace(/[̀-ͯ᾽-῁῍-῏῝-῟῭-`´῾]/gu, '').normalize('NFC').replace(/ς/g, 'σ');
  }
  if (lang === 'la') return k.replace(/v/g, 'u');
  return k.replace(/'$/, '');
}

/**
 * Split a passage into tokens covering the whole text (every character belongs to
 * exactly one token, in order). A word token is a maximal run of letters (with
 * combining marks); for grc and it an elision mark directly after a letter run is
 * included in the word token (δ᾽, l'). Digits form number tokens; whitespace runs
 * are space tokens (newlines included, so the renderer can keep verse lines);
 * everything else is one code point per punct/other token.
 */
export function tokenize(text: string, lang: LexLang): Token[] {
  const out: Token[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < n && /\s/.test(text[j]!)) j++;
      out.push({ kind: 'space', start: i, end: j, surface: text.slice(i, j), key: '' });
      i = j;
      continue;
    }
    if (isLetter(ch, lang)) {
      let j = i + 1;
      while (j < n && isLetter(text[j]!, lang)) j++;
      if ((lang === 'grc' || lang === 'it') && j < n && ELISION.test(text[j]!)) j++;
      const surface = text.slice(i, j);
      out.push({ kind: 'word', start: i, end: j, surface, key: looseKey(surface, lang) });
      i = j;
      continue;
    }
    if (DIGIT.test(ch)) {
      let j = i + 1;
      while (j < n && DIGIT.test(text[j]!)) j++;
      out.push({ kind: 'number', start: i, end: j, surface: text.slice(i, j), key: '' });
      i = j;
      continue;
    }
    const cp = String.fromCodePoint(text.codePointAt(i)!);
    const kind: TokenKind = /[\p{P}\p{S}]/u.test(cp) ? 'punct' : 'other';
    out.push({ kind, start: i, end: i + cp.length, surface: cp, key: '' });
    i += cp.length;
  }
  return out;
}

/** Word tokens only. */
export function wordTokens(text: string, lang: LexLang): Token[] {
  return tokenize(text, lang).filter((t) => t.kind === 'word');
}

/**
 * Shard prefix of a lexeme id: the first two letters of its lemma, diacritics
 * removed and lower-cased ("grc:noun:λόγος" -> "λο", "la:verb:amo" -> "am");
 * the manifest maps prefixes (or their first letter) to shard files.
 */
export function shardCandidates(lexemeId: string): string[] {
  const lemma = lexemeId.split(':').slice(2).join(':').replace(/#\d+$/, '');
  const plain = lemma.normalize('NFD').replace(/[\u0300-\u036F]/g, '').normalize('NFC').toLowerCase().replace(/ς/g, 'σ');
  const out: string[] = [];
  for (let n = Math.min(4, plain.length); n >= 1; n--) out.push(plain.slice(0, n));
  out.push('_');
  return out;
}

export function shardPrefix(lexemeId: string): string {
  const lemma = lexemeId.split(':').slice(2).join(':').replace(/#\d+$/, '');
  const plain = lemma.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase().replace(/ς/g, 'σ');
  return plain.slice(0, 2) || '_';
}
