/**
 * Shared About-page text builder for the twelve Plato dialogue imports.
 * Produces the WorkAbout `sections` prose, parameterised per dialogue/
 * language with the real counts the importer measured (page range,
 * paragraph count, <note>/<bibl>/<milestone> counts) rather than
 * hard-coded numbers, so the text always matches what was actually
 * imported.
 */

import type { DialogueMeta } from './dialogues.ts';
import type { Lang, WorkAbout, WorkAboutSection } from './types.ts';
import { rawFileName } from './dialogues.ts';

export interface AboutStats {
  firstPage: number;
  lastPage: number;
  sectionCount: number;
  paragraphCount: number;
  noteCount: number;
  biblCount: number;
  milestoneCount: number;
  noSpeakerParagraphCount: number;
}

const CTS_URN = (meta: DialogueMeta, lang: Lang): string =>
  `urn:cts:greekLit:tlg0059.${meta.tlg}.${lang === 'grc' ? meta.grcWitness : meta.enWitness}`;

const GREEK_LICENSE =
  "John Burnet's Oxford Classical Texts edition of Plato (1900–1907) is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).";

const englishLicense = (meta: DialogueMeta): string =>
  `${meta.translator}'s ${meta.translatorYear} translation is in the public domain (published over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).`;

function speakerParagraphNote(meta: DialogueMeta, stats: AboutStats): string {
  if (meta.noSpeakerMarkup) {
    return (
      `This particular Perseus witness carries no <said>/<label> speaker markup at all: all ${stats.paragraphCount} ` +
      `paragraphs are plain prose, matching the work's dramatic frame as one continuous speech by Socrates (plus a ` +
      `narrated cross-examination of Meletus) rather than a back-and-forth exchange. So unlike this app's other ` +
      "five Plato dialogues, no paragraph here opens with a printed speaker label - there simply isn't one in the " +
      'source to preserve.'
    );
  }
  return (
    'Every paragraph in the source is one speaker\'s turn, tagged <p><said who="#Name"><label>Name.</label> ' +
    'text</said></p> (Crito, Phaedo and Euthyphro, and this dialogue\'s Greek witness) or, in the English ' +
    'translations of Ion and Meno, the other way around - <said who="#Name"><label>Name.</label> <p>text</p></said>, ' +
    '<said> wrapping <p> rather than <p> wrapping <said> - confirmed by direct inspection of both source files; the ' +
    'importer tolerates either nesting identically rather than assuming one. The printed speaker label (e.g. ' +
    '"Socrates." or, in Greek, an abbreviated form like "ΣΩ.") is part of the printed text and is kept verbatim as ' +
    "the start of that paragraph's text, exactly as it is typeset in print - never stripped, never used to " +
    'fabricate a separate speaker field.'
  );
}

