/**
 * Type definitions for the bundled Greek Thucydides History of the
 * Peloponnesian War corpus in
 *   data/thucydides-history-grc/
 *
 * Generated (do not hand-edit) by
 *   npm run import:thucydides-history-grc  (scripts/import-thucydides-history-grc/index.ts)
 * and validated by
 *   npm run validate:thucydides-history-grc  (scripts/import-thucydides-history-grc/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0003.tlg001.perseus-grc2 - Thucydides, Ἱστορίαι
 * ("Historiae"), ed. Henry Stuart Jones (Oxford: Oxford University Press,
 * 1910; reprinted 1942).
 *
 * Three-level source (Book -> Chapter -> Section -> <p>) collapsed to the
 * same two-level Book -> Chapter GenericWork shape used throughout this app.
 * Chapter numbering is a plain 1-based contiguous integer sequence within
 * every book (no letter-suffixed chapters, unlike Herodotus) - 8 books, 917
 * chapters total (146/103/116/135/116/105/87/109).
 *
 * The Melian Dialogue (Book 5, chapters 87-111 in this edition) is written
 * in dramatic dialogue form: each of its 34 `<sp><speaker>ΑΘ.</speaker>
 * <p>...</p></sp>` turns (ΑΘ. = Athenians, ΜΗΛ. = Melians) has its short
 * Greek speaker label PREPENDED, verbatim, to that turn's paragraph text
 * (e.g. "ΑΘ. εἰ μὲν τοίνυν ..."), exactly as this edition prints it - the
 * label is genuine reading text here, not apparatus (mirrors this app's
 * established Plato-dialogue <label> convention of keeping the speaker
 * prefix inline). See about.json for the full disclosure.
 *
 * Id scheme, Division.ref/Passage.ref (always null), and sourceHeading
 * (always null, no <head> rubric in this source) match the app's other
 * Book->Chapter generic works.
 *
 * Passage.anomaly is set on a Chapter's single Passage only for the Melian
 * Dialogue chapters, noting that the passage begins with a source-printed
 * speaker label.
 */

export type Lang = 'grc';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim Greek paragraph, whitespace collapsed to single spaces, entities decoded; Melian-Dialogue turns are prefixed with their source-printed speaker label ("ΑΘ. "/"ΜΗΛ. ") */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme distinct from Book/Chapter */
  ref: string | null;
  /** optional note when this chapter's passage begins with a source-printed dialogue speaker label (Melian Dialogue, Book 5) */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book (N = 1-8), `book-N-ch-M` for a Chapter (M is this edition's own 1-based chapter number, contiguous within every book) */
  id: string;
  /** arabic string ('1'..'8' for a Book; '1'..N for a Chapter) */
  number: string | null;
  /** always null - see the module doc; this source has no page-marker citation scheme beyond Book/Chapter */
  ref: string | null;
  /** always null - this source has no Book-level <head> rubric */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Book -> children are Chapters; Chapter -> [] */
  children: Division[];
  /** [] for a Book (a container only); exactly [one Passage] for a Chapter */
  passages: Passage[];
}

export interface GenericWork {
  /** 'thucydides-history-grc' */
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
