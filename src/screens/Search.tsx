import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  findArticle,
  findQuestion,
  loadPart,
  loadSearchIndex,
  partByCode,
} from '../corpus/corpus.ts';
import type { PartId, SearchRecord } from '../corpus/types.ts';
import { parseReference } from '../corpus/reference.ts';
import type { ParsedRef } from '../corpus/reference.ts';
import { articleText, buildSnippet, runSearch } from '../corpus/search.ts';
import type { Snippet } from '../corpus/search.ts';
import { searchGenericWorks } from '../library/genericSearch.ts';
import type { GenericHit } from '../library/genericSearch.ts';
import { useDebounced } from '../ui/useDebounced.ts';
import { TopBar } from '../components/TopBar.tsx';

interface Jump {
  to: string;
  label: string;
  utrum?: string | null;
  gap?: boolean;
}

const SNIPPET_RICH = 30;

function recordPath(r: SearchRecord): string {
  const id = partByCode(r.partCode)?.id ?? 'prima-pars';
  return `/read/${id}/${r.q}/${r.a == null ? 'u' : r.a}`;
}

/**
 * Human-readable summary of which bundled works a set of generic-search hits
 * came from, e.g. "Isagoge", "Confessiones and Categoriae", or "5 works" once
 * too many are involved to list — the count heading above these results must
 * never name a single work when the hits actually span several. No leading
 * article: workTitle is often a foreign-language title (e.g. "Κατηγορίαι"),
 * where prepending "the" reads oddly ("the Κατηγορίαι"), unlike an English
 * common-noun title such as "Isagoge".
 */
function formatWorkTitles(hits: GenericHit[]): string {
  const titles = [...new Set(hits.map((h) => h.workTitle))];
  if (titles.length === 1) return titles[0]!;
  if (titles.length <= 3) {
    return titles.length === 2
      ? `${titles[0]} and ${titles[1]}`
      : `${titles[0]}, ${titles[1]}, and ${titles[2]}`;
  }
  return `${titles.length} works`;
}

