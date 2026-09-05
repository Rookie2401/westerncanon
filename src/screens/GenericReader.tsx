import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { authorById, workById } from '../library/registry.ts';
import {
  divisionById,
  divisionShortLabel,
  genericNeighbors,
  loadGenericWork,
} from '../library/genericCorpus.ts';
import type { Division, GenericWork } from '../library/types.ts';
import { useResource } from '../ui/useResource.ts';
import {
  getLast,
  refKey,
  setLast,
  toggleBookmark,
  useIsBookmarked,
} from '../state/storage.ts';
import { BackIcon, BookmarkIcon } from '../components/icons.tsx';

function scrollRatio(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/**
 * Reader for `profile: 'generic'` works (e.g. the Isagoge). Same chrome as the
 * Summa reader — fixed back pill, blurred header/footer, immersive tap, scroll
 * restore, prev/next, bookmark — but a deliberately spare body: the verbatim
 * source heading, the canonical edition reference, an *editorial* English
 * section title, then the passages.
 */
export function GenericReader() {
  const { workId = '', divId = '' } = useParams();
  const work = workById(workId);
  const author = work ? authorById(work.authorId) : undefined;

  const { data, loading } = useResource<GenericWork>(
    () => loadGenericWork(workId),
    `generic:${workId}`,
  );

  const division: Division | undefined = data
    ? divisionById(data, divId)
    : undefined;

  const libPath = useMemo(() => [divId], [divId]);
  const bmKey = refKey({ workId, path: libPath });
  const bookmarked = useIsBookmarked(bmKey);

  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    setImmersive(false);
  }, [divId]);

  // Synchronous — compute during render, no state, no flush race.
  const nb = useMemo(
    () =>
      data && division
        ? genericNeighbors(data, divId)
        : { prev: null as Division | null, next: null as Division | null },
    [data, division, divId],
  );

  const shortLabel = division ? divisionShortLabel(division) : divId;
  const bookmarkLabel = work ? `${work.title} · ${shortLabel}` : shortLabel;

  // Restore approximate scroll on (re)entry; record last position.
  useLayoutEffect(() => {
    if (!division || !work) return;
    const prev = getLast();
    const isReturn =
      prev?.workId === workId && prev.path.join('/') === libPath.join('/');
    const ratio = isReturn ? prev!.scrollRatio : 0;

    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max > 0 ? ratio * max : 0);
    });

    setLast({
      workId,
      path: libPath,
      scrollRatio: ratio,
      label: bookmarkLabel,
      title: division.editorialTitle,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, workId, divId]);

  // Throttled scroll -> persist scrollRatio.
  useEffect(() => {
    if (!division || !work) return;
    let raf = 0;
    let last = 0;
    const persist = () => {
      raf = 0;
      last = Date.now();
      const cur = getLast();
      if (cur?.workId === workId && cur.path.join('/') === libPath.join('/')) {
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
  }, [division, workId, divId]);

  const onBodyClick = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('a,button,select,input,mark,[role="dialog"]')) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    setImmersive((v) => !v);
  }, []);

  if (!work) {
    return (
      <main className="page">
        <p className="empty">
          Unknown work. <Link to="/">Library</Link>
        </p>
      </main>
    );
  }

  const crumb = [author?.displayName, work.title, shortLabel]
    .filter(Boolean)
    .join(' › ')
    .toUpperCase();

  if (loading) return <p className="loading">Loading…</p>;

  if (!division) {
    return (
      <div className="reader">
        <Link
          to={`/work/${workId}`}
          replace
          className="reader__back"
          aria-label={`Back to ${work.title}`}
        >
          <BackIcon />
        </Link>
        <main className="page page--narrow">
          <p className="reader__gap">
            This section is not in the bundled text.{' '}
            <Link to={`/work/${workId}`} replace>
              Contents
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const isGreek = work.language === 'grc';

  return (
    <div className={clsx('reader', immersive && 'reader--immersive')}>
      {/* Persistent escape hatch to the Work — sibling of .reader__chrome, so
          immersive mode can never hide it. */}
      <Link
        to={`/work/${workId}`}
        replace
        className="reader__back"
        aria-label={`Back to ${work.title}`}
      >
        <BackIcon />
      </Link>

      <div className="reader__chrome reader__header">
        <div className="reader__header-inner">
          <div className="reader__headbtn">
            <span className="reader__crumb">{crumb}</span>
            {division.editorialTitle ? (
              <span className="reader__utrum-mini">
                <span className="ed-tag">ed.</span>
                {division.editorialTitle}
              </span>
            ) : null}
          </div>
          <button
            className={clsx('iconbtn', bookmarked && 'iconbtn--active')}
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            aria-pressed={bookmarked}
            onClick={() =>
              toggleBookmark({
                workId,
                path: libPath,
                label: bookmarkLabel,
                title: division.editorialTitle,
              })
            }
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>
      </div>

      <div className="reader__scroll" onClick={onBodyClick} role="presentation">
        <article
          key={divId}
          className={clsx(
            'reader__prose',
            'reader__prose--in',
            isGreek && 'reader__prose--grc',
          )}
          lang={isGreek ? 'grc' : undefined}
        >
          <header className="gr-head">
            {division.sourceHeading ? (
              <h1 className="reader__utrum gr-head__source">
                {division.sourceHeading}
              </h1>
            ) : (
              <h1 className="reader__utrum gr-head__source">{shortLabel}</h1>
            )}
            <p className="gr-head__meta" lang="en">
              {division.number ? <span>§ {division.number}</span> : null}
              {division.ref ? <span>{division.ref}</span> : null}
              {division.editorialTitle ? (
                <span className="gr-head__ed">
                  <span className="ed-tag">ed.</span>
                  {division.editorialTitle}
                </span>
              ) : null}
            </p>
          </header>

          {/* Passages render as plain paragraphs. The per-passage marker
              (Greek canonical page label / Latin "¶ n" pilcrow) was removed at
              the user's request; `p.n` / `p.ref` are still carried in the JSON
              so a marker could return later (e.g. as an optional margin note). */}
          {division.passages.map((p, i) => (
            <section key={i} className="gr-passage">
              <p>{p.text}</p>
              {p.anomaly ? (
                <p className="gr-passage__anomaly" lang="en">
                  {p.anomaly}
                </p>
              ) : null}
              {p.figure ? (
                <figure className="gr-figure">
                  {p.figure.image ? (
                    <img
                      className="gr-figure__img"
                      src={p.figure.image}
                      alt={p.figure.alt ?? ''}
                    />
                  ) : (
                    <p className="gr-figure__note" lang="en">
                      {p.figure.note}
                    </p>
                  )}
                  <figcaption className="gr-figure__source" lang="en">
                    {p.figure.source}
                  </figcaption>
                </figure>
              ) : null}
            </section>
          ))}
        </article>
      </div>

      <div className="reader__chrome reader__nav">
        <div className="reader__nav-inner">
          {nb.prev ? (
            <Link
              to={`/read/${workId}/${nb.prev.id}`}
              replace
              className="reader__nav-btn"
            >
              <span className="reader__nav-dir">‹ Prev</span>
              <span className="reader__nav-cite">
                {divisionShortLabel(nb.prev)}
              </span>
            </Link>
          ) : (
            <button className="reader__nav-btn" disabled>
              <span className="reader__nav-dir">‹ Prev</span>
            </button>
          )}
          {nb.next ? (
            <Link
              to={`/read/${workId}/${nb.next.id}`}
              replace
              className="reader__nav-btn reader__nav-btn--next"
            >
              <span className="reader__nav-dir">Next ›</span>
              <span className="reader__nav-cite">
                {divisionShortLabel(nb.next)}
              </span>
            </Link>
          ) : (
            <button className="reader__nav-btn reader__nav-btn--next" disabled>
              <span className="reader__nav-dir">Next ›</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
