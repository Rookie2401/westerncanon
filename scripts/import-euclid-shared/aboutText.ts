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
        'them under deletion marks rather than removing them outright. This importer follows Heiberg’s ' +
        'critical judgement: text he marks deleted is excluded from the reading flow (see "Known gaps ' +
        '& anomalies" below), never silently and always logged.',
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
        'and no way to recover which file went with which proposition. Rather than fabricate, hand-' +
        'draw or programmatically reconstruct a diagram, this build ships without images: each marker ' +
        'is preserved as an honest note — "A diagram appears here in the printed edition; not yet ' +
        'available in this build." — attached to the passage in which it appears, together with an ' +
        'exact citation (e.g. "Heiberg, Elements I.47"). All 498 markers are logged individually in ' +
        'anomalies.json with their division id, so the information is preserved even though no image ' +
        'is shown. A reader who wants to see Heiberg’s actual plates can consult the public-domain ' +
        'scan of Euclidis Opera Omnia on the Internet Archive (archive.org/details/euclidisoperaomn01eucluoft ' +
        'and the following volumes) — an external reference only, not bundled with this app.',
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
      'Passages excluded under Heiberg’s deletion marks. Five leaf divisions — Book I’s fourth, fifth ' +
        'and sixth Common Notions, and Book VI’s second and fifth Definitions — consist, in their ' +
        'entirety, of a single paragraph Heiberg marks <del> as a later interpolation; after exclusion ' +
        'they carry zero surviving passages. These five divisions are kept (so the traditional ' +
        'numbering is not disturbed) but display no reading text. Elsewhere, 507 <del> spans (mostly ' +
        'corollaries and lemmas Heiberg judged spurious) are excluded from running passages that ' +
        'otherwise have surviving text; every exclusion is logged individually in anomalies.json with ' +
        'its verbatim excerpt.',
      'Editorial insertions. Four <add> supplements (single words/letters Heiberg supplies where the ' +
        'manuscripts are defective) are kept in the reading text verbatim and logged individually.',
      'Diagrams. See "Diagrams" above: 498 <figure/> markers are preserved as honest citation notes, ' +
        'never as fabricated images.',
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
