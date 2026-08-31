/**
 * Text helpers for the Aristotle importers.
 *
 * There is ONE source of truth for text cleaning in this repo: the Isagoge
 * pilot's helpers. They already implement exactly the rule these importers need
 * — decode standard XML/HTML entities, collapse whitespace, trim, and nothing
 * else (no accent / spelling / orthography / punctuation normalisation). We
 * re-export them here rather than re-implement so the two corpora can never
 * drift apart.
 */

export { cleanText, decodeEntities, collapseWs } from '../import-isagoge-shared/text.ts';
