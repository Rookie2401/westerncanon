/**
 * Shared TEI parser for all 28 Xenophon source files (14 works x grc/en).
 * One parser, parameterised only by `StructureKind` - never per-work forked
 * logic. See workTable.ts for the corpus table and the top-of-repo import
 * brief for the faithfulness rules this implements.
 *
 * --- Source shape (verified directly, see workTable.ts's module doc) -----
 * <body><div type="edition|translation"><div type="textpart" subtype="book"
 * n="N">   (books works only)
 *   <head>...</head>                                    (grc book only)
 *   <div type="textpart" subtype="chapter" n="M">        (books / flat-chapters)
 *     <div type="textpart" subtype="section" n="K"><p>...</p></div>
 *     ...
 *   </div>
 * </div></div></body>
 * (Apology / 'flat-sections' has NO chapter wrapper: <div subtype="section">
 * sits directly under the edition/translation div.)
 *
 * Every <p> is confirmed (by direct structural scan of all 28 files) to sit
 * directly inside a <div subtype="section"> - never directly inside a
 * chapter or book div - so paragraph text is always collected at the
 * section node and then folded upward per `StructureKind` (see fold()).
 *
 * --- Markup handled (corpus-wide tag census over all 28 <body>s) --------
 *   <head>              Book only, grc only: verbatim Greek rubric -> sourceHeading
 *   <add>...</add>      editor's supplement, printed as running text -> KEPT verbatim, logged
 *   <del>...</del>      text the editor brackets as suspected spurious/
 *                        interpolated -> KEPT in the reading text, wrapped in
 *                        square brackets exactly as a critical edition prints
 *                        editor-bracketed text (revised 2026-09-22: a
 *                        token-level audit against the raw TEI found the
 *                        earlier exclusion policy was silently dropping real
 *                        printed text - e.g. Anabasis's bracketed
 *                        book-opening recapitulations, 63 spans/3,541 chars).
 *                        Logged per-occurrence, full span verbatim (no
 *                        truncation). A <del> already inside a suppressed
 *                        ancestor (<note>, or the excluded half of a
 *                        <choice><sic>) stays excluded via that ancestor -
 *                        <del> itself never suppresses.
 *   <sic>...</sic>      standalone: printed exactly as transmitted -> KEPT verbatim, logged
 *                        inside <choice><sic>X</sic><corr>Y</corr></choice>: the
 *                        unemended sic reading X is NOT what the edition prints ->
 *                        EXCLUDED, logged (paired with the corr entry)
 *   <corr>...</corr>    editor's correction, printed as running text -> KEPT verbatim, logged
 *                        (standalone AND inside <choice> - both are the edition's
 *                        actual printed reading)
 *   <choice>            wrapper only, depth-tracked to drive the sic/corr rule above
 *   <gap reason="lost"/> manuscript lacuna, no `rend` attribute anywhere in this
 *                        corpus (verified) -> nothing fabricated, logged
 *   <note>...</note>    translator's/editor's footnote (never Xenophon's own
 *                        words, confirmed: every <date>/<title>/<bibl> instance
 *                        used for a footnote's own citations lives inside one of
 *                        these) -> EXCLUDED entirely, corpus total counted (not
 *                        logged per-occurrence: up to ~1450 in one file)
 *   <bibl>...</bibl>    source-attribution label for an embedded quotation
 *                        (e.g. "Theognis", "unknown") - editorial, not
 *                        Xenophon's own words (confirmed: glued with zero
 *                        surrounding whitespace onto the adjacent Greek word,
 *                        never itself part of a sentence) -> EXCLUDED, counted
 *   <delSpan/>+<anchor/> ONE occurrence corpus-wide (Cyropaedia English only,
 *                        Miller's edition marking essentially the whole of
 *                        Book 8 Ch. 8 as suspected spurious) - treated as
 *                        zero-width, kept unbracketed (this mechanism marks a
 *                        span by pointing to a distant <anchor/>, not by
 *                        wrapping content the way <del> does, so the same
 *                        bracket-insertion machinery does not apply); see
 *                        aboutText.ts's Cyropaedia-specific disclosure: this
 *                        one span is large, asymmetric between languages, and
 *                        well-documented classical-scholarship territory, so
 *                        it gets an explicit prose disclosure of its own
 *   <milestone unit="para"/>  always redundant with an immediately-following
 *                        <p> start (verified: the corpus's only milestone
 *                        variant) -> zero-width, dropped, not logged
 *   everything else (q, quote, foreign, l, cit, term, persName, surname,
 *   placeName, said, title, date, emph, gloss, bibl's siblings, etc.) ->
 *   generic catch-all, unwrapped, text kept (already flows through the
 *   free-text capture below; suppressed only while inside note/bibl or a
 *   choice-suppressed sic - NOT while inside <del>, which is bracketed and
 *   kept, not suppressed)
 */

