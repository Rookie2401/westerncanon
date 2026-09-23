/**
 * Type definitions for the bundled Greek Polybius, Histories (Ἱστορίαι) corpus in
 *   data/polybius-histories-grc/
 *
 * Generated (do not hand-edit) by
 *   npm run import:polybius-histories-grc  (scripts/import-polybius-histories-grc/index.ts)
 * and validated by
 *   npm run validate:polybius-histories-grc  (scripts/import-polybius-histories-grc/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0543.tlg001.perseus-grc2 - Theodor Büttner-Wobst, ed.,
 * Polybii Historiae, 4 vols. (Leipzig: Teubner, 1893-1905).
 *
 * IMPORTANT - completeness: only Books 1-5 (`book-1`..`book-5`) survive
 * complete. Books 6-39 survive only as excerpts and fragments, mostly drawn
 * from later Byzantine excerpt-collections (e.g. the "Excerpta de
 * Legationibus", "Excerpta de Virtutibus et Vitiis", etc. compiled under
 * Constantine VII Porphyrogenitus), so their chapter numbering is genuinely
 * NON-CONTIGUOUS: some chapter numbers are skipped outright (e.g.
 * `book-33-ch-2` does not exist - the source itself jumps from chapter 1 to
 * chapter 3), and many carry a lettered suffix for material the manuscript
 * tradition/editor inserts between two regularly-numbered chapters (e.g.
 * `book-12-ch-4a`, `book-12-ch-4b`, `book-12-ch-4c`, `book-12-ch-4d` between
 * `book-12-ch-4` and `book-12-ch-5`). ALL of this is preserved exactly as
 * Büttner-Wobst's own edition prints it - no chapter is renumbered, no gap is
 * filled, and lettered chapters are NOT necessarily printed in strict
 * alphabetical/numeric sequence relative to their unlettered neighbour (e.g.
 * Book 11 prints `1a` BEFORE `1`) - document order is preserved verbatim,
 * never resorted. See about.json for the full disclosure, including the one
 * book that does not survive AT ALL.
 *
 * Book 17 (`book-17`) is a special case: NOTHING of it survives - not a
 * single word of Polybius's own text. The source XML represents this with a
 * bare paragraph holding only the editor's own Latin apparatus note ("Nihil
 * huius libri superest.", i.e. "Nothing of this book survives") wrapped in
 * `<note>`, discarded here like every other `<note>` (see below) - so
 * `book-17` is imported as a Division with `children: []` (zero Chapters) and
 * no reading text at all. This is not a parsing failure; it is what the
 * source itself contains.
 *
 * Two-level tree, Book -> Chapter (matches the De Bello Gallico Book->Chapter
 * GenericWork shape, per this app's established convention for a source that
 * nests an uninformative extra `<div type="textpart" subtype="section">`
 * level between Chapter and paragraph): a Book division has children (its
 * Chapters, possibly zero - see Book 17 above) and no passages of its own; a
 * Chapter division has exactly one passage and no children. Every `<p>` found
 * anywhere under a Chapter div, at any section-nesting depth, becomes one
 * paragraph of that Chapter's single Passage, in document order, joined with
 * "\n\n" - the Greek witness's own section-level citation granularity
 * (traditionally the third element of "book.chapter.section" citation) is
 * therefore not separately preserved as its own Division level, matching this
 * app's de-bello-gallico-la precedent exactly.
 *
 * Id scheme: Book = `book-N` (1-39), Chapter = `book-N-ch-M` - this edition's
 * own chapter numbering, verbatim, including lettered chapters (`book-12-ch-4a`
 * etc. - see above). `number` is therefore typed as a free-form string, not
 * assumed to be purely numeric or contiguous.
 *
 * `sourceHeading`: both a Book and a Chapter may carry one. At Chapter level
 * this captures a verbatim `<head>` the edition prints at the very start of a
 * new excerpt-group within a fragmentary book (Büttner-Wobst's own Latin
 * editorial rubrics classifying each stretch of excerpted material by source
 * or subject, e.g. "I. Ex Prooemio", "II. Res Italiae", "VIII. Fragmenta
 * incertae sedis" - printed by Perseus's converter with Latin letters
 * transliterated into look-alike Greek characters, an encoding quirk of this
 * digital edition, not altered here). Most Chapters carry no heading
 * (`sourceHeading: null`). `editorialTitle` is always null - no gloss of our
 * own is added.
 *
 * Division.ref and Passage.ref are always null throughout: this source
 * carries no page-marker or milestone citation scheme this schema could use.
 * Citation here is by Book and Chapter number (the edition's own numbers),
 * the standard modern citation for Polybius being further refined to a
 * Section number this schema does not separately preserve (see above).
 *
 * Markup handled (see scripts/import-polybius-histories-grc/index.ts for the
 * full account):
 *   - `<note>...</note>` (7) - editorial apparatus (a manuscript/textual
 *     note, never part of Polybius's own text) - discarded entirely, tag and
 *     content; every occurrence logged individually.
 *   - `<add>...</add>` (5) - Büttner-Wobst's own editorial supplement filling
 *     a manuscript gap - IS part of what his edition prints as the running
 *     text, so unwrapped and kept verbatim, flagged on its Passage; every
 *     occurrence logged individually (mirrors this app's de-bello-gallico-la
 *     <add> precedent).
 *   - `<gap reason="ellipsis" .../>` (151) - a manuscript lacuna; kept as
 *     nothing extra (no literal dots fabricated, since this edition prints
 *     none), logged individually every time (these are exactly the
 *     "fragment gaps" this app's faithfulness rules call out for individual,
 *     not aggregate, logging).
 *   - `<foreign xml:lang="lat">...</foreign>` (104) - unwrapped, text kept:
 *     mostly Büttner-Wobst's own inline bracketed source-citations for a
 *     fragment (e.g. "[Πολύβ. ΙΙΙ, 2, 6]", i.e. "[Polyb. III, 2, 6]",
 *     transliterated the same way as the headings above), genuinely printed
 *     inline in the edition's running text (not apparatus wrapped in
 *     `<note>`) - see about.json.
 *   - `<head>` - see `sourceHeading` above.
 *   - No `<del>`, `<sic>`, `<corr>`, `<choice>`, `<pb>`, `<milestone>`, `<q>`
 *     or `<quote>` occurs anywhere in this source (confirmed by direct
 *     inspection).
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. Büttner-Wobst's own <add> editorial supplement, or the manuscript's <gap> lacuna(e) within this chapter) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter (M is this edition's own chapter number, verbatim, incl. lettered suffixes) */
  id: string;
  /** free-form string: '1'..'39' for a Book; a Chapter's own printed number, e.g. '1', '11a', '38b' (never assumed numeric-only or contiguous) */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme */
  ref: string | null;
  /** Book: verbatim printed rubric if this book opens with one (rare); Chapter: verbatim `<head>` printed at the start of a new excerpt-group (most Chapters: null) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters (possibly [], see Book 17 in the module doc); Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only, or entirely lost - Book 17); exactly [one Passage] for every other Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'polybius-histories-grc' */
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
