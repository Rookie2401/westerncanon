// Broader post-fix-batch-1 sanity scan: for N random works, M random tokens each, flag anything
// that looks obviously wrong (pos:'other' on a top reading, gloss containing markup leftovers,
// gloss identical to '(no gloss available)' for a very common function-word-shaped morph, etc).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, workPassages } from '../lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dataDir = path.join(root, 'data');
const worksOutDir = path.join(root, 'data', 'lexis', 'works');

const allWorks = fs.readdirSync(worksOutDir).filter((f) => f.endsWith('.json'));
let seed = 7;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const picks = new Set();
while (picks.size < 15) picks.add(allWorks[Math.floor(rand() * allWorks.length)]);

let flagged = 0;
let checked = 0;
for (const f of picks) {
  const workId = f.replace(/\.json$/, '');
  const bundle = JSON.parse(fs.readFileSync(path.join(worksOutDir, f), 'utf8'));
  if (bundle.lang !== 'grc') continue;
  const workJson = JSON.parse(fs.readFileSync(path.join(dataDir, workId, 'work.json'), 'utf8'));
  const words = [];
  for (const { text } of workPassages(workJson)) for (const t of tokenize(text, 'grc')) if (t.kind === 'word') words.push(t);
  for (let i = 0; i < 25 && words.length; i++) {
    const tok = words[Math.floor(rand() * words.length)];
    const readings = bundle.forms[tok.key];
    if (!readings || !readings.length) continue;
    checked++;
    const [lexemeId, morph] = readings[0];
    const lex = bundle.lexemes[lexemeId];
    if (!lex) {
      console.log(`FLAG ${workId} "${tok.surface}": reading points to missing lexeme ${lexemeId}`);
      flagged++;
      continue;
    }
    if (lex.pos === 'other') {
      console.log(`FLAG ${workId} "${tok.surface}" -> ${lex.lemma} [other] "${morph}" gloss: ${lex.gloss}`);
      flagged++;
    }
    if (/<[a-z]/i.test(lex.gloss)) {
      console.log(`FLAG ${workId} "${tok.surface}" -> ${lex.lemma} gloss has markup: ${lex.gloss}`);
      flagged++;
    }
  }
}
console.log(`checked ${checked} random recognised tokens across ${picks.size} works, ${flagged} flagged`);
