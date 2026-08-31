import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadPart, partById } from '../corpus/corpus.ts';
import type { Question } from '../corpus/types.ts';
import { authorById, workById } from '../library/registry.ts';
import { useResource } from '../ui/useResource.ts';
import { roman } from '../ui/format.ts';
import { TopBar } from '../components/TopBar.tsx';

const SUMMA_AUTHOR = authorById('thomas-aquinas')?.displayName ?? 'Thomas Aquinas';
const SUMMA_TITLE = workById('summa-theologiae')?.title ?? 'Summa Theologiae';

function firstUtrum(q: Question): string | null {
  const arts = [...q.articles].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  return arts[0]?.title ?? null;
}

export function PartScreen() {
  const { partId = '' } = useParams();
  const info = partById(partId);
  const { data: part, loading } = useResource(
    () => (info ? loadPart(info.id) : Promise.reject(new Error('unknown part'))),
    `part:${partId}`,
  );
  const [filter, setFilter] = useState('');

  const questions = useMemo(() => {
    if (!part) return [];
    const sorted = [...part.questions].sort((a, b) => a.number - b.number);
    const f = filter.trim();
    if (!f) return sorted;
    return sorted.filter((q) => String(q.number).startsWith(f));
  }, [part, filter]);

  if (!info) {
    return (
      <>
        <TopBar back="/" />
        <main className="page">
          <p className="empty">Unknown part.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar back="/work/summa-theologiae" title="Summa Theologiae" />
      <main className="page">
        <div className="screen-head">
          <p className="crumb">
            {`${SUMMA_AUTHOR} › ${SUMMA_TITLE} › ${info.header}`.toUpperCase()}
          </p>
        </div>

        <input
          className="filter"
          inputMode="numeric"
          placeholder="Jump to quaestio number…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter questions by number"
        />

        {loading ? (
          <p className="loading">Loading…</p>
        ) : (
          <div className="entrylist">
            {questions.map((q) => {
              const utrum = firstUtrum(q);
              return (
                <Link
                  key={q.number}
                  to={`/part/${info.id}/q/${q.number}`}
                  className="entry"
                >
                  <span className="entry__num">Quaestio {roman(q.number)}</span>
                  <span className="entry__preview">
                    {utrum ?? <span className="muted">—</span>}
                  </span>
                </Link>
              );
            })}
            {questions.length === 0 ? (
              <p className="empty">No question matches “{filter}”.</p>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
