/**
 * Summa Theologiae import pipeline (dev-only, run once).
 *
 *   npm run import:summa
 *
 * Reads scripts/import-summa/raw/xml_latin_nl.xml (downloading it once if
 * missing) and regenerates every file in data/summa/. The app bundles those
 * JSON files and never fetches anything at runtime.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PARTS,
  articleCitation,
  partCodeFromReference,
  questionCitation,
} from './citations.ts';
import { assignArticleTitles } from './enumerations.ts';
import { foldForSearch } from './normalize.ts';
import { parseSource, type RawLemma } from './parse.ts';
import type {
  Article,
  Part,
  PartManifest,
  Prooemium,
  Question,
  SearchRecord,
  SummaIndex,
} from '../../data/summa/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'xml_latin_nl.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'summa');

const SOURCE_URL =
  'https://raw.githubusercontent.com/vicmortelmans/summa/master/build/xml_latin_nl/xml_latin_nl.xml';
const LICENSE_NOTE =
  'Latin text of the Summa Theologiae is in the public domain. Source aggregation: ' +
  'github.com/vicmortelmans/summa (Dutch translation stripped during import). ' +
  'No Supplementum in this source: Proœmium + Prima Pars, Prima Secundae, Secunda Secundae, Tertia Pars only.';

const PART_LEVEL_PR_RE = /^(?:Ia-IIae|IIa-IIae|IIIa|Ia),?\s+pr\.$/;
const QUESTION_PR_RE = /q\.\s*\d+\s+pr\.$/;
const COMBINED_REPLY_RE = /\bad\s+arg\.$/;

async function ensureRawXml(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  mkdirSync(RAW_DIR, { recursive: true });
  process.stdout.write(`raw XML not found, downloading from ${SOURCE_URL} ...\n`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(RAW_XML, buf);
  process.stdout.write(`saved ${buf.length} bytes to ${RAW_XML}\n`);
}

interface ArticleAccum {
  arg: RawLemma[];
  sc: RawLemma[];
  co: RawLemma[];
  ad: RawLemma[];
}

interface QuestionAccum {
  number: number;
  prooemium: string | null;
  /** keyed by article number; `-1` bucket collects the unnumbered single article */
  articles: Map<number, ArticleAccum>;
}

const UNNUMBERED_KEY = -1;

function emptyArticle(): ArticleAccum {
  return { arg: [], sc: [], co: [], ad: [] };
}

function buildParts(lemmas: RawLemma[]): {
  parts: Part[];
  workProoemium: Prooemium | null;
  titleRejections: string[];
} {
  const workPrLemma = lemmas.find((l) => l.reference === 'Summa theologiae, pr.');
  const workProoemium: Prooemium | null = workPrLemma
    ? { citation: 'Summa theologiae, pr.', text: workPrLemma.latin }
    : null;

  const parts: Part[] = [];
  const titleRejections: string[] = [];

  for (const meta of PARTS) {
    const partLemmas = lemmas.filter((l) => l.liberIndex === meta.liberIndex);
    let partProoemium: string | null = null;
    const questions = new Map<number, QuestionAccum>();

    const getQ = (n: number): QuestionAccum => {
      let q = questions.get(n);
      if (!q) {
        q = { number: n, prooemium: null, articles: new Map() };
        questions.set(n, q);
      }
      return q;
    };

    for (const l of partLemmas) {
      // Cross-check the reference's part code against the structural liber.
      const refCode = partCodeFromReference(l.reference);
      if (refCode && refCode !== meta.code) {
        throw new Error(
          `part mismatch: ${l.reference} is in liber ${meta.liberIndex} (${meta.code}) but ref says ${refCode}`,
        );
      }

      if (l.type === 'pr' && PART_LEVEL_PR_RE.test(l.reference)) {
        partProoemium = l.latin;
        continue;
      }
      if (l.quaestio == null) {
        throw new Error(`lemma with no <quaestio> integer inside a part: ${l.reference}`);
      }
      const q = getQ(l.quaestio);

      if (l.type === 'pr') {
        if (!QUESTION_PR_RE.test(l.reference)) {
          throw new Error(`unrecognised prooemium reference shape: ${l.reference}`);
        }
        q.prooemium = q.prooemium ? `${q.prooemium} ${l.latin}` : l.latin;
        continue;
      }

      const key = l.articulus ?? UNNUMBERED_KEY;
      let acc = q.articles.get(key);
      if (!acc) {
        acc = emptyArticle();
        q.articles.set(key, acc);
      }
      acc[l.type].push(l);
    }

    const questionList: Question[] = [...questions.values()]
      .sort((a, b) => a.number - b.number)
      .map((qa) => {
        const numberedKeys = [...qa.articles.keys()]
          .filter((k) => k !== UNNUMBERED_KEY)
          .sort((a, b) => a - b);
        const hasUnnumbered = qa.articles.has(UNNUMBERED_KEY);

        const assignment = assignArticleTitles(qa.prooemium, numberedKeys);
        if (assignment.rejected && (numberedKeys.length > 0 || hasUnnumbered)) {
          titleRejections.push(
            `${meta.code} q. ${qa.number}: ${assignment.rejected}` +
              (assignment.itemCount != null
                ? ` (parsed ${assignment.itemCount} items vs ${numberedKeys.length} numbered articles` +
                  `${hasUnnumbered ? ' + 1 unnumbered' : ''})`
                : ''),
          );
        }

        const orderedKeys: number[] = [...numberedKeys];
        if (hasUnnumbered) orderedKeys.push(UNNUMBERED_KEY);

        const articles: Article[] = orderedKeys.map((key) => {
          const acc = qa.articles.get(key)!;
          const number = key === UNNUMBERED_KEY ? null : key;

          const objections = [...acc.arg]
            .sort((a, b) => a.index - b.index)
            .map((l) => ({ number: l.index, text: l.latin }));
          const sedContra = [...acc.sc]
            .sort((a, b) => a.index - b.index)
            .map((l) => ({ number: l.index, text: l.latin }));
          const respondeo =
            acc.co.length === 0
              ? null
              : [...acc.co].sort((a, b) => a.index - b.index).map((l) => l.latin).join(' ');
          const replies = [...acc.ad]
            .sort((a, b) => a.index - b.index)
            .map((l) => ({
              objectionNumber: COMBINED_REPLY_RE.test(l.reference) ? null : l.index,
              text: l.latin,
            }));

          const title = number != null ? assignment.byNumber.get(number) ?? null : null;

          return {
            number,
            citation: articleCitation(meta.code, qa.number, number),
            title,
            objections,
            sedContra,
            respondeo,
            replies,
          } satisfies Article;
        });

        return {
          number: qa.number,
          citation: questionCitation(meta.code, qa.number),
          title: null,
          prooemium: qa.prooemium,
          articles,
        } satisfies Question;
      });

    parts.push({
      id: meta.id,
      code: meta.code,
      latinTitle: meta.latinTitle,
      shortTitle: meta.shortTitle,
      prooemium: partProoemium,
      questions: questionList,
    });
  }

  return { parts, workProoemium, titleRejections };
}

