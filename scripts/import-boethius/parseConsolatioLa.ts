/**
 * Parser for the Latin Consolatio Philosophiae
 * (stoa0058.stoa001.perseus-lat2.xml - H. F. Stewart & E. K. Rand's Loeb
 * 1918 critical text, Perseus canonical-latinLit).
 *
 * Structure confirmed by direct inspection: `<div type="textpart" n="N"
 * subtype="book">` (5 books) > `<div type="textpart" n="<letter><num>"
 * subtype="section">` (a "Pn"/"Mn" pair per argument, the edition's own
 * citation scheme - CONFIRMED BY THE SOURCE'S OWN `n` ATTRIBUTE, not
 * invented here). No `<head>` element anywhere in the file, so
 * Division.sourceHeading is null throughout for both books and sections.
 *
 * IMPORTANT IRREGULARITY (verified by content-type census, not assumed):
 * in Book 1, the source's own `Pn` divisions carry VERSE content (`<l>`
 * lines) and `Mn` divisions carry PROSE (`<p>`) - the reverse of the
 * conventional Prosa/Metrum association those letters normally carry. In
 * Books 2-5 the letters are the other way round, as expected: `Pn` = prose,
 * `Mn` = verse. This is preserved EXACTLY as the source encodes it in every
 * book; the letters are never swapped or "corrected" to match convention.
 * See anomalies.json for the full, book-by-book disclosure.
 *
 * Verse sections: each `<l n="...">` line, cleaned, joined with "\n".
 * Prose sections: EVERY paragraph-level unit of text, in document order -
 * not just `<p>...</p>` content, but also text sitting OUTSIDE any `<p>` at
 * the same level (see BUG FIX below) - joined with "\n\n" via
 * ./text.ts's extractProseUnits/renderProseUnit.
 *
 * BUG FIX (found by an independent raw-vs-output re-check after this
 * importer's first pass): a section is not simply "a run of `<p>`
 * paragraphs". The short back-and-forth interlocutor exchanges between
 * Boethius and Philosophy are often printed as bare text OUTSIDE any `<p>`,
 * with a `<q>` wrapped only around each quoted word/clause, e.g. (Book 1,
 * M6 in this source's own numbering): `...<p>...aduertis?</p></q>
 * <q>Vix,</q> inquam, <q>rogationis tuae sententiam nosco...</q> <q>Num
 * me,</q> inquit, <q>fefellit...</q>` - note there is NO `<p>` around
 * "Vix, inquam, ..." at all; it sits directly in the section, sandwiched
 * between one `<q><p>...</p></q>`-wrapped speech and the next. An earlier
 * revision of this parser read only `<p>...</p>` content and silently
 * dropped these exchanges - Boethius's OWN dialogue turns, not apparatus.
 * Confirmed across the whole file: 4 sections (Book 1 M4/M6, Book 4 P2,
 * Book 5 P4) carry text outside any `<p>`, ~4,300 characters total. Fixed
 * by extractProseUnits, which walks `<p>`/`</p>` boundaries (never nested
 * in this source) and treats text on EITHER side - inside or outside a
 * `<p>` - as its own paragraph-level unit, in document order.
 *
 * `<q>...</q>` (direct speech) carries no literal quotation-mark characters
 * in this XML - the edition's own print DOES show them (this is ordinary
 * TEI practice) - so a `<q>` span fully contained within one paragraph-
 * level unit is wrapped in straight double quotes in the reading text
 * (disclosed, not silently done). Some `<q>` spans wrap one or more WHOLE
 * `<p>` elements instead (Philosophy's longer speeches, e.g. `<q><p>...
 * </p><p>...</p></q>`); for these, no quote mark is synthesised, because
 * placing one correctly across a paragraph boundary would be invented, not
 * read from the source - see anomalies.json for the exact count.
 * `<milestone unit="loebline" n="N"/>` (the Loeb facing-page line-count
 * ticks, printed every 5 lines) and `<pb n="p.NNN"/>` (page breaks) are
 * transport scaffolding, dropped. `<foreign xml:lang="grc">` (Boethius's
 * own Greek quotations, e.g. from Homer and Euripides) is kept verbatim.
 * The one `<note n="1"/>` in the file is a bare, empty, self-closing
 * apparatus marker with no content to preserve; dropped, logged. The one
 * stray `<lb/>` sits inside an embedded Greek quotation and is rendered as
 * a space.
 */

import type { Anomaly, Division, GenericWork, Passage } from './genericTypes.ts';
import { extractProseUnits, joinLLines, joinParagraphs, nfc } from './text.ts';

const WORK_ID = 'boethius-consolatio-la';

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

