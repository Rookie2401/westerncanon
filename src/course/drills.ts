/**
 * Stage 0 drills (docs/COURSE-PLAN.md §1), generated from the pack's core
 * words with a seeded generator so a round is reproducible and testable.
 *
 *   decode   (Greek) a word is shown; pick its romanisation among four
 *   match    a word is shown; pick its meaning among four
 *
 * The hint (the romanisation under the word, or the gloss list) fades after
 * DRILL.hintFadesAfter unaided right answers in a row — support fades from
 * evidence, never from the lesson number — and can always be asked for.
 */
import { DRILL } from './policy.ts';
import type { CoreWord } from './types.ts';

/** mulberry32: small, deterministic, good enough for shuffling drills. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface DrillItem {
  id: string;
  word: CoreWord;
  /** the options shown, in order; `answer` indexes the right one */
  options: string[];
  answer: number;
}

/** Words that can be drilled: with a gloss, and (for decoding) a romanisation. */
function eligible(core: CoreWord[], kind: 'decode' | 'match'): CoreWord[] {
  return core.filter((w) => w.gloss && (kind === 'match' || w.translit));
}

/** Distractors that look like the answer: similar length, same first letter when possible. */
function distractors(pool: string[], answer: string, n: number, rnd: () => number): string[] {
  const others = pool.filter((p) => p !== answer);
  const near = others.filter((p) => Math.abs(p.length - answer.length) <= 2);
  const sameStart = near.filter((p) => p[0]?.toLowerCase() === answer[0]?.toLowerCase());
  const picked: string[] = [];
  for (const list of [sameStart, near, others]) {
    for (const p of shuffle(list, rnd)) {
      if (picked.length >= n) break;
      if (!picked.includes(p)) picked.push(p);
    }
    if (picked.length >= n) break;
  }
  return picked.slice(0, n);
}

export function makeRound(core: CoreWord[], kind: 'decode' | 'match', seed: number, count: number = kind === 'decode' ? DRILL.decodeItems : DRILL.matchItems): DrillItem[] {
  const rnd = seededRandom(seed);
  const words = eligible(core, kind);
  if (words.length < DRILL.options) return [];
  const pool = words.map((w) => (kind === 'decode' ? w.translit! : w.gloss));
  const chosen = shuffle(words, rnd).slice(0, Math.min(count, words.length));
  return chosen.map((word) => {
    const right = kind === 'decode' ? word.translit! : word.gloss;
    const options = shuffle([right, ...distractors(pool, right, DRILL.options - 1, rnd)], rnd);
    return { id: `${kind}:${word.id}`, word, options, answer: options.indexOf(right) };
  });
}

/** Whether the hint is shown by default: not after `hintFadesAfter` unaided right answers in a row. */
export function hintShown(recent: { correct: boolean; hinted: boolean }[]): boolean {
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const a = recent[i]!;
    if (a.correct && !a.hinted) streak++;
    else break;
  }
  return streak < DRILL.hintFadesAfter;
}
