/**
 * Shared Perseus/OpenGreekAndLatin `canonical-greekLit` TEI parser for A. T.
 * Murray's Loeb prose translation of the Iliad
 * (tlg0012.tlg001.perseus-eng3.xml) and Odyssey
 * (tlg0012.tlg002.perseus-eng3.xml). Used by
 * scripts/import-homer-iliad-en/index.ts and
 * scripts/import-homer-odyssey-en/index.ts.
 *
 * Structure (verified by direct inspection of both fetched files): 24
 * `<div type="textpart" subtype="book" n="N">`, each holding several nested
 * `<div type="textpart" subtype="card" n="N">` - a Loeb print-pagination
 * artefact, confirmed by an exact 1:1 count of card divs to <p> paragraphs in
 * both files (425 cards/paragraphs in the Iliad, 288 in the Odyssey) - never
 * meaningful structure, so card boundaries are discarded entirely and every
 * book's paragraphs are simply concatenated in document order. (The parser
 * does not assume exactly one <p> per card - it walks every <p> found inside
 * each card's own span - but that is what both sources actually contain.)
 *
 * Inline markup actually present (every tag inside <text> was enumerated
 * before writing this parser): `<milestone n="N" unit="line"/>` (Loeb's
 * marginal cross-reference to the corresponding GREEK verse line - no text
 * content, discarded, but its `n` is used to compute each Book's own printed
 * line-range `ref`, same citation the Greek uses), `<note resp="Loeb">N
 * </note>` (Murray's own footnote-marker digits, Loeb apparatus rather than
 * Homer's text - stripped, tag AND content), `<quote>...</quote>` (direct
 * speech - kept text, dropped tag; present only in the Iliad file, absent
 * from the Odyssey file, which is not itself an anomaly, just how this
 * source is marked up), `<placeName key="...">Name</placeName>` (kept text,
 * dropped tag/key), and `<corr resp="perseus">...</corr>` (Perseus's own
 * transcription correction of a probable source error - kept text, dropped
 * tag, individually logged since it is a rare, genuinely notable edit baked
 * into the digital edition rather than Murray's own wording; 1 occurrence
 * total, in the Iliad). No other tag occurs; the parser fails loudly on
 * any tag it doesn't already know about rather than silently passing it
 * through, or silently dropping/altering Murray's actual prose.
 */

import type { Anomaly } from './util.ts';
import { cleanText, fail } from './util.ts';
import type { Division } from './types.ts';

export interface EnParseResult {
  divisions: Division[];
  anomalies: Anomaly[];
  totalCards: number;
  totalParagraphs: number;
  totalNotes: number;
  totalCorrections: number;
}

const BOOK_DIV_RE =
  /<div\b(?=[^>]*\btype="textpart")(?=[^>]*\bsubtype="[Bb]ook")(?=[^>]*\bn="(\d+)")[^>]*>/g;
const CARD_DIV_RE =
  /<div\b(?=[^>]*\btype="textpart")(?=[^>]*\bsubtype="[Cc]ard")(?=[^>]*\bn="(\d+)")[^>]*>/g;
const PARA_RE = /<p>([\s\S]*?)<\/p>/g;
const NOTE_RE = /<note\b[\s\S]*?<\/note>/g;
const MILESTONE_RE = /<milestone\b[\s\S]*?\bn="(\d+)"[\s\S]*?\/>/g;
const MILESTONE_STRIP_RE = /<milestone\b[\s\S]*?\/>/g;
/** wrapper tags whose TEXT is kept and TAG dropped */
const UNWRAP_TAGS = ['quote', 'placeName', 'said'];
// 'body' is expected too: the last book's own slice runs to the end of the
// document, which includes the outer </body> closing tag.
const KNOWN_TAGS = new Set(['div', 'body', 'p', 'milestone', 'note', 'quote', 'placeName', 'corr', 'said']);

