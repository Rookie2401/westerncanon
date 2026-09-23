/**
 * Aristotle, *On the Gait of Animals* (De incessu animalium) — A. S. L.
 * Farquharson's English translation (Oxford, 1912), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-incessu-animalium-en/index.ts
 *
 * Reads scripts/import-de-incessu-animalium-en/raw/on-the-progression-of-animals.json
 * (already in the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response). Writes
 * data/de-incessu-animalium-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-incessu-animalium-en/validate.ts`.
 *
 * --- CONTENT VERIFICATION (this work was explicitly flagged as unverified) --
 * This batch's brief listed De incessu animalium as "blue-linked, NOT yet
 * content-verified", i.e. the existence of a link was not to be trusted as
 * evidence of transcribed text. It was therefore checked before any importer
 * was written, and it passes: "On the Gait of Animals" is a REDIRECT to
 * "On the Progression of Animals", and that page carries 44 KB of real prose
 * in nineteen chapters, with no red links and no stub markers.
 *
 * --- HOW IT DIFFERS FROM ITS COMPANION De motu animalium -------------------
 * The two Farquharson treatises were checked independently rather than assumed
 * to match, and they do NOT: De motu prints Bekker page markers (as
 * {{verse}} templates) and numbers its chapters "==N==", while this page
 * prints NO Bekker markers at all and heads its chapters "===Part N===". So
 * Division.ref is null throughout this edition, where its companion's is not.
 * This page also opens with a centred title banner built from nested
 * {{c}}/{{xx-larger}}/{{uc}} templates, which is page furniture and is skipped.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-incessu-animalium-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On the Gait of Animals",
  author: "Aristotle",
  language: 'en',
  translator: "A. S. L. Farquharson",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume V (Oxford: Clarendon Press, 1912)",
  provenance: "English Wikisource, page \"On the Progression of Animals\" (reached from the redirect \"On the Gait of Animals\"), fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-incessu-animalium-en/raw/. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-incessu-animalium-en.",
  license: "Farquharson's 1912 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On the Gait of Animals in A. S. L. Farquharson's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1912 as part of that series' volume V. It asks why animals move as they do: why limbs come in even numbers, why the joints bend as they bend, why birds and fishes and crabs are built as they are, and why every animal has an above and below, a front and back, a right and left, with movement starting from the right.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "This edition is complete: all nineteen chapters of the standard division, with no gaps and no truncation. The page was checked for real transcribed content — not merely for the existence of a link — before anything was imported.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the English Wikisource page \"On the Progression of Animals\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `===Part N===` wiki headings. The centred title banner at the head of the page — built from nested sizing and small-caps templates — is page furniture rather than Aristotle's words, and is skipped and counted along with the closing licence templates and interwiki links. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
        "The importer refuses to ship a division it has not been told to expect: the exact chapter numbers are declared in advance, and a mismatch stops the run rather than silently producing a different text. An unrecognised wiki template also stops the run rather than being guessed at as either furniture or reading text.",
      ],
    },
    {
      heading: "Reference scheme",
      paragraphs: [
        "Citation here is by chapter only. This digitisation prints no Bekker page/column markers anywhere, so every Division.ref and every Passage.ref is null. That is a real difference from its companion edition of On the Motion of Animals, whose source does print them: the two pages were checked independently rather than assumed to behave alike. No Bekker reference has been reconstructed or estimated here, because doing so would mean inventing a citation the source does not support.",
      ],
    },
    {
      heading: "A note on the title",
      paragraphs: [
        "On English Wikisource, \"On the Gait of Animals\" is a redirect; the page itself is titled \"On the Progression of Animals\". Both titles name the same treatise, usually cited by its Latin name De incessu animalium. The redirect was followed and confirmed rather than assumed.",
      ],
    },
    {
      heading: "Known gaps & anomalies",
      paragraphs: [
        "There are no gaps in the text. anomalies.json records the mechanical departures: the content verification and its result, the redirect followed, the title banner and other furniture skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-the-progression-of-animals.json", pageTitle: "On the Progression of Animals", label: "page", expectedChapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
  ],
  about,
  traditionalChapterCounts: { 0: 19 },
  extraAnomalies: [
    { where: `${WORK_ID} / CONTENT-VERIFIED before import`, note: "This batch's brief flagged De incessu animalium as \"blue-linked, NOT yet content-verified\" — the existence of a link was not to be trusted as evidence of transcribed text. It was verified before this importer was written: \"On the Gait of Animals\" redirects to \"On the Progression of Animals\", and that page carries 44 KB of real prose in 19 chapters, with no red links and no stub markers. Genuine content; nothing was skipped and nothing was fabricated." },
    { where: `${WORK_ID} / title redirect`, note: "The title given in this import's brief, \"On the Gait of Animals\", is a REDIRECT on English Wikisource; the actual page is \"On the Progression of Animals\". The redirect was resolved through the API and followed, rather than the title being assumed correct or the work being reported missing." },
    { where: `${WORK_ID} / difference from its companion de-motu-animalium-en`, note: "Farquharson's two 1912 treatises were inspected independently and do NOT behave alike on Wikisource: De motu animalium prints Bekker page markers ({{verse}} templates) and heads chapters \"==N==\", while this page prints NO Bekker markers at all and heads chapters \"===Part N===\". Division.ref is therefore null throughout this edition although its companion's is not — a real property of the two digitisations, not an inconsistency in this import." },
    { where: `${WORK_ID} / title banner skipped`, note: "The page opens with a centred title banner built from nested {{c}}/{{xx-larger}}/{{uc}} templates reading \"De incessu animalium\". It is Wikisource page furniture, not a line of Aristotle's text, and is skipped and counted." },
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: all 19 chapters of the standard division are present and untruncated." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-incessu-animalium-en was adjusted to match a Greek text." },
  ],
});
