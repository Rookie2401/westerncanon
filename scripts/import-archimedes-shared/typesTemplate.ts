/**
 * The byte-identical `types.ts` written into every `data/archimedes-<slug>/`
 * output directory (13 copies, one per work) - mirrors the convention already
 * used for the two Isagoge editions (`data/isagoge-grc/types.ts` /
 * `data/isagoge-la/types.ts`), and the same content src/library/types.ts's
 * generic-work shapes mirror exactly. Kept as one canonical string here rather
 * than hand-duplicated 13 times; scripts/import-archimedes/index.ts writes it
 * into each work directory on every import run.
 */
export const ARCHIMEDES_TYPES_FILE = `/**
 * Type definitions for one bundled Archimedes work corpus in
 * \`data/archimedes-<slug>/\`.
 *
 * Generated (do not hand-edit) by scripts/import-archimedes/index.ts and
 * validated by scripts/import-archimedes-shared/validate.ts. Byte-identical
 * across all 13 Archimedes work directories - see
 * scripts/import-archimedes-shared/typesTemplate.ts, the single source of
 * truth this file is copied from.
 *
 * Source: First1KGreek / Perseus canonical-greekLit TEI (Charles Mugler's
 * Bude edition, Archimede, Les Belles Lettres, Paris 1970-72), CTS urn
 * \`urn:cts:greekLit:tlg0552\`.
 */

export type Lang = 'grc';

export interface PassageFigure {
  /** same-origin path to a real diagram image, when one is bundled (see about.json) */
  image?: string;
  /** pixel dimensions of the image, so the reader can reserve its aspect ratio
   *  before the (mask-only, intrinsically sizeless) image loads. Set whenever image is set. */
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  /** exact edition/book/section citation this figure marker traces to */
  source: string;
  /** honest marker shown when no image is bundled */
  note?: string;
}

export interface Passage {
  /** paragraph number as printed; '' where the source paragraph is unnumbered */
  n: string;
  /** verbatim Greek paragraph: entities decoded, NFC-normalised, ws collapsed */
  text: string;
  /** canonical scholarly ref for this passage (see the work's about.json), or null */
  ref: string | null;
  /** optional note when something irregular was preserved (e.g. an editorial gap) */
  anomaly?: string;
  /** optional diagram marker (see about.json "Known gaps & anomalies") */
  figure?: PassageFigure;
}

export interface Division {
  /** slug, workId-prefixed; e.g. 'archimedes-sand-reckoner-ch-1' */
  id: string;
  /** printed section/chapter number as a string ('pr','pr1','pr2','1'..'N'), or
   *  Roman numeral for a Book container ('I'/'II'); never null */
  number: string | null;
  /** canonical span for this division, or null (see the work's about.json) */
  ref: string | null;
  /** verbatim heading from the source, or null when the printed head is only a
   *  bare numeral (redundant with \`number\`) */
  sourceHeading: string | null;
  /** English, EDITORIAL (not source text) - always null in this corpus: every
   *  individual chapter/section is labelled by number only (see about.json) */
  editorialTitle: string | null;
  /** non-empty only for the 3 multi-book works' top-level Book containers */
  children: Division[];
  /** [] for a Book container; the division's own passages otherwise */
  passages: Passage[];
}

export interface GenericWork {
  workId: string;
  language: Lang;
  divisions: Division[];
}
`;
