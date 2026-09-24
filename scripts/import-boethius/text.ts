/**
 * Shared text helpers for the Boethius importer. Mirrors
 * scripts/import-isagoge-shared/text.ts's rule: never discard or silently
 * correct source text - only decode standard XML entities and collapse
 * whitespace.
 */

export { cleanText, collapseWs, decodeEntities } from '../import-isagoge-shared/text.ts';
import { cleanText } from '../import-isagoge-shared/text.ts';

/** Strip every XML tag from a fragment, leaving only its text content (entities left encoded for the caller to decode). */
export function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/**
 * Split a verse fragment on `<lb/>` (English Wikisource/Perseus line-break
 * markers) into cleaned, non-empty lines, joined with "\n" - the app's
 * established verse convention (see data/iliad-en/work.json).
 */
export function joinLbLines(fragment: string): string {
  return fragment
    .split(/<lb\s*\/>/i)
    .map((chunk) => cleanText(stripTags(chunk)))
    .filter((l) => l.length > 0)
    .join('\n');
}

/**
 * Split a Latin verse fragment's `<l n="...">...</l>` elements into cleaned,
 * non-empty lines, joined with "\n".
 */
export function joinLLines(fragment: string): string {
  const lines: string[] = [];
  const re = /<l\b[^>]*>([\s\S]*?)<\/l>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) {
    const cleaned = cleanText(stripTags(m[1]!));
    if (cleaned.length > 0) lines.push(cleaned);
  }
  return lines.join('\n');
}

/** Join cleaned paragraph strings with a blank line, this app's established prose convention. */
export function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.filter((p) => p.length > 0).join('\n\n');
}

/**
 * Render one paragraph-level unit's raw inner fragment: pair up `<q>...</q>`
 * spans that are fully self-contained WITHIN this fragment and wrap them in
 * straight double quotes (reflecting what the printed edition shows, since
 * this XML carries no literal quotation-mark characters); any `<q>`/`</q>`
 * tag left unpaired after that (its partner lies in a DIFFERENT unit - see
 * extractProseUnits below) is dropped with no quote mark synthesised,
 * because placing one correctly across a paragraph boundary would be
 * invented, not read from the source; strip remaining tags/entities/
 * whitespace. Returns the cleaned text and how many unpaired `<q>` markers
 * were dropped.
 */
export function renderProseUnit(raw: string): { text: string; unpairedQ: number } {
  const withMilestones = raw.replace(/<milestone\b[^>]*\/>/g, ' ').replace(/<pb\b[^>]*\/>/g, ' ').replace(/<note\b[^>]*\/?>(?:[\s\S]*?<\/note>)?/g, ' ');
  const paired = withMilestones.replace(/<q\b[^>]*>([\s\S]*?)<\/q>/g, '"$1"');
  const unpairedQ = (paired.match(/<\/?q\b[^>]*>/g) ?? []).length;
  const noStrayQ = paired.replace(/<\/?q\b[^>]*>/g, '');
  return { text: cleanText(stripTags(noStrayQ)), unpairedQ };
}

/**
 * Extract EVERY paragraph-level unit of prose from a section/chapter's raw
 * inner XML, in document order - not just the content of `<p>...</p>`
 * elements, but also any text sitting OUTSIDE a `<p>` at the same nesting
 * level (a real pattern in this source: short interlocutor exchanges, e.g.
 * `<q>Vix,</q> inquam, <q>...</q>`, appear as bare text between two `<q>
 * <p>...</p></q>`-wrapped speeches, with NO enclosing `<p>` of their own -
 * see this importer's parseConsolatioLa.ts/parseConsolatioEn.ts module docs
 * for the concrete example that surfaced this bug: earlier revisions of
 * this importer read only `<p>` content and silently dropped these
 * exchanges, which are Boethius's own dialogue turns).
 *
 * `<p>` never nests in this source, so a single linear scan for `<p>...
 * </p>` spans - treating everything between/around them as its own "loose"
 * unit - is sufficient; each resulting unit (loose or `<p>`-sourced) is
 * rendered independently via renderProseUnit, so a `<q>` that wraps one or
 * more WHOLE `<p>` elements (spanning outside this unit's own boundary)
 * never gets a fabricated quote mark - only `<q>` spans that are fully
 * inline within a single unit do.
 */
export function extractProseUnits(chunk: string): { units: string[]; looseUnits: number; unpairedQ: number } {
  const units: string[] = [];
  let looseUnits = 0;
  let unpairedQ = 0;
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const pushLoose = (raw: string): void => {
    const { text, unpairedQ: uq } = renderProseUnit(raw);
    unpairedQ += uq;
    if (text.length > 0) {
      units.push(text);
      looseUnits += 1;
    }
  };
  while ((m = pRe.exec(chunk))) {
    pushLoose(chunk.slice(lastIndex, m.index));
    const { text, unpairedQ: uq } = renderProseUnit(m[1]!);
    unpairedQ += uq;
    if (text.length > 0) units.push(text);
    lastIndex = pRe.lastIndex;
  }
  pushLoose(chunk.slice(lastIndex));
  return { units, looseUnits, unpairedQ };
}

/**
 * NFC-normalise final reading text. The raw XML mixes precomposed and
 * decomposed (base + combining accent) Greek characters; applied once, at
 * every point a Passage.text or Division.sourceHeading is finalised, so the
 * bundled corpus is consistently NFC throughout (a purely representational
 * normalisation - the same rendered characters, never a change of content).
 */
export function nfc(s: string): string {
  return s.normalize('NFC');
}

const excerptOf = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};
export { excerptOf as excerpt };
