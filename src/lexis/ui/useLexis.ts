/**
 * Loads a work's Lexis bundle and the reader's live statuses for the lexemes
 * appearing in a set of passages (normally: the passages of the division
 * currently on screen), and records a "read" encounter for those lexemes once
 * the reader has stayed on the division >= 5s (plan §1 "known-word tracking").
 *
 * Deliberately takes `enabled` rather than being called conditionally: React
 * hooks can't be skipped, so callers (GenericReader) always call this hook and
 * pass `enabled={lexisAvailable(work.language) && settings.enabled}` — when
 * false, no bundle is fetched, no vocab keys are subscribed, and no read is
 * recorded.
 */
import { useEffect, useMemo } from 'react';
import type { Passage } from '../../library/types.ts';
import { loadWorkLexis, readingsFor } from '../index.ts';
import { recordRead, useStatuses } from '../vocab.ts';
import { wordTokens } from '../tokenize.ts';
import type { KnownWord, LexLang, WorkLexis } from '../types.ts';
import { useResource } from '../../ui/useResource.ts';

const READ_DWELL_MS = 5000;

export interface UseLexisResult {
  /** undefined = still loading (or disabled); null = no bundle for this work. */
  bundle: WorkLexis | null | undefined;
  /** live status per lexeme id referenced by `passages`. */
  statuses: Map<string, KnownWord>;
}

export function useLexis(
  workId: string,
  divId: string,
  lang: LexLang | null,
  passages: Passage[],
  enabled: boolean,
): UseLexisResult {
  const { data: bundle } = useResource(
    () => (enabled ? loadWorkLexis(workId) : Promise.resolve(null)),
    enabled ? `lexis-work:${workId}` : 'lexis-work:disabled',
  );

  const lexemeIds = useMemo(() => {
    if (!enabled || !lang || !bundle) return [];
    const ids = new Set<string>();
    for (const p of passages) {
      for (const t of wordTokens(p.text, lang)) {
        const top = readingsFor(bundle, t.key, lang)[0];
        if (top) ids.add(top[0]);
      }
    }
    return [...ids];
  }, [enabled, lang, bundle, passages]);

  const statuses = useStatuses(lexemeIds);

  useEffect(() => {
    if (!enabled || !bundle || lexemeIds.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      recordRead(lexemeIds, { workId, divId }).catch(() => {
        // offline storage failure: the next division visit will retry
      });
    }, READ_DWELL_MS);
    return () => window.clearTimeout(timer);
    // lexemeIds is a derived array (new identity each recompute); its content
    // is what matters for the dwell timer, so key on its joined form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, bundle, lexemeIds.join(' '), workId, divId]);

  return { bundle, statuses };
}
