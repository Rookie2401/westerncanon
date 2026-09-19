/**
 * Parser for the Perseus/OpenGreekAndLatin canonical-greekLit TEI of
 * Aristotle's Metaphysics (tlg0086.tlg025.perseus-grc2.xml, W. D. Ross's
 * 1924 OCT). Used by scripts/import-aristotle-metaphysics-grc/index.ts.
 *
 * Structure (verified by direct inspection of the fetched file, not
 * assumed): <text><body><div type="edition"> holds 14
 * <div type="textpart" subtype="book" n="N"> (book 1..14), each holding a
 * FLAT sequence of <div type="textpart" subtype="section" n="M"> - Perseus
 * calls this level "section" but it is Aristotle's own chapter numbering
 * within the book (142 total across the 14 books) - each holding one or
 * more <p> paragraphs. No deeper nesting.
 *
 * Full tag census of <body> (every tag enumerated before writing this
 * parser): div, p, milestone, del, add, quote, l, lb, gap, bibl. The parser
 * fails loudly on anything else rather than silently passing it through.
 *
 *   - <milestone unit="page" resp="Bekker" n="980a"/> and
 *     <milestone resp="Bekker" unit="line" n="21"/> (self-closing, no text
 *     content - pure scaffolding). Attribute order differs between the two
 *     kinds (unit-before-resp for page, resp-before-unit for line), and one
 *     single line-milestone in the whole file prints unit="Line" (capital
 *     L) rather than "line" - a transcription slip in the source, harmless
 *     here since ALL milestones are stripped as zero-width and only the
 *     unit="page" ones (order/case-independent lookahead match) are used to
 *     build each chapter's Division.ref, as a "<first page>–<last page>"
 *     range (or a single value) from the unit="page" values that fall
 *     inside that chapter's own <p> elements, in document order - a chapter
 *     with none gets Division.ref = null (flagged as an anomaly; not
 *     expected to occur but checked for, not assumed away).
 *   - <del>...</del> (editorially deleted/spurious text, judged so by Ross):
 *     EXCLUDED from the reading text, matching this repo's established
 *     Euclid/Homer convention - every occurrence logged verbatim to
 *     anomalies.json rather than silently dropped. Confirmed by direct
 *     inspection: never nested inside <add>/<quote>/<l>/<bibl> and never
 *     contains a unit="page" milestone, so excluding it never loses a page
 *     boundary.
 *   - <add>...</add> (Ross's own conjectural insertions, printed in the
 *     OCT): KEPT verbatim in the reading text, matching the same Euclid/
 *     Homer convention for <add> - every occurrence logged, and the
 *     containing Passage gets an `anomaly` note. One <add> is nested inside
 *     a <quote><l>...</l></quote> (a quoted verse fragment) - handled the
 *     same way regardless of context.
 *   - <quote>...</quote> and <l met="...">...</l> (direct quotations of
 *     other authors - Simonides, Parmenides, Hesiod, Empedocles - some
 *     prose, some verse via nested <l> lines): these are genuinely
 *     Aristotle's own text (quoting someone else within his argument), so
 *     only the tags are stripped; their words are kept as ordinary reading
 *     prose. <lb/> (one occurrence, a line break inside an inline prose
 *     quote) is zero-width, replaced with a space so words don't merge.
 *   - <gap reason="ellipsis" rend=" . . . "/> (one occurrence, inside a
 *     quoted verse line): the edition itself prints an ellipsis at this
 *     point (eliding part of the quoted fragment) - kept as literal " . . .
 *     " text (the source's own `rend` value), not silently dropped, per
 *     this repo's "only scaffolding is removed, never content" rule; logged
 *     as an anomaly since it is a non-Aristotelian editorial mark.
 *   - <bibl n="...">...</bibl> (ten occurrences - modern editorial fragment
 *     citations added by the TEI encoder, e.g. "Parmenides Fr. 13 (Diels)"
 *     identifying a quotation's source by Diels-Kranz numbering; Aristotle
 *     did not write these, they are apparatus like a footnote citation):
 *     EXCLUDED (tag and content both), every occurrence logged verbatim.
 */

import { cleanText } from '../import-aristotle-shared/text.ts';

export interface Anomaly {
  where: string;
  note: string;
}

