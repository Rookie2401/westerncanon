/**
 * Aristotle, *On Prophesying by Dreams* (De divinatione per somnum) — J. I.
 * Beare's English translation (Oxford, 1908), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-divinatione-per-somnum-en/index.ts
 *
 * Reads scripts/import-de-divinatione-per-somnum-en/raw/on-prophesying-by-dreams.json
 * (already in the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response). Writes
 * data/de-divinatione-per-somnum-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-divinatione-per-somnum-en/validate.ts`.
 *
 * --- What was verified before this importer was written -------------------
 * The page exists and carries real transcribed prose (12 KB); it is not a
 * stub. It is ordinary wikitext, not a page-scan transclusion. Both chapters
 * of the standard division are present, complete and untruncated, and the
 * source prints no Bekker markers.
 *
 * NOTE, not to be confused with its neighbour: this is De divinatione per
 * somnum, a separate treatise from De insomniis (data/de-insomniis-en) — and
 * neither has anything to do with Cicero's De divinatione, which this library
 * already carries at data/de-divinatione-en/-la.
 *
 * The page uses a `{{SIC|he|be}}` template. Per this repo's faithfulness rule,
 * the reading the source actually prints is kept and Wikisource's suggested
 * emendation is discarded; the decision is logged.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-divinatione-per-somnum-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On Prophesying by Dreams",
  author: "Aristotle",
  language: 'en',
  translator: "John Isaac Beare",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908)",
  provenance: "English Wikisource, page \"On Prophesying by Dreams\", fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-divinatione-per-somnum-en/raw/. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-divinatione-per-somnum-en.",
  license: "Beare's 1908 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On Prophesying by Dreams in J. I. Beare's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1908 as part of that series' volume III, the Parva Naturalia. Its two chapters weigh the popular belief that dreams foretell the future, and come down to a sober position: most apparent prophecy is coincidence or the dreamer's own influence, though some dreams may register faint bodily changes too slight to notice while awake.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "Not to be confused with",
      paragraphs: [
        "This is a different treatise from Aristotle's On Dreams (bundled here as its own edition), and it has nothing to do with Cicero's De divinatione, which this library also carries. The three are separate works by two authors.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "This edition is complete: both chapters of the standard division, with no gaps and no truncation.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the English Wikisource page \"On Prophesying by Dreams\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `==Part N==` wiki headings, and the closing \"THE END\" mark is furniture and is dropped. Where the page carries a `{{SIC}}` template — Wikisource's way of saying \"the print really reads this, which looks like a slip\" — the word the source actually prints is kept and the suggested correction is discarded, in keeping with this library's rule never to silently improve a source. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
        "The importer refuses to ship a division it has not been told to expect: the exact chapter numbers are declared in advance, and a mismatch stops the run rather than silently producing a different text. An unrecognised wiki template also stops the run rather than being guessed at as either furniture or reading text.",
      ],
    },
    {
      heading: "Reference scheme",
      paragraphs: [
        "Citation here is by chapter only. This digitisation prints no Bekker page/column markers anywhere, so every Division.ref and every Passage.ref is null. No Bekker reference has been reconstructed or estimated, because doing so would mean inventing a citation the source does not support.",
      ],
    },
    {
      heading: "Known gaps & anomalies",
      paragraphs: [
        "There are no gaps in the text. anomalies.json records the mechanical departures: the {{SIC}} reading kept as printed, the furniture lines skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
        "A word on trust: this is a plaintext digitisation rather than a page-by-page proofread against a scan, so isolated transcription slips are possible despite this importer's care. That is a disclosed limitation of the source, not something quietly corrected here.",
      ],
    },
  ],
};

runWikitextImport({
  workId: WORK_ID,
  rawDir: join(HERE, 'raw'),
  outDir: join(REPO_ROOT, 'data', WORK_ID),
  shape: 'flat',
  pages: [
    { rawFile: "on-prophesying-by-dreams.json", pageTitle: "On Prophesying by Dreams", label: "page", expectedChapters: [1, 2] },
  ],
  about,
  traditionalChapterCounts: { 0: 2 },
  extraAnomalies: [
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: both chapters of the standard division are present and untruncated. The page is real transcribed prose, not a stub." },
    { where: `${WORK_ID} / SIC reading preserved`, note: "The page carries a {{SIC|he|be}} template — Wikisource's marker for \"the printed text really reads 'he' here, which looks like an error for 'be'\". Per this repo's rule never to silently correct a source, the reading the print actually carries is kept in the text and the suggested emendation is discarded, not applied." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-divinatione-per-somnum-en was adjusted to match a Greek text." },
  ],
});
