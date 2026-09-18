/**
 * Shared Perseus/OpenGreekAndLatin `canonical-greekLit` TEI parser for the
 * Greek Iliad (tlg0012.tlg001.perseus-grc2.xml) and Odyssey
 * (tlg0012.tlg002.perseus-grc2.xml), both the Monro/Allen OCT text. Used by
 * scripts/import-homer-iliad-grc/index.ts and
 * scripts/import-homer-odyssey-grc/index.ts.
 *
 * Structure (verified by direct inspection of both fetched files, not
 * assumed): 24 `<div type="textpart" subtype="Book" n="N">` per work, each
 * holding a FLAT sequence of `<l n="N">verse text</l>` lines in reading
 * order - no nesting below the Book div in either source (confirmed: the
 * only <div> elements in the whole <text>...</text> body are the 24 Book
 * divs plus one outer edition-wrapper div). Attribute order and the
 * "Book"/"book" case differ between the two works - the Iliad prints
 * `type="textpart" subtype="Book" n="N"`, the Odyssey prints
 * `n="N" type="textpart" subtype="book"` - so the book-div matcher below
 * uses independent lookaheads for each attribute rather than a fixed order,
 * exactly like scripts/import-euclid/index.ts already has to for its own
 * source's attribute-order quirks.
 *
 * Other markup actually present in the source (every tag inside <text> was
 * enumerated before writing this parser - see the tag census in the import
 * session): `<milestone .../>` (self-closing page/paragraph-break artifacts
 * of the printed OCT edition, no text content - pure scaffolding, discarded),
 * `<q>...</q>` (a speech-quotation wrapper spanning a run of <l> lines - kept
 * text, dropped tag; since it never fully nests inside a single <l>, it only
 * matters where it happens to start/end mid-line), `<del>...</del>` (a small
 * number of lines the OCT editors judged spurious/interpolated - see below),
 * and one `<note resp="perseus">...</note>` (a Perseus transcriber's note
 * flagging a genuine gap in this edition's own line numbering, not Homer's
 * text - stripped, logged as an anomaly, never treated as reading text). No
 * other tag occurs; the parser fails loudly if it ever finds one, rather than
 * silently passing unknown markup through into the reading text.
 *
 * <del> handling mirrors this repo's established Euclid convention (see
 * scripts/import-euclid/index.ts's own doc comment): editorially-deleted
 * text is EXCLUDED from the reading text, every occurrence logged verbatim
 * to anomalies.json rather than silently dropped. In this source every
 * <del> found wraps a line's content in its entirety (`<l n="548"><del>...`
 * `</del></l>`) - there is no case of a <del> spanning only part of a line.
 */

import type { Anomaly } from './util.ts';
import { cleanText, excerpt, fail } from './util.ts';
import type { Division } from './types.ts';

export interface GrcParseResult {
  divisions: Division[];
  anomalies: Anomaly[];
  totalLines: number;
  totalDelLines: number;
  totalNoteGaps: number;
}

const BOOK_DIV_RE =
  /<div\b(?=[^>]*\btype="textpart")(?=[^>]*\bsubtype="[Bb]ook")(?=[^>]*\bn="(\d+)")[^>]*>/g;
const LINE_RE = /<l\s+n="([^"]*)"[^>]*>([\s\S]*?)<\/l>/g;
const NOTE_GAP_RE = /<note\s+resp="perseus"[^>]*>([\s\S]*?)<\/note>/g;
// 'div' is expected here too: each book's own slice runs up to the next
// book's opening tag (or end of body for the last book), so it always
// includes this book's own closing </div> - and, for the very last book,
// the outer edition-wrapper's closing </div> as well.
const KNOWN_TAGS = new Set(['div', 'body', 'l', 'q', 'del', 'milestone', 'note']);

