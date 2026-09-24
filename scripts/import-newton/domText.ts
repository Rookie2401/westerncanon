/**
 * DOM-aware text extraction shared by the Latin and English Principia
 * page-scan parsers. Walks a cloned element's nodes in document order,
 * converting `<math>` subtrees via mathml.ts (see that module for the
 * printed-notation convention), `<sup>`/`<sub>` via the same "^x"/"_x"
 * convention (for the plain HTML superscripts English prints, e.g.
 * "R<sup>n</sup>"), unwrapping `<i>`/`<b>`/`<span>` emphasis, and dropping
 * pure transport nodes (page-number anchors, `<style>`, `<link>`, `<br>`).
 */
import type { JSDOMElement } from 'jsdom';
import { mathToText } from './mathml.ts';

const DROP_SELECTOR = 'style, link, .pagenum, .ws-pagenum, .pagenum-inner, .mw-editsection';
/** U+200B ZERO WIDTH SPACE - written via fromCharCode rather than a literal in a regex/string, which eslint's no-irregular-whitespace rule (rightly) flags. */
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

export function cleanText(s: string): string {
  return s
    .replace(/­/g, '') // soft hyphen (line-wrap artefact)
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬅ/g, 'ft')
    .replace(/ﬆ/g, 'st')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extracts the reading text of `el` (a cloned/detached element is fine), converting math/sup/sub per this module's convention. */
export function extractText(el: JSDOMElement): string {
  const clone = el.cloneNode(true);
  clone.querySelectorAll(DROP_SELECTOR).forEach((n) => n.remove());
  clone.querySelectorAll('br').forEach((n) => n.replaceWith(' '));

  // Replace <math> subtrees with their text-flattened equivalent BEFORE the
  // generic walk, so the walk never has to special-case MathML internals.
  clone.querySelectorAll('math').forEach((m) => {
    const doc = m.ownerDocument;
    if (!doc) return;
    const text = mathToText(m);
    m.replaceWith(doc.createTextNode(` ${text} `));
  });
  clone.querySelectorAll('sup').forEach((s) => {
    const doc = s.ownerDocument;
    if (!doc) return;
    s.replaceWith(doc.createTextNode(`^${(s.textContent ?? '').trim()}`));
  });
  clone.querySelectorAll('sub').forEach((s) => {
    const doc = s.ownerDocument;
    if (!doc) return;
    s.replaceWith(doc.createTextNode(`_${(s.textContent ?? '').trim()}`));
  });

  return cleanText((clone.textContent ?? '').split(ZERO_WIDTH_SPACE).join(''));
}

/** True when `el`'s only content is a page-number anchor / whitespace / <br> (i.e. it contributes nothing to the reading text). */
export function isEmptyFurniture(el: JSDOMElement): boolean {
  const clone = el.cloneNode(true) as JSDOMElement;
  clone.querySelectorAll(DROP_SELECTOR).forEach((n) => n.remove());
  return cleanText((clone.textContent ?? '').split(ZERO_WIDTH_SPACE).join('')).length === 0;
}
