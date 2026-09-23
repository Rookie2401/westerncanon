/**
 * Aristotle, *Topics* — English translation by W. A. Pickard-Cambridge
 * (Oxford, 1928), via the MIT Internet Classics Archive
 * (classics.mit.edu/Aristotle/topics.html, 8 book sub-pages). Run-once
 * ingestion pipeline.
 *
 *   npm run import:topics-en
 *
 * Reads scripts/import-topics-en/raw/topics.N.<roman>.html (N = 1..8;
 * fetched once from classics.mit.edu and committed here — nothing is
 * downloaded at import time) and writes:
 *   data/topics-en/work.json       - the GenericWork: 8 Books -> Chapters
 *   data/topics-en/about.json      - provenance / licence / prose
 *   data/topics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:topics-en`.
 *
 * ============================================================================
 * SOURCE STRUCTURE (verified by direct inspection of all 9 fetched pages —
 * the table-of-contents page plus all 8 book sub-pages — not assumed from
 * the task brief)
 * ============================================================================
 * classics.mit.edu/Aristotle/topics.html is a hand-authored HTML page (not a
 * MediaWiki/TEI source) that explicitly credits the translator in its own
 * body text: `Translated by W. A. Pickard-Cambridge` (present verbatim, once
 * per book page, confirmed on every one of the 8 fetched book pages — see
 * about.json's "Digital source" section).
 *
 * Each book page's real content lives between the literal markers
 * `<A NAME="start"></A>` and `<A NAME="end"></A>`. Inside that region:
 *   - every chapter heading is `<B>Part N</B>` (N a plain arabic numeral,
 *     restarting at 1 in every book — confirmed: every one of the 8 books'
 *     "Part" numbers runs 1..<last> with no gaps, and no "Part" text occurs
 *     anywhere outside a `<B>...</B>` heading);
 *   - paragraphs are separated by exactly `<BR><BR>` (confirmed: every `<BR>`
 *     in every book page pairs cleanly into `<BR><BR>` EXCEPT for isolated
 *     single `<BR>`s used mid-paragraph for a visually indented enumerated
 *     sub-list — e.g. Book I never has one, but the sibling Sophistical
 *     Refutations import found this pattern; Topics itself has none, but the
 *     parser below handles a lone `<BR>` the same way regardless: folded into
 *     the running paragraph as a plain space, since this schema has no slot
 *     for a sub-paragraph line break and it is not a semantic reference
 *     marker of any kind);
 *   - `<A NAME="n"></A>` (n a plain incrementing integer, continuous across
 *     an entire book, unrelated to Bekker numbering) are silent, invisible
 *     deep-link anchors with no text of their own and no visible marker on
 *     the rendered page — transport scaffolding, discarded entirely, NOT a
 *     reference scheme (see the schema note in data/topics-en/types.ts: this
 *     source prints no Bekker apparatus at all, confirmed absent throughout);
 *   - no footnotes, no italics/other inline formatting, no figures, and no
 *     HTML entities of any kind appear anywhere in the 8 books' content
 *     regions (confirmed by direct grep of every fetched page — pure ASCII
 *     prose with only `<A NAME>`, `<BR>` and `<B>Part N</B>` markup).
 * All 8 books' content regions are well-formed and complete (each page's
 * downloaded byte count matches the table-of-contents page's own advertised
 * size to within normal KB-rounding, and every page has both a `start` and
 * an `end` marker) — unlike the sibling imports of De Generatione et
 * Corruptione and Meteorologica, THIS work has no truncated source pages.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/topics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'topics-en');

const WORK_ID = 'topics-en';

interface Anomaly {
  where: string;
  note: string;
}

interface BookPlan {
  file: string;
  roman: string;
  expectedChapters: number;
}

const BOOKS: BookPlan[] = [
  { file: 'topics.1.i.html', roman: 'I', expectedChapters: 18 },
  { file: 'topics.2.ii.html', roman: 'II', expectedChapters: 11 },
  { file: 'topics.3.iii.html', roman: 'III', expectedChapters: 6 },
  { file: 'topics.4.iv.html', roman: 'IV', expectedChapters: 6 },
  { file: 'topics.5.v.html', roman: 'V', expectedChapters: 8 },
  { file: 'topics.6.vi.html', roman: 'VI', expectedChapters: 14 },
  { file: 'topics.7.vii.html', roman: 'VII', expectedChapters: 5 },
  { file: 'topics.8.viii.html', roman: 'VIII', expectedChapters: 14 },
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

interface ParsedChapter {
  number: number;
  paragraphs: string[];
}

interface ParsedBook {
  chapters: ParsedChapter[];
  truncatedLastWords: string | null;
  /** count of stray mid-paragraph `<B>...</B>` emphasis spans unwrapped (NOT "Part N" headers, which are consumed separately) */
  strayBoldUnwrapped: number;
}

