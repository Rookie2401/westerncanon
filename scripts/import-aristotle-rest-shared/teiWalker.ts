/**
 * Generic single-pass tokenising walker over a First1KGreek / Perseus EpiDoc
 * TEI file for one of the "rest of Aristotle" Greek works. Unlike
 * import-archimedes-shared/teiWalker.ts (which assumes a fixed book/chapter/
 * section nesting), this walker is fully generic over `<div type="textpart"
 * subtype="ANYTHING" n="...">` nesting to ANY depth - the ~40 works covered
 * here nest as flat chapter, flat section, book>chapter, book>chapter>section,
 * book>section>subsection, part>chapter>section, book>bekker_page, and more
 * (see workTable.ts). It builds a WalkDiv tree mirroring the source exactly;
 * scripts/import-aristotle-rest/index.ts + shapes.ts decide, per work, how to
 * fold that raw tree onto the app's Division scheme.
 *
 * Full tag census across all ~40 source files (enumerated by direct
 * inspection before writing this walker - see the module doc in
 * workTable.ts): div, p, head, lb, pb, milestone, del, add, note, gap, q,
 * quote, foreign, l, lg, hi, num, title, item, list, cit, bibl. `choice`,
 * `sic`, `corr` do not occur anywhere in this specific corpus (confirmed by
 * the same direct inspection) but are handled below for correctness/
 * future-proofing, at the coordinator's request. Any other tag encountered
 * makes this walker throw (never silently pass through), so an
 * unanticipated structure gets inspected rather than mis-imported.
 *
 * Handling:
 *   <lb>, <pb>                - zero-width scaffolding, replaced with a space
 *   <milestone .../>          - zero-width; if its `n` (or nested text, for
 *                                the rare paired form) looks like a Bekker
 *                                page/column citation ("184a", "1252b", ...
 *                                see text.ts#cleanBekkerMark), the RAW value
 *                                is recorded on every currently-open division
 *                                (for Division.ref building); always replaced
 *                                with a space in the reading text
 *   <note type="marginal">TXT</note> - the First1KGreek equivalent of the
 *                                above (Bekker citation as element content,
 *                                not an attribute); TXT is recorded the same
 *                                way. EXCLUDED from reading text either way.
 *   <note>...</note> (any other type/no type) - discarded entirely (tag AND
 *                                content), logged - matches the physics/
 *                                metaphysics-grc convention for editorial
 *                                notes. EXCEPTION: De Partibus Animalium only
 *                                (opts.keepBareNotes) - see workTable.ts.
 *   <del>...</del>            - editorially-judged spurious/interpolated
 *                                text that the edition still PRINTS (OCT
 *                                convention: bracketed). KEPT verbatim in
 *                                the reading text, wrapped in square brackets
 *                                `[...]`, logged with the full (untruncated)
 *                                span. If the del's own printed text already
 *                                contains a literal `[` or `]`, NO additional
 *                                bracket pair is added (logged distinctly so
 *                                that's visible, not silently different from
 *                                every other occurrence). Policy superseded
 *                                2026-09 from an original "excluded" brief -
 *                                see workTable.ts's module doc.
 *   <choice><sic>X</sic><corr>Y</corr></choice> - Y (the correction) is KEPT
 *                                as the reading text; X (the apparent error)
 *                                is EXCLUDED, logged for disclosure.
 *   <sic>X</sic> bare (NOT inside <choice>, i.e. no <corr> alternative is
 *                                offered) - X IS the edition's own printed
 *                                reading (marking it as a known crux, not an
 *                                error to silently fix); KEPT verbatim,
 *                                logged as a crux.
 *   <add>...</add>            - KEPT inline in reading text, logged verbatim
 *   <bibl>...</bibl>          - EXCLUDED (modern editorial citation, not
 *                                Aristotle's own words), logged verbatim
 *   <gap reason="ellipsis" rend="X"/> - the edition itself prints an
 *                                ellipsis here; KEPT as the literal printed
 *                                text X, logged
 *   <gap reason="lost|omitted" .../›  - a real lacuna/editorial omission;
 *                                contributes NO text, logged
 *   <q>,<quote>,<foreign>,<l>,<lg>,<hi>,<num>,<title>,<item>,<list>,<cit>
 *                              - genuine content wrappers (quotations, verse,
 *                                foreign-language snippets, emphasis,
 *                                numerals, a quoted work's title, list/table
 *                                items - Aristotle's own doctrine in several
 *                                cases, e.g. Eudemian Ethics's virtue/vice
 *                                triads printed as a `<list rend="table">`):
 *                                tags stripped, text kept inline as ordinary
 *                                reading prose (any table/list layout is
 *                                necessarily flattened to running text -
 *                                logged once per work as an anomaly, not
 *                                per-occurrence). IMPORTANT: several of
 *                                these (`<lg>`/`<l>` above all, for quoted
 *                                verse - Empedocles in De Anima and De
 *                                Respiratione, Homer in Historia Animalium,
 *                                etc.) are printed as SIBLINGS of `<p>`
 *                                inside a chapter div, not nested inside
 *                                one - see the "unified paragraph
 *                                accumulation" doc comment below for how
 *                                that content is captured as its own
 *                                implicit paragraph rather than silently
 *                                dropped (an earlier version of this walker
 *                                had exactly that bug).
 *   <head>...</head>          - captured verbatim (cleaned) IFF it is the
 *                                first thing in its div (before any <p> or
 *                                child div); never included in reading text
 */

