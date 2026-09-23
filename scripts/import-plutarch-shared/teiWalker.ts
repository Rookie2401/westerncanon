/**
 * Single-pass tokenising walker over a Perseus canonical-greekLit EpiDoc TEI
 * file for one Plutarch Life/Comparison (`urn:cts:greekLit:tlg0007.tlgNNN`).
 *
 * Structure (verified by direct inspection of all 132 fetched witnesses -
 * see scripts/import-plutarch/structure-survey.json):
 *   <body><div type="edition" ...>
 *     [ 64 works ]  <div type="textpart" subtype="chapter" n="N"> containing
 *                   one or more <div type="textpart" subtype="section" n="M">,
 *                   each holding one or more <p>.
 *     [ tlg051, tlg052 only ] an extra <div type="textpart" subtype="book"
 *                   n="Agis|Cleomenes|Tiberius|Caius"> level wrapping the
 *                   above (chapter numbers restart at 1 per part; each part
 *                   has its own <head> title) - see workTable.ts.
 *   </div></body>
 *
 * This walker is deliberately generic over that nesting: it builds a WalkDiv
 * tree mirroring the source exactly (every div, whatever it's labelled, plus
 * every <p> in document order), and scripts/import-plutarch-shared/convert.ts
 * decides which divs are the "true" top-level chapters for each work (per
 * workTable.ts's `parts`) and flattens every <p> found ANYWHERE inside a
 * chapter's own subtree - at any depth, regardless of how a descendant div
 * happens to be tagged - into that chapter's single joined Passage. This is
 * what the brief calls for ("one Passage per chapter with its sections
 * joined") and it also transparently absorbs one confirmed source anomaly:
 * tlg034's perseus-grc2 witness mistags the LAST chapter's own sections 2-5
 * as `subtype="chapter" n="2".."5"` instead of `subtype="section"`, but they
 * remain properly NESTED inside the real chapter 5's own <div> (never
 * siblings of it at the edition root) - so this walker's document-order tree
 * still gathers them correctly into chapter 5's passage; logged as an
 * anomaly in scripts/import-plutarch/index.ts, never silently "fixed" by
 * renumbering the source.
 *
 * Markup handled (see the importer brief's faithfulness rules):
 *   <pb n>, <milestone unit="para" resp="editor"/>  - self-closing,
 *                               zero-width, dropped from the reading text
 *                               (no ref/citation scheme uses them here -
 *                               Division.ref is always null per the brief)
 *   <head>...</head>          - captured verbatim (cleaned) IFF it is the
 *                               first thing in its div (used only for the
 *                               two book-level parts of tlg051/052 - see
 *                               above; never printed for a chapter/section,
 *                               none of which carry their own <head> in this
 *                               corpus, verified)
 *   <note>...</note>          - EXCLUDED entirely (tag + content): Perseus's
 *                               own editorial/critical apparatus, never
 *                               Perrin's printed prose. Counted, not quoted
 *                               per-occurrence (too repetitive - 3141 corpus-
 *                               wide; one aggregate anomaly per work).
 *   <bibl>...</bibl>          - EXCLUDED entirely, at any nesting depth
 *                               (inside <note>, or - rarer - as a sibling of
 *                               a quoted <cit><quote>): Perseus's own
 *                               citation-linking apparatus (e.g. "Aesch.
 *                               Seven 435"), never printed inline by the
 *                               Loeb. Counted, aggregated per work.
 *   <gap reason="lost"/>      - self-closing lacuna; NO text contributed;
 *                               counted and logged per occurrence (rare).
 *   <add>...</add>            - INCLUDED in reading text (an editorial
 *                               supplement the edition itself prints, e.g. a
 *                               missing "καὶ"); every occurrence's excerpt is
 *                               logged (rare - 6 corpus-wide).
 *   <choice><sic>X</sic><corr>Y</corr></choice> - the edition PRINTS the
 *                               corrected reading only: <sic> (unemended
 *                               manuscript reading) is EXCLUDED from reading
 *                               text, <corr> (what Perrin's edition actually
 *                               prints) is INCLUDED; both logged per
 *                               occurrence (very rare - a handful corpus-
 *                               wide, in either order/nesting the source
 *                               happens to use).
 *   <q>, <quote>, <foreign>, <cit>, <gloss>, <emph>, <hi>, <l>, <lg>, <sp>,
 *   <speaker>, <title>, <choice>          - unwrapped: tag stripped, text
 *                               kept (all printed running text - quoted
 *                               verse/dialogue, transliterated or untranslated
 *                               words, a translator's parenthetical gloss,
 *                               italicised emphasis).
 */

import { cleanText, decodeEntities, stripTagsForExcerpt } from './text.ts';

