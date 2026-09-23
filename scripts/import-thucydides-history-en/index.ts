/**
 * Thucydides, "History of the Peloponnesian War" - English translation
 * (Richard Crawley, trans., London/Toronto: J. M. Dent and Sons Ltd.; New
 * York: E. P. Dutton and Co., 1914; CTS
 * urn:cts:greekLit:tlg0003.tlg001.perseus-eng6). Run-once ingestion
 * pipeline.
 *
 *   npm run import:thucydides-history-en
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-thucydides-history-en/raw/tlg0003.tlg001.perseus-eng6.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository
 * and writes:
 *   data/thucydides-history-en/work.json       - the GenericWork (8 Books,
 *                                                 each a flat list of
 *                                                 Chapter divisions, one
 *                                                 Passage each)
 *   data/thucydides-history-en/about.json      - provenance / licence / prose
 *   data/thucydides-history-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:thucydides-history-en`.
 *
 * Perseus carries THREE English translations of Thucydides: perseus-eng4
 * (Thomas Hobbes, 1843), perseus-eng5 (Benjamin Jowett, 1900) and
 * perseus-eng6 (Richard Crawley, 1914) - this importer uses eng6, Crawley's,
 * the standard public-domain translation, confirmed by direct inspection of
 * this file's own <sourceDesc> ("<editor role=\"translator\">Richard
 * Crawley</editor>", Dent/Dutton 1914). See about.json for the other two.
 *
 * This file's `<text>` element carries a `<front>` before `<body>`:
 *   <front><div type="textpart" subtype="speaker"><list>
 *     <item xml:id="corinthians">Corinthians</item> ... (9 items total:
 *     Corinthians, Corcyreans, Pericles, Athenians, Archidamus,
 *     Sthenelaidas, Pausanias, Themistocles, Xerxes)
 *   </list></div></front>
 * - a dramatis-personae-style index of the `who="..."` values used later by
 *   `<said who="...">` (see below), not running text. Confirmed by direct
 *   inspection to be the ONLY content of `<front>` (713 characters raw) and
 *   to sit entirely OUTSIDE `<body>...</body>`; this importer already only
 *   ever reads between those two tags (see `bodyStart`/`bodyEnd` below), so
 *   this front-matter index is excluded automatically, by construction, not
 *   by any special-case code - noted here and in about.json/anomalies.json
 *   for completeness, not because it required any handling.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML,
 * independently of the Greek witness rather than assumed identical) ---
 * <div type="textpart" subtype="book" n="N"> (8 books) ->
 *   <div type="textpart" subtype="chapter" n="M"> (917 total, plainly
 *     1-based and contiguous within every book, per-book totals I..VIII:
 *     146, 103, 116, 135, 116, 105, 87, 109 - confirmed identical to the
 *     Greek sibling) ->
 *     <div type="textpart" subtype="section" n="K"> (3587 total) ->
 *       <p>...</p> (most sections) or <said>...</said> (a small number, see
 *       below) (3591 <p> total, 104 <said> total)
 *
 * The Melian Dialogue and the Corcyra/Corinth debate (Book 1) render the
 * Greek's dramatic `<sp>/<speaker>` markup as `<said who="...">` wrappers
 * around a speech turn instead. 103 of the 104 `<said>` wrap exactly one
 * `<p>`; the one exception (Book 5 section 86.1) is a bare `<said>` with NO
 * `<p>` child at all - just Crawley's own short framing text directly inside
 * it ("The Melian commissioners answered:-", itself wrapped in
 * `<milestone unit="para"/>` pairs) - confirmed by direct structural
 * inspection (no `<said>` is ever nested inside a `<p>` or inside another
 * `<said>`). Both shapes are handled the same way: the importer captures
 * running text whenever it is inside a `<p>` OR a `<said>` (the union of the
 * two, exactly mirroring this app's established Plato-dialogue
 * <said>-wraps-<p> / <p>-wraps-<said> handling in scripts/import-plato-
 * shared/parse.ts), finalising one paragraph at the outer boundary of
 * whichever is outermost - so the bare-text `<said>` becomes its own short
 * paragraph, joined by "\n\n" with the next.
 *
 * Faithfulness rules:
 *   - verbatim English (Crawley's own translation) reading text only; no
 *     modernising or "improving" his 1914 wording.
 *   - `<note resp="Crawley" anchored="true">...</note>` (2 occurrences,
 *     both short source citations for a quoted Homeric Hymn) is Crawley's
 *     own editorial apparatus, not his translated running text - excluded
 *     entirely, tag and content.
 *   - `<bibl>...</bibl>` (6 occurrences: 1 inside `<cit>`, citing the
 *     Homeric source of a quotation, e.g. "Hom. Il. 2.108"; the other 5
 *     inside the 2 `<note>`s above, already dropped with them) is Perseus's
 *     own citation apparatus, not Crawley's translated text - excluded
 *     entirely wherever it occurs.
 *   - `<milestone unit="para" ed="P"/>` (65, all self-closing) has no
 *     reading-text content - dropped without logging individually.
 *   - `<quote>`/`<l>`/`<cit>` (10/26/1, wrapping quoted verse Crawley
 *     translates) and `<placeName>`/`<persName>` (3257/3) are unwrapped:
 *     their text is genuine translated content, flowing into the
 *     surrounding prose.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving paragraphs (from <p> or
 *     a bare <said>) joined with "\n\n".
 *
 * This source carries no <del>, <add>, <gap>, <choice>/<sic>/<corr>,
 * <foreign>, <emph>, <hi>, <pb>, <name>, <reg>, <date>, <title>, <sp>,
 * <speaker> (confirmed by direct inspection) - nothing else to handle.
 *
 * The Greek and English editions are parsed completely independently (this
 * importer never reads the Greek file or the Greek importer's output); both
 * witnesses agree exactly, book for book and chapter for chapter.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/thucydides-history-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0003.tlg001.perseus-eng6.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'thucydides-history-en');

const WORK_ID = 'thucydides-history-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0003/tlg001/tlg0003.tlg001.perseus-eng6.xml';

/** This source's own chapter counts per book (I..VIII), cross-checked against the real parsed counts, never forced. Identical list to the Greek importer's (kept as a separate literal here so the two importers stay fully independent). */
const EXPECTED_CHAPTER_COUNTS = [146, 103, 116, 135, 116, 105, 87, 109];
const EXPECTED_BOOKS = 8;

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

