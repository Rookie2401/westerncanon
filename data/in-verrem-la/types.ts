/**
 * Type definitions for the bundled Latin In Verrem corpus in
 *   data/in-verrem-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:in-verrem-la  (scripts/import-in-verrem-la/index.ts)
 * and validated by
 *   npm run validate:in-verrem-la  (scripts/import-in-verrem-la/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi005.perseus-lat2 - Cicero, *M. Tulli Ciceronis
 * Orationes, Volume 3*, ed. William Peterson (Oxford: Clarendon Press,
 * 1917).
 *
 * THREE-level tree, Actio -> Book -> Section (unlike In Catilinam/
 * Philippics, which have no Book level). Confirmed by direct inspection:
 * Actio 1 (the short first actual speech against Verres - NOT the separate
 * "Divinatio in Caecilium", which is a different work and not included
 * here) holds exactly one Book; Actio 2 holds five. An Actio division has
 * children (its Books) and no passages; a Book division has children (its
 * Sections) and no passages; a Section division has exactly one passage
 * and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel so Actiones
 * render as "Actio N" and Books as "Book M"): Actio = `actio-N` (N = 1..2),
 * Book = `actio-N-book-M` (M = 1 for Actio 1's single book, 1..5 for Actio
 * 2's five), Section = `actio-N-book-M-sec-K` (1-based, continuous within
 * a book, matching the source's own `subtype="section"` numbering).
 *
 * Division.sourceHeading (Book only): each Book div prints one or two of
 * its own `<head>` rubrics before its first section; sourceHeading is
 * whichever one comes LAST (the most specific), captured verbatim. For
 * Actio 2's five books this is genuinely the traditional subject-matter
 * subtitle ("De Praetura Urbana" for Book 1, "De Praetura Siciliensi" for
 * Book 2, "De Frumento" for Book 3, "De Signis" for Book 4, "De
 * Suppliciis" for Book 5). Actio 1's single book prints two heads too, but
 * neither is a distinct subject subtitle - its own last head is simply
 * "IN C. VERREM ACTIO PRIMA" (repeating the Actio's own title); captured
 * verbatim all the same, exactly what the source prints, rather than
 * substituting a null or a fabricated subtitle. Actio Division.sourceHeading
 * is always null (no dedicated Actio-level rubric distinct from its single
 * or first book's own).
 *
 * Division.ref (Section only) is the nearest preceding `<milestone
 * unit="chapter" n="K"/>` value (chapter numbering restarts at 1 within
 * each BOOK, not each Actio), as a plain arabic numeral string; null if
 * none precedes yet - this genuinely happens for the earliest section(s)
 * of any book, before that book's first chapter milestone is reached (see
 * anomalies.json for every case). Actio/Book Division.ref and every
 * Passage.ref are always null.
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly
 * under that section's div, in document order, joined with "\n\n" when
 * there is more than one. Passage.n is '' throughout.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim Latin text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `actio-N`, `actio-N-book-M`, or `actio-N-book-M-sec-K` */
  id: string;
  /** arabic string, matching the source's own numbering at each level */
  number: string | null;
  /** Section only: nearest preceding chapter milestone value; null for an Actio/Book or when no milestone yet precedes */
  ref: string | null;
  /** Book only: the source's own LAST `<head>` printed under that book (its most specific rubric), verbatim; null for an Actio or a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Actio -> children are Books; Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for an Actio/Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'in-verrem-la' */
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
