/**
 * Text helpers for the "rest of Aristotle" ENGLISH importers (the batch of
 * public-domain Oxford "Works of Aristotle" translations added under
 * data/<slug>-en/ by scripts/import-<slug>-en/).
 *
 * There is ONE source of truth for text cleaning in this repo: the Isagoge
 * pilot's helpers (decode standard XML/HTML entities, collapse whitespace,
 * trim - and nothing else: no modernising, no spelling/punctuation/accent
 * normalisation, no silent correction). This module re-exports them rather
 * than re-implementing, exactly as scripts/import-aristotle-shared/text.ts
 * does, so these corpora can never drift apart from the rest of the library.
 *
 * NOTE for maintainers: this directory is deliberately named
 * `import-aristotle-rest-en-shared`, NOT `import-aristotle-rest*`. The bare
 * `scripts/import-aristotle-rest*` namespace is reserved for the concurrent
 * GREEK-side import of the same works; nothing here touches it.
 */

export { cleanText, decodeEntities, collapseWs } from '../import-isagoge-shared/text.ts';

/** A machine-readable departure/judgement-call/gap record, as written to data/<slug>-en/anomalies.json. */
export interface Anomaly {
  where: string;
  note: string;
}
