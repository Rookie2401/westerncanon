/**
 * Parser for the 2 of this work's 11 Wikisource pages that ARE djvu page-scan
 * transclusions (Peace, Lysistrata - confirmed by direct inspection: their
 * wikitext is only a `<pages index="..." from=X to=Y />` marker, a few
 * hundred bytes, so the RENDERED HTML was fetched instead via
 * action=parse&prop=text, exactly as scripts/import-aristotle-rest-en-shared/
 * pagescan.ts does for its own batch).
 *
 * DOM shape (verified by direct inspection of both cached responses):
 *   <div class="prp-pages-output">...</div>   - one per printed djvu page, in
 *     document order; concatenated here, page boundaries themselves carry no
 *     content meaning and are ignored.
 *   Inside each page div, in document order:
 *     <div class="wst-center tiInherit"><p><span style="font-size:...">TEXT
 *       </span></p></div>                      - a decorative running-title
 *       heading ("PEACE" / "INTRODUCTION" / "LYSISTRATA"), repeated at the
 *       top of every section; NOT a speaker cue (no span.smallcaps) - skipped.
 *     <div class="wst-center tiInherit"><p><span class="smallcaps">NAME</span>
 *       .</p></div>                            - a SPEAKER CUE, once the cast
 *       list has been passed (see below); starts a new Passage.
 *     <div class="wst-block-center">...</div>  - the Dramatis Personæ cast
 *       list, immediately following a heading div whose text contains
 *       "DRAMATIS PERSON#" - one <p> per character (name in span.smallcaps
 *       plus any trailing description), and, nested in a div.wst-dent, the
 *       "Scene: ..." line, which is kept as the cast list's own final entry
 *       (this source prints it there, not as a stage direction opening the
 *       play text).
 *     <p>...</p>                                - a body paragraph: appended
 *       to the speech in progress.
 *     <div class="reflist wst-smallrefs">...</div>  - the footnote apparatus
 *       (<li id="cite_note-N"><span class="reference-text">...</span></li>);
 *       processing stops here.
 *   Everything else at this level (<style>, stray text nodes, <div class=
 *   "__nop wst-nop">, <div class="wst-dhr">) is page-layout furniture and is
 *   skipped without comment.
 *
 * Footnote markers appear inline as <sup class="reference" id="cite_ref-N">
 * [N]</sup>; removed from the extracted text and recorded so the surrounding
 * Passage can carry a trailing "[Note N: ...]" line, per this batch's brief -
 * same convention as wikitextPlay.ts, and using the SAME numbers this source
 * itself prints (cite_ref-N / cite_note-N), unlike the plain-wikitext plays
 * (whose <ref> tags carry no number of their own and are renumbered here in
 * document order instead).
 *
 * Stage directions print as a plain "(" ")" pair around italicised text, e.g.
 * "(<i>to Trygæus</i>)" - the parentheses are themselves plain text (not
 * inside the <i>), so a straightforward textContent extraction already
 * yields literal "(to Trygæus)"; converted to "[to Trygæus]" here, the same
 * bracket convention as the wikitext plays and the rest of this app's drama
 * corpus, wherever it occurs (inline mid-speech or as the opening of a cue).
 */

import { JSDOM, type JSDOMElement } from 'jsdom';
import { cleanText, type Anomaly } from './text.ts';

export interface RawPassage {
  speaker: string | null;
  text: string;
  footnoteNumbers: number[];
}

export interface PagescanPlayResult {
  dramatisPersonae: string[];
  passages: RawPassage[];
  footnotes: Map<number, string>;
  speakerLabelsSeen: string[];
  anomalies: Anomaly[];
  headingsSkipped: number;
}

function fail(where: string, msg: string): never {
  process.stderr.write(`STOP (aristophanes page-scan parser, ${where}): ${msg}\n`);
  process.exit(1);
}

