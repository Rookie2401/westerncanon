/**
 * Every threshold of the course in one place (docs/COURSE-PLAN.md §3–4).
 * Provisional, like Go's: calibrated on nothing but the shape of the corpus.
 */

/** Familiarity estimate (docs §3). */
export const FAMILIAR = {
  /** unaided encounters (once per division per day) at which a lemma is likely familiar */
  minEncounters: 4,
  /** on at least this many distinct days */
  minDays: 2,
  /** and no lookup since the last two encounters: approximated as no lookup within this many ms of the last encounter */
  quietSinceLookupMs: 36 * 60 * 60 * 1000,
} as const;

/** Predicted coverage weights (docs §3). */
export const FORECAST = {
  known: 1,
  likelyFamiliar: 1,
  met: 0.5,
  /** the next units of the path whose forecast the path and readiness compute (each needs its work's text) */
  lookahead: 3,
} as const;

/** Readiness (docs §4). */
export const READINESS = {
  /** fewer stops seen in the stage, or fewer signals with data, than this: insufficient data */
  minStopsSeen: 10,
  minSignalsWithData: 3,
  /** window of recent seen stops for lookup-rate and rescue-rate */
  windowStops: 30,
  minWindowStops: 5,
  lookupsPer100Words: 4,
  rescuesPer100Stops: 5,
  reportedComprehension: { share: 0.8, minReports: 3 },
  retention: { days: 7, share: 0.85, minLemmas: 30 },
  unfamiliarMaterial: 0.9,
  decoding: { window: 10, minCorrect: 8 },
} as const;

/** Stage 0 drills (docs §1): the hint fades after this many unaided correct answers in a row. */
export const DRILL = { hintFadesAfter: 3, options: 4, decodeItems: 12, matchItems: 12 } as const;

/** The reader's read log counts a stop as seen after this dwell (src/lexis/ui/useLexis.ts). */
export const SEEN_DWELL_MS = 5000;
