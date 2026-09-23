/**
 * Builds the `WorkAbout.sections` prose for one Xenophon work/language pair.
 * Shared across all 28 outputs; only the numbers, titles and a handful of
 * work-specific disclosures (book-work vs flat-work reference-scheme prose,
 * the Anabasis 6.3 reorder, the Cyropaedia 8.8 delSpan) vary.
 */
import type { XenophonWorkEntry } from './workTable.ts';
import type { ParseStats } from './parse.ts';
import type { WorkAboutSection } from './genericTypes.ts';

export interface AboutInput {
  entry: XenophonWorkEntry;
  lang: 'grc' | 'en';
  stats: ParseStats;
  reorderNote: string | null;
}

export function buildAboutSections(input: AboutInput): WorkAboutSection[] {
  const { entry, lang, stats } = input;
  const isGrc = lang === 'grc';
  const structureLabel =
    entry.structure === 'books'
      ? 'book, then chapter, then section'
      : entry.structure === 'flat-chapters'
        ? 'chapter, then section (no book level)'
        : 'section only (no chapter or book level)';

  const sections: WorkAboutSection[] = [
    {
      heading: `Xenophon's ${entry.commonTitleEn}`,
      paragraphs: [
        isGrc
          ? `The Greek text here is E. C. Marchant's, verbatim (Xenophontis Opera Omnia, vol. ${entry.marchantVolume}, Oxford: Clarendon Press, ${entry.marchantYear}). Nothing is modernised, paraphrased or silently corrected.`
          : `The English text here is ${entry.translator}'s Loeb Classical Library translation, verbatim ("Xenophon in Seven Volumes", vol. ${entry.translatorLoebVol}, Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., ${entry.translatorYears}). Nothing is modernised, paraphrased or silently corrected.`,
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [
        `E. C. Marchant, ed., Xenophontis Opera Omnia, vol. ${entry.marchantVolume} (Oxford: Clarendon Press, ${entry.marchantYear}), an Oxford Classical Text - Greek title ${JSON.stringify(entry.grcTitle)}.` +
          (entry.translationLabel
            ? ` The Loeb English translation used here is itself titled "${entry.translationLabel}" (${entry.translator}, vol. ${entry.translatorLoebVol}, ${entry.translatorYears}), commonly cited as "${entry.commonTitleEn}".`
            : ` The Loeb English translation used here is by ${entry.translator} (vol. ${entry.translatorLoebVol}, ${entry.translatorYears}).`),
        `Structure: ${structureLabel}. This edition carries ${stats.bookCount > 0 ? `${stats.bookCount} book(s), ` : ''}${stats.chapterCount > 0 ? `${stats.chapterCount} chapter(s), ` : ''}${stats.sectionCount} section(s) total in this witness.` +
          (entry.ctsEnTitle !== entry.commonTitleEn
            ? ` (Perseus/CTS's own English work-title metadata reads "${entry.ctsEnTitle}"; this app uses the more familiar "${entry.commonTitleEn}".)`
            : ''),
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is the TEI XML file tlg0032.${entry.tlg}.perseus-${isGrc ? 'grc' : 'eng'}2.xml (CTS urn:cts:greekLit:tlg0032.${entry.tlg}.perseus-${isGrc ? 'grc' : 'eng'}2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It was fetched once (cached at scripts/import-xenophon/raw/) and is bundled with the app; nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        entry.structure === 'books'
          ? `The importer walks the book, chapter and section <div>s. Each Book becomes a container Division (\`book-N\`, its verbatim Greek rubric captured as sourceHeading${isGrc ? '' : ' on the Greek sibling only - the English witness prints no book rubric'}); each Chapter becomes a leaf Division (\`book-N-ch-M\`) with exactly one Passage, collecting every <p> under that chapter's section children, in citation-number order, joined with a blank line. This mirrors this app's established de-bello-gallico-la convention for an uninformative extra nesting level (Xenophon's sections ARE independently citation-meaningful, unlike Caesar's, but this app's schema still folds them into the chapter Passage rather than exposing them as separate Divisions - see "Reference scheme" below).`
          : entry.structure === 'flat-chapters'
            ? `The importer walks the flat sequence of chapter <div>s (no book wrapper in this source). Each Chapter becomes a leaf Division (\`ch-N\`) with exactly one Passage, collecting every <p> under that chapter's section children, in citation-number order, joined with a blank line.`
            : `The importer walks the flat sequence of section <div>s directly (this work's source has NO chapter wrapper at all - confirmed by its own <refsDecl>/<citeStructure>, which declares a single "section" citation unit). Each section becomes a leaf Division (\`sec-N\`) with exactly one Passage.`,
        `Only transport/editorial scaffolding is removed: entities are decoded, whitespace collapsed, and Unicode normalised to NFC (a no-op for every one of these 14 source files - independently verified 0 code points remapped). <milestone unit="para"/> markers (always redundant with an immediately-following <p> start) are dropped as zero-width. Editorial supplements (<add>) and corrections (<corr>, standalone or the printed half of a <choice><sic>/<corr> pair) ARE part of what this edition prints as its running text and are kept verbatim; text the editor brackets as suspected spurious or an interpolation (<del>) is likewise KEPT, wrapped in square brackets exactly as a critical edition prints editor-bracketed text - NOT excluded (only the unemended half of a <choice><sic> pair, and any translator footnote nested inside a <del>, are ever excluded); all logged individually in anomalies.json, full span verbatim. Translator/editorial footnotes (<note>, up to ~1450 in one file) and inline source-attribution labels for embedded quotations (<bibl>, e.g. "Theognis") are excluded entirely as apparatus, not Xenophon's own words, and counted.`,
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        entry.structure === 'books'
          ? `Citation is by Book, Chapter and Section (e.g. "${entry.commonTitleEn} 1.1.1"), Xenophon's and this edition's own numbering. This app's schema folds each chapter's sections into one Passage (see "How it was imported"), so Division.ref and Passage.ref are null throughout - the section-level citation survives only as the paragraph-break structure within a chapter's joined text, in citation-number order, not as a separate addressable Division.`
          : entry.structure === 'flat-chapters'
            ? `Citation is by Chapter and Section (e.g. "${entry.commonTitleEn} 1.1"), Xenophon's and this edition's own numbering. This app's schema folds each chapter's sections into one Passage (see "How it was imported"), so Division.ref and Passage.ref are null throughout.`
            : `Citation is by Section alone (e.g. "${entry.commonTitleEn} 1"), Xenophon's and this edition's own numbering; the source carries no chapter level at all. Division.ref and Passage.ref are null throughout: this source carries no finer, page-marker-style citation scheme.`,
      ],
    },
  ];

  // --- Known gaps & anomalies -------------------------------------------
  const gapsParas: string[] = [
    `Completeness. All ${stats.bookCount > 0 ? `${stats.bookCount} books, ` : ''}${stats.chapterCount > 0 ? `${stats.chapterCount} chapters` : `${stats.sectionCount} sections`}${stats.chapterCount > 0 ? ` and ${stats.sectionCount} sections` : ''} of this edition are present and in order.`,
  ];
  if (stats.delCount > 0) {
    gapsParas.push(
      `${stats.delCount} <del> span(s) - text the editor brackets as suspected spurious or a later interpolation - are KEPT in the reading text, wrapped in square brackets exactly as the critical edition itself prints such text (e.g. this edition's bracketed recapitulation passages). This is NOT an exclusion: bracketed text is still Xenophon's edition's own printed text, just flagged by the editor as doubtful. Every occurrence is logged individually in anomalies.json, in full.` +
        (stats.delAlreadyBracketedCount > 0
          ? ` ${stats.delAlreadyBracketedCount} of these already carried literal brackets in the source itself; that pair was not doubled.`
          : ''),
    );
  }
  if (stats.addCount > 0) {
    gapsParas.push(
      `${stats.addCount} <add> editorial supplement(s) (filling a manuscript gap) were kept verbatim, since they ARE part of what this edition prints; logged individually.`,
    );
  }
  if (stats.sicCount - stats.sicSuppressedCount > 0 || stats.corrCount > 0 || stats.choiceCount > 0) {
    gapsParas.push(
      `${stats.sicCount - stats.sicSuppressedCount} standalone <sic> reading(s) (printed exactly as transmitted despite an apparent irregularity) and ${stats.corrCount} <corr> editorial correction(s) were kept verbatim; ${stats.choiceCount} <choice><sic>/<corr></choice> pair(s) resolve to the printed <corr> reading, with the unemended <sic> reading excluded. All logged individually.`,
    );
  }
  if (stats.gapCount > 0) {
    gapsParas.push(
      `${stats.gapCount} <gap reason="lost"/> manuscript lacuna marker(s) were found; this edition prints no literal rendering at any of them (no "rend" attribute anywhere in this corpus), so nothing is fabricated. Logged individually.`,
    );
  }
  if (stats.noteCount > 0) {
    gapsParas.push(
      `${stats.noteCount} translator/editorial footnote(s) (<note>) were excluded entirely as apparatus - never Xenophon's own words.`,
    );
  }
  if (stats.biblCount > 0) {
    gapsParas.push(
      `${stats.biblCount} inline source-attribution label(s) (<bibl>, e.g. naming the poet a quoted line traces to) were excluded from the reading text as editorial apparatus - confirmed by direct inspection to be glued onto the surrounding text with no separating whitespace, i.e. never part of Xenophon's own sentence.`,
    );
  }
  if (input.reorderNote) gapsParas.push(input.reorderNote);
  if (stats.emptyParagraphsDropped > 0) {
    gapsParas.push(`${stats.emptyParagraphsDropped} paragraph(s) that cleaned to empty text were dropped rather than joined as an empty segment.`);
  }
  sections.push({ heading: 'Known gaps & anomalies', paragraphs: gapsParas });

  return sections;
}
