/**
 * Shared type definitions for five bundled Plato dialogue corpora (Greek +
 * English, ten works total):
 *   data/plato-symposium-grc/   data/plato-symposium-en/
 *   data/plato-phaedrus-grc/    data/plato-phaedrus-en/
 *   data/plato-protagoras-grc/  data/plato-protagoras-en/
 *   data/plato-gorgias-grc/     data/plato-gorgias-en/
 *   data/plato-timaeus-grc/     data/plato-timaeus-en/
 *
 * Each is generated (do not hand-edit) by its own importer under
 * scripts/import-plato-<dialogue>-<lang>/index.ts, built on the shared
 * tokenizer in scripts/import-plato-b-shared/parse.ts, and validated by
 *   npx tsx scripts/import-plato-b-shared/validate.ts
 *
 * Flat, ONE-level tree — shallower than the multi-level Euclid/Augustine
 * corpora. None of these five dialogues has a Book division in its source
 * (unlike Republic/Laws, imported elsewhere in this repo): the source
 * TEI segments the running text directly into
 *   <div type="textpart" subtype="section" resp="perseus" n="N">
 * where N is the dialogue's actual STEPHANUS PAGE NUMBER (the real,
 * universally-recognized Plato citation unit, e.g. "172" for the first page
 * of the Symposium — dialogues do not start their Stephanus numbering at 1).
 * So `GenericWork.divisions` is a flat array of Stephanus-page Divisions,
 * each a leaf: `children: []` and exactly ONE Passage, whose `text` is that
 * page's one or more speaker paragraphs joined by "\n\n" (each paragraph
 * starting with its speaker's printed label, e.g. "ΣΩ." / "Soc.", exactly as
 * typeset in the source — the label is real printed text, not editorial).
 *
 * Id scheme: `sec-N` where N is the literal Stephanus page number as
 * printed (e.g. `sec-172`). This deliberately does NOT match
 * src/library/genericCorpus.ts's BOOK_ID / PROPOSITION_ID / CHAPTER_ID
 * regexes, so the shared reader code falls back to that file's plain "§ N"
 * label automatically — correct, intended behaviour for a page-level unit
 * that is neither a Book, Chapter nor Proposition.
 */

export type Lang = 'grc' | 'en';

export interface Passage {
  /** always '' — the Division (Stephanus page) is itself the addressable unit; finer a/b/c/d sub-page lettering is not tracked as a separate numbering axis */
  n: string;
  /** this page's paragraphs (one per source <p>) joined with "\n\n"; each paragraph starts with its speaker's printed label verbatim where the source prints one; whitespace collapsed to single spaces within each paragraph, entities decoded */
  text: string;
  /** always null: the source TEI carries no physical printed-book page/line reference distinct from the Stephanus numbering already carried by the Division itself */
  ref: string | null;
  /** optional note when this page's passage contains a preserved source irregularity (an editorial <add> insertion, e.g.) — see anomalies.json for the full, individually-logged account */
  anomaly?: string;
}

export interface Division {
  /** `sec-N`, N = literal Stephanus page number (e.g. 'sec-172') */
  id: string;
  /** the Stephanus page number as a string, e.g. '172' */
  number: string;
  /** always null (see Passage.ref) */
  ref: string | null;
  /** always null: the source prints no per-page heading/rubric at this granularity */
  sourceHeading: string | null;
  /** always null: no per-page editorial title is fabricated */
  editorialTitle: string | null;
  /** always [] — Stephanus pages are leaves, one level deep */
  children: Division[];
  /** always exactly one Passage */
  passages: Passage[];
}

export interface GenericWork {
  /** e.g. 'plato-symposium-grc' */
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