export function parseEn(xml: string, workLabel: string): EnParseResult {
  const anomalies: Anomaly[] = [];

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail(`${workLabel}: no <text>...</text> found in source XML`);
  const body = xml.slice(textStart, textEnd);

  const bookOpens: { index: number; contentStart: number; n: number }[] = [];
  {
    const re = new RegExp(BOOK_DIV_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      bookOpens.push({ index: m.index, contentStart: re.lastIndex, n: Number(m[1]) });
    }
  }
  if (bookOpens.length !== 24) fail(`${workLabel}: expected exactly 24 Book divs, found ${bookOpens.length}`);
  bookOpens.forEach((b, i) => {
    if (b.n !== i + 1) fail(`${workLabel}: Book divs are not in sequential 1..24 order - position ${i + 1} has n="${b.n}"`);
  });

  const divisions: Division[] = [];
  let totalCards = 0;
  let totalParagraphs = 0;
  let totalNotes = 0;
  let totalCorrections = 0;

  for (let bi = 0; bi < bookOpens.length; bi++) {
    const { contentStart, n: bookNum } = bookOpens[bi];
    const bookEnd = bi + 1 < bookOpens.length ? bookOpens[bi + 1].index : body.length;
    const bookContent = body.slice(contentStart, bookEnd);
    const where = `${workLabel} / book-${bookNum}`;

    // --- coverage check ---
    {
      const tagRe = /<\/?([a-zA-Z]+)\b[^>]*>/g;
      let tm: RegExpExecArray | null;
      while ((tm = tagRe.exec(bookContent))) {
        if (!KNOWN_TAGS.has(tm[1])) {
          fail(`${where}: unexpected tag <${tm[1]}> in the source - inspect before proceeding`);
        }
      }
    }

    // --- locate card divs (print-pagination only; boundaries discarded) ---
    const cardOpens: { index: number; contentStart: number; n: number }[] = [];
    {
      const re = new RegExp(CARD_DIV_RE.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(bookContent))) {
        cardOpens.push({ index: m.index, contentStart: re.lastIndex, n: Number(m[1]) });
      }
    }
    if (cardOpens.length === 0) fail(`${where}: no card divs found`);
    totalCards += cardOpens.length;

    const lineNs: number[] = [];
    const paragraphs: string[] = [];

    for (let ci = 0; ci < cardOpens.length; ci++) {
      const { contentStart: cStart } = cardOpens[ci];
      const cardEnd = ci + 1 < cardOpens.length ? cardOpens[ci + 1].index : bookContent.length;
      let cardText = bookContent.slice(cStart, cardEnd);

      // capture milestone line numbers (this book's own printed line range),
      // then strip them - no text content of their own
      {
        const re = new RegExp(MILESTONE_RE.source, 'g');
        let mm: RegExpExecArray | null;
        while ((mm = re.exec(cardText))) {
          const n = Number(mm[1]);
          if (Number.isFinite(n)) lineNs.push(n);
        }
      }
      // Replaced with a space, not '': the source sometimes butts a milestone
      // directly against adjoining text with no whitespace at all (e.g.
      // "...accept the ransom<milestone n="20" unit="line"/>out of reverence"
      // in Iliad 1.20, confirmed by direct inspection), which an empty-string
      // strip would fuse into "ransomout". cleanText's whitespace-collapse
      // below absorbs the extra space where the source already had one.
      cardText = cardText.replace(MILESTONE_STRIP_RE, ' ');

      // strip Loeb footnote markers entirely (tag + content - translator's apparatus, not Homer's/Murray's text)
      cardText = cardText.replace(NOTE_RE, () => {
        totalNotes += 1;
        return '';
      });

      // Perseus's own transcription corrections: keep the corrected text, log it
      cardText = cardText.replace(/<corr\b[^>]*>([\s\S]*?)<\/corr>/g, (_whole, inner: string) => {
        totalCorrections += 1;
        anomalies.push({
          where,
          note: `<corr resp="perseus"> transcription correction in the source, kept verbatim in the reading text: "${cleanText(inner)}"`,
        });
        return inner;
      });

      // unwrap remaining known wrapper tags (keep text, drop tag)
      for (const tag of UNWRAP_TAGS) {
        cardText = cardText.replace(new RegExp(`<${tag}\\b[^>]*>`, 'g'), '');
        cardText = cardText.replace(new RegExp(`</${tag}>`, 'g'), '');
      }

      // now extract every <p> paragraph from the cleaned card fragment
      const re = new RegExp(PARA_RE.source, 'g');
      let pm: RegExpExecArray | null;
      let foundP = false;
      while ((pm = re.exec(cardText))) {
        foundP = true;
        totalParagraphs += 1;
        const cleaned = cleanText(pm[1]);
        if (cleaned.length === 0) {
          anomalies.push({ where, note: 'a <p> paragraph cleaned to empty text; skipped rather than emitted empty' });
          continue;
        }
        // defensive: no leftover tag markup should survive into reading text
        if (/<[a-zA-Z/]/.test(cleaned)) {
          fail(`${where}: paragraph still contains unhandled tag markup after cleaning: ${JSON.stringify(cleaned.slice(0, 200))}`);
        }
        paragraphs.push(cleaned);
      }
      if (!foundP) fail(`${where}: a card div contained no <p> paragraph`);
    }

    if (paragraphs.length === 0) fail(`${where}: no surviving paragraphs`);

    const ref = lineNs.length > 0 ? `${Math.min(...lineNs)}–${Math.max(...lineNs)}` : null;

    divisions.push({
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: paragraphs.join('\n\n'), ref: null }],
    });
  }

  return { divisions, anomalies, totalCards, totalParagraphs, totalNotes, totalCorrections };
}
