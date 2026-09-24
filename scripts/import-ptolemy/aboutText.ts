import type { GrcWorkEntry } from './workTable.ts';
import { NOT_IMPORTED } from './workTable.ts';
import type { WorkAboutSection } from './genericTypes.ts';

export interface AboutStats {
  bookCount: number;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  delCount: number;
  addCount: number;
  gapCount: number;
  /** [bookNumber, gapCount] pairs, ascending - see index.ts's `gapsByBook` */
  gapsByBook: [string, number][];
  footnoteCount: number;
  marginalCount: number;
  figureDiagramCount: number;
  figureTableCount: number;
  tableRowsTotal: number;
}

export function buildAboutSections(entry: GrcWorkEntry, s: AboutStats): WorkAboutSection[] {
  const sections: WorkAboutSection[] = [
    {
      heading: `Ptolemy's ${entry.titleConventional}`,
      paragraphs: [
        `This is the Greek text of ${entry.titleGreek} (conventionally "${entry.titleConventional}").`,
        'The text here is Greek only, verbatim. Nothing is translated, modernised, normalised or silently corrected beyond the documented resolution of the source\'s own apparatus markup (see "How it was imported" below). Where the source is irregular or a genuine judgement call was made, it is preserved/recorded and flagged in "Known gaps & anomalies" below.',
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [`Per this XML file's own <sourceDesc>: ${entry.edition}.`, 'No further bibliographic complication was found for this file beyond what is stated above.'],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is the TEI XML file ${entry.file} (CTS ${entry.ctsUrn}) from the ${entry.source === 'first1k-almagest' ? 'OpenGreekAndLatin / First1KGreek project' : 'Perseus Digital Library / Open Greek and Latin canonical-greekLit repository'}. It was fetched once and is bundled with the app (scripts/import-ptolemy/raw/${entry.file}); nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        `The importer's TEI walker (scripts/import-ptolemy/teiWalker.ts) parses this source's own <div type="textpart" subtype="book"/"${entry.chapterSubtype}"> nesting directly onto this app's Division scheme: Book -> Chapter (id \`book-N\`/\`book-N-ch-M\`, M as the source's own "${entry.chapterSubtype}" numbering/labelling - not always a plain integer, see "Reference scheme" below). Each Chapter carries exactly one Passage; Passage.text holds ONLY source text - that chapter's own <p> paragraphs (joined by a blank line), plus, for the handful of chapters whose <figure> carries a real numeric table (see "Diagrams and tables" below), that table's own row-serialised text. A <figure> with no transcribed content of its own never contributes anything to Passage.text - it is disclosed solely via Passage.figure.`,
        '<del>...</del> (text an editor judged spurious/interpolated, but which the edition still PRINTS, bracketed - the OCT convention) is KEPT verbatim in the reading text, wrapped in square brackets `[...]` (or left unbracketed-but-verbatim on the rare occasion its own printed text already contains a literal bracket); <add>...</add> (an editorial insertion, printed by the edition) is KEPT inline; <note type="footnote"> (critical-apparatus textual variants) and <note type="marginal"> (marginal running-heads) are EXCLUDED entirely (tag and content); <gap reason="omitted"/> (a real lacuna - see "Material incompleteness" below) contributes no text; <num>...</num> occurring in ordinary running prose is unwrapped (tag stripped, numeral text kept inline). Every occurrence of all of these is logged in anomalies.json. Entities are decoded and text is NFC-normalised and whitespace-collapsed; the words themselves are otherwise untouched.',
        delOrAddNote(s),
      ],
    },
    {
      heading: 'Diagrams and tables',
      paragraphs: buildFigureParagraphs(entry, s),
    },
    ...(s.gapCount > 0 ? [{ heading: 'Material incompleteness (star-catalogue numeric data)', paragraphs: buildGapParagraphs(s) }] : []),
    {
      heading: 'Reference scheme',
      paragraphs: [
        `This source carries no inline citation scheme this importer builds a Division.ref from (${entry.source === 'perseus-tetrabiblos-grc' ? 'this witness carries zero-width <milestone unit="Camerarius_2ed_page"/> position markers for an alternate 16th-century print edition\'s pagination, which contribute no text and are not used to build a citation - ' : ''}Division.ref and Passage.ref are null throughout). Citation here is by Book and ${entry.chapterSubtype === 'section' ? 'Section' : 'Chapter'} number alone, exactly as this edition itself numbers/labels them.`,
        ...(entry.workId === 'ptolemy-almagest-grc'
          ? [
              'Every Book opens with its own `n="toc"` division: Heiberg\'s edition itself prints a chapter-title list at the head of each book (genuine printed content, not a generated index) - imported as that book\'s own `book-N-ch-toc` chapter, with Division.number `"toc"`. This division carries no <head> of its own in the source; its Division.sourceHeading is instead copied from its own first paragraph (e.g. "Τάδε ἔνεστιν ἐν τῷ πρώτῳ τῆς Πτολεμαίου μαθηματικῆς συντάξεως." - "Here is contained in the first [book] of Ptolemy\'s mathematical syntaxis"), which reads as the section\'s heading in the printed edition - copied for sensible labelling only, NOT removed from Passage.text, where it remains verbatim as that chapter\'s own opening paragraph.',
            ]
          : []),
        ...(entry.workId === 'ptolemy-tetrabiblos-grc'
          ? ['Book 4\'s final chapter is printed TWICE, as two alternative endings drawn from different manuscripts: `book-4-ch-10a` ("Conclusion according to Parisinus 2425") and `book-4-ch-10b` ("Conclusion according to MADProc.Cam."). Both are kept, verbatim, as their own chapters - neither is preferred over the other.']
          : []),
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `All ${s.bookCount} Book(s) and ${s.chapterCount} ${entry.chapterSubtype === 'section' ? 'Section(s)' : 'Chapter(s)'} and ${s.passageCount} Passage(s) (${s.totalChars} characters of Greek reading text) present in this source were imported; nothing was dropped except the documented apparatus exclusions above, and no paragraph was reordered or merged beyond the documented Book/Chapter folding.`,
        `Apparatus counts: ${s.delCount} <del> span(s) kept bracketed, ${s.addCount} <add> insertion(s) kept inline, ${s.gapCount} <gap> lacuna(e) excluded (see "Material incompleteness" above), ${s.footnoteCount} footnote <note>(s) excluded, ${s.marginalCount} marginal <note>(s) excluded, ${s.figureDiagramCount} <figure> diagram marker(s) with no source text (disclosed via Passage.figure only), ${s.figureTableCount} <figure> table marker(s) kept as ${s.tableRowsTotal} row(s) of verbatim table text in Passage.text.`,
        'See anomalies.json for the complete, individually-logged, machine-readable account of every exclusion/inclusion and structural irregularity in this file.',
        ...notImportedParagraphs(),
      ],
    },
  ];
  return sections;
}

