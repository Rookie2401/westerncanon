/**
 * Type definitions for the bundled English texts of Cicero's *Brutus* and
 * *Orator* (data/brutus-en/, data/orator-en/).
 *
 * Generated (do not hand-edit) by
 *   npm run import:brutus-en   (scripts/import-brutus-en/index.ts)
 *   npm run import:orator-en   (scripts/import-orator-en/index.ts)
 * and validated by
 *   npm run validate:brutus-en (scripts/import-brutus-en/validate.ts)
 *   npm run validate:orator-en (scripts/import-orator-en/validate.ts)
 *
 * Source (BOTH works): Project Gutenberg ebook #9776, "Cicero's Brutus, or
 * History of Famous Orators; also His Orator, or Accomplished Speaker",
 * trans. E. Jones (London: B. White, 1776) - one shared plain-text file
 * containing both works back to back; see
 * scripts/import-cicero-brutus-orator-shared/ for the common fetch/split
 * logic each importer calls independently.
 *
 * IMPORTANT: this file is kept byte-identical across both data dirs
 * (brutus-en, orator-en).
 *
 * Structural notes for both works - READ CAREFULLY, this differs from the
 * Latin siblings:
 *
 * Jones's 1776 translation prints NO chapter/section numbers of any kind
 * (confirmed by direct inspection of the whole shared source file: no
 * Roman numerals, no bracketed numbers, no marginal citation of any sort
 * anywhere in either work's running text - only a single decorative
 * type-ornament line near the very end of Orator, which is not a
 * structural device). There is therefore no way to recover, from this
 * source itself, a section numbering that corresponds to the Latin
 * edition's own Wilkins section/chapter numbers - inventing one would be
 * fabrication, not transcription.
 *
 * Per the task brief's own fallback guidance, each English edition here is
 * instead divided into a "handful of large sequential sections" - FLAT,
 * `sec-N` - produced purely mechanically by this importer for readable
 * navigation: paragraphs (as delimited by the source's own blank lines) are
 * grouped in document order into chunks of roughly equal size (a target
 * character count per chunk; a chunk never splits a paragraph), and each
 * chunk becomes one Division, numbered 1..N in reading order. `children` is
 * always []; Division.ref and Passage.ref are null throughout; Division.n
 * / Passage.n are always the plain sequential chunk number / ''.
 *
 * These `sec-N` numbers are ONLY this importer's own reading-convenience
 * chunk sequence - they do NOT correspond to, and should never be read as
 * citing, the Latin edition's `sec-N` (Wilkins) section numbers. See
 * about.json for the exact chunking parameters and a reader-facing
 * disclosure of this limitation.
 */

export type Lang = 'la' | 'grc' | 'en';

export interface Passage {
  /** always '' - this source prints no paragraph numbering */
  n: string;
  /** verbatim English paragraph(s) (Jones, 1776), whitespace collapsed, italic-underscore markup stripped */
  text: string;
  /** null throughout (see module doc) */
  ref: string | null;
  /** optional note when something irregular was preserved */
  anomaly?: string;
}

export interface Division {
  /** 'sec-1'..'sec-N' - this importer's own sequential reading-chunk id, see module doc */
  id: string;
  /** plain arabic sequential chunk number (reading order only, not a citation) */
  number: string | null;
  /** null throughout (see module doc) */
  ref: string | null;
  /** null throughout: this source prints no per-chunk rubric (chunk boundaries are this importer's own) */
  sourceHeading: string | null;
  /** null throughout (no editorial titles assigned) */
  editorialTitle: string | null;
  /** [] throughout (flat, one level deep) */
  children: Division[];
  /** exactly one Passage per chunk; its paragraphs are joined with "\n\n" (rendered as real paragraph breaks - see src/index.css .gr-passage__text) */
  passages: Passage[];
}

export interface GenericWork {
  /** 'brutus-en' | 'orator-en' */
  workId: string;
  language: Lang;
  divisions: Division[];
}
