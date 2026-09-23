/**
 * Type definitions for the bundled English Thucydides History of the
 * Peloponnesian War corpus in
 *   data/thucydides-history-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:thucydides-history-en  (scripts/import-thucydides-history-en/index.ts)
 * and validated by
 *   npm run validate:thucydides-history-en  (scripts/import-thucydides-history-en/validate.ts)
 *
 * Source: Perseus canonical-greekLit TEI XML, CTS urn
 * urn:cts:greekLit:tlg0003.tlg001.perseus-eng6 - Richard Crawley's English
 * translation "The Peloponnesian War" (London/Toronto: J. M. Dent and Sons
 * Ltd.; New York: E. P. Dutton and Co., 1914) - confirmed to be Crawley by
 * direct inspection of this file's own <sourceDesc> (editor role=
 * "translator": Richard Crawley). Perseus also carries two OTHER English
 * translations of Thucydides (perseus-eng4, Thomas Hobbes 1843;
 * perseus-eng5, Benjamin Jowett 1900) - NOT used here; see about.json.
 *
 * Same three-level source (Book -> Chapter -> Section -> <p>) collapsed to
 * Book -> Chapter as the Greek sibling (data/thucydides-history-grc) -
 * parsed completely independently, but confirmed by direct inspection to
 * agree with it exactly, book for book and chapter for chapter (917
 * chapters, same per-book counts, no letter-suffixed chapters).
 *
 * The Melian Dialogue and the Corcyra/Corinth debate (Book 1) are marked in
 * this witness with `<said who="...">` wrappers around each speech turn's
 * paragraph, rather than the Greek's dramatic `<sp>/<speaker>` markup;
 * Crawley's own prose already states the speaker in full ("The Melian
 * commissioners answered:-", printed as its own short paragraph) rather
 * than a Greek-style abbreviated label, so no label text needed to be
 * synthesised - `<said>` is simply unwrapped like any other structural
 * wrapper, its paragraph text kept as printed. See about.json.
 *
 * Id scheme, Division.ref/Passage.ref (always null), and sourceHeading
 * (always null, no <head> rubric in this source) match the app's other
 * Book->Chapter generic works and the Greek sibling.
 *
 * Passage.anomaly is unused (left unset) throughout this English edition.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbers */
  n: string;
  /** verbatim English paragraph (Crawley's translation), whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - this source carries no per-paragraph citation scheme distinct from Book/Chapter */
  ref: string | null;
  /** unused in this edition - see module doc */
  anomaly?: string;
}

export interface Division {
  /** `book-N` for a Book (N = 1-8), `book-N-ch-M` for a Chapter (M is this edition's own 1-based chapter number, contiguous within every book, matching the Greek sibling exactly) */
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
  /** 'thucydides-history-en' */
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
