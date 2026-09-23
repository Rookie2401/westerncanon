/**
 * Aristotle, *Meteorology* (Meteorologica) — English translation by E. W.
 * Webster (Oxford, 1923), via the MIT Internet Classics Archive
 * (classics.mit.edu/Aristotle/meteorology.html, 4 book sub-pages). Run-once
 * ingestion pipeline.
 *
 *   npm run import:meteorologica-en
 *
 * Reads scripts/import-meteorologica-en/raw/meteorology.N.<roman>.html
 * (N = 1..4; fetched once from classics.mit.edu and committed here — nothing
 * is downloaded at import time) and writes:
 *   data/meteorologica-en/work.json       - the GenericWork: 4 Books -> Chapters
 *   data/meteorologica-en/about.json      - provenance / licence / prose
 *   data/meteorologica-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:meteorologica-en`.
 *
 * ============================================================================
 * SOURCE STRUCTURE (verified by direct inspection of all 5 fetched pages —
 * the table-of-contents page plus all 4 book sub-pages)
 * ============================================================================
 * classics.mit.edu/Aristotle/meteorology.html is a hand-authored HTML page
 * (not MediaWiki/TEI) that explicitly credits the translator in its own body
 * text: `Translated by E. W. Webster` (present verbatim on every one of the
 * 4 fetched book pages — see about.json's "Digital source" section).
 *
 * Each book page's real content normally lives between the literal markers
 * `<A NAME="start"></A>` and `<A NAME="end"></A>`, with chapters headed
 * `<B>Part N</B>` (restarting at 1 in each book) and paragraphs separated by
 * `<BR><BR>` — the same shape as this importer group's other three works
 * (see scripts/import-topics-en/index.ts's module doc for the full generic
 * account of `<A NAME>` deep-link anchors, single-`<BR>` mid-paragraph line
 * breaks, and the absence of Bekker markers/footnotes/entities throughout).
 *
 * ============================================================================
 * BOOK II IS TRUNCATED ON MIT'S OWN LIVE SERVER (not a fetch error) — AND IS
 * SUPPLEMENTED HERE FROM A SECOND, INDEPENDENTLY-VERIFIED PUBLIC-DOMAIN SCAN
 * ============================================================================
 * meteorology.2.ii.html has NO `<A NAME="end"></A>` marker and no closing
 * navigation footer at all: the raw HTTP response — confirmed via `curl`
 * (received byte count exactly equals the server's own declared
 * Content-Length: 101481) — simply stops mid-sentence, mid-tag, inside Part
 * 9 (Book II's own final chapter): "...in the clouds, when they are in a
 * process of change and contract and condense into water, it is ejected and
 * causes" (the response ends there, with a dangling unterminated
 * `<A NAME="1110"` tag right after "causes" — no closing `>` at all). The
 * table-of-contents page itself advertises this sub-page as "103k", a
 * further ~4KB larger than what the live server actually returns (99KB) -
 * consistent with this being a real, ongoing defect in MIT's own copy, not
 * an artifact of this import's own fetch. The surviving MIT prefix is kept
 * exactly as received and is never edited.
 *
 * The missing tail (the rest of this one sentence, plus the chapter's own
 * closing sentence) is supplied here from a public-domain archive.org scan
 * of the SAME Webster translation: identifier `meteorologica00aris`
 * ("Meteorologica", trans. E. W. Webster, Oxford: Clarendon Press, 1923 —
 * a separate issue of part of Vol. III of "The Works of Aristotle", per
 * that scan's own archive.org metadata, which also credits "Webster, Erwin
 * Wentworth ... tr" by name). Its text from "thunder and lightning and the
 * other phenomena of the same nature." onward was verified to continue
 * seamlessly and verbatim from MIT's own surviving prefix (the words right
 * before MIT's cutoff, "...it is ejected and causes", are followed in the
 * scan by exactly "thunder and lightning..." with no discrepancy). The one
 * printed page that contributes text (p. 370^a) was proof-read by eye
 * against its own page image (archive.org IIIF) before being transcribed
 * into `raw/supplement-meteor-2-9-tail.txt`, which this importer reads
 * below (no OCR errors were found on that page). Nothing is paraphrased,
 * modernised, or fabricated; the supplement file carries its own
 * `#`-prefixed provenance header (stripped before use).
 *
 * Nothing beyond this point in Book II was ever missing (Part 9 was already
 * Book II's last chapter per Webster's own numbering, so no further chapter
 * was absent - only the tail of Part 9's own text was lost, and it is now
 * restored). Books I, III and IV (separate sub-pages) ARE complete:
 * `start`/`end` markers both present, byte counts match the
 * table-of-contents labels, closing navigation footers present.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/meteorologica-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'meteorologica-en');

const WORK_ID = 'meteorologica-en';

interface Anomaly {
  where: string;
  note: string;
}

interface BookPlan {
  file: string;
  roman: string;
  expectedChapters: number;
  expectTruncated: boolean;
}

const BOOKS: BookPlan[] = [
  { file: 'meteorology.1.i.html', roman: 'I', expectedChapters: 14, expectTruncated: false },
  { file: 'meteorology.2.ii.html', roman: 'II', expectedChapters: 9, expectTruncated: true },
  { file: 'meteorology.3.iii.html', roman: 'III', expectedChapters: 6, expectTruncated: false },
  { file: 'meteorology.4.iv.html', roman: 'IV', expectedChapters: 12, expectTruncated: false },
];

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

/**
 * Reads `raw/supplement-meteor-2-9-tail.txt` (see this file's module doc):
 * strips the leading `#`-prefixed provenance header line, then splits the
 * remainder into paragraphs on blank lines, running each paragraph through
 * `cleanText` exactly as the MIT HTML paragraphs above are. Nothing else is
 * altered.
 */
