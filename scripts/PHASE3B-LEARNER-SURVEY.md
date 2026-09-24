# PHASE3B-LEARNER-SURVEY.md — Feature/Architecture Inventory for a Greek/Latin Learner Edition

*Read-only survey of slovo-v0 (Russian), sefer-v0 (Hebrew), hindi-reader (Hindi), and summa-app (Western Canon), compiled 2026-09-23 by a survey agent; saved by the orchestrator.*

## 1. Reader interaction model

### slovo-v0 (Russian)
- Tap a word → `src/reader/WordPanel.tsx`, 3-level disclosure:
  - **Level 1**: surface (stress-marked when certain), transliteration, contextual gloss, lexical gloss, lemma, POS + morphological features, status picker.
  - **Level 2** ("More"): morpheme breakdown (prefix/stem/root/suffix/ending/postfix chips with role+gloss), "why this form" notes, aspect-partner link, letter strip (alphabet-curriculum tinting), construction membership, alternative readings (selectable).
  - **Level 3** ("Deeper"): full feature table, IPA + confidence, dictionary senses, frequency rank (`#N of 50,000`), encounter/lookup stats, full paradigm table (`Paradigm.tsx`), correction UI, provenance line (`source · confidence · rules vN`).
- Tokenization: `src/tokenizer/cyrillic.ts` — letter runs + combining marks are one token; hyphenated words are ONE token with a `parts` array; Latin runs and digit runs are separate token kinds; punctuation clusters collapse to one token. `normalize()` (NFC, strip stress marks) vs `looseKey()` (lower-case, ё→е, pre-reform folding) — the loose key is the dictionary lookup key. Sentence boundaries: `.!?…` + closing punctuation, next word capitalised or an opener.
- Morphology pipeline (`docs/ARCHITECTURE.md`): dictionary form-index exact hit (confidence 1) → closed-class tables → rule generation from a known lexeme (≤0.85) → ending-pattern guess (key prefixed `?`, ≤0.55, shown as guess). Sentence layer adds construction detection and a shallow dependency sketch (`src/syntax/`).

### sefer-v0 (Hebrew)
- Tap a word → `src/components/WordCard.tsx`: 3-level card — surface / meaning-here / lemma / root / one-line morphology / status; **More**: morpheme breakdown (prefixes · binyan · root · infix · endings) with sound-change notes, alternatives, agreement links, construct chains, provenance; **Deeper**: register, root family, Historical Hebrew note, personal word history, optional Claude deep-dive.
- Tokenization: `src/text/tokenize.ts` — paragraphs from lines; sentence ends at `.!?…` with abbreviation guards; tokens are runs of Hebrew letters/points + geresh/gershayim handling. `normWord` (`src/text/hebrew.ts`) strips points/cantillation for lookup.
- Morphology: rule-based analyser over a hand-written seed lexicon (`src/morph/lexicon*.ts`, ~230 verbs, ~190 nouns, ~80 adjectives) with proclitic splitting (`prefixes.ts`); confidence 0.9–0.94 minus 0.04/prefix letter; unknown → `patternGuess` (≤0.45, keyed `?:<surface>`); `analyzeSentenceContext` reranks homographs. Optional Claude analyser (`ai/claude.ts`, Zod structured outputs) — `provenance: 'claude'`, never overwrites user corrections.

### hindi-reader (Hindi)
- Tap a word → `src/reader/WordPanel.tsx` (same 3-level shape as slovo, ported).
- Tokenization: `src/tokenizer/devanagari.ts` — codepoint-range classifiers, akshara segmentation (`segmentAksharas`) for lookup and the alphabet curriculum; `normalize()` = NFC + ZWJ/ZWNJ strip; `looseKey()` unifies chandrabindu↔anusvara and folds homorganic nasal conjuncts. Sentence boundaries: danda/double-danda/?/! + abbreviation table.
- Morphology: lexicon (`src/lexicon/`, ~1,000 entries) + paradigm generators (11 noun classes, pronoun paradigms, verb conjugation with irregulars) → unknown words get an ending-pattern guess (`?`, ≤0.65). Sentence layer: TAM/compound-verb chains; `syntax/clause.ts` implements split ergativity.

**Common pattern**: deterministic-before-statistical-before-generative; every stored analysis carries `analysis_version/engine_version/analysis_source/confidence/review_status/created_at`; regeneration supersedes rows (never deletes); user corrections re-applied on top of every engine version; an optional Claude layer only phrases/translates/explains — never decides morphology.

## 2. Vocabulary tracking

