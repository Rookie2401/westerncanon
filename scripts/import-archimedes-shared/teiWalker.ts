/**
 * Single-pass tokenising walker over a First1KGreek/Perseus EpiDoc TEI file for
 * one Archimedes work (`urn:cts:greekLit:tlg0552.tlgNNN`).
 *
 * Structure (verified against all 13 fetched files): <body> contains exactly
 * one <div type="edition" ...> wrapping either
 *   - flat chapters:      <div type="textpart" subtype="chapter" n="pr|N">...
 *   - 2 books of chapters: <div type="textpart" subtype="book" n="1|2"> containing
 *                          <div type="textpart" subtype="chapter" n="pr|N">...
 *   - tlg013 only:         <div type="textpart" subtype="chapter" n="1|2"> containing
 *                          <div type="textpart" subtype="section" n="1|2|3">...
 *
 * This walker is deliberately generic over that nesting: it builds a WalkDiv
 * tree mirroring the source exactly, and the driver (scripts/import-archimedes)
 * decides how to map book/chapter/section onto the app's Division tree per
 * work. It does NOT itself enforce the ground-truth section counts - that is
 * the driver's job, so a mismatch can be reported with full per-work context.
 *
 * Markup handled (see the importer spec for the exact rules):
 *   <pb n>, <lb n>            - stripped from reading text (kept for ref tracking)
 *   <head>...</head>          - captured verbatim (cleaned) IFF it is the first
 *                               thing in its div (before any <p> or child div);
 *                               never included in the reading text itself
 *   <del>...</del>            - EXCLUDED from reading text; every occurrence's
 *                               excerpt is recorded on the enclosing paragraph
 *   <add cause="omitted">...</add> - INCLUDED in reading text (editor's
 *                               conjectural restoration); every occurrence's
 *                               excerpt is also recorded (distinct from <del>)
 *   <gap reason="omitted"/>   - self-closing lacuna; NO text contributed; counted
 *   <figure>...<graphic/>...</figure> - counted per paragraph; the driver
 *                               attaches an honest-marker PassageFigure
 *   <lg>, <l>, <l rend=...>   - flattened: tags stripped, inner text kept
 *   <num>, <note>             - never appear in this corpus (verified); not
 *                               specially handled (would fall through the
 *                               generic catch-all if they ever did, i.e. tag
 *                               stripped, text kept - safe default)
 */

import { cleanText, decodeEntities, stripTagsForExcerpt } from './text.ts';

export type DivKind = 'edition' | 'book' | 'chapter' | 'section';

export interface WalkParagraph {
  /** verbatim reading text: entities decoded, NFC-normalised, ws collapsed,
   *  <lb>/<pb> -> space, <del> excluded, <add cause="omitted"> included,
   *  <gap> excluded, <lg>/<l> flattened */
  text: string;
  /** Mugler page current at this paragraph's first character */
  startPage: string;
  /** Mugler page current at this paragraph's last character */
  endPage: string;
  gapCount: number;
  addCount: number;
  /** cleaned excerpt of each <add cause="omitted"> found in this paragraph */
  addExcerpts: string[];
  /** cleaned excerpt of each <del> found in this paragraph (content dropped) */
  delExcerpts: string[];
  figureCount: number;
}

export interface WalkDiv {
  kind: DivKind;
  /** the div's `n` attribute; null only for the root edition div */
  n: string | null;
  /** cleaned <head> text if this div opens with one, else null */
  head: string | null;
  /** <p> elements that are DIRECT children of this div (not inside a nested div) */
  paragraphs: WalkParagraph[];
  children: WalkDiv[];
}

