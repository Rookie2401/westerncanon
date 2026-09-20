/**
 * Cicero, De Republica - Latin text (ed. Carl Friedrich Wilhelm Mueller,
 * Librorum de Re Publica Sex, Leipzig: Teubner, 1889; CTS
 * urn:cts:latinLit:phi0474.phi043.perseus-lat2). Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-de-republica-la/index.ts
 *
 * Reads scripts/import-de-republica-la/raw/phi0474.phi043.perseus-lat2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/de-republica-la/work.json       - the GenericWork (9 top-level
 *                                           Book-ish divisions, each a flat
 *                                           list of Section divisions, one
 *                                           Passage each)
 *   data/de-republica-la/about.json      - provenance / licence / prose,
 *                                           with a long "Known gaps &
 *                                           anomalies" account of just how
 *                                           fragmentary this work really is
 *   data/de-republica-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-republica-la/validate.ts`.
 *
 * THIS WORK IS GENUINELY, SEVERELY FRAGMENTARY. See data/de-republica-la/
 * types.ts and about.json for the full account; the short version: Mueller's
 * edition prints NINE top-level `<div type="textpart" subtype="book">`
 * divs, not six - `n="1"`, `"1fr"`, `"2"`, `"3"`, `"3fr"`, `"4"`, `"5"`,
 * `"6"`, `"fr"`, in that document order. The six numbered ones are
 * themselves gappy (confirmed directly: this edition's own
 * `subtype="section"` numbering skips repeatedly within Books 1/2/3/5/6 -
 * e.g. Book 3 jumps 19->23, 28->32, 34->36, 37->39 - meaning Mueller's own
 * edition has NO text at all for those traditionally-cited paragraph slots,
 * not a transcription gap on this importer's part); the three "fr"-suffixed
 * ones are loose fragment collections Mueller could not even place within a
 * numbered book. 147 `<gap reason="lost" .../>` markers are scattered
 * throughout - including single lacunae of "34 pages" and "16 pages" in
 * Book 1 alone - reflecting the real transmission history: large stretches
 * survive only via a 4th/5th-century palimpsest (rediscovered 1819) plus
 * ~150 separate quotations embedded in later authors (this is the ONLY
 * source for some material, including the entire "Dream of Scipio" that
 * closes Book 6).
 *
 * Faithfulness rules (mirrors scripts/import-de-officiis-la and
 * scripts/import-aristotle-nicomachean-ethics-grc):
 *   - verbatim Latin reading text only; no accent/spelling/wording fixes.
 *   - `<milestone unit="chapter" .../>` (162 total) seeds each Section's
 *     Division.ref (nearest preceding value, carried forward, reset to null
 *     at the start of each top-level div - the three fragment collections
 *     carry none at all, so their every ref is null).
 *     `<milestone unit="chapter_alt" .../>` (9, an alternate numbering this
 *     edition also marks in Book 6) and `<milestone unit="section" .../>`
 *     (6, marking a shift in WHICH later author's quotation is being
 *     followed within a single continuous passage, e.g. "34(fr1)") are
 *     dropped as scaffolding - this app's schema has no field for either -
 *     without affecting the reading text or Division.ref.
 *   - `<del>...</del>` (9 spans) is text Mueller's apparatus brackets as a
 *     probable interpolation, not his judged authentic text - EXCLUDED,
 *     matching this app's established <del> convention; every occurrence
 *     logged verbatim.
 *   - `<add>...</add>` (11 spans) is a genuine editorial insertion Mueller
 *     prints - INCLUDED, matching this app's established <add> convention;
 *     every occurrence logged and the containing Section's Passage flagged.
 *   - `<gap reason="lost" extent="…" rend="…"/>` is kept as its LITERAL
 *     printed rendering (the `rend` value, e.g. ". . ." or ". . . . .")
 *     when this edition prints one; when it has no `rend` (a lacuna of a
 *     page or more, for which this edition prints no dots at that exact
 *     point - only the `extent` describes it, e.g. "34 pages") nothing is
 *     fabricated in its place. Every occurrence is logged individually with
 *     its full `reason`/`extent`/`rend` values.
 *   - `<note>...</note>` (1 occurrence - a citation gloss embedded mid-quote
 *     identifying its source, "August. C.D. 2.21, Non. 417M") is excluded
 *     entirely, tag and content, matching this app's established Perseus-
 *     note convention.
 *   - EDITORIAL JUDGEMENT CALL (flagged prominently in the final report,
 *     not silently applied): each fragment section's `<bibl>` element (e.g.
 *     "Non. p. 426M", "Lactant. Div. Inst. 3.16.5") - identifying which
 *     later author's quotation preserves that fragment - is KEPT as part of
 *     the reading text (unwrapped, like any other inline tag), NOT excluded
 *     the way a `<note>` is. Unlike the Perseus `<note resp="Perseus">`
 *     citation glosses elsewhere in this app (Perseus editorial additions,
 *     not the edition's own printed text), a `<bibl>` in a Teubner-style
 *     "Fragmenta" collection is standard practice for how the edition
 *     itself presents a fragment on the printed page - the citation and the
 *     quotation are not meaningfully separable here. This is a judgement
 *     call, not a certainty; see the final report.
 *   - `<cit>`, `<quote>`, `<l>`/`<lg>` (verse), `<q>`, `<emph>`, `<label>`
 *     (speaker labels, e.g. "SC."), `<num>` (roman numerals in a quoted
 *     inscription) and `<foreign>` are all unwrapped: pure typographic/
 *     structural markup around genuine text, never dropped.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Section is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n".
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-republica-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi043.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-republica-la');

const WORK_ID = 'de-republica-la';

interface Anomaly {
  where: string;
  note: string;
}

/** Document order and this edition's own top-level div n values - confirmed by direct inspection, not assumed. */
const EXPECTED_BOOK_NS = ['1', '1fr', '2', '3', '3fr', '4', '5', '6', 'fr'];

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 140): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

