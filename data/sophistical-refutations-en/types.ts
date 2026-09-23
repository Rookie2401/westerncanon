/**
 * Type definitions for the bundled English On Sophistical Refutations corpus
 * in data/sophistical-refutations-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:sophistical-refutations-en  (scripts/import-sophistical-refutations-en/index.ts)
 * and validated by
 *   npm run validate:sophistical-refutations-en  (scripts/import-sophistical-refutations-en/validate.ts)
 *
 * Source: the MIT Internet Classics Archive (classics.mit.edu/Aristotle/
 * sophist_refut.html), reproducing W. A. Pickard-Cambridge's Oxford
 * translation of Aristotle's On Sophistical Refutations, first published
 * 1928 (The Works of Aristotle, Vol. I, ed. W. D. Ross). MIT's own page
 * carries an explicit "Translated by W. A. Pickard-Cambridge" credit line
 * (verified by direct inspection of every fetched page - see about.json's
 * "Digital source" section for the exact quoted text).
 *
 * ONE-LEVEL tree, chapters only (34 of them) — this is traditionally a
 * SINGLE book (unlike Topics, its companion work in the Organon, which MIT
 * itself divides into 8 Book pages), so per this app's existing convention
 * for a single-book Aristotle treatise (see data/categoriae-en/types.ts,
 * flat `ch-N`), there is no Book level at all: `divisions` is simply the 34
 * chapters directly, each a leaf (children: [], one Passage). MIT itself
 * splits the HTML across 3 "Section" sub-pages purely for file size (its own
 * chapter numbering - MIT's own "Part N" labels - runs continuously 1..34
 * across all three, with no restart and no relation to MIT's "Section"
 * grouping, which is discarded as pagination-only, not a structural level
 * this schema preserves - see about.json).
 *
 * Id scheme: Chapter = `ch-N`, 1-based plain arabic numeral, matching MIT's
 * own continuous "Part N" chapter numbering (traditionally 34 chapters).
 *
 * Division.ref is ALWAYS null: MIT's Internet Classics Archive pages print
 * NO Bekker page/column/line markers anywhere (verified directly - the only
 * inline anchors present are silent, invisible `<A NAME="n">` deep-link
 * targets, sequentially numbered across an entire "Section" sub-page with no
 * relation to the Bekker apparatus, and are discarded as transport
 * scaffolding, not read as a reference scheme). This is a genuine limitation
 * of this source, disclosed in about.json, not fabricated around.
 *
 * Each Chapter carries exactly ONE Passage: every paragraph MIT's own
 * `<BR><BR>` paragraph-break markup delimits within that "Part", in document
 * order, joined with "\n\n". Passage.n is '' throughout (MIT prints no
 * paragraph numbering of its own); Passage.ref is always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' — MIT prints no paragraph numbering */
  n: string;
  /** verbatim English paragraph, whitespace collapsed to single spaces */
  text: string;
  /** always null — MIT's Internet Classics Archive prints no Bekker (or any other) per-passage reference marker */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `ch-N`, 1-based, 1..34 */
  id: string;
  /** arabic string '1'..'34' */
  number: string | null;
  /** always null — MIT prints no Bekker (or any other) reference marker */
  ref: string | null;
  /** always null — the source prints no chapter rubric beyond the bare "Part N" label already captured by `number` */
  sourceHeading: string | null;
  /** always null — no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** always [] — this is a single-level, chapters-only tree */
  children: Division[];
  /** exactly [one Passage] */
  passages: Passage[];
}

export interface GenericWork {
  /** 'sophistical-refutations-en' */
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