export function SearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 200);

  const parsed = useMemo<ParsedRef | null>(
    () => parseReference(debounced),
    [debounced],
  );

  // Resolve a parsed reference against the corpus.
  const [jump, setJump] = useState<Jump | null>(null);
  useEffect(() => {
    let alive = true;
    if (!parsed) {
      setJump(null);
      return;
    }
    const info = partByCode(parsed.partCode);
    if (!info) {
      setJump(null);
      return;
    }
    loadPart(info.id).then((part) => {
      if (!alive) return;
      if (parsed.a == null) {
        const q = findQuestion(part, parsed.q);
        setJump(
          q
            ? { to: `/part/${info.id}/q/${q.number}`, label: `Open ${parsed.citation}` }
            : { to: '/about', label: `${parsed.citation} — not in the source text`, gap: true },
        );
        return;
      }
      const art = findArticle(part, parsed.q, String(parsed.a));
      if (art) {
        setJump({
          to: `/read/${info.id}/${parsed.q}/${parsed.a}`,
          label: `Jump to ${parsed.citation}`,
          utrum: art.title,
        });
      } else {
        setJump({
          to: '/about',
          label: `${parsed.citation} — not in the source text`,
          gap: true,
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [parsed]);

  const jumpRef = useRef<Jump | null>(null);
  jumpRef.current = jump;
  const parsedRef = useRef<ParsedRef | null>(null);
  parsedRef.current = parsed;

  // Lazy-load the full-text index once a query exists.
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  useEffect(() => {
    if (!debounced || records || indexLoading) return;
    setIndexLoading(true);
    loadSearchIndex().then(
      (r) => {
        setRecords(r);
        setIndexLoading(false);
      },
      () => setIndexLoading(false),
    );
  }, [debounced, records, indexLoading]);

  const hits = useMemo(
    () => (records && debounced ? runSearch(debounced, records) : []),
    [records, debounced],
  );

  // Generic works (the Isagoge, Greek + Latin) — tiny corpora, searched live.
  const [genericHits, setGenericHits] = useState<GenericHit[]>([]);
  useEffect(() => {
    let alive = true;
    if (!debounced) {
      setGenericHits([]);
      return;
    }
    searchGenericWorks(debounced).then(
      (h) => alive && setGenericHits(h),
      () => alive && setGenericHits([]),
    );
    return () => {
      alive = false;
    };
  }, [debounced]);

  // Build real original-case Latin snippets for the top results.
  const [snips, setSnips] = useState<Map<string, Snippet>>(new Map());
  useEffect(() => {
    let alive = true;
    const top = hits.slice(0, SNIPPET_RICH);
    if (!top.length) {
      setSnips(new Map());
      return;
    }
    const partIds = [
      ...new Set(top.map((h) => partByCode(h.record.partCode)?.id).filter(Boolean)),
    ] as PartId[];
    Promise.all(partIds.map((id) => loadPart(id).then((p) => [id, p] as const))).then(
      (pairs) => {
        if (!alive) return;
        const parts = new Map(pairs);
        const next = new Map<string, Snippet>();
        for (const h of top) {
          const info = partByCode(h.record.partCode);
          const part = info && parts.get(info.id);
          if (!part) continue;
          const art = findArticle(
            part,
            h.record.q,
            h.record.a == null ? 'u' : String(h.record.a),
          );
          if (!art) continue;
          next.set(h.record.citation, buildSnippet(articleText(art), debounced));
        }
        setSnips(next);
      },
    );
    return () => {
      alive = false;
    };
  }, [hits, debounced]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return;
    const p = parsedRef.current;
    const j = jumpRef.current;
    if (p?.exact && j && !j.gap) {
      navigate(j.to);
    }
  }

  return (
    <>
      <TopBar back="/" title="Search" />
      <main className="page">
        <input
          className="search__input"
          autoFocus
          placeholder="Latin phrase, or a reference like “I q. 2 a. 3”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Search"
        />
        <p className="search__hint">
          Searches the Summa and every other bundled text, in their original
          languages. Latin diacritics and œ/æ are folded; Greek matching is
          accent-insensitive (substring only — no morphological search). A
          citation like <em>II-II q. 23 a. 1</em> jumps straight to the
          article.
        </p>

        {jump ? (
          jump.gap ? (
            <Link to="/about" className="search__jump">
              <span className="search__jump-label">Reference</span>
              <div>{jump.label}. See About.</div>
            </Link>
          ) : (
            <Link to={jump.to} className="search__jump">
              <span className="search__jump-label">Reference</span>
              <div>{jump.label}</div>
              {jump.utrum ? (
                <div className="result__title">{jump.utrum}</div>
              ) : null}
            </Link>
          )
        ) : null}

        {genericHits.length ? (
          <div className="search__group">
            <p className="search__count">
              {genericHits.length} passage{genericHits.length === 1 ? '' : 's'} in{' '}
              {formatWorkTitles(genericHits)}
            </p>
            <div className="entrylist">
              {genericHits.map((h, i) => (
                <Link
                  key={`${h.workId}/${h.divId}/${i}`}
                  to={`/read/${h.workId}/${h.divId}`}
                  className="result"
                >
                  <div className="result__cite">
                    {h.workTitle} · {h.workMeta} · {h.divLabel}
                    {h.ref ? ` · ${h.ref}` : ''}
                  </div>
                  {h.editorialTitle ? (
                    <div className="result__title">
                      <span className="ed-tag">ed.</span>
                      {h.editorialTitle}
                    </div>
                  ) : null}
                  <div className="result__snippet" lang={h.workId === 'isagoge-grc' ? 'grc' : undefined}>
                    {h.snippet}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {debounced && (indexLoading || (!records && !hits.length)) ? (
          <p className="loading">Searching…</p>
        ) : null}

        {debounced && records ? (
          hits.length ? (
            <>
              <p className="search__count">
                {hits.length} article{hits.length === 1 ? '' : 's'}
              </p>
              <div className="entrylist">
                {hits.slice(0, 200).map((h) => {
                  const r = h.record;
                  const snip = snips.get(r.citation);
                  return (
                    <Link key={r.citation} to={recordPath(r)} className="result">
                      <div className="result__cite">{r.citation}</div>
                      {r.articleTitle ? (
                        <div className="result__title">{r.articleTitle}</div>
                      ) : null}
                      <div className="result__snippet">
                        {snip && snip.found ? (
                          <>
                            {snip.before}
                            <mark>{snip.match}</mark>
                            {snip.after}
                          </>
                        ) : (
                          <>{r.snippet}…</>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : !parsed && !genericHits.length ? (
            <p className="empty">No matches for “{debounced}”.</p>
          ) : null
        ) : null}
      </main>
    </>
  );
}
