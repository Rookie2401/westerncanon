/**
 * Shared text helpers for the Archimedes importer.
 *
 * Guiding rule (mirrors scripts/import-isagoge-shared/text.ts): never discard or
 * silently correct source text. We only:
 *   - decode standard XML/HTML entities (incl. numeric `&#9651;` -> U+25B3 "▵")
 *   - normalise to Unicode NFC (Archimedes-only requirement: 12 of the 13 First1K
 *     source files are NOT NFC-normalised; the diffs are two safe
 *     canonical-equivalence remaps, no combining-mark/decomposition issue)
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

/** Decode `&amp; &lt; &gt; &quot; &apos; &nbsp; &#NNN; &#xHH;` - nothing else.
 *  Numeric decimal entity `&#9651;` decodes to U+25B3 "▵" (real content in this
 *  corpus - a stand-in for "triangle" + a point-letter, e.g. "τριγώνων ▵Ζ"). */
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

/**
 * decodeEntities -> normalize('NFC') -> collapseWs, in that order. This is the
 * ONLY normalisation ever applied to Archimedes reading text: NFC is a
 * canonical-equivalence remap (no accent/breathing loss), applied because 12 of
 * the 13 source files are not already NFC (unlike Isagoge, where the source
 * oxia/tonos code points were deliberately left as transmitted).
 */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
}

/**
 * Count of code points that differ between `decoded` (post entity-decode,
 * pre-normalise) and its NFC form. The two known Archimedes remaps (Greek ano
 * teleia U+0387 -> middle dot U+00B7; a handful of Greek-Extended acute-only
 * vowels -> their monotonic equivalents) are singleton code-point substitutions
 * (no decomposition), so `decoded` and `decoded.normalize('NFC')` are always the
 * same length in this corpus; if that ever stops holding, this falls back to
 * reporting the length delta rather than throwing.
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