function bracketDirections(s: string): string {
  return s.replace(/\(([^()]*)\)/g, (_m, inner: string) => `[${cleanText(inner)}]`);
}

/** Extract text of `el`, stripping (and reporting) any <sup class="reference" id="cite_ref-N"> markers. */
function extractText(el: JSDOMElement, footnoteNumbersOut: number[]): string {
  const clone = el;
  for (const sup of clone.querySelectorAll('sup.reference')) {
    const id = sup.getAttribute('id') ?? '';
    const m = /^cite_ref-(\d+)/.exec(id);
    if (m) footnoteNumbersOut.push(Number(m[1]));
    sup.remove();
  }
  return cleanText(clone.textContent ?? '');
}

/**
 * Extract JUST the Dramatis Personæ cast list from a page-scan-rendered HTML
 * document, without parsing the rest of the page as a play body. Used by
 * index.ts for Plutus, whose front pages (title, Dramatis Personæ) turned
 * out to be a page-scan transclusion even though the play body proper - a
 * few pages later on the SAME Wikisource page - is ordinary wikitext (see
 * wikitextPlay.ts's module doc and this batch's report for how that mixed
 * shape was discovered). Returns null if no "DRAMATIS PERSON#" heading is
 * found at all (never a failure by itself - not every play necessarily
 * prints one).
 */
export function extractDramatisPersonaeFromHtml(html: string, where: string): string[] | null {
  const doc = new JSDOM(html).window.document;
  const pageDivs = doc.querySelectorAll('div.prp-pages-output');
  if (pageDivs.length === 0) fail(where, 'no div.prp-pages-output found - this page is not the rendered page-scan transclusion it was expected to be');

  let expectNext = false;
  for (const page of pageDivs) {
    for (const child of page.children) {
      if (child.tagName === 'DIV' && /\bwst-center\b/.test(child.className ?? '')) {
        if (/DRAMATIS\s+PERSON/i.test(cleanText(child.textContent ?? ''))) expectNext = true;
        continue;
      }
      if (expectNext && child.tagName === 'DIV' && /\bwst-block-center\b/.test(child.className ?? '')) {
        const entries: string[] = [];
        for (const p of child.querySelectorAll('p')) {
          const fn: number[] = [];
          const t = extractText(p, fn);
          if (t.length > 0) entries.push(t);
        }
        if (entries.length === 0) fail(where, 'Dramatis Personæ block-center div carried no <p> entries');
        return entries;
      }
    }
  }
  return null;
}

