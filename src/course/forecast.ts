/**
 * Difficulty forecast for THIS reader (docs/COURSE-PLAN.md §3): the share of a
 * unit's running words whose lemma the reader is estimated to know. Needs the
 * unit's text and its work's Lexis bundle, so it is computed on demand for a
 * few units (the next ones on the path, the unit being read), never for a
 * whole ladder. A labelled estimate, like everything built on familiarity.
 */
import { readingsFor } from '../lexis/index.ts';
import { wordTokens } from '../lexis/tokenize.ts';
import type { KnownWord, LexLang, WorkLexis } from '../lexis/types.ts';
import type { Division, GenericWork } from '../library/types.ts';
import { flattenDivisions } from '../library/genericCorpus.ts';
import { familiarityOf } from './familiarity.ts';
import { FORECAST } from './policy.ts';
import type { Familiarity, LadderUnit } from './types.ts';

export interface Forecast {
  tokens: number;
  /** running words per familiarity class (names count as known) */
  classes: Record<Familiarity, number>;
  /** unrecognised running words (never known) */
  unrec: number;
  /** weighted share, 0..1 */
  coverage: number;
}

const EMPTY: Record<Familiarity, number> = { known: 0, 'likely-familiar': 0, met: 0, new: 0 };

/** The text of a unit: the passages of its stops (a consolidated group's children included). */
export function unitText(work: GenericWork, unit: LadderUnit): string {
  const byId = new Map<string, Division>();
  for (const d of flattenDivisions(work)) byId.set(d.id, d);
  const parts: string[] = [];
  for (const id of unit.divs) {
    const d = byId.get(id);
    if (!d) continue;
    const passages = d.children.length ? d.children.flatMap((c) => c.passages) : d.passages;
    for (const p of passages) parts.push(p.text);
  }
  return parts.join('\n');
}

export function forecastText(text: string, lang: LexLang, bundle: WorkLexis, statuses: Map<string, KnownWord>): Forecast {
  const classes = { ...EMPTY };
  let tokens = 0;
  let unrec = 0;
  for (const t of wordTokens(text, lang)) {
    tokens++;
    const top = readingsFor(bundle, t.key, lang)[0];
    if (!top) {
      unrec++;
      continue;
    }
    const id = top[0];
    const lx = bundle.lexemes[id];
    if (lx && lx.pos === 'name') {
      classes.known++;
      continue;
    }
    classes[familiarityOf(statuses.get(id))]++;
  }
  const weighted = classes.known * FORECAST.known + classes['likely-familiar'] * FORECAST.likelyFamiliar + classes.met * FORECAST.met;
  return { tokens, classes, unrec, coverage: tokens ? weighted / tokens : 0 };
}

/** The distinct lexeme ids of a text (to subscribe to their statuses). */
export function lexemeIdsOf(text: string, lang: LexLang, bundle: WorkLexis): string[] {
  const ids = new Set<string>();
  for (const t of wordTokens(text, lang)) {
    const top = readingsFor(bundle, t.key, lang)[0];
    if (top) ids.add(top[0]);
  }
  return [...ids];
}

export function forecastWords(f: Forecast): string {
  const pct = Math.round(f.coverage * 100);
  if (f.tokens === 0) return 'no words to estimate';
  if (pct >= 95) return `about ${pct}% of its words look familiar to you: comfortable`;
  if (pct >= 88) return `about ${pct}% of its words look familiar to you: a productive challenge`;
  if (pct >= 75) return `about ${pct}% of its words look familiar to you: hard going`;
  return `about ${pct}% of its words look familiar to you: expect to look most words up`;
}
