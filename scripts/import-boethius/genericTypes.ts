/**
 * Internal working types for the Boethius importer, structurally identical
 * to src/library/types.ts's Passage / Division / GenericWork / WorkAbout*
 * (see scripts/import-greek-drama-shared/genericTypes.ts for the same
 * pattern used by the drama importer). Not one of the per-work
 * data/<workId>/types.ts outputs - those are emitted separately, byte-
 * identical in shape, by ./typesTemplate.ts.
 */

export type Lang = 'la' | 'en';

export interface Passage {
  n: string;
  text: string;
  ref: string | null;
  anomaly?: string;
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

export interface Anomaly {
  where: string;
  note: string;
}
