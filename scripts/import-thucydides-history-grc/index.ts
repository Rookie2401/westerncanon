/**
 * Thucydides, Ἱστορίαι ("Historiae" / History of the Peloponnesian War) -
 * Greek text (Henry Stuart Jones, ed., Thucydidis Historiae, Oxford: Oxford
 * University Press, 1910, reprinted 1942; CTS
 * urn:cts:greekLit:tlg0003.tlg001.perseus-grc2). Run-once ingestion
 * pipeline.
 *
 *   npm run import:thucydides-history-grc
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-thucydides-history-grc/raw/tlg0003.tlg001.perseus-grc2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository
 * and writes:
 *   data/thucydides-history-grc/work.json       - the GenericWork (8 Books,
 *                                                  each a flat list of
 *                                                  Chapter divisions, one
 *                                                  Passage each)
 *   data/thucydides-history-grc/about.json      - provenance / licence / prose
 *   data/thucydides-history-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:thucydides-history-grc`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * <div type="textpart" subtype="book" n="N"> (8 books) ->
 *   <div type="textpart" subtype="chapter" n="M"> (917 total, plainly
 *     1-based and contiguous within every book - NO letter-suffixed
 *     chapters, unlike Herodotus - per-book totals I..VIII: 146, 103, 116,
 *     135, 116, 105, 87, 109) ->
 *     <div type="textpart" subtype="section" n="K"> (3587 total) ->
 *       <p>...</p> (3588 total)
 * Per this app's established Meditations/Nicomachean-Ethics precedent, the
 * "section" level carries no citation information this schema needs (this
 * edition's citation unit is Book.Chapter) - EVERY <p> found anywhere under
 * a chapter div is collected, in document order, into that chapter's ONE
 * Passage, joined with "\n\n".
 *
 * The Melian Dialogue (Book 5, chapters 87-111 in this edition) is written
 * in dramatic form: 34 `<sp><speaker>ΑΘ.</speaker><p>...</p></sp>` turns
 * (ΑΘ. = "the Athenians", ΜΗΛ. = "the Melians"), each exactly one <speaker>
 * label followed by exactly one <p> (confirmed by direct inspection - no
 * irregular <sp> anywhere). The <speaker> label sits OUTSIDE the <p>, but is
 * genuine reading text this edition prints immediately before the turn's
 * speech - so it is captured and PREPENDED, verbatim + a single space, to
 * that <p>'s cleaned text (e.g. "ΑΘ. εἰ μὲν τοίνυν ..."), mirroring this
 * app's established Plato-dialogue `<label>` convention (the speaker prefix
 * is part of the printed reading text, not apparatus to strip). Every
 * affected chapter's Passage is flagged via `anomaly`.
 *
 * Faithfulness rules:
 *   - verbatim Greek reading text only; no accent/spelling/wording fixes.
 *   - `<bibl>...</bibl>` (1 occurrence, citing "Hom. Il. 2.108", the source
 *     of a Homeric line Thucydides quotes at 1.9.4) is Perseus's own added
 *     citation, not part of Thucydides's own text - excluded entirely,
 *     matching this app's established <bibl> convention.
 *   - `<quote>`/`<l>` (7/23, wrapping quoted verse - Homer, an epigram, two
 *     oracles) are unwrapped: their text is genuine quoted content and
 *     flows into the surrounding paragraph.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s (across however
 *     many <section> divs, and across a Melian-Dialogue <sp> when present)
 *     joined with "\n\n".
 *
 * This source carries no <note>, <del>, <add>, <gap>, <choice>/<sic>/
 * <corr>, <foreign>, <emph>, <hi>, <milestone>, <pb>, <name>, <placeName>,
 * <date>, <title>, <cit> (confirmed by direct inspection) - nothing else to
 * handle. The work's own final sentence, Book 8 chapter 109 section 2, is
 * printed inside literal square brackets in this edition ("[ὅταν ὁ μετὰ
 * τοῦτο τὸ θέρος χειμὼν τελευτήσῃ, ...]") - not TEI markup, just ordinary
 * characters Jones's edition prints, flagging a passage many scholars judge
 * a later, non-Thucydidean chronological note; kept verbatim, brackets and
 * all, like any other printed character. See about.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/thucydides-history-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'tlg0003.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'thucydides-history-grc');

const WORK_ID = 'thucydides-history-grc';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0003/tlg001/tlg0003.tlg001.perseus-grc2.xml';

/** This source's own chapter counts per book (I..VIII), cross-checked against the real parsed counts, never forced. */
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

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*subtype="section"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<sp\b[^>]*>|<\/sp>|<speaker\b[^>]*>|<\/speaker>|<bibl\b[^>]*>|<\/bibl>|<[^>]+>/g;

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
  let inSpeaker = false;
  let speakerBuf = '';
  let pendingLabel: string | null = null;
  let bibDepth = 0;

  let totalChapters = 0;
  let totalSpeakerTurns = 0;
  let totalBibl = 0;
  let totalEmptyParagraphsDropped = 0;
  const dialogueChapters: string[] = [];

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
      if (inSpeaker) {
        speakerBuf += free;
      } else if (inP && bibDepth === 0) {
        pBuf += free;
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
      let cleaned = cleanText(pBuf);
      if (pendingLabel !== null) {
        cleaned = cleaned.length > 0 ? `${pendingLabel} ${cleaned}` : pendingLabel;
        chapterAnomalyNotes.push(
          `This turn's text is prefixed with the source's own dialogue speaker label ("${pendingLabel}") - part of the printed reading text (Melian Dialogue), not apparatus.`,
        );
        if (!dialogueChapters.includes(currentChapterId)) dialogueChapters.push(currentChapterId);
        pendingLabel = null;
      }
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({
          where: currentChapterId || `book-${currentBookNum}`,
          note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
        });
      } else {
        chapterParagraphs.push(cleaned);
      }
    } else if (/^<sp\b/.test(tok) || tok === '</sp>') {
      // structural wrapper only - no state change beyond its children (speaker, p)
    } else if (/^<speaker\b/.test(tok)) {
      inSpeaker = true;
      speakerBuf = '';
    } else if (tok === '</speaker>') {
      inSpeaker = false;
      pendingLabel = cleanText(speakerBuf);
      totalSpeakerTurns += 1;
      speakerBuf = '';
    } else if (/^<bibl\b/.test(tok)) {
      bibDepth += 1;
    } else if (tok === '</bibl>') {
      bibDepth -= 1;
      totalBibl += 1;
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<quote>, <l>, and their ilk): no structural action needed - their
    // content already flows into pBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} Book divisions, got ${divisions.length}`);
  if (inSpeaker) fail('unbalanced <speaker> nesting at end of document');
  if (bibDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${bibDepth})`);
  if (pendingLabel !== null) fail(`a <speaker> label ("${pendingLabel}") was never consumed by a following <p>`);
  if (totalSpeakerTurns !== 34) fail(`expected exactly 34 <speaker> turns (the Melian Dialogue), found ${totalSpeakerTurns}`);

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

  // --- a couple of chapters carry a lone space directly before an ellipsis
  //     of dots - NOT touched (matching the Greek Herodotus importer's same
  //     documented decision): each turned out to abut a passage where the
  //     source itself prints "..." with surrounding spaces, not a tag-
  //     boundary artifact from this importer's own exclusions (this witness
  //     excludes nothing but <bibl>, and neither occurrence sits next to
  //     one) - left verbatim rather than mechanically "corrected". --------
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
        `${spaceBeforePunctChapters.length} chapter(s) contain a lone space directly before punctuation ` +
        'somewhere in their text. Left untouched (matching the Greek Herodotus importer\'s same documented ' +
        'decision): confirmed by direct inspection to already be present in the source\'s own plain text at that ' +
        'exact point, not a byproduct of this importer\'s tag handling. Affected chapters: ' +
        `${spaceBeforePunctChapters.join(', ')}.`,
    });
  }

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / Melian Dialogue`,
    note: `${totalSpeakerTurns} <sp><speaker>.../<speaker><p>...</p></sp> dialogue turns (Book 5, the Melian Dialogue, chapters 87-111) each have their source-printed speaker label ("ΑΘ." = the Athenians, "ΜΗΛ." = the Melians) prepended to that turn's paragraph text, matching this edition's own printed layout. Affected chapters: ${dialogueChapters.join(', ')}.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalBibl} <bibl> citation(s) (Perseus's own citation of the Homeric source of a quotation Thucydides makes, "Hom. Il. 2.108") were excluded entirely, not part of Thucydides's own text.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note:
      'The work\'s own final sentence, Book 8 chapter 109 section 2, is printed inside literal square brackets in ' +
      'this edition ("[ὅταν ὁ μετὰ τοῦτο τὸ θέρος χειμὼν τελευτήσῃ, ἓν καὶ εἰκοστὸν ἔτος πληροῦται.]") - ordinary ' +
      'printed characters (not TEI markup), flagging a passage many scholars judge a later, non-Thucydidean ' +
      'chronological note appended after the History breaks off unfinished at the end of 411 BC. Kept verbatim, ' +
      'brackets and all, like any other printed character. See about.json.',
  });
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
    author: 'Thucydides',
    language: 'grc',
    editor: 'Henry Stuart Jones',
    edition: 'Historiae, ed. Henry Stuart Jones, 2 vols. (Oxford: Oxford University Press, 1910; reprinted 1942) - title, editor, imprint and volume count taken verbatim from this file\'s own <sourceDesc>',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ' +
      'urn:cts:greekLit:tlg0003.tlg001.perseus-grc2), digitising the Greek text as printed in Henry Stuart Jones, ' +
      'ed., Thucydidis Historiae (Oxford: Oxford University Press, 1910, reprinted 1942) - citation taken verbatim ' +
      'from this file\'s own <sourceDesc> (the work-level __cts__.xml carries no description); imported by ' +
      'scripts/import-thucydides-history-grc. The raw file is fetched once (cached at ' +
      'scripts/import-thucydides-history-grc/raw/) and bundled with the app; nothing is loaded from the network at ' +
      'runtime.',
    license:
      'Jones\'s 1910 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Thucydides\'s History of the Peloponnesian War - Greek',
        paragraphs: [
          'This is the Greek text of Thucydides\'s Ἱστορίαι, his history of the war between Athens and Sparta ' +
            '(431-411 BC, the narrative breaking off unfinished), in eight Books - a foundational work of critical ' +
            'historiography and political thought, including the Funeral Oration of Pericles (Book 2) and the ' +
            'Melian Dialogue (Book 5).',
          'The text here is Jones\'s Greek, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Henry Stuart Jones, ed., Thucydidis Historiae, 2 vols. (Oxford: Oxford University Press, 1910; ' +
            'reprinted 1942), an Oxford Classical Text. This edition is in the public domain.',
          'The work is divided into 8 Books and, within each Book, numbered chapters (917 total, plainly 1-based ' +
            'and contiguous - unlike Herodotus, this edition has no letter-suffixed chapter numbers).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0003.tlg001.perseus-grc2.xml (CTS ' +
            'urn:cts:greekLit:tlg0003.tlg001.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded ' +
            'from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book, chapter and (Perseus/Jones\'s own) section <div>s and collects EVERY <p> ' +
            'paragraph found anywhere under a chapter, in document order, into that chapter\'s single Passage ' +
            '(joined with a blank line when a chapter has more than one). <quote>/<l> (quoted verse) are ' +
            'unwrapped, their text flowing into the surrounding prose. The Melian Dialogue\'s 34 ' +
            '<sp><speaker>.../<speaker><p>...</p></sp> turns have their speaker label ("ΑΘ."/"ΜΗΛ.") prepended to ' +
            'that turn\'s text, matching the edition\'s own printed layout - every affected chapter\'s Passage is ' +
            'flagged. The single <bibl> citation (Perseus\'s own reference for a quoted Homeric line) is dropped. ' +
            'Entities are decoded and runs of whitespace collapsed; the words themselves are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly (the ' +
            'standard scheme used across virtually all editions and translations of Thucydides). This source ' +
            'carries no finer, page-marker-style citation scheme, so Division.ref and Passage.ref are null ' +
            'throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 8 Books and all 917 chapters of this edition are present and in order, agreeing ' +
            'exactly, chapter for chapter, with the independently-parsed English sibling edition.',
          'The History is unfinished. Thucydides\'s narrative breaks off abruptly in the middle of the year 411 ' +
            'BC, at the end of Book 8 - a well-documented fact about the work\'s transmission, not a parsing error. ' +
            'The very last sentence (8.109.2) is printed inside literal square brackets in this edition, flagging ' +
            'a chronological note many scholars judge a later, non-Thucydidean addition; kept verbatim exactly as ' +
            'printed.',
          'Melian Dialogue speaker labels. 34 turns across Book 5 (chapters 87-111) have their source-printed ' +
            'speaker label ("ΑΘ."/"ΜΗΛ.") prepended to the paragraph text, since this edition prints it as part of ' +
            'the running text in dramatic-dialogue form; every affected chapter is flagged via its Passage\'s ' +
            '`anomaly` field and logged in anomalies.json.',
          'One <bibl> citation (Perseus\'s own reference for a quoted Homeric line, "Hom. Il. 2.108") was dropped ' +
            'entirely, not part of Thucydides\'s own text.',
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
    `\n  ${EXPECTED_BOOKS} books  ${totalChapters} chapters  ${totalChars} chars  ${totalSpeakerTurns} dialogue turns  ${totalBibl} <bibl>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:thucydides-history-grc` next.\n');
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