function readSupplement(name: string): string[] {
  const raw = readFileSync(join(RAW_DIR, name), 'utf8');
  const body = raw
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');
  return body
    .split(/\n\s*\n/)
    .map((p) => cleanText(p))
    .filter((p) => p.length > 0);
}

interface ParsedChapter {
  number: number;
  paragraphs: string[];
}

interface ParsedBook {
  chapters: ParsedChapter[];
  truncatedLastWords: string | null;
  strayBoldUnwrapped: number;
}

/** Parses one MIT Internet Classics Archive Aristotle page (shared shape across this importer group — see this file's module doc). */
function parseMitBookPage(html: string, label: string, firstChapterNumber: number): ParsedBook {
  const startMarker = '<A NAME="start"></A>';
  const startIdx = html.indexOf(startMarker);
  if (startIdx < 0) fail(`${label}: could not find <A NAME="start"></A> marker`);
  const contentStart = startIdx + startMarker.length;

  const endMarker = '<A NAME="end"></A>';
  const endIdx = html.indexOf(endMarker, contentStart);
  const truncated = endIdx < 0;
  let content = truncated ? html.slice(contentStart) : html.slice(contentStart, endIdx);
  if (truncated) {
    // Confirmed genuine source-side truncation (see this file's module doc)
    // — strip the dangling unterminated tag at the very end (here, the
    // response cuts off mid-way through the closing `</A>` of the final
    // `<A NAME="n">` anchor, e.g. "...<A NAME=\"1110\"></A" with no final
    // `>`) so it is not read as literal text, then strip the now-unpaired
    // trailing open anchor tag it leaves behind (its own matching `</A>`
    // was just removed, so the ordinary paired-anchor stripper below would
    // never catch it on its own).
    content = content.replace(/<[^>]*$/, '');
    content = content.replace(/<A NAME="\d+">\s*$/, '');
  }

  const headerRe = /<B>Part (\d+)<\/B>/g;
  const headers: Array<{ n: number; matchStart: number; contentStart: number }> = [];
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(content))) {
    headers.push({ n: Number(hm[1]), matchStart: hm.index, contentStart: hm.index + hm[0].length });
  }
  if (headers.length === 0) fail(`${label}: no "<B>Part N</B>" chapter headings found`);

  const chapters: ParsedChapter[] = [];
  let lastWords: string | null = null;
  let strayBoldUnwrapped = 0;

  for (let i = 0; i < headers.length; i++) {
    const want = firstChapterNumber + i;
    if (headers[i]!.n !== want) {
      fail(`${label}: chapter headings out of sequence — expected Part ${want}, found Part ${headers[i]!.n} at position ${i}`);
    }
    const chunkStart = headers[i]!.contentStart;
    const chunkEnd = i + 1 < headers.length ? headers[i + 1]!.matchStart : content.length;
    const chunk = content.slice(chunkStart, chunkEnd);

    const paragraphs = chunk
      .split(/<BR>\s*<BR>/g)
      .map((raw) => {
        const withoutAnchors = raw.replace(/<A NAME="[^"]*"\s*>\s*<\/A>/g, '');
        const withoutBr = withoutAnchors.replace(/<BR>/g, ' ');
        const strayBold = withoutBr.match(/<\/?B>/g);
        if (strayBold) strayBoldUnwrapped += strayBold.length;
        const withoutBold = withoutBr.replace(/<\/?B>/g, '');
        return cleanText(withoutBold);
      })
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) fail(`${label} Part ${headers[i]!.n}: zero paragraphs`);
    if (truncated && i === headers.length - 1) {
      lastWords = paragraphs[paragraphs.length - 1]!.slice(-140);
    }
    chapters.push({ number: headers[i]!.n, paragraphs });
  }

  return { chapters, truncatedLastWords: truncated ? lastWords : null, strayBoldUnwrapped };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const anomalies: Anomaly[] = [];
  const bookDivisions: Division[] = [];
  let totalChapters = 0;
  let totalStrayBold = 0;

  for (let i = 0; i < BOOKS.length; i++) {
    const plan = BOOKS[i]!;
    const bookNum = i + 1;
    const html = readFileSync(join(RAW_DIR, plan.file), 'utf8');
    const label = `book-${bookNum}`;
    const parsed = parseMitBookPage(html, label, 1);

    if (parsed.chapters.length !== plan.expectedChapters) {
      fail(`${label}: expected ${plan.expectedChapters} chapters, parsed ${parsed.chapters.length}`);
    }
    const gotTruncated = parsed.truncatedLastWords !== null;
    if (gotTruncated !== plan.expectTruncated) {
      fail(`${label}: truncation expectation mismatch (expected ${plan.expectTruncated}, got ${gotTruncated})`);
    }
    totalStrayBold += parsed.strayBoldUnwrapped;

    // The exact MIT-surviving tail words, captured before any supplementing
    // below, for disclosure in the Book II Chapter 9 anomaly text.
    const mitTruncatedTailWords = parsed.truncatedLastWords;

    const chapterDivisions: Division[] = parsed.chapters.map((c, ci) => {
      const isLastChapterOfBook = ci === parsed.chapters.length - 1;
      const passage: Passage = { n: '', text: c.paragraphs.join('\n\n'), ref: null };
      if (gotTruncated && isLastChapterOfBook) {
        // Book II's page cuts off mid-sentence inside Part 9 (its own last
        // chapter). Supplement the rest of that one sentence, plus the
        // chapter's own closing sentence, from a verified public-domain
        // archive.org scan of the same Webster translation (see this file's
        // module doc for the identifier and verification).
        const ARCHIVE_SOURCE =
          'a public-domain archive.org scan of the same E. W. Webster translation (identifier meteorologica00aris, "Meteorologica", Oxford: Clarendon Press, 1923), proof-read by eye against the scan\'s own page image; see this importer\'s module doc for the full verification account';
        const tailParagraphs = readSupplement('supplement-meteor-2-9-tail.txt');
        if (tailParagraphs.length === 0) fail('supplement-meteor-2-9-tail.txt: zero paragraphs');
        // The supplement continues MIT's own last (complete) word with a
        // single space and no invented punctuation.
        const mergedParagraphs = c.paragraphs.slice();
        mergedParagraphs[mergedParagraphs.length - 1] += ' ' + tailParagraphs[0];
        for (const p of tailParagraphs.slice(1)) mergedParagraphs.push(p);
        passage.text = mergedParagraphs.join('\n\n');
        passage.anomaly = `SUPPLEMENTED: MIT's own live source for this page ends mid-sentence at exactly this point ("...${mitTruncatedTailWords}") - confirmed genuine, not a fetch error (see the importer's module doc). The rest of this sentence, and the chapter's own closing sentence, are supplied from ${ARCHIVE_SOURCE}.`;
        anomalies.push({
          where: `${WORK_ID} / ${label}-ch-${c.number}`,
          note: `Mid-sentence cutoff in MIT's own source, supplemented from archive.org: MIT's live HTML response for meteorology.2.ii.html ends here, with no closing navigation footer, confirmed via direct HTTP fetch (received bytes exactly match the server's own declared Content-Length). Last surviving MIT words: "...${mitTruncatedTailWords}". Everything from "thunder and lightning and the other phenomena of the same nature." onward is supplied from ${ARCHIVE_SOURCE}.`,
        });
      }
      return {
        id: `book-${bookNum}-ch-${c.number}`,
        number: String(c.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
    });

    bookDivisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapterDivisions,
      passages: [],
    });

    totalChapters += chapterDivisions.length;
  }

  if (totalStrayBold > 0) {
    anomalies.push({
      where: `${WORK_ID} / stray emphasis`,
      note: `${totalStrayBold} stray mid-paragraph <B>...</B> emphasis tag(s) found wrapping a word or short phrase within the running prose (confirmed genuine source content, not a chapter heading and not transport scaffolding). This schema's Passage.text is plain text with no rich-text/emphasis field, so the <B>/</B> wrapper was unwrapped (inner text kept, verbatim, in its place) rather than dropped.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / reference scheme`,
    note:
      'MIT\'s Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (verified by direct inspection of all 4 book pages) - only silent, invisible `<A NAME="n">` deep-link anchors, sequentially numbered across each book with no relation to Bekker numbering and no visible rendering. Division.ref is null throughout for both Books and Chapters; nothing is fabricated to supply a citation scheme this source does not carry.',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: 'No footnotes or translator apparatus of any kind were found anywhere in this source (confirmed by direct inspection of all 4 book pages) - there is nothing to strip or disclose beyond the ordinary transport scaffolding (page navigation, `<A NAME>` anchors).',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `Books I, III and IV are complete from MIT alone (confirmed both start and end markers present on each), with no supplementing needed. Book II is now also complete (9/9 chapters) but its own final chapter (Part 9) is complete only because it is supplemented: MIT's own live source cuts it off mid-sentence - see the book-2-ch-9 entry above and this importer's module doc for the full verification account of the archive.org source used to complete it. Total: 41 chapters across 4 books, 40 wholly from MIT and 1 (book-2-ch-9) part MIT / part archive.org.`,
  });
  anomalies.push({
    where: `${WORK_ID} / archive.org source verification`,
    note: 'The archive.org scan used to supplement Book II Chapter 9 (identifier meteorologica00aris, "Meteorologica", trans. E. W. Webster, Oxford: Clarendon Press, 1923) is credited to Webster by name in its own archive.org metadata ("associated-names": "Webster, Erwin Wentworth ... tr") and is described there as "Separate issue of part of vol. III of the Works" - the same Ross-series volume MIT\'s own page is a transcription of. It was verified to be the correct translation by an exact, word-for-word match against MIT\'s own surviving text at the overlap point: MIT\'s cutoff words "...it is ejected and causes" are followed in the scan by exactly "thunder and lightning and the other phenomena of the same nature." with no discrepancy.',
  });
  anomalies.push({
    where: `${WORK_ID} / angle-bracket supplements`,
    note: 'The sibling De Generatione et Corruptione importer\'s archive.org source (a different edition, by H. H. Joachim) marks the translator\'s own editorial supplements with angle brackets ⟨ ⟩, distinct from Aristotle\'s own round parentheses ( ) - a distinction MIT\'s HTML cannot carry (it contains no "<" or "&lt;" anywhere). The single archive.org page image used here (p. 370^a, the only page this importer\'s supplement draws from) was checked by eye for the same convention: the supplemented sentence and its one following sentence carry no parenthetical or bracketed material of any kind, Webster\'s or Aristotle\'s, so there is nothing of this kind to preserve or lose in this particular supplement.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Meteorology',
    author: 'Aristotle',
    language: 'en',
    translator: 'E. W. Webster',
    edition: 'The Works of Aristotle, Vol. III (Oxford: Clarendon Press, 1923), ed. W. D. Ross',
    provenance:
      'The MIT Internet Classics Archive (classics.mit.edu/Aristotle/meteorology.html), fetched once (table-of-contents page plus all 4 book sub-pages) and committed to this repository under scripts/import-meteorologica-en/raw/; imported by scripts/import-meteorologica-en.',
    license:
      "Webster's 1923 translation is in the public domain (published well over 95 years ago). The MIT Internet Classics Archive's own HTML presentation is copyright (C) 1994-2009 Daniel C. Stevenson / Web Atomics per its site footer; only the public-domain translated text itself (not MIT's page design, navigation or any other site furniture) is reproduced here, consistent with the Archive's own stated permissions practice for this kind of non-commercial reuse of a public-domain text (see classics.mit.edu/Help/permissions.html).",
    sections: [
      {
        heading: 'Aristotle\'s Meteorology — English, trans. Webster',
        paragraphs: [
          "This is Aristotle's Meteorology (Meteorologica) in the English translation made by E. W. Webster for the Oxford \"Works of Aristotle\" series (Vol. III, ed. W. D. Ross), first published 1923. Books I, III and IV, and almost all of Book II, are reproduced from the MIT Internet Classics Archive; the last sentence of Book II is completed from a public-domain archive.org scan of the same translation - see \"Text completeness\" below.",
          'The text here is the translation, verbatim throughout, whichever of the two sources a given word comes from. Nothing is modernised, paraphrased or silently corrected in either source.',
        ],
      },
      {
        heading: 'Translator verification',
        paragraphs: [
          'Condition (a) of this import\'s verification requirement is met directly for the MIT text: every one of the 4 fetched MIT book pages carries the explicit on-page credit line "Translated by E. W. Webster" (confirmed by direct inspection of the raw HTML, e.g. scripts/import-meteorologica-en/raw/meteorology.1.i.html). For the archive.org supplement (Book II Chapter 9\'s last sentence), condition (a) is met two ways: the scan\'s own archive.org metadata credits "Webster, Erwin Wentworth ... tr" by name, and its text matches MIT\'s own surviving text verbatim at the overlap point - see "Text completeness" below.',
        ],
      },
      {
        heading: 'Text completeness',
        paragraphs: [
          'MIT\'s own live HTML page for Book II (meteorology.2.ii.html) ends mid-sentence, mid-tag, part-way through Part 9 (Book II\'s own final chapter): "...in the clouds, when they are in a process of change and contract and condense into water, it is ejected and causes" - the response simply stops there (a dangling unterminated `<A NAME="1110"` tag follows, with no closing `>`), with no closing navigation footer at all. This was confirmed genuine on MIT\'s side (not a download error) via a direct HTTP fetch, whose received byte count exactly matches the server\'s own declared Content-Length header. The table-of-contents page itself advertises this sub-page\'s size as "103k", larger than the ~99KB the live server actually returns - consistent with this being a real, standing defect in MIT\'s own copy of the page.',
          'This edition is nonetheless complete: the rest of that one sentence, and the chapter\'s own closing sentence ("So much for thunder and lightning."), are supplied from a public-domain archive.org scan of the very same Webster translation (identifier meteorologica00aris, "Meteorologica", Oxford: Clarendon Press, 1923 - a separate issue of part of Vol. III of "The Works of Aristotle", per that scan\'s own metadata). The one printed page that contributes text (p. 370^a) was proof-read by eye against its own archive.org page image before transcription; no OCR errors were found on it.',
          'Nothing is fabricated, summarised, or paraphrased in either source. Book II Chapter 9\'s Passage carries an `anomaly` field disclosing exactly where MIT\'s text ends and the archive.org text begins. See anomalies.json for the full account, including the exact last surviving MIT words. Books I, III and IV are complete from MIT alone, with no supplementing needed.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The work is divided into 4 Books and, within each Book, numbered chapters (MIT labels them "Part N"; rendered here as "Chapter N" per this library\'s standing terminology for Aristotle) - Book I has 14 chapters, Book II has 9, Book III has 6, Book IV has 12, matching the traditional Bekker book division.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is (i) the raw HTML of classics.mit.edu/Aristotle/meteorology.html (table of contents) and its 4 linked book sub-pages (meteorology.1.i.html ... meteorology.4.iv.html), fetched once via a direct HTTPS request and committed under scripts/import-meteorologica-en/raw/, and (ii) for the one sentence that MIT\'s own source lacks, a hand-transcribed plain-text file (scripts/import-meteorologica-en/raw/supplement-meteor-2-9-tail.txt) taken from the archive.org scan described under "Text completeness" above, carrying its own provenance header. Nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer locates each MIT book page\'s real content between its own `<A NAME="start"></A>` and (where present) `<A NAME="end"></A>` markers, splits it into chapters at each `<B>Part N</B>` heading, and splits each chapter into paragraphs at every `<BR><BR>` line-break pair. Only HTML transport scaffolding is removed: the invisible `<A NAME="n">` deep-link anchors (no reference scheme - see below) and the paragraph/line-break markup itself; the words are otherwise untouched. Where Book II\'s MIT page genuinely runs out mid-tag, the importer strips only the dangling unterminated tag fragment, not any actual text. No entities or footnotes were found anywhere in the MIT source. The archive.org supplement file is then read, its own `#`-prefixed provenance header stripped, and joined onto MIT\'s own last (complete) word with a single space and no invented punctuation.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter only. Neither MIT\'s Internet Classics Archive nor the archive.org supplement text (as transcribed here) carries Bekker page/column/line markers in-line with the prose (confirmed by direct inspection of all 4 MIT book pages) - Division.ref is null throughout, for both Books and Chapters, and Passage.ref is null throughout as well. This is a genuine limitation of this specific digital presentation, not something this importer fabricates around.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'This edition is complete (Books I/III/IV and Book II all at their full chapter counts) - see "Text completeness" above for the full account of how Book II Chapter 9\'s last sentence was supplemented from archive.org, and anomalies.json for the complete machine-readable log.',
          'No Bekker apparatus. See "Reference scheme" above.',
          'No footnotes in the MIT-sourced text. None were found on the single archive.org page used for the supplement either.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalChars = bookDivisions.reduce(
    (n, b) => n + b.children.reduce((m, c) => m + c.passages[0]!.text.length, 0),
    0,
  );
  process.stdout.write(`\n  ${bookDivisions.length} books  ${totalChapters} chapters  ${totalChars} chars\n`);
  process.stdout.write('Done. Run `npm run validate:meteorologica-en` next.\n');
}

main();
