import { Link, useParams } from 'react-router-dom';
import { aParamOf, findQuestion, loadPart, partById } from '../corpus/corpus.ts';
import { authorById, workById } from '../library/registry.ts';
import { useResource } from '../ui/useResource.ts';
import { articulusLabel } from '../ui/format.ts';
import { TopBar } from '../components/TopBar.tsx';

const SUMMA_AUTHOR = authorById('thomas-aquinas')?.displayName ?? 'Thomas Aquinas';
const SUMMA_TITLE = workById('summa-theologiae')?.title ?? 'Summa Theologiae';

export function QuestionScreen() {
  const { partId = '', qNum = '' } = useParams();
  const info = partById(partId);
  const qn = Number(qNum);
  const { data: part, loading } = useResource(
    () => (info ? loadPart(info.id) : Promise.reject(new Error('unknown part'))),
    `part:${partId}`,
  );

  const question = part ? findQuestion(part, qn) : undefined;

  return (
    <>
      <TopBar back={info ? `/part/${info.id}` : '/'} title="Summa Theologiae" />
      <main className="page">
        {loading ? (
          <p className="loading">Loading…</p>
        ) : !info || !question ? (
          <p className="empty">
            {info
              ? `Quaestio ${qNum} is not in the source text.`
              : 'Unknown part.'}{' '}
            <Link to="/about">See About</Link>.
          </p>
        ) : (
          <>
            <div className="screen-head">
              <p className="crumb">
                {`${SUMMA_AUTHOR} › ${SUMMA_TITLE} › ${info.header} › Q. ${question.number}`.toUpperCase()}
              </p>
              {question.prooemium ? (
                <p className="screen-head__prooemium">
                  {question.prooemium}
                </p>
              ) : null}
            </div>

            <div className="entrylist">
              {[...question.articles]
                .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
                .map((a) => {
                  const ap = aParamOf(a);
                  return (
                    <Link
                      key={ap}
                      to={`/read/${info.id}/${question.number}/${ap}`}
                      className="entry"
                    >
                      <span className="entry__num">{articulusLabel(ap)}</span>
                      <span className="entry__preview">
                        {a.title ?? <span className="muted">—</span>}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
