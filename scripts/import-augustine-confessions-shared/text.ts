/**
 * Shared text helpers for the Confessions importers (Latin + English).
 *
 * Guiding rule (mirrors scripts/import-isagoge-shared/text.ts and every other
 * importer in this repo): never discard or silently correct source reading
 * text. We only:
 *   - decode standard XML/HTML entities (named + numeric)
 *   - collapse runs of whitespace to a single space and trim
 *   - strip wiki/HTML TRANSPORT markup (never content)
 * No accent, spelling, orthography or punctuation normalisation of any kind.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
};

/** Decode named + numeric (`&#NNN;` / `&#xHH;`) HTML/XML entities generically. */
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

/**
 * Strip a MediaWiki `<ref>...</ref>` footnote span entirely (apparatus /
 * translator-note material, never part of the running reading text in this
 * repo's convention). Returns the stripped text and the verbatim inner text
 * of every span removed, so the caller can log each one to anomalies.json.
 */
export function stripRefs(input: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  const text = input.replace(/<ref>([\s\S]*?)<\/ref>/g, (_whole, inner: string) => {
    removed.push(inner.trim());
    return ' ';
  });
  return { text, removed };
}

/**
 * Strip MediaWiki italic markup (a run of exactly two apostrophes opens/closes
 * italics; a run of three is an italic-close immediately abutting a literal
 * apostrophe/quote-mark character, which is left in place). This app's
 * Passage.text is plain prose with no rich-text model, so italic formatting
 * markup is transport scaffolding like `{{templates}}` or `<center>` tags -
 * stripped, while the literal words (and any single apostrophes/quote marks)
 * are kept verbatim. Returns the stripped text and how many `''` pairs were
 * removed, for a single corpus-level anomaly note.
 */
export function stripItalicMarkup(input: string): { text: string; count: number } {
  let count = 0;
  const text = input.replace(/''/g, () => {
    count += 1;
    return '';
  });
  return { text, count };
}
