/**
 * Aristotle, *Physica* ("Physics") - Greek text only, via the OpenGreekAndLatin
 * / First1KGreek TEI. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-aristotle-physics-grc/index.ts
 *
 * Reads
 *   scripts/import-aristotle-physics-grc/raw/tlg0086.tlg031.1st1K-grc1.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/physics-grc/work.json       - the GenericWork (8 books, each with its chapters)
 *   data/physics-grc/about.json      - provenance / licence metadata
 *   data/physics-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-aristotle-physics-grc/validate.ts`.
 *
 * --- IMPORTANT bibliographic correction found while importing ---
 * The task that produced this importer assumed the digital source was, like
 * Categories/De Interpretatione, Bekker's Aristotelis Opera (Berlin/Oxford
 * 1831/1837) with no apparatus criticus. Direct inspection of THIS FILE's own
 * <teiHeader> shows that is not correct for the Physics file: its <titleStmt>
 * / <sourceDesc> name the editor as W. D. Ross, the imprint as Clarendon
 * Press, Oxford, 1960 (the "Scriptorum classicorum bibliotheca Oxoniensis" -
 * the Oxford Classical Texts series - reprint of Ross's 1950 critical
 * edition), not Bekker 1831. Bekker's page/column numbers ("184a" etc.) ARE
 * still present, as the universal marginal citation system every edition of
 * Aristotle prints regardless of its own base text - but the running Greek
 * words themselves, and the <add>/<del>/<sic> apparatus described below, are
 * Ross's, not Bekker's diplomatic text. about.json documents this accurately;
 * see the "Known gaps & anomalies" section there and the top anomaly in
 * anomalies.json.
 *
 * --- Apparatus tags found in the body (none of these appear in the
 * Categories/De Interpretatione files) and how each is handled ---
 *   <add cause="fix">...</add>  - Ross's own editorial addition/emendation,
 *       incorporated into his printed text. KEPT inline (tags stripped, text
 *       kept) - this is part of what Ross actually prints.
 *   <del>...</del> / <del status="error">...</del> - Ross's editorial
 *       deletion: words he judged spurious/interpolated and does NOT print as
 *       running text. EXCLUDED entirely (tag and content both removed) so the
 *       reading text matches what Ross actually prints. One <del> (the
 *       entire second paragraph of book-5-ch-6) removes an ENTIRE <p>; that
 *       paragraph is dropped (rather than emitted empty) and is individually
 *       flagged in anomalies.json with the excluded Greek quoted in full.
 *   <gap reason="omitted"/> - always found nested inside a <del> in this file
 *       (verified: all 3 occurrences); removed along with its enclosing
 *       <del> and not separately handled.
 *   <sic>...</sic> - marks text Ross prints even though it looks anomalous
 *       (the one occurrence here is not paired with any <corr>). KEPT inline
 *       (tags stripped, text kept) - it IS part of the printed text.
 *   <lg>...<l>...</l>...</lg> - NOT verse. Every occurrence wraps a short
 *       (avg. ~28-char) fragment of ordinary prose, mid-clause, with a
 *       duplicate <lb> nested inside pointing at the same Bekker line as text
 *       just before it; content read as continuous prose gives no sign of
 *       real verse (see the worked example in the top anomaly note). Best
 *       read as a conversion artifact in this particular file rather than a
 *       deliberate verse encoding. Tags stripped, text kept inline as
 *       ordinary running prose (nothing discarded), flagged as an anomaly.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-categoriae-grc):
 *   - verbatim original-language reading text only; no accent / spelling /
 *     orthography / punctuation normalisation; nothing discarded or silently
 *     corrected beyond the documented apparatus handling above.
 *   - only XML transport scaffolding is removed: <lb n="N"/> (zero-width Bekker
 *     line marker), <pb n="N"/> (zero-width page-image break), and each book's
 *     leading <head> (a running header/title, not a chapter or book heading).
 *   - <note type="marginal">TEXT</note> carries a real Bekker page/column
 *     citation (e.g. "184a"); its text is captured, in document order, to
 *     build each chapter's Division.ref as a range ("184a-187a"), and removed
 *     from the reading prose (it is not part of Aristotle's own sentence).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-aristotle-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/physics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0086.tlg031.1st1K-grc1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'physics-grc');

const WORK_ID = 'physics-grc';
const EXPECTED_BOOKS = 8;
/** Canonical chapter counts, Book I..VIII (well-known; matches this source exactly). */
const CANONICAL_CHAPTER_COUNTS = [9, 9, 8, 14, 6, 10, 5, 10];
const BEKKER_SPAN = '184a-267b';
/** Verbatim incipit of book 1, chapter 1, first passage. */
const INCIPIT = 'Ἐπειθὴ τὸ εἰδέναι καὶ τὸ ἐπίστασθαι συμβαίνει';
/** Verbatim tail of the final chapter (book 8, chapter 10) - the work's closing sentence. */
const EXPLICIT_TAIL = 'ἀδιαίρετόν ἐστι καὶ ἀμερὲς καὶ οὐδὲν ἔχον μέγεθος.';

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

