/**
 * Shared Latin-side parser for the Cicero letters-selection importers
 * (Ad Atticum, Ad Familiares, Ad Quintum Fratrem, Ad Brutum - all four
 * share the same Perseus/OpenGreekAndLatin canonical-latinLit TEI shape):
 *
 *   <div type="textpart" n="B" subtype="book|Book">
 *     <div type="textpart" n="L" subtype="letter">
 *       <milestone unit="vulgate-letter" n="..."/>
 *       <label rend="opener">
 *         <seg rend="dateline">...</seg>
 *         <seg rend="salute">...</seg>
 *       </label>
 *       <div type="textpart" n="S" subtype="section">
 *         <p> ... </p>
 *       </div>
 *       ...
 *     </div>
 *     ...
 *   </div>
 *
 * Confirmed by direct inspection: the `subtype="book"` attribute's casing
 * genuinely differs between collections (lowercase "book" for Ad Atticum,
 * capitalised "Book" for Ad Familiares/Ad Quintum Fratrem/Ad Brutum) - the
 * caller passes which one this source uses; "letter" and "section" are
 * lowercase in all four. Letter `n` tokens are Purser's own labels and are
 * NOT always plain integers - some traditionally single-numbered letters are
 * split into lettered sub-letters in this critical edition (e.g. Ad Atticum
 * 12.5 -> "5", "5A", "5B", "5C"); every token actually present is kept as
 * its own Division, verbatim, not merged or renumbered - see the per-work
 * about.json "Known gaps & anomalies" section.
 *
 * Faithfulness rules applied here (mirrors every other importer in this
 * repo - see data/nicomachean-ethics-en/types.ts's sibling importer):
 *   - verbatim Latin reading text only.
 *   - `<reg>`, `<del>`, `<add>`, `<sic>`, `<corr>`, `<choice>`, `<abbr>`,
 *     `<expan>`, `<hi>`, `<foreign>`, `<quote>`, `<date>`, `<seg>` (outside
 *     a `<label>`) and every other inline tag not named below are pure
 *     typographic/critical-apparatus wrapper tags around genuine received
 *     text - unwrapped, never dropped (this is Purser's own printed reading
 *     text, including his editorially-deleted/-added words; we are not
 *     re-editing his critical choices).
 *   - `<milestone .../>`, `<pb .../>`, `<lb .../>` are self-closing
 *     transport scaffolding (page/line breaks, vulgate-letter cross-refs) -
 *     dropped, no text lost.
 *   - `<note>...</note>` (apparatus criticus, when present) is discarded
 *     entirely, tag and content.
 *   - `<gap reason="omitted"/>` marks a place Purser's edition itself omits
 *     text (self-closing, no content to preserve) - counted and logged by
 *     the caller per occurrence within an extracted letter; nothing is
 *     fabricated in its place.
 *   - `<label rend="opener">` (dateline + salute) is captured separately as
 *     the Division's sourceHeading, NOT mixed into the passage text.
 */

import { decodeEntities, collapseWs } from '../import-isagoge-shared/text.ts';

function cleanText(input: string): string {
  return collapseWs(decodeEntities(input));
}

export interface LatinLetter {
  book: number;
  /** Purser's own letter token, verbatim casing, e.g. "19", "5A" */
  letter: string;
  sourceHeading: string | null;
  /** one entry per source `subtype="section"` division, in document order */
  sectionTexts: string[];
  /** whole-letter text = sectionTexts joined with "\n\n" (or loose paragraphs if no section wrapper was found) */
  text: string;
  gapCount: number;
}

interface ParseResult {
  /** key = `${book}.${letter}` (letter token verbatim, e.g. "12.5A") */
  byKey: Map<string, LatinLetter>;
  /** book number -> ordered list of letter tokens as found in document order */
  byBook: Map<number, string[]>;
  totalGaps: number;
  totalNotes: number;
}

