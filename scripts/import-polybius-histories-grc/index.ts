/**
 * Polybius, Histories (Ἱστορίαι) - Greek text (Theodor Büttner-Wobst, ed.,
 * Polybii Historiae, 4 vols., Leipzig: Teubner, 1893-1905; CTS
 * urn:cts:greekLit:tlg0543.tlg001.perseus-grc2). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-polybius-histories-grc/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-polybius-histories-grc/raw/tlg0543.tlg001.perseus-grc2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository and
 * writes:
 *   data/polybius-histories-grc/work.json       - the GenericWork (39 Books,
 *                                                  each a flat list of
 *                                                  Chapter divisions, one
 *                                                  Passage each)
 *   data/polybius-histories-grc/about.json      - provenance / licence / prose
 *   data/polybius-histories-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-polybius-histories-grc/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * Three-level `<div type="textpart" subtype="book" n="N">` (39 books) >
 * `<div type="textpart" subtype="chapter" n="M">` (1310 total) >
 * `<div type="textpart" subtype="section" n="K">` (12153 total) - an extra
 * nesting level, exactly as in this app's de-bello-gallico-la precedent: every
 * `<p>` found anywhere under a chapter div, at any section depth, is read
 * straight through into that chapter's single Passage, in document order,
 * joined with "\n\n".
 *
 * Only Books 1-5 survive complete. Books 6-39 survive only as excerpts and
 * fragments (mostly Byzantine excerpt-collections), so chapter numbering
 * inside them is genuinely non-contiguous: numbers are sometimes skipped
 * outright (Book 33 jumps 1 -> 3, no chapter "2" is printed) and sometimes
 * carry a lettered suffix for inserted material (e.g. Book 12's 4, 4a, 4b,
 * 4c, 4d, 5); a lettered chapter is not always printed after its unlettered
 * neighbour (Book 11 prints "1a" BEFORE "1"). ALL of this is preserved
 * exactly as printed - document order is never resorted, no chapter is
 * renumbered, no gap is filled. See data/polybius-histories-grc/types.ts.
 *
 * Book 17 is a total loss: nothing of Polybius's own text survives. The
 * source represents this with a single `<p>` holding only the editor's own
 * Latin apparatus note, `<note>Nihil huius libri superest.</note>`
 * ("Nothing of this book survives") - discarded here like every other
 * `<note>` (see below), leaving Book 17 with zero Chapters and no reading
 * text. This is a genuine, disclosed fact about the source, not a parsing
 * failure.
 *
 * Faithfulness rules (mirrors scripts/import-de-bello-gallico-la and
 * scripts/import-jewish-antiquities-grc):
 *   - verbatim Greek reading text only; no accent/spelling/wording fixes.
 *   - `<note>...</note>` (7) - editorial apparatus (manuscript/textual notes,
 *     never Polybius's own words) - discarded entirely, tag and content;
 *     every occurrence logged individually.
 *   - `<add>...</add>` (5) - Büttner-Wobst's own editorial supplement filling
 *     a manuscript gap - IS part of what his edition prints as running text,
 *     so unwrapped and kept verbatim, flagged on its Passage; every
 *     occurrence logged individually (mirrors the de-bello-gallico-la <add>
 *     convention).
 *   - `<gap reason="ellipsis" extent="N"?/>` (151, self-closing) - a
 *     manuscript lacuna; kept as nothing extra (this edition prints no
 *     literal dots, i.e. no `rend` attribute is given), logged individually
 *     every time - these are exactly the "fragment gaps" this app's
 *     faithfulness rules call out for individual (not aggregate) logging.
 *   - `<foreign xml:lang="lat">...</foreign>` (104) - unwrapped, text kept:
 *     almost always Büttner-Wobst's own inline bracketed source-citation for
 *     a fragment (e.g. "[Πολύβ. ΙΙΙ, 2, 6]"), genuinely printed inline in the
 *     edition's running text (not `<note>`-wrapped apparatus). Both this and
 *     every `<head>` in this source are transliterated Latin printed with
 *     Greek look-alike letters by Perseus's converter (an encoding quirk of
 *     this digital edition) - kept exactly as the source prints it, not
 *     "corrected" to real Latin script.
 *   - `<head>` - captured as that Division's sourceHeading (Book or Chapter -
 *     see types.ts); most Chapters carry none.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s (read through any
 *     intervening <div subtype="section">) joined with "\n\n".
 *   - A `<p>` found directly under a Book div (not inside any Chapter) is
 *     only ever seen once in this source - Book 17's apparatus-only
 *     paragraph above - and is never treated as reading text.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/polybius-histories-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0543.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'polybius-histories-grc');

const WORK_ID = 'polybius-histories-grc';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0543/tlg001/tlg0543.tlg001.perseus-grc2.xml';

const EXPECTED_BOOKS = 39;
/** This source's own chapter counts per book (I..XXXIX), cross-checked against the real parsed counts, never forced. Book 17 (index 16) is a total loss: 0. */
const EXPECTED_CHAPTER_COUNTS = [
  88, 71, 118, 87, 111, 61, 21, 42, 47, 49, 37, 52, 11, 13, 39, 41, 0, 56, 2, 12, 50, 22, 18, 15, 6, 2, 20, 23, 27, 32,
  33, 16, 20, 14, 6, 17, 1, 22, 8,
];
/** Books known to have ZERO surviving chapters (a total loss) - currently only Book 17. */
const KNOWN_EMPTY_BOOKS = new Set(['17']);
/** Books traditionally regarded as surviving complete (1-5); every other book is excerpted/fragmentary. */
const COMPLETE_BOOKS = new Set(['1', '2', '3', '4', '5']);

