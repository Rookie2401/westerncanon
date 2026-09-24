/**
 * Shared text helpers for the Ptolemy importer (copied/adapted from
 * scripts/import-aristotle-rest-shared/text.ts - see that file for the
 * guiding rule: never discard or silently correct source text; only decode
 * entities, NFC-normalise, and collapse whitespace).
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const cp = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : whole;
    }
    const rep = NAMED_ENTITIES[body.toLowerCase()];
    return rep ?? whole;
  });
}

export function collapseWs(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** decodeEntities -> normalize('NFC') -> collapseWs, in that order. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
}

export function isCombiningCp(cp: number): boolean {
  return (cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) || (cp >= 0x1dc0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff) || (cp >= 0xfe20 && cp <= 0xfe2f);
}

export function hasCombining(s: string): boolean {
  for (const ch of s) if (isCombiningCp(ch.codePointAt(0) ?? 0)) return true;
  return false;
}

/** Rough tag-stripping for short excerpts embedded in anomaly messages only. */
export function stripTagsForExcerpt(s: string): string {
  return collapseWs(s.replace(/<[^>]+>/g, ' '));
}

export function excerpt(s: string, max = 160): string {
  const c = collapseWs(s);
  return c.length > max ? `${c.slice(0, max)}…` : c;
}

/** The one, fixed, honest sentence used in a chapter's Passage.figure.note
 *  when that chapter has exactly one diagram-only <figure> marker (no
 *  transcribed content of its own) - matches data/euclid-elements's own
 *  convention exactly (see its about.json's "Diagrams" section). For 2+ such
 *  markers in the same chapter, index.ts's buildFigure instead states the
 *  count directly (e.g. "3 diagrams appear here…") rather than repeating
 *  this sentence - see that function's doc comment. Kept as a single named
 *  constant so the wording is never typed twice, out of sync, at its two
 *  call sites (index.ts and aboutText.ts). NEVER placed in Passage.text
 *  itself (see validate.ts's module doc for why that would break the
 *  raw-vs-imported text-accounting check). */
export const DIAGRAM_PLACEHOLDER = 'A diagram appears here in the printed edition; not yet available in this build.';
