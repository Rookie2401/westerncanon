/**
 * Type definitions for the bundled Laelius De Amicitia corpora in
 *   data/de-amicitia-la/          data/de-amicitia-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-amicitia-la  (scripts/import-de-amicitia-la/index.ts)
 *   npm run import:de-amicitia-en  (scripts/import-de-amicitia-en/index.ts)
 * and validated by
 *   npm run validate:de-amicitia-la / validate:de-amicitia-en
 *
 * Source: Perseus canonical-latinLit TEI XML.
 *   Latin  - CTS urn:cts:latinLit:phi0474.phi052.perseus-lat2 (ed. W. A.
 *            Falconer, Loeb Classical Library, 1923).
 *   English- CTS urn:cts:latinLit:phi0474.phi052.perseus-eng2 (trans. W. A.
 *            Falconer, "Laelius on Friendship", same 1923 Loeb volume).
 *
 * FLAT one-level tree (no Book division - Cicero's dialogue on friendship is
 * a single undivided work): each Division is one numbered section
 * (Perseus's own `subtype="section"`), 1..104 in both witnesses, with no
 * children. Id scheme (read by src/library/genericCorpus.ts, which falls
 * through any `sec-N` id to the plain "§ N" label): `sec-N`, 1-based plain
 * arabic numeral, matching the source's own section numbering exactly (both
 * witnesses agree 1:1, section-for-section).
 *
 * Division.ref is this edition's own chapter citation (Cicero's *De
 * Amicitia* is traditionally cited by chapter as well as section, e.g. "2"),
 * reconstructed from this source's inline `<milestone unit="chapter"
 * n="…"/>` markers: the value active at the moment a given section closes
 * (the nearest PRECEDING chapter milestone in document order), or null if no
 * chapter milestone has appeared yet. Passage.ref is always null (no marker
 * is printed at the per-paragraph level). Passage.n is always the empty
 * string (no separate printed paragraph number below the section).
 */

export type Lang = 'la' | 'en';

export interface Passage {
  /** always '' - no printed sub-section paragraph numbering in this source */
  n: string;
  /** verbatim paragraph text, whitespace collapsed to single spaces, entities decoded */
  text: string;
  /** always null - see the module doc; no per-paragraph marker is printed */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `sec-N`, 1-based plain arabic numeral */
  id: string;
  /** section number as an arabic string ('1'..'104') */
  number: string | null;
  /** this edition's chapter citation active at this section (e.g. "2"), or null before the first chapter milestone */
  ref: string | null;
  /** always null - the source prints no per-section rubric */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** always [] - flat, one level deep */
  children: Division[];
  /** exactly [one Passage] */
  passages: Passage[];
}

export interface GenericWork {
  /** 'de-amicitia-la' | 'de-amicitia-en' */
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
