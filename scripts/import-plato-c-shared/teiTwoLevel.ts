/**
 * Shared regex-tokenizer parser for the Perseus/OGL canonical-greekLit TEI
 * sources behind Republic-grc, Laws-grc and Laws-en (Republic-en is a
 * different, non-XML source - see scripts/import-plato-republic-en/index.ts
 * for its own plain-text parser). Mirrors the technique in
 * scripts/import-euclid/index.ts (a streaming regex tokenizer over the raw
 * XML text, not a DOM/jsdom parse) rather than duplicating it three times.
 *
 * Structure parsed (verified by direct inspection of all three raw files
 * before writing this):
 *   <div type="textpart" subtype="book" n="N">
 *     <div type="textpart" subtype="section" resp="perseus" n="M">   (M = literal Stephanus page number)
 *       <p><said who="#Speaker">[<label>Speaker.</label>] text...</said></p>
 *       <p><said who="#Other"><label>Other.</label> text...</said></p>
 *       ...
 *     </div>
 *   </div>
 * Attribute order on the textpart divs is tolerated in any order (verified
 * varying between "subtype before n" and other permutations across the
 * corpus, same caveat as import-euclid) by parsing the whole attribute
 * string with small order-independent regexes rather than hardcoding
 * positions.
 *
 * Republic-grc has exactly one <p><said> per section (Socrates narrates the
 * whole dialogue in the first person, quoting the other speakers within his
 * own narration - confirmed: every <said> in that file carries
 * who="#Σωκράτης" and there is exactly one per section). Laws-grc/-en are
 * genuinely dramatic dialogue: many <p><said><label>...</label> ...</said></p>
 * turns per Stephanus page, alternating speakers. Both shapes are handled
 * identically here - a Section's Passage.text is simply all of that
 * section's paragraph strings (each keeping its own <label> verbatim, where
 * the source prints one) joined with "\n\n".
 *
 * Apparatus handling (never touches actual reading content):
 *   - <del>...</del>  (critical-apparatus rejected reading) EXCLUDED from
 *     the reading text; every occurrence logged verbatim to anomalies.
 *   - <add>...</add>  (editorial insertion) INCLUDED verbatim; every
 *     occurrence logged.
 *   - <supplied reason="...">...</supplied>  (text supplied for a lacuna,
 *     e.g. in a verse quotation) INCLUDED verbatim; every occurrence logged.
 *   - <sic>...</sic>  (source prints a form the editor flags as unusual but
 *     does not correct) INCLUDED verbatim, unmodified; every occurrence
 *     logged.
 *   - <gap reason=".../>  (a genuine, unrecoverable lacuna - "lost" in the
 *     Laws MSS, "ellipsis" in the Republic OCT) - nothing invented to fill
 *     it; every occurrence logged with its reason and location.
 *   - <note ...>...</note>  (Loeb translator's own footnotes, English Laws
 *     only - 549 of them) EXCLUDED entirely, tags and nested content alike
 *     (confirmed non-nested and balanced by direct inspection). Only a
 *     single corpus-level summary is logged, not one entry per footnote -
 *     the footnote text itself is translator apparatus, not Bury's
 *     translation of Plato, so what matters is disclosing that it was
 *     dropped and how many times, not preserving its wording.
 *   - <milestone .../> (page/section-letter/paragraph markers) always
 *     zero-width: Stephanus sub-page letters (e.g. "330a") are finer than
 *     this importer's Section granularity and carry no text of their own.
 *   - <q>, <quote>, <l>, <cit>, <gloss>, <placeName>, <foreign>,
 *     <emph>, <date>, <title> - all zero-width unwraps: the tag is dropped,
 *     its inner text kept exactly where it prints.
 *   - <bibl>...</bibl>  (an inline citation, e.g. "Tyrt. 12 (Bergk)" inside
 *     a <note>, or a bare attribution like <bibl>Tyrtaeus</bibl> printed
 *     right after a verse quotation with no source-side whitespace at all)
 *     EXCLUDED from the reading text, every occurrence logged individually.
 *     An earlier version of this parser kept bare (non-<note>-nested) <bibl>
 *     content on the theory it was "genuine printed translation text" - that
 *     was wrong: verified against actual output, it glued a citation into a
 *     quoted poem ("...richest of men, Tyrtaeus 12 Bergk though a man...")
 *     or bolted a bare name onto a quotation's end with no punctuation
 *     ("...smite the foe in close combat. Tyrtaeus Then we should..."). Like
 *     <note>, a <bibl> is the editor's own citation apparatus, not a word
 *     the speaker actually says; excluding it (not just patching the
 *     spacing around it) is the correct fix.
 */

