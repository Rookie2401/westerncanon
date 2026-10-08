/**
 * Your reading (#/progress, docs/COURSE-PLAN.md §1, §4): the five notions kept
 * apart — sections seen, units finished, what you reported, and the lemma
 * pool as an estimate — plus the readiness signals of the current stage.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { TopBar } from '../components/TopBar.tsx';
import { listKnownWords } from '../lexis/vocab.ts';
import type { KnownWord } from '../lexis/types.ts';
import { useResource } from '../ui/useResource.ts';
import { familiarityCounts, FAMILIARITY_WORDS } from '../course/familiarity.ts';
import { stageName } from '../course/index.ts';
import { FORECAST } from '../course/policy.ts';
import { readiness, VERDICT_WORDS } from '../course/readiness.ts';
import { forecastWords } from '../course/forecast.ts';
import { useForecast } from '../course/ui/useForecast.ts';
import { courseLangs, LANG_NAME, useCourseLang, usePathView } from '../course/ui/useCourse.ts';
import { workLine } from '../course/ui/labels.ts';
import type { Degree, Familiarity, LadderUnit } from '../course/types.ts';
import { DEGREES } from '../course/types.ts';

const FAM_ORDER: Familiarity[] = ['known', 'likely-familiar', 'met', 'new'];

export function ProgressScreen() {
  const [lang, setLang] = useCourseLang();
  const langs = courseLangs();
  const { ladder, view, evidence } = usePathView(lang);
  const { data: words } = useResource<KnownWord[]>(() => listKnownWords(), `course-words:${evidence?.events.length ?? 0}:${evidence?.reads.length ?? 0}`);

  const ahead = useMemo(() => {
    if (!view || !view.next) return [];
    const all = view.stages.flatMap((s) => s.units);
    const out: LadderUnit[] = [];
    for (let i = view.next.index; i < view.total && out.length < FORECAST.lookahead; i++) {
      const u = all.find((pu) => pu.index === i);
      if (u && u.state !== 'done') out.push(u.unit);
    }
    return out;
  }, [view]);
  const forecasts = useForecast(ahead, lang);

  const langWords = useMemo(() => (words ?? []).filter((w) => w.lang === lang), [words, lang]);
  const pool = useMemo(() => familiarityCounts(langWords), [langWords]);

  const ready = useMemo(() => {
    if (!ladder || !view || !evidence || !words) return null;
    const fc = ahead.map((u) => forecasts.get(u.id)?.coverage).filter((c): c is number => c !== undefined);
    return readiness({ ladder, stage: view.currentStage, ev: evidence, words, forecast: fc });
  }, [ladder, view, evidence, words, ahead, forecasts]);

  const seenStops = useMemo(() => {
    if (!evidence || !ladder) return 0;
    const onLadder = new Set<string>();
    for (const u of ladder.units) for (const d of u.divs) onLadder.add(`${u.work}/${d}`);
    const seen = new Set<string>();
    for (const r of evidence.reads) {
      const k = `${r.workId}/${r.divId}`;
      if (onLadder.has(k)) seen.add(k);
    }
    return seen.size;
  }, [evidence, ladder]);

  const reports = useMemo(() => {
    const out: Record<Degree, number> = { all: 0, most: 0, some: 0, little: 0 };
    if (!evidence || !ladder) return out;
    const latest = new Map<string, Degree>();
    for (const e of evidence.events) if (e.type === 'ComprehensionReported' && e.lang === lang) latest.set(e.unitId, e.degree);
    for (const d of latest.values()) out[d]++;
    return out;
  }, [evidence, ladder, lang]);

  const rescues = evidence ? evidence.events.filter((e) => e.type === 'RescueOpened' && e.lang === lang).length : 0;
  const started = view ? view.stages.flatMap((s) => s.units).filter((u) => u.state === 'started').length : 0;

  return (
    <>
      <TopBar back="/path" title="Your reading" />
      <main className="page page--narrow co-progress">
        {langs.length > 1 ? (
          <div className="segmented co-langs" role="tablist" aria-label="Language">
            {langs.map((l) => (
              <button key={l} role="tab" aria-selected={l === lang} aria-pressed={l === lang} onClick={() => setLang(l)}>
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
        ) : null}
        <h1 className="screen-head__title">Your reading in {LANG_NAME[lang]}</h1>
        <p className="co-intro">
          Five things are kept apart here and never added together: what you opened counts for nothing; what you dwelt on is{' '}
          <b>seen</b>; a unit is <b>finished</b> only when you said so; <b>understood</b> is what you reported; and the vocabulary
          pool is an <b>estimate</b> from your record.
        </p>
        {!view || !ladder || !evidence ? <p className="loading">Reading your record…</p> : null}
        {view && ladder && evidence ? (
          <>
            <section className="co-card" aria-label="Units">
              <h2 className="co-card__title">On the path</h2>
              <dl className="co-facts">
                <dt>Sections seen</dt>
                <dd>{seenStops.toLocaleString()} of the path&rsquo;s {ladder.units.reduce((a, u) => a + u.divs.length, 0).toLocaleString()}</dd>
                <dt>Units started, not finished</dt>
                <dd>{started}</dd>
                <dt>Units finished (you said so)</dt>
                <dd>
                  {view.done} of {view.total}
                </dd>
                <dt>What you reported</dt>
                <dd>{DEGREES.map((d) => `${d} ${reports[d]}`).join(' · ')}</dd>
                <dt>English rescues opened</dt>
                <dd>{rescues}</dd>
                <dt>Current stage</dt>
                <dd>{stageName(view.currentStage)}</dd>
              </dl>
            </section>

            <section className="co-card" aria-label="Vocabulary">
              <h2 className="co-card__title">Your vocabulary pool (an estimate)</h2>
              <dl className="co-facts">
                {FAM_ORDER.map((f) => (
                  <div key={f} className="co-facts__row">
                    <dt>{FAMILIARITY_WORDS[f]}</dt>
                    <dd>{pool[f].toLocaleString()} lemmas</dd>
                  </div>
                ))}
              </dl>
              <p className="muted">
                &ldquo;Known&rdquo; is your own status; &ldquo;likely familiar&rdquo; means read unaided on several days with no recent lookup;
                &ldquo;met before&rdquo; any encounter at all. Lemmas you have never met are not counted. <Link to="/vocabulary">Vocabulary →</Link>
              </p>
            </section>

            {ready ? (
              <section className="co-card" aria-label="Readiness">
                <h2 className="co-card__title">
                  {stageName(ready.stage)}: {VERDICT_WORDS[ready.verdict]}
                </h2>
                <p className="muted">{ready.summary}</p>
                <ul className="co-signals">
                  {ready.signals.map((s) => (
                    <li key={s.key} className={clsx('co-signal', s.met === true && 'co-signal--met', s.met === false && 'co-signal--unmet', s.met === undefined && 'co-signal--nodata')}>
                      <span className="co-signal__name">{s.name}</span>
                      <span className="co-signal__state">{s.met === undefined ? 'no data yet' : s.met ? 'met' : 'not yet'}</span>
                      <span className="co-signal__detail">{s.detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {ahead.length ? (
              <section className="co-card" aria-label="Forecast">
                <h2 className="co-card__title">The next units, for you</h2>
                <ul className="co-forecast">
                  {ahead.map((u) => {
                    const f = forecasts.get(u.id);
                    return (
                      <li key={u.id}>
                        <Link to={`/read/${u.work}/${u.divs[0]}`}>
                          {workLine(u, ladder)} — {u.label}
                        </Link>
                        <span className="muted"> · {f ? forecastWords(f) : 'estimating…'}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
