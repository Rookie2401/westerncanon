/**
 * Shared text helpers for the Xenophon importer (mirrors
 * scripts/import-archimedes-shared/text.ts). Never discard or silently
 * correct source text. We only:
 *   - decode standard XML/HTML entities
 *   - normalise to Unicode NFC (a defensive no-op here: all 14 Perseus
 *     tlg0032 Greek source files were independently verified already NFC,
 *     0 code points remapped - see about.json "How it was imported")
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

/** decodeEntities -> normalize('NFC') -> collapseWs, in that order. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
}

/** Count of code points that differ between `decoded` and its NFC form. */
export function nfcDiffCount(decoded: string): number {
  const before = Array.from(decoded);
  const after = Array.from(decoded.normalize('NFC'));
  if (before.length !== after.length) return Math.max(before.length, after.length);
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
  const c = collapseWs(cleanText(s.replace(/<[^>]+>/g, ' ')));
  return c.length > 160 ? `${c.slice(0, 160)}…` : c;
}

/** Same tag-stripping/cleanup as stripTagsForExcerpt, but with NO truncation
 *  - for anomaly log entries that must record a span in full (e.g. <del>
 *  spans, per the "log the full span verbatim, no truncation" policy).
 *  Never used for reading text. */
export function stripTagsForExcerptFull(s: string): string {
  return collapseWs(cleanText(s.replace(/<[^>]+>/g, ' ')));
}
