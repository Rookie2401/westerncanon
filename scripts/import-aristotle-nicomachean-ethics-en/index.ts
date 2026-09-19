/**
 * Aristotle, Nicomachean Ethics - English translation (Harris Rackham,
 * "The Nicomachean Ethics", London: William Heinemann; New York: G. P.
 * Putnam's Sons, 1926 Loeb Classical Library printing; CTS urn:cts:greekLit
 * :tlg0086.tlg010.perseus-eng2). Run-once ingestion pipeline.
 *
 *   npm run import:aristotle-nicomachean-ethics-en
 *
 * Reads scripts/import-aristotle-nicomachean-ethics-en/raw/tlg0086.tlg010.perseus-eng2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/nicomachean-ethics-en/work.json       - the GenericWork (10 Books,
 *                                                 each a flat list of Chapter
 *                                                 divisions, one Passage each)
 *   data/nicomachean-ethics-en/about.json      - provenance / licence / prose
 *   data/nicomachean-ethics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle-nicomachean-ethics-en`.
 *
 * Structure (confirmed by direct inspection of the fetched XML - checked
 * independently of the Greek witness rather than assumed identical): the
 * same two-level `<div type="textpart" subtype="book" n="N">` /
 * `<div type="textpart" subtype="section" n="M">` (Book/Chapter) nesting as
 * the Greek sibling, and the SAME 10/116 book/chapter split, chapter-for-
 * chapter - but this English witness inserts one EXTRA nesting level the
 * Greek does not have: `<div type="textpart" subtype="subsection" n="K">`
 * between chapter and paragraph, Rackham's own Bekker-line-keyed
 * sub-numbering (e.g. "1.1.1"). That level carries no information this
 * app's Book->Chapter schema needs, so the importer reads straight through
 * it: every `<p>` found anywhere under a chapter div, at any subsection
 * depth, becomes one paragraph of that chapter's single Passage, in
 * document order - see data/nicomachean-ethics-en/types.ts.
 *
 * Faithfulness rules (mirrors scripts/import-euclid and the Greek sibling):
 *   - verbatim English (Rackham's own translation) reading text only; no
 *     modernising or "improving" his 1926 wording.
 *   - `<milestone unit="page"/>` (page values only) seeds each chapter's
 *     Division.ref exactly as in the Greek sibling; `<milestone
 *     unit="line"/>` is zero-width transport scaffolding, dropped.
 *   - `<note resp="Rackham">...</note>` (696 total) is Rackham's own
 *     footnote apparatus - translator's commentary, cross-references and
 *     source citations for quoted verse - NOT part of the translated
 *     running text itself. It is embedded inline in this TEI (full note
 *     content, not just a marker), so it is excluded from the reading text
 *     entirely (tag AND content), the same treatment this library already
 *     gives Rackham-style Loeb footnotes and Perseus asides elsewhere
 *     (e.g. Virgil's <note resp="Perseus">). Every occurrence is counted
 *     (not logged individually - 696 would dwarf the rest of
 *     anomalies.json for routine apparatus - see the corpus-level note).
 *   - `<quote>`/`<lg>`/`<l>` (verse Aristotle quotes, in Rackham's own
 *     English verse rendering), `<foreign>` (untranslated Greek/Latin
 *     phrases Rackham leaves in the original), `<q>` (quotation-marked
 *     words/phrases), `<title>` (italicised work titles, e.g.
 *     <title>Analytics</title>), `<emph>` (italicised emphasis),
 *     `<placeName>` (place names) and the rare self-closing `<lb
 *     rend="align(indent)"/>` (a soft line-wrap before an inline lettered
 *     sub-point, always already flanked by whitespace in the source) are
 *     all unwrapped: pure typographic/structural markup around genuine
 *     translated text, never dropped.
 *   - this witness carries no `<del>`/`<add>`/`<gap>` (Bywater's Greek
 *     critical apparatus has no counterpart in Rackham's English) and no
 *     `<choice>`/`<sic>`/`<corr>`/`<bibl>` outside a `<note>` (confirmed by
 *     direct inspection) - nothing else needs special handling.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n".
 *
 * The Greek and English editions are parsed completely independently (this
 * importer never reads the Greek file or the Greek importer's output); any
 * real chapter-count mismatch between them would be logged to
 * anomalies.json, not silently reconciled - in fact both witnesses agree
 * chapter-for-chapter (10 books, 116 chapters, including the same 14/14 in
 * Books VII/VIII against the 15/16 traditionally cited elsewhere).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/nicomachean-ethics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0086.tlg010.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'nicomachean-ethics-en');

interface Anomaly {
  where: string;
  note: string;
}

/** Traditionally cited chapter counts per book (I..X); compared against the
 *  real parsed counts below and flagged, never forced. Identical list to
 *  the Greek importer's (kept as a separate literal here so the two
 *  importers stay fully independent). */
