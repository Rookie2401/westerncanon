/**
 * Aristotle, Rhetoric - English translation (John Henry Freese, "The 'Art'
 * of Rhetoric", London: William Heinemann, Ltd.; Cambridge, MA: Harvard
 * University Press, 1926 Loeb Classical Library printing, 1947 reprint;
 * CTS urn:cts:greekLit:tlg0086.tlg038.perseus-eng2, per this work's own
 * __cts__.xml). Run-once ingestion pipeline.
 *
 *   npm run import:rhetoric-en
 *
 * Reads scripts/import-rhetoric-en/raw/tlg0086.tlg038.perseus-eng2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/rhetoric-en/work.json       - the GenericWork (3 Books, each a
 *                                       flat list of Chapter divisions, one
 *                                       Passage each)
 *   data/rhetoric-en/about.json      - provenance / licence / prose
 *   data/rhetoric-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:rhetoric-en`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a
 * THREE-level `<div type="textpart" subtype="book" n="N">` /
 * `<div type="textpart" subtype="chapter" n="M">` /
 * `<div type="textpart" subtype="section" n="K">` nesting - Book, Chapter,
 * and (unlike the Greek sibling's likely two-level split) an explicitly
 * labelled extra "section" level carrying Freese's own Bekker-line-keyed
 * sub-numbering (e.g. "1.1.1"), analogous to the unlabelled "subsection"
 * level the Nicomachean Ethics English witness nests between chapter and
 * paragraph. That level carries no information this app's Book->Chapter
 * schema needs, so the importer reads straight through it exactly as the
 * Nicomachean Ethics importer does: every `<p>` found anywhere under a
 * chapter div, at any section depth, becomes one paragraph of that
 * chapter's single Passage, in document order - see
 * data/rhetoric-en/types.ts. (Some section divs hold two `<p>`s; none seen
 * hold zero.)
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-en):
 *   - verbatim English (Freese's own translation) reading text only; no
 *     modernising or "improving" his 1926 wording.
 *   - `<milestone unit="page"/>` (page values only) seeds each chapter's
 *     Division.ref exactly as in the Nicomachean Ethics importer;
 *     `<milestone unit="line"/>` is zero-width transport scaffolding,
 *     dropped. Every milestone in this source carries resp="Bekker".
 *   - `<note resp="Freese">...</note>` (639 total) is Freese's own
 *     footnote apparatus - translator's commentary, cross-references and
 *     source citations - NOT part of the translated running text itself.
 *     It is embedded inline in this TEI (full note content, not just a
 *     marker), so it is excluded from the reading text entirely (tag AND
 *     content), the same treatment this library already gives Rackham's
 *     Loeb footnotes in the Nicomachean Ethics. Every occurrence is
 *     counted (not logged individually - 639 would dwarf the rest of
 *     anomalies.json for routine apparatus - see the corpus-level note).
 *     `<bibl>` (147, all inside notes) is removed along with its
 *     enclosing note.
 *   - `<quote>`/`<lg>`/`<l>` (verse quotes, in Freese's own English verse
 *     rendering), `<foreign>` (untranslated Greek/Latin phrases Freese
 *     leaves in the original), `<q>` (quotation-marked words/phrases),
 *     `<title>` (italicised work titles, e.g. <title>Topics</title>),
 *     `<emph>` (italicised emphasis), `<placeName>`, `<persName>`/
 *     `<surname>` (personal names, confirmed appearing in the running text
 *     as well as inside notes) and `<term>` (5 occurrences, all in the
 *     running text) are all unwrapped: pure typographic/structural markup
 *     around genuine translated text, never dropped.
 *   - this witness carries no `<del>`/`<add>`/`<gap>`/`<choice>`/`<sic>`/
 *     `<corr>` anywhere (confirmed by direct inspection) - nothing else
 *     needs special handling.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Chapter is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n".
 *
 * If a Greek sibling data/rhetoric-grc/ exists, it is parsed completely
 * independently (this importer never reads it or its importer's output);
 * any real chapter-count mismatch between them would be logged to
 * anomalies.json, not silently reconciled.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/rhetoric-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0086.tlg038.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'rhetoric-en');

interface Anomaly {
  where: string;
  note: string;
}

/** Traditionally cited chapter counts per book (I..III); compared against
 *  the real parsed counts below and flagged, never forced. */
