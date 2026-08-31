/**
 * Shared parser for the two Latin Aristotle importers
 *   scripts/import-aristotle-categoriae-la/   scripts/import-aristotle-deint-la/
 *
 * Both read a Latin Wikisource `action=parse&prop=wikitext` dump and share the
 * exact same structure:
 *   {{TextQuality|NN%}}                (optional page-quality banner)
 *   <div class=text>                   (optional wrapper)
 *   {{titulus2 … \n}}                  (metadata template)
 *   == [01] ==                        (chapter, no rubric)
 *   == [05] DE SUBSTANTIA ==          (chapter, verbatim Latin rubric)
 *   …
 *   </div>{{finis}} + [[xx:…]] interwiki links   (trailing scaffolding)
 *
 * There is NO preface: chapter [01] is the first thing after the scaffolding.
 *
 * Faithfulness (mirrors scripts/import-summa, scripts/import-isagoge-la):
 *   - verbatim Latin reading text only; NO u/v or i/j regularisation, no accent
 *     / spelling / orthography / punctuation normalisation.
 *   - only wiki-transport scaffolding is removed (the templates and wrapper
 *     above, plus the trailing interwiki links).
 *   - the ONE permitted repair is the Unicode REPLACEMENT CHARACTER (U+FFFD):
 *     the Categoriae page carries it at two mid-word line-wrap points, a
 *     transcription encoding artefact (not a textual variant). It is removed and
 *     the word halves are joined; every occurrence is counted and its context
 *     reported so the importer can record it in anomalies.json.
 */

import { cleanText } from './text.ts';

export interface LatinChapter {
  /** chapter-number token exactly as printed, e.g. "01", "08", "9", "14" */
  numberToken: string;
  /** normalised arabic chapter number, String(Number(numberToken)) */
  number: string;
  /** verbatim Latin rubric printed after the "[NN]" token, or null if none */
  rubric: string | null;
  /** cleaned passage texts for this chapter, in source order */
  passages: string[];
}

export interface ParsedLatinWork {
  chapters: LatinChapter[];
  /** raw text before the first chapter heading — expected to be whitespace only */
  prefaceRegion: string;
  /** human-readable list of the wiki-transport tokens actually stripped */
  strippedTemplates: string[];
  /** number of U+FFFD replacement characters removed (mid-word line-wrap artefacts) */
  replacementCharCount: number;
  /** short "before<U+FFFD>after" context for each U+FFFD removed */
  replacementContexts: string[];
}

/** `== [NN] optional rubric ==` heading line. */
const HEADING_RE = /^==\s*\[(\d+)\]\s*(.*?)\s*==[ \t]*$/gm;

/** Literal editorial lacuna mark printed in the edition, e.g. `<...>`. */
export const LACUNA_RE = /<\.\.\.>/g;

/**
 * Editorial angle-bracket supplement: `<…>` whose content has at least one
 * Latin letter (so `<...>` is NOT matched). Catches `<'ferus'>`,
 * `<albus, et>`, `<'est aliquod animal iustum'>`, `<im>`.
 */
export const ANGLE_SUPPLEMENT_RE = /<(?!\.\.\.>)[^<>]*[A-Za-z][^<>]*>/g;

export function parseLatinWikisource(wikitext: string): ParsedLatinWork {
  const stripped: string[] = [];
  let text = wikitext;

  // {{TextQuality|NN%}} / {{Textquality|NN%}} — anywhere (leading banner and/or
  // trailing quality tag).
  text = text.replace(/\{\{textquality\s*\|[^}]*\}\}/gi, (m) => {
    stripped.push(m.trim());
    return '';
  });

  // {{titulus2 … \n}} metadata template.
  text = text.replace(/\{\{titulus2[\s\S]*?\n\}\}/, () => {
    stripped.push('{{titulus2 …}}');
    return '';
  });

  // {{finis}}
  text = text.replace(/\{\{finis\}\}/gi, (m) => {
    stripped.push(m.trim());
    return '';
  });

  // <div class=text> wrapper (present on the Categoriae page, absent on the
  // De interpretatione page — optional).
  text = text.replace(/<div class=text>/i, () => {
    stripped.push('<div class=text>');
    return '';
  });

  // Truncate at the wrapper's closing </div>; everything after it (a stray
  // {{Textquality}} tag and the [[xx:…]] interwiki links) is scaffolding.
  const divEnd = text.indexOf('</div>');
  if (divEnd >= 0) {
    stripped.push('</div> + trailing interwiki links');
    text = text.slice(0, divEnd);
  }

  // Permitted repair: strip U+FFFD (mid-word line-wrap encoding artefact) and
  // join the word halves. Record every context.
  const replacementContexts: string[] = [];
  let replacementCharCount = 0;
  text = text.replace(/(\S*)�(\S*)/g, (_m, before: string, after: string) => {
    replacementCharCount += 1;
    replacementContexts.push(`${before}<U+FFFD>${after}`);
    return `${before}${after}`;
  });

  // Locate the chapter headings.
  const headings: { idx: number; len: number; token: string; rubric: string }[] = [];
  let hm: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;
  while ((hm = HEADING_RE.exec(text))) {
    headings.push({ idx: hm.index, len: hm[0].length, token: hm[1]!, rubric: (hm[2] ?? '').trim() });
  }

  const prefaceRegion = headings.length ? text.slice(0, headings[0]!.idx) : text;

  const chapters: LatinChapter[] = headings.map((h, i) => {
    const start = h.idx + h.len;
    const end = i + 1 < headings.length ? headings[i + 1]!.idx : text.length;
    const block = text.slice(start, end);
    const passages = block
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => cleanText(s))
      .filter((s) => s.length > 0);
    return {
      numberToken: h.token,
      number: String(Number(h.token)),
      rubric: h.rubric.length ? h.rubric : null,
      passages,
    };
  });

  return {
    chapters,
    prefaceRegion,
    strippedTemplates: stripped,
    replacementCharCount,
    replacementContexts,
  };
}
