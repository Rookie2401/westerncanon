/**
 * Aristotle, *On Sophistical Refutations* — English translation by W. A.
 * Pickard-Cambridge (Oxford, 1928), via the MIT Internet Classics Archive
 * (classics.mit.edu/Aristotle/sophist_refut.html, 3 "Section" sub-pages).
 * Run-once ingestion pipeline.
 *
 *   npm run import:sophistical-refutations-en
 *
 * Reads scripts/import-sophistical-refutations-en/raw/sophist_refut.N.N.html
 * (N = 1..3; fetched once from classics.mit.edu and committed here — nothing
 * is downloaded at import time) and writes:
 *   data/sophistical-refutations-en/work.json       - the GenericWork: 34 flat chapters (no Book level — see below)
 *   data/sophistical-refutations-en/about.json      - provenance / licence / prose
 *   data/sophistical-refutations-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:sophistical-refutations-en`.
 *
 * ============================================================================
 * SOURCE STRUCTURE (verified by direct inspection of all 4 fetched pages —
 * the table-of-contents page plus all 3 "Section" sub-pages)
 * ============================================================================
 * classics.mit.edu/Aristotle/sophist_refut.html is a hand-authored HTML page
 * (not MediaWiki/TEI) that explicitly credits the translator in its own body
 * text: `Translated by W. A. Pickard-Cambridge` (present verbatim on every
 * one of the 3 fetched sub-pages — see about.json's "Digital source"
 * section).
 *
 * MIT splits this work into 3 "Section" sub-pages purely for file size —
 * confirmed NOT a structural/Book division: the page's own chapter headings
 * are `<B>Part N</B>`, and N runs CONTINUOUSLY 1..34 across all three pages
 * with no restart (Section 1 = Parts 1-10, Section 2 = Parts 11-20, Section
 * 3 = Parts 21-34) — i.e. exactly the traditional single-book, 34-chapter
 * structure of this work. "Section" is MIT's own pagination label, discarded
 * entirely (not surfaced anywhere in this schema).
 *
 * Each sub-page's real content lives between the literal markers
 * `<A NAME="start"></A>` and `<A NAME="end"></A>` (present, and the byte
 * count of every sub-page matches the table-of-contents page's own
 * advertised size to within normal KB-rounding — no truncation here, unlike
 * the sibling imports of De Generatione et Corruptione and Meteorologica).
 * Inside that region:
 *   - paragraphs are separated by exactly `<BR><BR>`, with isolated single
 *     `<BR>`s used mid-paragraph in a few places for a visually indented
 *     enumerated sub-list (e.g. Part 4's seven-item list of fallacy types) —
 *     folded into the running paragraph as a plain space, since this schema
 *     has no slot for a sub-paragraph line break and it is not a semantic
 *     reference marker of any kind;
 *   - `<A NAME="n"></A>` (n a plain incrementing integer, continuous within
 *     each sub-page, unrelated to Bekker numbering) are silent, invisible
 *     deep-link anchors — transport scaffolding, discarded entirely, NOT a
 *     reference scheme (this source prints no Bekker apparatus at all);
 *   - one stray mid-paragraph `<B>...</B>` emphasis span was found (see the
 *     parser below and the matching anomaly note) — confirmed genuine source
 *     content, not a chapter heading;
 *   - no footnotes, no other inline formatting, no figures, and no HTML
 *     entities of any kind appear anywhere in the 3 sub-pages' content
 *     regions.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/sophistical-refutations-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const OUT_DIR = join(REPO_ROOT, 'data', 'sophistical-refutations-en');

const WORK_ID = 'sophistical-refutations-en';

interface Anomaly {
  where: string;
  note: string;
}

interface PagePlan {
  file: string;
  firstChapter: number;
  expectedChapters: number;
}

const PAGES: PagePlan[] = [
  { file: 'sophist_refut.1.1.html', firstChapter: 1, expectedChapters: 10 },
  { file: 'sophist_refut.2.2.html', firstChapter: 11, expectedChapters: 10 },
  { file: 'sophist_refut.3.3.html', firstChapter: 21, expectedChapters: 14 },
];
const TOTAL_EXPECTED_CHAPTERS = 34;

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

interface ParsedPage {
  chapters: ParsedChapter[];
  truncatedLastWords: string | null;
  strayBoldUnwrapped: number;
}

/** Parses one MIT Internet Classics Archive Aristotle page (shared shape across this importer group — see this file's module doc). */
function parseMitPage(html: string, label: string, firstChapterNumber: number): ParsedPage {
  const startMarker = '<A NAME="start"></A>';
  const startIdx = html.indexOf(startMarker);
  if (startIdx < 0) fail(`${label}: could not find <A NAME="start"></A> marker`);
  const contentStart = startIdx + startMarker.length;

  const endMarker = '<A NAME="end"></A>';
  const endIdx = html.indexOf(endMarker, contentStart);
  const truncated = endIdx < 0;
  let content = truncated ? html.slice(contentStart) : html.slice(contentStart, endIdx);
  if (truncated) content = content.replace(/<[^>]*$/, '');

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
  const divisions: Division[] = [];
  let totalStrayBold = 0;

  for (const plan of PAGES) {
    const html = readFileSync(join(RAW_DIR, plan.file), 'utf8');
    const label = plan.file;
    const parsed = parseMitPage(html, label, plan.firstChapter);

    if (parsed.chapters.length !== plan.expectedChapters) {
      fail(`${label}: expected ${plan.expectedChapters} chapters, parsed ${parsed.chapters.length}`);
    }
    if (parsed.truncatedLastWords !== null) {
      fail(`${label}: unexpected truncation detected (Sophistical Refutations is not expected to have any truncated source page) — last words: "${parsed.truncatedLastWords}"`);
    }
    totalStrayBold += parsed.strayBoldUnwrapped;

    for (const c of parsed.chapters) {
      const passage: Passage = { n: '', text: c.paragraphs.join('\n\n'), ref: null };
      divisions.push({
        id: `ch-${c.number}`,
        number: String(c.number),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      });
    }
  }

  if (divisions.length !== TOTAL_EXPECTED_CHAPTERS) {
    fail(`expected ${TOTAL_EXPECTED_CHAPTERS} total chapters, got ${divisions.length}`);
  }

  if (totalStrayBold > 0) {
    anomalies.push({
      where: `${WORK_ID} / stray emphasis`,
      note: `${totalStrayBold} stray mid-paragraph <B>...</B> emphasis tag(s) found wrapping a word or short phrase within the running prose (confirmed genuine source content, not a chapter heading and not transport scaffolding). This schema's Passage.text is plain text with no rich-text/emphasis field, so the <B>/</B> wrapper was unwrapped (inner text kept, verbatim, in its place) rather than dropped.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      'This is traditionally a single-book, 34-chapter work. MIT\'s own page splits it into 3 "Section" sub-pages purely for file size - confirmed by direct inspection: the "Part N" chapter numbering (MIT\'s own label, rendered here as "Chapter N" per this library\'s standing terminology) runs continuously 1..34 across all three sub-pages with no restart at any sub-page boundary and no relation to the "Section" grouping. Per this app\'s existing convention for a single-book Aristotle treatise (see data/categoriae-en), this edition has NO Book level at all: divisions is a flat list of the 34 chapters directly. MIT\'s "Section" pagination is discarded entirely, not surfaced anywhere in this schema.',
  });
  anomalies.push({
    where: `${WORK_ID} / reference scheme`,
    note:
      'MIT\'s Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (verified by direct inspection of all 3 sub-pages) - only silent, invisible `<A NAME="n">` deep-link anchors, sequentially numbered within each sub-page with no relation to Bekker numbering and no visible rendering. Division.ref is null throughout; nothing is fabricated to supply a citation scheme this source does not carry.',
  });
  anomalies.push({
    where: `${WORK_ID} / footnotes`,
    note: 'No footnotes or translator apparatus of any kind were found anywhere in this source (confirmed by direct inspection of all 3 sub-pages) - there is nothing to strip or disclose beyond the ordinary transport scaffolding (page navigation, `<A NAME>` anchors).',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All 34 chapters are present and complete, matching the table-of-contents page's own advertised structure exactly; no page was found truncated (contrast with the sibling imports of De Generatione et Corruptione and Meteorologica, each of which has one genuinely truncated source page).`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'On Sophistical Refutations',
    author: 'Aristotle',
    language: 'en',
    translator: 'W. A. Pickard-Cambridge',
    edition: 'The Works of Aristotle, Vol. I (Oxford: Clarendon Press, 1928), ed. W. D. Ross',
    provenance:
      'The MIT Internet Classics Archive (classics.mit.edu/Aristotle/sophist_refut.html), fetched once (table-of-contents page plus all 3 "Section" sub-pages) and committed to this repository under scripts/import-sophistical-refutations-en/raw/; imported by scripts/import-sophistical-refutations-en.',
    license:
      "Pickard-Cambridge's 1928 translation is in the public domain (published well over 95 years ago; first published 1928, translator died 1952). The MIT Internet Classics Archive's own HTML presentation is copyright (C) 1994-2009 Daniel C. Stevenson / Web Atomics per its site footer; only the public-domain translated text itself (not MIT's page design, navigation or any other site furniture) is reproduced here, consistent with the Archive's own stated permissions practice for this kind of non-commercial reuse of a public-domain text (see classics.mit.edu/Help/permissions.html).",
    sections: [
      {
        heading: 'Aristotle\'s On Sophistical Refutations — English, trans. Pickard-Cambridge',
        paragraphs: [
          "This is Aristotle's On Sophistical Refutations (De Sophisticis Elenchis), traditionally the ninth and final treatise of the Organon, in the English translation made by W. A. Pickard-Cambridge for the Oxford \"Works of Aristotle\" series (Vol. I, ed. W. D. Ross), first published 1928, as reproduced by the MIT Internet Classics Archive.",
          'The text here is the translation, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'Translator verification',
        paragraphs: [
          'Condition (a) of this import\'s verification requirement is met directly: every one of the 3 fetched MIT sub-pages carries the explicit on-page credit line "Translated by W. A. Pickard-Cambridge" (confirmed by direct inspection of the raw HTML, e.g. scripts/import-sophistical-refutations-en/raw/sophist_refut.1.1.html), so no independent sentence-matching cross-check against another copy of the translation was necessary.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'This is a single, undivided book of 34 chapters (MIT labels them "Part N"; rendered here as "Chapter N" per this library\'s standing terminology for Aristotle), matching the traditional chapter count exactly. Unlike Topics (this work\'s companion treatise, which MIT itself divides into 8 separate Book pages), MIT presents this work as one continuous work split across 3 "Section" sub-pages purely for file size - see the "Structure" note in anomalies.json.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the raw HTML of classics.mit.edu/Aristotle/sophist_refut.html (table of contents) and its 3 linked sub-pages (sophist_refut.1.1.html, sophist_refut.2.2.html, sophist_refut.3.3.html), fetched once via a direct HTTPS request and committed under scripts/import-sophistical-refutations-en/raw/. Nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer locates each sub-page\'s real content between its own `<A NAME="start"></A>` and `<A NAME="end"></A>` markers, splits it into chapters at each `<B>Part N</B>` heading (numbering continuous across all 3 sub-pages), and splits each chapter into paragraphs at every `<BR><BR>` line-break pair. Only HTML transport scaffolding is removed: the invisible `<A NAME="n">` deep-link anchors (no reference scheme - see below), the paragraph/line-break markup, and one stray mid-paragraph `<B>...</B>` emphasis span (unwrapped, text kept - see anomalies.json); the words are otherwise untouched. No entities were found anywhere in this source.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Chapter only (this is a single-book work - no Book level exists in this schema). MIT\'s Internet Classics Archive prints NO Bekker page/column/line markers anywhere in this work (confirmed by direct inspection of all 3 sub-pages) - Division.ref is null throughout, and Passage.ref is null throughout as well. This is a genuine limitation of this specific digital source, not something this importer fabricates around; a reader wanting Bekker citations should consult the Greek text or a Bekker-keyed edition elsewhere.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 34 chapters are present and in order; every sub-page was confirmed complete (both a `start` and an `end` marker present, and each page\'s byte count matches MIT\'s own table-of-contents size label). No paragraph is dropped, merged or reordered.',
          'No Bekker apparatus. See "Reference scheme" above.',
          'No footnotes. None were found anywhere in this source.',
          'See anomalies.json for the complete machine-readable log, including the "Structure" note explaining why this edition has no Book level.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(`\n  ${divisions.length} chapters  ${totalChars} chars\n`);
  process.stdout.write('Done. Run `npm run validate:sophistical-refutations-en` next.\n');
}

main();
