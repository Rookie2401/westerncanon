/**
 * Type definitions for the bundled English Jewish Antiquities corpus in
 *   data/jewish-antiquities-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:jewish-antiquities-en  (scripts/import-jewish-antiquities-en/index.ts)
 * and validated by
 *   npm run validate:jewish-antiquities-en  (scripts/import-jewish-antiquities-en/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0526.tlg001.perseus-eng2 - William Whiston, trans.,
 * "Antiquities of the Jews", in *The Works of Flavius Josephus* (Auburn and
 * Rochester, NY: Alden and Beardsley, 1856 printing; Whiston's translation
 * was originally published 1737).
 *
 * TWO-level tree, Book -> Section, matching the Greek sibling's own shape
 * (confirmed by direct inspection: `<div type="textpart" subtype="book"
 * n="N">` (20 books, N = 1..20) directly containing `<div type="textpart"
 * subtype="section" n="M">`, no chapter level in between). A Book division
 * has children (its Sections) and no passages of its own; a Section
 * division has exactly one Passage and no children.
 *
 * Id scheme (matches the Greek sibling): Book = `book-N`, Section =
 * `book-N-sec-M`. UNLIKE the Greek sibling, this witness carries NO "arg"
 * sections at all - Whiston's translation does not reproduce Niese's
 * book-opening argumentum tables of contents (confirmed: zero `n="arg"`
 * occurrences). 1444 Section divisions total (84/76/79/88/98/83/76/85/54/
 * 52/54/68/87/111/67/61/61/57/52/51 for books 1-20 respectively).
 *
 * M is this witness's own `n` attribute verbatim - the same CTS canonical
 * section-number scheme as the Greek sibling (matching Niese's numbering,
 * for cross-edition alignment), but NOT sequential/coverage-complete here:
 * Whiston's own translated paragraphing is coarser than Niese's fine-grained
 * section division, so one English Section div's `n` is the FIRST Niese
 * section number its (typically multi-Niese-section) paragraph covers, and
 * intervening Niese numbers simply have no Section div of their own in this
 * witness. Whiston's OWN traditional section numbering (a third, different
 * scheme from Niese's) is instead recorded only via inline `<milestone
 * unit="Whiston_section" n="K"/>` markers WITHIN a Section's text, resetting
 * to 1 at the start of each book; like the matching `<milestone
 * unit="Whiston_chapter" n="K"/>` markers (Whiston's own traditional
 * chapter numbers, "pr." for the preface then 1, 2, 3...), these are
 * dropped as scaffolding this app's schema has no field for - see
 * Division.ref below and anomalies.json.
 *
 * One confirmed, genuine numbering irregularity in this source: Book 17's
 * Section sequence runs ...,317,321,324,332, THEN "13" (out of order, not
 * increasing), THEN 342,345,349,354 - i.e. one Section div's own `n`
 * attribute is "13" where the surrounding context implies a much larger
 * number was intended; it coincides exactly with the start of Whiston's own
 * Chapter 13 (`<milestone unit="Whiston_chapter" n="13"/>` fires on this
 * same div), suggesting the source's own encoding mistakenly copied the
 * chapter number into the section-numbering attribute at this one point.
 * Kept verbatim as printed (id `book-17-sec-13`, no collision with any
 * other Section in that book) rather than silently corrected; logged
 * individually in anomalies.json. Every other Section-number sequence in
 * both editions is confirmed strictly increasing within its book.
 *
 * Division.sourceHeading: Book prints its own `<head>` (Whiston's own
 * title-and-date-range banner for the book, e.g. "Book I ... CONTAINING THE
 * INTERVAL OF THREE THOUSAND EIGHT HUNDRED AND THIRTY-THREE YEARS. FROM THE
 * CREATION TO THE DEATH OF ISAAC.") - captured verbatim as that Book's
 * sourceHeading. A Section ALSO carries its own sourceHeading whenever the
 * source prints a `<head>` as the very first thing inside that Section's
 * div (confirmed always true when present - never mid-section): this
 * happens for the book's very first Section ("Preface", Book 1 Section 1
 * only) and for every Section that opens one of Whiston's own traditional
 * chapters (his own descriptive chapter title, e.g. "THE CONSTITUTION OF
 * THE WORLD AND THE DISPOSITION OF THE ELEMENTS.") - 276 `<head>` elements
 * total (20 Book heads + 256 Section heads). Every other Section has
 * sourceHeading null.
 *
 * Division.ref is null throughout (Book and Section alike) - see above.
 *
 * Each Section carries exactly ONE Passage: every `<p>` found directly or
 * indirectly under that section's div, in document order, joined with
 * "\n\n". Two Sections (Book 11, embedding official letters/decrees quoted
 * in full) nest a `<quote>` containing its OWN `<p>` elements inside an
 * already-open outer `<p>` (4 nested `<p>` opens total, confirmed the only
 * such nesting in either source file, never deeper than one extra level);
 * rather than merging or dropping any text, each nested `<p>` boundary is
 * treated as its own paragraph-join point exactly like a normal sibling
 * `<p>` would be, so the outer paragraph's own text is itself split around
 * the quoted material - logged once as an aggregate anomaly disclosing this
 * deviation from the usual "one Section-Passage per <p> array" rule (no
 * text is lost or altered by it). Passage.n is '' throughout; Passage.ref
 * is always null.
 *
 * `<note resp="editor">...</note>` (558 occurrences - Whiston's/the
 * digitiser's own editorial footnotes, not part of Josephus's text) is
 * EXCLUDED entirely, tag and content, matching this app's established
 * translator-footnote convention (e.g. in-verrem-en's Yonge notes);
 * summarised once in anomalies.json rather than logged individually given
 * the volume. This witness carries NO `<del>`/`<gap>` apparatus of any
 * kind (confirmed zero occurrences) - Whiston's translation presents the
 * disputed "Testimonium Flavianum" passage (Book 18, the Greek sibling's
 * book-18-sec-63/64) as ordinary, unmarked running text; see
 * data/jewish-antiquities-grc/types.ts and anomalies.json for how the
 * Greek sibling's own edition brackets that same passage as a probable
 * interpolation.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim English text (Whiston's own translation, 1737/1856), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved (unused in this witness - kept for schema symmetry with the Greek sibling) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book, `book-N-sec-M` for a Section */
  id: string;
  /** the source's own `n` attribute verbatim: '1'..'20' for a Book, a numeral string for a Section (see the module doc for why these are not sequential/coverage-complete) */
  number: string | null;
  /** always null - see the module doc for why the Whiston cross-reference milestones are not fabricated into this field */
  ref: string | null;
  /** Book: Whiston's own title/date-range banner for that book, verbatim. A Section that opens with its own `<head>` (the book's first Section, or one that begins a Whiston chapter): that heading, verbatim. Every other Section: null. */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'jewish-antiquities-en' */
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
