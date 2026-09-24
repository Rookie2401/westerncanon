/**
 * Real printed geometric diagrams for the "rest of Aristotle" corpus
 * (scripts/import-aristotle-rest) - see aristotle.report.md in this
 * directory for the full research table (every candidate work, the
 * public-domain editions checked, and why all but one carry no printed
 * diagrams) and for the per-figure placement evidence.
 *
 * Scope. Of the ten candidate works surveyed (mechanica-grc; meteorologica-
 * grc/-en; de-caelo-grc/-en; physics-grc; de-incessu-animalium-grc/-en;
 * de-motu-animalium-grc/-en; de-lineis-insecabilibus-grc; de-anima-grc;
 * prior-analytics-grc/-en; posterior-analytics-grc/-en), only mechanica-grc
 * (pseudo-Aristotle, Mechanical Problems) was found to carry genuine printed
 * geometric diagrams in a public-domain edition whose lettering matches this
 * library's Greek text. Mechanica has no bundled English translation, so
 * there is no "-en" twin to map these onto.
 *
 * Source edition (all 5 images). Otto Apelt (ed.), "Aristotelis quae
 * feruntur De plantis, De mirabilibus auscultationibus, Mechanica, De lineis
 * insecabilibus, Ventorum situs et nomina, De Melisso Xenophane Gorgia"
 * (Leipzig: Teubner, 1888) - public domain; archive.org identifier
 * deplantisalia00apelgoog (Google-digitised Harvard copy, IIIF-enabled).
 * Apelt reprints Bekker's 1837 text with Bekker's page/column citations in
 * the margin - the same textual tradition as this library's First1K-Greek
 * transcription - and every diagram below was hand-checked against the
 * actual passage text: the point-letters the printed figure carries (Α, Β,
 * Γ, Δ, ...) are the letters the transcribed Greek names at that point.
 *
 * Image technique (as scripts/import-euclid and scripts/import-archimedes-
 * shared/convert.ts): the full page fetched via IIIF
 * (https://iiif.archive.org/iiif/deplantisalia00apelgoog$<leaf>/full/full/0/default.jpg),
 * a generous region around the diagram extracted, thresholded to pure black
 * ink on a transparent background and trimmed to the ink's bounding box -
 * never redrawn, fabricated, or reconstructed from the text. Every crop was
 * viewed and checked against the source page.
 *
 * Keys. `divisionId` is the (globally unique) leaf id in
 * data/mechanica-grc/work.json under the Preface/Problem -> Section scheme
 * (workTable.ts shape 'problem-section'): `preface-ch-M` for the treatise's
 * unnumbered preface, `problem-N-ch-M` for Problem N's section M. The
 * importer (scripts/import-aristotle-rest/index.ts) hard-fails if an id
 * matches anything but exactly one division, and check-aristotle.ts checks
 * the ids, passage indices, files and pixel sizes.
 */

export interface AristotleDiagram {
  /** Division.id in data/<workId>/work.json (globally unique). */
  divisionId: string;
  /** 0-based index into that division's `passages` array. */
  passageIndex: number;
  /** `images/<file>.png`, relative to data/<workId>/. */
  image: string;
  width: number;
  height: number;
  /** Exact citation: editor, title, place/year, printed page, archive.org id + leaf. */
  source: string;
  alt: string;
}

