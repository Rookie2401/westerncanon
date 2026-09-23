/**
 * Polybius, The Histories - English translation (Evelyn S. Shuckburgh,
 * trans., The Histories of Polybius, 2 vols., London/New York: Macmillan,
 * 1889; CTS urn:cts:greekLit:tlg0543.tlg001.perseus-eng2). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-polybius-histories-en/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-polybius-histories-en/raw/tlg0543.tlg001.perseus-eng2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository and
 * writes:
 *   data/polybius-histories-en/work.json       - the GenericWork: 39 Books
 *                                                 (each a flat list of
 *                                                 Chapter divisions, one
 *                                                 Passage each) PLUS a 40th
 *                                                 top-level `fragments`
 *                                                 Division (Shuckburgh's own
 *                                                 "Shorter Fragments"
 *                                                 appendix - see below)
 *   data/polybius-histories-en/about.json      - provenance / licence / prose
 *   data/polybius-histories-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-polybius-histories-en/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML,
 * independently of the Greek witness rather than assumed identical) ---
 * Two-level `<div type="textpart" subtype="book" n="N">` > `<div
 * type="textpart" subtype="chapter" n="M">` (no extra section-level nesting,
 * unlike the Greek sibling - see data/polybius-histories-grc/types.ts).
 *
 * This source XML carries a 40th top-level division AFTER Book 39,
 * `<div type="textpart" subtype="book" n="fragments">` - Shuckburgh's own
 * "Shorter Fragments" appendix: 110 short, whole fragments (14,691 chars of
 * his translation), mostly belonging to Book 6 but not integrated into its
 * numbered chapters, printed separately with their own Hultsch-numbered
 * scheme. This IS real, substantial translated text - not apparatus - and is
 * imported as a 40th top-level Division, `fragments` (number null, ref null,
 * sourceHeading "Shorter Fragments", editorialTitle null), sitting alongside
 * (not nested inside) the 39 numbered Books in work.json's divisions array.
 *
 * Structurally this appendix does NOT match a Book (Book -> Chapter, 2
 * levels): it is Book -> Group -> Chapter (3 levels). Shuckburgh's own head
 * for the appendix says he divided these fragments "into two classes: (A)
 * those which seem to have some distinct reference which can be recognised
 * or guessed: (B) those which though fairly complete in themselves cannot be
 * so classed." The source XML attempts to encode this as two `<div2>`
 * sub-divisions - `xml:id="bfragsc1"` head "A: Fragments whose reference is
 * known" (before chapter n="1") and `xml:id="bfragsc2"` head "B: Fragments of
 * uncertain reference" (before chapter n="31") - but BOTH `<div2>` elements
 * are wrapped in an XML COMMENT (`<!--...-->`) in the actual source file, so
 * neither is part of the live document tree; the 110 chapter divs are, in
 * the live XML, a single FLAT sequence directly under the appendix's book
 * div, with no real sub-grouping at all. This importer reconstructs the two
 * groups anyway - `fragments-a` (chapters "1".."30", i.e. n <= 30) and
 * `fragments-b` (chapters "31".."104" incl. lettered insertions, i.e. n >=
 * 31) - using the two dead `<div2>` comments only for their VERBATIM label
 * text and to confirm exactly where Shuckburgh's own break falls (right
 * before chapter n="31"); the numeric split itself is independently
 * cross-checked against the real parsed chapter list, not merely trusted
 * from the comment. Each Group Division (`fragments-a` / `fragments-b`) has
 * number null and sourceHeading equal to that comment's own heading text,
 * verbatim.
 *
 * Each fragment Chapter (`fragments-a-ch-N` / `fragments-b-ch-N`, N = this
 * source's own chapter n, continuous 1-104 across both groups, with a few
 * lettered insertions e.g. 39a/39b, 52a/52b) carries `number` = that same n
 * and `sourceHeading` = its own printed head, e.g. "I (6, 2)" - the Roman
 * numeral is Shuckburgh's own running fragment number, and the bracketed
 * arabic number is Hultsch's Teubner fragment number (explicitly explained
 * in Shuckburgh's own prefatory note - see below), so both numbering schemes
 * stay visible to the reader via sourceHeading even though only the Roman
 * numeral drives the chapter id/number.
 *
 * Shuckburgh's own prefatory paragraph for the whole appendix - printed
 * inside the SAME `<head>` element as the short title "Shorter Fragments",
 * separated from it only by an `<lb/>` line break, reading in full: "The
 * first eight of these fragments belong to book 6, but as they do not fall
 * in with what remains of the text, I have placed them here. I have divided
 * these fragments into two classes: (A) those which seem to have some
 * distinct reference which can be recognised or guessed: (B) those which
 * though fairly complete in themselves cannot be so classed. A good many
 * more, generally quoted by Suidas for the sake of some one word, did not
 * seem worth putting in an English dress. The numbers in brackets are those
 * of Hultsch's text." - is Shuckburgh's OWN explanatory prose about how he
 * organised this appendix, not a translation of Polybius, so it is excluded
 * from the reading text (the `fragments` Division's sourceHeading is just
 * the short title, "Shorter Fragments"); it is instead quoted verbatim, in
 * full, in both anomalies.json and about.json so the reader still sees the
 * numbering convention it explains.
 *
 * Only Books 1-5 survive complete; Books 6-39 survive only as excerpts and
 * fragments - chapter COUNTS in this witness routinely differ from the Greek
 * sibling's (parsed completely independently here; never reconciled - see
 * about.json for the book-by-book comparison). Book 17 is a total loss in
 * this witness too: its sole content is Shuckburgh's OWN editorial paragraph
 * explaining what the lost book would have covered (citing Livy) - not a
 * translation of any surviving Polybius text - so it is excluded from the
 * reading text exactly as the Greek sibling's apparatus note is excluded
 * there, leaving book-17 with zero Chapters. The same "<p> directly under a
 * Book div, outside any Chapter" pattern also occurs, more than once, as a
 * book-OPENING bridging summary Shuckburgh supplies before Chapter 1 of
 * several other fragmentary books (e.g. Book 15) to narrate continuity
 * across a gap in the surviving text - likewise excluded, since it is his
 * own prose, not a translation. Every occurrence cleans to empty text once
 * its <note> wrapper is excluded as usual (confirmed: any non-empty
 * survivor here fails the build loudly rather than being silently dropped).
 *
 * Faithfulness rules (mirrors scripts/import-de-bello-gallico-en):
 *   - verbatim English (Shuckburgh's own translation) reading text only; no
 *     modernising or "improving" his 1880s wording.
 *   - `<note>...</note>` (2514 top-level spans in the 39 numbered Books, plus
 *     48 more in the appendix; some containing further nested notes) -
 *     Shuckburgh's own extensive footnotes (historical commentary,
 *     cross-references, marginal date/consul-year glosses) - NOT part of the
 *     translated running text - excluded entirely, tag and content; logged
 *     as a single aggregate count per region (a genuinely repetitive
 *     apparatus class). A <p> NESTED INSIDE a <note> (4 occurrences in the
 *     numbered Books, e.g. a footnote's own explanatory paragraph, or the
 *     family-tree/letter-grouping-table footnotes in this source) is never
 *     treated as its own paragraph boundary - the whole note, at any nesting
 *     depth, is one continuous span of apparatus text, wholly discarded (or
 *     kept only as the last-resort note-fallback below); letting a nested
 *     <p> reset the OUTER real paragraph's buffer would have silently
 *     discarded genuine running text before/after the note, which an earlier
 *     version of this importer did - now fixed and guarded.
 *   - Some chapters' ENTIRE surviving text falls inside <note> (Shuckburgh
 *     sometimes supplies only his own inline editorial summary, <note
 *     type="summary" place="inline" resp="ess">, bridging a stretch for
 *     which no Polybius text survives to translate - e.g. book-8-ch-4b,
 *     book-21-ch-42, book-22-ch-1; occasionally that same note ALSO wraps a
 *     genuine quoted translation via a nested <q>, e.g. book-9-ch-28's
 *     speech of Chlaeneas). Excluding the note as usual would leave such a
 *     chapter with no reading text at all, so - mirroring the established
 *     jewish-antiquities-grc <del>-fallback precedent - the note's own text
 *     is kept as a last resort, flagged via Passage.anomaly with wording
 *     that distinguishes pure editorial summary from summary-plus-quotation.
 *   - `<pb/>` (1143 in the 39 numbered Books, 16 more in the appendix) -
 *     page-break markers to this edition's 1889 print pagination - dropped
 *     as scaffolding, no citation value here.
 *   - `<head>` - captured as that Division's sourceHeading (Book, Chapter,
 *     or - in the appendix - the appendix/Group/fragment-Chapter itself; see
 *     types.ts); most Chapters carry one (Shuckburgh's own printed chapter
 *     titles).
 *   - `<placeName>`, `<date>`, `<foreign>`, `<q>`, `<quote>`, `<bibl>`,
 *     `<title>`, `<cit>`, `<term>`, `<l>`, `<hi>`, `<rs>`, `<persName>`,
 *     `<label>`, `<num>`, `<emph>`, `<gloss>` and similar inline semantic
 *     wrappers are unwrapped: their text is genuine translated content when
 *     it occurs directly in the running prose (most occurrences are instead
 *     inside the discarded <note> apparatus, where they vanish along with
 *     it). No table representation is needed: this schema's flat-text model
 *     has no live (non-commented-out) <list>/<item>/<table> anywhere in this
 *     witness (confirmed by direct inspection; the appendix's one <table>,
 *     inside chapter fragments-a-ch-1's own footnote, is entirely wrapped in
 *     an XML comment and so never reaches the live document tree at all).
 *   - this witness carries no live `<del>`/`<add>`/`<gap>`/`<sic>` anywhere
 *     (confirmed by direct inspection).
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s joined with "\n\n".
 *   - A `<p>` found directly under a Book div (not inside any Chapter) is
 *     excluded from the reading text - Shuckburgh's own editorial prose
 *     (Book 17's loss-explanation, or a book-opening bridging summary before
 *     several other fragmentary books' Chapter 1) - never a translation.
 *   - XML COMMENTS (`<!--...-->`, 3 of them, all inside the appendix) are
 *     stripped from the source before tokenising, so tags they contain (the
 *     two dead `<div2>` sub-group markers, and one commented-out <table> of
 *     regnal-year calculations inside a footnote) are never mistaken for
 *     live structure - see the appendix discussion above.
 *
 * The Greek and English editions are parsed completely independently (this
 * importer never reads the Greek file or the Greek importer's output); any
 * chapter-count difference is logged to anomalies.json, not silently
 * reconciled.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/polybius-histories-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0543.tlg001.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'polybius-histories-en');

const WORK_ID = 'polybius-histories-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0543/tlg001/tlg0543.tlg001.perseus-eng2.xml';

const EXPECTED_BOOKS = 39;
/** This source's own chapter counts per book (I..XXXIX), cross-checked against the real parsed counts, never forced. Parsed fully independently of the Greek sibling's own (different) counts. Book 17 (index 16) is a total loss: 0. */
const EXPECTED_CHAPTER_COUNTS = [
  88, 71, 118, 86, 111, 57, 18, 39, 45, 49, 36, 48, 9, 13, 39, 40, 0, 55, 1, 12, 48, 21, 18, 15, 6, 1, 20, 23, 27, 24,
  28, 28, 19, 14, 6, 8, 10, 11, 18,
];
const KNOWN_EMPTY_BOOKS = new Set(['17']);
const COMPLETE_BOOKS = new Set(['1', '2', '3', '4', '5']);

