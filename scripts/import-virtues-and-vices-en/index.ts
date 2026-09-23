/**
 * [Aristotle], *Virtues and Vices* (De virtutibus et vitiis) — Joseph
 * Solomon's English translation, via English Wikisource's page-scan
 * transclusion of "Virtues and Vices". Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-virtues-and-vices-en/index.ts
 *
 * Reads scripts/import-virtues-and-vices-en/raw/virtues-and-vices.parse.json
 * (already in the repo — the RENDERED HTML from the MediaWiki
 * action=parse&prop=text API). Writes:
 *   data/virtues-and-vices-en/work.json       - the GenericWork (flat: ch-N)
 *   data/virtues-and-vices-en/about.json      - provenance / licence metadata + About prose
 *   data/virtues-and-vices-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-virtues-and-vices-en/validate.ts`.
 *
 * --- What was verified before this importer was written -------------------
 * The page exists and carries real, fully proofread prose (19 KB of visible
 * text, ZERO red links), so nothing is truncated. It IS a page-scan
 * transclusion — its wikitext is 558 bytes of
 * `<pages index="Works of Aristotle v9 (ed. Ross).djvu" from=527 to=532 />`
 * and no text — so the rendered HTML was fetched and parsed with jsdom.
 *
 * FLAT STRUCTURE: this is a single short tract with no book division, so the
 * ids are `ch-N`, not `book-N-ch-M`.
 *
 * COMPLETE, gapless run of 8 chapters. (An earlier build of this edition
 * shipped 1-5 and 7-8 and logged chapter 6 as a number "the source does not
 * print". That was this importer's fault, not the source's: chapter 6 opens
 * exactly where a scanned page boundary falls, and there the transclusion
 * closes the preceding `</p>` and emits the new chapter's opening — bold
 * chapter number and all — as loose text OUTSIDE any `<p>` element, where a
 * parser that walked only `<p>` elements could not see it. The shared parser
 * now gathers such runs; see pagescan.ts's collectUnits.)
 *
 * PSEUDO-ARISTOTLE: the Wikisource page's own header calls this "a short
 * Aristotelian tract of uncertain date and authorship". It is bundled under
 * Aristotle's name because that is how the Oxford edition transmits it
 * (Solomon's translation was appended to his Eudemian Ethics), with the doubt
 * recorded in about.json rather than hidden.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPageScanImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = 'virtues-and-vices-en';

const about: WorkAbout = {
  workId: WORK_ID,
  title: 'Virtues and Vices',
  author: 'Aristotle (attributed)',
  language: 'en',
  translator: 'Joseph Solomon',
  editor: 'William David Ross',
  edition: 'The Works of Aristotle Translated into English, Volume IX: De virtutibus et vitiis, trans. Joseph Solomon, ed. W. D. Ross (Oxford: Clarendon Press)',
  provenance:
    'English Wikisource, page "Virtues and Vices", fetched once via the MediaWiki action=parse&prop=text API. This is a page-scan transclusion of "Works of Aristotle v9 (ed. Ross).djvu" (pages 527-532): action=parse&prop=wikitext returns only 558 bytes of <pages/> markup rather than the text, so the rendered HTML was fetched and parsed with jsdom instead. The raw dump is committed at scripts/import-virtues-and-vices-en/raw/virtues-and-vices.parse.json.',
  license:
    "Solomon's translation is in the public domain (published before 1929; the Oxford 'Works of Aristotle' volumes of this period are long out of copyright). The digital transcription and page-scan proofreading are distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: 'About this edition',
      paragraphs: [
        'A short tract on the virtues and vices of the soul, in Joseph Solomon\'s English translation for the Oxford Works of Aristotle Translated into English, where it was printed as an appendix to his Eudemian Ethics. It sets out prudence, gentleness, courage, temperance and justice with their parts, then the vices answering to each, and closes with the marks by which virtue and vice are recognised.',
        'The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.',
      ],
    },
    {
      heading: 'Authorship: almost certainly not Aristotle',
      paragraphs: [
        'This tract is not now regarded as Aristotle\'s own work. Its date and author are unknown, and the Wikisource page carries the plain description "a short Aristotelian tract of uncertain date and authorship". It is filed here under Aristotle\'s name because that is how the Oxford edition transmits it — bound with the Eudemian Ethics, in the same translator\'s hands — and because that is where a reader will look for it.',
        'Recording the doubt is the point: the attribution is traditional rather than established, and this edition says so instead of quietly presenting the tract as genuine.',
      ],
    },
    {
      heading: 'Completeness',
      paragraphs: [
        'This edition is complete and untruncated: the page-scan behind it is fully proofread, with no red links and no missing pages.',
        'All eight chapters are present, in a gapless run. An earlier build of this edition reported chapter 6 as missing from the source; that was a fault in this project\'s own reader rather than a gap in the text, and it is fixed — chapter 6 simply opens at a point where the printed page breaks, and the underlying markup handles that in a way the reader did not then understand.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The machine-readable text is the rendered HTML of the English Wikisource page "Virtues and Vices", fetched once through the MediaWiki action=parse&prop=text API and committed under the importer\'s raw/ directory. This page genuinely is a djvu page-scan transclusion — its wikitext holds only a few hundred bytes of transclusion markup and no text at all — so the already-rendered HTML was fetched and parsed with jsdom, exactly as this library\'s Metaphysics import does. It is bundled with the app; nothing is loaded from the network at runtime.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Chapters are marked in this source by a bold number standing at the head of a paragraph, immediately before that chapter\'s first words; that marker is removed from the reading text, where it is marginal apparatus rather than part of the sentence. Only a bold element that is the paragraph\'s first child and contains a bare one- or two-digit number counts as a marker — a deliberately narrow rule, because the same source renders its Bekker page references as bold numbers too, in the middle of paragraphs.',
        'The running title "DE VIRTUTIBUS ET VITIIS" is page furniture rather than part of the text and is skipped and counted, as is the single footnote marker. The importer refuses to ship a division it has not been told to expect: the exact chapter numbers are declared in advance, and a mismatch stops the run.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by chapter, plus a Bekker page reference. This source does print Bekker page markers, so each chapter\'s markers are gathered in document order to give it a real page or page range (1249a–1250a, and so on). Passage.ref is null throughout, since no marker is printed at every paragraph break and a paragraph-level citation would have to be invented.',
        'Because the tract has no book division, division ids are flat: ch-1, ch-2, and so on.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        'There are no gaps in the text. anomalies.json records the mechanical departures: the questionable attribution, the running title and footnote marker stripped, the flat structure, the Bekker reference scheme, and the correction to the earlier build that had wrongly reported chapter 6 as absent.',
        "A word on trust: Wikisource's page-scan proofreading for these pages is complete (no red links), but community validation is an ongoing process, so isolated transcription slips remain possible. That is a disclosed limitation of the source rather than something quietly corrected in this build.",
      ],
    },
  ],
};

runPageScanImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: join(REPO_ROOT, 'data', WORK_ID),
  shape: 'flat',
  markerShape: 'leading-bold',
  bekkerContainer: 'span.wst-verse',
  furnitureExact: ['DE VIRTUTIBUS ET VITIIS'],
  pages: [
    {
      rawFile: 'virtues-and-vices.parse.json',
      pageTitle: 'Virtues and Vices',
      label: 'page',
      // A complete, gapless run of 8. (An earlier build declared 1-5, 7-8 and
      // logged chapter 6 as "not printed by the source". That was this
      // importer's fault: chapter 6 opens exactly where a scanned page
      // boundary falls, so the transclusion emits its opening - bold chapter
      // number and all - OUTSIDE any <p> element, invisible to a parser that
      // walked only <p> elements.)
      expectedChapters: [1, 2, 3, 4, 5, 6, 7, 8],
    },
  ],
  about,
  extraAnomalies: [
    {
      where: `${WORK_ID} / authorship`,
      note: 'PSEUDO-ARISTOTLE. This tract is not now regarded as Aristotle\'s own; its date and author are unknown, and the Wikisource page\'s own header describes it as "a short Aristotelian tract of uncertain date and authorship". It is bundled under Aristotle\'s name because the Oxford edition transmits it that way (Solomon\'s translation was printed as an appendix to his Eudemian Ethics, data/eudemian-ethics-en), with the doubt recorded here and in about.json rather than hidden.',
    },
    {
      where: `${WORK_ID} / structure`,
      note: 'FLAT single-book work: the tract has no book division, so division ids are `ch-N` rather than `book-N-ch-M`. This was confirmed by inspecting the rendered page, which carries no book heading of any kind.',
    },
    {
      where: `${WORK_ID} / completeness`,
      note: 'COMPLETE and untruncated: all 8 chapters in a gapless run. The page-scan behind this text is fully proofread, with ZERO red-link ("page does not exist") occurrences, so no chapter breaks off mid-sentence.',
    },
    {
      where: `${WORK_ID} / CORRECTION to an earlier build of this edition`,
      note: 'An earlier build shipped this work as 7 chapters (1-5, 7-8) and recorded chapter 6 as a number "the source does not print". That was WRONG, and the fault was this importer\'s. Chapter 6 opens exactly where a scanned page boundary falls; at such a break the transclusion closes the preceding paragraph and emits the new chapter\'s opening - its bold chapter number included - as loose text and inline elements OUTSIDE any <p> element. The parser walked only <p> elements and so could not see it, losing roughly 260 characters of text along with the division. The shared parser now gathers those loose runs, and a text-accounting check in validate.ts reconciles every paragraph of the cached raw HTML against the shipped work so the same class of fault fails the build.',
    },
  ],
});
