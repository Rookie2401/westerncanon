/**
 * Validation for data/summa-en/ (Summa Theologiae, English translation by
 * the Fathers of the English Dominican Province, 1920 — newadvent.org).
 * Mirrors the shape of scripts/import-aristotle-categoriae-en/validate.ts.
 *
 *   npx tsx scripts/import-summa-en/validate.ts
 *
 * Writes data/summa-en/VALIDATION_REPORT.md, prints a summary, and exits
 * non-zero if any ERROR-level check fails. WARN-level findings (preserved
 * source irregularities, already documented in anomalies.json) do not fail
 * the run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Article, Part, PartCode, PartId, Question } from '../../data/summa/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const DIR = join(REPO_ROOT, 'data', 'summa-en');
const LATIN_DIR = join(REPO_ROOT, 'data', 'summa');

interface Anomaly {
  where: string;
  note: string;
}

interface PartSpec {
  file: string;
  /** URL part-digit, matching scripts/import-summa-en/fetch.ts and index.ts's own `where` slugs (e.g. "1074.htm"). */
  digit: string;
  id: PartId;
  code: PartCode;
  shortTitle: string;
  questionCount: number;
  hasCompilationNote: boolean;
}

const PART_SPECS: PartSpec[] = [
  { file: 'part-I.json', digit: '1', id: 'prima-pars-en', code: 'I', shortTitle: 'Part I', questionCount: 119, hasCompilationNote: false },
  { file: 'part-I-II.json', digit: '2', id: 'prima-secundae-en', code: 'I-II', shortTitle: 'Part I-II', questionCount: 114, hasCompilationNote: false },
  { file: 'part-II-II.json', digit: '3', id: 'secunda-secundae-en', code: 'II-II', shortTitle: 'Part II-II', questionCount: 189, hasCompilationNote: false },
  { file: 'part-III.json', digit: '4', id: 'tertia-pars-en', code: 'III', shortTitle: 'Part III', questionCount: 90, hasCompilationNote: false },
  { file: 'part-suppl.json', digit: '5', id: 'supplementum-en', code: 'Suppl.', shortTitle: 'Supplement', questionCount: 102, hasCompilationNote: true },
];

/** Appendix question number -> the raw HTML filename index.ts used as its `where` slug for that question. */
const APPENDIX_FILE_BY_NUMBER: Record<number, string> = { 100: 'appendix-1-1.html', 101: 'appendix-1-2.html', 102: 'appendix-2-1.html' };

/** The exact page-slug fragment index.ts uses in its `where` strings for a given (part, question), e.g. "1074.htm" or "appendix-2-1.html". */
function pageSlug(spec: PartSpec, q: Question): string {
  if (q.appendix) return APPENDIX_FILE_BY_NUMBER[q.number] ?? `appendix-${q.appendix}-${q.appendixNumber}`;
  return `${spec.digit}${String(q.number).padStart(3, '0')}.htm`;
}

/** Verbatim head of Part I q.1 a.1's first objection (guards against truncation / mis-stripping at the very start of the corpus). */
const SPOT_START = 'It seems that, besides philosophical science, we have no need of any further knowledge.';
/** Verbatim tail of the Supplementum's very last article (App. II q.1 a.2's respondeo — guards against truncation at the end of the corpus). */
const SPOT_END = 'they are not punished for being above us, but for that which is lowest in them, namely sin.';

const LEAK_MARKERS = ['&amp;', '&lt;', '&gt;', '&#', '<a ', '</a>', '<p>', '</p>', '<strong', '</strong', 'href=', 'cathen/', '../summa/', '<span', '<div', '<em>', '</em>'];

type Level = 'ERROR' | 'WARN';
interface Finding {
  level: Level;
  check: string;
  message: string;
}

const findings: Finding[] = [];
const err = (check: string, m: string) => findings.push({ level: 'ERROR', check, message: m });
const warn = (check: string, m: string) => findings.push({ level: 'WARN', check, message: m });

function walkArticleTexts(a: Article, visit: (s: string, field: string) => void): void {
  visit(a.title ?? '', 'title');
  a.objections.forEach((o, i) => visit(o.text, `objections[${i}]`));
  a.sedContra.forEach((s, i) => visit(s.text, `sedContra[${i}]`));
  if (a.respondeo != null) visit(a.respondeo, 'respondeo');
  a.replies.forEach((r, i) => visit(r.text, `replies[${i}]`));
}

