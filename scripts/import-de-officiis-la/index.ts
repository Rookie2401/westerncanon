/**
 * Cicero, De Officiis - Latin text (ed. Walter Miller, Cambridge, MA:
 * Harvard University Press; London: William Heinemann Ltd, 1913 Loeb
 * Classical Library; CTS urn:cts:latinLit:phi0474.phi055.perseus-lat1).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-officiis-la/index.ts
 *
 * Reads scripts/import-de-officiis-la/raw/phi0474.phi055.perseus-lat1.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/de-officiis-la/work.json       - the GenericWork (3 Books, each a
 *                                          flat list of Section divisions,
 *                                          one Passage each)
 *   data/de-officiis-la/about.json      - provenance / licence / prose
 *   data/de-officiis-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-officiis-la/validate.ts`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): two-level
 * `<div type="textpart" n="N" subtype="book">` (3 books) containing
 * `<div type="textpart" n="M" subtype="section">` (161/89/121 sections
 * respectively, sequential 1..N in each book, no gaps - this source's own
 * fine-grained `subtype="section"` numbering is finer than Cicero's
 * traditional chapter citation, which is 45/25/33 chapters per book, seeded
 * from this source's separate inline chapter milestones - see below). Each book div opens
 * with a verbatim `<head>` rubric ("Liber Primus" etc.), captured as that
 * Book's Division.sourceHeading. Each section div holds two `<p>` elements
 * in this TEI - the real paragraph, then very often a second, EMPTY `<p>`
 * (a source-side artifact of this transcription, not a real second
 * paragraph); an empty `<p>` cleans to '' and is dropped rather than joined
 * in as a blank segment (see the corpus-level anomaly note). Sections also
 * carry inline `<milestone unit="chapter" n="…"/>` markers (Cicero's
 * traditional chapter citation, coarser than section numbering, resetting
 * to 1 at the start of each book); a section's Division.ref is the nearest
 * PRECEDING chapter value, carried forward across sections with no marker
 * of their own, reset to null at the start of each book.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-grc):
 *   - verbatim Latin reading text only; no accent/spelling/wording fixes.
 *   - `<milestone unit="chapter" .../>` values seed Division.ref as above;
 *     `<milestone unit="alternatechpater" .../>` (1 occurrence - note the
 *     source's own misspelling, preserved as observed, not "corrected") and
 *     `<milestone unit="alternatesection" .../>` (5 occurrences) are a
 *     second, alternate numbering this edition also marks but which this
 *     app's schema has no field for; both are dropped as scaffolding without
 *     affecting the reading text or Division.ref, and disclosed once at the
 *     corpus level rather than fabricating a use for them.
 *   - `<del>...</del>` (45 spans) is text Miller's own apparatus brackets as
 *     a probable interpolation, not his judged authentic text - EXCLUDED
 *     from the reading text, matching this app's established Bywater/Euclid
 *     <del> convention; every occurrence is logged verbatim to
 *     anomalies.json.
 *   - `<gap reason="omitted"/>` (2 occurrences, both self-closing with no
 *     `rend` attribute - i.e. no literal dots are printed at that point in
 *     this edition) is kept as nothing (no text fabricated) but logged
 *     individually; this app has no way to know what Miller's own apparatus
 *     would have shown here since no `rend` value is given.
 *   - `<hi rend="italics">` (typographic emphasis) and
 *     `<foreign xml:lang="greek">` (untranslated Greek Cicero quotes inline,
 *     e.g. κατόρθωμα) are unwrapped: pure typographic/structural markup
 *     around genuine text, never dropped.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Section is exactly one Passage, its surviving non-empty `<p>`s joined
 *     with "\n\n" (this source's own second, empty `<p>` per section simply
 *     drops out, per the schema's Book->Section convention - see
 *     data/de-officiis-la/types.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-officiis-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi055.perseus-lat1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-officiis-la');

const WORK_ID = 'de-officiis-la';

interface Anomaly {
  where: string;
  note: string;
}

/** This source's own section counts per book (I..III), cross-checked against the real parsed counts, never forced. */
const EXPECTED_SECTION_COUNTS = [161, 89, 121];

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

  // Attribute order in this file is n="X" subtype="Y" (no xml:base); lookaheads keep this robust either way.
  const BOOK_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="book")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const SECTION_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="section")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const tokenRe = new RegExp(
    `${BOOK_OPEN}|${SECTION_OPEN}|<div\\b[^>]*>|<\\/div>|<head\\b[^>]*>|<\\/head>|<p\\b[^>]*>|<\\/p>|<del\\b[^>]*>|<\\/del>|<gap\\b[^>]*\\/>|<milestone\\b[^>]*\\/>|<[^>]+>`,
    'g',
  );

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'section' | 'head' | 'other'> = [];
  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let currentChapterRef: string | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let sectionAnomalyNotes: string[] = [];
  /** every cleaned <del> span seen in the current section, kept only as a last-resort
   *  fallback for the rare section whose ENTIRE text is wrapped in <del> (see below) */
  let sectionDelFallback: string[] = [];

  let inP = false;
  let pBuf = '';
  let inHead = false;
  let headBuf = '';
  let delDepth = 0;
  let delBuf = '';

  let totalSections = 0;
  let totalDelSpans = 0;
  let totalGaps = 0;
  let totalChapterMilestones = 0;
  let totalAltChapterMilestones = 0;
  let totalAltSectionMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionAnomalyNotes = [];
    sectionDelFallback = [];
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0 && sectionDelFallback.length > 0) {
      // The section's ENTIRE text falls inside <del> (Miller brackets the whole
      // section as a probable interpolation) - excluding it as usual would leave
      // this Division with no reading text at all, which this app's schema does
      // not support. As a last resort ONLY for this case, the <del> content is
      // kept after all, clearly flagged as suspect rather than treated on the
      // same footing as the rest of the text - see anomalies.json.
      sectionParagraphs = sectionDelFallback;
      const note =
        "Miller's apparatus brackets this ENTIRE section as a probable interpolation (<del>); kept here " +
        'only because excluding it would leave this section with no reading text at all - unlike every other ' +
        '<del> span in this work (which is silently excluded), this one is retained but flagged as suspect.';
      sectionAnomalyNotes.push(note);
      anomalies.push({ where: currentSectionId, note });
    }
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
      if (inHead) headBuf += free;
      else if (inP) {
        if (delDepth > 0) delBuf += free;
        else pBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      // book open
      stack.push('book');
      currentBookNum = m[1];
      currentChapterRef = null;
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: currentBookNum,
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
      currentBookDiv.sourceHeading = cleanText(headBuf);
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
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      totalDelSpans += 1;
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: `<del> excluded from the reading text (Miller's apparatus brackets this as a probable interpolation): "${excerpt(delBuf)}"`,
      });
      const cleanedDel = cleanText(delBuf);
      if (cleanedDel.length > 0) sectionDelFallback.push(cleanedDel);
      delBuf = '';
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (inP && delDepth === 0) pBuf += literal;
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source${literal ? `, printed as "${literal}"` : ' with no literal rendering given'}; ${literal ? 'kept verbatim in the reading text rather than dropped' : 'nothing fabricated in its place'}.`,
      });
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'chapter' && nMatch?.[1]) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      } else if (unitMatch?.[1] === 'alternatechpater') {
        totalAltChapterMilestones += 1;
      } else if (unitMatch?.[1] === 'alternatesection') {
        totalAltSectionMilestones += 1;
      }
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<hi>/<foreign>/<l>/<pb/> and their ilk): no structural action - their
    // content already flows into pBuf/headBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 3) fail(`expected exactly 3 Book divisions, got ${divisions.length}`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);

  // --- cross-check section counts against this source's own expected numbers, honestly ---
  const sectionCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTION_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) {
      sectionCountMismatches.push(`Book ${i + 1}: parsed ${got} sections, expected ${want}`);
    }
  });
  if (sectionCountMismatches.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / section counts`,
      note: `${sectionCountMismatches.length} book(s) parse to a section count different from this source's own expected numbering: ${sectionCountMismatches.join('; ')}.`,
    });
  }

  // --- no section should ever be empty ---
  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) {
    fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);
  }

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (Miller's apparatus brackets these as probable interpolations, not his judged authentic text) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap reason="omitted"/> markers were encountered, neither carrying a literal "rend" rendering; nothing was fabricated in their place. Both are logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `${totalChapterMilestones} chapter milestones captured; each section's Division.ref is the nearest preceding chapter value, reset to null at the start of each book. This source also marks ${totalAltChapterMilestones} <milestone unit="alternatechpater"/> (note the source's own misspelling of "alternatechapter", preserved as observed) and ${totalAltSectionMilestones} <milestone unit="alternatesection"/> markers - a second, alternate numbering scheme this app's schema has no field for; both are dropped as scaffolding without affecting Division.ref or the reading text. Every Passage.ref is null: no chapter marker is printed at the per-paragraph level, only per-section-or-coarser.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment. This source's TEI very often encodes a second, empty <p> at the end of each section (a transcription-side artifact, not a real second paragraph of Cicero's own prose).`,
    });
  }

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Officiis',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    edition: 'Loeb Classical Library, 1913',
    editor: 'Walter Miller',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi055.perseus-lat1), which digitises the Latin text of Cicero, De Officiis, as edited by Walter Miller (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1913 Loeb Classical Library edition); imported by scripts/import-de-officiis-la.',
    license:
      "Miller's 1913 Latin text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Officiis — Latin',
        paragraphs: [
          'This is the Latin text of Cicero’s De Officiis ("On Duties"), his last major philosophical work, written in 44 BC as an open letter of ethical instruction to his son Marcus, then studying in Athens. In three books it treats moral goodness (honestum), expediency (utile), and the apparent conflict between the two.',
          'The text here is the original Latin, verbatim. Nothing is translated, modernised, normalised or silently corrected. An English translation of the same edition is bundled separately as de-officiis-en; see its own about.json.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Walter Miller, ed. and trans., De Officiis, Loeb Classical Library (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1913). This edition is in the public domain.',
          'The work is divided into 3 Books and, within each Book, numbered sections (161, 89 and 121 respectively in this edition’s own fine-grained division), plus Cicero’s traditional, coarser chapter citation (45, 25 and 33 chapters per book respectively, restarting at 1 in each Book) - see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi055.perseus-lat1.xml (CTS urn:cts:latinLit:phi0474.phi055.perseus-lat1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section <div>s and collects every non-empty <p> paragraph within each section, in document order, into that section’s single Passage (joined with a blank line when a section has more than one surviving paragraph). XML transport scaffolding only is removed: the inline chapter <milestone> markers (their values instead seed each section’s Division.ref) and purely typographic wrapper tags (<hi rend="italics"> emphasis, <foreign xml:lang="greek"> for Cicero’s own untranslated Greek quotations) are unwrapped, their text flowing into the surrounding prose. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          "Miller's own critical apparatus is handled the same way this app already treats it elsewhere: text his apparatus brackets as a probable interpolation (<del>, 45 occurrences) is excluded from the reading text; two <gap reason=\"omitted\"/> markers (which carry no literal rendering in this edition) are logged but nothing is fabricated in their place. Every occurrence of both is logged individually in anomalies.json.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Section (this source’s own `subtype="section"` numbering), plus Cicero’s traditional chapter reference (e.g. "off. 1.7") reconstructed from this source’s own inline chapter milestones. A section’s Division.ref is the nearest preceding chapter value in its book, carried forward across sections that carry no milestone of their own; chapter numbering restarts at 1 at the beginning of each Book. Passage.ref is null throughout: no chapter marker is printed at a finer grain than the section.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books and all of this edition’s own 161/89/121 sections are present and in order; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          "Miller's critical apparatus. 45 <del> spans (text Miller's apparatus brackets as a probable interpolation) are excluded from the reading text; 2 <gap reason=\"omitted\"/> markers carry no literal rendering in this edition and are logged without fabricating any replacement text. Every occurrence of both is logged individually in anomalies.json.",
          'Alternate numbering. This edition also marks a second "alternatechpater" (sic - the source’s own spelling) / "alternatesection" numbering scheme at a handful of points; this app’s Book->Section schema has no field for it, so it is dropped as scaffolding without affecting the reading text or the chapter-based Division.ref used throughout.',
          'Source-side empty paragraphs. This TEI very often encodes a second, empty <p> at the end of a section; it cleans to empty text and is dropped rather than joined in as a blank segment.',
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

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const want = EXPECTED_SECTION_COUNTS[Number(b.number) - 1];
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections (expected ${want})  "${b.sourceHeading}"\n`,
    );
  }
  process.stdout.write(
    `\n  3 books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalChapterMilestones} chapter milestones  ${totalDelSpans} <del>  ${totalGaps} <gap>\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-officiis-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
