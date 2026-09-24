/**
 * Builds each work's about.json `sections` prose from workTable.ts +
 * run-time stats, so the required sections (matching every other multi-work
 * importer in this repo - see validate.ts) are generated consistently across
 * all ~40 works instead of hand-written 40 times over.
 */
import type { WorkEntry } from './workTable.ts';
import type { WorkAboutSection } from './genericTypes.ts';

export interface AboutStats {
  bookCount: number | null;
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  /** <del> spans bracket-KEPT with a new `[...]` pair this importer added */
  delBracketedCount: number;
  /** <del> spans kept verbatim, NOT re-bracketed (their own text already had `[`/`]`) */
  delAlreadyBracketedCount: number;
  addCount: number;
  ellipsisGapCount: number;
  lostGapCount: number;
  chaptersWithoutRef: number;
  noteDiscardedCount: number;
  sicKeptCount: number;
  choiceSicCount: number;
  bekkerSpan: string | null;
  hasBekkerMarks: boolean;
  /** real printed diagrams attached by the importer (see diagrams/aristotle.ts) */
  diagrams: Array<{ divisionId: string; source: string }>;
}

function shapeDescription(entry: WorkEntry): string {
  switch (entry.shape.kind) {
    case 'flat-chapter':
      return `a flat list of Chapters (id \`ch-N\`, rendered "§ N") - the source has no Book-level division; deeper source nesting below the "${entry.shape.chapterSubtype}" level, if any, is folded into each Chapter's own Passage array rather than adding another Division level.`;
    case 'flat-paragraph':
      return 'a flat list of Chapters, one per bare source paragraph (this source has no chapter-level division of its own at all).';
    case 'book-chapter':
      return `Book -> Chapter (id \`book-N\`/\`book-N-ch-M\`); deeper source nesting below the "${entry.shape.chapterSubtype}" level, if any, is folded into each Chapter's own Passage array rather than adding another Division level.`;
    case 'book-chapter-filtered':
      return `Book -> Chapter, after first restricting the source to its "${entry.shape.filterN}" division only (see "Known gaps & anomalies" below).`;
    case 'book-page':
      return 'Book -> Chapter, where each Chapter is one Bekker PAGE\'s worth of text (this source divides directly at every Bekker page, with no separate chapter-numbering level of its own).';
    case 'problem-section':
      return `Preface / Problem -> Section (ids \`preface\`, \`preface-ch-M\`, \`problem-N\`, \`problem-N-ch-M\`, rendered "Preface", "Problem N" and "§ M"): the source's "${entry.shape.problemSubtype}" divs (n="0" = the unnumbered preface, then the traditional numbered problems) each hold their own restarting "${entry.shape.sectionSubtype}" numbering, so the two levels are both kept to keep every id unique.`;
  }
}

function authenticityParagraph(entry: WorkEntry): string {
  if (entry.authenticity === 'authentic') {
    return 'This work is a genuine, undisputed work of Aristotle.';
  }
  if (entry.authenticity === 'disputed') {
    return 'This work\'s authenticity is disputed by modern scholarship: it has long been transmitted under Aristotle\'s name, but whether he is its actual author (as opposed to a work by a close associate or early member of his school, later attributed to him) remains an open question - stated here plainly, as scholarship states it, not silently assumed either way.';
  }
  return 'This work is pseudo-Aristotelian: it survives in the Aristotelian corpus (and was long read as his) but is judged by modern scholarship NOT to be by Aristotle himself - stated here plainly, as scholarship states it, not silently passed off as genuine.';
}

function englishParagraph(entry: WorkEntry): string {
  if (entry.englishBundledConcurrently) {
    return 'An English translation of this work is in scope for a separate, concurrently-run import task covering select works of this reader; see this data directory\'s sibling `-en` work (if present) for its own about.json and provenance. This Greek import does not itself depend on that translation existing.';
  }
  return entry.englishNote ?? 'No English translation is bundled with this Greek text.';
}

