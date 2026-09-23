/**
 * Herodotus, Ἱστορίαι ("Histories") - Greek text (A. D. Godley, ed.,
 * Herodotus, 4 vols., Cambridge, MA: Harvard University Press; London:
 * William Heinemann Ltd., 1920-1925, Loeb Classical Library; CTS
 * urn:cts:greekLit:tlg0016.tlg001.perseus-grc2). Run-once ingestion
 * pipeline.
 *
 *   npm run import:herodotus-histories-grc
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-herodotus-histories-grc/raw/tlg0016.tlg001.perseus-grc2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository
 * and writes:
 *   data/herodotus-histories-grc/work.json       - the GenericWork (9 Books,
 *                                                   each a flat list of
 *                                                   Chapter divisions, one
 *                                                   Passage each)
 *   data/herodotus-histories-grc/about.json      - provenance / licence / prose
 *   data/herodotus-histories-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:herodotus-histories-grc`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * <div type="textpart" subtype="book" n="N"> (9 books) ->
 *   <div type="textpart" subtype="chapter" n="M"> (1578 total) ->
 *     <div type="textpart" subtype="section" n="K"> (4338 total) ->
 *       <p>...</p> (4344 total)
 * Per this app's established Nicomachean-Ethics/Meditations precedent, the
 * "section" level carries no citation information this schema needs (this
 * edition's citation unit is Book.Chapter, not Book.Chapter.Section) - EVERY
 * <p> found anywhere under a chapter div is collected, in document order,
 * into that chapter's ONE Passage, joined with "\n\n".
 *
 * Chapter numbering: almost always a plain 1-based contiguous integer within
 * each book, per-book totals (I..IX): 216, 188, 160, 205, 133, 144, 257,
 * 151, 124 (1578 total) - but 45 chapters across the work carry a single
 * uppercase-letter suffix (e.g. Book 2's "121A".."121F", Book 9's "7A"/
 * "7B") where this edition's own numbering subdivides an existing chapter
 * without renumbering what follows (so "120, 121, 121A, 121B, ..., 121F,
 * 122, 123..." rather than "120, 121, 122...127, 128..."). Confirmed
 * genuine by direct inspection - not a parsing artifact - and confirmed
 * IDENTICAL in the independently-parsed English sibling
 * (data/herodotus-histories-en). Preserved verbatim as the source prints it;
 * never renumbered. See anomalies.json for the full list.
 *
 * Chapter 1 of Book 1 has a <div subtype="section" n="0"> - the famous
 * proem ("This is the display of the inquiry of Herodotus...") - BEFORE
 * section n="1". Since section numbers are not stored in this schema (only
 * document order matters), this needs no special handling: the proem is
 * simply the first <p> collected into chapter book-1-ch-1's Passage, in
 * document order, exactly as printed.
 *
 * Faithfulness rules:
 *   - verbatim Greek reading text only; no accent/spelling/wording fixes.
 *   - `<note anchored="true" resp="ed">...</note>` (85 occurrences) is
 *     Godley's own editorial apparatus (short numbered footnote markers) -
 *     NOT part of his printed Greek running text - excluded entirely, tag
 *     and content, matching this app's established apparatus convention.
 *     Counted in aggregate, not logged individually (matches this app's
 *     Pro Milone precedent for a high-volume, uniform apparatus class).
 *   - `<del>...</del>` (19 spans) is text this edition's own apparatus
 *     brackets as a probable interpolation/gloss - but, per this app's
 *     corpus-wide policy (applied uniformly across Herodotus, Thucydides,
 *     the Greek drama corpus and Xenophon), editor-bracketed text is KEPT
 *     in the reading text, wrapped in square brackets `[...]`, exactly as
 *     printed Oxford/Loeb texts render it - it is NOT excluded. None of the
 *     19 spans contains a nested tag or a literal `[`/`]` of its own
 *     (confirmed by direct inspection), so no double-bracketing question
 *     arises anywhere in this file. Every occurrence is logged individually
 *     with its FULL text (never truncated) and flagged on its Passage.
 *   - `<gap reason="ellipsis"/>` (15 occurrences, all self-closing, none
 *     carrying a `rend` attribute) - an editorial ellipsis in this edition
 *     with no literal characters printed at that point. Kept as nothing (no
 *     text fabricated, matching this app's De-Bello-Gallico-la <gap>
 *     convention of only inserting a literal `rend` value when one is
 *     actually given); every occurrence logged individually with its
 *     surrounding context and flagged on its Passage.
 *   - `<choice><sic>X</sic> <corr>Y</corr></choice>` (2 occurrences) - the
 *     corrected reading `<corr>` is what this edition actually prints as
 *     its running text; kept in the reading text. The literal `<sic>`
 *     transcription is dropped from the reading text but logged verbatim -
 *     matches this app's established choice/sic/corr convention
 *     (import-virgil-aeneid-la) of preferring the resolved reading.
 *   - `<bibl>...</bibl>` (4 occurrences, all inside `<cit>`, citing a Homer
 *     passage quoted by Herodotus, e.g. "Homer, Iliad, 6.289-292") is
 *     Perseus's own added citation of the quotation's source, not part of
 *     Herodotus's own text - excluded entirely, matching this app's
 *     established <bibl> convention (import-pro-milone-la and the
 *     Plato-shared parser).
 *   - `<q>...</q>` (769) and `<quote>...</quote>` (45, always inside
 *     `<cit>` here, wrapping Homeric verse Herodotus quotes) are unwrapped:
 *     their text is genuine content (direct speech / quoted verse) and
 *     flows into the surrounding paragraph like any other text. `<cit>`
 *     (4, a citation-grouping wrapper around a `<quote>` + the `<bibl>`
 *     dropped above) and `<l>` (151, verse lines inside `<quote>`, no
 *     line-break-worthy semantics preserved in this schema) are likewise
 *     transport scaffolding, unwrapped.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s (across however
 *     many <section> divs) joined with "\n\n".
 *
 * This source carries no <add>, <foreign>, <emph>, <hi>, <milestone>, <pb>,
 * <name>, <placeName>, <date>, <title>, <sp>/<speaker>/<said> (confirmed by
 * direct inspection) - nothing else to handle.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/herodotus-histories-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0016.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'herodotus-histories-grc');

const WORK_ID = 'herodotus-histories-grc';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0016/tlg001/tlg0016.tlg001.perseus-grc2.xml';

/** This source's own chapter counts per book (I..IX), cross-checked against the real parsed counts, never forced. */
const EXPECTED_CHAPTER_COUNTS = [216, 188, 160, 205, 133, 144, 257, 151, 124];
const EXPECTED_BOOKS = 9;

