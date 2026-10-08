/**
 * The path view (docs/COURSE-PLAN.md §1 "Your path"): the ladder read against
 * the reader's evidence. Pure: ladder + evidence in, a view model out.
 *
 * A unit is `done` only by its explicit completion; `started` when some of
 * its stops were seen; `next` is the first unit that is not done (the path
 * is a default order, so a reader who skips ahead still has a "next" that
 * follows the last completed unit); everything after is `later`.
 */
import type { LexLang } from '../lexis/types.ts';
import type { Evidence } from './evidence.ts';
import { stage0StepsDone, unitProgressMany } from './evidence.ts';
import type { CourseLadder, LadderUnit, StageId, UnitProgress, UnitState } from './types.ts';
import { LADDER_STAGES } from './types.ts';

export interface PathUnit {
  unit: LadderUnit;
  index: number;
  progress: UnitProgress;
  state: UnitState;
}

export interface PathStage {
  id: StageId;
  units: PathUnit[];
  done: number;
  words: number;
}

export interface Stage0Status {
  /** step ids marked done */
  done: Set<string>;
  /** the pack's step ids (script sections + drills + first words + micro) */
  steps: string[];
  complete: boolean;
}

export interface PathView {
  lang: LexLang;
  stages: PathStage[];
  /** the reader's current stage: the stage of the next unit (Stage 0 while it is not complete and nothing is done) */
  currentStage: StageId;
  next: PathUnit | null;
  done: number;
  total: number;
  stage0: Stage0Status;
}

/** The Stage 0 steps a pack offers, in order; the decoding drill exists for Greek only (the Latin and Italian scripts need none). */
export const STAGE0_STEPS = ['script', 'decode', 'words', 'micro'] as const;
export type Stage0Step = (typeof STAGE0_STEPS)[number];
export function stage0StepsFor(lang: LexLang): Stage0Step[] {
  return lang === 'grc' ? [...STAGE0_STEPS] : STAGE0_STEPS.filter((s) => s !== 'decode');
}

export function stage0Status(ev: Evidence, lang: LexLang, steps: readonly string[] = STAGE0_STEPS): Stage0Status {
  const done = stage0StepsDone(ev, lang);
  return { done, steps: [...steps], complete: steps.every((s) => done.has(s)) };
}

export function pathView(ladder: CourseLadder, ev: Evidence, stage0Steps: readonly string[] = STAGE0_STEPS): PathView {
  const progress = unitProgressMany(ladder.units, ev);
  // next = the unit after the LAST completed one that is itself not completed
  let lastDone = -1;
  ladder.units.forEach((u, i) => {
    if (progress.get(u.id)!.finishedAt !== null) lastDone = i;
  });
  let nextIndex = -1;
  for (let i = lastDone + 1; i < ladder.units.length; i++) {
    if (progress.get(ladder.units[i]!.id)!.finishedAt === null) {
      nextIndex = i;
      break;
    }
  }
  const units: PathUnit[] = ladder.units.map((unit, index) => {
    const p = progress.get(unit.id)!;
    const state: UnitState = p.finishedAt !== null ? 'done' : index === nextIndex ? 'next' : p.seenDivs > 0 ? 'started' : 'later';
    return { unit, index, progress: p, state };
  });
  const stages: PathStage[] = LADDER_STAGES.map((id) => {
    const us = units.filter((u) => u.unit.stage === id);
    return { id, units: us, done: us.filter((u) => u.state === 'done').length, words: us.reduce((a, u) => a + u.unit.words, 0) };
  }).filter((s) => s.units.length > 0);
  const next = nextIndex >= 0 ? units[nextIndex]! : null;
  const done = units.filter((u) => u.state === 'done').length;
  const s0 = stage0Status(ev, ladder.lang, stage0Steps);
  const currentStage: StageId = !s0.complete && done === 0 ? '0' : next ? next.unit.stage : 'V';
  return { lang: ladder.lang, stages, currentStage, next, done, total: units.length, stage0: s0 };
}

export const STATE_WORDS: Record<UnitState, string> = { done: 'finished', next: 'next', started: 'started', later: 'later' };
