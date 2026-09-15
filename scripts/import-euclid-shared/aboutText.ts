/**
 * Prose "About the text" body for Euclid's *Elements*. Kept here (not
 * hand-edited into data/) so re-running the importer reproduces the enriched
 * about.json. Rendered by src/screens/WorkAbout.tsx.
 */

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

export const PROVENANCE =
  'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository ' +
  '(CTS urn:cts:greekLit:tlg1799.tlg001, edition witness perseus-grc2), which digitises J. L. Heiberg’s text; ' +
  'imported by scripts/import-euclid.';

export const LICENSE =
  'Heiberg’s 1883–88 edition is in the public domain. The digital transcription is distributed by the ' +
  'Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 ' +
  'International licence (CC BY-SA 4.0).';

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: 'Euclid’s Elements',
    paragraphs: [
      'This is the Greek text of Euclid’s Στοιχεῖα ("Elements"), the foundational work of ' +
        'ancient geometry and number theory, in thirteen books: plane geometry (I–IV, VI), the ' +
        'theory of proportion (V), number theory (VII–IX), incommensurable magnitudes (X), and ' +
        'solid geometry (XI–XIII).',
      'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised ' +
        'or silently corrected. Where the source is irregular — an editorially deleted clause, an ' +
        'editorial insertion, a proposition mis-nested in the source markup — the irregularity is ' +
        'preserved and noted below.',
    ],
  },
  {
    heading: 'The edition',
    paragraphs: [
      'Johan Ludvig Heiberg, ed. (with Heinrich Menge for the later minor works), Euclidis Opera ' +
        'Omnia, 5 vols. (Leipzig: Teubner, 1883–88). This edition is in the public domain. Heiberg’s ' +
        'text is the standard critical edition of the Elements and the basis of nearly every modern ' +
        'translation, including T. L. Heath’s English version (Cambridge, 1908).',
      'Heiberg marks a number of passages — mostly later corollaries ("porisms") and interpolated ' +
        'lemmas, plus a handful of spurious common notions and definitions — as inauthentic, printing ' +
        'them under deletion marks (square brackets, in his own printed page) rather than removing them ' +
        'outright. This importer follows Heiberg’s critical judgement: text he marks deleted is excluded ' +
        'from the reading flow, never silently and always logged — except where a whole leaf division ' +
        'would otherwise be left blank, in which case Heiberg’s own bracketed wording is kept and ' +
        'flagged instead (see "Known gaps & anomalies" below).',
    ],
  },
  {
    heading: 'Digital source',
    paragraphs: [
      'The machine-readable text is the TEI XML file tlg1799.tlg001.perseus-grc2 from the Perseus ' +
        'Digital Library / OpenGreekAndLatin canonical-greekLit repository (which absorbed the ' +
        'relevant portion of the First1KGreek project’s holdings for this text). It was fetched once ' +
        'and is bundled with the app; nothing is loaded from the network at runtime.',
    ],
  },
  {
    heading: 'How it was imported',
    paragraphs: [
      'The source divides the work in exactly three levels: Book (I–XIII), then a section type ' +
        '(Definitions, Postulates, Common Notions, Propositions — not every book has every type; ' +
        'Books VIII, IX, XII and XIII have no definitions, and Book X alone repeats the ' +
        'definitions/propositions pair three times, with its second and third proposition-groups ' +
        'continuing the printed numbering from the first rather than restarting at 1), then a single ' +
        'definition, postulate, common notion or proposition. That numbered item is a single flat ' +
        'sequence of one or more paragraphs in the source — there is no enunciation/construction/proof ' +
        'sub-tagging in this markup — so each such item is one reader Division, and each of its ' +
        'paragraphs is one Passage, exactly as this app’s Isagoge/Aristotle importers treat a ' +
        'multi-paragraph section.',
      'Point-letter labels wrapped in <num> (e.g. an inline "ΑΒ") are unwrapped to plain text. Line-' +
        'numbering artefacts (<lb rend="displayNum">) are stripped. Editorially deleted text (<del>, ' +
        '507 occurrences) is excluded from the reading passage but logged individually to ' +
        'anomalies.json with its verbatim excerpt. A small number of editorial insertions (<add>, 4 ' +
        'occurrences) are kept in the reading text, also logged individually.',
    ],
  },
  {
    heading: 'Editorial titles',
    paragraphs: [
      '611 individual propositions is too many to hand-title without risking inaccurate or invented ' +
        'claims about highly technical mathematical content, so editorial titling here is deliberately ' +
        'shallow. Each of the 13 Books carries a curated English title (e.g. "Circles" for Book III, ' +
        '"Number Theory I: Divisibility and Greatest Common Measure" for Book VII). Each section-type ' +
        'group (Definitions, Postulates, Common Notions, Propositions, or Book X’s three repeating ' +
        'pairs) carries a plain English group label. Individual definitions, postulates, common ' +
        'notions and propositions are labelled by their printed number only, with no invented title. ' +
        'Every one of these English labels is editorial — never source text — and is marked "ed." ' +
        'wherever it is shown.',
    ],
  },
  {
    heading: 'Diagrams',
    paragraphs: [
      'The source TEI carries 498 bare <figure/> markers, one at (or immediately after) the point in ' +
        'each proof where the printed edition places a geometric diagram. Every one of these markers ' +
        'points to a graphic reference at heml.mta.ca, a defunct diagram host with no working images ' +
        'and no way to recover which file went with which proposition via the TEI itself.',
      'Book I’s 48 propositions (all of them) instead carry a real diagram image. Each was sourced by ' +
        'downloading the actual public-domain scan of Heiberg’s printed edition (Euclidis Opera Omnia ' +
        'vol. I, Internet Archive identifier euclidisoperaomn01eucluoft), rendering the exact page the ' +
        'diagram appears on at high resolution, and cropping tightly to just the diagram’s own lines — ' +
        'never redrawn, fabricated, or reconstructed from the text. Every one of the 48 crops was ' +
        'checked by hand against the source page before being committed. The ink is kept exactly as ' +
        'printed (no lines added, moved, or straightened); only its presentation is adapted to the ' +
        'app’s own design — the aged-paper background is dropped in favour of a transparent one, and ' +
        'the linework is tinted to the app’s accent colour, so each diagram sits on the page the same ' +
        'way in both light and dark mode. The image sits next to an exact citation (e.g. "Heiberg, ' +
        'Elements I.47") and alt text naming the proposition.',
      'The remaining 450 markers (Books II–XIII) are preserved as an honest note — "A diagram appears ' +
        'here in the printed edition; not yet available in this build." — attached to the passage in ' +
        'which they appear, together with the same exact-citation convention. All 498 markers (image ' +
        'or note) are logged individually in anomalies.json with their division id, so the information ' +
        'is preserved either way. A reader who wants to see Heiberg’s actual plates for the other books ' +
        'can consult the public-domain scan of Euclidis Opera Omnia on the Internet Archive ' +
        '(archive.org/details/euclidisoperaomn01eucluoft and the following volumes) — an external ' +
        'reference only, not bundled with this app.',
    ],
  },
  {
    heading: 'Reference scheme',
    paragraphs: [
      'Division scheme: Book (roman I–XIII) → section-type group (Definitions / Postulates / ' +
        'Common Notions / Propositions, editorial English labels) → individual item, numbered exactly ' +
        'as printed. Book X’s propositions continue their printed numbering across all three of its ' +
        'proposition-groups (1–47, then 48–84, then 85–115) rather than restarting; this is preserved, ' +
        'not renumbered.',
      'This TEI source carries no <pb> page markers and no other milestone tags, so every passage and ' +
        'division ref is null; cite by Book and printed number, e.g. "Heiberg, Elements I.47".',
    ],
  },
  {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      'Completeness. All 13 books and 611 numbered definitions/postulates/common-notions/propositions ' +
        'are present, matching an independently-researched structural count of this edition exactly. ' +
        'Nothing is merged, reordered, or renumbered.',
      'Mis-nested propositions, corrected. Four propositions — Book I.30, Book II.7, Book X’s first ' +
        'proposition-group.6, and Book XII.7 — were investigated after appearing to be missing from the ' +
        'traditional numbering, and were found to be genuinely present in the source, but mis-nested: the ' +
        'source TEI never opens a fresh numbered <div> for each of them, so their enunciation and proof text ' +
        'sits as extra paragraphs inside the still-open previous proposition’s division rather than under its ' +
        'own numbering. This was confirmed by direct inspection of the source XML, not inferred from a ' +
        'secondary source. This importer detects each case from its distinctive opening words and splits it ' +
        'out into its own division, so all four propositions appear in the reader with their real Greek text ' +
        'at their correct traditional number, rather than as a numbering gap.',
      'Bracketed interpolations, shown rather than left blank or orphaned. Ten leaf divisions carry ' +
        'Heiberg’s own bracketed wording as real (flagged) reading text, in two groups. Five consist, ' +
        'in their entirety, of a single paragraph Heiberg marks <del> — Book I’s fourth, fifth and sixth ' +
        'Common Notions, and Book VI’s second and fifth Definitions — his own judgement that the ' +
        'wording is a later interpolation, not Euclid’s, left blank they would show a reader nothing at ' +
        'all. Five more have one paragraph that is <del> apart from a trailing scrap of punctuation, ' +
        'typically a lone "." — Book II.4, Book V.19, Book VII Definition 9, and two propositions in ' +
        'Book X’s second and third proposition-groups (72 and 88) — a deleted corollary, porism, or ' +
        'spurious extra definition whose closing period happens to fall just outside the </del> tag; left ' +
        'alone, only that orphaned punctuation mark would survive, with nothing to explain it. Checked ' +
        'directly against Heiberg’s 1883 printed page — vol. I p. 10 for the Common Notions and p. 128 ' +
        'for Book II.4, letter-for-letter — this material is PRINTED there, in square brackets, not ' +
        'omitted; the closing bracket sits right before that same trailing period. The reading text here ' +
        'shows Heiberg’s own bracketed wording either way, each one flagged with a note explaining its ' +
        'status; the traditional numbering was never disturbed. (Heiberg brackets a ninth Common ' +
        'Notion the same way — "two straight lines do not enclose an area" — but the underlying ' +
        'digital transcription this importer reads does not mark it <del>, so it is not flagged here; ' +
        'noted for the record as a discrepancy between the transcription and the print, not acted on.) ' +
        'Elsewhere, 507 further <del> spans (corollaries, lemmas, and a further 18 bracketed asides ' +
        'inside leaves that already have other surviving text) remain excluded from the reading text — ' +
        'Heiberg brackets these too, but only a paragraph that would otherwise leave nothing real ' +
        'behind (an empty division, or an orphaned punctuation mark) gets its bracketed wording ' +
        'restored; every exclusion is logged individually in anomalies.json with its verbatim excerpt.',
      'Editorial insertions. Four <add> supplements (single words/letters Heiberg supplies where the ' +
        'manuscripts are defective) are kept in the reading text verbatim and logged individually.',
      'Corrected transcription errors (verified against print and internal consistency). 33 point-letters ' +
        '— a labelled point in a geometric figure, e.g. the "Θ" in "τὰ Η, Θ" — were found lowercase and ' +
        'unmarked in the source (e.g. bare "θ," instead of "<num>Θ</num>,"), always at the exact position ' +
        'immediately after a line-break marker, spread across Books I, III–X and XII. One (Book VIII, ' +
        'Proposition 1) was checked letter-for-letter against Heiberg’s 1883 printed page, which prints it ' +
        'capitalised; the printed page also confirmed each of the surrounding 33 was itself already correct, ' +
        'establishing the same slip as the cause throughout. Every one of the other 32 is independently ' +
        'confirmed by the same point-letter appearing correctly capitalised elsewhere in the immediately ' +
        'surrounding sentence — e.g. Book I.38’s "ἐπὶ τὰ Η, θ," is followed two lines later by "παράλληλος ' +
        'ἤχθω ἡ ΖΘ", which only parses if the point is Θ. All 33 are corrected to their capitalised, ' +
        'properly-marked form.',
      'Diagrams. See "Diagrams" above: Book I’s 48 propositions carry a real diagram image, sourced ' +
        'from Heiberg’s printed scan and hand-checked; the remaining 450 markers (Books II–XIII) are ' +
        'preserved as honest citation notes. Never a fabricated image, either way.',
      'Character encoding. The source is already NFC-normalised polytonic Greek; no normalisation pass ' +
        'was applied or needed. One exception is preserved verbatim rather than "fixed": Book XI, ' +
        'Proposition 31 — a solid-geometry proof with more labelled points than the 24-letter Greek ' +
        'alphabet provides — contains nine "#N" transcription-placeholder artefacts (e.g. "Τ#5", ' +
        '"#22α") and one stray standalone combining diacritic (U+0342 COMBINING GREEK PERISPOMENI, in ' +
        '"Σο͂"), apparently marking a special or primed-letter notation the digital transcription could ' +
        'not render. Both are kept exactly as transmitted.',
    ],
  },
];