export function buildAboutSections(entry: WorkEntry, stats: AboutStats): WorkAboutSection[] {
  const sections: WorkAboutSection[] = [];

  sections.push({
    heading: `Aristotle's ${entry.titleConventional}`,
    paragraphs: [
      `This is the Greek text of ${entry.titleGrc} (conventionally "${entry.titleConventional}").`,
      authenticityParagraph(entry),
      'The text here is Greek only, verbatim. Nothing is translated, modernised, normalised or silently corrected beyond the documented resolution of the source\'s own apparatus markup (see "How it was imported" below). Where the source is irregular or a genuine judgement call was made, it is preserved/recorded and flagged in "Known gaps & anomalies" below.',
    ],
  });

  sections.push({
    heading: 'English translation',
    paragraphs: [englishParagraph(entry)],
  });

  sections.push({
    heading: 'The edition',
    paragraphs: [
      `Per this XML file's own <sourceDesc>: ${entry.edition}${entry.pubPlace ? `, ${entry.pubPlace}` : ''}${entry.date ? `, ${entry.date}` : ''}.`,
      entry.bibliographicNote ?? 'No further bibliographic complication was found for this file beyond what is stated above.',
    ],
  });

  sections.push({
    heading: 'Digital source',
    paragraphs: [
      `The machine-readable text is the TEI XML file ${entry.file} (CTS urn:cts:greekLit:tlg0086.${entry.tlg}.${entry.witness}) from the ${
        entry.source === 'perseus'
          ? 'Perseus Digital Library / Open Greek and Latin canonical-greekLit repository'
          : entry.source === 'digicorpus'
            ? 'Open Greek and Latin project\'s "digicorpus" First1KGreek edition'
            : 'OpenGreekAndLatin / First1KGreek project'
      }. It was fetched once and is bundled with the app (scripts/import-aristotle-rest/raw/${entry.file}); nothing is loaded from the network at runtime.`,
    ],
  });

  sections.push({
    heading: 'How it was imported',
    paragraphs: [
      `The importer's generic TEI walker (scripts/import-aristotle-rest-shared/teiWalker.ts) parses this source's own <div type="textpart" subtype="..." n="..."> nesting into a tree, and shapes.ts folds it onto this app's Division scheme: ${shapeDescription(entry)}`,
      '<del>...</del> (text an editor judged spurious/interpolated, but which the edition still PRINTS, bracketed - the OCT convention) is KEPT verbatim in the reading text, wrapped in square brackets `[...]` (or left unbracketed-but-verbatim on the rare occasion its own printed text already contains a literal bracket, so as not to double them); <choice><sic>/<corr></choice> keeps the <corr> reading and excludes the <sic> variant; a bare <sic> (no <corr> offered) is itself the edition\'s printed reading and is kept, logged as a crux; <add>...</add> (an editorial insertion, printed by the edition) is KEPT inline; <bibl>...</bibl> (a modern editorial citation, not Aristotle\'s own words) is EXCLUDED; <note type="marginal"> / a Bekker-shaped <milestone> is captured to build Division.ref and removed from the reading prose; any OTHER <note> is discarded entirely (tag and content); a <gap reason="ellipsis"> is kept as its literal printed ellipsis text, a <gap reason="lost"/"omitted"> contributes no text; <q>/<quote>/<foreign>/<l>/<lg>/<hi>/<num>/<title>/<item>/<list>/<cit> (quotations, verse, foreign-language snippets, emphasis, numerals, a quoted work\'s title, list/table items) are unwrapped - tags stripped, text kept inline as ordinary reading prose, WHETHER nested inside a <p> or printed as a sibling of one (a verse quotation is very often the latter - e.g. this corpus\'s Empedocles/Homer citations - and is captured as its own implicit paragraph rather than dropped). Every occurrence of all of these except plain milestones/lb/pb is logged in anomalies.json. Entities are decoded and text is NFC-normalised and whitespace-collapsed; the words themselves are otherwise untouched.',
      stats.delBracketedCount + stats.delAlreadyBracketedCount + stats.addCount + stats.ellipsisGapCount + stats.lostGapCount + stats.noteDiscardedCount + stats.sicKeptCount + stats.choiceSicCount > 0
        ? `In this file: ${stats.delBracketedCount} <del> span(s) bracket-kept${stats.delAlreadyBracketedCount > 0 ? ` (+${stats.delAlreadyBracketedCount} already-bracketed in the source, kept as printed without doubling)` : ''}, ${stats.addCount} <add> insertion(s) kept, ${stats.sicKeptCount} bare <sic> crux(es) kept, ${stats.choiceSicCount} <choice><sic> variant(s) excluded in favour of <corr>, ${stats.ellipsisGapCount} literal-ellipsis <gap>(s) kept, ${stats.lostGapCount} lacuna <gap>(s) excluded, ${stats.noteDiscardedCount} non-citation <note>(s) discarded.`
        : 'No <del>/<sic>/<add>/<gap>/discarded-<note> apparatus occurs in this particular file.',
    ],
  });

  if (stats.diagrams.length > 0) {
    sections.push({
      heading: 'Diagrams',
      paragraphs: [
        `${stats.diagrams.length} printed geometric diagram${stats.diagrams.length === 1 ? '' : 's'} are bundled as images, cropped from the actual scanned page of a public-domain edition (Otto Apelt's 1888 Teubner text of the Mechanica, Internet Archive identifier deplantisalia00apelgoog) - the printed ink only, thresholded to black on a transparent background so the app can tint it to its own accent colour; never redrawn, straightened or reconstructed from the text. Each image sits beside its exact citation (edition, printed page, Bekker line, archive.org leaf).`,
        `The digital transcription carries no <figure> marker anywhere, so the placement is editorial: every printed figure was matched to the one passage whose own Greek names the same point-letters (Α, Β, Γ, ...) in the same construction, checked side by side (the full research table, including the editions examined for every other Aristotelian work and why they carry no diagrams, is in scripts/import-aristotle-rest-shared/diagrams/aristotle.report.md). Divisions carrying an image: ${stats.diagrams.map((d) => d.divisionId).join(', ')}. Every attachment is also logged in anomalies.json.`,
      ],
    });
  }

  sections.push({
    heading: 'Reference scheme',
    paragraphs: [
      stats.hasBekkerMarks
        ? `Citation is by ${stats.bookCount !== null ? 'Book, Chapter, and' : 'Chapter and'} Bekker page/column range: each Chapter's Division.ref is built from the Bekker citation marks found in its own text, in document order (a single value if only one falls inside it, "<first>–<last>" if more than one)${stats.bekkerSpan ? `; this work spans Bekker ${stats.bekkerSpan} in the standard pagination` : ''}. ${stats.chaptersWithoutRef > 0 ? `${stats.chaptersWithoutRef} chapter(s) carry no Bekker mark of their own in this transcription and have Division.ref = null (flagged individually in anomalies.json, not guessed at).` : 'Every chapter carries at least one Bekker mark in this transcription.'}`
        : `This source carries no inline Bekker page/column citation of its own (verified: neither <note type="marginal"> nor a Bekker-shaped <milestone> occurs anywhere in the body) - Division.ref is null throughout, logged once as a work-level anomaly rather than per-chapter. Citation here is by ${stats.bookCount !== null ? 'Book and Chapter' : 'Chapter'} number alone.`,
      'No printed sub-chapter/line-level reference is attempted for any individual Passage (Passage.ref is null throughout); where a source nests a nameable level below its Chapter (e.g. a "section"), that level\'s own number survives as Passage.n (e.g. "3", or "3.2" two levels down) rather than being discarded.',
    ],
  });

  const anomalyParas = [
    `All ${stats.bookCount !== null ? `${stats.bookCount} Book(s) and ` : ''}${stats.chapterCount} Chapter(s) and ${stats.passageCount} Passage(s) (${stats.totalChars} characters of Greek reading text) present in this source were imported; nothing was dropped except the documented apparatus exclusions above, and no paragraph was reordered or merged beyond the documented Book/Chapter folding.`,
  ];
  if (entry.bibliographicNote) anomalyParas.push(entry.bibliographicNote);
  anomalyParas.push('See anomalies.json for the complete, individually-logged, machine-readable account of every exclusion/inclusion and structural irregularity in this file.');

  sections.push({ heading: 'Known gaps & anomalies', paragraphs: anomalyParas });

  return sections;
}