import { cleanText, stripTagsForExcerpt, stripTagsForExcerptFull, isCombiningCp } from './text.ts';
import type { StructureKind, XenophonWorkEntry } from './workTable.ts';
import type { Division, Passage } from './genericTypes.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export class XenophonStopError extends Error {}

function fail(message: string): never {
  throw new XenophonStopError(message);
}

interface RawNode {
  kind: 'book' | 'chapter' | 'section';
  n: string;
  sourceHeading: string | null;
  paragraphs: string[];
  children: RawNode[];
}

export interface ParseStats {
  bookCount: number;
  chapterCount: number;
  sectionCount: number;
  totalPassages: number;
  totalChars: number;
  addCount: number;
  delCount: number;
  delAlreadyBracketedCount: number;
  sicCount: number;
  sicSuppressedCount: number;
  corrCount: number;
  choiceCount: number;
  gapCount: number;
  noteCount: number;
  biblCount: number;
  delSpanCount: number;
  anchorCount: number;
  emptyParagraphsDropped: number;
  reorderedSiblingGroups: number;
}

export interface ParseResult {
  divisions: Division[];
  anomalies: Anomaly[];
  stats: ParseStats;
}

/** ['1','2',...,'N'] inclusive, as strings. */
function range1N(n: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(String(i));
  return out;
}

/**
 * Sort `nodes` in place by numeric `n` (citation order), verify the sorted
 * sequence is an exact contiguous 1..N run (a true gap/duplicate is a STOP,
 * never force-fit), and log an anomaly whenever this reorders the source's
 * own document order - i.e. whenever the source's raw div sequence and the
 * printed citation-number sequence disagree. Corpus-wide, this fires
 * exactly once: Anabasis (tlg006) book 6 chapter 3, where sections 16-18
 * physically precede 14-15 in the source XML (identical in both languages)
 * even though the running Greek/English text reads coherently in citation
 * order 13,14,15,16,17,18,19 - confirmed by direct inspection of the prose
 * across that boundary. Presenting citation order (not raw document order)
 * is therefore the faithful choice for readers.
 */
function sortAndVerifyContiguous(nodes: RawNode[], where: string, anomalies: Anomaly[]): number {
  const before = nodes.map((n) => n.n);
  nodes.sort((a, b) => Number(a.n) - Number(b.n));
  const after = nodes.map((n) => n.n);
  const want = range1N(nodes.length);
  if (JSON.stringify(after) !== JSON.stringify(want)) {
    fail(`${where}: numbers are not a contiguous 1..${nodes.length} run even after sorting - got [${after.join(',')}]`);
  }
  const reordered = JSON.stringify(before) !== JSON.stringify(after);
  if (reordered) {
    anomalies.push({
      where,
      note:
        `The source XML's own physical div order (${before.join(',')}) disagrees with the printed citation-number ` +
        `order (${after.join(',')}) at this level - verified identical in both the Greek and English witnesses. ` +
        `The reading text here is presented in citation-number order (the coherent, edition-intended reading order), ` +
        `not raw document order.`,
    });
  }
  return reordered ? 1 : 0;
}

function collectParagraphs(node: RawNode, out: string[]): void {
  out.push(...node.paragraphs);
  for (const c of node.children) collectParagraphs(c, out);
}

