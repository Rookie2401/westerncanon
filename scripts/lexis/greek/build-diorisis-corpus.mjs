// One pass over the whole Diorisis corpus (820 files, ~2.5 GB unzipped, ~10.2M word tokens).
// Builds and caches (scripts/lexis/raw/, gitignored, re-runnable):
//   diorisis-match.json        workId -> {tlgAuthor, tlgId, file, words, lemmatized} (+ unmatched lists)
//   diorisis-forms.json        corpus-wide form index: looseKey -> [[lemma,pos,tags,count,dialect],...] (top 15)
//   diorisis-work/<workId>.json  that work's own Diorisis file's form index (same shape), for every
//                                 matched work — the "attested in this work" (1.0) tier
// Run: node scripts/lexis/greek/build-diorisis-corpus.mjs [--diorisis <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFileIndex, mergeFileIndex, parseDiorisisHeader } from './diorisis.mjs';
import { listGreekWorks } from './match-works.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dataDir = path.join(root, 'data');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
const workCacheDir = path.join(rawDir, 'diorisis-work');
fs.mkdirSync(workCacheDir, { recursive: true });

const argDir = process.argv.includes('--diorisis') ? process.argv[process.argv.indexOf('--diorisis') + 1] : null;
const diorisisDir = argDir ?? process.env.LEXIS_DIORISIS_DIR ?? 'C:/Users/CJWal/dev/_lexdata/diorisis';

const works = listGreekWorks(dataDir);
const byUrn = new Map(); // "authorNum.workNum" -> [workId,...]
for (const w of works) {
  if (!w.tlgAuthor) continue;
  const k = `${w.tlgAuthor}.${w.tlgId}`;
  if (!byUrn.has(k)) byUrn.set(k, []);
  byUrn.get(k).push(w.workId);
}

function compact(indexMap, capPerKey) {
  const out = {};
  for (const [key, combos] of indexMap) {
    const rows = [...combos.entries()]
      .map(([comboKey, count]) => {
        const [lexemeId, tags, dialect] = comboKey.split('\u0000');
        const [, pos, ...lemmaParts] = lexemeId.split(':');
        // fix batch 2: 5th element = 1 when EVERY occurrence behind this row's count came from a
        // dialect-marked Diorisis analysis (epic/doric/aeolic/ionic/poetic/homeric) — a ranking
        // signal for build-greek.mjs, never a plan-vocabulary tag (see morph-map.mjs).
        return [lemmaParts.join(':'), pos, tags, count, dialect === '1' ? 1 : 0];
      })
      .sort((a, b) => b[3] - a[3])
      .slice(0, capPerKey);
    out[key] = rows;
  }
  return out;
}

const files = fs.readdirSync(diorisisDir).filter((f) => f.endsWith('.xml'));
console.log(`Diorisis corpus: ${files.length} files from ${diorisisDir}`);

const corpusIndex = new Map();
const matched = {}; // workId -> {tlgAuthor, tlgId, file, words, lemmatized}
const matchedUrnKeys = new Set();
const fileHeaderLog = [];
let totalWords = 0;
let totalLemmatized = 0;
const t0 = Date.now();

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const xml = fs.readFileSync(path.join(diorisisDir, file), 'utf8');
  const header = parseDiorisisHeader(xml);
  const urnKey = header.tlgAuthor && header.tlgId ? `${header.tlgAuthor}.${header.tlgId}` : null;
  const { index, stats } = buildFileIndex(xml);
  totalWords += stats.words;
  totalLemmatized += stats.lemmatized;
  fileHeaderLog.push({ file, tlgAuthor: header.tlgAuthor, tlgId: header.tlgId, words: stats.words });
  mergeFileIndex(corpusIndex, index);
  const workIds = urnKey ? byUrn.get(urnKey) : null;
  if (workIds && workIds.length) {
    matchedUrnKeys.add(urnKey);
    const compacted = compact(index, 15);
    for (const workId of workIds) {
      matched[workId] = { tlgAuthor: header.tlgAuthor, tlgId: header.tlgId, file, words: stats.words, lemmatized: stats.lemmatized };
      fs.writeFileSync(path.join(workCacheDir, `${workId}.json`), JSON.stringify(compacted));
    }
  }
  if ((i + 1) % 100 === 0 || i === files.length - 1) {
    console.log(`  [${i + 1}/${files.length}] ${file} (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed, ${totalWords} words so far)`);
  }
}

const unmatchedWorks = works.filter((w) => !matched[w.workId]).map((w) => ({ workId: w.workId, tlgAuthor: w.tlgAuthor, tlgId: w.tlgId }));
const unmatchedDiorisisFiles = fileHeaderLog.filter((f) => f.tlgAuthor && f.tlgId && !matchedUrnKeys.has(`${f.tlgAuthor}.${f.tlgId}`)).length;

fs.writeFileSync(path.join(rawDir, 'diorisis-match.json'), JSON.stringify({ matched, unmatchedWorks, totalGreekWorks: works.length, diorisisFiles: files.length, unmatchedDiorisisFiles }, null, 2));

const t1 = Date.now();
console.log(`Corpus parse: ${totalWords} words, ${totalLemmatized} lemmatized (${((100 * totalLemmatized) / totalWords).toFixed(1)}%), ${corpusIndex.size} unique surface forms, ${((t1 - t0) / 1000).toFixed(0)}s`);
console.log(`Matched ${Object.keys(matched).length}/${works.length} works (${unmatchedWorks.length} unmatched).`);

console.log('Compacting corpus-wide index...');
const compactCorpus = compact(corpusIndex, 15);
fs.writeFileSync(path.join(rawDir, 'diorisis-forms.json'), JSON.stringify(compactCorpus));
console.log(`Wrote diorisis-forms.json (${Object.keys(compactCorpus).length} keys) in ${((Date.now() - t1) / 1000).toFixed(0)}s`);
