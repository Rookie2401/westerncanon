// Re-export the authoritative corpus interfaces. The single source of truth is
// data/summa/types.ts, generated alongside the JSON and validated by
// `npm run validate:summa`. App code imports from here.
export type {
  Article,
  FilledCitation,
  FilledLacunae,
  Objection,
  Part,
  PartCode,
  PartId,
  PartManifest,
  Prooemium,
  Question,
  Reply,
  SedContra,
  SummaIndex,
  SearchRecord,
  WitnessId,
} from '../../data/summa/types.ts';
