/**
 * Type definitions for the bundled English Jewish War corpus in
 *   data/jewish-war-en/
 *
 * Generated (do not hand-edit) by
 *   npx tsx scripts/import-jewish-war-en/index.ts
 * and validated by
 *   npx tsx scripts/import-jewish-war-en/validate.ts
 *
 * Source: Perseus/OpenGreekAndLatin canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0526.tlg004.perseus-eng2 - William Whiston, trans.,
 * "The Wars of the Jews", in The Works of Flavius Josephus (Auburn and
 * Rochester, NY: Alden and Beardsley, 1856 printing; the translation itself
 * was first published 1737).
 *
 * TWO-level tree, Book -> Section directly (no chapter level in between -
 * matches the Greek sibling's own div shape), confirmed by direct
 * inspection: a Book division has children (its Sections) and no passages of
 * its own; a Section division has exactly one passage and no children.
 *
 * IMPORTANT edition-granularity note: this English translation is NOT
 * segmented at the same points as its Greek sibling (data/jewish-war-grc).
 * The Greek edition's own section numbering is Niese's fine-grained,
 * continuous per-book numbering (4001 sections total, one per printed Greek
 * paragraph). This English edition's own section <div>s follow William
 * Whiston's own, much coarser paragraph division instead (707 sections
 * total) - each is anchored to the Niese section number at which that
 * Whiston paragraph BEGINS (so Division.number here is that anchor number,
 * NOT a continuous 1..count sequence within the book - e.g. Book 1's own
 * section numbers run 1, 4, 7, 9, 13, ... 670, confirmed strictly
 * increasing but with real gaps). This is a genuine, source-confirmed
 * structural divergence between the two editions of this work, not an
 * importer bug - see the importer's module doc and anomalies.json.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID so
 * Books render as "Book N"; a `book-N-sec-M` id matches no special kind and
 * falls through to the default "§ M" label, which is correct and
 * intentional): Book = `book-N`, Section = `book-N-sec-M`, where M is this
 * edition's own printed `n` (see the granularity note above - M is NOT
 * always j+1 for the j-th section of a book). Book numbers are 1-based
 * arabic numerals 1..7.
 *
 * Division.ref is null throughout (both Book and Section) - see the Greek
 * sibling's own types.ts for the shared rationale (Whiston's chapter/section
 * milestones are dropped as scaffolding, not stored as a ref).
 *
 * Section.sourceHeading is populated when this edition prints a descriptive
 * chapter-rubric <head> immediately inside that section (Whiston's own
 * chapter titles, e.g. "HOW THE CITY JERUSALEM WAS TAKEN..." - printed once
 * per Whiston chapter, on that chapter's first section only) and null
 * otherwise. This is a real difference from the Greek sibling, where
 * Section.sourceHeading is always null (Niese's edition prints no per-
 * section rubric at all).
 *
 * Each Section carries exactly ONE Passage: its single surviving <p>
 * paragraph (multiple <p>s, were they ever to occur, would be joined with
 * "\n\n" - in practice every section in this source holds exactly one).
 * Passage.n is '' throughout (no printed paragraph numbers); Passage.ref is
 * always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English paragraph (Whiston's own wording), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'7' for a Book; this edition's own printed section anchor number for a Section - see the module doc's granularity note) */
  number: string | null;
  /** always null for both Book and Section */
  ref: string | null;
  /** Book: this edition's own rubric (e.g. "Book I ... CONTAINING THE INTERVAL OF ..."); Section: Whiston's own chapter-rubric title when this section opens a new chapter, else null */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'jewish-war-en' */
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
