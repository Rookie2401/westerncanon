import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  citationOf,
  findArticle,
  findQuestion,
  loadGaps,
  loadPart,
  partById,
} from '../corpus/corpus.ts';
import type { Gaps } from '../corpus/corpus.ts';
import type { Article } from '../corpus/types.ts';
import { neighbors } from '../corpus/traverse.ts';
import type { Neighbors } from '../corpus/traverse.ts';
import { useResource } from '../ui/useResource.ts';
import { readerCrumb, roman } from '../ui/format.ts';
import { replyLabel } from '../ui/ordinals.ts';
import {
  getLast,
  refKey,
  setLast,
  SUMMA_WORK_ID,
  toggleBookmark,
  useIsBookmarked,
} from '../state/storage.ts';
import { BackIcon, BookmarkIcon } from '../components/icons.tsx';
import { JumpNavigator } from '../components/JumpNavigator.tsx';

function scrollRatio(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

export function Reader() {
  const { partId = '', qNum = '', aParam = '' } = useParams();
  const info = partById(partId);
  const qn = Number(qNum);
  const key = `${partId}/${qNum}/${aParam}`;

  const { data: part, loading } = useResource(
    () => (info ? loadPart(info.id) : Promise.reject(new Error('unknown part'))),
    `part:${partId}`,
  );
  const { data: gaps } = useResource<Gaps>(loadGaps, 'gaps');

  const question = part && Number.isFinite(qn) ? findQuestion(part, qn) : undefined;
  const article: Article | undefined =
    part && Number.isFinite(qn) ? findArticle(part, qn, aParam) : undefined;
  const appx =
    question?.appendix != null
      ? { appendix: question.appendix, appendixNumber: question.appendixNumber ?? 1 }
      : null;
  // The stored citation is always correct (e.g. "Suppl. App. I q. 1 a. 2");
  // fall back to a synthesised one only before the part has loaded.
  const citation = article?.citation ?? (info ? citationOf(info.code, qn, aParam) : key);

  const [nb, setNb] = useState<Neighbors>({ prev: null, next: null });
  const [immersive, setImmersive] = useState(false);
  const [jump, setJump] = useState(false);

  // Work-agnostic location for storage (bookmarks / last position).
  const libPath = useMemo(() => [partId, qNum, aParam], [partId, qNum, aParam]);
  const bmKey = refKey({ workId: SUMMA_WORK_ID, path: libPath });
  const bookmarked = useIsBookmarked(bmKey);

  // Reset chrome + fetch neighbors whenever the article changes.
  useEffect(() => {
    setImmersive(false);
    setJump(false);
    let alive = true;
    if (info && Number.isFinite(qn)) {
      neighbors(info.id, qn, aParam).then((n) => {
        if (alive) setNb(n);
      });
    } else {
      setNb({ prev: null, next: null });
    }
    return () => {
      alive = false;
    };
  }, [info, qn, aParam]);

  // Restore approximate scroll on (re)entry, and record this article as the
  // last position. Captures the stored ratio BEFORE overwriting.
  useLayoutEffect(() => {
    if (!article || !info) return;
    const prev = getLast();
    const isReturn =
      prev?.workId === SUMMA_WORK_ID && prev.path.join('/') === libPath.join('/');
    const ratio = isReturn ? prev!.scrollRatio : 0;

    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max > 0 ? ratio * max : 0);
    });

    setLast({
      workId: SUMMA_WORK_ID,
      path: libPath,
      scrollRatio: ratio,
      title: article.title ?? null,
      label: citation,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article, key]);

  // Throttled scroll -> persist scrollRatio into summa:last.
  useEffect(() => {
    if (!article || !info) return;
    let raf = 0;
    let last = 0;
    const persist = () => {
      raf = 0;
      last = Date.now();
      const cur = getLast();
      if (
        cur?.workId === SUMMA_WORK_ID &&
        cur.path.join('/') === libPath.join('/')
      ) {
        setLast({ ...cur, scrollRatio: scrollRatio() });
      }
    };
    const onScroll = () => {
      if (raf) return;
      if (Date.now() - last < 350) {
        raf = window.setTimeout(persist, 350) as unknown as number;
      } else {
        raf = requestAnimationFrame(persist);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) {
        cancelAnimationFrame(raf);
        clearTimeout(raf);
      }
      persist();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article, key]);

  const onBodyClick = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('a,button,select,input,mark,[role="dialog"]')) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    setImmersive((v) => !v);
  }, []);

  const crumb = info ? readerCrumb(info.header, qn, aParam, appx) : citation;

  const body = useMemo(() => {
    if (!article) return null;
    const objections = [...article.objections].sort((a, b) => a.number - b.number);
    const sc = [...article.sedContra].sort((a, b) => a.number - b.number);
    const replies = [...article.replies];
    return (
      <>
        {article.title ? (
          <h1 className="reader__utrum">{article.title}</h1>
        ) : (
          <h1 className="reader__utrum">
            {aParam === 'u' ? 'Articulus unicus' : `Articulus ${roman(Number(aParam))}`}
          </h1>
        )}

        {objections.map((o) => (
          <section key={`obj-${o.number}`}>
            <p className="reader__label">Obiectio {roman(o.number)}</p>
            <p>{o.text}</p>
          </section>
        ))}

        {sc.map((s, i) => (
          <section key={`sc-${s.number}`}>
            <p className="reader__label">
              Sed contra{sc.length > 1 ? ` ${roman(i + 1)}` : ''}
            </p>
            <p>{s.text}</p>
          </section>
        ))}

        {article.respondeo ? (
          <section>
            <p className="reader__label">Respondeo</p>
            <p>{article.respondeo}</p>
          </section>
        ) : null}

        {replies.map((r, i) => (
          <section key={`ad-${r.objectionNumber ?? `all-${i}`}`}>
            <p className="reader__label">{replyLabel(r.objectionNumber)}</p>
            <p>{r.text}</p>
          </section>
        ))}
      </>
    );
  }, [article, aParam]);

  if (loading) {
    return <p className="loading">Loading…</p>;
  }

  if (!article) {
    const isGap =
      !!gaps &&
      (gaps.missingArticles.includes(citation) ||
        gaps.missingQuestions.some((c) => citation.startsWith(c)));
    return (
      <>
        <header className="topbar">
          <Link
            to={`/part/${partId}/q/${qNum}`}
            className="iconbtn"
            aria-label="Back to question"
          >
            <BackIcon />
          </Link>
          <span className="topbar__title">{crumb}</span>
        </header>
        <main className="page page--narrow">
          <p className="reader__gap">
            {isGap ? (
              <>
                <strong>{citation}</strong> is not present in the bundled source
                transcription. This reader never fabricates, translates, or
                reconstructs Latin. See <Link to="/about">About</Link> for the
                full list of source gaps.
              </>
            ) : (
              <>
                Nothing here. <Link to="/about">About</Link> ·{' '}
                <Link to="/">Home</Link>
              </>
            )}
          </p>
        </main>
      </>
    );
  }

  return (
    <div className={clsx('reader', immersive && 'reader--immersive')}>
      {/* Escape hatch to the parent Quaestio. Deliberately a sibling of
          .reader__chrome, NOT a child: immersive mode fades .reader__chrome to
          opacity 0, and a standalone (Add to Home Screen) PWA shows no browser
          back button, so a back control living inside the chrome leaves the
          reader with no way out after a single stray tap. This pill stays put
          in every state. */}
      <Link
        to={`/part/${partId}/q/${qNum}`}
        replace
        className="reader__back"
        aria-label="Back to the Quaestio"
      >
        <BackIcon />
      </Link>
      <div className="reader__chrome reader__header">
        <div className="reader__header-inner">
          <button
            className="reader__headbtn"
            onClick={() => setJump(true)}
            aria-label="Open jump navigator"
          >
            <span className="reader__crumb">{crumb}</span>
            {article.title ? (
              <span className="reader__utrum-mini">{article.title}</span>
            ) : null}
          </button>
          <button
            className={clsx('iconbtn', bookmarked && 'iconbtn--active')}
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            aria-pressed={bookmarked}
            onClick={() =>
              info &&
              toggleBookmark({
                workId: SUMMA_WORK_ID,
                path: libPath,
                label: citation,
                title: article.title ?? null,
              })
            }
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>
      </div>

      <div className="reader__scroll" onClick={onBodyClick} role="presentation">
        <article key={key} className="reader__prose reader__prose--in">
          {part?.compilationNote ? (
            <p className="reader__source-note reader__source-note--compilation">
              <strong>Supplementum Tertiae Partis.</strong> {part.compilationNote}
            </p>
          ) : null}
          {article.witness && !part?.compilationNote ? (
            <p className="reader__source-note">
              This {aParam === 'u' ? 'question' : 'article'} is absent from the base
              transcription; its Latin is supplied verbatim from a public-domain
              secondary witness. See <Link to="/about">About</Link>.
            </p>
          ) : null}
          {article.anomaly ? (
            <p className="reader__source-note reader__source-note--anomaly">
              <strong>Editorial note.</strong> {article.anomaly}
            </p>
          ) : null}
          {body}
        </article>
      </div>

      <div className="reader__chrome reader__nav">
        <div className="reader__nav-inner">
          {nb.prev ? (
            <Link
              to={`/read/${nb.prev.partId}/${nb.prev.qNum}/${nb.prev.aParam}`}
              replace
              className="reader__nav-btn"
            >
              <span className="reader__nav-dir">‹ Prev</span>
              <span className="reader__nav-cite">{nb.prev.citation}</span>
            </Link>
          ) : (
            <button className="reader__nav-btn" disabled>
              <span className="reader__nav-dir">‹ Prev</span>
            </button>
          )}
          {nb.next ? (
            <Link
              to={`/read/${nb.next.partId}/${nb.next.qNum}/${nb.next.aParam}`}
              replace
              className="reader__nav-btn reader__nav-btn--next"
            >
              <span className="reader__nav-dir">Next ›</span>
              <span className="reader__nav-cite">{nb.next.citation}</span>
            </Link>
          ) : (
            <button className="reader__nav-btn reader__nav-btn--next" disabled>
              <span className="reader__nav-dir">Next ›</span>
            </button>
          )}
        </div>
      </div>

      {jump ? (
        <JumpNavigator
          partId={partId}
          qNum={qn}
          aParam={aParam}
          onClose={() => setJump(false)}
        />
      ) : null}
    </div>
  );
}
