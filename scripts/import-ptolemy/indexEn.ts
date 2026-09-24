/**
 * Ptolemy's Tetrabiblos - J. M. Ashmand's 1822 English translation, via
 * sacred-texts.com. See fetchAshmand.ts/parseAshmand.ts for the fetch/parse
 * mechanics, and workTable.ts's module doc (research entry 3) for why this
 * edition was chosen and verified complete.
 *
 *   npx tsx scripts/import-ptolemy/indexEn.ts
 *
 * Reads scripts/import-ptolemy/raw/ashmand-chapters.json (the 70-chapter
 * slug/title listing, fetched once from sacred-texts.com's own table of
 * contents) and scripts/import-ptolemy/raw/ashmand/<slug>.htm (each
 * chapter's page, fetched once and cached - see fetchAshmand.ts; nothing is
 * re-fetched on a warm cache, which this repo always has since every raw/
 * file is committed). Writes data/ptolemy-tetrabiblos-en/{work,about,
 * anomalies}.json + types.ts.
 *
 * Then run `npx tsx scripts/import-ptolemy/validateEn.ts`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchChapterPage, loadChapterListing } from './fetchAshmand.ts';
import { parseAshmandChapterPage } from './parseAshmand.ts';
import { romanToArabic } from './roman.ts';
import { buildAboutSectionsEn } from './aboutTextEn.ts';
import { PTOLEMY_TYPES_FILE } from './typesTemplate.ts';
import { hasCombining } from './text.ts';
import type { Anomaly, Division, GenericWork, WorkAbout } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');
const WORK_ID = 'ptolemy-tetrabiblos-en';

const BOOK_WORDS: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4 };

function writeJson(dir: string, name: string, data: unknown): void {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`    wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

async function main(): Promise<void> {
  const listing = loadChapterListing(RAW_DIR);
  if (listing.length !== 70) throw new Error(`expected 70 chapters in ashmand-chapters.json, got ${listing.length}`);

  const anomalies: Anomaly[] = [];
  const books: Division[] = [];
  let currentBookNum: number | null = null;
  let currentBookChapters: Division[] = [];
  let currentBookHeading: string | null = null;
  let passageCount = 0;
  let totalChars = 0;
  let footnoteTotal = 0;
  let pageMarkerTotal = 0;
  let continuationTotal = 0;
  let tableTotal = 0;

  function flushBook(): void {
    if (currentBookNum === null) return;
    books.push({
      id: `book-${currentBookNum}`,
      number: String(currentBookNum),
      ref: null,
      sourceHeading: currentBookHeading,
      editorialTitle: null,
      children: currentBookChapters,
      passages: [],
    });
  }

  for (const entry of listing) {
    process.stdout.write(`[${entry.slug}]\n`);
    const html = await fetchChapterPage(RAW_DIR, entry.slug);
    const parsed = parseAshmandChapterPage(html, entry.slug);

    if (parsed.bookHeading) {
      const word = /^BOOK THE\s+(\w+)$/i.exec(parsed.bookHeading)?.[1]?.toUpperCase();
      const bookNum = word ? BOOK_WORDS[word] : undefined;
      if (!bookNum) throw new Error(`${entry.slug}: unrecognised book heading ${JSON.stringify(parsed.bookHeading)}`);
      if (bookNum !== (currentBookNum ?? 0) + 1) throw new Error(`${entry.slug}: expected book ${(currentBookNum ?? 0) + 1}, got ${bookNum} (${parsed.bookHeading})`);
      flushBook();
      currentBookNum = bookNum;
      currentBookHeading = parsed.bookHeading;
      currentBookChapters = [];
    }
    if (currentBookNum === null) throw new Error(`${entry.slug}: no book heading seen yet`);

    const chapterNum = romanToArabic(parsed.chapterRoman);
    const expectedPrefix = `Chapter ${parsed.chapterRoman}.`;
    if (!entry.text.startsWith(expectedPrefix)) {
      throw new Error(`${entry.slug}: TOC text ${JSON.stringify(entry.text)} does not start with ${JSON.stringify(expectedPrefix)}`);
    }

    const text = parsed.paragraphs.join('\n\n');
    passageCount += 1;
    totalChars += text.length;
    footnoteTotal += parsed.footnotes.length;
    pageMarkerTotal += parsed.pageMarkerCount;
    continuationTotal += parsed.continuationCount;
    tableTotal += parsed.tableCount;

    for (const [i, fn] of parsed.footnotes.entries()) {
      anomalies.push({
        where: `${WORK_ID} / book-${currentBookNum}-ch-${chapterNum}`,
        note: `Ashmand's own footnote ${i + 1} excluded entirely (translator/editorial apparatus, not Ptolemy's text): "${fn}"`,
      });
    }
    if (parsed.tableCount > 0) {
      anomalies.push({
        where: `${WORK_ID} / book-${currentBookNum}-ch-${chapterNum}`,
        note: `${parsed.tableCount} data table(s) kept verbatim as row-serialised text (one printed row per line, cells space-joined) - see about.json "How it was imported".`,
      });
    }
    if (parsed.sawTheEnd) {
      anomalies.push({
        where: `${WORK_ID} / book-${currentBookNum}-ch-${chapterNum}`,
        note: 'Printer\'s end-of-treatise colophon ("THE END") excluded from the reading text (furniture, not Ptolemy\'s or Ashmand\'s words).',
      });
    }

    currentBookChapters.push({
      id: `book-${currentBookNum}-ch-${chapterNum}`,
      number: String(chapterNum),
      ref: null,
      sourceHeading: entry.text,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text, ref: null }],
    });
  }
  flushBook();

  if (books.length !== 4) throw new Error(`expected 4 books, got ${books.length}`);
  if (passageCount !== 70) throw new Error(`expected 70 chapters, got ${passageCount}`);

  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note: `${pageMarkerTotal} original-print-page-number marker(s) (e.g. "p. 37") stripped from the reading text (the scanned edition's own pagination, not Ashmand's words); ${continuationTotal} of the paragraphs those page breaks interrupted mid-sentence were rejoined using the source's own explicit "[paragraph continues]" marker (that marker text itself discarded, not counted as separate content).`,
  });

  let nfcMismatch = 0;
  let combiningHits = 0;
  const walk = (ds: Division[]) => {
    for (const d of ds) {
      for (const p of d.passages) {
        if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
        if (hasCombining(p.text)) combiningHits += 1;
      }
      walk(d.children);
    }
  };
  walk(books);
  if (nfcMismatch > 0) throw new Error(`${nfcMismatch} passage(s) are not NFC-normalised`);
  if (combiningHits > 0) anomalies.push({ where: `${WORK_ID} / whole work`, note: `${combiningHits} passage(s) contain a standalone combining diacritic.` });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: books };
  const about: WorkAbout = {
    workId: WORK_ID,
    title: "Ptolemy's Tetrabiblos",
    author: 'Claudius Ptolemy',
    language: 'en',
    translator: 'J. M. Ashmand',
    edition: "Ptolemy's Tetrabiblos, or Quadripartite: being Four Books of the Influence of the Stars (tr. J. M. Ashmand, Davis and Dickson, London, 1822)",
    provenance: 'HTML from sacred-texts.com (https://sacred-texts.com/book/ptolemy-s-tetrabiblos/), fetched once per chapter and cached; imported by scripts/import-ptolemy/indexEn.ts.',
    license: "A 1822 English translation, long in the public domain; sacred-texts.com's own transcription is used here under its ordinary terms for public-domain texts (no additional restriction is claimed over the source translation itself), consistent with how this app already treats other sacred-texts.com/Wikisource public-domain translations.",
    sections: buildAboutSectionsEn({ passageCount, totalChars, footnoteTotal, pageMarkerTotal, continuationTotal, tableTotal }),
  };

  const outDir = join(DATA_ROOT, WORK_ID);
  mkdirSync(outDir, { recursive: true });
  writeJson(outDir, 'work.json', work);
  writeJson(outDir, 'about.json', about);
  writeJson(outDir, 'anomalies.json', anomalies);
  writeFileSync(join(outDir, 'types.ts'), PTOLEMY_TYPES_FILE, 'utf8');
  process.stdout.write(`    wrote types.ts\n`);
  process.stdout.write(`    4 books, 70 chapters, ${passageCount} passages, ${totalChars} chars - footnotes=${footnoteTotal} pageMarkers=${pageMarkerTotal} continuations=${continuationTotal} anomalies=${anomalies.length}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`\nSTOP: ${(err as Error).message}\n${(err as Error).stack}\n`);
  process.exit(1);
});
