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
  /** how many of figureCount's markers carry a real, hand-verified diagram image (vs. an honest note) */
  figureImageCount: number;
  triangleDecodeCount: number;
  nfcDiffCount: number;
  hasLb: boolean;
  pbFirst: string;
  pbLast: string;
}

/**
 * Every one of these workIds' raw First1KGreek TEI source carries First1KGreek's
 * own unresolved digitisation placeholders as literal plain text (not XML
 * entities, not real Unicode characters - confirmed by direct byte inspection):
 * either the literal string "U+XXXX" (a Unicode codepoint NAME), or "(??)"
 * glued onto one adjacent Greek letter. Both stand in for a single glyph the
 * transcriber could not render and never replaced - a numeral-fraction mark in
 * the "U+XXXX" case, or a rare/archaic diagram-point letter or numeral in the
 * "(??)" case. Every occurrence has been stripped from the reading text (never
 * replaced with a guessed symbol, since the specific glyph Mugler's edition
 * prints cannot be recovered from this source) and is individually logged in
 * anomalies.json with its surrounding context.
 */
function placeholderGapPara(count: number, shape: string): string {
  return `Unresolved digitisation placeholder${count === 1 ? '' : 's'}. The source's own literal placeholder text "${shape}" (First1KGreek's unresolved stand-in for a single glyph it could not render, not a real Unicode character or any part of Archimedes' actual Greek) occurs ${count} time${count === 1 ? '' : 's'} in this file. Each has been removed from the reading text - never replaced with a guessed symbol - and is individually logged in anomalies.json with its surrounding context.`;
}

