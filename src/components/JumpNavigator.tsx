import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTS, aParamOf, loadPart, partById } from '../corpus/corpus.ts';
import type { PartId } from '../corpus/types.ts';
import { useResource } from '../ui/useResource.ts';
import { articulusLabel, roman } from '../ui/format.ts';

interface Props {
  partId: string;
  qNum: number;
  aParam: string;
  onClose: () => void;
}

export function JumpNavigator({ partId, qNum, aParam, onClose }: Props) {
  const navigate = useNavigate();
  const startInfo = partById(partId);
  const isEn = startInfo?.lang === 'en';
  // Scoped to the current reader's own work: PARTS holds both the Latin and
  // English Summa editions' parts in one flat table, so an unfiltered list
  // here would let a reader "jump" from English content into a Latin part
  // (or vice versa) via this dropdown, which is confusing and unintended -
  // switching editions is a Library-level action, not a Jump action.
  const ownParts = PARTS.filter((p) => p.workId === startInfo?.workId);
  const [pid, setPid] = useState<PartId>(
    (ownParts.find((p) => p.id === partId)?.id ?? ownParts[0]?.id ?? 'prima-pars') as PartId,
  );
  const [qn, setQn] = useState(qNum);
  const [ap, setAp] = useState(aParam);

  const { data: part, loading } = useResource(() => loadPart(pid), `part:${pid}`);

  const questions = part
    ? [...part.questions].sort((a, b) => a.number - b.number)
    : [];
  const effQn = questions.some((q) => q.number === qn)
    ? qn
    : questions[0]?.number ?? qn;
  const question = questions.find((q) => q.number === effQn);
  const articles = question
    ? [...question.articles].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    : [];
  const effAp = articles.some((a) => aParamOf(a) === ap)
    ? ap
    : articles[0]
      ? aParamOf(articles[0])
      : ap;

  function go() {
    onClose();
    navigate(`/read/${pid}/${effQn}/${effAp}`);
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Jump to article"
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="sheet__title">Jump to</p>

        <div className="sheet__row">
          <label htmlFor="jn-pars">{isEn ? 'Part' : 'Pars'}</label>
          <select
            id="jn-pars"
            value={pid}
            onChange={(e) => setPid(e.target.value as PartId)}
          >
            {ownParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div className="sheet__row">
          <label htmlFor="jn-q">{isEn ? 'Question' : 'Quaestio'}</label>
          <select
            id="jn-q"
            value={effQn}
            disabled={loading || !questions.length}
            onChange={(e) => {
              setQn(Number(e.target.value));
              setAp('1');
            }}
          >
            {questions.map((q) => (
              <option key={q.number} value={q.number}>
                {q.appendix != null
                  ? `App. ${q.appendix} — q. ${q.appendixNumber ?? 1}`
                  : `${roman(q.number)} — ${q.number}`}
              </option>
            ))}
          </select>
        </div>

        <div className="sheet__row">
          <label htmlFor="jn-a">{isEn ? 'Article' : 'Articulus'}</label>
          <select
            id="jn-a"
            value={effAp}
            disabled={loading || !articles.length}
            onChange={(e) => setAp(e.target.value)}
          >
            {articles.map((a) => {
              const v = aParamOf(a);
              return (
                <option key={v} value={v}>
                  {articulusLabel(v, isEn ? 'en' : 'la')}
                </option>
              );
            })}
          </select>
        </div>

        <div className="sheet__actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={go} disabled={loading}>
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