export type DivKind = 'edition' | 'book' | 'chapter' | 'section' | 'other';

export interface WalkParagraph {
  /** verbatim reading text: entities decoded, NFC-normalised, ws collapsed,
   *  <pb>/<milestone> -> dropped, <note>/<bibl> excluded, <gap> excluded,
   *  <sic> excluded, <add>/<corr> included, everything else unwrapped */
  text: string;
  gapCount: number;
  addCount: number;
  /** cleaned excerpt of each <add> found in this paragraph */
  addExcerpts: string[];
  /** cleaned excerpt of each <sic> found in this paragraph (content dropped from reading text) */
  sicExcerpts: string[];
  /** cleaned excerpt of each <corr> found in this paragraph (content kept in reading text) */
  corrExcerpts: string[];
}

export interface WalkDiv {
  kind: DivKind;
  /** the div's `n` attribute; null only for the root edition div */
  n: string | null;
  /** cleaned <head> text if this div opens with one, else null */
  head: string | null;
  /** children in document order: a div, or a direct-child <p> */
  items: WalkItem[];
}

export type WalkItem = { kind: 'div'; div: WalkDiv } | { kind: 'p'; paragraph: WalkParagraph };

export interface WalkStats {
  noteCount: number;
  biblCount: number;
  gapCount: number;
  addCount: number;
  sicCorrCount: number;
  milestoneCount: number;
  pbCount: number;
}

export interface WalkResult {
  root: WalkDiv;
  stats: WalkStats;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

const TOKEN_RE =
  /<div\b[^>]*>|<\/div>|<head>([\s\S]*?)<\/head>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<sic\b[^>]*>|<\/sic>|<corr\b[^>]*>|<\/corr>|<add\b[^>]*>|<\/add>|<gap\b[^>]*\/>|<milestone\b[^>]*\/>|<pb\b[^>]*\/>|<p\b[^>]*>|<\/p>|<[^>]+>/g;

export function walkEdition(xml: string, fileLabel: string): WalkResult {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.lastIndexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) {
    throw new Error(`${fileLabel}: no <body>...</body> found`);
  }
  const body = xml.slice(bodyStart, bodyEnd);

  // The Greek witnesses use <div type="edition">; the English (translation)
  // witnesses use <div type="translation"> for the exact same root position -
  // verified across all 132 files (66 "edition", 66 "translation", 0 other).
  // Both are this walker's single root "edition"-kind div.
  const editionOpenRe = /<div\b(?=[^>]*\btype="(?:edition|translation)")[^>]*>/;
  const editionOpen = editionOpenRe.exec(body);
  if (!editionOpen) {
    throw new Error(`${fileLabel}: no <div type="edition"|"translation"> found`);
  }

  const stats: WalkStats = {
    noteCount: 0,
    biblCount: 0,
    gapCount: 0,
    addCount: 0,
    sicCorrCount: 0,
    milestoneCount: 0,
    pbCount: 0,
  };

  const stack: WalkDiv[] = [];
  let root: WalkDiv | null = null;

  // suppress zone stack: note / bibl / sic - free text inside is dropped
  const suppressStack: Array<'note' | 'bibl' | 'sic'> = [];

  let inP = false;
  let buf = '';
  let pGap = 0;
  let pAdd = 0;
  const pAddExcerpts: string[] = [];
  const pSicExcerpts: string[] = [];
  const pCorrExcerpts: string[] = [];

  let addOpenEnd = 0;
  let sicOpenEnd = 0;
  let corrOpenEnd = 0;

