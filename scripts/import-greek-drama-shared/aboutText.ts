/**
 * "About the text" prose generator, shared across all Greek-drama works
 * (Aeschylus/Sophocles/Euripides now; Aristophanes later reuses this
 * unchanged). Every paragraph is generated from real counts the importer
 * measured on that specific file.
 */

import type { WorkAboutSection } from './genericTypes.ts';
import type { PlayEntry, Witness } from './workTable.ts';
import type { ConvertStats } from './teiConvert.ts';

export interface AboutStats extends ConvertStats {
  delCount: number;
  addCount: number;
  /** <gap reason="lost"/>: rendered as the "⟨…⟩" lacuna sigla in the text */
  gapLostCount: number;
  /** <gap> with any other reason (this corpus: only "ellipsis" - a
   *  rhetorical trailing-off, not lost text): left contributing no text */
  gapOtherCount: number;
  /** a PAIRED <sic> (inside <choice> or a bare <corr>), rejected in favour
   *  of the editor's <corr>/<reg>/<add> alternative */
  sicRejectedCount: number;
  /** a BARE <sic> (no pairing): the edition's own printed crux, kept verbatim */
  sicKeptCount: number;
  unclearCount: number;
  spanMarkerCount: number;
  unexpectedTagCount: number;
}

function witnessLine(w: Witness, roleWord: 'edition' | 'translation'): string {
  return `${roleWord === 'edition' ? 'Edition' : 'Translation'} witness \`${w.witness}\`: ${w.citation}`;
}