/**
 * A single space directly before a closing punctuation mark is never
 * legitimate English typesetting - it can only be a tag-boundary artifact
 * left over from this source's pretty-printed XML (real whitespace between a
 * word and a following close tag, surviving collapseWs once that tag's
 * content is excluded/unwrapped right at that point). Matches this app's
 * established handling in scripts/import-herodotus-histories-en/index.ts
 * (see that file's own doc comment for the full explanation); only a
 * redundant space is ever removed, never a word.
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
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*subtype="section"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<said\b[^>]*>|<\/said>|<note\b[^>]*>|<\/note>|<milestone\b[^>]*\/>|<bibl\b[^>]*>|<\/bibl>|<cit\b[^>]*>|<\/cit>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];

  // union depth of <p>/<said> nesting - paragraph accumulation happens
  // whenever paraStack.length > 0 (mirrors scripts/import-plato-shared/
  // parse.ts's handling of the same said-wraps-p / p-wraps-said variance).
  const paraStack: Array<'p' | 'said'> = [];
  let pBuf = '';
  let noteDepth = 0;
  let bibDepth = 0;

  let totalChapters = 0;
  let totalSaid = 0;
  let totalBareSaid = 0;
  let totalNotes = 0;
  let totalMilestones = 0;
  let totalBibl = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalTagBoundarySpacingFixed = 0;

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

  function finalizeParagraph(hadInnerP: boolean): void {
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
      if (!hadInnerP) totalBareSaid += 1;
    }
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  let sawInnerPForCurrentSaid = false;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (paraStack.length > 0 && noteDepth === 0 && bibDepth === 0) pBuf += free;
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
      if (paraStack.length === 0) pBuf = '';
      if (paraStack.length > 0 && paraStack[paraStack.length - 1] === 'said') sawInnerPForCurrentSaid = true;
      paraStack.push('p');
    } else if (tok === '</p>') {
      const popped = paraStack.pop();
      if (popped !== 'p') fail(`</p> closed but top of paragraph stack was "${popped}" (near "${currentChapterId}")`);
      if (paraStack.length === 0) finalizeParagraph(true);
    } else if (/^<said\b/.test(tok)) {
      if (paraStack.length === 0) {
        pBuf = '';
        sawInnerPForCurrentSaid = false;
      }
      paraStack.push('said');
      totalSaid += 1;
    } else if (tok === '</said>') {
      const popped = paraStack.pop();
      if (popped !== 'said') fail(`</said> closed but top of paragraph stack was "${popped}" (near "${currentChapterId}")`);
      if (paraStack.length === 0) finalizeParagraph(sawInnerPForCurrentSaid);
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
      totalNotes += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
    } else if (/^<milestone\b/.test(tok)) {
      totalMilestones += 1;
      // self-closing, no text content - nothing to insert
    } else if (/^<bibl\b/.test(tok)) {
      bibDepth += 1;
      totalBibl += 1;
    } else if (tok === '</bibl>') {
      bibDepth -= 1;
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<placeName>, <persName>, <quote>, <l>, <cit>, and their ilk): no
    // structural action - their content already flows into pBuf via the
    // free-text capture above (suppressed only while inside <note>/<bibl>).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (paraStack.length !== 0) fail(`unbalanced <p>/<said> nesting at end of document (stack: ${paraStack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (bibDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${bibDepth})`);
  if (totalSaid !== 104) fail(`expected exactly 104 <said> elements, found ${totalSaid}`);
  if (totalBareSaid !== 1) fail(`expected exactly 1 bare <said> (no inner <p>), found ${totalBareSaid}`);

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

  // --- every book's chapters are 1-based contiguous - verify honestly ----
  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    b.children.forEach((c, ci) => {
      const want = String(ci + 1);
      if (c.number !== want) {
        fail(`Book ${bookN} chapter at position ${ci} has number ${JSON.stringify(c.number)}, expected "${want}"`);
      }
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

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / front matter`,
    note:
      'This file\'s <text> element carries a <front> before <body>: <front><div type="textpart" ' +
      'subtype="speaker"><list><item xml:id="corinthians">Corinthians</item>...</list></div></front>, a ' +
      '9-item dramatis-personae-style index of the who="..." values used later by <said who="...">' +
      ' (Corinthians, Corcyreans, Pericles, Athenians, Archidamus, Sthenelaidas, Pausanias, Themistocles, ' +
      'Xerxes; 713 raw characters), not running text. Confirmed the ONLY content of <front>. Excluded ' +
      "automatically, by construction: this importer only ever reads between <body> and </body>; no <front> " +
      'content of any kind reaches the parser.',
  });
  anomalies.push({
    where: `${WORK_ID} / dialogue markup`,
    note: `${totalSaid} <said who="..."> speech-turn wrappers (the Melian Dialogue, Book 5, and the Corcyra/Corinth debate, Book 1) were unwrapped like any other structural container. ${totalBareSaid} of them (Book 5 section 86.1) carries bare text directly ("The Melian commissioners answered:-") with no inner <p> at all; captured the same way via this importer's union <p>/<said> depth tracking (mirrors scripts/import-plato-shared/parse.ts's said/label handling).`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note resp="Crawley"> element(s) (Crawley's own short source citations for quoted verse) were excluded entirely, tag and content.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalBibl} <bibl> citation(s) (Perseus's own citation apparatus - a Homeric source reference inside <cit>, or a citation inside an already-excluded <note>) were excluded entirely, not part of Crawley's translated text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalMilestones} <milestone unit="para" ed="P"/> markers (self-closing paragraph milestones, no text content) were dropped, not counted individually.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  if (totalTagBoundarySpacingFixed > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalTagBoundarySpacingFixed} tag-boundary spacing artifact(s) (a redundant space directly before a closing punctuation mark, never legitimate English typesetting) were cleaned up - the leftover whitespace from a now-excluded/unwrapped tag boundary in this source's pretty-printed XML. Only the spacing is touched; no word is ever added, removed or changed.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note:
      'Like the Greek sibling, this translation is unfinished at the very end of Book 8 (Thucydides\'s own ' +
      'narrative breaks off in the middle of 411 BC) - Crawley translates the source\'s final bracketed sentence ' +
      '("[When the winter after this summer is over the twenty-first year of this war will be completed.]") with ' +
      'the same literal square brackets the Greek edition prints. See about.json.',
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme distinct from its own Book/Chapter numbering (matching the Greek sibling).',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'History of the Peloponnesian War',
    author: 'Thucydides',
    language: 'en',
    translator: 'Richard Crawley',
    edition: 'The Peloponnesian War, trans. Richard Crawley (London/Toronto: J. M. Dent and Sons Ltd.; New York: E. P. Dutton and Co., 1914)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ' +
      'urn:cts:greekLit:tlg0003.tlg001.perseus-eng6), digitising Richard Crawley\'s translation "The Peloponnesian ' +
      'War" (London/Toronto: J. M. Dent and Sons Ltd.; New York: E. P. Dutton and Co., 1914) - confirmed to be ' +
      'Crawley\'s translation by direct inspection of this file\'s own <sourceDesc>; imported by ' +
      'scripts/import-thucydides-history-en. The raw file is fetched once (cached at ' +
      'scripts/import-thucydides-history-en/raw/) and bundled with the app; nothing is loaded from the network at ' +
      'runtime.',
    license:
      'Crawley\'s 1914 translation is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Thucydides\'s History of the Peloponnesian War - English, trans. Crawley',
        paragraphs: [
          'This is Richard Crawley\'s English translation of Thucydides\'s history of the war between Athens and ' +
            'Sparta (431-411 BC, the narrative breaking off unfinished), first published in 1874 and revised for ' +
            'this 1914 Dent/Dutton edition - the standard public-domain English Thucydides, still widely read and ' +
            'quoted today (e.g. "The strong do what they can and the weak suffer what they must", from the Melian ' +
            'Dialogue). It stands alongside the Greek text (data/thucydides-history-grc) already in this library ' +
            'as a facing English rendering.',
          'The text here is Crawley\'s translation, verbatim. Nothing is further modernised, paraphrased or ' +
            'silently corrected.',
        ],
      },
      {
        heading: 'Why Crawley, not Hobbes or Jowett',
        paragraphs: [
          'Perseus\'s canonical-greekLit repository carries three complete English translations of Thucydides ' +
            'under this same CTS work (tlg0003.tlg001): perseus-eng4 (Thomas Hobbes, 1843), perseus-eng5 (Benjamin ' +
            'Jowett, 1900), and perseus-eng6 (Richard Crawley, 1914). This import uses eng6, Crawley\'s - the ' +
            'edition specified for this library, confirmed by direct inspection of the file\'s own <sourceDesc> to ' +
            'genuinely be Crawley\'s 1914 Dent/Dutton translation (not Hobbes\'s 1843 or Jowett\'s 1900 versions, ' +
            'which are not bundled here).',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Richard Crawley, trans., The Peloponnesian War (London/Toronto: J. M. Dent and Sons Ltd.; New York: E. ' +
            'P. Dutton and Co., 1914). This translation is in the public domain.',
          'The work is divided into 8 Books and, within each Book, numbered chapters (917 total, matching the ' +
            'Greek sibling exactly, chapter for chapter).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0003.tlg001.perseus-eng6.xml (CTS ' +
            'urn:cts:greekLit:tlg0003.tlg001.perseus-eng6) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded ' +
            'from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This file\'s <text> element opens with a <front> before <body> - <front><div type="textpart" ' +
            'subtype="speaker"><list><item xml:id="...">Name</item>...</list></div></front>, a 9-item ' +
            'dramatis-personae-style index of the who="..." values <said> uses later (Corinthians, Corcyreans, ' +
            'Pericles, Athenians, Archidamus, Sthenelaidas, Pausanias, Themistocles, Xerxes) - which the importer ' +
            'never even sees: it only reads between <body> and </body>, so this front matter is excluded ' +
            'automatically, by construction.',
          'The importer walks the book, chapter and section <div>s and collects each section\'s reading text - ' +
            'ordinarily a single <p>, but in the Melian Dialogue and the Corcyra/Corinth debate a <said who="..."> ' +
            'wrapper instead (103 of 104 wrap a <p>; 1 carries bare text with no <p> at all) - into that chapter\'s ' +
            'single Passage, joined with a blank line. 2 <note resp="Crawley"> elements (short source citations) ' +
            'and 6 <bibl> citations (Perseus\'s own apparatus) are excluded entirely. 65 self-closing <milestone> ' +
            'markers are dropped. Purely semantic wrapper tags (<placeName>, <persName>) and quotation/verse ' +
            'wrappers (<cit>, <quote>, <l>) are unwrapped, their text flowing into the surrounding prose unchanged. ' +
            'Entities are decoded and runs of whitespace collapsed; the words themselves are otherwise untouched.',
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
          'Completeness. All 8 Books and all 917 chapters are present and in order, matching the Greek sibling ' +
            'exactly, chapter for chapter - independently confirmed, since this importer never reads the Greek ' +
            'file or its output.',
          'The History is unfinished. Like the Greek, Crawley\'s translation breaks off abruptly at the end of ' +
            'Book 8 (411 BC); its final sentence is rendered with the same literal square brackets the Greek ' +
            'edition prints around a passage many scholars judge a later, non-Thucydidean addition.',
          'Dialogue markup. The Melian Dialogue and Corcyra/Corinth debate render each speech turn as a <said ' +
            'who="..."> wrapper rather than the Greek\'s <sp>/<speaker> dramatic markup; Crawley\'s own prose ' +
            'already names the speaker in full sentences (e.g. "The Melian commissioners answered:-"), so no ' +
            'label text needed to be synthesised.',
          'Perseus editorial apparatus. 2 <note> elements and 6 <bibl> citations were dropped entirely, not part ' +
            'of Crawley\'s translated text.',
          'Front-matter speaker index. This file\'s <text> carries a <front> before <body> - <front><div ' +
            'type="textpart" subtype="speaker"><list> of 9 <item xml:id="..."> entries (Corinthians, Corcyreans, ' +
            'Pericles, Athenians, Archidamus, Sthenelaidas, Pausanias, Themistocles, Xerxes; 713 raw characters, ' +
            'confirmed the ONLY content of <front>) - a dramatis-personae-style index of the who="..." values ' +
            '<said> uses, not running text. Never reaches the parser: this importer only reads between <body> ' +
            'and </body>.',
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
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ${totalSaid} <said>  ${totalNotes} <note>  ${totalBibl} <bibl>  ${totalMilestones} <milestone>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${totalTagBoundarySpacingFixed} spacing fixes  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:thucydides-history-en` next.\n');
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
