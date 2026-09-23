/**
 * Shared text helpers for the "rest of Aristotle" Greek importer.
 *
 * Guiding rule (mirrors every other importer in this repo): never discard or
 * silently correct source text. We only:
 *   - decode standard XML/HTML entities
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

export function collapseWs(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** decodeEntities -> normalize('NFC') -> collapseWs, in that order. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
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

export function excerpt(s: string, max = 160): string {
  const c = collapseWs(s);
  return c.length > max ? `${c.slice(0, max)}…` : c;
}

/**
 * Clean a raw Bekker-page mark string (from `<note type="marginal">` or a
 * `<milestone>` `n` attribute) into canonical "184a" form, or null if it
 * doesn't look like a Bekker page/column citation (e.g. a bare line number
 * that was tagged the same way in a couple of source files - see per-work
 * anomalies). Strips a leading "p."/"pg" label and internal whitespace
 * (several First1KGreek files wrap a mark across a line break, e.g.
 * "p.\n  482b"), but does NOT invent or correct a value - if what remains
 * doesn't match `\d+[ab]` (optionally with a trailing digit run, e.g. a
 * source line-number suffix which is dropped and logged separately by the
 * caller), it is reported as unparseable rather than guessed at.
 */
export function cleanBekkerMark(raw: string): string | null {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^p\.?\s*/i, '');
  s = s.replace(/\s+/g, '');
  s = s.replace(/,/g, '');
  const m = /^(\d+)\s*([ab])(?:\d+)?$/i.exec(s);
  if (!m) return null;
  return `${m[1]}${m[2]!.toLowerCase()}`;
}
