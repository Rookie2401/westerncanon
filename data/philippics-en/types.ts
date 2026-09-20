/**
 * Type definitions for the bundled English Philippics corpus in
 *   data/philippics-en/
 *
 * Generated (do not hand-edit) by
 *   npm run import:philippics-en  (scripts/import-philippics-en/index.ts)
 * and validated by
 *   npm run validate:philippics-en  (scripts/import-philippics-en/validate.ts)
 *
 * Source: Perseus/OpenGreekAndLatin canonical-latinLit TEI XML, CTS urn
 * urn:cts:latinLit:phi0474.phi035.perseus-eng1 - Charles Duke Yonge, trans.,
 * *The Orations of Marcus Tullius Cicero, Vol. 4* (London: Bell, 1856),
 * "Philippics". (Note the witness id: perseus-eng1, NOT -eng2 as most other
 * English witnesses in this corpus - this is the only English Perseus
 * digitization of the Philippics.)
 *
 * Same logical id scheme as the Latin sibling (Speech = `speech-N` 1..14,
 * Section = `speech-N-sec-M`), but reconstructed from a STRUCTURALLY
 * INVERTED source encoding, independently confirmed by direct inspection:
 * this witness nests `<div type="textpart" subtype="chapter" n="K">` divs
 * directly under each speech (the traditional "chapter" IS the div level
 * here), and marks the finer section boundary with an inline
 * `<milestone unit="section" n="M"/>` INSIDE each chapter div - the exact
 * opposite of the Latin sibling (section-div / chapter-milestone). The
 * importer flattens this: a new Section begins at every `<milestone
 * unit="section">` (numbered continuously across the whole speech, matching
 * the Latin sibling's own section numbering scheme), and Division.ref is
 * whichever chapter div is currently open when that milestone is seen. A
 * section's text may continue past a chapter-div boundary with no new
 * section milestone (confirmed to happen at least once, e.g. Philippic 2 -
 * see anomalies.json); such a section's ref still reflects the chapter
 * active at its OWN start, not wherever it happens to end.
 *
 * Chapter and section are independently numbered systems in Ciceronian
 * scholarship (chapter the older, coarser one; section the finer modern
 * one) and frequently don't nest cleanly: 93 of the 543 sections here are
 * confirmed to receive real paragraph text after a later chapter div has
 * already opened than the one they started in - each logged individually
 * to anomalies.json with its start/end chapter numbers. Separately, one
 * genuine gap exists in this source's own section-milestone numbering
 * (Philippic 2 jumps from 23 straight to 25, no milestone for 24 at all) -
 * also logged individually; this witness accordingly holds 543 Sections
 * where the Latin sibling holds 544.
 *
 * Also unlike the Latin sibling, every speech here opens with a
 * `subtype="argument"` div (one speech - Philippic 2 - misspells this
 * `subtype="argumnt"` in the source; both are recognised) headed "THE
 * ARGUMENT." - Yonge's own prose summary of that oration's historical
 * background, not a translation of Cicero's words. Excluded from the
 * reading text (the importer only collects text from `chapter` divs, after
 * skipping the argument div) - see about.json.
 *
 * Each Section carries exactly ONE Passage, its accumulated text (all
 * `<p>` content between one section milestone and the next, possibly
 * spanning a chapter-div boundary) joined with "\n\n" at paragraph breaks.
 * Passage.n is '' throughout; Passage.ref is always null. Speech
 * Division.ref is always null.
 */

export type Lang = 'en';

export interface Passage {
  /** always '' - no finer per-paragraph numbering is printed in this source */
  n: string;
  /** verbatim English translation (Yonge's own wording), whitespace collapsed, entities decoded */
  text: string;
  /** always null - see the module doc */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** `speech-N` for a Speech, `speech-N-sec-M` for a Section */
  id: string;
  /** arabic string ('1'..'14' for a Speech, '1'..N for a Section) */
  number: string | null;
  /** Section only: the chapter number active when this section's own milestone was seen, as a plain arabic numeral string; null for a Speech or when no chapter div yet precedes */
  ref: string | null;
  /** Speech only: the source's own oration-title rubric (its second `<head>`, e.g. "THE FIRST PHILIPPIC."), verbatim; null for a Section */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for this work */
  editorialTitle: string | null;
  /** Speech -> children are Sections; Section -> [] */
  children: Division[];
  /** [] for a Speech (a container only); exactly [one Passage] for a Section */
  passages: Passage[];
}

export interface GenericWork {
  /** 'philippics-en' */
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