| | slovo-v0 | sefer-v0 | hindi-reader |
|---|---|---|---|
| Statuses | `new → seen → recognizing → known → mastered` + `ignored` (`src/database/types.ts`) | `new → recognized → familiar → known → automatic` | same as slovo |
| Per-form status | `KnownWord.form_status: Record<string, LearningStatus>` | `formStatus` on lexeme | same |
| Promotion rules | Read N times (default 6, minus 2× lookups) without lookup → `known`; lookup on `new` → `seen`; lookup on `known`/`mastered` demotes to `recognizing` (`src/vocabulary/index.ts` `bump()`) | Lookup → `recognized`; N reads (default 4) without lookup → `automatic`; "Mark rest of chapter as known" bulk action | equivalent |
| Storage | Dexie `slovo`: `known_words` (`&lexeme_key`), `word_encounters` (`kind: 'read'|'lookup'`), `reading_progress`, `learning_state` | Dexie `lexemes`, `lookups`, `positions`/`progress` | Dexie, same shape as slovo |
| Export/import | none found | explicit JSON backup/restore | none found |
| Lexeme key | `pos:lemma`, `?pos:lemma` (guess), `user:…` | `lemma|pos` / `lemma|verb|binyan`; `?:<surface>` until re-keyed | mirrors slovo |

## 3. Dictionaries & morphology — datasets, sharding, offline loading

**slovo-v0** (`src/dictionary/index.ts`, `docs/ARCHITECTURE.md`, `NOTICE.md`): OpenRussian (CC BY-SA 4.0) → `scripts/build-dictionary.mjs` → `public/dict/{manifest.json, forms/<shard>.json, lex/<shard>.json}`; hermitdave/FrequencyWords (CC BY-SA 4.0) for ranks. **Longest-prefix shard resolution** (`resolveShardName` tries prefix lengths 6→1 against the manifest, falls back to `_`), mirrored at build time in `scripts/dict-lib.mjs`. Two delivery paths: (1) `preloadWork(slug)` — one `public/dict/works/<slug>.json` bundle (1–7 MB) with exactly the readings a bundled work uses; (2) `preloadForms(keys)` — global letter-sharded fallback for imported text. Build-time overrides in `data/curated/dict-overrides.json`. Runtime caching: Workbox `StaleWhileRevalidate` under a content-hash-versioned cache name (`hashDataDirs`); `src/pwa/cleanupCaches.ts` deletes old buckets. Lookup fallback chain: form-index → closed-class → rule generation → `?` guess.

**sefer-v0**: no external dictionary dataset — hand-written TS seed lexicon + paradigm generators; `scripts/coverage.mts` lists unrecognised forms per chapter to drive manual expansion.

**hindi-reader**: hand-written lexicon (~1,000 entries) + paradigm generators; corpus bundled as `public/corpus/*.json`.

**Conclusion**: slovo-v0's shard/manifest/work-bundle dictionary delivery is the only one that already solves "bundle a large public dataset, shard it, load a small slice per work" — the template to port for LSJ / Lewis & Short + Morpheus-style inflection data.

## 4. Coverage/stats & the reading ladder
- **slovo-v0**: `scripts/engine-coverage.mts` (word-by-word) and `scripts/sentence-coverage.mts` (full sentence analysis) write `src/data/*.json` quoted in Settings/README (98.24 % sentence-level resolved across 33 works / 2.33 M tokens). **Reading ladder**: `Book.level: LadderLevel` (1–6); Home lists the library by level; "Add to my shelf" fetches on demand.
- **sefer-v0**: no ladder; per-chapter unresolved-form listing only.
- **hindi-reader**: no ladder UI; corpus manifest grouped by reading level; `test/corpus-coverage.test.ts`.

## 5. Curriculum / courses
- **hindi-reader**: `src/alphabet/{inventory,curriculum,decodability,mastery,drills}.ts` — 14 stages, 7 skills per symbol with light spaced repetition, decodability tinting in the reader, corpus-mined example words, 5 preset starting levels.
- **slovo-v0**: equivalent alphabet system, 11 stages, same decodability approach.
- **sefer-v0**: none. No app has a separate structured grammar course; grammar instruction lives in the word/sentence panels' notes.

## 6. UI screens & routing
All three use `HashRouter` with an onboarding gate. slovo/hindi route tables:
```
/  Home (ladder/library) · /welcome · /import · /read/:bookId/:chapterIndex · /prep/:bookId/:chapterIndex
/word/:key · /names/:bookId (slovo only) · /vocabulary · /alphabet, /alphabet/stage/:id, /alphabet/letter/:symbol,
/alphabet/drill/:mode, /alphabet/write/:symbol · /settings
```
sefer-v0: Home, Import, Reader, Search, Word, Settings (+ SentenceMode, PhraseCard, Occurrences, Morphemes, CorrectForm, StatusPicker components).
summa-app today: Library/Search/Bookmarks/Settings/About/Work/WorkAbout/Reader/GenericReader/Part/Prooemium/Question — no word-tap panel, no vocabulary screen, no /word/:key route.

