/**
 * Type definitions for the bundled Porphyry *Isagoge* corpora in
 * `data/isagoge-grc/` and `data/isagoge-la/`.
 *
 * These files are generated (do not hand-edit) by
 *   npm run import:isagoge-grc   (scripts/import-isagoge-grc/index.ts)
 *   npm run import:isagoge-la    (scripts/import-isagoge-la/index.ts)
 * and validated by
 *   npm run validate:isagoge     (scripts/import-isagoge-shared/validate.ts)
 *
 * The Greek text (ed. Busse 1887) and the Latin translation by Boethius are two
 * INDEPENDENT works. They share the same ordered set of division ids so the two
 * can be lined up 1:1 visually, but neither is derived from the other.
 *
 * IMPORTANT: this file is kept byte-identical with `data/isagoge-la/types.ts`.
 */

export type Lang = 'la' | 'grc';

export interface Passage {
  /** paragraph number as printed in the edition ('1'..'N'); '' if the source paragraph is unnumbered */
  n: string;
  /** verbatim original-language paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** canonical scholarly ref for this passage: grc = "Busse P.L" (page.line of first line); la = null */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. source misspelling) */
  anomaly?: string;
}

export interface Division {
  /**
   * slug, SAME set of ids in both works:
   * 'praefatio','de-genere','de-specie','de-differentia','de-proprio','de-accidente',
   * 'sec-vi'..'sec-xxvi'
   */
  id: string;
  /** 'I'..'XXVI' (roman, as in the Latin edition); null for the preface */
  number: string | null;
  /** canonical span: grc = "Busse P.L–P.L"; la = null */
  ref: string | null;
  /**
   * verbatim heading from THIS work's own source
   *   grc e.g. "Περὶ γένους."
   *   la  e.g. "De genere"
   */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text) - from the shared section table */
  editorialTitle: string | null;
  /** [] for the Isagoge (one level deep) */
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  /** 'isagoge-grc' | 'isagoge-la' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
