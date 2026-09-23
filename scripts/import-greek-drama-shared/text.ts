/**
 * Shared text helpers for the Greek-drama importer (Aeschylus/Sophocles/
 * Euripides, and later Aristophanes). Mirrors scripts/import-archimedes-shared/
 * text.ts's guiding rule: never discard or silently correct source text. We
 * only:
 *   - decode standard XML entities (&amp; &lt; &gt; &quot; &apos; &nbsp;,
 *     numeric &#NNN; / &#xHH;) - the drama corpus was verified to use only
 *     &amp; in practice, but the others are handled defensively
 *   - normalise to Unicode NFC (defensive; the canonical-greekLit source files
 *     were found already NFC in spot checks, but this is checked per file,
 *     never assumed)
 *   - collapse runs of whitespace to a single space and trim (only for text
 *     assembled WITHIN one line/paragraph - never across line boundaries,
 *     which the drama importer joins with an explicit "\n" itself)
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

/** decodeEntities -> normalize('NFC') -> collapseWs, in that order. Applied to
 *  every individual line/paragraph/heading string produced by the drama
 *  importer; multi-line joins ("\n" between verse lines, "\n\n" between
 *  cast-list entries) are applied AFTER this, by the caller, never before. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
}

/** Count of code points that differ between `decoded` (post entity-decode,
 *  pre-normalise) and its NFC form - see archimedes-shared/text.ts for the
 *  same helper's rationale. */
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
