#!/usr/bin/env node
// Self-check for every data/lexis bundle against src/lexis/types.ts's shapes and docs/LEXIS-PLAN.md
// §3's rules, generic over language (run after any build-<lang>.mjs + build-manifest.mjs).
// Checks:
//   1. every Reading's lexeme id exists in that bundle's own `lexemes`
//   2. every morph tag is from the plan's vocabulary (or is one of the documented misc tags)
//   3. confidence is in (0, 1]
//   4. every WorkLexis.forms KEY equals looseKey() of itself (keys are already-loose)
//   5. every lexeme id referenced by any bundle resolves to an entry in some lex/<lang> shard
// Exits non-zero (and prints every violation, capped) on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeWorkLexis, looseKey } from '../lib.mjs';
import { shardPrefixOfFile } from './shard-writer.mjs';
import { plainLemma } from './shard-writer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const lexisDir = path.join(root, 'data', 'lexis');
const worksDir = path.join(lexisDir, 'works');
const lexDir = path.join(lexisDir, 'lex');
const manifestPath = path.join(lexisDir, 'manifest.json');

const POS = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'part', 'num', 'interj', 'art', 'name', 'other']);
const TAGS = new Set([
  'nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc', // case
  'sg', 'pl', 'du', // number
  'm', 'f', 'n', // gender
  '1', '2', '3', // person
  'pres', 'impf', 'fut', 'aor', 'perf', 'plup', 'futperf', // tense
  'ind', 'subj', 'opt', 'imp', 'inf', 'ptcp', 'ger', 'gdv', 'sup', // mood
  'act', 'mid', 'pass', 'mp', // voice
  'comp', // degree (sup is shared with mood's supine)
  'indecl', 'encl', // misc
]);

let errors = 0;
const report = (msg) => {
  errors++;
  if (errors <= 200) console.error('FAIL:', msg);
};

// plan §3: "pos first, then features" — Reading[1]'s FIRST token is one of the pos words (the
// same closed set CoreLexeme.pos uses), everything after it is a feature tag. Fixed per the
// coordinator: the vocabulary previously lacked the pos words entirely, so every morph string
// failed this check on all three languages.
function checkMorph(morph, where) {
  if (morph === '') return; // tolerated for backward compatibility; current builds always emit at least the pos
  const tags = morph.split(' ');
  if (!POS.has(tags[0])) report(`${where}: morph "${morph}" must start with a pos tag (${[...POS].join('|')}), got "${tags[0]}"`);
  for (const tag of tags.slice(1)) {
    if (!tag) {
      report(`${where}: empty tag in morph "${morph}"`);
      continue;
    }
    if (!TAGS.has(tag)) report(`${where}: unrecognised morph tag "${tag}" in "${morph}" (not in docs/LEXIS-PLAN.md §3's vocabulary)`);
  }
}

if (!fs.existsSync(worksDir)) {
  console.error(`no ${path.relative(root, worksDir)} directory — nothing to check.`);
  process.exit(1);
}

