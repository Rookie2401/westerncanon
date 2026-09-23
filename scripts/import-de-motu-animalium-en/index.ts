/**
 * Aristotle, *On the Motion of Animals* (De motu animalium) — A. S. L.
 * Farquharson's English translation (Oxford, 1912), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-motu-animalium-en/index.ts
 *
 * Reads scripts/import-de-motu-animalium-en/raw/on-the-movement-of-animals.json
 * (already in the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response). Writes
 * data/de-motu-animalium-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-motu-animalium-en/validate.ts`.
 *
 * --- CONTENT VERIFICATION (this work was explicitly flagged as unverified) --
 * This batch's brief listed De motu animalium as "blue-linked, NOT yet
 * content-verified", i.e. the existence of a link was not to be trusted as
 * evidence of transcribed text. It was therefore checked before any importer
 * was written, and it passes: "On the Motion of Animals" is a REDIRECT to
 * "On the Movement of Animals", and that page carries 38 KB of real prose —
 * eleven numbered chapters, 49 translator footnotes, Bekker page markers
 * throughout — with no red links and no stub markers. It is genuine content.
 *
 * --- WHAT MAKES THIS WORK DIFFERENT FROM ITS BATCH-MATES -------------------
 * Two things, both confirmed by inspection rather than assumed:
 *   1. It is the ONLY plain-wikitext work in this batch that prints BEKKER
 *      PAGE MARKERS, as `{{verse|verse=698a}}` templates. They are captured
 *      per chapter and become a real Division.ref (a single page token, or
 *      first–last when a chapter spans pages) — so unlike its neighbours, this
 *      edition supports Bekker citation.
 *   2. Its chapter markers are `==N==` headings whose text is nothing but the
 *      number, a shape no other page in the batch uses.
 * It also carries 49 `<ref>` footnotes — Farquharson's own annotation, which
 * is editorial apparatus and is stripped from the reading text (counted, not
 * preserved) — and closes with a bare "THE END" line that is printer's
 * furniture rather than a one-word paragraph of Aristotle.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-motu-animalium-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On the Motion of Animals",
  author: "Aristotle",
  language: 'en',
  translator: "A. S. L. Farquharson",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume V (Oxford: Clarendon Press, 1912)",
  provenance: "English Wikisource, page \"On the Movement of Animals\" (reached from the redirect \"On the Motion of Animals\"), fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-motu-animalium-en/raw/. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-motu-animalium-en.",
  license: "Farquharson's 1912 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On the Motion of Animals in A. S. L. Farquharson's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1912 as part of that series' volume V. It asks what is common to every animal movement, and works back from the need for something unmoved to push against — the ground, the air, the joint that stays still — to the unmoved mover of the heavens, and inward to the role of desire, imagination and the vital spirit in setting a body going.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "This edition is complete: all eleven chapters of the standard division, with no gaps and no truncation. The page was checked for real transcribed content — not merely for the existence of a link — before anything was imported.",
      ],
    },
    {
      heading: "Bekker references",
      paragraphs: [
        "Unusually among this library's plain-wikitext Aristotle editions, this one supports Bekker citation. The source prints page markers (698a, 698b and so on) inline, and each chapter's markers are gathered in document order to give that chapter a real Bekker page or range. Where a chapter falls on a single page a single token is recorded; where it spans pages, the first and last are joined as a range.",
        "Per-paragraph references are still null: the source does not print a marker at every paragraph break, so a paragraph-level citation would have to be invented rather than read.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the English Wikisource page \"On the Movement of Animals\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `==N==` headings whose text is just the number — a shape unique to this work within its batch. The `{{verse|verse=698a}}` Bekker markers are captured as chapter references before being removed from the reading text, where they are marginalia rather than words. Farquharson's 49 `<ref>` footnotes are editorial apparatus and are stripped, counted but not preserved, matching this library's other English translations; the bare \"THE END\" line at the foot of the page is printer's furniture and is skipped rather than kept as a one-word paragraph. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
        "The importer refuses to ship a division it has not been told to expect: the exact chapter numbers are declared in advance, and a mismatch stops the run rather than silently producing a different text. An unrecognised wiki template also stops the run rather than being guessed at as either furniture or reading text.",
      ],
    },
    {
      heading: "A note on the title",
      paragraphs: [
        "On English Wikisource, \"On the Motion of Animals\" is a redirect; the page itself is titled \"On the Movement of Animals\". Both titles name the same treatise, usually cited by its Latin name De motu animalium. The redirect was followed and confirmed rather than assumed.",
      ],
    },
    {
      heading: "Known gaps & anomalies",
      paragraphs: [
        "There are no gaps in the text. anomalies.json records the mechanical departures: the content verification and its result, the redirect followed, the Bekker markers captured, the 49 footnotes stripped, the furniture skipped, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-the-movement-of-animals.json", pageTitle: "On the Movement of Animals", label: "page", expectedChapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  ],
  about,
  traditionalChapterCounts: { 0: 11 },
  extraAnomalies: [
    { where: `${WORK_ID} / CONTENT-VERIFIED before import`, note: "This batch's brief flagged De motu animalium as \"blue-linked, NOT yet content-verified\" — the existence of a link was not to be trusted as evidence of transcribed text. It was verified before this importer was written: \"On the Motion of Animals\" redirects to \"On the Movement of Animals\", and that page carries 38 KB of real prose in 11 numbered chapters with 49 footnotes, no red links and no stub markers. Genuine content; nothing was skipped and nothing was fabricated." },
    { where: `${WORK_ID} / title redirect`, note: "The title given in this import's brief, \"On the Motion of Animals\", is a REDIRECT on English Wikisource; the actual page is \"On the Movement of Animals\". The redirect was resolved through the API and followed, rather than the title being assumed correct or the work being reported missing." },
    { where: `${WORK_ID} / chapter marker shape`, note: "This page marks chapters with \"==N==\" headings whose text is nothing but the chapter number — a shape no other page in this batch uses (its batch-mates use \"==Part N==\", a bare \"Part N\" line, or a bare number line). Verified for this work specifically rather than assumed from any sibling." },
    { where: `${WORK_ID} / Bekker markers present (unlike its batch-mates)`, note: "This is the ONLY plain-wikitext work in this batch whose source prints Bekker page markers: it carries them as {{verse|verse=698a}} templates. They are captured per chapter, in document order, and become a real Division.ref (a single page token, or first–last as a range when a chapter spans pages); the markers themselves are removed from the reading text, where they are marginalia rather than words. Passage.ref remains null, as no marker is printed at every paragraph break." },
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: all 11 chapters of the standard division are present and untruncated." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref carries the Bekker page reference reconstructed from the source's own {{verse|verse=NNNa}} markers, in document order (a single page token when the chapter falls on one page, otherwise first–last). Passage.ref is null throughout: the source prints no marker at every paragraph break, so a per-paragraph reference would have to be invented." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-motu-animalium-en was adjusted to match a Greek text." },
  ],
});