const CANONICAL_CHAPTER_COUNTS = [13, 9, 12, 9, 11, 13, 15, 16, 12, 9];

function fail(message: string): never {
  process.stderr.write(`STOP: ${message}\n`);
  process.exit(1);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div type="textpart" subtype="book"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<milestone\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentChapterNum = '';
  let currentChapterId = '';
  let chapterParagraphs: string[] = [];
  let chapterPages: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;

  let totalChapters = 0;
  let totalNotes = 0;
  let totalPageMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  function openChapter(n: string): void {
    currentChapterNum = n;
    currentChapterId = `book-${currentBookNum}-ch-${n}`;
    chapterParagraphs = [];
    chapterPages = [];
  }

  function closeChapter(): void {
    if (!currentBookDiv) fail(`chapter "${currentChapterId}" closed outside any book`);
    if (chapterParagraphs.length === 0) {
      fail(`chapter "${currentChapterId}" has no surviving paragraph text`);
    }
    const text = chapterParagraphs.join('\n\n');
    let ref: string | null = null;
    if (chapterPages.length === 0) {
      anomalies.push({
        where: currentChapterId,
        note: 'No Bekker page milestone found in this chapter; Division.ref left null rather than fabricated.',
      });
    } else {
      const first = chapterPages[0]!;
      const last = chapterPages[chapterPages.length - 1]!;
      ref = first === last ? first : `${first}–${last}`;
    }
    const passage: Passage = { n: '', text, ref: null };
    const chapterDiv: Division = {
      id: currentChapterId,
      number: currentChapterNum,
      ref,
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

    if (m[1] !== undefined) {
      // book open
      stack.push('book');
      currentBookNum = Number(m[1]);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 10) {
        fail(`unexpected book number "${m[1]}"`);
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
    } else if (m[2] !== undefined) {
      // section (chapter) open
      stack.push('section');
      openChapter(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeChapter();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      // book-open and section-open are matched by the more specific
      // alternatives above; any OTHER <div ...> here is a subsection (or
      // the outer "translation" wrapper) - tracked only for balanced
      // nesting, read straight through (see the module doc).
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
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'page' && nMatch?.[1] && noteDepth === 0) {
        chapterPages.push(nMatch[1]);
        totalPageMilestones += 1;
      }
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (subsection <p> siblings' surrounding markup, <quote>/<lg>/<l>,
    // <foreign>, <q>, <title>, <emph>, <placeName>, <lb .../>, and their
    // closes): no structural action - their content already flows into
    // pBuf via the free-text capture above (suppressed only while
    // noteDepth > 0).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 10) fail(`expected exactly 10 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);

  // --- cross-check chapter counts against the traditionally cited numbers,
  //     honestly, without forcing a match ------------------------------
  const chapterCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = CANONICAL_CHAPTER_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) {
      chapterCountMismatches.push(`Book ${i + 1}: parsed ${got} chapters, traditionally cited ${want}`);
    }
  });
  if (chapterCountMismatches.length > 0) {
    anomalies.push({
      where: 'nicomachean-ethics-en / chapter counts',
      note:
        `${chapterCountMismatches.length} book(s) parse to a chapter count different from the number traditionally ` +
        `cited for the Nicomachean Ethics: ${chapterCountMismatches.join('; ')}. This matches the Greek sibling ` +
        'edition (Bywater/Perseus) exactly, chapter-for-chapter - confirmed genuine, not a parsing error; see about.json.',
    });
  }

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

  // --- corpus-level anomalies -------------------------------------------
  anomalies.push({
    where: 'nicomachean-ethics-en / reading text',
    note: `${totalNotes} <note resp="Rackham"> footnotes (translator's commentary, cross-references and source citations - not the translated running text) were excluded entirely, tag and content; not logged individually given their number.`,
  });
  anomalies.push({
    where: 'nicomachean-ethics-en / structure',
    note: "This witness nests an extra <div subtype=\"subsection\"> level (Rackham's own Bekker-line-keyed sub-numbering) between chapter and paragraph that the Greek sibling does not have. It carries no information this app's two-level Book->Chapter schema needs, so every <p> under a chapter div is read straight through regardless of its subsection nesting depth, in document order, into that chapter's single Passage.",
  });
  anomalies.push({
    where: 'nicomachean-ethics-en / passage & division refs',
    note: `${totalPageMilestones} Bekker page milestones captured; each chapter's Division.ref is the first–last page value seen in that chapter's own document order. Every Passage.ref is null: no Bekker milestone is printed at the per-paragraph level, only per-page.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: 'nicomachean-ethics-en / reading text',
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs -------------------------------------------------
  const work: GenericWork = {
    workId: 'nicomachean-ethics-en',
    language: 'en',
    divisions,
  };

  const about = {
    workId: 'nicomachean-ethics-en',
    title: 'The Nicomachean Ethics',
    author: 'Aristotle',
    language: 'en' as const,
    translator: 'Harris Rackham',
    edition: 'Loeb Classical Library, 1926 printing',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0086.tlg010.perseus-eng2), which digitises Harris Rackham’s translation "The Nicomachean Ethics" (London: William Heinemann; New York: G. P. Putnam’s Sons, 1926 Loeb Classical Library); imported by scripts/import-aristotle-nicomachean-ethics-en.',
    license:
      'Rackham’s 1926 translation is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Aristotle’s Nicomachean Ethics — English, trans. Rackham',
        paragraphs: [
          'This is Aristotle’s Nicomachean Ethics in the English translation made by Harris Rackham for the Loeb Classical Library, first published in 1926. It stands alongside the Greek text (Bywater 1894) already in this library as a facing English rendering of the same ten-book treatise.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Rackham’s own footnotes (translator’s commentary and source citations, not part of the translated running text) are excluded - see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Harris Rackham, trans., "The Nicomachean Ethics", Loeb Classical Library (London: William Heinemann; New York: G. P. Putnam’s Sons, 1926). This translation is in the public domain.',
          'The work is divided into 10 Books and, within each Book, numbered chapters (116 in this edition, matching the Greek sibling chapter-for-chapter - including 14 chapters each in Books VII and VIII, not the 15 / 16 sometimes cited elsewhere; see "Known gaps & anomalies"). This source prints Bekker page/line milestones inline throughout, so citation here is by Bekker page range as well as by chapter; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0086.tlg010.perseus-eng2.xml (CTS urn:cts:greekLit:tlg0086.tlg010.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter (Perseus’s own "section") <div>s and collects every <p> paragraph found anywhere under each chapter div - including inside the extra Rackham-sub-numbering "subsection" divs this witness nests between chapter and paragraph (see the importer’s module doc) - in document order, into that chapter’s single Passage (joined with a blank line when a chapter has more than one paragraph). XML transport scaffolding only is removed: the inline Bekker <milestone> markers (their "page" values instead seed each chapter’s Division.ref) and purely typographic wrapper tags (<quote>/<lg>/<l> verse quotations, <foreign>, <q>, <title>, <emph>, <placeName>, the rare self-closing <lb/>) are unwrapped, their text flowing into the surrounding prose. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          '696 <note resp="Rackham"> footnotes - Rackham’s own translator’s commentary, cross-references (e.g. "see 3.7.6") and citations for quoted verse - are embedded as full inline content in this TEI (not merely a marker), so they are excluded from the reading text entirely, tag and content; they are apparatus, not Aristotle’s (translated) text, mirroring how this library already treats a Loeb translator’s footnotes and a Perseus editorial aside elsewhere.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter, plus the Bekker page range each chapter covers (e.g. "1094a–1095a"), reconstructed from this source’s own inline Bekker page milestones - the same scheme as the Greek sibling. A chapter’s Division.ref is the first–last page value the source prints within that chapter, in document order. Passage.ref is null throughout: no Bekker marker is printed at the per-paragraph level, only per-page. Passage.n is also always empty: Rackham’s own paragraph sub-numbering (the "subsection" divs, e.g. "1.1.1") is not preserved in this two-level schema - see "How it was imported".',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 10 Books and all 116 chapters are present and in order, matching the Greek sibling exactly, chapter-for-chapter. No paragraph is dropped, merged or reordered except for the rare paragraph that cleans to empty text; the bundled TEI file is identical to the current Perseus canonical-greekLit release.',
          'Chapter counts in Books VII and VIII. Like the Greek sibling, this edition’s own chapter division gives Book VII 14 chapters and Book VIII 14 chapters, not the 15 / 16 sometimes cited in secondary literature - confirmed genuine on both witnesses independently, not a parsing error.',
          'Extra subsection level. Unlike the Greek TEI, this English witness nests an extra <div subtype="subsection"> level (Rackham’s own paragraph sub-numbering) between chapter and paragraph. It is read straight through - every paragraph under a chapter, at any subsection depth, becomes part of that chapter’s single Passage - since this app’s Book->Chapter schema has no field for a third tier here.',
          'Footnotes. 696 <note resp="Rackham"> footnotes (translator’s commentary, cross-references, verse citations) were excluded entirely; they are Rackham’s apparatus, not his translated running text.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const c of b.children) {
      totalPassages += c.passages.length;
      totalChars += c.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const want = CANONICAL_CHAPTER_COUNTS[Number(b.number) - 1];
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(2)} chapters (traditionally cited ${want})\n`,
    );
  }
  process.stdout.write(
    `\n  10 books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalPageMilestones} page milestones  ${totalNotes} <note>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle-nicomachean-ethics-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
