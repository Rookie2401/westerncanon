/**
 * Corpus validation for the generated data/summa/ files.
 *
 *   npm run validate:summa
 *
 * Writes data/summa/VALIDATION_REPORT.md and prints a summary. Exits non-zero
 * if any ERROR-level check fails. WARN-level findings (source irregularities
 * that do not indicate data loss) do not fail the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignArticleTitles } from './enumerations.ts';
import { findForbidden, foldForSearch } from './normalize.ts';
import { parseSource } from './parse.ts';
import type { Part, Prooemium, SearchRecord, SummaIndex } from '../../data/summa/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'xml_latin_nl.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'summa');
const REPORT = join(OUT_DIR, 'VALIDATION_REPORT.md');

const PART_FILES = ['part-I.json', 'part-I-II.json', 'part-II-II.json', 'part-III.json'];

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

const findings: Finding[] = [];
const err = (check: string, message: string) => findings.push({ level: 'ERROR', check, message });
const warn = (check: string, message: string) => findings.push({ level: 'WARN', check, message });

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(OUT_DIR, name), 'utf8')) as T;
}

function scanStrings(obj: unknown, path: string, visit: (s: string, path: string) => void): void {
  if (typeof obj === 'string') {
    visit(obj, path);
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) scanStrings(obj[i], `${path}[${i}]`, visit);
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) scanStrings(v, `${path}.${k}`, visit);
  }
}

interface PartStats {
  code: string;
  questions: number;
  articles: number;
  objections: number;
  sedContra: number;
  replies: number;
  respondeo: number;
  avgArticleChars: number;
  nullTitles: number;
  anomalies: number;
}

function main(): void {
  // ---- presence ---------------------------------------------------------------
  for (const f of ['index.json', 'prooemium.json', 'search-index.json', ...PART_FILES]) {
    if (!existsSync(join(OUT_DIR, f))) err('presence', `missing ${f} - run \`npm run import:summa\``);
  }
  if (findings.some((f) => f.level === 'ERROR')) return finish();

  const index = readJson<SummaIndex>('index.json');
  const prooemium = readJson<Prooemium>('prooemium.json');
  const searchIndex = readJson<SearchRecord[]>('search-index.json');
  const parts = PART_FILES.map((f) => readJson<Part>(f));

  if (parts.length !== 4) err('presence', `expected 4 parts, got ${parts.length}`);
  if (!prooemium.text || prooemium.citation !== 'Summa theologiae, pr.') {
    err('prooemium', 'work-level prooemium.json is missing or malformed');
  }

  // ---- re-parse source for lemma accounting ---------------------------------
  const source = parseSource(RAW_XML);
  const tc = source.typeCounts;

  // ---- per-part structural checks -----------------------------------------
  const allArticleCitations: string[] = [];
  const allQuestionCitations: string[] = [];
  const stats: PartStats[] = [];
  let outObjections = 0;
  let outSedContra = 0;
  let outReplies = 0;
  let outRespondeo = 0;
  let outQuestionProoemia = 0;
  let outPartProoemia = 0;
  let totalArticles = 0;
  let totalNullTitles = 0;
  let oeCount = (prooemium.text.match(/œ/g) ?? []).length;
  const titleRejectionsByReason = new Map<string, string[]>();

  for (const part of parts) {
    let anomalies = 0;
    let pObj = 0;
    let pSc = 0;
    let pRep = 0;
    let pResp = 0;
    let pNull = 0;
    let pArtChars = 0;
    let pArticles = 0;

    if (part.prooemium) {
      outPartProoemia += 1;
      oeCount += (part.prooemium.match(/œ/g) ?? []).length;
    }

    // question numbering
    const qNums = part.questions.map((q) => q.number);
    const seenQ = new Set<number>();
    for (const n of qNums) {
      if (seenQ.has(n)) err('question-numbering', `${part.code}: duplicate question number ${n}`);
      seenQ.add(n);
    }
    const sortedQ = [...qNums].sort((a, b) => a - b);
    if (sortedQ.length) {
      const gaps: number[] = [];
      for (let n = sortedQ[0]; n <= sortedQ[sortedQ.length - 1]; n++) if (!seenQ.has(n)) gaps.push(n);
      if (sortedQ[0] !== 1) warn('question-numbering', `${part.code}: first question is ${sortedQ[0]}, not 1`);
      if (gaps.length) {
        anomalies += gaps.length;
        warn('question-numbering', `${part.code}: missing question number(s) ${gaps.join(', ')} (source omits these)`);
      }
    }

    for (const q of part.questions) {
      allQuestionCitations.push(q.citation);
      if (q.prooemium) {
        outQuestionProoemia += 1;
        oeCount += (q.prooemium.match(/œ/g) ?? []).length;
      }
      if (q.title !== null) warn('question-title', `${q.citation}: unexpected non-null question title`);

      const numbered = q.articles.filter((a) => a.number != null).map((a) => a.number as number);
      const unnumbered = q.articles.filter((a) => a.number == null);
      if (unnumbered.length > 1) err('article-numbering', `${q.citation}: ${unnumbered.length} unnumbered articles`);
      if (unnumbered.length === 1) {
        anomalies += 1;
        warn('article-numbering', `${q.citation}: unnumbered single article (expected; source has no articulus integer)`);
      }
      const seenA = new Set<number>();
      for (const n of numbered) {
        if (seenA.has(n)) err('article-numbering', `${q.citation}: duplicate article number ${n}`);
        seenA.add(n);
      }
      if (numbered.length) {
        const maxA = Math.max(...numbered);
        const aGaps: number[] = [];
        for (let n = 1; n <= maxA; n++) if (!seenA.has(n)) aGaps.push(n);
        if (numbered[0] !== 1 && !seenA.has(1)) {
          anomalies += 1;
        }
        if (aGaps.length) {
          anomalies += aGaps.length;
          warn('article-numbering', `${q.citation}: missing article number(s) ${aGaps.join(', ')} of ${maxA} (source omits these)`);
        }
      }

      // re-derive title assignment for the report
      const assign = assignArticleTitles(q.prooemium, [...numbered].sort((a, b) => a - b));
      if (assign.rejected && (numbered.length > 0 || unnumbered.length > 0)) {
        const bucket = titleRejectionsByReason.get(assign.rejected) ?? [];
        bucket.push(q.citation);
        titleRejectionsByReason.set(assign.rejected, bucket);
      }

      for (const a of q.articles) {
        totalArticles += 1;
        pArticles += 1;
        allArticleCitations.push(a.citation);

        const bodyLen =
          a.objections.reduce((n, o) => n + o.text.length, 0) +
          a.sedContra.reduce((n, s) => n + s.text.length, 0) +
          (a.respondeo?.length ?? 0) +
          a.replies.reduce((n, r) => n + r.text.length, 0);
        pArtChars += bodyLen;

        const empty =
          a.objections.length === 0 &&
          a.sedContra.length === 0 &&
          a.respondeo == null &&
          a.replies.length === 0;
        if (empty) err('empty-body', `${a.citation}: article has no objections, sed contra, respondeo or replies`);

        pObj += a.objections.length;
        pSc += a.sedContra.length;
        pRep += a.replies.length;
        if (a.respondeo != null) pResp += 1;
        if (a.title == null) {
          pNull += 1;
          totalNullTitles += 1;
        }

        for (const s of [a.respondeo ?? '', ...a.objections.map((o) => o.text), ...a.sedContra.map((x) => x.text), ...a.replies.map((r) => r.text)]) {
          oeCount += (s.match(/œ/g) ?? []).length;
        }
      }
    }

    outObjections += pObj;
    outSedContra += pSc;
    outReplies += pRep;
    outRespondeo += pResp;

    stats.push({
      code: part.code,
      questions: part.questions.length,
      articles: pArticles,
      objections: pObj,
      sedContra: pSc,
      replies: pRep,
      respondeo: pResp,
      avgArticleChars: pArticles ? Math.round(pArtChars / pArticles) : 0,
      nullTitles: pNull,
      anomalies,
    });
  }

  // ---- citation uniqueness -------------------------------------------------
  dupCheck('article-citation-unique', allArticleCitations);
  dupCheck('question-citation-unique', allQuestionCitations);

  // ---- lemma accounting -------------------------------------------------
  const outPr = 1 /* work */ + outPartProoemia + outQuestionProoemia;
  accountingRow('pr (prooemia)', tc['pr'] ?? 0, outPr);
  accountingRow('arg (objections)', tc['arg'] ?? 0, outObjections);
  accountingRow('sc (sed contra)', tc['sc'] ?? 0, outSedContra);
  accountingRow('co (respondeo)', tc['co'] ?? 0, outRespondeo);
  accountingRow('ad (replies)', tc['ad'] ?? 0, outReplies);
  const inTotal = source.totalLemmas;
  const outTotal = outPr + outObjections + outSedContra + outRespondeo + outReplies;
  if (inTotal !== outTotal) {
    err('lemma-accounting', `total lemmas: input ${inTotal} != consumed ${outTotal} (delta ${inTotal - outTotal})`);
  }

  // ---- respondeo vs co ---------------------------------------------------
  if ((tc['co'] ?? 0) !== outRespondeo) {
    err('respondeo-vs-co', `co lemmas ${tc['co']} != articles with respondeo ${outRespondeo}`);
  }

  // ---- leaked markup / Dutch -----------------------------------------------
  let leakHits = 0;
  const leakExamples: string[] = [];
  for (const [label, obj] of [
    // index.json holds generated metadata we control (source URL, license note);
    // only its part manifest carries corpus-derived strings worth scanning.
    ['index.json', { parts: index.parts }],
    ['prooemium.json', prooemium],
    ...parts.map((p, i) => [PART_FILES[i], p] as const),
  ] as Array<[string, unknown]>) {
    scanStrings(obj, label, (s, path) => {
      const hits = findForbidden(s);
      if (hits.length) {
        leakHits += 1;
        if (leakExamples.length < 10) leakExamples.push(`${path}: ${hits.join(',')} :: ${s.slice(0, 80)}`);
      }
    });
  }
  if (leakHits) {
    err('no-leaked-markup', `${leakHits} string(s) contain forbidden substrings:\n    ${leakExamples.join('\n    ')}`);
  }

  // ---- text integrity + diacritics -------------------------------------
  // Data-loss guard: a well-known passage must round-trip verbatim.
  const spot =
    parts[0].questions.find((q) => q.number === 2)?.articles.find((a) => a.number === 3)?.respondeo ?? '';
  if (!spot.startsWith('Respondeo dicendum quod Deum esse quinque viis probari potest')) {
    err('text-integrity', 'spot-check passage (I q. 2 a. 3 respondeo) does not match its expected opening');
  }
  if (!spot.includes('Prima autem et manifestior via est')) {
    err('text-integrity', 'spot-check passage (I q. 2 a. 3 respondeo) is truncated / altered mid-text');
  }
  // Diacritic folding must work even though this particular source happens to
  // carry no ligatures/accents in its Latin (verified: the only œ in the whole
  // source file is the Dutch liber title "Proœmium", which is not imported).
  if (foldForSearch('Pœna') !== 'poena' || foldForSearch('cælum') !== 'caelum' || foldForSearch('grātiā') !== 'gratia') {
    err('diacritics', 'foldForSearch() is not folding ligatures/accents correctly');
  }
  if (oeCount === 0) {
    warn(
      'diacritics',
      'output contains no œ/æ/accented characters - expected for this source (its Latin is plain ASCII; ' +
        'the sole œ in the source file is the un-imported Dutch title "Proœmium"). Search folding is still applied.',
    );
  }

  // ---- search index sanity ------------------------------------------------
  if (searchIndex.length !== totalArticles) {
    err('search-index', `search-index has ${searchIndex.length} records, expected ${totalArticles} (one per article)`);
  }
  const artCitSet = new Set(allArticleCitations);
  const missingInSearch = searchIndex.filter((r) => !artCitSet.has(r.citation)).length;
  if (missingInSearch) err('search-index', `${missingInSearch} search records have a citation not present in the parts`);

  // ---- title coverage ---------------------------------------------------
  const coverage = ((totalArticles - totalNullTitles) / totalArticles) * 100;
  if (coverage < 98) {
    warn('title-coverage', `article title coverage ${coverage.toFixed(2)}% is below the 98% target`);
  }

  // ---- manifest cross-check --------------------------------------------
  for (let i = 0; i < parts.length; i++) {
    const m = index.parts[i];
    const p = parts[i];
    const artCount = p.questions.reduce((n, q) => n + q.articles.length, 0);
    if (m.code !== p.code || m.questionCount !== p.questions.length || m.articleCount !== artCount) {
      err('manifest', `index.json part ${i} disagrees with ${PART_FILES[i]}`);
    }
  }

  writeReport(index, stats, source.typeCounts, source.totalLemmas, {
    outPr,
    outObjections,
    outSedContra,
    outRespondeo,
    outReplies,
    coverage,
    totalArticles,
    totalNullTitles,
    oeCount,
    titleRejectionsByReason,
    searchRecords: searchIndex.length,
  });
  finish();

  function dupCheck(check: string, list: string[]): void {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const c of list) {
      if (seen.has(c)) dups.add(c);
      seen.add(c);
    }
    if (dups.size) err(check, `${dups.size} duplicate citation(s): ${[...dups].slice(0, 10).join('; ')}`);
  }

  function accountingRow(label: string, input: number, output: number): void {
    if (input !== output) {
      err('lemma-accounting', `${label}: input ${input} != output ${output} (delta ${input - output})`);
    }
  }
}

