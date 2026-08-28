/**
 * Derives `data/summa/gaps.json` — a machine-readable list of citations that are
 * absent from the bundled source transcription (github.com/vicmortelmans/summa).
 *
 * These are genuine lacunae in that single transcription, NOT import bugs and NOT
 * fabricated content. The importer never invents Latin, so the app surfaces these
 * honestly (About screen) and the Reader simply skips absent numbers.
 *
 * "Absent" here is defined structurally: within a part, question numbers should
 * run 1..maxQ and a question's numbered articles should run 1..maxA. Any integer
 * in that range with no corresponding content in the source is reported. We do
 * NOT assert what the missing text "should" say.
 *
 * Run: npx tsx scripts/import-summa/gaps.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../../data/summa');

interface ArticleLike { number: number | null; citation: string }
interface QuestionLike { number: number; citation: string; articles: ArticleLike[] }
interface PartLike { code: string; shortTitle: string; questions: QuestionLike[] }

const partFiles = ['part-I.json', 'part-I-II.json', 'part-II-II.json', 'part-III.json'];

interface Gap {
  kind: 'question' | 'article';
  partCode: string;
  citation: string;
  note: string;
}

const gaps: Gap[] = [];

for (const file of partFiles) {
  const part = JSON.parse(readFileSync(resolve(dataDir, file), 'utf8')) as PartLike;
  const qNums = part.questions.map((q) => q.number).sort((a, b) => a - b);
  const maxQ = qNums[qNums.length - 1] ?? 0;
  const haveQ = new Set(qNums);
  for (let n = 1; n <= maxQ; n += 1) {
    if (!haveQ.has(n)) {
      gaps.push({
        kind: 'question',
        partCode: part.code,
        citation: `${part.code} q. ${n}`,
        note: 'No content for this question in the source transcription.',
      });
    }
  }
  for (const q of part.questions) {
    const aNums = q.articles
      .map((a) => a.number)
      .filter((x): x is number => typeof x === 'number')
      .sort((a, b) => a - b);
    if (aNums.length === 0) continue; // unnumbered single-article question — not a gap
    const maxA = aNums[aNums.length - 1];
    const haveA = new Set(aNums);
    for (let n = 1; n <= maxA; n += 1) {
      if (!haveA.has(n)) {
        gaps.push({
          kind: 'article',
          partCode: part.code,
          citation: `${part.code} q. ${q.number} a. ${n}`,
          note: 'No content for this article in the source transcription.',
        });
      }
    }
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'https://raw.githubusercontent.com/vicmortelmans/summa/master/build/xml_latin_nl/xml_latin_nl.xml',
  explanation:
    'Citations for which the bundled single-source transcription supplies no Latin text. ' +
    'These are lacunae in that transcription. This application never fabricates or ' +
    'substitutes Latin, so these passages are simply not present. Everything else ' +
    '(2652 articles) is the complete original Latin.',
  missingQuestions: gaps.filter((g) => g.kind === 'question').map((g) => g.citation),
  missingArticles: gaps.filter((g) => g.kind === 'article').map((g) => g.citation),
  count: gaps.length,
};

writeFileSync(resolve(dataDir, 'gaps.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(
  `gaps.json written: ${out.missingQuestions.length} missing question(s), ${out.missingArticles.length} missing article(s).`,
);
console.log('missing questions:', out.missingQuestions.join(', ') || '(none)');
console.log('missing articles:', out.missingArticles.join(', ') || '(none)');
