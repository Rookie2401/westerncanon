/**
 * Type definitions for the bundled English Polybius, The Histories corpus in
 *   data/polybius-histories-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:polybius-histories-en  (scripts/import-polybius-histories-en/index.ts)
 * and validated by
 *   npm run validate:polybius-histories-en  (scripts/import-polybius-histories-en/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0543.tlg001.perseus-eng2 - Evelyn S. Shuckburgh, trans.,
 * The Histories of Polybius, 2 vols. (London/New York: Macmillan, 1889).
 *
 * IMPORTANT - completeness: only Books 1-5 (`book-1`..`book-5`) survive
 * complete. Books 6-39 survive only as excerpts and fragments - see
 * about.json for the full disclosure. Book 17 (`book-17`) does not survive AT
 * ALL: Shuckburgh's own edition marks this with an editorial paragraph of his
 * (explaining what the lost book would have covered, citing Livy) that is NOT
 * a translation of any surviving Polybius text - it is excluded from the
 * reading text here exactly as the Greek sibling's own apparatus note is
 * excluded there, so `book-17` is imported as a Division with `children: []`
 * (zero Chapters) and no reading text at all.
 *
 * IMPORTANT - this witness is NOT parsed to match the Greek sibling
 * (data/polybius-histories-grc). Shuckburgh's translation divides its
 * fragmentary books differently from Büttner-Wobst's Greek text throughout
 * (parsed completely independently here, per this app's established
 * practice - see e.g. Jewish War grc/en) - chapter COUNTS differ, sometimes
 * substantially, in most of Books 6-39; see about.json for the book-by-book
 * comparison. No attempt is made to renumber, merge or align either witness's
 * chapters to the other.
 *
 * IMPORTANT - a 40th top-level Division, `fragments`. This edition's source
 * XML carries a `<div type="textpart" subtype="book" n="fragments">` AFTER
 * Book 39 - Shuckburgh's own "Shorter Fragments" appendix: 110 short but
 * WHOLE fragments of real translated text (not apparatus), mostly belonging
 * to Book 6 but not integrated into its numbered chapters, each
 * cross-referenced to Hultsch's Teubner numbering as well as Shuckburgh's own
 * running Roman-numeral count. It does not correspond 1:1 to any single Book
 * of the 39-book structure, so it is imported as its OWN top-level Division,
 * `fragments` (sitting alongside, not nested inside, `book-1`..`book-39` in
 * `divisions`) - a 3-level Division -> Group -> Chapter tree, UNLIKE every
 * other top-level Division here (which are 2-level Book -> Chapter):
 *   - `fragments` (number null, ref null, sourceHeading "Shorter Fragments",
 *     the appendix's own short title; children = the two Groups below;
 *     passages = [])
 *   - `fragments-a` / `fragments-b` (number null, ref null, sourceHeading =
 *     the source's own two-class heading text verbatim - "A: Fragments
 *     whose reference is known" / "B: Fragments of uncertain reference";
 *     children = that group's Chapters; passages = []). These two Groups are
 *     reconstructed from a `<div2>` sub-division pair that is present in the
 *     source ONLY as a dead XML comment (not live structure) - see
 *     about.json and the importer's module doc for the full account of why.
 *   - `fragments-a-ch-N` / `fragments-b-ch-N` (N = this source's own chapter
 *     n, continuous 1-104 across both Groups with a few lettered insertions
 *     e.g. 39a/39b; sourceHeading = that chapter's own printed head, e.g.
 *     "I (6, 2)" - Shuckburgh's own Roman-numeral fragment number, with
 *     Hultsch's bracketed arabic fragment number; exactly one Passage, no
 *     children).
 * Shuckburgh's own prefatory paragraph for the appendix (part of its <head>,
 * explaining his two-class scheme and the two numbering conventions) is his
 * own prose, not a translation of Polybius, so it is excluded from the
 * reading text but quoted verbatim in both anomalies.json and about.json.
 *
 * Two-level tree, Book -> Chapter, for `book-1`..`book-39` (mirrors
 * data/de-bello-gallico-en/types.ts exactly: no extra section-level nesting
 * in this witness, unlike the Greek sibling): a Book division has children
 * (its Chapters, possibly zero - see Book 17 above) and no passages of its
 * own; a Chapter division has exactly one passage and no children. The
 * `fragments` Division (see above) is the one exception to this 2-level
 * shape.
 *
 * Id scheme: Book = `book-N` (1-39), Chapter = `book-N-ch-M` - this edition's
 * own chapter numbering, verbatim, including lettered chapters where this
 * witness prints them (its lettered chapters do NOT always match the Greek
 * sibling's - parsed independently, never forced). `number` is a free-form
 * string, not assumed numeric-only or contiguous. The appendix uses its own
 * id scheme - see above.
 *
 * `sourceHeading`: a Book, Chapter, Group or the appendix itself may carry
 * one, captured verbatim from a `<head>` this edition prints (e.g. Book 34's
 * "Geographical Fragments", or a Chapter's own editorial title such as
 * "Introduction", "Importance and Magnitude of the Subject" - Shuckburgh's
 * own chapter headings, printed in his 1889 edition, not this app's
 * invention). `editorialTitle` is always null - no further gloss of our own
 * is added.
 *
 * Division.ref and Passage.ref are always null throughout: citation here is
 * by Book and Chapter number, matching this edition's own numbering.
 *
 * Markup handled (see scripts/import-polybius-histories-en/index.ts for the
 * full account):
 *   - `<note>...</note>` (2514 top-level spans in the 39 numbered Books, 48
 *     more in the appendix) - Shuckburgh's own extensive footnotes
 *     (historical commentary, cross-references, marginal date/consul-year
 *     glosses wrapped as `<note place="margin">`, etc.) - NOT part of the
 *     translated running text - discarded entirely, tag and content; logged
 *     as aggregate counts (this is exactly the "repetitive class" case this
 *     app's faithfulness rules allow to be aggregated rather than logged
 *     one-by-one). A minority of chapters have their ENTIRE surviving text
 *     inside a `<note>` (Shuckburgh supplying only his own editorial
 *     bridging prose, occasionally alongside a genuine quoted translation
 *     via a nested `<q>`) - kept as a last resort rather than left empty,
 *     flagged via `Passage.anomaly`.
 *   - `<pb/>` (1143 in the numbered Books, 16 more in the appendix) -
 *     page-break markers to Shuckburgh's 1889 print pagination - dropped as
 *     scaffolding, no citation value in this schema.
 *   - `<head>` - see `sourceHeading` above.
 *   - `<placeName>`, `<date>`, `<foreign>`, `<q>`, `<quote>`, `<bibl>`,
 *     `<title>`, `<cit>`, `<term>`, `<l>`, `<hi>`, `<rs>`, `<persName>`,
 *     `<label>`, `<num>`, `<emph>`, `<gloss>` (and any other inline semantic
 *     wrapper) - unwrapped, text kept: these occur both inside the discarded
 *     `<note>` apparatus (where they vanish along with their enclosing note)
 *     and directly in Shuckburgh's own translated running text (e.g. his
 *     inline "B.C. 195: ... Coss." consular-year headers, printed as
 *     `<label>`), where their content is genuine translated text and flows
 *     into the surrounding prose unchanged - mirrors this app's established
 *     de-bello-gallico-en precedent for exactly this class of tag.
 *   - No live (non-commented-out) `<del>`, `<add>`, `<gap>`, `<sic>` occurs
 *     anywhere in this witness (confirmed by direct inspection). XML
 *     comments (3, all inside the appendix, wrapping a dead `<div2>`
 *     sub-division pair and one dead `<table>`) are stripped before
 *     parsing.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English (Shuckburgh's own translation) paragraph, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-ch-M` for a Chapter (M is this edition's own chapter number, verbatim, incl. lettered suffixes) */
  id: string;
  /** free-form string: '1'..'39' for a Book; a Chapter's own printed number, e.g. '1', '4b', '52a' (never assumed numeric-only or contiguous) */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme */
  ref: string | null;
  /** Book or Chapter: verbatim printed `<head>` this edition prints there, if any; otherwise null */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters (possibly [], see Book 17 in the module doc); Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only, or entirely lost - Book 17); exactly [one Passage] for every other Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'polybius-histories-en' */
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
