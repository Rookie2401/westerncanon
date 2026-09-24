/**
 * The byte-identical `types.ts` written into every `data/shakespeare-<slug>-
 * en/` output directory - mirrors the convention used elsewhere in this repo
 * (see e.g. scripts/import-aristophanes-en/typesTemplate.ts) - one canonical
 * string here rather than hand-duplicated 44 times.
 */
export const TYPES_FILE = `/**
 * Type definitions for one bundled Shakespeare work in
 * \`data/shakespeare-<slug>-en/\`.
 *
 * Generated (do not hand-edit) by scripts/import-shakespeare/index.ts
 * (\`npm run import:shakespeare\`) and validated by
 * \`npm run validate:shakespeare\`.
 *
 * Source: Project Gutenberg eBook #100, "The Complete Works of William
 * Shakespeare" (the Globe/Moby-derived text) - see this work's own
 * about.json for the exact provenance, structure and disclosed anomalies.
 *
 * PLAYS: divisions are \`dramatis-personae\`? (cast list, when the source
 * prints one - absent for Richard II in this edition), then one Division per
 * ACT (id \`act-N\`) or per bare PROLOGUE/EPILOGUE/INDUCTION label the source
 * places at the top level (id = that label, e.g. \`prologue\`). An act/label
 * Division's own \`passages\` hold any content the source prints with no
 * scene heading of its own (most commonly a per-act Chorus); its \`children\`
 * are \`<id>-scene-M\` Divisions, one per printed "SCENE M. <location>."
 * heading, each holding that scene's speeches.
 *
 * SONNETS: one Division \`sonnet-N\` per sonnet, one Passage of (usually) 14
 * lines.
 *
 * THE FIVE SHORTER/NARRATIVE POEMS: one Division per poem, or per the
 * source's own named part/section (e.g. The Passionate Pilgrim's 20
 * numbered parts; The Phoenix and the Turtle's "Threnos"; The Rape of
 * Lucrece's dedication epistle and "The Argument").
 *
 * Every Passage is one speech (speaker's name AS PRINTED, all-caps with its
 * trailing period, on its own first line, then the speech) or, for poems,
 * one Division's full stanza-broken text; a stand-alone stage direction
 * (Enter/Exit/Exeunt/a bracketed "[...]" direction) is its own Passage with
 * no speaker line. Passage.n is always '' and ref is always null - the
 * Globe text prints no citable line numbers (Venus and Adonis's own right-
 * margin line-COUNT numbers are typographic apparatus, stripped from the
 * reading text - see about.json).
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' in this corpus - the source prints no citable line numbers */
  n: string;
  /** verbatim text: for a speech, the speaker's name AS PRINTED (all caps,
   *  trailing period) on its own first line, then the speech - verse kept
   *  one printed line per "\\n", prose reflowed to a single paragraph (see
   *  about.json for the verse/prose detection rule and its limits). A
   *  stand-alone stage direction carries no speaker-name line. A poem's
   *  Passage joins each stanza's lines with "\\n" and separates stanzas with
   *  a blank line ("\\n\\n"), exactly as printed. */
  text: string;
  /** always null in this corpus */
  ref: string | null;
}

export interface Division {
  /** 'dramatis-personae', 'act-N', a bare top-level label ('prologue' /
   *  'epilogue' / 'induction'), '<id>-scene-M', 'sonnet-N', 'part-N', or a
   *  poem-specific id ('dedication', 'argument', 'text', 'threnos',
   *  'epigraph') - see this work's own work.json */
  id: string;
  /** the act/scene/sonnet/part number as printed, arabic; null otherwise */
  number: string | null;
  /** always null in this corpus */
  ref: string | null;
  /** the heading exactly as printed ("ACT I", "SCENE I. Elsinore...",
   *  "Dramatis Personæ", a sonnet's own number, a Passionate Pilgrim part's
   *  roman numeral, "Threnos", "The Argument", ...); null where the source
   *  prints no heading at that point (see about.json) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for any division in this corpus */
  editorialTitle: string | null;
  /** '<id>-scene-M' children for an act/label Division that has printed
   *  scenes; [] everywhere else */
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
