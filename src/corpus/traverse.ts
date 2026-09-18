/**
 * Prev/next article traversal across the whole corpus in reading order.
 *
 * Question and article numbers are NOT contiguous (the source omits a few), so
 * this always iterates the actual arrays — it never assumes `n+1` exists. At a
 * part boundary it steps into the adjacent part. Absent citations (gaps.json)
 * simply are not in the arrays, so they are skipped for free.
 */
import { PARTS, aParamOf, loadPart } from './corpus.ts';
import type { AParam } from './corpus.ts';
import type { Part } from './types.ts';

export interface ArticleRef {
  partId: string;
  qNum: number;
  aParam: AParam;
  citation: string;
  title: string | null;
}

function flatten(part: Part): ArticleRef[] {
  const out: ArticleRef[] = [];
  const questions = [...part.questions].sort((a, b) => a.number - b.number);
  for (const q of questions) {
    const articles = [...q.articles].sort(
      (a, b) => (a.number ?? 0) - (b.number ?? 0),
    );
    for (const a of articles) {
      out.push({
        partId: part.id,
        qNum: q.number,
        aParam: aParamOf(a),
        citation: a.citation,
        title: a.title,
      });
    }
  }
  return out;
}

const flatCache = new Map<string, ArticleRef[]>();
async function flatFor(partId: string): Promise<ArticleRef[]> {
  const hit = flatCache.get(partId);
  if (hit) return hit;
  const info = PARTS.find((p) => p.id === partId);
  if (!info) return [];
  const list = flatten(await loadPart(info.id));
  flatCache.set(partId, list);
  return list;
}

function indexOfRef(list: ArticleRef[], qNum: number, aParam: AParam): number {
  return list.findIndex((r) => r.qNum === qNum && r.aParam === aParam);
}

export interface Neighbors {
  prev: ArticleRef | null;
  next: ArticleRef | null;
}

export async function neighbors(
  partId: string,
  qNum: number,
  aParam: AParam,
): Promise<Neighbors> {
  const list = await flatFor(partId);
  const i = indexOfRef(list, qNum, aParam);
  if (i < 0) return { prev: null, next: null };

  // Scoped to this part's OWN work: PARTS holds both the Latin and English
  // Summa editions' parts in one flat table (src/corpus/corpus.ts), so
  // stepping to the raw adjacent array index would walk off the end of one
  // language's parts straight into the other's — e.g. past the last article
  // of the Latin Supplementum into the English edition's Prima Pars.
  const workId = PARTS.find((p) => p.id === partId)?.workId;
  const workParts = PARTS.filter((p) => p.workId === workId);
  const partIdx = workParts.findIndex((p) => p.id === partId);

  let prev: ArticleRef | null = null;
  if (i > 0) {
    prev = list[i - 1];
  } else if (partIdx > 0) {
    const prevList = await flatFor(workParts[partIdx - 1].id);
    prev = prevList.length ? prevList[prevList.length - 1] : null;
  }

  let next: ArticleRef | null = null;
  if (i < list.length - 1) {
    next = list[i + 1];
  } else if (partIdx < workParts.length - 1) {
    const nextList = await flatFor(workParts[partIdx + 1].id);
    next = nextList.length ? nextList[0] : null;
  }

  return { prev, next };
}
