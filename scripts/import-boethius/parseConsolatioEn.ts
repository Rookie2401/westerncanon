/**
 * Parser for the English Consolation of Philosophy
 * (stoa0058.stoa001.perseus-eng1.xml - the "I. T." (1609) translation as
 * revised by H. F. Stewart for the Loeb 1918 edition, Perseus
 * canonical-latinLit; the same Loeb volume as the Latin sibling).
 *
 * Structure confirmed by direct inspection: `<div1 type="book" n="N">`
 * (5 books) > `<div2 type="chapter" n="<value>">`, where `<value>` is
 * either the literal string "praef" (Book 1's opening, unnumbered proem
 * only) or a plain integer - THE SAME integer shared by a metrum/prosa
 * pair (e.g. two consecutive div2 elements both carry n="2": the metrum
 * then the prosa of that pair), UNLIKE the Latin sibling's distinct "P2"/
 * "M2" labels. This source does not distinguish prose from verse in its
 * own `n` attribute at all; per this app's rule of using each edition's own
 * numbering rather than inventing one, `Division.number` reproduces the
 * literal (possibly repeated) source value, and `Division.id` is
 * disambiguated with a trailing "-1"/"-2"/"-3" ordinal ONLY when a value
 * repeats within its book (never otherwise).
 *
 * IRREGULARITY (Book 3 only, verified against the Latin sibling): the
 * value "7" occurs THREE times in Book 3 - Prosa 7, Metrum 7, and then,
 * after an intervening div2 correctly numbered "8" (Prosa 8), a THIRD
 * div2 also numbered "7" whose content ("Alas, how ignorance makes
 * wretches stray...") is in fact the translation of the Latin's M8
 * ("Eheu quae miseros tramite deuios...") - i.e. this is Metrum 8,
 * mislabeled "7" in this source. Preserved exactly as printed (never
 * silently renumbered to "8"); logged prominently here and in
 * anomalies.json.
 *
 * Verse vs prose is determined structurally, not guessed: a div2 wrapping
 * `<quote rend="blockquote">...<lb/>-separated lines...</quote>` is verse
 * (lines joined with "\n"); everything else is prose. EXCEPTION, disclosed:
 * Book 1's "praef" div2 (the translation of the opening metrum, "I THAT
 * with youthful heat...") carries NO `<quote>`/`<lb/>` markup at all in
 * this digitization - unlike every other verse passage in the work - so
 * its original line breaks cannot be recovered here; it is imported as a
 * single prose-formatted paragraph and the limitation is disclosed rather
 * than papered over with invented line breaks.
 *
 * BUG FIX (found by an independent raw-vs-output re-check after this
 * importer's first pass, matching the Latin sibling's own fix - see
 * parseConsolatioLa.ts's module doc for the concrete Latin example): a
 * prose div2 is not simply "a run of `<p>` paragraphs" either. The short
 * interlocutor exchanges are often bare text OUTSIDE any `<p>`, and
 * `<q>` frequently wraps one or more WHOLE `<p>` elements (e.g. Book 2,
 * div2 "4": `<q>But,</q> quoth she, <q><p>thou canst not justly
 * impute...</p><p>But thy father-in-law...</p>...</q>`). An earlier
 * revision of this parser read only `<p>...</p>` content and silently
 * dropped every word outside it - 7 div2 elements across Books 1-5 are
 * affected, roughly 13,200 characters total. Fixed via the same
 * ./text.ts's extractProseUnits/renderProseUnit used by the Latin sibling:
 * every paragraph-level unit, inside or outside a `<p>`, in document order.
 *
 * `<q>...</q>` (direct speech) carries no literal quotation-mark
 * characters in this XML either (matching the Latin sibling). A `<q>` span
 * fully contained within one paragraph-level unit is rendered wrapped in
 * straight double quotes; a `<q>` that wraps one or more WHOLE `<p>`
 * elements gets no synthesised quote mark, since placing one correctly
 * across a paragraph boundary would be invented, not read from the source
 * (see anomalies.json for the exact count). `<pb id="p.NNN"/>` page breaks
 * are dropped as transport scaffolding.
 */

