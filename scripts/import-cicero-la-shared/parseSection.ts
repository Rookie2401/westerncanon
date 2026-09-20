/**
 * Shared Perseus-TEI section-body parser for the three Cicero rhetorica
 * importers that share the phi0474 corpus's markup conventions:
 *   scripts/import-de-oratore-la  (phi0474.phi037, book -> section)
 *   scripts/import-brutus-la      (phi0474.phi039, flat section)
 *   scripts/import-orator-la      (phi0474.phi040, flat section)
 *
 * Each importer isolates one `<div type="textpart" subtype="section" ...>`
 * element's INNER markup (everything between its opening tag and matching
 * `</div>`) and passes it to `parseSectionBody`. This module never sees the
 * book/section `<div>` boundaries themselves - that split is each
 * importer's own job (De Oratore also has a Book level; Brutus/Orator do
 * not).
 *
 * Tag handling (confirmed by direct inspection of all three raw XML files
 * fetched from PerseusDL/canonical-latinLit before writing this module -
 * not assumed):
 *   - <milestone unit="chapter" n="N"/> - a traditional Roman-numeral-cited
 *     chapter marker, coarser than and independent of Wilkins' own section
 *     numbering. Captured in document order (even inside a <del> span -
 *     still a genuine physical citation, same treatment as Bekker marks in
 *     scripts/import-aristotle-physics-grc), then the tag is dropped
 *     (zero-width transport scaffolding).
 *   - <note>...</note> - apparatus criticus (manuscript sigla / variant
 *     readings, e.g. "augebat L: augebam vulg."), Wilkins' own critical
 *     apparatus, NOT part of his printed running text. Dropped entirely,
 *     tag and content.
 *   - <del>...</del> - Wilkins' editorial deletion: words he judges
 *     spurious/interpolated and does not print as running text. Dropped
 *     entirely, tag and content (mirrors Ross's <del> in Physics).
 *   - <gap reason="omitted|lost" rend="..."/> - marks a real manuscript
 *     lacuna. Self-closing (no text content), so nothing is fabricated in
 *     its place: the tag is dropped and the occurrence (reason + rend,
 *     i.e. the row of dots the printed edition sets there) is logged
 *     individually to the caller's anomaly list, rather than silently
 *     inventing replacement dot characters from a presentational
 *     attribute.
 *   - <abbr>DIPLOMATIC<expan> <ex>EXPANSION</ex> </expan></abbr> - NOT the
 *     usual sibling <choice><abbr/><expan/></choice> pattern (confirmed:
 *     zero <choice> elements in any of the three files); here <expan> is
 *     nested INSIDE <abbr>, directly alongside the abbreviated form's own
 *     text. Printed running text is the abbreviation's own direct text
 *     only (confirmed against the visible parallel case in the title
 *     header "M.<expan><ex>Marci</ex></expan> Tvlli Ciceronis..." - the
 *     printed running head is plainly "M. Tvlli Ciceronis...", not "M.
 *     Marci Tvlli..."). So: the nested <expan>...</expan> (editorial
 *     gloss, e.g. "ausus es" expanding "ausu's") is dropped entirely, then
 *     the <abbr> tag itself is unwrapped, keeping only its own direct text
 *     ("ausu's"). Logged once per occurrence (rare: 2 in De Oratore, 0 in
 *     the flat two works' own section text).
 *   - <reg>, <add>, <sic>, <emph>, <foreign>, <title>, <name>, <num>,
 *     <hi>, <q>, <quote>, <l>, <lg> - pure typographic/structural wrappers
 *     around genuine printed text (regularised spelling, Wilkins' own
 *     incorporated addition, verse quotations from Ennius/Pacuvius etc.,
 *     untranslated Greek, small-caps numerals...). Unwrapped: tags
 *     stripped, all enclosed text kept verbatim.
 *   - <pb n="p.NNN"/>, <lb .../> - zero-width page/line-image breaks,
 *     stripped (this app cites by chapter milestone, not by OCT page).
 *
 * Faithfulness: no accent/spelling/punctuation normalisation of any kind;
 * only the above transport/apparatus handling. Entities decoded and
 * whitespace collapsed via cleanText (scripts/import-isagoge-shared/text.ts).
 */

import { cleanText } from '../import-isagoge-shared/text.ts';