export function parseXenophonXml(xml: string, entry: XenophonWorkEntry, lang: 'grc' | 'en'): ParseResult {
  const structure: StructureKind = entry.structure;
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<add\b[^>]*>|<\/add>|<del\b[^>]*>|<\/del>|<sic\b[^>]*>|<\/sic>|<corr\b[^>]*>|<\/corr>|<choice\b[^>]*>|<\/choice>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<gap\b[^>]*\/>|<delSpan\b[^>]*\/>|<anchor\b[^>]*\/>|<milestone\b[^>]*\/>|<[^>]+>/g;

  type StackKind = 'book' | 'chapter' | 'section' | 'other';
  const stack: StackKind[] = [];
  const topNodes: RawNode[] = [];
  let curBookNode: RawNode | null = null;
  let curChapterNode: RawNode | null = null;
  let curSectionNode: RawNode | null = null;

  let inP = false;
  let pBuf = '';
  let headDepth = 0;
  let headBuf = '';

  let suppressDepth = 0;
  let noteDepth = 0;
  let noteOuterStart = 0;
  let biblDepth = 0;
  let biblOuterStart = 0;
  let delDepth = 0;
  const delOpenIdx: number[] = [];
  const delBufStart: (number | null)[] = [];
  let addDepth = 0;
  const addOpenIdx: number[] = [];
  const sicStack: { suppressed: boolean; openIdx: number }[] = [];
  const corrOpenIdx: number[] = [];
  let choiceDepth = 0;

  const anomalies: Anomaly[] = [];
  const stats: ParseStats = {
    bookCount: 0,
    chapterCount: 0,
    sectionCount: 0,
    totalPassages: 0,
    totalChars: 0,
    addCount: 0,
    delCount: 0,
    delAlreadyBracketedCount: 0,
    sicCount: 0,
    sicSuppressedCount: 0,
    corrCount: 0,
    choiceCount: 0,
    gapCount: 0,
    noteCount: 0,
    biblCount: 0,
    delSpanCount: 0,
    anchorCount: 0,
    emptyParagraphsDropped: 0,
    reorderedSiblingGroups: 0,
  };

  const where = (): string => {
    const parts: string[] = [];
    if (curBookNode) parts.push(`book ${curBookNode.n}`);
    if (curChapterNode) parts.push(`ch ${curChapterNode.n}`);
    if (curSectionNode) parts.push(`sec ${curSectionNode.n}`);
    return parts.length ? parts.join(' ') : `${entry.slug}-${lang}`;
  };

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inP && suppressDepth === 0) pBuf += free;
      if (headDepth > 0) headBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/^<div\b/.test(tok)) {
      const subtype = /subtype="([^"]+)"/.exec(tok)?.[1];
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (subtype === 'book') {
        if (n === undefined) fail(`book div with no n= attribute: ${tok}`);
        const node: RawNode = { kind: 'book', n, sourceHeading: null, paragraphs: [], children: [] };
        topNodes.push(node);
        stack.push('book');
        curBookNode = node;
      } else if (subtype === 'chapter') {
        if (n === undefined) fail(`chapter div with no n= attribute: ${tok}`);
        const node: RawNode = { kind: 'chapter', n, sourceHeading: null, paragraphs: [], children: [] };
        (curBookNode ? curBookNode.children : topNodes).push(node);
        stack.push('chapter');
        curChapterNode = node;
      } else if (subtype === 'section') {
        if (n === undefined) fail(`section div with no n= attribute: ${tok}`);
        const node: RawNode = { kind: 'section', n, sourceHeading: null, paragraphs: [], children: [] };
        (curChapterNode ? curChapterNode.children : curBookNode ? curBookNode.children : topNodes).push(node);
        stack.push('section');
        curSectionNode = node;
      } else {
        stack.push('other');
      }
    } else if (tok === '</div>') {
      const top = stack.pop();
      if (top === undefined) fail('unbalanced </div> at end of document');
      if (top === 'section') curSectionNode = null;
      else if (top === 'chapter') curChapterNode = null;
      else if (top === 'book') curBookNode = null;
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      const target = curSectionNode ?? curChapterNode ?? curBookNode;
      if (!target) fail(`<p> found outside any numbered division at ${where()}`);
      if (cleaned.length === 0) {
        stats.emptyParagraphsDropped += 1;
        anomalies.push({ where: where(), note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.' });
      } else {
        target.paragraphs.push(cleaned);
      }
    } else if (/^<head\b/.test(tok)) {
      headDepth += 1;
      headBuf = '';
    } else if (tok === '</head>') {
      headDepth -= 1;
      if (headDepth === 0 && curBookNode) {
        curBookNode.sourceHeading = cleanText(headBuf);
        if (curBookNode.sourceHeading.includes('[')) {
          anomalies.push({
            where: where(),
            note:
              `This Book's Greek rubric "${curBookNode.sourceHeading}" contains a bracketed word rather than a ` +
              `numeral glyph - the source's own substitute for an archaic Greek numeral-letter (e.g. Book 6's ` +
              `"[στιγμα]" stands for the obsolete letter stigma/ϛ, used acrophonically for "6"; Perseus's own ` +
              `transcription writes the letter's name in brackets rather than rendering the rare glyph itself). ` +
              `Kept verbatim, exactly as the source prints it.`,
          });
        }
      }
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addOpenIdx.push(lastIndex);
    } else if (tok === '</add>') {
      addDepth -= 1;
      const openIdx = addOpenIdx.pop();
      if (openIdx === undefined) fail(`unbalanced </add> at ${where()}`);
      stats.addCount += 1;
      const excerpt = stripTagsForExcerpt(body.slice(openIdx, m.index));
      anomalies.push({ where: where(), note: `<add> editorial supplement, kept verbatim in the reading text (it IS part of what this edition prints): "${excerpt}"` });
    } else if (/^<del\b/.test(tok)) {
      // Policy (2026-09-22 revision): <del> text is KEPT in the reading
      // text, wrapped in square brackets, exactly as a critical edition
      // prints editor-bracketed text believed spurious/interpolated - it is
      // NOT excluded. (Token-level audit against the raw TEI showed the
      // earlier exclusion policy was silently dropping real printed text,
      // e.g. Anabasis's bracketed book-opening recapitulations.) del no
      // longer increments suppressDepth: its own text flows through the
      // normal free-text capture like any other inline tag; only a nested
      // <note>/<bibl>/choice-suppressed-<sic> inside a <del> (confirmed to
      // occur: Cyropaedia-en has <note> footnotes nested inside some <del>
      // spans) is still excluded, via that tag's own suppression - unrelated
      // to del itself.
      delDepth += 1;
      delOpenIdx.push(lastIndex);
      delBufStart.push(inP && suppressDepth === 0 ? pBuf.length : null);
    } else if (tok === '</del>') {
      delDepth -= 1;
      const openIdx = delOpenIdx.pop();
      if (openIdx === undefined) fail(`unbalanced </del> at ${where()}`);
      const bufStart = delBufStart.pop();
      stats.delCount += 1;
      const excerpt = stripTagsForExcerptFull(body.slice(openIdx, m.index));
      if (bufStart != null) {
        const already = pBuf.slice(bufStart).trim().startsWith('[') && pBuf.slice(bufStart).trim().endsWith(']');
        if (already) {
          stats.delAlreadyBracketedCount += 1;
          anomalies.push({
            where: where(),
            note: `<del> editor-bracketed text KEPT in the reading text (the source already prints literal brackets here, NOT doubled): "${excerpt}"`,
          });
        } else {
          pBuf = pBuf.slice(0, bufStart) + '[' + pBuf.slice(bufStart).trim() + ']';
          anomalies.push({ where: where(), note: `<del> editor-bracketed text KEPT in the reading text (in square brackets): "${excerpt}"` });
        }
      } else {
        // Never observed in this corpus (verified: every <del> sits inside
        // a <p>, none cross a <p> boundary, none are suppressed by an
        // ancestor) - handled honestly rather than assumed impossible.
        anomalies.push({
          where: where(),
          note: `<del> found outside any paragraph text capture (e.g. inside an already-suppressed ancestor, or outside <p>) - bracket-keep policy could not apply here: "${excerpt}"`,
        });
      }
    } else if (/^<sic\b/.test(tok) && tok.endsWith('/>')) {
      // Self-closing <sic/> (6 occurrences corpus-wide, all in Greek
      // witnesses): Marchant's own zero-width crux marker - no text is
      // wrapped at all. Unlike wrapped <sic>text</sic>, this marks a POINT
      // in the transmitted text the editor considers suspect/corrupt with no
      // correction offered, rather than flagging a specific irregular word.
      // Verified by direct inspection of all 6 (tlg001 x2, tlg002 x2, tlg006,
      // tlg012): always mid-sentence, adjacent to ordinary-looking Greek,
      // never wrapping anything. Treated as zero-width, like <gap>.
      stats.sicCount += 1;
      anomalies.push({
        where: where(),
        note: '<sic/> (self-closing, no wrapped text) - the source\'s own zero-width marker for a point in the transmitted text considered suspect/corrupt, with no correction offered; nothing is added to or removed from the reading text here.',
      });
    } else if (/^<sic\b/.test(tok)) {
      const suppressed = choiceDepth > 0;
      sicStack.push({ suppressed, openIdx: lastIndex });
      if (suppressed) suppressDepth += 1;
    } else if (tok === '</sic>') {
      const entry2 = sicStack.pop();
      if (!entry2) fail(`unbalanced </sic> at ${where()}`);
      stats.sicCount += 1;
      const excerpt = stripTagsForExcerpt(body.slice(entry2.openIdx, m.index));
      if (entry2.suppressed) {
        suppressDepth -= 1;
        stats.sicSuppressedCount += 1;
        anomalies.push({
          where: where(),
          note: `<choice><sic>...</sic><corr>...</corr></choice>: the unemended manuscript reading "${excerpt}" is recorded but NOT what this edition prints (see the paired <corr> entry) - excluded from the reading text.`,
        });
      } else {
        anomalies.push({ where: where(), note: `<sic> - printed exactly as transmitted despite an apparent irregularity, kept verbatim: "${excerpt}"` });
      }
    } else if (/^<corr\b/.test(tok)) {
      corrOpenIdx.push(lastIndex);
    } else if (tok === '</corr>') {
      const openIdx = corrOpenIdx.pop();
      if (openIdx === undefined) fail(`unbalanced </corr> at ${where()}`);
      stats.corrCount += 1;
      const excerpt = stripTagsForExcerpt(body.slice(openIdx, m.index));
      anomalies.push({ where: where(), note: `<corr> editorial correction, printed as this edition's running text, kept verbatim: "${excerpt}"` });
    } else if (/^<choice\b/.test(tok)) {
      choiceDepth += 1;
      stats.choiceCount += 1;
    } else if (tok === '</choice>') {
      choiceDepth -= 1;
      if (choiceDepth < 0) fail(`unbalanced </choice> at ${where()}`);
    } else if (/^<note\b/.test(tok)) {
      if (noteDepth === 0) {
        noteOuterStart = lastIndex;
        suppressDepth += 1;
      }
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      if (noteDepth < 0) fail(`unbalanced </note> at ${where()}`);
      if (noteDepth === 0) {
        suppressDepth -= 1;
        stats.noteCount += 1;
        void noteOuterStart; // outer start only needed if we ever want a per-note excerpt; corpus policy is count-only (see module doc)
      }
    } else if (/^<bibl\b/.test(tok)) {
      if (biblDepth === 0) {
        biblOuterStart = lastIndex;
        suppressDepth += 1;
      }
      biblDepth += 1;
    } else if (tok === '</bibl>') {
      biblDepth -= 1;
      if (biblDepth < 0) fail(`unbalanced </bibl> at ${where()}`);
      if (biblDepth === 0) {
        suppressDepth -= 1;
        stats.biblCount += 1;
        void biblOuterStart;
      }
    } else if (/^<gap\b/.test(tok)) {
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      stats.gapCount += 1;
      if (rendMatch?.[1]) {
        // Never seen in this corpus (verified: every <gap> is reason="lost"
        // with no rend attribute), but handled honestly rather than assumed.
        if (inP && suppressDepth === 0) pBuf += ` ${rendMatch[1]} `;
      }
      anomalies.push({
        where: where(),
        note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> - a manuscript lacuna; this edition prints no literal rendering here (no "rend" attribute), so nothing is fabricated.`,
      });
    } else if (/^<delSpan\b/.test(tok)) {
      stats.delSpanCount += 1;
    } else if (/^<anchor\b/.test(tok)) {
      stats.anchorCount += 1;
    }
    // <milestone .../> and the generic catch-all <[^>]+> (q, quote, foreign,
    // l, cit, term, persName, surname, placeName, said, title, date, emph,
    // gloss, the outer edition/translation div's own open/close already
    // handled as 'other', etc.): no structural action - text already flows
    // via the free-text capture above (suppressed only while inside
    // note/bibl/del/choice-suppressed-sic).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack depth ${stack.length})`);
  if (headDepth !== 0) fail(`unbalanced <head> nesting (final depth ${headDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (biblDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${biblDepth})`);
  if (choiceDepth !== 0) fail(`unbalanced <choice> nesting (final depth ${choiceDepth})`);
  if (sicStack.length !== 0) fail(`unbalanced <sic> nesting (${sicStack.length} still open)`);
  if (corrOpenIdx.length !== 0) fail(`unbalanced <corr> nesting (${corrOpenIdx.length} still open)`);

  // --- normalise sibling order + verify contiguity at every level ----------
  let reorderedGroups = 0;
  if (structure === 'books') {
    reorderedGroups += sortAndVerifyContiguous(topNodes, `${entry.slug}-${lang} / books`, anomalies);
    for (const book of topNodes) {
      reorderedGroups += sortAndVerifyContiguous(book.children, `${entry.slug}-${lang} / book ${book.n} chapters`, anomalies);
      for (const ch of book.children) {
        reorderedGroups += sortAndVerifyContiguous(ch.children, `${entry.slug}-${lang} / book ${book.n} ch ${ch.n} sections`, anomalies);
      }
    }
  } else if (structure === 'flat-chapters') {
    reorderedGroups += sortAndVerifyContiguous(topNodes, `${entry.slug}-${lang} / chapters`, anomalies);
    for (const ch of topNodes) {
      reorderedGroups += sortAndVerifyContiguous(ch.children, `${entry.slug}-${lang} / ch ${ch.n} sections`, anomalies);
    }
  } else {
    reorderedGroups += sortAndVerifyContiguous(topNodes, `${entry.slug}-${lang} / sections`, anomalies);
  }
  stats.reorderedSiblingGroups = reorderedGroups;

  // --- corpus-level aggregate anomaly entries for the two count-only,
  // never-individually-logged categories (note/bibl - see module doc: "up to
  // ~1450 in one file", logging each would bloat anomalies.json for no
  // benefit; about.json's "Known gaps & anomalies" already narrates these
  // counts in prose, but anomalies.json itself should still record them
  // machine-readably, once each, per work). --------------------------------
  if (stats.noteCount > 0) {
    anomalies.unshift({
      where: `${entry.slug}-${lang} / apparatus`,
      note: `${stats.noteCount} <note> translator/editorial footnote(s) excluded entirely, at every nesting depth - never Xenophon's own words. Not logged individually (too numerous to be useful per-occurrence).`,
    });
  }
  if (stats.biblCount > 0) {
    anomalies.unshift({
      where: `${entry.slug}-${lang} / apparatus`,
      note: `${stats.biblCount} <bibl> inline source-attribution label(s) (e.g. naming the poet a quoted line traces to, such as "Theognis") excluded from the reading text - confirmed by direct inspection to be glued onto the surrounding text with no separating whitespace, i.e. editorial apparatus, never part of Xenophon's own sentence. Not logged individually.`,
    });
  }

  // --- fold the raw tree into the final Division[] per structure kind -----
  function foldLeafFromChapterLike(node: RawNode, id: string): Division {
    const paragraphs: string[] = [];
    collectParagraphs(node, paragraphs);
    if (paragraphs.length === 0) fail(`${id}: no surviving paragraph text`);
    const passage: Passage = { n: '', text: paragraphs.join('\n\n'), ref: null };
    return { id, number: node.n, ref: null, sourceHeading: null, editorialTitle: null, children: [], passages: [passage] };
  }

  const divisions: Division[] = [];
  if (structure === 'books') {
    for (const book of topNodes) {
      stats.bookCount += 1;
      const children: Division[] = [];
      for (const ch of book.children) {
        stats.chapterCount += 1;
        stats.sectionCount += ch.children.length;
        children.push(foldLeafFromChapterLike(ch, `book-${book.n}-ch-${ch.n}`));
      }
      divisions.push({
        id: `book-${book.n}`,
        number: book.n,
        ref: null,
        sourceHeading: book.sourceHeading,
        editorialTitle: null,
        children,
        passages: [],
      });
    }
  } else if (structure === 'flat-chapters') {
    for (const ch of topNodes) {
      stats.chapterCount += 1;
      stats.sectionCount += ch.children.length;
      divisions.push(foldLeafFromChapterLike(ch, `ch-${ch.n}`));
    }
  } else {
    for (const sec of topNodes) {
      stats.sectionCount += 1;
      divisions.push(foldLeafFromChapterLike(sec, `sec-${sec.n}`));
    }
  }

  // --- strip orphaned standalone combining marks ---------------------------
  // 5 occurrences found corpus-wide (all in Cyropaedia's Greek witness, all
  // U+0313 COMBINING COMMA ABOVE, mid-word/mid-sentence, immediately before a
  // literal comma - verified present in the raw source XML itself, not a
  // parser artifact). NFC normalisation cannot resolve these: they sit on a
  // consonant (e.g. word-final "ν"), which has no Greek breathing-mark
  // precomposition target, so a standalone combining character survives
  // unchanged. Genuine breathing/accent marks in this corpus are always
  // already precomposed (confirmed: the whole-file NFC diff is 0 for every
  // one of the 14 Greek source files - see text.ts's module doc), so ANY
  // combining mark surviving this far is presumptively a digitisation
  // artifact of the source transcription, not real Greek content - showing
  // it inline would mislead a reader (it renders as a stray floating mark
  // attached to the wrong letter). Stripped here (never guessed at/replaced)
  // and logged individually, mirroring this app's established
  // stripUnresolvedPlaceholders precedent (scripts/import-archimedes/index.ts).
  function stripOrphanedCombiningMarks(divs: Division[]): void {
    for (const d of divs) {
      for (const p of d.passages) {
        if (!Array.from(p.text).some((ch) => isCombiningCp(ch.codePointAt(0) ?? 0))) continue;
        let out = '';
        const chars = Array.from(p.text);
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i]!;
          if (isCombiningCp(ch.codePointAt(0) ?? 0)) {
            const ctxStart = Math.max(0, i - 15);
            const ctxEnd = Math.min(chars.length, i + 10);
            const ctx = chars.slice(ctxStart, i).join('') + '[' + ch.codePointAt(0)!.toString(16) + ']' + chars.slice(i + 1, ctxEnd).join('');
            anomalies.push({
              where: d.id,
              note: `Orphaned standalone combining mark U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} found in the raw source text (not resolvable by NFC normalisation - it sits on a letter with no valid precomposition target, so it is not a real accent/breathing on that letter). Removed from the reading text rather than displayed or guessed at; context: "...${ctx}..."`,
            });
            continue; // drop it
          }
          out += ch;
        }
        p.text = cleanText(out);
      }
      if (d.children.length) stripOrphanedCombiningMarks(d.children);
    }
  }
  stripOrphanedCombiningMarks(divisions);

  // --- final stats -----------------------------------------------------
  function walk(divs: Division[]): void {
    for (const d of divs) {
      for (const p of d.passages) {
        stats.totalPassages += 1;
        stats.totalChars += p.text.length;
      }
      if (d.children.length) walk(d.children);
    }
  }
  walk(divisions);

  return { divisions, anomalies, stats };
}
