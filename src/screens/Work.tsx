import { Link, useParams } from 'react-router-dom';
import { authorById, workById } from '../library/registry.ts';
import { summaTopLevel } from '../library/summaAdapter.ts';
import { loadGenericWork } from '../library/genericCorpus.ts';
import type { Division } from '../library/types.ts';
import { useResource } from '../ui/useResource.ts';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { TopBar } from '../components/TopBar.tsx';

function sectionNumber(d: Division): string {
  if (d.number === null) return d.sourceHeading ?? 'Praefatio';
  return `§ ${d.number}`;
}

export function WorkScreen() {
  const { workId = '' } = useParams();
  const work = workById(workId);
  const author = work ? authorById(work.authorId) : undefined;

  if (!work) {
    return (
      <>
        <TopBar back="/" title="Library" />
        <main className="page">
          <p className="empty">Unknown work.</p>
        </main>
      </>
    );
  }

  // Back always goes straight to the Library — the Author screen is not part of
  // the drill-down path (nothing links into it), so it must not sit on the way
  // out. The author still shows in the breadcrumb, as plain text.
  const crumbs = [
    ...(author ? [{ label: author.displayName }] : []),
    { label: work.title },
  ];

  return (
    <>
      <TopBar back="/" title="Library" />
      <main className="page">
        <Breadcrumbs items={crumbs} />
        <div className="screen-head">
          <h1 className="screen-head__title">{work.title}</h1>
          {work.commonTitle ? (
            <p className="home__subtitle" style={{ marginTop: '0.2rem' }}>
              {work.commonTitle}
            </p>
          ) : null}
          <p className="crumb" style={{ marginTop: '0.4rem' }}>
            {work.meta}
          </p>
        </div>

        {work.profile === 'summa' ? (
          <SummaWorkBody />
        ) : (
          <GenericWorkBody workId={work.id} />
        )}
      </main>
    </>
  );
}

/** The Prooemium link + 4 Partes, EXACTLY as the old Home rendered them, then
 *  this work's own "About the text" entry at the very bottom. */
function SummaWorkBody() {
  const entries = summaTopLevel();
  return (
    <nav className="home__list">
      {entries.map((e) => (
        <div key={e.id}>
          {e.compilation ? (
            <p className="home__list-divider">Appended after Tertia Pars</p>
          ) : null}
          <Link
            to={e.to}
            className={e.compilation ? 'home__entry home__entry--compilation' : 'home__entry'}
          >
            <span className="home__entry-name">
              {e.label}
              {e.compilation ? (
                <span className="home__entry-sub">posthumous compilation</span>
              ) : null}
            </span>
            {e.code ? <span className="home__entry-index">{e.code}</span> : null}
          </Link>
        </div>
      ))}
      <Link to="/work/summa-theologiae/about" className="home__entry work__about-entry">
        <span className="home__entry-name">About this text</span>
      </Link>
    </nav>
  );
}

function GenericWorkBody({ workId }: { workId: string }) {
  const { data: work, loading } = useResource(
    () => loadGenericWork(workId),
    `generic:${workId}`,
  );

  if (loading) return <p className="loading">Loading…</p>;
  if (!work) {
    return (
      <p className="empty">
        This work is not available in this build yet.{' '}
        <Link to="/">Back to the Library</Link>.
      </p>
    );
  }

  return (
    <>
      <p className="work__legend">English section titles are editorial.</p>
      <div className="entrylist">
        {work.divisions.map((d) => (
          <Link
            key={d.id}
            to={`/read/${workId}/${d.id}`}
            className="entry"
          >
            <span className="entry__num">{sectionNumber(d)}</span>
            <span className="work__preview">
              {d.ref ? <span className="work__ref">{d.ref}</span> : null}
              {d.editorialTitle ? (
                <span className="work__edtitle">
                  <span className="work__edtag">ed.</span>
                  {d.editorialTitle}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
        <Link
          to={`/work/${workId}/about`}
          className="entry work__about-entry"
        >
          <span className="entry__num">About this text</span>
        </Link>
      </div>
    </>
  );
}
