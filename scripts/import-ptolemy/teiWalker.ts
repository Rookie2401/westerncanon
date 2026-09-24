/**
 * Single-pass tokenising walker over a First1KGreek/Perseus EpiDoc TEI file
 * for one of the two Ptolemy Greek sources this importer covers (the
 * Heiberg Almagest, tlg0363.tlg001.1st1K-grc1, and the Robbins/Loeb
 * Tetrabiblos, tlg0363.tlg007.perseus-grc2). Both sources were directly
 * inspected (full body-tag census, `<div>` nesting, every distinct `rend`/
 * `type` attribute value) before this walker was written - see the module
 * docs in workTable.ts for the citations. Unlike import-aristotle-rest-
 * shared/teiWalker.ts (a much larger corpus with a wider tag vocabulary),
 * this walker throws on any UNANTICIPATED tag rather than silently passing
 * it through, so a future re-run against a changed upstream file fails
 * loudly instead of mis-importing.
 *
 * Div nesting: both sources are exactly two levels deep -
 * `<div type="textpart" subtype="book" n="N">` containing one or more
 * `<div type="textpart" subtype="section|chapter" n="M">` leaves (Almagest
 * calls its leaf level "section" - including one `n="toc"` per book, the
 * book's own table of contents, itself real printed content, not a
 * generated index; Tetrabiblos calls it "chapter"). Both map onto this
 * app's `book-N` / `book-N-ch-M` Division id scheme directly - no folding
 * logic is needed beyond that one level (see index.ts).
 *
 * Per-tag handling (confirmed against BOTH sources' actual usage - a tag
 * absent from one source is simply never emitted by it, not unhandled):
 *   <div>, <p>, <head>            - as in every other importer in this repo:
 *                                    a <head> is captured as its div's
 *                                    sourceHeading IFF it is the first thing
 *                                    in that div (before any <p>/child div);
 *                                    never part of reading text.
 *   <lb/>, <pb/>, <l n="N"/>      - zero-width; replaced with a space. (The
 *                                    self-closing `<l n="N"/>` in the
 *                                    Almagest is a scribal line-number tick,
 *                                    NOT a verse-line wrapper - confirmed by
 *                                    direct inspection: it never occurs as a
 *                                    paired `<l>...</l>` in either source.)
 *   <milestone n="N" unit="U"/>   - zero-width page-citation apparatus for
 *                                    an alternate print edition (Tetrabiblos:
 *                                    "Camerarius_2ed_page"); contributes no
 *                                    text and is not logged per-occurrence
 *                                    (disclosed once, in about.json).
 *   <note type="footnote">        - Heiberg's/Robbins's own critical
 *                                    apparatus (textual variants, "corr. ex
 *                                    …", "om. D", etc. - and the one
 *                                    misspelled type="foornote", handled
 *                                    identically). EXCLUDED, logged.
 *   <note type="marginal">        - marginal constellation running-heads in
 *                                    the Almagest star catalogue (Book 7-8),
 *                                    e.g. "Ἄρκτου μικρᾶς" - not a Bekker-style
 *                                    citation mark here (verified: no other
 *                                    citation scheme rides on this tag in
 *                                    either source). EXCLUDED, logged;
 *                                    Division.ref stays null throughout (see
 *                                    about.json's "Reference scheme").
 *   <gap reason="omitted"/>       - a real lacuna in the manuscript tradition
 *                                    (always reason="omitted" in the
 *                                    Almagest, the only source that has it);
 *                                    contributes no text, logged.
 *   <del>...</del>                - text an editor judged spurious/
 *                                    interpolated but the edition still
 *                                    PRINTS, bracketed (OCT convention) -
 *                                    KEPT verbatim, wrapped in `[...]`
 *                                    (or left unbracketed if its own text
 *                                    already contains a literal bracket),
 *                                    logged. Almagest only.
 *   <add>...</add>                - an editorial insertion the edition
 *                                    prints - KEPT inline, logged.
 *                                    Tetrabiblos only (both of its `<add>`
 *                                    spans mark one of the two alternative
 *                                    manuscript endings of Book 4).
 *   <num n="N">TXT</num>          - a numeral printed as ordinary running
 *                                    text (e.g. a degree-count) OUTSIDE a
 *                                    <figure> - unwrapped, TXT kept inline.
 *                                    (INSIDE a <figure>'s <figDesc>, <num>
 *                                    is part of the table apparatus - see
 *                                    below; the two contexts never overlap.)
 *   <figure>...</figure>          - see tableOrFigure.ts. Every occurrence is
 *                                    logged individually and surfaces as this
 *                                    division's single Passage.figure (see
 *                                    typesTemplate.ts's doc comment); its own
 *                                    <graphic/>/<figDesc>/<list>/<item>/
 *                                    <label>/<num> content is consumed
 *                                    entirely inside figure handling and
 *                                    never flows into the surrounding
 *                                    running-prose buffer.
 */