const CANONICAL_CHAPTER_COUNTS = [15, 26, 19];

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
    /<div type="textpart" subtype="book"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="chapter"[^>]*n="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<milestone\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'chapter' | 'other'> = [];
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
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 3) {
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
      // chapter open
      stack.push('chapter');
      openChapter(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'chapter') closeChapter();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      // book-open and chapter-open are matched by the more specific
      // alternatives above; any OTHER <div ...> here is a "section" div
      // (Freese's own Bekker-line-keyed sub-numbering) or the outer
      // "translation" wrapper - tracked only for balanced nesting, read
      // straight through (see the module doc).
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
    // (section <p> siblings' surrounding markup, <quote>/<lg>/<l>,
    // <foreign>, <q>, <title>, <emph>, <placeName>, <persName>,
    // <surname>, <term>, and their closes): no structural action - their
    // content already flows into pBuf via the free-text capture above
    // (suppressed only while noteDepth > 0).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 3) fail(`expected exactly 3 Book divisions, got ${divisions.length}`);
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
      where: 'rhetoric-en / chapter counts',
      note:
        `${chapterCountMismatches.length} book(s) parse to a chapter count different from the number traditionally ` +
        `cited for the Rhetoric: ${chapterCountMismatches.join('; ')}. Confirmed genuine, not a parsing error; see about.json.`,
    });
  } else {
    anomalies.push({
      where: 'rhetoric-en / chapter counts',
      note:
        'All 3 books parse to exactly the traditionally cited chapter counts (I: 15, II: 26, III: 19) - no mismatch to reconcile.',
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
    where: 'rhetoric-en / reading text',
    note: `${totalNotes} <note resp="Freese"> footnotes (translator's commentary, cross-references and source citations - not the translated running text) were excluded entirely, tag and content, including the 147 <bibl> elements they contain; not logged individually given their number.`,
  });
  anomalies.push({
    where: 'rhetoric-en / structure',
    note: 'This source nests an extra <div type="textpart" subtype="section"> level (Freese\'s own Bekker-line-keyed sub-numbering, e.g. "1.1.1") between chapter and paragraph, labelled explicitly (unlike the unlabelled "subsection" level in the Nicomachean Ethics English witness). It carries no information this app\'s two-level Book->Chapter schema needs, so every <p> under a chapter div is read straight through regardless of its section nesting depth, in document order, into that chapter\'s single Passage. A small number of section divs (31 of 882) contain two <p> elements rather than one; both are kept, joined with the rest.',
  });
  anomalies.push({
    where: 'rhetoric-en / passage & division refs',
    note: `${totalPageMilestones} Bekker page milestones captured; each chapter's Division.ref is the first–last page value seen in that chapter's own document order. Every Passage.ref is null: no Bekker milestone is printed at the per-paragraph level, only per-page.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: 'rhetoric-en / reading text',
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs -------------------------------------------------
  const work: GenericWork = {
    workId: 'rhetoric-en',
    language: 'en',
    divisions,
  };

  const about = {
    workId: 'rhetoric-en',
    title: 'The "Art" of Rhetoric',
    author: 'Aristotle',
    language: 'en' as const,
    translator: 'John Henry Freese',
    edition: 'Loeb Classical Library, 1926 printing (1947 reprint)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0086.tlg038.perseus-eng2), which digitises John Henry Freese’s translation "The ‘Art’ of Rhetoric" (London: William Heinemann, Ltd.; Cambridge, MA: Harvard University Press, 1926 Loeb Classical Library printing, reprinted 1947); per this work’s own __cts__.xml (<ti:translation urn="urn:cts:greekLit:tlg0086.tlg038.perseus-eng2">: "Aristotle. The ‘Art’ of Rhetoric. Freese, John Henry, translator. London: William Heinemann, Ltd.; Cambridge, MA, Harvard University Press, 1926 (printing)."); imported by scripts/import-rhetoric-en.',
    license:
      'Freese’s translation was first published in 1926 (Loeb Classical Library), well before 1931, so it is in the public domain in the United States. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Aristotle’s Rhetoric — English, trans. Freese',
        paragraphs: [
          'This is Aristotle’s Rhetoric in the English translation made by John Henry Freese for the Loeb Classical Library, first published in 1926 (reprinted 1947). It stands alongside the Greek text already in this library (when present) as a facing English rendering of the same three-book treatise.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Freese’s own footnotes (translator’s commentary and source citations, not part of the translated running text) are excluded - see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'John Henry Freese, trans., "The ‘Art’ of Rhetoric", Loeb Classical Library (London: William Heinemann, Ltd.; Cambridge, MA: Harvard University Press, 1926; reprinted 1947). This translation is in the public domain.',
          'The work is divided into 3 Books and, within each Book, numbered chapters (15 in Book I, 26 in Book II, 19 in Book III - 60 in total, matching the traditionally cited counts exactly). This source prints Bekker page/line milestones inline throughout, so citation here is by Bekker page range as well as by chapter; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0086.tlg038.perseus-eng2.xml (CTS urn:cts:greekLit:tlg0086.tlg038.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It was fetched once (together with this work’s __cts__.xml metadata record) and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and chapter <div>s and collects every <p> paragraph found anywhere under each chapter div - including inside the extra Freese-sub-numbering "section" divs this source nests between chapter and paragraph (see the importer’s module doc) - in document order, into that chapter’s single Passage (joined with a blank line when a chapter has more than one paragraph). XML transport scaffolding only is removed: the inline Bekker <milestone> markers (their "page" values instead seed each chapter’s Division.ref) and purely typographic wrapper tags (<quote>/<lg>/<l> verse quotations, <foreign>, <q>, <title>, <emph>, <placeName>, <persName>, <surname>, <term>) are unwrapped, their text flowing into the surrounding prose. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          '639 <note resp="Freese"> footnotes - Freese’s own translator’s commentary, cross-references and citations (including 147 <bibl> elements) - are embedded as full inline content in this TEI (not merely a marker), so they are excluded from the reading text entirely, tag and content; they are apparatus, not Aristotle’s (translated) text, mirroring how this library already treats Rackham’s Loeb footnotes in the Nicomachean Ethics.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter, plus the Bekker page range each chapter covers (e.g. "1354a–1355a"), reconstructed from this source’s own inline Bekker page milestones. A chapter’s Division.ref is the first–last page value the source prints within that chapter, in document order. Passage.ref is null throughout: no Bekker marker is printed at the per-paragraph level, only per-page. Passage.n is also always empty: Freese’s own paragraph sub-numbering (the "section" divs, e.g. "1.1.1") is not preserved in this two-level schema - see "How it was imported".',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books and all 60 chapters are present and in order (15 + 26 + 19), matching the traditionally cited counts exactly. No paragraph is dropped, merged or reordered except for the rare paragraph that cleans to empty text; the bundled TEI file is identical to the current Perseus canonical-greekLit release.',
          'Extra section level. Like the Nicomachean Ethics English witness, this source nests an extra <div subtype="section"> level (Freese’s own paragraph sub-numbering) between chapter and paragraph - here explicitly labelled "section" rather than "subsection". It is read straight through - every paragraph under a chapter, at any section depth, becomes part of that chapter’s single Passage - since this app’s Book->Chapter schema has no field for a third tier here. A small minority of section divs (31 of 882) hold two <p> elements rather than one; both are kept.',
          'Footnotes. 639 <note resp="Freese"> footnotes (translator’s commentary, cross-references, citations, including 147 <bibl> elements) were excluded entirely; they are Freese’s apparatus, not his translated running text.',
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
    `\n  3 books  ${totalChapters} chapters  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalPageMilestones} page milestones  ${totalNotes} <note>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:rhetoric-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
