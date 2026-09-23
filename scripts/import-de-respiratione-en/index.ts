/**
 * Aristotle, *On Breathing* (De respiratione) — G. R. T. Ross's English
 * translation (Oxford, 1908), via English Wikisource. Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-de-respiratione-en/index.ts
 *
 * Reads scripts/import-de-respiratione-en/raw/on-breathing.json (already in
 * the repo — the cached MediaWiki
 * action=query&prop=revisions&rvslots=main&rvprop=content response). Writes
 * data/de-respiratione-en/{work,about,anomalies}.json, then run
 * `npx tsx scripts/import-de-respiratione-en/validate.ts`.
 *
 * --- WHY THIS IS ITS OWN EDITION ------------------------------------------
 * This batch's brief provided for On Breathing becoming a separate work if the
 * source marked a treatise boundary. It does — more cleanly than expected:
 * English Wikisource gives On Breathing a page of its own, distinct from
 * "On Youth and Old Age" and "On Life and Death", so no splitting of a shared
 * page was necessary. The three pages do, however, share one continuous run of
 * chapter numbers (Parts 1-27), which is why this edition's chapters begin at
 * 7 rather than 1; see below.
 *
 * --- WHY THE CHAPTERS START AT 7 ------------------------------------------
 * Because 7 is what the source prints. In the Oxford volume the three
 * treatises are numbered continuously, and Wikisource keeps that, each page's
 * header saying so outright. Parts 1-6 (On Youth and Old Age) and 23-27
 * (On Life and Death) are complete in data/de-iuventute-en. Nothing precedes
 * chapter 7 in THIS treatise, and renumbering 7-22 as 1-16 would have broken
 * every citation and concealed the link to the companion edition.
 *
 * --- What else was verified ------------------------------------------------
 * The page exists and carries real transcribed prose (37 KB); it is not a
 * stub. It is ordinary wikitext, not a page-scan transclusion, and prints no
 * Bekker markers. Its `{{ppoem}}` block is Empedocles' verse on respiration,
 * quoted inside Aristotle's own argument and translated with it — genuine
 * content, not apparatus — so it is kept as reading text with only the
 * template's `1=` and `{italic}` formatting directives removed.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWikitextImport } from '../import-aristotle-rest-en-shared/driver.ts';
import type { WorkAbout } from '../import-aristotle-rest-en-shared/emit.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const WORK_ID = "de-respiratione-en";

const about: WorkAbout = {
  workId: WORK_ID,
  title: "On Breathing",
  author: "Aristotle",
  language: 'en',
  translator: "G. R. T. Ross",
  editor: "John Alexander Smith and William David Ross",
  edition: "The Works of Aristotle Translated into English, Volume III: Parva Naturalia (Oxford: Clarendon Press, 1908)",
  provenance: "English Wikisource, page \"On Breathing\" (Parts 7-22), fetched once via the MediaWiki action=query&prop=revisions&rvslots=main&rvprop=content API and cached under scripts/import-de-respiratione-en/raw/. The surrounding Parts 1-6 and 23-27 are the treatises On Youth and Old Age and On Life and Death, which the source keeps on separate pages of their own and which are bundled here as data/de-iuventute-en. This page is ORDINARY WIKITEXT rather than a djvu page-scan transclusion, so the wikitext itself is the text; imported by scripts/import-de-respiratione-en.",
  license: "G. R. T. Ross's 1908 translation is in the public domain (published before 1929). The digital transcription is distributed by English Wikisource under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
  sections: [
    {
      heading: "About this edition",
      paragraphs: [
        "Aristotle's On Breathing in G. R. T. Ross's English translation, made for the Oxford Works of Aristotle Translated into English and published in 1908 as part of that series' volume III, the Parva Naturalia. It surveys and criticises earlier accounts of respiration — Democritus, Anaxagoras, Diogenes, Plato and Empedocles among them — before setting out Aristotle's own view of breathing as the cooling of the vital heat around the heart, and of gills as performing the same office for fishes.",
        "The text here is the translation, verbatim. Nothing is modernised, paraphrased, or silently corrected.",
      ],
    },
    {
      heading: "IMPORTANT: why the chapters start at 7",
      paragraphs: [
        "This edition's chapters run 7 to 22. Nothing is missing before chapter 7: those numbers are the source's own. In the Oxford volume, On Youth and Old Age, On Breathing and On Life and Death share one continuous run of twenty-seven chapter numbers, and English Wikisource preserves that numbering while giving each treatise its own page — Parts 1-6, 7-22 and 23-27 respectively, with each page's header saying as much.",
        "Chapters 1-6 and 23-27 are complete in this library's companion edition of On Youth and Old Age, On Life and Death. Renumbering this treatise 1-16 would have looked tidier while silently breaking every citation and concealing the link between the two editions, so the source's numbering is kept exactly as printed.",
      ],
    },
    {
      heading: "Completeness",
      paragraphs: [
        "This edition is complete: all sixteen chapters of the treatise (the source's Parts 7 to 22), with no gaps and no truncation.",
      ],
    },
    {
      heading: "The Empedocles verses",
      paragraphs: [
        "Aristotle quotes Empedocles' hexameters on respiration at length, and Ross translated them along with the surrounding argument. They arrive in the source wrapped in a poem-formatting template. Because they are a quotation inside Aristotle's own text rather than a translator's note or editorial apparatus, they are kept in full as reading matter; only the template's formatting directives are stripped.",
      ],
    },
    {
      heading: "Digital source",
      paragraphs: [
        "The machine-readable text is the raw wikitext of the English Wikisource page \"On Breathing\", fetched once and committed under the importer's raw/ directory. This batch's brief expected djvu page-scan transclusions (for which only the rendered HTML carries any text); direct inspection found ordinary wikitext instead, so the simpler wikitext route was used and the difference is disclosed here rather than described as a page-scan provenance it does not have. The text is bundled with the app; nothing is loaded from the network at runtime.",
      ],
    },
    {
      heading: "How it was imported",
      paragraphs: [
        "The page opens with a `{{header}}` template (title, translator, navigation) which is transport furniture and is dropped, and ends with interwiki links and a licence template that are likewise skipped and counted. Chapters are marked by `===Part N===` wiki headings. The page also opens with a banner heading carrying the treatise title, and carries `{{no scan}}` and licence templates; those are page furniture rather than Aristotle's words, and are skipped and counted. The `{{ppoem}}` block quoting Empedocles is genuine translated content and is kept, with only its `1=` and `{italic}` formatting directives removed. Every paragraph under a chapter marker, in document order, becomes part of that chapter's single Passage, joined by blank lines.",
        "The importer refuses to ship a division it has not been told to expect: the exact chapter numbers are declared in advance, and a mismatch stops the run rather than silently producing a different text. An unrecognised wiki template also stops the run rather than being guessed at as either furniture or reading text.",
      ],
    },
    {
      heading: "Reference scheme",
      paragraphs: [
        "Citation here is by chapter, using the source's own continuous Part numbering (7-22). This digitisation prints no Bekker page/column markers anywhere, so every Division.ref and every Passage.ref is null. No Bekker reference has been reconstructed or estimated, because doing so would mean inventing a citation the source does not support.",
      ],
    },
    {
      heading: "Known gaps & anomalies",
      paragraphs: [
        "There are no gaps in the text; the chapter numbering simply begins at 7, for the reason explained above. anomalies.json carries the complete machine-readable log: the relationship to data/de-iuventute-en, the preserved numbering, the Empedocles quotation kept as content, the furniture skipped, the null reference scheme, and the plaintext-rather-than-page-scan provenance.",
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
    { rawFile: "on-breathing.json", pageTitle: "On Breathing", label: "page", expectedChapters: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
  ],
  about,
  extraAnomalies: [
    { where: `${WORK_ID} / separate edition / relationship to de-iuventute-en`, note: "On Breathing is shipped as its own edition because English Wikisource already gives it a page of its own, distinct from \"On Youth and Old Age\" (Parts 1-6) and \"On Life and Death\" (Parts 23-27) — so no splitting of a shared page was needed, only the recognition that the source had already separated the treatises. Its companions are bundled as data/de-iuventute-en." },
    { where: `${WORK_ID} / chapter numbering (starts at 7)`, note: "This edition's chapters run 7-22 because those are the SOURCE'S OWN numbers, preserved exactly. In the Oxford volume the three treatises share one continuous run of Parts 1-27, and each Wikisource page's header states that its parts are numbered in the context of the whole. Nothing is missing before chapter 7: Parts 1-6 and 23-27 are complete in data/de-iuventute-en. Renumbering 7-22 as 1-16 was rejected as it would silently break every citation and conceal the relationship between the two editions." },
    { where: `${WORK_ID} / Empedocles quotation`, note: "The source wraps Aristotle's long quotation of Empedocles' verses on respiration in a {{ppoem}} poem-formatting template. Those verses are a quotation inside Aristotle's own text, translated by Ross along with the argument around them — genuine reading matter, not translator's apparatus — so they are KEPT in full, with only the template's `1=` and `{italic}` formatting directives stripped. They are not treated as furniture and are not dropped." },
    { where: `${WORK_ID} / completeness`, note: "COMPLETE: all 16 chapters of this treatise (the source's Parts 7-22) are present, with no internal gaps and no truncation." },
    { where: `${WORK_ID} / reference scheme`, note: "Division.ref and Passage.ref are null throughout: this plaintext digitisation prints no Bekker page/column markers at all. No Bekker reference was reconstructed, because any such citation would be invented rather than read from the source." },
    { where: `${WORK_ID} / relation to the Greek sibling`, note: "This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-respiratione-en was adjusted to match a Greek text." },
  ],
});
