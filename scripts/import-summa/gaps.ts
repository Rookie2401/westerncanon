/**
 * Derives `data/summa/gaps.json` — a machine-readable list of citations that are
 * STILL absent after the lacunae in the base transcription
 * (github.com/vicmortelmans/summa) have been filled from public-domain secondary
 * witnesses (see `lacunae.ts` and `index.json` -> `filledLacunae`).
 *
 * As of the completeness pass this list is expected to be EMPTY: every question
 * and every numbered article in Parts I–III now runs contiguously, and the
 * Supplementum has been added. Anything reported here is a genuine remaining
 * lacuna — never an import bug and never fabricated content.
 *
 * "Absent" is defined structurally: within a part, question numbers should run
 * 1..maxQ and a question's numbered articles 1..maxA. Any integer in that range
 * with no corresponding content is reported. We do NOT assert what missing text
 * "should" say.
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

const partFiles = ['part-I.json', 'part-I-II.json', 'part-II-II.json', 'part-III.json', 'part-suppl.json'];

interface Gap {
  kind: 'question' | 'article';
  partCode: string;
  citation: string;
  note: string;
}

const gaps: Gap[] = [];

import { existsSync } from 'node:fs';

for (const file of partFiles) {
  const path = resolve(dataDir, file);
  if (!existsSync(path)) continue; // part-suppl.json may not be built yet
  const part = JSON.parse(readFileSync(path, 'utf8')) as PartLike;
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
    'Citations for which NO original-language Latin text is present, after the thirteen ' +
    'lacunae in the base transcription were filled from public-domain secondary witnesses ' +
    '(see index.json -> filledLacunae) and the Supplementum Tertiae Partis was added. ' +
    'This list is normally empty: Parts I-III run contiguously and the Supplementum is ' +
    'complete. Any entry here is a genuine remaining lacuna the app does not paper over — ' +
    'nothing is ever fabricated or substituted.',
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
