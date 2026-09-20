/**
 * Type definitions for the bundled Latin corpus at data/pro-sestio-la/.
 *
 * Generated (do not hand-edit) by
 *   npm run import:pro-sestio-la  (scripts/import-pro-sestio-la/index.ts)
 * and validated by
 *   npm run validate:pro-sestio-la  (scripts/import-pro-sestio-la/validate.ts)
 *
 * Latin text ONLY - no bundled English translation (see about.json's "No
 * English edition bundled" section for why: two independent research passes
 * found no public-domain English translation of this speech that meets this
 * app's two-source policy).
 *
 * Flat, single-tier Division pattern (mirrors data/categoriae-la/): Cicero's
 * *Pro Sestio* is one continuous oration divided only into the numbered
 * sections (§) printed by the source edition - there is no Book/Chapter
 * wrapper level. Division.id = `sec-N` (arabic, matching the source's own
 * section `n`) deliberately does not match this app's Bekker-chapter or
 * chapter-only kindLabel id patterns, so it renders generically as "§ N" -
 * this is intentional.
 *
 * Reference scheme: the source ALSO prints the traditional Roman-numeral
 * "chapter" citation as inline milestones (<milestone unit="chapter" n="N"
 * resp="editor"/>), coarser than its own section numbering. Division.ref for
 * each section is the chapter number active at that section's START - i.e.
 * the nearest PRECEDING chapter milestone in document order - as a plain
 * arabic-numeral string; null if no chapter milestone precedes yet (this
 * happens for sec-1 only: the source's own chapter-1 milestone sits just
 * inside sec-1's own text, not before it). Passage.ref is always null and
 * Passage.n is always "" (no further printed sub-numbering survives).
 */

export type Lang = 'la';

export interface Passage {
  /** always '' for this work (no printed sub-section numbering in the source) */
  n: string;
  /** verbatim Latin paragraph(s) for the section, '\n\n'-joined if the source prints more than one <p>; whitespace collapsed, entities decoded, apparatus criticus removed as documented in anomalies.json */
  text: string;
  /** always null for this work; see Division.ref for the section's own chapter citation */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `sec-N`, 1-based arabic, matching the source's own section numbering */
  id: string;
  /** the section number as a string, e.g. '1'..'147' */
  number: string;
  /** the traditional chapter number (arabic) active at this section's start - the nearest preceding <milestone unit="chapter"> in document order; null if none precedes yet */
  ref: string | null;
  /** always null (this work prints no per-section rubric) */
  sourceHeading: string | null;
  /** always null (no editorial titles are supplied for this work) */
  editorialTitle: string | null;
  /** always [] (flat, one level deep) */
  children: Division[];
  /** exactly 1 Passage per section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'pro-sestio-la' */
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
