/**
 * Lightweight full-text search over the bundled generic works (the Isagoge,
 * Greek and Latin). These corpora are tiny (~70 KB JSON combined) so there is
 * no prebuilt index — passages are folded and substring-matched at query time.
 *
 * Folding reuses the shared Latin fold (lowercase + NFKD + strip combining
 * marks), which also renders Greek accent/breathing-insensitive. One extra
 * Greek step normalises final sigma so "λογοσ" matches "λόγος". Full Greek
 * morphological tokenisation is out of scope; matching is accent-insensitive
 * substring only.
 */
import { fold } from '../corpus/fold.ts';
import { WORKS } from './registry.ts';
import { divisionShortLabel, loadGenericWork } from './genericCorpus.ts';
import type { GenericWork } from './types.ts';

export interface GenericHit {
  workId: string;
  workTitle: string;
  workMeta: string;
  divId: string;
  divLabel: string;
  ref: string | null;
  editorialTitle: string | null;
  snippet: string;
}

function foldSearch(s: string): string {
  return fold(s).replace(/ς/g, 'σ');
}

function snippetAround(text: string, foldedText: string, foldedQuery: string): string {
  const at = foldedText.indexOf(foldedQuery);
  if (at < 0) return text.slice(0, 160).trim() + (text.length > 160 ? '…' : '');
  // fold() can change length; approximate the original offset proportionally.
  const approx = Math.round((at / foldedText.length) * text.length);
  const start = Math.max(0, approx - 70);
  const end = Math.min(text.length, approx + foldedQuery.length + 90);
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end).trim() +
    (end < text.length ? '…' : '')
  );
}

let cache: Promise<{ meta: (typeof WORKS)[number]; work: GenericWork }[]> | null =
  null;

function loadAllGeneric() {
  if (!cache) {
    const generic = WORKS.filter((w) => w.profile === 'generic');
    cache = Promise.all(
      generic.map((meta) =>
        loadGenericWork(meta.id).then((work) => ({ meta, work })),
      ),
    ).catch((e) => {
      cache = null;
      throw e;
    });
  }
  return cache;
}

export async function searchGenericWorks(
  query: string,
  limit = 60,
): Promise<GenericHit[]> {
  const fq = foldSearch(query);
  if (fq.length < 2) return [];
  const corpora = await loadAllGeneric();
  const hits: GenericHit[] = [];

  // Depth-first over the whole division tree, not just top-level divisions'
  // own passages — a work like Euclid or Augustine's is Book -> group/Chapter
  // -> leaf, so its actual passage text lives several levels down.
  const walk = (div: GenericWork['divisions'][number], meta: (typeof WORKS)[number]): boolean => {
    for (const p of div.passages) {
      const ft = foldSearch(p.text);
      if (!ft.includes(fq)) continue;
      hits.push({
        workId: meta.id,
        workTitle: meta.title,
        workMeta: meta.meta,
        divId: div.id,
        divLabel: divisionShortLabel(div),
        ref: p.ref ?? div.ref,
        editorialTitle: div.editorialTitle,
        snippet: snippetAround(p.text, ft, fq),
      });
      if (hits.length >= limit) return true;
    }
    for (const child of div.children) {
      if (walk(child, meta)) return true;
    }
    return false;
  };

  for (const { meta, work } of corpora) {
    for (const div of work.divisions) {
      if (walk(div, meta)) break;
    }
    if (hits.length >= limit) break;
  }
  return hits;
}
