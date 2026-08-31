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

/* ------------------------------------------------------------------ *
 *  Latin — Categoriae & De Interpretatione (trans. Boethius, Latin Wikisource)
 * ------------------------------------------------------------------ */

export const CAT_LA_PROVENANCE =
  'Latin Wikisource, page "Categoriae" (pageid 1453), fetched once via the MediaWiki action=parse&prop=wikitext API; imported by scripts/import-aristotle-categoriae-la. The raw dump is committed at scripts/import-aristotle-categoriae-la/raw/categoriae-wikisource.json.';

export const CAT_LA_LICENSE =
  'Boethius’s Latin translation is itself in the public domain (early 6th century). The digital transcription is taken from Latin Wikisource and is available under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const DEINT_LA_PROVENANCE =
  'Latin Wikisource, page "De interpretatione" (pageid 1454), fetched once via the MediaWiki action=parse&prop=wikitext API; imported by scripts/import-aristotle-deint-la. The raw dump is committed at scripts/import-aristotle-deint-la/raw/deinterpretatione-wikisource.json.';

export const DEINT_LA_LICENSE = CAT_LA_LICENSE;

function laAboutSections(opts: {
  workName: string;
  perihermenias?: boolean;
  wikiPage: string;
  chapterCount: number;
  bekkerSpan: string;
  incipit: string;
  explicit: string;
  rubricCount: number;
  gaps: string[];
}): AboutSection[] {
  return [
    {
      heading: `Aristotle’s ${opts.workName} — Latin, trans. Boethius`,
      paragraphs: [
        `This is Aristotle’s ${opts.workName}${
          opts.perihermenias ? ' ("Perihermenias")' : ''
        } in the Latin translation made by Anicius Manlius Severinus Boethius in the early sixth century. It was through this version — not the Greek — that the treatise was read, taught and commented on across the Latin Middle Ages, alongside Porphyry’s Isagoge in the same translator’s Latin.`,
        'The text here is the Latin, verbatim. Nothing is translated further, modernised, normalised or silently corrected. Where the source is irregular the irregularity is preserved and noted below. It is Boethius — not "Boetheus".',
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [
        `Latin Wikisource does not record which printed edition its transcription of the "${opts.wikiPage}" page follows. The wording is that of the vulgate Boethian translation — the text edited by L. Minio-Paluello in the Aristoteles Latinus series (Categoriae: AL I.1–5, 1961; De interpretatione: AL II.1–2, 1965) — but that critical edition was not available to collate against for this build, so no editor or edition is asserted in the metadata.`,
        `The work is divided into its ${opts.chapterCount} traditional chapters, the same division as the companion Greek text; ${opts.rubricCount} of the ${opts.chapterCount} chapters additionally carry a short Latin rubric (for example "DE SUBSTANTIA"), which is kept verbatim as the chapter’s source heading. In the standard pagination the work occupies Bekker ${opts.bekkerSpan}; those page/column/line numbers are not present in this source (see "Reference scheme").`,
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is the wikitext of the Latin Wikisource page "${opts.wikiPage}", retrieved once through the MediaWiki action=parse&prop=wikitext API and committed under the importer’s raw/ directory. It is bundled with the app; nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        `The importer strips the wiki-transport scaffolding only — the {{TextQuality}} banner, the {{titulus2}} metadata template, {{finis}}, the <div class="text"> wrapper and the trailing interwiki links — then splits the body at the "== [NN] ==" chapter headings (asserting exactly ${opts.chapterCount}) and takes the blank-line-separated blocks inside each chapter as its passages. Entities are decoded and runs of whitespace collapsed; the words, spelling and punctuation are otherwise untouched. There is no preface division: chapter 1 is the first thing after the scaffolding.`,
        'Each chapter also carries an English chapter title. These titles are editorial: they are not part of the source text and are marked "ed." wherever they appear. They are shared with the Greek sibling so the two line up 1:1.',
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'Citation here is by chapter (plus the editorial English chapter title, and the verbatim Latin rubric where the source prints one). This source carries no Bekker page/column/line milestones and no line numbers, so every Division.ref and Passage.ref is null and every Passage.n is the empty string. Per-chapter and per-line Bekker references are not derivable from it and are not fabricated.',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `Completeness. All ${opts.chapterCount} chapters are present and in order, verbatim from the incipit ("${opts.incipit}…") to the explicit ("… ${opts.explicit}"). No paragraph is dropped, merged or reordered; the bundled raw dump is identical to the Latin Wikisource page as retrieved.`,
        ...opts.gaps,
        'Orthography. Spelling is left exactly as transmitted: classical consonantal u is written u, not v (Aequiuoca, uerbum, uero); there is no u/v or i/j regularisation. Single quotation marks around cited terms and the double-hyphen dashes are the edition’s punctuation, kept verbatim.',
      ],
    },
  ];
}

export const CAT_LA_ABOUT_SECTIONS: AboutSection[] = laAboutSections({
  workName: 'Categories',
  wikiPage: 'Categoriae',
  chapterCount: 15,
  bekkerSpan: '1a1–15b33',
  incipit: 'Aequiuoca dicuntur quorum nomen solum commune est',
  explicit: 'qui autem solent dici paene omnes sunt annumerati.',
  rubricCount: 10,
  gaps: [
    'Chapter 10 lacunae. The source prints the editorial lacuna mark "<...>" at three points in chapter 10 (DE OPPOSITIS): after "idem enim modus est oppositionis;", after "priuatio uisus caecitas dicitur", and before "habens uisum dicitur". These mark places where the Latin is defective or omitted in this witness. The mark is kept verbatim and shown in the reader as an anomaly note; the missing words are NOT supplied. The Greek Categoriae chapter 10 gives the sense.',
    'Chapter 10 replacement characters. The Wikisource page carried the Unicode replacement character (U+FFFD) at two mid-word line-wrap points in chapter 10 ("in�uicem", "opponun�tur"). This is a transcription encoding artefact, not a textual variant; the stray character was removed and the word halves joined to restore "inuicem" and "opponuntur". This is the only repair applied anywhere in the text.',
    'Chapter-9 heading token. The chapter-9 heading is printed "[9]" where every other chapter token is zero-padded ("[01]"…"[08]", "[10]"…"[15]"). It is normalised to the number "9"; no reading text is affected.',
    'Page-quality banner. The Wikisource {{TextQuality|50%}} banner was stripped as transport scaffolding.',
  ],
});

export const DEINT_LA_ABOUT_SECTIONS: AboutSection[] = laAboutSections({
  workName: 'De Interpretatione',
  perihermenias: true,
  wikiPage: 'De interpretatione',
  chapterCount: 14,
  bekkerSpan: '16a1–24b9',
  incipit: 'Primum oportet constituere quid sit nomen et quid uerbum',
  explicit: 'simul autem eidem non contingit inesse contraria.',
  rubricCount: 3,
  gaps: [
    'Editorial supplements. The edition prints four editorial angle-bracket supplements, kept verbatim (not markup) and shown in the reader as anomaly notes: <\'ferus\'> in chapter 2, <\'est aliquod animal iustum\'> in chapter 10, <albus, et> in chapter 11, and <im> in chapter 13 (in "\'<im>possibile esse\'"). Each supplies words the editor judged implied; this mirrors the <quod> supplement in the Latin Isagoge.',
    'Chapter 14 transcription slips. Chapter 14 contains two apparent single-letter transcription slips — "contraria ent" (for "contraria erit") and "bonum est nel quoniam" (for "… uel quoniam"). Both are preserved verbatim and flagged; no conjectural emendation is applied.',
    'Page-quality tag. The trailing Wikisource {{Textquality|25%}} tag was stripped as transport scaffolding.',
  ],
});
