// Build the reading ladders (docs/COURSE-PLAN.md §2.2): one data/course/ladder.<lang>.json
// per language, ordered greedily by curriculum coverage from the committed Lexis bundles.
// Usage: node scripts/course/build-ladder.mjs [grc|la|it ...]   (default: every language)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COURSE_DIR,
  CORE_WORDS,
  MIN_ENCOUNTERS,
  SAME_AUTHOR_PENALTY,
  coreLemmas,
  STAGES,
  UNIT_WORDS,
  alignedWithSibling,
  analyseWork,
  englishSibling,
  isName,
  readAbout,
  readManifest,
  stageForPool,
} from './lib.mjs';

const manifest = readManifest();
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['grc', 'la', 'it'];

function buildLadder(lang) {
  const t0 = Date.now();
  const workIds = Object.keys(manifest.works)
    .filter((id) => manifest.works[id].lang === lang)
    .sort();
  const works = [];
  for (const id of workIds) {
    const a = analyseWork(manifest, id, lang);
    if (!a || !a.units.length) continue;
    const about = readAbout(id);
    const en = englishSibling(id);
    const stops = a.units.flatMap((u) => u.stops);
    works.push({
      ...a,
      title: about?.title ?? id,
      author: about?.author ?? '',
      en: en ? { workId: en, aligned: alignedWithSibling(stops, en) } : null,
      next: 0, // index of the next unplaced section
    });
  }
  console.log(`[${lang}] ${works.length} works analysed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // --- Stage 0 seed: the commonest lemmas count as met (docs §2.2) --------
  const { core, share: coreShare } = coreLemmas(works, CORE_WORDS);
  const coreIds = core.map((c) => c.id);
  console.log(`[${lang}] core ${coreIds.length} lemmas cover ${(coreShare * 100).toFixed(1)} % of running words`);

  // --- greedy ordering over sections -----------------------------------
  const seen = new Map(coreIds.map((id) => [id, MIN_ENCOUNTERS])); // lemma -> encounters in placed units
  const known = new Set(coreIds); // lemma with >= MIN_ENCOUNTERS encounters
  const nameCache = new Map();
  const isKnownLemma = (id, bundle) => {
    if (known.has(id)) return true;
    let n = nameCache.get(id);
    if (n === undefined) {
      n = isName(id, bundle);
      nameCache.set(id, n);
    }
    return n;
  };

  // candidate state per work: known tokens of its next section
  const cand = new Map();
  const sectionStats = (w, s) => {
    let words = 0;
    let knownTokens = 0;
    let newLemmas = 0;
    for (const u of s.units) {
      words += u.words;
      for (const [id, n] of u.counts) {
        if (isKnownLemma(id, w.bundle)) knownTokens += n;
        if (!seen.has(id) && !isName(id, w.bundle)) newLemmas++;
      }
    }
    return { words, knownTokens, newLemmas };
  };
  const refresh = (w) => {
    if (w.next >= w.sections.length) {
      cand.delete(w.workId);
      return;
    }
    cand.set(w.workId, { w, s: w.sections[w.next], ...sectionStats(w, w.sections[w.next]) });
  };
  for (const w of works) refresh(w);

  const ordered = []; // units in ladder order, with their section index
  let sectionIndex = 0;
  let lastAuthor = null;
  let authorRun = 0;
  while (cand.size) {
    let best = null;
    for (const c of cand.values()) {
      const raw = c.knownTokens / Math.max(1, c.words);
      const penalty =
        c.w.author && c.w.author === lastAuthor
          ? Math.min(SAME_AUTHOR_PENALTY.max, SAME_AUTHOR_PENALTY.perSection * authorRun)
          : 0;
      const cov = raw - penalty;
      const newPer100 = (c.newLemmas / Math.max(1, c.words)) * 100;
      if (
        !best ||
        cov > best.cov + 1e-12 ||
        (Math.abs(cov - best.cov) <= 1e-12 &&
          (newPer100 < best.newPer100 - 1e-12 ||
            (Math.abs(newPer100 - best.newPer100) <= 1e-12 && c.w.workId < best.c.w.workId)))
      ) {
        best = { c, cov, newPer100 };
      }
    }
    const { c } = best;
    for (const u of c.s.units) ordered.push({ work: c.w, unit: u, section: sectionIndex });
    sectionIndex++;
    authorRun = c.w.author && c.w.author === lastAuthor ? authorRun + 1 : 1;
    lastAuthor = c.w.author || null;
    // update encounters; collect lemmas that just became known
    const newlyKnown = [];
    for (const u of c.s.units) {
      for (const [id, n] of u.counts) {
        const before = seen.get(id) ?? 0;
        const after = before + n;
        seen.set(id, after);
        if (before < MIN_ENCOUNTERS && after >= MIN_ENCOUNTERS) {
          known.add(id);
          newlyKnown.push(id);
        }
      }
    }
    c.w.next++;
    refresh(c.w);
    // incremental update of every other candidate
    for (const o of cand.values()) {
      if (o.w === c.w) continue;
      for (const u of o.s.units) {
        for (const id of newlyKnown) {
          const n = u.counts.get(id);
          if (n && !isName(id, o.w.bundle)) o.knownTokens += n;
        }
      }
      // newLemmas (a tie-breaker only): recompute from the section's lemmas
      let newLemmas = 0;
      for (const u of o.s.units) for (const [id] of u.counts) if (!seen.has(id) && !isName(id, o.w.bundle)) newLemmas++;
      o.newLemmas = newLemmas;
    }
  }

  // --- sequential statistics in ladder order (what the reader sees) -------
  const seq = new Map(coreIds.map((id) => [id, MIN_ENCOUNTERS]));
  const knownSeq = new Set(coreIds);
  let pool = coreIds.length;
  const units = [];
  const worksOut = {};
  for (const { work, unit, section } of ordered) {
    let known3 = 0;
    let known1 = 0;
    let newLemmas = 0;
    for (const [id, n] of unit.counts) {
      const name = isName(id, work.bundle);
      const c = seq.get(id) ?? 0;
      if (name || c >= MIN_ENCOUNTERS) known3 += n;
      if (name || c >= 1) known1 += n;
      if (!name && c === 0) newLemmas++;
    }
    for (const [id, n] of unit.counts) {
      const before = seq.get(id) ?? 0;
      const after = before + n;
      seq.set(id, after);
      if (before < MIN_ENCOUNTERS && after >= MIN_ENCOUNTERS && !isName(id, work.bundle)) {
        knownSeq.add(id);
        pool++;
      }
    }
    const first = unit.stops[0].id;
    units.push({
      id: `${work.workId}/${first}`,
      work: work.workId,
      divs: unit.stops.map((s) => s.id),
      label: unit.label,
      words: unit.words,
      lemmas: unit.counts.size,
      cov3: round4(known3 / Math.max(1, unit.words)),
      cov1: round4(known1 / Math.max(1, unit.words)),
      newPer100: round2((newLemmas / Math.max(1, unit.words)) * 100),
      unrec: round4(unit.unrec / Math.max(1, unit.words)),
      pool,
      stage: stageForPool(pool),
      section,
    });
    if (!worksOut[work.workId]) {
      worksOut[work.workId] = { title: work.title, author: work.author, ...(work.en ? { en: work.en } : {}) };
    }
  }

  const ladder = {
    lang,
    version: 1,
    built_at: new Date().toISOString(),
    policy: {
      minEncounters: MIN_ENCOUNTERS,
      coreWords: coreIds.length,
      coreShare: round4(coreShare),
      sameAuthorPenalty: SAME_AUTHOR_PENALTY,
      unitWords: [UNIT_WORDS.min, UNIT_WORDS.max],
      stages: STAGES.map((s) => ({ id: s.id, poolMax: Number.isFinite(s.poolMax) ? s.poolMax : null })),
    },
    works: worksOut,
    core: coreIds,
    units,
  };
  mkdirSync(COURSE_DIR, { recursive: true });
  const file = join(COURSE_DIR, `ladder.${lang}.json`);
  writeFileSync(file, JSON.stringify(ladder));
  const words = units.reduce((a, u) => a + u.words, 0);
  console.log(
    `[${lang}] ${units.length} units, ${works.length} works, ${words.toLocaleString()} words -> ${file} (${((Date.now() - t0) / 1000).toFixed(1)} s)`,
  );
  return ladder;
}

const round4 = (n) => Math.round(n * 1e4) / 1e4;
const round2 = (n) => Math.round(n * 1e2) / 1e2;

for (const lang of langs) buildLadder(lang);