  TOKEN_RE.lastIndex = editionOpen.index;
  let lastIndex = editionOpen.index;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(body))) {
    const tok = m[0];

    if (inP && suppressStack.length === 0 && m.index > lastIndex) {
      buf += body.slice(lastIndex, m.index);
    }
    lastIndex = TOKEN_RE.lastIndex;

    if (tok.startsWith('<div')) {
      const isEdition = /\btype="(?:edition|translation)"/.test(tok);
      const isTextpart = /\btype="textpart"/.test(tok);
      const subtype = attr(tok, 'subtype');
      const n = attr(tok, 'n');
      const kind: DivKind = isEdition
        ? 'edition'
        : isTextpart && (subtype === 'book' || subtype === 'chapter' || subtype === 'section')
          ? (subtype as DivKind)
          : 'other';
      const div: WalkDiv = { kind, n, head: null, items: [] };
      if (isEdition) {
        root = div;
      } else if (stack.length) {
        stack[stack.length - 1].items.push({ kind: 'div', div });
      }
      stack.push(div);
    } else if (tok === '</div>') {
      stack.pop();
    } else if (tok.startsWith('<head>')) {
      const headRaw = m[1] ?? '';
      const top = stack[stack.length - 1];
      if (top && top.head === null && top.items.length === 0) {
        top.head = cleanText(headRaw);
      }
    } else if (tok.startsWith('<note')) {
      // A handful of <note .../> self-close (no content, so nothing to
      // suppress and no matching </note> will ever arrive) - verified 5
      // corpus-wide. Only push a suppress frame for the normal <note>...</note>
      // shape.
      if (tok.endsWith('/>')) {
        stats.noteCount += 1;
      } else {
        suppressStack.push('note');
      }
    } else if (tok === '</note>') {
      if (suppressStack[suppressStack.length - 1] === 'note') suppressStack.pop();
      stats.noteCount += 1;
    } else if (tok.startsWith('<bibl')) {
      // Same self-closing exception as <note> above - verified 4 corpus-wide
      // (always a spurious empty citation marker inside a <note>, e.g.
      // `<bibl n="Plut. Fab. 2.1"/>chapter ii. 1.`).
      if (tok.endsWith('/>')) {
        stats.biblCount += 1;
      } else {
        suppressStack.push('bibl');
      }
    } else if (tok === '</bibl>') {
      if (suppressStack[suppressStack.length - 1] === 'bibl') suppressStack.pop();
      stats.biblCount += 1;
    } else if (tok.startsWith('<sic')) {
      suppressStack.push('sic');
      sicOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</sic>') {
      if (suppressStack[suppressStack.length - 1] === 'sic') suppressStack.pop();
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(sicOpenEnd, m.index)));
      pSicExcerpts.push(excerpt);
    } else if (tok.startsWith('<corr')) {
      corrOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</corr>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(corrOpenEnd, m.index)));
      pCorrExcerpts.push(excerpt);
      stats.sicCorrCount += 1;
    } else if (tok.startsWith('<add')) {
      addOpenEnd = TOKEN_RE.lastIndex;
      pAdd += 1;
      stats.addCount += 1;
    } else if (tok === '</add>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(addOpenEnd, m.index)));
      pAddExcerpts.push(excerpt);
    } else if (tok.startsWith('<gap')) {
      pGap += 1;
      stats.gapCount += 1;
    } else if (tok.startsWith('<milestone')) {
      stats.milestoneCount += 1;
    } else if (tok.startsWith('<pb')) {
      stats.pbCount += 1;
    } else if (tok.startsWith('<p')) {
      inP = true;
      buf = '';
      pGap = 0;
      pAdd = 0;
      pAddExcerpts.length = 0;
      pSicExcerpts.length = 0;
      pCorrExcerpts.length = 0;
    } else if (tok === '</p>') {
      inP = false;
      const text = cleanText(buf);
      const top = stack[stack.length - 1];
      const paragraph: WalkParagraph = {
        text,
        gapCount: pGap,
        addCount: pAdd,
        addExcerpts: [...pAddExcerpts],
        sicExcerpts: [...pSicExcerpts],
        corrExcerpts: [...pCorrExcerpts],
      };
      if (top) top.items.push({ kind: 'p', paragraph });
    }
    // else: generic catch-all <[^>]+> (q, /q, quote, /quote, foreign,
    // /foreign, cit, /cit, gloss, /gloss, emph, /emph, hi, /hi, l, /l, lg,
    // /lg, sp, /sp, speaker, /speaker, title, /title, choice, /choice, lb/>):
    // no structural action - text already flows via the free-text capture
    // above (suppressed while inside note/bibl/sic).
  }

  if (!root) throw new Error(`${fileLabel}: root edition div never closed`);
  return { root, stats };
}

/** Every <p> found anywhere inside `div`'s own subtree, in document order -
 *  used to build one chapter's single joined Passage regardless of how deep
 *  (or how a descendant div happens to be tagged) its sections/paragraphs
 *  sit. */
export function collectParagraphs(div: WalkDiv): WalkParagraph[] {
  const out: WalkParagraph[] = [];
  for (const item of div.items) {
    if (item.kind === 'p') out.push(item.paragraph);
    else out.push(...collectParagraphs(item.div));
  }
  return out;
}

/** Direct-child divs of `div` matching `kind`, in document order (does not
 *  recurse past a match - used to find a work's true top-level chapters,
 *  ignoring any deeper mistagged divs of the same subtype - see tlg034 in
 *  the module doc). */
export function directChildDivs(div: WalkDiv, kind: DivKind): WalkDiv[] {
  const out: WalkDiv[] = [];
  for (const item of div.items) {
    if (item.kind === 'div' && item.div.kind === kind) out.push(item.div);
  }
  return out;
}
