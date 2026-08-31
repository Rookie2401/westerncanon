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

  // Lemmas supplied from a secondary public-domain witness (see gaps.ts /
  // lacunae.ts). These are NOT in the base XML, so they must be subtracted from
  // the output side before the XML lemma-accounting cross-check, and are then
  // accounted separately against index.json's `filledLacunae` ledger.
  let secObjections = 0;
  let secSedContra = 0;
  let secReplies = 0;
  let secRespondeo = 0;
  let secQuestionProoemia = 0;
  const filledArticleCitations = new Set<string>();
  const filledQuestionCitations = new Set<string>();

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
      const qSecondary = q.witness != null;
      if (qSecondary) filledQuestionCitations.add(q.citation);
      if (q.prooemium) {
        outQuestionProoemia += 1;
        if (qSecondary) secQuestionProoemia += 1;
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

        if (qSecondary || a.witness != null) {
          filledArticleCitations.add(a.citation);
          secObjections += a.objections.length;
          secSedContra += a.sedContra.length;
          secReplies += a.replies.length;
          if (a.respondeo != null) secRespondeo += 1;
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

  // ---- lemma accounting (base transcription only) -----------------------
  // The XML is the base source; secondary-witness lemmas (filled lacunae) are
  // subtracted here and checked against the `filledLacunae` ledger below.
  const outPr = 1 /* work */ + outPartProoemia + outQuestionProoemia;
  const basePr = outPr - secQuestionProoemia;
  const baseObj = outObjections - secObjections;
  const baseSc = outSedContra - secSedContra;
  const baseResp = outRespondeo - secRespondeo;
  const baseRep = outReplies - secReplies;
  accountingRow('pr (prooemia)', tc['pr'] ?? 0, basePr);
  accountingRow('arg (objections)', tc['arg'] ?? 0, baseObj);
  accountingRow('sc (sed contra)', tc['sc'] ?? 0, baseSc);
  accountingRow('co (respondeo)', tc['co'] ?? 0, baseResp);
  accountingRow('ad (replies)', tc['ad'] ?? 0, baseRep);
  const inTotal = source.totalLemmas;
  const baseTotal = basePr + baseObj + baseSc + baseResp + baseRep;
  if (inTotal !== baseTotal) {
    err(
      'lemma-accounting',
      `base-source lemmas: XML input ${inTotal} != output ${baseTotal} (delta ${inTotal - baseTotal}); ` +
        `secondary-witness lemmas excluded: ${secQuestionProoemia}pr ${secObjections}arg ${secSedContra}sc ${secRespondeo}co ${secReplies}ad`,
    );
  }

  // ---- respondeo vs co (base only) ------------------------------------
  if ((tc['co'] ?? 0) !== baseResp) {
    err('respondeo-vs-co', `co lemmas ${tc['co']} != base articles with respondeo ${baseResp}`);
  }

  // ---- filled-lacunae ledger ----------------------------------------------
  // Every witness-tagged citation must be declared in index.json, and vice
  // versa; every filled article must carry real text.
  const declared = new Set((index.filledLacunae?.items ?? []).map((i) => i.citation));
  const filledAll = new Set<string>([...filledArticleCitations, ...filledQuestionCitations]);
  // whole-question fills (I q. 72, II-II q. 143) are declared by their question
  // citation; their single article shares that citation, so collapse both forms.
  for (const c of filledAll) {
    if (!declared.has(c)) err('filled-lacunae', `${c} carries a witness tag but is not declared in index.json filledLacunae`);
  }
  for (const c of declared) {
    if (!filledAll.has(c)) err('filled-lacunae', `index.json declares ${c} filled, but no question/article with that citation carries a witness tag`);
  }
  const EXPECTED_FILLS = [
    'I q. 2 a. 1', 'I q. 57 a. 4', 'I q. 72', 'I q. 84 a. 2',
    'I-II q. 42 a. 2', 'I-II q. 104 a. 2',
    'II-II q. 57 a. 3', 'II-II q. 137 a. 2', 'II-II q. 143',
    'III q. 2 a. 6', 'III q. 7 a. 9', 'III q. 15 a. 9', 'III q. 56 a. 1',
  ];
  for (const c of EXPECTED_FILLS) {
    if (!declared.has(c)) err('filled-lacunae', `expected lacuna ${c} is not present / not filled`);
  }
  if (declared.size !== EXPECTED_FILLS.length) {
    warn('filled-lacunae', `filledLacunae has ${declared.size} items; the known lacuna list has ${EXPECTED_FILLS.length}`);
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
  // The Supplementum (part-suppl.json) is assembled by scripts/import-summa/
  // supplement.ts from committed OCR, not from the base transcription; when it is
  // present its articles are also in the search index, so count them here.
  let supplArticleCount = 0;
  const supplCitations: string[] = [];
  if (existsSync(join(OUT_DIR, 'part-suppl.json'))) {
    const suppl = readJson<Part>('part-suppl.json');
    for (const q of suppl.questions) {
      for (const a of q.articles) {
        supplArticleCount += 1;
        supplCitations.push(a.citation);
      }
    }
  }
  const expectedSearch = totalArticles + supplArticleCount;
  if (searchIndex.length !== expectedSearch) {
    err('search-index', `search-index has ${searchIndex.length} records, expected ${expectedSearch} (one per article)`);
  }
  const artCitSet = new Set([...allArticleCitations, ...supplCitations]);
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

  // ---- COMPLETENESS: the four base parts must now be whole ---------------
  // Expected question count per the standard scholarly edition (Leonine).
  const EXPECTED_Q: Record<string, number> = { I: 119, 'I-II': 114, 'II-II': 189, III: 90 };
  // The only questions the Leonine prints with a single, un-numbered article.
  const EXPECTED_UNICUS = new Set(['I q. 71', 'I q. 72', 'II-II q. 128', 'II-II q. 143']);
  const seenUnicus = new Set<string>();
  for (const part of parts) {
    const want = EXPECTED_Q[part.code];
    const nums = part.questions.map((q) => q.number).sort((a, b) => a - b);
    if (want != null && part.questions.length !== want) {
      err('completeness', `${part.code}: expected ${want} questions, found ${part.questions.length}`);
    }
    // full contiguity 1..N — no missing numbers permitted any more
    for (let n = 1; n <= (nums[nums.length - 1] ?? 0); n++) {
      if (!nums.includes(n)) err('completeness', `${part.code}: question ${n} is missing (corpus must be contiguous)`);
    }
    if (nums[0] !== 1) err('completeness', `${part.code}: first question is ${nums[0]}, not 1`);
    for (const q of part.questions) {
      const numbered = q.articles.filter((a) => a.number != null).map((a) => a.number as number).sort((a, b) => a - b);
      const unnumbered = q.articles.filter((a) => a.number == null);
      if (unnumbered.length === 1 && numbered.length === 0) {
        seenUnicus.add(q.citation);
        if (!EXPECTED_UNICUS.has(q.citation)) {
          err('completeness', `${q.citation}: unexpected single-unnumbered-article question (not in the known set)`);
        }
        continue;
      }
      if (unnumbered.length > 0) {
        err('completeness', `${q.citation}: has ${unnumbered.length} unnumbered article(s) alongside ${numbered.length} numbered`);
      }
      for (let n = 1; n <= (numbered[numbered.length - 1] ?? 0); n++) {
        if (!numbered.includes(n)) {
          err('completeness', `${q.citation}: article ${n} is missing (articles must be contiguous 1..N)`);
        }
      }
    }
  }
  for (const c of EXPECTED_UNICUS) {
    if (!seenUnicus.has(c)) err('completeness', `${c} was expected to be a single-unnumbered-article question but is not`);
  }

  // ---- Supplementum Tertiae Partis (5th top-level section) --------------
  const suppl = validateSupplement(index);

  writeReport(index, stats, source.typeCounts, source.totalLemmas, {
    outPr: basePr,
    outObjections: baseObj,
    outSedContra: baseSc,
    outRespondeo: baseResp,
    outReplies: baseRep,
    coverage,
    totalArticles,
    totalNullTitles,
    oeCount,
    titleRejectionsByReason,
    searchRecords: searchIndex.length,
    filled: {
      questions: filledQuestionCitations.size,
      articles: filledArticleCitations.size,
      pr: secQuestionProoemia,
      arg: secObjections,
      sc: secSedContra,
      co: secRespondeo,
      ad: secReplies,
      items: (index.filledLacunae?.items ?? []).map((i) => `${i.citation} (${i.witness})`),
    },
    suppl,
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

interface SupplReport {
  questions: number;
  coreQuestions: number;
  appendixQuestions: number;
  articles: number;
  withAnomaly: number;
  nullTitle: number;
  nullRespondeo: number;
  anomalyEntries: number;
}

/**
 * Full inventory + integrity check for the Supplementum Tertiae Partis, the
 * fifth top-level section. It is assembled from OCR of two public-domain printed
 * editions (Marietti 1926/1931, cross-checked against the 1894 Editio altera
 * Romana), so OCR-level uncertainty is expected and is recorded per article in
 * suppl-anomalies.json; that is reported, not failed. What IS failed: a missing
 * or non-contiguous question/article, an empty body, leaked markup, a wrong
 * appendix label, or a manifest disagreement.
 */
function validateSupplement(index: SummaIndex): SupplReport {
  const r: SupplReport = {
    questions: 0, coreQuestions: 0, appendixQuestions: 0, articles: 0,
    withAnomaly: 0, nullTitle: 0, nullRespondeo: 0, anomalyEntries: 0,
  };
  const path = join(OUT_DIR, 'part-suppl.json');
  if (!existsSync(path)) {
    err('supplement', 'part-suppl.json is missing - run `npm run import:summa`');
    return r;
  }
  const part = JSON.parse(readFileSync(path, 'utf8')) as Part;
  if (part.code !== 'Suppl.' || part.id !== 'supplementum') {
    err('supplement', `part-suppl.json has code/id ${part.code}/${part.id}, expected Suppl./supplementum`);
  }
  if (!part.compilationNote || !/posthumous|Reginald|Rainaldus|Piperno|Sententiar/i.test(part.compilationNote)) {
    err('supplement', 'part-suppl.json is missing a compilationNote naming it a posthumous compilation');
  }

  const core = part.questions.filter((q) => !q.appendix);
  const appendix = part.questions.filter((q) => q.appendix);
  r.questions = part.questions.length;
  r.coreQuestions = core.length;
  r.appendixQuestions = appendix.length;

  // core: exactly 99, contiguous 1..99
  if (core.length !== 99) err('supplement', `expected 99 core Supplementum questions, found ${core.length}`);
  const coreNums = core.map((q) => q.number).sort((a, b) => a - b);
  for (let n = 1; n <= 99; n++) {
    if (!coreNums.includes(n)) err('supplement', `Supplementum question ${n} is missing (must be contiguous 1..99)`);
  }
  // appendix: exactly App. I q.1, App. I q.2, App. II q.1
  const EXPECTED_APPX = [
    { number: 100, appendix: 'I', appendixNumber: 1, citation: 'Suppl. App. I q. 1' },
    { number: 101, appendix: 'I', appendixNumber: 2, citation: 'Suppl. App. I q. 2' },
    { number: 102, appendix: 'II', appendixNumber: 1, citation: 'Suppl. App. II q. 1' },
  ];
  if (appendix.length !== 3) err('supplement', `expected 3 appendix questions, found ${appendix.length}`);
  for (const want of EXPECTED_APPX) {
    const got = part.questions.find((q) => q.number === want.number);
    if (!got) { err('supplement', `appendix question ${want.citation} (number ${want.number}) is missing`); continue; }
    if (got.appendix !== want.appendix || got.appendixNumber !== want.appendixNumber || got.citation !== want.citation) {
      err('supplement', `appendix question ${want.number} mislabelled: got appendix=${got.appendix} n=${got.appendixNumber} cite="${got.citation}", expected ${want.citation}`);
    }
  }

  // per-question article contiguity + non-empty body + no leaked markup
  for (const q of part.questions) {
    const numbered = q.articles.filter((a) => a.number != null).map((a) => a.number as number).sort((a, b) => a - b);
    const unnumbered = q.articles.filter((a) => a.number == null);
    if (unnumbered.length > 1) err('supplement', `${q.citation}: ${unnumbered.length} unnumbered articles`);
    for (let n = 1; n <= (numbered[numbered.length - 1] ?? 0); n++) {
      if (!numbered.includes(n)) err('supplement', `${q.citation}: article ${n} missing (articles must be contiguous)`);
    }
    if (q.witness !== 'marietti-1931') {
      warn('supplement', `${q.citation}: witness is ${q.witness ?? 'unset'} (expected marietti-1931)`);
    }
    for (const a of q.articles) {
      r.articles += 1;
      if (a.anomaly) r.withAnomaly += 1;
      if (a.title == null) r.nullTitle += 1;
      if (a.respondeo == null) r.nullRespondeo += 1;
      const emptyBody =
        a.objections.length === 0 && a.sedContra.length === 0 && a.respondeo == null && a.replies.length === 0;
      if (emptyBody) err('supplement', `${a.citation}: article has no objections, sed contra, respondeo or replies`);
      for (const s of [
        a.title ?? '', a.respondeo ?? '',
        ...a.objections.map((o) => o.text), ...a.sedContra.map((x) => x.text), ...a.replies.map((x) => x.text),
      ]) {
        const hits = findForbidden(s);
        if (hits.length) err('supplement', `${a.citation}: leaked markup ${hits.join(',')} :: ${s.slice(0, 80)}`);
      }
    }
  }

  // anomalies file present + non-trivial
  const anomPath = join(OUT_DIR, 'suppl-anomalies.json');
  if (!existsSync(anomPath)) {
    err('supplement', 'suppl-anomalies.json is missing');
  } else {
    const anom = JSON.parse(readFileSync(anomPath, 'utf8')) as Array<{ where: string; note: string }>;
    r.anomalyEntries = anom.length;
    if (!Array.isArray(anom) || anom.length === 0) err('supplement', 'suppl-anomalies.json is empty');
    for (const e of anom) {
      if (!e || typeof e.where !== 'string' || typeof e.note !== 'string') {
        err('supplement', `suppl-anomalies.json entry is malformed: ${JSON.stringify(e).slice(0, 80)}`);
        break;
      }
    }
  }

  // manifest cross-check (index.parts must carry the Supplementum with kind set)
  const m = index.parts.find((p) => p.code === 'Suppl.');
  if (!m) {
    err('supplement', 'index.json parts[] has no Suppl. entry');
  } else {
    const artCount = part.questions.reduce((n, q) => n + q.articles.length, 0);
    if (m.questionCount !== part.questions.length || m.articleCount !== artCount) {
      err('supplement', `index.json Suppl. manifest (${m.questionCount}q/${m.articleCount}a) disagrees with part-suppl.json (${part.questions.length}q/${artCount}a)`);
    }
    if (m.kind !== 'posthumous-compilation') {
      err('supplement', `index.json Suppl. manifest kind is ${m.kind ?? 'unset'}, expected posthumous-compilation`);
    }
  }
  if (index.parts.length !== 5) err('supplement', `index.json should list 5 top-level sections, lists ${index.parts.length}`);

  return r;
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
  filled: {
    questions: number;
    articles: number;
    pr: number;
    arg: number;
    sc: number;
    co: number;
    ad: number;
    items: string[];
  };
  suppl: SupplReport;
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
  L.push('_Base transcription only; secondary-witness lemmas (filled lacunae) are listed separately below._');
  L.push('');
  L.push('| Lemma type | Input (XML) | Base output | OK |');
  L.push('|------------|-------------|-------------|----|');
  L.push(`| pr | ${typeCounts['pr'] ?? 0} | ${x.outPr} | ${(typeCounts['pr'] ?? 0) === x.outPr ? 'yes' : 'NO'} |`);
  L.push(`| arg | ${typeCounts['arg'] ?? 0} | ${x.outObjections} | ${(typeCounts['arg'] ?? 0) === x.outObjections ? 'yes' : 'NO'} |`);
  L.push(`| sc | ${typeCounts['sc'] ?? 0} | ${x.outSedContra} | ${(typeCounts['sc'] ?? 0) === x.outSedContra ? 'yes' : 'NO'} |`);
  L.push(`| co | ${typeCounts['co'] ?? 0} | ${x.outRespondeo} | ${(typeCounts['co'] ?? 0) === x.outRespondeo ? 'yes' : 'NO'} |`);
  L.push(`| ad | ${typeCounts['ad'] ?? 0} | ${x.outReplies} | ${(typeCounts['ad'] ?? 0) === x.outReplies ? 'yes' : 'NO'} |`);
  const consumed = x.outPr + x.outObjections + x.outSedContra + x.outRespondeo + x.outReplies;
  L.push(`| **total** | ${totalLemmas} | ${consumed} | ${totalLemmas === consumed ? 'yes' : 'NO'} |`);
  L.push('');

  L.push('## Filled lacunae (secondary public-domain witnesses)');
  L.push('');
  L.push(
    `${x.filled.questions} whole question(s) + ${x.filled.articles} article citation(s) supplied from outside the base transcription ` +
      `(${x.filled.pr} pr, ${x.filled.arg} arg, ${x.filled.sc} sc, ${x.filled.co} co, ${x.filled.ad} ad).`,
  );
  for (const it of x.filled.items) L.push(`- ${it}`);
  L.push('');

  L.push('## Supplementum Tertiae Partis (5th top-level section)');
  L.push('');
  L.push(
    `Assembled from OCR of two public-domain printed editions (Marietti 1926/1931, cross-checked against the 1894 ` +
      `Editio altera Romana). ${x.suppl.questions} questions (${x.suppl.coreQuestions} core + ${x.suppl.appendixQuestions} ` +
      `Appendix de Purgatorio) / ${x.suppl.articles} articles.`,
  );
  L.push('');
  L.push(
    `- articles carrying an OCR/uncertainty note: **${x.suppl.withAnomaly}** ` +
      `(detail in \`suppl-anomalies.json\`, ${x.suppl.anomalyEntries} entries)`,
  );
  L.push(`- articles with no parsed title: ${x.suppl.nullTitle}`);
  L.push(`- articles with no respondeo: ${x.suppl.nullRespondeo}`);
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
