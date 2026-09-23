/**
 * The 11-play ground-truth table for this importer, verified by direct
 * inspection of every cached response before this file was written (see
 * scripts/import-aristophanes-en/raw/ and index.ts's module doc):
 *   - all 11 subpage titles come from a `list=allpages` query under
 *     "Aristophanes: The Eleven Comedies/" (raw/allpages.json) - exactly 11,
 *     matching the traditional 11 surviving comedies.
 *   - 9 of the 11 are ordinary wikitext (action=query&prop=revisions returns
 *     the real prose); the other 2 (Peace, Lysistrata) are djvu page-scan
 *     transclusions (wikitext is only a `<pages .../>` marker) and were
 *     fetched as rendered HTML instead (action=parse&prop=text).
 *   - each wikitext play's own speaker-cue convention (shape A/B/C) was
 *     confirmed by inspecting its cached wikitext - see wikitextPlay.ts.
 */

export type Technique = 'wikitext' | 'pagescan';
export type Shape = 'A' | 'B' | 'C';

export interface PlayMeta {
  slug: string;
  /** the exact Wikisource subpage title, e.g. "Acharnians" */
  pageTitle: string;
  technique: Technique;
  /** only meaningful when technique === 'wikitext' */
  shape?: Shape;
  rawFile: string;
  /**
   * Plutus only: its front pages (title, Dramatis Personæ) turned out to be
   * a page-scan transclusion even though the play body itself, a few pages
   * later on the SAME Wikisource page, is ordinary wikitext (see
   * wikitextPlay.ts's module doc) - so its cast list has to be recovered
   * from the RENDERED HTML separately from the wikitext-parsed body.
   */
  dpRawFile?: string;
}

export const PLAYS: PlayMeta[] = [
  { slug: 'acharnians', pageTitle: 'Acharnians', technique: 'wikitext', shape: 'A', rawFile: 'acharnians.json' },
  { slug: 'knights', pageTitle: 'Knights', technique: 'wikitext', shape: 'B', rawFile: 'knights.json' },
  { slug: 'clouds', pageTitle: 'Clouds', technique: 'wikitext', shape: 'A', rawFile: 'clouds.json' },
  { slug: 'wasps', pageTitle: 'Wasps', technique: 'wikitext', shape: 'B', rawFile: 'wasps.json' },
  { slug: 'peace', pageTitle: 'Peace', technique: 'pagescan', rawFile: 'peace-html.json' },
  { slug: 'birds', pageTitle: 'Birds', technique: 'wikitext', shape: 'A', rawFile: 'birds.json' },
  { slug: 'lysistrata', pageTitle: 'Lysistrata', technique: 'pagescan', rawFile: 'lysistrata-html.json' },
  { slug: 'thesmophoriazusae', pageTitle: 'Thesmophoriazusae', technique: 'wikitext', shape: 'C', rawFile: 'thesmophoriazusae.json' },
  { slug: 'frogs', pageTitle: 'Frogs', technique: 'wikitext', shape: 'A', rawFile: 'frogs.json' },
  { slug: 'ecclesiazusae', pageTitle: 'Ecclesiazusae', technique: 'wikitext', shape: 'A', rawFile: 'ecclesiazusae.json' },
  { slug: 'plutus', pageTitle: 'Plutus', technique: 'wikitext', shape: 'C', rawFile: 'plutus.json', dpRawFile: 'plutus-html.json' },
];

export function workId(slug: string): string {
  return `aristophanes-${slug}-en`;
}
