// Fix-batch-1 verification: prints top reading + gloss for the coordinator's named probe words,
// looked up against the built data/lexis bundles (Republic, for the ones that occur there; a
// couple aren't in Republic so a second work is used as a fallback).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { looseKey } from '../lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const worksDir = path.join(root, 'data', 'lexis', 'works');

const PROBES = ['λόγος', 'ἦν', 'τῶν', 'ἀνθρώπων', 'εἶπεν', 'πόλις', 'πόλεως', 'ἔφη', 'γίγνεται', 'εἶναι', 'δικαιοσύνης', 'ψυχῆς', 'κάρα', 'θανεῖν', 'ὦ', 'σφαῖρα', 'κύλινδρος', 'κέντρου', 'εἴκοσι'];
const CANDIDATE_WORKS = ['plato-republic-grc', 'euclid-elements', 'iliad-grc', 'aeschylus-agamemnon-grc'];

const bundles = CANDIDATE_WORKS.map((w) => JSON.parse(fs.readFileSync(path.join(worksDir, `${w}.json`), 'utf8')));

for (const surface of PROBES) {
  const key = looseKey(surface, 'grc');
  let found = false;
  for (const b of bundles) {
    const readings = b.forms[key];
    if (!readings || !readings.length) continue;
    const [lexemeId, morph, conf] = readings[0];
    const lex = b.lexemes[lexemeId];
    console.log(`${surface} (in ${b.workId}) -> ${lex.lemma} [${lex.pos}] "${morph}" (conf ${conf ?? 1}) — gloss: ${lex.gloss} (src: ${lex.src ?? '?'})`);
    if (readings.length > 1) {
      const [id2, m2, c2] = readings[1];
      console.log(`    2nd: ${b.lexemes[id2]?.lemma} [${b.lexemes[id2]?.pos}] "${m2}" (conf ${c2 ?? 1})`);
    }
    found = true;
    break;
  }
  if (!found) console.log(`${surface} (key "${key}") — NOT FOUND in any probed work`);
}