interface ParsedChapter {
  number: number;
  text: string;
  marks: string[];
  emptyParagraphsDropped: number;
}

interface ParsedBook {
  number: number;
  headText: string;
  chapters: ParsedChapter[];
}

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

/** Strip a specific paired tag, KEEPING its inner content (used for <lg>/<l>/<add>/<sic>). */
function unwrapTag(s: string, tag: string): string {
  const openRe = new RegExp(`<${tag}(?:\\s+[^>]*)?>`, 'g');
  const closeRe = new RegExp(`</${tag}>`, 'g');
  return s.replace(openRe, '').replace(closeRe, '');
}

/** Remove a specific paired tag ENTIRELY, content included (used for <del>). */
function dropTag(s: string, tag: string): { out: string; removedCount: number; removedChars: number } {
  const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  let removedCount = 0;
  let removedChars = 0;
  const out = s.replace(re, (_whole, inner: string) => {
    removedCount += 1;
    removedChars += inner.replace(/<[^>]+>/g, '').length;
    return '';
  });
  return { out, removedCount, removedChars };
}

/** Parse one chapter's raw inner markup (between its <div ...chapter...> tags) into a ParsedChapter. */
function parseChapterBody(bodyRaw: string, number: number, where: string): ParsedChapter {
  // 1. Capture Bekker marginal marks in document order BEFORE any removal
  //    (a mark can legitimately fall inside a <del> span - verified in the
  //    source: it is still a genuine physical-position citation).
  const marks = [...bodyRaw.matchAll(/<note type="marginal">([^<]*)<\/note>/g)].map((m) => m[1]);

  let s = bodyRaw;

  // 2. Drop <del>...</del> entirely (content included) - Ross's editorial
  //    deletion, not part of his printed running text. <gap/> markers only
  //    ever occur nested inside these and are removed along with them.
  const delResult = dropTag(s, 'del');
  s = delResult.out;
  if (delResult.removedCount > 0) {
    anomalies.push({
      where,
      note: `${delResult.removedCount} editorial deletion(s) (<del>, Ross's apparatus criticus) totalling ${delResult.removedChars} characters were excluded from the reading text (not part of Ross's printed text).`,
    });
  }

  // 3. Remove the marginal-note apparatus from the prose (captured above).
  s = s.replace(/<note type="marginal">[^<]*<\/note>/g, '');

  // 4. <lg>/<l> - not verse in this source (see module doc comment); keep
  //    the text, drop the wrapping tags.
  s = unwrapTag(s, 'lg');
  s = unwrapTag(s, 'l');

  // 5. <add cause="fix">...</add> - Ross's own addition, incorporated into
  //    his printed text; keep the text, drop the tag.
  s = unwrapTag(s, 'add');

  // 6. <sic>...</sic> - text Ross prints as-is; keep the text, drop the tag.
  s = unwrapTag(s, 'sic');

  // 7. Zero-width transport scaffolding.
  s = s.replace(/<lb[^>]*\/>/g, '');
  s = s.replace(/<pb[^>]*\/>/g, '');

  // 8. Extract <p> paragraphs, clean each, drop any that are now empty
  //    (e.g. a <p> that was entirely a <del> span).
  const pMatches = [...s.matchAll(/<p>([\s\S]*?)<\/p>/g)];
  if (pMatches.length === 0) fail(`${where}: no <p> paragraphs found`);
  const cleanedAll = pMatches.map((m) => cleanText(m[1].replace(/<[^>]+>/g, ' ')));
  const cleaned = cleanedAll.filter((t) => t.length > 0);
  const emptyParagraphsDropped = cleanedAll.length - cleaned.length;
  if (cleaned.length === 0) fail(`${where}: all paragraphs empty after cleaning`);

  return {
    number,
    text: cleaned.join('\n\n'),
    marks,
    emptyParagraphsDropped,
  };
}