const TOKEN_RE =
  /<div type="textpart" subtype="(book|chapter|section)" n="([^"]*)"[^>]*>|<div type="edition"[^>]*>|<\/div>|<pb n="([^"]*)"\s*\/>|<lb n="[^"]*"\s*\/>|<head>([\s\S]*?)<\/head>|<p>|<\/p>|<del>|<\/del>|<add cause="omitted">|<\/add>|<gap reason="omitted"\s*\/>|<figure>|<[^>]+>/g;

export interface WalkResult {
  root: WalkDiv;
  /** every <pb n> value encountered, in document order (for monotonicity checks) */
  pbValues: string[];
}

export function walkEdition(xml: string, fileLabel: string): WalkResult {
  const bodyStart = xml.indexOf('<body>');
  const bodyEnd = xml.lastIndexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) {
    throw new Error(`${fileLabel}: no <body>...</body> found`);
  }
  const body = xml.slice(bodyStart, bodyEnd);

  const editionOpenRe = /<div type="edition"[^>]*>/;
  const editionOpen = editionOpenRe.exec(body);
  if (!editionOpen) {
    throw new Error(`${fileLabel}: no <div type="edition"> found`);
  }

  let curPage = '';
  const pbValues: string[] = [];
  const stack: WalkDiv[] = [];
  let root: WalkDiv | null = null;

  let inP = false;
  let buf = '';
  let pStartPage = '';
  let pGap = 0;
  let pAdd = 0;
  const pAddExcerpts: string[] = [];
  const pDelExcerpts: string[] = [];
  let pFig = 0;
  // A <figure> can sit directly between </p> and the next <p> (illustrating
  // the construction the upcoming paragraph is about to carry out), rather
  // than inside either paragraph's own text. Track those separately so they
  // carry forward into the paragraph that opens next, instead of vanishing
  // when pFig resets to 0 for it.
  let pendingFig = 0;

  let delDepth = 0;
  let delOpenEnd = 0;
  let addDepth = 0;
  let addOpenEnd = 0;

  TOKEN_RE.lastIndex = editionOpen.index;
  let lastIndex = editionOpen.index;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(body))) {
    const tok = m[0];

    // free text between the previous token and this one
    if (inP && delDepth === 0 && m.index > lastIndex) {
      buf += body.slice(lastIndex, m.index);
    }
    lastIndex = TOKEN_RE.lastIndex;

    if (tok.startsWith('<div type="textpart"')) {
      const kind = m[1] as 'book' | 'chapter' | 'section';
      const n = m[2];
      const div: WalkDiv = { kind, n, head: null, paragraphs: [], children: [] };
      if (stack.length) stack[stack.length - 1].children.push(div);
      stack.push(div);
    } else if (tok.startsWith('<div type="edition"')) {
      root = { kind: 'edition', n: null, head: null, paragraphs: [], children: [] };
      stack.push(root);
    } else if (tok === '</div>') {
      // A pendingFig here means a <figure> sat between the division's last
      // </p> and this </div>, with no following <p> in the same division to
      // carry it forward into (the usual case - see the <p> handler above).
      // It's a trailing diagram for the proof that just ended, so attach it
      // backward onto that division's own last paragraph instead of letting
      // it leak into whatever division opens next.
      if (pendingFig > 0) {
        const closing = stack[stack.length - 1];
        const lastP = closing?.paragraphs[closing.paragraphs.length - 1];
        if (!lastP) {
          throw new Error(
            `${fileLabel}: ${pendingFig} <figure> marker(s) at the end of an empty division, with no paragraph to attach to`,
          );
        }
        lastP.figureCount += pendingFig;
        pendingFig = 0;
      }
      stack.pop();
    } else if (tok.startsWith('<pb ')) {
      curPage = m[3] ?? '';
      pbValues.push(curPage);
      if (inP) buf += ' ';
    } else if (tok.startsWith('<lb ')) {
      if (inP) buf += ' ';
    } else if (tok.startsWith('<head>')) {
      const headRaw = m[4] ?? '';
      const top = stack[stack.length - 1];
      if (top && top.head === null && top.paragraphs.length === 0 && top.children.length === 0) {
        top.head = cleanText(headRaw);
      }
    } else if (tok === '<p>') {
      inP = true;
      buf = '';
      pStartPage = curPage;
      pGap = 0;
      pAdd = 0;
      pAddExcerpts.length = 0;
      pDelExcerpts.length = 0;
      pFig = pendingFig;
      pendingFig = 0;
    } else if (tok === '</p>') {
      inP = false;
      const text = cleanText(buf);
      const top = stack[stack.length - 1];
      top.paragraphs.push({
        text,
        startPage: pStartPage,
        endPage: curPage,
        gapCount: pGap,
        addCount: pAdd,
        addExcerpts: [...pAddExcerpts],
        delExcerpts: [...pDelExcerpts],
        figureCount: pFig,
      });
    } else if (tok === '<del>') {
      delDepth += 1;
      delOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</del>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(delOpenEnd, m.index)));
      pDelExcerpts.push(excerpt);
      delDepth = Math.max(0, delDepth - 1);
      if (inP) buf += ' ';
    } else if (tok === '<add cause="omitted">') {
      addDepth += 1;
      addOpenEnd = TOKEN_RE.lastIndex;
      pAdd += 1;
    } else if (tok === '</add>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(addOpenEnd, m.index)));
      pAddExcerpts.push(excerpt);
      addDepth = Math.max(0, addDepth - 1);
    } else if (tok.startsWith('<gap ')) {
      pGap += 1;
    } else if (tok === '<figure>') {
      if (inP) pFig += 1;
      else pendingFig += 1;
    }
    // else: generic catch-all <[^>]+> (e.g. <lg>, </lg>, <l>, <l rend="...">,
    // </l>, <graphic .../>, </figure>) - tag stripped, any enclosed free text
    // keeps flowing through the normal inter-token append above.
  }

  if (!root) throw new Error(`${fileLabel}: root edition div never closed`);
  return { root, pbValues };
}