import { cleanText, decodeEntities, stripTagsForExcerpt } from './text.ts';

export interface WalkParagraph {
  /** verbatim reading text for this <p>: entities decoded, NFC-normalised,
   *  ws collapsed, scaffolding removed, apparatus resolved per the rules above */
  text: string;
  /** raw (uncleaned) Bekker-mark strings found while this paragraph was open, doc order */
  marks: string[];
  delCount: number;
  addCount: number;
  addExcerpts: string[];
  ellipsisGapCount: number;
  lostGapCount: number;
}

export interface WalkDiv {
  type: 'edition' | 'textpart';
  subtype: string | null;
  n: string | null;
  head: string | null;
  /** <p> elements that are DIRECT children of this div (not inside a nested div) */
  paragraphs: WalkParagraph[];
  children: WalkDiv[];
  /** every raw Bekker-mark string found ANYWHERE in this div's subtree, in document order */
  allMarks: string[];
}

export interface WalkLog {
  where: string;
  kind:
    | 'del-bracketed'
    | 'del-already-bracketed'
    | 'add'
    | 'note-discarded'
    | 'note-kept-verbatim'
    | 'bibl'
    | 'gap-lost'
    | 'gap-ellipsis'
    | 'sic-kept'
    | 'choice-sic-logged';
  excerpt: string;
}

export interface WalkResult {
  root: WalkDiv;
  logs: WalkLog[];
}

const PAIRED_EXCLUDE = new Set(['del', 'bibl']); // content always dropped
// `choice` is a transparent wrapper (its children <sic>/<corr> get their own
// bespoke handling below, not this bucket); included here only so it's a
// KNOWN tag and falls through the generic catch-all harmlessly.
const PAIRED_UNWRAP = new Set(['q', 'quote', 'foreign', 'l', 'lg', 'hi', 'num', 'title', 'item', 'list', 'cit', 'choice']); // content kept, tag stripped
// `add`, `note`, `sic`, `corr` are paired but need bespoke handling (see
// below), not the generic exclude/unwrap buckets.
const KNOWN_TAGS = new Set([
  'div',
  'p',
  'head',
  'lb',
  'pb',
  'milestone',
  'del',
  'add',
  'note',
  'gap',
  'sic',
  'corr',
  ...PAIRED_UNWRAP,
  'bibl',
]);

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1]! : null;
}

/** Does this milestone/note value look like a Bekker page/column citation
 *  (vs. a line number or running paragraph counter tagged the same way in a
 *  few source files - see text.ts#cleanBekkerMark, applied by the caller)? */
function looksLikeBekkerMark(s: string): boolean {
  return /\d+\s*[ab]\b/i.test(s);
}

export interface WalkOptions {
  /** De Partibus Animalium's tlg030.1st1K-grc1 source only (see workTable.ts):
   *  19 bare `<note>` (no type attribute - distinct from `<note type=
   *  "marginal">`) spans in Book 4 hold, verbatim, a substantial DOUBLET of
   *  parallel variant readings ("editio prior" / "editio posterior (cod.
   *  Y)"), up to ~1.5KB of running Greek prose each - genuine ancient
   *  content, not modern editorial commentary. Discarding them (this
   *  importer's default policy for a non-citation <note>, matching physics-
   *  grc) would silently delete real text (one whole chapter, book-4-ch-12,
   *  would otherwise end up with ZERO passages - caught by the raw-vs-
   *  imported coverage check in validate.ts). When true, every bare <note>
   *  is UNWRAPPED (kept inline, tag stripped) instead of discarded, and
   *  logged distinctly so the resulting doubled phrasing is explained rather
   *  than silently present. */
  keepBareNotes?: boolean;
}