export function parsePagescanPlay(html: string, where: string): PagescanPlayResult {
  const anomalies: Anomaly[] = [];
  const doc = new JSDOM(html).window.document;
  const pageDivs = doc.querySelectorAll('div.prp-pages-output');
  if (pageDivs.length === 0) fail(where, 'no div.prp-pages-output found - this page is not the rendered page-scan transclusion it was expected to be');

  const footnotes = new Map<number, string>();
  const speakerLabelsSeen: string[] = [];
  const passages: RawPassage[] = [];
  let curPassage: RawPassage | null = null;
  let dramatisPersonae: string[] | null = null;
  let expectDpNext = false;
  let headingsSkipped = 0;
  let stageDirectionsKept = 0;

  function flush(): void {
    if (curPassage) passages.push(curPassage);
    curPassage = null;
  }

  function appendToCurrent(text: string, footnoteNumbers: number[]): void {
    if (text.length === 0 && footnoteNumbers.length === 0) return;
    if (!curPassage) {
      if (text.length === 0) return;
      anomalies.push({ where, note: `Body text found with no speaker cue in force, kept as its own unattributed passage: ${JSON.stringify(text.slice(0, 100))}` });
      curPassage = { speaker: null, text, footnoteNumbers: [...footnoteNumbers] };
      return;
    }
    curPassage.text = text.length ? `${curPassage.text} ${text}`.trim() : curPassage.text;
    curPassage.footnoteNumbers.push(...footnoteNumbers);
  }

  outer: for (const page of pageDivs) {
    for (const child of page.children) {
      const cls = child.className ?? '';

      if (child.tagName === 'DIV' && /\breflist\b/.test(cls)) {
        for (const li of child.querySelectorAll('li[id]')) {
          const idAttr = li.getAttribute('id') ?? '';
          const m = /^cite[_-]note-(\d+)/.exec(idAttr);
          if (!m) continue;
          const span = li.querySelector('span.reference-text');
          const text = cleanText((span ?? li).textContent ?? '');
          footnotes.set(Number(m[1]), text);
        }
        break outer;
      }

      if (child.tagName === 'DIV' && /\bwst-center\b/.test(cls)) {
        const smallcaps = child.querySelectorAll('span.smallcaps');
        const collapsedText = cleanText(child.textContent ?? '');
        if (expectDpNext) {
          // heading divs between "DRAMATIS PERSONÆ" and the block-center are
          // not expected; the block-center itself is a sibling, handled below.
        }
        if (/DRAMATIS\s+PERSON/i.test(collapsedText)) {
          expectDpNext = true;
          continue;
        }
        if (smallcaps.length === 1 && dramatisPersonae !== null) {
          // A genuine speaker cue: exactly one smallcaps name, nothing else of substance.
          flush();
          const fn: number[] = [];
          const name = extractText(child, fn).replace(/\.\s*$/, '');
          speakerLabelsSeen.push(name);
          curPassage = { speaker: name, text: '', footnoteNumbers: fn };
          continue;
        }
        if (smallcaps.length === 0 && dramatisPersonae !== null && child.querySelector('i') !== null && /\p{Ll}/u.test(collapsedText)) {
          // A centred, italicised stage direction between speeches, e.g.
          // "The scene changes and heaven is presented." - reading text, kept as
          // its own bracketed direction passage (the running-title banners are
          // all-caps and carry no <i>, so they never reach this branch).
          flush();
          const fn: number[] = [];
          const direction = extractText(child, fn).replace(/^\((.*)\)$/, '$1');
          stageDirectionsKept += 1;
          passages.push({ speaker: null, text: `[${direction}]`, footnoteNumbers: fn });
          continue;
        }
        // decorative running-title heading (e.g. repeated "PEACE"/"LYSISTRATA"), or
        // the "INTRODUCTION" banner - front matter, not the play text.
        headingsSkipped += 1;
        continue;
      }

      if (child.tagName === 'DIV' && /\bwst-block-center\b/.test(cls) && expectDpNext) {
        const entries: string[] = [];
        for (const p of child.querySelectorAll('p')) {
          const fn: number[] = [];
          const t = extractText(p, fn);
          if (t.length > 0) entries.push(t);
        }
        if (entries.length === 0) fail(where, 'Dramatis Personæ block-center div carried no <p> entries');
        dramatisPersonae = entries;
        expectDpNext = false;
        continue;
      }

      if (child.tagName === 'P') {
        if (dramatisPersonae === null) continue; // front matter (title page / Introduction prose): not imported
        const fn: number[] = [];
        const raw = extractText(child, fn);
        const bracketed = bracketDirections(raw);
        appendToCurrent(bracketed, fn);
        continue;
      }

      // <style>/<link>/<div class="__nop wst-nop">/<div class="wst-dhr"> and
      // similar layout furniture: no reading text, silently skipped.
    }
  }
  flush();
  if (stageDirectionsKept > 0) {
    anomalies.push({ where, note: `${stageDirectionsKept} centred italic stage direction(s) printed between speeches (e.g. a scene change) were kept verbatim as their own bracketed direction passage(s), in document order.` });
  }

  if (dramatisPersonae === null) fail(where, 'no "DRAMATIS PERSONÆ" heading was found in this page\'s rendered HTML');
  return { dramatisPersonae, passages, footnotes, speakerLabelsSeen, anomalies, headingsSkipped };
}
