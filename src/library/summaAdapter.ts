/**
 * Thin adapter exposing what the new Library screens need from the Summa
 * without re-importing corpus DATA. Reuses the static `PARTS` table only.
 */
import { PARTS, partById } from '../corpus/corpus.ts';

export interface SummaTopEntry {
  id: string;
  label: string;
  code?: string;
  to: string;
  /** Set on the Supplementum: it is a posthumous compilation, shown set apart. */
  compilation?: boolean;
}

/**
 * The Prooemium entry + the 4 Partes + the Supplementum, as rows for the Work
 * screen — filtered to just the given Work's own parts, since `PARTS` now
 * holds both the Latin and English Summa editions' parts in one flat table
 * (src/corpus/corpus.ts). The Prooemium is Latin-only for now (see
 * corpus.ts's `loadProoemium` doc comment), so it's included only for the
 * Latin work.
 */
export function summaTopLevel(workId: string): SummaTopEntry[] {
  const parts = PARTS.filter((p) => p.workId === workId);
  const lang = parts[0]?.lang ?? 'la';
  return [
    ...(lang === 'la' ? [{ id: 'prooemium', label: 'Proœmium', to: '/prooemium' }] : []),
    ...parts.map((p) => ({
      id: p.id,
      label: p.label,
      code: p.code,
      to: `/part/${p.id}`,
      ...(p.compilation ? { compilation: true } : {}),
    })),
  ];
}

/* --- breadcrumb label helpers ------------------------------------------- */

/** e.g. "Prima Pars" */
export function partLabel(partId: string): string {
  return partById(partId)?.label ?? partId;
}

/** e.g. "Q. 2" */
export function questionLabel(qNum: number | string): string {
  return `Q. ${qNum}`;
}

/** e.g. "A. 3" (or "A." for an unnumbered article, aParam === "u") */
export function articleLabel(aParam: string): string {
  return aParam === 'u' ? 'A.' : `A. ${aParam}`;
}
