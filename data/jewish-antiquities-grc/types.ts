/**
 * Type definitions for the bundled Greek Jewish Antiquities corpus in
 *   data/jewish-antiquities-grc/
 *
 * Generated (do not hand-edit) by
 *   npm run import:jewish-antiquities-grc  (scripts/import-jewish-antiquities-grc/index.ts)
 * and validated by
 *   npm run validate:jewish-antiquities-grc  (scripts/import-jewish-antiquities-grc/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0526.tlg001.perseus-grc2 - Flavius Josephus, *Flavii
 * Iosephi Opera, Vol. 1-4*, ed. Benedikt Niese (Berlin: Weidmann,
 * 1885-1890).
 *
 * TWO-level tree, Book -> Section (confirmed by direct inspection: `<div
 * type="textpart" subtype="book" n="N">` (20 books, N = 1..20) directly
 * containing `<div type="textpart" subtype="section" n="M">`, no chapter
 * level in between). A Book division has children (its Sections) and no
 * passages of its own; a Section division has exactly one Passage and no
 * children.
 *
 * Id scheme (read by src/library/genericCorpus.ts's kindLabel/BOOK_ID so
 * Books render as "Book N"; Sections have no dedicated kindLabel and fall
 * through to the default "§ M" label): Book = `book-N` (1-based plain
 * arabic numeral, N = 1..20), Section = `book-N-sec-M`.
 *
 * M is the section div's own `n` attribute verbatim: either a 1-based plain
 * arabic numeral (Niese's own section numbering, sequential with no gaps
 * within each book: 346/349/322/331/362/378/394/420/291/281/347/434/433/
 * 491/425/404/355/379/366/268 numbered sections for books 1-20 respectively
 * - 7376 numbered sections total), OR the literal string "arg" - EVERY book
 * opens with exactly one `n="arg"` section BEFORE its numbered section 1:
 * this is Niese's own edition printing the book's argumentum, a short
 * numbered table of contents in Josephus's own words (one <p> per item,
 * each opening with the source's own Greek alphabetic numeral label, e.g.
 * "α.", "β." - kept verbatim as printed text, not converted or dropped).
 * 20 "arg" sections + 7376 numbered sections = 7396 sections total.
 *
 * Division.sourceHeading: Book only prints its own `<head>` (Niese's
 * formulaic "Τάδε ἔνεστιν ἐν τῇ [ordinal] τῶν Ἰωσήπου ἱστοριῶν τῆς
 * Ἰουδαϊκῆς ἀρχαιολογίας" - "Contents of Book [N] of Josephus's histories
 * of the Jewish Antiquities", with the ordinal itself a Greek numeral
 * letter printed inline, e.g. "α", "κ") - captured verbatim as that Book's
 * sourceHeading. Exactly one Section ALSO carries its own sourceHeading:
 * Book 1's "arg" section alone prints an additional `<head>` of its own,
 * "Προοίμιον περὶ τῆς ὅλης πραγματείας" ("Preface concerning the whole
 * undertaking") - the only book-opening argumentum that does this, since it
 * doubles as the preface to the entire 20-book work. Every other Section
 * (every other book's "arg" section, and every numbered section in every
 * book) has sourceHeading null - confirmed by direct inspection (only 21
 * `<head>` elements exist in the whole source: 20 Book heads + this one).
 *
 * Division.ref is null throughout (Book and Section alike) - this source's
 * inline `<milestone unit="Whiston_chapter"/>` / `<milestone
 * unit="Whiston_section"/>` markers (a third, later cross-reference scheme
 * to Whiston's 1737 English chapter/section numbering, retrofitted onto
 * this Greek text by the Perseus editors) are dropped as scaffolding rather
 * than fabricating a use for them - see anomalies.json.
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly
 * under that section's div, in document order, joined with "\n\n" when
 * there is more than one (routine for "arg" sections, which print one <p>
 * per table-of-contents item; rare otherwise). Passage.n is '' throughout;
 * Passage.ref is always null.
 *
 * <del>...</del> (222 occurrences - Niese's own critical apparatus marking
 * text as a probable interpolation not part of his judged authentic text)
 * is EXCLUDED from the reading text, matching this app's established
 * Bywater/Euclid/Cicero <del> convention; every occurrence is logged
 * individually in anomalies.json. Exactly two sections - book-18-sec-63 and
 * book-18-sec-64, together comprising the "Testimonium Flavianum", the
 * disputed passage naming Jesus - consist of ONE <p> that is ENTIRELY
 * wrapped in <del>; excluding it as usual would leave those two Sections
 * with no reading text at all, which this app's schema does not support,
 * so (mirroring the established de-officiis-la book-1-sec-40 precedent)
 * the bracketed text is kept as a last resort, its Passage.anomaly flagging
 * it as suspect rather than presented on the same footing as the rest of
 * the text. Two further, much less notable, whole-<p>-within-<del> cases
 * (book-14-sec-arg, book-20-sec-arg) do NOT trigger this fallback, because
 * each of those two "arg" sections has many OTHER surviving table-of-
 * contents items of its own - only the deleted item itself is dropped,
 * exactly like any other <del> span. See data/jewish-antiquities-grc/
 * anomalies.json for the full, individually logged account.
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim Greek text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** set only for book-18-sec-63/64 (Testimonium Flavianum) and any other section whose sole surviving text came from the <del> fallback - see the module doc */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section (M is a plain arabic numeral or the literal string "arg") */
  id: string;
  /** the source's own `n` attribute verbatim: '1'..'20' for a Book, a numeral string or "arg" for a Section */
  number: string | null;
  /** always null - see the module doc for why the Whiston cross-reference milestones are not fabricated into this field */
  ref: string | null;
  /** Book: Niese's own formulaic contents-heading for that book, verbatim. The book-1 "arg" Section: "Προοίμιον περὶ τῆς ὅλης πραγματείας", verbatim. Every other Section: null. */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'jewish-antiquities-grc' */
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