// --- the "Shorter Fragments" appendix (40th top-level division) - see the module doc ---
const FRAGMENTS_BOOK_N = 'fragments';
const FRAGMENTS_TITLE = 'Shorter Fragments';
/** Verbatim from the dead (XML-commented-out) <div2 xml:id="bfragsc1"> heading - cross-checked by direct inspection, never guessed. */
const FRAGMENTS_A_HEADING = 'A: Fragments whose reference is known';
/** Verbatim from the dead (XML-commented-out) <div2 xml:id="bfragsc2"> heading. */
const FRAGMENTS_B_HEADING = 'B: Fragments of uncertain reference';
/** The chapter n (parsed as a leading integer) at which group B begins in the live chapter sequence - the position of the dead <div2 id="bfragsc2"> comment falls immediately before this chapter; independently cross-checked below against the real parsed sequence, not merely trusted from the comment. */
const FRAGMENTS_GROUP_B_STARTS_AT = 31;
const EXPECTED_FRAGMENTS_TOTAL = 110;
const EXPECTED_FRAGMENTS_A_COUNT = 30;
const EXPECTED_FRAGMENTS_B_COUNT = 80;
/** Shuckburgh's own prefatory paragraph for the appendix, verbatim (the part of the appendix's <head> after "Shorter Fragments <lb/>") - his own explanatory prose about how he organised these fragments and the two numbering schemes (his own Roman numerals; Hultsch's bracketed arabic numbers), NOT a translation of Polybius, so excluded from the reading text but quoted here in full for about.json/anomalies.json. Cross-checked against the actually-parsed head text at runtime (fails loudly on any mismatch, never silently substituted). */
const FRAGMENTS_PREFATORY_NOTE =
  'The first eight of these fragments belong to book 6, but as they do not fall in with what remains of the ' +
  'text, I have placed them here. I have divided these fragments into two classes: (A) those which seem to have ' +
  'some distinct reference which can be recognised or guessed: (B) those which though fairly complete in ' +
  'themselves cannot be so classed. A good many more, generally quoted by Suidas for the sake of some one word, ' +
  'did not seem worth putting in an English dress. The numbers in brackets are those of Hultsch’s text.';

