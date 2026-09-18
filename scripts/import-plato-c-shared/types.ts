/**
 * Shared type definitions for the four Plato corpora imported by this
 * importer group ("Plato C" - kept deliberately separate from the sibling
 * agents' scripts/import-plato-shared and scripts/import-plato-b-shared,
 * which cover the other eleven dialogues):
 *
 *   data/plato-republic-grc/   data/plato-republic-en/
 *   data/plato-laws-grc/       data/plato-laws-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-plato-<work>-<lang>/index.ts and validated by
 *   npx tsx scripts/import-plato-c-shared/validate.ts
 *
 * Same GenericWork/Division/Passage/WorkAbout shape as every other bundled
 * work (see e.g. data/augustine-city-of-god-la/types.ts for the canonical
 * doc-comment this one mirrors). Republic and Laws are, structurally, a
 * Book -> Stephanus-page tree - one level deeper than a Homer/Virgil Book
 * but the same two-level shape as Augustine's Book -> Chapter, just with
 * different id/number semantics:
 *
 *   Book       id `book-N` (1-based arabic, matches src/library/
 *              genericCorpus.ts's BOOK_ID regex so it renders "Book N").
 *              number = "N" (arabic string). children = the Stephanus-page
 *              Divisions. passages = [] (a Book is a container only, like
 *              Augustine's Books). sourceHeading/editorialTitle = null: the
 *              Greek/Loeb sources print no per-book argument, and nothing
 *              is fabricated.
 *
 *   Section    id `book-N-sec-M`, M the literal Stephanus page number
 *              (continuous across the whole work, not restarting per book -
 *              e.g. Republic runs 327-621, Laws 624-969). number = "M".
 *              ref = null. sourceHeading/editorialTitle = null. children =
 *              []. Exactly one Passage, whose text is that Stephanus page's
 *              paragraphs (one per speaker turn where the source marks
 *              turns, e.g. Laws' <said>/<label> dialogue) joined with
 *              "\n\n", each paragraph keeping its speaker label verbatim
 *              where the source prints one.
 *
 * ONE EXCEPTION: data/plato-republic-en (Jowett's translation, Project
 * Gutenberg ebook #1497) carries NO Stephanus pagination at all - unlike
 * every other edition here, which is sourced from Perseus/OpenGreekAndLatin
 * TEI and does carry it. So Republic's English edition is a ONE-level
 * Book-only tree instead: each Book Division holds its content as a single
 * Passage directly (children: [], one Passage in passages, that Book's
 * paragraphs joined with "\n\n" - same shape as a Homer/Virgil Book, not
 * the two-level Book->Section shape used everywhere else in this importer
 * group). This is intentional and is disclosed in that edition's own
 * about.json, not a parsing shortfall.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' - no passage-level sub-numbering below Stephanus-section (or, for Republic-en, Book) granularity */
  n: string;
  /** verbatim paragraph(s) joined with '\n\n', whitespace collapsed to single spaces within each paragraph, entities decoded */
  text: string;
  /** always null: no physical page/line reference beyond the Division id itself */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a source-side critical-apparatus insertion) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book; `book-N-sec-M` for a Stephanus-page Section (Republic-en has Books only) */
  id: string;
  /** plain arabic string, '1'..'N' for a Book; the literal Stephanus page number for a Section */
  number: string | null;
  /** always null (see Passage.ref) */
  ref: string | null;
  /** always null: neither the Perseus TEI sources nor the Gutenberg Jowett text print a per-division rubric here */
  sourceHeading: string | null;
  /** always null: no editorial gloss is fabricated for a Book or Section in this importer group */
  editorialTitle: string | null;
  /** Book -> children are Sections (Republic-en Books: []); Section -> [] */
  children: Division[];
  /** [] for a Book that has Section children (a container only); 1 Passage for a Section, or for a Republic-en Book (which has no Section children) */
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
