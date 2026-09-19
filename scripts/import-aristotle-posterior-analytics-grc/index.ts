/**
 * Aristotle, *Posterior Analytics* (Ἀναλυτικῶν Ὑστέρων) — original Greek, via
 * Greek Wikisource. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-aristotle-posterior-analytics-grc/index.ts
 *
 * Reads
 *   scripts/import-aristotle-posterior-analytics-grc/raw/book1-wikisource.json
 *   scripts/import-aristotle-posterior-analytics-grc/raw/book2-wikisource.json
 * (already in the repo — the result of the MediaWiki `action=parse&prop=wikitext`
 * API for https://el.wikisource.org/wiki/Αναλυτικών_υστέρων/1 and /2). Writes:
 *   data/posterior-analytics-grc/work.json       - the GenericWork (Book -> Chapter)
 *   data/posterior-analytics-grc/about.json      - provenance / licence metadata + About prose
 *   data/posterior-analytics-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-aristotle-posterior-analytics-grc/validate.ts`.
 *
 * --- Source structure (confirmed by direct fetch of both pages) ---
 * Each page is plain wikitext:
 *   {{Κεφαλίδα| ... }}          front-matter header template (title/author/
 *                                prev-next book links) — scaffolding, dropped
 *   == Κεφάλαιο N ==            chapter heading, N a plain arabic numeral
 *   ... prose ...
 *   [[en:Posterior Analytics/1]]  trailing interwiki link — scaffolding, dropped
 *
 * Bekker page/column boundaries are marked inline, mid-prose, by
 * `{{χ|71a}}`-style templates (no line numbers — this source marks page/column
 * only). There is no praefatio division and no other wiki markup: direct
 * inspection confirmed no `''`/`'''` emphasis and no `[[wikilinks]]` anywhere
 * inside the chapter bodies (the only two `[[...]]` links per page are the
 * header's prev/next-book link and the trailing interwiki link, both outside
 * the region this importer reads as prose).
 *
 * The source DOES carry a handful of bare `[...]` editorial square-bracket
 * marks scattered through the prose (e.g. "[ἢ τὰ καθ' ἕκαστα]", "[γὰρ]") —
 * apparent text-critical annotations already present in the transcription.
 * These are kept 100% verbatim (never stripped, never resolved) and flagged
 * per-passage via Passage.anomaly, mirroring how this repo's Latin Aristotle
 * importers preserve-and-flag the Boethian "<...>" lacuna mark / angle-bracket
 * supplements rather than silently normalising them away.
 *
 * --- Bekker reference reconstruction ---
 * Book 1 has 38 `{{χ|...}}` markers across 34 chapters; Book 2 has 21 markers
 * across 19 chapters. Not every chapter carries its own marker (a chapter with
 * none simply continues the previous chapter's Bekker page/column). Markers are
 * walked in document order, carrying a running "current position" forward
 * across chapter boundaries: a chapter's ref start is the position in effect
 * when it begins, its end is the position in effect when the next chapter
 * begins (i.e. wherever its own last marker left it, or unchanged if it has
 * none) — formatted as a single value ("75b") when start == end, or a span
 * ("71a–71b") otherwise. Book 1 and Book 2 are numbered continuously in the
 * real Bekker pagination (Book 1 ends mid-page at 89b; Book 2 opens there and
 * only reaches its own first marker, 90a, partway through Chapter 2), so Book
 * 2's reconstruction is seeded with Book 1's own final position rather than
 * restarting at null — otherwise Book 2 Chapter 1 (which carries no marker of
 * its own) would wrongly read as ref-less instead of "89b".
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-categoriae-la and
 * scripts/import-summa): verbatim Greek reading text only — no accent,
 * spelling or punctuation normalisation, nothing "corrected". Only wiki
 * transport scaffolding (the header template, the Bekker `{{χ|...}}` markers
 * themselves once their values are captured into Division.ref, the trailing
 * interwiki link) is removed; every other character — including the square
 * bracket marks above — is preserved.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/posterior-analytics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'data', 'posterior-analytics-grc');

const WORK_ID = 'posterior-analytics-grc';

interface Anomaly {
  where: string;
  note: string;
}
const anomalies: Anomaly[] = [];

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

function readWikitext(file: string): string {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as {
    parse?: { wikitext?: string | { '*'?: string } };
  };
  const wt = raw.parse?.wikitext;
  const text = typeof wt === 'string' ? wt : wt?.['*'];
  if (!text) fail(`could not find .parse.wikitext string in ${file}`);
  return text;
}

const HEADER_RE = /^\s*\{\{Κεφαλίδα\|[\s\S]*?\n\s*\}\}/;
const TRAILING_INTERWIKI_RE = /\n*\[\[en:[^\]]*\]\]\s*$/;
const HEADING_RE = /^==\s*Κεφάλαιο\s*(\d+)\s*==[ \t]*$/gm;
const CHI_RE = /\{\{χ\|([^}]*)\}\}/g;
/** Editorial square-bracket mark already present in the source, e.g. "[γὰρ]". Kept verbatim; never stripped. */
export const SQUARE_BRACKET_RE = /\[[^[\]]*\]/g;

