/**
 * Julius Caesar (Books I-VII) & Aulus Hirtius (Book VIII), The Gallic War -
 * English translation (William Alexander McDevitte and W. S. Bohn, trans.,
 * Caesar's Commentaries on the Gallic and Civil Wars, New York: Harper and
 * Brothers, 1870-1872; CTS urn:cts:latinLit:phi0448.phi001.perseus-eng2).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-bello-gallico-en/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-de-bello-gallico-en/raw/phi0448.phi001.perseus-eng2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/de-bello-gallico-en/work.json       - the GenericWork (8 Books,
 *                                               each a flat list of Chapter
 *                                               divisions, one Passage each)
 *   data/de-bello-gallico-en/about.json      - provenance / licence / prose
 *   data/de-bello-gallico-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-bello-gallico-en/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML,
 * independently of the Latin witness rather than assumed identical) ---
 * Two-level `<div type="textpart" subtype="book" n="N">` (8 books) >
 * `<div type="textpart" subtype="chapter" n="M">` (404 total, ONE <p> each -
 * no extra section-level nesting, unlike the Latin sibling - see
 * data/de-bello-gallico-la/types.ts). Confirmed to agree with the Latin
 * witness exactly, chapter for chapter, including Book 8's first chapter
 * being numbered "0" (Hirtius's prefatory letter to Balbus - direct textual
 * confirmation of the Hirtius/Book 8 authorship split; see about.json), with
 * his narrative chapters then resuming 1..55.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-en):
 *   - verbatim English (McDevitte/Bohn's own translation) reading text only;
 *     no modernising or "improving" their 1870s wording.
 *   - `<note resp="perseus">...</note>` (1 occurrence) is a Perseus-added
 *     editorial gloss recording a textual variant ("Both LX and XL are
 *     attested...") - NOT part of the translated running text - excluded
 *     entirely, tag and content, per this app's established apparatus
 *     convention.
 *   - `<name>`, `<placeName>`, `<date>` (semantic tagging of persons, places
 *     and an inline bracketed year) and the rare `<list>`/`<label>`/<item>`
 *     (a tabular census figure Caesar reports for the Helvetii, Book 1
 *     chapter 29) are unwrapped: their text is genuine translated content.
 *     This flat-text schema has no table representation, so the list is
 *     linearised - its label/item text simply flows into the surrounding
 *     prose in document order, with no punctuation invented beyond the
 *     source's own whitespace; logged as an anomaly (not a defect, just a
 *     disclosed simplification).
 *   - this witness carries no `<del>`/`<add>`/`<gap>`/`<sic>`/`<head>`
 *     (confirmed by direct inspection) - nothing else needs special handling.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving <p>s joined with "\n\n"
 *     (routine here, since every chapter in this witness holds exactly one
 *     <p>).
 *
 * The Latin and English editions are parsed completely independently (this
 * importer never reads the Latin file or the Latin importer's output); any
 * real chapter-count mismatch would be logged to anomalies.json, not
 * silently reconciled - in fact both witnesses agree exactly, book for book
 * and chapter for chapter, including the shared "0"-numbered Book 8 preface.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-bello-gallico-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0448.phi001.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-bello-gallico-en');

const WORK_ID = 'de-bello-gallico-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0448/phi001/phi0448.phi001.perseus-eng2.xml';

/** This source's own chapter counts per book (I..VIII), cross-checked against the real parsed counts, never forced. Identical list to the Latin importer's (kept as a separate literal here so the two importers stay fully independent). */
const EXPECTED_CHAPTER_COUNTS = [54, 35, 29, 38, 58, 44, 90, 56];

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

  const tokenRe =
    /<div\b[^>]*subtype="book"[^>]*>|<div\b[^>]*subtype="chapter"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<list\b[^>]*>|<[^>]+>/g;

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
  let noteDepth = 0;

  let totalChapters = 0;
  let totalNotes = 0;
  let totalLists = 0;
  let totalEmptyParagraphsDropped = 0;

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
      if (inP && noteDepth === 0) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/subtype="book"/.test(tok)) {
      stack.push('book');
      const n = /\sn="([^"]+)"/.exec(tok)?.[1];
      if (!n) fail(`book div with no n= attribute: ${tok}`);
      currentBookNum = Number(n);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 8) {
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
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<list\b/.test(tok)) {
      totalLists += 1;
      anomalies.push({
        where: currentChapterId || `book-${currentBookNum}`,
        note:
          'A <list> of tabular census figures (the Helvetii and their allies\' population counts) is linearised ' +
          'into the surrounding prose, since this flat-text schema has no table representation; label/item text ' +
          'flows in document order with no punctuation invented beyond the source\'s own whitespace.',
      });
    }
    // The final catch-all <[^>]+> handles every other tag generically
    // (<name>, <placeName>, <date>, <label>, <item>, </list>, and their
    // ilk): no structural action - their content already flows into pBuf
    // via the free-text capture above (suppressed only while noteDepth>0).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 8) fail(`expected exactly 8 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);

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

  // --- Book 8's chapter numbering starts at "0" (Hirtius's preface); every
  //     other book is 1-based contiguous - verify honestly, never force ----
  divisions.forEach((b, bi) => {
    const bookN = bi + 1;
    const startsAt = bookN === 8 ? 0 : 1;
    b.children.forEach((c, ci) => {
      const want = String(startsAt + ci);
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
    where: `${WORK_ID} / authorship`,
    note:
      'Book 8 translates Aulus Hirtius\'s continuation, not Caesar\'s own words (his narrative ends after Book ' +
      '7). Confirmed directly in this witness too: Book 8\'s first chapter, uniquely numbered "0", is Hirtius\'s ' +
      'own prefatory letter to Balbus ("Prevailed on by your continued solicitations, Balbus, I have engaged in ' +
      'a most difficult task..."). See about.json for the full disclosure.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note resp="perseus"> editorial gloss(es) (a Perseus-added textual-variant note, not part of the translated running text) were excluded entirely, tag and content.`,
  });
  if (totalLists > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalLists} <list> element(s) (tabular census figures) were linearised into the surrounding prose; every occurrence is logged individually above.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note:
      'Unlike the Latin sibling (Holmes 1914), this witness reads as a complete, uninterrupted sentence at the ' +
      'very end of Book 8, with no marked gap - McDevitte/Bohn\'s 1870s translation appears to follow a Latin ' +
      'base text (or editorial supplement) that continues past the point where Holmes\'s later OCT-style edition ' +
      'marks a manuscript lacuna. This is a genuine difference between the two editions\' underlying Latin texts, ' +
      'not a translation of Holmes\'s <add>/<gap> apparatus (which of course this 19th-century translation could ' +
      'not have used). See about.json.',
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: 'Division.ref and Passage.ref are null throughout: this source carries no page-marker or milestone citation scheme. Citation here is by Book and Chapter number alone, matching this edition\'s own numbering exactly (and the Latin sibling\'s).',
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Gallic War',
    author: 'Julius Caesar (Books 1-7); Aulus Hirtius (Book 8)',
    language: 'en',
    translator: 'William Alexander McDevitte and W. S. Bohn',
    edition: "Caesar's Commentaries on the Gallic and Civil Wars (New York: Harper and Brothers, 1870-1872)",
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0448.phi001.perseus-eng2), digitising William Alexander McDevitte and W. S. Bohn\'s ' +
      'translation "Caesar\'s Commentaries" (New York: Harper and Brothers, 1870-1872, Harper\'s New Classical ' +
      'Library); imported by scripts/import-de-bello-gallico-en. The raw file is fetched once (cached at ' +
      'scripts/import-de-bello-gallico-en/raw/) and bundled with the app; nothing is loaded from the network at ' +
      'runtime.',
    license:
      'McDevitte and Bohn\'s 1870s translation is in the public domain (published well over 95 years ago). The ' +
      'digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit ' +
      'under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Caesar\'s (and Hirtius\'s) Gallic War — English, trans. McDevitte & Bohn',
        paragraphs: [
          'This is the English translation of De Bello Gallico ("The Gallic War"), Julius Caesar\'s own ' +
            'first-person account of his campaigns in Gaul, 58-52 BC, in seven books, made by William Alexander ' +
            'McDevitte and W. S. Bohn and first published by Harper and Brothers in the early 1870s. It stands ' +
            'alongside the Latin text (Holmes 1914) already in this library as a facing English rendering.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently ' +
            'corrected.',
        ],
      },
      {
        heading: 'IMPORTANT - authorship of Book 8',
        paragraphs: [
          'Book 8 of The Gallic War was NOT written by Julius Caesar. Caesar\'s own narrative ends after Book 7 ' +
            '(his last campaigning season, 52 BC). Book 8 was written after Caesar\'s assassination by his ' +
            'officer Aulus Hirtius, continuing the history through 50 BC - universally acknowledged by every ' +
            'edition. This translation confirms it directly: Book 8 opens with Hirtius\'s own prefatory letter to ' +
            'Balbus (captured here as chapter "0" of Book 8, preceding his numbered narrative), candidly ' +
            'explaining that he has undertaken to continue Caesar\'s unfinished Commentaries.',
          'Book 8 is included here, faithfully translated, as it has traditionally been transmitted alongside ' +
            'Books 1-7 as part of the complete Commentaries - but it is Hirtius\'s continuation, not Caesar\'s own ' +
            'words, and readers should not mistake it for such.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Alexander McDevitte and W. S. Bohn, trans., Caesar\'s Commentaries on the Gallic and Civil ' +
            'Wars (New York: Harper and Brothers, 1870-1872; Harper\'s New Classical Library). This translation ' +
            'is in the public domain.',
          'The work is divided into 8 Books and, within each Book, numbered chapters (404 total, matching the ' +
            'Latin sibling exactly, chapter for chapter, including Book 8\'s "0"-numbered first chapter).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0448.phi001.perseus-eng2.xml (CTS ' +
            'urn:cts:latinLit:phi0448.phi001.perseus-eng2) from the Perseus Digital Library / ' +
            'OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter <div>s and collects the single <p> paragraph within each ' +
            'chapter into that chapter\'s single Passage. Only transport scaffolding is removed: a single Perseus ' +
            'editorial gloss (<note resp="perseus">, recording a textual variant - "Both LX and XL are attested" ' +
            '- not part of the translated running text) is dropped entirely; purely semantic wrapper tags ' +
            '(<name>, <placeName>, <date>) are unwrapped, their text flowing into the surrounding prose; and one ' +
            'tabular <list> (the Helvetii census figures, Book 1 chapter 29) is linearised, since this schema has ' +
            'no table representation. Entities are decoded and runs of whitespace collapsed; the words themselves ' +
            'are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter number, matching this edition\'s own numbering exactly and the ' +
            'Latin sibling\'s. This source carries no finer, page-marker-style citation scheme, so Division.ref ' +
            'and Passage.ref are null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 8 Books and all 404 chapters are present and in order, matching the Latin sibling ' +
            'exactly, chapter for chapter. Unlike the Latin sibling, however, this translation reads as complete ' +
            'at the very end of Book 8, with no marked gap - it appears to follow (or supply) a fuller Latin base ' +
            'text than Holmes\'s later edition, which marks a manuscript lacuna at that point. See anomalies.json.',
          'Authorship of Book 8. See "IMPORTANT - authorship of Book 8" above: Book 8 translates Hirtius\'s ' +
            'continuation, not Caesar\'s own words, confirmed directly by its own prefatory letter to Balbus ' +
            '(captured here as chapter "0").',
          'Perseus editorial gloss. One <note resp="perseus"> - a short note on a textual variant ("forty" vs. ' +
            '"sixty" ships) - is Perseus\'s own added apparatus, not McDevitte/Bohn\'s translated text; dropped ' +
            'entirely rather than shown inline.',
          'Tabular census figures. One <list> (the Helvetii and allied tribes\' population figures, Book 1 ' +
            'chapter 29) is linearised into the surrounding prose text rather than rendered as a table, since ' +
            'this flat-text schema has no table representation.',
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
    process.stdout.write(`  Book ${b.number!.padStart(1)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(2)} chapters  (expected ${EXPECTED_CHAPTER_COUNTS[i]})\n`);
  });
  process.stdout.write(
    `\n  8 books  ${totalChapters} chapters  ${totalChars} chars  ${totalNotes} <note>  ${totalLists} <list>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-bello-gallico-en/validate.ts` next.\n');
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
