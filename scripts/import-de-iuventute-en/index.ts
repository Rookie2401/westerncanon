/**
 * Aristotle, *On Youth and Old Age, On Life and Death* (De juventute et
 * senectute, De vita et morte) — G. R. T. Ross's English translation (Oxford,
 * 1908), via English Wikisource. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-iuventute-en/index.ts
 *
 * Reads scripts/import-de-iuventute-en/raw/on-youth-and-old-age.json and
 * .../on-life-and-death.json (already in the repo — cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content responses). Writes
 * data/de-iuventute-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-iuventute-en/validate.ts`.
 *
 * --- THE BUNDLING QUESTION, ANSWERED BY INSPECTION ------------------------
 * This batch's brief asked whether Wikisource bundles Youth/Old Age and
 * Life/Death together WITH On Breathing on one continuous page (in which case
 * the page was to be split at the treatise boundary the source itself marks),
 * or keeps them apart. The answer is: APART, but with shared numbering.
 * English Wikisource has three separate pages —
 *     "On Youth and Old Age"   Parts 1-6
 *     "On Breathing"           Parts 7-22
 *     "On Life and Death"      Parts 23-27
 * — each with its own {{header}}, and each of those headers carries the note
 * "Parts are numbered in the context of their part in the entire [treatise]".
 * So the treatises are already separated by the source and NO splitting was
 * needed; On Breathing is imported as its own edition, data/de-respiratione-en,
 * exactly as the brief provided for.
 *
 * --- WHY THIS EDITION'S CHAPTER NUMBERS JUMP FROM 6 TO 23 -----------------
 * Because they are the source's own numbers, and this repo does not renumber a
 * source. Chapters 7-22 are not missing from this edition; they are a
 * different treatise (On Breathing) and are complete in data/de-respiratione-en.
 * Renumbering 23-27 as 7-11 would have produced tidier-looking output at the
 * cost of silently breaking every citation and concealing the relationship
 * between the two editions, so the gap is preserved and disclosed instead.
 *
 * --- What else was verified ------------------------------------------------
 * Both pages exist and carry real transcribed prose (14 KB and 10 KB); neither
 * is a stub. Both are ordinary wikitext, not page-scan transclusions, and
 * neither prints Bekker markers. Each page opens with a `==<treatise title>==`
 * banner heading that is page furniture, not Aristotle's words, and is skipped
 * and counted.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-iuventute-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On Youth and Old Age, On Life and Death",
  author: "Aristotle",
  language: 'en',
  translator: "G. R. T. Ross",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908)",
  provenance: "English Wikisource, pages \"On Youth and Old Age\" (Parts 1-6) and \"On Life and Death\" (Parts 23-27), fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-iuventute-en/raw/. The intervening Parts 7-22 are the treatise On Breathing, which the source keeps on a separate page of its own and which is bundled here as its own edition, data/de-respiratione-en. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-iuventute-en.",
  license: "G. R. T. Ross's 1908 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On Youth and Old Age and On Life and Death, in G. R. T. Ross's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1908 as part of that series' volume III, the Parva Naturalia. Together they treat the seat of life in the heart, the nature of youth and age as the growth and decline of the body's vital heat, and death as that heat's failure — by exhaustion in old age, or by violence when it is quenched.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "IMPORTANT: why the chapters jump from 6 to 23",
      paragraphs: [
        "This edition's chapters run 1 to 6, then 23 to 27. That is not a gap in the text and nothing is missing: the numbers are the source's own, and chapters 7 to 22 are a different treatise — On Breathing — which English Wikisource keeps on a separate page and which is bundled in this library as its own complete edition.",
        "In the Oxford volume these three treatises share one continuous run of chapter numbers, and Wikisource preserves that: its pages for On Youth and Old Age, On Breathing and On Life and Death carry Parts 1-6, 7-22 and 23-27 respectively, each header noting that the parts are numbered in the context of the whole. Renumbering 23-27 as 7-11 here would have looked tidier while silently breaking every citation and hiding the connection to On Breathing, so the source's numbering is kept exactly as printed.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "Both treatises are complete: On Youth and Old Age in six chapters, On Life and Death in five, with no gaps within either and no truncation. The eleven chapters between them are the whole of what this edition's title covers.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the two English Wikisource pages \"On Youth and Old Age\" and \"On Life and Death\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `===Part N===` wiki headings. Each page also opens with a banner heading carrying the treatise title and closes with the printer's \"THE END\" mark; both are page furniture rather than Aristotle's words, and are skipped and counted. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
        "The importer refuses to ship a division it has not been told to expect: the exact chapter numbers are declared in advance, and a mismatch stops the run rather than silently producing a different text. An unrecognised wiki template also stops the run rather than being guessed at as either furniture or reading text.",
      ],
    },
    {
      heading: "Reference scheme",
      paragraphs: [
        "Citation here is by chapter, using the source's own continuous Part numbering (1-6 and 23-27). This digitisation prints no Bekker page/column markers anywhere, so every Division.ref and every Passage.ref is null. No Bekker reference has been reconstructed or estimated, because doing so would mean inventing a citation the source does not support.",
      ],
    },
    {
      heading: "Known gaps & anomalies",
      paragraphs: [
        "The only \"gap\" is the deliberate numbering jump explained above, which marks the place of a separate treatise rather than missing text. anomalies.json carries the complete machine-readable log: the three-page layout of the source and why no split was needed, the preserved numbering, the banner headings and \"THE END\" marks skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-youth-and-old-age.json", pageTitle: "On Youth and Old Age", label: "youth-and-old-age", expectedChapters: [1, 2, 3, 4, 5, 6] },
    { rawFile: "on-life-and-death.json", pageTitle: "On Life and Death", label: "life-and-death", expectedChapters: [23, 24, 25, 26, 27] },
  ],
  about,
  extraAnomalies: [
    { where: `${WORK_ID} / source layout / On Breathing`, note: "NO SPLIT WAS NEEDED. This batch's brief allowed for Wikisource bundling On Youth and Old Age, On Life and Death and On Breathing on one continuous page, to be split at the treatise boundary the source itself marks. Inspection found the source already keeps them on THREE separate pages — \"On Youth and Old Age\" (Parts 1-6), \"On Breathing\" (Parts 7-22) and \"On Life and Death\" (Parts 23-27) — each with its own {{header}}, each header noting that \"Parts are numbered in the context of their part in the entire\" treatise. This edition therefore takes the two pages its title names, and On Breathing is imported separately as data/de-respiratione-en." },
    { where: `${WORK_ID} / chapter numbering (deliberate gap 7-22)`, note: "This edition's chapter numbers run 1-6 and then 23-27, with 7-22 absent. That is the SOURCE'S OWN numbering, preserved exactly, not missing text: chapters 7-22 are the treatise On Breathing, complete in data/de-respiratione-en. The three treatises share one continuous run of Part numbers in the Oxford volume and on Wikisource. Renumbering 23-27 as 7-11 was rejected: it would have silently broken every citation and concealed the relationship between the two editions." },
    { where: `${WORK_ID} / completeness`, note: "COMPLETE for both treatises this edition covers: On Youth and Old Age chapters 1-6 and On Life and Death chapters 23-27, 11 chapters in all, with no internal gaps and no truncation." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-iuventute-en was adjusted to match a Greek text." },
  ],
});