export const DIAGRAMS_ARISTOTLE: Record<string, AristotleDiagram[]> = {
  'mechanica-grc': [
    {
      // Preface, section 12 of 13: the "wheels within wheels" toy.
      divisionId: 'preface-ch-12',
      passageIndex: 0,
      image: 'images/preface-ch-12.png',
      width: 365,
      height: 112,
      source:
        'Otto Apelt (ed.), Aristotelis Mechanica, in Aristotelis quae feruntur De plantis... (Leipzig 1888), p. 97 (Bekker 848a31), archive.org deplantisalia00apelgoog leaf 144',
      alt: 'Three touching circles ΑΒ, ΓΔ, ΕΖ, illustrating the preface’s "wheels within wheels" toy (concentric/tangent rotating discs) - the diagram for the paragraph ending "...ποιήσαντες τροχίσκους χαλκοῦς τε καὶ σιδηροῦς" and continuing "εἰ γὰρ εἴη τοῦ ΑΒ κύκλου ἁπτόμενος ἕτερος κύκλος ἐφ’ οὗ ΓΔ...".',
    },
    {
      // Problem 1, section 7 of 20.
      divisionId: 'problem-1-ch-7',
      passageIndex: 0,
      image: 'images/problem-1-ch-7.png',
      width: 695,
      height: 736,
      source:
        'Otto Apelt (ed.), Aristotelis Mechanica, in Aristotelis quae feruntur De plantis... (Leipzig 1888), p. 100 (Bekker 849a1), archive.org deplantisalia00apelgoog leaf 147',
      alt: 'Circle ΑΒΓ with a point Β carried to Δ and Γ, and chord/secant ΒΕΓ marked - the diagram for Problem 1’s construction "ἔστω κύκλος ὁ ΑΒΓ, τὸ δ’ ἄκρον τὸ ἐφ’ οὗ Β φερέσθω ἐπὶ τὸ Δ· ἀφικνεῖται δέ ποτε ἐπὶ τὸ Γ."',
    },
    {
      // Problem 1, section 11 of 20.
      divisionId: 'problem-1-ch-11',
      passageIndex: 0,
      image: 'images/problem-1-ch-11.png',
      width: 323,
      height: 324,
      source:
        'Otto Apelt (ed.), Aristotelis Mechanica, in Aristotelis quae feruntur De plantis... (Leipzig 1888), p. 101 (Bekker 849a35), archive.org deplantisalia00apelgoog leaf 148',
      alt: 'Two concentric circles (outer ΨΒΡΔΓ, inner through Ξ,Ν) about centre Α, with radii/verticals to Τ, Κ, Χ, Ζ, Θ, Η, Ν, Μ, Ε marked - the diagram for Problem 1’s proof that the greater of two concentric circles traces more circumference in the same time, "ἔστω κύκλος ἐφ’ οὗ ΒΓΔΕ, καὶ ἄλλος ἐν τούτῳ ἐλάττων, ἐφ’ οὗ Χ Ν Μ Ξ, περὶ τὸ αὐτὸ κέντρον τὸ Α...".',
    },
    {
      // Problem 2, section 2 of 5.
      divisionId: 'problem-2-ch-2',
      passageIndex: 0,
      image: 'images/problem-2-ch-2.png',
      width: 1174,
      height: 1016,
      source:
        'Otto Apelt (ed.), Aristotelis Mechanica, in Aristotelis quae feruntur De plantis... (Leipzig 1888), p. 104 (Bekker 850a1), archive.org deplantisalia00apelgoog leaf 151',
      alt: 'A balance beam ΒΓ crossed by a vertical cord ΑΔ through centre point Μ, with the beam tilted along ΔΘ and angle Ω marked - the diagram for Problem 2’s construction "ἔστω ζυγὸν ὀρθὸν ἐφ’ οὗ ΒΓ, σπαρτίον δὲ τὸ ΑΔ. Ἐκβαλλόμενον δὴ τοῦτο κάτω κάθετος ἔσται ἐφ’ ἧς ἡ ΑΔΜ."',
    },
    {
      // Problem 2, section 4 of 5.
      divisionId: 'problem-2-ch-4',
      passageIndex: 0,
      image: 'images/problem-2-ch-4.png',
      width: 315,
      height: 281,
      source:
        'Otto Apelt (ed.), Aristotelis Mechanica, in Aristotelis quae feruntur De plantis... (Leipzig 1888), p. 105 (Bekker 850a26), archive.org deplantisalia00apelgoog leaf 152',
      alt: 'A second balance beam ΝΞ crossed by vertical ΚΛΜ through centre point Λ, with points Θ, Ρ, Ο marking the tilted positions - the diagram for Problem 2’s second construction "ἔστω ζυγὸν τὸ ἐφ’ οὗ ΝΞ, τὸ ὀρθόν, κάθετος δὲ ἡ Κ Λ Μ. Δίχα δὴ διαιρεῖται τὸ ΝΞ."',
    },
  ],
};
