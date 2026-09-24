/**
 * Emits the per-work data/<workId>/types.ts file, structurally identical to
 * scripts/import-greek-drama-shared/genericTypes.ts and to every other
 * generic-work data/<workId>/types.ts in this app (see
 * data/de-bello-gallico-la/types.ts) - a generated, do-not-hand-edit mirror
 * of src/library/types.ts's Passage / Division / GenericWork / WorkAbout*.
 */

export function emitTypesTs(workId: string, title: string, language: 'la' | 'en', isConsolatio: boolean): string {
  const shapeDoc = isConsolatio
    ? ` * Two-level tree, Book -> Section (matches this app's other generic-work\n` +
      ` * Book->Chapter shapes): a Book division has children (its sections) and no\n` +
      ` * passages of its own; a section division has exactly one passage and no\n` +
      ` * children. Id scheme: Book = \`book-N\` (1-5), section = \`book-N-sec-<n>\`\n` +
      ` * where \`<n>\` is this edition's own section-number string (see\n` +
      ` * scripts/import-boethius/parseConsolatioLa.ts / parseConsolatioEn.ts for\n` +
      ` * the exact, source-verified numbering in each language - Latin and English\n` +
      ` * number their sections differently and are never forced to agree).\n`
    : ` * A flat list of chapter divisions (no nesting): \`ch-pr\` (preface, only for\n` +
      ` * the tractates that have one) then \`ch-1\`, \`ch-2\`, ... - or, where this\n` +
      ` * edition marks no internal chapter divisions at all, a single division\n` +
      ` * \`ch-1\` holding the whole tractate. See\n` +
      ` * scripts/import-boethius/parseTractateLa.ts / parseTractateEn.ts for the\n` +
      ` * exact, source-verified structure of this particular tractate.\n`;

  return `/**
 * Type definitions for the bundled ${title} (${language === 'la' ? 'Latin' : 'English'}) corpus in
 *   data/${workId}/
 *
 * Generated (do not hand-edit) by
 *   npm run import:boethius  (scripts/import-boethius/index.ts)
 * and validated by
 *   npm run validate:boethius  (scripts/import-boethius/validate.ts)
 *
 * Source: Boethius, "Theological Tractates" / "The Consolation of
 * Philosophy", ed. & trans. H. F. Stewart and E. K. Rand (Loeb Classical
 * Library 74, 1918), digitised by the Perseus Digital Library /
 * OpenGreekAndLatin canonical-latinLit repository (CTS author id
 * stoa0058). See about.json for the full provenance and licence
 * disclosure, and anomalies.json for every irregularity preserved from the
 * source.
 *
${shapeDoc} *
 * Division.ref and Passage.ref are always null: none of these sources
 * carries a page-marker or line-milestone citation scheme this schema
 * could use. Passage.n is always '' (no source carries a printed
 * paragraph number at this level).
 */

export type Lang = '${language}';

export interface Passage {
  /** always '' - these sources print no paragraph/line numbers at this level */
  n: string;
  /** verbatim text: prose paragraphs joined with a blank line, or verse lines joined with "\\n" - see about.json */
  text: string;
  /** always null - see module doc */
  ref: string | null;
  /** optional note when something irregular was preserved; see anomalies.json for the full log */
  anomaly?: string;
}

export interface Division {
  id: string;
  /** this edition's own division number/label, exactly as printed (never renumbered) */
  number: string | null;
  /** always null - see module doc */
  ref: string | null;
  /** this edition's own heading text where the source prints one, else null */
  sourceHeading: string | null;
  /** always null - no editorial gloss is added for any division in this corpus */
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
`;
}
