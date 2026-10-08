/**
 * Stage readiness (docs/COURSE-PLAN.md §4) — advice from several signals about
 * whether the reader looks ready to move past the current stage. Never a
 * lock. Finishing every unit of a stage is not a signal. Thresholds live in
 * policy.ts (READINESS) and are provisional.
 *
 * Signals read only the evidence (reads, lookups, events, word rows); the one
 * signal that needs texts, `unfamiliar-material`, is passed in by the caller
 * (the forecast of the next units, computed on demand) and is absent when
 * the caller has none.
 */
import type { KnownWord, LexLang } from '../lexis/types.ts';
import type { Evidence } from './evidence.ts';
import { READINESS } from './policy.ts';
import type { CourseLadder, StageId } from './types.ts';

export type SignalKey =
  | 'lookup-rate'
  | 'rescue-rate'
  | 'reported-comprehension'
  | 'retention'
  | 'unfamiliar-material'
  | 'decoding';

export interface Signal {
  key: SignalKey;
  name: string;
  /** undefined: not enough data to say anything */
  value?: number;
  met?: boolean;
  /** plain words, with the figures */
  detail: string;
}

export type Verdict = 'insufficient-data' | 'stay' | 'ready-to-advance';

export interface Readiness {
  lang: LexLang;
  stage: StageId;
  verdict: Verdict;
  signals: Signal[];
  /** stops of the stage's units the reader has seen */
  stopsSeen: number;
  summary: string;
}

