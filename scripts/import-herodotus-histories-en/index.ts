/**
 * Herodotus, "The Histories" - English translation (A. D. Godley, trans.,
 * "Modernized by Perseus"; from the same Loeb Classical Library edition as
 * the Greek sibling: Herodotus, 4 vols., Cambridge, MA: Harvard University
 * Press; London: William Heinemann Ltd., 1920-1925; CTS
 * urn:cts:greekLit:tlg0016.tlg001.perseus-eng2). Run-once ingestion
 * pipeline.
 *
 *   npm run import:herodotus-histories-en
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-herodotus-histories-en/raw/tlg0016.tlg001.perseus-eng2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository
 * and writes:
 *   data/herodotus-histories-en/work.json       - the GenericWork (9 Books,
 *                                                  each a flat list of
 *                                                  Chapter divisions, one
 *                                                  Passage each)
 *   data/herodotus-histories-en/about.json      - provenance / licence / prose
 *   data/herodotus-histories-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:herodotus-histories-en`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML,
 * independently of the Greek witness rather than assumed identical) ---
 * <div type="textpart" n="N" subtype="Book"> (9 books, NOTE capital "Book" -
 * unlike every other subtype in this source, which is lowercase; the token
 * matcher below accounts for this) ->
 *   <div type="textpart" n="M" subtype="chapter"> (1578 total) ->
 *     <div type="textpart" n="K" subtype="section"> (4338 total) ->
 *       <p>...</p> (4338 total)
 * Confirmed to agree with the Greek witness exactly, chapter for chapter,
 * including the same 45 single-uppercase-letter-suffixed chapter numbers
 * (e.g. "121A".."121F" in Book 2) - see data/herodotus-histories-grc/
 * types.ts for the full explanation. Chapter 1 of Book 1 opens with a
 * <div subtype="section" n="pr"> (the proem, Godley's "pr" = proem,
 * corresponding to the Greek witness's section n="0") before section n="1" -
 * needs no special handling since section numbers are not stored in this
 * schema; the proem is simply the first <p> collected in document order.
 *
 * Faithfulness rules (mirrors the Caesar/Nicomachean-Ethics English
 * conventions):
 *   - verbatim English (Godley's own translation) reading text only; no
 *     modernising or "improving" his wording.
 *   - `<note anchored="true" resp="ed">...</note>` (528 occurrences) is
 *     Godley's/Perseus's own editorial footnote apparatus - NOT part of the
 *     translated running text - excluded entirely, tag and content.
 *     Counted in aggregate, not logged individually (matches this app's Pro
 *     Milone precedent for a high-volume, uniform apparatus class). Every
 *     `<foreign>` (97), `<date>` (53 of 64) and `<bibl>` (106 of 110)
 *     nested inside a `<note>` is dropped along with it.
 *   - `<name type="place">` wraps a Perseus-added `<reg>...</reg>` gazetteer
 *     blurb (coordinates + a longer geographic description, e.g. "Bodrum
 *     [27.466,37.5] (inhabited place), Mugla Ili, ... Turkey, Asia") ahead
 *     of - or, when no `<placeName>` sibling is present, immediately before
 *     - the actual word Godley's translation prints (e.g. "Halicarnassus",
 *     or bare trailing text like "Tyrrhenia"/"Nile"). This `<reg>` blurb is
 *     linked-data enrichment, not translated content - confirmed by direct
 *     inspection (4305 occurrences, ALL nested inside `<name>`, and its
 *     content never overlaps with what `<placeName>`, or the bare trailing
 *     text, actually prints) - excluded entirely; only the genuine display
 *     text survives. `<name>` itself, `<placeName>` (1522), `<persName>`,
 *     `<date>` (64, e.g. inline years like "560" or festival names like
 *     "Panathenaea") and `<title>` (14, e.g. "Iliad"/"Odyssey", referenced
 *     inline in Godley's own prose) are all unwrapped: their text is
 *     genuine translated content.
 *   - `<bibl>...</bibl>` (110 occurrences: 4 inside `<cit>`, citing the
 *     Homeric source of a quotation Herodotus makes, e.g. "Hom. Il.
 *     6.289-292"; 106 more inside `<note>`, already dropped with it) is
 *     Perseus's own citation apparatus, not Godley's translated text -
 *     excluded entirely wherever it occurs, matching this app's established
 *     <bibl> convention.
 *   - `<milestone unit="para"/>` (1558, all self-closing) is a paragraph
 *     milestone with no reading-text content - dropped without logging
 *     individually (matches this app's <milestone>/<pb> convention).
 *   - `<quote>`/`<l>`/`<cit>` (46/147/4, wrapping quoted Homeric verse
 *     Godley translates) are unwrapped: their text is genuine translated
 *     content, flowing into the surrounding prose.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s joined with "\n\n".
 *   - a final cleanup pass removes a redundant space directly before closing
 *     punctuation (, . ; : ! ? ) ” ’) left over once a tag is excluded/
 *     unwrapped at that exact point (e.g. "Halicarnassus , so" - never
 *     legitimate English typesetting) - 781 occurrences, no word touched;
 *     see fixTagBoundaryPunctuationSpacing() below.
 *
 * The Greek and English editions are parsed completely independently (this
 * importer never reads the Greek file or the Greek importer's output); both
 * witnesses agree exactly, book for book and chapter for chapter, including
 * every one of the 45 letter-suffixed chapter numbers.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/herodotus-histories-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0016.tlg001.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'herodotus-histories-en');

const WORK_ID = 'herodotus-histories-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0016/tlg001/tlg0016.tlg001.perseus-eng2.xml';

/** This source's own chapter counts per book (I..IX), cross-checked against the real parsed counts, never forced. Identical list to the Greek importer's (kept as a separate literal here so the two importers stay fully independent). */
const EXPECTED_CHAPTER_COUNTS = [216, 188, 160, 205, 133, 144, 257, 151, 124];
const EXPECTED_BOOKS = 9;

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

