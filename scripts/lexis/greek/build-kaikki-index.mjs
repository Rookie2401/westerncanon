// Streams the 401 MB kaikki.org Ancient Greek Wiktionary extract (CC BY-SA, one JSON object per
// line, never read whole per LEXIS-PLAN task brief) into two caches under scripts/lexis/raw/:
//   kaikki-forms.json    looseKey -> [[lemma,pos,tags], ...]   fallback (0.7) form index
//   kaikki-gloss.json    "pos:lemma" -> firstGloss              fallback gloss source
// Run: node scripts/lexis/greek/build-kaikki-index.mjs [--file <path>]
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kaikkiLooseKey } from './greek-keys.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
fs.mkdirSync(rawDir, { recursive: true });
const argFile = process.argv.includes('--file') ? process.argv[process.argv.indexOf('--file') + 1] : null;
const kaikkiPath = argFile ?? process.env.LEXIS_KAIKKI_FILE ?? 'C:/Users/CJWal/dev/_lexdata/kaikki-grc.jsonl';

const POS_MAP = {
  noun: 'noun', verb: 'verb', adj: 'adj', name: 'name', adv: 'adv', pron: 'pron',
  num: 'num', prep: 'prep', conj: 'conj', particle: 'part', article: 'art', intj: 'interj',
  det: 'other', suffix: 'other', character: 'other', prefix: 'other', combining_form: 'other',
  phrase: 'other', symbol: 'other', contraction: 'other', postp: 'prep', proverb: 'other',
  prep_phrase: 'prep', interfix: 'other', syllable: 'other',
};
const NUMBER = { singular: 'sg', plural: 'pl', dual: 'du' };
const GENDER = { masculine: 'm', feminine: 'f', neuter: 'n' };
const CASE = { nominative: 'nom', genitive: 'gen', dative: 'dat', accusative: 'acc', vocative: 'voc' };
const PERSON = { 'first-person': '1', 'second-person': '2', 'third-person': '3' };
const MOOD = { indicative: 'ind', subjunctive: 'subj', optative: 'opt', imperative: 'imp', infinitive: 'inf', participle: 'ptcp' };
const TENSE = { aorist: 'aor', present: 'pres', imperfect: 'impf', future: 'fut', perfect: 'perf', pluperfect: 'plup' };
const DEGREE = { comparative: 'comp', superlative: 'sup' };
// meta/structural rows in `forms[]` that are not themselves an attested Greek surface form
const SKIP_FORM = new Set(['romanization', 'table-tags', 'inflection-template', 'class']);

function tagsToCombo(tags) {
  const set = new Set(tags);
  const parts = [];
  if (TENSE_of(set)) parts.push(TENSE_of(set));
  if (MOOD_of(set)) parts.push(MOOD_of(set));
  const voice = voiceOf(set);
  if (voice) parts.push(voice);
  for (const t of tags) if (PERSON[t]) parts.push(PERSON[t]);
  for (const t of tags) if (CASE[t]) parts.push(CASE[t]);
  for (const t of tags) if (NUMBER[t]) parts.push(NUMBER[t]);
  for (const t of tags) if (GENDER[t]) parts.push(GENDER[t]);
  for (const t of tags) if (DEGREE[t]) parts.push(DEGREE[t]);
  return [...new Set(parts)].join(' ');
}
function TENSE_of(set) { for (const t of set) if (TENSE[t]) return TENSE[t]; return null; }
function MOOD_of(set) { for (const t of set) if (MOOD[t]) return MOOD[t]; return null; }
function voiceOf(set) {
  const mid = set.has('middle');
  const pass = set.has('passive');
  const act = set.has('active');
  if (mid && pass) return 'mp';
  if (act) return 'act';
  if (mid) return 'mid';
  if (pass) return 'pass';
  return null;
}

const formsIndex = new Map(); // looseKey -> Map("lemma\u0000pos\u0000tags" -> true)
const glossary = new Map(); // "pos:lemma" -> gloss

let lines = 0;
let entriesWithGreekWord = 0;
const t0 = Date.now();
const rl = readline.createInterface({ input: fs.createReadStream(kaikkiPath, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  lines++;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  if (obj.lang_code !== 'grc' || !obj.word) continue;
  const lemma = obj.word.normalize('NFC');
  const pos = POS_MAP[obj.pos] ?? 'other';
  if (pos === 'other' && !POS_MAP[obj.pos]) continue; // truly unrecognised pos string (defensive; none observed)
  entriesWithGreekWord++;
  const glossKey = `${pos}:${lemma}`;
  if (!glossary.has(glossKey)) {
    const firstGloss = obj.senses?.find((s) => s.glosses?.length)?.glosses?.[0];
    if (firstGloss) glossary.set(glossKey, firstGloss);
  }
  const seenForms = new Set(); // avoid double-processing the exact same form+tags within one entry
  const addForm = (surface, tags) => {
    if (!surface) return;
    const combo = tagsToCombo(tags);
    const key = kaikkiLooseKey(surface);
    if (!/[\u0370-\u03FF\u1F00-\u1FFF]/.test(key)) return; // not Greek script (romanization etc.)
    const dedupe = `${key}\u0000${combo}`;
    if (seenForms.has(dedupe)) return;
    seenForms.add(dedupe);
    let byKey = formsIndex.get(key);
    if (!byKey) formsIndex.set(key, (byKey = new Map()));
    byKey.set(`${lemma}\u0000${pos}\u0000${combo}`, true);
  };
  addForm(lemma, []); // the headword itself is always a valid (citation-form) reading
  for (const f of obj.forms ?? []) {
    if (!f.form || (f.tags ?? []).some((t) => SKIP_FORM.has(t))) continue;
    addForm(f.form, f.tags ?? []);
  }
  if (lines % 10000 === 0) process.stdout.write(`\r  ${lines} lines (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log(`\nkaikki: ${lines} lines, ${entriesWithGreekWord} grc entries, ${formsIndex.size} unique loose keys, ${glossary.size} glosses (${((Date.now() - t0) / 1000).toFixed(0)}s)`);

const compactForms = {};
for (const [key, combos] of formsIndex) {
  compactForms[key] = [...combos.keys()].map((c) => c.split('\u0000'));
}
fs.writeFileSync(path.join(rawDir, 'kaikki-forms.json'), JSON.stringify(compactForms));
fs.writeFileSync(path.join(rawDir, 'kaikki-gloss.json'), JSON.stringify(Object.fromEntries(glossary)));
console.log('Wrote kaikki-forms.json and kaikki-gloss.json');
