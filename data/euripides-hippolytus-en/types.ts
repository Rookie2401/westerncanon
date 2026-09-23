/**
 * Type definitions for one bundled Greek tragedy work in
 * `data/<playwright>-<slug>-grc|en/`.
 *
 * Generated (do not hand-edit) by the shared drama importer
 * (scripts/import-greek-drama-shared/) via one of
 *   npm run import:aeschylus
 *   npm run import:sophocles
 *   npm run import:euripides
 * and validated by `npm run validate:greek-drama`.
 *
 * Source: Perseus canonical-greekLit TEI XML (see this work's about.json for
 * the exact edition/translator citation).
 *
 * Two-level-shaped like every other generic work in this app, but flat in
 * practice: top-level Divisions are Perseus CARDS (`card-N`, N = the card's
 * first printed line number - Perseus's own ~50-line reading chunks), plus
 * one leading `dramatis-personae` Division when the source carries a cast
 * list. No Division ever has children (Division.children is always []).
 * Passages within a card are one per <sp> (speech), split further at a card
 * boundary or an interrupting stage direction - see about.json's "How it was
 * imported" section for this work's own counts.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** printed line number of this passage's first line (e.g. "1", "96a"); ''
   *  only for the dramatis-personae division's single Passage */
  n: string;
  /** verbatim text. For a speech: the speaker's name (as printed) on its own
   *  first line, then the speech's lines joined with "\n" (grc, verse) or a
   *  single space (en, prose runs joined into one paragraph). A continuation
   *  after a card boundary or an interrupting stage direction repeats the
   *  speaker name followed by " (cont.)" - a disclosed importer convention,
   *  not source text. A stage direction is its own passage, "[bracketed]"
   *  (brackets added by the importer, also disclosed) with no speaker line. */
  text: string;
  /** always null in this corpus */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a lacuna) */
  anomaly?: string;
}

export interface Division {
  /** 'dramatis-personae', or `card-N` (N = the card's first line number) */
  id: string;
  /** the card's first line number as printed, or null for dramatis-personae */
  number: string | null;
  /** "first–last" printed line-number span of this card's own lines, or
   *  null (dramatis-personae, or a card with no numbered line at all) */
  ref: string | null;
  /** the structural subtype in force where the card begins (e.g. "Episode",
   *  "Choral ode", "Strophe", "Antistrophe", "Anapests", "Lyric"), or null;
   *  "Dramatis Personae" (or the source's own heading) for that division */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this corpus */
  editorialTitle: string | null;
  /** always [] */
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