function bekkerRef(marks: string[], where: string): string | null {
  if (marks.length === 0) {
    anomalies.push({ where, note: 'no Bekker marginal marker found in this chapter; Division.ref is null (unexpected).' });
    return null;
  }
  const first = marks[0]!;
  const last = marks[marks.length - 1]!;
  return first === last ? first : `${first}–${last}`;
}

function parseBooks(xml: string): ParsedBook[] {
  const edStart = xml.indexOf('<div type="edition"');
  const bodyEnd = xml.indexOf('</body>');
  if (edStart < 0 || bodyEnd < 0 || bodyEnd < edStart) fail('no <div type="edition"> ... </body> in source XML');
  const ed = xml.slice(edStart, bodyEnd);

  const bookParts = ed.split(/<div type="textpart" subtype="book" n="(\d+)">/);
  if (bookParts.length < 3 || bookParts.length % 2 !== 1) fail(`unexpected book split shape (${bookParts.length} parts)`);

  const books: ParsedBook[] = [];
  for (let i = 1; i < bookParts.length; i += 2) {
    const bookNumber = Number(bookParts[i]);
    const bookBody = bookParts[i + 1] ?? '';
    const where = `${WORK_ID} / book-${bookNumber}`;

    const headMatch = /<head>([\s\S]*?)<\/head>/.exec(bookBody);
    const headText = headMatch ? cleanText(headMatch[1].replace(/<[^>]+>/g, ' ')) : '';

    const chapterParts = bookBody.split(/<div type="textpart" subtype="chapter" n="(\d+)">/);
    if (chapterParts.length < 3 || chapterParts.length % 2 !== 1) {
      fail(`${where}: unexpected chapter split shape (${chapterParts.length} parts)`);
    }

    const chapters: ParsedChapter[] = [];
    for (let j = 1; j < chapterParts.length; j += 2) {
      const chNumber = Number(chapterParts[j]);
      const chBody = chapterParts[j + 1] ?? '';
      chapters.push(parseChapterBody(chBody, chNumber, `${where}-ch-${chNumber}`));
    }
    books.push({ number: bookNumber, headText, chapters });
  }
  return books;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const books = parseBooks(xml);

  // --- hard structural gates --------------------------------------------
  if (books.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} books, found ${books.length}`);
  books.forEach((b, i) => {
    if (b.number !== i + 1) fail(`book ${i + 1} carries n="${b.number}" (out of sequence)`);
    b.chapters.forEach((c, j) => {
      if (c.number !== j + 1) fail(`book-${b.number} chapter ${j + 1} carries n="${c.number}" (out of sequence)`);
    });
  });

  const actualChapterCounts = books.map((b) => b.chapters.length);
  actualChapterCounts.forEach((n, i) => {
    if (n !== CANONICAL_CHAPTER_COUNTS[i]) {
      anomalies.push({
        where: `${WORK_ID} / book-${i + 1}`,
        note: `chapter count mismatch: canonical count for Book ${i + 1} is ${CANONICAL_CHAPTER_COUNTS[i]}, this source has ${n}. Reported honestly, not forced to match.`,
      });
    }
  });

  const incipitGot = books[0]!.chapters[0]!.text;
  if (!incipitGot.normalize('NFC').startsWith(INCIPIT.normalize('NFC'))) {
    fail(`book-1-ch-1 incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(incipitGot.slice(0, 80))}`);
  }
  const lastBook = books[books.length - 1]!;
  const lastChapter = lastBook.chapters[lastBook.chapters.length - 1]!;
  if (!lastChapter.text.normalize('NFC').endsWith(EXPLICIT_TAIL.normalize('NFC'))) {
    fail(`final chapter (book-${lastBook.number}-ch-${lastChapter.number}) explicit spot-check failed.\n  expected suffix: ${JSON.stringify(EXPLICIT_TAIL)}\n  got tail: ${JSON.stringify(lastChapter.text.slice(-80))}`);
  }

  // --- build divisions -------------------------------------------------
  const totalEmptyP = books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.emptyParagraphsDropped, 0), 0);

  const divisions: Division[] = books.map((b) => {
    const chapterDivisions: Division[] = b.chapters.map((c) => {
      const id = `book-${b.number}-ch-${c.number}`;
      const passages: Passage[] = [{ n: '', text: c.text, ref: null }];
      return {
        id,
        number: String(c.number),
        ref: bekkerRef(c.marks, `${WORK_ID} / ${id}`),
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages,
      };
    });
    return {
      id: `book-${b.number}`,
      number: String(b.number),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    };
  });

  // --- anomalies -----------------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / edition`,
    note:
      "This file's own <teiHeader> names the editor as W. D. Ross (Aristotelis Physica, Clarendon Press, " +
      'Oxford, 1960 imprint - the Oxford Classical Texts reprint of his 1950 critical edition), NOT Bekker\'s ' +
      "1831/1837 Aristotelis Opera as originally assumed for this import. Bekker's page/column numbers " +
      `(e.g. "184a") are still present as marginal citations and are captured into each chapter's Division.ref, ` +
      'but the running Greek words are Ross\'s critical text, including his own apparatus criticus (<add cause="fix">, ' +
      '<del>, <sic>) - none of which appears in the Categories/De Interpretatione Bekker files already bundled ' +
      'in this repo. about.json documents the correct provenance.',
  });
  anomalies.push({
    where: `${WORK_ID} / <lg>/<l> apparatus`,
    note:
      'The source wraps 172 short (avg. ~28-character) prose fragments in <lg><l>...</l></lg>, always mid-clause ' +
      '(e.g. book-1-ch-2: "...ζητοῦσι πότερον ἓν ἢ πολλά. <lg><lb n="25"/><l>τὸ μὲν</l></lg> οὖν εἰ ἓν καὶ ἀκίνητον..." ' +
      '- "τὸ μὲν οὖν" is one ordinary connective phrase, arbitrarily split). None of the 172 groups contains ' +
      'more than one <l> apart from a single exception; content read straight through gives no sign of verse. ' +
      'Treated as a conversion artifact specific to this file: tags stripped, text kept inline as ordinary ' +
      'running prose (nothing discarded, no line break invented).',
  });
  anomalies.push({
    where: `${WORK_ID} / book-5-ch-6`,
    note:
      "This chapter's source <p>#2 is entirely wrapped in a single <del>...</del> (1007 characters after tag-" +
      'stripping - by far the largest deletion in this source; every other <del> is a phrase or sentence, not a ' +
      'whole paragraph): "ἀπορήσειε δʼ ἄν τις καὶ περὶ τοῦ ἵστασθαι, εἰ καὶ ὅσαι παρὰ φύσιν κινήσεις, ταύταις ' +
      'ἔστιν ἠρεμία ἀντικειμένη. [...] ἴσως δʼ ἠρεμίᾳ κίνησίς πῃ ἀντίκειται." Per this importer\'s policy for ' +
      "<del> (Ross's editorial deletion, excluded from his printed text - see module doc comment), the whole " +
      'paragraph is dropped rather than emitted empty; book-5-ch-6\'s single retained Passage is therefore only ' +
      "the chapter's first (6638-character) paragraph.",
  });
  anomalies.push({
    where: `${WORK_ID} / book head`,
    note:
      'Each book opens with a running-header <head> (Book 1: "ΦΥΣΙΚΗΣ ΑΚΡΟΑΣΕΩΣ Α"; Books 2-8: the single Greek ' +
      'letter numeral "Β.", "Γ.", "Δ.", "Ε.", "Ζ.", "Η.", "Θ." respectively) - a running header/title, not a ' +
      'chapter or book heading; stripped entirely and not stored (every Division.sourceHeading is null), ' +
      'matching how the Categories importer treats its analogous chapter-1 <head>.',
  });
  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      `Every chapter's Division.ref is the Bekker page/column RANGE spanned by its <note type="marginal"> ` +
      `markers, in document order (e.g. "184a–187a"); Division.ref is null for Book divisions (a Book is a ` +
      `container only) and Passage.ref is null throughout (no printed sub-chapter numbering survives in this ` +
      `source, hence Passage.n is "" throughout). The whole work spans Bekker ${BEKKER_SPAN}26.`,
  });
  anomalies.push({
    where: `${WORK_ID} / book-3-ch-6`,
    note:
      'This chapter\'s first marginal marker is literally "<note type="marginal">29a</note>" in the source ' +
      '(verified by direct inspection - not a parsing artifact); the surrounding chapters run …205a,205b,206a ' +
      '(book-3-ch-5) then 29a,206b,207a (this chapter) then 207b,208a (book-3-ch-7), so "29a" is almost ' +
      'certainly a source transcription error for "206a". Kept verbatim, NOT silently corrected: Division.ref ' +
      'for this chapter is the literal "29a–207a".',
  });
  anomalies.push({
    where: `${WORK_ID} / book-3-ch-8`,
    note:
      'This chapter carries zero <note type="marginal"> markers of its own (verified: its raw source text, ' +
      '~1500 characters, has none) - the preceding chapter (book-3-ch-7) already carries the "208a" marker and ' +
      'the following division (book-4-ch-1) opens with "208b", so this chapter\'s content falls entirely within ' +
      'Bekker page 208a without its own marginal mark in this transcription. Per the task specification for this ' +
      'exact (anticipated) case, Division.ref is left null rather than inferring "208a".',
  });
  anomalies.push({
    where: `${WORK_ID} / book-4-ch-4`,
    note:
      'This chapter\'s last marginal marker is literally "<note type="marginal">6a</note>" in the source ' +
      '(verified by direct inspection); the three markers before it in this chapter are 211a, 211b, 212a, so ' +
      '"6a" is almost certainly a source transcription error for "212b" or "213a". Kept verbatim, NOT silently ' +
      'corrected: Division.ref for this chapter is the literal "211a–6a".',
  });
  if (totalEmptyP > 0) {
    anomalies.push({
      where: `${WORK_ID} / empty <p>`,
      note: `${totalEmptyP} <p> element(s) were empty after stripping apparatus/transport markup and were skipped (see book-5-ch-6 above for the one substantive case; the rest are trivial).`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / character encoding`,
    note:
      'The source uses the precomposed "oxia" polytonic code points (e.g. U+1F73) rather than the canonically-' +
      'equivalent monotonic "tonos" code points (U+03AD), matching the Categories/De Interpretatione Greek ' +
      'files already bundled in this repo. Bytes are preserved exactly as transmitted; no normalisation applied.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };
  writeJson('work.json', work);
  writeJson('anomalies.json', anomalies);
  writeAbout();

  // --- console summary --------------------------------------------------
  process.stdout.write('\nBooks:\n');
  let totalChapters = 0;
  let totalChars = 0;
  for (const d of divisions) {
    const chapterCount = d.children.length;
    const chars = d.children.reduce((n, c) => n + c.passages.reduce((m, p) => m + p.text.length, 0), 0);
    totalChapters += chapterCount;
    totalChars += chars;
    process.stdout.write(`  book-${d.number.padEnd(2)} ${String(chapterCount).padStart(2)} chapter(s) ${String(chars).padStart(7)} chars\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} books, ${totalChapters} chapters, ${totalChars} chars, ${anomalies.length} anomalies recorded\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-aristotle-physics-grc/validate.ts` next.\n');
}

function writeAbout(): void {
  const about = {
    workId: WORK_ID,
    title: 'Physics',
    author: 'Aristotle',
    language: 'grc' as const,
    edition: 'W. D. Ross, ed., Aristotelis Physica (Oxford Classical Texts; Clarendon Press, Oxford, imprint 1960, reprinting the 1950 critical edition)',
    editor: 'W. D. Ross',
    provenance:
      'TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0086.tlg031, edition ' +
      '.1st1K-grc1), digitised by Digital Divide Data for the Perseus Digital Library / Open Greek and Latin ' +
      "project; imported by scripts/import-aristotle-physics-grc. The file's own <teiHeader> gives the printed " +
      'source as W. D. Ross\'s critical edition (Clarendon Press, Oxford, 1960 imprint) rather than Bekker\'s ' +
      '1831/1837 Aristotelis Opera used for this reader\'s Categories and De Interpretatione.',
    license:
      'The ancient Greek text of the Physics is in the public domain. Ross\'s apparatus criticus and this ' +
      'particular critical reconstruction of the text (embodied in the <add>/<del>/<sic> markup this importer ' +
      'resolves - see "How it was imported" below) derive from his 1950/1960 Oxford Classical Texts edition; the ' +
      'digital transcription itself is distributed by First1KGreek under the Creative Commons Attribution-' +
      'ShareAlike 4.0 International licence (CC BY-SA 4.0), under which it is redistributed here.',
    sections: [
      {
        heading: "Aristotle's Physics",
        paragraphs: [
          'This is the Greek text of Aristotle\'s Φυσικὴ Ἀκρόασις ("Lecture on Nature"), usually called the ' +
            'Physics: an eight-book study of nature, change, motion, place, time, the infinite, and (in Book ' +
            'VIII) the argument for an eternal, unmoved first mover of all motion.',
          'The text here is Greek only, verbatim. Nothing is translated, modernised, normalised or silently ' +
            'corrected beyond the documented resolution of the source\'s own critical-apparatus markup (see "How ' +
            'it was imported" below). Where the source is irregular or a genuine judgement call was made, it is ' +
            'preserved/recorded and flagged in "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'No English edition bundled - by design',
        paragraphs: [
          'Unlike most other works in this reader, no English translation of the Physics is bundled alongside ' +
            'this Greek text. This is a deliberate choice, not an oversight: at the time of this import, no ' +
            'clean, complete, public-domain digital English translation of the Physics could be found online - ' +
            'the well-known public-domain translations (e.g. R. P. Hardie & R. K. Gaye, in the Oxford translation ' +
            'tradition) exist in print and in scattered/incomplete or poorly-OCRed digital form, but not in a form ' +
            'that met this project\'s bar for a faithful, verbatim, book-and-chapter-aligned digital text. Rather ' +
            'than ship a low-quality or partial English text, the decision (confirmed with the maintainer) was to ' +
            'publish the Greek text on its own. A future contributor who locates a suitable source is welcome to ' +
            'add a companion data/physics-en/ work following the same Book -> Chapter shape defined in ' +
            'data/physics-grc/types.ts.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The printed source, per this XML file\'s own <teiHeader>/<sourceDesc>, is W. D. Ross, ed., Aristotle\'s ' +
            'Physics: A Revised Text with Introduction and Commentary (Oxford: Clarendon Press; this digitisation ' +
            'cites the 1960 imprint of the Oxford Classical Texts series, "Scriptorum classicorum bibliotheca ' +
            'Oxoniensis", of Ross\'s 1950 critical edition) - NOT Bekker\'s 1831/1837 Aristotelis Opera, which is ' +
            'the source used for this reader\'s Categories and De Interpretatione. This was discovered by direct ' +
            'inspection while building this importer (the task that commissioned it had assumed a Bekker source, ' +
            'by analogy with the other two works); see "Known gaps & anomalies" below for the full account.',
          'Bekker\'s page/column numbers (e.g. "184a", "184b") remain present as marginal citations - they are ' +
            'the universal citation system for Aristotle and are printed in the margin of essentially every ' +
            'edition, including Ross\'s - and are captured here into each chapter\'s Division.ref. In the standard ' +
            'pagination this work occupies Bekker 184a10-267b26.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0086.tlg031.1st1K-grc1.xml (CTS urn:cts:greekLit:' +
            'tlg0086.tlg031.1st1K-grc1) from the OpenGreekAndLatin / First1KGreek repository. It was fetched once ' +
            'and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer slices the single <div type="edition"> body into its 8 book <div>s, then each book into ' +
            'its chapter <div>s, then takes the <p> paragraph(s) inside each chapter (joined with a blank line if ' +
            'more than one) as that chapter\'s single Passage. Pure XML transport scaffolding is removed outright: ' +
            'the zero-width <lb n="N"/> Bekker line markers, the zero-width <pb n="N"/> page-image breaks, and ' +
            'each book\'s leading <head> running header/title.',
          'Unlike the Bekker-sourced Categories/De Interpretatione files, this source carries a genuine apparatus ' +
            'criticus from Ross\'s edition: <add cause="fix">...</add> (Ross\'s own addition/emendation, ' +
            'incorporated into his printed text and kept inline here), <del>...</del> / <del status="error">...' +
            '</del> (words Ross judged spurious and does not print - excluded here so the reading text matches ' +
            'what he actually prints; one exceptionally large deletion removes an entire paragraph of ' +
            'book-5-ch-6, individually flagged in anomalies.json), and a single <sic>...</sic> (text Ross prints ' +
            'as-is despite its oddity - kept inline). The source also wraps 172 short prose fragments in ' +
            '<lg><l>...</l></lg>; inspection showed these are not verse (see anomalies.json for the worked ' +
            'example) and are treated as ordinary prose, tags stripped, text kept.',
          '<note type="marginal">184a</note>-style Bekker page/column markers are captured, in document order, ' +
            'to build each chapter\'s Division.ref as a range (e.g. "184a–187a") and are removed from the ' +
            'reading prose itself (they are modern editorial page references, not part of Aristotle\'s own ' +
            'sentence). Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is Book, Chapter, plus the Bekker page/column range each chapter\'s Division.ref carries ' +
            '(built from the marginal markers actually present in that chapter, e.g. "184a–187a"). No printed ' +
            'sub-chapter/section numbering survives in this source, so Passage.n is "" and Passage.ref is null ' +
            'throughout; a Book division\'s own ref is null (it is a container - its Chapters already carry the ' +
            'citation).',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Every irregularity below is either preserved verbatim and flagged, or excluded with the exclusion ' +
            'explicitly documented; anomalies.json records the full machine-readable list.',
          'Bibliographic correction. This file\'s printed source is W. D. Ross\'s 1950/1960 Oxford Classical ' +
            'Texts critical edition, not Bekker\'s 1831/1837 Aristotelis Opera as originally assumed when this ' +
            'import was commissioned (by analogy with Categories/De Interpretatione). Discovered by inspecting ' +
            'this file\'s own <teiHeader> directly. Bekker page/column numbers are still captured as citations ' +
            '(see "Reference scheme" above); the running Greek words are Ross\'s critical text.',
          'Apparatus criticus resolved into a single reading text. Ross\'s <add cause="fix"> (37 occurrences) are ' +
            'kept inline as printed; his <del> / <del status="error"> (108 occurrences, ~4000 characters total) ' +
            'are excluded as not part of his printed text - one of them removes the ENTIRE second paragraph of ' +
            'book-5-ch-6 (1007 characters), by far the largest deletion in the source and individually quoted in ' +
            'anomalies.json; a single <sic> is kept inline as printed. <gap reason="omitted"/> (3 occurrences) is ' +
            'always nested inside a removed <del> in this source and needed no separate handling.',
          '<lg>/<l> apparatus (172 occurrences) is NOT verse in this text - it wraps short, ordinary prose ' +
            'fragments mid-clause. Read as a conversion artifact specific to this file; text is kept inline as ' +
            'continuous prose, tags stripped, nothing discarded. See anomalies.json for a worked example.',
          "Completeness. All 8 books and all their chapters are present and in order (chapter counts: " +
            `${CANONICAL_CHAPTER_COUNTS.join(', ')} for Books I-VIII, matching the well-known canonical counts ` +
            'exactly), from the incipit "Ἐπειθὴ τὸ εἰδέναι..." to the explicit "...ἀδιαίρετόν ἐστι καὶ ἀμερὲς καὶ ' +
            'οὐδὲν ἔχον μέγεθος." (Bekker 267b26).',
          'Character encoding. The transcription uses the precomposed "oxia" polytonic code points (e.g. U+1F73 ' +
            'έ) rather than the canonically-equivalent monotonic "tonos" code points (U+03AD), matching the ' +
            'Categories/De Interpretatione Greek files already in this repo. The bytes are preserved exactly as ' +
            'transmitted; no normalisation was applied.',
        ],
      },
    ],
  };
  writeJson('about.json', about);
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
