// Prints 5 random Greek tokens (with their top reading + gloss) from each of 8 works, for the
// orchestrator's hand spot-check (LEXIS-PLAN.md verification item 2). Deterministic seed so the
// same sample reproduces.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, workPassages } from '../lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dataDir = path.join(root, 'data');
const worksOutDir = path.join(root, 'data', 'lexis', 'works');

const WORKS = [
  ['aeschylus-agamemnon-grc', 'drama'],
  ['thucydides-history-grc', 'prose/history'],
  ['euclid-elements', 'mathematics'],
  ['plutarch-aemilius-paulus-grc', 'biography'],
  ['jewish-antiquities-grc', 'Hellenistic-Jewish history'],
  ['iliad-grc', 'epic'],
  ['plato-republic-grc', 'philosophy'],
  ['posterior-analytics-grc', 'Aristotle (Wikisource import, unmatched to Diorisis)'],
];

let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

const lines = [];
for (const [workId, label] of WORKS) {
  const workJson = JSON.parse(fs.readFileSync(path.join(dataDir, workId, 'work.json'), 'utf8'));
  const bundle = JSON.parse(fs.readFileSync(path.join(worksOutDir, `${workId}.json`), 'utf8'));
  const passages = workPassages(workJson);
  const words = [];
  for (const { text } of passages) for (const t of tokenize(text, 'grc')) if (t.kind === 'word') words.push(t);
  lines.push(`\n### ${workId} (${label}) — ${words.length} tokens, ${bundle.recognized}/${bundle.tokens} recognized`);
  const picks = new Set();
  while (picks.size < 5 && picks.size < words.length) picks.add(Math.floor(rand() * words.length));
  for (const i of [...picks].sort((a, b) => a - b)) {
    const tok = words[i];
    const readings = bundle.forms[tok.key];
    if (!readings || !readings.length) {
      lines.push(`- "${tok.surface}" (key "${tok.key}") — NO READING`);
      continue;
    }
    const [lexemeId, morph, conf] = readings[0];
    const lex = bundle.lexemes[lexemeId];
    lines.push(`- "${tok.surface}" -> ${lex.lemma} [${lex.pos}] "${morph}" (conf ${conf ?? 1}) — gloss: ${lex.gloss} (src: ${lex.src ?? '?'})`);
  }
}
console.log(lines.join('\n'));
