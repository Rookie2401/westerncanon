/**
 * Type definitions for the bundled Latin De Legibus corpus in
 *   data/de-legibus-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-legibus-la  (scripts/import-de-legibus-la/index.ts)
 * and validated by
 *   npm run validate:de-legibus-la  (scripts/import-de-legibus-la/validate.ts)
 *
 * Source: Latin Wikisource, three separate pages (one per book) -
 * https://la.wikisource.org/wiki/De_legibus/Liber_I, /Liber_II, /Liber_III -
 * fetched once each via the MediaWiki action=parse&prop=wikitext API.
 * Perseus does NOT have this text (its own tracking file marks De Legibus
 * "status: not migrated" and the file genuinely does not exist in the
 * canonical-latinLit repository), so this importer works from Wikisource's
 * plain wikitext directly, the same general technique as
 * scripts/import-aristotle-posterior-analytics-grc (just on Latin
 * Wikisource instead of Greek).
 *
 * PROVENANCE GAP (disclosed, not resolved): Latin Wikisource does not cite a
 * specific source critical edition anywhere on these three pages - no
 * editor, no year, no publisher. The Latin text itself is ancient and
 * unquestionably public domain regardless of which modern edition
 * transcribed it, but the specific editorial lineage of THIS particular
 * transcription is genuinely unstated by the source; see about.json.
 *
 * Two-level tree, Book -> Section, with a fully independent numbering
 * scheme per book (this is a deliberate consequence of the source, not an
 * inconsistency this importer introduces):
 *   - Book 1 and Book 2 (`book-1`, `book-2`): Wikisource's own transcription
 *     prints bracketed paragraph numbers inline, e.g. "[1]", "[34]" -
 *     genuine numbering from the source, used directly as each Section's
 *     `number`/id (63 sections in Book 1, 69 in Book 2, both sequential
 *     1..N with no gaps). A marker can fall anywhere in the running text
 *     (not necessarily at a paragraph or even a word boundary - e.g. book 1
 *     opens "Atticvs[1] Lucus quidem ille..."), so the importer splits the
 *     continuous text stream at each marker's own exact position, not at a
 *     paragraph boundary; the few characters before the very first marker
 *     of a book are folded into section 1 rather than discarded or filed
 *     unnumbered - see the importer's module doc.
 *   - Book 3 (`book-3`): this page carries NO bracketed paragraph numbers
 *     at all (confirmed by direct inspection - it uses a different,
 *     page-number-only `{{pn|N}}` template plus separate Roman-numeral
 *     "Caput" chapter markers instead). Per this app's fallback policy for
 *     a genuinely absent source numbering, sections here are numbered
 *     SEQUENTIALLY BY PARAGRAPH, 1.., by this importer - these are
 *     editorially-assigned sequential numbers, NOT the source's own, and
 *     are disclosed as such in about.json. Book 3 is also traditionally
 *     understood to break off incomplete, and this Wikisource transcription
 *     confirms that directly: it ends mid-dialogue, mid-argument, with no
 *     closing formula - see about.json.
 *
 * Division.ref is ALWAYS null throughout this work (no milestone markers of
 * any kind exist in this source that this app's schema could use for a
 * chapter-style reference - see the module doc for why Book 3's own Roman-
 * numeral "Caput" markers, where present, are not used for this either).
 *
 * Id scheme: Book = `book-N` (N = "1".."3"); Section = `book-N-sec-M`.
 *
 * Each Section carries exactly ONE Passage: its paragraph(s) (split at
 * blank-line boundaries within that section's own span), joined with
 * "\n\n" when there is more than one. This source's own editorial angle-
 * bracket supplements (⟨...⟩, an editor's conjectural restoration of a
 * manuscript gap) and a handful of short square-bracket supplements/lacuna
 * marks (e.g. "[tuis]", "[ . . . . ]") are kept 100% verbatim and flagged
 * via Passage.anomaly; a small number of LONGER bracketed spans that read
 * as a Wikisource-added citation/gloss rather than Cicero's own words
 * (identified individually - see the importer's module doc) are excluded
 * instead, as a deliberate, disclosed editorial judgement call. Passage.n
 * is '' throughout.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - no paragraph sub-numbering finer than the section exists in this source */
  n: string;
  /** verbatim Latin text (including this source's own ⟨…⟩/[…] supplements), whitespace collapsed, entities decoded */
  text: string;
  /** always null - see the module doc; this work has no milestone-style reference scheme at all */
  ref: string | null;
  /** optional note when something irregular was preserved (an ⟨…⟩ supplement, a lacuna mark, etc.) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** "1".."3" for a Book; this source's own bracketed number (Books 1-2) or an editorially-assigned sequential number (Book 3) for a Section */
  number: string | null;
  /** always null - this work has no reference scheme finer than Book/Section (see the module doc) */
  ref: string | null;
  /** always null - no verbatim source rubric is preserved for this work (see about.json) */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-legibus-la' */
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
