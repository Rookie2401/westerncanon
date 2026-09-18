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
  /** e.g. "Prima Pars" (Latin) or "Part I" (English) */
  label: string;
  /** Display header, e.g. "PRIMA PARS" (Latin) or "PART I" (English) */
  header: string;
  /**
   * Set on the Supplementum: a one-line note (shown under its heading and in
   * breadcrumbs context) that it is a posthumous compilation, not written by
   * Aquinas as part of the Summa.
   */
  compilation?: string;
  /** Which registry Work this part's content belongs to (see src/library/registry.ts). */
  workId: string;
  /** Display/UI-furniture language for this part's reader screens. */
  lang: 'la' | 'en';
  /** public/<dir>/ folder this part's JSON is served from (see scripts/copy-corpus.mjs). */
  dir: string;
}

/**
 * Canonical ordering, used for prev/next traversal and menus. The five
 * Latin parts come first (unchanged from before the English edition existed
 * — every existing route/bookmark/citation keeps working), followed by the
 * five English parts. Both sets share the exact same `Part`/`Question`/
 * `Article` JSON shape (data/summa/types.ts); only the display language and
 * source directory differ.
 */
export const PARTS: readonly PartInfo[] = [
  { id: 'prima-pars', code: 'I', label: 'Prima Pars', header: 'Prima Pars', workId: 'summa-theologiae', lang: 'la', dir: 'summa' },
  { id: 'prima-secundae', code: 'I-II', label: 'Prima Secundae', header: 'Prima Secundae', workId: 'summa-theologiae', lang: 'la', dir: 'summa' },
  { id: 'secunda-secundae', code: 'II-II', label: 'Secunda Secundae', header: 'Secunda Secundae', workId: 'summa-theologiae', lang: 'la', dir: 'summa' },
  { id: 'tertia-pars', code: 'III', label: 'Tertia Pars', header: 'Tertia Pars', workId: 'summa-theologiae', lang: 'la', dir: 'summa' },
  {
    id: 'supplementum',
    code: 'Suppl.',
    label: 'Supplementum',
    header: 'Supplementum Tertiae Partis',
    compilation:
      'A posthumous compilation: assembled after Aquinas’ death (c. 1274) by Reginald of Piperno from Aquinas’ earlier Scriptum super libros Sententiarum (Book IV). Not written by Aquinas as part of the Summa.',
    workId: 'summa-theologiae',
    lang: 'la',
    dir: 'summa',
  },
  { id: 'prima-pars-en', code: 'I', label: 'Part I', header: 'Part I', workId: 'summa-theologiae-en', lang: 'en', dir: 'summa-en' },
  { id: 'prima-secundae-en', code: 'I-II', label: 'Part I-II', header: 'Part I-II', workId: 'summa-theologiae-en', lang: 'en', dir: 'summa-en' },
  { id: 'secunda-secundae-en', code: 'II-II', label: 'Part II-II', header: 'Part II-II', workId: 'summa-theologiae-en', lang: 'en', dir: 'summa-en' },
  { id: 'tertia-pars-en', code: 'III', label: 'Part III', header: 'Part III', workId: 'summa-theologiae-en', lang: 'en', dir: 'summa-en' },
  {
    id: 'supplementum-en',
    code: 'Suppl.',
    label: 'Supplement',
    header: 'Supplement to the Third Part',
    compilation:
      'A posthumous compilation: assembled after Aquinas’ death (c. 1274) by Reginald of Piperno from Aquinas’ earlier Scriptum super libros Sententiarum (Book IV). Not written by Aquinas as part of the Summa.',
    workId: 'summa-theologiae-en',
    lang: 'en',
    dir: 'summa-en',
  },
];

export function partById(id: string): PartInfo | undefined {
  return PARTS.find((p) => p.id === id);
}
/**
 * Citation-jump lookup ("I q. 2 a. 3") only ever matches the Latin parts:
 * both language's parts share the same `code` values (by design, for display
 * consistency), so matching the first hit would make an English deep-link
 * ambiguous/impossible to reach via citation syntax. The reference parser
 * (src/corpus/reference.ts) is itself a Latin-citation-scheme feature; the
 * English edition is reached by browsing or full-text search instead.
 */
export function partByCode(code: string): PartInfo | undefined {
  return PARTS.find((p) => p.code === code && p.lang === 'la');
}

const base = import.meta.env.BASE_URL || '/';
const url = (dir: string, name: string) => `${base}${dir}/${name}`;

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(dir: string, name: string): Promise<T> {
  const key = `${dir}/${name}`;
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = fetch(url(dir, name)).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${key}: ${r.status}`);
    return r.json() as Promise<T>;
  });
  // On failure, drop the cache entry so a later call can retry.
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  return p;
}

const PART_FILE: Record<PartId, string> = {
  'prima-pars': 'part-I.json',
  'prima-secundae': 'part-I-II.json',
  'secunda-secundae': 'part-II-II.json',
  'tertia-pars': 'part-III.json',
  supplementum: 'part-suppl.json',
  'prima-pars-en': 'part-I.json',
  'prima-secundae-en': 'part-I-II.json',
  'secunda-secundae-en': 'part-II-II.json',
  'tertia-pars-en': 'part-III.json',
  'supplementum-en': 'part-suppl.json',
};

// The app-wide index/prooemium/gaps/search-index remain Latin-only for now
// (an explicit, disclosed scope limit — see the English Summa's About page):
// the English edition is reached by browsing Part -> Question -> Article, not
// via these Latin-corpus-specific whole-work views.
export const loadIndex = () => loadJson<SummaIndex>('summa', 'index.json');
export const loadProoemium = () => loadJson<Prooemium>('summa', 'prooemium.json');
export const loadGaps = () => loadJson<Gaps>('summa', 'gaps.json');
export const loadSearchIndex = () => loadJson<SearchRecord[]>('summa', 'search-index.json');
export const loadPart = (id: PartId) => loadJson<Part>(partById(id)?.dir ?? 'summa', PART_FILE[id]);

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
