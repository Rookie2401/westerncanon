/**
 * Builds the WorkAbout (about.json) content for one Plato dialogue / language,
 * from the shared DialogueMeta table. Prose is parameterized but not
 * boilerplate-identical between dialogues: each dialogue's own Stephanus
 * range, editor/translator credit and archive.org source link is used.
 */

import type { WorkAbout, WorkAboutSection } from './types.ts';
import type { DialogueMeta } from './works.ts';

function translatorList(names: string[]): string {
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function buildAbout(
  meta: DialogueMeta,
  lang: 'grc' | 'en',
  opts: { pageCount: number; delCount: number; addCount: number; gapCount: number; corrCount: number; sicCount: number },
): WorkAbout {
  const workId = `plato-${meta.slug}-${lang}`;
  const range = `${meta.firstPage}–${meta.lastPage}`;

  const commonIntro: WorkAboutSection = {
    heading: lang === 'grc' ? `Plato's ${meta.englishTitle}` : `Plato's ${meta.englishTitle}, in English`,
    paragraphs:
      lang === 'grc'
        ? [
            `This is the Greek text of Plato's ${meta.greekTitle} (“${meta.englishTitle}”), covering Stephanus pages ${range} — the traditional citation scheme for Plato, used by every modern edition and translation, running continuously from the printed 1578 Estienne (Stephanus) edition's own pagination rather than restarting per dialogue.`,
            'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular — an editorially deleted word or clause, an editorial insertion, a manuscript reading Burnet flags but keeps — the irregularity is preserved and noted below.',
          ]
        : [
            `This is ${translatorList(meta.translators)}'s English translation of Plato's ${meta.englishTitle} (Greek ${meta.greekTitle}), covering Stephanus pages ${range} — the same citation scheme as this app's companion Greek edition of the same dialogue, so the two line up page for page and can be read side by side.`,
            'The text here is the translation, verbatim. Nothing is re-translated, modernised, or silently corrected.',
          ],
  };

  const editionSection: WorkAboutSection =
    lang === 'grc'
      ? {
          heading: 'The edition',
          paragraphs: [
            `John Burnet, ed., Platonis Opera, vol. ${meta.burnetVolume} (Oxford: Clarendon Press, ${meta.burnetDate}). This Oxford Classical Texts (OCT) edition is the standard critical Greek text of Plato and the basis of nearly every modern translation, including the Loeb English translation bundled alongside it in this app.`,
            `Public-domain scan: ${meta.burnetArchiveUrl}.`,
          ],
        }
      : {
          heading: 'The translation',
          paragraphs: [
            `${translatorList(meta.translators)}, in Plato in Twelve Volumes, vol. ${meta.loebVolume} (Cambridge, MA: Harvard University Press / London: William Heinemann Ltd., ${meta.loebDate}) — the Loeb Classical Library edition. ${meta.translators.length > 1 ? 'Translators are listed as credited for this Loeb volume in the source transcription; the named translator did the actual English rendering of this dialogue.' : ''}`.trim(),
            `The translation is made from Burnet's OCT Greek text (see this app's companion Greek edition of the same dialogue), the standard scholarly Greek Plato. Public-domain scan: ${meta.loebArchiveUrl}.`,
          ],
        };

  const digitalSource: WorkAboutSection = {
    heading: 'Digital source',
    paragraphs: [
      `The machine-readable text is the TEI XML file tlg0059.${meta.tlg}.perseus-${lang === 'grc' ? 'grc2' : 'eng2'} from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit GitHub repository (CTS urn:cts:greekLit:tlg0059.${meta.tlg}.perseus-${lang === 'grc' ? 'grc2' : 'eng2'}). It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.`,
    ],
  };

  const howImported: WorkAboutSection = {
    heading: 'How it was imported',
    paragraphs: [
      'The source divides the dialogue into one level of Stephanus-page divisions only (no Book division, unlike this app’s Republic/Laws imports) — each numbered exactly as the traditional printed citation gives it. Within a page, one or more paragraphs are each a single speaker’s turn; every paragraph is kept as its own paragraph (never merged with a neighbouring turn), joined by a blank line, and — where the source prints one — starts with the speaker’s printed abbreviation exactly as typeset (e.g. "ΣΩ." / "Soc.") rather than repeating it on every paragraph of a longer speech, matching the print.',
      'Finer Stephanus sub-page lettering (172a, 172b, 172c…) is stripped from the reading text — it is not a Division boundary in this app’s scheme, only the page level is. Quotation, citation and cross-reference markup used inline in the running text (quoted verse, citations like "Hom. Il. 19.92", technical/foreign-word glosses) is unwrapped to plain text and kept; nothing of this is commentary. Where the source itself prints no literal quotation-mark character around reported speech, none is added here — only what the source actually contains.',
    ],
  };

  const gaps: string[] = [];
  if (opts.delCount > 0) {
    gaps.push(
      `${opts.delCount} <del> span(s) — text Burnet’s critical edition marks as a later interpolation or scribal error, not Plato’s own wording — are excluded from the reading text; every occurrence is logged individually in anomalies.json with its verbatim excerpt.`,
    );
  }
  if (opts.addCount > 0) {
    gaps.push(
      `${opts.addCount} <add> editorial insertion(s) — a word or short phrase Burnet supplies where the manuscript tradition is defective — are kept verbatim in the reading text; every occurrence is logged individually.`,
    );
  }
  if (opts.gapCount > 0) {
    gaps.push(
      `${opts.gapCount} <gap/> marker(s) mark a genuine lacuna inside a quoted verse fragment (a line of Hesiod, Homer or Euripides quoted mid-dialogue) — nothing is recoverable there and nothing is substituted; each is logged individually.`,
    );
  }
  if (opts.corrCount > 0) {
    gaps.push(`${opts.corrCount} silent editorial correction(s) (<corr>) already applied by Burnet are kept as printed; logged individually.`);
  }
  if (opts.sicCount > 0) {
    gaps.push(`${opts.sicCount} reading(s) Burnet’s transcription explicitly flags as printed exactly as transmitted (<sic>), kept verbatim; logged individually.`);
  }
  if (gaps.length === 0) {
    gaps.push('This witness carries no <del>/<add>/<gap>/<corr>/<sic> editorial-apparatus markup at all in the source transcription.');
  }

  const isLetters = meta.slug === 'letters';
  const lettersNotes: string[] = isLetters
    ? [
        'Structure of the Epistles. This is not a dialogue but thirteen separate letters, and the source wraps each letter’s Stephanus pages in its own letter division. Nine pages (310, 315, 321, 322, 323, 352, 357, 358 and 359) therefore appear twice or, for 358, three times in the source markup — once inside each letter that shares them — because one letter ends and the next begins on that page. Every part is kept: the page division carries one paragraph-group per letter-part, in source order, and each passage is labelled with its letter number ("Letter 1" … "Letter 13") so the boundary is visible. An earlier draft of this importer skipped the repeated page as a duplicate, which silently dropped the opening of every letter that begins mid-page; that was caught in review and corrected before this edition was shipped, and each merged page is logged in anomalies.json.',
        'The source’s thirteen letters follow the traditional numbering; whether any given letter is genuinely Plato’s has been disputed since antiquity (the Seventh Letter is the one most often accepted), and nothing here takes a side — all thirteen are transcribed as Burnet prints them.',
      ]
    : [];

  const knownGaps: WorkAboutSection = {
    heading: 'Known gaps & anomalies',
    paragraphs: [
      isLetters
        ? `Completeness. All ${opts.pageCount} Stephanus pages (${range}) are present, verified against an independently-checked page count and confirmed strictly monotonic in the source markup once each page shared by two letters is counted once (see “Structure of the Epistles” below).`
        : `Completeness. All ${opts.pageCount} Stephanus pages (${range}) are present, verified against an independently-checked page count for this dialogue and confirmed strictly monotonic (no gap, no duplicate) in the source markup itself.`,
      ...lettersNotes,
      ...gaps,
      'Reference scheme: every passage and division ref is null. The Stephanus page number IS the citation (e.g. "' +
        meta.englishTitle +
        ' ' +
        meta.firstPage +
        '"); this source’s finer a/b/c/d sub-page lettering is stripped as transport scaffolding (see “How it was imported” above), not tracked as a separate ref field.',
    ],
  };

  return {
    workId,
    title: lang === 'grc' ? meta.greekTitle : meta.englishTitle,
    author: 'Plato',
    language: lang,
    edition: lang === 'grc' ? `Burnet ${meta.burnetDate} (OCT, vol. ${meta.burnetVolume})` : `${translatorList(meta.translators)}, ${meta.loebDate} (Loeb Classical Library)`,
    editor: lang === 'grc' ? 'John Burnet' : undefined,
    translator: lang === 'en' ? translatorList(meta.translators) : undefined,
    provenance: `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0059.${meta.tlg}.perseus-${lang === 'grc' ? 'grc2' : 'eng2'}); imported by scripts/import-plato-${meta.slug}-${lang}.`,
    license: 'Public domain (Burnet 1900s OCT text; ' + (lang === 'en' ? `${meta.loebDate} Loeb translation, 95+ years old` : 'ancient text') + '). Digital transcription CC BY-SA 4.0 (Perseus/OpenGreekAndLatin).',
    sections: [commonIntro, editionSection, digitalSource, howImported, knownGaps],
  };
}
