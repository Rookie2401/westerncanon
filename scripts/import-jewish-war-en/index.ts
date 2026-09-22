/**
 * Flavius Josephus, *The Jewish War* — English translation, William
 * Whiston, "The Wars of the Jews", in The Works of Flavius Josephus (Auburn
 * and Rochester, NY: Alden and Beardsley, 1856 printing; the translation
 * itself was first published 1737), via the Perseus/OpenGreekAndLatin
 * canonical-greekLit TEI. Run-once ingestion pipeline, self-fetching and
 * idempotent.
 *
 *   npx tsx scripts/import-jewish-war-en/index.ts
 *
 * On first run, fetches
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg004/tlg0526.tlg004.perseus-eng2.xml
 * (CTS urn:cts:greekLit:tlg0526.tlg004.perseus-eng2) and caches it verbatim
 * at scripts/import-jewish-war-en/raw/tlg0526.tlg004.perseus-eng2.xml; a
 * later run reuses that cached file and never touches the network again.
 * Writes:
 *   data/jewish-war-en/work.json       - the GenericWork (7 books, 707 sections, two levels deep)
 *   data/jewish-war-en/about.json      - provenance / licence / prose
 *   data/jewish-war-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-jewish-war-en/validate.ts`.
 *
 * TWO-level structure, confirmed by direct inspection of the whole fetched
 * file: a single `<div type="translation" xml:lang="eng">` wrapper holds 7
 * `<div type="textpart" subtype="book" n="N">`, each holding a flat run of
 * `<div type="textpart" subtype="section" n="M">` - NO chapter-level div in
 * between, matching the Greek sibling's own div shape.
 *
 * IMPORTANT edition-granularity divergence from the Greek sibling
 * (data/jewish-war-grc), confirmed by direct inspection: this English
 * witness's own section <div>s do NOT correspond 1:1 with the Greek
 * sibling's own (Niese's) fine-grained sections. Instead, each English
 * section <div> is one of William Whiston's own (coarser) paragraph
 * divisions, and its `n` attribute is the NIESE section number at which
 * that Whiston paragraph BEGINS - not a continuous per-book count. 707
 * sections total (234/143/88/78/65/52/47 per book), each book's own `n`
 * sequence confirmed strictly increasing (with real gaps) rather than
 * 1..count. Division.number is this edition's own printed `n` value exactly
 * as the Greek importer treats its own `n` - the two editions are simply not
 * segmented at the same points; see data/jewish-war-en/types.ts and
 * anomalies.json.
 *
 * Markup handled:
 *   - `<note resp="editor">...</note>` (195) is the Perseus/Whiston-edition
 *     editorial footnote apparatus - excluded entirely, tag and content,
 *     wherever it occurs (including the 1 confirmed occurrence nested
 *     directly inside a `<head>` rubric, e.g. Book I's "HOW EURYCLES..."
 *     chapter title); summarised once, not logged individually given their
 *     number. Notes never nest here (confirmed, max depth 1) and never
 *     contain a `<div>`/`<p>`/`<head>` of their own.
 *   - Each Book prints one `<head rend="align(center)">` rubric (its title,
 *     with an inline `<lb/>` line break unwrapped to a space) - captured
 *     verbatim as that Book's Division.sourceHeading. Each Whiston CHAPTER
 *     (as opposed to section) additionally opens with a `<head
 *     rend="align(center)">` rubric on its first SECTION only (Whiston's own
 *     descriptive chapter title, e.g. "HOW THE CITY JERUSALEM WAS TAKEN...",
 *     or "PREFACE" for Book I's own opening section) - captured as that
 *     Section's own Division.sourceHeading; every other Section's
 *     sourceHeading is null. This app's schema has no chapter level for this
 *     work (see the module doc on data/jewish-war-en/types.ts), so a
 *     Whiston chapter's rubric surfaces on its first Section rather than on
 *     a separate Chapter division - a deliberate mapping, not a loss of
 *     information (the rubric text itself is preserved verbatim either way).
 *   - `<q rend="...">...</q>` (228 - mostly rend="double", 1 rend="single",
 *     1 rend="double; merge") is typographic quotation-mark markup -
 *     unwrapped, no content decision, same treatment as the Greek sibling.
 *   - `<foreign xml:lang="lat">` (2, both "depositum" - a Latin legal term
 *     Whiston leaves untranslated inline), `<placeName key="...">` (163,
 *     Perseus's own semantic tagging of place names) and `<term>` (3) are
 *     unwrapped typographic/semantic markup - no content decision.
 *   - `<lb/>` (7, self-closing line breaks, all inside Book `<head>`
 *     rubrics) contributes no text of its own; the surrounding whitespace
 *     already present in the source collapses naturally via cleanText.
 *   - `<date when="...">` (11) occurs only inside `<note>` apparatus in this
 *     source (confirmed by direct inspection) and is therefore always
 *     discarded along with its enclosing note; asserted below and fails
 *     loudly if a `<date>` is ever found outside a note.
 *   - `<milestone unit="Whiston_chapter"/>` (111) and `<milestone
 *     unit="Whiston_section"/>` (707) are the same cross-reference markers
 *     as the Greek sibling (independently confirmed identical counts) -
 *     dropped as scaffolding without affecting the reading text or any
 *     Division.ref (null throughout for this work).
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * English (Whiston's own wording) reading text only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/jewish-war-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0526.tlg004.perseus-eng2.xml');
const RAW_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg004/tlg0526.tlg004.perseus-eng2.xml';
const OUT_DIR = join(REPO_ROOT, 'data', 'jewish-war-en');

const WORK_ID = 'jewish-war-en';
const EXPECTED_BOOKS = 7;
/** This source's own per-book section counts (I..VII) - Whiston's own paragraph divisions, not continuous. */
const EXPECTED_SECTION_COUNTS = [234, 143, 88, 78, 65, 52, 47];

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

