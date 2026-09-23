/**
 * [Aristotle], *On Plants* (De plantis) — E. S. Forster's English translation
 * (Oxford, 1913), via English Wikisource's page-scan transclusion of
 * "On Plants". Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-plantis-en/index.ts
 *
 * Reads scripts/import-de-plantis-en/raw/on-plants.parse.json (already in the
 * repo — the RENDERED HTML from the MediaWiki action=parse&prop=text API).
 * Writes:
 *   data/de-plantis-en/work.json       - the GenericWork (Book -> Chapter)
 *   data/de-plantis-en/about.json      - provenance / licence metadata + About prose
 *   data/de-plantis-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-plantis-en/validate.ts`.
 *
 * --- TWO BOOKS, NOT A FLAT TEXT (the brief asked; inspection answered) ----
 * This batch's brief left open whether On Plants has book/chapter divisions
 * or is one short flowing text. It has TWO BOOKS: the rendered page marks
 * them itself with `<div class="wst-heading">BOOK I</div>` and `BOOK II`, so
 * this edition is a two-level Book -> Chapter tree, split on the source's own
 * headings — Book I chapters 1-7, Book II chapters 1-10.
 *
 * --- FRONT MATTER EXCLUDED ------------------------------------------------
 * The page opens with the 1913 title page (DE PLANTIS / BY / E. S. FORSTER /
 * OXFORD / AT THE CLARENDON PRESS / 1913), then Forster's own signed PREFACE
 * — five paragraphs on the treatise's authorship and its mangled textual
 * history — then a CONTENTS heading. All of that is the translator's
 * editorial apparatus rather than the treatise, so the import begins at the
 * first paragraph of the text proper (paragraph index 14, established by
 * reading the rendered page). The omission is disclosed in anomalies.json;
 * the Preface's substance is summarised in about.json rather than passed off
 * as part of the work.
 *
 * --- Markers: both kinds share ONE container ------------------------------
 * This source puts its Bekker page markers AND its chapter numbers in the
 * same `span.wst-sidenote` margin element, so the two are told apart by SHAPE
 * rather than by position: a bare 1-2 digit integer is a chapter number, a
 * page/column token like "815a" is a Bekker reference, and a line range like
 * "9–11" is neither and is ignored. This is exactly why the shared parser's
 * Bekker pattern requires a column letter on two-digit numbers.
 *
 * --- Book II chapter 1 is unmarked ---------------------------------------
 * The source prints no "1" sidenote after its BOOK II heading; its numbering
 * resumes visibly at 2. The first chapter is therefore recovered from the
 * book boundary itself (the text between the BOOK II heading and the "2"
 * marker), which the parser logs. Nothing is invented: the chapter's text is
 * exactly what the source prints there.
 *
 * Verified before writing this importer: 108 KB of visible text, chapters
 * complete, and the single red link on the page falls in Forster's PREFACE
 * (an unrelated author link), not in the treatise — so no reading text is
 * truncated.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPageScanImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'de-plantis-en';

const run = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

// Front matter is skipped STRUCTURALLY, by starting at the source's own first
// "BOOK I" heading, rather than by a hard-coded paragraph index. An earlier
// index-based version of this went stale the moment the parser learned to
// recover paragraphs the source leaves outside any <p>.

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'On Plants',
  author: 'Aristotle (attributed)',
  language: 'en',
  translator: 'Edward Seymour Forster',
  editor: 'John Alexander Smith and William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume VI: Opuscula — De plantis, trans. E. S. Forster (Oxford: Clarendon Press, 1913)',
  provenance:
    'English Wikisource, page "On Plants", fetched once via the MediaWiki action=parse&prop=text API. This is a page-scan transclusion of "The Works of Aristotle - Vol. 6 - Opuscula (1913).djvu" (pages 77-120): action=parse&prop=wikitext returns only 663 bytes of <pages/> markup rather than the text, so the rendered HTML was fetched and parsed with jsdom instead. The raw dump is committed at scripts/import-de-plantis-en/raw/on-plants.parse.json.',
  license:
    "Forster's 1913 translation is in the public domain (published before 1929; the Oxford 'Works of Aristotle' volumes of this period are long out of copyright). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        'On Plants in E. S. Forster\'s English translation, made for the Oxford Works of Aristotle Translated into English and published in 1913 in that series\' volume VI, the Opuscula. Its two books ask whether plants have life, desire and sex; how they are nourished and how they grow; and then work through their parts, juices, colours and fruits, the effects of soil and water and climate, and why leaves fall.',
        'The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.',
      ],
    },
    {
      heading: 'Authorship, and a badly travelled text',
      paragraphs: [
        'This treatise is not Aristotle\'s. The Wikisource page describes it as widely believed spurious and probably the work of Nicolaus of Damascus, and Forster\'s own preface — which this edition does not include as text — explains why it reads so strangely: the Greek original is lost, and what survives reached Latin by a chain of translation through Arabic and back into Greek, with the damage one would expect. Forster translated from the Latin version of Alfredus as edited by E. H. F. Meyer.',
        'It is filed here under Aristotle\'s name because that is how the Oxford edition transmits it, with the doubt recorded rather than hidden. Readers should treat its oddities as features of a much-mangled transmission rather than as Aristotle writing badly.',
      ],
    },
    {
      heading: 'Structure: two books',
      paragraphs: [
        'On Plants divides into two books, and this edition follows the source\'s own marking: the page prints "BOOK I" and "BOOK II" as headings, and the chapters run 1 to 7 under the first and 1 to 10 under the second.',
        'One wrinkle is preserved rather than smoothed over: the source prints no chapter number at the start of Book II — its marginal numbering resumes visibly at 2 — so Book II chapter 1 is the text standing between the BOOK II heading and the first printed "2". That is exactly what the source gives at that point; no text has been moved, invented, or renumbered.',
      ],
    },
    {
      heading: 'What is deliberately NOT included',
      paragraphs: [
        'The Wikisource page begins with the 1913 title page, then Forster\'s own signed preface, then a contents heading. None of that is the treatise, and none of it is Aristotle or his imitator: it is the translator\'s editorial front matter. This edition therefore starts at the first words of the text proper and leaves the front matter out, recording the omission rather than quietly dropping it.',
        'Translator\'s footnotes are likewise not preserved. This source is heavily annotated — Forster tracks the Latin\'s corruptions closely — and every footnote marker is stripped from the reading text, counted, with the notes themselves left behind, matching this library\'s other English translations.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is the rendered HTML of the English Wikisource page "On Plants", fetched once through the MediaWiki action=parse&prop=text API and committed under the importer\'s raw/ directory. This page genuinely is a djvu page-scan transclusion — its wikitext holds only a few hundred bytes of transclusion markup and no text at all — so the already-rendered HTML was fetched and parsed with jsdom. It is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'This source is unusual in putting two quite different things in the same margin: its Bekker page references and its chapter numbers share one sidenote element. They are therefore told apart by shape — a bare one- or two-digit number is a chapter, a page-and-column token such as 815a is a reference, and a line range such as "9–11" is neither and is ignored. Both are removed from the reading text, where they are marginalia rather than words.',
        'Book boundaries come from the source\'s own "BOOK I" and "BOOK II" headings. The importer refuses to ship a division it has not been told to expect: each book declares its exact chapter numbers in advance, and a mismatch stops the run rather than silently producing a different structure.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by book and chapter, plus a Bekker page reference. This source prints Bekker page markers throughout, so each chapter\'s markers are gathered in document order to give it a real page or page range (815a–816b, and so on). Passage.ref is null throughout, since no marker is printed at every paragraph break. Two chapters carry no marker of their own, falling wholly within a page already marked; their reference is null rather than guessed.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        'The treatise text is complete: the only red link on the page falls inside Forster\'s preface, which this edition does not import, so no reading text is truncated. anomalies.json records the rest: the excluded front matter, the unmarked first chapter of Book II, the shared sidenote container and how the two kinds of marker are distinguished, the footnote markers stripped, the questionable attribution, and two transcription oddities preserved verbatim at the end of the work.',
        "A word on trust: this treatise reached English through an exceptionally damaged transmission, and Wikisource's community validation is an ongoing process, so both the text's own oddities and isolated transcription slips should be expected. Neither is corrected here — this library never edits a source into looking better than it is.",
      ],
    },
  ],
};

runPageScanImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: join(REPO_ROOT, 'data', WORK_ID),
  shape: 'book-chapter',
  markerShape: 'sidenote-number',
  bekkerContainer: 'span.wst-sidenote',
  bookHeadingRe: /^BOOK\s+[IVXLCDM]+$/i,
  startAtFirstBookHeading: true,
  pages: [
    {
      rawFile: 'on-plants.parse.json',
      pageTitle: 'On Plants',
      label: 'page',
      expectedChapters: run(7), // Book I; Book II is declared below
      expectedByBook: { 1: run(7), 2: run(10) },
      book: 1,
    },
  ],
  about,
  extraAnomalies: [
    {
      where: `${WORK_ID} / structure (two books, established by inspection)`,
      note: 'This batch\'s brief left open whether On Plants has book/chapter divisions or is one short flowing text. INSPECTION ANSWERED: it has TWO BOOKS. The rendered page marks them itself with <div class="wst-heading">BOOK I</div> and BOOK II, so this edition is a two-level Book -> Chapter tree split on the source\'s own headings: Book I chapters 1-7, Book II chapters 1-10.',
    },
    {
      where: `${WORK_ID} / book-2-ch-1 (unmarked in the source)`,
      note: 'The source prints NO chapter number at the start of Book II — its marginal numbering resumes visibly at 2 — so Book II chapter 1 is recovered from the book boundary itself: the text standing between the "BOOK II" heading and the first printed "2". Nothing is invented and nothing is moved; the chapter contains exactly what the source prints at that point. Recorded because the chapter number, unlike every other in this work, is this importer\'s inference from the source\'s own structure rather than a figure the source prints.',
    },
    {
      where: `${WORK_ID} / front matter EXCLUDED`,
      note: "The page's first 14 paragraphs are the 1913 title page (DE PLANTIS / BY / E. S. FORSTER / OXFORD / AT THE CLARENDON PRESS / 1913), Forster's own signed five-paragraph PREFACE on the treatise's authorship and textual history, and a CONTENTS heading. That is the translator's editorial apparatus, not the treatise, so the import starts at the first paragraph of the text proper. Excluded deliberately and recorded here rather than quietly dropped; the preface's substance is summarised in about.json instead of being passed off as part of the work.",
    },
    {
      where: `${WORK_ID} / marker disambiguation (shared container)`,
      note: 'This source places its Bekker page markers AND its chapter numbers in the SAME span.wst-sidenote margin element, so the two cannot be told apart by position. They are distinguished by shape instead: a bare 1-2 digit integer is a chapter number, a page/column token such as "815a" is a Bekker reference, and a line range such as "9–11" is neither and is ignored. This is why the shared parser requires a column letter on two-digit Bekker numbers — without that rule, chapter "10" would have been read as a page reference.',
    },
    {
      where: `${WORK_ID} / red link falls in the excluded preface`,
      note: 'The page contains one red-link ("page does not exist") anchor, but it sits inside Forster\'s PREFACE — an unrelated author link — which this edition does not import. No reading text is truncated anywhere in the treatise itself.',
    },
    {
      where: `${WORK_ID} / transcription oddities preserved verbatim`,
      note: 'Two source oddities are kept exactly as the source has them, per this repo\'s rule never to silently correct: (1) the very first sentence reads "but while in animalsit is clearly manifest", a missing space present in the Wikisource HTML itself and not introduced by this importer (confirmed by inspecting the raw markup); (2) the final chapter ends with the printed colophon "Here ends the book on Plants." followed by a line of Greek hexameter, both of which stand inside the transcribed text block and are therefore kept as part of the work rather than stripped as furniture.',
    },
    {
      where: `${WORK_ID} / authorship`,
      note: 'PSEUDO-ARISTOTLE. The De plantis is not Aristotle\'s: the Wikisource page\'s own header calls it "widely believed to be spurious and instead to be by Nicolaus of Damascus", and Forster\'s preface explains that the lost Greek original reached Latin via Arabic and a further Greek retranslation. Forster translated from the Latin version of Alfredus as edited by E. H. F. Meyer. Bundled under Aristotle\'s name because the Oxford edition transmits it that way, with the doubt recorded rather than hidden.',
    },
  ],
});
