import { Link, useParams } from 'react-router-dom';
import { authorById, workById } from '../library/registry.ts';
import { loadWorkAbout } from '../library/genericCorpus.ts';
import { useResource } from '../ui/useResource.ts';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { AboutScreen } from './About.tsx';

export function WorkAboutScreen() {
  const { workId = '' } = useParams();
  const work = workById(workId);

  // The Summa keeps its established colophon.
  if (work?.profile === 'summa') return <AboutScreen />;

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

  return <GenericAbout workId={workId} />;
}

function GenericAbout({ workId }: { workId: string }) {
  const work = workById(workId)!;
  const author = authorById(work.authorId);
  const { data: about, loading } = useResource(
    () => loadWorkAbout(workId),
    `about:${workId}`,
  );

  return (
    <>
      <TopBar back={`/work/${workId}`} title="About this text" />
      <main className="page page--narrow">
        <Breadcrumbs
          items={[
            ...(author
              ? [{ label: author.displayName, to: `/author/${author.id}` }]
              : []),
            { label: work.title, to: `/work/${workId}` },
            { label: 'About the text' },
          ]}
        />

        {loading ? (
          <p className="loading">Loading…</p>
        ) : !about ? (
          <p className="empty">
            The text-source note for this work is not in this build.{' '}
            <Link to={`/work/${workId}`}>Back to the contents</Link>.
          </p>
        ) : (
          <div className="prose">
            <h2>The text</h2>
            <p>
              {about.title} of {about.author}
              {about.translator ? `, in the Latin translation of ${about.translator}` : ''}
              {about.edition ? ` — ${about.edition}` : ''}.
            </p>

            {(about.sections ?? []).map((s, i) => (
              <section key={i}>
                <h2>{s.heading}</h2>
                {s.paragraphs.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </section>
            ))}

            <h2>Provenance &amp; licensing</h2>
            <p>{about.provenance}</p>
            <p className="muted">{about.license}</p>
          </div>
        )}
      </main>
    </>
  );
}