export function parseLatinLetters(xml: string, bookSubtype: 'book' | 'Book'): ParseResult {
  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) throw new Error('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const bookOpenRe = new RegExp(`^<div type="textpart" n="([^"]+)" subtype="${bookSubtype}">$`);
  const letterOpenRe = /^<div type="textpart" n="([^"]+)" subtype="letter">$/;
  const sectionOpenRe = /^<div type="textpart" n="([^"]+)" subtype="section">$/;

  const tokenRe = /<[^>]+>/g;

  type Kind = 'book' | 'letter' | 'section' | 'label' | 'other';
  const stack: Kind[] = [];

  const byKey = new Map<string, LatinLetter>();
  const byBook = new Map<number, string[]>();

  let currentBook = 0;
  let currentLetterToken = '';
  let currentLetter: LatinLetter | null = null;
  let sectionParagraphs: string[] = [];
  let looseParagraphs: string[] = [];
  let inSection = false;

  let inP = false;
  let pBuf = '';
  let inLabel = false;
  let labelBuf = '';
  let noteDepth = 0;

  let totalGaps = 0;
  let totalNotes = 0;

  // NOTE: the open/close steps below are inlined directly in the loop
  // (rather than factored into openLetter()/closeSection()/closeLetter()
  // helper functions) because the TypeScript version pinned by this repo's
  // tsconfig infers `currentLetter`'s narrowed type as `never` at several
  // later read sites when those steps live in separate function
  // declarations that close over it - inlining keeps this a single linear
  // control-flow region, which type-checks correctly.
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inLabel) labelBuf += free;
        else if (inP) pBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    let mm: RegExpMatchArray | null;
    if ((mm = tok.match(bookOpenRe))) {
      stack.push('book');
      currentBook = Number(mm[1]);
      if (!Number.isFinite(currentBook) || currentBook < 1) {
        throw new Error(`unexpected book number "${mm[1]}"`);
      }
    } else if ((mm = tok.match(letterOpenRe))) {
      stack.push('letter');
      currentLetterToken = mm[1]!;
      currentLetter = {
        book: currentBook,
        letter: currentLetterToken,
        sourceHeading: null,
        sectionTexts: [],
        text: '',
        gapCount: 0,
      };
      sectionParagraphs = [];
      looseParagraphs = [];
      inSection = false;
    } else if (sectionOpenRe.test(tok)) {
      stack.push('section');
      inSection = true;
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') {
        if (currentLetter === null) throw new Error(`section closed outside any letter (book ${currentBook})`);
        const text = sectionParagraphs.join('\n\n');
        if (text.length > 0) currentLetter.sectionTexts.push(text);
        sectionParagraphs = [];
        inSection = false;
      } else if (kind === 'letter') {
        if (currentLetter === null) throw new Error(`letter closed with no open letter (book ${currentBook})`);
        if (looseParagraphs.length > 0) {
          // paragraphs found directly under the letter div, outside any section - rare, keep, don't lose.
          currentLetter.sectionTexts.push(looseParagraphs.join('\n\n'));
        }
        currentLetter.text = currentLetter.sectionTexts.join('\n\n');
        const key = `${currentBook}.${currentLetterToken}`;
        byKey.set(key, currentLetter);
        if (!byBook.has(currentBook)) byBook.set(currentBook, []);
        byBook.get(currentBook)!.push(currentLetterToken);
        currentLetter = null;
      } else if (kind === 'book') {
        currentBook = 0;
      }
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<label\b/.test(tok)) {
      stack.push('label');
      inLabel = true;
      labelBuf = '';
    } else if (tok === '</label>') {
      stack.pop();
      inLabel = false;
      if (currentLetter !== null && currentLetter.sourceHeading === null) {
        const cleaned = cleanText(labelBuf);
        currentLetter.sourceHeading = cleaned.length > 0 ? cleaned : null;
      }
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length > 0) {
        if (inSection) sectionParagraphs.push(cleaned);
        else looseParagraphs.push(cleaned);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      if (currentLetter !== null) currentLetter.gapCount += 1;
    }
    // milestone, pb, lb and every other inline tag: no structural action;
    // their surrounded text already flows into pBuf/labelBuf via the
    // free-text capture above (suppressed only while noteDepth > 0).
  }

  if (stack.length !== 0) {
    throw new Error(`unbalanced <div>/<label> nesting at end of document (stack: ${stack.join(',')})`);
  }
  if (noteDepth !== 0) throw new Error(`unbalanced <note> nesting (final depth ${noteDepth})`);

  return { byKey, byBook, totalGaps, totalNotes };
}
