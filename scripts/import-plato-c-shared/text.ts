/**
 * Shared text helpers for the Plato C importers (Republic, Laws).
 *
 * Guiding rule (mirrors scripts/import-isagoge-shared, scripts/import-euclid):
 * never discard or silently correct source text. We only:
 *   - decode standard XML/HTML entities (none actually occur in these raw
 *     files - they're already plain UTF-8 - but this is kept for safety)
 *   - collapse runs of whitespace to a single space and trim
 * No accent, spelling, orthography or punctuation normalisation of any kind.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decode `&amp; &lt; &gt; &quot; &apos; &nbsp; &#NNN; &#xHH;` - nothing else. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const cp =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : whole;
    }
    const rep = NAMED_ENTITIES[body.toLowerCase()];
    return rep ?? whole;
  });
}

/** Collapse all whitespace (incl. NBSP / newlines) to single spaces and trim. */
export function collapseWs(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** decodeEntities + collapseWs, in that order. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input));
}