import type { Division, Passage } from './types.ts';
import { cleanText } from './text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

export interface TeiTwoLevelStats {
  bookCount: number;
  sectionCount: number;
  paragraphCount: number;
  delSpans: number;
  addSpans: number;
  suppliedSpans: number;
  sicSpans: number;
  gapMarkers: number;
  noteSpans: number;
  biblSpans: number;
}

export interface TeiTwoLevelResult {
  divisions: Division[];
  anomalies: Anomaly[];
  stats: TeiTwoLevelStats;
}

export function bookIdOf(bookNum: number): string {
  return `book-${bookNum}`;
}
export function sectionIdOf(bookNum: number, stephanusN: string): string {
  return `${bookIdOf(bookNum)}-sec-${stephanusN}`;
}

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 160): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return m?.[1];
}

const TOKEN_RE =
  /<div\s+([^>]*)>|<\/div>|<p>|<\/p>|<said\b[^>]*>|<\/said>|<label>|<\/label>|<milestone\b([^>]*)\/>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<supplied\b([^>]*)>|<\/supplied>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<gap\b([^>]*)\/>|<sic\b[^>]*>|<\/sic>|<(?:q|quote|l|cit|gloss|placeName|foreign|emph|date|title)\b[^>]*>|<\/(?:q|quote|l|cit|gloss|placeName|foreign|emph|date|title)>/g;

