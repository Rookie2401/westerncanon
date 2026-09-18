/**
 * Text helpers for the Hesiod importers.
 *
 * There is ONE source of truth for text cleaning in this repo: the Isagoge
 * pilot's helpers (decode standard XML/HTML entities, collapse whitespace,
 * trim, and nothing else - no accent / spelling / orthography / punctuation
 * normalisation). Re-exported here rather than re-implemented, mirroring
 * scripts/import-aristotle-shared/text.ts, so the corpora can never drift apart.
 */

export { cleanText, decodeEntities, collapseWs } from '../import-isagoge-shared/text.ts';