## 7. Build/deploy conventions
| | slovo-v0 | sefer-v0 | hindi-reader | summa-app |
|---|---|---|---|---|
| Dev port | 5188 | 5173 | 5186 | 5173 (autoPort) |
| base | `'./'` + HashRouter | same | same | `'./'` + HashRouter |
| PWA | `registerType: 'prompt'`; app shell precached; dict/corpus runtime-cached `StaleWhileRevalidate` under a data-hash cache name | PWA present; `virtual:bundled-book` plugin for the private edition | same pattern as slovo | `registerType: 'autoUpdate'`; precaches the ENTIRE corpus (`maximumFileSizeToCacheInBytes: 20 MB`, `**/*.json`); `scripts/copy-corpus.mjs` on predev/prebuild |
| Deploy | gh-pages orphan worktree | private | same as slovo | `.github/workflows/deploy.yml` (`actions/deploy-pages@v4`) |
| Sharding | longest-prefix form/lex shards + per-work bundles | none | none | one `work.json` per work, lazily fetched, but all precached |

## 8. Tests & validation
- slovo-v0: 21 vitest files; probe scripts; coverage scripts double as validation.
- sefer-v0: vitest (tokenize, chapters, morph, context, vocab, vocalized, ocr-clean, source fidelity); `scripts/{coverage,vocheck,zodcheck,probe}.mts`.
- hindi-reader: 99 vitest tests; `scripts/audit.mjs` → `docs/AUDIT.md`.
- summa-app: vitest over `src/__tests__/` (9 files) + per-work `validate:<work>` npm scripts against each importer's VALIDATION_REPORT/anomalies.

## summa-app: what word-level interaction would require
1. **Passage text must become tokenizable.** `Passage.text` is one string with `\n`; `GenericReader.tsx` renders `<p className="gr-passage__text">{p.text}</p>` (CSS `white-space: pre-line`). Either a client-side script-aware tokenizer emitting `[start,end)` tokens rendered as clickable spans (preserving `\n` and all diacritics), or build-time pre-tokenisation extending `Passage` with `tokens`.
2. **A polytonic-Greek tokenizer is new work** (breathings, accents, iota subscript/adscript, elision marks `ʼ`/`᾽`): `normalize()` (NFC; display) vs `looseKey()` (fold breathing/accent for lookup). Latin needs a simple Western-alphabet tokenizer (j/v, u/v, ligatures folding).
3. **No dictionary/morphology data exists in summa-app.** Build a Greek/Latin `candidatesFor()` layer form-index-first (slovo pattern) on Morpheus-style inflection tables + LSJ/Middle Liddell/Lewis & Short glosses; hand lexicons are infeasible at this scale.
4. **No vocabulary schema exists** — only `src/state/storage.ts` (bookmarks/last position). Add Dexie tables (`known_words`, `word_encounters`, `learning_state`, `token_analyses`, `analysis_versions`, `user_corrections`).
5. **Data delivery**: adopt slovo's per-work bundle + longest-prefix shard pattern instead of precaching everything; the dictionary alone will be tens of MB.
6. Keep summa-app's per-work importer + shared validator convention for the morphological layer.

## Candidate open datasets for Greek and Latin
| Dataset | What | URL | Licence |
|---|---|---|---|
| Perseus Morpheus | Greek (+Latin) morphological analyser | `github.com/perseids-tools/morpheus` (fork), `github.com/PerseusDL/morpheus` | PerseusDL: CC BY-SA 3.0 US (confirmed); check fork LICENSE files; `libmorpheus` is MPL/AGPL (different) |
| Perseus LSJ | Full Greek–English lexicon, TEI | `github.com/PerseusDL/lexica` (`CTS_XML_TEI/perseus/pdllex/grc/lsj/`) | CC BY-SA (3.0/4.0 cited; check file header) |
| Perseus Middle Liddell | Intermediate Greek lexicon (compact glosses) | `github.com/PerseusDL/lexica` | CC BY-SA |
| Perseus Lewis & Short | Latin–English lexicon, TEI | `github.com/PerseusDL/lexica` | CC BY-SA 3.0 US (confirmed) |
| Whitaker's WORDS | Latin analyser + dictionary | `github.com/mk270/whitakers-words`, `github.com/ArchimedesDigital/open_words` | free for any use; forks BSD-2-Clause |
| kaikki.org (Ancient Greek, Latin, Italian) | Wiktionary JSONL with inflection tables | `kaikki.org/dictionary/Ancient%20Greek/`, `.../Latin/` | CC BY-SA 4.0 + GFDL |
| PROIEL treebank | annotated Greek/Latin | `github.com/proiel/proiel-treebank` | **CC BY-NC-SA 3.0 — non-commercial; avoid for redistribution** |
| AGDT (Perseus treebank) | annotated Greek/Latin sentences | `github.com/PerseusDL/treebank_data` | check LICENSE (likely CC BY-SA) |
| Diorisis | 10.2 M-token lemmatised Greek corpus | figshare 6187256 | licence not confirmed — verify before use |
| CLTK models | lemmatisers etc. | `github.com/cltk/cltk`, `cltk/greek_models_cltk` | code MIT; data per sub-corpus — verify |