import { cleanText, decodeEntities, stripTagsForExcerpt } from './text.ts';
import { extractFigure } from './tableOrFigure.ts';
import type { FigureResult } from './tableOrFigure.ts';

export interface WalkParagraph {
  text: string;
  delCount: number;
  addCount: number;
}

export interface WalkFigureOccurrence {
  /** raw <figure ...> opening tag attrs, for citation/log purposes */
  attrs: string;
  result: FigureResult;
}

export interface WalkDiv {
  type: 'edition' | 'textpart';
  subtype: string | null;
  n: string | null;
  head: string | null;
  paragraphs: WalkParagraph[];
  figures: WalkFigureOccurrence[];
  children: WalkDiv[];
}

export interface WalkLog {
  where: string;
  kind: 'del-bracketed' | 'del-already-bracketed' | 'add' | 'note-footnote' | 'note-marginal' | 'gap' | 'figure-diagram' | 'figure-table';
  excerpt: string;
}

export interface WalkResult {
  root: WalkDiv;
  logs: WalkLog[];
}

const KNOWN_TAGS = new Set(['div', 'p', 'head', 'lb', 'pb', 'l', 'milestone', 'note', 'gap', 'del', 'add', 'num', 'figure', 'graphic', 'figDesc', 'list', 'item', 'label']);

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(tag);
  return m ? m[1]! : null;
}

