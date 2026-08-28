/**
 * Type definitions for the bundled Summa Theologiae corpus in `data/summa/`.
 *
 * These files are generated (do not hand-edit) by `npm run import:summa`
 * (scripts/import-summa/index.ts) from the source XML and validated by
 * `npm run validate:summa`. The app imports from `data/summa/*.json` only;
 * it never fetches anything at runtime.
 *
 * Builder 2 may re-export these interfaces from `src/types/`.
 */

/** Canonical part code as used in citations. */
export type PartCode = 'I' | 'I-II' | 'II-II' | 'III';

/** Canonical part id (slug). */
export type PartId = 'prima-pars' | 'prima-secundae' | 'secunda-secundae' | 'tertia-pars';

/** A single objection (`<type>arg</type>` lemma). */
export interface Objection {
  /** 1-based, from the source `<index>`. */
  number: number;
  /** Full Latin text, entities decoded, whitespace collapsed. */
  text: string;
}

/** A single "sed contra" segment (`<type>sc</type>` lemma). Usually one per article, occasionally more. */
export interface SedContra {
  /** 1-based, from the source `<index>`. */
  number: number;
  text: string;
}

/** A reply to an objection (`<type>ad</type>` lemma). */
export interface Reply {
  /**
   * The objection number this reply addresses, or `null` for a single combined
   * reply that addresses all objections at once (source reference `... ad arg.`).
   */
  objectionNumber: number | null;
  text: string;
}

export interface Article {
  /** Article number within the question, or `null` for the rare unnumbered single-article question. */
  number: number | null;
  /** e.g. `"I q. 2 a. 3"`, or `"I q. 71"` for an unnumbered-article question. */
  citation: string;
  /**
   * The "utrum ..." line, parsed from the question's prooemium enumeration.
   * `null` when the enumeration could not be parsed or did not line up with the
   * article count (never fabricated).
   */
  title: string | null;
  objections: Objection[];
  sedContra: SedContra[];
  /** The "respondeo" body (`<type>co</type>`), or `null` when the source has none. */
  respondeo: string | null;
  replies: Reply[];
}

export interface Question {
  /** Question number within the part. Not necessarily contiguous (source omits a few). */
  number: number;
  /** e.g. `"I q. 2"`. */
  citation: string;
  /** No Latin quaestio title exists in the source; always `null` for now. */
  title: string | null;
  /** The question-level prooemium Latin (full), or `null`. */
  prooemium: string | null;
  articles: Article[];
}

export interface Part {
  id: PartId;
  code: PartCode;
  /** Latin/neutral part name from the source `<liber title>` attribute. */
  latinTitle: string;
  /** Short human label, e.g. `"Prima Pars"`. */
  shortTitle: string;
  /** Part-level prooemium (only Tertia Pars has one in this source), else `null`. */
  prooemium: string | null;
  questions: Question[];
}

/** Work-level prooemium, emitted as `data/summa/prooemium.json`. */
export interface Prooemium {
  citation: string;
  text: string;
}

export interface PartManifest {
  id: PartId;
  code: PartCode;
  latinTitle: string;
  shortTitle: string;
  questionCount: number;
  articleCount: number;
}

/** Light manifest, emitted as `data/summa/index.json`. */
export interface SummaIndex {
  generatedAt: string;
  sourceUrl: string;
  sourceCommit: string | null;
  license: string;
  parts: PartManifest[];
}

/**
 * One record per article, emitted as `data/summa/search-index.json`.
 *
 * `text` is the concatenated, lowercased, diacritic-folded Latin of the whole
 * article (title + objections + sed contra + respondeo + replies) for fast
 * substring / token matching. Diacritic folding expands ligatures
 * (`œ`->`oe`, `æ`->`ae`) and strips combining accents so `"poena"` matches
 * `"pœna"`. Because folding changes string length, `text` offsets do NOT line
 * up with the original; use `snippet` for a quick preview, or load the full
 * article from the corresponding `part-*.json` (by `citation`) to build a
 * precise original-case snippet around a hit.
 */
export interface SearchRecord {
  citation: string;
  /** The article title if known, else `null`. */
  articleTitle: string | null;
  partCode: PartCode;
  /** Question number. */
  q: number;
  /** Article number, or `null` for an unnumbered-article question. */
  a: number | null;
  /** Folded, lowercased searchable text. */
  text: string;
  /** Short original-case preview (~240 chars) for result lists. */
  snippet: string;
}