function buildSearchIndex(parts: Part[]): SearchRecord[] {
  const records: SearchRecord[] = [];
  for (const part of parts) {
    for (const q of part.questions) {
      for (const a of q.articles) {
        const segments: string[] = [];
        if (a.title) segments.push(a.title);
        for (const o of a.objections) segments.push(o.text);
        for (const s of a.sedContra) segments.push(s.text);
        if (a.respondeo) segments.push(a.respondeo);
        for (const r of a.replies) segments.push(r.text);
        const joined = segments.join(' · ');
        records.push({
          citation: a.citation,
          articleTitle: a.title,
          partCode: part.code,
          q: q.number,
          a: a.number,
          text: foldForSearch(joined),
          snippet: joined.slice(0, 240).trim(),
        });
      }
    }
  }
  return records;
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, name === 'search-index.json' ? 0 : 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(0)} KB)\n`);
}

async function main(): Promise<void> {
  await ensureRawXml();
  mkdirSync(OUT_DIR, { recursive: true });

  process.stdout.write(`parsing ${RAW_XML} ...\n`);
  const source = parseSource(RAW_XML);
  process.stdout.write(
    `  ${source.totalLemmas} lemmas  ${JSON.stringify(source.typeCounts)}\n`,
  );

  const { parts, workProoemium, titleRejections } = buildParts(source.lemmas);
  if (!workProoemium) throw new Error('work-level prooemium ("Summa theologiae, pr.") not found');

  const manifest: PartManifest[] = parts.map((p) => ({
    id: p.id,
    code: p.code,
    latinTitle: p.latinTitle,
    shortTitle: p.shortTitle,
    questionCount: p.questions.length,
    articleCount: p.questions.reduce((n, q) => n + q.articles.length, 0),
  }));

  const index: SummaIndex = {
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    sourceCommit: null,
    license: LICENSE_NOTE,
    parts: manifest,
  };

  process.stdout.write('writing data/summa/ ...\n');
  writeJson('index.json', index);
  writeJson('prooemium.json', workProoemium);
  for (const part of parts) writeJson(`part-${part.code}.json`, part);
  const searchIndex = buildSearchIndex(parts);
  writeJson('search-index.json', searchIndex);

  // Console summary
  const totalQ = manifest.reduce((n, p) => n + p.questionCount, 0);
  const totalA = manifest.reduce((n, p) => n + p.articleCount, 0);
  let nullTitles = 0;
  for (const p of parts) for (const q of p.questions) for (const a of q.articles) if (a.title == null) nullTitles += 1;
  process.stdout.write('\nSummary:\n');
  for (const p of manifest) {
    process.stdout.write(
      `  ${p.code.padEnd(6)} questions=${p.questionCount}  articles=${p.articleCount}\n`,
    );
  }
  process.stdout.write(`  TOTAL  questions=${totalQ}  articles=${totalA}\n`);
  process.stdout.write(
    `  article titles: ${totalA - nullTitles}/${totalA} ` +
      `(${(((totalA - nullTitles) / totalA) * 100).toFixed(2)}% non-null)\n`,
  );
  if (titleRejections.length) {
    process.stdout.write(`  ${titleRejections.length} question(s) with no/rejected enumeration:\n`);
    for (const r of titleRejections) process.stdout.write(`    - ${r}\n`);
  }
  process.stdout.write('\nDone. Run `npm run validate:summa` next.\n');
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
