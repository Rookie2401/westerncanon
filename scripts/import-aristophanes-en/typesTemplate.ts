/**
 * The byte-identical `types.ts` written into every `data/aristophanes-<slug>-
 * en/` output directory - mirrors the convention used for this app's other
 * generic-work corpora (see e.g. scripts/import-greek-drama-shared/
 * typesTemplate.ts) - one canonical string here rather than hand-duplicated
 * 11 times.
 */
export const TYPES_FILE = `/**
 * Type definitions for one bundled Aristophanes comedy in
 * \`data/aristophanes-<slug>-en/\`.
 *
 * Generated (do not hand-edit) by scripts/import-aristophanes-en/index.ts
 * (\`npm run import:aristophanes-en\`) and validated by
 * \`npm run validate:aristophanes-en\`.
 *
 * Source: the anonymous 1912 Athenian Society translation ("Aristophanes:
 * The Eleven Comedies", London: privately printed for the Athenian Society,
 * 1912), as transcribed on English Wikisource - see this work's own
 * about.json for the exact provenance, technique and disclosed gaps.
 *
 * This translation is PROSE with no printed line numbers, so - unlike this
 * app's Perseus-sourced Greek tragedy corpus - there is no card/line
 * division to align to. Every work here has exactly one or two top-level
 * Divisions: an optional \`dramatis-personae\` (when the source prints a cast
 * list) followed by a single flat \`text\` division, whose Passages are one
 * per speech, in document order. Division.children is always [].
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' in this corpus - the source prints no line numbers */
  n: string;
  /** verbatim text: for a speech, the speaker's name AS PRINTED on its own
   *  first line, then the speech as a single prose paragraph; for a stand-
   *  alone stage direction (e.g. a "SCENE:" line), the direction alone,
   *  "[bracketed]" (brackets added by the importer, disclosed in about.json),
   *  with no speaker-name line. A parenthetical stage direction printed
   *  inline within or at the head of a speech is likewise converted from
   *  "(...)" to "[...]" in place, not split into its own Passage. Each
   *  translator's footnote whose marker fell within this passage is kept
   *  verbatim as a trailing "[Note N: ...]" line (one per footnote). */
  text: string;
  /** always null in this corpus */
  ref: string | null;
}

export interface Division {
  /** 'dramatis-personae', or 'text' for the single play-text division */
  id: string;
  /** always null in this corpus */
  number: string | null;
  /** always null in this corpus */
  ref: string | null;
  /** "Dramatis Personae" for that division; null for 'text' */
  sourceHeading: string | null;
  /** "Text" for the 'text' division; null for 'dramatis-personae' */
  editorialTitle: string | null;
  /** always [] - both divisions are flat */
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
`;
