/**
 * Aristotle, *On Generation and Corruption* — English translation by H. H.
 * Joachim (Oxford, 1922), via the MIT Internet Classics Archive
 * (classics.mit.edu/Aristotle/gener_corr.html, 2 book sub-pages). Run-once
 * ingestion pipeline.
 *
 *   npm run import:de-generatione-et-corruptione-en
 *
 * Reads scripts/import-de-generatione-et-corruptione-en/raw/gener_corr.N.<roman>.html
 * (N = 1..2; fetched once from classics.mit.edu and committed here — nothing
 * is downloaded at import time) and writes:
 *   data/de-generatione-et-corruptione-en/work.json       - the GenericWork: 2 Books -> Chapters
 *   data/de-generatione-et-corruptione-en/about.json      - provenance / licence / prose
 *   data/de-generatione-et-corruptione-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-generatione-et-corruptione-en`.
 *
 * ============================================================================
 * SOURCE STRUCTURE (verified by direct inspection of all 3 fetched pages —
 * the table-of-contents page plus both book sub-pages)
 * ============================================================================
 * classics.mit.edu/Aristotle/gener_corr.html is a hand-authored HTML page
 * (not MediaWiki/TEI) that explicitly credits the translator in its own body
 * text: `Translated by H. H. Joachim` (present verbatim on both fetched book
 * pages — see about.json's "Digital source" section).
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
 * BOOK I IS TRUNCATED ON MIT'S OWN LIVE SERVER (not a fetch error) — AND IS
 * SUPPLEMENTED HERE FROM A SECOND, INDEPENDENTLY-VERIFIED PUBLIC-DOMAIN SCAN
 * ============================================================================
 * gener_corr.1.i.html has NO `<A NAME="end"></A>` marker and no closing
 * navigation footer at all: the raw HTTP response — confirmed via `curl`
 * (received byte count exactly equals the server's own declared
 * Content-Length: 101486) and independently re-confirmed via a second,
 * unrelated fetch path — simply stops mid-sentence, mid-word, inside Part 8
 * (Book I's own final chapter): "...Such an assertion would commit him to
 * doctrines like those which Plato has set forth in the Ti" (the response
 * ends there, with a dangling unterminated `<A NAME="1089"` tag right after
 * "Ti" - presumably mid-way through "Timaeus"). The table-of-contents page
 * itself advertises this sub-page as "127k", a further ~28KB larger than
 * what the live server actually returns (101KB) - consistent with this
 * being a real, ongoing defect in MIT's own copy, not an artifact of this
 * import's own fetch. The surviving MIT prefix is kept exactly as received
 * and is never edited. Book I's own final chapter (Part 8) was also missing
 * its predecessor's chapters 9 and 10 entirely — MIT's page simply never
 * carried them (Joachim's Book I in fact has 10 chapters, not 8).
 *
 * The missing text (the rest of Chapter 8, from "Timaeus" onward, plus all
 * of Chapters 9 and 10) is supplied here from a public-domain archive.org
 * scan of the SAME Joachim translation: identifier
 * `worksofaristotle0002unse_a5k0` ("The Works of Aristotle Translated into
 * English", ed. W. D. Ross, Vol. II, Oxford: Clarendon Press, 1930 — the
 * volume of the Ross series containing Joachim's De Generatione et
 * Corruptione translation, the very same one MIT's page is a transcription
 * of). NOTE: the archive.org identifier `oncomingtobepass00arisuoft`
 * ("On coming-to-be and passing-away ... A revised text with introduction
 * and commentary by Harold H. Joachim", Clarendon Press, 1922) was checked
 * first, since it is nominally "the 1922 Joachim edition" — but direct
 * inspection showed it is a DIFFERENT book: Joachim's own separate Greek
 * critical text with English introduction/commentary, which does not print
 * a continuous English translation at all (his preface explains he set out
 * to write a plain translation for the Ross series but ended up writing
 * this commentary instead). It was NOT used for a single word of this
 * import. `worksofaristotle0002unse_a5k0` was located afterwards and
 * verified to be the right book: its text from "Such an assertion would
 * commit him to doctrines like those which Plato has set forth in the
 * Timaeus." onward matches MIT's own surviving prefix verbatim up to
 * MIT's cutoff point. Every page of the scan that contributes text
 * (printed pp. 325b-328b) was proof-read by eye against its own page image
 * (archive.org IIIF) before being transcribed into the three
 * `raw/supplement-gc-1-*.txt` files this importer reads below; several
 * OCR errors (e.g. "gua" for "qua", "guid" for "liquid", "thg" for "the",
 * "Noris" for "Nor is") were corrected by eye against the page images.
 * The scan spells transliterated Greek names with "k" (Empedokles,
 * Leukippos, Demokritos) where MIT's own digitization — preserved verbatim
 * for the part MIT actually has — spells them with "c" (Empedocles,
 * Leucippus, Democritus); both spellings are kept exactly as each source
 * prints them and neither is silently normalised to match the other.
 * Nothing is paraphrased, modernised, or fabricated; each supplement file
 * carries its own `#`-prefixed provenance header (stripped before use).
 *
 * Book II (gener_corr.2.ii.html) IS complete: `start`/`end` markers both
 * present, byte count matches the table-of-contents label, closing
 * navigation footer present.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-generatione-et-corruptione-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-generatione-et-corruptione-en');

const WORK_ID = 'de-generatione-et-corruptione-en';

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
  { file: 'gener_corr.1.i.html', roman: 'I', expectedChapters: 8, expectTruncated: true },
  { file: 'gener_corr.2.ii.html', roman: 'II', expectedChapters: 11, expectTruncated: false },
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
 * Reads one of the hand-transcribed `raw/supplement-gc-*.txt` files (see
 * this file's module doc): strips the leading `#`-prefixed provenance
 * header line(s), then splits the remainder into paragraphs on blank
 * lines, running each paragraph through `cleanText` exactly as the MIT
 * HTML paragraphs above are. Nothing else is altered.
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
    // — strip the dangling unterminated tag at the very end so it is not
    // read as literal text, then strip a now-unpaired trailing open anchor
    // tag left behind if the cut instead fell mid-way through a closing
    // `</A>` (see the sibling Meteorologica importer, which hits this case).
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
    // below, for disclosure in the Chapter 8 anomaly text.
    const mitTruncatedTailWords = parsed.truncatedLastWords;

    const chapterDivisions: Division[] = parsed.chapters.map((c) => ({
      id: `book-${bookNum}-ch-${c.number}`,
      number: String(c.number),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: c.paragraphs.join('\n\n'), ref: null } as Passage],
    }));

    // Book I: MIT's own source cuts off mid-word inside Chapter 8 and never
    // carries Chapters 9-10 at all. Supplement all three from a verified
    // public-domain archive.org scan of the same Joachim translation (see
    // this file's module doc for the identifier and verification).
    if (bookNum === 1 && gotTruncated) {
      const ARCHIVE_SOURCE =
        'a public-domain archive.org scan of the same H. H. Joachim translation (identifier worksofaristotle0002unse_a5k0, "The Works of Aristotle Translated into English", ed. W. D. Ross, Vol. II, Oxford: Clarendon Press, 1930), proof-read by eye against the scan\'s own page images; see this importer\'s module doc for the full verification account';
      const SPELLING_NOTE =
        "This supplemented text spells transliterated Greek names with 'k' (Empedokles, Leukippos, Demokritos) exactly as the archive.org scan prints them, which differs from the 'c' spelling (Empedocles, Leucippus, Democritus) MIT's own digitization uses earlier in this same chapter; neither is normalised to match the other.";

      const ch8 = chapterDivisions[chapterDivisions.length - 1]!;
      const ch8Passage = ch8.passages[0]!;
      const tailParagraphs = readSupplement('supplement-gc-1-8-tail.txt');
      if (tailParagraphs.length === 0) fail('supplement-gc-1-8-tail.txt: zero paragraphs');
      // The supplement's first "paragraph" continues MIT's own last, cut-off
      // word ("Ti" + "maeus." -> "Timaeus.") with no space and no invented
      // punctuation; any further supplement paragraphs are appended after it.
      const mergedParagraphs = ch8Passage.text.split('\n\n');
      mergedParagraphs[mergedParagraphs.length - 1] += tailParagraphs[0];
      for (const p of tailParagraphs.slice(1)) mergedParagraphs.push(p);
      ch8Passage.text = mergedParagraphs.join('\n\n');
      ch8Passage.anomaly = `SUPPLEMENTED: MIT's own live source for this page ends mid-sentence/mid-word at exactly this point ("...${mitTruncatedTailWords}") - confirmed genuine, not a fetch error (see the importer's module doc). Everything from "Timaeus." onward in this chapter is supplied from ${ARCHIVE_SOURCE}. ${SPELLING_NOTE}`;
      anomalies.push({
        where: `${WORK_ID} / ${label}-ch-8`,
        note: `Mid-sentence/mid-word cutoff in MIT's own source, supplemented from archive.org: MIT's live HTML response for gener_corr.1.i.html ends here, with no closing navigation footer, confirmed via direct HTTP fetch (received bytes exactly match the server's own declared Content-Length) and independently re-confirmed via a second fetch path. Last surviving MIT words: "...${mitTruncatedTailWords}". Everything from "Timaeus." onward is supplied from ${ARCHIVE_SOURCE}.`,
      });

      for (const chNum of [9, 10] as const) {
        const paragraphs = readSupplement(`supplement-gc-1-${chNum}.txt`);
        if (paragraphs.length === 0) fail(`supplement-gc-1-${chNum}.txt: zero paragraphs`);
        const passage: Passage = {
          n: '',
          text: paragraphs.join('\n\n'),
          ref: null,
          anomaly: `SUPPLEMENTED: MIT's own source for this work never carried Book I Chapter ${chNum} at all (its page for Book I stops mid-way through Chapter 8, with no closing navigation footer). This whole chapter is supplied from ${ARCHIVE_SOURCE}.`,
        };
        chapterDivisions.push({
          id: `book-1-ch-${chNum}`,
          number: String(chNum),
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [passage],
        });
        anomalies.push({
          where: `${WORK_ID} / book-1-ch-${chNum}`,
          note: `Chapter absent from MIT's own source entirely, supplemented from archive.org: MIT's Book I page never carried this chapter (it stops mid-way through Chapter 8). The whole chapter is supplied from ${ARCHIVE_SOURCE}.`,
        });
      }
    }

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
      'MIT\'s Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (verified by direct inspection of both book pages) - only silent, invisible `<A NAME="n">` deep-link anchors, sequentially numbered across each book with no relation to Bekker numbering and no visible rendering. Division.ref is null throughout for both Books and Chapters; nothing is fabricated to supply a citation scheme this source does not carry.',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: 'No footnotes or translator apparatus of any kind were found anywhere in this source (confirmed by direct inspection of both book pages) - there is nothing to strip or disclose beyond the ordinary transport scaffolding (page navigation, `<A NAME>` anchors).',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `Book II is complete (11/11 chapters, confirmed both start and end markers present) with no supplementing needed. Book I is now also complete (10/10 chapters, matching Joachim's own numbering) but only because it is supplemented: MIT's own live source stops mid-word inside Chapter 8 and never carried Chapters 9-10 at all - see the book-1-ch-8, book-1-ch-9 and book-1-ch-10 entries above and this importer's module doc for the full verification account of the archive.org source used to complete it. Total: 21 chapters across 2 books, 18 of them wholly from MIT, 1 (book-1-ch-8) part MIT / part archive.org, and 2 (book-1-ch-9, book-1-ch-10) wholly from archive.org.`,
  });
  anomalies.push({
    where: `${WORK_ID} / archive.org source verification`,
    note: 'The archive.org identifier nominally matching "the 1922 Joachim edition" (oncomingtobepass00arisuoft, "On coming-to-be and passing-away ... A revised text with introduction and commentary by Harold H. Joachim", Clarendon Press, 1922) was checked first and rejected: direct inspection shows it is Joachim\'s own separate Greek critical text with English introduction and commentary, which never prints a continuous English translation at all (his own preface explains the book grew from an attempted plain translation into a text-and-commentary edition instead) - not one word of it was used. The scan actually used, worksofaristotle0002unse_a5k0 ("The Works of Aristotle Translated into English", ed. W. D. Ross, Vol. II, Oxford: Clarendon Press, 1930), was verified to be the correct translation by an exact, word-for-word match against MIT\'s own surviving text at the overlap point ("Such an assertion would commit him to doctrines like those which Plato has set forth in the Timaeus."), continuing seamlessly from MIT\'s own mid-word cutoff.',
  });
  anomalies.push({
    where: `${WORK_ID} / angle-bracket supplements (Joachim's own editorial convention)`,
    note: 'In the archive.org scan, Joachim marks his own editorial supplements to the Greek - short words or clauses he has added to make the English read sensibly, distinct from Aristotle\'s own parenthetical asides - with angle brackets ⟨ ⟩, keeping ordinary round parentheses ( ) for Aristotle\'s own parentheses. This distinction is preserved verbatim in the three archive.org-sourced passages here (book-1-ch-8\'s tail and all of book-1-ch-9 and book-1-ch-10), each pair verified by eye against its own page image: ⟨the visual ray⟩ (book-1-ch-8, p. 326^b, flagged by the scan\'s own footnote "I have added these words..."), ⟨is only possible for those who hold an erroneous view concerning the divisibility of magnitudes. For us⟩ (book-1-ch-9, spanning pp. 326^b-327^a), and ⟨but not to another,⟩ (book-1-ch-10, p. 327^b, nested inside one of Aristotle\'s own round-bracketed asides, which stays round). MIT\'s own HTML for this work contains no "<" or "&lt;" anywhere (confirmed by direct inspection) - MIT\'s digitization has no equivalent marking at all for this convention, so a reader relying on MIT\'s surviving text alone cannot recover which of Joachim\'s own words were his added supplements; only the archive.org-sourced portion of this edition preserves that distinction.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'On Generation and Corruption',
    author: 'Aristotle',
    language: 'en',
    translator: 'H. H. Joachim',
    edition: 'The Works of Aristotle, Vol. II (Oxford: Clarendon Press, 1922), ed. W. D. Ross',
    provenance:
      'The MIT Internet Classics Archive (classics.mit.edu/Aristotle/gener_corr.html), fetched once (table-of-contents page plus both book sub-pages) and committed to this repository under scripts/import-de-generatione-et-corruptione-en/raw/; imported by scripts/import-de-generatione-et-corruptione-en.',
    license:
      "Joachim's 1922 translation is in the public domain (published well over 95 years ago; first published 1922, translator died 1938). The MIT Internet Classics Archive's own HTML presentation is copyright (C) 1994-2009 Daniel C. Stevenson / Web Atomics per its site footer; only the public-domain translated text itself (not MIT's page design, navigation or any other site furniture) is reproduced here, consistent with the Archive's own stated permissions practice for this kind of non-commercial reuse of a public-domain text (see classics.mit.edu/Help/permissions.html).",
    sections: [
      {
        heading: 'Aristotle\'s On Generation and Corruption — English, trans. Joachim',
        paragraphs: [
          "This is Aristotle's On Generation and Corruption (De Generatione et Corruptione) in the English translation made by H. H. Joachim for the Oxford \"Works of Aristotle\" series (Vol. II, ed. W. D. Ross), first published 1922. Book II is reproduced from the MIT Internet Classics Archive; Book I is reproduced from MIT as far as MIT's own source goes and completed from a public-domain archive.org scan of the same translation - see \"Text completeness\" below.",
          'The text here is the translation, verbatim throughout, whichever of the two sources a given word comes from. Nothing is modernised, paraphrased or silently corrected in either source.',
        ],
      },
      {
        heading: 'Translator verification',
        paragraphs: [
          'Condition (a) of this import\'s verification requirement is met directly for the MIT text: both fetched MIT book pages carry the explicit on-page credit line "Translated by H. H. Joachim" (confirmed by direct inspection of the raw HTML, e.g. scripts/import-de-generatione-et-corruptione-en/raw/gener_corr.1.i.html). For the archive.org supplement (Book I Chapter 8\'s tail, and the whole of Chapters 9-10), condition (a) is met by an exact, word-for-word match against MIT\'s own surviving text at the overlap point ("Such an assertion would commit him to doctrines like those which Plato has set forth in the Timaeus.") - see "Text completeness" below for the full verification account, including a source that was checked and rejected as the wrong book.',
        ],
      },
      {
        heading: 'Text completeness',
        paragraphs: [
          'MIT\'s own live HTML page for Book I (gener_corr.1.i.html) ends mid-sentence, mid-word, part-way through Part 8: "...Such an assertion would commit him to doctrines like those which Plato has set forth in the Ti" - the response simply stops there, with no closing navigation footer at all, and MIT\'s page never carried Chapters 9 or 10 at all (Joachim\'s Book I in fact has 10 chapters, not 8). This was confirmed genuine on MIT\'s side (not a download error) via a direct HTTP fetch, whose received byte count exactly matches the server\'s own declared Content-Length header, and independently re-confirmed via a second, unrelated fetch path that reported the identical cutoff point.',
          'This edition is nonetheless complete: the rest of Chapter 8 (from "Timaeus." onward) and the whole of Chapters 9 and 10 are supplied from a public-domain archive.org scan of the very same Joachim translation (identifier worksofaristotle0002unse_a5k0, "The Works of Aristotle Translated into English", ed. W. D. Ross, Vol. II, Oxford: Clarendon Press, 1930). A different archive.org identifier that nominally looked like "the 1922 Joachim edition" (oncomingtobepass00arisuoft) was checked first and rejected, because direct inspection showed it to be a different book - Joachim\'s own separate Greek critical text with English introduction and commentary, which never prints a continuous English translation at all. Every page of the scan actually used, that contributes text (printed pp. 325b-328b), was proof-read by eye against its own archive.org page image before transcription, correcting several OCR errors along the way (see this importer\'s module doc for the list).',
          'Nothing is fabricated, summarised, or paraphrased in either source. Book I Chapter 8\'s Passage carries an `anomaly` field disclosing exactly where MIT\'s text ends and the archive.org text begins; Chapters 9 and 10\'s Passages carry an `anomaly` field disclosing that they come from archive.org entirely, since MIT never had them. See anomalies.json for the full account, including the exact last surviving MIT words and a note on the small "k" vs "c" transliteration-spelling difference between the two sources (e.g. Empedokles vs Empedocles) which is preserved exactly as each source prints it rather than normalised. Book II is complete from MIT alone, with no supplementing needed.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The work is divided into 2 Books and, within each Book, numbered chapters (MIT labels them "Part N"; rendered here as "Chapter N" per this library\'s standing terminology for Aristotle) - Book I has 10 chapters, Book II has 11, matching Joachim\'s own numbering and the traditional Bekker book division.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is (i) the raw HTML of classics.mit.edu/Aristotle/gener_corr.html (table of contents) and its 2 linked book sub-pages (gener_corr.1.i.html, gener_corr.2.ii.html), fetched once via a direct HTTPS request and committed under scripts/import-de-generatione-et-corruptione-en/raw/, and (ii) for the small part of Book I that MIT\'s own source lacks, three hand-transcribed plain-text files (scripts/import-de-generatione-et-corruptione-en/raw/supplement-gc-1-8-tail.txt, supplement-gc-1-9.txt, supplement-gc-1-10.txt) taken from the archive.org scan described under "Text completeness" above, each carrying its own provenance header. Nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer locates each MIT book page\'s real content between its own `<A NAME="start"></A>` and (where present) `<A NAME="end"></A>` markers, splits it into chapters at each `<B>Part N</B>` heading, and splits each chapter into paragraphs at every `<BR><BR>` line-break pair. Only HTML transport scaffolding is removed: the invisible `<A NAME="n">` deep-link anchors (no reference scheme - see below) and the paragraph/line-break markup itself; the words are otherwise untouched. Where Book I\'s MIT page genuinely runs out mid-tag, the importer strips only the dangling unterminated tag fragment, not any actual text. No entities or footnotes were found anywhere in the MIT source. The three archive.org supplement files are then read, their own `#`-prefixed provenance header stripped, and merged in: the Chapter 8 supplement\'s opening word-fragment is joined directly onto MIT\'s own cut-off last word with no space and no invented punctuation, and Chapters 9-10 are appended as whole new chapters in the same shape as MIT\'s own.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter only. Neither MIT\'s Internet Classics Archive nor the archive.org supplement text (as transcribed here) carries Bekker page/column/line markers in-line with the prose - Division.ref is null throughout, for both Books and Chapters, and Passage.ref is null throughout as well. This is a genuine limitation of this specific digital presentation, not something this importer fabricates around.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'This edition is complete (Book I: 10/10 chapters; Book II: 11/11) - see "Text completeness" above for the full account of how Book I\'s Chapter 8 tail and Chapters 9-10 were supplemented from archive.org, and anomalies.json for the complete machine-readable log.',
          'No Bekker apparatus. See "Reference scheme" above.',
          'No footnotes in the MIT-sourced text. The archive.org scan does carry the translator\'s own footnotes on the pages used, but only the running prose translation was transcribed into the supplement files - footnotes are dropped for consistency with the rest of this corpus (Passage.text is plain prose throughout, with no footnote field).',
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
  process.stdout.write('Done. Run `npm run validate:de-generatione-et-corruptione-en` next.\n');
}

main();