/**
 * A single space directly before a closing punctuation mark (, . ; : ! ? )
 * " ' ) is NEVER legitimate English typesetting - it can only be a
 * tag-boundary artifact: this source's pretty-printed XML puts real
 * whitespace (indentation/line breaks) between a word and a following
 * `<note>`/`<del>`/`<reg>`/`<bibl>`/`<name>` close tag, and when that tag's
 * content is excluded (or is itself immediately followed by punctuation with
 * no source-space at that exact point, e.g. "Halicarnassus</name>, so"), the
 * stray leading space survives collapseWs and lands right before the
 * punctuation (e.g. "Halicarnassus , so"). Confirmed by direct inspection of
 * every instance found (781 total) to be exactly this artifact, never
 * genuine spacing. Removed here as a final cleanup pass, counted in
 * aggregate; the WORDS themselves are never touched, only a redundant space
 * immediately before punctuation.
 */
function fixTagBoundaryPunctuationSpacing(s: string): { text: string; count: number } {
  let count = 0;
  const text = s.replace(/ +([,.;:!?)”’])/g, (_m, p1: string) => {
    count += 1;
    return p1;
  });
  return { text, count };
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
    /<div\b[^>]*subtype="[Bb]ook"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*subtype="section"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<milestone\b[^>]*\/>|<reg\b[^>]*>|<\/reg>|<bibl\b[^>]*>|<\/bibl>|<cit\b[^>]*>|<\/cit>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let regDepth = 0;
  let regBuf = ''; // accumulates the CURRENT <reg>'s own text, so its excluded length can be measured precisely
  let bibDepth = 0;

  let totalChapters = 0;
  let totalNotes = 0;
  let totalMilestones = 0;
  let totalReg = 0;
  let totalRegChars = 0;
  let totalBibl = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalTagBoundarySpacingFixed = 0;
  const letteredChapters: string[] = [];

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
  }

  function closeChapter(): void {
    if (!currentBookDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const passage: Passage = { n: '', text: chapterParagraphs.join('\n\n'), ref: null };
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
      if (regDepth > 0) regBuf += free;
      else if (inP && noteDepth === 0 && bibDepth === 0) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="[Bb]ook"/.test(tok)) {
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
      const { text: cleaned, count: spacingFixed } = fixTagBoundaryPunctuationSpacing(cleanText(pBuf));
      totalTagBoundarySpacingFixed += spacingFixed;
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
    } else if (/^<milestone\b/.test(tok)) {
      totalMilestones += 1;
      // self-closing, no text content - nothing to insert
    } else if (/^<reg\b/.test(tok)) {
      regDepth += 1;
      totalReg += 1;
      regBuf = '';
    } else if (tok === '</reg>') {
      regDepth -= 1;
      totalRegChars += cleanText(regBuf).length;
      regBuf = '';
    } else if (/^<bibl\b/.test(tok)) {
      bibDepth += 1;
      totalBibl += 1;
    } else if (tok === '</bibl>') {
      bibDepth -= 1;
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<name>, <placeName>, <persName>, <date>, <title>, <quote>, <l>,
    // <cit>, and their ilk): no structural action - their content already
    // flows into pBuf via the free-text capture above (suppressed only
    // while inside <note>/<reg>/<bibl>).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (regDepth !== 0) fail(`unbalanced <reg> nesting (final depth ${regDepth})`);
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
  //     occur (matching the Greek sibling exactly): letters inserted AFTER
  //     an existing plain chapter (Book 2: "121".."121F", "122") and letters
  //     standing in for a base number that is NEVER printed plain at all
  //     (Book 8: "139", "140A", "140B", "141" - no bare "140"; the standard
  //     modern division of Hdt. 8.140 into 140.a/140.b). A new chapter is
  //     valid if it continues the same base with the next letter, OR starts
  //     a fresh lettered run at base+1 beginning with "A", OR is a plain
  //     chapter at base+1. -------------------------------------------------
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

  // --- literal angle brackets: this source's own `&lt;...&gt;` editorial
  //     convention (marking a conjectural/uncertain reading), correctly
  //     entity-decoded like every other entity - detect and log every
  //     occurrence rather than assume there is exactly one -----------------
  const literalAngleBracketChapters: string[] = [];
  for (const b of divisions) {
    for (const c of b.children) {
      if (/[<>]/.test(c.passages[0]!.text)) literalAngleBracketChapters.push(c.id);
    }
  }
  if (literalAngleBracketChapters.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note:
        `${literalAngleBracketChapters.length} chapter(s) (${literalAngleBracketChapters.join(', ')}) contain a ` +
        "literal \"<\"/\">\" in the printed reading text - this source's own &lt;...&gt; editorial convention " +
        '(Godley marking a conjectural or uncertain reading, e.g. book-7-ch-76\'s "<Pisidians>" for a corrupted ' +
        'ethnic name), correctly reproduced by entity-decoding like every other entity in this source. Confirmed ' +
        'by direct inspection to be the ONLY use of &lt;/&gt; entities anywhere in this file.',
    });
  }

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / chapter numbering`,
    note: `${letteredChapters.length} chapters across the work carry a single uppercase-letter suffix in this edition's own numbering, matching the Greek sibling exactly (independently confirmed - this importer never reads the Greek file). Full list: ${letteredChapters.join(', ')}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> apparatus elements (Godley's/Perseus's own editorial footnotes) were excluded entirely, tag and content, not counted individually. Every <foreign>, <date> and <bibl> nested inside one of them was dropped along with it.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalReg} <reg> elements totalling ${totalRegChars.toLocaleString('en-US')} characters (whitespace-collapsed) were excluded entirely. The exact element carrying this text is <reg>, always nested one level inside a <name type="place">, e.g. <name type="place"><reg>Bodrum [27.466,37.5] (inhabited place), Mugla Ili, Ege kiyilari, Turkey, Asia</reg> <placeName>Halicarnassus</placeName></name> - so the raw element text at that point genuinely reads "Herodotus of Bodrum [27.466,37.5] (inhabited place), Mugla Ili, Ege kiyilari, Turkey, Asia Halicarnassus" before this exclusion. <reg> is Perseus-added gazetteer enrichment (coordinates + a longer geographic description drawn from the Getty Thesaurus of Geographic Names), never part of Godley's own translated prose. Not one word of Godley's translation is affected: only the genuine display text (the sibling <placeName>, or the bare trailing text when no <placeName> sibling is present) survives in the reading text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalBibl} <bibl> citations (Perseus's own citation apparatus - a Homeric source reference inside <cit>, or a citation inside an already-excluded <note>) were excluded entirely, not part of Godley's translated text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalMilestones} <milestone unit="para"/> markers (self-closing paragraph milestones, no text content) were dropped, not counted individually.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalTagBoundarySpacingFixed} tag-boundary spacing artifact(s) (a redundant space directly before a closing punctuation mark, e.g. "Halicarnassus , so" -> "Halicarnassus, so") were cleaned up - never legitimate English typesetting, always the leftover whitespace from a now-excluded/unwrapped tag boundary in this source's pretty-printed XML. Only the spacing is touched; no word is ever added, removed or changed.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme distinct from its own Book/Chapter numbering (matching the Greek sibling).',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Histories',
    author: 'Herodotus',
    language: 'en',
    translator: 'A. D. Godley',
    edition: 'Herodotus, with an English translation by A. D. Godley, 4 vols. (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., 1920-1925), Loeb Classical Library ("Modernized by Perseus")',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ' +
      'urn:cts:greekLit:tlg0016.tlg001.perseus-eng2), digitising A. D. Godley\'s English translation as printed in ' +
      'the same Loeb Classical Library edition as the Greek sibling (4 vols., 1920-1925), with modernised diction ' +
      'per Perseus\'s own sub-title ("Modernized by Perseus") - citation taken verbatim from this file\'s own ' +
      '<sourceDesc> (the work-level __cts__.xml carries no description); imported by ' +
      'scripts/import-herodotus-histories-en. The raw file is fetched once (cached at ' +
      'scripts/import-herodotus-histories-en/raw/) and bundled with the app; nothing is loaded from the network at ' +
      'runtime.',
    license:
      'Godley\'s translation (from a 1920-1925 Loeb Classical Library edition) is in the public domain. The ' +
      'digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit ' +
      'under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Herodotus\'s Histories - English, trans. Godley',
        paragraphs: [
          'This is the English translation of Herodotus\'s Ἱστορίαι ("Histories" or "Inquiries"), the foundational ' +
            'work of Western historiography, made by A. D. Godley for the Loeb Classical Library (1920-1925) and ' +
            '"modernized by Perseus" (light updating of archaic diction; see "Known gaps & anomalies" below). It ' +
            'stands alongside the Greek text (data/herodotus-histories-grc) already in this library as a facing ' +
            'English rendering.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently ' +
            'corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'A. D. Godley, trans., Herodotus, 4 vols. (Cambridge, MA: Harvard University Press; London: William ' +
            'Heinemann Ltd., 1920-1925), Loeb Classical Library. This translation is in the public domain.',
          'The work is divided into 9 Books and, within each Book, numbered chapters (1578 total, matching the ' +
            'Greek sibling exactly, chapter for chapter, including all 45 of its letter-suffixed chapter numbers).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0016.tlg001.perseus-eng2.xml (CTS ' +
            'urn:cts:greekLit:tlg0016.tlg001.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded ' +
            'from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter <div>s and collects the <p> paragraph(s) within each chapter ' +
            'into that chapter\'s single Passage. Perseus\'s editorial apparatus is excluded entirely: <note> (528 ' +
            'editorial footnotes, dropped with everything nested inside - <foreign>, some <date>/<bibl>) and ' +
            '<bibl> (110 total, a citation of a quoted passage\'s source, e.g. a Homeric citation). The exact ' +
            'element carrying this source\'s gazetteer enrichment is <reg> - always nested one level inside a ' +
            '<name type="place">, alongside a sibling <placeName> (or, when there is no <placeName> sibling, ' +
            'directly followed by bare display text) - e.g. <name type="place"><reg>Bodrum [27.466,37.5] ' +
            '(inhabited place), Mugla Ili, Ege kiyilari, Turkey, Asia</reg> <placeName>Halicarnassus</placeName>' +
            '</name>. Every <reg> element (4305 occurrences, 193,990 characters of whitespace-collapsed text) is ' +
            'excluded entirely, keeping only the genuine display text; not one word of Godley\'s own translated ' +
            'prose is affected. <milestone unit="para"/> (1558, self-closing) is dropped. ' +
            'Purely semantic wrapper tags (<name>, <placeName>, <persName>, <date>, <title>) and quotation/verse ' +
            'wrappers (<cit>, <quote>, <l>) are unwrapped, their text flowing into the surrounding prose ' +
            'unchanged. Entities are decoded and runs of whitespace collapsed; as a final cleanup pass, a ' +
            'redundant space directly before a closing punctuation mark - always a tag-boundary artifact left ' +
            'over from an excluded or unwrapped tag, never legitimate English spacing - is removed (781 ' +
            'occurrences); the words themselves are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly and the ' +
            'Greek sibling\'s. This source carries no finer, page-marker-style citation scheme, so Division.ref ' +
            'and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 9 Books and all 1578 chapters are present and in order, matching the Greek sibling ' +
            'exactly, chapter for chapter, including all 45 of its letter-suffixed chapter numbers (e.g. ' +
            '"121A".."121F" in Book 2) - independently confirmed, since this importer never reads the Greek file ' +
            'or its output.',
          'Perseus editorial apparatus. 528 <note> elements (editorial footnotes, mostly annotating names, dates ' +
            'and textual variants) and 110 <bibl> citations were dropped entirely, not part of Godley\'s ' +
            'translated text.',
          'Gazetteer enrichment. The exact element is <reg>, always nested one level inside a <name ' +
            'type="place"> (e.g. <name type="place"><reg>Bodrum [27.466,37.5] (inhabited place), Mugla Ili, Ege ' +
            'kiyilari, Turkey, Asia</reg> <placeName>Halicarnassus</placeName></name>, so the raw element text ' +
            'reads "Herodotus of Bodrum [27.466,37.5] (inhabited place), Mugla Ili, Ege kiyilari, Turkey, Asia ' +
            'Halicarnassus" before exclusion). 4305 <reg> elements, totalling 193,990 characters of ' +
            'whitespace-collapsed text (Perseus-added geographic coordinates/descriptions drawn from the Getty ' +
            'Thesaurus of Geographic Names, linked-data enrichment rather than translated prose) were excluded ' +
            'entirely, keeping only the genuine place-name text (the sibling <placeName>, or bare trailing text ' +
            'when none exists) actually printed. Not one word of Godley\'s own translated prose is affected by ' +
            'this exclusion.',
          '"Modernized by Perseus." This edition\'s own sub-title states the running English text was lightly ' +
            'updated from Godley\'s original 1920s diction by the Perseus project; the words bundled here are ' +
            'exactly what this source prints, whichever wording that is - no further modernisation was applied by ' +
            'this importer.',
          'A literal "<Pisidians>" in Book 7 chapter 76. This source\'s own &lt;Pisidians&gt; (the ONLY &lt;/&gt; ' +
            'entity pair anywhere in the file, confirmed by direct inspection) is Godley\'s editorial convention ' +
            'marking "Pisidians" as his own conjectural reading for a corrupted or uncertain ethnic name in the ' +
            'underlying Greek - decoded like any other entity, it correctly reproduces those literal angle ' +
            'brackets in the printed translation. Not a leaked tag; see anomalies.json.',
          'Tag-boundary spacing cleanup. This source\'s heavy semantic tagging (<name>/<reg>/<note>, etc.) ' +
            'sometimes leaves a redundant space directly before a closing punctuation mark once the tag is ' +
            'excluded or unwrapped (e.g. "Halicarnassus , so" for what Godley actually printed as "Halicarnassus, ' +
            'so"). 781 such spacing artifacts were cleaned up - never legitimate English typesetting - without ' +
            'touching any word.',
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
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ${totalNotes} <note>  ${totalReg} <reg>  ${totalBibl} <bibl>  ${totalMilestones} <milestone>  ${letteredChapters.length} lettered chapters  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${totalTagBoundarySpacingFixed} spacing fixes  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:herodotus-histories-en` next.\n');
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