export function parseGrc(xml: string, workLabel: string): GrcParseResult {
  const anomalies: Anomaly[] = [];

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail(`${workLabel}: no <text>...</text> found in source XML`);
  const body = xml.slice(textStart, textEnd);

  // --- locate all 24 Book divs -------------------------------------------
  const bookOpens: { index: number; contentStart: number; n: number }[] = [];
  {
    const re = new RegExp(BOOK_DIV_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      bookOpens.push({ index: m.index, contentStart: re.lastIndex, n: Number(m[1]) });
    }
  }
  if (bookOpens.length !== 24) {
    fail(`${workLabel}: expected exactly 24 Book divs, found ${bookOpens.length}`);
  }
  bookOpens.forEach((b, i) => {
    if (b.n !== i + 1) {
      fail(`${workLabel}: Book divs are not in sequential 1..24 order - position ${i + 1} has n="${b.n}"`);
    }
  });

  const divisions: Division[] = [];
  let totalLines = 0;
  let totalDelLines = 0;
  let totalNoteGaps = 0;

  for (let i = 0; i < bookOpens.length; i++) {
    const { contentStart, n: bookNum } = bookOpens[i];
    const contentEnd = i + 1 < bookOpens.length ? bookOpens[i + 1].index : body.length;
    const content = body.slice(contentStart, contentEnd);
    const where = `${workLabel} / book-${bookNum}`;

    // --- coverage check: fail on any tag this parser doesn't already know about ---
    {
      const tagRe = /<\/?([a-zA-Z]+)\b[^>]*>/g;
      let tm: RegExpExecArray | null;
      while ((tm = tagRe.exec(content))) {
        if (!KNOWN_TAGS.has(tm[1])) {
          fail(`${where}: unexpected tag <${tm[1]}> in the source - inspect before proceeding (parser only knows l/q/del/milestone/note)`);
        }
      }
    }

    // --- genuine source-internal line-numbering gaps (Perseus transcriber notes) ---
    {
      const re = new RegExp(NOTE_GAP_RE.source, 'g');
      let nm: RegExpExecArray | null;
      while ((nm = re.exec(content))) {
        totalNoteGaps += 1;
        anomalies.push({
          where,
          note: `Perseus transcriber's note in the source (not Homer's text, stripped from the reading text): "${cleanText(nm[1])}"`,
        });
      }
    }

    // --- extract every <l> line ---------------------------------------
    const allLineNs: number[] = [];
    const passageLines: string[] = [];
    {
      const re = new RegExp(LINE_RE.source, 'g');
      let lm: RegExpExecArray | null;
      while ((lm = re.exec(content))) {
        const nRaw = lm[1];
        let inner = lm[2];
        totalLines += 1;

        const nNum = Number(nRaw);
        if (Number.isFinite(nNum)) allLineNs.push(nNum);

        // strip self-closing print-layout milestones (no text content)
        inner = inner.replace(/<milestone\b[\s\S]*?\/>/g, '');
        // unwrap the speech-quotation wrapper (keep text, drop tag)
        inner = inner.replace(/<\/?q>/g, '');

        // a <del> that wraps this line's entire surviving content: excluded
        // from the reading text, logged verbatim (matches the Euclid <del>
        // convention - see this file's doc comment)
        const wholeDel = /^\s*<del>([\s\S]*)<\/del>\s*$/.exec(inner);
        if (wholeDel) {
          totalDelLines += 1;
          anomalies.push({
            where,
            note: `line ${nRaw}: <del> excluded from the reading text (editorially judged spurious/interpolated in the OCT text): "${excerpt(cleanText(wholeDel[1]))}"`,
          });
          continue;
        }
        // defensive fallback: a <del> covering only part of the line - not
        // seen anywhere in either source as of this importer being written,
        // but handled honestly (excerpt excluded, logged) rather than
        // silently left as literal <del> tags in the reading text.
        if (/<del>/.test(inner)) {
          inner = inner.replace(/<del>([\s\S]*?)<\/del>/g, (_whole, delText: string) => {
            totalDelLines += 1;
            anomalies.push({
              where,
              note: `line ${nRaw}: partial <del> within the line excluded from the reading text: "${excerpt(cleanText(delText))}"`,
            });
            return '';
          });
        }

        const cleaned = cleanText(inner);
        if (cleaned.length === 0) {
          anomalies.push({ where, note: `line ${nRaw}: cleaned to empty text (no <del>); skipped rather than emitted empty` });
          continue;
        }
        passageLines.push(cleaned);
      }
    }

    if (passageLines.length === 0) fail(`${where}: no surviving verse lines - investigate before proceeding`);

    const ref = allLineNs.length > 0 ? `${Math.min(...allLineNs)}–${Math.max(...allLineNs)}` : null;

    divisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: passageLines.join('\n'), ref: null }],
    });
  }

  return { divisions, anomalies, totalLines, totalDelLines, totalNoteGaps };
}
