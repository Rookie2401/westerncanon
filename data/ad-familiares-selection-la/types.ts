/**
 * Type definitions for the bundled Epistulae ad Familiares (Selection) corpus in
 *   data/ad-familiares-selection-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:ad-familiares-selection-la  (scripts/import-ad-familiares-selection-la/index.ts)
 * and validated by
 *   npm run validate:ad-familiares-selection-la  (scripts/import-ad-familiares-selection-la/validate.ts)
 *
 * Source: Perseus / OpenGreekAndLatin canonical-latinLit TEI XML, CTS work
 * urn:cts:latinLit:phi0474.phi056 (textgroup phi0474, M. Tullius Cicero). Latin witness perseus-lat1 (ed. Purser).
 *
 * THIS IS A CURATED SELECTION, NOT THE FULL COLLECTION. Only the specific
 * letters chosen by the app's owner are bundled - see about.json's "Known
 * gaps & anomalies" section for the exact list and for what is NOT included.
 *
 * Flat, deliberately simple division scheme (unlike this app's other nested
 * Cicero works): every SELECTED LETTER is exactly one top-level Division,
 * with no book-level wrapping container. A Division has no children of its
 * own ([] always) - this is a curated subset, not a full nested book/letter
 * tree.
 *
 * Id scheme: `letter-<book>-<letter>` where <book> is the traditional book
 * number (arabic) and <letter> is the traditional letter number within that
 * book, lower-cased when it carries a manuscript-tradition letter suffix
 * (e.g. `letter-12-1`, `letter-12-18a`). Division.number is the matching
 * dotted citation as a STRING, e.g. "12.1", "12.18a" - deliberately not a
 * plain arabic numeral, so it falls through this app's kindLabel() book/
 * chapter/speech/actio regexes and renders as "§ 12.18a"; this is intended.
 * Division.ref is always null (no finer citation exists below letter-level
 * here). Division.sourceHeading captures the source's own inline place/date/
 * addressee heading line (the Latin `<label rend="opener">` or English
 * `<opener>`) verbatim when the source prints one before the letter body,
 * else null - see about.json for which sources do.
 *
 * Each Division carries one or a small number of Passages covering the
 * WHOLE letter's text - see about.json for whether this edition used one
 * Passage per letter or one Passage per source sub-division for this
 * particular work (documented per-work since the choice was made
 * per-collection, but is consistent within each). Passage.n is '' throughout;
 * Passage.ref is always null.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' for this selection */
  n: string;
  /** verbatim Latin text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - no finer citation than letter-level is tracked for this selection */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `letter-<book>-<letter>`, e.g. `letter-2-19`, `letter-12-18a` */
  id: string;
  /** dotted "book.letter" citation string, e.g. "2.19", "12.18a" - never a plain arabic numeral (see module doc) */
  number: string | null;
  /** always null for this selection */
  ref: string | null;
  /** verbatim source place/date/addressee heading line when the source prints one inline before the letter, else null */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this selection */
  editorialTitle: string | null;
  /** always [] - flat scheme, no nesting below letter-level (see module doc) */
  children: Division[];
  /** one or a small number of Passages covering the whole letter's text, in source order */
  passages: Passage[];
}

export interface GenericWork {
  /** 'ad-familiares-selection-la' */
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
