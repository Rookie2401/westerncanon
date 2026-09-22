/**
 * Flavius Josephus, Jewish Antiquities - English translation (William
 * Whiston, "Antiquities of the Jews", in *The Works of Flavius Josephus*,
 * Auburn and Rochester, NY: Alden and Beardsley, 1856 printing; Whiston's
 * translation was originally published 1737; CTS urn:cts:greekLit:
 * tlg0526.tlg001.perseus-eng2). Run-once ingestion pipeline.
 *
 *   npm run import:jewish-antiquities-en
 *
 * Reads scripts/import-jewish-antiquities-en/raw/tlg0526.tlg001.perseus-eng2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg001/tlg0526.tlg001.perseus-eng2.xml
 * and cached; re-fetched automatically only if that file is missing).
 * Writes:
 *   data/jewish-antiquities-en/work.json       - the GenericWork (20 Books, 1444 Sections)
 *   data/jewish-antiquities-en/about.json      - provenance / licence / prose
 *   data/jewish-antiquities-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:jewish-antiquities-en`.
 *
 * See data/jewish-antiquities-en/types.ts for the full structural
 * documentation (2-level Book -> Section tree matching the Greek sibling's
 * shape but NOT its section-numbering coverage; the one confirmed Book-17
 * numbering irregularity; the nested-<p>-inside-<quote> handling). Summary
 * of the markup handled here:
 *   - `<note resp="editor">...</note>` (558) - editorial footnotes, not part
 *     of Josephus's text - EXCLUDED entirely, tag and content (including
 *     whatever it nests: <q>, <date>, <placeName>, <emph>, <foreign> all
 *     confirmed to occur only inside such a note, aside from their much
 *     more frequent occurrences in the main text); summarised once, not
 *     logged individually given the volume.
 *   - `<head>` - Book's own title/date-range banner, and (whenever a
 *     Section's own div opens directly with one) that Section's own
 *     heading - captured verbatim as Division.sourceHeading; see types.ts.
 *   - `<quote><p>...</p>...</quote>` (2, both Book 11) nests a `<p>` inside
 *     an already-open outer `<p>` - handled via a paragraph-nesting DEPTH
 *     counter rather than a simple boolean, so every `<p>` boundary
 *     (nested or not) still becomes its own joined paragraph chunk with no
 *     text lost or merged; logged once as an aggregate anomaly.
 *   - `<milestone unit="Whiston_chapter"/>` / `<milestone
 *     unit="Whiston_section"/>` - Whiston's own traditional chapter/section
 *     numbers - dropped as scaffolding (Division.ref is null throughout;
 *     see types.ts), summarised once.
 *   - `<lb/>` (line break, only inside the 20 book-title heads), `<q>`
 *     (inline quotation), `<emph>`, `<foreign>`, `<soCalled>`, `<gloss>`,
 *     `<placeName>`, `<date>` are unwrapped typographic markup outside any
 *     note - no content decision, their text flows into the surrounding
 *     paragraph unchanged.
 *   - This witness carries NO `<del>`/`<gap>` apparatus of any kind
 *     (confirmed zero occurrences) - asserted and fails loudly if that ever
 *     changes on a re-fetch.
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * English (Whiston's own wording) reading text only; the one content-
 * shaping decision (nested-<p> splitting) is disclosed and loses no text.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, WorkAbout } from '../../data/jewish-antiquities-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0526.tlg001.perseus-eng2.xml');
const RAW_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg001/tlg0526.tlg001.perseus-eng2.xml';
const OUT_DIR = join(REPO_ROOT, 'data', 'jewish-antiquities-en');

const WORK_ID = 'jewish-antiquities-en';
const EXPECTED_BOOKS = 20;
/** This source's own Section-div counts per book (I..XX), cross-checked against the real parsed counts, never forced. */
const EXPECTED_SECTION_COUNTS = [84, 76, 79, 88, 98, 83, 76, 85, 54, 52, 54, 68, 87, 111, 67, 61, 61, 57, 52, 51];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 200): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

