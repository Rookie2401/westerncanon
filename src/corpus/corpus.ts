/**
 * Lazy, memoized access to the bundled corpus.
 *
 * Files are served from `${BASE_URL}summa/*.json` (copied out of data/summa/ by
 * scripts/copy-corpus.mjs) and precached by the service worker, so every fetch
 * here is same-origin and works offline. Each resource is fetched at most once;
 * the parsed result (and the in-flight promise) is cached for the session.
 */
import type {
  Article,
  Part,
  PartCode,
  PartId,
  Prooemium,
  Question,
  SearchRecord,
  SummaIndex,
} from './types.ts';

export interface Gaps {
  generatedAt: string;
  source: string;
  explanation: string;
  missingQuestions: string[];
  missingArticles: string[];
  count: number;
}

export interface PartInfo {
  id: PartId;
  code: PartCode;
  /** e.g. "Prima Pars" */
  label: string;
  /** Latin display header, e.g. "PRIMA PARS" */
  header: string;
}

/** Canonical ordering, used for prev/next traversal and menus. */
export const PARTS: readonly PartInfo[] = [
  { id: 'prima-pars', code: 'I', label: 'Prima Pars', header: 'Prima Pars' },
  { id: 'prima-secundae', code: 'I-II', label: 'Prima Secundae', header: 'Prima Secundae' },
  { id: 'secunda-secundae', code: 'II-II', label: 'Secunda Secundae', header: 'Secunda Secundae' },
  { id: 'tertia-pars', code: 'III', label: 'Tertia Pars', header: 'Tertia Pars' },
];

export function partById(id: string): PartInfo | undefined {
  return PARTS.find((p) => p.id === id);
}
export function partByCode(code: string): PartInfo | undefined {
  return PARTS.find((p) => p.code === code);
}

const base = import.meta.env.BASE_URL || '/';
const url = (name: string) => `${base}summa/${name}`;

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(name: string): Promise<T> {
  const hit = cache.get(name);
  if (hit) return hit as Promise<T>;
  const p = fetch(url(name)).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${name}: ${r.status}`);
    return r.json() as Promise<T>;
  });
  // On failure, drop the cache entry so a later call can retry.
  p.catch(() => cache.delete(name));
  cache.set(name, p);
  return p;
}

const PART_FILE: Record<PartId, string> = {
  'prima-pars': 'part-I.json',
  'prima-secundae': 'part-I-II.json',
  'secunda-secundae': 'part-II-II.json',
  'tertia-pars': 'part-III.json',
};

export const loadIndex = () => loadJson<SummaIndex>('index.json');
export const loadProoemium = () => loadJson<Prooemium>('prooemium.json');
export const loadGaps = () => loadJson<Gaps>('gaps.json');
export const loadSearchIndex = () => loadJson<SearchRecord[]>('search-index.json');
export const loadPart = (id: PartId) => loadJson<Part>(PART_FILE[id]);

/** `null` article number is addressed by the string `"u"` in routes. */
export type AParam = string;

export function aParamOf(a: Article): AParam {
  return a.number == null ? 'u' : String(a.number);
}

export function findQuestion(part: Part, qNum: number): Question | undefined {
  return part.questions.find((q) => q.number === qNum);
}

export function findArticle(part: Part, qNum: number, aParam: AParam): Article | undefined {
  const q = findQuestion(part, qNum);
  if (!q) return undefined;
  if (aParam === 'u') return q.articles.find((a) => a.number == null);
  const n = Number(aParam);
  if (!Number.isFinite(n)) return undefined;
  return q.articles.find((a) => a.number === n);
}

/** Build the citation string exactly as stored in the corpus. */
export function citationOf(code: PartCode, qNum: number, aParam: AParam): string {
  if (aParam === 'u') return `${code} q. ${qNum}`;
  return `${code} q. ${qNum} a. ${aParam}`;
}

export function questionCitation(code: PartCode, qNum: number): string {
  return `${code} q. ${qNum}`;
}
