/**
 * Prose "About the text" bodies for the two Isagoge works. Kept here (not
 * hand-edited into data/) so re-running the importers reproduces the enriched
 * about.json. Rendered by src/screens/WorkAbout.tsx.
 */

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

export const GRC_PROVENANCE =
  'TEI XML from the OpenGreekAndLatin / First1KGreek project (CTS urn:cts:greekLit:tlg2034.tlg006, witness opp-grc1), which digitises Adolf Busse’s 1887 edition; imported by scripts/import-isagoge-grc.';

export const GRC_LICENSE =
  'The Greek text of Busse’s 1887 edition is in the public domain. The digital transcription is distributed by First1KGreek under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const GRC_ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: 'Porphyry’s Isagoge',
    paragraphs: [
      'This is the Greek text of Porphyry’s Εἰσαγωγή ("Introduction"), written in the third century as a primer to Aristotle’s Categories. It defines and compares the five "predicables" — genus, species, differentia, property and accident — and became the standard entry point to logic for late antiquity and the Middle Ages.',
      'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular, the irregularity is preserved and noted below.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'Adolf Busse, ed., Porphyrii Isagoge et in Aristotelis Categorias commentarium, Commentaria in Aristotelem Graeca IV.1 (Berlin: Reimer, 1887). This edition is in the public domain.',
      'Busse’s page numbers are kept as the canonical reference and are shown in the reader as "Busse p. N".',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'The machine-readable text is the TEI XML file tlg2034.tlg006.opp-grc1 from the OpenGreekAndLatin / First1KGreek repository, which in turn underlies the Perseus/Scaife structured text of the Isagoge. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'The importer segments the text into 27 divisions — a preface followed by the traditional twenty-six numbered sections (I–XXVI) — using the verbatim section headings printed in the edition (Περὶ γένους, Περὶ εἴδους, and so on). Passages are the paragraph units of the TEI.',
      'Each division also carries an English section title. These titles are editorial: they are not part of the source text and are marked "ed." wherever they appear. The section numbers and page references come from Busse’s edition.',
    ],
  },
  {
    heading: 'Reference scheme',
    paragraphs: [
      'Division scheme: the work is divided exactly as in Busse’s edition — a praefatio followed by twenty-six numbered capitula (I–XXVI), each introduced by its verbatim Περὶ-heading (Περὶ γένους … Περὶ τῆς διαφορᾶς τῶν αὐτῶν). This is the same praefatio-plus-26 scheme used for the companion Latin translation; the two division trees are aligned for convenience but each edition follows its own source.',
      'References are given at Busse page level ("Busse p. N", or a range "Busse pp. A–B" for a division). Line-level references were attempted but abandoned: the digital source’s embedded line markers are duplicated (each line number appears twice) and run non-monotonically around the section headings, which makes per-line citation unreliable.',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Completeness. All 27 divisions are present; the text runs verbatim from the praefatio incipit ("Ὄντος ἀναγκαίου, Χρυσαόριε …") to Busse’s closing sentence on p. 22 ("… καὶ τῆς κοινωνίας παράστασιν."). The imported reading text is byte-for-byte identical to the First1KGreek transcription with only apparatus and marginal notes removed; nothing is dropped, merged or reordered.',
      'Section XII. The printed heading reads "Περὶ τῆς διαφορᾶς τοῦ γένους καὶ τοῦ ἰδίιου." The form ἰδίιου (for ἰδίου) is a misprint in the source; it is kept exactly as printed.',
      'Apparatus. Twenty-two apparatus-criticus footnotes carried in the TEI were removed from the reading text.',
      'Older pagination. Thirty-one marginal notes carrying Brandis pagination (the reference standard that preceded Busse, e.g. "1a Brand.") were removed from the reading text. Busse pagination is canonical here and the two systems are never mixed.',
      'Character encoding. The transcription uses the precomposed "oxia" polytonic code points (e.g. U+1F73  έ) rather than the canonically-equivalent monotonic "tonos" code points (U+03AD). The bytes are preserved exactly as transmitted: they carry every accent and breathing, contain no combining-mark sequences, and are canonically equivalent to NFC. No normalisation was applied.',
      'Transcription quality. The First1KGreek transcription of Busse’s text contains uncorrected OCR-level irregularities — stray vertical bars, stray capitals, and occasional misspellings such as ἐπναβεβηκὸς, Κοτνὸν and κινεὶσθαι. Every one of these is preserved verbatim; none has been corrected or conjecturally emended.',
    ],
  },
];

