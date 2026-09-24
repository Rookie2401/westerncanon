/**
 * The byte-identical `types.ts` written into every `data/<workId>/` output
 * directory of this importer - mirrors the convention used by every other
 * generic-work importer in this repo (e.g. import-aristotle-rest-shared/
 * typesTemplate.ts). Kept as one canonical string here rather than
 * hand-duplicated per work. scripts/import-ptolemy/index.ts writes it into
 * each work directory on every run.
 */
export const PTOLEMY_TYPES_FILE = `/**
 * Type definitions for one bundled Ptolemy work in \`data/<workId>/\`.
 *
 * Generated (do not hand-edit) by scripts/import-ptolemy/index.ts and
 * validated by scripts/import-ptolemy/validate.ts. Mirrors src/library/
 * types.ts exactly (the app's real generic-work schema, incl. PassageFigure).
 *
 * Id scheme: Book = \`book-N\`, Chapter = \`book-N-ch-M\` (both as the source
 * edition itself numbers/labels them - M is not always a plain arabic
 * integer; see about.json's "Reference scheme" section for this work's own
 * numbering, incl. any non-numeric chapter label such as a book's own
 * "table of contents" section). One Passage per Chapter: its \`text\` is that
 * chapter's paragraphs joined by a blank line ("\\n\\n"), verbatim.
 *
 * A \`<figure>\` (diagram) marker found inside a chapter's source span is
 * carried as \`Passage.figure\`: an honest \`{ source, note }\` marker (no
 * image is fabricated) when the source diagram itself carries no recoverable
 * text, or a table's own text (still \`Passage.figure.note\`, the exact table
 * text) when the source printed a numeric/table figure whose cells the
 * transcription itself carries as text (e.g. Almagest's Table of Chords) -
 * see about.json's "Diagrams and tables" section for the exact convention
 * and anomalies.json for every individual occurrence.
 */

export type Lang = 'grc' | 'en';

export interface PassageFigure {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  alt?: string;
  source: string;
  note?: string;
}

export interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
  figure?: PassageFigure;
}

export interface Division {
  id: string;
  number: string | null;
  ref: string | null;
  sourceHeading: string | null;
  editorialTitle: string | null;
  children: Division[];
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
