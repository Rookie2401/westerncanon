/**
 * Aristotle, *On Dreams* (De insomniis) — J. I. Beare's English translation
 * (Oxford, 1908), via English Wikisource. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-insomniis-en/index.ts
 *
 * Reads scripts/import-de-insomniis-en/raw/on-dreams-aristotle.json (already
 * in the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response for the page
 * "On Dreams (Aristotle)"). Writes data/de-insomniis-en/{work,about,anomalies}.json,
 * then run `npx tsx scripts/import-de-insomniis-en/validate.ts`.
 *
 * --- A TRAP THIS IMPORT WALKED INTO AND BACK OUT OF ------------------------
 * The obvious Wikisource title for this treatise, "On Dreams", is a DIFFERENT
 * WORK: Sir Thomas Browne's essay "On Dreams", from Simon Wilkin's 1835-36
 * edition of Browne's Collected Works. Its {{header}} names Browne as the
 * author outright, and its opening words are unmistakably 17th-century English
 * rather than Beare's 1908 Oxford prose. Fetching it and reading it — rather
 * than trusting the title — is what caught this. Aristotle's De insomniis is
 * at the disambiguated title "On Dreams (Aristotle)", which is what this
 * importer uses. Nothing by Browne is present in this edition.
 *
 * --- What else was verified ------------------------------------------------
 * The correct page carries real transcribed prose (24 KB) and is ordinary
 * wikitext, not a page-scan transclusion. It marks chapters with a bare
 * "Part N" line carrying no wiki markup at all, so a headings-only parser
 * would read it as zero chapters; the shared parser handles that shape. All
 * three chapters of the standard division are present and untruncated, and
 * the source prints no Bekker markers.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-insomniis-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On Dreams",
  author: "Aristotle",
  language: 'en',
  translator: "John Isaac Beare",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908)",
  provenance: "English Wikisource, page \"On Dreams (Aristotle)\", fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-insomniis-en/raw/. NOTE the disambiguated title: the undisambiguated Wikisource page \"On Dreams\" is a DIFFERENT WORK ENTIRELY — Sir Thomas Browne's essay of that name, from Simon Wilkin's 1835-36 edition of Browne — and is not used here. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-insomniis-en.",
  license: "Beare's 1908 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On Dreams in J. I. Beare's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1908 as part of that series' volume III, the Parva Naturalia. Its three chapters argue that dreaming belongs to the faculty of sense rather than to opinion or intelligence, and explain dreams as the persistence of sense-impressions stirred by residual movements in the blood once the senses are at rest.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "A note on the title",
      paragraphs: [
        "English Wikisource has two quite different works called \"On Dreams\". The undisambiguated one is Sir Thomas Browne's essay of that name, printed from Simon Wilkin's 1835-36 edition of Browne — seventeenth-century English, and not Aristotle at all. Aristotle's treatise sits at the disambiguated title \"On Dreams (Aristotle)\", and that is the only page this edition draws on.",
        "The distinction was caught by fetching and reading the page rather than trusting its title. Nothing by Browne appears anywhere in this edition.",
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
        "The machine-readable text is the raw wikitext of the English Wikisource page \"On Dreams (Aristotle)\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by a bare \"Part N\" text line carrying no wiki markup at all — a shape a headings-driven parser would read as zero chapters — and the `{{dhr}}` spacing templates and the closing \"THE END\" mark are furniture and are dropped. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
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
        "There are no gaps in the text. anomalies.json records the mechanical departures, the rejected Thomas Browne page, the bare-line chapter markers, the furniture dropped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-dreams-aristotle.json", pageTitle: "On Dreams (Aristotle)", label: "page", expectedChapters: [1, 2, 3] },
  ],
  about,
  traditionalChapterCounts: { 0: 3 },
  extraAnomalies: [
    { where: `${WORK_ID} / wrong-page rejection (Thomas Browne)`, note: "The undisambiguated English Wikisource page \"On Dreams\" is NOT this work: it is Sir Thomas Browne's essay of the same name, whose own {{header}} names Browne as author and cites Simon Wilkin's 1835-36 edition of Browne's Collected Works. It was fetched, read, and rejected during this import rather than being ingested as Aristotle on the strength of its title. This edition draws solely on the disambiguated page \"On Dreams (Aristotle)\", J. I. Beare's translation. No text by Browne appears in this build." },
    { where: `${WORK_ID} / chapter marker shape`, note: "This page marks chapters with a bare \"Part N\" text line carrying no wiki markup at all (not \"==Part N==\"), a shape a headings-only parser would read as zero chapters. The bare-line rule requires the line to be exactly \"Part N\", so ordinary short sentences are not mistaken for markers." },
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: all 3 chapters of the standard division are present and untruncated." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-insomniis-en was adjusted to match a Greek text." },
  ],
});
