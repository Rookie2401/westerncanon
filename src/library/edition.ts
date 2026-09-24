/**
 * Editions of the library. The same codebase ships as two sibling sites:
 *
 *   - `en`       the English edition: every English text - translations and
 *                works written in English (Shakespeare, Newton's Opticks...).
 *   - `original` the original-language edition: every Greek, Latin and
 *                Italian text, plus the English-original works ported as is
 *                (an English original IS its original language).
 *   - `all`      the merged library (dev server and tests): everything.
 *
 * Selected at build time by VITE_EDITION (scripts/build-editions.mjs builds
 * both); the registry exposes only the selected edition's works and authors,
 * and scripts/copy-corpus.mjs bundles only its data, so each site is
 * self-contained and precaches only what it lists.
 */
import type { Work } from './types.ts';

export type Edition = 'en' | 'original' | 'all';

function readEdition(): Edition {
  const raw = (import.meta.env.VITE_EDITION as string | undefined) ?? 'all';
  if (raw === 'en' || raw === 'original' || raw === 'all') return raw;
  throw new Error(`VITE_EDITION must be en | original | all, got "${raw}"`);
}

export const EDITION: Edition = readEdition();

/** A work written in English (no translator): it belongs to BOTH editions. */
export function isEnglishOriginal(w: Work): boolean {
  return w.language === 'en' && !w.source.translator;
}

export function inEdition(w: Work, edition: Edition = EDITION): boolean {
  if (edition === 'all') return true;
  if (edition === 'en') return w.language === 'en';
  return w.language !== 'en' || isEnglishOriginal(w);
}

export const EDITION_NAME: Record<Edition, string> = {
  en: 'English edition',
  original: 'Original-language edition',
  all: 'Complete library',
};

/** Relative link to the sibling edition (the two sites are deployed as
 *  <site>/ and <site>/original/); null for the merged dev build. */
export const SIBLING_EDITION: { name: string; href: string } | null =
  EDITION === 'en'
    ? { name: EDITION_NAME.original, href: './original/' }
    : EDITION === 'original'
      ? { name: EDITION_NAME.en, href: '../' }
      : null;