export function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<body');
  const textEnd = xml.indexOf('</body>');
  if (textStart < 0 || textEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(textStart, textEnd);

  // Attribute order in this file is n="X" subtype="Y" xml:base="…"; lookaheads keep this robust either way.
  const BOOK_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="book")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const SECTION_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="section")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const tokenRe = new RegExp(
    `${BOOK_OPEN}|${SECTION_OPEN}|<div\\b[^>]*>|<\\/div>|<head\\b[^>]*>|<\\/head>|<p\\b[^>]*>|<\\/p>|<del\\b[^>]*>|<\\/del>|<add\\b[^>]*>|<\\/add>|<note\\b[^>]*>|<\\/note>|<gap\\b[^>]*\\/>|<milestone\\b[^>]*\\/>|<[^>]+>`,
    'g',
  );

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'section' | 'head' | 'other'> = [];
  let currentBookN = '';
  let currentBookDiv: Division | null = null;
  let currentChapterRef: string | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let sectionAnomalyNotes: string[] = [];
  let sectionDelFallback: string[] = [];

  let inP = false;
  let pBuf = '';
  let inHead = false;
  let headBuf = '';
  let noteDepth = 0;
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let totalSections = 0;
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalGaps = 0;
  let totalGapsWithRend = 0;
  let totalNotes = 0;
  let totalChapterMilestones = 0;
  let totalChapterAltMilestones = 0;
  let totalSectionMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  let sectionGapDescriptions: string[] = [];

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookN}-sec-${n}`;
    sectionParagraphs = [];
    sectionAnomalyNotes = [];
    sectionDelFallback = [];
    sectionGapDescriptions = [];
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0 && sectionDelFallback.length > 0) {
      sectionParagraphs = sectionDelFallback;
      const note =
        "Mueller's apparatus brackets this ENTIRE section as a probable interpolation (<del>); kept here " +
        'only because excluding it would leave this section with no reading text at all - unlike every other ' +
        '<del> span in this work (which is silently excluded), this one is retained but flagged as suspect.';
      sectionAnomalyNotes.push(note);
      anomalies.push({ where: currentSectionId, note });
    }
    if (sectionParagraphs.length === 0) {
      // Genuinely nothing survives for this section slot at all - not even a fragment via
      // <del>/<add> - only <gap> marker(s) with no literal rendering (a page-or-more lacuna).
      // This app's schema requires non-empty Passage.text, so a clearly-labelled EDITORIAL
      // placeholder (never presented as Cicero's own words) is used instead of failing the
      // whole import over one genuinely blank paragraph-slot; flagged loudly here and in the
      // final report, never silently inserted.
      const gapInfo = sectionGapDescriptions.length > 0 ? sectionGapDescriptions.join('; ') : 'no <gap> detail available';
      const placeholder = `[No text survives in this edition for this section — ${gapInfo}]`;
      sectionParagraphs = [placeholder];
      const note =
        `This section's ENTIRE content is lost (${gapInfo}); this app's schema requires non-empty Passage.text, ` +
        'so the importer supplied the bracketed placeholder above - it is NOT Cicero\'s text, NOT Mueller\'s ' +
        'printed dots, and NOT present in the source XML in this form; it exists only so this section is not ' +
        'silently skipped. Flagged prominently in the final import report.';
      sectionAnomalyNotes.push(note);
      anomalies.push({ where: currentSectionId, note });
    }
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (sectionAnomalyNotes.length > 0) passage.anomaly = sectionAnomalyNotes.join(' ');
    const sectionDiv: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: currentChapterRef,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(sectionDiv);
    totalSections += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inHead) headBuf += free;
      else if (inP && noteDepth === 0) {
        if (delDepth > 0) {
          delBuf += free;
        } else {
          pBuf += free;
          if (addDepth > 0) addBuf += free;
        }
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      // book (or fragment-collection) open
      stack.push('book');
      currentBookN = m[1];
      currentChapterRef = null;
      currentBookDiv = {
        id: `book-${currentBookN}`,
        number: currentBookN,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
    } else if (m[2] !== undefined) {
      // section open
      stack.push('section');
      openSection(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<head\b/.test(tok)) {
      stack.push('head');
      inHead = true;
      headBuf = '';
    } else if (tok === '</head>') {
      stack.pop();
      inHead = false;
      if (!currentBookDiv) fail('</head> closed outside any book');
      (currentBookDiv as Division).sourceHeading = cleanText(headBuf);
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
      } else {
        sectionParagraphs.push(cleaned);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      totalDelSpans += 1;
      anomalies.push({
        where: currentSectionId || `book-${currentBookN}`,
        note: `<del> excluded from the reading text (Mueller's apparatus brackets this as a probable interpolation): "${excerpt(delBuf)}"`,
      });
      const cleanedDel = cleanText(delBuf);
      if (cleanedDel.length > 0) sectionDelFallback.push(cleanedDel);
      delBuf = '';
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      totalAddSpans += 1;
      const t = excerpt(addBuf);
      anomalies.push({
        where: currentSectionId || `book-${currentBookN}`,
        note: `<add> editorial insertion, kept verbatim in the reading text: "${t}"`,
      });
      sectionAnomalyNotes.push(`editorial insertion <add> printed in the edition, kept verbatim: "${t}"`);
      addBuf = '';
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const extentMatch = /extent="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (literal) totalGapsWithRend += 1;
      if (inP && noteDepth === 0 && delDepth === 0) {
        pBuf += literal;
        if (addDepth > 0) addBuf += literal;
      }
      sectionGapDescriptions.push(
        `reason="${reasonMatch?.[1] ?? ''}"${extentMatch ? ` extent="${extentMatch[1]}"` : ''}${literal ? ` rend="${literal}"` : ''}`,
      );
      anomalies.push({
        where: currentSectionId || `book-${currentBookN}`,
        note:
          `<gap reason="${reasonMatch?.[1] ?? ''}"${extentMatch ? ` extent="${extentMatch[1]}"` : ''}/> in the source` +
          `${literal ? `, printed as "${literal}"` : ' with no literal rendering given'}; ` +
          `${literal ? 'kept verbatim in the reading text rather than dropped' : 'nothing fabricated in its place'}.`,
      });
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'chapter' && nMatch?.[1]) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      } else if (unitMatch?.[1] === 'chapter_alt') {
        totalChapterAltMilestones += 1;
      } else if (unitMatch?.[1] === 'section') {
        totalSectionMilestones += 1;
      }
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<cit>/<bibl>/<quote>/<l>/<lg>/<q>/<emph>/<label>/<num>/<foreign>/<pb/>
    // and their ilk): no structural action - their content already flows
    // into pBuf/headBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOK_NS.length) {
    fail(`expected exactly ${EXPECTED_BOOK_NS.length} top-level Book-ish divisions, got ${divisions.length}`);
  }
  divisions.forEach((b, i) => {
    if (b.number !== EXPECTED_BOOK_NS[i]) {
      fail(`top-level division[${i}]: expected n="${EXPECTED_BOOK_NS[i]}", got n="${b.number}"`);
    }
  });
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);

  // --- no section should ever be empty ---
  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);

  // --- log this edition's own non-sequential section numbering per top-level div, honestly ---
  const sectionNumberSkips: string[] = [];
  for (const b of divisions) {
    let prev: number | null = null;
    for (const s of b.children) {
      const n = Number(s.number);
      if (Number.isFinite(n)) {
        if (prev !== null && n !== prev + 1) {
          sectionNumberSkips.push(`${b.id}: jumps from ${prev} to ${n} (no section ${prev + 1}..${n - 1} in this edition)`);
        }
        prev = n;
      }
    }
  }
  if (sectionNumberSkips.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / section numbering`,
      note:
        `This edition's own section numbering is NOT sequential within ${new Set(sectionNumberSkips.map((s) => s.split(':')[0])).size} ` +
        `top-level division(s) - genuine gaps in Mueller's own numbering (usually reflecting a stretch with no surviving text at all, not ` +
        `a parsing omission on this importer's part): ${sectionNumberSkips.join('; ')}.`,
    });
  }

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      "This edition prints NINE top-level divisions, not six: the six traditionally numbered books (1-6) plus three " +
      'separately-transmitted fragment collections Mueller could not place within a numbered book ("1fr" after Book 1, ' +
      '"3fr" after Book 3, and a final "fr" for fragments not assignable to any particular book). All nine are preserved ' +
      'as separate top-level Divisions, in document order, each with its own verbatim sourceHeading; see about.json.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (Mueller's apparatus brackets these as probable interpolations, not his judged authentic text) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial insertions were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap reason="lost" .../> markers (manuscript lacunae, from a few missing words up to "34 pages" in a single Book 1 gap) were encountered; ${totalGapsWithRend} carried a literal "rend" rendering (Mueller's own printed dots, e.g. ". . ." or ". . . . ."), kept verbatim, and ${totalGaps - totalGapsWithRend} carried none (nothing was fabricated in their place). Every occurrence is logged individually above with its full reason/extent/rend values.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> citation gloss(es) embedded mid-quotation (identifying the immediate source of that quotation, not Mueller's own text) were excluded entirely, tag and content.`,
  });
  anomalies.push({
    where: `${WORK_ID} / editorial judgement call - fragment citations kept`,
    note:
      "Every fragment section's <bibl> source-citation (e.g. \"Non. p. 426M\", \"Lactant. Div. Inst. 3.16.5\") is KEPT as part of " +
      'the reading text, unlike a Perseus editorial <note> elsewhere in this app. This is a deliberate judgement call: unlike a ' +
      "Perseus-added aside, a Teubner-style \"Fragmenta\" collection's citation is standard apparatus for how the edition itself " +
      'presents each fragment on the printed page, and is not really separable from what the "text" of a fragment is. Flagged here ' +
      'explicitly since it is a judgement call, not a certainty - see the importer module doc and the final report.',
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `${totalChapterMilestones} chapter milestones captured; each section's Division.ref is the nearest preceding chapter value within its own top-level division, reset to null at the start of each division (the three fragment collections carry none at all, so every one of their sections has ref=null). This edition also marks ${totalChapterAltMilestones} <milestone unit="chapter_alt"/> (an alternate numbering, only in Book 6) and ${totalSectionMilestones} <milestone unit="section"/> (marking a shift in which later author's quotation is being followed, e.g. "34(fr1)") - this app's schema has no field for either, so both are dropped as scaffolding without affecting the reading text or Division.ref. Every Passage.ref is null throughout.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text (fully <del>-excluded, or otherwise) were dropped rather than joined as an empty segment.`,
    });
  }
  const daggerCount = [...body.matchAll(/†/g)].length;
  if (daggerCount > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${daggerCount} "†" (crux) mark(s) are preserved verbatim in the reading text - Mueller's own convention for flagging a word or phrase he judges corrupt in the manuscript tradition but cannot confidently emend; not stripped or resolved.`,
    });
  }

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Republica',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    edition: 'Teubner, 1889',
    editor: 'Carl Friedrich Wilhelm Mueller',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi043.perseus-lat2), which digitises Carl Friedrich Wilhelm Mueller, ed., M. Tulli Ciceronis: Librorum de Re Publica Sex (Leipzig: Teubner, 1889); imported by scripts/import-de-republica-la.',
    license:
      "Mueller's 1889 Latin text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Republica — Latin',
        paragraphs: [
          'This is the Latin text of Cicero’s De Republica ("On the Republic"), his dialogue on the best form of the commonwealth and the ideal statesman, dramatically set in 129 BC and cast as a conversation led by Scipio Aemilianus. It survives in six traditionally numbered books.',
          'IMPORTANT: this is a genuinely, severely fragmentary work - not a complete text. Large parts of the original six books are lost outright, and what survives comes from two entirely different channels of transmission: a 4th/5th-century palimpsest manuscript (its original text scraped off and overwritten with a work of Augustine, rediscovered by Angelo Mai in the Vatican Library in 1819) covering substantial stretches of Books 1-2 and scattered parts of the rest, and roughly 150 separate quotations embedded in later authors (chiefly Augustine, Nonius Marcellus, Macrobius and Lactantius) - the ONLY source for everything the palimpsest does not cover, including the entire "Dream of Scipio" (Somnium Scipionis) that closes Book 6. See "Known gaps & anomalies" below for the full account; it is not something this import tries to smooth over.',
          'No English translation is bundled with this Latin text at this time. The one readily available public-domain English translation (Featherstonhaugh, 1829) has been independently found to have significant internal gaps of its own and to omit Book 6 - including the Dream of Scipio - entirely; rather than bundle a translation that is itself incomplete and potentially misleading about which gaps are Cicero’s and which are the translator’s, this app currently ships the Latin only, pending a better public-domain translation.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Carl Friedrich Wilhelm Mueller, ed., M. Tulli Ciceronis: Librorum de Re Publica Sex (Leipzig: Teubner, 1889). This edition is in the public domain.',
          'Mueller’s edition prints NINE top-level divisions, not six: the six traditionally numbered books (each itself incomplete to varying degrees - see below) PLUS three separately-transmitted collections of fragments he could not place within a specific numbered book at all: a set of "Fragmenta Incertae Sedis" following Book 1, another following Book 3, and a final, larger set of fragments not even assignable to a particular book. All nine are bundled here as separate top-level divisions, in Mueller’s own document order, each carrying its own verbatim heading (e.g. "Liber Primus", "Libri I de Re Publica Fragmenta Incertae Sedis").',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi043.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi043.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks all nine top-level divisions and their sections, collecting every surviving <p> paragraph within each section, in document order, into that section’s single Passage. XML transport scaffolding only is removed: inline chapter <milestone> markers (their values instead seed each section’s Division.ref) and purely typographic wrapper tags (<cit>/<quote>/<l>/<lg> quotations and verse, <q>, <emph>, <label> speaker labels, <num>, <foreign>) are unwrapped, their text flowing into the surrounding prose. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          'Mueller’s own critical apparatus is handled the way this app already treats it elsewhere: text his apparatus brackets as a probable interpolation (<del>, 9 occurrences) is excluded from the reading text; a genuine editorial insertion he prints (<add>, 11 occurrences) is kept; a marked manuscript gap (<gap>, 147 occurrences) is kept as its literal printed dots where this edition prints any, or left with nothing fabricated where it does not. One embedded citation gloss (<note>, identifying the immediate source of a quotation) is excluded entirely. Every occurrence of all four is logged individually in anomalies.json.',
          'DELIBERATE JUDGEMENT CALL: for the fragment-collection sections (the "1fr"/"3fr"/"fr" divisions), each fragment’s <bibl> source citation (e.g. "Non. p. 426M", identifying which later author’s quotation preserves that fragment) is kept as part of the reading text rather than excluded the way a Perseus editorial <note> is elsewhere in this app - reasoned out in the importer’s module doc and flagged explicitly here and in the final import report, since it is a judgement call rather than a certainty.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by (Book or fragment-collection) and Section, plus Cicero’s traditional chapter reference reconstructed from this edition’s own inline chapter milestones. A section’s Division.ref is the nearest preceding chapter value within its own top-level division, reset to null at the start of each of the nine divisions; the three fragment collections carry no chapter milestones at all, so every one of their sections has a null ref. Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'This work is NOT complete, and this is real - not a defect of this import. What survives comes from two channels: a palimpsest manuscript (substantial stretches of Books 1-2, scattered parts elsewhere) and roughly 150 separate quotations preserved by later authors (the only source for the rest, including the entire Dream of Scipio at the end of Book 6).',
          'Nine top-level divisions, not six. Mueller’s edition separates out three fragment collections ("1fr", "3fr", "fr") that could not be placed within a numbered book - see "The edition" above.',
          'Non-sequential section numbering WITHIN the six numbered books themselves - a genuine feature of this edition, not a parsing gap. Every skip is logged individually in anomalies.json (e.g. Book 3 alone jumps 1→3, 9→11, 19→23, 28→32, 34→36, 37→39 - meaning Mueller’s own edition has no text at all for roughly a third of Book 3’s traditionally-cited paragraph numbers). Book 3 (Philus’s sceptical case against justice and Laelius’s reply) and Books 4-5 are the worst-preserved of the six numbered books; Books 1-2 are the most complete, thanks to the palimpsest.',
          '147 <gap reason="lost" .../> markers, from a few missing words up to "34 pages" and "16 pages" in single gaps within Book 1 alone. Every occurrence is logged individually with its reason/extent/rend in anomalies.json.',
          "Mueller's critical apparatus. 9 <del> spans (probable interpolations) are excluded; 11 <add> spans (editorial insertions he prints) are kept; every occurrence of both is logged individually. A small number of \"†\" (crux) marks - Mueller's own flag for text he judges corrupt but cannot confidently emend - are preserved verbatim in the reading text, not resolved.",
          'No bundled English translation at this time. See the opening section above for why (the one available public-domain translation is itself incompletely transmitted and omits Book 6 entirely).',
          'Editorial judgement call: fragment citations kept in the reading text rather than excluded as apparatus. See "How it was imported" above; flagged explicitly rather than applied silently.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ---
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const s of b.children) {
      totalPassages += s.passages.length;
      totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nTop-level divisions:\n');
  for (const b of divisions) {
    process.stdout.write(`  book-${b.number!.padEnd(4)} ${String(b.children.length).padStart(3)} sections  "${b.sourceHeading}"\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} top-level divisions  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalChapterMilestones} chapter milestones  ${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalGaps} <gap>  ${totalNotes} <note>  ${daggerCount} †\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-republica-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
