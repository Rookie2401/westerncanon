import { NOT_IMPORTED } from './workTable.ts';
import type { WorkAboutSection } from './genericTypes.ts';

export interface AboutStatsEn {
  passageCount: number;
  totalChars: number;
  footnoteTotal: number;
  pageMarkerTotal: number;
  continuationTotal: number;
  tableTotal: number;
}

export function buildAboutSectionsEn(s: AboutStatsEn): WorkAboutSection[] {
  return [
    {
      heading: "About this edition",
      paragraphs: [
        "This is J. M. Ashmand's 1822 English translation of the Tetrabiblos - the first complete English translation of the work, and long the standard one before Robbins's 1940 Loeb edition.",
        'The text here is English only, verbatim as Ashmand printed it. Nothing is modernised or silently corrected. Where the source is irregular or a genuine judgement call was made, it is preserved/recorded and flagged in "Known gaps & anomalies" below.',
      ],
    },
    {
      heading: 'The translation',
      paragraphs: [
        "Full title: Ptolemy's Tetrabiblos, or Quadripartite: being Four Books of the Influence of the Stars, translated by J. M. Ashmand (Davis and Dickson, London, 1822).",
        "Ashmand's own chapter division is a different (older, more finely subdivided) scheme from the Greek critical editions this app also carries (ptolemy-tetrabiblos-grc): Book I has 27 chapters here (vs. 24 in the Robbins/Loeb Greek), Book II 14, Book III 19, Book IV 10 - 70 total. This is NOT an error or a mismatch to reconcile: Ashmand's numbering is not renumbered to match the Greek, and no chapter-to-chapter correspondence between the two is asserted anywhere in this build.",
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        'The text was fetched from sacred-texts.com (https://sacred-texts.com/book/ptolemy-s-tetrabiblos/), one HTTP request per chapter (70 total, at a fixed polite interval), and is bundled with the app (scripts/import-ptolemy/raw/ashmand/<chapter-slug>.htm); nothing is loaded from the network at runtime. See fetchAshmand.ts/parseAshmand.ts for the exact page shape and parsing rules.',
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        'Each of the 70 chapter pages (one per chapter, fetched at a stable URL - see fetchAshmand.ts\'s module doc for why this URL shape was used instead of the site\'s older, chapter-boundary-agnostic paginated pages) was parsed into a Book heading (present only on that book\'s first chapter), a "CHAPTER <roman>" + title heading pair, and the chapter\'s own paragraphs.',
        `Ashmand's own footnotes (${s.footnoteTotal} of them) are EXCLUDED entirely from the reading text - translator/editorial apparatus, not Ptolemy's words - logged individually in anomalies.json (their content is not preserved anywhere else in this build). The scanned print edition's own original page-number markers (${s.pageMarkerTotal} of them, e.g. "p. 37") are stripped (pagination artefacts, not text); ${s.continuationTotal} of the paragraphs a page break interrupted mid-sentence were rejoined using sacred-texts.com's own explicit "[paragraph continues]" marker in the source HTML (proof that specific break was not a real paragraph boundary - see parseAshmand.ts). Ordinary HTML formatting (italics etc.) is flattened to plain text; the words themselves are otherwise untouched.`,
        `${s.tableTotal} astrological data tables (in 3 chapters: Book II ch.3's table of countries by sign, and Book I ch.23/24's two tables of planetary "terms") are genuine HTML <table> markup in this digitisation - kept verbatim, one printed row per line (cells space-joined, no punctuation added), as an ordinary paragraph in the chapter's own reading text. Never rendered as an image, never fabricated.`,
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        'This digitisation prints no line- or section-level citation below the chapter, so Passage.ref and Division.ref are null throughout. Citation here is by Book and Chapter number alone, in Ashmand\'s own numbering (see "The translation" above for how it differs from the Greek editions\' numbering).',
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `All 4 Books and 70 Chapters and ${s.passageCount} Passages (${s.totalChars} characters of English reading text) were imported; nothing was dropped except the documented footnote/pagination exclusions above.`,
        'sacred-texts.com also publishes, alongside these 70 chapters, a Title Page, Advertisement, Preface, a 4-item appendix (two short Almagest extracts, the pseudo-Ptolemaic "Centiloquy", and a "Zodiacal Planisphere"), and an Errata page. NONE of these are part of the Tetrabiblos itself (the appendix items are separate works or spurious attributions Ashmand chose to append) and none are imported here.',
        'See anomalies.json for the complete, individually-logged, machine-readable account of every exclusion and structural note in this work.',
        'Other Ptolemy works researched for this import batch but NOT included in this build (see scripts/import-ptolemy/workTable.ts for the full citation trail):',
        ...NOT_IMPORTED.map((w) => `${w.work}: ${w.reason}`),
      ],
    },
  ];
}
