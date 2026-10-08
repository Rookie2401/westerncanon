// The gate of the course ladders (docs/COURSE-PLAN.md §6): reads every committed
// data/course/ladder.<lang>.json and reports, per language, the coverage bands,
// cliffs and new-lemma rates of its units — in the spirit of Go's ladder:check.
// Everything here is advice about an order computed from authentic texts: no unit
// is ever written to a threshold, so nothing fails; the report is what the data say.
// Usage: node scripts/course/check-ladder.mjs [--write]   (--write refreshes scripts/course/REPORT.md)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COURSE_DIR, ROOT } from './lib.mjs';

const CLIFF = { previousUnits: 3, warnPoints: 6, errorPoints: 12 };
const NEW_PER_100 = { warn: 5, error: 9 };
const COVERAGE = { warn: 0.88, error: 0.85 };

export function checkLadder(ladder) {
  const out = { lang: ladder.lang, units: ladder.units.length, works: Object.keys(ladder.works).length, words: 0, warnings: [], stats: {} };
  const covs = [];
  ladder.units.forEach((u, i) => {
    out.words += u.words;
    const prev = covs.slice(-CLIFF.previousUnits);
    if (prev.length === CLIFF.previousUnits) {
      const mean = prev.reduce((a, b) => a + b, 0) / prev.length;
      const drop = (mean - u.cov3) * 100;
      if (drop > CLIFF.errorPoints) out.warnings.push({ level: 'error', unit: i, id: u.id, check: 'cliff', value: drop.toFixed(1) });
      else if (drop > CLIFF.warnPoints) out.warnings.push({ level: 'warn', unit: i, id: u.id, check: 'cliff', value: drop.toFixed(1) });
    }
    if (u.newPer100 > NEW_PER_100.error) out.warnings.push({ level: 'error', unit: i, id: u.id, check: 'new-lemmas', value: u.newPer100 });
    else if (u.newPer100 > NEW_PER_100.warn) out.warnings.push({ level: 'warn', unit: i, id: u.id, check: 'new-lemmas', value: u.newPer100 });
    if (u.cov3 < COVERAGE.error) out.warnings.push({ level: 'error', unit: i, id: u.id, check: 'coverage', value: (u.cov3 * 100).toFixed(1) });
    else if (u.cov3 < COVERAGE.warn) out.warnings.push({ level: 'warn', unit: i, id: u.id, check: 'coverage', value: (u.cov3 * 100).toFixed(1) });
    covs.push(u.cov3);
  });
  const byStage = {};
  for (const u of ladder.units) {
    const s = (byStage[u.stage] ??= { units: 0, words: 0, covSum: 0, min: 1 });
    s.units++;
    s.words += u.words;
    s.covSum += u.cov3;
    s.min = Math.min(s.min, u.cov3);
  }
  for (const [k, s] of Object.entries(byStage)) out.stats[k] = { units: s.units, words: s.words, meanCov: s.covSum / s.units, minCov: s.min };
  out.errors = out.warnings.filter((w) => w.level === 'error').length;
  return out;
}

function report(results) {
  const lines = [`# Course ladders — check report`, '', `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run course:check\`. Thresholds borrowed from Go's ladder gate`, `(coverage warn < ${COVERAGE.warn * 100} % / error < ${COVERAGE.error * 100} %; cliff > ${CLIFF.warnPoints} / ${CLIFF.errorPoints} points below the mean of the previous ${CLIFF.previousUnits} units; new lemmas per 100 words > ${NEW_PER_100.warn} / ${NEW_PER_100.error}).`, `These texts are authentic and unedited, so a flag is a fact about the corpus, not a defect to write away: the path discloses it.`, ''];
  for (const r of results) {
    lines.push(`## ${r.lang}: ${r.units} units, ${r.works} works, ${r.words.toLocaleString('en-US')} words`, '');
    lines.push('| stage | units | words | mean coverage | lowest |', '|---|---:|---:|---:|---:|');
    for (const [k, s] of Object.entries(r.stats)) lines.push(`| ${k} | ${s.units} | ${s.words.toLocaleString('en-US')} | ${(s.meanCov * 100).toFixed(1)} % | ${(s.minCov * 100).toFixed(1)} % |`);
    const counts = {};
    for (const w of r.warnings) counts[`${w.check} ${w.level}`] = (counts[`${w.check} ${w.level}`] ?? 0) + 1;
    lines.push('', `Flags: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}.`);
    const errors = r.warnings.filter((w) => w.level === 'error');
    if (errors.length) {
      lines.push('', 'Error-level flags (first 20):', '');
      for (const w of errors.slice(0, 20)) lines.push(`- unit ${w.unit + 1} \`${w.id}\`: ${w.check} ${w.value}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const files = readdirSync(COURSE_DIR).filter((f) => /^ladder\.[a-z]+\.json$/.test(f)).sort();
const results = files.map((f) => checkLadder(JSON.parse(readFileSync(join(COURSE_DIR, f), 'utf8'))));
const text = report(results);
console.log(text);
if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, 'scripts', 'course', 'REPORT.md'), text);
  console.log('[course:check] wrote scripts/course/REPORT.md');
}
