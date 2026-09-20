/**
 * Shared English-side parser for the Cicero letters-selection importers.
 * All four Shuckburgh (perseus-eng1) sources share the same FLAT shape:
 * every letter is a direct child of `<body>`, keyed by an `n` attribute of
 * the form `text=<PREFIX>:book=<B>:letter=<L>` - confirmed by direct
 * inspection that NO other `<div>` ever nests inside or around a letter div
 * in these four files except, in the Ad Quintum Fratrem source specifically,
 * two wrapper divs `<div n="Q">...</div><div n="FR">...</div>` that between
 * them duplicate the ENTIRE work wholesale (see the Ad Quintum Fratrem
 * importer's own module doc for the investigation) - so a letter's content
 * can always be taken as the raw XML between its own opening tag and the
 * next letter div's opening tag (or the end of the body).
 *
 * Crucially, `<L>` is NOT always a plain traditional letter number: Shuckburgh
 * arranges the WHOLE correspondence in strict chronological order, and where
 * a single traditionally-numbered letter was in fact written/sent in more
 * than one sitting, this witness gives each sitting its own `<div>`, keyed
 * `letter=<N>.<section-range>` (e.g. "5.1-2", "5.2", "5.4" for traditional
 * letter 5) - confirmed against this source's own `<head>` apparatus, which
 * spells the correlation out explicitly (e.g. "(A XII, 5, §§ 1, 2)").
 * `assembleEnglishLetters` below reconstructs each traditional letter by
 * collecting every fragment div sharing its base number/lettered-suffix and
 * ordering them by the fragment's own leading section number - each fragment
 * becomes one Passage of the reconstructed Division, in that order.
 *
 * Faithfulness rules applied here:
 *   - verbatim English (Shuckburgh's own 1899-1900 translation) only.
 *   - `<head>` (Shuckburgh's own chronological numbering + a Perseus-added
 *     traditional-citation gloss) is NOT part of the letter and is dropped;
 *     this app generates its own book.letter citation - see types.ts.
 *   - `<opener><salute>...</salute><dateline>...</dateline></opener>` is
 *     captured separately as the fragment's sourceHeading candidate, not
 *     mixed into the passage text.
 *   - `<epigraph>` (an editorial headnote Perseus/Shuckburgh's editors add
 *     before some letters - biographical/contextual prose, not Cicero's or
 *     the correspondent's own words and not a heading line either) is
 *     excluded entirely, tag and content; counted and logged.
 *   - `<note>...</note>` (Shuckburgh's own translator/editor footnotes -
 *     commentary, cross-references, `<bibl>` citations) is discarded
 *     entirely, tag and content, mirroring this app's existing Rackham/
 *     Perseus footnote convention; `<bibl>` is otherwise never printed as
 *     running text in these four sources (confirmed by inspection) so no
 *     separate handling is needed for it outside a note.
 *   - `<foreign>`, `<quote>`/`<l>`/`<lg>` (verse), `<emph>`, `<title>`,
 *     `<placeName>` are pure typographic wrapper tags around genuine
 *     translated text - unwrapped, never dropped.
 *   - `<pb .../>`, `<milestone .../>` are self-closing transport scaffolding
 *     (page breaks) - dropped, no text lost.
 */

import { decodeEntities, collapseWs } from '../import-isagoge-shared/text.ts';

function cleanText(input: string): string {
  return collapseWs(decodeEntities(input));
}

export interface EnglishFragment {
  book: number;
  /** raw n= suffix after "letter=", e.g. "5.1-2", "18a", "19" */
  letterAttr: string;
  /** base traditional letter token (before any ".section-range" suffix), lower-cased, e.g. "5", "18a" */
  base: string;
  /** leading section number parsed from a ".section-range" suffix, or null when this div is not a fragment */
  fragStart: number | null;
  sourceHeading: string | null;
  text: string;
  hadEpigraph: boolean;
  docOrder: number;
}

