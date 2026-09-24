#!/usr/bin/env node
// Streams the kaikki.org Latin Wiktionary extract ONCE and keeps only entries relevant to the
// Lexis Latin corpus's ~108k unique loose keys: an entry whose `word` or any `forms[].form` is,
// after stripping macrons/breves (kaikki always marks vowel length; the corpus text never does)
// and trying both v/u spellings, one of our keys. Reads the file straight off disk — the
// coordinator confirmed a copy is already local at romance-v0's own dictionary cache — so this
// never downloads or re-reads the 1.2 GB file whole; scripts/lexis/raw/kaikki-la-filtered.json
// (the small matched subset) is the only thing written under this package's control.
import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync, renameSync, createReadStream, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { tokenize, workPassages } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = path.join(root, 'data');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
mkdirSync(rawDir, { recursive: true });

const SOURCE_PATH = 'C:\\Users\\CJWal\\dev\\romance-v0\\data\\dict\\kaikki-la.jsonl';
const outPath = path.join(rawDir, 'kaikki-la-filtered.json');
const markerPath = `${outPath}.complete`;

if (existsSync(outPath) && existsSync(markerPath)) {
  console.log(`${path.basename(outPath)}: already complete (${statSync(outPath).size} bytes) — skipping. Delete the file + .complete marker to refetch.`);
  process.exit(0);
}
if (!existsSync(SOURCE_PATH)) {
  console.error(`Source not found: ${SOURCE_PATH}`);
  process.exit(1);
}

const stripMacrons = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');

const LATIN_WORKS_DIR = dataDir;
const LATIN_WORKS = readdirSync(LATIN_WORKS_DIR).filter((d) => /-la$/.test(d) && existsSync(path.join(LATIN_WORKS_DIR, d, 'work.json')));
const keys = new Set();
for (const dir of LATIN_WORKS) {
  const work = JSON.parse(readFileSync(path.join(LATIN_WORKS_DIR, dir, 'work.json'), 'utf8'));
  for (const { text } of workPassages({ divisions: work.divisions })) {
    for (const t of tokenize(text, 'la')) if (t.kind === 'word') keys.add(t.key);
  }
}
console.log(`${LATIN_WORKS.length} Latin works, ${keys.size} unique loose keys.`);

// each key, plus its v<->u spelling variant, macron-stripped already (the corpus text carries no
// macrons at all, so keys need no macron-stripping themselves — only kaikki's side does)
const searchTerms = new Set();
for (const k of keys) {
  searchTerms.add(k);
  if (k.includes('v')) searchTerms.add(k.replace(/v/g, 'u'));
  if (k.includes('u')) searchTerms.add(k.replace(/u/g, 'v'));
}
console.log(`search terms (incl. v/u variants): ${searchTerms.size}`);

async function main() {
  const matched = [];
  let lines = 0;
  let matchedCount = 0;
  const t0 = Date.now();
  const rl = readline.createInterface({ input: createReadStream(SOURCE_PATH, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    lines++;
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.lang_code !== 'la') continue;
    const word = stripMacrons((entry.word ?? '').toLowerCase());
    let hit = searchTerms.has(word);
    if (!hit && Array.isArray(entry.forms)) {
      for (const f of entry.forms) {
        if (!f?.form || f.tags?.includes('table-tags') || f.tags?.includes('inflection-template')) continue;
        const fl = stripMacrons(f.form.toLowerCase());
        if (searchTerms.has(fl)) {
          hit = true;
          break;
        }
      }
    }
    if (!hit) continue;
    matchedCount++;
    matched.push(entry);
    if (lines % 200000 === 0) console.log(`  …${lines} lines scanned (${((Date.now() - t0) / 1000).toFixed(0)}s), ${matchedCount} matched so far`);
  }
  console.log(`scanned ${lines} lines, matched ${matchedCount} entries in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  const tmp = `${outPath}.part`;
  writeFileSync(tmp, JSON.stringify(matched));
  renameSync(tmp, outPath);
  writeFileSync(markerPath, '');
  console.log(`${path.basename(outPath)}: done (${statSync(outPath).size} bytes, ${matched.length} entries).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
