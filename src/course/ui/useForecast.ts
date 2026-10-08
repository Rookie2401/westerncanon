/**
 * Forecasts for a few ladder units (docs/COURSE-PLAN.md §3): loads each
 * unit's work text and Lexis bundle, subscribes to the statuses of the
 * lexemes involved, and computes the predicted coverage. Meant for the next
 * handful of units on the path, never a whole ladder.
 */
import { useMemo } from 'react';
import { loadGenericWork } from '../../library/genericCorpus.ts';
import { loadWorkLexis } from '../../lexis/index.ts';
import { useStatuses } from '../../lexis/vocab.ts';
import type { LexLang, WorkLexis } from '../../lexis/types.ts';
import { useResource } from '../../ui/useResource.ts';
import { forecastText, lexemeIdsOf, unitText } from '../forecast.ts';
import type { Forecast } from '../forecast.ts';
import type { LadderUnit } from '../types.ts';

interface Loaded {
  unit: LadderUnit;
  text: string;
  bundle: WorkLexis;
}

export function useForecast(units: LadderUnit[], lang: LexLang | null): Map<string, Forecast> {
  const key = units.map((u) => u.id).join(' ');
  const { data } = useResource<Loaded[]>(
    async () => {
      if (!lang) return [];
      const out: Loaded[] = [];
      for (const unit of units) {
        try {
          const [work, bundle] = await Promise.all([loadGenericWork(unit.work), loadWorkLexis(unit.work)]);
          if (!bundle) continue;
          out.push({ unit, text: unitText(work, unit), bundle });
        } catch {
          // a missing text or bundle: no forecast for that unit
        }
      }
      return out;
    },
    `course-forecast:${lang ?? '-'}:${key}`,
  );
  const lexemeIds = useMemo(() => {
    if (!data || !lang) return [];
    const ids = new Set<string>();
    for (const l of data) for (const id of lexemeIdsOf(l.text, lang, l.bundle)) ids.add(id);
    return [...ids];
  }, [data, lang]);
  const statuses = useStatuses(lexemeIds);
  return useMemo(() => {
    const out = new Map<string, Forecast>();
    if (!data || !lang) return out;
    for (const l of data) out.set(l.unit.id, forecastText(l.text, lang, l.bundle, statuses));
    return out;
  }, [data, lang, statuses]);
}
