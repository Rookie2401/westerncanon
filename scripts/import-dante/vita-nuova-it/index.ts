/**
 * Dante, *Vita Nuova* - Italian original, Michele Barbi's critical edition
 * (Firenze: Società Dantesca Italiana / R. Bemporad e Figlio, 1907).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-dante/vita-nuova-it/index.ts
 *
 * Source: Italian Wikisource, page-scan transclusion of the djvu
 * "Vita nuova.djvu" (Commons file; Index page
 * https://it.wikisource.org/wiki/Indice:Vita_nuova.djvu, which states
 * "Curatore=Michele Barbi | Editore=Società Dantesca Italiana | Città=Firenze
 * | Anno=1907" - a clearly pre-1931 critical edition). The book's text
 * proper runs from djvu page 307 to 409 (103 pages); its own INDICE
 * (table of contents for Barbi's front matter) occupies page 409 itself,
 * confirmed by direct inspection of that page's scanned image - so the
 * actual reading text ends on page 408. The raw wikitext of all 103 pages
 * is cached in raw/pages-307-409.json (fetched once via fetchPages.ts).
 *
 * THIS IS A RECOVERY OF A REJECTED IMPORT. A prior version of this module
 * trusted the raw wikitext/OCR verbatim and parsed only the source's own
 * `<section begin="sN"/>...<section end="sN"/>` markers, on the false
 * premise that the whole 307-409 range was "fully proofread". It was not:
 * of the 103 pages, only 28 are Wikisource-proofread (pagequality level 3)
 * and 1 is validated (level 4); the other 74 - everything from page 337
 * onward - are raw, unreviewed OCR (level 1), and carry NO `<section>`
 * markup at all (proofreaders never got to them), which is exactly why the
 * prior importer's tag-walk silently absorbed all of pages 337-409 into an
 * unclosed "chapter 14" and stopped, reporting "found 14 chapters, expected
 * 42". This version does not make that mistake: every one of the 103 page
 * images was fetched (raw/images/page<NNN>.jpg, via the Commons
 * thumb.wikimedia.org URL pattern - see raw/scratch/ for the one-off
 * download commands) and read directly, and every page's transcription was
 * corrected against its image by hand, regardless of Wikisource proofreading
 * status (proofread pages can still carry silent errors - one was found on
 * page 329, a Wikisource level-3 page). The corrected, page-by-page text is
 * cached in raw/corrected-pages.json (one entry per djvu page 307-409, with
 * that page's Wikisource pagequality level and its corrected plain text -
 * empty for page 409, the index page). Every correction made - and its
 * location - is logged in raw/corrections-log.json (per page: quality
 * level, correction count, and notes on what was OCR/wikitext-garbled and
 * what the image actually shows). 736 corrections were made across 72 of
 * the 103 pages; see the module report for the breakdown.
 *
 * CHAPTER BOUNDARIES. Wikisource's own `<section begin="sN"/>` markers are
 * reliable only for chapters 1-13 (pages 307-337, where proofreading and
 * markup mostly survive - modulo the page-329 fix and one page-329/330
 * <section> markup quirk described below). Past that point the source has
 * no chapter markup whatsoever, so chapters 14-42 were located by careful
 * reading of the verified page-image text itself: each of Barbi's 42
 * traditional chapters opens with a distinctive rubric/incipit (e.g. "Poi
 * che li miei occhi ebbero..." opens XXXI; "Quomodo sedet sola civitas..."
 * opens XXVIII), well documented in Dante scholarship as sanity-check
 * reference for where to look, but the text inside each chapter is this
 * recovery's own page-image-verified transcription throughout, never
 * borrowed from an outside edition. Chapter boundaries are recorded once,
 * deterministically, as inline "###CHAPTER-BREAK:N###" markers embedded in
 * the relevant raw/corrected-text/page<NNN>.txt source file at the exact
 * point the new chapter begins (chapter 1 needs no marker - it simply
 * starts at page 307, the first page in range); raw/chapter-boundaries.json
 * (built once from those markers) records the resulting page-by-page
 * breakdown and confirms all 42 are present in order with no gaps.
 *
 * A genuine markup quirk was found spanning pages 329-330: Barbi's parallel
 * critical-apparatus column for chapter XII (a "cN" section) does not close
 * until partway through page 330, *after* page 330's own main-text
 * "sN" span (itself a continuation of chapter XII's actual prose) has
 * already opened and closed - i.e. the two column's <section> spans
 * interleave across the page break rather than nesting cleanly. A naive
 * single-flag "are we inside commentary" parse (as the prior importer used)
 * would silently swallow page 330's chapter-XII continuation as if it were
 * apparatus. This importer's one-off page-306..336 regeneration script
 * (raw/scratch/genProofreadPages.mjs, not part of the run-time pipeline -
 * its output is baked into raw/corrected-pages.json) gates only on "are we
 * inside an active sN span", not on the commentary flag, which resolves it
 * correctly; the fix was verified against the page-330 image.
 *
 * EXCLUDED (editorial front matter, disclosed in about.json): Barbi's own
 * critical introduction (djvu pages up to 306, already excluded from the
 * fetched range); his running critical-apparatus commentary, printed in a
 * parallel column for every chapter (the source's own "cN" section span,
 * distinct from the "sN" main-text span imported here, and - past page
 * 337 - simply the visually distinct two-column apparatus block at the
 * bottom of each page, identified by eye during transcription); inline
 * `<ref>...</ref>` footnote markers recording manuscript variant readings;
 * and page 409's own back-matter INDICE (table of contents), which carries
 * no Dante text at all.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, type Anomaly } from '../shared/text.ts';
import { writeWorkOutputs, countChars } from '../shared/emit.ts';
import type { Division, GenericWork, WorkAbout } from '../shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WORK_ID = 'dante-vita-nuova-it';
const OUT_DIR = join(REPO_ROOT, 'data', WORK_ID);
const EXPECTED_CHAPTERS = 42;
const FIRST_PAGE = 307;
const LAST_PAGE = 409;
const CHAPTER_BREAK_RE = /###CHAPTER-BREAK:(\d+)###/g;

interface CorrectedPage {
  page: number;
  qualityLevel: number | null;
  text: string;
}

interface CorrectionLogEntry {
  page: number;
  qualityLevel: number | null;
  correctionsCount: number;
  notes: string[];
}

function main(): void {
  const pages = JSON.parse(readFileSync(join(HERE, 'raw', 'corrected-pages.json'), 'utf8')) as CorrectedPage[];
  const corrections = JSON.parse(readFileSync(join(HERE, 'raw', 'corrections-log.json'), 'utf8')) as CorrectionLogEntry[];

  if (pages.length !== LAST_PAGE - FIRST_PAGE + 1 || pages[0]!.page !== FIRST_PAGE || pages[pages.length - 1]!.page !== LAST_PAGE) {
    process.stderr.write(`STOP (vita-nuova-it): expected corrected-pages.json to cover ${FIRST_PAGE}..${LAST_PAGE} (${LAST_PAGE - FIRST_PAGE + 1} pages), got ${pages.length} (${pages[0]?.page}..${pages[pages.length - 1]?.page})\n`);
    process.exit(1);
  }
  for (let i = 0; i < pages.length; i++) {
    if (pages[i]!.page !== FIRST_PAGE + i) {
      process.stderr.write(`STOP (vita-nuova-it): corrected-pages.json out of order or has a gap at index ${i} (page ${pages[i]!.page})\n`);
      process.exit(1);
    }
  }

  // Walk pages in djvu order, splitting on the inline chapter-break markers.
  // Chapter 1 needs no marker: it is simply the first content encountered.
  const chapterSegments = new Map<number, string[]>();
  let currentChapter = 1;
  for (const { page, text } of pages) {
    if (!text) continue; // page 409: back-matter INDICE, no reading text
    let cursor = 0;
    let m: RegExpExecArray | null;
    CHAPTER_BREAK_RE.lastIndex = 0;
    while ((m = CHAPTER_BREAK_RE.exec(text))) {
      const chunk = text.slice(cursor, m.index);
      cursor = CHAPTER_BREAK_RE.lastIndex;
      if (chunk.trim().length > 0) (chapterSegments.get(currentChapter) ?? chapterSegments.set(currentChapter, []).get(currentChapter)!).push(chunk.trim());
      currentChapter = Number(m[1]);
    }
    const tail = text.slice(cursor);
    if (tail.trim().length > 0) (chapterSegments.get(currentChapter) ?? chapterSegments.set(currentChapter, []).get(currentChapter)!).push(tail.trim());
    void page; // page retained in the loop signature for clarity/debugging
  }

  const chapterNumbers = [...chapterSegments.keys()].sort((a, b) => a - b);
  if (chapterNumbers.length !== EXPECTED_CHAPTERS) {
    process.stderr.write(`STOP (vita-nuova-it): found ${chapterNumbers.length} chapters, expected ${EXPECTED_CHAPTERS}: ${chapterNumbers.join(',')}\n`);
    process.exit(1);
  }
  for (let i = 0; i < chapterNumbers.length; i++) {
    if (chapterNumbers[i] !== i + 1) {
      process.stderr.write(`STOP (vita-nuova-it): chapter numbering gap at index ${i}, got ${chapterNumbers[i]}\n`);
      process.exit(1);
    }
  }

  // Each chapter's page-segments must be re-joined across the page breaks
  // that split them apart - but a page break is *not* always a mid-
  // paragraph continuation: it can equally fall exactly at the end of a
  // paragraph or of a verse stanza (whose own next stanza, or the prose
  // division text following a poem, genuinely starts a new paragraph on
  // the next page). Distinguishing the two only from plain text (no
  // structural page markup survives past chapter 13) comes down to one
  // reliable signal: does the last line of the previous page's segment end
  // with sentence/line-closing punctuation?
  //   - if yes: the unit is complete: join with a blank line, i.e. treat
  //     it as a new paragraph, matching Barbi's own blank-line stanza and
  //     paragraph breaks.
  //   - if no (the line is left hanging - trailing comma, or no
  //     punctuation at all): it is a genuine continuation of the *same*
  //     unit. If that unit's last paragraph is verse (its lines carry
  //     internal newlines - true whenever 2+ of its lines already landed
  //     on the ending page), continue it with another newline, so the
  //     verse's own line breaks are preserved across the page boundary;
  //     otherwise (prose) continue it with a single space.
  // Verified against every one of the 39 chapters-1-42 page-transitions
  // where a page ends mid- or end-of-verse (see raw/scratch/ for the
  // one-off detection script): the terminal-punctuation test alone
  // correctly separates the ~10 genuine mid-stanza continuations (e.g.
  // page 319 -> 320, page 399 -> 400) from the rest, which are complete
  // stanzas/paragraphs correctly starting fresh on the next page.
  const TERMINAL_RE = /[.!?:;–—»]\s*$/;
  const divisions: Division[] = chapterNumbers.map((n) => {
    const segments = chapterSegments.get(n)!;
    let joined = segments[0]!;
    for (let i = 1; i < segments.length; i++) {
      const prevParagraphs = joined.split(/\n\s*\n/);
      const prevTail = prevParagraphs[prevParagraphs.length - 1]!;
      const prevLastLine = prevTail.split('\n').pop()!.trim();
      if (TERMINAL_RE.test(prevLastLine)) {
        joined += '\n\n' + segments[i];
      } else if (/\p{L}-$/u.test(prevLastLine)) {
        // Word hyphenated across the page break (the transcription keeps
        // the print's "reg-" / "gesse" split): drop the hyphen and rejoin
        // with nothing, e.g. "reg-" + "gesse" -> "reggesse".
        joined = joined.replace(/-$/, '') + segments[i];
      } else if (prevTail.includes('\n')) {
        joined += '\n' + segments[i];
      } else {
        joined += ' ' + segments[i];
      }
    }
    const paragraphs = joined
      .split(/\n\s*\n/)
      .map((p) => cleanText(p))
      .filter((p) => p.length > 0);
    return {
      id: `ch-${n}`,
      number: String(n),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [{ n: '', text: paragraphs.join('\n\n'), ref: null }],
    };
  });

  const work: GenericWork = { workId: WORK_ID, language: 'it', divisions };
  const totalChars = countChars(work);

  const proofreadPages = pages.filter((p) => p.qualityLevel === 3 || p.qualityLevel === 4);
  const rawOcrPages = pages.filter((p) => p.qualityLevel === 1);
  const totalCorrections = corrections.reduce((s, c) => s + c.correctionsCount, 0);
  const pagesTouched = corrections.filter((c) => c.correctionsCount > 0).length;
  const proofreadCorrections = corrections.filter((c) => c.qualityLevel === 3 || c.qualityLevel === 4).reduce((s, c) => s + c.correctionsCount, 0);
  const rawOcrCorrections = corrections.filter((c) => c.qualityLevel === 1).reduce((s, c) => s + c.correctionsCount, 0);

  // Residual-error audit manifest (see residualCheck.ts): every vocabulary-
  // cross-check suspect, resolved as either corrected or confirmed-as-printed.
  const residualAudit = JSON.parse(readFileSync(join(HERE, 'raw', 'residual-audit.json'), 'utf8')) as Array<{ status: string }>;
  const residualCorrected = residualAudit.filter((a) => a.status === 'corrected').length;
  const residualConfirmed = residualAudit.filter((a) => a.status === 'confirmed-as-printed').length;
  const residualSuspects = residualAudit.length;

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / whole work`,
    note:
      "Excluded from the reading text: Michele Barbi's own critical introduction (djvu pages up to 306 - " +
      'Prefazione; "Criteri fondamentali"; "Manoscritti"; "Edizioni"; "Classificazione dei testi" and its ' +
      'Appendice; "Fondamenti e criteri di questa edizione") and his running critical-apparatus commentary, printed ' +
      "in a parallel column for every chapter (the source's own \"cN\" section span for pages 307-337, and the " +
      'visually distinct two-column apparatus block identified by eye for pages 338-408); inline <ref> footnote ' +
      'marker(s) recording manuscript variant readings; and djvu page 409, which is the printed book\'s own back-' +
      "matter INDICE (table of contents for Barbi's front matter) and carries no Dante text at all, confirmed by " +
      'direct inspection of its scanned image.',
  });
  anomalies.push({
    where: `${WORK_ID} / recovery from a prior rejected import`,
    note:
      "This is a recovery of a previously-rejected import. The prior version of this module claimed the whole " +
      '307-409 page range was "fully proofread" and trusted the raw wikitext verbatim, parsing only the source\'s ' +
      '<section begin="sN"/> markers - which caused it to silently mis-parse past chapter 13 (no <section> markup ' +
      "exists on pages 338-409 at all, since Wikisource's proofreaders never reached them) and report \"found 14 " +
      'chapters, expected 42". This version verified the claim directly: of the 103 pages in the 307-409 range, ' +
      `${proofreadPages.length} are Wikisource-proofread (pagequality level 3 or 4) and ${rawOcrPages.length} are raw, ` +
      'unreviewed OCR (level 1) with no <section> markup whatsoever. Every one of the 103 page images was fetched ' +
      '(raw/images/page<N>.jpg) and read directly; every page\'s transcription was corrected against its image by ' +
      `hand, regardless of proofreading status. ${totalCorrections} correction(s) were made across ${pagesTouched} of the ` +
      `103 pages (${proofreadCorrections} correction(s) on the ${proofreadPages.length} Wikisource-proofread pages - proofread ` +
      "status does not guarantee error-free transcription, e.g. page 329 (level 3) ran two words together " +
      `("echi" for "e chi"); ${rawOcrCorrections} correction(s) on the ${rawOcrPages.length} raw-OCR pages, which is where ` +
      'the overwhelming majority of errors were found - individual character/word misreadings, run-together or ' +
      'split words, stray digits and punctuation, and a handful of substantive word substitutions where the OCR ' +
      "read a different real word than the page actually prints). Every correction and its exact page location is " +
      'logged in raw/corrections-log.json; the corrected page-by-page text this build reads is cached in ' +
      'raw/corrected-pages.json, and the chapter-boundary page numbers derived from it are in ' +
      'raw/chapter-boundaries.json.',
  });
  anomalies.push({
    where: `${WORK_ID} / chapter boundaries`,
    note:
      "Wikisource's own <section begin=\"sN\"/>...<section end=\"sN\"/> markers reliably delimit chapters 1-13 " +
      '(pages 307-337); no such markup exists anywhere in the source past that point. Chapters 14-42 were located ' +
      "by reading the verified page-image text itself for each chapter's distinctive rubric/incipit (the standard " +
      "list of Barbi-numbering incipits was used only as a sanity check for where to look; the text inside every " +
      'chapter is this recovery\'s own page-image-verified transcription throughout). A genuine <section> markup ' +
      "quirk was also found and corrected: chapter XII's critical-apparatus column (a \"c12\" span) does not close " +
      'until partway through page 330, after that same page\'s own main-text "s12" span (a continuation of chapter ' +
      "XII's actual prose) has already opened and closed - the two columns' spans interleave across the page break " +
      'rather than nesting cleanly, which would cause a naive single-flag parse to silently drop page 330\'s ' +
      'chapter-XII continuation as if it were apparatus. See raw/chapter-boundaries.json for the full page-by-page ' +
      'breakdown, confirming all 42 chapters present in order with no gaps.',
  });
  if (rawOcrPages.length !== 74 || proofreadPages.length !== 29) {
    anomalies.push({
      where: `${WORK_ID} / proofreading-status counts`,
      note: `Expected roughly 74 raw-OCR + 29 proofread pages (28 level-3 + 1 level-4) based on this recovery's manual review; actual counts from raw/corrected-pages.json are ${rawOcrPages.length} raw-OCR and ${proofreadPages.length} proofread. Recorded here in case the underlying Wikisource proofreading status changes on a future re-fetch (this build reads only the cached, already-corrected text and does not re-verify quality levels against a live fetch).`,
    });
  }

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Vita Nuova',
    author: 'Dante Alighieri',
    language: 'it',
    editor: 'Michele Barbi',
    edition: 'Firenze: Società Dantesca Italiana (R. Bemporad e Figlio), 1907',
    provenance:
      'Italian Wikisource, page-scan transclusion of the djvu "Vita nuova.djvu" (409 pages; the text proper spans ' +
      'pages 307-409, with page 409 itself being the book\'s own back-matter INDICE and carrying no Dante text). ' +
      'The raw wikitext of Page:Vita nuova.djvu/307 through /409 was fetched once via 3 batched MediaWiki ' +
      'action=query&prop=revisions requests (<=50 titles each, >=3s apart) by scripts/import-dante/vita-nuova-it/' +
      'fetchPages.ts and cached under raw/pages-307-409.json. All 103 page images were additionally fetched once ' +
      '(raw/images/page<N>.jpg, via the Commons thumb.wikimedia.org URL pattern for this djvu file) and read ' +
      "directly to verify and correct the transcription by hand - see raw/corrections-log.json for the full " +
      "per-page correction record and the module doc of index.ts for why this was necessary (a prior import of " +
      'this same work was rejected for trusting the raw OCR/wikitext verbatim past chapter 13). Nothing is ' +
      "downloaded at build or run time; this importer reads only the cached raw/corrected-pages.json. The djvu's " +
      'own Indice page states "Curatore=Michele Barbi | Editore=Società Dantesca Italiana | Città=Firenze | ' +
      'Anno=1907". Imported by scripts/import-dante/vita-nuova-it.',
    license:
      "Dante's original (c. 1292-94) and Barbi's 1907 critical edition are both in the public domain worldwide. " +
      'The Wikisource digital transcription/proofreading is released under the Creative Commons Attribution-' +
      'ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "Dante's Vita Nuova (\"the new life\"), his prosimetrum of prose narrative interwoven with lyric poems " +
            "recounting his love for Beatrice, in Michele Barbi's landmark 1907 critical edition for the Società " +
            'Dantesca Italiana - the edition that established the standard modern 42-chapter division still used ' +
            'today.',
          'The text here is verbatim throughout. Nothing is modernised, paraphrased, or silently corrected without ' +
            'disclosure.',
        ],
      },
      {
        heading: 'Digital source and this recovery',
        paragraphs: [
          "Italian Wikisource's page-scan transclusion of Barbi's 1907 edition. Of the 103 djvu pages spanning the " +
            `text (307-409), only ${proofreadPages.length} were Wikisource-proofread at the time of this import ` +
            `(pagequality level 3 or 4); the other ${rawOcrPages.length} - everything from page 337 onward - were raw, ` +
            'unreviewed OCR (level 1) with no proofreading and no chapter-boundary markup at all. A prior attempt ' +
            'at importing this work trusted that raw text verbatim and was rejected for it (its own module doc ' +
            'wrongly claimed the whole range was "fully proofread"). This import instead fetched and read every ' +
            'one of the 103 page scans directly, correcting the transcription against the image on every page ' +
            `regardless of proofreading status. ${totalCorrections} correction(s) were made across ${pagesTouched} pages ` +
            `(${proofreadCorrections} on the ${proofreadPages.length} proofread pages, ${rawOcrCorrections} on the ` +
            `${rawOcrPages.length} raw-OCR pages) - see raw/corrections-log.json for the complete per-page count and notes, ` +
            'and the "recovery from a prior rejected import" entry in anomalies.json for illustrative examples.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          "This work is one flat list of 42 chapter Divisions (ch-1..ch-42), matching Barbi's own standard " +
            "numbering. Each chapter's paragraphs, in order, form its single Passage, joined by a blank line. " +
            'Chapters 1-13 (pages 307-337) were delimited using the source\'s own ' +
            '<section begin="sN"/>...<section end="sN"/> markers; chapters 14-42 (pages 337-408, entirely raw OCR ' +
            "with no such markup) were delimited by this recovery's own reading of each chapter's rubric/incipit " +
            'in the verified page-image text. See raw/chapter-boundaries.json for the resulting page-by-page ' +
            'breakdown and anomalies.json for the one genuine <section>-markup interleaving quirk found and fixed ' +
            '(spanning pages 329-330).',
          `${chapterNumbers.length} chapters, ${totalChars} characters total.`,
        ],
      },
      {
        heading: 'Residual-error audit',
        paragraphs: [
          'After the page-by-page verification, a second, independent pass hunted for OCR residue that reads ' +
            'plausibly at a glance (the kind a visual check can miss - "cho" for "che", "faro" for "fare"). Method: ' +
            'every token of this text was cross-checked against the vocabulary of a second, independent, complete ' +
            "Italian Vita Nuova (Project Gutenberg #71218, ed. A. Agresti, 1902 - used ONLY as a vocabulary, never " +
            'as source text), comparing orthography-insensitive keys (accents stripped, u/v and i/j merged, doubled ' +
            'letters collapsed) so that Barbi\'s archaic spellings are not themselves flagged. Every token whose key ' +
            "never occurs in that vocabulary was then checked against its page image. Result: " +
            `${residualSuspects} suspect tokens; ${residualCorrected} were genuine residual OCR errors and were corrected ` +
            '(13 of them on pages Wikisource had marked "proofread"), and 15 more exposed a page-break hyphenation ' +
            'rejoin bug in this importer, since fixed; the remaining ' +
            `${residualConfirmed} were each confirmed as printed - Barbi's own forms (vertù, segnore, fue, propuosi, ` +
            'ogne...) that the 1902 edition modernises away. Re-runnable via ' +
            'scripts/import-dante/vita-nuova-it/residualCheck.ts, which lists every suspect with its status from ' +
            'raw/residual-audit.json and fails if any is unresolved.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: ['Division.ref and Passage.ref are null throughout: citation is by chapter number only, which the Division id and number already carry.'],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the excluded front matter and commentary, the full account of the prior rejected ' +
            'import and how this recovery differs, and the chapter-boundary methodology. See raw/corrections-log.json ' +
            'for the per-page correction count and notes (what was wrong, and what the page image actually shows) ' +
            'for every one of the 103 pages reviewed. No doubt was left unresolved during this review: every ' +
            'correction was made with direct confirmation from the page image, and no passage was left ambiguous.',
        ],
      },
    ],
  };

  writeWorkOutputs(OUT_DIR, work, about, anomalies);
  process.stdout.write(`\n${chapterNumbers.length} chapters, ${totalChars} chars, ${anomalies.length} anomalies\n`);
  process.stdout.write(`${totalCorrections} corrections across ${pagesTouched}/${pages.length} pages (${proofreadPages.length} proofread, ${rawOcrPages.length} raw OCR).\n`);
  process.stdout.write('Done. Run `npx tsx scripts/import-dante/validate.ts` next.\n');
}

main();
