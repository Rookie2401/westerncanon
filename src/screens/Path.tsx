/**
 * Your path (#/path, docs/COURSE-PLAN.md §1): the ladder of one language read
 * against the reader's evidence — Stage 0 first, then the stages with their
 * units (finished / next / started / later), the next step, a forecast for
 * the units just ahead, and the readiness advice for the current stage.
 * Honest about what it is: an order computed from the texts' vocabulary.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Collapsible } from '../components/Collapsible.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { listKnownWords } from '../lexis/vocab.ts';
import type { KnownWord } from '../lexis/types.ts';
import { useResource } from '../ui/useResource.ts';
import { STAGE_WORDS, stageName } from '../course/index.ts';
import { STATE_WORDS } from '../course/path.ts';
import type { PathStage, PathUnit, PathView } from '../course/path.ts';
import { FORECAST } from '../course/policy.ts';
import { readiness, VERDICT_WORDS } from '../course/readiness.ts';
import { forecastWords } from '../course/forecast.ts';
import type { Forecast } from '../course/forecast.ts';
import { useForecast } from '../course/ui/useForecast.ts';
import { courseLangs, LANG_NAME, useCourseLang, usePathView } from '../course/ui/useCourse.ts';
import { workLine } from '../course/ui/labels.ts';
import type { CourseLadder, LadderUnit } from '../course/types.ts';

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function PathScreen() {
  const [lang, setLang] = useCourseLang();
  const langs = courseLangs();
  const { ladder, view, evidence, loading } = usePathView(lang);
  const { data: words } = useResource<KnownWord[]>(() => listKnownWords(), `course-words:${evidence?.events.length ?? 0}:${evidence?.reads.length ?? 0}`);

  const ahead = useMemo(() => {
    if (!view || !view.next) return [];
    const out: LadderUnit[] = [];
    for (let i = view.next.index; i < view.total && out.length < FORECAST.lookahead; i++) {
      const u = view.stages.flatMap((s) => s.units).find((pu) => pu.index === i);
      if (u && u.state !== 'done') out.push(u.unit);
    }
    return out;
  }, [view]);
  const forecasts = useForecast(ahead, lang);

  const ready = useMemo(() => {
    if (!ladder || !view || !evidence || !words) return null;
    const fc = ahead.map((u) => forecasts.get(u.id)?.coverage).filter((c): c is number => c !== undefined);
    return readiness({ ladder, stage: view.currentStage, ev: evidence, words, forecast: fc });
  }, [ladder, view, evidence, words, ahead, forecasts]);

  return (
    <>
      <TopBar back="/" title="Your path" />
      <main className="page page--narrow co-path">
        {langs.length > 1 ? (
          <div className="segmented co-langs" role="tablist" aria-label="Language">
            {langs.map((l) => (
              <button key={l} role="tab" aria-selected={l === lang} aria-pressed={l === lang} onClick={() => setLang(l)}>
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
        ) : null}
        <h1 className="screen-head__title">Your path in {LANG_NAME[lang]}</h1>
        <p className="co-intro">
          A default order for reading this library&rsquo;s {LANG_NAME[lang]} texts, computed from their vocabulary: each unit comes
          where the units before it have already shown you most of its words. Nothing was written or simplified, and nothing is
          locked &mdash; every text stays open from the library.
        </p>
        {loading || !view || !ladder ? <p className="loading">Loading your path…</p> : null}
        {ladder && view ? (
          <>
            <Stage0Card view={view} lang={lang} />
            <NextStep view={view} ladder={ladder} forecasts={forecasts} />
            {ready ? (
              <section className="co-card" aria-label="Readiness">
                <h2 className="co-card__title">
                  {stageName(view.currentStage)}: {VERDICT_WORDS[ready.verdict]}
                </h2>
                <p className="muted">{ready.summary}</p>
                <p>
                  <Link to="/progress">Your reading and the signals →</Link>
                </p>
              </section>
            ) : null}
            <p className="co-honest muted">
              {ladder.units.length.toLocaleString()} units, {Object.keys(ladder.works).length} works. &ldquo;Path taught&rdquo; is the share of a unit&rsquo;s words
              whose lemma appeared at least {ladder.policy.minEncounters} times earlier on the path (Stage 0&rsquo;s {ladder.policy.coreWords} first words
              included; names count as known). &ldquo;For you&rdquo; is an estimate from your own record. The first units of a language are hard:
              this library has no beginners&rsquo; texts, and the path does not pretend otherwise.
            </p>
            {view.stages.map((s) => (
              <StageSection key={s.id} stage={s} ladder={ladder} current={s.id === view.currentStage} forecasts={forecasts} />
            ))}
          </>
        ) : null}
      </main>
    </>
  );
}

function Stage0Card({ view, lang }: { view: PathView; lang: string }) {
  const s = view.stage0;
  return (
    <section className={clsx('co-card', s.complete && 'co-card--done')} aria-label="Stage 0" data-testid="path-stage0">
      <h2 className="co-card__title">Stage 0 · the script and the first words</h2>
      <p className="muted">
        {s.complete
          ? 'Done: every Stage 0 step is marked finished.'
          : `${s.done.size} of ${s.steps.length} steps marked done.`}
      </p>
      <p>
        <Link className={clsx('btn', !s.complete && view.currentStage === '0' && 'btn--primary')} to={`/path/${lang}/start`}>
          {s.done.size === 0 ? 'Begin with Stage 0' : s.complete ? 'Revisit Stage 0' : 'Continue Stage 0'}
        </Link>
      </p>
    </section>
  );
}

function NextStep({ view, ladder, forecasts }: { view: PathView; ladder: CourseLadder; forecasts: Map<string, Forecast> }) {
  const n = view.next;
  if (!n) {
    return (
      <section className="co-card" data-testid="path-next" data-next="finished">
        <p>
          <strong>You have finished every unit on this path.</strong> The library is yours.
        </p>
      </section>
    );
  }
  const f = forecasts.get(n.unit.id);
  return (
    <section className="co-card co-next" data-testid="path-next" data-unit={n.unit.id}>
      <h2 className="co-card__title">Next on your path</h2>
      <p className="co-next__what">
        {workLine(n.unit, ladder)} — {n.unit.label}
      </p>
      <p className="muted">
        {stageName(n.unit.stage)} · {n.unit.words.toLocaleString()} words · path taught {pct(n.unit.cov3)}
        {f ? ` · for you: ${forecastWords(f)}` : ''}
      </p>
      <p>
        <Link className="btn btn--primary" to={`/read/${n.unit.work}/${n.unit.divs[0]}`}>
          {n.progress.seenDivs > 0 ? 'Continue' : 'Open'}
        </Link>
      </p>
    </section>
  );
}

function StageSection({ stage, ladder, current, forecasts }: { stage: PathStage; ladder: CourseLadder; current: boolean; forecasts: Map<string, Forecast> }) {
  const [open, setOpen] = useState(current);
  return (
    <section className={clsx('co-stage', current && 'co-stage--current')} aria-label={stageName(stage.id)} data-stage={stage.id}>
      <button className="co-stage__head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="co-stage__name">{stageName(stage.id)}</span>
        <span className="co-stage__meta">
          {STAGE_WORDS[stage.id]} · {stage.units.length} unit{stage.units.length === 1 ? '' : 's'} · {Math.round(stage.words / 1000)}k words · {stage.done} finished
        </span>
      </button>
      <Collapsible open={open}>
        <ol className="co-units">
          {stage.units.map((u) => (
            <UnitRow key={u.unit.id} u={u} ladder={ladder} forecast={forecasts.get(u.unit.id)} />
          ))}
        </ol>
      </Collapsible>
    </section>
  );
}

function UnitRow({ u, ladder, forecast }: { u: PathUnit; ladder: CourseLadder; forecast?: Forecast }) {
  return (
    <li className={clsx('co-unit', `co-unit--${u.state}`)} data-state={u.state}>
      <Link to={`/read/${u.unit.work}/${u.unit.divs[0]}`} className="co-unit__link">
        <span className="co-unit__n">{u.index + 1}</span>
        <span className="co-unit__body">
          <span className="co-unit__work">{workLine(u.unit, ladder)}</span>
          <span className="co-unit__label">{u.unit.label}</span>
          <span className="co-unit__meta">
            {u.unit.words.toLocaleString()} words · path taught {pct(u.unit.cov3)}
            {u.unit.unrec >= 0.05 ? ` · ${pct(u.unit.unrec)} unrecognised by the analyser` : ''}
            {forecast ? ` · for you ~${pct(forecast.coverage)}` : ''}
            {u.progress.seenDivs > 0 && u.state !== 'done' ? ` · ${u.progress.seenDivs}/${u.progress.totalDivs} seen` : ''}
            {u.progress.reported ? ` · you said: ${u.progress.reported}` : ''}
          </span>
        </span>
        <span className={clsx('co-chip', u.state === 'done' && 'co-chip--done', u.state === 'next' && 'co-chip--next')}>{STATE_WORDS[u.state]}</span>
      </Link>
    </li>
  );
}
