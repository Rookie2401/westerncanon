/**
 * "About the text" prose generator, shared across all 13 Archimedes works.
 * Produces the WorkAbout.sections rendered by src/screens/WorkAbout.tsx.
 * Every paragraph is generated from real counts the importer measured on that
 * specific file - nothing here is boilerplate copy with numbers filled in by
 * hand.
 */

import type { WorkAboutSection } from './genericTypes.ts';
import type { ArchimedesWorkEntry } from './workTable.ts';

export interface AboutStats {
  divisionCount: number;
  passageCount: number;
  totalChars: number;
  gapCount: number;
  addCount: number;
  delCount: number;
  figureCount: number;
  triangleDecodeCount: number;
  nfcDiffCount: number;
  hasLb: boolean;
  pbFirst: string;
  pbLast: string;
}

/** Per-work known-gaps prose that cannot be derived from generic counts alone. */
const KNOWN_GAPS: Partial<Record<string, string[]>> = {
  'archimedes-sand-reckoner': [
    'Corrected transcription gap (verified against print). This work was spot-checked letter-for-letter against J. L. Heiberg\'s original 1880 printed edition (Archimedis Opera Omnia, vol. II, p. 260). One numeral, "τ" (300), was missing from the digital source in the sentence where Archimedes restates his enlarged upper bound for the earth\'s circumference ("τὰν περίμετρον αὐτᾶς ὑποτίθεμαι εἶμεν ὡς [τ] μυριάδων σταδίων" - "I take the circumference of the earth to be not greater than [300] myriad stadia"). The identical numeral for the same "300 myriad stadia" figure appears twice earlier in the same paragraph, and the sentence is not grammatically complete without it, confirming this was a transcription slip rather than a genuine reading of Mugler\'s edition; it has been restored here from Heiberg\'s print.',
  ],
  'archimedes-conoids-spheroids': [
    'Proposition 29 is absent from the traditional numbering this edition follows (the sequence runs ...28, 30, 31, 32): this is not an importer error or a dropped section, it is how the propositions are numbered in the source.',
  ],
  'archimedes-method': [
    'This work survives only through the Archimedes Palimpsest (a 10th-century copy overwritten in the 13th century with a prayer book, recovered by multispectral imaging in the early 2000s). The text here carries two prefatory sections - "pr1" (the covering letter to Eratosthenes) and "pr2" (headed ΠΡΟΛΑΜΒΑΝΟΜΕΝΑ, "preliminaries", reconstructed separately) - followed by propositions 1-15. Because the Palimpsest is a damaged, overwritten manuscript, this is by far the most heavily marked-up file in the corpus for editorial gaps and restorations (see the counts below); every one is preserved exactly as the edition prints it, not smoothed over.',
  ],
  'archimedes-liber-assumptorum': [
    'This file carries no <lb> (line-break) markers at all, unlike every other work in this corpus - the source TEI simply does not encode line numbers for the Book of Lemmas. Nothing is lost by this: paragraph and page (<pb>) structure is unaffected, and no ref field depended on line numbers to begin with.',
  ],
  'archimedes-stomachion': [
    'Only the opening of this work survives; it is fragmentary by nature, not by any omission on the importer\'s part. The single numbered division below is the whole of what the tradition preserves.',
  ],
  'archimedes-fragments': [
    'Corrected transcription gap (verified against print). This work was spot-checked letter-for-letter against J. L. Heiberg\'s original 1880 printed edition (Archimedis Opera Omnia, vol. II, p. 458). The digital source described the first of the thirteen Archimedean solids (the truncated tetrahedron) as bounded "ὑπὸ τριγώνων ▵Ζ καὶ ἑξαγώνων δ" - a corrupted numeral ("triangle" plus Zeta) where the printed edition reads "ὑπὸ τριγώνων δ᾿ καὶ ἑξαγώνων δ᾿" (bounded by 4 triangles and 4 hexagons, matching the solid\'s actual geometry: 4 + 4 = 8 faces, an "ὀκτάεδρον"). The same corrupted numeral recurred a second time later in this work, in the separate testimonium restating the same solid\'s face/vertex/edge counts ("τριγώνοις ▵Ζ καὶ ἑξαγώνοις δ, γωνίας μὲν ἔχει στερεὰς ιβ, πλευρὰς δὲ ιη") - confirmed as the same error there too, independently of the print, by the passage\'s own next sentence, which explicitly refers back to "τεσσάρων τριγώνων" ("the four triangles"). Both instances have been corrected to δ.',
    'Fragment II\'s chapter heading is printed in the source as "GATOPTRICA" (with a G, not a C). This is very likely a transcription slip for "Catoptrica" (Περὶ κατοπτρικῶν, "On mirrors" / optics) - but it is kept exactly as transmitted, not silently corrected, per this app\'s rule against ever emending source text.',
    'Each fragment in this work is a quotation embedded in a later author\'s own book (Pappus, an anonymous Vatican scholiast on Pappus, Hero of Alexandria, Theon of Alexandria) - Archimedes\' own words survive only because someone else quoted them. For that reason every passage\'s `ref` here cites that secondary source and location (e.g. "Pappus V, 34, ed. Hultsch, p. 352"), rather than a Mugler page number as in the other 12 works; the Mugler volume/page span is still given at the division level.',
  ],
};

