/**
 * Type definitions for the bundled De Fide Catholica (English) corpus in
 *   data/boethius-de-fide-catholica-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:boethius  (scripts/import-boethius/index.ts)
 * and validated by
 *   npm run validate:boethius  (scripts/import-boethius/validate.ts)
 *
 * Source: Boethius, "Theological Tractates" / "The Consolation of
 * Philosophy", ed. & trans. H. F. Stewart and E. K. Rand (Loeb Classical
 * Library 74, 1918), digitised by the Perseus Digital Library /
 * OpenGreekAndLatin canonical-latinLit repository (CTS author id
 * stoa0058). See about.json for the full provenance and licence
 * disclosure, and anomalies.json for every irregularity preserved from the
 * source.
 *
 * A flat list of chapter divisions (no nesting): `ch-pr` (preface, only for
 * the tractates that have one) then `ch-1`, `ch-2`, ... - or, where this
 * edition marks no internal chapter divisions at all, a single division
 * `ch-1` holding the whole tractate. See
 * scripts/import-boethius/parseTractateLa.ts / parseTractateEn.ts for the
 * exact, source-verified structure of this particular tractate.
 *
 * Division.ref and Passage.ref are always null: none of these sources
 * carries a page-marker or line-milestone citation scheme this schema
 * could use. Passage.n is always '' (no source carries a printed
 * paragraph number at this level).
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - these sources print no paragraph/line numbers at this level */
  n: string;
  /** verbatim text: prose paragraphs joined with a blank line, or verse lines joined with "\n" - see about.json */
  text: string;
  /** always null - see module doc */
  ref: string | null;
  /** optional note when something irregular was preserved; see anomalies.json for the full log */
  anomaly?: string;
}

export interface Division {
  id: string;
  /** this edition's own division number/label, exactly as printed (never renumbered) */
  number: string | null;
  /** always null - see module doc */
  ref: string | null;
  /** this edition's own heading text where the source prints one, else null */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for any division in this corpus */
  editorialTitle: string | null;
  children: Division[];
  passages: Passage[];
}

export interface GenericWork {
  workId: string;
  language: Lang;
  divisions: Division[];
}

export interface WorkAboutSection {
  heading: string;
  paragraphs: string[];
}

export interface WorkAbout {
  workId: string;
  title: string;
  author: string;
  language: Lang;
  edition?: string;
  editor?: string;
  translator?: string;
  provenance: string;
  license: string;
  sections?: WorkAboutSection[];
}

export interface Anomaly {
  where: string;
  note: string;
}
