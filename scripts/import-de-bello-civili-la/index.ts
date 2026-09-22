/**
 * Julius Caesar, De Bello Civili (The Civil War) - Latin text (Arthur George
 * Peskett, ed., The Civil Wars, London: William Heinemann; New York: G. P.
 * Putnam's Sons, 1914; CTS urn:cts:latinLit:phi0448.phi002.perseus-lat3,
 * witness "lat3"). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-bello-civili-la/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-de-bello-civili-la/raw/phi0448.phi002.perseus-lat3.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/de-bello-civili-la/work.json       - the GenericWork (3 Books,
 *                                              each a flat list of Chapter
 *                                              divisions, one Passage each)
 *   data/de-bello-civili-la/about.json      - provenance / licence / prose
 *   data/de-bello-civili-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-bello-civili-la/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * Two-level `<div type="textpart" subtype="book" n="N">` (3 books) >
 * `<div type="textpart" subtype="chapter" n="M">` (243 total: 87/44/112 -
 * 1-based contiguous in every book, ONE <p> each - no extra section-level
 * nesting, unlike De Bello Gallico's Latin witness). Confirmed to agree with
 * the independently-parsed English sibling exactly, chapter for chapter.
 *
 * Unlike De Bello Gallico, this work is entirely Caesar's own; it is simply
 * unfinished AS A WORK - the narrative stops at the end of chapter 112 (the
 * last chapter of Book 3), immediately after describing the outbreak of the
 * Alexandrian War (including Pothinus's death), with no formal conclusion
 * and no resolution of that war. That final chapter's own text is textually
 * COMPLETE (a full, unbroken sentence - "Haec initia belli Alexandrini
 * fuerunt.") - the "unfinished" quality is that Caesar's account simply
 * ends there, not that the transmitted text is damaged at that point.
 *
 * Separately, and unrelated to that ending, THREE scattered points earlier
 * in Book 3 (chapters 8, 10 and 50) carry a genuine small manuscript
 * lacuna, each printed as a literal " . . ." ellipsis as PLAIN RUNNING TEXT
 * in this witness (not a tagged <gap/> here - contrast the English sibling,
 * which tags two of these same three points, chapters 8 and 50 only, with
 * `<gap rend=". . ." reason="lost"/>`; its chapter 10 reads as a complete
 * sentence in English with no marked gap at all - see about.json). No
 * special-case handling is needed for these in this witness: the plain-text
 * ellipsis simply flows through the ordinary paragraph text.
 *
 * Faithfulness rules (mirrors scripts/import-pro-archia-la):
 *   - verbatim Latin reading text only; no modernising or "correcting"
 *     Peskett's 1914 text.
 *   - `<foreign xml:lang="grc">` (1 occurrence, an untranslated Greek word
 *     Caesar's narrative quotes - "ἄδυτα", the innermost sanctuary the
 *     Greeks call it) is unwrapped, text kept - genuine content, not
 *     apparatus.
 *   - `<q>...</q>` (27 spans, marking direct quoted speech within the
 *     narrative) is unwrapped, text kept.
 *   - `<pb n="p.N"/>` (177 occurrences, a purely typographic page-break
 *     marker between the printed Latin and facing English pages of this
 *     bilingual Loeb edition) is dropped entirely: zero-width transport
 *     scaffolding, never printed content.
 *   - this witness carries no `<note>`/`<del>`/`<add>`/`<gap>`/`<sic>`/
 *     `<head>`/`<milestone>` (confirmed by direct inspection) - nothing else
 *     needs special handling.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its (single) surviving <p> becomes
 *     that Passage's text directly.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-bello-civili-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0448.phi002.perseus-lat3.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-bello-civili-la');

const WORK_ID = 'de-bello-civili-la';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0448/phi002/phi0448.phi002.perseus-lat3.xml';

/** This source's own chapter counts per book (I..III), cross-checked against the real parsed counts, never forced. */
const EXPECTED_CHAPTER_COUNTS = [87, 44, 112];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
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

  const tokenRe = /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<pb\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];

  let inP = false;
  let pBuf = '';

  let totalChapters = 0;
  let totalPageBreaks = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalEllipses = 0;

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
    const text = chapterParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (/\.\s*\.\s*\.\s*$/.test(text)) {
      totalEllipses += 1;
      passage.anomaly =
        'This chapter ends with the source\'s own literal ". . ." - a small manuscript lacuna at this point (unrelated to the work\'s own unfinished ending, which falls at chapter 112). See about.json.';
      anomalies.push({
        where: currentChapterId,
        note: 'Chapter ends with the source\'s own literal ". . ." (plain running text, not a tagged <gap/> in this witness) - a small manuscript lacuna at this point. See about.json.',
      });
    }
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
      if (inP) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="book"/.test(tok)) {
      stack.push('book');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (!n) fail(`book div with no n= attribute: ${tok}`);
      currentBookNum = Number(n);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 3) {
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
      if (!n) fail(`chapter div with no n= attribute: ${tok}`);
      openChapter(n);
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
    } else if (/^<pb\b/.test(tok)) {
      totalPageBreaks += 1;
      // zero-width scaffolding, no text contributed.
    }
    // The final catch-all <[^>]+> handles every other tag generically
    // (<foreign>, <q>, and their ilk): no structural action - their text
    // already flows into pBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 3) fail(`expected exactly 3 Book divisions, got ${divisions.length}`);

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

  // --- chapter numbering is 1-based contiguous in every book -------------
  divisions.forEach((b, bi) => {
    b.children.forEach((c, ci) => {
      const want = String(ci + 1);
      if (c.number !== want) {
        fail(`Book ${bi + 1} chapter at position ${ci} has number ${JSON.stringify(c.number)}, expected "${want}"`);
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
    where: `${WORK_ID} / completeness`,
    note: `${totalEllipses} chapter(s) within Book 3 (chapters 8, 10, 50) end with the source's own literal ". . ." (plain running text) - small manuscript lacunae, scattered through the book and unrelated to the work's own unfinished ending at chapter 112. See about.json.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalPageBreaks} <pb/> page-break markers (this bilingual Loeb edition's facing-page layout) were dropped entirely as zero-width transport scaffolding.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme beyond the dropped <pb/> facing-page markers. Citation here is by Book and Chapter number alone.',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Bello Civili',
    author: 'Julius Caesar',
    language: 'la',
    editor: 'Arthur George Peskett',
    edition: "The Civil Wars, ed. Arthur George Peskett (London: William Heinemann; New York: G. P. Putnam's Sons, 1914)",
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0448.phi002.perseus-lat3, witness "lat3"), digitising Arthur George Peskett\'s Loeb ' +
      'Classical Library edition of De Bello Civili (1914); imported by scripts/import-de-bello-civili-la. The ' +
      'raw file is fetched once (cached at scripts/import-de-bello-civili-la/raw/) and bundled with the app; ' +
      'nothing is loaded from the network at runtime.',
    license:
      'Peskett\'s 1914 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Caesar\'s De Bello Civili',
        paragraphs: [
          'De Bello Civili ("The Civil War", also known as the Commentarii de Bello Civili) is Julius Caesar\'s ' +
            'own first-person account of the civil war against Pompey and the Senate, 49-48 BC, in three books. ' +
            'Unlike De Bello Gallico, it is entirely Caesar\'s own work - but it too is unfinished: the narrative ' +
            'simply stops at the end of Book 3 (chapter 112), immediately after describing the outbreak of the ' +
            '"Alexandrian War", with no formal conclusion and no resolution of that war. That final chapter\'s own ' +
            'text is complete, not textually broken off; Caesar\'s account just ends there. The so-called ' +
            '"Alexandrian War" that follows it in some later manuscript traditions is a separate, disputed ' +
            'continuation not attributed to Caesar and not included here.',
          'The text here is Peskett\'s Latin, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Arthur George Peskett, ed. and trans., The Civil Wars (London: William Heinemann; New York: G. P. ' +
            'Putnam\'s Sons, 1914), a bilingual Loeb Classical Library volume. This importer uses the Perseus ' +
            '"lat3" witness of the Latin text from that volume. This edition is in the public domain.',
          'The work is divided into 3 Books and, within each Book, numbered chapters (243 total: 87 in Book 1, 44 ' +
            'in Book 2, 112 in Book 3), matching the independently-parsed English sibling exactly, chapter for ' +
            'chapter.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0448.phi002.perseus-lat3.xml (CTS ' +
            'urn:cts:latinLit:phi0448.phi002.perseus-lat3) from the Perseus Digital Library / ' +
            'OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter <div>s and collects the single <p> paragraph within each ' +
            'chapter into that chapter\'s single Passage. Only transport scaffolding is removed: the 177 <pb/> ' +
            'page-break markers (this bilingual edition\'s facing-page layout) are dropped entirely; purely ' +
            'typographic/structural wrapper tags (<foreign xml:lang="grc">, wrapping the one untranslated Greek ' +
            'word Caesar quotes, and <q>, marking direct quoted speech) are unwrapped, their text flowing into ' +
            'the surrounding prose. Entities are decoded and runs of whitespace collapsed; the words themselves ' +
            'are otherwise untouched. At three scattered points within Book 3 (chapters 8, 10, 50), the source ' +
            'prints its own small manuscript lacuna as a plain ". . ." in the running text (not a tagged apparatus ' +
            'element in this witness), so it required no special handling - it simply survives as ordinary ' +
            'paragraph text.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly. This ' +
            'source carries no finer, page-marker-style citation scheme (only the dropped facing-page <pb/> ' +
            'markers), so Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books and all 243 chapters of this edition are present and in order, agreeing ' +
            'exactly, chapter for chapter, with the independently-parsed English sibling edition. No paragraph is ' +
            'dropped, merged or reordered except the rare paragraph that cleans to empty text.',
          'The work ends unfinished. Caesar\'s narrative simply stops at the end of Book 3, chapter 112 - a ' +
            'textually complete sentence ("Haec initia belli Alexandrini fuerunt.") immediately after describing ' +
            'the outbreak of the Alexandrian War (including Pothinus\'s death) - with no formal conclusion and no ' +
            'resolution of that war. This is a well-documented fact about the work\'s composition/transmission, ' +
            'not a parsing defect, and is unrelated to the small internal lacunae described next.',
          'Small manuscript lacunae within Book 3. Separately from the ending above, three scattered points ' +
            'earlier in Book 3 (chapters 8, 10, 50) each carry a small manuscript lacuna, printed in this edition ' +
            'as a plain ". . ." in the running text; every occurrence is logged individually in anomalies.json.',
          'Page breaks. 177 <pb/> markers (this bilingual Loeb edition\'s facing Latin/English page layout) carry ' +
            'no textual content and were dropped as scaffolding.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalChars = 0;
  for (const b of divisions) totalChars += b.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);

  process.stdout.write('\nBooks:\n');
  divisions.forEach((b, i) => {
    process.stdout.write(`  Book ${b.number!.padStart(1)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} chapters  (expected ${EXPECTED_CHAPTER_COUNTS[i]})\n`);
  });
  process.stdout.write(
    `\n  3 books  ${totalChapters} chapters  ${totalChars} chars  ${totalPageBreaks} <pb/>  ${totalEllipses} internal-lacuna ellipses  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-bello-civili-la/validate.ts` next.\n');
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
