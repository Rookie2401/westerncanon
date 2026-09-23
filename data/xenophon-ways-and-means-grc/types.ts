/**
 * Type definitions for one bundled Xenophon work corpus in
 * `data/xenophon-<slug>-grc/`.
 *
 * Generated (do not hand-edit) by scripts/import-xenophon/index.ts and
 * validated by scripts/import-xenophon-shared/validate.ts. Byte-identical
 * across all 14 Xenophon Greek work directories - see
 * scripts/import-xenophon-shared/typesTemplate.ts, the single source of
 * truth this file is copied from.
 *
 * Source: Perseus canonical-greekLit TEI, CTS urn `urn:cts:greekLit:tlg0032`.
 * language: 'grc' - E. C. Marchant's Greek text (Xenophontis Opera Omnia, Oxford: Clarendon Press, 1900-1921)
 *
 * Two structural shapes appear across the 14 works (see this work's
 * about.json "The edition" section for which one applies here):
 *  - book -> chapter (4 works: Hellenica, Memorabilia, Anabasis, Cyropaedia).
 *    A Book division (id `book-N`) is a container only (children, no
 *    passages of its own); a Chapter division (id `book-N-ch-M`) is a leaf
 *    with exactly one Passage, folding together every <p> under that
 *    chapter's (finer, uncited-separately) <div subtype="section"> children,
 *    in citation-number order, joined with "\n\n".
 *  - flat chapter (9 works) or flat section (Apology only, which has no
 *    chapter level in the source at all): a flat top-level list of leaf
 *    Divisions (id `ch-N` or `sec-N`), each with exactly one Passage, same
 *    section-folding rule as above.
 * Rendering note: `ch-N`/`sec-N` ids deliberately do NOT match this app's
 * `book-N-ch-M` pattern, so they render as the generic "§ N" - intentional,
 * since Perseus's own citation scheme for these works is chapter/section-
 * number based, not "Book"/"Chapter" prose labels.
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no separate paragraph numbers (only the section numbers folded into the parent Division - see about.json "Reference scheme") */
  n: string;
  /** verbatim Greek paragraph text: entities decoded, NFC-normalised, whitespace collapsed */
  text: string;
  /** always null - see the work's about.json "Reference scheme" */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. an editorial <add>/<sic>/<corr>, or a <gap> lacuna) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` (Book container), `book-N-ch-M` (Chapter leaf), `ch-N` (flat-chapter leaf), or `sec-N` (Apology's flat-section leaf) */
  id: string;
  /** printed number as a string ('1'..'N'); never null */
  number: string | null;
  /** always null - see the work's about.json */
  ref: string | null;
  /** Book only, Greek only: the verbatim source rubric (e.g. "Ἑλληνικῶν Α"); null everywhere else */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added anywhere in this corpus */
  editorialTitle: string | null;
  /** non-empty only for a Book container in the 4 book-structured works */
  children: Division[];
  /** [] for a Book container; exactly one Passage for every leaf */
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
