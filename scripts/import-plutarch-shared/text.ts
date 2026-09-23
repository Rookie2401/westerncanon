/**
 * Shared text helpers for the Plutarch importer. Mirrors
 * scripts/import-archimedes-shared/text.ts. Guiding rule: never discard or
 * silently correct source text. We only:
 *   - decode standard XML/HTML entities (defensive - the fetched tlg0007
 *     witnesses were verified to carry zero XML entities of any kind; every
 *     Greek and English character is already a literal Unicode code point)
 *   - normalise to Unicode NFC
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

/** Collapse all whitespace (incl. NBSP / newlines / tabs) to single spaces and trim. */
export function collapseWs(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** decodeEntities -> normalize('NFC') -> collapseWs, in that order. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
}

/**
 * Count of code points that differ between `decoded` (post entity-decode,
 * pre-normalise) and its NFC form - reported per work as a hygiene anomaly,
 * even when (as verified for this corpus) it is 0.
 */
export function nfcDiffCount(decoded: string): number {
  const before = Array.from(decoded);
  const after = Array.from(decoded.normalize('NFC'));
  if (before.length !== after.length) {
    return Math.max(before.length, after.length);
  }
  let n = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) n++;
  return n;
}

/** Standalone combining diacritics (should be zero after NFC normalisation). */
export function isCombiningCp(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  );
}

export function hasCombining(s: string): boolean {
  for (const ch of s) if (isCombiningCp(ch.codePointAt(0) ?? 0)) return true;
  return false;
}

/** Rough tag-stripping for short excerpts embedded in anomaly messages only
 *  (never used for reading text). */
export function stripTagsForExcerpt(s: string): string {
  return collapseWs(s.replace(/<[^>]+>/g, ' '));
}
