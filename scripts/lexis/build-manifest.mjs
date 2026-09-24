#!/usr/bin/env node
// Regenerates data/lexis/manifest.json from whatever exists under data/lexis (docs/LEXIS-PLAN.md
// §5: "owned by D-LA/IT, callable by everyone"). Generic over language: reads every
// data/lexis/works/*.json bundle and every data/lexis/lex/<lang>/*.json shard directory, so the
// Greek package (D-GRC) can run this same script once its own files exist — nothing here is
// Latin/Italian-specific.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeWorkLexis } from './lib.mjs';
import { shardPrefixOfFile } from './shared/shard-writer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lexisDir = path.join(root, 'data', 'lexis');
const worksDir = path.join(lexisDir, 'works');
const lexDir = path.join(lexisDir, 'lex');

// Coordinator fix batch 1/2: this table must reflect what a package ACTUALLY used, not an
// assumption of what it might use — the grc row previously claimed "LSJ / Middle Liddell", but
// Middle Liddell turned out unavailable to the Greek package and was never built (see
// REPORT-greek.md's own source table, which this mirrors). Each package documents its own sources
// here since the manifest has no other structured place to read them from; update this table
// alongside a package's own REPORT-<lang>.md when its source list changes.
const SOURCES = {
  la: [
    { name: 'kaikki.org Latin Wiktionary extract (primary analyser + dictionary)', license: 'CC BY-SA', url: 'https://kaikki.org/dictionary/Latin/' },
    { name: "Whitaker's Words (fallback analyser, gated to kaikki/L&S-known lemmas)", license: 'MIT', url: 'https://github.com/mk270/whitakers-words' },
    { name: 'Lewis & Short, A Latin Dictionary (Perseus TEI; html article + gloss fallback)', license: 'public domain text; TEI transcription CC BY-SA 4.0', url: 'https://github.com/PerseusDL/lexica' },
  ],
  it: [{ name: 'kaikki.org Italian Wiktionary extract', license: 'CC BY-SA', url: 'https://kaikki.org/dictionary/Italian/' }],
  grc: [
    { name: 'LSJ (Perseus TEI)', license: 'CC BY-SA 4.0', url: 'https://github.com/PerseusDL/lexica' },
    { name: 'kaikki.org Ancient Greek Wiktionary extract', license: 'CC BY-SA', url: 'https://kaikki.org/dictionary/AncientGreek/' },
    { name: 'Diorisis Ancient Greek Corpus (token-level lemma/POS/morphology)', license: 'CC BY-SA 3.0 US (per licence embedded in each file)', url: 'https://doi.org/10.6084/m9.figshare.6187256' },
  ],
};

fs.mkdirSync(worksDir, { recursive: true });

const works = {};
const langStats = {}; // lang -> { tokens, recognized, lexemeIds: Set, works: number }

if (fs.existsSync(worksDir)) {
  for (const file of fs.readdirSync(worksDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const full = path.join(worksDir, file);
    let bundle;
    try {
      bundle = decodeWorkLexis(JSON.parse(fs.readFileSync(full, 'utf8')));
    } catch (e) {
      console.warn(`skipping unreadable bundle ${file}: ${e.message}`);
      continue;
    }
    const { workId, lang, tokens, recognized, forms } = bundle;
    if (!workId || !lang) {
      console.warn(`skipping ${file}: missing workId/lang`);
      continue;
    }
    const formsCount = Object.keys(forms ?? {}).length;
    works[workId] = { file, lang, tokens: tokens ?? 0, recognized: recognized ?? 0, forms: formsCount };
    const s = (langStats[lang] ??= { tokens: 0, recognized: 0, works: 0, lexemeIds: new Set() });
    s.tokens += tokens ?? 0;
    s.recognized += recognized ?? 0;
    s.works += 1;
    for (const id of Object.keys(bundle.lexemes ?? {})) s.lexemeIds.add(id);
  }
}

const languages = {};
if (fs.existsSync(lexDir)) {
  for (const lang of fs.readdirSync(lexDir).sort()) {
    const langLexDir = path.join(lexDir, lang);
    if (!fs.statSync(langLexDir).isDirectory()) continue;
    const lex_shards = {};
    let lexemeCount = 0;
    for (const file of fs.readdirSync(langLexDir).sort()) {
      if (!file.endsWith('.json')) continue;
      const prefix = shardPrefixOfFile(file);
      lex_shards[prefix] = file;
      try {
        const shard = JSON.parse(fs.readFileSync(path.join(langLexDir, file), 'utf8'));
        lexemeCount += Object.keys(shard).length;
      } catch (e) {
        console.warn(`unreadable shard ${lang}/${file}: ${e.message}`);
      }
    }
    const s = langStats[lang];
    languages[lang] = {
      lexemes: lexemeCount,
      works: s?.works ?? 0,
      coverage: s && s.tokens ? s.recognized / s.tokens : 0,
      sources: SOURCES[lang] ?? [],
      lex_shards,
    };
  }
}
// a language might have work bundles but (not yet, or never) a lex dir — still report it
for (const [lang, s] of Object.entries(langStats)) {
  if (languages[lang]) continue;
  languages[lang] = { lexemes: 0, works: s.works, coverage: s.tokens ? s.recognized / s.tokens : 0, sources: SOURCES[lang] ?? [], lex_shards: {} };
}

const manifest = {
  version: 1,
  built_at: new Date().toISOString(),
  languages,
  works,
};
fs.writeFileSync(path.join(lexisDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`manifest.json: ${Object.keys(works).length} works, languages: ${Object.entries(languages).map(([l, v]) => `${l}(${v.works}w/${v.lexemes}lex/${(100 * v.coverage).toFixed(1)}%)`).join(', ')}`);
