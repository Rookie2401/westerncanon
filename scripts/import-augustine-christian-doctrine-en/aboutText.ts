/**
 * Prose "About the text" body for the English On Christian Doctrine
 * (trans. J. F. Shaw). Kept here (not hand-edited into data/) so re-running
 * the importer reproduces the enriched about.json. Rendered by
 * src/screens/WorkAbout.tsx.
 *
 * EN_PROVENANCE / EN_LICENSE reuse, verbatim, the wording already committed
 * in src/library/registry.ts's `source` block for the
 * 'augustine-christian-doctrine-en' work entry.
 */

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

export const EN_PROVENANCE =
  'English Wikisource, "Nicene and Post-Nicene Fathers: Series I/Volume II/On Christian Doctrine".';

export const EN_LICENSE = 'Translation public domain (1887); transcription CC BY-SA 4.0 (Wikisource).';

export const EN_ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: 'On Christian Doctrine',
    paragraphs: [
      'Begun around 396 and finished, after a long gap, around 426/427, De Doctrina Christiana ("On Christian Doctrine" in this translation\'s title) is Augustine\'s manual for interpreting and preaching Scripture. Books I-III treat the discovery of meaning - things and signs, the rule that every reading must build up love of God and neighbor, and how to resolve ambiguous or figurative language. Book IV, written and published some thirty years after the first three, turns to how a Christian teacher should present what has been understood, including a sustained discussion of the proper Christian use of rhetorical eloquence.',
      'This is the 1887 translation by the Rev. Professor J. F. Shaw of Londonderry, published in the Nicene and Post-Nicene Fathers series. It is a translation, not the Latin original (bundled alongside it in this app as a separate edition); nothing here is re-translated, paraphrased, or silently corrected.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'Nicene and Post-Nicene Fathers, Series I, Volume II (1887), edited by Philip Schaff. The translator note on the work\'s own title page reads "Translated by Rev. Professor J. F. Shaw, of Londonderry."',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'The machine-readable text is the wikitext of the English Wikisource page family "Nicene and Post-Nicene Fathers: Series I/Volume II/On Christian Doctrine" - a Preface page plus one Book-level table-of-contents page and one page per chapter for each of the four Books (40 + 42 + 37 + 31 = 150 chapter pages) - fetched once via the MediaWiki API and bundled with the app; nothing is loaded from the network at runtime. Each Book\'s chapter count was read directly from that Book\'s own "== Contents ==" list, not assumed.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'Each chapter page opens with a {{header}} navigation template (stripped) and a heading of the form "Chapter N.—Title."; the text after the em-dash is used as that Chapter\'s sourceHeading. The Preface page (this work\'s book-0, paralleling the Latin edition\'s Prologus) instead prints a bare "Preface." heading followed by a separate one-line description, which is used the same way.',
      'Within a chapter page, the translation prints its own numbered paragraphs (mirroring the Latin\'s finer chapter.section numbering), but this importer follows the citation scheme already registered for this work (\'book-chapter\', registry.ts) rather than the Latin edition\'s (\'book-chapter-section\'): every Chapter division holds exactly one Passage (n: ""), and where a chapter prints more than one numbered paragraph, all of them are joined into that single Passage, with the source\'s own paragraph numbers (e.g. "1.", "2.") kept inline exactly as printed rather than stripped or split into separate Passages.',
      'Only wiki/HTML transport scaffolding was removed: the {{header}} template, every <ref>...</ref> footnote (removed like any apparatus footnote - a running count is kept, not an entry per footnote, since chapter pages carry dozens of these throughout the work), the trailing "==Footnotes==\\n<references />" marker, and MediaWiki\'s two/three-apostrophe italic/bold markup around emphasised words (this app\'s Passage.text has no rich-text field, so the markers are dropped and the words kept). HTML entities (numeric and named, e.g. &#160; and &#8217;) are decoded to their literal characters. Nothing else - no word, no sentence - was changed, reordered, or discarded.',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Completeness. The Preface and all four Books are present, with exactly the chapter counts printed in each Book\'s own table of contents (40, 42, 37, 31 for Books I-IV).',
      'Footnotes removed, not preserved. Wikisource\'s Shaw text carries a large number of translator/editor footnotes (chiefly Scripture cross-references), each wrapped in <ref>...</ref>. These are apparatus, not Augustine\'s own text, and are removed from the reading flow the same way every other importer in this repo treats footnote apparatus; the total removed is recorded in anomalies.json rather than quoting each one individually, given the volume involved.',
      'Chapter divisions here do not match the Latin edition\'s. The Latin De Doctrina Christiana Books II and III, as transcribed on Latin Wikisource, print no traditional chapter numerals at all (see that edition\'s own about page) - only this English translation preserves the traditional 42-chapter/37-chapter division for those two Books. Readers wanting the Book/Chapter alignment between the two editions should note this asymmetry; it is a property of the two different Wikisource transcriptions, not something this importer introduced.',
      'No physical reference. This transcription carries no page or line numbers of its own; every Division.ref and Passage.ref is null.',
    ],
  },
];