export const LA_PROVENANCE =
  'Latin Wikisource, page "Isagoge" (transcribed there from the edition-text posted by P. King, individual.utoronto.ca); imported by scripts/import-isagoge-la.';

export const LA_LICENSE =
  'Boethius’s translation is itself in the public domain (early 6th century). The digital transcription is taken from Latin Wikisource and is available under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const LA_ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: 'The translation',
    paragraphs: [
      'This is Porphyry’s Isagoge in the Latin translation made by Boethius in the early sixth century. It was through this version that the Isagoge shaped the whole medieval tradition of logic and the debate over universals.',
      'The text here is the Latin, verbatim. Nothing is translated further, modernised, normalised or silently corrected.',
      'It is Boethius — not "Boetheus".',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'The paragraph text and its numbering follow M. Dal Pra’s edition of the Boethian translation (1969), as transcribed on Latin Wikisource. This work carries no Busse pagination and no line numbers; its citation scheme is section plus paragraph — for example "§ I ¶ 4".',
      'Division scheme: a preface followed by twenty-six capitula — the five predicables (genus, species, differentia, proprium, accidens), the chapter on features common to all five, and twenty paired "common / distinctive" comparison chapters. The standing reference edition for the Latin division is Aristoteles Latinus I.6–7, ed. L. Minio-Paluello with B. G. Dod (Bruges–Paris, 1966), pp. 5–31. That volume was not available to re-collate against for this build; two independent witnesses that were consulted — Busse’s Greek capitula (CAG IV.1, 1887) and a Busse-paginated text of Boethius’ translation — both divide into the same preface-plus-26 scheme, so that scheme is used here. If Aristoteles Latinus is later collated and divides the translation differently (for example into fewer chapters), this is the division that would be revised.',
    ],
  },
  {
    heading: 'Reference scheme',
    paragraphs: [
      'Citation is by section and paragraph (e.g. "§ I ¶ 4"). This witness carries no Busse page numbers and no line numbers, so every page/line reference field is null. The division ids are shared with the Greek text for convenient side-by-side reading, but the two editions are treated as independent and may divide differently.',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'The machine-readable text is the Latin Wikisource page "Isagoge", which transcribes the edition-text circulated by Peter King (individual.utoronto.ca). It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'The importer splits the text into the same 27 divisions as the Greek — a preface followed by sections I–XXVI — keyed to the verbatim Latin rubrics ("De genere", "De specie", and so on). Wiki markup was stripped; the words and the printed paragraph numbers are otherwise untouched.',
      'Each division also carries an English section title. These titles are editorial: they are not source text and are marked "ed." wherever they appear. The Latin rubrics and the section and paragraph numbers come from the edition.',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Completeness. All 27 divisions are present; the text runs verbatim from "Cum sit necessarium, Chrysaori …" to the closing "… communitatisque traditionem." The imported reading text is identical to the Wikisource transcription with only wiki scaffolding ({{titulus2}} template, the leading <center> block, and the printed paragraph numbers) removed; nothing is dropped, merged or reordered.',
      'Chapter rubrics. The Latin capitula follow the wording of this recension — for example "De communitatibus generis et differentiae", "De differentiis generis et differentiae", "De communibus proprii et inseparabilis accidentis". Busse’s parallel Latin prints slightly different rubrics ("De communibus …", "De propriis …", without "inseparabilis"). In every edition these capitula are editorial headings, not part of Boethius’ running translation; the wording is kept exactly as transmitted by the source.',
      'Section count. An earlier query asked whether the Latin should carry 24 sections rather than 26. The witnesses available for this build do not support a 24-section division; the preface-plus-26 scheme (which also matches the Greek) is used. See "The edition" above.',
      'Section II, paragraph 2 contains the angle-bracket supplement <quod>. This is an editorial addition printed in the edition, not stray markup, and it is kept verbatim.',
      'Orthography. Spelling is left exactly as transmitted, with no u/v or i/j regularisation. In "De genere" paragraph 3 the source reads "uniuscujusque" with a j where the rest of the text has "uniuscuiusque"; this inconsistency is preserved.',
      'A few paragraphs carry no printed number in the source — one each in sections III, IV, XIII and XXIII. Those passages are stored with an empty paragraph number.',
      'This source has no Busse or line numbering, so every page/line reference field is empty; cite by section and paragraph.',
    ],
  },
];