export function parseConsolatioLa(xml: string): { work: GenericWork; anomalies: Anomaly[] } {
  const anomalies: Anomaly[] = [];
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found');
  const body = xml.slice(bodyStart, bodyEnd);

  // milestone/pb/note counting (dropped as transport scaffolding)
  const milestoneCount = (body.match(/<milestone\b/g) ?? []).length;
  const pbCount = (body.match(/<pb\b/g) ?? []).length;
  const totalQInBody = (body.match(/<q\b[^>]*>/g) ?? []).length;
  const noteCount = { n: 0 };
  const lbCount = { n: 0 };
  let unpairedQCount = 0;
  let looseUnitCount = 0;
  const looseUnitLocations: string[] = [];

  const bookRe = /<div type="textpart" n="(\d+)" subtype="book">/g;
  const bookMatches = [...body.matchAll(bookRe)];
  if (bookMatches.length !== 5) fail(`expected exactly 5 Book divs, found ${bookMatches.length}`);

  const divisions: Division[] = [];

  for (let bi = 0; bi < bookMatches.length; bi++) {
    const bm = bookMatches[bi]!;
    const bookNum = bm[1]!;
    const start = bm.index! + bm[0].length;
    const end = bi + 1 < bookMatches.length ? bookMatches[bi + 1]!.index! : body.lastIndexOf('</div>');
    const bookChunk = body.slice(start, end);

    const sectionRe = /<div type="textpart" n="([A-Za-z0-9]+)" subtype="section">/g;
    const secMatches = [...bookChunk.matchAll(sectionRe)];
    if (secMatches.length === 0) fail(`Book ${bookNum}: no section divs found`);

    const children: Division[] = [];
    const seenLetters = { P: new Set<'verse' | 'prose'>(), M: new Set<'verse' | 'prose'>() };

    for (let si = 0; si < secMatches.length; si++) {
      const sm = secMatches[si]!;
      const n = sm[1]!;
      const sStart = sm.index! + sm[0].length;
      const sEnd = si + 1 < secMatches.length ? secMatches[si + 1]!.index! : bookChunk.length;
      let chunk = bookChunk.slice(sStart, sEnd);

      // Drop the closing </div> tags that trail the last section of a book (there is exactly
      // one, closing this section div; any further trailing content is the book's own closer).
      chunk = chunk.replace(/<\/div>\s*$/, '');

      lbCount.n += (chunk.match(/<lb\s*\/>/g) ?? []).length;
      chunk = chunk.replace(/<lb\s*\/>/g, ' ');

      const emptyNoteMatches = chunk.match(/<note\b[^>]*\/>/g) ?? [];
      noteCount.n += emptyNoteMatches.length;
      if (emptyNoteMatches.length > 0) {
        anomalies.push({
          where: `${WORK_ID} / book-${bookNum}-sec-${n}`,
          note: `${emptyNoteMatches.length} bare, self-closing <note.../> apparatus marker(s) with no content of their own in this transcription; dropped from the reading text (nothing to preserve).`,
        });
      }
      chunk = chunk.replace(/<note\b[^>]*\/>/g, ' ');
      chunk = chunk.replace(/<milestone\b[^>]*\/>/g, ' ');
      chunk = chunk.replace(/<pb\b[^>]*\/>/g, ' ');

      const hasL = /<l\b[^>]*>/.test(chunk);
      const hasP = /<p\b[^>]*>/.test(chunk);
      const letter = n[0] === 'P' ? 'P' : n[0] === 'M' ? 'M' : null;
      if (!letter) fail(`Book ${bookNum} section "${n}": unrecognised section-number letter (expected "P" or "M")`);

      let kind: 'verse' | 'prose';
      let text: string;
      if (hasL && !hasP) {
        kind = 'verse';
        // Greek <foreign> quotations inside verse lines are kept verbatim by joinLLines (it only strips tags, not content).
        text = joinLLines(chunk);
      } else if (hasP && !hasL) {
        kind = 'prose';
        // See BUG FIX in the module doc: every paragraph-level unit, not just <p> content.
        const { units, looseUnits, unpairedQ } = extractProseUnits(chunk);
        unpairedQCount += unpairedQ;
        if (looseUnits > 0) {
          looseUnitCount += looseUnits;
          looseUnitLocations.push(`book-${bookNum}-sec-${n} (${looseUnits})`);
        }
        text = joinParagraphs(units);
      } else {
        fail(`Book ${bookNum} section "${n}": ambiguous content (hasL=${hasL}, hasP=${hasP}) - cannot classify as verse or prose`);
      }
      if (text.length === 0) fail(`Book ${bookNum} section "${n}" produced empty text`);
      text = nfc(text);

      seenLetters[letter].add(kind);

      const passage: Passage = { n: '', text, ref: null };
      const div: Division = {
        id: `book-${bookNum}-sec-${n}`,
        number: n,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
      children.push(div);
    }

    // Book-level letter/content-type consistency check (never silently ignored - see module doc)
    const pKinds = [...seenLetters.P];
    const mKinds = [...seenLetters.M];
    if (pKinds.length > 1) fail(`Book ${bookNum}: "P" sections are not uniformly one content type (${pKinds.join(',')})`);
    if (mKinds.length > 1) fail(`Book ${bookNum}: "M" sections are not uniformly one content type (${mKinds.join(',')})`);
    const pKind = pKinds[0];
    const mKind = mKinds[0];
    const standard = pKind === 'prose' && mKind === 'verse';
    const reversed = pKind === 'verse' && mKind === 'prose';
    if (!standard && !reversed) fail(`Book ${bookNum}: could not classify P/M letter convention (P=${pKind}, M=${mKind})`);
    anomalies.push({
      where: `${WORK_ID} / book-${bookNum}`,
      note: reversed
        ? `Book ${bookNum}: this source's own "Pn" section-number letter marks VERSE content and "Mn" marks PROSE - the REVERSE of the conventional Prosa/Metrum association (and the reverse of Books 2-5, which follow the standard convention). Preserved exactly as encoded; the letters are not swapped or renumbered to match the usual convention or the other books.`
        : `Book ${bookNum}: this source's own "Pn" section-number letter marks PROSE and "Mn" marks VERSE, the standard Prosa/Metrum convention.`,
    });

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
    where: `${WORK_ID} / transport scaffolding`,
    note: `${milestoneCount} <milestone unit="loebline"/> ticks (the Loeb facing-page edition's own line-count markers, printed every 5 lines) and ${pbCount} <pb/> page-break markers were dropped from the reading text as pure typesetting scaffolding; neither carries a citation this schema can use (see "Reference scheme" in about.json), so Division.ref and Passage.ref are null throughout.`,
  });
  const pairedQCount = totalQInBody - unpairedQCount;
  anomalies.push({
    where: `${WORK_ID} / direct speech`,
    note: `${totalQInBody} <q>...</q> spans (Boethius's and Philosophy's direct speech to one another) carry no literal quotation-mark characters in this XML - ordinary TEI practice, with the printed edition supplying them. ${pairedQCount} of them are fully contained within a single paragraph-level unit and are rendered wrapped in straight double quotes, reflecting what the edition itself prints. The remaining ${unpairedQCount} wrap one or more WHOLE <p> paragraphs (Philosophy's longer speeches); for these no quote mark is synthesised, since placing one correctly across a paragraph boundary would be invented rather than read from the source - the <q> tags are simply dropped and the paragraph(s) they wrap are kept exactly as printed.`,
  });
  if (looseUnitCount > 0) {
    anomalies.push({
      where: `${WORK_ID} / dialogue outside <p>`,
      note: `BUG FIX: ${looseUnitCount} paragraph-level unit(s) of text sit OUTSIDE any <p> element in this source - short interlocutor exchanges between Boethius and Philosophy, printed as bare text (each quoted clause individually wrapped in its own <q>) between two <p>-wrapped speeches. An earlier revision of this importer read only <p> content and silently dropped these; they are now recovered in full, in document order, via extractProseUnits. Locations (unit count): ${looseUnitLocations.join(', ')}.`,
    });
  }
  if (noteCount.n > 0) {
    anomalies.push({
      where: `${WORK_ID} / apparatus`,
      note: `${noteCount.n} bare, self-closing <note.../> marker(s) with no content of their own were dropped from the reading text (see the per-section anomaly note(s) above for location).`,
    });
  }
  if (lbCount.n > 0) {
    anomalies.push({
      where: `${WORK_ID} / apparatus`,
      note: `${lbCount.n} stray <lb/> line-break marker(s), found inside an embedded Greek quotation, rendered as a plain space.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / headings`,
    note: 'This transcription carries no <head> element anywhere in the file - not for the work, not for any Book, not for any section. Division.sourceHeading is therefore null throughout, for both Book and section divisions; no heading text is fabricated.',
  });
  anomalies.push({
    where: `${WORK_ID} / foreign-language quotations`,
    note: 'Boethius quotes Homer and other Greek authors directly in several metra (wrapped in <foreign xml:lang="grc">); this Greek text is kept verbatim, in its original script, exactly as printed.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };
  return { work, anomalies };
}
