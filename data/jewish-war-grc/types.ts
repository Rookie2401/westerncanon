/**
 * Type definitions for the bundled Greek Jewish War corpus in
 *   data/jewish-war-grc/
 *
 * Generated (do not hand-edit) by
 *   npx tsx scripts/import-jewish-war-grc/index.ts
 * and validated by
 *   npx tsx scripts/import-jewish-war-grc/validate.ts
 *
 * Source: Perseus/OpenGreekAndLatin canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0526.tlg004.perseus-grc2 - Flavius Josephus, Flavii
 * Iosephi Opera, Vol. 6, ed. Benedikt Niese (Berlin: Weidmann, 1895).
 *
 * TWO-level tree, Book -> Section directly (no chapter level in between - a
 * flat 2-level div tree per book, confirmed by direct inspection): a Book
 * division has children (its Sections) and no passages of its own; a Section
 * division has exactly one passage and no children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID so
 * Books render as "Book N"; a `book-N-sec-M` id matches no special kind and
 * falls through to the default "§ M" label, which is correct and
 * intentional): Book = `book-N`, Section = `book-N-sec-M`, both this
 * edition's own printed numbers. Book numbers are 1-based arabic numerals
 * 1..7. Section numbers are this edition's own continuous per-book numbering
 * (1..673 in Book 1, 1..654 in Book 2, etc. - restarting at 1 in each Book).
 *
 * Division.ref is null throughout (both Book and Section) - this work has no
 * second, coarser reference level represented in this app's schema. (The
 * source also threads William Whiston's own English chapter/section
 * citation scheme through the text via inline milestones; those are dropped
 * as scaffolding - see the importer's module doc.)
 *
 * Each Section carries exactly ONE Passage: its single surviving <p>
 * paragraph (multiple <p>s, were they ever to occur, would be joined with
 * "\n\n" - in practice every section in this source holds exactly one).
 * Passage.n is '' throughout (no printed paragraph numbers); Passage.ref is
 * always null.
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'7' for a Book, this edition's own per-book section number for a Section) */
  number: string | null;
  /** always null for both Book and Section - see the module doc */
  ref: string | null;
  /** Book: this edition's own rubric (e.g. "Φλαυίου Ἰωσήπου ἱστορία Ἰουδαϊκοῦ πολέμου πρὸς Ῥωμαίους βιβλίον α."); Section: always null (this edition prints no per-section rubric) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'jewish-war-grc' */
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