async function ensureRawXml(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  process.stdout.write(`fetching ${RAW_URL} ...\n`);
  mkdirSync(dirname(RAW_XML), { recursive: true });
  const res = await fetch(RAW_URL);
  if (!res.ok) fail(`fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  writeFileSync(RAW_XML, text, 'utf8');
  process.stdout.write(`  cached ${RAW_XML} (${(text.length / 1024).toFixed(1)} KB)\n`);
}

export async function main(): Promise<void> {
  await ensureRawXml();
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<del\b[^>]*>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'book' | 'section' | 'other';
  const stack: Frame[] = [];

  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let prevSectionNumInBook: number | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let currentSectionDiv: Division | null = null;
  let sectionParagraphs: string[] = [];

  /** the division (Book or Section) still waiting to see whether its very next child is a <head> */
  let awaitingHeadDiv: Division | null = null;
  let inHead = false;
  let headBuf = '';

  /** paragraph NESTING depth - normally 0 or 1; briefly 2 inside the two <quote><p> spans in Book 11 (see module doc) */
  let pDepth = 0;
  let pBuf = '';
  let noteDepth = 0;

  let totalSections = 0;
  let totalNotes = 0;
  let totalWhistonChapterMilestones = 0;
  let totalWhistonSectionMilestones = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalNestedParagraphSplits = 0;
  let totalOutOfOrderSections = 0;

  function openSection(n: string): void {
    if (!currentBookDiv) fail(`section n="${n}" found outside any book`);
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    currentSectionDiv = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [],
    };
    currentBookDiv.children.push(currentSectionDiv);
    awaitingHeadDiv = currentSectionDiv;

    if (/^\d+$/.test(n)) {
      const val = Number(n);
      if (prevSectionNumInBook !== null && val <= prevSectionNumInBook) {
        totalOutOfOrderSections += 1;
        anomalies.push({
          where: currentSectionId,
          note: `Section numbering irregularity: this Section's own n="${n}" is not greater than the immediately preceding Section's n="${prevSectionNumInBook}" within book-${currentBookNum} (expected strictly increasing). Kept verbatim as printed rather than silently corrected. This coincides with the start of a new Whiston chapter at this same point in the source, suggesting the chapter number was mistakenly copied into the section-numbering attribute here.`,
        });
      } else {
        prevSectionNumInBook = val;
      }
    }
  }

  function flushParagraph(): void {
    const cleaned = cleanText(pBuf);
    pBuf = '';
    if (cleaned.length === 0) {
      totalEmptyParagraphsDropped += 1;
      anomalies.push({ where: currentSectionId, note: 'A paragraph cleaned to empty text; dropped rather than joined as an empty segment.' });
    } else {
      sectionParagraphs.push(cleaned);
    }
  }

  function closeSection(): void {
    if (!currentSectionDiv) fail(`section "${currentSectionId}" closed with no open Section division`);
    if (sectionParagraphs.length === 0) fail(`${currentSectionId} has no surviving paragraph text`);
    currentSectionDiv.passages = [{ n: '', text: sectionParagraphs.join('\n\n'), ref: null }];
    totalSections += 1;
    currentSectionDiv = null;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inHead) headBuf += free;
        else if (pDepth > 0) pBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (noteDepth > 0) {
      if (/^<note\b/.test(tok)) noteDepth += 1;
      else if (tok === '</note>') {
        noteDepth -= 1;
        if (noteDepth === 0) totalNotes += 1;
      }
      continue;
    }

    if (/^<div\b/.test(tok)) {
      if (isTextpartDiv(tok, 'book')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`book div missing n= attribute: "${tok}"`);
        stack.push('book');
        currentBookNum = n;
        prevSectionNumInBook = null;
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
      } else if (isTextpartDiv(tok, 'section')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`section div missing n= attribute: "${tok}"`);
        stack.push('section');
        openSection(n);
      } else {
        stack.push('other');
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<head\b/.test(tok)) {
      if (awaitingHeadDiv) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        const cleaned = cleanText(headBuf);
        if (awaitingHeadDiv) awaitingHeadDiv.sourceHeading = cleaned;
        awaitingHeadDiv = null;
      }
    } else if (/^<p\b/.test(tok)) {
      pDepth += 1;
      awaitingHeadDiv = null; // real content started; no head is coming for this division
      if (pDepth === 1) {
        pBuf = '';
      } else {
        // nested <p> (inside a <quote> whose own outer <p> is still open) - flush
        // whatever the outer paragraph has accumulated so far as its own chunk,
        // then start capturing the nested paragraph fresh. See module doc.
        totalNestedParagraphSplits += 1;
        const top = stack[stack.length - 1];
        if (top !== 'section') fail(`nested <p> found outside any section div (stack top: "${top}")`);
        flushParagraph();
      }
    } else if (tok === '</p>') {
      const top = stack[stack.length - 1];
      if (top !== 'section') fail(`<p> found outside any section div (stack top: "${top}"); text: "${excerpt(pBuf)}"`);
      flushParagraph();
      pDepth = Math.max(0, pDepth - 1);
      // if pDepth is still > 0 we're back inside the outer <p> - pBuf stays reset,
      // ready to accumulate that outer paragraph's remaining text as its own chunk.
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (/^<milestone\b/.test(tok)) {
      if (/unit="Whiston_chapter"/.test(tok)) totalWhistonChapterMilestones += 1;
      else if (/unit="Whiston_section"/.test(tok)) totalWhistonSectionMilestones += 1;
    } else if (/^<del\b/.test(tok) || /^<gap\b/.test(tok)) {
      fail(`unexpected "${tok}" - this witness was confirmed to carry zero <del>/<gap> apparatus; the handling code has not been designed/reviewed against a real occurrence`);
    }
    // catch-all `<[^>]+>` (lb/q/emph/foreign/soCalled/gloss/placeName/date and
    // anything else outside a note): no structural action, their content
    // already flows into pBuf/headBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (pDepth !== 0) fail(`unbalanced <p> nesting (final depth ${pDepth})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} books, got ${divisions.length}`);

  // --- cross-check section counts against this source's own expected numbers, honestly ---
  const countMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTION_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) countMismatches.push(`Book ${i + 1}: parsed ${got} sections, expected ${want}`);
  });
  if (countMismatches.length > 0) {
    anomalies.push({ where: `${WORK_ID} / section counts`, note: `${countMismatches.length} book(s) parse to a section count different from this source's own expected numbering: ${countMismatches.join('; ')}.` });
  }

  // --- no section should ever be empty ---
  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note resp="editor"> editorial footnotes were excluded entirely, tag and content; not logged individually given their number.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNestedParagraphSplits} nested <p> open(s) inside an already-open outer <p> (both inside <quote>, Book 11 - embedded official letters quoted in full) were treated as their own paragraph-join points rather than merged into or dropped from the surrounding text; no text was lost.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref is null throughout. This source carries ${totalWhistonChapterMilestones} <milestone unit="Whiston_chapter"/> and ${totalWhistonSectionMilestones} <milestone unit="Whiston_section"/> markers - Whiston's own traditional chapter/section numbering - dropped as scaffolding this app's schema has no field for, without affecting the reading text. ${totalOutOfOrderSections} Section number irregularit(y/ies) versus the otherwise strictly increasing per-book sequence are individually logged above.`,
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
    title: 'Antiquities of the Jews',
    author: 'Flavius Josephus',
    language: 'en',
    translator: 'William Whiston',
    edition:
      'The Works of Flavius Josephus, trans. William Whiston (Auburn and Rochester, NY: Alden and Beardsley, 1856 printing), "Antiquities of the Jews" (Whiston\'s translation was originally published London, 1737)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0526.tlg001.perseus-eng2), which digitises Whiston\'s translation; imported by scripts/import-jewish-antiquities-en. The raw file is cached at scripts/import-jewish-antiquities-en/raw/tlg0526.tlg001.perseus-eng2.xml.',
    license:
      "Whiston's translation (1737; this digitisation reproduces the 1856 Auburn and Rochester printing) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Josephus's Jewish Antiquities — English",
        paragraphs: [
          'This is William Whiston\'s classic English translation (1737) of Flavius Josephus\'s Ἰουδαϊκὴ ἀρχαιολογία ("Jewish Antiquities"), a 20-book history of the Jewish people from creation to the eve of the First Jewish-Roman War. Whiston\'s translation, still widely read today, includes his own extensive editorial footnotes; those footnotes are excluded here (see "How it was imported") but the translated text itself is reproduced verbatim.',
          'The Greek original of the same work is bundled separately as jewish-antiquities-grc; see its own about.json, including how its own edition treats the disputed "Testimonium Flavianum" passage differently from Whiston\'s translation here (Book 18) — see "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Whiston, trans., The Works of Flavius Josephus (Auburn and Rochester, NY: Alden and Beardsley, 1856 printing), "Antiquities of the Jews". Whiston\'s translation was originally published in London in 1737; both the original and this 19th-century printing of it are in the public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0526.tlg001.perseus-eng2.xml (CTS urn:cts:greekLit:tlg0526.tlg001.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the 20 Books is a top-level Division (book-1 .. book-20); each holds its own Sections (book-N-sec-M), one Passage each — 1444 Sections in all. UNLIKE the Greek sibling, this witness has no book-opening "argumentum" table of contents at all, and its Section numbering (M) is this source\'s own CTS canonical section number (aligned to the Greek original) rather than a complete, sequential count: Whiston\'s own translated paragraphing is coarser than the Greek original\'s, so one Section here often covers a range of the original\'s section numbers, with only the FIRST of that range printed as this Section\'s own `n`. Whiston\'s own traditional chapter/section numbers are recorded only as inline cross-reference milestones, dropped as scaffolding — see "Reference scheme".',
          "Editorial footnotes (Whiston's own extensive annotations, 558 of them) are excluded entirely from the reading text. Two Sections (Book 11) quote official letters/decrees in full via a nested paragraph inside the surrounding narrative paragraph; rather than merge or drop any of it, each nested paragraph boundary is treated as its own paragraph-join point in this Section's Passage text. Entities are decoded and runs of whitespace collapsed; the translated words are otherwise untouched.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Section (this witness\'s own `n`, aligned to the Greek original\'s canonical section numbering — see "How it was imported" for why it is not a complete sequential count here). Division.ref is null throughout: Whiston\'s own, different traditional chapter/section numbers (carried as inline milestones in this source) are dropped as scaffolding rather than fabricating a use for them. Passage.ref is null throughout as well.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 20 Books and all 1444 Sections are present and in order; the bundled TEI file matches the current Perseus canonical-greekLit release.',
          'A source-side numbering slip. One Section in Book 17 carries the section-number attribute "13" where the surrounding, otherwise strictly increasing sequence implies a much larger number was intended; it coincides exactly with the start of Whiston\'s own Chapter 13 at that same point, suggesting the chapter number was mistakenly copied into the section-number attribute in this digitisation. Kept verbatim as printed rather than silently corrected — logged individually in anomalies.json.',
          'The Testimonium Flavianum. Book 18\'s account of Jesus (the Greek sibling\'s book-18-sec-63/64) is presented here as ordinary, unmarked translated text — Whiston\'s 1737 translation predates the modern critical-textual debate over this passage\'s authenticity. Contrast the Greek sibling (jewish-antiquities-grc), whose own edition (Niese) brackets the same passage entirely as a probable interpolation; see that work\'s own anomalies.json.',
          "Editorial apparatus. This witness carries NO <del>/<gap> textual-critical apparatus at all (confirmed zero occurrences) — Whiston's own footnotes (558, excluded from the reading text) are its only editorial layer.",
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
  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTION_COUNTS[i]!;
    process.stdout.write(`  Book ${String(b.number).padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections (expected ${want})  "${b.sourceHeading ?? ''}"\n`);
  });
  process.stdout.write(
    `\n  ${divisions.length} books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalNotes} <note>  ${totalNestedParagraphSplits} nested-<p> splits  ${totalOutOfOrderSections} out-of-order section(s)  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:jewish-antiquities-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    process.stderr.write(`STOP (${WORK_ID}): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exit(1);
  });
}
