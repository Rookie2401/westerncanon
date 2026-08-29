import { loadProoemium } from '../corpus/corpus.ts';
import { useResource } from '../ui/useResource.ts';
import { TopBar } from '../components/TopBar.tsx';

export function ProoemiumScreen() {
  const { data, loading } = useResource(loadProoemium, 'prooemium');

  return (
    <>
      <TopBar back="/" title="Proœmium" />
      <main className="page page--narrow">
        {loading ? (
          <p className="loading">Loading…</p>
        ) : data ? (
          <article className="prose prose--latin" lang="la">
            <p className="crumb" lang="en">
              {data.citation}
            </p>
            {data.text
              .split(/\n{2,}/)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </article>
        ) : (
          <p className="empty">Unavailable.</p>
        )}
      </main>
    </>
  );
}