export function walkEdition(xml: string, fileLabel: string, opts: WalkOptions = {}): WalkResult {
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
      if (name === 'body' || name === 'div') continue;
      if (!KNOWN_TAGS.has(name)) {
        throw new Error(`${fileLabel}: unexpected tag <${name}> in the source body - inspect before proceeding`);
      }
    }
  }

  const TOKEN_RE =
    /<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<head\b[^>]*>([\s\S]*?)<\/head>|<lb\b[^>]*\/>|<pb\b[^>]*\/>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<choice\b[^>]*>|<sic\b[^>]*>|<\/sic>|<corr\b[^>]*>|<\/corr>|<[^>]+>/g;

  const logs: WalkLog[] = [];
  const stack: WalkDiv[] = [];
  let root: WalkDiv | null = null;

  // --- unified paragraph accumulation --------------------------------
  // A "paragraph" (WalkParagraph) is built either from a REAL <p>...</p>
  // (closed explicitly by </p>) or IMPLICITLY from any content that sits
  // directly inside a div but OUTSIDE any <p> - most commonly a verse
  // quotation printed as a `<lg><l>...</l></lg>` SIBLING of the surrounding
  // `<p>`s rather than nested inside one (confirmed by direct inspection:
  // De Anima book-1-ch-2 quotes Empedocles this way - `</p><lg><l>γαίῃ μὲν
  // γὰρ γαῖαν...</l></lg><p>Τὸν αὐτὸν δὲ τρόπον...` - and the same shape
  // recurs, with other quoted poets, in De Respiratione, De Sensu, Historia
  // Animalium, Meteorologica and De Divinatione per Somnum). An earlier
  // version of this walker only ever accumulated text while inside a real
  // <p>, so this sibling content was silently dropped - caught by the raw-
  // vs-imported character-coverage check in validate.ts, which is why that
  // check exists. `isReal` distinguishes the two only so the flush trigger
  // differs (`</p>` for a real one; the next structural boundary - a new
  // <p>, a <div> open, or a </div> close - for an implicit one); a flushed
  // implicit paragraph is pushed to the SAME div.paragraphs array as a real
  // one and is otherwise indistinguishable downstream.
  let accumulating = false;
  let isReal = false;
  let buf = '';
  let pMarks: string[] = [];
  let pDel = 0;
  let pAdd = 0;
  let pAddExcerpts: string[] = [];
  let pEllipsis = 0;
  let pLost = 0;

  function ensureAccumulating(): void {
    if (!accumulating && stack.length > 0) {
      accumulating = true;
      isReal = false;
      buf = '';
      pMarks = [];
      pDel = 0;
      pAdd = 0;
      pAddExcerpts = [];
      pEllipsis = 0;
      pLost = 0;
    }
  }

  /** Push the current accumulation onto `div.paragraphs` if it's an
   *  IMPLICIT run with non-empty cleaned text; always resets state. Real
   *  paragraphs are pushed only by their own `</p>` handler, never here. */
  function flushIfImplicit(div: WalkDiv | undefined): void {
    if (accumulating && !isReal) {
      const text = cleanText(buf);
      if (text.length > 0 && div) {
        div.paragraphs.push({
          text,
          marks: pMarks,
          delCount: pDel,
          addCount: pAdd,
          addExcerpts: pAddExcerpts,
          ellipsisGapCount: pEllipsis,
          lostGapCount: pLost,
        });
      }
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
  /** true while inside a non-marginal <note> that opts.keepBareNotes says to
   *  keep inline rather than discard - see WalkOptions#keepBareNotes. */
  let noteSuppressesText = false;
  let biblDepth = 0;
  let biblOpenEnd = 0;
  let choiceDepth = 0;
  let sicOpenEnd = 0;
  /** true while inside a <sic> that is nested inside <choice> (the reading
   *  kept is <corr>, so this <sic> must NOT contribute to buf); false for a
   *  bare <sic> (no enclosing <choice>), which IS the printed reading and is
   *  kept - see the coordinator-confirmed rule in workTable.ts's module doc. */
  let sicSuppresses = false;

  const currentPath = () => stack.map((d) => `${d.subtype ?? d.type}${d.n ? `[${d.n}]` : ''}`).join('/');

  TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(body))) {
    const tok = m[0];

    ensureAccumulating();
    if (
      accumulating &&
      delDepth === 0 &&
      !(noteDepth > 0 && noteSuppressesText) &&
      biblDepth === 0 &&
      !sicSuppresses &&
      m.index > lastIndex
    ) {
      buf += body.slice(lastIndex, m.index);
    }
    lastIndex = TOKEN_RE.lastIndex;

    if (tok.startsWith('<div')) {
      // Any implicit run belongs to the div ABOUT TO BE the parent of the
      // new child - flush it before pushing, not after (it precedes the
      // child in document order).
      flushIfImplicit(stack[stack.length - 1]);
      const type = (attr(tok, 'type') as 'edition' | 'textpart' | null) ?? 'textpart';
      const subtype = attr(tok, 'subtype');
      const n = attr(tok, 'n');
      const div: WalkDiv = { type, subtype, n, head: null, paragraphs: [], children: [], allMarks: [] };
      if (stack.length) stack[stack.length - 1]!.children.push(div);
      stack.push(div);
      if (type === 'edition' && !root) root = div;
    } else if (tok === '</div>') {
      // Any implicit run belongs to the div that is CLOSING - flush before popping.
      flushIfImplicit(stack[stack.length - 1]);
      stack.pop();
    } else if (tok.startsWith('<head')) {
      // NOTE: matches `<head>` and attributed forms like `<head rend="center">`
      // (found in Athenian Constitution, Poetics, Problemata, De Plantis, De
      // Ventis, De Melisso-Xenophane-Gorgia) - an earlier version of this
      // walker matched only the bare `<head>` string, so an attributed head
      // fell through to the generic catch-all (which only consumes the open
      // tag, not the whole head..</head> span) and its text either leaked
      // into the surrounding reading text or, when the head sat directly at
      // the edition root before any chapter/section div (De Ventis), became
      // an orphaned "paragraph" on the root div that no shape ever folds
      // into output - silent data loss, caught by the coverage check.
      const headRaw = m[1] ?? '';
      const top = stack[stack.length - 1];
      if (top && top.head === null && top.paragraphs.length === 0 && top.children.length === 0) {
        top.head = cleanText(headRaw);
      }
    } else if (/^<p[\s>]/.test(tok)) {
      // NOTE: must NOT match via a bare `tok.startsWith('<p')` check - that
      // also matches `<pb .../>` (page-break), which would wrongly reopen/
      // reset the paragraph buffer on every page break and silently drop
      // everything accumulated before it. Caught by a raw-vs-imported
      // character-count audit (see validate.ts) after an initial run showed
      // ~4-5x too little text survived per chapter in the First1KGreek
      // sources (which use frequent <pb/>), while lower-<pb/>-density
      // Perseus sources were only marginally affected.
      flushIfImplicit(stack[stack.length - 1]); // any implicit run precedes this real <p>
      accumulating = true;
      isReal = true;
      buf = '';
      pMarks = [];
      pDel = 0;
      pAdd = 0;
      pAddExcerpts = [];
      pEllipsis = 0;
      pLost = 0;
    } else if (tok === '</p>') {
      const top = stack[stack.length - 1];
      if (top) {
        top.paragraphs.push({
          text: cleanText(buf),
          marks: pMarks,
          delCount: pDel,
          addCount: pAdd,
          addExcerpts: pAddExcerpts,
          ellipsisGapCount: pEllipsis,
          lostGapCount: pLost,
        });
      }
      accumulating = false;
      isReal = false;
    } else if (tok.startsWith('<lb') || tok.startsWith('<pb')) {
      if (accumulating) buf += ' ';
    } else if (tok.startsWith('<milestone')) {
      const raw = attr(tok, 'n');
      if (raw && looksLikeBekkerMark(raw)) {
        for (const d of stack) d.allMarks.push(raw);
        if (accumulating) pMarks.push(raw);
      }
      if (accumulating) buf += ' ';
    } else if (tok.startsWith('<gap')) {
      const reason = attr(tok, 'reason') ?? '';
      const rend = attr(tok, 'rend');
      if (reason === 'ellipsis') {
        const literal = rend ?? '…';
        if (accumulating) {
          buf += literal;
          pEllipsis += 1;
        }
        logs.push({ where: currentPath(), kind: 'gap-ellipsis', excerpt: literal });
      } else {
        if (accumulating) pLost += 1;
        logs.push({ where: currentPath(), kind: 'gap-lost', excerpt: `reason=${JSON.stringify(reason)} rend=${JSON.stringify(rend)}` });
        if (accumulating) buf += ' ';
      }
    } else if (tok.startsWith('<del')) {
      delDepth += 1;
      delOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</del>') {
      // Policy (superseded from the original "excluded" brief - see
      // workTable.ts's module doc and WORKS.md): a <del> span is text an
      // editor judged spurious/interpolated but still PRINTS, bracketed, in
      // the edition (the OCT convention) - so it is KEPT verbatim in the
      // reading text, wrapped in square brackets, exactly as printed. Tags
      // nested inside the span (e.g. a stray <lb/>) are stripped to a space;
      // entity-decoding happens once, later, at paragraph-flush time (via
      // cleanText), matching how ordinary prose flows into `buf` elsewhere -
      // so the raw (undecoded) slice is used here too, not a decoded copy.
      const rawInner = body.slice(delOpenEnd, m.index).replace(/<[^>]+>/g, ' ');
      const alreadyBracketed = rawInner.includes('[') || rawInner.includes(']');
      delDepth = Math.max(0, delDepth - 1);
      if (accumulating) {
        buf += alreadyBracketed ? rawInner : `[${rawInner}]`;
        pDel += 1;
      }
      const cleanedInner = cleanText(rawInner);
      logs.push({ where: currentPath(), kind: alreadyBracketed ? 'del-already-bracketed' : 'del-bracketed', excerpt: cleanedInner });
    } else if (tok.startsWith('<add')) {
      addDepth += 1;
      addOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</add>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(addOpenEnd, m.index)));
      addDepth = Math.max(0, addDepth - 1);
      if (accumulating) {
        pAdd += 1;
        pAddExcerpts.push(excerpt);
      }
      logs.push({ where: currentPath(), kind: 'add', excerpt });
    } else if (tok.startsWith('<note')) {
      noteDepth += 1;
      noteOpenEnd = TOKEN_RE.lastIndex;
      noteIsMarginal = attr(tok, 'type') === 'marginal';
      noteSuppressesText = noteIsMarginal || !opts.keepBareNotes;
    } else if (tok === '</note>') {
      const raw = decodeEntities(body.slice(noteOpenEnd, m.index)).trim();
      noteDepth = Math.max(0, noteDepth - 1);
      if (noteIsMarginal) {
        for (const d of stack) d.allMarks.push(raw);
        if (accumulating) pMarks.push(raw);
      } else if (opts.keepBareNotes) {
        logs.push({ where: currentPath(), kind: 'note-kept-verbatim', excerpt: stripTagsForExcerpt(raw) });
      } else {
        logs.push({ where: currentPath(), kind: 'note-discarded', excerpt: stripTagsForExcerpt(raw) });
      }
      noteSuppressesText = false;
    } else if (tok.startsWith('<bibl')) {
      biblDepth += 1;
      biblOpenEnd = TOKEN_RE.lastIndex;
    } else if (tok === '</bibl>') {
      const excerpt = stripTagsForExcerpt(decodeEntities(body.slice(biblOpenEnd, m.index)));
      biblDepth = Math.max(0, biblDepth - 1);
      logs.push({ where: currentPath(), kind: 'bibl', excerpt });
    } else if (tok.startsWith('<choice')) {
      choiceDepth += 1;
      // transparent wrapper - its <sic>/<corr> children get their own
      // handling below; nothing else to do here.
    } else if (tok === '</choice>') {
      choiceDepth = Math.max(0, choiceDepth - 1);
    } else if (tok.startsWith('<sic')) {
      sicOpenEnd = TOKEN_RE.lastIndex;
      // Inside <choice>, <corr> is the kept reading and this <sic> is the
      // apparatus variant - suppress it from buf. A BARE <sic> (no
      // enclosing <choice>) IS the edition's own printed reading (there is
      // no <corr> alternative offered) and must flow through normally.
      sicSuppresses = choiceDepth > 0;
    } else if (tok === '</sic>') {
      const excerpt = cleanText(body.slice(sicOpenEnd, m.index).replace(/<[^>]+>/g, ' '));
      if (sicSuppresses) {
        logs.push({ where: currentPath(), kind: 'choice-sic-logged', excerpt });
      } else {
        logs.push({ where: currentPath(), kind: 'sic-kept', excerpt });
      }
      sicSuppresses = false;
    }
    // else: generic catch-all `<[^>]+>` for PAIRED_UNWRAP tags (q, quote,
    // foreign, l, lg, hi, num, title, item, list, cit) and <corr>/its closer
    // (kept verbatim - the reading text inside a <choice>) - tag stripped,
    // enclosed free text keeps flowing via the normal inter-token append above.
  }

  if (!root) throw new Error(`${fileLabel}: root <div type="edition"> never closed`);
  return { root, logs };
}

export { PAIRED_EXCLUDE, PAIRED_UNWRAP };
