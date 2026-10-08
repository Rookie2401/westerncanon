// Build the Stage 0 packs (docs/COURSE-PLAN.md §2.6): data/course/stage0.<lang>.json.
// Reads the ladder (for the core-word list and works) and the Lexis bundles.
// Usage: node scripts/course/build-stage0.mjs [grc|la|it ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wordTokens } from '../lexis/lib.mjs';
import { COURSE_DIR, isConsolidatableGroup, divisionShortLabel, readBundle, readManifest, readWork, readingsFor } from './lib.mjs';
import { SCRIPT_CONTENT } from './script-content.mjs';
import { transliterate } from './translit.mjs';

const manifest = readManifest();
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['grc', 'la', 'it'];
const MICRO = { min: 3, max: 9, take: 80, perWork: 6 };

/** Sentences of a passage: split on sentence punctuation and line breaks. */
function sentences(text) {
  return text
    .split(/(?<=[.;·!?])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildStage0(lang) {
  const ladder = JSON.parse(readFileSync(join(COURSE_DIR, `ladder.${lang}.json`), 'utf8'));
  const coreIds = ladder.core;
  const coreRank = new Map(coreIds.map((id, i) => [id, i]));

  // core words with glosses (from any bundle that carries the lexeme) and counts
  const core = [];
  const counts = new Map();
  const lexemes = new Map();
  for (const workId of Object.keys(ladder.works)) {
    const bundle = readBundle(manifest, workId);
    for (const [id, lx] of Object.entries(bundle.lexemes)) if (coreRank.has(id) && !lexemes.has(id)) lexemes.set(id, lx);
  }
  // counts from the ladder's units are not stored per lemma; recount from the bundles' works
  const micro = [];
  const seenMicro = new Set();
  const perWork = new Map();
  for (const workId of Object.keys(ladder.works)) {
    const bundle = readBundle(manifest, workId);
    const work = readWork(workId);
    // the division part only: the app prefixes the author and title from its registry
    const cite = (top, d) => `${top && top.id !== d.id ? `${divisionShortLabel(top)} · ` : ''}${divisionShortLabel(d)}`;
    const walk = (list, top) => {
      for (const d of list) {
        const t = top ?? d;
        const stopId = isConsolidatableGroup(d) ? d.id : null;
        const leaves = isConsolidatableGroup(d) ? d.children : d.children.length ? null : [d];
        if (!leaves) {
          walk(d.children, t);
          continue;
        }
        for (const leaf of leaves) {
          for (const p of leaf.passages) {
            for (const tok of wordTokens(p.text, lang)) {
              const top0 = readingsFor(bundle, tok.key, lang)[0];
              if (top0 && coreRank.has(top0[0])) counts.set(top0[0], (counts.get(top0[0]) ?? 0) + 1);
            }
            if ((perWork.get(workId) ?? 0) >= MICRO.perWork) continue;
            for (const s of sentences(p.text)) {
              const toks = wordTokens(s, lang);
              if (toks.length < MICRO.min || toks.length > MICRO.max) continue;
              if (seenMicro.has(s)) continue;
              const words = [];
              let score = 0;
              let ok = true;
              for (const tok of toks) {
                const r = readingsFor(bundle, tok.key, lang)[0];
                if (!r) {
                  ok = false;
                  break;
                }
                const lx = bundle.lexemes[r[0]];
                const rank = coreRank.get(r[0]);
                if (rank === undefined && !(lx && lx.pos === 'name')) {
                  ok = false;
                  break;
                }
                score += rank ?? coreIds.length;
                words.push({ surface: tok.surface, lemma: lx?.lemma ?? r[0].split(':').slice(2).join(':'), pos: lx?.pos ?? '', gloss: lx?.gloss ?? '', morph: r[1] });
              }
              if (!ok || !words.some((w) => w.pos === 'verb')) continue;
              seenMicro.add(s);
              perWork.set(workId, (perWork.get(workId) ?? 0) + 1);
              micro.push({ text: s, work: workId, div: stopId ?? leaf.id, cite: cite(t, leaf), score: score / toks.length, words });
            }
          }
        }
      }
    };
    walk(work.divisions, null);
  }
  const total = Object.values(manifest.works)
    .filter((w) => w.lang === lang)
    .reduce((a, w) => a + w.tokens, 0);
  for (const id of coreIds) {
    const lx = lexemes.get(id);
    const n = counts.get(id) ?? 0;
    core.push({
      id,
      lemma: lx?.lemma ?? id.split(':').slice(2).join(':'),
      pos: lx?.pos ?? id.split(':')[1],
      gloss: lx?.gloss ?? '',
      count: n,
      share: round4(n / total),
      ...(lang === 'grc' ? { translit: transliterate(lx?.lemma ?? id.split(':').slice(2).join(':')) } : {}),
    });
  }
  // the easiest sentences first (commonest words), at most `take`, spread across works
  micro.sort((a, b) => a.score - b.score || a.text.localeCompare(b.text));
  const picked = [];
  const used = new Map();
  for (const m of micro) {
    if (picked.length >= MICRO.take) break;
    if ((used.get(m.work) ?? 0) >= 3) continue;
    used.set(m.work, (used.get(m.work) ?? 0) + 1);
    const { score, ...rest } = m;
    void score;
    picked.push(rest);
  }

  const script = SCRIPT_CONTENT[lang];
  const pack = {
    lang,
    version: 1,
    built_at: new Date().toISOString(),
    pronunciation: script.pronunciation,
    script: script.sections,
    coreShare: ladder.policy.coreShare,
    core,
    micro: picked,
    provenance: {
      words: 'The first words are the commonest lemmas of this library’s texts in the language, by running-word frequency over the Lexis analysis; glosses are the dictionaries’ (see Settings › Language help).',
      micro: 'Every micro-passage is a sentence printed verbatim in one of the library’s texts, chosen because all its words are among the first words; nothing was written or simplified. No sentence has a translation: it is glossed word by word.',
    },
  };
  const file = join(COURSE_DIR, `stage0.${lang}.json`);
  writeFileSync(file, JSON.stringify(pack));
  console.log(`[${lang}] stage0: ${core.length} core words (${(pack.coreShare * 100).toFixed(1)} %), ${picked.length} micro-passages from ${used.size} works (${micro.length} candidates) -> ${file}`);
}

const round4 = (n) => Math.round(n * 1e4) / 1e4;
for (const lang of langs) buildStage0(lang);