export interface SectionGap {
  where: string;
  reason: string;
  rend: string;
}

export interface ParsedSection {
  /** the section's reading text: surviving <p>s joined with "\n\n" */
  text: string;
  /** <milestone unit="chapter"> values seen in this section, in document order */
  chapterMilestones: string[];
  /** individual lacuna markers found in this section */
  gaps: SectionGap[];
  /** counts, for corpus-level anomaly bookkeeping by the caller */
  counts: {
    notes: number;
    delSpans: number;
    delChars: number;
    abbrExpanDropped: number;
    emptyParagraphsDropped: number;
  };
}

/** Remove a specific paired tag ENTIRELY, content included. Non-nesting (verified: none of these tags nest in these three sources). */
function dropTag(s: string, tag: string): { out: string; count: number; chars: number } {
  const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  let count = 0;
  let chars = 0;
  const out = s.replace(re, (_whole, inner: string) => {
    count += 1;
    chars += inner.replace(/<[^>]+>/g, '').length;
    return '';
  });
  return { out, count, chars };
}

/** Strip a specific paired tag, KEEPING its inner content (and any nested markup, cleaned up later generically). */
function unwrapTag(s: string, tag: string): string {
  const openRe = new RegExp(`<${tag}(?:\\s+[^>]*)?>`, 'g');
  const closeRe = new RegExp(`</${tag}>`, 'g');
  return s.replace(openRe, '').replace(closeRe, '');
}

const UNWRAP_TAGS = ['reg', 'add', 'sic', 'emph', 'foreign', 'title', 'name', 'num', 'hi', 'q', 'quote', 'l', 'lg'];

export function parseSectionBody(bodyRaw: string, where: string, fail: (msg: string) => never): ParsedSection {
  // 1. Capture chapter milestones in document order BEFORE any removal - a
  //    milestone falling inside a <del> span is still a genuine citation.
  const chapterMilestones = [...bodyRaw.matchAll(/<milestone\s+n="([^"]+)"\s+unit="chapter"\s*\/>/g)].map(
    (m) => m[1]!,
  );

  // 2. Log + drop lacuna markers (no text content to lose; nothing fabricated in their place).
  const gaps: SectionGap[] = [];
  let s = bodyRaw.replace(/<gap\s+reason="([^"]*)"\s+rend="([^"]*)"\s*\/>/g, (_whole, reason: string, rend: string) => {
    gaps.push({ where, reason, rend });
    return '';
  });

  // 3. Drop apparatus-criticus <note>...</note> entirely.
  const noteResult = dropTag(s, 'note');
  s = noteResult.out;

  // 4. Drop editorial <del>...</del> entirely (may itself already have had an inner <note> removed above).
  const delResult = dropTag(s, 'del');
  s = delResult.out;

  // 5. abbr/expan: drop the nested editorial expansion, then unwrap the abbreviation tag itself.
  const expanResult = dropTag(s, 'expan');
  const abbrExpanDropped = expanResult.count;
  s = expanResult.out;
  s = unwrapTag(s, 'abbr');

  // 6. Zero-width transport scaffolding.
  s = s.replace(/<pb[^>]*\/>/g, '');
  s = s.replace(/<lb[^>]*\/>/g, '');
  s = s.replace(/<milestone[^>]*\/>/g, '');

  // 7. Pure typographic/structural wrappers - unwrap, keep text.
  for (const tag of UNWRAP_TAGS) s = unwrapTag(s, tag);

  // 8. Extract <p>...</p> paragraphs, clean each (stripping any stray tag defensively), drop empties.
  const pMatches = [...s.matchAll(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/g)];
  if (pMatches.length === 0) fail(`${where}: no <p> paragraphs found`);
  const cleanedAll = pMatches.map((m) => cleanText(m[1]!.replace(/<[^>]+>/g, ' ')));
  const cleaned = cleanedAll.filter((t) => t.length > 0);
  const emptyParagraphsDropped = cleanedAll.length - cleaned.length;
  if (cleaned.length === 0) fail(`${where}: all paragraphs empty after cleaning`);

  return {
    text: cleaned.join('\n\n'),
    chapterMilestones,
    gaps,
    counts: {
      notes: noteResult.count,
      delSpans: delResult.count,
      delChars: delResult.chars,
      abbrExpanDropped,
      emptyParagraphsDropped,
    },
  };
}