function main(): void {
  for (const spec of PART_SPECS) {
    if (!existsSync(join(DIR, spec.file))) err('presence', `missing ${spec.file} — run the importer`);
  }
  if (!existsSync(join(DIR, 'anomalies.json'))) err('presence', 'missing anomalies.json — run the importer');
  if (findings.some((f) => f.level === 'ERROR')) {
    writeReport({ perPart: [], totalQuestions: 0, totalArticles: 0, anomalies: [], spotCheck: [] });
    printAndExit();
    return;
  }

  const anomalies = JSON.parse(readFileSync(join(DIR, 'anomalies.json'), 'utf8')) as Anomaly[];

  const parts: Record<string, Part> = {};
  for (const spec of PART_SPECS) {
    const part = JSON.parse(readFileSync(join(DIR, spec.file), 'utf8')) as Part;
    parts[spec.file] = part;

    if (part.id !== spec.id) err('part-id', `${spec.file}: id is ${JSON.stringify(part.id)}, expected ${JSON.stringify(spec.id)}`);
    if (part.code !== spec.code) err('part-code', `${spec.file}: code is ${JSON.stringify(part.code)}, expected ${JSON.stringify(spec.code)}`);
    if (part.prooemium !== null) err('part-prooemium', `${spec.file}: Part.prooemium must be null, got ${JSON.stringify(part.prooemium).slice(0, 80)}`);
    if (typeof part.latinTitle !== 'string' || part.latinTitle.length === 0) err('part-latinTitle', `${spec.file}: latinTitle missing/empty`);
    if (typeof part.shortTitle !== 'string' || part.shortTitle.length === 0) err('part-shortTitle', `${spec.file}: shortTitle missing/empty`);
    if (spec.hasCompilationNote && !part.compilationNote) err('part-compilationNote', `${spec.file}: expected a compilationNote (Supplementum is a posthumous compilation), found none`);
    if (!spec.hasCompilationNote && part.compilationNote) err('part-compilationNote', `${spec.file}: unexpected compilationNote on a non-Supplementum part`);

    if (part.questions.length !== spec.questionCount) {
      err('question-count', `${spec.file}: expected ${spec.questionCount} questions, got ${part.questions.length}`);
    }

    // question numbers strictly increasing, no duplicates
    for (let i = 1; i < part.questions.length; i++) {
      if (part.questions[i]!.number <= part.questions[i - 1]!.number) {
        err('question-order', `${spec.file}: question numbers not strictly increasing at index ${i}: ${part.questions[i - 1]!.number} -> ${part.questions[i]!.number}`);
      }
    }

    for (const q of part.questions) {
      const qLabel = `${spec.file} q.${q.number}`;
      const slug = pageSlug(spec, q);
      // The exact `where` prefix index.ts itself uses for this question/article,
      // e.g. "summa-en / 1074.htm" / "summa-en / 1074.htm art.3" — matching this
      // (not qLabel, which is only for human-readable messages here) is what lets
      // an anomaly actually documented by the importer satisfy these checks.
      const qDocWhere = `summa-en / ${slug}`;
      const anomaliesForQuestion = anomalies.filter((an) => an.where.startsWith(qDocWhere));

      if (q.prooemium !== null) err('question-prooemium', `${qLabel}: Question.prooemium must be null, got non-null`);
      if (!q.appendix) {
        const expectedCitation = `${spec.code} q. ${q.number}`;
        if (q.citation !== expectedCitation) err('question-citation', `${qLabel}: citation ${JSON.stringify(q.citation)} != expected ${JSON.stringify(expectedCitation)}`);
      } else {
        const expectedCitation = `Suppl. App. ${q.appendix} q. ${q.appendixNumber}`;
        if (q.citation !== expectedCitation) err('question-citation-appendix', `${qLabel}: citation ${JSON.stringify(q.citation)} != expected ${JSON.stringify(expectedCitation)}`);
      }
      if (q.title === null || (typeof q.title === 'string' && q.title.length === 0)) {
        // allowed only if documented in anomalies (h1 with no title text)
        if (anomaliesForQuestion.length === 0) {
          err('question-title', `${qLabel}: title is null/empty and not documented in anomalies.json (English edition should always have a Question.title)`);
        }
      }
      if (q.articles.length === 0) {
        err('question-articles', `${qLabel}: has zero articles`);
        continue;
      }
      // article numbers must be 1..N in order (each importer-verified article set starts at 1)
      q.articles.forEach((a, i) => {
        const expectedNum = i + 1;
        if (a.number !== expectedNum && anomaliesForQuestion.length === 0) {
          err('article-number-sequence', `${qLabel}: article at index ${i} has number ${a.number}, expected ${expectedNum} (and no anomaly documents a renumbering)`);
        }
      });

      for (const a of q.articles) {
        const aLabel = `${qLabel} art.${a.number}`;
        const aDocWhere = `${qDocWhere} art.${a.number}`;
        const anomaliesForArticle = anomalies.filter((an) => an.where === aDocWhere);

        if (a.number === null) err('article-number-null', `${aLabel}: Article.number is null — the English edition (unlike Latin) always numbers articles`);
        if (a.title === null || (typeof a.title === 'string' && a.title.length === 0)) {
          err('article-title', `${aLabel}: Article.title is null/empty — should always be populated from the page's own h2 heading`);
        }
        const expectedPrefix = q.appendix ? `Suppl. App. ${q.appendix} q. ${q.appendixNumber} a. ${a.number}` : `${spec.code} q. ${q.number} a. ${a.number}`;
        if (a.citation !== expectedPrefix) err('article-citation', `${aLabel}: citation ${JSON.stringify(a.citation)} != expected ${JSON.stringify(expectedPrefix)}`);
        if (a.witness !== undefined) err('article-witness', `${aLabel}: witness must be unset for this edition (no secondary-witness process), got ${JSON.stringify(a.witness)}`);

        if (a.objections.length === 0 && anomaliesForArticle.length === 0) {
          err('article-objections-empty', `${aLabel}: no objections and not documented in anomalies.json`);
        }
        if (a.respondeo === null) {
          const documented = anomaliesForArticle.some((an) => /respondeo/i.test(an.note));
          if (!documented) err('article-respondeo-null', `${aLabel}: respondeo is null and not documented in anomalies.json`);
        }
        // objection numbers should be 1..N with no gaps/dupes (index.ts logs an
        // anomaly for every case where they aren't — verified genuine source
        // irregularities, not parser bugs; see anomalies.json for each one)
        const objNums = a.objections.map((o) => o.number);
        const sortedObjNums = [...objNums].sort((x, y) => x - y);
        const isCleanSequence = sortedObjNums.every((n, i) => n === i + 1);
        if (!isCleanSequence) {
          const documented = anomaliesForArticle.some((an) => /Objection numbers/i.test(an.note));
          (documented ? warn : err)('objection-numbering', `${aLabel}: objection numbers are ${JSON.stringify(objNums)}, not a clean 1..N sequence${documented ? ' (documented in anomalies.json)' : ' and NOT documented in anomalies.json'}`);
        }
        // reply objectionNumbers (when non-null) should reference a real objection number
        for (const r of a.replies) {
          if (r.objectionNumber !== null && !objNums.includes(r.objectionNumber)) {
            const documented = anomaliesForArticle.some((an) => an.note.includes(`Reply to Objection ${r.objectionNumber}`) && /no matching Objection/i.test(an.note));
            (documented ? warn : err)('reply-orphan', `${aLabel}: Reply.objectionNumber ${r.objectionNumber} does not match any Objection number ${JSON.stringify(objNums)}${documented ? ' (documented in anomalies.json)' : ' and NOT documented in anomalies.json'}`);
          }
        }
        walkArticleTexts(a, (s, field) => {
          if (typeof s !== 'string') return;
          for (const marker of LEAK_MARKERS) {
            if (s.includes(marker)) err('no-leaked-markup', `${aLabel} ${field}: contains ${JSON.stringify(marker)}`);
          }
          if (s.includes('�')) err('no-replacement-char', `${aLabel} ${field}: contains U+FFFD replacement character`);
          if (/\s{2,}/.test(s)) warn('whitespace', `${aLabel} ${field}: contains a run of 2+ whitespace characters (should be collapsed)`);
          if (s !== s.trim()) warn('untrimmed', `${aLabel} ${field}: has leading/trailing whitespace`);
        });
      }
    }
  }

  // --- cross-check appendix numbering/citation scheme against the Latin edition ---
  const suppl = parts['part-suppl.json']!;
  const latinSuppl = JSON.parse(readFileSync(join(LATIN_DIR, 'part-suppl.json'), 'utf8')) as Part;
  const enAppendixQs = suppl.questions.filter((q) => q.appendix);
  if (enAppendixQs.length !== 3) err('appendix-count', `expected 3 appendix questions in part-suppl.json, got ${enAppendixQs.length}`);
  for (const q of enAppendixQs) {
    const latinMatch = latinSuppl.questions.find((lq) => lq.number === q.number);
    if (!latinMatch) {
      err('appendix-scheme', `English Suppl. q.${q.number} (appendix ${q.appendix} #${q.appendixNumber}) has no matching Latin question number in part-suppl.json`);
    } else if (latinMatch.appendix !== q.appendix || latinMatch.appendixNumber !== q.appendixNumber || latinMatch.citation !== q.citation) {
      err('appendix-scheme', `English Suppl. q.${q.number} appendix scheme (${q.appendix}/${q.appendixNumber}, citation ${q.citation}) does not match Latin's (${latinMatch.appendix}/${latinMatch.appendixNumber}, citation ${latinMatch.citation})`);
    }
  }

  // --- required anomaly documentation ---
  if (!anomalies.some((a) => /prooemium/i.test(a.note))) err('anomaly-doc-prooemium', 'anomalies.json must document why Question.prooemium is always null');
  if (!anomalies.some((a) => /cathen|link/i.test(a.note))) err('anomaly-doc-links', 'anomalies.json must document the cross-reference-link stripping');

  // --- spot checks (verbatim, guards against truncation / mis-stripping at the corpus boundaries) ---
  const spotCheck: { label: string; ok: boolean; got: string }[] = [];
  const partI = parts['part-I.json'];
  const firstObj = partI?.questions[0]?.articles[0]?.objections[0]?.text ?? '';
  const okStart = firstObj.startsWith(SPOT_START);
  spotCheck.push({ label: `Part I q.1 a.1 objection 1 starts "${SPOT_START.slice(0, 50)}..."`, ok: okStart, got: firstObj.slice(0, 100) });
  if (!okStart) err('spot-check-start', `Part I q.1 a.1 objection 1 does not start with the expected text (got: ${JSON.stringify(firstObj.slice(0, 100))})`);

  const lastQ = suppl.questions[suppl.questions.length - 1];
  const lastArt = lastQ?.articles[lastQ.articles.length - 1];
  const lastRespondeo = lastArt?.respondeo ?? '';
  const okEnd = lastRespondeo.endsWith(SPOT_END);
  spotCheck.push({ label: `Supplementum's last article (${lastArt?.citation}) respondeo ends "...${SPOT_END.slice(-50)}"`, ok: okEnd, got: lastRespondeo.slice(-100) });
  if (!okEnd) err('spot-check-end', `Supplementum's last article respondeo does not end with the expected text (got tail: ${JSON.stringify(lastRespondeo.slice(-100))})`);

  // --- counts ---
  const perPart = PART_SPECS.map((spec) => {
    const part = parts[spec.file]!;
    const articleCount = part.questions.reduce((n, q) => n + q.articles.length, 0);
    return { file: spec.file, shortTitle: spec.shortTitle, questions: part.questions.length, articles: articleCount };
  });
  const totalQuestions = perPart.reduce((n, p) => n + p.questions, 0);
  const totalArticles = perPart.reduce((n, p) => n + p.articles, 0);

  writeReport({ perPart, totalQuestions, totalArticles, anomalies, spotCheck });
  printAndExit();
}

