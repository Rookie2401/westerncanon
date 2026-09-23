/**
 * Shared text helpers for the Aristophanes English importer. Mirrors the
 * guiding rule used throughout this repo's importers: never discard or
 * silently correct source text; only decode entities, normalise Unicode and
 * collapse incidental whitespace.
 */

export interface Anomaly {
  where: string;
  note: string;
}

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

/** decodeEntities -> NFC -> collapseWs. Applied to every individual line/paragraph. */
export function cleanText(input: string): string {
  return collapseWs(decodeEntities(input).normalize('NFC'));
}

/**
 * Unwrap wikitext inline markup left over after speaker-cue/footnote
 * extraction: '''bold''', ''italic'', [[link|display]], stray <br/>.
 * Does NOT touch parentheses - those become stage-direction brackets
 * elsewhere, deliberately, not here.
 */
export function unwrapWikitext(s: string): string {
  return s
    .replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1')
    .replace(/'''''|'''|''/g, '')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ');
}

function fail(where: string, msg: string): never {
  process.stderr.write(`STOP (aristophanes text, ${where}): ${msg}\n`);
  process.exit(1);
}

/** Templates verified (by a full-corpus census, see wikitextPlay.ts) to occur
 *  in this batch's 9 plain-wikitext plays. Pure furniture is dropped
 *  entirely; everything else keeps its meaningful content. An UNKNOWN
 *  template stops the run rather than being guessed at. */
const DROP_TEMPLATES = new Set([
  'anchor', 'dhr', 'rule', 'ppb', 'smallrefs', 'reflist', 'default layout',
  'translation-license', 'translation licence', 'pd-old', 'pd-anon-us', 'other translations',
]);
const KEEP_LAST_PARAM = new Set(['larger', 'smaller', 'sup', 'w', 'wikt', 'wikt2', 'anchor link', 'polytonic']);

function resolveOneTemplate(inner: string, where: string): string {
  const parts = inner.split('|');
  const name = (parts[0] ?? '').trim().toLowerCase();
  if (DROP_TEMPLATES.has(name)) return '';
  if (name === 'ellipsis') return '…';
  if (name === 'sic') return (parts[1] ?? '').trim();
  if (KEEP_LAST_PARAM.has(name)) {
    // last NON-EMPTY positional param (e.g. {{anchor link|457||Lysistrata}}
    // carries a blank middle param); falls back to the first param if every
    // later one is blank (e.g. a bare {{wikt|medimnus}}).
    for (let i = parts.length - 1; i >= 1; i--) if ((parts[i] ?? '').trim().length > 0) return parts[i]!.trim();
    return (parts[1] ?? '').trim();
  }
  fail(where, `unknown template "{{${name}}}" in ${JSON.stringify(inner.slice(0, 90))} - refusing to guess whether it is furniture or reading text`);
}

/** Expand every `{{...}}` template, innermost first (mirrors the Aristotle
 *  English-wikitext importers' own resolveTemplates). */
export function resolveTemplates(s: string, where: string): string {
  let out = s;
  for (let guard = 0; guard < 100; guard++) {
    const close = out.indexOf('}}');
    if (close === -1) break;
    const open = out.lastIndexOf('{{', close);
    if (open === -1) break;
    const inner = out.slice(open + 2, close);
    out = out.slice(0, open) + resolveOneTemplate(inner, where) + out.slice(close + 2);
  }
  if (/\{\{/.test(out)) fail(where, `unbalanced template braces survived expansion in ${JSON.stringify(out.slice(0, 200))}`);
  return out;
}

export function hasCombining(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) || (cp >= 0x1dc0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff) || (cp >= 0xfe20 && cp <= 0xfe2f)) return true;
  }
  return false;
}