import type { Anomaly, Division, GenericWork, Passage } from './genericTypes.ts';
import { extractProseUnits, joinLbLines, joinParagraphs, nfc } from './text.ts';

const WORK_ID = 'boethius-consolatio-en';

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

export function parseConsolatioEn(xml: string): { work: GenericWork; anomalies: Anomaly[] } {
  const anomalies: Anomaly[] = [];
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found');
  const body = xml.slice(bodyStart, bodyEnd);

  const pbCount = (body.match(/<pb\b/g) ?? []).length;
  const totalQInBody = (body.match(/<q\b[^>]*>/g) ?? []).length;
  let unpairedQCount = 0;
  let looseUnitCount = 0;
  const looseUnitLocations: string[] = [];

  const bookRe = /<div1 type="book" n="(\d+)">/g;
  const bookMatches = [...body.matchAll(bookRe)];
  if (bookMatches.length !== 5) fail(`expected exactly 5 Book divs, found ${bookMatches.length}`);

  const divisions: Division[] = [];

  for (let bi = 0; bi < bookMatches.length; bi++) {
    const bm = bookMatches[bi]!;
    const bookNum = bm[1]!;
    const start = bm.index! + bm[0].length;
    const end = bi + 1 < bookMatches.length ? bookMatches[bi + 1]!.index! : body.length;
    const bookChunk = body.slice(start, end);

    const chapRe = /<div2 type="chapter" n="([A-Za-z0-9]+)">/g;
    const chapMatches = [...bookChunk.matchAll(chapRe)];
    if (chapMatches.length === 0) fail(`Book ${bookNum}: no chapter divs found`);

    // occurrence counts, for id disambiguation and for detecting the Book-3 "7"x3 irregularity
    const totalOccurrences = new Map<string, number>();
    for (const cm of chapMatches) totalOccurrences.set(cm[1]!, (totalOccurrences.get(cm[1]!) ?? 0) + 1);

    const children: Division[] = [];
    const occurrenceSoFar = new Map<string, number>();

    for (let ci = 0; ci < chapMatches.length; ci++) {
      const cm = chapMatches[ci]!;
      const n = cm[1]!;
      const cStart = cm.index! + cm[0].length;
      const cEnd = ci + 1 < chapMatches.length ? chapMatches[ci + 1]!.index! : bookChunk.lastIndexOf('</div1>');
      let chunk = bookChunk.slice(cStart, cEnd).replace(/<\/div2>\s*$/, '');

      chunk = chunk.replace(/<pb\b[^>]*\/>/g, ' ');

      const occurrence = (occurrenceSoFar.get(n) ?? 0) + 1;
      occurrenceSoFar.set(n, occurrence);
      const totalForN = totalOccurrences.get(n)!;
      const id = totalForN > 1 ? `book-${bookNum}-sec-${n}-${occurrence}` : `book-${bookNum}-sec-${n}`;

      const hasQuote = /<quote rend="blockquote">/.test(chunk);
      let text: string;
      const passageAnomalies: string[] = [];

      if (hasQuote) {
        text = joinLbLines(chunk);
      } else {
        // See BUG FIX in the module doc: every paragraph-level unit, not just <p> content.
        const { units, looseUnits, unpairedQ } = extractProseUnits(chunk);
        unpairedQCount += unpairedQ;
        if (looseUnits > 0) {
          looseUnitCount += looseUnits;
          looseUnitLocations.push(`${id} (${looseUnits})`);
        }
        if (units.length === 0) fail(`Book ${bookNum} chapter "${n}" (occurrence ${occurrence}): no paragraph text found`);
        text = joinParagraphs(units);
        if (bookNum === '1' && n === 'praef') {
          passageAnomalies.push(
            'SUPPLEMENTARY NOTE: this division translates the work\'s opening metrum (verse), but this digitization carries no <quote>/<lb/> markup for it - unlike every other verse passage in the work - so its original line breaks are not recoverable here; imported as a single prose-formatted paragraph rather than with invented line breaks.',
          );
        }
      }
      if (text.length === 0) fail(`Book ${bookNum} chapter "${n}" (occurrence ${occurrence}) produced empty text`);
      text = nfc(text);

      // The Book-3 "7"x3 irregularity: the THIRD occurrence of "7" is really Metrum 8, mislabeled.
      if (bookNum === '3' && n === '7' && occurrence === 3) {
        const note =
          'MISLABELLED IN THE SOURCE: this is the third div2 numbered "7" in Book 3 (after Prosa 7 and Metrum 7, and after an intervening div2 correctly numbered "8" for Prosa 8). Its content is in fact the translation of the Latin sibling\'s Metrum 8 ("Eheu quae miseros tramite deuios...", "Alas, how ignorance makes wretches stray..."). Preserved exactly as the source prints it (n="7"), not silently corrected to "8"; see about.json.';
        passageAnomalies.push(note);
        anomalies.push({ where: `${WORK_ID} / book-3-sec-7-3 (id ${id})`, note });
      }

      const passage: Passage = { n: '', text, ref: null };
      if (passageAnomalies.length > 0) passage.anomaly = passageAnomalies.join(' ');

      const div: Division = {
        id,
        number: n,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
      children.push(div);
    }

    const bookDiv: Division = {
      id: `book-${bookNum}`,
      number: bookNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children,
      passages: [],
    };
    divisions.push(bookDiv);
  }

  anomalies.push({
    where: `${WORK_ID} / numbering scheme`,
    note: 'This source\'s own div2 `n` attribute is a plain integer (or "praef" for Book 1\'s unnumbered proem) SHARED by a metrum/prosa pair, unlike the Latin sibling\'s distinct "Pn"/"Mn" letters. Division.number reproduces this literal (possibly repeated) value; Division.id is disambiguated with a trailing "-1"/"-2"/"-3" ordinal only where a value genuinely repeats within its book (Books 1-5 all have such pairs; Book 3 has one triple - see the Book 3 note below).',
  });
  anomalies.push({
    where: `${WORK_ID} / headings`,
    note: 'This transcription carries no chapter- or book-level heading text (no <head> element anywhere in the body); Division.sourceHeading is null throughout.',
  });
  anomalies.push({
    where: `${WORK_ID} / transport scaffolding`,
    note: `${pbCount} <pb/> page-break markers were dropped from the reading text as pure typesetting scaffolding; this source carries no citation scheme this schema can use, so Division.ref and Passage.ref are null throughout.`,
  });
  const pairedQCount = totalQInBody - unpairedQCount;
  anomalies.push({
    where: `${WORK_ID} / direct speech`,
    note: `${totalQInBody} <q>...</q> spans (direct speech) carry no literal quotation-mark characters in this XML. ${pairedQCount} of them are fully contained within a single paragraph-level unit and are rendered wrapped in straight double quotes, reflecting what the edition itself prints, matching the Latin sibling's handling. The remaining ${unpairedQCount} wrap one or more WHOLE <p> paragraphs; for these no quote mark is synthesised, since placing one correctly across a paragraph boundary would be invented rather than read from the source.`,
  });
  if (looseUnitCount > 0) {
    anomalies.push({
      where: `${WORK_ID} / dialogue outside <p>`,
      note: `BUG FIX: ${looseUnitCount} paragraph-level unit(s) of text sit OUTSIDE any <p> element in this source - short interlocutor exchanges, printed as bare text between two <p>-wrapped speeches. An earlier revision of this importer read only <p> content and silently dropped these; they are now recovered in full, in document order, via extractProseUnits. Locations (unit count): ${looseUnitLocations.join(', ')}.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / footnote apparatus`,
    note: 'This digitization marks its footnote apparatus (present throughout, e.g. after "Hebdomads" and elsewhere) with no <note>/<ref> element at all - apparently bare inline letters in the printed style of the edition\'s own superscript markers - with no markup distinguishing them from ordinary running text. Because they cannot be identified programmatically without risk of deleting a genuine word, they are left exactly as printed rather than guessed at and removed; this is a disclosed limitation of the source, not a correction made here.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };
  return { work, anomalies };
}