function printAndExit(): void {
  process.stdout.write('\n=== validate:summa-en ===\n');
  for (const f of findings) process.stdout.write(`  [${f.level}] ${f.check}: ${f.message.split('\n')[0]}\n`);
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  process.stdout.write(`\n${errors.length} error(s), ${warns.length} warning(s).\n`);
  process.stdout.write(`  report -> ${join(DIR, 'VALIDATION_REPORT.md')}\n`);
  if (errors.length > 0) process.exit(1);
}

function writeReport(data: {
  perPart: { file: string; shortTitle: string; questions: number; articles: number }[];
  totalQuestions: number;
  totalArticles: number;
  anomalies: Anomaly[];
  spotCheck: { label: string; ok: boolean; got: string }[];
}): void {
  const errors = findings.filter((f) => f.level === 'ERROR');
  const warns = findings.filter((f) => f.level === 'WARN');
  const L: string[] = [];
  L.push('# summa-en validation report');
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`**Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}** — ${errors.length} error(s), ${warns.length} warning(s).`);
  L.push('');
  L.push('## Methodology');
  L.push('');
  L.push(
    'Source: *Summa Theologiae*, English translation by the Fathers of the English Dominican Province ' +
      '(2nd/revised ed., 1920), hosted at newadvent.org. Fetched one page per Question — ' +
      '`https://www.newadvent.org/summa/{partDigit}{qNum:03d}.htm` for Parts I/I-II/II-II/III/Suppl. ' +
      '(digits 1-5), plus `6001.htm`/`6002.htm` (Supplementum Appendix I) and `7001.htm` (Appendix II) — ' +
      '614 pages total; every Article of a Question is anchored on that same page (`#articleN`), so there is ' +
      'no separate per-article fetch. Raw HTML is cached under `scripts/import-summa-en/raw/` and parsed with ' +
      'jsdom; cross-reference links (`<a href="../cathen/...">`, `../bible/...`) are stripped to their plain ' +
      'text as ordinary HTML-transport cleanup, and HTML entities are decoded by jsdom\'s own HTML parsing.',
  );
  L.push('');
  L.push(
    'Differences from the bundled Latin edition (`data/summa/`), both intentional and disclosed: ' +
      '`Question.prooemium` and `Part.prooemium` are always `null` (New Advent prints no continuous prooemium ' +
      'prose before Article 1, and Tertia Pars\'s Latin part-level prooemium has no per-question-page English ' +
      'equivalent to extract); `Article.title` is always populated (parsed directly from each page\'s own ' +
      '"Article N. ..." heading, unlike the Latin edition where title-parsing from the prooemium enumeration ' +
      'sometimes fails); `Article.witness` is never set (no secondary-witness lacuna-filling process exists ' +
      'for this edition — a genuine gap is logged in anomalies.json instead of being filled).',
  );
  L.push('');
  L.push(
    'Appendix numbering: the Supplementum\'s 99 base questions (5001-5099.htm) are followed by 3 appendix ' +
      'questions continuing the same numbering as 100, 101 and 102 — matching the Latin edition\'s ' +
      '`data/summa/part-suppl.json` scheme exactly (cross-checked programmatically by this validator): ' +
      '`6001.htm` -> q.100 (`appendix: \'I\', appendixNumber: 1`, citation `"Suppl. App. I q. 1"`), ' +
      '`6002.htm` -> q.101 (`appendix: \'I\', appendixNumber: 2`, citation `"Suppl. App. I q. 2"`), ' +
      '`7001.htm` -> q.102 (`appendix: \'II\', appendixNumber: 1`, citation `"Suppl. App. II q. 1"`).',
  );
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push('| part | questions | articles |');
  L.push('|------|-----------|----------|');
  for (const p of data.perPart) L.push(`| ${p.shortTitle} (${p.file}) | ${p.questions} | ${p.articles} |`);
  L.push(`| **TOTAL** | **${data.totalQuestions}** | **${data.totalArticles}** |`);
  L.push('');
  L.push(`- anomalies recorded: ${data.anomalies.length}`);
  L.push('');
  L.push('## Verbatim spot-check');
  L.push('');
  if (data.spotCheck.length === 0) L.push('_not run (earlier presence check failed)_');
  for (const s of data.spotCheck) L.push(`- ${s.ok ? 'OK' : 'FAIL'} — ${s.label}\n  - got: \`${s.got}\``);
  L.push('');
  L.push('## Anomalies (preserved, not corrected)');
  L.push('');
  L.push(`${data.anomalies.length} total — full detail in \`data/summa-en/anomalies.json\`. By category:`);
  L.push('');
  const categoryOf = (note: string): string => {
    if (/prooemium/i.test(note)) return 'prooemium scope note';
    if (/cross-reference|cathen|link/i.test(note)) return 'link-stripping scope note';
    if (/no "I answer that,"|respondeo opening is plain/i.test(note)) return 'missing/unmarked respondeo';
    if (/no Objection paragraphs/i.test(note)) return 'no objections found';
    if (/On the contrary,.* paragraphs/i.test(note)) return 'multiple "On the contrary," in one article';
    if (/combined reply paragraph explicitly named/i.test(note)) return 'one reply paragraph covering multiple objection numbers';
    if (/unusually phrased reply heading/i.test(note)) return 'non-standard reply heading wording';
    if (/label contained extra trailing text/i.test(note)) return 'merged/stray label text in a <strong> tag';
    if (/no preceding labeled section/i.test(note)) return 'prefatory note outside the Objection/SedContra/Respondeo/Reply schema';
    if (/printed Objection numbers are/i.test(note)) return 'printed Objection numbers not a clean 1..N sequence';
    if (/has no matching Objection/i.test(note)) return 'a printed "Reply to Objection N" with no matching Objection N';
    if (/h1.*no "Question N\."/i.test(note)) return 'Appendix II title judgement call';
    return 'other';
  };
  const byCategory = new Map<string, number>();
  for (const a of data.anomalies) byCategory.set(categoryOf(a.note), (byCategory.get(categoryOf(a.note)) ?? 0) + 1);
  for (const [cat, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) L.push(`- ${n} — ${cat}`);
  L.push('');
  L.push('<details><summary>Full list</summary>');
  L.push('');
  for (const a of data.anomalies) L.push(`- **${a.where}** — ${a.note}`);
  L.push('');
  L.push('</details>');
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
  writeFileSync(join(DIR, 'VALIDATION_REPORT.md'), L.join('\n'), 'utf8');
}

main();
