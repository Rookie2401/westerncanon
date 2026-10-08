/**
 * Course — shared types for the reading path of the original-language edition.
 * Authoritative contract: docs/COURSE-PLAN.md. The build scripts
 * (scripts/course/*) emit exactly these shapes; the runtime reads them.
 */
import type { LexLang, Pos } from '../lexis/types.ts';

export type StageId = '0' | 'I' | 'II' | 'III' | 'IV' | 'V';
export const LADDER_STAGES: readonly StageId[] = ['I', 'II', 'III', 'IV', 'V'];

export interface LadderUnit {
  /** `<workId>/<first div id>` */
  id: string;
  work: string;
  /** the reader stops (division ids) that make up the unit, in order */
  divs: string[];
  label: string;
  words: number;
  /** distinct lexemes */
  lemmas: number;
  /** curriculum coverage: share of running words whose lemma was met >= minEncounters times before (names count as known) */
  cov3: number;
  /** share met at least once before */
  cov1: number;
  newPer100: number;
  /** share of running words the analyser does not recognise */
  unrec: number;
  /** lemmas met >= minEncounters times after this unit (Stage 0's core words included) */
  pool: number;
  stage: StageId;
  section: number;
}

export interface LadderWork {
  title: string;
  author: string;
  /** the English edition's sibling work, and whether its division ids match this work's */
  en?: { workId: string; aligned: boolean };
}

export interface CourseLadder {
  lang: LexLang;
  version: number;
  built_at: string;
  policy: {
    minEncounters: number;
    coreWords: number;
    coreShare: number;
    unitWords: [number, number];
    stages: { id: StageId; poolMax: number | null }[];
  };
  works: Record<string, LadderWork>;
  /** Stage 0's core lexeme ids (the ladder's seed) */
  core: string[];
  units: LadderUnit[];
}

/* --- Stage 0 ------------------------------------------------------------ */

export interface ScriptRow {
  sign: string;
  name: string;
  translit: string;
  sound: string;
}

export interface ScriptSection {
  id: string;
  title: string;
  intro?: string[];
  rows: ScriptRow[];
}

export interface CoreWord {
  id: string;
  lemma: string;
  pos: Pos | string;
  gloss: string;
  count: number;
  share: number;
  translit?: string;
}

export interface MicroWord {
  surface: string;
  lemma: string;
  pos: string;
  gloss: string;
  morph: string;
}

export interface MicroPassage {
  text: string;
  work: string;
  div: string;
  cite: string;
  words: MicroWord[];
}

export interface Stage0Pack {
  lang: LexLang;
  version: number;
  built_at: string;
  pronunciation: { note: string; sources: string[] };
  script: ScriptSection[];
  coreShare: number;
  core: CoreWord[];
  micro: MicroPassage[];
  provenance: { words: string; micro: string };
}

/* --- evidence ------------------------------------------------------------ */

export type Degree = 'all' | 'most' | 'some' | 'little';
export const DEGREES: readonly Degree[] = ['all', 'most', 'some', 'little'];

export type CourseEvent =
  | { type: 'UnitCompleted'; lang: LexLang; unitId: string; workId: string }
  | { type: 'ComprehensionReported'; lang: LexLang; unitId: string; workId: string; degree: Degree }
  | { type: 'RescueOpened'; lang: LexLang; workId: string; divId: string }
  | { type: 'Stage0StepCompleted'; lang: LexLang; step: string }
  | { type: 'Stage0DecodeAnswered'; lang: LexLang; item: string; correct: boolean; hinted: boolean }
  | { type: 'Stage0MatchAnswered'; lang: LexLang; item: string; correct: boolean };

export type CourseEventType = CourseEvent['type'];

/** A stored event row: the event plus its id and time. */
export type EventRow = CourseEvent & { id?: number; at: number };

/** Estimated familiarity of a lemma (docs §3): a labelled estimate, never progress. */
export type Familiarity = 'known' | 'likely-familiar' | 'met' | 'new';

export interface UnitProgress {
  unitId: string;
  /** stops of the unit the reader dwelt on (reads log) */
  seenDivs: number;
  totalDivs: number;
  /** explicit completion (UnitCompleted) */
  finishedAt: number | null;
  /** the reader's latest report */
  reported: Degree | null;
}

export type UnitState = 'done' | 'next' | 'later' | 'started';
