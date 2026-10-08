/**
 * Shared hooks of the course screens: the chosen language (remembered in
 * localStorage), the ladder and evidence of that language, the path view.
 */
import { useCallback, useEffect, useState } from 'react';
import { EDITION } from '../../library/edition.ts';
import { workById } from '../../library/registry.ts';
import { getLast } from '../../state/storage.ts';
import type { LexLang } from '../../lexis/types.ts';
import { useResource } from '../../ui/useResource.ts';
import { loadEvidence, useEvidenceVersion } from '../evidence.ts';
import type { Evidence } from '../evidence.ts';
import { COURSE_LANGS, loadLadder, loadStage0 } from '../index.ts';
import { pathView, stage0StepsFor } from '../path.ts';
import type { PathView } from '../path.ts';
import type { CourseLadder, Stage0Pack } from '../types.ts';
import { useStatusesVersion } from '../../lexis/vocab.ts';

export const LANG_NAME: Record<LexLang, string> = { grc: 'Greek', la: 'Latin', it: 'Italian' };
const KEY = 'course:lang';

function isLexLang(x: unknown): x is LexLang {
  return x === 'grc' || x === 'la' || x === 'it';
}

/** The language the course screens show: remembered, else the last-read work's, else Greek. */
export function useCourseLang(): [LexLang, (l: LexLang) => void] {
  const [lang, setLangState] = useState<LexLang>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (isLexLang(stored)) return stored;
    } catch {
      /* ignore */
    }
    const last = getLast();
    const w = last ? workById(last.workId) : undefined;
    return w && isLexLang(w.language) ? w.language : 'grc';
  });
  const setLang = useCallback((l: LexLang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  return [lang, setLang];
}

export function courseLangs(): LexLang[] {
  return EDITION === 'en' ? [] : [...COURSE_LANGS];
}

export function useLadder(lang: LexLang | null) {
  return useResource<CourseLadder | null>(() => (lang ? loadLadder(lang) : Promise.resolve(null)), `course-ladder:${lang ?? '-'}`);
}

export function useStage0(lang: LexLang | null) {
  return useResource<Stage0Pack | null>(() => (lang ? loadStage0(lang) : Promise.resolve(null)), `course-stage0:${lang ?? '-'}`);
}

/** The reader's evidence, re-read whenever an event or a word row changes. */
export function useEvidence(): Evidence | undefined {
  const ev = useEvidenceVersion();
  const sv = useStatusesVersion();
  const [data, setData] = useState<Evidence>();
  useEffect(() => {
    let live = true;
    void loadEvidence().then((e) => {
      if (live) setData(e);
    });
    return () => {
      live = false;
    };
  }, [ev, sv]);
  return data;
}

export function usePathView(lang: LexLang | null): { ladder: CourseLadder | null | undefined; view: PathView | null; evidence: Evidence | undefined; loading: boolean } {
  const { data: ladder, loading } = useLadder(lang);
  const evidence = useEvidence();
  const view = ladder && evidence && lang ? pathView(ladder, evidence, stage0StepsFor(lang)) : null;
  return { ladder, view, evidence, loading };
}