interface RawChapter {
  number: string;
  /** char index range in the ORIGINAL (header/interwiki-stripped, marker-intact) text, for marker attribution */
  origStart: number;
  origEnd: number;
}

interface ParsedBook {
  bookNum: number;
  chapters: { number: string; startRef: string | null; endRef: string | null; passages: string[] }[];
  finalState: string | null;
  markerCount: number;
}

function parseBook(bookNum: number, wikitext: string, initialState: string | null): ParsedBook {
  const where = `book-${bookNum}`;

  // --- strip header ------------------------------------------------------
  const headerMatch = HEADER_RE.exec(wikitext);
  if (!headerMatch) fail(`${where}: {{Κεφαλίδα|...}} header template not found`);
  let text = wikitext.slice(headerMatch[0].length);

  // --- strip trailing interwiki link --------------------------------------
  if (!TRAILING_INTERWIKI_RE.test(text)) fail(`${where}: trailing [[en:...]] interwiki link not found`);
  text = text.replace(TRAILING_INTERWIKI_RE, '');

  // --- hard gate: nothing but whitespace before chapter 1 -----------------
  const firstHeadingMatch = /^==\s*Κεφάλαιο\s*\d+\s*==/m.exec(text);
  if (!firstHeadingMatch) fail(`${where}: no "== Κεφάλαιο N ==" heading found`);
  if (text.slice(0, firstHeadingMatch.index).trim().length !== 0) {
    fail(`${where}: non-whitespace content before chapter 1: ${JSON.stringify(text.slice(0, firstHeadingMatch.index).slice(0, 120))}`);
  }

  // --- locate headings (original, marker-intact text) ---------------------
  const headings: { idx: number; len: number; number: string }[] = [];
  HEADING_RE.lastIndex = 0;
  let hm: RegExpExecArray | null;
  while ((hm = HEADING_RE.exec(text))) headings.push({ idx: hm.index, len: hm[0].length, number: hm[1]! });
  headings.forEach((h, i) => {
    if (h.number !== String(i + 1)) fail(`${where}: chapter heading out of sequence — found "${h.number}" at position ${i + 1}`);
  });

  const chapterBounds: RawChapter[] = headings.map((h, i) => ({
    number: h.number,
    origStart: h.idx + h.len,
    origEnd: i + 1 < headings.length ? headings[i + 1]!.idx : text.length,
  }));

  // --- locate {{χ|...}} markers (original text) and attribute to chapters -
  const markers: { idx: number; value: string }[] = [];
  CHI_RE.lastIndex = 0;
  let cm: RegExpExecArray | null;
  while ((cm = CHI_RE.exec(text))) markers.push({ idx: cm.index, value: cm[1]!.trim() });

  let state: string | null = initialState;
  let firstMarkerState: string | null = null;
  const startRefs: (string | null)[] = [];
  const endRefs: (string | null)[] = [];
  for (const cb of chapterBounds) {
    startRefs.push(state);
    const inChapter = markers.filter((m) => m.idx >= cb.origStart && m.idx < cb.origEnd);
    for (const m of inChapter) {
      state = m.value;
      firstMarkerState ??= m.value;
    }
    endRefs.push(state);
  }
  if (startRefs.length > 0 && startRefs[0] === null) startRefs[0] = firstMarkerState;

  // --- strip {{χ|...}} markers, then split into per-chapter passage text --
  const stripped = text.replace(CHI_RE, '');
  const strippedHeadings: { idx: number; len: number; number: string }[] = [];
  HEADING_RE.lastIndex = 0;
  while ((hm = HEADING_RE.exec(stripped))) strippedHeadings.push({ idx: hm.index, len: hm[0].length, number: hm[1]! });
  if (strippedHeadings.length !== headings.length) {
    fail(`${where}: chapter count changed after stripping {{χ|...}} markers (${headings.length} -> ${strippedHeadings.length})`);
  }

  const chapters = strippedHeadings.map((h, i) => {
    const start = h.idx + h.len;
    const end = i + 1 < strippedHeadings.length ? strippedHeadings[i + 1]!.idx : stripped.length;
    const block = stripped.slice(start, end);
    const passages = block
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => cleanText(s))
      .filter((s) => s.length > 0);
    if (passages.length === 0) fail(`${where} ch-${h.number}: no passages after cleaning`);
    return { number: h.number, startRef: startRefs[i] ?? null, endRef: endRefs[i] ?? null, passages };
  });

  return { bookNum, chapters, finalState: state, markerCount: markers.length };
}

