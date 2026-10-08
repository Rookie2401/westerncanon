/**
 * Help that fades by stage (docs/COURSE-PLAN.md §2.4). The profile of the
 * unit being read (or of the reader's current stage, off the ladder) chooses
 * the defaults for the word marks and the first tap; English (the rescue
 * link) is always reachable. The reader's own manual choices win whenever
 * "Help follows your path" is off.
 */
import type { LexisSettings } from '../lexis/types.ts';
import type { StageId } from './types.ts';

export interface AssistanceProfile {
  stage: StageId;
  highlight: LexisSettings['highlight'];
  morphOnFirstLevel: boolean;
  note: string;
}

const PROFILES: Record<StageId, Omit<AssistanceProfile, 'stage'>> = {
  '0': { highlight: 'all', morphOnFirstLevel: true, note: 'every word marked; meaning and form on the first tap' },
  I: { highlight: 'all', morphOnFirstLevel: true, note: 'every word marked; meaning and form on the first tap' },
  II: { highlight: 'new', morphOnFirstLevel: true, note: 'only new words marked; meaning and form on the first tap' },
  III: { highlight: 'new', morphOnFirstLevel: false, note: 'only new words marked; the form behind “More”' },
  IV: { highlight: 'none', morphOnFirstLevel: false, note: 'no marks; help on request only' },
  V: { highlight: 'none', morphOnFirstLevel: false, note: 'no marks; help on request only' },
};

export function assistanceFor(stage: StageId): AssistanceProfile {
  return { stage, ...PROFILES[stage] };
}

/** The settings the reader actually uses for a stage: the profile when following the path, else the manual choices. */
export function effectiveSettings(settings: LexisSettings, stage: StageId | null): Pick<LexisSettings, 'highlight' | 'morphOnFirstLevel'> {
  if (!settings.followPath || !stage) return { highlight: settings.highlight, morphOnFirstLevel: settings.morphOnFirstLevel };
  const p = assistanceFor(stage);
  return { highlight: p.highlight, morphOnFirstLevel: p.morphOnFirstLevel };
}
