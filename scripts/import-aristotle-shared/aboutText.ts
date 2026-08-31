/**
 * Prose "About the text" bodies for the two Aristotle works — the Greek
 * Categoriae and De Interpretatione (Bekker 1837 / First1KGreek TEI). Kept here
 * (not hand-edited into data/) so re-running the importers reproduces the
 * enriched about.json. Rendered by src/screens/WorkAbout.tsx, which prepends a
 * "The text" paragraph (from title / author / edition) and appends a
 * "Provenance & licensing" block (from about.provenance + about.license), so the
 * section arrays below carry the middle six headings only.
 */

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

/* ------------------------------------------------------------------ *
 *  Greek — Categoriae & De Interpretatione (Bekker 1837 / First1KGreek)
 * ------------------------------------------------------------------ */

export const CAT_GRC_PROVENANCE =
  'TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0086.tlg006, edition .1st1K-grc1), which digitises the text of Aristotle’s Categoriae as printed in Immanuel Bekker’s Aristotelis Opera, Volume 1 (Oxford: Oxford University Press, 1837, pp. 1–38); imported by scripts/import-aristotle-categoriae-grc.';

export const CAT_GRC_LICENSE =
  'The Greek text of Bekker’s 1837 edition is in the public domain. The digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const DEINT_GRC_PROVENANCE =
  'TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg0086.tlg017, edition .1st1K-grc1), which digitises the text of Aristotle’s De Interpretatione as printed in Immanuel Bekker’s Aristotelis Opera, Volume 1 (Oxford: Oxford University Press, 1837, pp. 39–60); imported by scripts/import-aristotle-deint-grc.';

export const DEINT_GRC_LICENSE = CAT_GRC_LICENSE;

function grcAboutSections(opts: {
  workName: string;
  greekTitle: string;
  chapterCount: number;
  bekkerSpan: string;
  ctsUrn: string;
  filename: string;
  headTitle: string;
}): AboutSection[] {
  return [
    {
      heading: `Aristotle’s ${opts.workName}`,
      paragraphs: [
        `This is the Greek text of Aristotle’s ${opts.greekTitle} (${opts.workName}), one of the treatises of the Organon and, with Porphyry’s Isagoge, the foundation of the medieval logic curriculum.`,
        'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular, the irregularity is preserved and noted below. The first word of the work is printed in full capitals in the source and is kept exactly so.',
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [
        'Immanuel Bekker, ed., Aristotelis Opera, Volume 1 (Oxford: Oxford University Press, 1837). This edition is in the public domain. Bekker’s page/column/line numbers (e.g. "1a1") are the standard way of citing Aristotle.',
        `In the standard pagination this work occupies Bekker ${opts.bekkerSpan}. Those page/column/line milestones are NOT present in the digital source used here (see "Reference scheme" below), so citation in this reader is by chapter.`,
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is the TEI XML file ${opts.filename} (CTS ${opts.ctsUrn}) from the OpenGreekAndLatin / First1KGreek repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        `The importer slices the single <div type="edition"> body into its ${opts.chapterCount} chapter <div>s, then takes the <p> paragraphs inside each chapter as the passages. XML transport scaffolding only is removed: the <milestone unit="section"> markers, the <pb> page-image breaks, and the chapter-1 <head> (which carries the work title "${opts.headTitle}", not a chapter heading). Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.`,
        'Each chapter also carries an English chapter title. These titles are editorial: they are not part of the source text and are marked "ed." wherever they appear.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by chapter (plus the editorial English chapter title). The First1KGreek TEI carries chapter divisions only: it has no Bekker page/column/line milestones and no <lb> line markers, and its <pb> markers are the 1837 Oxford Opera page images, not Bekker pages. Per-chapter and per-line Bekker references are therefore not derivable from the digital source and are not fabricated: every Division.ref and Passage.ref is null and every Passage.n is the empty string.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `Completeness. All ${opts.chapterCount} chapters are present and in order, from the capitalised incipit to the end of the final chapter (Bekker ${opts.bekkerSpan}). The imported reading text is byte-for-byte identical to the First1KGreek transcription of the <p> paragraphs with transport scaffolding removed; no paragraph is dropped, merged or reordered, and the bundled TEI file itself is identical to the current First1KGreek release.`,
        `Reference downgrade. The work spans Bekker ${opts.bekkerSpan} in the standard pagination, but the digital source marks chapter divisions only; all page/column/line reference fields are left null and citation is by chapter.`,
        `Work title in chapter 1. The <head> element inside chapter 1 ("${opts.headTitle}") is the title of the whole work, not a chapter heading; it is recorded here but is not stored as a chapter sourceHeading (every Greek chapter sourceHeading is null).`,
        'Page-image breaks and section milestones. The <pb> markers (1837 Oxford Opera page images) and the per-chapter <milestone unit="section"> markers were dropped from the reading text as transport scaffolding.',
        'Capitalised incipit. The opening word of the work is set in full capitals in the source transcription and is preserved verbatim.',
        'Character encoding. The transcription uses the precomposed "oxia" polytonic code points (e.g. U+1F73  έ) rather than the canonically-equivalent monotonic "tonos" code points (U+03AD). The bytes are preserved exactly as transmitted: they carry every accent and breathing, contain no combining-mark sequences, and are canonically equivalent to NFC. No normalisation was applied.',
      ],
    },
  ];
}

export const CAT_GRC_ABOUT_SECTIONS: AboutSection[] = grcAboutSections({
  workName: 'Categories',
  greekTitle: 'Κατηγορίαι',
  chapterCount: 15,
  bekkerSpan: '1a1–15b33',
  ctsUrn: 'urn:cts:greekLit:tlg0086.tlg006.1st1K-grc1',
  filename: 'tlg0086.tlg006.1st1K-grc1.xml',
  headTitle: 'ΚΑΤΗΓΟΡΙΑΙ.',
});

export const DEINT_GRC_ABOUT_SECTIONS: AboutSection[] = grcAboutSections({
  workName: 'De Interpretatione',
  greekTitle: 'Περὶ ἑρμηνείας',
  chapterCount: 14,
  bekkerSpan: '16a1–24b9',
  ctsUrn: 'urn:cts:greekLit:tlg0086.tlg017.1st1K-grc1',
  filename: 'tlg0086.tlg017.1st1K-grc1.xml',
  headTitle: 'ΠΕΡΙ ΕΡΜΗΝΕΙΑΣ.',
});
