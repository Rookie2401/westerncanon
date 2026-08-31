/**
 * Universal "Library" model — two levels ABOVE the existing Summa hierarchy:
 *   Author -> Work -> (Summa) Part/Question/Article   [profile 'summa']
 *   Author -> Work -> Division                        [profile 'generic']
 *
 * This file is the single source of truth for the shared shapes. The generic
 * content types (Passage/Division/GenericWork/WorkAbout) mirror EXACTLY the JSON
 * a parallel importer emits to `data/isagoge-grc/work.json` and
 * `data/isagoge-la/work.json` (and the matching `about.json`).
 */

export type Lang = 'la' | 'grc';
export type WorkProfile = 'summa' | 'generic';

export interface Author {
  id: string;
  displayName: string;
  sortYear: number;
  datesLabel?: string;
}

export interface WorkSource {
  edition?: string;
  editor?: string;
  translator?: string;
  provenance: string;
  license: string;
}

export interface Work {
  id: string;
  authorId: string;
  /** Displayed title, in the work's own language, e.g. "Κατηγορίαι". */
  title: string;
  /**
   * Conventional English name, shown as a subtitle wherever `title` is not
   * English (Work screen `<h1>` sub-line). Omitted when `title` is already the
   * conventional English name.
   */
  commonTitle?: string;
  /**
   * Work-family name (conventional English), used by the Library to collapse an
   * author's multiple editions of the same text under one dropdown. Editions
   * that share a `group` under the same author are grouped; a lone member
   * renders as a plain link.
   */
  group?: string;
  language: Lang;
  citationScheme: string;
  profile: WorkProfile;
  source: WorkSource;
  /** Library list meta line, e.g. "Greek · Busse". */
  meta: string;
}

/* --- generic-work content (importer JSON schema) --------------------------- */

export interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
}

export interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
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
  /** Prose "About the text" body, rendered on /work/:workId/about. */
  sections?: WorkAboutSection[];
}
