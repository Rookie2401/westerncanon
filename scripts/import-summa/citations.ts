/**
 * Citation helpers. Citations are built from the integer liber/quaestio/articulus
 * fields inside each lemma; the source `<reference>` string is only ever used as
 * a cross-check.
 */

import type { PartCode, PartId } from '../../data/summa/types.ts';

export interface PartMeta {
  liberIndex: number;
  id: PartId;
  code: PartCode;
  /** Latin/neutral title as it appears in `<liber title>`. */
  latinTitle: string;
  shortTitle: string;
}

/** Ordered part metadata, keyed by the source `<liber index>` value (1..4). */
export const PARTS: readonly PartMeta[] = [
  { liberIndex: 1, id: 'prima-pars', code: 'I', latinTitle: 'Prima Pars', shortTitle: 'Prima Pars' },
  { liberIndex: 2, id: 'prima-secundae', code: 'I-II', latinTitle: 'Prima Secundae', shortTitle: 'Prima Secundae' },
  { liberIndex: 3, id: 'secunda-secundae', code: 'II-II', latinTitle: 'Secunda Secundae', shortTitle: 'Secunda Secundae' },
  { liberIndex: 4, id: 'tertia-pars', code: 'III', latinTitle: 'Tertia Pars', shortTitle: 'Tertia Pars' },
];

export function partByLiberIndex(liberIndex: number): PartMeta | undefined {
  return PARTS.find((p) => p.liberIndex === liberIndex);
}

/**
 * Normalize a raw part code as seen in `<reference>` strings
 * (`Ia`, `Ia-IIae`, `IIa-IIae`, `IIa-IIae,`, `IIIa`) to the canonical form.
 * Returns `null` if unrecognized.
 */
export function normalizePartCode(raw: string): PartCode | null {
  const s = raw.trim().replace(/,$/, '');
  switch (s) {
    case 'Ia':
      return 'I';
    case 'Ia-IIae':
      return 'I-II';
    case 'IIa-IIae':
      return 'II-II';
    case 'IIIa':
      return 'III';
    default:
      return null;
  }
}

export function questionCitation(code: PartCode, q: number): string {
  return `${code} q. ${q}`;
}

export function articleCitation(code: PartCode, q: number, a: number | null): string {
  return a == null ? `${code} q. ${q}` : `${code} q. ${q} a. ${a}`;
}

/**
 * Parse the leading part code out of a `<reference>` string, e.g.
 * `"IIa-IIae, q. 128 co."` -> `"II-II"`. Used only for cross-checking.
 */
export function partCodeFromReference(reference: string): PartCode | null {
  const m = /^(Ia-IIae|IIa-IIae|IIIa|Ia)\b,?/.exec(reference.trim());
  return m ? normalizePartCode(m[1]) : null;
}