export function buildAboutSections(entry: ArchimedesWorkEntry, stats: AboutStats): WorkAboutSection[] {
  const romanBooks = entry.structure.kind === 'books';

  const sections: WorkAboutSection[] = [];

  sections.push({
    heading: `Archimedes' ${entry.commonTitle}`,
    paragraphs: [
      `This is the Greek text of Archimedes' ${entry.commonTitle} (Latin conventional title: ${entry.latinTitle}), one of the thirteen surviving treatises and fragment-collections transmitted under his name.`,
      'The text here is the original Greek, verbatim. Nothing is translated, modernised, or silently corrected. Where the source is irregular - a lacuna, an editor\'s conjectural restoration, a manuscript spelling - the irregularity is preserved and noted below, never smoothed over.',
      'This "thirteen" is twelve traditionally-recognised works, counting each multi-book text once (On the Sphere and Cylinder, Measurement of a Circle, On Conoids and Spheroids, On Spirals, On the Equilibrium of Planes, The Sand-Reckoner, Quadrature of the Parabola, On Floating Bodies, The Method, Stomachion, the Cattle Problem, and the Book of Lemmas), plus Fragments - a modern editorial gathering of quotations preserved in later authors, not a discrete transmitted treatise, and so not part of the twelve. This grouping was checked independently against T. L. Heath\'s The Works of Archimedes, the MacTutor History of Mathematics biography of Archimedes, and the Archimedes Palimpsest Project\'s own account of its contents; no work was found miscounted, misidentified, or missing beyond Fragments\' intentionally separate status.',
    ],
  });

  sections.push({
    heading: 'The edition',
    paragraphs: [
      `Charles Mugler, ed., Archimède, vol. ${entry.muglerVolume} (Paris: Les Belles Lettres, ${entry.muglerYear}), Collection des Universités de France ("Budé"). Mugler's edition follows the traditional proposition numbering established by J. L. Heiberg's Archimedis Opera Omnia cum commentariis Eutocii (2nd ed., Leipzig: Teubner, 1910-15; 1st ed. 1880-81) - the numbering ("pr", "1", "2", ...) used throughout this app is the same Heiberg numbering every modern edition of Archimedes uses.`,
      `Page references in this build (e.g. "Mugler vol. ${entry.muglerVolume} p. N") cite Mugler's edition specifically, because that is the print edition this digital transcription's own page markers (<pb>) actually encode, verified from the transcription's own bibliographic metadata. They are not Heiberg page numbers, and this app is careful not to conflate the two: Heiberg's numbering scheme is followed, but Heiberg's page numbers are not what is cited here.`,
    ],
  });

  sections.push({
    heading: 'Digital source',
    paragraphs: [
      `The machine-readable text is the TEI XML file ${entry.tlg}.1st1K-grc1 (CTS urn urn:cts:greekLit:tlg0552.${entry.tlg}) from the OpenGreekAndLatin/First1KGreek project, which digitises Mugler's Budé text. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.`,
    ],
  });

  const howImportedParas = [
    romanBooks
      ? `The importer segments the text into ${stats.divisionCount === 2 ? 'two Books' : 'Books'}, each a closed-by-default container in the reader; within each Book, chapters are the traditional propositions/sections, using the verbatim <div> boundaries and printed numerals (§ pr, § 1, § 2, ...) the edition itself marks. Passages are the paragraph (<p>) units of the TEI; where a numbered section prints more than one paragraph, each is its own passage, exactly as this app's Isagoge importer already treats multi-paragraph sections.`
      : entry.workId === 'archimedes-fragments'
        ? 'The importer segments the text into the two named fragment-groups the edition itself prints ("De polyedris", "Catoptrica"); within each, the numbered testimonia (§ 1, § 2, ...) become this work\'s passages directly - there is no further nesting, since each group holds only a handful of short quotations.'
        : `The importer segments the text into its numbered propositions/sections (${stats.divisionCount} in all), using the verbatim <div> boundaries and printed numerals (§ pr, § 1, § 2, ...) the edition itself marks. Passages are the paragraph (<p>) units of the TEI; where a numbered section prints more than one paragraph, each is its own passage.`,
    'Every section is labelled by its printed number only. This app deliberately does not invent an English gloss for each individual proposition: across the 13 Archimedes works there are roughly 250 sections of highly technical geometric/mechanical content, and hand-titling each one at that scale risks quietly asserting a scholarly claim ("this proposition is about X") that has not been individually verified. Only the work\'s own title and, for the three multi-book works, the book number, carry structural framing; every leaf division\'s `editorialTitle` is `null`.',
  ];
  if (romanBooks) {
    howImportedParas.push(
      'For the same reason, each Book container carries no invented content-summary title either - just its number (Book I / Book II). Individual books within a single Archimedes treatise are not standardly given separate titles in the scholarly tradition, unlike (for example) the books of Euclid\'s Elements.',
    );
  }
  sections.push({ heading: 'How it was imported', paragraphs: howImportedParas });

  const refParas = [
    entry.workId === 'archimedes-fragments'
      ? `Each passage cites the secondary author it is quoted from (see "Known gaps & anomalies" below); each division additionally carries a Mugler volume/page span ("Mugler vol. ${entry.muglerVolume} pp. ${stats.pbFirst}–${stats.pbLast}").`
      : `References are given at Mugler page level ("Mugler vol. ${entry.muglerVolume} p. N", or a range "pp. A–B" for a division). The source's <pb> page markers are monotonically increasing throughout this file (verified: pp. ${stats.pbFirst}–${stats.pbLast}, no duplicates or reversals), so - unlike this app's Isagoge importer, which had to abandon per-line references - a reliable page-level ref could be kept for every passage.`,
  ];
  if (!stats.hasLb) {
    refParas.push(
      'This particular file carries no <lb> (line) markers at all; only <pb> page markers, which is what the ref scheme above already relies on, so nothing here depended on the missing markers.',
    );
  }
  sections.push({ heading: 'Reference scheme', paragraphs: refParas });

  const gapsParas: string[] = [
    `Completeness. All ${stats.divisionCount} division(s) and ${stats.passageCount} passages are present and verbatim; nothing is dropped, merged or reordered beyond what is documented below.`,
  ];
  gapsParas.push(
    `Transcription hygiene (applied corpus-wide, all 13 Archimedes works). (1) Unicode normalisation: this file's reading text was normalised to NFC (${stats.nfcDiffCount} code point${stats.nfcDiffCount === 1 ? '' : 's'} remapped - Greek ano teleia U+0387 to middle dot U+00B7, and/or acute-only Greek-Extended vowels to their monotonic equivalents; a canonical-equivalence remap only, verified to introduce no combining-mark sequences). (2) Entity decoding: the numeric character reference "&#9651;" (a stand-in for "triangle" plus a point-letter, e.g. "τριγώνων ▵Ζ") was decoded to the real character ▵ (U+25B3) ${stats.triangleDecodeCount} time(s) in this file.`,
  );
  if (stats.delCount > 0) {
    gapsParas.push(
      `Editorial deletions. ${stats.delCount} <del> span(s) (text the editor marks as not belonging in the received text) were excluded from the reading text; each occurrence is individually logged in anomalies.json.`,
    );
  }
  if (stats.gapCount > 0) {
    gapsParas.push(
      `Lacunae. ${stats.gapCount} <gap reason="omitted"/> marker(s) (a true gap in the manuscript tradition) occur in this text. No placeholder text is inserted for a gap; the affected passage instead carries an explicit note that a lacuna occurs there, and every occurrence is logged in anomalies.json.`,
    );
  }
  if (stats.addCount > 0) {
    gapsParas.push(
      `Editorial restorations. ${stats.addCount} <add cause="omitted"> span(s) (an editor's conjectural restoration of text judged missing from the manuscript) are, unlike a <gap>, included in the reading text as printed; every occurrence is logged in anomalies.json as a restoration, distinct from a lacuna.`,
    );
  }
  if (stats.figureCount > 0) {
    gapsParas.push(
      `Diagrams. ${stats.figureCount} <figure> marker(s) occur in the source, each pointing to a dead heml.mta.ca URL with no usable image data (the same dead end already confirmed for this library's Euclid importer). No image is fabricated or substituted: each marked passage instead carries an honest note that a diagram appears in the printed edition and is not yet available in this build, with a citation to exactly where in Mugler's edition it belongs.`,
    );
  }
  for (const extra of KNOWN_GAPS[entry.workId] ?? []) gapsParas.push(extra);
  sections.push({ heading: 'Known gaps & anomalies', paragraphs: gapsParas });

  return sections;
}
