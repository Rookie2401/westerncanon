/**
 * Structural classification for Principia page-scan headings/paragraphs.
 * Vocabulary and quirks below were catalogued by direct inspection of every
 * fetched raw page (see scripts/import-newton/diagnose.ts) before this table
 * was written - nothing here is guessed.
 */

export type StructKind =
  | 'lemma'
  | 'prop'
  | 'def'
  | 'law'
  | 'corol'
  | 'rule'
  | 'phaenomenon'
  | 'hypoth'
  | 'hypotheses-group'
  | 'scholium-like';

export interface StructMatch {
  kind: StructKind;
  /** roman numeral as printed, or null for an unnumbered item (e.g. a lone "Hypothesis.") */
  roman: string | null;
}

/** Lenient roman numeral -> arabic (handles "IIII" as well as "IV"). */
export function romanToArabic(roman: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  const s = roman.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const cur = VALUES[s[i]!];
    const next = VALUES[s[i + 1] ?? ''];
    if (cur === undefined) return NaN;
    if (next !== undefined && cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

const ROMAN = '[IVXLCDM]+';

/** Verbatim running-title / page-furniture lines, gathered by direct inspection (never Newton's substantive text). */
export const FURNITURE_EXACT = new Set<string>([
  'DE', 'MOTU CORPORUM', 'Liber PRIMUS', 'Liber SECUNDUS', 'LIBER TERTIUS', 'Mundi Systemate',
  'PHILOSOPHIÆ', 'NATURALIS', 'Principia', 'MATHEMATICA.', 'MATHEMATICA',
  'PRÆFATIO', 'AD', 'LECTOREM.', 'LECTOREM',
  'IN', 'VIRI PRÆSTANTISSIMI', 'D. ISAACI NEWTONI', 'OPUS HOCCE', 'MATHEMATICO PHYSICUM',
  'FINIS.', 'FINIS',
  'BOOK I.', 'BOOK II.', 'BOOK III.', 'THE', 'MATHEMATICAL PRINCIPLES', 'NATURAL PHILOSOPHY.',
  'DEDICATION.', 'TEACHERS OF THE NORMAL SCHOOL', 'OF THE STATE OF NEW-YORK.',
  'THE PRINCIPIA.', "THE AUTHOR'S PREFACE",
  'END OF THE MATHEMATICAL PRINCIPLES.',
  'PROPOSITIONS', 'RULES OF REASONING IN PHILOSOPHY.', 'PHÆNOMENA, OR APPEARANCES.',
  'AXIOMATA', 'SIVE', 'LEGES MOTUS', 'AXIOMS, OR LAWS OF MOTION.',
  'Deﬁnitiones.', 'DEFINITIONS.',
]);

export function isFurniture(line: string): boolean {
  return FURNITURE_EXACT.has(line.trim());
}

/** Classifies a CENTERED heading line. Returns null when it is not a recognised structural marker (i.e. it is either furniture or genuine content - see classify.ts callers). */
export function classifyHeading(lineRaw: string): StructMatch | null {
  const line = lineRaw.trim();
  {
    const m = new RegExp(`^LEM(?:MA)?\\.?\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'lemma', roman: m[1]! };
  }
  {
    const m = new RegExp(`^(?:Pro\\.?|Prop\\.?|PROPOSITION)\\s+(${ROMAN})\\.\\s*(?:Theor(?:ema|\\.)?|Prob(?:lema|\\.)?|THEOREM|PROBLEM)\\s+${ROMAN}\\.?$`, 'i').exec(line);
    if (m) return { kind: 'prop', roman: m[1]! };
  }
  {
    const m = new RegExp(`^(?:Def\\.?|DEFINITION)\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'def', roman: m[1]! };
  }
  {
    const m = new RegExp(`^(?:Lex\\.?|LAW)\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'law', roman: m[1]! };
  }
  {
    const m = new RegExp(`^(?:Corol(?:\\.|larium)?|COROLLARY)\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'corol', roman: m[1]! };
  }
  {
    const m = new RegExp(`^RULE\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'rule', roman: m[1]! };
  }
  {
    const m = new RegExp(`^PH[ÆAE]NOMEN(?:ON|A)\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'phaenomenon', roman: m[1]! };
  }
  {
    const m = new RegExp(`^HYPOTHESIS\\s+(${ROMAN})\\.?$`, 'i').exec(line);
    if (m) return { kind: 'hypoth', roman: m[1]! };
  }
  if (/^HYPOTHESES\.?$/i.test(line)) return { kind: 'hypotheses-group', roman: null };
  if (/^(?:Scholium(?:\s+Generale)?|GENERAL\s+SCHOLIUM|Schol\.?|SCHOLIUM|Idem\s+aliter\.?|example\.?|Exemplum\.?)\.?$/i.test(line)) {
    return { kind: 'scholium-like', roman: null };
  }
  // Unnumbered ad-hoc structural asides seen exactly once each in this corpus
  // (Book II Sect. IX's "Hypothesis." before Prop. LI; Book II Sect. V's
  // "Definitio Fluidi." before Prop. XIX): real structural items, but with no
  // roman numeral of their own.
  if (/^Hypothesis\.?$/i.test(line)) return { kind: 'hypoth', roman: null };
  if (/^Definitio\b.*\.?$/i.test(line)) return { kind: 'def', roman: null };
  return null;
}

export interface InlineMatch {
  /** 'corol' -> new Passage in the current Division; 'hypoth' -> new Division (Latin Book III paragraph-initial "Hypoth. N."); 'case' -> no boundary at all */
  action: 'corol' | 'hypoth' | 'case';
  roman: string | null;
}

/** Classifies the FIRST words of a content paragraph for an inline (non-centered) structural marker. */
export function classifyParagraphStart(text: string): InlineMatch | null {
  {
    const m = /^Cor(?:\.|ol\.?|ollarium\.?)\s+([IVXLCDM0-9]+)\.?\s/i.exec(text);
    if (m) return { action: 'corol', roman: m[1]! };
  }
  {
    const m = /^Hypoth\.?\s+([IVXLCDM]+)\.?\s/i.exec(text);
    if (m) return { action: 'hypoth', roman: m[1]! };
  }
  {
    const m = /^Cas\.?\s+([IVXLCDM0-9]+)\.?\s/i.exec(text);
    if (m) return { action: 'case', roman: m[1]! };
  }
  return null;
}
