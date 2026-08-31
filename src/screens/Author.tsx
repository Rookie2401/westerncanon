import { Link, useParams } from 'react-router-dom';
import { authorById, worksByAuthor } from '../library/registry.ts';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { TopBar } from '../components/TopBar.tsx';

export function AuthorScreen() {
  const { authorId = '' } = useParams();
  const author = authorById(authorId);
  const works = author ? worksByAuthor(author.id) : [];

  return (
    <>
      <TopBar back="/" title="Library" />
      <main className="page">
        {!author ? (
          <p className="empty">Unknown author.</p>
        ) : (
          <>
            <Breadcrumbs items={[{ label: author.displayName }]} />
            <div className="screen-head">
              <h1 className="screen-head__title">{author.displayName}</h1>
              {author.datesLabel ? (
                <p className="screen-head__prooemium">{author.datesLabel}</p>
              ) : null}
            </div>

            <p className="crumb">Works</p>
            <div className="entrylist">
              {works.map((w) => (
                <Link key={w.id} to={`/work/${w.id}`} className="entry">
                  <span className="entry__num">{w.title}</span>
                  <span className="entry__preview">{w.meta}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
