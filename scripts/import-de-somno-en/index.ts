/**
 * Aristotle, *On Sleep and Sleeplessness* (De somno et vigilia) — J. I.
 * Beare's English translation (Oxford, 1908), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-somno-en/index.ts
 *
 * Reads scripts/import-de-somno-en/raw/on-sleep-and-sleeplessness.json
 * (already in the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response). Writes
 * data/de-somno-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-somno-en/validate.ts`.
 *
 * --- What was verified before this importer was written -------------------
 * The page exists and carries real transcribed prose (27 KB); it is not a
 * stub. It is ordinary wikitext, not a page-scan transclusion. All three
 * chapters of the standard division are present, complete and untruncated,
 * and the source prints no Bekker markers.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-somno-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On Sleep and Sleeplessness",
  author: "Aristotle",
  language: 'en',
  translator: "John Isaac Beare",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908)",
  provenance: "English Wikisource, page \"On Sleep and Sleeplessness\", fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-somno-en/raw/. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-somno-en.",
  license: "Beare's 1908 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On Sleep and Sleeplessness in J. I. Beare's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1908 as part of that series' volume III, the Parva Naturalia. It asks what sleep and waking are, which part of the soul they belong to, and why sleep should be necessary at all — answering with the theory that the evaporation of nourishment cools the heart and so immobilises the primary sense-organ.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "This edition is complete: all three chapters of the standard division, with no gaps and no truncation.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the English Wikisource page \"On Sleep and Sleeplessness\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `==Part N==` wiki headings, and the printer's \"THE END\" mark at the foot of the page is furniture and is skipped. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
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
        "There are no gaps in the text. anomalies.json records the mechanical departures: the furniture lines skipped (including the printer's \"THE END\"), the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-sleep-and-sleeplessness.json", pageTitle: "On Sleep and Sleeplessness", label: "page", expectedChapters: [1, 2, 3] },
  ],
  about,
  traditionalChapterCounts: { 0: 3 },
  extraAnomalies: [
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: all 3 chapters of the standard division are present and untruncated. The page is real transcribed prose, not a stub." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-somno-en was adjusted to match a Greek text." },
  ],
});