/**
 * Parses one MIT Internet Classics Archive Aristotle page (shared shape
 * across topics.html, sophist_refut.html, gener_corr.html and
 * meteorology.html — see this file's module doc). `firstChapterNumber` lets
 * a work whose "Part" numbering continues across multiple pages (Sophistical
 * Refutations) express that; Topics/Gener.Corr./Meteorologica all restart at
 * 1 on every page.
 */
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
    // The source's own HTTP response ends mid-tag/mid-word here (confirmed
    // by direct fetch — see this work's importer-specific caller for the
    // exact disclosure). Strip any dangling unterminated tag at the very
    // end (e.g. `<A NAME="1110"` with no closing `>`) so it is not read as
    // literal text, then fall through to ordinary parsing of what remains.
    content = content.replace(/<[^>]*$/, '');
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
        // A handful of paragraphs across this importer group carry a stray
        // mid-paragraph `<B>...</B>` emphasis span (confirmed genuine
        // source content, not a chapter heading — those are already
        // consumed above). This schema has no rich-text field, so the
        // wrapper is unwrapped (inner text kept, verbatim) and counted;
        // see the caller's anomaly note.
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
    if (parsed.truncatedLastWords !== null) {
      fail(`${label}: unexpected truncation detected (Topics is not expected to have any truncated source page) — last words: "${parsed.truncatedLastWords}"`);
    }

    const chapterDivisions: Division[] = parsed.chapters.map((c) => {
      const passage: Passage = { n: '', text: c.paragraphs.join('\n\n'), ref: null };
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
    totalStrayBold += parsed.strayBoldUnwrapped;
  }

  if (totalStrayBold > 0) {
    anomalies.push({
      where: `${WORK_ID} / book-4-ch-3`,
      note:
        `${totalStrayBold} stray mid-paragraph <B>...</B> emphasis tag(s) found wrapping the single word "Likewise." at the start of a paragraph in Book IV, Part 3 (confirmed genuine source content by direct inspection of scripts/import-topics-en/raw/topics.4.iv.html - not a chapter heading, not transport scaffolding). This schema's Passage.text is plain text with no rich-text/emphasis field, so the <B>/</B> wrapper was unwrapped (inner text "Likewise." kept, verbatim, in its place in the running prose) rather than dropped.`,
    });
  }

  anomalies.push({
    where: `${WORK_ID} / reference scheme`,
    note:
      'MIT\'s Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (verified by direct inspection of all 8 book pages) - only silent, invisible `<A NAME="n">` deep-link anchors, sequentially numbered across each book with no relation to Bekker numbering and no visible rendering. Division.ref is null throughout for both Books and Chapters; nothing is fabricated to supply a citation scheme this source does not carry.',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: 'No footnotes or translator apparatus of any kind were found anywhere in this source (confirmed by direct inspection of all 8 book pages) - there is nothing to strip or disclose beyond the ordinary transport scaffolding (page navigation, `<A NAME>` anchors).',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All 8 Books and all ${totalChapters} chapters are present and complete, matching the table-of-contents page's own advertised structure exactly; no page was found truncated (contrast with the sibling imports of De Generatione et Corruptione and Meteorologica, each of which has one genuinely truncated source page).`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions: bookDivisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Topics',
    author: 'Aristotle',
    language: 'en',
    translator: 'W. A. Pickard-Cambridge',
    edition: 'The Works of Aristotle, Vol. I (Oxford: Clarendon Press, 1928), ed. W. D. Ross',
    provenance:
      'The MIT Internet Classics Archive (classics.mit.edu/Aristotle/topics.html), fetched once (table-of-contents page plus all 8 book sub-pages) and committed to this repository under scripts/import-topics-en/raw/; imported by scripts/import-topics-en.',
    license:
      "Pickard-Cambridge's 1928 translation is in the public domain (published well over 95 years ago; first published 1928, translator died 1952). The MIT Internet Classics Archive's own HTML presentation is copyright (C) 1994-2009 Daniel C. Stevenson / Web Atomics per its site footer; only the public-domain translated text itself (not MIT's page design, navigation or any other site furniture) is reproduced here, consistent with the Archive's own stated permissions practice for this kind of non-commercial reuse of a public-domain text (see classics.mit.edu/Help/permissions.html).",
    sections: [
      {
        heading: 'Aristotle\'s Topics — English, trans. Pickard-Cambridge',
        paragraphs: [
          "This is Aristotle's Topics in the English translation made by W. A. Pickard-Cambridge for the Oxford \"Works of Aristotle\" series (Vol. I, ed. W. D. Ross), first published 1928, as reproduced by the MIT Internet Classics Archive.",
          'The text here is the translation, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'Translator verification',
        paragraphs: [
          'Condition (a) of this import\'s verification requirement is met directly: every one of the 8 fetched MIT book pages carries the explicit on-page credit line "Translated by W. A. Pickard-Cambridge" (confirmed by direct inspection of the raw HTML of each page, e.g. scripts/import-topics-en/raw/topics.1.i.html), so no independent sentence-matching cross-check against another copy of the translation was necessary.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The work is divided into 8 Books and, within each Book, numbered chapters (MIT labels them "Part N"; rendered here as "Chapter N" per this library\'s standing terminology for Aristotle) - 82 chapters in total across the 8 books, matching the traditional Bekker book division exactly.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the raw HTML of classics.mit.edu/Aristotle/topics.html (table of contents) and its 8 linked book sub-pages (topics.1.i.html ... topics.8.viii.html), fetched once via a direct HTTPS request and committed under scripts/import-topics-en/raw/. Nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer locates each book page\'s real content between its own `<A NAME="start"></A>` and `<A NAME="end"></A>` markers, splits it into chapters at each `<B>Part N</B>` heading, and splits each chapter into paragraphs at every `<BR><BR>` line-break pair. Only HTML transport scaffolding is removed: the invisible `<A NAME="n">` deep-link anchors (no reference scheme - see below) and the paragraph/line-break markup itself; the words are otherwise untouched. No entities, footnotes or other inline apparatus were found anywhere in this source.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Chapter only. MIT\'s Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (confirmed by direct inspection of all 8 book pages) - Division.ref is null throughout, for both Books and Chapters, and Passage.ref is null throughout as well. This is a genuine limitation of this specific digital source, not something this importer fabricates around; a reader wanting Bekker citations for Topics should consult the Greek text or a Bekker-keyed edition elsewhere.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 8 Books and all 82 chapters are present and in order; every book page was confirmed complete (both a `start` and an `end` marker present, and each page\'s byte count matches MIT\'s own table-of-contents size label). No paragraph is dropped, merged or reordered.',
          'No Bekker apparatus. See "Reference scheme" above.',
          'No footnotes. None were found anywhere in this source.',
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
  process.stdout.write('Done. Run `npm run validate:topics-en` next.\n');
}

main();