export interface EnglishLetter {
  book: number;
  base: string;
  sourceHeading: string | null;
  /** one entry per underlying fragment div, in reconstructed (section-ascending) order */
  passages: string[];
  fragmentCount: number;
  /** every distinct non-empty sourceHeading seen across this letter's fragments, in the order used */
  allHeadings: string[];
  epigraphCount: number;
}

const BASE_RE = /^(\d+[a-zA-Z]?)(?:\.(.+))?$/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip a tag and everything up to and including its matching close, for a
 *  same-named tag that never nests within itself in this corpus (verified
 *  by inspection for epigraph/note/opener/head in these four sources). */
function extractAndStrip(xml: string, tag: string): { stripped: string; contents: string[] } {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
  const contents: string[] = [];
  const stripped = xml.replace(re, (_whole, inner: string) => {
    contents.push(inner);
    return '';
  });
  return { stripped, contents };
}

/** Remove all tags, decode entities, collapse whitespace - for text already
 *  known to carry no <note>/<epigraph> apparatus (those are stripped by the
 *  caller first). */
function textOnly(xml: string): string {
  return cleanText(xml.replace(/<[^>]+>/g, ' '));
}

export function parseEnglishLetters(xml: string, prefix: string): { fragments: EnglishFragment[]; totalNotes: number } {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.lastIndexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) throw new Error('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const openRe = new RegExp(`<div n="text=${escapeRe(prefix)}:book=(\\d+):letter=([^"]+)" type="letter"[^>]*>`, 'g');
  const opens: { index: number; end: number; book: number; letterAttr: string }[] = [];
  let om: RegExpExecArray | null;
  while ((om = openRe.exec(body))) {
    opens.push({ index: om.index, end: om.index + om[0].length, book: Number(om[1]), letterAttr: om[2]! });
  }
  if (opens.length === 0) throw new Error(`no letter divs found for prefix "${prefix}"`);

  let totalNotes = 0;
  const fragments: EnglishFragment[] = [];

  opens.forEach((o, i) => {
    const contentEnd = i + 1 < opens.length ? opens[i + 1]!.index : body.length;
    let inner = body.slice(o.end, contentEnd);
    // Strip any stray <div ...> / </div> tags (wrapper boundaries only - a
    // real letter body never legitimately contains a nested <div> in these
    // four sources, confirmed by inspection; see module doc for the Ad
    // Quintum Fratrem Q/FR wrapper-duplication case this guards against).
    inner = inner.replace(/<\/?div\b[^>]*>/g, ' ');

    // notes (translator/editor apparatus) - discard entirely.
    const noteStrip = extractAndStrip(inner, 'note');
    totalNotes += noteStrip.contents.length;
    inner = noteStrip.stripped;

    // epigraph (editorial headnote) - discard entirely, but count.
    const epigraphStrip = extractAndStrip(inner, 'epigraph');
    inner = epigraphStrip.stripped;

    // opener -> sourceHeading candidate (salute + dateline, in printed order).
    const openerStrip = extractAndStrip(inner, 'opener');
    inner = openerStrip.stripped;
    let sourceHeading: string | null = null;
    if (openerStrip.contents.length > 0) {
      const openerXml = openerStrip.contents[0]!;
      const salute = /<salute\b[^>]*>([\s\S]*?)<\/salute>/.exec(openerXml);
      const dateline = /<dateline\b[^>]*>([\s\S]*?)<\/dateline>/.exec(openerXml);
      const parts = [salute?.[1], dateline?.[1]].filter((s): s is string => !!s).map((s) => textOnly(s)).filter((s) => s.length > 0);
      sourceHeading = parts.length > 0 ? parts.join(' — ') : null;
    }

    // head - discard (this app generates its own citation).
    inner = extractAndStrip(inner, 'head').stripped;

    const text = textOnly(inner);

    const baseMatch = BASE_RE.exec(o.letterAttr);
    if (!baseMatch) throw new Error(`letter attr "${o.letterAttr}" (book ${o.book}) does not match the expected NN[a] or NN.suffix shape`);
    const base = baseMatch[1]!.toLowerCase();
    let fragStart: number | null = null;
    if (baseMatch[2] !== undefined) {
      const startMatch = /^(\d+)/.exec(baseMatch[2]);
      fragStart = startMatch ? Number(startMatch[1]) : 0;
    }

    fragments.push({
      book: o.book,
      letterAttr: o.letterAttr,
      base,
      fragStart,
      sourceHeading,
      text,
      hadEpigraph: epigraphStrip.contents.length > 0,
      docOrder: i,
    });
  });

  return { fragments, totalNotes };
}