interface ReportExtra {
  outPr: number;
  outObjections: number;
  outSedContra: number;
  outRespondeo: number;
  outReplies: number;
  coverage: number;
  totalArticles: number;
  totalNullTitles: number;
  oeCount: number;
  titleRejectionsByReason: Map<string, string[]>;
  searchRecords: number;
}

function writeReport(
  index: SummaIndex,
  stats: PartStats[],
  typeCounts: Record<string, number>,
  totalLemmas: number,
  x: ReportExtra,
): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push('# Summa corpus validation report');
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push(`Corpus generated: ${index.generatedAt}`);
  L.push(`Source: ${index.sourceUrl}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push(index.license);
  L.push('');

  L.push('## Per-part summary');
  L.push('');
  L.push('| Part | Questions | Articles | Objections | Sed contra | Respondeo | Replies | Avg article chars | Null titles | Anomalies |');
  L.push('|------|-----------|----------|------------|-----------|-----------|---------|-------------------|-------------|-----------|');
  for (const s of stats) {
    L.push(
      `| ${s.code} | ${s.questions} | ${s.articles} | ${s.objections} | ${s.sedContra} | ${s.respondeo} | ${s.replies} | ${s.avgArticleChars} | ${s.nullTitles} | ${s.anomalies} |`,
    );
  }
  const tot = stats.reduce(
    (a, s) => ({
      questions: a.questions + s.questions,
      articles: a.articles + s.articles,
      objections: a.objections + s.objections,
      sedContra: a.sedContra + s.sedContra,
      respondeo: a.respondeo + s.respondeo,
      replies: a.replies + s.replies,
      nullTitles: a.nullTitles + s.nullTitles,
      anomalies: a.anomalies + s.anomalies,
    }),
    { questions: 0, articles: 0, objections: 0, sedContra: 0, respondeo: 0, replies: 0, nullTitles: 0, anomalies: 0 },
  );
  L.push(
    `| **all** | ${tot.questions} | ${tot.articles} | ${tot.objections} | ${tot.sedContra} | ${tot.respondeo} | ${tot.replies} | | ${tot.nullTitles} | ${tot.anomalies} |`,
  );
  L.push('');

  L.push('## Lemma accounting');
  L.push('');
  L.push('| Lemma type | Input (XML) | Consumed (output) | OK |');
  L.push('|------------|-------------|-------------------|----|');
  L.push(`| pr | ${typeCounts['pr'] ?? 0} | ${x.outPr} | ${(typeCounts['pr'] ?? 0) === x.outPr ? 'yes' : 'NO'} |`);
  L.push(`| arg | ${typeCounts['arg'] ?? 0} | ${x.outObjections} | ${(typeCounts['arg'] ?? 0) === x.outObjections ? 'yes' : 'NO'} |`);
  L.push(`| sc | ${typeCounts['sc'] ?? 0} | ${x.outSedContra} | ${(typeCounts['sc'] ?? 0) === x.outSedContra ? 'yes' : 'NO'} |`);
  L.push(`| co | ${typeCounts['co'] ?? 0} | ${x.outRespondeo} | ${(typeCounts['co'] ?? 0) === x.outRespondeo ? 'yes' : 'NO'} |`);
  L.push(`| ad | ${typeCounts['ad'] ?? 0} | ${x.outReplies} | ${(typeCounts['ad'] ?? 0) === x.outReplies ? 'yes' : 'NO'} |`);
  const consumed = x.outPr + x.outObjections + x.outSedContra + x.outRespondeo + x.outReplies;
  L.push(`| **total** | ${totalLemmas} | ${consumed} | ${totalLemmas === consumed ? 'yes' : 'NO'} |`);
  L.push('');

  L.push('## Article title coverage');
  L.push('');
  L.push(`${x.totalArticles - x.totalNullTitles} / ${x.totalArticles} articles have a parsed title (**${x.coverage.toFixed(2)}%**, target >= 98%).`);
  L.push('');
  for (const [reason, cites] of x.titleRejectionsByReason) {
    L.push(`- **${reason}** (${cites.length}): ${cites.join(', ')}`);
  }
  L.push('');
  L.push(`œ ligatures preserved in output: ${x.oeCount}`);
  L.push(`search-index.json records: ${x.searchRecords}`);
  L.push('');

  L.push('## Errors');
  L.push('');
  if (errors.length === 0) L.push('_none_');
  for (const f of errors) L.push(`- **[${f.check}]** ${f.message}`);
  L.push('');
  L.push('## Warnings');
  L.push('');
  if (warns.length === 0) L.push('_none_');
  for (const f of warns) L.push(`- **[${f.check}]** ${f.message}`);
  L.push('');

  writeFileSync(REPORT, L.join('\n'), 'utf8');
}

function finish(): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write('\n=== validate:summa ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s). Report: ${REPORT}\n`);
  if (errors.length > 0) process.exit(1);
}

main();