async function ensureRaw(): Promise<string> {
  mkdirSync(dirname(RAW_XML), { recursive: true });
  if (existsSync(RAW_XML)) {
    process.stdout.write(`using cached ${RAW_XML}\n`);
    return readFileSync(RAW_XML, 'utf8');
  }
  process.stdout.write(`fetching ${RAW_URL} ...\n`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let text: string;
  try {
    const res = await fetch(RAW_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (summa-app-importer; offline PWA corpus build)' },
      signal: controller.signal,
    });
    if (!res.ok) fail(`HTTP ${res.status} fetching ${RAW_URL}`);
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }
  if (text.length < 300000) fail(`suspiciously short response (${text.length} bytes) from ${RAW_URL}`);
  writeFileSync(RAW_XML, text, 'utf8');
  process.stdout.write(`cached to ${RAW_XML} (${text.length} bytes)\n`);
  return text;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = await ensureRaw();
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<body');
  const textEnd = xml.indexOf('</body>');
  if (textStart < 0 || textEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const BOOK_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="book")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const SECTION_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="section")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const tokenRe = new RegExp(
    `${BOOK_OPEN}|${SECTION_OPEN}|<div\\b[^>]*>|<\\/div>|<head\\b[^>]*>|<\\/head>|<p\\b[^>]*>|<\\/p>|<note\\b[^>]*>|<\\/note>|<milestone\\b[^>]*\\/>|<date\\b[^>]*>|<\\/date>|<[^>]+>`,
    'g',
  );

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'book' | 'section' | 'other';
  const stack: Frame[] = [];

  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];

  let headTarget: 'book' | 'section' | null = null;
  let inHead = false;
  let headBuf = '';
  let sectionHeading: string | null = null;

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let dateDepthOutsideNote = 0;

  let totalSections = 0;
  let totalNotes = 0;
  let totalChapterMilestones = 0;
  let totalSectionMilestones = 0;
  let totalEmptyParagraphsDropped = 0;
  let sectionsWithHeading = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionHeading = null;
    headTarget = 'section';
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (sectionHeading !== null) sectionsWithHeading += 1;
    const sectionDiv: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: null,
      sourceHeading: sectionHeading,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(sectionDiv);
    totalSections += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inHead) headBuf += free;
        else if (inP) pBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (noteDepth > 0) {
      if (/^<note\b/.test(tok)) noteDepth += 1;
      else if (tok === '</note>') {
        noteDepth -= 1;
        totalNotes += 1;
      }
      continue;
    }

    if (m[1] !== undefined) {
      // book open
      stack.push('book');
      currentBookNum = m[1];
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: currentBookNum,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
      headTarget = 'book';
    } else if (m[2] !== undefined) {
      // section open
      stack.push('section');
      openSection(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<head\b/.test(tok)) {
      if (headTarget === null) fail(`unexpected <head> with no pending book/section target near "${excerpt(body.slice(m.index, m.index + 80))}"`);
      inHead = true;
      headBuf = '';
    } else if (tok === '</head>') {
      inHead = false;
      const cleaned = cleanText(headBuf);
      if (headTarget === 'book') {
        if (!currentBookDiv) fail('</head> (book) closed outside any book');
        currentBookDiv.sourceHeading = cleaned;
      } else if (headTarget === 'section') {
        sectionHeading = cleaned;
      }
      headTarget = null;
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({ where: currentSectionId, note: 'A paragraph cleaned to empty text; dropped rather than emitted empty.' });
      } else {
        sectionParagraphs.push(cleaned);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'Whiston_chapter') totalChapterMilestones += 1;
      else if (unitMatch?.[1] === 'Whiston_section') totalSectionMilestones += 1;
    } else if (/^<date\b/.test(tok)) {
      dateDepthOutsideNote += 1;
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (</date>, <q>/</q>, <foreign>/</foreign>, <placeName>/</placeName>,
    // <term>/</term>, self-closing <lb/>): no structural action - their
    // content, if any, already flows into pBuf/headBuf via the free-text
    // capture above (or is discarded along with an enclosing <note>).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} books, got ${divisions.length}`);
  if (dateDepthOutsideNote !== 0) {
    fail(
      `expected every <date> in this source to fall inside a <note> (confirmed by direct inspection) - found ${dateDepthOutsideNote} ` +
        `outside any note; the assumption that <date> always accompanies discarded apparatus text no longer holds`,
    );
  }

  const sectionCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTION_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) sectionCountMismatches.push(`Book ${i + 1}: parsed ${got} sections, expected ${want}`);
    // sanity: this edition's own section-anchor numbering is strictly increasing within each book (not necessarily continuous - see module doc)
    let prev = 0;
    b.children.forEach((sec) => {
      const n = Number(sec.number);
      if (!Number.isFinite(n) || n <= prev) {
        anomalies.push({
          where: sec.id,
          note: `This book's own section-anchor numbering is not strictly increasing here: n="${sec.number}" does not exceed the previous section's n="${prev}".`,
        });
      }
      prev = n;
    });
  });
  if (sectionCountMismatches.length > 0) {
    fail(`section-count mismatch: ${sectionCountMismatches.join('; ')}`);
  }

  const emptySections = divisions.flatMap((b) => b.children.filter((s) => s.passages.length === 0 || s.passages[0]!.text.length === 0).map((s) => s.id));
  if (emptySections.length > 0) fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.join(', ')}`);

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note resp="editor"> editorial footnotes were excluded entirely, tag and content (including 1 confirmed occurrence nested directly inside a <head> chapter-title rubric); not logged individually given their number.`,
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `This edition's own section <div>s (707 total) do NOT correspond 1:1 with the Greek sibling's own Niese sections (4001 total): each English section is one of William Whiston's own, coarser paragraph divisions, and its Division.number is the Niese section number at which that Whiston paragraph begins - confirmed strictly increasing but with real gaps within each book, not a continuous 1..count sequence. See data/jewish-war-en/types.ts for the full account.`,
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `${sectionsWithHeading} of ${totalSections} sections carry their own Division.sourceHeading (William Whiston's descriptive chapter-title rubric, printed once on the first section of each of his 111 chapters - or "PREFACE" for Book I's own opening section); every other section's sourceHeading is null. This app's schema has no chapter level for this work, so the rubric surfaces on that chapter's first Section rather than on a separate Chapter division.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `${totalChapterMilestones} <milestone unit="Whiston_chapter"/> and ${totalSectionMilestones} <milestone unit="Whiston_section"/> markers (matching the Greek sibling's own counts exactly) are dropped as scaffolding; Division.ref is null throughout for this work.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Wars of the Jews',
    author: 'Flavius Josephus',
    language: 'en',
    translator: 'William Whiston',
    edition:
      'The Works of Flavius Josephus, trans. William Whiston (Auburn and Rochester, NY: Alden and Beardsley, 1856 printing), "The Wars of the Jews" (Whiston\'s translation was first published in 1737)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0526.tlg004.perseus-eng2), which digitises Whiston\'s translation of Josephus, The Jewish War; imported by scripts/import-jewish-war-en. The raw file was fetched once at import time and is committed at scripts/import-jewish-war-en/raw/tlg0526.tlg004.perseus-eng2.xml.',
    license:
      "Whiston's translation (1737; this digitisation reproduces the 1856 Alden and Beardsley printing) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'The Jewish War, in English',
        paragraphs: [
          'William Whiston\'s English translation of Josephus\'s account of the First Jewish-Roman War (66-73 AD) - a facing English rendering of the Greek text already in this library (data/jewish-war-grc). First published in 1737, Whiston\'s Josephus went on to become the standard English translation for nearly two centuries; this digitisation reproduces its 1856 Auburn and Rochester, NY printing (Alden and Beardsley).',
          "The text here is Whiston's translation, verbatim; nothing is further modernised or paraphrased. Whiston/Perseus's own editorial footnotes are excluded - see \"How it was imported\".",
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Whiston, trans., The Works of Flavius Josephus (Auburn and Rochester, NY: Alden and Beardsley, 1856), "The Wars of the Jews". This printing of Whiston\'s 1737 translation is in the public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0526.tlg004.perseus-eng2.xml (CTS urn:cts:greekLit:tlg0526.tlg004.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It is fetched once by the importer and then bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section <div>s directly (there is no chapter-level div in this source, matching the Greek sibling). Each Book\'s own title rubric becomes its Division.sourceHeading; each Whiston chapter\'s own descriptive title rubric (printed on that chapter\'s first section only) becomes that Section\'s own Division.sourceHeading. XML transport scaffolding only is removed: purely typographic <q> quotation marks, <foreign>, <placeName> and <term> wrappers are unwrapped, and the Whiston_chapter/Whiston_section cross-reference milestones are dropped as scaffolding. Perseus/Whiston\'s own editorial footnotes (<note resp="editor">) are excluded entirely, tag and content. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and this edition\'s own printed Section number (Division.ref is null throughout). IMPORTANT: this English witness\'s own section boundaries do not match the Greek sibling\'s own (Niese\'s) section boundaries - each English section here is one of Whiston\'s own, coarser paragraph divisions, numbered by the Niese section at which it begins, not a continuous per-book count. See "Known gaps & anomalies" and data/jewish-war-en/types.ts.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 7 Books and all 707 of this edition\'s own sections are present and in order; the bundled TEI file is identical to the current Perseus canonical-greekLit release.',
          'Edition mismatch with the Greek sibling. This English translation\'s own section numbering (707 sections, William Whiston\'s coarser paragraph divisions, each anchored to the Niese section number where it begins) does not match the Greek edition\'s own section numbering (4001 sections, Niese\'s fine-grained numbering, continuous within each book). This is a genuine, source-confirmed feature of this particular digitisation pairing, not an importer artefact - the two editions in this library are not section-for-section aligned. See jewish-war-grc\'s own about.json for its side of the account.',
          "Editorial footnotes. 195 <note resp=\"editor\"> apparatus notes (Perseus/Whiston-edition editorial commentary, not Josephus's own words) were excluded entirely from the reading text, including one nested directly inside a chapter-title rubric.",
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ---
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const s of b.children) {
      totalPassages += s.passages.length;
      totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const want = EXPECTED_SECTION_COUNTS[Number(b.number) - 1];
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(4)} sections (expected ${want})  "${b.sourceHeading}"\n`,
    );
  }
  process.stdout.write(
    `\n  7 books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalChapterMilestones} Whiston_chapter  ${totalSectionMilestones} Whiston_section  ${totalNotes} <note>  ${sectionsWithHeading} section headings\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-jewish-war-en/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main().catch((err) => {
  process.stderr.write(`STOP (${WORK_ID}): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