/**
 * Why Books 30-39 diverge so sharply between the two editions (e.g. Book 32:
 * 16 chapters here vs. 28 in the English sibling; Book 37: 1 vs. 10; Book
 * 39: 8 vs. 18) - confirmed from each source's own teiHeader publication
 * date and from explicit in-text citations in the English witness, not
 * guessed. Kept as an identical literal in both this file and
 * scripts/import-polybius-histories-en/index.ts, so each importer stays
 * fully independent (per this app's established practice).
 */
const BOOKS_30_39_DIVERGENCE_NOTE =
  'Why Books 30-39 diverge so sharply between the two editions. Shuckburgh’s English translation (Macmillan, ' +
  '1889 - see that source’s own teiHeader) predates this Greek critical edition, Büttner-Wobst’s ' +
  'Teubner text (1893-1905 - see this source’s own teiHeader), by several years, so it cannot have used it. ' +
  'The English witness’s own text confirms it instead follows Otto Hultsch’s earlier Teubner edition ' +
  'throughout the fragmentary books, citing him repeatedly and by name (15 occurrences) - including direct ' +
  'evidence that 19th-century editors disagreed on which BOOK a given late fragment belongs to: one summary is ' +
  'noted there as being "arranged by Hultsch as chs. 1 and 2 of book 22" but appearing "as book 23, chs. 4, 5 in ' +
  'Schweighaeuser’s text" (see the English sibling’s book-22-ch-1). This Greek text makes its own ' +
  'independent editorial decisions about where to place the same excerpted material and never mentions Hultsch ' +
  'at all (confirmed: zero occurrences of "Hultsch" anywhere in this source file). Consequently a Book 30-39 ' +
  'chapter number in one edition does not necessarily correspond to the same number - or even the same Book - in ' +
  'the other; this app reproduces each edition’s own numbering exactly, unchanged, rather than attempting ' +
  'to reconcile them.';

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

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const bodyStart = xml.indexOf('<text');
  const bodyEnd = xml.indexOf('</text>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*subtype="section"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<add\b[^>]*>|<\/add>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'section' | 'other'> = [];
  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let currentChapterDiv: Division | null = null;
  let chapterParagraphs: string[] = [];
  let chapterAnomalyNotes: string[] = [];

  /** the division (Book or Chapter) still waiting to see whether its very next child is a <head> */
  let awaitingHeadDiv: Division | null = null;
  let inHead = false;
  let headBuf = '';

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let noteBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let totalChapters = 0;
  let totalNotes = 0;
  let totalAddSpans = 0;
  let totalGaps = 0;
  let totalForeignSpans = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalStrayBookParagraphs = 0;

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterAnomalyNotes = [];
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
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const text = chapterParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (chapterAnomalyNotes.length > 0) passage.anomaly = chapterAnomalyNotes.join(' ');
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
        else if (inP) {
          pBuf += free;
          if (addDepth > 0) addBuf += free;
        }
      } else {
        noteBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="book"/.test(tok)) {
      stack.push('book');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (!n) fail(`book div with no n= attribute: ${tok}`);
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
    } else if (/subtype="section"/.test(tok)) {
      stack.push('section');
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'chapter') closeChapter();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      // A <p> nested inside a <note> must not touch inP/pBuf: doing so would
      // reset pBuf and silently discard real running text already buffered
      // there before the enclosing <note> opened. Not observed in this Greek
      // source (no <note> here nests a <p>), but guarded defensively to match
      // the English sibling, where it is observed and matters.
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
        // A <p> directly under a Book div, outside any Chapter - only ever seen for
        // Book 17 (entirely lost; its sole <p> holds nothing but a <note> apparatus
        // remark, which is stripped below, leaving nothing here worth keeping anyway).
        if (!KNOWN_EMPTY_BOOKS.has(currentBookNum)) {
          fail(`<p> found directly under book-${currentBookNum}, outside any chapter (unexpected outside Book 17): "${excerpt(cleaned)}"`);
        }
        totalStrayBookParagraphs += 1;
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
      if (noteDepth === 1) noteBuf = '';
    } else if (tok === '</note>') {
      noteDepth = Math.max(0, noteDepth - 1);
      if (noteDepth === 0) {
        totalNotes += 1;
        const where = currentChapterId || `book-${currentBookNum}`;
        anomalies.push({
          where,
          note: `<note> editorial apparatus excluded entirely (tag and content) - not part of Polybius's own text: "${excerpt(noteBuf)}"`,
        });
        noteBuf = '';
      }
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      totalAddSpans += 1;
      const word = excerpt(addBuf);
      const where = currentChapterId || `book-${currentBookNum}`;
      anomalies.push({
        where,
        note: `<add> editorial supplement (Büttner-Wobst's own reconstruction filling a manuscript gap), kept verbatim in the reading text: "${word}"`,
      });
      chapterAnomalyNotes.push(`editorial supplement <add> printed in the edition, kept verbatim: "${word}"`);
      addBuf = '';
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const extentMatch = /extent="([^"]*)"/.exec(tok);
      const where = currentChapterId || `book-${currentBookNum}`;
      const extentNote = extentMatch ? ` (extent="${extentMatch[1]}")` : '';
      anomalies.push({
        where,
        note: `<gap reason="${reasonMatch?.[1] ?? ''}"${extentNote}/> in the source - a manuscript lacuna, printed with no literal rendering in this edition (no "rend" attribute, so no dots are fabricated here).`,
      });
      chapterAnomalyNotes.push(`A manuscript lacuna (<gap reason="${reasonMatch?.[1] ?? ''}"${extentNote}/>) falls within this chapter; nothing is fabricated in its place.`);
    } else if (/^<foreign\b/.test(tok)) {
      totalForeignSpans += 1;
      // unwrapped: no structural action, text flows through pBuf/headBuf via the free-text capture above
    }
    // The final catch-all <[^>]+> (</foreign>, and anything else) handles every
    // other tag generically: no structural action - text already flows into
    // pBuf/headBuf via the free-text capture above (suppressed only while
    // noteDepth>0).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);

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
  if (totalStrayBookParagraphs !== KNOWN_EMPTY_BOOKS.size) {
    fail(`expected exactly ${KNOWN_EMPTY_BOOKS.size} stray book-level <p> (one per entirely-lost book), found ${totalStrayBookParagraphs}`);
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
      'Only Books 1-5 survive complete. Books 6-39 survive only as excerpts and fragments (chiefly the Byzantine ' +
      'excerpt-collections compiled under Constantine VII Porphyrogenitus), so their chapter numbering is ' +
      'genuinely non-contiguous in this edition - numbers are sometimes skipped outright and sometimes carry a ' +
      'lettered suffix for inserted material; a lettered chapter is not always printed after its unlettered ' +
      'neighbour (Book 11 prints "1a" before "1"). All preserved exactly as printed - see about.json.',
  });
  anomalies.push({
    where: 'book-17',
    note:
      'Book 17 does not survive at all - not a single word of Polybius\'s own text. The source represents this ' +
      'with a single paragraph holding only the editor\'s own Latin apparatus note, "Nihil huius libri superest." ' +
      '("Nothing of this book survives"), wrapped in <note> and discarded like every other <note> in this source. ' +
      'book-17 is therefore imported with zero Chapters and no reading text - a genuine fact about the source, not ' +
      'a parsing failure.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> editorial apparatus span(s) were excluded entirely (tag and content) - never part of Polybius's own text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial supplement(s) (Büttner-Wobst's own reconstruction filling a manuscript gap) were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `${totalGaps} <gap reason="ellipsis"/> manuscript lacuna(e) were found across the fragmentary books; each is kept as nothing extra (no literal rendering is given in this edition) and logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note:
      `${totalForeignSpans} <foreign xml:lang="lat"> span(s) were unwrapped with their text kept in place - almost ` +
      'always Büttner-Wobst\'s own inline bracketed source-citation for a fragment (e.g. "[Πολύβ. ΙΙΙ, 2, 6]"), ' +
      'genuinely printed inline in the edition\'s running text. Note that both these and every <head> in this ' +
      'source are Latin words transliterated into look-alike Greek letters by Perseus\'s digitisation process (an ' +
      'encoding quirk of this specific digital edition, confirmed by direct inspection) - kept exactly as the ' +
      'source prints them, not "corrected" to actual Latin script.',
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      'This witness nests an extra <div subtype="section"> level between chapter and paragraph (12153 sections ' +
      'total). Every <p> under a chapter div is read straight through regardless of its section-nesting depth, in ' +
      'document order, into that chapter\'s single Passage - matching this app\'s established de-bello-gallico-la ' +
      'precedent. Section-level citation (the third element of the traditional "book.chapter.section" reference) ' +
      'is therefore not separately preserved as its own Division.',
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme.',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Ἱστορίαι',
    author: 'Polybius',
    language: 'grc',
    editor: 'Theodor Büttner-Wobst',
    edition: 'Polybii Historiae, 4 vols., ed. Theodor Büttner-Wobst (Leipzig: Teubner, 1893-1905)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ' +
      'urn:cts:greekLit:tlg0543.tlg001.perseus-grc2), digitising Theodor Büttner-Wobst\'s Teubner critical edition ' +
      'of Polybius\'s Histories; imported by scripts/import-polybius-histories-grc. The raw file is fetched once ' +
      '(cached at scripts/import-polybius-histories-grc/raw/) and bundled with the app; nothing is loaded from the ' +
      'network at runtime.',
    license:
      "Büttner-Wobst's 1893-1905 critical text is in the public domain. The digital transcription is distributed " +
      'by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: "Polybius's Histories — Greek",
        paragraphs: [
          'The Histories (Ἱστορίαι) of Polybius (c. 200 - c. 118 BC) narrate the rise of Rome to Mediterranean ' +
            'dominance from 264 to 146 BC, written by a Greek statesman and historian who was himself a hostage ' +
            'and later a close associate of Roman leaders - one of the most important surviving sources for the ' +
            'Punic Wars and the Roman conquest of the Hellenistic world.',
          'The text here is the original Greek, verbatim, in Büttner-Wobst\'s critical edition. Nothing is ' +
            'translated, modernised or silently corrected. An English translation (Shuckburgh, 1889) of the same ' +
            'work is bundled separately as polybius-histories-en - see its own about.json, including important ' +
            'disclosures about how it divides the fragmentary books differently from this Greek text.',
        ],
      },
      {
        heading: 'IMPORTANT - this is a LARGE, mostly FRAGMENTARY work',
        paragraphs: [
          'Of the 39 Books, only Books 1-5 survive complete, covering the period down to 216 BC. Books 6-39 ' +
            '(covering 216-146 BC, and Polybius\'s important Book 6 discussion of the Roman constitution and army) ' +
            'survive only in excerpts and fragments, most of them preserved not by continuous manuscript ' +
            'transmission but through later Byzantine excerpt-collections assembled under the 10th-century emperor ' +
            'Constantine VII Porphyrogenitus (the "Excerpta de Legationibus", "Excerpta de Virtutibus et Vitiis", ' +
            'and similar thematic anthologies), supplemented by quotations in other ancient authors.',
          'Book 17 is a TOTAL LOSS: not a single word of it survives. See "Known gaps & anomalies" below.',
          'Because the surviving material for Books 6-39 is excerpted, not continuous, chapter numbering within ' +
            'them is genuinely non-contiguous in this edition: some chapter numbers are skipped outright (e.g. ' +
            'Book 33 jumps directly from chapter 1 to chapter 3 - no chapter 2 is printed), and many carry a ' +
            'lettered suffix (e.g. Book 12\'s chapters 4, 4a, 4b, 4c, 4d, 5) for material inserted between two ' +
            'regularly-numbered chapters. A lettered chapter is not always printed immediately after its ' +
            'unlettered neighbour - Book 11, for instance, prints chapter "1a" BEFORE chapter "1". None of this is ' +
            '"fixed": every chapter id (book-N-ch-M) preserves this edition\'s own printed number and document ' +
            'order exactly.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Theodor Büttner-Wobst, ed., Polybii Historiae, 4 vols. (Leipzig: Teubner, 1893-1905), the standard ' +
            'critical edition of the Greek text. Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0543.tlg001.perseus-grc2.xml (CTS ' +
            'urn:cts:greekLit:tlg0543.tlg001.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-greekLit repository. Fetched once and bundled with the app; nothing is loaded from the ' +
            'network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book, chapter and (extra, uninformative) section <div>s and collects every <p> ' +
            'paragraph found anywhere under each chapter, at any section-nesting depth, in document order, into ' +
            'that chapter\'s single Passage (joined with a blank line when a chapter has more than one paragraph). ' +
            'Büttner-Wobst\'s own <note> apparatus (7 spans - manuscript/textual remarks, never Polybius\'s own ' +
            'words) is excluded entirely. His <add> editorial supplements (5 spans, reconstructing text lost to ' +
            'manuscript damage) are kept verbatim, since they ARE part of what this edition prints as running ' +
            'text. <gap reason="ellipsis"/> markers (151, manuscript lacunae) are kept as nothing extra, since no ' +
            'literal dots are printed in this edition. <foreign xml:lang="lat"> spans (104, mostly this editor\'s ' +
            'own bracketed source-citations for a fragment) are unwrapped with their text kept, since they are ' +
            'genuinely printed inline. Entities are decoded and runs of whitespace collapsed; the words themselves ' +
            'are otherwise untouched.',
          'A curiosity of this specific digital edition: both the <head> rubrics (Büttner-Wobst\'s own Latin ' +
            'editorial labels classifying groups of excerpts by source or subject, e.g. "I. Ex Prooemio", "II. Res ' +
            'Italiae", "VIII. Fragmenta incertae sedis") and the bracketed <foreign> source-citations are Latin ' +
            'words transliterated into look-alike Greek letters by Perseus\'s digitisation process, not genuine ' +
            'Greek. This is kept exactly as the source prints it - it is not "corrected" back to Latin script, ' +
            'since doing so would depart from what this specific digital edition actually contains.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Polybius is traditionally cited by Book, Chapter and Section (e.g. "Plb. 6.11.1"). This schema collapses ' +
            'Chapter and Section into a single Passage per Chapter (matching this app\'s de-bello-gallico-la ' +
            'precedent for an uninformative extra nesting level), so Section-level citation is not separately ' +
            'preserved. Division.ref and Passage.ref are null throughout: this source carries no page-marker or ' +
            'milestone citation scheme this schema could use.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `Completeness. All ${EXPECTED_BOOKS} Books are present. ${totalChapters} Chapters survive across them - ` +
            'see the per-book counts in anomalies.json and the importer\'s own console summary. Only Books 1-5 are ' +
            'textually complete; every other book is excerpted or fragmentary to some degree (see "IMPORTANT" ' +
            'above).',
          'Book 17 is a total loss. The source itself confirms this: its sole content is a paragraph holding only ' +
            'the editor\'s own Latin apparatus remark, "Nihil huius libri superest." ("Nothing of this book ' +
            'survives"), wrapped in <note> and excluded like all other apparatus. book-17 carries zero Chapters and ' +
            'no reading text - not a parsing error, but the honest state of the source.',
          `Editorial apparatus. ${totalNotes} <note> span(s) (manuscript/textual remarks) were excluded entirely; ` +
            `${totalAddSpans} <add> editorial supplement(s) (Büttner-Wobst's own reconstruction of text lost to ` +
            `manuscript damage) were kept verbatim; ${totalGaps} <gap reason="ellipsis"/> manuscript lacuna(e) were ` +
            'kept as nothing extra. Every occurrence of all three is logged individually in anomalies.json.',
          'Non-contiguous chapter numbering. See "IMPORTANT" above: chapter numbers within the fragmentary books ' +
            '(6-39) are sometimes skipped and sometimes lettered, exactly as this edition prints them, in this ' +
            'edition\'s own document order (not resorted).',
          BOOKS_30_39_DIVERGENCE_NOTE,
          'Transliteration quirk. Both this source\'s <head> rubrics and its bracketed <foreign> source-citations ' +
            'are Latin words rendered in look-alike Greek letters by Perseus\'s digitisation process - kept exactly ' +
            'as printed, not corrected to actual Latin script. See "How it was imported" above.',
          'Extra section nesting. This witness nests an uninformative extra <div subtype="section"> level between ' +
            'chapter and paragraph; it carries no citation information this app\'s schema needs and is read ' +
            'straight through - see "Reference scheme" above.',
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
    const complete = COMPLETE_BOOKS.has(b.number!) ? 'complete' : b.children.length === 0 ? 'TOTAL LOSS' : 'fragmentary';
    process.stdout.write(
      `  Book ${String(b.number).padStart(2)}  ${b.id.padEnd(9)} ${String(b.children.length).padStart(3)} chapters (expected ${String(EXPECTED_CHAPTER_COUNTS[i]).padStart(3)})  [${complete}]\n`,
    );
  });
  process.stdout.write(
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ${totalNotes} <note>  ${totalAddSpans} <add>  ` +
      `${totalGaps} <gap>  ${totalForeignSpans} <foreign>  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-polybius-histories-grc/validate.ts` next.\n');
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