function delOrAddNote(s: AboutStats): string {
  if (s.delCount === 0 && s.addCount === 0) return 'No <del>/<add> apparatus occurs in this particular file.';
  return `This file's own apparatus includes ${s.delCount} <del> span(s) and ${s.addCount} <add> insertion(s) - see anomalies.json for every one, individually.`;
}

function buildFigureParagraphs(entry: GrcWorkEntry, s: AboutStats): string[] {
  if (s.figureDiagramCount === 0 && s.figureTableCount === 0) {
    return ['No <figure> marker occurs anywhere in this source.'];
  }
  const paras: string[] = [
    `The source TEI carries ${s.figureDiagramCount + s.figureTableCount} <figure> marker(s), each at the point in the text the printed edition places a diagram or table. Every one is logged individually in anomalies.json; every CHAPTER that has one or more surfaces a single combined Passage.figure entry for all of them (see data/${entry.workId}/types.ts) - never one entry per marker.`,
  ];
  if (s.figureTableCount > 0) {
    paras.push(
      `${s.figureTableCount} of these carry a <figDesc> whose own markup (<list rend="table"> of <list rend="row"> rows of <item> cells) is a genuine numeric table the transcription itself preserves as text - kept verbatim, one row per line (cells space-joined, no punctuation added), as ordinary Passage.TEXT (${s.tableRowsTotal} row(s) total across this work, e.g. Book I's Table of Chords). This is SOURCE TEXT, not a note - it reads exactly like any other paragraph. Never rendered as an image, never fabricated - exactly the digits/numerals the source itself carries.`,
    );
  }
  const pureDiagrams = s.figureDiagramCount;
  if (pureDiagrams > 0) {
    paras.push(
      `The remaining ${pureDiagrams} marker(s) point only to a <graphic> URL (a page-image scan on archive.org - real, but not a transcription, and never used as a text source) with no transcribed content of their own, and contribute NOTHING to Passage.text. Instead, each affected chapter's Passage.figure.note states how many such diagrams appear there (e.g. "3 diagrams appear here in the printed edition; not yet available in this build.") together with an exact citation (e.g. "${entry.figureCiteLabel} Book N.M") and a "Scan page(s): ..." list of every one of that chapter's <graphic url="..."/> values (table-bearing figures' scan pages are listed too, alongside the diagram-only ones) - so a later diagram-import phase can fetch exactly the right archive.org pages. No image is fabricated, redrawn or reconstructed.`,
    );
  }
  return paras;
}

function buildGapParagraphs(s: AboutStats): string[] {
  const perBook = s.gapsByBook.map(([book, count]) => `Book ${book}: ${count}`).join(', ');
  return [
    `This transcription omits the NUMERIC data of Ptolemy's tables in ${s.gapsByBook.length} book(s) of this work (${perBook} - ${s.gapCount} <gap reason="omitted"/> lacuna(e) total). This is a material incompleteness of the SOURCE TRANSCRIPTION itself, not an editorial apparatus detail: every gap sits exactly where the printed edition gives a numeral (confirmed by direct inspection, e.g. the Book VII star catalogue's own printed column headers "μήκους μοίραι πλάτους μοίραι μέγεθος" - "degrees of longitude, degrees of latitude, magnitude" - immediately precede a run of entries each missing one or more of those numbers).`,
    "For each affected row, the DESCRIPTIVE text survives verbatim in Passage.text (e.g. a star's identifying description within its constellation, \"ὁ ἐπʼ ἄκρας τῆς οὐρᾶς\" - \"the [star] at the tip of the tail\"), but the row's own numeral(s) do not exist anywhere in this build - not as a placeholder, not as a zero, not at all. A future importer wanting the actual printed numbers cannot recover them from this transcription and must go to the printed edition (or a fresh transcription of it) directly.",
    'The printed numbers DO survive on the original page images: this same source\'s own <figure><graphic url="..."/></figure> markers (see "Diagrams and tables" above) name the exact archive.org scan page(s) covering the affected passages, via each affected chapter\'s Passage.figure - e.g. archive.org/stream/claudiiptolemae00ptolgoog#page/nNN/mode/1up. Every gap is also individually logged, and separately tallied per book, in anomalies.json.',
  ];
}

function notImportedParagraphs(): string[] {
  return [
    'Other works researched for this import batch but NOT included in this build (see scripts/import-ptolemy/workTable.ts for the full citation trail):',
    ...NOT_IMPORTED.map((w) => `${w.work}: ${w.reason}`),
  ];
}