/**
 * Book 6 chapter 122 (both its sections) falls entirely within a <del> span
 * - the well-known "Alcmaeonid digression" (Hdt. 6.121-124, defending that
 * family against charges of Medism at Marathon), long suspected by many
 * editors to be a later interpolation rather than Herodotus's own writing.
 * Under the corpus-wide bracket-and-keep policy (see the module doc above)
 * this chapter's text is simply "[...]" - Godley's apparatus brackets, kept
 * whole - which needs no special-casing at all: the general <del> handling
 * below already keeps every span's text, so this chapter falls out of the
 * ordinary machinery like any other. Called out here only as a pointer for
 * anyone reading this file, not as a code path of its own.
 */

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

/** Parse a chapter number like "121" or "121A" into {base, letter}. */
function parseChapterNum(n: string): { base: number; letter: string } | null {
  const m = /^(\d+)([A-Z]?)$/.exec(n);
  if (!m) return null;
  return { base: Number(m[1]), letter: m[2] ?? '' };
}

function nextLetter(letter: string): string {
  return letter === '' ? 'A' : String.fromCharCode(letter.charCodeAt(0) + 1);
}

async function ensureRawXml(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  mkdirSync(RAW_DIR, { recursive: true });
  process.stdout.write(`raw XML not found, downloading from ${SOURCE_URL} ...\n`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(RAW_XML, buf);
  process.stdout.write(`saved ${buf.length} bytes to ${RAW_XML}\n`);
}

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*subtype="section"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<del\b[^>]*>|<\/del>|<gap\b[^>]*\/>|<choice\b[^>]*>|<\/choice>|<sic\b[^>]*>|<\/sic>|<corr\b[^>]*>|<\/corr>|<bibl\b[^>]*>|<\/bibl>|<cit\b[^>]*>|<\/cit>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];
  let chapterAnomalyNotes: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let delDepth = 0;
  let delBuf = '';
  let inSic = false;
  let sicBuf = '';
  let bibDepth = 0;

  let totalChapters = 0;
  let totalNotes = 0;
  let totalDelSpans = 0;
  let totalDelSpansWithOwnBrackets = 0;
  let totalGaps = 0;
  let totalSicCorr = 0;
  let totalBibl = 0;
  let totalEmptyParagraphsDropped = 0;
  const letteredChapters: string[] = [];

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterAnomalyNotes = [];
  }

  function closeChapter(): void {
    if (!currentBookDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const text = chapterParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (chapterAnomalyNotes.length > 0) passage.anomaly = chapterAnomalyNotes.join(' ');
    const chapterDiv: Division = {
      id: currentChapterId,
      number: currentChapterNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(chapterDiv);
    totalChapters += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inP) {
        if (noteDepth > 0 || bibDepth > 0) {
          // dropped: apparatus, not reading text
        } else if (delDepth > 0) {
          delBuf += free;
        } else if (inSic) {
          sicBuf += free;
        } else {
          pBuf += free;
        }
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="book"/.test(tok)) {
      stack.push('book');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (!n) fail(`book div with no n= attribute: ${tok}`);
      currentBookNum = Number(n);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > EXPECTED_BOOKS) {
        fail(`unexpected book number "${n}"`);
      }
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: String(currentBookNum),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
    } else if (/subtype="chapter"/.test(tok)) {
      stack.push('chapter');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (n === undefined) fail(`chapter div with no n= attribute: ${tok}`);
      openChapter(n);
    } else if (/subtype="section"/.test(tok)) {
      stack.push('section');
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'chapter') closeChapter();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({
          where: currentChapterId || `book-${currentBookNum}`,
          note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
        });
      } else {
        chapterParagraphs.push(cleaned);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
      totalNotes += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      totalDelSpans += 1;
      const raw = cleanText(delBuf);
      delBuf = '';
      const alreadyBracketed = /[[\]]/.test(raw);
      if (alreadyBracketed) totalDelSpansWithOwnBrackets += 1;
      const bracketed = alreadyBracketed ? raw : `[${raw}]`;
      // Corpus-wide policy: editor-bracketed text is KEPT in the reading
      // text, wrapped in square brackets, not excluded. Insert it into
      // whichever buffer is currently active (pBuf normally; sicBuf in the
      // - unattested here - case of a <del> nested inside a <sic>).
      if (inP) {
        if (inSic) sicBuf += bracketed;
        else pBuf += bracketed;
      }
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<del> editor-bracketed text KEPT in the reading text (in square brackets): "${raw}"`,
      });
      chapterAnomalyNotes.push(
        `Contains <del> editor-bracketed text, kept in the reading text as "[${raw.length > 60 ? raw.slice(0, 60) + '…' : raw}]" (full text logged in anomalies.json).`,
      );
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (inP && noteDepth === 0 && bibDepth === 0) {
        if (delDepth > 0) delBuf += literal;
        else if (inSic) sicBuf += literal;
        else pBuf += literal;
      }
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source - an editorial ellipsis in this edition, printed with no literal rendering (no "rend" attribute, so no dots are fabricated here).`,
      });
      chapterAnomalyNotes.push(
        `This edition marks a gap here (<gap reason="${reasonMatch?.[1] ?? ''}"/>, no literal rendering given).`,
      );
    } else if (/^<sic\b/.test(tok)) {
      inSic = true;
      sicBuf = '';
    } else if (tok === '</sic>') {
      inSic = false;
      const sicText = cleanText(sicBuf);
      totalSicCorr += 1;
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `Source <choice>: literal transcription <sic>"${sicText}"</sic> dropped from the reading text; the <corr> reading is kept as the passage text instead - matches this app's established choice/sic/corr convention (import-virgil-aeneid-la) of preferring the resolved reading.`,
      });
      chapterAnomalyNotes.push(`<sic>"${sicText}"</sic>/<corr> choice: the corrected reading was kept, the literal transcription dropped (logged in anomalies.json).`);
      sicBuf = '';
    } else if (/^<bibl\b/.test(tok)) {
      bibDepth += 1;
    } else if (tok === '</bibl>') {
      bibDepth -= 1;
      totalBibl += 1;
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<q>, <quote>, <cit>, <l>, <choice>, <corr>, and their ilk): no
    // structural action needed - their content already flows into pBuf via
    // the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (bibDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${bibDepth})`);

  // --- cross-check chapter counts against this source's own totals, honestly ---
  const chapterCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_CHAPTER_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) {
      chapterCountMismatches.push(`Book ${i + 1}: parsed ${got} chapters, expected ${want}`);
    }
  });
  if (chapterCountMismatches.length > 0) {
    fail(`chapter count mismatch(es): ${chapterCountMismatches.join('; ')}`);
  }

  // --- verify chapter numbering: 1-based contiguous, EXCEPT the source's
  //     own genuine single-uppercase-letter-suffixed subdivisions - detected
  //     and logged, never forced. Two genuinely different lettered shapes
  //     occur in this edition (both confirmed by direct inspection): letters
  //     inserted AFTER an existing plain chapter (Book 2: "121", "121A"..
  //     "121F", "122" - 121 itself is plain) and letters standing in for a
  //     base number that is NEVER printed plain at all (Book 8: "139",
  //     "140A", "140B", "141" - no bare "140" exists; this is the standard
  //     modern division of Hdt. 8.140 into 140.a/140.b, two speeches). Both
  //     are accepted: a new chapter is valid if it continues the same base
  //     with the next letter, OR starts a fresh lettered run at base+1
  //     beginning with "A", OR is a plain chapter at base+1. -------------
  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    let lastBase = 0;
    let lastLetter = '';
    b.children.forEach((c, ci) => {
      const parsed = parseChapterNum(c.number!);
      if (!parsed) fail(`Book ${bookN} chapter at position ${ci} has unparseable number ${JSON.stringify(c.number)}`);
      if (ci === 0) {
        if (parsed.base !== 1 || parsed.letter !== '') {
          fail(`Book ${bookN} must open with chapter "1", got "${c.number}"`);
        }
      } else {
        const continuesSameBase = parsed.base === lastBase && parsed.letter === nextLetter(lastLetter);
        const startsNewLetteredRun = parsed.base === lastBase + 1 && parsed.letter === 'A';
        const plainNext = parsed.letter === '' && parsed.base === lastBase + 1;
        if (!(continuesSameBase || startsNewLetteredRun || plainNext)) {
          fail(
            `Book ${bookN} chapter at position ${ci}: number "${c.number}" does not follow from the previous chapter "${lastBase}${lastLetter}"`,
          );
        }
      }
      if (parsed.letter !== '') letteredChapters.push(c.id);
      lastBase = parsed.base;
      lastLetter = parsed.letter;
    });
  });

  // --- no chapter should ever be empty -----------------------------------
  const emptyChapters: string[] = [];
  for (const b of divisions) {
    for (const c of b.children) {
      if (c.passages.length === 0 || c.passages[0]!.text.length === 0) emptyChapters.push(c.id);
    }
  }
  if (emptyChapters.length > 0) {
    fail(`chapter division(s) unexpectedly carry empty passage text: ${emptyChapters.sort().join(', ')}`);
  }
  // Book 6 chapter 122 (both sections entirely <del>-bracketed) needs no
  // special check any more: with <del> text kept and bracketed, its Passage
  // is simply non-empty "[...]" text, handled by the ordinary machinery
  // above like any other chapter. Sanity-check it directly, though, since a
  // future source change silently emptying it again should still be caught.
  {
    const book6 = divisions[5];
    const ch122 = book6?.children.find((c) => c.number === '122');
    if (!ch122 || !ch122.passages[0]!.text.startsWith('[') ) {
      fail('Book 6 chapter 122 (the wholly <del>-bracketed "Alcmaeonid digression") did not come out as expected - investigate');
    }
  }

  // --- a handful of chapters carry a lone space directly before a comma/
  //     period - NOT touched (unlike the English sibling's mechanical
  //     cleanup): individual inspection found this class is genuinely mixed
  //     in the Greek - some are tag-boundary artifacts from an excluded
  //     <note>/<bibl> (or an adjacent <gap>) sitting between a word and
  //     following punctuation (e.g. Book 2 ch. 143's "κολοσσούς
  //     [πίρωμιν ἐπονομαζόμενον] ,καὶ" - the source itself glues the comma
  //     to the next word with no space there, after the excluded <note> that
  //     used to sit between the kept <del> bracket and the comma), but
  //     others are apparently deliberate source spacing around the Greek
  //     question mark (e.g. Book 5 ch. 106's "ἐπρήχθη ; ὅρα", confirmed
  //     present in the raw XML's own plain text, not a byproduct of this
  //     importer's tag handling). Since the two cannot be reliably told
  //     apart without per-instance philological judgement, the Greek
  //     reading text is left untouched here (unlike English, where such
  //     spacing is NEVER legitimate) - flagged in aggregate rather than
  //     silently normalised. ---------------------------------------------
  const spaceBeforePunctChapters: string[] = [];
  for (const b of divisions) {
    for (const c of b.children) {
      if (/ [,.;:!?]/.test(c.passages[0]!.text)) spaceBeforePunctChapters.push(c.id);
    }
  }
  if (spaceBeforePunctChapters.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note:
        `${spaceBeforePunctChapters.length} chapter(s) contain a lone space directly before a comma/period/` +
        'semicolon somewhere in their text (e.g. Book 2 ch. 143, Book 5 ch. 106). Left untouched, unlike the ' +
        'English sibling\'s mechanical cleanup of the same class of spacing: individual inspection found this is ' +
        'genuinely mixed in the Greek - some instances are tag-boundary artifacts (an excluded <note>/<bibl>, or ' +
        'an adjacent <gap>, sitting between a word and the following punctuation), others reproduce spacing already present ' +
        "in the source's own plain text around the Greek question mark - and the two cannot be reliably told " +
        `apart without per-instance philological judgement. Affected chapters: ${spaceBeforePunctChapters.join(', ')}.`,
    });
  }

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / Book 6 chapter 122`,
    note:
      "This chapter's entire content (both its sections) is bracketed by this edition's apparatus as a probable " +
      'interpolation (<del>) - the well-known "Alcmaeonid digression" (Hdt. 6.121-124), long suspected by many ' +
      'editors to postdate Herodotus. Under the corpus-wide bracket-and-keep policy this chapter\'s Passage is ' +
      'simply "[...]", its two <del> spans kept whole and wrapped in square brackets like every other <del> in ' +
      'this work - matching how published editions of this passage actually present it (printed, flagged as ' +
      'suspect, not blanked out). No special-casing was needed to produce this: see the general <del> handling ' +
      'below.',
  });
  anomalies.push({
    where: `${WORK_ID} / chapter numbering`,
    note: `${letteredChapters.length} chapters across the work carry a single uppercase-letter suffix in this edition's own numbering (e.g. "121A".."121F" in Book 2) - a genuine subdivision of an existing chapter without renumbering what follows. Preserved verbatim, never renumbered. Confirmed identical in the independently-parsed English sibling. Full list: ${letteredChapters.join(', ')}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> apparatus elements (Godley's own short numbered footnote markers) were excluded entirely, tag and content, not counted individually.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (this edition's apparatus brackets these as probable interpolations/glosses) are KEPT in the reading text, wrapped in square brackets "[...]", exactly as printed Oxford/Loeb texts render editor-bracketed passages - not excluded. Every occurrence is logged individually above with its full text and flagged on its Passage. ${totalDelSpansWithOwnBrackets} of them already contained a literal "["/"]" of their own (confirmed: none do, in this file) - such a span would be kept as-is, NOT double-bracketed.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap reason="ellipsis"/> markers (an editorial ellipsis in this edition, no literal rendering given) were preserved as nothing extra; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalSicCorr} <choice><sic>/<corr></choice> pair(s) were resolved to the <corr> reading (kept), the literal <sic> transcription dropped; both occurrences are logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalBibl} <bibl> citation(s) (Perseus's own citation of a Homeric passage Herodotus quotes, e.g. "Homer, Iliad, 6.289-292") were excluded entirely, not part of Herodotus's own text.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme distinct from its own Book/Chapter numbering.',
  });
  anomalies.push({
    where: `${WORK_ID} / character encoding`,
    note: 'The source is already NFC-normalised polytonic Greek; no normalisation pass was applied.',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Ἱστορίαι',
    author: 'Herodotus',
    language: 'grc',
    editor: 'A. D. Godley',
    edition: 'Herodotus, with an English translation by A. D. Godley, 4 vols. (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., 1920-1925), Loeb Classical Library',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ' +
      'urn:cts:greekLit:tlg0016.tlg001.perseus-grc2), digitising the Greek text as printed in A. D. Godley, ed. and ' +
      'trans., Herodotus, 4 vols. (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., ' +
      '1920-1925), Loeb Classical Library - citation taken verbatim from this file\'s own <sourceDesc> (the ' +
      'work-level __cts__.xml carries no description); imported by scripts/import-herodotus-histories-grc. The raw ' +
      'file is fetched once (cached at scripts/import-herodotus-histories-grc/raw/) and bundled with the app; ' +
      'nothing is loaded from the network at runtime.',
    license:
      'Godley\'s Greek text (from a 1920-1925 Loeb Classical Library edition) is in the public domain. The digital ' +
      'transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the ' +
      'Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Herodotus\'s Histories - Greek',
        paragraphs: [
          'This is the Greek text of Herodotus\'s Ἱστορίαι ("Histories" or "Inquiries"), the foundational work of ' +
            'Western historiography, recounting the causes and course of the Greco-Persian Wars alongside a vast ' +
            'ethnographic and geographic survey of the ancient world, in nine Books.',
          'The text here is Godley\'s Greek, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'A. D. Godley, ed. and trans., Herodotus, 4 vols. (Cambridge, MA: Harvard University Press; London: ' +
            'William Heinemann Ltd., 1920-1925), Loeb Classical Library. This edition is in the public domain.',
          'The work is divided into 9 Books and, within each Book, numbered chapters (1578 total in this edition). ' +
            '45 chapters across the work carry a single uppercase-letter suffix in this edition\'s own numbering ' +
            '(e.g. "121A".."121F" in Book 2, "7A"/"7B" in Book 9) - a genuine subdivision of an existing chapter ' +
            'without renumbering what follows; see "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0016.tlg001.perseus-grc2.xml (CTS ' +
            'urn:cts:greekLit:tlg0016.tlg001.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded from ' +
            'the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book, chapter and (Perseus/Godley\'s own) section <div>s and collects EVERY <p> ' +
            'paragraph found anywhere under a chapter - regardless of how many sections lie between it and the ' +
            'chapter - in document order, into that chapter\'s single Passage (joined with a blank line when a ' +
            'chapter has more than one). Only transport scaffolding is removed: <q> (direct speech) and <quote>/ ' +
            '<cit>/<l> (quoted Homeric verse) are unwrapped, their text flowing into the surrounding prose. This ' +
            'edition\'s own apparatus is excluded from the reading text: <note> (short numbered footnote markers, ' +
            '85 total, dropped entirely) and <bibl> (a citation of the Homeric source of a quotation, 4 total, ' +
            'dropped entirely). Two content-affecting decisions are individually logged: 19 <del> spans (text this ' +
            'edition\'s apparatus brackets as a probable interpolation) are KEPT in the reading text, wrapped in ' +
            'square brackets "[...]" - this app\'s corpus-wide policy for editor-bracketed text, matching how ' +
            'printed Oxford/Loeb texts render it, applied uniformly across Herodotus, Thucydides, the Greek drama ' +
            'corpus and Xenophon; 2 <choice><sic>/<corr></choice> pairs are resolved to the corrected reading, the ' +
            'literal transcription dropped. 15 <gap reason="ellipsis"/> markers (an editorial ellipsis, no literal ' +
            'rendering given in this edition) are preserved as nothing extra. Entities are decoded and runs of ' +
            'whitespace collapsed; the words themselves are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly (the ' +
            'standard scheme used across virtually all editions and translations of Herodotus). This source ' +
            'carries no finer, page-marker-style citation scheme, so Division.ref and Passage.ref are null ' +
            'throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 9 Books and all 1578 chapters of this edition are present and in order, agreeing ' +
            'exactly, chapter for chapter, with the independently-parsed English sibling edition.',
          'Letter-suffixed chapter numbers. 45 chapters across the work (e.g. Book 2\'s "121A".."121F", Book 9\'s ' +
            '"7A"/"7B") carry a single uppercase-letter suffix in this edition\'s own numbering - a genuine ' +
            'subdivision of an existing chapter, confirmed by direct inspection and identical in the English ' +
            'sibling. Preserved verbatim, never renumbered; see anomalies.json for the full list.',
          'Editor-bracketed text (<del>) is KEPT, not excluded. 19 <del> spans (text this edition\'s apparatus ' +
            'brackets as a probable interpolation or gloss) are kept in the reading text, wrapped in square ' +
            'brackets "[...]" exactly as printed Oxford/Loeb texts render editor-bracketed passages - this app\'s ' +
            'corpus-wide policy, applied uniformly across Herodotus, Thucydides, the Greek drama corpus and ' +
            'Xenophon. None of the 19 spans contains a nested tag or a literal "["/"]" of its own, so no ' +
            'double-bracketing question arises. 2 <choice><sic>/<corr></choice> pairs are resolved to the ' +
            'corrected reading, the literal transcription dropped. Every occurrence of both is logged ' +
            'individually, with the <del> spans\' FULL text (never truncated), in anomalies.json.',
          'Book 6 chapter 122 is entirely bracketed as suspect. This one chapter\'s ENTIRE content - both its ' +
            'sections, the "Alcmaeonid digression" (Hdt. 6.121-124) defending that family against charges of ' +
            'Medism - sits inside <del> in this edition\'s apparatus. Under the bracket-and-keep policy above, ' +
            'this needs no special handling at all: the chapter\'s Passage text is simply "[...]", its two <del> ' +
            'spans kept whole - matching how published editions of this passage actually present it (printed, ' +
            'flagged as suspect, not blanked out).',
          '15 <gap reason="ellipsis"/> markers (scattered across Books 1, 2, 3, 4, 6, 7 and 8, not concentrated in ' +
            'any one passage) mark a point where this edition prints an editorial ellipsis with no literal ' +
            'rendering; nothing is fabricated to fill them. Every occurrence is logged individually.',
          '85 <note> apparatus elements (short numbered footnote markers) and 4 <bibl> citations (of a quoted ' +
            'Homeric passage\'s source) were excluded entirely as scholarly apparatus, not part of Herodotus\'s ' +
            'own text.',
          'Character encoding. The transcription uses precomposed polytonic Greek code points. The bytes are ' +
            'preserved exactly as transmitted; no normalisation was applied.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalChars = 0;
  for (const b of divisions) totalChars += b.children.reduce((n, c) => n + c.passages.reduce((mm, p) => mm + p.text.length, 0), 0);

  process.stdout.write('\nBooks:\n');
  divisions.forEach((b, i) => {
    process.stdout.write(`  Book ${b.number!.padStart(1)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} chapters  (expected ${EXPECTED_CHAPTER_COUNTS[i]})\n`);
  });
  process.stdout.write(
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ${totalNotes} <note>  ${totalDelSpans} <del>  ${totalGaps} <gap>  ${totalSicCorr} sic/corr  ${totalBibl} <bibl>  ${letteredChapters.length} lettered chapters  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:herodotus-histories-grc` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

async function run(): Promise<void> {
  await ensureRawXml();
  main();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}

export { run };
