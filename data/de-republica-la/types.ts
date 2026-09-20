/**
 * Type definitions for the bundled Latin De Republica corpus in
 *   data/de-republica-la/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-republica-la  (scripts/import-de-republica-la/index.ts)
 * and validated by
 *   npm run validate:de-republica-la  (scripts/import-de-republica-la/validate.ts)
 *
 * Source: Perseus canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi043.perseus-lat2 - Cicero, De Re Publica
 * ("Librorum de Re Publica Sex"), ed. Carl Friedrich Wilhelm Mueller
 * (Leipzig: Teubner, 1889).
 *
 * THIS WORK IS GENUINELY, SEVERELY FRAGMENTARY - see about.json's "Known
 * gaps & anomalies" section for the full account. De Republica survives
 * only through (a) a 4th/5th-century palimpsest manuscript (rediscovered by
 * Angelo Mai in 1819) covering large parts of Books 1-2 and fragments of the
 * rest, and (b) roughly 150 separate quotations of varying length embedded
 * in later authors (Augustine, Nonius, Macrobius, Lactantius and others) -
 * the ONLY source for material the palimpsest does not cover, including all
 * of the famous "Dream of Scipio" that closes Book 6. This is not a
 * transcription defect to fix; it is the real transmission history of the
 * work, and this importer preserves every editorial gap marker, every
 * fragment-source citation, and every non-sequential paragraph number
 * exactly as Mueller's edition prints them.
 *
 * Two-level tree, Book -> Section. UNLIKE every other Book division in this
 * app's schema, "Book" here is not always a plain arabic numeral: Mueller's
 * edition prints NINE top-level divs, not six - the six traditionally
 * numbered books (1-6, each itself gappy - see below) PLUS three separately
 * transmitted collections of fragments Mueller could not place within the
 * numbered books at all ("1fr", "3fr", and a final "fr" for fragments not
 * even assignable to a particular book): `1`, `1fr`, `2`, `3`, `3fr`, `4`,
 * `5`, `6`, `fr`, in that document order. A fragment-collection div's id is
 * `book-1fr` / `book-3fr` / `book-fr` (NOT forced into the plain `book-N`
 * pattern) - src/library/genericCorpus.ts's BOOK_ID regex requires a plain
 * integer, so these three intentionally do NOT render as "Book 1fr" etc.;
 * they fall through to the generic "§" label, which is honest - a loose
 * fragment collection is not really "a Book" in the traditional sense.
 *
 * Within each of the 9 top-level divs, Section numbering is this edition's
 * own `subtype="section"` `n` attribute, kept EXACTLY as printed - including
 * every place it skips a number (e.g. Book 3 jumps 19->23, 28->32, etc.).
 * A missing number is not a parsing error: it means Mueller's own edition
 * has no text for that traditionally-cited paragraph slot at all (usually
 * because the underlying content is lost outright, in a book with no
 * unbroken palimpsest support) - see anomalies.json for the exact skip list
 * per book.
 *
 * Id scheme: Book-ish = `book-<N>` (N = "1".."6" or "1fr"/"3fr"/"fr");
 * Section = `book-<N>-sec-<M>` (M = this edition's own, possibly
 * non-sequential, section number).
 *
 * Division.ref (Section only): the nearest preceding inline
 * `<milestone unit="chapter" n="…"/>` value within the SAME top-level div
 * (Cicero's traditional chapter citation - coarser than section numbering),
 * carried forward across sections with no marker of their own, reset to
 * null at the start of each top-level div. The three fragment-collection
 * divs (1fr/3fr/fr) carry no chapter milestones at all, so their every
 * section's ref is null. Book Division.ref is always null.
 *
 * Book Division.sourceHeading is this edition's own verbatim `<head>` rubric
 * (e.g. "Liber Primus", "Libri I de Re Publica Fragmenta Incertae Sedis",
 * "Librorum de Re Publica incertorum Fragmenta") - genuinely informative
 * here, since it is the only place a reader is told a given top-level
 * division is a fragment collection rather than continuous narrative.
 *
 * Each Section carries exactly ONE Passage: its surviving paragraph text,
 * joined with "\n\n" when a section has more than one `<p>`. A `<gap
 * reason="lost" .../>` with a `rend` attribute (Mueller's own literal
 * printed dots, e.g. ". . .") is kept verbatim as that literal text; one
 * with no `rend` (a page-or-more lacuna Mueller prints no dots for) inserts
 * nothing but is still logged. A `<del>` span (text Mueller's apparatus
 * brackets as probable interpolation) is excluded; an `<add>` span (a
 * genuine editorial insertion he prints) is kept and flagged. Every
 * fragment section's `<bibl>` source-citation (e.g. "Non. p. 426M",
 * "Lactant. Div. Inst. 3.16.5" - identifying which later author preserved
 * that fragment) is kept as part of the reading text, since for these
 * fragment collections the citation is inseparable from what the "text" of
 * a fragment even is - see about.json for this deliberate editorial
 * decision. Passage.n is '' throughout; Passage.ref is always null.
 */

export type Lang = 'la';

export interface Passage {
  /** always '' - no paragraph sub-numbering finer than the section exists in this source */
  n: string;
  /** verbatim Latin text (including Mueller's own literal gap-dots and, for fragment sections, the source-bibl citation), whitespace collapsed, entities decoded */
  text: string;
  /** always null - see the module doc for why per-passage chapter refs are not fabricated */
  ref: string | null;
  /** optional note when something irregular was preserved (a kept <add>, a literal <gap>, etc.) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book or fragment collection (N = "1".."6", "1fr", "3fr", "fr"), `book-N-sec-M` for a Section */
  id: string;
  /** "1".."6"/"1fr"/"3fr"/"fr" for a Book-ish division; this edition's own section number for a Section */
  number: string | null;
  /** Section only: nearest preceding chapter milestone value within this book-ish division; null for a Book-ish division or a fragment collection (no milestones) */
  ref: string | null;
  /** Book-ish division only: this edition's own verbatim <head> rubric; null for a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book-ish -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book-ish division (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-republica-la' */
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
