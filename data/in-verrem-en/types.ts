/**
 * Type definitions for the bundled English In Verrem corpus in
 *   data/in-verrem-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:in-verrem-en  (scripts/import-in-verrem-en/index.ts)
 * and validated by
 *   npm run validate:in-verrem-en  (scripts/import-in-verrem-en/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi005.perseus-eng2 - Charles Duke Yonge, trans.,
 * *The Orations of Marcus Tullius Cicero, Volume 1* (London: Bell, 1903),
 * "Against Verres".
 *
 * Same three-level Actio -> Book -> Section shape as the Latin sibling
 * data/in-verrem-la (Actio 1 = one Book, Actio 2 = five), independently
 * parsed - unlike the English witnesses for In Catilinam/Philippics, this
 * witness uses the SAME div-per-level structure as its Latin sibling
 * (actio/book/section all real `<div>`s, chapter cited by inline
 * `<milestone unit="chapter">`), so no structural inversion or extra
 * "argument"/"commentary" div is present here. Same id scheme:
 * `actio-N`, `actio-N-book-M`, `actio-N-book-M-sec-K`.
 *
 * Division.sourceHeading (Book only): whichever `<head>` comes LAST under
 * each book div (mirrors the Latin sibling's own rule), captured verbatim,
 * independently of the Latin sibling's own text. For Actio 2's five books
 * this is the English rendering of the traditional subtitle (e.g.
 * "RESPECTING HIS CONDUCT IN THE CITY PRAETORSHIP" for Book 1). Actio 1's
 * single book's last head is "The first oration against Verres." (not a
 * distinct subject subtitle, same as the Latin sibling) - captured
 * verbatim all the same.
 *
 * Division.ref (Section only): nearest preceding `<milestone unit="chapter"
 * n="K"/>` value (chapter numbering restarts at 1 within each Book), as a
 * plain arabic numeral string; null if none precedes yet. Actio/Book
 * Division.ref and every Passage.ref are always null.
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly
 * under that section's div, in document order, joined with "\n\n" when
 * there is more than one. Passage.n is '' throughout.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim English translation (Yonge's own wording), whitespace collapsed, entities decoded */
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
  /** Book only: the source's own LAST `<head>` printed under that book, verbatim; null for an Actio or a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Actio -> children are Books; Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for an Actio/Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'in-verrem-en' */
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
