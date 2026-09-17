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

export type Lang = 'la' | 'grc' | 'en';
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

/**
 * A diagram/illustration marker bundled alongside a passage (e.g. a Euclid
 * proposition's geometric figure). Optional and additive: every existing
 * Passage omits it.
 *
 * Every `<figure>` in the source critical edition is real structural
 * information and must be preserved even when no image can legitimately be
 * shown. Two shapes are valid:
 *   - an actual image: `image` (+ `alt`) is a same-origin path served from
 *     this work's `data/<workId>/` output (copied into public/ like
 *     work.json), never a remote URL, so the reader stays fully offline.
 *     `source` must name the exact edition/page/figure-number this image
 *     traces to — never a reconstructed or invented diagram.
 *   - an honest marker with no image: `image`/`alt` are omitted and `note`
 *     carries a quiet, honest sentence (e.g. "A diagram appears here in the
 *     printed edition; not yet available in this build."). `source` still
 *     names the exact edition/figure this marks. Used when the source
 *     figure exists (e.g. the Euclid/Archimedes TEI `<figure/>` tags,
 *     which only point to dead heml.mta.ca URLs) but no legitimately-sourced
 *     replacement image was found — never fabricate one.
 * At least one of `image` or `note` must be present; an importer/validator
 * should enforce this, not the type system.
 */
export interface PassageFigure {
  image?: string;
  /** Pixel dimensions of `image`, so the reader can reserve its aspect ratio
   *  before the (mask-only, intrinsically sizeless) image loads. Required
   *  whenever `image` is set. */
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  source: string;
  note?: string;
}

export interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
  figure?: PassageFigure;
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
