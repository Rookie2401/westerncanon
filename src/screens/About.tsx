import { loadGaps } from '../corpus/corpus.ts';
import { useResource } from '../ui/useResource.ts';
import { TopBar } from '../components/TopBar.tsx';

export function AboutScreen() {
  const { data: gaps } = useResource(loadGaps, 'gaps');

  return (
    <>
      <TopBar back="/" title="About & text source" />
      <main className="page page--narrow">
        <div className="prose">
          <h2>The text</h2>
          <p>
            This is an offline reader for the <em>Latin</em> text of the{' '}
            <em>Summa Theologiae</em> of Thomas Aquinas — the Proœmium and all
            four extant parts (Prima Pars, Prima Secundae, Secunda Secundae,
            Tertia Pars).
          </p>
          <p>
            The Latin text of the Summa Theologiae is in the public domain. The
            transcription here was aggregated from{' '}
            <a href="https://github.com/vicmortelmans/summa" rel="noreferrer">
              github.com/vicmortelmans/summa
            </a>{' '}
            (the parallel Dutch translation was removed during import). The
            transcription license is unverified; treat this build as being for
            personal use.
          </p>
          <p>
            This application never adds, translates, reconstructs, or emends any
            Latin. What the source transcription does not contain is simply
            absent here — see the gaps below.
          </p>

          <h2>Known source gaps</h2>
          <ul>
            <li>
              <strong>No Supplementum.</strong> This source has none, so the app
              ships the Proœmium and four Partes only.
            </li>
            <li>
              <strong>No Latin quaestio titles.</strong> The source carries no
              “De…” title for any question, so question screens lead with the
              number; a muted preview line shows the first article’s{' '}
              <em>utrum</em> question where available.
            </li>
            {gaps ? (
              <>
                <li>
                  <strong>{gaps.missingQuestions.length} questions absent</strong>{' '}
                  from the transcription: {gaps.missingQuestions.join(', ')}.
                </li>
                <li>
                  <strong>{gaps.missingArticles.length} articles absent</strong>{' '}
                  from the transcription: {gaps.missingArticles.join('; ')}.
                </li>
              </>
            ) : (
              <li>Loading the exact list of absent passages…</li>
            )}
            <li>
              <strong>~28 articles have no recovered <em>utrum</em> line</strong>{' '}
              (it could not be parsed from the question’s prooemium). Those show
              “Articulus N” with no question line. The article body is complete.
            </li>
          </ul>
          <p className="muted">
            Question and article numbers in the source are not always contiguous.
            Previous/next navigation simply skips a number that is not present.
          </p>

          <h2>Typeface</h2>
          <p>
            Set in <strong>EB Garamond</strong> (Georg Duffner &amp; Octavio
            Pardo), used under the SIL Open Font License 1.1. A Latin subset is
            bundled with the app; see <code>FONTS.md</code> in the source tree.
          </p>
        </div>
      </main>
    </>
  );
}
