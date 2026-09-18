/**
 * Shared about.json prose for the six Hesiod importers. Each importer calls
 * `buildAbout` with the numbers it actually parsed (line counts, card
 * counts, del/add/gap/note counts) so the boilerplate below never drifts
 * out of sync with the generated data.
 */

import type { WorkAbout, WorkAboutSection } from './types.ts';

export const HESIOD_LICENSE_GRC =
  'The Greek critical text is in the public domain. The digital transcription is distributed by the ' +
  'Perseus Digital Library / OpenGreekAndLatin Project (`canonical-greekLit`) under the Creative Commons ' +
  'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const HESIOD_LICENSE_EN =
  "Hugh G. Evelyn-White's translation was first published in 1914 (Hesiod, the Homeric Hymns and " +
  'Homerica, Loeb Classical Library, London: William Heinemann / New York: The Macmillan Co.) and is in ' +
  'the public domain (110+ years old). The digital transcription is distributed by the Perseus Digital ' +
  'Library / OpenGreekAndLatin Project (`canonical-greekLit`) under the Creative Commons Attribution-' +
  'ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export function digitalSourceParagraph(rawFile: string, ctsUrn: string): string {
  return (
    `The machine-readable text is the TEI XML file ${rawFile} (CTS URN ${ctsUrn}) from the Perseus Digital ` +
    'Library / OpenGreekAndLatin `canonical-greekLit` GitHub repository. It was fetched once and is ' +
    'bundled with the app; nothing is loaded from the network at runtime.'
  );
}

export function editionParagraphs(workTitleEn: string, workTitleGrc: string): string[] {
  return [
    `Hugh G. Evelyn-White, ed. and trans., Hesiod, the Homeric Hymns and Homerica (Loeb Classical Library, ` +
      `London: William Heinemann Ltd. / New York: The Macmillan Co., 1914). This is the edition that ` +
      `Perseus's TEI transcription of both the Greek text and the English translation of "${workTitleEn}" ` +
      `(${workTitleGrc}) is built from.`,
    'Citation in this reader follows the Loeb "card" pagination unit that both language witnesses in the ' +
      'source TEI share (a card typically spans 20–40 lines); Hesiod\'s poems carry no Book-level division ' +
      'in the manuscript or print tradition, so there is no higher citation level to use instead.',
  ];
}

export interface BuildAboutArgs {
  workId: string;
  title: string;
  greekTitle: string;
  language: 'grc' | 'en';
  translator?: string;
  provenance: string;
  license: string;
  introParagraphs: string[];
  editionParagraphs: string[];
  digitalSourceParagraph: string;
  howImportedParagraphs: string[];
  referenceSchemeParagraphs: string[];
  gapsParagraphs: string[];
}

export function buildAbout(a: BuildAboutArgs): WorkAbout {
  const sections: WorkAboutSection[] = [
    { heading: `Hesiod's ${a.title}`, paragraphs: a.introParagraphs },
    { heading: 'The edition', paragraphs: a.editionParagraphs },
    { heading: 'Digital source', paragraphs: [a.digitalSourceParagraph] },
    { heading: 'How it was imported', paragraphs: a.howImportedParagraphs },
    { heading: 'Reference scheme', paragraphs: a.referenceSchemeParagraphs },
    { heading: 'Known gaps & anomalies', paragraphs: a.gapsParagraphs },
  ];
  const about: WorkAbout = {
    workId: a.workId,
    title: a.title,
    author: 'Hesiod',
    language: a.language,
    edition: 'Evelyn-White 1914 (Loeb Classical Library)',
    editor: 'Hugh G. Evelyn-White',
    provenance: a.provenance,
    license: a.license,
    sections,
  };
  if (a.translator) about.translator = a.translator;
  return about;
}
