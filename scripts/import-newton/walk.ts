/**
 * Shared document-order token walker for the Principia page-scan parser.
 * See mathml.ts / domText.ts for the text-extraction conventions this relies on.
 */
import { JSDOM, type JSDOMElement } from 'jsdom';
import { extractText, isEmptyFurniture } from './domText.ts';

export type Token =
  | { kind: 'heading'; text: string }
  | { kind: 'content'; text: string }
  | { kind: 'figure'; alt: string };

const SKIP_TAGS = new Set(['STYLE', 'LINK', 'HR', 'BR']);

function isCenterDiv(el: JSDOMElement): boolean {
  if (el.tagName !== 'DIV') return false;
  const align = el.getAttribute('align');
  const cls = String(el.className ?? '');
  return align === 'center' || /\bwst-center\b/.test(cls);
}

/** Heading lines inside a center wrapper: every font-size-styled span (English) UNION every <p> text (Latin) - deduplicated by node identity via a Set, in document order. */
function headingLinesOf(center: JSDOMElement): string[] {
  const spans = [...center.querySelectorAll('span[style*="font-size"]')];
  if (spans.length > 0) {
    return spans.map((s) => (s.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0);
  }
  // Latin style: one heading line per direct <p> (no font-size spans at all).
  return [...center.querySelectorAll('p')].map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0);
}

function figureAlt(fig: JSDOMElement): string {
  const img = fig.querySelector('img');
  return (img?.getAttribute('alt') ?? img?.getAttribute('src') ?? '').trim();
}

/** Recursively walks `root`'s children in document order, emitting heading/content/figure tokens. */
function walkNode(root: JSDOMElement, tokens: Token[], warnings: string[]): void {
  for (const child of [...root.children] as JSDOMElement[]) {
    const tag = child.tagName;
    if (SKIP_TAGS.has(tag)) continue;
    if (tag === 'SPAN' && /\bpagenum\b/.test(String(child.className ?? ''))) continue;
    if (tag === 'FIGURE') {
      tokens.push({ kind: 'figure', alt: figureAlt(child) });
      continue;
    }
    if (isCenterDiv(child)) {
      for (const line of headingLinesOf(child)) tokens.push({ kind: 'heading', text: line });
      continue;
    }
    if (tag === 'P' || tag === 'DL' || tag === 'DD' || tag === 'DT' || tag === 'BLOCKQUOTE' || tag === 'TABLE') {
      if (isEmptyFurniture(child)) continue;
      const text = extractText(child);
      if (text.length > 0) tokens.push({ kind: 'content', text });
      continue;
    }
    if (tag === 'DIV') {
      // wst-hanging-indent (enunciation), or any other structural wrapper we
      // did not anticipate: recurse, since content nested one level deeper
      // than expected is still real reading text, never furniture by default.
      if (isEmptyFurniture(child)) continue;
      const cls = String(child.className ?? '');
      if (/\bwst-hanging-indent\b/.test(cls) || /\btiInherit\b/.test(cls) === false) {
        const text = extractText(child);
        if (text.length > 0 && child.querySelector('div,p,dl,table,figure') === null) {
          tokens.push({ kind: 'content', text });
          continue;
        }
      }
      warnings.push(`recursing into unrecognised <div class="${cls}">`);
      walkNode(child, tokens, warnings);
      continue;
    }
    if (tag === 'MATH' || tag === 'math') {
      // A displayed equation sitting directly under the content root (not
      // inside a <p>) - confirmed genuine (e.g. Liber I Sect. II prints
      // several formulas as their own centred line). extractText() converts
      // it via mathml.ts exactly as it would inline within a paragraph.
      const text = extractText(child);
      if (text.trim().length > 0) tokens.push({ kind: 'content', text: text.trim() });
      continue;
    }
    if (tag === 'SUP' || tag === 'SUB') {
      // Bare top-level superscript/subscript (rare - a stray exponent with no
      // wrapping <p>): apply the same "^x"/"_x" convention domText.ts uses
      // inline, since extractText() on the element itself cannot see its own
      // wrapping tag.
      const text = extractText(child);
      if (text.length > 0) tokens.push({ kind: 'content', text: `${tag === 'SUP' ? '^' : '_'}${text}` });
      continue;
    }
    if (tag === 'SPAN' || tag === 'A' || tag === 'I' || tag === 'B' || tag === 'EM' || tag === 'STRONG' || tag === 'U') {
      // Stray inline content sitting directly under the content root with no
      // wrapping <p> - confirmed genuine in this source: several enunciations
      // (e.g. Liber I Prop. XLVIII, Liber II Sect. VII Lemma IV) print their
      // italicised enunciation as a bare <i>...</i> sibling, not inside a <p>.
      if (isEmptyFurniture(child)) continue;
      const text = extractText(child);
      if (text.length > 0) tokens.push({ kind: 'content', text });
      continue;
    }
    // Anything else unexpected at this level: recurse defensively rather than
    // silently drop it, and log so it can be reviewed.
    warnings.push(`unrecognised top-level tag <${tag.toLowerCase()}> - recursing`);
    walkNode(child, tokens, warnings);
  }
}

export function tokenizePage(html: string): { tokens: Token[]; warnings: string[]; blockCount: number } {
  const doc = new JSDOM(html).window.document;
  const blocks = [...doc.querySelectorAll('div.prp-pages-output')] as JSDOMElement[];
  const tokens: Token[] = [];
  const warnings: string[] = [];
  for (const b of blocks) walkNode(b, tokens, warnings);
  return { tokens, warnings, blockCount: blocks.length };
}
