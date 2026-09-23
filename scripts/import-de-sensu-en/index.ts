/**
 * Aristotle, *On Sense and the Sensible* (De sensu et sensibilibus) — J. I.
 * Beare's English translation (Oxford, 1908), via English Wikisource.
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-sensu-en/index.ts
 *
 * Reads scripts/import-de-sensu-en/raw/on-sense-and-the-sensible-section-N.json
 * (N = 1, 2; already in the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content responses). Writes
 * data/de-sensu-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-sensu-en/validate.ts`.
 *
 * --- What was verified before this importer was written -------------------
 * The PARENT page "On Sense and the Sensible" is a 451-byte navigation stub
 * with no treatise text: it holds a {{header}} and two links and nothing else.
 * This batch's brief flagged exactly that possibility, and it proved true. The
 * real text is on the two "Section" subpages, which carry the whole standard
 * seven-chapter division between them — Section I Parts 1-4, Section II Parts
 * 5-7 — so nothing is lost by the parent being empty, and nothing is
 * fabricated.
 *
 * The two Sections are imported as ONE flat run of chapters 1-7, using the
 * source's own continuous Part numbering. The "Section" split is an artefact
 * of how the Wikisource page was divided, not a division of the treatise, so
 * it is not reproduced as a structural tier; it is recorded in anomalies.json
 * instead.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-sensu-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On Sense and the Sensible",
  author: "Aristotle",
  language: 'en',
  translator: "John Isaac Beare",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908)",
  provenance: "English Wikisource, pages \"On Sense and the Sensible/Section I\" and \"/Section II\", fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-sensu-en/raw/. The work's parent page \"On Sense and the Sensible\" carries no text of its own — it is a 451-byte navigation stub linking to the two Section subpages, which is where the whole treatise actually lives. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-sensu-en.",
  license: "Beare's 1908 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On Sense and the Sensible — the opening treatise of the Parva Naturalia — in J. I. Beare's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1908 as part of that series' volume III. It takes up the sense organs and their objects: why there are five senses and no more, colour, flavour and odour, and the much-argued question of whether a magnitude is divisible without limit.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "This edition is complete: all seven chapters of the standard division, running without gaps and without truncation.",
        "One structural point worth knowing: the work's parent page on Wikisource is an empty navigation stub, and the text is carried entirely by two subpages called \"Section I\" and \"Section II\". Those Sections are a Wikisource convenience, not a division of the treatise, so they are not reproduced here as a tier of their own — the chapters simply run 1 to 7, exactly as the source numbers them across the two pages.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the two English Wikisource \"On Sense and the Sensible/Section N\" subpages, fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `==Part N==` wiki headings, continuing without a break from Part 4 at the end of Section I to Part 5 at the start of Section II. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
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
        "There are no gaps in the text. anomalies.json records the mechanical departures: the empty parent page and the two-subpage layout, the furniture lines skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-sense-and-the-sensible-section-1.json", pageTitle: "On Sense and the Sensible/Section I", label: "section-1", expectedChapters: [1, 2, 3, 4] },
    { rawFile: "on-sense-and-the-sensible-section-2.json", pageTitle: "On Sense and the Sensible/Section II", label: "section-2", expectedChapters: [5, 6, 7] },
  ],
  about,
  traditionalChapterCounts: { 0: 7 },
  extraAnomalies: [
    { where: `${WORK_ID} / parent page (stub)`, note: "The work's parent Wikisource page \"On Sense and the Sensible\" carries NO treatise text: it is a 451-byte navigation stub holding only a {{header}} template and links to the two Section subpages. Nothing was imported from it. The complete text was found on those subpages, so the empty parent costs the reader nothing and no text was fabricated to compensate." },
    { where: `${WORK_ID} / section split`, note: "The source splits this treatise across two subpages, \"Section I\" (Parts 1-4) and \"Section II\" (Parts 5-7). That split is an artefact of Wikisource page organisation, not a division made by Aristotle or by Beare, so it is NOT reproduced as a structural tier; the chapters are emitted as one flat run of 1-7 using the source's own continuous Part numbering, which runs straight on across the page boundary." },
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: all 7 chapters of the standard division are present and untruncated." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-sensu-en was adjusted to match a Greek text." },
  ],
});