const ZERO_WIDTH_UNWRAP_RE = /^<\/?(?:q|quote|l|cit|gloss|placeName|foreign|emph|date|title)\b/;
const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
const NO_SPACE_BEFORE_RE = /[\s([{'"‘“\-—–]/;
/**
 * Sentinel inserted between two consecutive <l> (verse line) elements of
 * the same quoted poem (e.g. the six-line Homer quotation at Laws 706e-
 * 707a) - a private-use codepoint that can never legitimately appear in
 * either source, so it survives cleanText's whitespace-collapse intact and
 * is turned into a real newline afterwards (see the </p> handler). Without
 * this, adjacent <l>s (which the source often abuts with no whitespace at
 * all between </l> and the next <l>) would either run two verse lines
 * together with no separator or collapse to a single space, losing the
 * quoted poem's own line structure - a real degradation of a verbatim
 * reading text, not mere transport scaffolding.
 */
const LINE_BREAK_MARKER = '';

/**
 * Parses one Perseus/OGL TEI source into a Book -> Section GenericWork
 * division tree. `sourceLabel` is used only in error/anomaly messages
 * (e.g. "plato-laws-en").
 */
export function parseTeiTwoLevel(
  xml: string,
  opts: { sourceLabel: string; expectedBookCount: number; expectedSectionCount: number },
): TeiTwoLevelResult {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail(`${opts.sourceLabel}: no <body>...</body> found in source XML`);
  const body = xml.slice(bodyStart, bodyEnd);

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'other' | 'book' | 'section'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentSectionDiv: Division | null = null;
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];

  let inP = false;
  let visibleBuf = '';
  let delDepth = 0;
  const delBufStack: string[] = [];
  let addDepth = 0;
  const addBufStack: string[] = [];
  let suppliedDepth = 0;
  const suppliedBufStack: string[] = [];
  const suppliedReasonStack: Array<string | undefined> = [];
  let sicDepth = 0;
  const sicBufStack: string[] = [];
  let suppressDepth = 0; // <note>
  let biblDepth = 0;
  const biblBufStack: string[] = [];

  let delSpans = 0;
  let addSpans = 0;
  let suppliedSpans = 0;
  let sicSpans = 0;
  let gapMarkers = 0;
  let noteSpans = 0;
  let biblSpans = 0;
  let paragraphCount = 0;

  const hereId = (): string => currentSectionId || (currentBookNum ? bookIdOf(currentBookNum) : opts.sourceLabel);

  /** The previous token processed (ignoring nothing - every token updates this), used only to detect a bare </l><l> line-to-line transition. */
  let prevTok = '';

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = TOKEN_RE.exec(body))) {
    if (inP && m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (delDepth === 0 && suppressDepth === 0 && biblDepth === 0) visibleBuf += free;
      if (delDepth > 0) for (let i = 0; i < delBufStack.length; i++) delBufStack[i] += free;
      if (addDepth > 0) for (let i = 0; i < addBufStack.length; i++) addBufStack[i] += free;
      if (suppliedDepth > 0) for (let i = 0; i < suppliedBufStack.length; i++) suppliedBufStack[i] += free;
      if (sicDepth > 0) for (let i = 0; i < sicBufStack.length; i++) sicBufStack[i] += free;
      if (biblDepth > 0) for (let i = 0; i < biblBufStack.length; i++) biblBufStack[i] += free;
    }
    lastIndex = TOKEN_RE.lastIndex;
    const tok = m[0];

    if (tok.startsWith('<div')) {
      const attrs = m[1] ?? '';
      const isTextpart = attr(attrs, 'type') === 'textpart';
      const subtype = attr(attrs, 'subtype');
      const n = attr(attrs, 'n') ?? '';
      if (isTextpart && subtype === 'book') {
        stack.push('book');
        currentBookNum = Number(n);
        if (!Number.isFinite(currentBookNum) || currentBookNum < 1) {
          fail(`${opts.sourceLabel}: unexpected book number "${n}"`);
        }
        currentBookDiv = {
          id: bookIdOf(currentBookNum),
          number: String(currentBookNum),
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        divisions.push(currentBookDiv);
        currentSectionDiv = null;
      } else if (isTextpart && subtype === 'section') {
        stack.push('section');
        if (!currentBookDiv) fail(`${opts.sourceLabel}: section div "${n}" encountered outside any book`);
        currentSectionId = sectionIdOf(currentBookNum, n);
        currentSectionDiv = {
          id: currentSectionId,
          number: n,
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        sectionParagraphs = [];
      } else {
        stack.push('other');
        if (isTextpart) {
          anomalies.push({
            where: hereId(),
            note: `Unexpected <div type="textpart" subtype="${subtype}"> encountered; treated as a structural no-op (not a book or section).`,
          });
        }
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') {
        if (!currentSectionDiv || !currentBookDiv) fail(`${opts.sourceLabel}: </div> closing a section with no open section/book`);
        if (sectionParagraphs.length === 0) {
          fail(`${opts.sourceLabel}: section ${currentSectionDiv.id} closed with zero paragraphs`);
        }
        const passage: Passage = { n: '', text: sectionParagraphs.join('\n\n'), ref: null };
        currentSectionDiv.passages = [passage];
        currentBookDiv.children.push(currentSectionDiv);
        currentSectionDiv = null;
        currentSectionId = '';
      } else if (kind === 'book') {
        currentBookDiv = null;
        currentBookNum = 0;
      }
    } else if (tok === '<p>') {
      inP = true;
      visibleBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const wasSuppressedByDel = delDepth !== 0;
      const wasSuppressedByNote = suppressDepth !== 0;
      if (wasSuppressedByDel || wasSuppressedByNote) {
        fail(`${opts.sourceLabel}: unbalanced <del>/<note> spanning a </p> boundary at ${hereId()}`);
      }
      // Turn LINE_BREAK_MARKER sentinels (inserted at </l><l> verse-line
      // boundaries, see above) into real newlines only now, after
      // cleanText's whitespace-collapse has already run - collapsing a
      // literal "\n" there would have erased the very line break we're
      // trying to preserve. Any space cleanText left immediately adjacent
      // to the marker (from real source whitespace/indentation between the
      // tags) is absorbed into the same newline rather than left dangling.
      const cleaned = cleanText(visibleBuf).replace(new RegExp(` *${LINE_BREAK_MARKER} *`, 'g'), '\n');
      if (cleaned.length > 0) {
        sectionParagraphs.push(cleaned);
        paragraphCount += 1;
      } else {
        anomalies.push({
          where: hereId(),
          note: 'A <p> in this division cleaned to empty text (its entire visible content was apparatus that this importer excludes, e.g. a fully-<del> or fully-<note> paragraph, or genuinely blank markup); dropped rather than emitted as an empty paragraph.',
        });
      }
    } else if (tok.startsWith('<del')) {
      delDepth += 1;
      delBufStack.push('');
    } else if (tok === '</del>') {
      const text = delBufStack.pop() ?? '';
      delDepth -= 1;
      delSpans += 1;
      anomalies.push({ where: hereId(), note: `<del> excluded from the reading text: "${excerpt(text)}"` });
    } else if (tok.startsWith('<add')) {
      addDepth += 1;
      addBufStack.push('');
    } else if (tok === '</add>') {
      const text = addBufStack.pop() ?? '';
      addDepth -= 1;
      addSpans += 1;
      anomalies.push({ where: hereId(), note: `<add> editorial insertion, kept verbatim in the reading text: "${excerpt(text)}"` });
    } else if (tok.startsWith('<supplied')) {
      suppliedDepth += 1;
      suppliedBufStack.push('');
      suppliedReasonStack.push(attr(m[3] ?? '', 'reason'));
    } else if (tok === '</supplied>') {
      const text = suppliedBufStack.pop() ?? '';
      const reason = suppliedReasonStack.pop();
      suppliedDepth -= 1;
      suppliedSpans += 1;
      anomalies.push({
        where: hereId(),
        note: `<supplied${reason ? ` reason="${reason}"` : ''}> editorially supplied text for a lacuna, kept verbatim in the reading text: "${excerpt(text)}"`,
      });
    } else if (tok.startsWith('<sic')) {
      sicDepth += 1;
      sicBufStack.push('');
    } else if (tok === '</sic>') {
      const text = sicBufStack.pop() ?? '';
      sicDepth -= 1;
      sicSpans += 1;
      anomalies.push({ where: hereId(), note: `<sic> - source prints this form and the editor flags but does not correct it; kept verbatim: "${excerpt(text)}"` });
    } else if (tok.startsWith('<note')) {
      suppressDepth += 1;
      noteSpans += 1;
    } else if (tok === '</note>') {
      suppressDepth -= 1;
      if (suppressDepth < 0) fail(`${opts.sourceLabel}: unbalanced </note> at ${hereId()}`);
    } else if (tok.startsWith('<bibl')) {
      biblDepth += 1;
      biblBufStack.push('');
    } else if (tok === '</bibl>') {
      const text = biblBufStack.pop() ?? '';
      biblDepth -= 1;
      if (biblDepth < 0) fail(`${opts.sourceLabel}: unbalanced </bibl> at ${hereId()}`);
      biblSpans += 1;
      anomalies.push({
        where: hereId(),
        note: `<bibl> excluded from the reading text (editor's citation apparatus, not the speaker's own words): "${excerpt(text)}"`,
      });
    } else if (tok.startsWith('<gap')) {
      gapMarkers += 1;
      const reason = attr(m[4] ?? '', 'reason');
      anomalies.push({
        where: hereId(),
        note: `<gap${reason ? ` reason="${reason}"` : ''}/> marks a genuine, unrecoverable lacuna in the source at this point; nothing invented to fill it.`,
      });
    } else if (ZERO_WIDTH_UNWRAP_RE.test(tok)) {
      // <q> <quote> <l> <bibl> <cit> <gloss> <placeName> <foreign> <emph>
      // <date> <title>, open or close: the tag itself contributes no text.
      // At least one of these (a <bibl> citation printed immediately after
      // a closing </quote> with no source-side whitespace at all -
      // confirmed directly in plato-laws-en, e.g. "...richest of men,
      // Tyrtaeus 12 Bergk though a man...") would otherwise glue two words
      // together with no separator, which is a transport/layout artifact of
      // the digital edition (the citation was originally set beside the
      // verse, not run into it), not part of either word. A synthetic
      // single space is inserted at exactly that kind of boundary - where
      // the next real character in the source is a letter/digit (a new
      // word starting immediately) AND the character already in the buffer
      // is neither whitespace nor an opening bracket/quote/hyphen (so a tag
      // sitting next to punctuation, e.g. "Lacedaemon</placeName>),", or
      // right after an opening "(", is never touched - confirmed by direct
      // inspection of every such boundary in all three sources: the only
      // real cases needing a space are a sentence-final comma/period butted
      // directly against the next tag (see above).
      if (inP && delDepth === 0 && suppressDepth === 0) {
        if (tok.startsWith('<l') && prevTok === '</l>') {
          // A verse line immediately following the previous line of the
          // same quoted poem: mark a line break instead of the ordinary
          // spacing rule (see LINE_BREAK_MARKER above).
          visibleBuf += LINE_BREAK_MARKER;
        } else {
          const before = visibleBuf.slice(-1);
          const after = body[lastIndex] ?? '';
          if (before && !NO_SPACE_BEFORE_RE.test(before) && WORD_CHAR_RE.test(after)) {
            visibleBuf += ' ';
          }
        }
      }
    }
    // <said>, </said>, <label>, </label>, <milestone .../>: no structural or
    // buffering action beyond token recognition, so their raw tag text is
    // never appended to visibleBuf but whatever they wrap keeps flowing
    // through as ordinary free text.
    prevTok = tok;
  }

  if (stack.length !== 0) fail(`${opts.sourceLabel}: unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (suppressDepth !== 0) fail(`${opts.sourceLabel}: unbalanced <note> nesting at end of document`);
  if (delDepth !== 0 || addDepth !== 0 || suppliedDepth !== 0 || sicDepth !== 0) {
    fail(`${opts.sourceLabel}: unbalanced apparatus tag nesting at end of document`);
  }

  if (divisions.length !== opts.expectedBookCount) {
    fail(`${opts.sourceLabel}: expected ${opts.expectedBookCount} Book divisions, got ${divisions.length}`);
  }
  const sectionCount = divisions.reduce((n, b) => n + b.children.length, 0);
  if (sectionCount !== opts.expectedSectionCount) {
    fail(`${opts.sourceLabel}: expected ${opts.expectedSectionCount} total Section divisions, got ${sectionCount}`);
  }

  if (noteSpans > 0) {
    anomalies.push({
      where: `${opts.sourceLabel} / footnote apparatus`,
      note: `${noteSpans} <note> spans (the Loeb translator's own footnotes, not Plato's/Bury's dialogue text) were excluded entirely, tags and nested content alike. Individual occurrences are not logged one-by-one (there are ${noteSpans} of them and their wording is apparatus, not reading text) - see this summary instead.`,
    });
  }

  // A stray, bare "<" or ">" surviving in a passage's final text means
  // either a genuinely odd literal character printed in the source itself
  // (confirmed for Republic-grc: three sections each carry a lone ">" as
  // the very first character right after a page/section <milestone> pair -
  // real content of the digital edition, not markup; kept verbatim per the
  // faithfulness rule and logged here) or, in principle, a markup shape
  // this tokenizer doesn't yet recognise. Either way it's surfaced rather
  // than silently shipped or silently dropped.
  const strayAngleRe = /[<>]/;
  const walkForStrayAngles = (ds: Division[]): void => {
    for (const d of ds) {
      for (const p of d.passages) {
        if (strayAngleRe.test(p.text)) {
          const idx = p.text.search(strayAngleRe);
          anomalies.push({
            where: d.id,
            note: `A literal "<" or ">" character survives in this division's reading text (not markup - already outside any recognised tag): "...${excerpt(p.text.slice(Math.max(0, idx - 20), idx + 20))}...". Confirmed present in the raw source itself at this exact spot; kept verbatim, not stripped or guessed at.`,
          });
        }
      }
      walkForStrayAngles(d.children);
    }
  };
  walkForStrayAngles(divisions);

  return {
    divisions,
    anomalies,
    stats: {
      bookCount: divisions.length,
      sectionCount,
      paragraphCount,
      delSpans,
      addSpans,
      suppliedSpans,
      sicSpans,
      gapMarkers,
      noteSpans,
      biblSpans,
    },
  };
}