/**
 * Why Books 30-39 diverge so sharply between the two editions (e.g. Book 32:
 * 16 Greek chapters vs. 28 here; Book 37: 1 vs. 10; Book 39: 8 vs. 18) -
 * confirmed from each source's own teiHeader publication date and from
 * explicit in-text citations in this English witness, not guessed. Kept as
 * an identical literal in both scripts/import-polybius-histories-grc/index.ts
 * and this file, so each importer stays fully independent (per this app's
 * established practice - see e.g. the shared EXPECTED_CHAPTER_COUNTS-style
 * literals elsewhere).
 */
const BOOKS_30_39_DIVERGENCE_NOTE =
  'Why Books 30-39 diverge so sharply between the two editions. Shuckburgh\'s translation (Macmillan, 1889 - see ' +
  'this source\'s own teiHeader) predates Büttner-Wobst\'s Greek critical edition (Teubner, 1893-1905 - see the ' +
  'Greek sibling\'s own teiHeader) by several years, so it cannot have used it. This English witness\'s own text ' +
  'confirms it instead follows Otto Hultsch\'s earlier Teubner edition throughout the fragmentary books, citing ' +
  'him repeatedly and by name (15 occurrences) - including direct evidence that 19th-century editors disagreed ' +
  'on which BOOK a given late fragment belongs to: one summary is noted as "arranged by Hultsch as chs. 1 and 2 ' +
  'of book 22" but appearing "as book 23, chs. 4, 5 in Schweighaeuser\'s text" (see book-22-ch-1\'s own note). ' +
  'Büttner-Wobst\'s later Greek text makes its own independent editorial decisions about where to place the same ' +
  'excerpted material and never mentions Hultsch at all (confirmed: zero occurrences in the Greek source file). ' +
  'Consequently a Book 30-39 chapter number in one edition here does not necessarily correspond to the same ' +
  'number - or even the same Book - in the other; this app reproduces each edition\'s own numbering exactly, ' +
  'unchanged, rather than attempting to reconcile them.';

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 160): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

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

/**
 * Given `body[openIdx..]` starting exactly at a `<div ...>` opening tag,
 * returns the index immediately AFTER that div's matching `</div>`, counting
 * nested `<div>` opens/closes. Used to carve out the "fragments" appendix's
 * own span as a single region (parsed separately by parseFragmentsAppendix,
 * below - its Book -> Group -> Chapter shape doesn't fit the generic
 * Book -> Chapter loop the other 39 Books use) without disturbing the main
 * loop's own stack.
 */
function skipBalancedDiv(body: string, openIdx: number): number {
  const firstGt = body.indexOf('>', openIdx);
  if (firstGt < 0) fail('unterminated <div> opening tag while locating the appendix span');
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = firstGt + 1;
  let depth = 1;
  let m: RegExpExecArray | null;
  while (depth > 0 && (m = re.exec(body))) {
    if (m[0] === '</div>') depth -= 1;
    else depth += 1;
  }
  if (depth !== 0) fail('unbalanced <div> nesting while locating the appendix span');
  return re.lastIndex;
}

interface ParsedChapterBody {
  sourceHeading: string | null;
  paragraphs: string[];
  /** every cleaned <note> span seen, kept only as a last-resort fallback (see closeChapter's own comment). */
  noteFallback: string[];
  noteFallbackHasQuote: boolean;
}

/**
 * Parses ONE chapter's inner XML (the content between its own `<div ...>` and
 * matching `</div>`, comments already stripped, no further nested <div> in
 * this source's chapters) into its sourceHeading (a leading <head>, if any)
 * and paragraph text. Mirrors the main loop's own <p>/<head>/<note>/<q>
 * handling exactly (including the nested-<p>-inside-<note> guard - see the
 * module doc), factored out here so the "Shorter Fragments" appendix's
 * chapters (parsed by parseFragmentsAppendix, below) get the identical,
 * already-corrected logic without duplicating a second, divergent copy of
 * it inline.
 */
function parseChapterInner(innerXml: string, chapterId: string, anomalies: Anomaly[]): ParsedChapterBody {
  const tokenRe = /<head\b[^>]*>|<\/head>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<q\b[^>]*>|<[^>]+>/g;

  let sourceHeading: string | null = null;
  const paragraphs: string[] = [];
  const noteFallback: string[] = [];
  let noteFallbackHasQuote = false;
  let currentNoteHasQuote = false;

  let awaitingHead = true; // a <head>, if present, is always the very first child of a chapter div in this source
  let inHead = false;
  let headBuf = '';
  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let noteBuf = '';

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(innerXml))) {
    if (m.index > lastIndex) {
      const free = innerXml.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inHead) headBuf += free;
        else if (inP) pBuf += free;
      } else {
        noteBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/^<head\b/.test(tok)) {
      if (awaitingHead) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        const cleaned = cleanText(headBuf);
        if (sourceHeading) {
          anomalies.push({ where: chapterId, note: `A second <head> was found for this chapter; appended to the first rather than discarded: "${excerpt(cleaned)}"` });
          sourceHeading = `${sourceHeading} ${cleaned}`;
        } else {
          sourceHeading = cleaned;
        }
        awaitingHead = false;
      }
    } else if (/^<p\b/.test(tok)) {
      if (noteDepth === 0) {
        inP = true;
        pBuf = '';
        awaitingHead = false;
      }
    } else if (tok === '</p>' && noteDepth === 0) {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length > 0) paragraphs.push(cleaned);
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
      if (noteDepth === 1) {
        noteBuf = '';
        currentNoteHasQuote = false;
      }
    } else if (/^<q\b/.test(tok)) {
      if (noteDepth > 0) currentNoteHasQuote = true;
    } else if (tok === '</note>') {
      noteDepth = Math.max(0, noteDepth - 1);
      if (noteDepth === 0) {
        const cleanedNote = cleanText(noteBuf);
        if (cleanedNote.length > 0) {
          noteFallback.push(cleanedNote);
          if (currentNoteHasQuote) noteFallbackHasQuote = true;
        }
        noteBuf = '';
      }
    }
  }
  if (noteDepth !== 0) fail(`${chapterId}: unbalanced <note> nesting (final depth ${noteDepth})`);

  return { sourceHeading, paragraphs, noteFallback, noteFallbackHasQuote };
}

