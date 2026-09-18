/**
 * Shared type definitions for the six bundled Hesiod corpora:
 *   data/theogony-grc/              data/theogony-en/
 *   data/works-and-days-grc/        data/works-and-days-en/
 *   data/shield-of-heracles-grc/    data/shield-of-heracles-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-hesiod-<work>-<lang>/index.ts and validated by
 *   npx tsx scripts/import-hesiod-shared/validate.ts
 *
 * Flat one-level tree, same GenericWork/Division/Passage shape used
 * throughout this repo's "generic profile" works (see e.g.
 * data/augustine-city-of-god-la/types.ts), but ONE level deep: work ->
 * section, with no book/chapter nesting. Unlike Homer or the other bundled
 * poets, none of the three works traditionally attributed to Hesiod carry a
 * Book-level division in their manuscript or print tradition - each is one
 * continuous poem - so there is nothing to nest sections under.
 *
 * Division scheme: each Division is one "card" - the Loeb print-pagination
 * unit used by both the Greek critical text and Hugh G. Evelyn-White's 1914
 * English translation in the Perseus/OpenGreekAndLatin `canonical-greekLit`
 * TEI transcriptions this corpus is built from. A card typically spans
 * 20-40 lines of Greek verse; the SAME card boundaries (by starting Greek
 * line number) are used for both language witnesses of a given work, so
 * card N in the Greek text and card N in the English translation always
 * cover the same stretch of the poem. See each work's anomalies.json for
 * exactly how the card boundaries were determined for that work (the Greek
 * XML carries its own <milestone unit="card"> markers only for the
 * Theogony; for Works and Days and the Shield of Heracles the English
 * file's milestones - which give the Greek starting line number of each
 * card - were used to split the Greek text too; see "card boundary
 * derivation" in each anomalies.json).
 *
 * Id scheme (deliberately NOT `book-N`: these poems have no Books, and
 * `book-N` would make src/library/genericCorpus.ts's shared BOOK_ID regex
 * mislabel a card as "Book N" in the UI, which would be wrong): every
 * Division id is `sec-N`, N = the card's own 1-based sequential position in
 * the poem (1, 2, 3, ... in document order - NOT the card's own starting
 * line number, which is what `ref` is for). `sec-N` matches none of
 * genericCorpus.ts's kind-label regexes, so it falls back to the shared
 * code's plain "§ N" label, which is the correct, intended rendering here.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always "" - Hesiod's poems carry no passage-level sub-numbering below the card */
  n: string;
  /**
   * verbatim reading text, whitespace collapsed to single spaces between
   * lines joined with "\n" (see Division.ref for the card's line range).
   * Greek: each card's verse lines, one per "\n"-separated entry, in
   * document order. English: Evelyn-White's prose translation for the
   * card's span, as a single continuous block (see the corpus-level note in
   * each English work's anomalies.json - the English source carries no
   * <p> paragraph divisions, just this same card milestone scheme threaded
   * through a bare stream of TEI <l> reference-anchor elements).
   */
  text: string;
  /** always null: no passage-level reference finer than the card (Division.ref) is available */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. a source numbering inconsistency) */
  anomaly?: string;
}

export interface Division {
  /** `sec-N`, N = 1-based sequential card position in the poem */
  id: string;
  /** the sequential card position as a string ("1", "2", ...), so it renders "§ 1", "§ 2", ... */
  number: string;
  /** the card's own Greek line range, e.g. "1–28", when determinable; else null */
  ref: string | null;
  /** always null: the source prints no heading/rubric for a card */
  sourceHeading: string | null;
  /** always null: no editorial heading is fabricated for a card */
  editorialTitle: string | null;
  /** always [] - a flat, one-level tree */
  children: Division[];
  /** always exactly 1 - one Passage per card */
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

export interface Anomaly {
  where: string;
  note: string;
}
