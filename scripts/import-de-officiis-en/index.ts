/**
 * Cicero, De Officiis - English translation (Walter Miller, Loeb Classical
 * Library, 1913; Cambridge, MA: Harvard University Press; London: William
 * Heinemann Ltd; CTS urn:cts:latinLit:phi0474.phi055.perseus-eng1). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-de-officiis-en/index.ts
 *
 * Reads scripts/import-de-officiis-en/raw/phi0474.phi055.perseus-eng1.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/de-officiis-en/work.json       - the GenericWork (3 Books, each a
 *                                          flat list of Section divisions,
 *                                          one Passage each)
 *   data/de-officiis-en/about.json      - provenance / licence / prose
 *   data/de-officiis-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-officiis-en/validate.ts`.
 *
 * --- Source structure (confirmed by direct inspection - NOT identical to
 *     the Latin sibling despite being the same Perseus work) ---
 * Only `<div type="textpart" n="…" subtype="book">` divs exist (3 of them);
 * there is NO `subtype="section"` div anywhere in this witness. Each book
 * div opens with a verbatim `<head>` rubric, then is one continuous run of
 * `<p>` elements. Sections are marked purely by inline
 * `<milestone unit="section" n="N"/>` markers scattered through that
 * continuous prose - and they do NOT reliably align to `<p>` boundaries:
 * direct inspection found 36 of 482 `<p>` elements with running text BEFORE
 * their first section milestone, and 50 containing MORE than one section
 * milestone (i.e. a single `<p>` can span a section boundary, or several).
 *
 * Consequently this importer does NOT use `<p>` as the section-splitting
 * unit (unlike every other Book->Section/Book->Chapter importer in this
 * app). Instead it treats each `<milestone unit="section" n="N"/>` as a
 * hard split point in the continuous text stream: whatever has accumulated
 * in the current paragraph buffer up to that point is flushed as a
 * paragraph chunk of the section IN EFFECT BEFORE the marker, then the
 * "current section" state switches to N and a fresh buffer starts. A `</p>`
 * close is ALSO a flush point (so real paragraph breaks are preserved),
 * attributing whatever's in the buffer to whichever section is current at
 * that point. The result: a `<p>` with no milestone inside it becomes one
 * ordinary paragraph of the current section (the common case); a `<p>` that
 * crosses a section boundary is split into two (or more) paragraph chunks,
 * one per section, at the exact marker position - never guessed at a `<p>`
 * or sentence boundary.
 *
 * KNOWN SOURCE BUG (logged individually, not silently "fixed"): Book III's
 * own `<div ... n="1" subtype="book">` attribute is mislabeled "1" (it
 * should read "3" - Book I already used "1"). Confirmed via three
 * independent signals: (a) it is the THIRD book div in document order,
 * (b) its own `<head>` rubric reads "Book III: the conflict between the
 * right and the expedient", and (c) the Latin sibling's third book div
 * correctly reads n="3". This importer numbers books by their position in
 * document order (cross-checked against the `<head>` text) rather than
 * trusting this witness's own `n` attribute for Book III; the reading TEXT
 * itself is never touched by this - only which Division id/number the book
 * is filed under.
 *
 * Faithfulness rules (mirrors scripts/import-de-officiis-la):
 *   - verbatim English (Miller's own 1913 translation) reading text only.
 *   - `<milestone unit="chapter" .../>` values seed Division.ref exactly as
 *     in the Latin sibling (nearest preceding value, carried forward across
 *     sections, reset to null at the start of each book); the sibling's
 *     45/25/33 chapter counts per book are cross-checked and agree exactly.
 *     `<milestone unit="alternatesection" .../>` (5 occurrences, matching
 *     the Latin sibling) is dropped as scaffolding, not used for anything.
 *   - `<note>` and `<note type="marg">` (392 total) are Miller's own
 *     footnotes and marginal summary glosses - translator's commentary, not
 *     part of his translated running text - excluded entirely (tag AND
 *     content), matching this app's established Rackham/Bywater <note>
 *     convention.
 *   - `<hi rend="italics">` (typographic emphasis), `<foreign>` (Cicero's
 *     own untranslated Greek quotes, in Miller's transliteration), `<l>`
 *     (verse lines - e.g. Miller's translation of the Accius quotation in
 *     3.102), `<sp>`/`<speaker>` (the two speaker labels in that same verse
 *     quotation, "Thyestes."/"Atreus.") and `<cit>`/`<bibl>`/`<quote>` are
 *     all unwrapped: pure typographic/structural markup around genuine
 *     translated text, never dropped.
 *   - this witness carries no `<del>`, `<add>` or `<gap>` (confirmed by
 *     direct inspection) - Miller's English has no counterpart to the
 *     Latin apparatus.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-officiis-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi055.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-officiis-en');

const WORK_ID = 'de-officiis-en';

interface Anomaly {
  where: string;
  note: string;
}

const EXPECTED_SECTION_COUNTS = [161, 89, 121];
const EXPECTED_HEADINGS = ['Book I: Moral Goodness', 'Book II: Expediency', 'Book III: the conflict between the right and the expedient'];

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<body');
  const textEnd = xml.indexOf('</body>');
  if (textStart < 0 || textEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const BOOK_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="book")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const tokenRe = new RegExp(
    `${BOOK_OPEN}|<\\/div>|<head\\b[^>]*>|<\\/head>|<p\\b[^>]*>|<\\/p>|<note\\b[^>]*>|<\\/note>|<milestone\\b[^>]*\\/>|<[^>]+>`,
    'g',
  );

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'head' | 'other'> = [];
  let bookIndex = 0; // 1-based, by document order (see module doc re: the Book III n="1" bug)
  let currentBookDiv: Division | null = null;
  let currentChapterRef: string | null = null;
  let currentSectionNum: string | null = null;
  let sectionOrder: string[] = [];
  let sectionParas: Map<string, string[]> = new Map();
  /** first chapter-ref state seen for each section number, filled in as each section's marker is reached */
  let sectionRefs: Map<string, string | null> = new Map();
  let preambleChars = 0;

  let inP = false;
  let buf = '';
  let inHead = false;
  let headBuf = '';
  let noteDepth = 0;

  let totalSectionsFromMilestones = 0;
  let totalChapterMilestones = 0;
  let totalAltSectionMilestones = 0;
  let totalNotes = 0;
  let totalEmptyChunksDropped = 0;

  function flush(): void {
    const cleaned = cleanText(buf);
    buf = '';
    if (cleaned.length === 0) {
      if (currentSectionNum !== null) totalEmptyChunksDropped += 1;
      return;
    }
    if (currentSectionNum === null) {
      // text before the very first section milestone of this book - not expected (every
      // book's first <p> opens directly with its milestone), but never silently dropped.
      preambleChars += cleaned.length;
      anomalies.push({
        where: `book-${bookIndex}`,
        note: `${cleaned.length} char(s) of running text found before this book's first section milestone: "${cleaned.slice(0, 120)}"; this app's schema has nowhere to file unnumbered text, so it is prepended to section 1 instead of dropped.`,
      });
      if (!sectionParas.has('1')) {
        sectionParas.set('1', []);
        sectionOrder.push('1');
      }
      sectionParas.get('1')!.unshift(cleaned);
      return;
    }
    if (!sectionParas.has(currentSectionNum)) {
      sectionParas.set(currentSectionNum, []);
      sectionOrder.push(currentSectionNum);
    }
    sectionParas.get(currentSectionNum)!.push(cleaned);
  }

  function openBook(headSourceN: string): void {
    bookIndex += 1;
    if (headSourceN !== String(bookIndex)) {
      anomalies.push({
        where: `book-${bookIndex}`,
        note: `source XML's own <div subtype="book" n="${headSourceN}"> attribute does not match this book's position in document order (expected "${bookIndex}"); this is a known bug in this Perseus witness (Book III's div is mislabeled n="1") — confirmed via its own <head> rubric and the Latin sibling. Filed under book-${bookIndex} by document order, not by this witness's own (wrong) n attribute; no reading text is affected.`,
      });
    }
    currentBookDiv = {
      id: `book-${bookIndex}`,
      number: String(bookIndex),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [],
    };
    divisions.push(currentBookDiv);
    currentChapterRef = null;
    currentSectionNum = null;
    sectionOrder = [];
    sectionParas = new Map();
    sectionRefs = new Map();
  }

  function closeBook(): void {
    if (!currentBookDiv) fail('</div> closed a book that was never opened');
    for (const secNum of sectionOrder) {
      const paras = sectionParas.get(secNum)!;
      const text = paras.join('\n\n');
      if (text.length === 0) fail(`book-${bookIndex} sec-${secNum} has no surviving paragraph text`);
      const passage: Passage = { n: '', text, ref: null };
      const sectionDiv: Division = {
        id: `book-${bookIndex}-sec-${secNum}`,
        number: secNum,
        ref: sectionRefs.get(secNum) ?? null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
      currentBookDiv.children.push(sectionDiv);
    }
    currentBookDiv = null;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inHead) headBuf += free;
      else if (inP && noteDepth === 0) buf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      stack.push('book');
      openBook(m[1]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'book') closeBook();
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<head\b/.test(tok)) {
      stack.push('head');
      inHead = true;
      headBuf = '';
    } else if (tok === '</head>') {
      stack.pop();
      inHead = false;
      if (!currentBookDiv) fail('</head> closed outside any book');
      (currentBookDiv as Division).sourceHeading = cleanText(headBuf);
    } else if (/^<p\b/.test(tok)) {
      inP = true;
    } else if (tok === '</p>') {
      flush();
      inP = false;
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'section' && nMatch?.[1] && noteDepth === 0) {
        flush(); // split point: whatever's buffered belongs to the OLD section
        currentSectionNum = nMatch[1];
        if (!sectionRefs.has(currentSectionNum)) sectionRefs.set(currentSectionNum, currentChapterRef);
        totalSectionsFromMilestones += 1;
      } else if (unitMatch?.[1] === 'chapter' && nMatch?.[1] && noteDepth === 0) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
        // a chapter boundary can coincide with (or fall inside) a section; keep the
        // just-opened section's ref in sync if this is its first content.
        if (currentSectionNum !== null) sectionRefs.set(currentSectionNum, currentChapterRef);
      } else if (unitMatch?.[1] === 'alternatesection') {
        totalAltSectionMilestones += 1;
      }
    }
    // catch-all `<[^>]+>` (hi/foreign/l/sp/speaker/cit/bibl/quote/pb/emph and their ilk):
    // no structural action - their text already flows into buf/headBuf via the free-text
    // capture above (suppressed only while noteDepth > 0).
  }

  if (stack.length !== 0) fail(`unbalanced <div>/<head> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 3) fail(`expected exactly 3 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);

  // --- cross-check section counts ---
  const sectionCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTION_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) sectionCountMismatches.push(`Book ${i + 1}: parsed ${got} sections, expected ${want}`);
  });
  if (sectionCountMismatches.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / section counts`,
      note: `${sectionCountMismatches.length} book(s) parse to a section count different from the Latin sibling's: ${sectionCountMismatches.join('; ')}.`,
    });
  }

  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      'Unlike the Latin sibling, this English witness has no <div subtype="section"> at all - sections are ' +
      'marked purely by inline <milestone unit="section" n="N"/> in a continuous run of <p>s per book, and 50 ' +
      'of 482 <p> elements contain more than one such marker (36 more have running text before their first ' +
      "marker). The importer splits the text stream at each marker's exact position rather than at <p> " +
      'boundaries; see the module doc for the full algorithm. Despite the structural difference, this witness ' +
      "and the Latin sibling's own <div subtype=\"section\"> count agree exactly, section-for-section (161/89/121).",
  });
  anomalies.push({
    where: `${WORK_ID} / book III mislabeled`,
    note:
      'This witness\'s own <div subtype="book" n="…"> for Book III is mislabeled n="1" (duplicating Book I\'s ' +
      'own n value) instead of "3" - a genuine bug in this Perseus TEI file, confirmed via its <head> rubric ' +
      '("Book III: the conflict between the right and the expedient") and the correctly-numbered Latin sibling. ' +
      'This importer numbers books by document order (1st/2nd/3rd division encountered), not by this ' +
      "witness's own (wrong) n attribute; no reading text is affected, only which Division id the third book " +
      'is filed under. See also the per-book anomaly logged above at the point this was detected.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> / <note type="marg"> footnotes and marginal summary glosses (Miller's own translator's commentary, not his translated running text) were excluded entirely, tag and content; not logged individually given their number.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `${totalChapterMilestones} chapter milestones and ${totalSectionsFromMilestones} section milestones captured (matching the Latin sibling's 103 chapter milestones exactly); each section's Division.ref is the chapter value in effect when that section's own marker was reached, carried forward from the previous section if it introduced no new chapter itself, reset to null at the start of each book. This source also marks ${totalAltSectionMilestones} <milestone unit="alternatesection"/> markers (matching the Latin sibling) - dropped as scaffolding, not used for anything. Every Passage.ref is null throughout.`,
  });
  if (totalEmptyChunksDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyChunksDropped} text chunk(s) (delimited by a </p> close or a section-milestone split point) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }
  if (preambleChars > 0) {
    anomalies.push({
      where: `${WORK_ID} / structure`,
      note: `${preambleChars} char(s) total of running text were found before a book's first section milestone across this corpus; see the individual book-level anomaly note(s) above for exactly where.`,
    });
  }

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Officiis',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    edition: 'Loeb Classical Library, 1913',
    translator: 'Walter Miller',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi055.perseus-eng1), which digitises Walter Miller’s translation of Cicero, De Officiis (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1913 Loeb Classical Library edition - the same volume as the facing Latin text bundled as data/de-officiis-la); imported by scripts/import-de-officiis-en.',
    license:
      "Miller's 1913 translation is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Officiis — English, trans. Miller',
        paragraphs: [
          'This is Cicero’s De Officiis ("On Duties") in the English translation made by Walter Miller for the Loeb Classical Library, first published in 1913 alongside his own edition of the Latin. It stands beside the Latin text (data/de-officiis-la) already in this library as a facing English rendering of the same three-book treatise.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Miller’s own footnotes and marginal summary glosses (translator’s commentary, not part of the translated running text) are excluded - see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Walter Miller, trans., De Officiis, Loeb Classical Library (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1913). This translation is in the public domain.',
          'The work is divided into 3 Books and, within each Book, numbered sections (161, 89 and 121 respectively, matching the Latin sibling exactly, section-for-section) plus Cicero’s traditional chapter citation (45, 25 and 33 chapters per book, also matching the Latin sibling exactly).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi055.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi055.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Unlike the Latin sibling (which has explicit per-section <div>s), this English witness marks its sections purely with inline <milestone unit="section"/> markers scattered through a continuous run of <p> paragraphs per book - and those markers do not reliably fall at <p> boundaries. The importer therefore splits the text stream at each marker’s own exact position (not at a <p> or sentence boundary), attributing text to whichever section is "in effect", and re-derives paragraph breaks from the source’s own <p> boundaries within each section’s span (joined with a blank line when a section has more than one). See the importer’s module doc for the full algorithm.',
          'XML transport scaffolding only is removed: the inline chapter/section <milestone> markers (their values feed Division.ref and the section split, respectively) and purely typographic wrapper tags (<hi rend="italics">, <foreign>, <l> verse lines, <sp>/<speaker> speaker labels in one quoted verse passage, <cit>/<bibl>/<quote>) are unwrapped, their text flowing into the surrounding prose. 392 <note>/<note type="marg"> footnotes and marginal summary glosses - Miller’s own translator’s apparatus, not his translated text - are excluded entirely, tag and content. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Section, plus Cicero’s traditional chapter reference, reconstructed from this source’s own inline chapter milestones exactly as for the Latin sibling. A section’s Division.ref is the chapter value in effect when that section began, carried forward across sections with no chapter milestone of their own, reset to null at the start of each book. Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books and all 161/89/121 sections are present and in order, matching the Latin sibling exactly, section-for-section.',
          'Structural difference from the Latin sibling. This witness has no <div subtype="section"> at all; sections are reconstructed purely from inline <milestone unit="section"/> markers that do not align to <p> boundaries (36 of 482 <p>s have text before their first marker; 50 contain more than one marker). See "How it was imported".',
          'Book III mislabeled n="1" in the source XML. A genuine bug in this Perseus witness, confirmed via the book’s own <head> rubric and the correctly-numbered Latin sibling; resolved here by document order, with no effect on the reading text - see anomalies.json.',
          'Footnotes. 392 <note>/<note type="marg"> footnotes and marginal summary glosses (Miller’s own translator’s commentary) were excluded entirely; they are apparatus, not Cicero’s (translated) text.',
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
  let totalSections = 0;
  for (const b of divisions) {
    totalSections += b.children.length;
    for (const s of b.children) {
      totalPassages += s.passages.length;
      totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const want = EXPECTED_SECTION_COUNTS[Number(b.number) - 1];
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections (expected ${want})  "${b.sourceHeading}"\n`,
    );
  }
  process.stdout.write(
    `\n  3 books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalChapterMilestones} chapter milestones  ${totalNotes} <note>\n`,
  );
  for (let i = 0; i < EXPECTED_HEADINGS.length; i++) {
    if (divisions[i]?.sourceHeading !== EXPECTED_HEADINGS[i]) {
      process.stdout.write(`  WARNING: book-${i + 1} sourceHeading mismatch: ${JSON.stringify(divisions[i]?.sourceHeading)}\n`);
    }
  }
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-officiis-en/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