/** Trim a verbatim excerpt for an anomaly note (never used for reading text itself). */
function excerpt(s: string, max = 160): string {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
}

export interface ParsedPassage {
  text: string;
  anomaly?: string;
}

export interface ParsedChapter {
  number: number;
  /** unit="page" Bekker values found inside this chapter, in document order (e.g. ["980a","980b","981a"]). */
  pageMarkers: string[];
  passages: ParsedPassage[];
}

export interface ParsedBook {
  number: number;
  chapters: ParsedChapter[];
}

export interface GrcParseResult {
  books: ParsedBook[];
  anomalies: Anomaly[];
  totalDelSpans: number;
  totalAddSpans: number;
  totalBiblCitations: number;
  totalGaps: number;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (metaphysics-grc parser): ${msg}\n`);
  process.exit(1);
}

const KNOWN_TAGS = new Set(['div', 'p', 'milestone', 'del', 'add', 'quote', 'l', 'lb', 'gap', 'bibl']);

const BOOK_DIV_RE =
  /<div\b(?=[^>]*\btype="textpart")(?=[^>]*\bsubtype="book")(?=[^>]*\bn="(\d+)")[^>]*>/g;
const SECTION_DIV_RE =
  /<div\b(?=[^>]*\btype="textpart")(?=[^>]*\bsubtype="section")(?=[^>]*\bn="(\d+)")[^>]*>/g;
const PARA_RE = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g;
const PAGE_MILESTONE_RE =
  /<milestone\b(?=[^>]*\bunit="page")(?=[^>]*\bresp="Bekker")(?=[^>]*\bn="([^"]+)")[^>]*\/>/g;
const ANY_MILESTONE_RE = /<milestone\b[^>]*\/>/g;

export function parseGrc(xml: string): GrcParseResult {
  const anomalies: Anomaly[] = [];
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalBiblCitations = 0;
  let totalGaps = 0;

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  // --- coverage check: fail on any tag this parser doesn't already know about ---
  {
    const tagRe = /<\/?([a-zA-Z]+)\b[^>]*>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(body))) {
      if (tm[1] === 'text' || tm[1] === 'body') continue;
      if (!KNOWN_TAGS.has(tm[1])) {
        fail(`unexpected tag <${tm[1]}> in the source - inspect before proceeding`);
      }
    }
  }

  // --- locate all 14 Book divs ---------------------------------------
  const bookOpens: { index: number; contentStart: number; n: number }[] = [];
  {
    const re = new RegExp(BOOK_DIV_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      bookOpens.push({ index: m.index, contentStart: re.lastIndex, n: Number(m[1]) });
    }
  }
  if (bookOpens.length !== 14) fail(`expected exactly 14 Book divs, found ${bookOpens.length}`);
  bookOpens.forEach((b, i) => {
    if (b.n !== i + 1) fail(`Book divs are not in sequential 1..14 order - position ${i + 1} has n="${b.n}"`);
  });

  const books: ParsedBook[] = [];

  for (let bi = 0; bi < bookOpens.length; bi++) {
    const { contentStart, n: bookNum } = bookOpens[bi]!;
    const contentEnd = bi + 1 < bookOpens.length ? bookOpens[bi + 1]!.index : body.length;
    const bookContent = body.slice(contentStart, contentEnd);

    // --- locate all section (=chapter) divs within this book -----------
    const sectionOpens: { index: number; contentStart: number; n: number }[] = [];
    {
      const re = new RegExp(SECTION_DIV_RE.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(bookContent))) {
        sectionOpens.push({ index: m.index, contentStart: re.lastIndex, n: Number(m[1]) });
      }
    }
    if (sectionOpens.length === 0) fail(`book-${bookNum}: no section (chapter) divs found`);
    sectionOpens.forEach((s, i) => {
      if (s.n !== i + 1) {
        fail(`book-${bookNum}: section divs are not in sequential 1..N order - position ${i + 1} has n="${s.n}"`);
      }
    });

    const chapters: ParsedChapter[] = [];

    for (let si = 0; si < sectionOpens.length; si++) {
      const { contentStart: sStart, n: chNum } = sectionOpens[si]!;
      const sEnd = si + 1 < sectionOpens.length ? sectionOpens[si + 1]!.index : bookContent.length;
      const sectionContent = bookContent.slice(sStart, sEnd);
      const where = `metaphysics-grc / book-${bookNum}-ch-${chNum}`;

      const pageMarkers: string[] = [];
      const passages: ParsedPassage[] = [];

      const paraRe = new RegExp(PARA_RE.source, 'g');
      let pm: RegExpExecArray | null;
      while ((pm = paraRe.exec(sectionContent))) {
        let inner = pm[1]!;

        // record unit="page" Bekker markers in document order (before any stripping)
        {
          const re = new RegExp(PAGE_MILESTONE_RE.source, 'g');
          let mm: RegExpExecArray | null;
          while ((mm = re.exec(inner))) pageMarkers.push(mm[1]!);
        }

        // strip ALL milestones (page + line, zero-width scaffolding)
        inner = inner.replace(new RegExp(ANY_MILESTONE_RE.source, 'g'), '');

        // <bibl n="...">CONTENT</bibl> - editorial fragment citation, excluded entirely
        inner = inner.replace(/<bibl\b[^>]*>([\s\S]*?)<\/bibl>/g, (_whole, content: string) => {
          totalBiblCitations += 1;
          anomalies.push({
            where,
            note: `<bibl> editorial fragment citation excluded from the reading text (not Aristotle's own words - a modern citation added by the TEI encoder): "${excerpt(cleanText(content))}"`,
          });
          return '';
        });

        // <gap reason="ellipsis" rend="..."/> - kept as the printed literal ellipsis
        inner = inner.replace(/<gap\b(?=[^>]*\breason="ellipsis")(?=[^>]*\brend="([^"]*)")[^>]*\/>/g, (_whole, rend: string) => {
          totalGaps += 1;
          anomalies.push({
            where,
            note: `<gap reason="ellipsis"> inside a quoted verse fragment - the edition itself prints an ellipsis here; kept as the literal printed text ${JSON.stringify(rend)}, not silently dropped.`,
          });
          return rend;
        });

        // <lb/> inside an inline quote - zero-width line break, replace with a space
        inner = inner.replace(/<lb\s*\/>/g, ' ');

        // <del>...</del> - editorially deleted text, excluded, logged verbatim
        let hasAdd = false;
        const addExcerpts: string[] = [];
        inner = inner.replace(/<del\b[^>]*>([\s\S]*?)<\/del>/g, (_whole, delText: string) => {
          totalDelSpans += 1;
          anomalies.push({
            where,
            note: `<del> excluded from the reading text (editorially judged spurious/interpolated by Ross): "${excerpt(cleanText(delText))}"`,
          });
          return '';
        });

        // <add>...</add> - editorial insertion, kept verbatim, logged
        inner = inner.replace(/<add\b[^>]*>([\s\S]*?)<\/add>/g, (_whole, addText: string) => {
          totalAddSpans += 1;
          hasAdd = true;
          const cleaned = cleanText(addText);
          addExcerpts.push(cleaned);
          anomalies.push({
            where,
            note: `<add> editorial insertion (Ross's own conjecture) kept verbatim in the reading text: "${excerpt(cleaned)}"`,
          });
          return addText;
        });

        // unwrap <quote ...> and <l ...> - keep content, drop tags (genuine quoted text)
        inner = inner.replace(/<\/?quote\b[^>]*>/g, '');
        inner = inner.replace(/<\/?l\b[^>]*>/g, '');

        const cleaned = cleanText(inner);
        if (cleaned.length === 0) {
          anomalies.push({ where, note: 'a <p> cleaned to empty text (transport scaffolding only, e.g. a fully-<del> paragraph); skipped rather than emitted empty' });
          continue;
        }
        const passage: ParsedPassage = { text: cleaned };
        if (hasAdd) {
          passage.anomaly = `contains editorial insertion${addExcerpts.length > 1 ? 's' : ''} <add> kept verbatim: ${addExcerpts.map((t) => `"${t}"`).join(', ')}`;
        }
        passages.push(passage);
      }

      if (passages.length === 0) fail(`${where}: no surviving passages`);

      chapters.push({ number: chNum, pageMarkers, passages });
    }

    books.push({ number: bookNum, chapters });
  }

  return { books, anomalies, totalDelSpans, totalAddSpans, totalBiblCitations, totalGaps };
}
