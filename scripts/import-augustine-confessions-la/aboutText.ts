/**
 * Prose "About the text" body for the Latin Confessiones. Kept here (not
 * hand-edited into data/) so re-running the importer reproduces the enriched
 * about.json. Rendered by src/screens/WorkAbout.tsx.
 *
 * LA_PROVENANCE / LA_LICENSE reuse, verbatim, the wording already committed
 * in src/library/registry.ts's `source` block for the 'augustine-confessions-la'
 * work entry.
 */

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

export const LA_PROVENANCE = 'Latin Wikisource, "Confessiones" (text from thelatinlibrary.com).';

export const LA_LICENSE = 'Latin text public domain; transcription CC BY-SA 4.0 (Wikisource).';

export const LA_ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: "Augustine's Confessiones",
    paragraphs: [
      'Written around 397-401, the Confessiones is Augustine\'s address to God in thirteen books: the first nine tell the story of his life up to his baptism and his mother Monica\'s death, told as a continuous act of confession rather than a plain narrative; the last four turn to memory, time, and a sustained reading of the opening verses of Genesis.',
      'The text here is the original Latin, verbatim. Nothing is translated, modernised, or silently corrected. Where the source is irregular, the irregularity is preserved and noted below.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'The Latin text is that transcribed on Latin Wikisource, whose own note attributes it to the edition circulated by The Latin Library (thelatinlibrary.com). It carries no critical apparatus, editor name, or page numbers of its own, so this importer records no `edition`/`editor` field; citation here is by the traditional book, chapter, and section numbers printed in the source itself.',
      'Every printed sentence in this source is lowercase, with no capital letters anywhere - not even at the start of the work or of any sentence. That is exactly how the source prints it and is kept exactly so.',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'The machine-readable text is the wikitext of the thirteen Latin Wikisource pages "Confessiones/Liber Primus" through "Confessiones/Liber Tertius Decimus" (one page per Book), fetched once via the MediaWiki API and bundled with the app; nothing is loaded from the network at runtime.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'Each page prints a flat run of "== book.chapter.section ==" headings (e.g. "== 1.5.6 =="), one per numbered section, with no separate rubric or title. The importer groups consecutive headings that share a chapter number into one Chapter division, and gives each heading its own Passage, numbered by its printed section number. A chapter can and does carry more than one section - Book I chapter 5, for instance, has two (sections 5 and 6) - and this is read directly from the heading sequence rather than assumed.',
      'Wiki-transport scaffolding only was removed: the page-header template, the __NOTOC__ marker, the closing "finis"/text-quality markers, one embedded editorial footnote (a variant-reading note in Book X), and MediaWiki\'s two-apostrophe italic markup around quoted material (this app has no rich-text field to carry the italics, so the markers are dropped and the words kept). Nothing else - no word, no spelling, no letter - was changed.',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Completeness. All thirteen Books are present, each subdivided into its printed chapters and sections; the text runs verbatim from the opening "magnus es, domine, et laudabilis valde." to the closing sentence of Book XIII.',
      'One footnote removed. Book X, section 10.6.10, carries a single editorial <ref> footnote recording a variant reading proposed by de Labriolle; it is apparatus, not Augustine\'s text, and was removed from the reading flow like any other footnote in this repo\'s importers (logged verbatim in anomalies.json).',
      'Italic markup stripped. A handful of quoted phrases (Scripture quoted within Monica\'s or Augustine\'s own quoted speech, in Books III and XII) are wrapped in MediaWiki\'s two-apostrophe italic markers in the source. Since Passage.text carries no character-level formatting, the markers were stripped and the underlying Latin kept verbatim; every instance is counted in anomalies.json.',
      'One multi-paragraph section. Book IX, section 9.12.32, contains a blank line before eight quoted lines of an Ambrosian hymn. Unlike Porphyry\'s Isagoge (whose passages split on blank lines within a numbered section), this work\'s passage granularity is one passage per printed section number; the blank line is simply collapsed to a single space along with all other whitespace, so the hymn reads as part of that one passage.',
      'No physical reference. This transcription carries no page or line numbers of its own kind; every Division.ref and Passage.ref is null, and citation is by book, chapter, and section exactly as this source prints them.',
    ],
  },
];