interface ParsedFragmentsAppendix {
  division: Division;
  totalChapters: number;
  totalChars: number;
  totalNoteFallbackChapters: number;
}

/**
 * Parses the "Shorter Fragments" appendix's own region (comments already
 * stripped) into the 3-level `fragments` -> [`fragments-a`, `fragments-b`]
 * -> chapter Division tree - see the module doc for the full structural
 * account (in particular: why the two Groups are reconstructed from a DEAD,
 * XML-commented-out `<div2>` pair rather than live structure).
 */
function parseFragmentsAppendix(regionXml: string, anomalies: Anomaly[]): ParsedFragmentsAppendix {
  const bookOpenEnd = regionXml.indexOf('>') + 1;
  if (bookOpenEnd <= 0) fail('appendix: could not find the end of the opening <div> tag');

  // The appendix's own <head>: "Shorter Fragments <lb/> <prefatory prose>".
  const headMatch = /^\s*<head\b[^>]*>([\s\S]*?)<\/head>/.exec(regionXml.slice(bookOpenEnd));
  if (!headMatch) fail('appendix: expected a <head> immediately after the opening <div>, found none');
  const rawHead = headMatch[1]!;
  const lbMatch = /<lb\s*\/>/.exec(rawHead);
  if (!lbMatch) fail('appendix: expected an <lb/> splitting the appendix <head> into title and prefatory prose');
  const titlePart = cleanText(rawHead.slice(0, lbMatch.index));
  const prefatoryPart = cleanText(rawHead.slice(lbMatch.index + lbMatch[0].length));
  if (titlePart !== FRAGMENTS_TITLE) fail(`appendix: <head> title is ${JSON.stringify(titlePart)}, expected ${JSON.stringify(FRAGMENTS_TITLE)}`);
  if (prefatoryPart !== FRAGMENTS_PREFATORY_NOTE) {
    fail(`appendix: prefatory note text does not match the constant FRAGMENTS_PREFATORY_NOTE. Got: ${JSON.stringify(prefatoryPart)}`);
  }
  anomalies.push({
    where: 'fragments',
    note: `Shuckburgh's own prefatory paragraph for this appendix (part of its <head>, after the short title "Shorter Fragments" and an <lb/>) is his own explanatory prose about how he organised these fragments and the two numbering schemes in play - NOT a translation of Polybius - so it is excluded from the reading text (sourceHeading carries only the short title). Quoted here verbatim, in full: "${prefatoryPart}"`,
  });

  // The 110 chapter divs are FLAT (no further nested <div> inside any of them in this
  // source), so a single non-greedy regex across the whole region correctly isolates
  // each one's own inner XML.
  const chapterRe = /<div\b[^>]*subtype="chapter"[^>]*\sn="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g;
  const chaptersA: Division[] = [];
  const chaptersB: Division[] = [];
  let totalChapters = 0;
  let totalChars = 0;
  let totalNoteFallbackChapters = 0;
  let cm: RegExpExecArray | null;
  while ((cm = chapterRe.exec(regionXml))) {
    const n = cm[1]!;
    const innerXml = cm[2]!;
    const baseNum = Number.parseInt(n, 10);
    if (!Number.isFinite(baseNum)) fail(`appendix: chapter n="${n}" has no leading integer`);
    const group: 'a' | 'b' = baseNum < FRAGMENTS_GROUP_B_STARTS_AT ? 'a' : 'b';
    const chapterId = `fragments-${group}-ch-${n}`;

    const parsed = parseChapterInner(innerXml, chapterId, anomalies);
    let text: string;
    let anomaly: string | undefined;
    if (parsed.paragraphs.length > 0) {
      text = parsed.paragraphs.join('\n\n');
    } else if (parsed.noteFallback.length > 0) {
      totalNoteFallbackChapters += 1;
      text = parsed.noteFallback.join('\n\n');
      anomaly = parsed.noteFallbackHasQuote
        ? "This chapter's entire surviving text comes from inside a <note> - kept here only because excluding it " +
          'would leave this chapter with no reading text at all. Unlike a pure editorial summary, this note ALSO ' +
          "wraps a genuine quoted translation (a <q> element) - Shuckburgh's own editorial framing and his " +
          'translation of a real quotation are both retained together, exactly as the source nests them.'
        : "This chapter's entire surviving text is Shuckburgh's own inline editorial note, not a translation of " +
          'any surviving Polybius text - kept here only because excluding it would leave this chapter with no ' +
          'reading text at all.';
      anomalies.push({ where: chapterId, note: anomaly });
    } else {
      fail(`${chapterId}: has no surviving text at all (neither a paragraph nor a fallback note)`);
    }

    const chapterDiv: Division = {
      id: chapterId,
      number: n,
      ref: null,
      sourceHeading: parsed.sourceHeading,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text, ref: null, ...(anomaly ? { anomaly } : {}) }],
    };
    (group === 'a' ? chaptersA : chaptersB).push(chapterDiv);
    totalChapters += 1;
    totalChars += text.length;
  }

  if (totalChapters !== EXPECTED_FRAGMENTS_TOTAL) fail(`appendix: expected ${EXPECTED_FRAGMENTS_TOTAL} chapters, parsed ${totalChapters}`);
  if (chaptersA.length !== EXPECTED_FRAGMENTS_A_COUNT) fail(`appendix: expected ${EXPECTED_FRAGMENTS_A_COUNT} chapters in fragments-a, parsed ${chaptersA.length}`);
  if (chaptersB.length !== EXPECTED_FRAGMENTS_B_COUNT) fail(`appendix: expected ${EXPECTED_FRAGMENTS_B_COUNT} chapters in fragments-b, parsed ${chaptersB.length}`);
  if (chaptersB[0]?.number !== String(FRAGMENTS_GROUP_B_STARTS_AT)) {
    fail(`appendix: fragments-b's first chapter is n="${chaptersB[0]?.number}", expected "${FRAGMENTS_GROUP_B_STARTS_AT}" (the position where the dead <div2 id="bfragsc2"> comment falls)`);
  }

  const fragmentsA: Division = {
    id: 'fragments-a',
    number: null,
    ref: null,
    sourceHeading: FRAGMENTS_A_HEADING,
    editorialTitle: null,
    children: chaptersA,
    passages: [],
  };
  const fragmentsB: Division = {
    id: 'fragments-b',
    number: null,
    ref: null,
    sourceHeading: FRAGMENTS_B_HEADING,
    editorialTitle: null,
    children: chaptersB,
    passages: [],
  };
  const division: Division = {
    id: 'fragments',
    number: null,
    ref: null,
    sourceHeading: FRAGMENTS_TITLE,
    editorialTitle: null,
    children: [fragmentsA, fragmentsB],
    passages: [],
  };

  return { division, totalChapters, totalChars, totalNoteFallbackChapters };
}

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const bodyStart = xml.indexOf('<text');
  const bodyEnd = xml.indexOf('</text>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <text>...</text> found in source XML');
  // Strip XML comments (3 of them, all inside the "Shorter Fragments" appendix - the
  // TEI header's own 2 comments fall before bodyStart and are already excluded) before
  // tokenising, so the tags they contain (two dead <div2> sub-group markers, one
  // commented-out <table>) are never mistaken for live structure - see the module doc.
  const body = xml.slice(bodyStart, bodyEnd).replace(/<!--[\s\S]*?-->/g, '');

  const tokenRe =
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<pb\b[^>]*\/?>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];
  let fragmentsResult: ParsedFragmentsAppendix | null = null;

  const stack: Array<'book' | 'chapter' | 'other'> = [];
  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let currentChapterDiv: Division | null = null;
  let chapterParagraphs: string[] = [];
  /** every cleaned <note> span seen in the current chapter, kept only as a last-resort
   *  fallback for a chapter whose ENTIRE surviving text would otherwise be empty
   *  (mirrors the established jewish-antiquities-grc <del>-fallback precedent). */
  let chapterNoteFallback: string[] = [];
  /** true once any note contributing to chapterNoteFallback in the CURRENT chapter is
   *  found to contain a genuine <q> quotation (not just Shuckburgh's own editorial
   *  prose) - some notes wrap both an editorial introduction AND a real quoted
   *  translation together (e.g. book-9-ch-28's speech of Chlaeneas), so the fallback
   *  anomaly wording must not blanket-claim "no translation" when that happens. */
  let chapterNoteFallbackHasQuote = false;
  let currentNoteHasQuote = false;

  let awaitingHeadDiv: Division | null = null;
  let inHead = false;
  let headBuf = '';

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let noteBuf = '';

  let totalChapters = 0;
  let totalNotes = 0;
  let totalNoteFallbackChapters = 0;
  let totalPageBreaks = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalStrayBookParagraphs = 0;

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterNoteFallback = [];
    chapterNoteFallbackHasQuote = false;
    currentChapterDiv = {
      id: currentChapterId,
      number: currentChapterNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [],
    };
    awaitingHeadDiv = currentChapterDiv;
  }

  function closeChapter(): void {
    if (!currentBookDiv || !currentChapterDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    let passage: Passage;
    if (chapterParagraphs.length === 0 && chapterNoteFallback.length > 0) {
      // This chapter's ENTIRE text falls inside <note> (Shuckburgh sometimes supplies
      // his own inline editorial summary, <note type="summary" place="inline"
      // resp="ess">, bridging a stretch for which no Polybius text survives to
      // translate) - excluding it as usual would leave this Division with no reading
      // text at all. As a last resort ONLY for this case (mirrors the established
      // jewish-antiquities-grc <del>-fallback precedent), the note's own text is kept
      // after all, clearly flagged as Shuckburgh's own editorial prose, not a
      // translation of Polybius.
      totalNoteFallbackChapters += 1;
      const text = chapterNoteFallback.join('\n\n');
      const note = chapterNoteFallbackHasQuote
        ? "This chapter's entire surviving text comes from inside a <note> - kept here only because excluding it, " +
          'as every other <note> in this source is excluded, would leave this chapter with no reading text at all. ' +
          "Unlike a pure editorial summary, this note ALSO wraps a genuine quoted translation (a <q> element) - " +
          "Shuckburgh's own editorial framing and his translation of a real quotation are both retained together, " +
          'exactly as the source nests them.'
        : "This chapter's entire surviving text is Shuckburgh's own inline editorial summary (<note type=\"summary\" " +
          'place="inline" resp="ess">), not a translation of any surviving Polybius text - kept here only because ' +
          'excluding it, as every other <note> in this source is excluded, would leave this chapter with no reading ' +
          'text at all.';
      passage = { n: '', text, ref: null, anomaly: note };
      anomalies.push({ where: currentChapterId, note });
    } else if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    } else {
      passage = { n: '', text: chapterParagraphs.join('\n\n'), ref: null };
    }
    currentChapterDiv.passages = [passage];
    currentBookDiv.children.push(currentChapterDiv);
    totalChapters += 1;
    currentChapterDiv = null;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inHead) headBuf += free;
        else if (inP) pBuf += free;
      } else {
        noteBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="book"/.test(tok)) {
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (n === undefined) fail(`book div with no n= attribute: ${tok}`);
      if (n === FRAGMENTS_BOOK_N) {
        // The "Shorter Fragments" appendix - see the module doc. Its Book -> Group ->
        // Chapter shape doesn't fit this loop's generic Book -> Chapter handling, so
        // it is carved out as its own region and parsed separately by
        // parseFragmentsAppendix, then skipped over here (without pushing any stack
        // frame) so the main loop's own state is untouched by it.
        const after = skipBalancedDiv(body, m.index);
        const regionXml = body.slice(m.index, after);
        fragmentsResult = parseFragmentsAppendix(regionXml, anomalies);
        tokenRe.lastIndex = after;
        lastIndex = after;
        continue;
      }
      stack.push('book');
      currentBookNum = n;
      const bookNum = Number(n);
      if (!Number.isFinite(bookNum) || bookNum < 1 || bookNum > EXPECTED_BOOKS) fail(`unexpected book number "${n}"`);
      currentBookDiv = {
        id: `book-${n}`,
        number: n,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
      awaitingHeadDiv = currentBookDiv;
    } else if (/subtype="chapter"/.test(tok)) {
      stack.push('chapter');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (n === undefined) fail(`chapter div with no n= attribute: ${tok}`);
      openChapter(n);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'chapter') closeChapter();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      // A <p> nested INSIDE a <note> (e.g. a footnote's own paragraph, or the
      // family-tree/letter-grouping-table footnotes in this source) must NOT
      // touch inP/pBuf at all: doing so would reset pBuf and silently discard
      // whatever real running text had already accumulated there before the
      // enclosing <note> opened. While noteDepth > 0, all free text - at any
      // nesting depth, including inside a nested <p> - already flows into
      // noteBuf via the capture logic above; <p>/</p> boundaries within a
      // note carry no meaning for the (wholly-discarded, or last-resort
      // fallback) note text, so they are ignored here.
      if (noteDepth === 0) {
        inP = true;
        pBuf = '';
        awaitingHeadDiv = null; // real content started; no head is coming for this division
      }
    } else if (tok === '</p>' && noteDepth === 0) {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (currentChapterDiv) {
        if (cleaned.length === 0) {
          totalEmptyParagraphsDropped += 1;
          anomalies.push({
            where: currentChapterId,
            note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
          });
        } else {
          chapterParagraphs.push(cleaned);
        }
      } else {
        // A <p> directly under a Book div, outside any Chapter. Seen for Book 17
        // (entirely lost; Shuckburgh's own editorial explanation of the loss, printed
        // as plain prose, NOT <note>-wrapped) and, more than once, as a book-opening
        // bridging summary Shuckburgh supplies before Chapter 1 of several other
        // fragmentary books (e.g. Book 15, wrapped entirely in his own <note
        // type="summary" place="inline" resp="ess">) to narrate continuity across a
        // gap in the surviving text. In every case directly inspected, this text is
        // Shuckburgh's own editorial prose commenting ON the loss/gap, never a
        // translation of surviving Polybius text - so it is excluded from the
        // reading text here regardless of whether a <note> wrapper happens to be
        // present, and logged verbatim (via the excerpt below) so the exclusion is
        // fully auditable.
        totalStrayBookParagraphs += 1;
        anomalies.push({
          where: `book-${currentBookNum}`,
          note: `A paragraph directly under this Book's own div (outside any Chapter) was excluded from the reading text - Shuckburgh's own editorial prose (a book-loss explanation or a bridging summary), not a translation of Polybius: "${excerpt(cleaned)}"`,
        });
      }
    } else if (/^<head\b/.test(tok)) {
      if (awaitingHeadDiv) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        const cleaned = cleanText(headBuf);
        if (awaitingHeadDiv) {
          if (awaitingHeadDiv.sourceHeading) {
            anomalies.push({ where: awaitingHeadDiv.id, note: `A second <head> was found for this division; appended to the first rather than discarded: "${excerpt(cleaned)}"` });
            awaitingHeadDiv.sourceHeading = `${awaitingHeadDiv.sourceHeading} ${cleaned}`;
          } else {
            awaitingHeadDiv.sourceHeading = cleaned;
          }
        }
        awaitingHeadDiv = null;
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
      if (noteDepth === 1) {
        noteBuf = '';
        currentNoteHasQuote = false;
      }
    } else if (/^<q\b/.test(tok)) {
      if (noteDepth > 0) currentNoteHasQuote = true;
    } else if (tok === '</note>') {
      noteDepth = Math.max(0, noteDepth - 1);
      if (noteDepth === 0) {
        totalNotes += 1;
        if (currentChapterDiv) {
          const cleanedNote = cleanText(noteBuf);
          if (cleanedNote.length > 0) {
            chapterNoteFallback.push(cleanedNote);
            if (currentNoteHasQuote) chapterNoteFallbackHasQuote = true;
          }
        }
        noteBuf = '';
      }
    } else if (/^<pb\b/.test(tok)) {
      totalPageBreaks += 1;
    }
    // The final catch-all <[^>]+> (<placeName>, <date>, <foreign>, <q>,
    // <quote>, <bibl>, <title>, <cit>, <term>, <l>, <hi>, <rs>, <persName>,
    // <label>, <num>, <emph>, <gloss>, and their closing tags, plus anything
    // else): no structural action - text already flows into pBuf/headBuf via
    // the free-text capture above (suppressed only while noteDepth>0).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (!fragmentsResult) fail('expected to find and parse the "Shorter Fragments" appendix, but never encountered it');
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);

  // --- cross-check chapter counts against this source's own totals, honestly ---
  const chapterCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_CHAPTER_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) chapterCountMismatches.push(`Book ${i + 1}: parsed ${got} chapters, expected ${want}`);
  });
  if (chapterCountMismatches.length > 0) fail(`chapter count mismatch(es): ${chapterCountMismatches.join('; ')}`);

  // --- chapter number format: digits optionally followed by one lowercase letter; no duplicates within a book ---
  const formatIssues: string[] = [];
  divisions.forEach((b) => {
    const seen = new Set<string>();
    for (const c of b.children) {
      const n = c.number ?? '';
      if (!/^[0-9]+[a-z]?$/.test(n)) formatIssues.push(`${c.id}: unexpected chapter-number format "${n}"`);
      if (seen.has(n)) formatIssues.push(`${c.id}: duplicate chapter number "${n}" within ${b.id}`);
      seen.add(n);
    }
  });
  if (formatIssues.length > 0) fail(`chapter-number issues: ${formatIssues.join('; ')}`);

  // --- Book 17 must be the only entirely-empty book ---
  divisions.forEach((b, i) => {
    const bookN = String(i + 1);
    const isKnownEmpty = KNOWN_EMPTY_BOOKS.has(bookN);
    if (isKnownEmpty && b.children.length !== 0) fail(`${b.id} was expected to be entirely lost (0 chapters) but parsed ${b.children.length}`);
    if (!isKnownEmpty && b.children.length === 0) fail(`${b.id} unexpectedly parsed with 0 chapters (not a known total loss)`);
  });
  if (totalStrayBookParagraphs < KNOWN_EMPTY_BOOKS.size) {
    fail(`expected at least ${KNOWN_EMPTY_BOOKS.size} stray book-level <p> (one per entirely-lost book), found ${totalStrayBookParagraphs}`);
  }

  // --- no chapter should ever be empty -----------------------------------
  const emptyChapters: string[] = [];
  for (const b of divisions) {
    for (const c of b.children) {
      if (c.passages.length === 0 || c.passages[0]!.text.length === 0) emptyChapters.push(c.id);
    }
  }
  if (emptyChapters.length > 0) fail(`chapter division(s) unexpectedly carry empty passage text: ${emptyChapters.sort().join(', ')}`);

  // --- corpus-level anomalies ----------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note:
      'Only Books 1-5 survive complete. Books 6-39 survive only as excerpts and fragments. This witness is parsed ' +
      'completely independently of the Greek sibling (data/polybius-histories-grc); their chapter COUNTS differ, ' +
      'often substantially, throughout Books 6-39 (e.g. Book 30: 32 Greek chapters vs. 24 here; Book 36: 17 Greek ' +
      'vs. 8 here; Book 39: 8 Greek vs. 18 here). No attempt is made to reconcile, renumber or align either ' +
      'witness\'s chapters to the other - see about.json for the full book-by-book comparison.',
  });
  anomalies.push({
    where: 'book-17',
    note:
      "Book 17 does not survive at all. This witness's sole content for it is Shuckburgh's own editorial " +
      'paragraph explaining what the lost book would have covered (citing Livy) - NOT a translation of any ' +
      'surviving Polybius text - so it is excluded from the reading text, leaving book-17 with zero Chapters, ' +
      'exactly as the Greek sibling is also a total loss for this book.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalStrayBookParagraphs} paragraph(s) found directly under a Book div, outside any Chapter, were excluded from the reading text (each is individually logged above by book). These are Shuckburgh's own editorial prose - either the book-17 loss explanation, or a book-opening bridging summary he supplies before Chapter 1 of a fragmentary book to narrate continuity across a gap in the surviving text - never a translation of surviving Polybius text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> span(s) (Shuckburgh's own footnotes - historical commentary, cross-references, marginal date/consul-year glosses; never part of the translated running text) were excluded entirely, tag and content. This is a single aggregate count: a genuinely repetitive apparatus class, not logged occurrence-by-occurrence.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNoteFallbackChapters} chapter(s) had NO surviving text once their <note> apparatus was excluded as usual - each is a chapter where Shuckburgh supplies only his own inline editorial summary (<note type="summary" place="inline" resp="ess">) bridging a stretch for which no Polybius text survives to translate. As a last resort, that note's own text was kept rather than leaving the chapter empty; each is individually logged above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `${totalPageBreaks} <pb/> page-break marker(s) (to this edition's 1889 print pagination) were dropped as scaffolding; they carry no citation value in this schema.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme usable by this schema (the <pb/> markers above are dropped, not repurposed as a ref).',
  });
  anomalies.push({
    where: 'fragments',
    note:
      `Shuckburgh's own "Shorter Fragments" appendix (${fragmentsResult.totalChapters} chapters, ` +
      `${fragmentsResult.totalChars} chars of real translated text) was found after Book 39 and is imported as a ` +
      "40th top-level Division, `fragments` - not nested under Book 6 or any other Book, since it is not keyed " +
      "1:1 to any single Book's own chapter numbering. Its two Groups (`fragments-a`, `fragments-b`) are " +
      "reconstructed from Shuckburgh's own two-class scheme, whose <div2> markers are present in the source only " +
      "as a dead XML comment (not live structure) - see about.json and the module doc for the full account. " +
      `${fragmentsResult.totalNoteFallbackChapters} of its chapters needed the same last-resort <note>-fallback ` +
      'handling as the numbered Books (see the "reading text" anomalies above); each is individually logged above.',
  });

  // --- write outputs -------------------------------------------------
  divisions.push(fragmentsResult.division);
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Histories',
    author: 'Polybius',
    language: 'en',
    translator: 'Evelyn S. Shuckburgh',
    edition: 'The Histories of Polybius, 2 vols., trans. Evelyn S. Shuckburgh (London/New York: Macmillan, 1889)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ' +
      'urn:cts:greekLit:tlg0543.tlg001.perseus-eng2), digitising Evelyn S. Shuckburgh\'s translation "The ' +
      'Histories of Polybius" (London/New York: Macmillan, 1889); imported by ' +
      'scripts/import-polybius-histories-en. The raw file is fetched once (cached at ' +
      'scripts/import-polybius-histories-en/raw/) and bundled with the app; nothing is loaded from the network at ' +
      'runtime.',
    license:
      "Shuckburgh's 1889 translation is in the public domain. The digital transcription is distributed by the " +
      'Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: "Polybius's Histories — English, trans. Shuckburgh",
        paragraphs: [
          'This is the English translation of Polybius\'s Histories, narrating the rise of Rome to Mediterranean ' +
            'dominance from 264 to 146 BC, made by Evelyn S. Shuckburgh and first published by Macmillan in 1889. ' +
            'It stands alongside the Greek text (Büttner-Wobst, Teubner) already in this library as a facing ' +
            'English rendering.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently ' +
            'corrected.',
        ],
      },
      {
        heading: 'IMPORTANT - this is a LARGE, mostly FRAGMENTARY work',
        paragraphs: [
          'Of the 39 Books, only Books 1-5 survive complete. Books 6-39 survive only as excerpts and fragments; ' +
            'Book 17 is a total loss (see "Known gaps & anomalies" below).',
          "This translation is parsed completely independently of the Greek sibling (data/polybius-histories-grc) " +
            "- Shuckburgh's own division of the fragmentary books differs from Büttner-Wobst's Greek text " +
            'throughout, sometimes substantially. Examples: Book 4 (87 Greek chapters vs. 86 here), Book 6 (61 vs. ' +
            '57), Book 12 (52 vs. 48), Book 30 (32 vs. 24), Book 32 (16 vs. 28 - MORE here than in Greek), Book 36 ' +
            '(17 vs. 8), Book 37 (1 vs. 10 - far more here), Book 39 (8 vs. 18 - far more here). No attempt is ' +
            'made to reconcile, renumber or force either witness\'s chapters to align with the other\'s - each is ' +
            'this edition\'s own printed numbering, verbatim.',
        ],
      },
      {
        heading: 'The "Shorter Fragments" appendix (a 40th top-level Division)',
        paragraphs: [
          `This source XML carries a 40th division after Book 39, containing Shuckburgh's own appendix of ` +
            `${EXPECTED_FRAGMENTS_TOTAL} short but WHOLE, real fragments of his translation (${fragmentsResult.totalChars} ` +
            "characters) - mostly belonging to Book 6 but not integrated into its numbered chapters, plus " +
            'geographical fragments and others of uncertain reference. It is imported as its own top-level ' +
            'Division, `fragments` (sitting alongside, not nested inside, the 39 numbered Books), since it is not ' +
            "keyed 1:1 to any single Book's own chapter numbering.",
          `Shuckburgh divided these fragments "into two classes: (A) those which seem to have some distinct ` +
            'reference which can be recognised or guessed: (B) those which though fairly complete in themselves ' +
            'cannot be so classed" - his own words, quoted from his prefatory note below. This app reconstructs ' +
            'his two classes as Group Divisions `fragments-a` ("A: Fragments whose reference is known", 30 ' +
            'chapters) and `fragments-b` ("B: Fragments of uncertain reference", 80 chapters, including several ' +
            'lettered insertions such as 39a/39b). A curiosity of THIS specific digital edition: the source XML\'s ' +
            'own attempt to encode these two classes as `<div2>` sub-divisions is entirely wrapped in an XML ' +
            'COMMENT, so it is not part of the live document tree at all - this app reconstructs the two groups ' +
            "from that dead comment's own label text and position (independently cross-checked against the real " +
            'chapter sequence) rather than from live structure, since none exists.',
          `Each fragment Chapter (e.g. \`fragments-a-ch-1\`) carries a sourceHeading such as "I (6, 2)": the Roman ` +
            "numeral is Shuckburgh's own running fragment number; the bracketed arabic number is Hultsch's Teubner " +
            'fragment number - both stay visible to the reader this way, exactly as printed.',
          "Shuckburgh's own prefatory paragraph for the whole appendix - his explanation of how he organised it, " +
            'not a translation of Polybius - is excluded from the reading text (the `fragments` Division\'s ' +
            'sourceHeading is just the short title, "Shorter Fragments") but quoted here verbatim, in full: "' +
            FRAGMENTS_PREFATORY_NOTE +
            '"',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Evelyn S. Shuckburgh, trans., The Histories of Polybius, 2 vols. (London/New York: Macmillan, 1889). ' +
            'This translation is in the public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0543.tlg001.perseus-eng2.xml (CTS ' +
            'urn:cts:greekLit:tlg0543.tlg001.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-greekLit repository. Fetched once and bundled with the app; nothing is loaded from the ' +
            'network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter <div>s and collects every <p> paragraph within each chapter, ' +
            "in document order, into that chapter's single Passage (joined with a blank line when a chapter has " +
            `more than one paragraph). Shuckburgh's extensive footnote apparatus (<note>, ${totalNotes} top-level ` +
            'spans across the 39 numbered Books - historical commentary, cross-references, marginal date and ' +
            'consul-year glosses) is excluded entirely; page-break markers (<pb/>, to his 1889 print pagination) ' +
            'are dropped. Purely semantic wrapper tags occurring directly in the translated prose (<placeName>, ' +
            '<date>, <foreign>, <q>, <quote>, <bibl>, <title>, <term>, <label>, and similar) are unwrapped, their ' +
            'text flowing into the surrounding prose unchanged. XML comments (3, all inside the appendix) are ' +
            'stripped before parsing. Entities are decoded and runs of whitespace collapsed; the words ' +
            'themselves are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering - which, per the ' +
            'IMPORTANT note above, does not always match the Greek sibling\'s. This source carries no finer, ' +
            'page-marker-style citation scheme usable by this schema, so Division.ref and Passage.ref are null ' +
            'throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `Completeness. All ${EXPECTED_BOOKS} Books are present. Only Books 1-5 are textually complete; every ` +
            'other book is excerpted or fragmentary to some degree, independently of (and not always matching) ' +
            'the Greek sibling\'s own excerpting - see "IMPORTANT" above for specific examples.',
          "Book 17 is a total loss. This witness's sole content for it is Shuckburgh's own editorial paragraph " +
            'explaining what the lost book would have covered (citing Livy, 31.34-43 and 32.9-18) - not a ' +
            'translation of any surviving Polybius text - so it is excluded from the reading text. book-17 carries ' +
            'zero Chapters, matching the Greek sibling\'s own total loss for this book.',
          `Book-opening bridging summaries. ${totalStrayBookParagraphs} paragraph(s) total appear directly under a ` +
            "Book's own div, before its Chapter 1 (e.g. Book 15) - Shuckburgh's own prose narrating continuity " +
            'across a gap in the surviving text, not a translation of Polybius. Excluded from the reading text for ' +
            'the same reason as Book 17\'s loss-explanation paragraph; every occurrence is individually logged in ' +
            'anomalies.json by book.',
          `The "Shorter Fragments" appendix (${fragmentsResult.totalChapters} chapters, ` +
            `${fragmentsResult.totalChars} chars) IS imported, as a 40th top-level Division \`fragments\` - see ` +
            '"The Shorter Fragments appendix" section above for the full account, including why its two Groups ' +
            'are reconstructed from a dead XML comment rather than live structure, and its prefatory note, quoted ' +
            'verbatim there.',
          `Footnote apparatus. ${totalNotes} <note> span(s) in the 39 numbered Books (Shuckburgh's own footnotes) ` +
            `plus 48 more in the appendix were excluded entirely; ${totalPageBreaks} <pb/> page-break marker(s) ` +
            'in the numbered Books plus 16 more in the appendix were dropped. Both are logged as aggregate counts ' +
            'in anomalies.json (a genuinely repetitive class), not occurrence-by-occurrence.',
          `Note-fallback chapters. ${totalNoteFallbackChapters} chapter(s) in the numbered Books (e.g. ` +
            `book-8-ch-4b) plus ${fragmentsResult.totalNoteFallbackChapters} more in the appendix have NO ` +
            'surviving translated text once the usual <note> exclusion is applied - Shuckburgh instead supplies ' +
            'only his own inline editorial note bridging a stretch for which no Polybius text survives to ' +
            "translate (occasionally, e.g. book-9-ch-28, that same note ALSO wraps a genuine quoted translation). " +
            "As a last resort, the note's own text is kept rather than leaving the chapter empty, clearly flagged " +
            "via each Passage's anomaly field - every occurrence is logged individually in anomalies.json.",
          'Chapter-count divergence from the Greek sibling. Shuckburgh\'s own division of the fragmentary books ' +
            '(6-39) routinely differs, sometimes substantially, from Büttner-Wobst\'s Greek text - see "IMPORTANT" ' +
            'above for specific book-by-book examples, and the next paragraph on Books 30-39 specifically. Both ' +
            'witnesses are parsed completely independently; neither is forced to match the other.',
          BOOKS_30_39_DIVERGENCE_NOTE,
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  const books = divisions.slice(0, EXPECTED_BOOKS);
  let totalChars = 0;
  for (const b of books) totalChars += b.children.reduce((n, c) => n + c.passages.reduce((mm, p) => mm + p.text.length, 0), 0);

  process.stdout.write('\nBooks:\n');
  books.forEach((b, i) => {
    const complete = COMPLETE_BOOKS.has(b.number!) ? 'complete' : b.children.length === 0 ? 'TOTAL LOSS' : 'fragmentary';
    process.stdout.write(
      `  Book ${String(b.number).padStart(2)}  ${b.id.padEnd(9)} ${String(b.children.length).padStart(3)} chapters (expected ${String(EXPECTED_CHAPTER_COUNTS[i]).padStart(3)})  [${complete}]\n`,
    );
  });
  process.stdout.write(
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ${totalNotes} <note>  ${totalPageBreaks} <pb>  ` +
      `${totalNoteFallbackChapters} note-fallback chapters\n`,
  );
  process.stdout.write(
    `\n  Appendix "fragments": ${fragmentsResult.totalChapters} chapters (fragments-a: ${fragmentsResult.division.children[0]!.children.length}, ` +
      `fragments-b: ${fragmentsResult.division.children[1]!.children.length})  ${fragmentsResult.totalChars} chars  ` +
      `${fragmentsResult.totalNoteFallbackChapters} note-fallback chapters\n`,
  );
  process.stdout.write(
    `\n  Grand total: ${EXPECTED_BOOKS + 1} top-level divisions  ${totalChapters + fragmentsResult.totalChapters} chapters  ` +
      `${totalChars + fragmentsResult.totalChars} chars  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-polybius-histories-en/validate.ts` next.\n');
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