export function buildAbout(meta: DialogueMeta, lang: Lang, stats: AboutStats): WorkAbout {
  const workId = `plato-${meta.slug}-${lang}`;
  const rawFile = rawFileName(meta, lang);
  const urn = CTS_URN(meta, lang);

  const introParas =
    lang === 'grc'
      ? [
          `This is the Greek text of Plato's ${meta.titleGrc} (${meta.titleEn}), edited by John Burnet (Oxford Classical Texts). ` +
            'The text here is Burnet\'s Greek, verbatim - nothing is translated, modernised, or silently corrected. ' +
            "It is a companion edition to this app's English translation of the same dialogue, sharing the same Stephanus-page numbering throughout, and can be read side by side with it.",
          `Stephanus pagination (this dialogue: pp. ${stats.firstPage}–${stats.lastPage}) is the universal citation scheme for Plato, taken from Henri Estienne's 1578 edition and reprinted in the margin of virtually every edition and translation since; it is used here as-is, not renumbered.`,
        ]
      : [
          `This is ${meta.translator}'s ${meta.translatorYear} English translation of Plato's ${meta.titleEn} (Greek ${meta.titleGrc}), from the Loeb Classical Library. ` +
            "It is a companion edition to this app's Greek (Burnet) text of the same dialogue, sharing the same Stephanus-page numbering throughout, and can be read side by side with it.",
          `Stephanus pagination (this dialogue: pp. ${stats.firstPage}–${stats.lastPage}) is the universal citation scheme for Plato, taken from Henri Estienne's 1578 edition and reprinted in the margin of virtually every edition and translation since; it is used here as-is, not renumbered.`,
        ];

  const sections: WorkAboutSection[] = [
    {
      heading: lang === 'grc' ? `Plato's ${meta.titleEn} in Greek` : `Plato's ${meta.titleEn} in English`,
      paragraphs: introParas,
    },
    {
      heading: lang === 'grc' ? 'The edition' : 'The translation',
      paragraphs:
        lang === 'grc'
          ? [`John Burnet, ed., Platonis Opera (Oxford: Clarendon Press, 1900–1907). This edition is in the public domain and remains the standard critical Greek text of Plato.`]
          : [
              `${meta.translator}, in *Plato*, Loeb Classical Library (Cambridge, MA: Harvard University Press / London: William Heinemann, ${meta.translatorYear}). ${meta.translator} translates directly against the Greek manuscript tradition represented by Burnet's Oxford text, the same edition this app's Greek text is transcribed from, and remains a standard scholarly English Plato.`,
            ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is the TEI XML file ${rawFile} (${urn}) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit GitHub repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        `The source has no Book-level division (unlike Plato's *Republic* and *Laws*): the whole dialogue is segmented directly into ${stats.sectionCount} <div type="textpart" subtype="section"> elements, one per Stephanus page (this dialogue: pp. ${stats.firstPage}–${stats.lastPage}), attribute order varying file to file and tolerated as such. Each page division carries a single passage: its <p> paragraphs joined with a blank line between them, in source order, never merged or reordered - ${stats.paragraphCount} paragraphs total in this file.`,
        speakerParagraphNote(meta, stats),
        `Finer Stephanus sub-page lettering (<milestone n="${stats.firstPage}a" unit="section" resp="Stephanus"/>, "${stats.firstPage}b", ...) appears scattered mid-paragraph in the source and carries no text of its own; all ${stats.milestoneCount} <milestone/> markers in this file (including the page-boundary echo that sometimes duplicates a division's own page number) are stripped, and the Division granularity stays at the Stephanus-page level, not the lettered sub-page.`,
        `This file has ${stats.noteCount} translator's footnote${stats.noteCount === 1 ? '' : 's'} (<note>) and ${stats.biblCount} inline cross-reference citation${stats.biblCount === 1 ? '' : 's'} (<bibl>, e.g. a citation like "Hom. Il. 23.335 ff." identifying a quoted Homer passage). Both are excluded from the reading text entirely - they are the translator's own apparatus, not the speaker's words - matching how scripts/import-euclid/index.ts drops Heath's <note> commentary; every occurrence is still logged verbatim to anomalies.json, nothing is silently dropped. Every other inline tag actually used in the running text (<persName>, <placeName>, <name>, <q>, <foreign>, and similar) is unwrapped: tag dropped, content kept, nothing fabricated or removed.`,
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        `Division scheme: one Division per Stephanus page (id \`sec-N\`, e.g. \`sec-${stats.firstPage}\`), no further nesting - the same scheme this app uses for all six dialogues in this batch. Cite by dialogue and Stephanus page/letter (e.g. "${meta.titleEn} ${stats.firstPage}a"), the standard scholarly citation for Plato.`,
        'Every passage and division ref is null: no physical page/line reference beyond the Stephanus number itself is tracked at this granularity.',
      ],
    },
  ];

  return {
    workId,
    title: lang === 'grc' ? meta.titleGrc : meta.titleEn,
    author: 'Plato',
    language: lang,
    edition: lang === 'grc' ? 'Burnet, Oxford Classical Texts (1900–1907)' : `Loeb Classical Library, ${meta.translatorYear}`,
    editor: lang === 'grc' ? 'John Burnet' : undefined,
    translator: lang === 'en' ? meta.translator : undefined,
    provenance: `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (${urn}), which digitises ${lang === 'grc' ? "Burnet's Oxford Classical Texts edition" : `${meta.translator}'s ${meta.translatorYear} Loeb translation`}; imported by scripts/import-plato-${meta.slug}-${lang}.`,
    license: lang === 'grc' ? GREEK_LICENSE : englishLicense(meta),
    sections,
  };
}
