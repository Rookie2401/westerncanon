/**
 * Prose "About the text" body for the Latin De Doctrina Christiana. Kept
 * here (not hand-edited into data/) so re-running the importer reproduces
 * the enriched about.json. Rendered by src/screens/WorkAbout.tsx.
 *
 * LA_PROVENANCE / LA_LICENSE reuse, verbatim, the wording already committed
 * in src/library/registry.ts's `source` block for the
 * 'augustine-christian-doctrine-la' work entry.
 */

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

export const LA_PROVENANCE = 'Latin Wikisource, "De Doctrina Christiana".';

export const LA_LICENSE = 'Latin text public domain; transcription CC BY-SA 4.0 (Wikisource).';

export const LA_ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: "Augustine's De Doctrina Christiana",
    paragraphs: [
      'Begun around 396 and finished, after a long gap, around 426/427, De Doctrina Christiana ("On Christian Teaching") is Augustine\'s manual for interpreting and preaching Scripture. Books I-III treat the discovery of meaning - things and signs, the rule that every reading must build up love of God and neighbor, and how to resolve ambiguous or figurative language. Book IV, written and published some thirty years after the first three, turns to the second half of the project promised in the opening pages: how a Christian teacher should actually present what has been understood, including a sustained discussion of the proper Christian use of rhetorical eloquence.',
      'The text here is the original Latin, verbatim. Nothing is translated, modernised, or silently corrected. Where the source is irregular, the irregularity is preserved and noted below.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'The Latin text is that transcribed on Latin Wikisource under the page family "De Doctrina Christiana" (prologue plus one page per Book), which carries no named critical edition, editor, or page numbers of its own, so this importer records no `edition`/`editor` field. Citation here is by the printed numbers this source itself carries - see "How it was imported" for exactly what those are, since they differ markedly from Book to Book.',
      'Unlike the Confessiones and De Civitate Dei Latin texts bundled alongside this one in the same app, this transcription is capitalised normally (sentence-initial capitals, proper nouns capitalised) rather than printed entirely in lowercase.',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'The machine-readable text is the wikitext of five Latin Wikisource pages - "De Doctrina Christiana/prol" and "/I" through "/IV" - fetched once via the MediaWiki API and bundled with the app; nothing is loaded from the network at runtime.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'This source uses four different internal layouts across its five pages, and this importer parses each on its own terms rather than forcing one template over all of them. The Prologus and Book I are flat runs of text joined by <br /> line-breaks; the Prologus numbers its paragraphs with a single running number (cited by paragraph alone, e.g. "prol. 3", since it predates the work\'s own Book/Chapter/Section apparatus), while Book I prints a genuine dual "chapter. section" number before every paragraph (e.g. "5. 5." for chapter 5, section 5). Book IV repeats Book I\'s dual numbering but lays it out as ordinary blank-line-separated paragraphs instead. Books II and III abandon the dual numbering entirely, printing a single running paragraph number inside one long HTML list.',
      'Wherever the source prints a short rubric (a marginal one-line title) immediately before a numbered paragraph, this importer treats it as that paragraph\'s chapter title (Division.sourceHeading) when it begins a new chapter, or preserves it on the individual Passage when a chapter unusually carries more than one such rubric across its sections (this happens several times in Book I - a chapter with two or three sections can print a separate rubric before each one, not only its first).',
      'Only wiki/HTML transport scaffolding was removed: the page-header template, __NOTOC__, the <div class="verse"> wrapper, the {{Liber}} navigation template, and the <p>/<li>/<ol> tags used to lay out Books I-IV. One bare "**" typographic divider in Book I (between chapters 15 and 16) was dropped as print-layout scaffolding, not reading text. A three-line pagan verse quotation in Book III (paragraph 11, the "Neptune" passage), laid out in the source with bare <p> tags outside its containing list item, was folded back into that paragraph\'s text rather than lost. Nothing else - no word, number, or rubric - was changed, reordered, or discarded.',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Completeness. All five pages (Prologus + Books I-IV) are present, running verbatim from the Prologus\'s opening "Sunt praecepta quaedam tractandarum Scripturarum..." to Book IV\'s closing sentence, "...quantulacumque potui facultate disserui."',
      'A genuine numbering error, kept as printed. Book I\'s chapter numbers run 1 to 40 in step with the section numbers - except at one point, where the text prints "5. 39." immediately after "34. 38." (i.e. the 35th chapter of the book is numbered "5", not "35", while its section number 39 continues the running count correctly). This is almost certainly a transcription slip on Wikisource\'s part for "35. 39.", but this importer does not silently correct it: the chapter is kept exactly as printed ("5"), its position in the book (the 35th chapter encountered) is reflected only in its Division id (book-1-ch-35), and the discrepancy is logged verbatim in anomalies.json.',
      'Repeated printed numbers, kept as printed. Several other points in the text repeat a printed number across a boundary that "should" have incremented it by one - for example Book I\'s running section number 11 is printed for both chapter 11 and chapter 12, and section 41 for both chapter 36 and chapter 37; Book IV\'s running section number repeats similarly at two points; and Books II and III each carry a small number of paragraphs that repeat their own printed number (e.g. Book II prints "40" for two consecutive paragraphs; Book III repeats "29", "30", "34", and "37"). None of these are corrected; every one is detected mechanically (by checking that each printed number follows the previous one by exactly +1) and logged individually in anomalies.json.',
      'Books II and III have no traditional chapter numbering in this source. Unlike Books I and IV, and unlike the English NPNF translation of this same work bundled alongside it (which divides Book II into the traditional 42 chapters and Book III into 37), this Latin transcription of Books II and III prints no chapter numerals at all - only a one-line marginal rubric before nearly every numbered paragraph. This importer uses each such rubric-bounded stretch of text as that Book\'s Chapter division, since it is the only structural unit the source itself provides; these Chapters do NOT correspond to the traditional citation scheme, and the traditional chapter boundaries cannot be recovered from this source. The printed paragraph number (Passage.n) is unaffected by this and matches the traditional running section number throughout.',
      'No apparatus, no footnotes. Unlike this app\'s other Augustine sources, none of these five pages carry a critical-apparatus footnote block or any <ref>...</ref> markup - confirmed by direct inspection of all five raw pages. The occasional bare digit appearing inline in the running text (e.g. "Qui habet, dabitur ei 1.") is almost certainly a Scripture cross-reference marker, but with no markup distinguishing it from ordinary text and no footnote list to confirm against, it is kept exactly as printed rather than guessed at or removed.',
      'No physical reference. This transcription carries no page or line numbers of its own; every Division.ref and Passage.ref is null.',
    ],
  },
];
