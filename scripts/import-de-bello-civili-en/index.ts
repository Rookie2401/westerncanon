/**
 * Julius Caesar, The Civil War - English translation (Arthur George Peskett,
 * trans., The Civil Wars, London: William Heinemann; New York: G. P.
 * Putnam's Sons, 1914; CTS urn:cts:latinLit:phi0448.phi002.perseus-eng2).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-bello-civili-en/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-de-bello-civili-en/raw/phi0448.phi002.perseus-eng2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/de-bello-civili-en/work.json       - the GenericWork (3 Books,
 *                                              each a flat list of Chapter
 *                                              divisions, one Passage each)
 *   data/de-bello-civili-en/about.json      - provenance / licence / prose
 *   data/de-bello-civili-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-bello-civili-en/validate.ts`.
 *
 * This is Peskett's OWN translation from the SAME 1914 Loeb volume as the
 * Latin sibling (data/de-bello-civili-la) - a matched pair, unlike De Bello
 * Gallico's two Perseus witnesses (drawn from different editions/decades).
 * The Perseus witness used is "eng2" (Peskett); a second, older witness
 * ("eng3", Duncan 1856) also exists on Perseus but is deliberately NOT used
 * here, per this app's brief, to keep the Latin/English pair matched.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML,
 * independently of the Latin witness rather than assumed identical) ---
 * Two-level `<div type="textpart" subtype="book" n="N">` (3 books) >
 * `<div type="textpart" subtype="chapter" n="M">` (243 total: 87/44/112 -
 * 1-based contiguous in every book, ONE <p> each). Confirmed to agree with
 * the Latin sibling exactly, chapter for chapter.
 *
 * Faithfulness rules (mirrors scripts/import-de-bello-civili-la):
 *   - verbatim English (Peskett's own translation) reading text only; no
 *     modernising or "improving" his 1914 wording.
 *   - `<foreign xml:lang="grc">` (1 occurrence, the same untranslated Greek
 *     word as the Latin sibling - "ἄδυτα") is unwrapped, text kept.
 *   - `<q>...</q>` (40 spans, marking direct quoted speech) is unwrapped,
 *     text kept.
 *   - `<pb n="p.N"/>` (177 occurrences, this bilingual edition's facing-page
 *     marker) is dropped entirely: zero-width transport scaffolding.
 *   - `<gap rend=". . ." reason="lost"/>` (2 occurrences, self-closing,
 *     chapters 8 and 50) mark two small manuscript lacunae scattered within
 *     Book 3 - UNRELATED to the work's own unfinished ending, which falls at
 *     the very last chapter (112) and is textually complete there; kept as
 *     its literal printed rendering (". . .") in the reading text rather
 *     than dropped, matching this app's established <gap> convention. The
 *     Latin sibling prints the SAME two points as plain, untagged ". . ."
 *     running text (see its own module doc) - not a real content
 *     discrepancy, just a different TEI encoding choice between the two
 *     witnesses of the same 1914 edition. The Latin sibling additionally
 *     prints a THIRD such lacuna, at chapter 10, that this English witness
 *     does NOT mark at all - that chapter reads as a complete sentence here.
 *   - this witness carries no `<note>`/`<del>`/`<add>`/`<sic>`/`<head>`/
 *     `<milestone>` (confirmed by direct inspection) - nothing else needs
 *     special handling.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its (single) surviving <p> becomes
 *     that Passage's text directly.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-bello-civili-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0448.phi002.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-bello-civili-en');

const WORK_ID = 'de-bello-civili-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0448/phi002/phi0448.phi002.perseus-eng2.xml';

/** This source's own chapter counts per book (I..III), cross-checked against the real parsed counts, never forced. Identical list to the Latin importer's (kept as a separate literal here so the two importers stay fully independent). */
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

  const tokenRe = /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<pb\b[^>]*\/>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];
  let chapterHasGap = false;

  let inP = false;
  let pBuf = '';

  let totalChapters = 0;
  let totalPageBreaks = 0;
  let totalGaps = 0;
  let totalEmptyParagraphsDropped = 0;

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterHasGap = false;
  }

  function closeChapter(): void {
    if (!currentBookDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const passage: Passage = { n: '', text: chapterParagraphs.join('\n\n'), ref: null };
    if (chapterHasGap) {
      passage.anomaly =
        'This chapter carries a <gap rend=". . ." reason="lost"/> marker - a small manuscript lacuna within Book 3, unrelated to the work\'s own unfinished ending (which falls at chapter 112) - kept as its literal printed ". . ." rather than dropped. See about.json.';
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
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      chapterHasGap = true;
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (inP) pBuf += literal;
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note: `<gap rend="${literal}" reason="${reasonMatch?.[1] ?? ''}"/> in the source - a small manuscript lacuna within Book 3, unrelated to the work's own unfinished ending - kept as its literal printed rendering ("${literal}") in the reading text.`,
      });
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
    note: `${totalGaps} <gap rend=". . ." reason="lost"/> marker(s) (chapters 8 and 50) mark small manuscript lacunae scattered within Book 3, unrelated to the work's own unfinished ending at chapter 112; each is logged individually above. The Latin sibling prints the same two points as plain, untagged ". . ." text - a different TEI encoding choice, not a real content discrepancy - and additionally has a third such lacuna (chapter 10) that this English witness does not mark at all. See about.json.`,
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
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Civil War',
    author: 'Julius Caesar',
    language: 'en',
    translator: 'Arthur George Peskett',
    edition: "The Civil Wars (London: William Heinemann; New York: G. P. Putnam's Sons, 1914)",
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0448.phi002.perseus-eng2), digitising Arthur George Peskett\'s translation "The Civil ' +
      'Wars" (London: William Heinemann; New York: G. P. Putnam\'s Sons, 1914, Loeb Classical Library) - the same ' +
      '1914 volume as the Latin sibling, a matched pair; imported by scripts/import-de-bello-civili-en. The raw ' +
      'file is fetched once (cached at scripts/import-de-bello-civili-en/raw/) and bundled with the app; nothing ' +
      'is loaded from the network at runtime.',
    license:
      'Peskett\'s 1914 translation is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Caesar\'s Civil War — English, trans. Peskett',
        paragraphs: [
          'This is the English translation of De Bello Civili ("The Civil War"), Julius Caesar\'s own first-person ' +
            'account of the civil war against Pompey and the Senate, 49-48 BC, in three books, made by Arthur ' +
            'George Peskett for the same 1914 Loeb Classical Library volume as the Latin text already in this ' +
            'library - a matched Latin/English pair by the same editor-translator.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently ' +
            'corrected. Like the Latin, it is Caesar\'s own unfinished work: the narrative simply stops at the end ' +
            'of Book 3 with no formal conclusion - see "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Arthur George Peskett, trans., The Civil Wars (London: William Heinemann; New York: G. P. Putnam\'s ' +
            'Sons, 1914). This translation is in the public domain. Perseus offers a second, older English ' +
            'witness of this work (William Duncan\'s 1856 translation, "The Commentaries of Caesar", St. Louis: ' +
            'Edwards and Bushnell), but this importer deliberately uses ' +
            'Peskett\'s translation instead, to keep this Latin/English pair matched to the same edition.',
          'The work is divided into 3 Books and, within each Book, numbered chapters (243 total: 87 in Book 1, 44 ' +
            'in Book 2, 112 in Book 3), matching the Latin sibling exactly, chapter for chapter.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0448.phi002.perseus-eng2.xml (CTS ' +
            'urn:cts:latinLit:phi0448.phi002.perseus-eng2) from the Perseus Digital Library / ' +
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
            'the surrounding prose. Two <gap rend=". . ." reason="lost"/> markers, at scattered points within ' +
            'Book 3 (chapters 8 and 50) marking small manuscript lacunae, are kept as their literal printed ' +
            '". . ." rather than dropped. Entities are decoded and runs of whitespace collapsed; the words ' +
            'themselves are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly and the ' +
            'Latin sibling\'s. This source carries no finer, page-marker-style citation scheme (only the dropped ' +
            'facing-page <pb/> markers), so Division.ref and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books and all 243 chapters are present and in order, matching the Latin sibling ' +
            'exactly, chapter for chapter. Like the Latin, this translation ends unfinished: the narrative simply ' +
            'stops at the end of Book 3, chapter 112 - a textually complete sentence, immediately after ' +
            'describing the outbreak of the Alexandrian War (including Pothinus\'s death) - with no formal ' +
            'conclusion and no resolution of that war.',
          'Small manuscript lacunae within Book 3. Separately from that ending, two scattered points earlier in ' +
            'Book 3 (chapters 8 and 50) are marked with <gap rend=". . ." reason="lost"/>, kept as their literal ' +
            '". . ." in the reading text; every occurrence is logged individually in anomalies.json.',
          'Encoding difference from the Latin sibling. The Latin witness prints these same two lacunae as plain, ' +
            'untagged ". . ." running text rather than a tagged <gap/> element - a different TEI encoding choice ' +
            'within the same 1914 edition, not a real difference in content. The Latin sibling additionally has a ' +
            'THIRD such lacuna, at chapter 10, that this English witness does not mark at all - that chapter reads ' +
            'as a complete sentence here.',
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
    `\n  3 books  ${totalChapters} chapters  ${totalChars} chars  ${totalPageBreaks} <pb/>  ${totalGaps} <gap>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-bello-civili-en/validate.ts` next.\n');
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
