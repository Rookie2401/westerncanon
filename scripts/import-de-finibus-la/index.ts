/**
 * Cicero, De Finibus Bonorum et Malorum - Latin text (ed. Theodor Schiche,
 * M. Tulli Ciceronis De Finibus Bonorum et Malorum Libri Quinque, Leipzig:
 * Teubner, 1915; CTS urn:cts:latinLit:phi0474.phi048.perseus-lat2). Run-once
 * ingestion pipeline.
 *
 *   npm run import:de-finibus-la
 *
 * Reads scripts/import-de-finibus-la/raw/phi0474.phi048.perseus-lat2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository and
 * committed here; nothing is downloaded at import time) and writes:
 *   data/de-finibus-la/work.json       - the GenericWork (5 Books, each a
 *                                         flat list of Section divisions,
 *                                         one Passage each)
 *   data/de-finibus-la/about.json      - provenance / licence / prose
 *   data/de-finibus-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-finibus-la`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): two-level
 * `<div type="textpart" subtype="book" n="N">` (5 books) containing
 * `<div type="textpart" subtype="section" n="M">` (443 total - Perseus's own
 * fine paragraph-level numbering, NOT the coarser traditional chapter
 * numbering). Each section div holds one or more `<p>` paragraphs. The
 * traditional chapter numbers (I, II, III... - what every modern citation of
 * "Fin. 1.17" etc. actually means) are carried as inline
 * `<milestone unit="chapter" n="…"/>` markers scattered through the section
 * divs (138 total; confirmed to reset to "1" at the start of every book and
 * run contiguously 1..21/35/22/28/32 - exactly the traditionally cited
 * chapter counts for each of the 5 books). A milestone does not necessarily
 * fall at a section boundary (most chapters span multiple sections), so each
 * section's Division.ref is simply the nearest preceding milestone value in
 * document order (carried forward across section boundaries, reset per
 * book), not a range.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-grc,
 * the closest existing precedent for a Perseus critical-apparatus text):
 *   - verbatim Latin reading text only; no accent/spelling/wording fixes.
 *   - `<milestone unit="chapter" n="…"/>` (138 total, all outside any
 *     `<note>`) is zero-width transport scaffolding, stripped from the
 *     reading text; its value seeds Division.ref as described above.
 *   - `<pb n="…"/>` (page-break milestones, 203 total) are zero-width
 *     transport scaffolding with no reference role in this schema -
 *     stripped, not counted individually (Perseus print-page boundaries are
 *     orthogonal to the citation scheme used here).
 *   - `<note>...</note>` (3,658 total) is Schiche's own critical apparatus -
 *     manuscript sigla, variant readings, editorial cross-references (e.g.
 *     "eisdem N his (hys) BE") - NOT Cicero's text at all; excluded from the
 *     reading text entirely (tag AND content), matching the Perseus-note
 *     convention already used elsewhere in this app.
 *   - `<del>...</del>` (30 spans outside any note) is text Schiche's
 *     apparatus brackets as a probable interpolation/gloss, not his judged
 *     authentic text - EXCLUDED from the reading text, matching Euclid's/the
 *     Nicomachean Ethics Greek importer's `<del>` convention; every
 *     occurrence outside a note is logged verbatim to anomalies.json (a
 *     further 6 `<del>` occur nested inside a `<note>` and are already
 *     excluded as part of that note - not logged separately).
 *   - `<add>...</add>` (82 spans outside any note) is a genuine editorial
 *     insertion Schiche prints - INCLUDED in the reading text, matching the
 *     `<add>` convention used elsewhere; every occurrence outside a note is
 *     logged and the containing section's Passage carries an `anomaly` note
 *     (a further 9 `<add>` occur nested inside a `<note>` and are excluded
 *     as part of that note).
 *   - `<gap reason="…" rend="…"/>` (4 total outside any note; a further 67
 *     occur nested inside a `<note>` describing a *manuscript* apparatus gap
 *     and are excluded along with that note) is self-closing but genuinely
 *     PRINTED content when outside a note (the `rend` attribute is the
 *     literal dots/asterisks Schiche's page shows, e.g. "..." or " * * ");
 *     kept verbatim as that literal text rather than dropped, and logged
 *     individually.
 *   - `<quote>`/`<l>`/`<q>` (Ennius/Terence verse Cicero quotes, Cicero's own
 *     quotation marks), `<foreign xml:lang="grc">` (untranslated Greek words
 *     Cicero uses inline), `<hi rend="italic"/"sup"/"…">` (typographic
 *     styling), `<emph rend="smallcaps">` (typographic emphasis), and the
 *     rare `<w>...</w>`/`<c>...</c>` (word/notation wrapper tags used only,
 *     by direct inspection, INSIDE `<note>` apparatus - never in the running
 *     text) are all unwrapped where they appear in the running text: pure
 *     typographic/structural markup around genuine Ciceronian content, never
 *     dropped.
 *   - `<head>...</head>` (5 total, one per book, e.g. "LIBER PRIMUS") seeds
 *     that Book's Division.sourceHeading verbatim.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Section is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n" (per this app's Book->Section GenericWork convention - see
 *     data/de-finibus-la/types.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-finibus-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi048.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-finibus-la');

const WORK_ID = 'de-finibus-la';

interface Anomaly {
  where: string;
  note: string;
}

/** Traditionally cited chapter counts per book (I..V), reconstructed from this source's own <milestone unit="chapter"/> markers; compared against the real parsed counts below and flagged, never forced. */
const CANONICAL_CHAPTER_COUNTS = [21, 35, 22, 28, 32];

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 160): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div type="textpart" subtype="book"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<head\b[^>]*>|<\/head>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let sectionAnomalyNotes: string[] = [];
  let currentChapterRef: string | null = null;

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';
  let headDepth = 0;
  let headBuf = '';

  let totalSections = 0;
  let totalDelSpans = 0;
  let totalDelSpansInNote = 0;
  let totalAddSpans = 0;
  let totalAddSpansInNote = 0;
  let totalGaps = 0;
  let totalGapsInNote = 0;
  let totalNotes = 0;
  let totalChapterMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionAnomalyNotes = [];
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) {
      fail(`section "${currentSectionId}" has no surviving paragraph text`);
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
      if (headDepth > 0) {
        headBuf += free;
      } else if (inP && noteDepth === 0) {
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
      // book open
      stack.push('book');
      currentBookNum = Number(m[1]);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 5) {
        fail(`unexpected book number "${m[1]}"`);
      }
      currentChapterRef = null;
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: String(currentBookNum),
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
      // book-open and section-open are matched by the more specific
      // alternatives above; the only other <div ...> here is the outer
      // "edition" wrapper - tracked only for balanced nesting.
      stack.push('other');
    } else if (/^<head\b/.test(tok)) {
      headDepth += 1;
      headBuf = '';
    } else if (tok === '</head>') {
      headDepth -= 1;
      if (currentBookDiv) currentBookDiv.sourceHeading = cleanText(headBuf);
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
        });
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
      if (noteDepth === 0) delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      if (noteDepth === 0) {
        totalDelSpans += 1;
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<del> excluded from the reading text (Schiche's apparatus brackets this as a probable interpolation/gloss): "${excerpt(delBuf)}"`,
        });
        delBuf = '';
      } else {
        totalDelSpansInNote += 1;
      }
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      if (noteDepth === 0) addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      if (noteDepth === 0) {
        totalAddSpans += 1;
        const t = excerpt(addBuf);
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<add> editorial insertion, kept verbatim in the reading text: "${t}"`,
        });
        sectionAnomalyNotes.push(`editorial insertion <add> printed in the edition, kept verbatim: "${t}"`);
        addBuf = '';
      } else {
        totalAddSpansInNote += 1;
      }
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'chapter' && nMatch?.[1] && noteDepth === 0) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      }
    } else if (/^<gap\b/.test(tok)) {
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (noteDepth === 0) {
        totalGaps += 1;
        if (inP && delDepth === 0) {
          pBuf += literal;
          if (addDepth > 0) addBuf += literal;
        }
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source, printed as "${literal}"; kept verbatim in the reading text rather than dropped.`,
        });
      } else {
        totalGapsInNote += 1;
      }
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (quote/l/q opens & closes, foreign, hi, emph, and the note-only w/c):
    // no structural action - their content already flows into pBuf via the
    // free-text capture above (suppressed only while noteDepth > 0 or
    // headDepth > 0 redirects it).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 5) fail(`expected exactly 5 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);
  if (headDepth !== 0) fail(`unbalanced <head> nesting (final depth ${headDepth})`);

  // --- cross-check chapter-milestone counts against the traditionally cited
  //     numbers, honestly, without forcing a match -------------------------
  const perBookMilestoneCounts: number[] = [];
  {
    // Recount per book by walking the already-built ref values is awkward
    // (ref is carried, not per-book-scoped in the array); instead re-derive
    // from the parsed tree: the highest ref value seen in each book (refs
    // are the milestone's own printed arabic string, contiguous from "1").
    for (const b of divisions) {
      let max = 0;
      for (const s of b.children) {
        const n = s.ref ? Number(s.ref) : 0;
        if (Number.isFinite(n) && n > max) max = n;
      }
      perBookMilestoneCounts.push(max);
    }
  }
  const chapterCountMismatches: string[] = [];
  perBookMilestoneCounts.forEach((got, i) => {
    const want = CANONICAL_CHAPTER_COUNTS[i]!;
    if (got !== want) {
      chapterCountMismatches.push(`Book ${i + 1}: highest chapter milestone parsed ${got}, traditionally cited ${want}`);
    }
  });
  if (chapterCountMismatches.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / chapter counts`,
      note: `${chapterCountMismatches.length} book(s) parse to a highest chapter-milestone value different from the number traditionally cited for De Finibus: ${chapterCountMismatches.join('; ')}.`,
    });
  }

  // --- no section should ever be empty ------------------------------------
  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) {
    fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);
  }

  // --- corpus-level anomalies ----------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> elements (Schiche's critical apparatus - manuscript sigla, variant readings, editorial cross-references, not Cicero's text) were excluded entirely, tag and content; not logged individually given their number. This also accounts for the ${totalDelSpansInNote} <del>, ${totalAddSpansInNote} <add> and ${totalGapsInNote} <gap/> occurrences that happen to sit nested inside an excluded <note> (already excluded as part of it, and not double-logged below).`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans outside any <note> (Schiche's apparatus brackets these as probable interpolations/glosses, not his judged authentic text) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial insertions outside any <note> were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap/> markers outside any <note> (manuscript lacunae) were kept as their literal printed rendering (e.g. "..." or " * * "); every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `${totalChapterMilestones} traditional-chapter <milestone unit="chapter"/> markers captured (all outside any <note>); each Section's Division.ref is the nearest preceding marker value in document order, carried forward across section boundaries and reset to null at the start of each book. Every Passage.ref is null: the reference lives on the Section Division itself.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Finibus Bonorum et Malorum',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    edition: 'Schiche 1915 (Teubner)',
    editor: 'Theodor Schiche',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi048.perseus-lat2), which digitises Theodor Schiche, ed., M. Tulli Ciceronis De Finibus Bonorum et Malorum Libri Quinque (Leipzig: Teubner, 1915); imported by scripts/import-de-finibus-la.',
    license:
      "Schiche's 1915 Teubner critical text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's De Finibus Bonorum et Malorum",
        paragraphs: [
          'This is the Latin text of De Finibus Bonorum et Malorum ("On the Ends of Good and Evil"), Cicero\'s dialogue in five books surveying the leading Hellenistic ethical theories - Epicurean (Book 1, rebutted in Book 2), Stoic (Book 3, rebutted in Book 4) and the Antiochean/Old Academic position (Book 5) - written in 45 BC.',
          'The text here is the original Latin, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular - a bracketed interpolation, an editorial insertion, a marked manuscript gap - the irregularity is preserved and noted below; it never affects the reading text itself beyond the documented exclusions.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          "Theodor Schiche, ed., M. Tulli Ciceronis De Finibus Bonorum et Malorum Libri Quinque (Leipzig: Teubner, 1915), the standard Teubner critical text. This edition is in the public domain.",
          'The work is divided into 5 Books; within each Book, this edition carries both Perseus\'s own fine paragraph-level "section" numbering (443 sections total - see "Reference scheme") and, as inline markers, the traditional Ciceronian chapter numbering (21/35/22/28/32 chapters in Books 1-5 respectively) by which the work is normally cited (e.g. "Fin. 1.17").',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi048.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi048.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section <div>s and collects every <p> paragraph within each section, in document order, into that section\'s single Passage (joined with a blank line when a section has more than one paragraph). XML transport scaffolding only is removed: the inline chapter <milestone> markers (their values instead seed each section\'s Division.ref) and page-break <pb/> markers are dropped, and purely typographic wrapper tags (<quote>/<l>/<q> verse and quotation markup, <foreign xml:lang="grc"> for Cicero\'s own untranslated Greek, <hi>/<emph> styling) are unwrapped, their text flowing into the surrounding prose.',
          "Schiche's own critical apparatus is handled the same way this app already treats it in the Nicomachean Ethics Greek edition: <note> elements (manuscript sigla and variant readings) are dropped entirely; text his apparatus brackets as a probable interpolation (<del>) is excluded from the reading text; a genuine editorial insertion he prints (<add>) is kept; a marked manuscript gap (<gap>) is kept as its literal printed rendering. Every occurrence of all three outside a <note> is logged individually in anomalies.json (occurrences nested inside an excluded <note> are already excluded as part of it and not double-logged).",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and (Perseus) Section - the fine, 443-entry paragraph numbering this edition\'s own XML carries - each Section additionally showing the traditional chapter number it falls under (e.g. "§ 5" might show as chapter "3") as Division.ref, reconstructed from this source\'s own inline chapter <milestone> markers: the nearest preceding marker value in document order, since a chapter typically spans several Perseus sections. Passage.ref is always null; the reference lives on the Section Division itself.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 5 Books and all 443 sections of this edition are present and in order. No paragraph is dropped, merged or reordered except where documented below; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          "Schiche's critical apparatus. 30 <del> spans (text Schiche's apparatus brackets as a probable interpolation or gloss) outside any <note> are excluded from the reading text; 82 <add> spans (a genuine editorial insertion he prints) outside any <note> are kept; 4 <gap> markers (manuscript lacunae) outside any <note> are kept as their literal printed rendering. Every occurrence of all three is logged individually in anomalies.json. A further 6 <del>, 9 <add> and 67 <gap> occur nested inside a <note> and are already excluded along with that note's own content.",
          'Critical-apparatus notes. 3,658 <note> elements (manuscript sigla, variant readings, editorial glosses - not Cicero\'s text) are Schiche\'s own apparatus criticus, not part of the transmitted Latin; dropped entirely rather than shown inline.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const s of b.children) {
      totalPassages += s.passages.length;
      totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (let i = 0; i < divisions.length; i++) {
    const b = divisions[i]!;
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections  (highest chapter milestone ${perBookMilestoneCounts[i]}, traditionally cited ${CANONICAL_CHAPTER_COUNTS[i]})\n`,
    );
  }
  process.stdout.write(
    `\n  5 books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalChapterMilestones} chapter milestones  ${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalGaps} <gap>  ${totalNotes} <note>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-finibus-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
