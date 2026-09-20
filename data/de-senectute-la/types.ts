/**
 * Type definitions for the bundled Cato Maior De Senectute corpora in
 *   data/de-senectute-la/          data/de-senectute-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:de-senectute-la  (scripts/import-de-senectute-la/index.ts)
 *   npm run import:de-senectute-en  (scripts/import-de-senectute-en/index.ts)
 * and validated by
 *   npm run validate:de-senectute-la / validate:de-senectute-en
 *
 * Source: Perseus canonical-latinLit TEI XML.
 *   Latin  - CTS urn:cts:latinLit:phi0474.phi051.perseus-lat2 (ed. W. A.
 *            Falconer, Loeb Classical Library, 1923).
 *   English- CTS urn:cts:latinLit:phi0474.phi051.perseus-eng1 (trans. W. A.
 *            Falconer, "Cato the Elder On Old Age", same 1923 Loeb volume).
 *
 * FLAT one-level tree (no Book division - a single undivided dialogue): each
 * Division is one numbered section, 1..85, no children. Id scheme (falls
 * through to the plain "§ N" label in src/library/genericCorpus.ts):
 * `sec-N`, 1-based plain arabic numeral.
 *
 * IMPORTANT witness-structure difference between the two languages (see each
 * importer's own module doc for the full account): the Latin witness marks
 * every section with an explicit `<div type="textpart" subtype="section"
 * n="N">`, but the English witness (an OLDER Perseus digitisation style, CTS
 * ...perseus-eng1) carries NO section divs at all - sections are recovered
 * from this source's own inline `<milestone unit="section" n="N"/>` markers,
 * which can fall mid-paragraph. Section 36 has no milestone of its own in
 * the English witness (a genuine transcription gap - see anomalies.json);
 * its Latin content is not lost (see data/de-senectute-la), only its English
 * counterpart is not separately addressable.
 *
 * Division.ref is this edition's own chapter citation (e.g. "2"),
 * reconstructed from this source's inline `<milestone unit="chapter"
 * n="…"/>` markers: the value active at the moment a given section closes,
 * or null if none has appeared yet. Passage.ref is always null. Passage.n is
 * always the empty string.
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
  /** section number as an arabic string ('1'..'85') */
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
  /** 'de-senectute-la' | 'de-senectute-en' */
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
