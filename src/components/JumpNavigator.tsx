import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTS, aParamOf, loadPart } from '../corpus/corpus.ts';
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
  const [pid, setPid] = useState<PartId>(
    (PARTS.find((p) => p.id === partId)?.id ?? 'prima-pars') as PartId,
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
          <label htmlFor="jn-pars">Pars</label>
          <select
            id="jn-pars"
            value={pid}
            onChange={(e) => setPid(e.target.value as PartId)}
          >
            {PARTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div className="sheet__row">
          <label htmlFor="jn-q">Quaestio</label>
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
                {roman(q.number)} — {q.number}
              </option>
            ))}
          </select>
        </div>

        <div className="sheet__row">
          <label htmlFor="jn-a">Articulus</label>
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
                  {articulusLabel(v)}
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