// index every lexeme id that resolves in some lex/<lang> shard, keyed by "<lang>|<prefix>" (the
// shard's own filename minus .json — this IS the manifest's lex_shards key, per build-manifest.mjs)
// so the longest-prefix check below can verify not just "some shard has it" but "the EXACT shard
// the client's own resolution algorithm would land on has it".
const shardIds = new Map(); // lang -> Set<id>  (kept for the summary line's entry counts)
const shardEntriesByLangPrefix = new Map(); // "lang|prefix" -> Set<id>
if (fs.existsSync(lexDir)) {
  for (const lang of fs.readdirSync(lexDir)) {
    const langDir = path.join(lexDir, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    const ids = new Set();
    for (const file of fs.readdirSync(langDir)) {
      if (!file.endsWith('.json')) continue;
      const prefix = shardPrefixOfFile(file); // reserved-name stems (aux_.json) map back to their prefix
      const shard = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8'));
      const prefixIds = new Set();
      for (const [id, entry] of Object.entries(shard)) {
        ids.add(id);
        prefixIds.add(id);
        if (entry.id !== id) report(`lex/${lang}/${file}: entry keyed "${id}" has mismatched .id "${entry.id}"`);
        if (!POS.has(entry.pos)) report(`lex/${lang}/${file}: entry "${id}" has invalid pos "${entry.pos}"`);
      }
      shardEntriesByLangPrefix.set(`${lang}|${prefix}`, prefixIds);
    }
    shardIds.set(lang, ids);
  }
}

// coordinator fix: the client resolves a lexeme's shard by trying its plain-lemma prefix at
// lengths 4, 3, 2, 1, then "_", taking the FIRST length that is a key in the manifest's
// lex_shards for that language — never "some shard somewhere contains it". Replays that exact
// algorithm and asserts the shard it lands on genuinely contains the id.
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch {
  manifest = undefined;
}
function resolveShardPrefix(lang, lexemeId) {
  const shards = manifest?.languages?.[lang]?.lex_shards;
  if (!shards) return undefined;
  const plain = plainLemma(lexemeId);
  for (const len of [4, 3, 2, 1]) {
    const p = plain.slice(0, len);
    if (p && Object.prototype.hasOwnProperty.call(shards, p)) return p;
  }
  return Object.prototype.hasOwnProperty.call(shards, '_') ? '_' : undefined;
}
function checkLongestPrefixResolution(lang, lexemeId, where) {
  if (!manifest) {
    report(`${where}: no manifest.json to check longest-prefix resolution against`);
    return;
  }
  const prefix = resolveShardPrefix(lang, lexemeId);
  if (!prefix) {
    report(`${where}: lexeme id "${lexemeId}" — no manifest lex_shards prefix (4/3/2/1/"_") resolves for lang "${lang}"`);
    return;
  }
  const set = shardEntriesByLangPrefix.get(`${lang}|${prefix}`);
  if (!set || !set.has(lexemeId)) {
    report(`${where}: lexeme id "${lexemeId}" — longest-prefix resolution picks manifest prefix "${prefix}" (lex/${lang}/${manifest.languages[lang].lex_shards[prefix]}), which does not contain this entry`);
  }
}

let workCount = 0;
let totalForms = 0;
let totalReadings = 0;
for (const file of fs.readdirSync(worksDir)) {
  if (!file.endsWith('.json')) continue;
  workCount++;
  const bundle = decodeWorkLexis(JSON.parse(fs.readFileSync(path.join(worksDir, file), 'utf8')));
  const { workId, lang, forms, lexemes } = bundle;
  const where0 = `works/${file}`;
  if (!workId || !lang || !forms || !lexemes) {
    report(`${where0}: missing required top-level field(s)`);
    continue;
  }
  for (const [key, readings] of Object.entries(forms)) {
    totalForms++;
    const where = `${where0} forms["${key}"]`;
    if (looseKey(key, lang) !== key) report(`${where}: key is not its own looseKey() (looseKey gives "${looseKey(key, lang)}")`);
    if (!Array.isArray(readings) || !readings.length) {
      report(`${where}: readings must be a non-empty array`);
      continue;
    }
    const seen = new Set();
    for (const r of readings) {
      totalReadings++;
      const [lexemeId, morph, confidence] = r;
      const dedupeKey = `${lexemeId}|${morph}`;
      if (seen.has(dedupeKey)) report(`${where}: duplicate (lexeme id, morph) pair "${dedupeKey}" — Readings must be deduplicated`);
      seen.add(dedupeKey);
      if (!lexemes[lexemeId]) report(`${where}: lexeme id "${lexemeId}" not in this bundle's own lexemes`);
      if (typeof morph !== 'string') report(`${where}: morph is not a string`);
      else checkMorph(morph, where);
      if (confidence !== undefined && (typeof confidence !== 'number' || confidence <= 0 || confidence > 1)) {
        report(`${where}: confidence ${confidence} out of (0,1]`);
      }
      checkLongestPrefixResolution(lang, lexemeId, where);
    }
  }
  for (const [id, lex] of Object.entries(lexemes)) {
    if (lex.id !== id) report(`${where0}: lexemes["${id}"].id is "${lex.id}"`);
    if (!POS.has(lex.pos)) report(`${where0}: lexemes["${id}"] has invalid pos "${lex.pos}"`);
    if (!lex.gloss) report(`${where0}: lexemes["${id}"] has no gloss`);
  }
}

console.log(`checked ${workCount} work bundles, ${totalForms} form keys, ${totalReadings} readings, ${[...shardIds.entries()].map(([l, s]) => `${l}:${s.size} lexicon entries`).join(', ')}.`);
if (errors) {
  console.error(`${errors} problem(s) found.`);
  process.exit(1);
}
console.log('All checks passed.');