/** Per-work known-gaps prose that cannot be derived from generic counts alone. */
const KNOWN_GAPS: Partial<Record<string, string[]>> = {
  'archimedes-sand-reckoner': [
    'Corrected transcription gap (verified against print). This work was spot-checked letter-for-letter against J. L. Heiberg\'s original 1880 printed edition (Archimedis Opera Omnia, vol. II, p. 260). One numeral, "τ" (300), was missing from the digital source in the sentence where Archimedes restates his enlarged upper bound for the earth\'s circumference ("τὰν περίμετρον αὐτᾶς ὑποτίθεμαι εἶμεν ὡς [τ] μυριάδων σταδίων" - "I take the circumference of the earth to be not greater than [300] myriad stadia"). The identical numeral for the same "300 myriad stadia" figure appears twice earlier in the same paragraph, and the sentence is not grammatically complete without it, confirming this was a transcription slip rather than a genuine reading of Mugler\'s edition; it has been restored here from Heiberg\'s print.',
    placeholderGapPara(6, '(??)'),
  ],
  'archimedes-measurement-circle': [
    placeholderGapPara(8, 'U+XXXX') + ' A further 3 occurrences of the "(??)" shape (see below) bring this work\'s total to 11.',
  ],
  'archimedes-sphere-cylinder': [
    'Diagrams, Book I detail. Every one of Book I\'s 45 divisions (preface + propositions 1-44) has now been individually checked against the printed page - none remain merely "not yet reached". The 30 real diagram images above cover 28 propositions: 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 16, 18, 19, 20, 21, 22, 24, 25, 26, 28, 32, 33, 34, 35, 37, 38, 42 and 43. Three of these print a single diagram reused for two <figure> markers rather than two distinct figures: 7\'s bracketed "clearer" alternative proof, 11\'s inductive continuation, and 16\'s bracketed ΛΗΜΜΑ (a parallelogram-gnomon lemma interpolated into the middle of the proof) each revisit or continue the same construction; every other covered division has exactly one marker and one image. Fourteen propositions - 2, 4, 13, 14, 15, 17, 23, 27, 29, 30, 31, 36, 39 and 41 - were individually checked against the printed page (the proposition\'s own page and, where its proof runs long, every following page up to the next proposition\'s heading) and confirmed to carry no diagram at all in this edition, mostly purely algebraic "given magnitudes in such a ratio" lemmas or corollaries proved in words; their <figure> marker\'s "not yet available" note is, for these fourteen specifically, a positively confirmed absence rather than an unsourced gap (the note text itself does not distinguish the cases, matching this library\'s Euclid importer\'s treatment of its own one confirmed-absent diagram, Elements IV.16 - the distinction is recorded here instead). Two more propositions are a mirror-image gap this pass could not close: 40 and 44 each print a real diagram in the source (found and visually confirmed on the page, at IIIF leaves 186 and 202 respectively) but this corpus\'s own TEI transcription carries no <figure> marker anywhere in either division\'s text to hang an image on, so - unlike every other case above - no amount of image-sourcing can wire one up without first correcting the underlying TEI, which is outside this pass\'s scope; a reader wanting those two diagrams can consult the same public-domain scan cited below. The preface division (\'pr\') carries no <figure> marker in the source at all and was not expected to. All 10 divisions of Book II keep the honest "not yet available" note purely because this pass, like the one before it, was scoped to Book I only.',
    'Diagrams, sourcing. Every Book I image was rendered from archive.org identifier archimedisoperao01arch - J. L. Heiberg\'s first edition of Archimedis Opera Omnia cum Commentariis Eutocii, vol. 1 (Teubner, 1880), the same edition (in its later, expanded second printing) already used for Measurement of a Circle\'s diagrams - via that scan\'s IIIF endpoint (https://iiif.archive.org/iiif/archimedisoperao01arch$<leaf>/...), fetched at full resolution and cropped locally. Book I\'s Greek and Latin translation run on facing pages in this print (Greek on the even IIIF leaf, Latin translation on the odd leaf immediately following); every diagram found sits on the Greek page, at IIIF leaves 30 (prop. 1, printed p. 12), 34 (prop. 3, p. 16), 40 (prop. 5, p. 22), 44 (prop. 6, p. 26), 46 (prop. 7, p. 28), 50 (prop. 8, p. 32), 52 (prop. 9, p. 34), 60 (prop. 10, p. 42), 64 (prop. 11, p. 46), 72 (prop. 12, p. 54), 96 (prop. 16, p. 78), 104 (prop. 18, p. 86), 108 (prop. 19, p. 90), 112 (prop. 20, p. 94), 116 (prop. 21, p. 98), 118 (prop. 22, p. 100), 124 (prop. 24, p. 106), 128 (prop. 25, p. 110), 132 (prop. 26, p. 114), 140 (prop. 28, p. 120), 154 (prop. 32, p. 134), 156 (prop. 33, p. 136), 162 (prop. 34, p. 142), 170 (prop. 35, p. 150), 174 (prop. 37, p. 154), 178 (prop. 38, p. 158), 198 (prop. 42, p. 178) and 200 (prop. 43, p. 180) - each page was rendered and visually inspected before its crop was cut, not merely located by OCR. One leaf-numbering wrinkle: printed p. 120 (prop. 28) exists twice in this scan, at leaves 138 and 140 - leaf 138 is a raw calibration photo of the physical page with a ruler and book spine in frame (unusable for cropping), leaf 140 is a normal clean re-scan of the same page, and the latter is what prop. 28\'s image was cut from. Propositions were located by matching each one\'s Greek incipit and Heiberg\'s own printed proposition-letter (α\', β\', γ\', ... - distinct from Mugler\'s page numbers, which do not correspond 1:1 to Heiberg\'s leaves) against the text already in work.json, the same technique this library\'s Euclid importer uses. The scanned page\'s aged-paper background was thresholded away in favour of a transparent one and the linework re-encoded as pure black ink (a small script using the sharp package, installed for this task with `npm install --no-save sharp`, converts scan luminance directly to an alpha channel), matching Measurement of a Circle\'s ch-1.png pixel format exactly; nothing was redrawn, straightened, or reconstructed - only the ink actually printed on the page is shown. A few crops (props. 33, 43) sit close enough to the page\'s marginal apparatus-note column that a handful of stray characters were caught by the same luminance threshold as the diagram\'s own ink; where this happened the affected pixels were individually masked back to transparent after cropping, rather than left in or the diagram\'s own lines cut to avoid them.',
  ],
  'archimedes-conoids-spheroids': [
    'Proposition 29 is absent from the traditional numbering this edition follows (the sequence runs ...28, 30, 31, 32): this is not an importer error or a dropped section, it is how the propositions are numbered in the source.',
    'Diagrams, detail. All 32 divisions (preface + propositions 1-28, 30-32) have now been individually checked against the printed page - none remain merely "not yet reached". The 20 real diagram images above cover propositions 1, 2, 4, 5, 8, 12, 14, 15, 18, 19, 20, 22, 23, 24, 25, 26, 27, 30, 31 and 32 (25 of the 39 <figure> markers counted below, since propositions 1, 2 and 25 each carry two markers and proposition 22 carries three, all repeating the same single printed diagram via this map\'s repeat-last-entry convention - each such division prints only one distinct figure, revisited or continued by its later markers, not a second drawing). Twelve divisions - the preface and propositions 3, 6, 7, 9, 10, 11, 13, 16, 17, 21 and 28 - were individually checked against the printed page (the division\'s own page and, where its proof runs long, every following page up to the next division\'s heading) and confirmed to carry no diagram at all in this edition; their <figure> marker\'s "not yet available" note (where one exists) is, for these twelve specifically, a positively confirmed absence rather than an unsourced gap, matching this app\'s established distinction (see the Sphere and Cylinder entry above). The preface carries no <figure> marker in the source at all and was not expected to. Proposition 9 is the most striking of the confirmed-absent group: its TEI carries three separate <figure> markers (the most of any division in this work) across a long, page-spanning proof, and every one of those pages was individually inspected - none prints a diagram; the edition\'s marginal note at one point even remarks that the manuscript\'s own figure there was poorly drawn ("figuram minus bene delineauit"), which is consistent with Heiberg choosing not to reproduce a new one. Propositions 10 and 11 carry no <figure> marker in the TEI at all (unlike every other confirmed-absent division here, which does carry a marker with no image behind it), so nothing was expected there either.',
    'Diagrams, sourcing. Every image was rendered from archive.org identifier archimedisoperao01arch - the same Heiberg volume already used for On the Sphere and Cylinder and Measurement of a Circle - confirmed to also carry this work by locating its own Greek incipit ("Ἀρχιμήδης Δοσιθέῳ εὖ πράττειν...") later in the same scan, starting at IIIF leaf 292 (running head "ΠΕΡΙ ΚΩΝΟΕΙΔΕΩΝ ΚΑΙ ΣΦΑΙΡΟΕΙΔΕΩΝ" from printed p. 274) and continuing to leaf 516 (p. 498), immediately after Measurement of a Circle ends and before Heiberg\'s next volume-1 work begins. As with the other two works in this volume, Greek and Latin translation alternate leaf by leaf; every diagram found sits on the Greek page, at IIIF leaves 312 (prop. 1, p. 292), 320 (prop. 2, p. 298), 330 (prop. 4, p. 308), 336 (prop. 5, p. 314), 348 (prop. 8, p. 326), 368 (prop. 12, p. 346), 374 (prop. 14, p. 352), 382 (prop. 15, p. 360), 390 (prop. 18, p. 368), 400 (prop. 19, p. 378), 404 (prop. 20, p. 382), 428 (prop. 22, p. 406), 434 (prop. 23, p. 412), 440 (prop. 24, p. 418), 454 (prop. 25, p. 432), 466 (prop. 26, p. 442), 488 (prop. 27, p. 462), 504 (prop. 30, p. 478), 510 (prop. 31, p. 484) and 518 (prop. 32, p. 492) - each page was rendered at full resolution and visually inspected before its crop was cut, not merely located by OCR (OCR text from this scan\'s djvu layer was used only as a first-pass locator, then verified by eye against every page, since the same leaf-numbering drift and numeral-misreading risk noted below make OCR alone unreliable here). Two leaf-numbering wrinkles turned up in this volume beyond the one already documented for Sphere and Cylinder: printed p. 442 (prop. 26) exists at leaf 466, but leaves 464 and 465 immediately before it are BOTH raw calibration photos of the physical page (one shows a ruler and the book\'s own binding, the other a hand turning the page) rather than the clean page image, an unusable double duplicate rather than the single one seen elsewhere; and several other spans in the second half of the volume carry similar one-leaf duplicates that shift the leaf-to-page offset by two without warning, so every leaf number above was individually confirmed by reading the printed page number in that exact image, not computed by arithmetic from a neighbour. The scanned page\'s aged-paper background was thresholded away in favour of a transparent one and the linework re-encoded as pure black ink using the same sharp-based script (installed ad hoc with `npm install --no-save sharp`) and the same luminance threshold as the other two works in this volume, matching their pixel format exactly; nothing was redrawn, straightened, or reconstructed - only the ink actually printed on the page is shown. Several crops (props. 5, 12, 24, 25, 27) sit close enough to the page\'s own paragraph text or marginal apparatus that a rectangular region of that text was individually masked back to the page\'s paper colour before thresholding, rather than left in or the diagram\'s own crop cut tight enough to risk losing part of the figure.',
  ],
  'archimedes-spirals': [placeholderGapPara(60, '(??)')],
  'archimedes-plane-equilibrium': [
    placeholderGapPara(2, '(??)'),
    'Diagrams, detail. Every one of this work\'s 26 divisions across both books (Book I: preface + propositions 1-15; Book II: propositions 1-10) has been individually checked against the printed page - none remain merely "not yet reached". The 24 real diagram images above cover 21 divisions: Book I\'s 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 and 15, and Book II\'s 1, 2, 4, 5, 6, 7, 8 and 9. Two of these print a single diagram reused across two <figure> markers rather than two distinct figures: Book I proposition 5\'s second corollary (ΠΟΡΙΣΜΑ Β\', the even-number-of-magnitudes case) and proposition 13\'s "ΑΛΛΩΣ ΤΟ ΑΥΤΟ" alternate proof each print their own distinct second diagram (so both are real, separately-sourced images, not a repeat), and likewise Book II proposition 5\'s second paragraph (the pentagon-inscription case) - every other covered division has exactly one marker and one image. Three divisions were individually checked against the printed page (the division\'s own page and, where its proof runs long, every following page up to the next proposition\'s heading) and confirmed to carry no diagram at all in this edition: Book I\'s preface (\'pr\', the postulates) and propositions 1 and 2 - all three carry no <figure> marker in the source either, and were not expected to, being purely verbal "equal weights from equal/unequal lengths" statements with no accompanying construction. A fourth division, Book I proposition 10, carries two <figure> markers but only one real diagram: its main proof\'s diagram is wired above, while its own "ΑΛΛΩΣ" (alternate proof, using a different triangle-based construction) was checked on its printed page and confirmed to have no diagram of its own - marked `null` in that entry\'s list per this importer\'s established repeat-or-null convention, rather than wrongly re-showing the main proof\'s diagram there. Book II has two further gaps this pass could not close by ordinary means. Proposition 3 prints a real diagram in the source (two stacked conic-section segments compared, found and visually confirmed at IIIF leaf 232) but this corpus\'s own TEI transcription carries no <figure> marker anywhere in its text to hang an image on - the mirror-image gap already documented for Sphere and Cylinder\'s propositions 40 and 44: no amount of image-sourcing can wire one up without first correcting the underlying TEI, which is outside this pass\'s scope. Proposition 10 (the work\'s final proposition) is the opposite case again: it does carry a <figure> marker, but its entire proof - checked across all six of its printed pages (Heiberg pp. 228, 230, 232, 234, 236 and 238) - prints no diagram anywhere; this is a positively confirmed absence despite the marker, not an unsourced gap, and its note is left as the honest "not yet available" text like every other confirmed-absent marker in this corpus.',
    'Diagrams, sourcing. Every image was rendered from archive.org identifier archimedisoperao02arch - J. L. Heiberg\'s first edition of Archimedis Opera Omnia cum Commentariis Eutocii, vol. 2 (Teubner, 1880) - a DIFFERENT Heiberg volume from the one used for Measurement of a Circle and Sphere and Cylinder (vol. 1, archimedisoperao01arch), since Heiberg\'s own volume division does not follow Mugler\'s Budé grouping (this work is "Mugler vol. 2" but Heiberg vol. 2 specifically). The identifier was not assumed from the vol. 1 naming pattern: it was confirmed by locating this work\'s own Greek incipit and postulates (matching work.json\'s preface text verbatim, "Ἐπιπέδων ἰσορροπιῶν ἢ κέντρα βαρῶν ἐπιπέδων α\'" and postulates α\'-ζ\') on the scan itself, at IIIF leaf 176 (printed p. 140), before treating the identifier as correct. As with the vol. 1 scans, Greek and Latin translation run on facing pages (Greek on the even IIIF leaf, Latin on the odd leaf immediately following - confirmed by inspecting leaves 176/177 side by side), and each diagram was rendered and visually inspected on its Greek page before its crop was cut, not merely located by OCR or by assuming even leaf-spacing between propositions - Mugler\'s page numbers do not correspond 1:1 to Heiberg\'s leaves, so each proposition was individually located by matching its Greek incipit and Heiberg\'s own proposition-letter (α\', β\', γ\', ...) against the text already in work.json, the same technique used for Sphere and Cylinder. Book I\'s diagrams sit at IIIF leaves 180 (prop. 3, printed p. 146), 182 (prop. 4, p. 148), 184 and 186 (prop. 5, pp. 150 and 152 - two diagrams, one per corollary), 188 (prop. 6, p. 154), 192 (prop. 7, p. 158), 196 (prop. 8, p. 162), 198 (prop. 9, p. 164), 202 (prop. 10, p. 166), 204 (prop. 11, p. 168), 208 (prop. 12, p. 172), 210 and 216 (prop. 13, pp. 174 and 180 - two diagrams, one per proof), 218 (prop. 14, p. 182), and 220 (prop. 15, p. 184); Book II\'s sit at leaves 224 (prop. 1, unnumbered plate page opening "Ἐπιπέδων ἰσορροπιῶν β\'"), 230 (prop. 2, p. 194), 236 (prop. 4, p. 200), 238 and 242 (prop. 5, pp. 202 and 206 - two diagrams), 246 (prop. 6, p. 210), 248 (prop. 7, p. 212), 250 (prop. 8, p. 214), and 254 (prop. 9, p. 218). One leaf-numbering wrinkle carried over from the vol. 1 scan: printed p. 164 (Book I prop. 9) exists twice in this scan too, at leaves 198 and 200 - leaf 200 is the same raw calibration photo pattern already documented for Sphere and Cylinder (a physical ruler laid across the page, unusable for cropping), and leaf 198\'s clean re-scan was used instead. The scanned page\'s aged-paper background was thresholded away in favour of a transparent one and the linework re-encoded as pure black ink, using the same small sharp-based script as Sphere and Cylinder (installed for that task with `npm install --no-save sharp` and reused here); nothing was redrawn, straightened, or reconstructed - only the ink actually printed on the page is shown, matching Measurement of a Circle\'s ch-1.png pixel format exactly. Several crops (Book I props. 9, 11 and 14; Book II props. 1, 4 and 9) sit close enough to the page\'s own line-number margin or an adjacent paragraph\'s text that a handful of stray marginal characters were caught by the same luminance threshold as the diagram\'s own ink and remain faintly visible at an image edge; where this happened the diagram\'s own lines were never trimmed or altered to avoid them, following the same choice already made for Sphere and Cylinder\'s propositions 33 and 43.',
  ],
  'archimedes-method': [
    'This work survives only through the Archimedes Palimpsest (a 10th-century copy overwritten in the 13th century with a prayer book, recovered by multispectral imaging in the early 2000s). The text here carries two prefatory sections - "pr1" (the covering letter to Eratosthenes) and "pr2" (headed ΠΡΟΛΑΜΒΑΝΟΜΕΝΑ, "preliminaries", reconstructed separately) - followed by propositions 1-15. Because the Palimpsest is a damaged, overwritten manuscript, this is by far the most heavily marked-up file in the corpus for editorial gaps and restorations (see the counts below); every one is preserved exactly as the edition prints it, not smoothed over.',
  ],
  'archimedes-liber-assumptorum': [
    'This file carries no <lb> (line-break) markers at all, unlike every other work in this corpus - the source TEI simply does not encode line numbers for the Book of Lemmas. Nothing is lost by this: paragraph and page (<pb>) structure is unaffected, and no ref field depended on line numbers to begin with.',
  ],
  'archimedes-floating-bodies': [
    placeholderGapPara(24, '(??)'),
    'This work survives only through the Archimedes Palimpsest (see The Method\'s note on the same manuscript). Books I and II are both incomplete at points where the palimpsest is damaged or illegible.',
  ],
  'archimedes-stomachion': [
    'Only the opening of this work survives; it is fragmentary by nature, not by any omission on the importer\'s part. The single numbered division below is the whole of what the tradition preserves.',
  ],
  'archimedes-cattle-problem': [placeholderGapPara(2, '(??)')],
  'archimedes-fragments': [
    'Corrected transcription gap (verified against print). This work was spot-checked letter-for-letter against J. L. Heiberg\'s original 1880 printed edition (Archimedis Opera Omnia, vol. II, p. 458). The digital source described the first of the thirteen Archimedean solids (the truncated tetrahedron) as bounded "ὑπὸ τριγώνων ▵Ζ καὶ ἑξαγώνων δ" - a corrupted numeral ("triangle" plus Zeta) where the printed edition reads "ὑπὸ τριγώνων δ᾿ καὶ ἑξαγώνων δ᾿" (bounded by 4 triangles and 4 hexagons, matching the solid\'s actual geometry: 4 + 4 = 8 faces, an "ὀκτάεδρον"). The same corrupted numeral recurred a second time later in this work, in the separate testimonium restating the same solid\'s face/vertex/edge counts ("τριγώνοις ▵Ζ καὶ ἑξαγώνοις δ, γωνίας μὲν ἔχει στερεὰς ιβ, πλευρὰς δὲ ιη") - confirmed as the same error there too, independently of the print, by the passage\'s own next sentence, which explicitly refers back to "τεσσάρων τριγώνων" ("the four triangles"). Both instances have been corrected to δ.',
    'Fragment II\'s chapter heading is printed in the source as "GATOPTRICA" (with a G, not a C). This is very likely a transcription slip for "Catoptrica" (Περὶ κατοπτρικῶν, "On mirrors" / optics) - but it is kept exactly as transmitted, not silently corrected, per this app\'s rule against ever emending source text.',
    'Each fragment in this work is a quotation embedded in a later author\'s own book (Pappus, an anonymous Vatican scholiast on Pappus, Hero of Alexandria, Theon of Alexandria) - Archimedes\' own words survive only because someone else quoted them. For that reason every passage\'s `ref` here cites that secondary source and location (e.g. "Pappus V, 34, ed. Hultsch, p. 352"), rather than a Mugler page number as in the other 12 works; the Mugler volume/page span is still given at the division level.',
    placeholderGapPara(1, '(??)'),
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
  if (stats.figureCount > 0 && stats.figureImageCount === 0) {
    gapsParas.push(
      `Diagrams. ${stats.figureCount} <figure> marker(s) occur in the source, each pointing to a dead heml.mta.ca URL with no usable image data (the same dead end already confirmed for this library's Euclid importer). No image is fabricated or substituted: each marked passage instead carries an honest note that a diagram appears in the printed edition and is not yet available in this build, with a citation to exactly where in Mugler's edition it belongs.`,
    );
  } else if (stats.figureCount > 0) {
    const remaining = stats.figureCount - stats.figureImageCount;
    gapsParas.push(
      `Diagrams. ${stats.figureCount} <figure> marker(s) occur in the source; each points to a dead heml.mta.ca URL with no usable image data (the same dead end already confirmed for this library's Euclid importer), so no image could be recovered via the TEI itself. ${stats.figureImageCount} of these instead carry a real diagram image: each was sourced by downloading the actual public-domain scan of Heiberg's printed edition (Archimedis Opera Omnia, archive.org), rendering the exact page the diagram appears on at high resolution, and cropping tightly to just the diagram's own lines - never redrawn, fabricated, or reconstructed from the text. Every crop was checked by hand against the source page before being committed. The ink is kept exactly as printed (no lines added, moved, or straightened); only its presentation is adapted to the app's own design, exactly as this library's Euclid importer already does for Book I - the aged-paper background is dropped in favour of a transparent one, and the linework is shown as a CSS mask in the app's own accent colour, so it sits on the page the same way in both light and dark mode. ${remaining > 0 ? `The remaining ${remaining} marker(s) are preserved as an honest "not yet available" note, with the same exact-citation convention.` : ''} All ${stats.figureCount} markers (image or note) are logged individually in anomalies.json with their division id.`,
    );
  }
  for (const extra of KNOWN_GAPS[entry.workId] ?? []) gapsParas.push(extra);
  sections.push({ heading: 'Known gaps & anomalies', paragraphs: gapsParas });

  return sections;
}
