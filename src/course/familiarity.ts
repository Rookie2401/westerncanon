/**
 * Estimated familiarity of a lemma (docs/COURSE-PLAN.md §3) — GoLearn's
 * "estimated familiarity" notion: a labelled estimate from the reader's own
 * record, never progress and never a score.
 *
 *   known            the reader's status says known / mastered / ignored
 *   likely-familiar  >= FAMILIAR.minEncounters unaided encounters on
 *                    >= FAMILIAR.minDays days, and no lookup close to the
 *                    latest encounter (the word has been read without help)
 *   met              any encounter or lookup at all
 *   new              no record
 */
import type { KnownWord } from '../lexis/types.ts';
import { FAMILIAR } from './policy.ts';
import type { Familiarity } from './types.ts';

const KNOWN = new Set(['known', 'mastered', 'ignored']);

export function familiarityOf(kw: KnownWord | undefined): Familiarity {
  if (!kw) return 'new';
  if (KNOWN.has(kw.status)) return 'known';
  const days = kw.days ?? (kw.encounters > 0 ? 1 : 0);
  const quiet = kw.last_lookup === undefined || kw.last_seen - kw.last_lookup >= FAMILIAR.quietSinceLookupMs;
  if (kw.encounters >= FAMILIAR.minEncounters && days >= FAMILIAR.minDays && quiet) return 'likely-familiar';
  if (kw.encounters > 0 || kw.lookups > 0) return 'met';
  return 'new';
}

export const FAMILIARITY_WORDS: Record<Familiarity, string> = {
  known: 'known',
  'likely-familiar': 'likely familiar',
  met: 'met before',
  new: 'new',
};

/** Per-class lemma counts of a set of rows (the Progress screen's pool). */
export function familiarityCounts(rows: Iterable<KnownWord>): Record<Familiarity, number> {
  const out: Record<Familiarity, number> = { known: 0, 'likely-familiar': 0, met: 0, new: 0 };
  for (const kw of rows) out[familiarityOf(kw)]++;
  return out;
}
