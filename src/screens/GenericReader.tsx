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
  genericAssetUrl,
  genericNeighbors,
  isConsolidatableGroup,
  loadGenericWork,
} from '../library/genericCorpus.ts';
import type { Division, GenericWork, Passage } from '../library/types.ts';
import { useResource } from '../ui/useResource.ts';
import {
  getLast,
  refKey,
  setLast,
  toggleBookmark,
  useIsBookmarked,
} from '../state/storage.ts';
import { BackIcon, BookmarkIcon } from '../components/icons.tsx';
import { lexisAvailable } from '../lexis/index.ts';
import { useLexisSettings } from '../lexis/settings.ts';
import { useLexis } from '../lexis/ui/useLexis.ts';
import { TokenizedText } from '../lexis/ui/TokenizedText.tsx';
import type { KnownWord, LexLang, WorkLexis } from '../lexis/types.ts';

/** Everything a passage needs to render its text through TokenizedText
 *  instead of as plain text — present only when the edition/settings/bundle
 *  all allow it; PassageList falls back to plain text when it's null. */
interface LexisCtx {
  lang: LexLang;
  bundle: WorkLexis;
  statuses: Map<string, KnownWord>;
  highlight: 'none' | 'new' | 'all';
  morphOnFirstLevel: boolean;
  divId: string;
  workId: string;
}

/** The passages a division contributes to the reader — a leaf's own, or (for
 *  a consolidated group) every child's, in order. Mirrors exactly what
 *  ConsolidatedBody/PrelimItem and the plain-leaf branch below actually
 *  render, so the read-encounter dwell timer covers the words really shown. */
function allPassages(division: Division): Passage[] {
  return division.children.length > 0
    ? division.children.flatMap((c) => c.passages)
    : division.passages;
}

/**
 * A passage's text, its anomaly note (if any), and its diagram (if any) — the
 * same rendering whether it's the sole content of a leaf division or one item
 * inside a consolidated Preliminaries page (see ConsolidatedBody below).
 */
function PassageList({
  workId,
  passages,
  lexis,
}: {
  workId: string;
  passages: Passage[];
  /** null when language help isn't available/enabled/loaded — text renders
   *  as plain strings exactly as before. */
  lexis?: LexisCtx | null;
}) {
  return (
    <>
      {passages.map((p, i) => (
        <div key={i} className="gr-passage">
          <p className="gr-passage__text">
            {lexis ? (
              <TokenizedText
                text={p.text}
                lang={lexis.lang}
                workId={lexis.workId}
                divId={lexis.divId}
                bundle={lexis.bundle}
                statuses={lexis.statuses}
                highlight={lexis.highlight}
                morphOnFirstLevel={lexis.morphOnFirstLevel}
              />
            ) : (
              p.text
            )}
          </p>
          {p.anomaly ? (
            <p className="gr-passage__anomaly" lang="en">
              {p.anomaly}
            </p>
          ) : null}
          {p.figure ? (
            <figure className="gr-figure">
              {p.figure.image ? (
                <span
                  className="gr-figure__img"
                  style={{
                    WebkitMaskImage: `url(${genericAssetUrl(workId, p.figure.image)})`,
                    maskImage: `url(${genericAssetUrl(workId, p.figure.image)})`,
                    aspectRatio:
                      p.figure.imageWidth && p.figure.imageHeight
                        ? `${p.figure.imageWidth} / ${p.figure.imageHeight}`
                        : undefined,
                  }}
                  role="img"
                  aria-label={p.figure.alt ?? ''}
                />
              ) : (
                <p className="gr-figure__note" lang="en">
                  {p.figure.note}
                </p>
              )}
              {p.figure.more?.map((extra, j) => (
                <span
                  key={j}
                  className="gr-figure__img"
                  style={{
                    WebkitMaskImage: `url(${genericAssetUrl(workId, extra.image)})`,
                    maskImage: `url(${genericAssetUrl(workId, extra.image)})`,
                    aspectRatio: `${extra.imageWidth} / ${extra.imageHeight}`,
                  }}
                  role="img"
                  aria-label={extra.alt ?? ''}
                />
              ))}
              <figcaption className="gr-figure__source" lang="en">
                {p.figure.source}
              </figcaption>
            </figure>
          ) : null}
        </div>
      ))}
    </>
  );
}

/**
 * One numbered item (a Definition/Postulate/Common Notion leaf) inside a
 * consolidated Preliminaries page — the leaf's own text, laid out with its
 * printed number as a small marginal numeral rather than as a separate page.
 */
