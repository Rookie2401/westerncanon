/**
 * Type definitions for the bundled Latin text of Cicero's *De Oratore*
 * (data/de-oratore-la/).
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-oratore-la   (scripts/import-de-oratore-la/index.ts)
 * and validated by
 *   npm run validate:de-oratore-la (scripts/import-de-oratore-la/validate.ts)
 *
 * Source: Perseus / Open Greek and Latin canonical-latinLit TEI XML
 * (urn:cts:latinLit:phi0474.phi037.perseus-lat2), M. Tulli Ciceronis
 * Rhetorica, Vol. 1, ed. Augustus Samuel Wilkins (Oxford: Clarendon Press,
 * 1902).
 *
 * Structural notes:
 *   - divisions are two levels: 3 Book divisions (`book-1`..`book-3`,
 *     Division.number = the plain arabic book number), each with numbered
 *     Section children (`book-N-sec-M`, Division.number = the plain arabic
 *     section number, restarting at 1 in each book, exactly as printed).
 *   - each Section leaf carries exactly one Passage (Passage.n is always
 *     the empty string; a section's <p>s, if more than one, are joined
 *     with "\n\n").
 *   - this edition's XML carries NO <milestone unit="chapter"/> markers at
 *     all (confirmed by direct inspection - unlike its Brutus/Orator
 *     siblings in the same phi0474 corpus, which do carry them). There is
 *     therefore no source citation finer than the book/section numbering
 *     already carried by the id/number fields: every Division.ref and
 *     Passage.ref is null throughout. See anomalies.json.
 *   - no known public-domain English translation of the whole work is
 *     bundled; this edition is Latin-only (see about.json).
 */

export type Lang = 'la' | 'grc' | 'en';

export interface Passage {
  /** paragraph number as printed; '' throughout (no printed sub-numbers within a section) */
  n: string;
  /** verbatim Latin paragraph(s), whitespace collapsed, entities decoded */
  text: string;
  /** canonical scholarly sub-reference; null throughout for this work (see module doc) */
  ref: string | null;
  /** optional note when something irregular was preserved (editorial deletion span, lacuna mark, …) */
  anomaly?: string;
}

export interface Division {
  /** 'book-1'..'book-3', or 'book-N-sec-M' for a section leaf */
  id: string;
  /** plain arabic book number ('1'..'3'), or plain arabic section number within its book */
  number: string | null;
  /** canonical citation span; null throughout for this work (see module doc) */
  ref: string | null;
  /** verbatim printed Latin rubric for a Book division ("LIBER PRIMVS" etc.); null for a section leaf */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text); null throughout (no editorial titles assigned) */
  editorialTitle: string | null;
  /** a Book division's Section children; [] for a section leaf */
  children: Division[];
  /** [] for a Book division (all text lives on its Section children); one Passage for a section leaf */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-oratore-la' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