const NAME: Record<SignalKey, string> = {
  'lookup-rate': 'how often you look words up',
  'rescue-rate': 'how often you open the English',
  'reported-comprehension': 'how much you say you understood',
  retention: 'how well words come back after a week',
  'unfamiliar-material': 'how the next units would read',
  decoding: 'reading the script without the hint',
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface ReadinessInput {
  ladder: CourseLadder;
  stage: StageId;
  ev: Evidence;
  words: KnownWord[];
  /** predicted coverage (0..1) of the next unopened units of the path, when the caller computed it */
  forecast?: number[];
  now?: number;
}

export function readiness(input: ReadinessInput): Readiness {
  const { ladder, stage, ev, words } = input;
  const now = input.now ?? Date.now();
  const lang = ladder.lang;
  const signals: Signal[] = [];

  // the stage's stops, and the reader's seen stops among them (in time order)
  const stageStops = new Set<string>();
  for (const u of ladder.units) if (u.stage === stage) for (const d of u.divs) stageStops.add(`${u.work}/${d}`);
  const seenInStage = ev.reads.filter((r) => stageStops.has(`${r.workId}/${r.divId}`));
  const stopsSeen = new Set(seenInStage.map((r) => `${r.workId}/${r.divId}`)).size;

  if (stage !== '0') {
    // lookup-rate and rescue-rate over the last `windowStops` seen stops of the stage
    const window = seenInStage.slice(-READINESS.windowStops);
    const windowWords = window.reduce((a, r) => a + (r.words ?? 0), 0);
    if (window.length >= READINESS.minWindowStops && windowWords > 0) {
      const from = window[0]!.at;
      const windowKeys = new Set(window.map((r) => `${r.workId}/${r.divId}`));
      // lookups made while reading the window's sections (a legacy row without a division counts by time alone)
      const lookups = ev.lookups.filter((l) => l.at >= from && (!l.divId || windowKeys.has(`${l.workId}/${l.divId}`))).length;
      const rate = (lookups / windowWords) * 100;
      signals.push({
        key: 'lookup-rate',
        name: NAME['lookup-rate'],
        value: rate,
        met: rate <= READINESS.lookupsPer100Words,
        detail: `${r1(rate)} lookups per 100 words over your last ${window.length} sections (${windowWords.toLocaleString()} words); at most ${READINESS.lookupsPer100Words} to move on`,
      });
      const rescues = ev.events.filter((e) => e.type === 'RescueOpened' && e.lang === lang && e.at >= from).length;
      const rr = (rescues / window.length) * 100;
      signals.push({
        key: 'rescue-rate',
        name: NAME['rescue-rate'],
        value: rr,
        met: rr <= READINESS.rescuesPer100Stops,
        detail: `${r1(rr)} English rescues per 100 sections over the same window; at most ${READINESS.rescuesPer100Stops}`,
      });
    } else {
      signals.push({ key: 'lookup-rate', name: NAME['lookup-rate'], detail: `needs ${READINESS.minWindowStops} sections of this stage seen with language help on` });
      signals.push({ key: 'rescue-rate', name: NAME['rescue-rate'], detail: `needs ${READINESS.minWindowStops} sections of this stage seen` });
    }

    // reported comprehension: latest report per unit of the stage
    const stageUnitIds = new Set(ladder.units.filter((u) => u.stage === stage).map((u) => u.id));
    const latest = new Map<string, string>();
    for (const e of ev.events) if (e.type === 'ComprehensionReported' && stageUnitIds.has(e.unitId)) latest.set(e.unitId, e.degree);
    if (latest.size >= READINESS.reportedComprehension.minReports) {
      const good = [...latest.values()].filter((d) => d === 'all' || d === 'most').length;
      const share = good / latest.size;
      signals.push({
        key: 'reported-comprehension',
        name: NAME['reported-comprehension'],
        value: share,
        met: share >= READINESS.reportedComprehension.share,
        detail: `${good} of your ${latest.size} reports on this stage say all or most; ${pct(READINESS.reportedComprehension.share)} to move on`,
      });
    } else {
      signals.push({ key: 'reported-comprehension', name: NAME['reported-comprehension'], detail: `needs ${READINESS.reportedComprehension.minReports} reports on units of this stage (${latest.size} so far)` });
    }

    // retention: lemmas first met >= days ago and met again in the last `days`
    const span = READINESS.retention.days * 24 * 60 * 60 * 1000;
    const cohort = words.filter((w) => w.lang === lang && w.first_seen <= now - span && w.last_seen >= now - span && w.encounters > 0);
    if (cohort.length >= READINESS.retention.minLemmas) {
      const clean = cohort.filter((w) => w.last_lookup === undefined || w.last_lookup < now - span).length;
      const share = clean / cohort.length;
      signals.push({
        key: 'retention',
        name: NAME.retention,
        value: share,
        met: share >= READINESS.retention.share,
        detail: `${clean} of ${cohort.length} words you first met over a week ago and read again this week needed no lookup; ${pct(READINESS.retention.share)} to move on`,
      });
    } else {
      signals.push({ key: 'retention', name: NAME.retention, detail: `needs ${READINESS.retention.minLemmas} words first met over a week ago and read again this week (${cohort.length} so far)` });
    }

    // unfamiliar material: supplied by the caller
    if (input.forecast && input.forecast.length) {
      const mean = input.forecast.reduce((a, b) => a + b, 0) / input.forecast.length;
      signals.push({
        key: 'unfamiliar-material',
        name: NAME['unfamiliar-material'],
        value: mean,
        met: mean >= READINESS.unfamiliarMaterial,
        detail: `the next ${input.forecast.length} unit${input.forecast.length === 1 ? '' : 's'} on your path look about ${pct(mean)} familiar; ${pct(READINESS.unfamiliarMaterial)} to move on`,
      });
    } else {
      signals.push({ key: 'unfamiliar-material', name: NAME['unfamiliar-material'], detail: 'estimated on the path page from the next units' });
    }
  } else {
    // Stage 0: decoding drill
    const answers = ev.events.filter((e) => e.type === 'Stage0DecodeAnswered' && e.lang === lang).slice(-READINESS.decoding.window);
    if (answers.length >= READINESS.decoding.window) {
      const ok = answers.filter((a) => a.type === 'Stage0DecodeAnswered' && a.correct && !a.hinted).length;
      signals.push({
        key: 'decoding',
        name: NAME.decoding,
        value: ok / answers.length,
        met: ok >= READINESS.decoding.minCorrect,
        detail: `${ok} of your last ${answers.length} decoding answers were right without the hint; ${READINESS.decoding.minCorrect} to move on`,
      });
    } else {
      signals.push({ key: 'decoding', name: NAME.decoding, detail: `needs ${READINESS.decoding.window} decoding answers (${answers.length} so far)` });
    }
  }

  const withData = signals.filter((s) => s.met !== undefined);
  let verdict: Verdict;
  if (stage === '0') {
    verdict = withData.length === 0 ? 'insufficient-data' : withData.every((s) => s.met) ? 'ready-to-advance' : 'stay';
  } else if (stopsSeen < READINESS.minStopsSeen || withData.length < READINESS.minSignalsWithData) {
    verdict = 'insufficient-data';
  } else {
    verdict = withData.every((s) => s.met) ? 'ready-to-advance' : 'stay';
  }
  const summary =
    verdict === 'insufficient-data'
      ? stage === '0'
        ? 'Not enough drill answers yet to say.'
        : `Not enough evidence yet: ${stopsSeen} of this stage's sections seen (${READINESS.minStopsSeen} needed) and ${withData.length} signal${withData.length === 1 ? '' : 's'} with data (${READINESS.minSignalsWithData} needed).`
      : verdict === 'ready-to-advance'
        ? 'Every signal with data says you could move on. This is advice: nothing is locked either way.'
        : `Some signals say stay a while: ${withData.filter((s) => !s.met).map((s) => s.name).join('; ')}. This is advice: nothing is locked either way.`;
  return { lang, stage, verdict, signals, stopsSeen, summary };
}

export const VERDICT_WORDS: Record<Verdict, string> = {
  'insufficient-data': 'not enough evidence yet',
  stay: 'stay a while',
  'ready-to-advance': 'ready to move on',
};
