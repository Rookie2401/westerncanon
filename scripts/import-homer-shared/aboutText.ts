/**
 * Shared About-page text fragments common to all four Homer works (the
 * digital source and the provenance/license lines are identical across all
 * four; each importer supplies its own work-specific "About the text" and
 * "How it was imported" sections alongside these).
 */

export const GRC_PROVENANCE =
  'Perseus Digital Library / Open Greek and Latin, "canonical-greekLit" GitHub repository ' +
  '(github.com/PerseusDL/canonical-greekLit), TEI XML edition of the Monro/Allen Oxford Classical ' +
  'Text (Homeri Opera, vols. I-II, Oxford: Clarendon Press, 3rd ed. 1920 for the Iliad, 2nd ed. 1917-19 ' +
  'for the Odyssey; first published 1902/1908). Fetched once and cached in this repository under ' +
  'scripts/import-homer-<work>-grc/raw/ - nothing is downloaded at build or run time.';

export const EN_PROVENANCE =
  'Perseus Digital Library / Open Greek and Latin, "canonical-greekLit" GitHub repository ' +
  '(github.com/PerseusDL/canonical-greekLit), TEI XML edition of A. T. Murray\'s prose translation, ' +
  'Loeb Classical Library (Iliad: 2 vols., 1924-25; Odyssey: 2 vols., 1919). Fetched once and cached ' +
  'in this repository under scripts/import-homer-<work>-en/raw/ - nothing is downloaded at build or ' +
  'run time.';

export const GRC_LICENSE =
  'Greek text (Monro/Allen, early 20th century) is in the public domain. The Perseus/Open Greek and ' +
  'Latin digital TEI encoding is licensed CC BY-SA 4.0.';

export const EN_LICENSE =
  'A. T. Murray\'s translation was first published 1919 (Odyssey) and 1924-25 (Iliad) - more than 95 ' +
  'years ago - and is in the public domain in the United States. The Perseus/Open Greek and Latin ' +
  'digital TEI encoding is licensed CC BY-SA 4.0.';

export const DIGITAL_SOURCE_SECTION_GRC = {
  heading: 'Digital source',
  paragraphs: [
    GRC_PROVENANCE,
    'The importer reads this cached XML directly; each of the work\'s 24 Books is a top-level division ' +
      '(book-1..book-24), holding a single passage whose text is every surviving verse line of that ' +
      'Book, one per line, in reading order - the Greek is preserved as verse, not collapsed to prose.',
  ],
};

export const DIGITAL_SOURCE_SECTION_EN = {
  heading: 'Digital source',
  paragraphs: [
    EN_PROVENANCE,
    'The importer reads this cached XML directly; each of the work\'s 24 Books is a top-level division ' +
      '(book-1..book-24), holding a single passage whose text is every one of that Book\'s prose ' +
      'paragraphs, in reading order, joined with a blank line between them - Murray\'s translation is ' +
      'prose, so (unlike the Greek) no per-line breaks are inserted. The Loeb print edition\'s own ' +
      '"card" pagination divisions are a page-layout artefact only and are discarded; Loeb\'s marginal ' +
      'cross-reference numbers (keyed to the Greek verse lines) are used only to compute each Book\'s ' +
      'own line-range citation (Division.ref), not shown inline in the reading text.',
  ],
};
