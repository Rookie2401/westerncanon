/**
 * The byte-identical \`types.ts\` written into every \`data/<workId>/\` output
 * directory of this importer (one per work) - mirrors the convention used by
 * scripts/import-archimedes-shared/typesTemplate.ts. Kept as one canonical
 * string here rather than hand-duplicated ~40 times; scripts/import-
 * aristotle-rest/index.ts writes it into each work directory on every run.
 */
export const ARISTOTLE_REST_TYPES_FILE = `/**
 * Type definitions for one bundled Aristotle Greek work in \`data/<workId>/\`.
 *
 * Generated (do not hand-edit) by scripts/import-aristotle-rest/index.ts and
 * validated by scripts/import-aristotle-rest-shared/validate.ts. Byte-identical
 * across every work directory this importer produces - see
 * scripts/import-aristotle-rest-shared/typesTemplate.ts, the single source of
 * truth this file is copied from. Greek text ONLY.
 *
 * Id scheme (matches data/physics-grc/types.ts, read by
 * src/library/genericCorpus.ts's kindLabel/BOOK_ID/CHAPTER_ID so these render
 * as "Book N"/"Chapter N"): where the source has real Books, Book = \`book-N\`,
 * Chapter = \`book-N-ch-M\` (both 1-based arabic, chapter numbers as the
 * source itself prints them - not necessarily restarting at 1 in every book;
 * see about.json's "Known gaps & anomalies" when they don't). Where the
 * source has no Book-level division at all, the work uses a FLAT list of
 * \`ch-N\` Chapters instead (renders "§ N") - see about.json's "Reference
 * scheme" section for which shape this particular work uses.
 *
 * Reference scheme: Division.ref for a Chapter is the Bekker page/column
 * citation (or RANGE) covered by that chapter, built from the citation marks
 * actually present in the source (see about.json) - null where the source
 * carries none. A Book's own ref is always null (it is a container only).
 * Where a source nests a further level below Chapter (e.g. a "section"),
 * that level's own number survives as Passage.n rather than being discarded.
 */

export type Lang = 'grc';

export interface Passage {
  /** the nested source level's own number below Chapter (e.g. "3", or "3.2"
   *  two levels down), or '' when the chapter has no further subdivision */
  n: string;
  /** verbatim Greek text: entities decoded, NFC-normalised, whitespace
   *  collapsed, apparatus resolved as documented in anomalies.json */
  text: string;
  /** always null for this corpus (see Division.ref for the chapter's own citation) */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. an editorial insertion) */
  anomaly?: string;
}

export interface Division {
  /** \`book-N\` / \`book-N-ch-M\` where the source has Books, else flat \`ch-N\` */
  id: string;
  /** printed book/chapter number as the source gives it; never null */
  number: string | null;
  /** Chapter: the Bekker page/column citation this chapter covers, or null.
   *  Always null for a Book (a container only). */
  ref: string | null;
  /** verbatim running header/title from the source when the importer judged
   *  it worth preserving structurally, else null (see about.json) */
  sourceHeading: string | null;
  /** the source's own book/part label, ONLY when it is not simply that
   *  book's sequential numeral (e.g. a named part like "prol"); null otherwise */
  editorialTitle: string | null;
  /** Book -> its Chapters; Chapter -> [] (always a leaf in this corpus, even
   *  where the source itself nests deeper - deeper levels fold into Passages) */
  children: Division[];
  /** [] for a Book (container only); one or more Passages for a Chapter */
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
`;