function PrelimItem({
  workId,
  leaf,
  lexis,
}: {
  workId: string;
  leaf: Division;
  lexis?: LexisCtx | null;
}) {
  return (
    <section id={leaf.id} className="prelim-item">
      <span className="prelim-item__num">{leaf.number}</span>
      <div className="prelim-item__body">
        <PassageList workId={workId} passages={leaf.passages} lexis={lexis} />
      </div>
    </section>
  );
}

/**
 * A consolidatable section-type group, rendered as one page: all of its
 * children's passages together, each with its own printed number. Each such
 * group (Definitions, Postulates, Common Notions, ...) already has its own
 * row in the Work tree — see Work.tsx — so this needs no tab bar of its own;
 * Prev/Next (and the tree) are how a reader moves from one to the next.
 */
function ConsolidatedBody({
  workId,
  division,
  lexis,
}: {
  workId: string;
  division: Division;
  lexis?: LexisCtx | null;
}) {
  return (
    <>
      <header className="gr-head">
        <h1 className="reader__utrum gr-head__source">
          {division.editorialTitle ?? divisionShortLabel(division)}
        </h1>
      </header>
      {division.children.map((leaf) => (
        <PrelimItem key={leaf.id} workId={workId} leaf={leaf} lexis={lexis} />
      ))}
    </>
  );
}

/**
 * Defensive fallback for a group division that is NOT a consolidatable
 * Preliminaries group (e.g. Euclid's Propositions group, or a book-level
 * container) reached directly by id. The Work tree only ever links to
 * consolidatable groups and leaves, so this isn't normally reachable — but a
 * plain contents list is honest, rather than either a blank page or
 * ConsolidatedBody misreading a non-leaf child as a numbered item.
 */
function GroupContentsFallback({
  workId,
  division,
  shortLabel,
}: {
  workId: string;
  division: Division;
  shortLabel: string;
}) {
  return (
    <>
      <header className="gr-head">
        <h1 className="reader__utrum gr-head__source">
          {division.editorialTitle ?? shortLabel}
        </h1>
      </header>
      <nav className="entrylist">
        {division.children.map((c) => (
          <Link key={c.id} to={`/read/${workId}/${c.id}`} className="entry">
            <span className="entry__num">{divisionShortLabel(c)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

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

  // Language help (plan §1): gated on the edition/language AND the reader's
  // own toggle. `useLexis` is still called unconditionally (hooks can't be
  // conditional) — it just does nothing when `lexEnabled` is false.
  const lexisSettings = useLexisSettings();
  const lexLang = work && lexisAvailable(work.language) ? work.language : null;
  const lexEnabled = lexLang !== null && lexisSettings.enabled;
  const lexPassages = useMemo(
    () => (division ? allPassages(division) : []),
    [division],
  );
  const { bundle: lexBundle, statuses: lexStatuses } = useLexis(
    workId,
    divId,
    lexLang,
    lexPassages,
    lexEnabled,
  );
  const lexisCtx: LexisCtx | null =
    lexEnabled && lexLang && lexBundle
      ? {
          lang: lexLang,
          bundle: lexBundle,
          statuses: lexStatuses,
          highlight: lexisSettings.highlight,
          morphOnFirstLevel: lexisSettings.morphOnFirstLevel,
          divId,
          workId,
        }
      : null;

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
          {division.children.length > 0 ? (
            isConsolidatableGroup(division) ? (
              <ConsolidatedBody workId={workId} division={division} lexis={lexisCtx} />
            ) : (
              <GroupContentsFallback
                workId={workId}
                division={division}
                shortLabel={shortLabel}
              />
            )
          ) : (
            <>
              <header className="gr-head">
                {division.sourceHeading ? (
                  <h1 className="reader__utrum gr-head__source">
                    {division.sourceHeading}
                  </h1>
                ) : (
                  <h1 className="reader__utrum gr-head__source">{shortLabel}</h1>
                )}
                <p className="gr-head__meta" lang="en">
                  {/* Only shown when the h1 above is the verbatim source
                      heading — otherwise the h1 already IS this division's
                      own label (e.g. "Proposition 1"), and repeating it here
                      would be pure duplication. */}
                  {division.number && division.sourceHeading ? (
                    <span>{divisionShortLabel(division)}</span>
                  ) : null}
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
              <PassageList workId={workId} passages={division.passages} lexis={lexisCtx} />
            </>
          )}
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
