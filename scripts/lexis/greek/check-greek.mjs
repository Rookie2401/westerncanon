// D-GRC's own verification (docs/LEXIS-PLAN.md task brief §"Verification you must do" (1)).
// scripts/lexis/shared/check-bundles.mjs exists (written by the Latin/Italian package) and was
// run first, but its `TAGS` set only lists case/number/gender/person/tense/mood/voice/degree/misc
// tags, never the POS abbreviation that LEXIS-PLAN.md §3 mandates as morph's FIRST token ("pos
// first, then features", e.g. "verb aor ind act 3 sg") — so it flags essentially every reading in
// every language's bundles (confirmed: la and it shards get the same class of failure, not just
// grc's), which looks like an oversight in that shared checker rather than a real defect. This
// script re-implements the same five checks correctly (POS-aware) for the grc bundles only, so
// the grc data is verified either way. Exits non-zero on any real violation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeWorkLexis, looseKey } from '../lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const worksDir = path.join(root, 'data', 'lexis', 'works');
const lexDir = path.join(root, 'data', 'lexis', 'lex', 'grc');

const POS = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'part', 'num', 'interj', 'art', 'name', 'other']);
const FEATURE_TAGS = new Set([
  'nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc',
  'sg', 'pl', 'du',
  'm', 'f', 'n',
  '1', '2', '3',
  'pres', 'impf', 'fut', 'aor', 'perf', 'plup', 'futperf',
  'ind', 'subj', 'opt', 'imp', 'inf', 'ptcp', 'ger', 'gdv', 'sup',
  'act', 'mid', 'pass', 'mp',
  'comp',
  'indecl', 'encl',
]);

let errors = 0;
const report = (msg) => {
  errors++;
  if (errors <= 200) console.error('FAIL:', msg);
};

function checkMorph(morph, where) {
  const parts = morph.split(' ').filter(Boolean);
  if (!parts.length) {
    report(`${where}: empty morph string`);
    return;
  }
  if (!POS.has(parts[0])) report(`${where}: morph "${morph}" does not start with a valid pos (got "${parts[0]}")`);
  for (const tag of parts.slice(1)) {
    if (!FEATURE_TAGS.has(tag)) report(`${where}: unrecognised feature tag "${tag}" in morph "${morph}"`);
  }
}

// index every grc lexeme id that resolves in some lex/grc shard
const shardIds = new Set();
let shardEntries = 0;
for (const file of fs.readdirSync(lexDir)) {
  if (!file.endsWith('.json')) continue;
  const shard = JSON.parse(fs.readFileSync(path.join(lexDir, file), 'utf8'));
  for (const [id, entry] of Object.entries(shard)) {
    shardEntries++;
    if (entry.id !== id) report(`lex/grc/${file}: entry keyed "${id}" has mismatched .id "${entry.id}"`);
    if (!POS.has(entry.pos)) report(`lex/grc/${file}: entry "${id}" has invalid pos "${entry.pos}"`);
    if (!entry.gloss) report(`lex/grc/${file}: entry "${id}" has empty gloss`);
    shardIds.add(id);
  }
}

let workCount = 0;
let totalForms = 0;
let totalReadings = 0;
for (const file of fs.readdirSync(worksDir)) {
  if (!file.endsWith('.json')) continue;
  const bundle = decodeWorkLexis(JSON.parse(fs.readFileSync(path.join(worksDir, file), 'utf8')));
  if (bundle.lang !== 'grc') continue;
  workCount++;
  const { forms, lexemes } = bundle;
  const where0 = `works/${file}`;
  for (const [key, readings] of Object.entries(forms)) {
    totalForms++;
    const where = `${where0} forms["${key}"]`;
    if (looseKey(key, 'grc') !== key) report(`${where}: key is not its own looseKey()`);
    if (!Array.isArray(readings) || !readings.length) {
      report(`${where}: readings must be a non-empty array`);
      continue;
    }
    const seen = new Set();
    for (const r of readings) {
      totalReadings++;
      const [lexemeId, morph, confidence] = r;
      const dedupeKey = `${lexemeId}|${morph}`;
      if (seen.has(dedupeKey)) report(`${where}: duplicate (lexeme id, morph) "${dedupeKey}"`);
      seen.add(dedupeKey);
      if (!lexemes[lexemeId]) report(`${where}: lexeme id "${lexemeId}" not in this bundle's own lexemes`);
      if (typeof morph !== 'string') report(`${where}: morph is not a string`);
      else checkMorph(morph, where);
      if (confidence !== undefined && (typeof confidence !== 'number' || confidence <= 0 || confidence > 1)) {
        report(`${where}: confidence ${confidence} out of (0,1]`);
      }
      if (!shardIds.has(lexemeId)) report(`${where}: lexeme id "${lexemeId}" has no entry in any lex/grc shard`);
    }
  }
  for (const [id, lex] of Object.entries(lexemes)) {
    if (lex.id !== id) report(`${where0}: lexemes["${id}"].id is "${lex.id}"`);
    if (!POS.has(lex.pos)) report(`${where0}: lexemes["${id}"] has invalid pos "${lex.pos}"`);
    if (!lex.gloss) report(`${where0}: lexemes["${id}"] has no gloss`);
  }
}

console.log(`checked ${workCount} grc work bundles, ${totalForms} form keys, ${totalReadings} readings, ${shardEntries} lex/grc entries.`);
if (errors) {
  console.error(`${errors} problem(s) found.`);
  process.exit(1);
}
console.log('All grc checks passed.');