export interface AssembleResult {
  /** key = `${book}.${base}` */
  byKey: Map<string, EnglishLetter>;
  byBook: Map<number, string[]>;
  duplicateFragmentsDropped: { key: string; letterAttr: string }[];
}

/** Reconstructs traditional letters from possibly-fragmented flat divs. A
 *  key seen more than once with byte-identical letterAttr+text (the Ad
 *  Quintum Fratrem Q/FR wholesale duplication) is deduplicated, keeping the
 *  first (lowest docOrder) occurrence; a genuine content difference would be
 *  kept as a distinct extra fragment instead (none observed - see the
 *  per-work importer's own anomalies). */
export function assembleEnglishLetters(fragments: EnglishFragment[]): AssembleResult {
  const byRawKey = new Map<string, EnglishFragment[]>(); // key = book.letterAttr (exact, pre-merge)
  for (const f of fragments) {
    const rawKey = `${f.book}.${f.letterAttr}`;
    if (!byRawKey.has(rawKey)) byRawKey.set(rawKey, []);
    byRawKey.get(rawKey)!.push(f);
  }

  const duplicateFragmentsDropped: { key: string; letterAttr: string }[] = [];
  const dedupedFragments: EnglishFragment[] = [];
  for (const [rawKey, list] of byRawKey) {
    if (list.length === 1) {
      dedupedFragments.push(list[0]!);
      continue;
    }
    const first = list[0]!;
    const allIdentical = list.every((f) => f.text === first.text && f.sourceHeading === first.sourceHeading);
    dedupedFragments.push(first);
    for (let i = 1; i < list.length; i++) {
      duplicateFragmentsDropped.push({ key: rawKey, letterAttr: list[i]!.letterAttr });
    }
    if (!allIdentical) {
      // Keep every distinct variant as its own passage-order-preserving entry
      // rather than silently discarding a genuine difference; flagged by the
      // caller via duplicateFragmentsDropped having a non-identical member.
      for (let i = 1; i < list.length; i++) dedupedFragments.push(list[i]!);
    }
  }

  const byKey = new Map<string, EnglishLetter>();
  const byBook = new Map<number, string[]>();
  const groups = new Map<string, EnglishFragment[]>(); // key = book.base
  for (const f of dedupedFragments) {
    const key = `${f.book}.${f.base}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  for (const [key, group] of groups) {
    const ordered = [...group].sort((a, b) => {
      const aStart = a.fragStart ?? -1;
      const bStart = b.fragStart ?? -1;
      if (aStart !== bStart) return aStart - bStart;
      return a.docOrder - b.docOrder;
    });
    const first = ordered[0]!;
    const headings = ordered.map((f) => f.sourceHeading).filter((h): h is string => !!h);
    const uniqueHeadings = [...new Set(headings)];
    const letter: EnglishLetter = {
      book: first.book,
      base: first.base,
      sourceHeading: uniqueHeadings[0] ?? null,
      passages: ordered.map((f) => f.text).filter((t) => t.length > 0),
      fragmentCount: ordered.length,
      allHeadings: uniqueHeadings,
      epigraphCount: ordered.reduce((n, f) => n + (f.hadEpigraph ? 1 : 0), 0),
    };
    byKey.set(key, letter);
    if (!byBook.has(first.book)) byBook.set(first.book, []);
    byBook.get(first.book)!.push(first.base);
  }

  return { byKey, byBook, duplicateFragmentsDropped };
}
