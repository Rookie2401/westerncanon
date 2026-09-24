/**
 * Compact on-disk encoding of a WorkLexis bundle (docs/LEXIS-PLAN.md §2).
 * A v1 bundle repeats every lexeme id and morph string per reading; v2
 * interns them (`lx`, `mo`) and stores each reading as three numbers
 * [lexeme index, morph index, confidence × 100]. Same information, ~50 %
 * smaller on disk. The loader decodes v2 back into the in-memory WorkLexis
 * shape; scripts/lexis/lib.mjs mirrors both directions for the build side.
 */
import type { CoreLexeme, LexLang, Reading, WorkLexis } from './types.ts';

export interface WorkLexisCompact {
  v: 2;
  workId: string;
  lang: LexLang;
  tokens: number;
  recognized: number;
  analysis: string;
  lexemes: Record<string, CoreLexeme>;
  /** interned lexeme ids, referenced by index */
  lx: string[];
  /** interned morph tag strings, referenced by index */
  mo: string[];
  /** loose key -> flat triples [lexIdx, morphIdx, conf*100] */
  forms: Record<string, number[]>;
}

export function isCompact(x: unknown): x is WorkLexisCompact {
  return typeof x === 'object' && x !== null && (x as { v?: unknown }).v === 2 && Array.isArray((x as { lx?: unknown }).lx);
}

export function decodeWorkLexis(c: WorkLexisCompact): WorkLexis {
  const forms: Record<string, Reading[]> = {};
  for (const key of Object.keys(c.forms)) {
    const flat = c.forms[key]!;
    const out: Reading[] = [];
    for (let i = 0; i + 2 < flat.length; i += 3) {
      const conf = flat[i + 2]!;
      const r: Reading = conf === 100 ? [c.lx[flat[i]!]!, c.mo[flat[i + 1]!]!] : [c.lx[flat[i]!]!, c.mo[flat[i + 1]!]!, conf / 100];
      out.push(r);
    }
    forms[key] = out;
  }
  return { workId: c.workId, lang: c.lang, tokens: c.tokens, recognized: c.recognized, analysis: c.analysis, forms, lexemes: c.lexemes };
}

export function encodeWorkLexis(b: WorkLexis): WorkLexisCompact {
  const lx: string[] = [];
  const mo: string[] = [];
  const lxIdx = new Map<string, number>();
  const moIdx = new Map<string, number>();
  const intern = (list: string[], idx: Map<string, number>, s: string): number => {
    let i = idx.get(s);
    if (i === undefined) {
      i = list.length;
      list.push(s);
      idx.set(s, i);
    }
    return i;
  };
  const forms: Record<string, number[]> = {};
  for (const key of Object.keys(b.forms)) {
    const flat: number[] = [];
    for (const r of b.forms[key]!) {
      flat.push(intern(lx, lxIdx, r[0]), intern(mo, moIdx, r[1]), Math.round((r[2] ?? 1) * 100));
    }
    forms[key] = flat;
  }
  return { v: 2, workId: b.workId, lang: b.lang, tokens: b.tokens, recognized: b.recognized, analysis: b.analysis, lexemes: b.lexemes, lx, mo, forms };
}