function refFor(startRef: string | null, endRef: string | null, where: string): string | null {
  if (startRef === null && endRef === null) return null;
  if (startRef === null || endRef === null) {
    anomalies.push({ where, note: `Bekker ref reconstruction produced an asymmetric null (start=${JSON.stringify(startRef)}, end=${JSON.stringify(endRef)}); left null rather than guessed.` });
    return null;
  }
  return startRef === endRef ? startRef : `${startRef}–${endRef}`;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const book1Raw = readWikitext(join(HERE, 'raw', 'book1-wikisource.json'));
  const book2Raw = readWikitext(join(HERE, 'raw', 'book2-wikisource.json'));

  process.stdout.write(`parsing book 1 (${book1Raw.length} chars) ...\n`);
  const book1 = parseBook(1, book1Raw, null);
  process.stdout.write(`  ${book1.chapters.length} chapters, ${book1.markerCount} Bekker markers, final position ${book1.finalState}\n`);

  process.stdout.write(`parsing book 2 (${book2Raw.length} chars), seeded at ${book1.finalState} ...\n`);
  const book2 = parseBook(2, book2Raw, book1.finalState);
  process.stdout.write(`  ${book2.chapters.length} chapters, ${book2.markerCount} Bekker markers, final position ${book2.finalState}\n`);

  const EXPECTED_CHAPTERS = { 1: 34, 2: 19 };
  for (const b of [book1, book2] as const) {
    const expected = EXPECTED_CHAPTERS[b.bookNum as 1 | 2];
    if (b.chapters.length !== expected) {
      fail(`book ${b.bookNum}: expected ${expected} chapters (traditional count), got ${b.chapters.length}`);
    }
  }

  // --- build divisions (ONE passage per chapter: paragraphs joined with "\n\n",
  // matching the Book -> Chapter schema's Passage.text spec) + anomalies -----
  let squareBracketPassages = 0;
  let squareBracketMarks = 0;
  const divisions: Division[] = [book1, book2].map((book) => {
    const chapterDivisions: Division[] = book.chapters.map((c) => {
      const chWhere = `${WORK_ID} / book-${book.bookNum}-ch-${c.number}`;
      const text = c.passages.join('\n\n');
      const passage: Passage = { n: '', text, ref: null };
      const hits = text.match(SQUARE_BRACKET_RE);
      if (hits) {
        squareBracketPassages += 1;
        squareBracketMarks += hits.length;
        passage.anomaly = `editorial square-bracket mark(s) printed in the source, kept verbatim: ${hits.join(', ')}`;
        anomalies.push({
          where: `${chWhere} / passage`,
          note: `contains editorial square-bracket mark(s) already present in the Wikisource transcription (${hits.join(', ')}); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.`,
        });
      }
      const passages: Passage[] = [passage];
      return {
        id: `book-${book.bookNum}-ch-${c.number}`,
        number: c.number,
        ref: refFor(c.startRef, c.endRef, chWhere),
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages,
      };
    });
    return {
      id: `book-${book.bookNum}`,
      number: String(book.bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    };
  });

  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      'Chapter Bekker refs are reconstructed from this source\'s own inline {{χ|...}} page/column markers ' +
      '(no line numbers are marked in this source, unlike the English Wikisource HTML source used for ' +
      'categoriae-en/de-interpretatione-en). A chapter with no marker of its own carries the position in ' +
      'effect from the previous chapter (continuous Bekker numbering); a chapter that crosses a page/column ' +
      'boundary gets a span ("71a–71b"). Book 2 Chapter 1 illustrates this: it carries no marker of its own, ' +
      'so its ref ("89b") is carried over from the end of Book 1 Chapter 34 — the two Wikisource pages are ' +
      'numbered continuously in the real Bekker pagination, and the importer seeds Book 2\'s reconstruction ' +
      "with Book 1's final position rather than restarting at null. Passage.ref is always null (no finer " +
      'milestone than the chapter-level span is derivable from this source).',
  });
  anomalies.push({
    where: `${WORK_ID} / edition`,
    note:
      'Greek Wikisource does not name a source edition for the "Αναλυτικών υστέρων" pages (contrast the ' +
      'companion categoriae-grc/de-interpretatione-grc corpora, explicitly First1KGreek/Bekker 1837). Given ' +
      'the real work\'s Bekker range begins at 71a and the transcription uses {{χ|...}}-style Bekker-page ' +
      'templates throughout, the text is presumably Bekker-based, but no specific edition or editor is ' +
      'asserted here — a genuine provenance gap, disclosed rather than guessed at. See about.json.',
  });
  anomalies.push({
    where: `${WORK_ID} / square-bracket marks`,
    note:
      `${squareBracketMarks} editorial square-bracket mark(s) across ${squareBracketPassages} passage(s) are ` +
      'printed in the Wikisource transcription itself (e.g. "[ἢ τὰ καθ\' ἕκαστα]", "[γὰρ]") — apparent ' +
      'text-critical annotation (a word or clause bracketed by a prior editor), not MediaWiki markup. Kept ' +
      '100% verbatim in every case; never stripped, resolved, or silently normalised. Each occurrence is also ' +
      'flagged per-passage via Passage.anomaly.',
  });

  // --- write outputs -------------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Posterior Analytics',
    author: 'Aristotle',
    language: 'grc',
    provenance:
      'Greek Wikisource, pages "Αναλυτικών υστέρων/1" and "Αναλυτικών υστέρων/2", fetched once each via the ' +
      'MediaWiki action=parse&prop=wikitext API; imported by scripts/import-aristotle-posterior-analytics-grc. ' +
      'The raw dumps are committed at scripts/import-aristotle-posterior-analytics-grc/raw/book1-wikisource.json ' +
      'and book2-wikisource.json.',
    license:
      'Aristotle\'s Greek text is itself in the public domain (4th century BC). The digital transcription is ' +
      'taken from Greek Wikisource and is available under the Creative Commons Attribution-ShareAlike 4.0 ' +
      'International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Aristotle’s Posterior Analytics — Greek',
        paragraphs: [
          'This is Aristotle’s Posterior Analytics (Ἀναλυτικῶν Ὑστέρων) in the original Greek. The treatise, ' +
            'in two books, sets out Aristotle’s theory of scientific demonstration and knowledge (ἐπιστήμη): ' +
            'Book 1 develops the formal requirements a demonstrative syllogism must meet to yield knowledge of ' +
            'a thing’s cause, and Book 2 turns to definition and to how the first, indemonstrable principles ' +
            'of a science are themselves known (culminating in the account of νοῦς, intuitive understanding, in ' +
            'its final chapter).',
          'The text here is the Greek, verbatim. Nothing is translated, modernised, normalised, or silently ' +
            'corrected. Where the source is irregular — including its own editorial square-bracket marks — the ' +
            'irregularity is preserved and noted; see “Known gaps & anomalies” below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Greek Wikisource does not record which printed edition its transcription of "Αναλυτικών υστέρων" ' +
            'follows — no editor, editio, or year is named on either source page. This is a genuine provenance ' +
            'gap: the companion Categories/De Interpretatione Greek texts bundled in this app are sourced from ' +
            'the First1KGreek TEI, which does cite Bekker 1837 explicitly, but that is not the case here. The ' +
            'transcription’s own {{χ|...}} Bekker-page templates, and the fact that the work’s real Bekker ' +
            'range (71a–100b17) matches the marker values found, make a Bekker-descended text plausible, but no ' +
            'specific edition or editor is asserted — see also data/categoriae-la/about.json’s own ' +
            '"unlabeled edition" disclosure for the same situation in this repo’s Latin Aristotle text.',
          'The work is divided into its two traditional books (34 chapters in Book 1, 19 in Book 2).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the wikitext of the Greek Wikisource pages "Αναλυτικών υστέρων/1" and ' +
            '"Αναλυτικών υστέρων/2", retrieved once each through the MediaWiki action=parse&prop=wikitext API ' +
            'and committed under the importer’s raw/ directory. It is bundled with the app; nothing is ' +
            'loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer strips only wiki-transport scaffolding — the {{Κεφαλίδα|...}} front-matter header ' +
            '(title/author/prev-next-book links) and the trailing [[en:...]] interwiki link — then splits each ' +
            'page’s body at its "== Κεφάλαιο N ==" chapter headings. Each chapter’s prose becomes a single ' +
            'Passage (the source prints no paragraph numbers, so Passage.n is "" throughout). Entities are ' +
            'decoded and runs of whitespace collapsed; the words, spelling, and punctuation — including the ' +
            'source’s own editorial square-bracket marks — are otherwise untouched.',
          'Each chapter’s Bekker page/column reference is reconstructed from the source’s own inline ' +
            '{{χ|71a}}-style markers once their values are captured, then the marker templates themselves are ' +
            'removed from the reading text (their content — the Bekker label — is transport-page apparatus, not ' +
            'part of Aristotle’s sentence). See "Reference scheme" below.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by chapter, with each chapter also carrying a Bekker page/column reference (e.g. "71a" ' +
            'or, for a chapter spanning two pages/columns, "71a–71b") reconstructed from the source’s inline ' +
            'markers. Because the source marks only page/column boundaries — never line numbers — no line-level ' +
            'precision is available or fabricated; Passage.ref is null throughout. The two source pages are ' +
            'numbered continuously in the real Bekker pagination, so Book 2’s reconstruction is seeded with ' +
            'Book 1’s own final position (89b) rather than restarting at null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: (1) no source edition is named by ' +
            'Greek Wikisource for this work (see "The edition" above); (2) a number of passages carry editorial ' +
            'square-bracket marks already present in the transcription (apparent text-critical annotation), ' +
            'kept 100% verbatim and flagged per-passage; (3) a handful of chapters carry no Bekker marker of ' +
            'their own and so inherit their ref from the previous chapter’s end position, by design (see ' +
            '"Reference scheme").',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary -----------------------------------------------------
  const totalPassages = divisions.reduce((n, b) => n + b.children.reduce((m, c) => m + c.passages.length, 0), 0);
  const totalChars = divisions.reduce(
    (n, b) => n + b.children.reduce((m, c) => m + c.passages.reduce((k, p) => k + p.text.length, 0), 0),
    0,
  );
  process.stdout.write('\nDivisions:\n');
  for (const book of divisions) {
    process.stdout.write(`  Book ${book.number} — ${book.children.length} chapters\n`);
    for (const ch of book.children) {
      process.stdout.write(`    ch-${ch.number}  ref=${JSON.stringify(ch.ref)}  ${ch.passages.length} passage(s)\n`);
    }
  }
  process.stdout.write(
    `\n  ${divisions.length} books  ${divisions.reduce((n, b) => n + b.children.length, 0)} chapters  ` +
      `${totalPassages} passages  ${totalChars} chars  (${squareBracketMarks} square-bracket marks, ${anomalies.length} anomalies)\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-aristotle-posterior-analytics-grc/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

// Guard so validate.ts (which imports SQUARE_BRACKET_RE from this module) can
// import it without re-running the whole importer as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
