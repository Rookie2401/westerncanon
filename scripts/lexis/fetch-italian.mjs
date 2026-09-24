#!/usr/bin/env node
// Streams kaikki.org's Italian Wiktionary extract (CC BY-SA, ~760 MB JSONL) ONCE and keeps only
// the lines relevant to data/dante-vita-nuova-it (~3k unique forms): an entry whose `word` or any
// `forms[].form` is in the work's key set, plus the un-elided article/preposition for elided
// tokens like "l'", "dell'" (scripts/lexis/shared/italian-elision.mjs). Modelled on
// C:\Users\CJWal\dev\romance-v0\scripts\fetch-dictionary.mjs's streamed/resumable download
// pattern, but filters as it streams instead of writing the whole 763 MB to disk (never read or
// stored whole — only the small matched subset is written to scripts/lexis/raw/).
import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { tokenize, workPassages } from './lib.mjs';
import { ELISION_MAP } from './shared/italian-elision.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rawDir = path.join(root, 'scripts', 'lexis', 'raw');
mkdirSync(rawDir, { recursive: true });

const URL_ = 'https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl';
const USER_AGENT = 'summa-app lexis fetch (https://github.com/Rookie2401/westerncanon; contact: cjwalker117@outlook.com)';
const outPath = path.join(rawDir, 'kaikki-it-filtered.json');
const markerPath = `${outPath}.complete`;

if (existsSync(outPath) && existsSync(markerPath)) {
  console.log(`${path.basename(outPath)}: already complete (${statSync(outPath).size} bytes) — skipping. Delete the file + .complete marker to refetch.`);
  process.exit(0);
}

// ---- the work's key set (data/dante-vita-nuova-it is the whole Italian package's corpus) --------
const workId = 'dante-vita-nuova-it';
const work = JSON.parse(readFileSync(path.join(root, 'data', workId, 'work.json'), 'utf8'));
const passages = workPassages({ divisions: work.divisions });
const keys = new Set();
for (const { text } of passages) {
  for (const t of tokenize(text, 'it')) if (t.kind === 'word') keys.add(t.key);
}
console.log(`${workId}: ${keys.size} unique loose keys to search for.`);

const searchTerms = new Set(keys);
for (const key of keys) {
  const mapped = ELISION_MAP[key];
  if (mapped) for (const m of mapped) searchTerms.add(m);
}
console.log(`search terms (incl. un-elided candidates): ${searchTerms.size}`);

// kaikki's Italian forms carry pedagogical stress marks even on syllables standard orthography
// never accents (dare -> "dàre", do -> "dò", detti -> "détti") — matching must be accent-blind
// on this side, or every such form is silently missed. Genuinely accented Italian (è, città,
// perché) survives this fine since it is stripped identically on both sides. Only applied to
// search terms of 4+ letters: shorter ones (a, e, i, la, che, non, …) are exactly the common
// function words where an accent-blind match starts pulling in unrelated kaikki entries whose
// OWN conjugation/agreement table happens to contain that short string for a different word
// entirely (confirmed empirically: enabling it for all lengths ballooned matches 4168 -> 18546
// for only ~50 extra distinct terms recovered). build-italian.mjs still prefers an exact match
// over a stripped one whenever both exist.
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
const searchTermsStripped = new Set([...searchTerms].filter((t) => t.length >= 4).map(stripAccents));

async function main() {
  let attempt = 0;
  while (true) {
    try {
      await streamFilter();
      break;
    } catch (err) {
      attempt++;
      if (attempt > 5) throw err;
      const backoff = Math.min(30000, 2000 * 2 ** attempt);
      console.log(`stream error (${err.message}), retrying in ${backoff}ms (attempt ${attempt}/5)…`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

async function streamFilter() {
  const res = await fetch(URL_, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/html')) throw new Error(`GET returned content-type ${ct} (looks like an error page)`);

  const rl = readline.createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  const matched = [];
  let lines = 0;
  let matchedCount = 0;
  const t0 = Date.now();
  for await (const line of rl) {
    lines++;
    if (!line) continue;
    // cheap pre-filter before JSON.parse: the line must at least contain one search term's text
    // (a coarse substring test — false positives are filtered precisely below, false negatives
    // are impossible since "word":"X" always contains X verbatim)
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a malformed line is skipped, not fatal to the whole stream
    }
    if (entry.lang_code !== 'it' && entry.lang !== 'Italian') continue;
    const word = (entry.word ?? '').toLowerCase();
    let hit = searchTerms.has(word) || searchTermsStripped.has(stripAccents(word));
    if (!hit && Array.isArray(entry.forms)) {
      for (const f of entry.forms) {
        if (!f?.form) continue;
        // "auxiliary" isn't an inflected form of THIS entry at all — it's metadata naming which
        // helper verb (avere/essere) the verb takes in compound tenses, and kaikki repeats it on
        // nearly every Italian verb's own forms[] table. Matching on it would make almost every
        // verb entry in the whole dictionary "match" our search terms "avere"/"essere" (confirmed:
        // it alone was responsible for 11k+ of an earlier 18k-entry over-match).
        if (f.tags?.includes('auxiliary')) continue;
        const fl = f.form.toLowerCase();
        if (searchTerms.has(fl) || searchTermsStripped.has(stripAccents(fl))) {
          hit = true;
          break;
        }
      }
    }
    if (!hit) continue;
    matchedCount++;
    matched.push(entry);
    if (lines % 500000 === 0) console.log(`  …${lines} lines scanned (${((Date.now() - t0) / 1000).toFixed(0)}s), ${matchedCount} matched so far`);
  }
  console.log(`scanned ${lines} lines, matched ${matchedCount} entries in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  const tmp = `${outPath}.part`;
  writeFileSync(tmp, JSON.stringify(matched));
  renameSync(tmp, outPath);
  writeFileSync(markerPath, '');
  console.log(`${path.basename(outPath)}: done (${statSync(outPath).size} bytes, ${matched.length} entries).`);

  // which search terms matched nothing at all (as a `word` or a `forms[].form`)? — logged for
  // build-italian.mjs / REPORT, not fatal
  const foundExact = new Set();
  const foundStripped = new Set();
  for (const e of matched) {
    if (e.word) {
      foundExact.add(e.word.toLowerCase());
      foundStripped.add(stripAccents(e.word.toLowerCase()));
    }
    if (Array.isArray(e.forms)) {
      for (const f of e.forms) {
        if (!f?.form || f.tags?.includes('auxiliary')) continue;
        foundExact.add(f.form.toLowerCase());
        foundStripped.add(stripAccents(f.form.toLowerCase()));
      }
    }
  }
  const missing = [...searchTerms].filter((t) => !foundExact.has(t) && !(t.length >= 4 && foundStripped.has(stripAccents(t))));
  writeFileSync(path.join(rawDir, 'kaikki-it-missing-terms.json'), JSON.stringify(missing, null, 1));
  console.log(`search terms with no match at all: ${missing.length}/${searchTerms.size} (written to kaikki-it-missing-terms.json).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
