// Mirror of src/lexis/tokenize.ts for the build scripts (plain JS, no TS import).
import { readFileSync } from 'node:fs';
// Keep the two in lockstep; src/__tests__/lexis-tokenize.test.ts asserts equality.
const GREEK_LETTER = /[Ͱ-Ͽἀ-῿]/u;
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/u;
/** Combining marks (a decomposed text carries accents/breathings/macrons as separate code points). */
const COMBINING = /[̀-ͯ]/u;
const DIGIT = /[0-9]/;
const ELISION = /[ʼ’᾽᾿']/u;

function isLetter(ch, lang) {
  return COMBINING.test(ch) || (lang === 'grc' ? GREEK_LETTER.test(ch) : LATIN_LETTER.test(ch));
}

export function looseKey(surface, lang) {
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
  return s.replace(/[ʼ’᾽᾿]/gu, "'").toLowerCase();
}

export function foldKey(surface, lang) {
  const k = looseKey(surface, lang);
  if (lang === 'grc') {
    return k.normalize('NFD').replace(/[̀-ͯ᾽-῁῍-῏῝-῟῭-`´῾]/gu, '').normalize('NFC').replace(/ς/g, 'σ');
  }
  if (lang === 'la') return k.replace(/v/g, 'u');
  return k.replace(/'$/, '');
}

export function tokenize(text, lang) {
  const out = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < n && /\s/.test(text[j])) j++;
      out.push({ kind: 'space', start: i, end: j, surface: text.slice(i, j), key: '' });
      i = j;
      continue;
    }
    if (isLetter(ch, lang)) {
      let j = i + 1;
      while (j < n && isLetter(text[j], lang)) j++;
      if ((lang === 'grc' || lang === 'it') && j < n && ELISION.test(text[j])) j++;
      const surface = text.slice(i, j);
      out.push({ kind: 'word', start: i, end: j, surface, key: looseKey(surface, lang) });
      i = j;
      continue;
    }
    if (DIGIT.test(ch)) {
      let j = i + 1;
      while (j < n && DIGIT.test(text[j])) j++;
      out.push({ kind: 'number', start: i, end: j, surface: text.slice(i, j), key: '' });
      i = j;
      continue;
    }
    const cp = String.fromCodePoint(text.codePointAt(i));
    const kind = /[\p{P}\p{S}]/u.test(cp) ? 'punct' : 'other';
    out.push({ kind, start: i, end: i + cp.length, surface: cp, key: '' });
    i += cp.length;
  }
  return out;
}

export function wordTokens(text, lang) {
  return tokenize(text, lang).filter((t) => t.kind === 'word');
}

export function shardCandidates(lexemeId) {
  const lemma = lexemeId.split(':').slice(2).join(':').replace(/#\d+$/, '');
  const plain = lemma.normalize('NFD').replace(/[\u0300-\u036F]/g, '').normalize('NFC').toLowerCase().replace(/ς/g, 'σ');
  const out = [];
  for (let n = Math.min(4, plain.length); n >= 1; n--) out.push(plain.slice(0, n));
  out.push('_');
  return out;
}

export function shardPrefix(lexemeId) {
  const lemma = lexemeId.split(':').slice(2).join(':').replace(/#\d+$/, '');
  const plain = lemma.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase().replace(/ς/g, 'σ');
  return plain.slice(0, 2) || '_';
}

/** Every passage text of a work, in order, with its division id. */
export function workPassages(work) {
  const out = [];
  const walk = (ds) => {
    for (const d of ds) {
      for (const p of d.passages) out.push({ divId: d.id, text: p.text });
      if (d.children) walk(d.children);
    }
  };
  walk(work.divisions);
  return out;
}

// --- compact bundle encoding (mirror of src/lexis/compact.ts) ---------------
export function isCompact(x) {
  return typeof x === 'object' && x !== null && x.v === 2 && Array.isArray(x.lx);
}

export function decodeWorkLexis(c) {
  if (!isCompact(c)) return c;
  const forms = {};
  for (const key of Object.keys(c.forms)) {
    const flat = c.forms[key];
    const out = [];
    for (let i = 0; i + 2 < flat.length; i += 3) {
      const conf = flat[i + 2];
      out.push(conf === 100 ? [c.lx[flat[i]], c.mo[flat[i + 1]]] : [c.lx[flat[i]], c.mo[flat[i + 1]], conf / 100]);
    }
    forms[key] = out;
  }
  return { workId: c.workId, lang: c.lang, tokens: c.tokens, recognized: c.recognized, analysis: c.analysis, forms, lexemes: c.lexemes };
}

export function encodeWorkLexis(b) {
  if (isCompact(b)) return b;
  const lx = [], mo = [];
  const lxIdx = new Map(), moIdx = new Map();
  const intern = (list, idx, s) => { let i = idx.get(s); if (i === undefined) { i = list.length; list.push(s); idx.set(s, i); } return i; };
  const forms = {};
  for (const key of Object.keys(b.forms)) {
    const flat = [];
    for (const r of b.forms[key]) flat.push(intern(lx, lxIdx, r[0]), intern(mo, moIdx, r[1]), Math.round((r[2] ?? 1) * 100));
    forms[key] = flat;
  }
  return { v: 2, workId: b.workId, lang: b.lang, tokens: b.tokens, recognized: b.recognized, analysis: b.analysis, lexemes: b.lexemes, lx, mo, forms };
}

/** Read a bundle file in either encoding, decoded to the in-memory shape. */
export function readWorkLexis(path) {
  return decodeWorkLexis(JSON.parse(readFileSync(path, 'utf8')));
}
