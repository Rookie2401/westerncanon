/**
 * Aristotle, *Prior Analytics* (Analytica Priora) — A. J. Jenkinson's English
 * translation (Oxford, 1928), via English Wikisource's page-scan
 * transclusion. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-prior-analytics-en/index.ts
 *
 * Reads scripts/import-prior-analytics-en/raw/prior-analytics-book-N.parse.json
 * (N = 1, 2; already in the repo — the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API). Writes:
 *   data/prior-analytics-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/prior-analytics-en/about.json      - provenance / licence metadata + About prose
 *   data/prior-analytics-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-prior-analytics-en/validate.ts`.
 *
 * --- FINDING THE RIGHT PAGE (this work had no obvious home) ---------------
 * This batch's brief flagged the Prior Analytics as needing its page located
 * by search, and warned it might turn out to be a stub. Both halves were
 * checked:
 *   - The bare title "Prior Analytics" is NOT the text: it is a
 *     {{translations}} disambiguation page (395 bytes) listing two English
 *     versions — Octavius Freire Owen's of 1853, under "Organon (Owen)/Prior
 *     Analytics", and Jenkinson's of 1928, under "The Works of Aristotle/
 *     Prior Analytics".
 *   - "Prior Analytics/Book I" and "/Book II" DO NOT EXIST (a batched
 *     MediaWiki existence check returns `missing` for both).
 *   - Jenkinson's version lives under the SAME base page this library's
 *     Categories import already uses ("The Works of Aristotle/Categories"),
 *     so the book subpages are "The Works of Aristotle/Prior Analytics/Book I"
 *     and "/Book II". Both exist and both were fetched.
 * Jenkinson, 1928, is the translation this batch asked for, so Owen's 1853
 * version was not used; it is noted in anomalies.json as the alternative that
 * exists but was not the specified edition.
 *
 * --- IT IS NOT A STUB -----------------------------------------------------
 * Both book subpages carry real, proofread prose: 184 KB of visible text in
 * Book I and 122 KB in Book II, yielding the FULL standard division — 46
 * chapters in Book I and 27 in Book II, 73 in all — with no red links inside
 * the text and no truncation anywhere.
 *
 * --- Source technique and markers -----------------------------------------
 * These subpages ARE page-scan transclusions (their wikitext is ~970 bytes of
 * `<pages index="Works of Aristotle - vol. 1, ed. Ross - 1928 ... .djvu" .../>`),
 * so the rendered HTML was fetched and parsed with jsdom. Chapter markers are
 * a `span.wst-anchor` whose id is `Chapter_N`, wrapped in a floated
 * `span.wst-woach`; Bekker page markers live in `span.wst-bekker`. Note that
 * this work begins at Bekker 24a, so its page tokens are TWO digits plus a
 * column letter — the shared parser's Bekker pattern accepts those precisely
 * because of this work.
 *
 * The source also prints marginal Bekker LINE numbers (5, 10, 15, ...) in
 * `span.wst-verse`. Those are line-level marginalia, not page references and
 * not words of the translation; they are removed from the reading text and
 * are not used for Division.ref.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPageScanImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'prior-analytics-en';

const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
const ROMAN = ['', 'I', 'II'];

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'Prior Analytics',
  author: 'Aristotle',
  language: 'en',
  translator: 'Alfred James Jenkinson',
  editor: 'William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume I: Analytica Priora, trans. A. J. Jenkinson, ed. W. D. Ross (Oxford: Clarendon Press, 1928)',
  provenance:
    'English Wikisource, pages "The Works of Aristotle/Prior Analytics/Book I" and "/Book II", each fetched once via the MediaWiki action=parse&prop=text API. These are page-scan transclusions of the 1928 Oxford volume I djvu: action=parse&prop=wikitext returns only about 970 bytes of <pages/> markup rather than the text, so the rendered HTML was fetched and parsed with jsdom instead. The raw per-book dumps are committed under scripts/import-prior-analytics-en/raw/. Note that the bare Wikisource title "Prior Analytics" is a disambiguation page, not the text, and that no standalone "Prior Analytics/Book I" page exists.',
  license:
    "Jenkinson's 1928 translation is in the public domain (published before 1929; the Oxford 'Works of Aristotle' volumes of this period are long out of copyright). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        "Aristotle's Prior Analytics in A. J. Jenkinson's English translation, made for the Oxford Works of Aristotle Translated into English under the general editorship of W. D. Ross and published in 1928 as part of that series' volume I — the same volume, and the same project, as the Categories and De Interpretatione already in this library. It is the founding text of formal logic: the theory of the syllogism, worked through figure by figure and mood by mood, with the modal syllogistic and then the practical business of finding premisses, analysing arguments and detecting fallacies.",
        'The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.',
      ],
    },
    {
      heading: 'Completeness',
      paragraphs: [
        'This edition is complete: both books, seventy-three chapters — forty-six in Book I and twenty-seven in Book II — matching the standard division exactly. Every page-scan behind the text is proofread; there are no red links within the text and nothing is truncated.',
      ],
    },
    {
      heading: 'Which translation, and where it lives',
      paragraphs: [
        'English Wikisource carries two English Prior Analytics. The bare title "Prior Analytics" is only a signpost between them: Octavius Freire Owen\'s version of 1853, and Jenkinson\'s of 1928. This edition is Jenkinson\'s, the Oxford one, which sits under the same "The Works of Aristotle" base page as this library\'s Categories.',
        'That mattered in practice, because the obvious guesses are wrong: there is no page at "Prior Analytics/Book I" at all. The right location was established by following the disambiguation page rather than by assuming a title, and both book subpages were then checked for real transcribed text before anything was imported.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is the rendered HTML of the two Wikisource book subpages, fetched once each through the MediaWiki action=parse&prop=text API and committed under the importer\'s raw/ directory. These pages genuinely are djvu page-scan transclusions of the 1928 Oxford volume — their wikitext holds only transclusion markup and no text at all — so the already-rendered HTML was fetched and parsed with jsdom, exactly as this library\'s Metaphysics import does. It is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Chapters are marked in this source by a numbered anchor set in the margin at the head of a paragraph; each such anchor starts a new Chapter division, and every paragraph beneath it, in document order, becomes part of that chapter\'s single Passage. The running titles ("ANALYTICA PRIORA", "BOOK I", "BOOK II") are page furniture rather than Aristotle\'s words and are skipped and counted.',
        'Two kinds of marginal number appear in this source and are treated differently: Bekker PAGE markers become the chapter\'s reference, while Bekker LINE numbers — the 5, 10, 15 running down the margin — are stripped from the reading text and not used as references, since they mark positions within a page rather than citable divisions. Jenkinson\'s footnote markers are likewise stripped; the notes themselves are editorial apparatus, are rendered by the source in a separate block, and are not preserved here, matching this library\'s other English translations.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by book and chapter, plus a Bekker page reference. This source prints Bekker page markers throughout, so each chapter\'s markers are gathered in document order to give it a real page or page range (24a, 26a–26b, and so on). The Prior Analytics begins at Bekker page 24a, which is why these page tokens are two digits and a column letter rather than the four-digit forms seen elsewhere in this library.',
        'Passage.ref is null throughout: no marker is printed at every paragraph break, so a paragraph-level citation would have to be invented. A handful of chapters carry no page marker of their own — where a chapter begins and ends within a page already marked — and their Division.ref is null rather than guessed.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        'There are no gaps in the text. anomalies.json records the mechanical departures: how the correct page was located and which titles turned out not to exist, the alternative Owen translation that was deliberately not used, the running titles skipped, the distinction between Bekker page and line markers, the footnote markers stripped, and the reference scheme.',
        "A word on trust: Wikisource's page-scan proofreading for this volume is complete for the pages used here, but community validation is an ongoing process, so isolated transcription slips remain possible. That is a disclosed limitation of the source rather than something quietly corrected in this build.",
      ],
    },
  ],
};

runPageScanImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: join(REPO_ROOT, 'data', WORK_ID),
  shape: 'book-chapter',
  markerShape: 'wst-anchor',
  bekkerContainer: 'span.wst-bekker',
  furnitureExact: ['ANALYTICA PRIORA', 'BOOK I', 'BOOK II'],
  pages: [1, 2].map((n) => ({
    rawFile: `prior-analytics-book-${n}.parse.json`,
    pageTitle: `The Works of Aristotle/Prior Analytics/Book ${ROMAN[n]}`,
    label: `book-${n}`,
    expectedChapters: run(n === 1 ? 46 : 27),
    book: n,
  })),
  about,
  extraAnomalies: [
    {
      where: `${WORK_ID} / page location`,
      note: 'The correct Wikisource location was established by search rather than guessed, because the obvious titles are wrong. The bare title "Prior Analytics" is a {{translations}} DISAMBIGUATION page (395 bytes), not the text. "Prior Analytics/Book I" and "/Book II" DO NOT EXIST — a batched MediaWiki existence check returns `missing` for both. Jenkinson\'s 1928 Oxford translation lives under the same base page as this library\'s Categories import: "The Works of Aristotle/Prior Analytics/Book I" and "/Book II", which is what this importer uses.',
    },
    {
      where: `${WORK_ID} / alternative translation not used`,
      note: 'English Wikisource also carries Octavius Freire Owen\'s 1853 translation of the Prior Analytics at "Organon (Owen)/Prior Analytics" (7,752 bytes of wikitext). It is equally public domain, but this batch specified Jenkinson\'s 1928 Oxford version, so Owen\'s was deliberately not used and no text from it appears in this build. Recorded here so the choice is visible rather than implicit.',
    },
    {
      where: `${WORK_ID} / CONTENT-VERIFIED, not a stub`,
      note: 'This batch\'s brief warned that the Prior Analytics might turn out to be a red-link stub, in which case nothing was to be shipped. It is not: both book subpages carry real, proofread prose (184 KB of visible text in Book I, 122 KB in Book II) and yield the FULL standard division — 46 chapters in Book I and 27 in Book II, 73 in all — with no red links inside the text and no truncation.',
    },
    {
      where: `${WORK_ID} / Bekker line numbers distinguished from page markers`,
      note: 'This source prints TWO kinds of marginal number: Bekker PAGE markers (24a, 25b, ...) in span.wst-bekker, and Bekker LINE numbers (5, 10, 15, ... — 441 of them in Book I alone) in span.wst-verse. Only the page markers are used for Division.ref; the line numbers are marginalia marking positions within a page rather than citable divisions, and are stripped from the reading text along with the page markers. Using span.wst-verse here as the Bekker container — as the Eudemian Ethics import correctly does for ITS source — would have produced nonsense references like "5–30", which is why the container is specified per work rather than assumed.',
    },
    {
      where: `${WORK_ID} / chapters without a page reference`,
      note: 'A few chapters begin and end within a page whose Bekker marker was already printed earlier, so no marker falls inside them; their Division.ref is null rather than being interpolated from the neighbouring chapters. A guessed page reference would be an invented citation.',
    },
    {
      where: `${WORK_ID} / relation to the Greek sibling`,
      note: 'This English edition was parsed entirely independently of any Greek edition of the Prior Analytics; the two are not forced to agree on chapter boundaries, and no division here was adjusted to match a Greek text.',
    },
  ],
});
