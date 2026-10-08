/**
 * Stage 0 (#/path/:lang/start, docs/COURSE-PLAN.md §1): the on-ramp — the
 * script, a decoding drill (Greek), the first words with a meaning drill, and
 * the micro-passages. Each step can be marked done (a Stage0StepCompleted
 * event); the drills record every answer; the hint fades from evidence.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { TopBar } from '../components/TopBar.tsx';
import { posLabel } from '../lexis/morph.ts';
import type { LexLang, Pos } from '../lexis/types.ts';
import { drillAnswers, recordEvent } from '../course/evidence.ts';
import { hintShown, makeRound } from '../course/drills.ts';
import type { DrillItem } from '../course/drills.ts';
import { stage0StepsFor } from '../course/path.ts';
import type { Stage0Step } from '../course/path.ts';
import { GlossedSentence } from '../course/ui/GlossedSentence.tsx';
import { LANG_NAME, useEvidence, useStage0 } from '../course/ui/useCourse.ts';
import type { CoreWord, Stage0Pack } from '../course/types.ts';

const STEP_TITLE: Record<Stage0Step, string> = {
  script: 'The script',
  decode: 'Reading the letters',
  words: 'The first words',
  micro: 'First sentences',
};

function isLexLang(x: string | undefined): x is LexLang {
  return x === 'grc' || x === 'la' || x === 'it';
}

export function Stage0Screen() {
  const { lang: raw } = useParams();
  const lang = isLexLang(raw) ? raw : null;
  const { data: pack, loading } = useStage0(lang);
  const evidence = useEvidence();
  const steps = lang ? stage0StepsFor(lang) : [];
  const done = useMemo(() => {
    const s = new Set<string>();
    if (evidence && lang) for (const e of evidence.events) if (e.type === 'Stage0StepCompleted' && e.lang === lang) s.add(e.step);
    return s;
  }, [evidence, lang]);
  const [step, setStep] = useState<Stage0Step>('script');

  if (!lang) {
    return (
      <>
        <TopBar back="/path" title="Stage 0" />
        <main className="page page--narrow">
          <p className="empty">Unknown language.</p>
        </main>
      </>
    );
  }

  const markDone = () => {
    recordEvent({ type: 'Stage0StepCompleted', lang, step }).catch(() => {});
  };

  return (
    <>
      <TopBar back="/path" title={`Stage 0 · ${LANG_NAME[lang]}`} />
      <main className="page page--narrow co-stage0">
        <h1 className="screen-head__title">Start from zero: {LANG_NAME[lang]}</h1>
        <nav className="segmented co-steps" aria-label="Steps">
          {steps.map((s) => (
            <button key={s} aria-pressed={step === s} onClick={() => setStep(s)} className={clsx(done.has(s) && 'co-step--done')}>
              {STEP_TITLE[s]}
              {done.has(s) ? ' ✓' : ''}
            </button>
          ))}
        </nav>
        {loading || !pack ? <p className="loading">Loading…</p> : null}
        {pack && evidence ? (
          <>
            {step === 'script' ? <ScriptStep pack={pack} /> : null}
            {step === 'decode' ? <DrillStep pack={pack} lang={lang} kind="decode" evidence={evidence} /> : null}
            {step === 'words' ? <WordsStep pack={pack} lang={lang} evidence={evidence} /> : null}
            {step === 'micro' ? <MicroStep pack={pack} lang={lang} /> : null}
            <div className="co-stepdone">
              {done.has(step) ? (
                <span className="co-chip co-chip--done">Marked done</span>
              ) : (
                <button className="btn btn--primary" onClick={markDone} data-testid="stage0-done">
                  Mark &ldquo;{STEP_TITLE[step]}&rdquo; done
                </button>
              )}
              <Link to="/path" className="muted">
                Back to your path →
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}

function ScriptStep({ pack }: { pack: Stage0Pack }) {
  return (
    <section aria-label="The script">
      <p className="co-intro">{pack.pronunciation.note}</p>
      {pack.script.map((sec) => (
        <div key={sec.id} className="co-script">
          <h2 className="co-card__title">{sec.title}</h2>
          {sec.intro?.map((p, i) => (
            <p key={i} className="co-script__intro">
              {p}
            </p>
          ))}
          <table className="co-table">
            <thead>
              <tr>
                <th>sign</th>
                {sec.rows.some((r) => r.name) ? <th>name</th> : null}
                <th>written</th>
                <th>sound</th>
              </tr>
            </thead>
            <tbody>
              {sec.rows.map((r, i) => (
                <tr key={i}>
                  <td className={clsx('co-table__sign', pack.lang === 'grc' && 'reader__prose--grc')} lang={pack.lang}>
                    {r.sign}
                  </td>
                  {sec.rows.some((x) => x.name) ? <td>{r.name}</td> : null}
                  <td>{r.translit}</td>
                  <td>{r.sound}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {pack.pronunciation.sources.length ? (
        <p className="muted co-sources">After: {pack.pronunciation.sources.join('; ')}.</p>
      ) : null}
    </section>
  );
}

function DrillStep({ pack, lang, kind, evidence }: { pack: Stage0Pack; lang: LexLang; kind: 'decode' | 'match'; evidence: NonNullable<ReturnType<typeof useEvidence>> }) {
  const type = kind === 'decode' ? 'Stage0DecodeAnswered' : 'Stage0MatchAnswered';
  const [seed, setSeed] = useState(() => Date.now() % 1_000_000);
  const round = useMemo(() => makeRound(pack.core, kind, seed), [pack, kind, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hintAsked, setHintAsked] = useState(false);
  const [score, setScore] = useState({ right: 0, answered: 0 });

  const recent = drillAnswers(evidence, lang, type).slice(-10).map((a) => ({ correct: a.correct, hinted: 'hinted' in a ? a.hinted : false }));
  const hintByDefault = kind === 'decode' ? hintShown(recent) : false;
  const item: DrillItem | undefined = round[i];

  if (!round.length) return <p className="muted">Not enough words with a gloss to drill.</p>;
  if (!item) {
    return (
      <section className="co-drill" aria-label="Round finished">
        <p>
          Round finished: {score.right} of {score.answered} right.
        </p>
        <button
          className="btn"
          onClick={() => {
            setSeed((s) => s + 1);
            setI(0);
            setPicked(null);
            setScore({ right: 0, answered: 0 });
          }}
        >
          Another round
        </button>
      </section>
    );
  }
  const hinted = hintByDefault || hintAsked;
  const answer = (j: number) => {
    if (picked !== null) return;
    setPicked(j);
    const correct = j === item.answer;
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), answered: s.answered + 1 }));
    const ev = kind === 'decode'
      ? ({ type: 'Stage0DecodeAnswered', lang, item: item.id, correct, hinted } as const)
      : ({ type: 'Stage0MatchAnswered', lang, item: item.id, correct } as const);
    recordEvent(ev).catch(() => {});
  };
  const next = () => {
    setI((k) => k + 1);
    setPicked(null);
    setHintAsked(false);
  };
  return (
    <section className="co-drill" aria-label={kind === 'decode' ? 'Decoding drill' : 'Meaning drill'} data-testid={`drill-${kind}`}>
      <p className="muted">
        {kind === 'decode'
          ? 'How is this word read? Pick the romanisation. The hint under the word steps aside after three unaided right answers in a row; ask for it whenever you need it.'
          : 'What does this word mean? Pick the gloss.'}{' '}
        {i + 1} of {round.length}.
      </p>
      <p className={clsx('co-drill__word', lang === 'grc' && 'reader__prose--grc')} lang={lang}>
        {item.word.lemma}
      </p>
      {kind === 'decode' ? (
        <p className="co-drill__hint" lang="en">
          {hinted ? <span data-testid="drill-hint">{item.word.translit}</span> : (
            <button className="co-linkbtn" onClick={() => setHintAsked(true)}>
              show the hint
            </button>
          )}
        </p>
      ) : (
        <p className="co-drill__hint muted">{posLabel(item.word.pos as Pos)}</p>
      )}
      <div className="co-drill__options">
        {item.options.map((o, j) => (
          <button
            key={j}
            className={clsx('btn', picked !== null && j === item.answer && 'co-opt--right', picked === j && j !== item.answer && 'co-opt--wrong')}
            onClick={() => answer(j)}
            disabled={picked !== null}
            lang="en"
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null ? (
        <p className="co-drill__feedback">
          {picked === item.answer ? 'Right.' : `Not this time: ${item.options[item.answer]}.`}{' '}
          <button className="btn" onClick={next} data-testid="drill-next">
            Next
          </button>
        </p>
      ) : null}
    </section>
  );
}

function WordsStep({ pack, lang, evidence }: { pack: Stage0Pack; lang: LexLang; evidence: NonNullable<ReturnType<typeof useEvidence>> }) {
  const [showAll, setShowAll] = useState(false);
  const words: CoreWord[] = showAll ? pack.core : pack.core.slice(0, 60);
  return (
    <section aria-label="The first words">
      <p className="co-intro">
        The {pack.core.length} commonest words of this library&rsquo;s {LANG_NAME[lang]} texts, by running-word frequency; together they are{' '}
        {Math.round(pack.coreShare * 100)}% of every word you will read. {pack.provenance.words}
      </p>
      <DrillStep pack={pack} lang={lang} kind="match" evidence={evidence} />
      <ol className="co-words">
        {words.map((w, i) => (
          <li key={w.id} className="co-word">
            <span className="co-word__n">{i + 1}</span>
            <span className={clsx('co-word__lemma', lang === 'grc' && 'reader__prose--grc')} lang={lang}>
              {w.lemma}
            </span>
            {w.translit ? <span className="co-word__tr">{w.translit}</span> : null}
            <span className="co-word__pos">{posLabel(w.pos as Pos)}</span>
            <span className="co-word__gloss">{w.gloss || '—'}</span>
            <span className="co-word__share">{(w.share * 100).toFixed(2)}%</span>
          </li>
        ))}
      </ol>
      {!showAll && pack.core.length > 60 ? (
        <button className="btn" onClick={() => setShowAll(true)}>
          Show all {pack.core.length}
        </button>
      ) : null}
    </section>
  );
}

function MicroStep({ pack, lang }: { pack: Stage0Pack; lang: LexLang }) {
  return (
    <section aria-label="First sentences">
      <p className="co-intro">{pack.provenance.micro}</p>
      {pack.micro.length === 0 ? <p className="muted">No sentence of this library uses only the first words.</p> : null}
      {pack.micro.map((m, i) => (
        <GlossedSentence key={i} passage={m} lang={lang} />
      ))}
    </section>
  );
}