export function buildAboutSections(entry: PlayEntry, lang: 'grc' | 'en', stats: AboutStats): WorkAboutSection[] {
  const witness = lang === 'grc' ? entry.grc : entry.en;
  if (!witness) throw new Error(`${entry.slug}: buildAboutSections called for lang=${lang} with no witness`);
  const sections: WorkAboutSection[] = [];

  sections.push({
    heading: `${entry.playwrightLabel}' ${entry.title}`,
    paragraphs: [
      lang === 'grc'
        ? `This is the Greek text of ${entry.playwrightLabel}' ${entry.title}${entry.greekLabel ? ` (Ἑλληνιστί: ${entry.greekLabel})` : ''}, verbatim.`
        : `This is an English translation of ${entry.playwrightLabel}' ${entry.title}.`,
      'The text here is verbatim: nothing is translated (for the Greek), modernised, or silently corrected. Where the source is irregular - a lacuna, an editor\'s conjectural restoration, a manuscript reading the editor rejects - the irregularity is preserved and noted below, never smoothed over.',
    ],
  });

  sections.push({
    heading: lang === 'grc' ? 'The edition' : 'The translation',
    paragraphs: [witnessLine(witness, lang === 'grc' ? 'edition' : 'translation')],
  });

  sections.push({
    heading: 'Digital source',
    paragraphs: [
      `The machine-readable text is the TEI XML file ${witness.file} (CTS urn urn:cts:greekLit:${entry.tlgGroup}.${entry.tlgWork}.${witness.witness}) from the Perseus Digital Library's canonical-greekLit repository (github.com/PerseusDL/canonical-greekLit). It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.`,
    ],
  });

  const cardWord = stats.cardCount === 1 ? 'card' : 'cards';
  const howImported: string[] = [
    `The importer segments the text into ${stats.cardCount} numbered ${cardWord} - Perseus's own reading-chunk boundaries (\`<milestone unit="card"/>\`, roughly every 50 lines), each citable by its first printed line number (e.g. "§ 1", "§ 49", ...). ${
      stats.hasDramatisPersonae
        ? 'A leading "Dramatis Personae" division (not itself a card) carries the source\'s own cast list.'
        : 'This particular witness carries no dramatis-personae cast list in the source (not every play/witness in this corpus has one - see the shared importer\'s module docs).'
    }`,
    `Within each card, one Passage is produced per speech (\`<sp>\`): the speaker's name on its own first line, then the speech's lines joined with ${
      lang === 'grc' ? 'a newline per verse line' : 'a single space (the English translation runs each Perseus <l> as a prose sentence-fragment, not a verse line, so these are joined into a continuous paragraph)'
    }. A speech interrupted by a card boundary or by a stage direction is split into multiple Passages; every Passage after the first for that speech repeats the speaker's name followed by " (cont.)" - a disclosed importer convention, not source text.`,
    `${stats.stageDirectionCount} stage direction${stats.stageDirectionCount === 1 ? '' : 's'} (\`<stage>\`) occur in this witness; each becomes its own Passage, "[bracketed]" - the brackets are an importer convention (disclosed here), not source punctuation.`,
    `An editor's deletion (\`<del>\`) is never dropped from the reading text: its words are KEPT, "[bracketed]" exactly as a critical edition prints editor-suspected-spurious text - the same square-bracket convention classicists already use in print for an interpolated or athetized line. A deletion spanning several consecutive \`<l>\` lines (Perseus's TEI re-opens/re-closes the same logical deletion inside each line it touches) is merged back into ONE continuous bracket opening at the start of the first line and closing at the end of the last, rather than printing a bracket per line; see "Known gaps & anomalies" below for this witness's count.`,
  ];
  sections.push({ heading: 'How it was imported', paragraphs: howImported });

  sections.push({
    heading: 'Reference scheme',
    paragraphs: [
      `Each card's \`ref\` is the "first–last" printed line-number span of its own numbered lines (e.g. "1–48"); each Passage's own \`n\` is the printed line number its speech, stage direction, or orphan text begins at. Line numbers with a non-numeric suffix (e.g. "96a") are kept exactly as printed.`,
    ],
  });

  const gaps: string[] = [
    `Completeness. This witness produced ${stats.cardCount} card division(s) and ${stats.passageCount} passages, ${stats.totalChars} characters of reading text; nothing is dropped, merged, or reordered beyond what is documented here.`,
    `Transcription hygiene. ${stats.hiddenLineCount} Perseus display-only hidden line(s) (\`<l n="0">\`, added by Perseus itself "for display purposes only" and never part of the transmitted text) were skipped. ${stats.noteDiscardCount} apparatus \`<note>\` element(s) (editorial commentary - textual variants, cross-references, modern glosses - never part of the reading text) were discarded entire, aside from the dramatis-personae note where present, which is handled separately and kept.`,
  ];
  if (stats.emptyLineDropped > 0) {
    gaps.push(
      `${stats.emptyLineDropped} line(s) produced no reading text after their apparatus content was discarded (e.g. a line whose entire printed content is an editorial note like "four lines missing here"); each is individually logged in anomalies.json and simply omitted rather than left as a blank line.`,
    );
  }
  if (stats.gapLostCount > 0) {
    gaps.push(
      `${stats.gapLostCount} \`<gap reason="lost"/>\` marker(s) (a true lacuna in the manuscript/papyrus tradition) occur in this text, rendered at that exact position as the conventional lacuna sigla "⟨…⟩" (U+27E8 U+2026 U+27E9) - never square brackets, which mean editor-bracketed \`<del>\` text here. This applies whether the gap is an entire line (so the speech, and its speaker attribution, is preserved rather than silently dropped) or inline within a longer line; every occurrence is logged in anomalies.json with its line number.`,
    );
  }
  if (stats.gapOtherCount > 0) {
    gaps.push(
      `${stats.gapOtherCount} \`<gap/>\` marker(s) with a reason OTHER than "lost" occur in this text (this corpus's only other value is "ellipsis" - the source's own rhetorical trailing-off/aposiopesis convention, not lost text, so it does not qualify for the lacuna sigla above). No text is contributed for these; every occurrence is logged in anomalies.json with its stated reason.`,
    );
  }
  if (stats.delCount > 0) {
    gaps.push(
      `${stats.delCount} \`<del>\` span(s) (text an editor marks as not belonging in the received text - a scribal accretion, an interpolated or athetized line) were KEPT in the reading text, "[bracketed]" exactly as a critical edition prints editor-suspected-spurious text, rather than silently dropped - a multi-line deletion is shown as one continuous bracket, not one per line (see "How it was imported" above); each occurrence is individually logged in anomalies.json with its full, untruncated text.`,
    );
  }
  if (stats.sicRejectedCount > 0) {
    gaps.push(
      `${stats.sicRejectedCount} rejected manuscript reading(s) (a PAIRED \`<sic>\` - inside \`<choice>\` alongside a \`<corr>\`/\`<reg>\`/\`<add>\` alternative, or, as Aeschylus' Agamemnon 801 shows, directly inside a bare \`<corr>\` alongside an \`<add>\`) were excluded in favour of the editor's preferred reading; each occurrence is individually logged in anomalies.json.`,
    );
  }
  if (stats.sicKeptCount > 0) {
    gaps.push(
      `${stats.sicKeptCount} transmitted reading(s) printed as-is (a BARE \`<sic>\`, with no rejecting \`<corr>\`/\`<reg>\`/\`<add>\` alternative offered) are kept verbatim in the reading text - the edition itself prints this as a crux, still read even though flagged as suspect; each occurrence is individually logged in anomalies.json.`,
    );
  }
  if (stats.addCount > 0) {
    gaps.push(
      `${stats.addCount} editorial restoration/correction/supplied-attribution span(s) (\`<add>\`, \`<corr>\`, \`<reg>\`) were, like a bracketed \`<del>\` but unlike a rejected \`<sic>\`, INCLUDED in the reading text as printed - this also covers a small number of editorially-supplied speaker attributions (e.g. "Chorus"/"Χορός" where the manuscript itself does not name the speaker); every occurrence is logged in anomalies.json.`,
    );
  }
  if (stats.unclearCount > 0) {
    gaps.push(
      `${stats.unclearCount} \`<unclear>\` span(s) (a reading the editor marks uncertain but still prints as the best-attested text) are included in the reading text as printed, each logged in anomalies.json.`,
    );
  }
  if (stats.spanMarkerCount > 0) {
    gaps.push(
      `${stats.spanMarkerCount} \`<addSpan>\`/\`<delSpan>\`/\`<anchor>\` marker(s) occur in this witness, each bracketing a multi-line span an editor suspects as spurious or interpolated (crossing \`<sp>\`/\`<l>\` boundaries, so it cannot be handled like an ordinary inline \`<del>\`/\`<add>\`). Judgment call, applied corpus-wide: the bracketed text is kept in the reading text (both Perseus's own edition and translation still print/display it as running text, and it carries the play's standard line citation) rather than silently excised; every occurrence is individually logged in anomalies.json with the full rationale.`,
    );
  }
  if (stats.unexpectedTagCount > 0) {
    gaps.push(
      `${stats.unexpectedTagCount} occurrence(s) of a tag this importer does not have an explicit rule for were encountered; each was unwrapped transparently (its own text kept, the tag itself stripped) and logged in anomalies.json so nothing was silently mishandled without a trace - see those entries for exactly which tag and where.`,
    );
  }
  for (const extra of entry.notes ?? []) gaps.push(extra);
  sections.push({ heading: 'Known gaps & anomalies', paragraphs: gaps });

  return sections;
}