export function walkEdition(xml: string, fileLabel: string): WalkResult {
  const bodyStart = xml.search(/<body\b[^>]*>/);
  const bodyEndMatch = /<\/body>/.exec(xml);
  if (bodyStart < 0 || !bodyEndMatch) throw new Error(`${fileLabel}: no <body>...</body> found`);
  const body = xml.slice(bodyStart, bodyEndMatch.index);

  // --- coverage check: fail on any tag this walker doesn't already know about ---
  {
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(body))) {
      const name = tm[1]!;
      if (name === 'body') continue;
      if (!KNOWN_TAGS.has(name)) throw new Error(`${fileLabel}: unexpected tag <${name}> in the source body - inspect before proceeding`);
    }
  }

  const TOKEN_RE =
    /<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<head\b[^>]*>([\s\S]*?)<\/head>|<lb\b[^>]*\/>|<pb\b[^>]*\/>|<l\b[^>]*\/>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<num\b[^>]*>|<\/num>|<figure\b[^>]*\/>|<figure\b[^>]*>|<\/figure>|<[^>]+>/g;

  const logs: WalkLog[] = [];
  const stack: WalkDiv[] = [];
  let root: WalkDiv | null = null;

  let accumulating = false;
  let isReal = false;
  let buf = '';
  let pDel = 0;
  let pAdd = 0;

  function ensureAccumulating(): void {
    if (!accumulating && stack.length > 0) {
      accumulating = true;
      isReal = false;
      buf = '';
      pDel = 0;
      pAdd = 0;
    }
  }

  function flushIfImplicit(div: WalkDiv | undefined): void {
    if (accumulating && !isReal) {
      const text = cleanText(buf);
      if (text.length > 0 && div) div.paragraphs.push({ text, delCount: pDel, addCount: pAdd });
    }
    accumulating = false;
    isReal = false;
  }

  let delDepth = 0;
  let delOpenEnd = 0;
  let addDepth = 0;
  let addOpenEnd = 0;
  let noteDepth = 0;
  let noteOpenEnd = 0;
  let noteIsMarginal = false;
  let numDepth = 0;
  let figureDepth = 0;
  let figureOpenEnd = 0;
  let figureAttrs = '';

  const currentPath = () => stack.map((d) => `${d.subtype ?? d.type}${d.n ? `[${d.n}]` : ''}`).join('/');

  TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(body))) {
    const tok = m[0];

    ensureAccumulating();
    if (accumulating && delDepth === 0 && noteDepth === 0 && figureDepth === 0 && m.index > lastIndex) {
      buf += body.slice(lastIndex, m.index);
    }
    lastIndex = TOKEN_RE.lastIndex;

    if (tok.startsWith('<div')) {
      flushIfImplicit(stack[stack.length - 1]);
      const type = (attr(tok, 'type') as 'edition' | 'textpart' | null) ?? 'textpart';
      const subtype = attr(tok, 'subtype');
      const n = attr(tok, 'n');
      const div: WalkDiv = { type, subtype, n, head: null, paragraphs: [], figures: [], children: [] };
      if (stack.length) stack[stack.length - 1]!.children.push(div);
      stack.push(div);
      if (type === 'edition' && !root) root = div;
    } else if (tok === '</div>') {
      flushIfImplicit(stack[stack.length - 1]);
      stack.pop();
    } else if (tok.startsWith('<head')) {
      let headRaw = m[1] ?? '';
      // A <head> occasionally wraps its whole text in <add>...</add> (the
      // Tetrabiblos's two "Prooimion" book-opening heads) - log each as an
      // ordinary <add> insertion (kept, tag stripped) exactly like a body
      // <add>, then strip ALL tags before using the text as a heading (a
      // heading is never allowed to carry raw markup through to sourceHeading).
      const addInHeadRe = /<add\b[^>]*>([\s\S]*?)<\/add>/g;
      let am: RegExpExecArray | null;
      while ((am = addInHeadRe.exec(headRaw))) {
        logs.push({ where: currentPath(), kind: 'add', excerpt: stripTagsForExcerpt(decodeEntities(am[1] ?? '')) });
      }
      headRaw = headRaw.replace(/<[^>]+>/g, ' ');
      const top = stack[stack.length - 1];
      if (top && top.head === null && top.paragraphs.length === 0 && top.figures.length === 0 && top.children.length === 0) {
        top.head = cleanText(headRaw);
      } else {
        // A <head> not eligible to be its division's own sourceHeading (none
        // occurs in either source outside that first-position case - the two
        // Tetrabiblos "Conclusion according to…" heads are each the FIRST
        // thing in their own n="10a"/"10b" division - so this branch is
        // unreached in practice; kept as a loud failure rather than silent
        // data loss if a future re-run's upstream file changes shape).
        throw new Error(`${fileLabel}: <head> at ${currentPath()} is not first-in-division - needs explicit handling: ${JSON.stringify(cleanText(headRaw)).slice(0, 120)}`);
      }
    } else if (/^<p[\s>]/.test(tok)) {
      flushIfImplicit(stack[stack.length - 1]);
      accumulating = true;
      isReal = true;
      buf = '';
      pDel = 0;
      pAdd = 0;
    } else if (tok === '</p>') {
      const top = stack[stack.length - 1];
      if (top) top.paragraphs.push({ text: cleanText(buf), delCount: pDel, addCount: pAdd });
      accumulating = false;
      isReal = false;
    } else if (tok.startsWith('<lb') || tok.startsWith('<pb') || tok.startsWith('<l ') || tok.startsWith('<l/')) {
      if (accumulating) buf += ' ';
    } else if (tok.startsWith('<milestone')) {
      if (accumulating) buf += ' ';
    } else if (tok.startsWith('<gap')) {
      const reason = attr(tok, 'reason') ?? '';
      if (accumulating) buf += ' ';
      logs.push({ where: currentPath(), kind: 'gap', excerpt: `reason=${JSON.stringify(reason)}` });
    } else if (tok.startsWith('<del')) {
      delDepth += 1;
      delOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</del>') {
      const rawInner = body.slice(delOpenEnd, m.index).replace(/<[^>]+>/g, ' ');
      const alreadyBracketed = rawInner.includes('[') || rawInner.includes(']');
      delDepth = Math.max(0, delDepth - 1);
      if (accumulating) {
        buf += alreadyBracketed ? rawInner : `[${rawInner}]`;
        pDel += 1;
      }
      logs.push({ where: currentPath(), kind: alreadyBracketed ? 'del-already-bracketed' : 'del-bracketed', excerpt: cleanText(rawInner) });
    } else if (tok.startsWith('<add')) {
      addDepth += 1;
      addOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</add>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(addOpenEnd, m.index)));
      addDepth = Math.max(0, addDepth - 1);
      // NOTE: unlike <del>/<note>/<figure>, <add> is never in the
      // suppression list gating the generic inter-token append above, so its
      // inner text already flowed into `buf` normally as the tokeniser
      // walked past it - appending it again here would duplicate it (caught
      // by validate.ts's exact text-accounting check: a doubled "κατά" at
      // the very <add> this comment describes). Only count/log it here.
      if (accumulating) pAdd += 1;
      logs.push({ where: currentPath(), kind: 'add', excerpt });
    } else if (tok.startsWith('<note')) {
      noteDepth += 1;
      noteOpenEnd = TOKEN_RE.lastIndex;
      noteIsMarginal = attr(tok, 'type') === 'marginal';
    } else if (tok === '</note>') {
      const raw = decodeEntities(body.slice(noteOpenEnd, m.index)).trim();
      noteDepth = Math.max(0, noteDepth - 1);
      logs.push({ where: currentPath(), kind: noteIsMarginal ? 'note-marginal' : 'note-footnote', excerpt: stripTagsForExcerpt(raw) });
    } else if (tok.startsWith('<num')) {
      numDepth += 1;
    } else if (tok === '</num>') {
      numDepth = Math.max(0, numDepth - 1);
      // content already flowed into buf via the generic inter-token append
      // (num is not suppressed like del/note/figure) - nothing else to do.
    } else if (tok.startsWith('<figure') && tok.endsWith('/>')) {
      // self-closing <figure .../> (no graphic/figDesc at all)
      const result = extractFigure('', fileLabel, currentPath());
      const top = stack[stack.length - 1];
      if (top) top.figures.push({ attrs: tok, result });
      logs.push({ where: currentPath(), kind: result.tableText ? 'figure-table' : 'figure-diagram', excerpt: result.tableText ?? '' });
    } else if (tok.startsWith('<figure')) {
      // 2 of the Almagest's 295 <figure> open tags are NESTED - one
      // <figure> directly inside another (book-1-ch-15's margin table:
      // `<figure rend="table" place="margin"><figure><graphic/><figDesc/>
      // </figure><note>...</note>...</figure>` - confirmed by direct
      // inspection). Only the OUTERMOST open/close pair is recorded here
      // (figureOpenEnd/figureAttrs are set/read only at depth 0<->1) -
      // otherwise the inner open would overwrite figureOpenEnd and the
      // inner close would fire extractFigure prematurely on an
      // unbalanced, unparseable slice (caught as a hard XML-parse error
      // the first time this ran - see tableOrFigure.ts). The nested
      // figure's own <graphic>/<figDesc> content is still captured
      // correctly - it just becomes part of the SAME single outer
      // occurrence's inner XML, exactly as if it were flat.
      if (figureDepth === 0) {
        figureOpenEnd = TOKEN_RE.lastIndex;
        figureAttrs = tok;
      }
      figureDepth += 1;
    } else if (tok === '</figure>') {
      figureDepth = Math.max(0, figureDepth - 1);
      if (figureDepth === 0) {
        const inner = body.slice(figureOpenEnd, m.index);
        const result = extractFigure(inner, fileLabel, currentPath());
        const top = stack[stack.length - 1];
        if (top) top.figures.push({ attrs: figureAttrs, result });
        logs.push({ where: currentPath(), kind: result.tableText ? 'figure-table' : 'figure-diagram', excerpt: result.tableText ?? '' });
      }
    }
    // else: generic catch-all `<[^>]+>` for <graphic/>, <figDesc>/</figDesc>,
    // <list>/</list>, <item>/</item>, <label>/</label> - all consumed
    // wholesale by the figure handling above (figureDepth > 0 suppresses
    // their raw text from `buf`); reaching the catch-all outside a <figure>
    // never happens for these tags in either source (confirmed: list/item/
    // label/num occur ONLY inside a figDesc - see teiWalker.ts's module doc).
  }

  if (!root) throw new Error(`${fileLabel}: root <div type="edition"> never closed`);
  return { root, logs };
}
