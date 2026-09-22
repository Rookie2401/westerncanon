/**
 * Flavius Josephus, Jewish Antiquities (Ἰουδαϊκὴ ἀρχαιολογία) - Greek text
 * (Benedikt Niese's edition, *Flavii Iosephi Opera, Vol. 1-4*, Berlin:
 * Weidmann, 1885-1890; CTS urn:cts:greekLit:tlg0526.tlg001.perseus-grc2).
 * Run-once ingestion pipeline.
 *
 *   npm run import:jewish-antiquities-grc
 *
 * Reads scripts/import-jewish-antiquities-grc/raw/tlg0526.tlg001.perseus-grc2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg001/tlg0526.tlg001.perseus-grc2.xml
 * and cached; re-fetched automatically only if that file is missing).
 * Writes:
 *   data/jewish-antiquities-grc/work.json       - the GenericWork (20 Books, 7396 Sections)
 *   data/jewish-antiquities-grc/about.json      - provenance / licence / prose
 *   data/jewish-antiquities-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:jewish-antiquities-grc`.
 *
 * See data/jewish-antiquities-grc/types.ts for the full structural
 * documentation (2-level Book -> Section tree, id scheme, sourceHeading and
 * <del> handling, incl. the Testimonium Flavianum fallback). Summary of the
 * markup handled here:
 *   - `<del>...</del>` (222) - Niese's apparatus marking probable
 *     interpolations - EXCLUDED from the reading text; every occurrence
 *     logged individually. Two sections (book-18-sec-63/64, the
 *     Testimonium Flavianum) are entirely wrapped in <del> with nothing
 *     else in their sole <p>; excluding them as usual would leave the
 *     schema's one-Passage-per-Section rule with no text to give them, so
 *     (mirroring the established de-officiis-la fallback) the bracketed
 *     text is kept as a last resort and flagged via Passage.anomaly.
 *   - `<head>` - Book's own contents-heading, and (book-1's "arg" section
 *     only) the work's overall preface heading - captured verbatim as
 *     Division.sourceHeading; see types.ts.
 *   - `<milestone unit="Whiston_chapter"/>` / `<milestone
 *     unit="Whiston_section"/>` - a later cross-reference scheme retrofitted
 *     by the Perseus editors - dropped as scaffolding, summarised once.
 *   - `<pb/>` (page break), `<label>`/`<num>` (the arg sections' own item
 *     numerals, e.g. "α.", "β."), `<q>` (inline direct quotation) are
 *     unwrapped typographic/structural markup - no content decision, their
 *     text flows into the surrounding paragraph unchanged.
 *   - No `<note>`, `<foreign>`, `<hi>`, `<gap>`, `<choice>`, or similar
 *     apparatus tag occurs anywhere in this source (confirmed by direct
 *     inspection) - nothing else to handle.
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * Greek reading text only; the two content-affecting decisions (<del>
 * exclusion, and the 2-section <del> fallback) are both logged/explained.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, WorkAbout } from '../../data/jewish-antiquities-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0526.tlg001.perseus-grc2.xml');
const RAW_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg001/tlg0526.tlg001.perseus-grc2.xml';
const OUT_DIR = join(REPO_ROOT, 'data', 'jewish-antiquities-grc');

const WORK_ID = 'jewish-antiquities-grc';
const EXPECTED_BOOKS = 20;
/** This source's own numbered-section counts per book (I..XX), cross-checked against the real parsed counts, never forced. Each book also has exactly one further "arg" section not counted here. */
const EXPECTED_NUMBERED_SECTION_COUNTS = [
  346, 349, 322, 331, 362, 378, 394, 420, 291, 281, 347, 434, 433, 491, 425, 404, 355, 379, 366, 268,
];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 200): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

async function ensureRawXml(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  process.stdout.write(`fetching ${RAW_URL} ...\n`);
  mkdirSync(dirname(RAW_XML), { recursive: true });
  const res = await fetch(RAW_URL);
  if (!res.ok) fail(`fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  writeFileSync(RAW_XML, text, 'utf8');
  process.stdout.write(`  cached ${RAW_XML} (${(text.length / 1024).toFixed(1)} KB)\n`);
}

export async function main(): Promise<void> {
  await ensureRawXml();
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<pb\b[^>]*\/?>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<del\b[^>]*>|<\/del>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'book' | 'section' | 'other';
  const stack: Frame[] = [];

  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let currentSectionDiv: Division | null = null;
  let sectionParagraphs: string[] = [];
  /** every cleaned <del> span seen in the current section, kept only as a last-resort
   *  fallback for a section whose ENTIRE surviving text would otherwise be empty. */
  let sectionDelFallback: string[] = [];

  /** the division (Book or Section) still waiting to see whether its very next child is a <head> */
  let awaitingHeadDiv: Division | null = null;
  let inHead = false;
  let headBuf = '';

  let inP = false;
  let pBuf = '';
  let delDepth = 0;
  let delBuf = '';

  let totalSections = 0;
  let totalDelSpans = 0;
  let totalDelFallbackSections = 0;
  let totalWhistonChapterMilestones = 0;
  let totalWhistonSectionMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  function openSection(n: string): void {
    if (!currentBookDiv) fail(`section n="${n}" found outside any book`);
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionDelFallback = [];
    currentSectionDiv = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [],
    };
    currentBookDiv.children.push(currentSectionDiv);
    awaitingHeadDiv = currentSectionDiv;
  }

  function closeSection(): void {
    if (!currentSectionDiv) fail(`section "${currentSectionId}" closed with no open Section division`);
    if (sectionParagraphs.length === 0 && sectionDelFallback.length > 0) {
      // The section's ENTIRE text falls inside <del> - excluding it as usual would leave
      // this Division with no reading text at all, which this app's schema does not
      // support. As a last resort ONLY for this case, the <del> content is kept after
      // all, clearly flagged as suspect - see data/jewish-antiquities-grc/types.ts.
      sectionParagraphs = sectionDelFallback;
      totalDelFallbackSections += 1;
      const isTestimonium = currentSectionId === 'book-18-sec-63' || currentSectionId === 'book-18-sec-64';
      const note = isTestimonium
        ? "Niese's apparatus brackets this section's ENTIRE text as a probable interpolation (<del>) - this is part of the disputed \"Testimonium Flavianum\" passage (Antiquities 18.63-64). Kept here only because excluding it would leave this section with no reading text at all - unlike every other <del> span in this work (which is silently excluded), this one is retained but flagged as suspect. Contrast the English sibling (data/jewish-antiquities-en), whose Whiston translation presents the same passage as ordinary, unmarked text."
        : "Niese's apparatus brackets this section's ENTIRE text as a probable interpolation (<del>). Kept here only because excluding it would leave this section with no reading text at all - unlike every other <del> span in this work (which is silently excluded), this one is retained but flagged as suspect.";
      currentSectionDiv.passages = [{ n: '', text: sectionParagraphs.join('\n\n'), ref: null, anomaly: note }];
      anomalies.push({ where: currentSectionId, note });
    } else {
      if (sectionParagraphs.length === 0) fail(`${currentSectionId} has no surviving paragraph text`);
      currentSectionDiv.passages = [{ n: '', text: sectionParagraphs.join('\n\n'), ref: null }];
    }
    totalSections += 1;
    currentSectionDiv = null;
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

    if (/^<div\b/.test(tok)) {
      if (isTextpartDiv(tok, 'book')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`book div missing n= attribute: "${tok}"`);
        stack.push('book');
        currentBookNum = n;
        currentBookDiv = {
          id: `book-${n}`,
          number: n,
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        divisions.push(currentBookDiv);
        awaitingHeadDiv = currentBookDiv;
      } else if (isTextpartDiv(tok, 'section')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`section div missing n= attribute: "${tok}"`);
        stack.push('section');
        openSection(n);
      } else {
        stack.push('other');
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<head\b/.test(tok)) {
      if (awaitingHeadDiv) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        const cleaned = cleanText(headBuf);
        if (awaitingHeadDiv) awaitingHeadDiv.sourceHeading = cleaned;
        awaitingHeadDiv = null;
      }
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
      awaitingHeadDiv = null; // real content started; no head is coming for this division
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      const top = stack[stack.length - 1];
      if (top !== 'section') fail(`<p> found outside any section div (stack top: "${top}"); text: "${excerpt(cleaned)}"`);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({ where: currentSectionId, note: 'A paragraph cleaned to empty text; dropped rather than joined as an empty segment.' });
      } else {
        sectionParagraphs.push(cleaned);
      }
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      if (delDepth === 1) delBuf = '';
    } else if (tok === '</del>') {
      delDepth = Math.max(0, delDepth - 1);
      if (delDepth === 0) {
        totalDelSpans += 1;
        anomalies.push({
          where: currentSectionId,
          note: `<del> excluded from the reading text (Niese's apparatus brackets this as a probable interpolation): "${excerpt(delBuf)}"`,
        });
        const cleanedDel = cleanText(delBuf);
        if (cleanedDel.length > 0) sectionDelFallback.push(cleanedDel);
        delBuf = '';
      }
    } else if (/^<milestone\b/.test(tok)) {
      if (/unit="Whiston_chapter"/.test(tok)) totalWhistonChapterMilestones += 1;
      else if (/unit="Whiston_section"/.test(tok)) totalWhistonSectionMilestones += 1;
    }
    // catch-all `<[^>]+>` (pb/label/num/q and anything else): no structural
    // action, their content already flows into pBuf/headBuf/delBuf via the
    // free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} books, got ${divisions.length}`);

  // --- cross-check section counts against this source's own expected numbers, honestly ---
  const countMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const wantNumbered = EXPECTED_NUMBERED_SECTION_COUNTS[i]!;
    const wantTotal = wantNumbered + 1; // + the book's own "arg" section
    const got = b.children.length;
    if (got !== wantTotal) countMismatches.push(`Book ${i + 1}: parsed ${got} sections, expected ${wantTotal} (${wantNumbered} numbered + 1 arg)`);
    const argCount = b.children.filter((s) => s.number === 'arg').length;
    if (argCount !== 1) countMismatches.push(`Book ${i + 1}: parsed ${argCount} "arg" sections, expected exactly 1`);
  });
  if (countMismatches.length > 0) {
    anomalies.push({ where: `${WORK_ID} / section counts`, note: `${countMismatches.length} book(s) parse to a section count different from this source's own expected numbering: ${countMismatches.join('; ')}.` });
  }

  // --- no section should ever be empty ---
  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (Niese's apparatus brackets these as probable interpolations, not his judged authentic text) were excluded from the reading text; every occurrence is logged individually above. ${totalDelFallbackSections} of those sections (book-18-sec-63, book-18-sec-64 - the Testimonium Flavianum) had NO surviving text once their sole <del>-wrapped <p> was excluded, so the bracketed text was kept as a last resort and flagged via Passage.anomaly - see the individual entries above and data/jewish-antiquities-grc/types.ts.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref is null throughout. This source carries ${totalWhistonChapterMilestones} <milestone unit="Whiston_chapter"/> and ${totalWhistonSectionMilestones} <milestone unit="Whiston_section"/> markers - a later cross-reference scheme to Whiston's 1737 English translation, retrofitted by the Perseus editors onto this Greek text - dropped as scaffolding this app's schema has no field for, without affecting the reading text.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Ἰουδαϊκὴ ἀρχαιολογία',
    author: 'Flavius Josephus',
    language: 'grc',
    editor: 'Benedikt Niese',
    edition: 'Flavii Iosephi Opera, Vol. 1-4, ed. Benedikt Niese (Berlin: Weidmann, 1885-1890)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0526.tlg001.perseus-grc2), which digitises Niese\'s edition of the Greek text of Josephus, Jewish Antiquities; imported by scripts/import-jewish-antiquities-grc. The raw file is cached at scripts/import-jewish-antiquities-grc/raw/tlg0526.tlg001.perseus-grc2.xml.',
    license:
      "Niese's 1885-1890 edition of the Greek text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Josephus\'s Jewish Antiquities — Greek',
        paragraphs: [
          'This is the Greek text of Flavius Josephus\'s Ἰουδαϊκὴ ἀρχαιολογία ("Jewish Antiquities"), a 20-book history of the Jewish people from creation to the eve of the First Jewish-Roman War, completed around AD 93/94. It is the largest of Josephus\'s surviving works and, alongside the Hebrew Bible itself, one of the principal sources for the history of Second Temple Judaism.',
          'The text here is the original Greek, verbatim, in Benedikt Niese\'s critical edition. Nothing is translated, modernised or silently corrected. Text Niese\'s own apparatus brackets as a probable interpolation is excluded, matching this library\'s established <del> convention elsewhere — see "Known gaps & anomalies" below, which also discusses the one significant exception. An English translation (Whiston, 1737) of the same work is bundled separately as jewish-antiquities-en; see its own about.json.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Benedikt Niese, ed., Flavii Iosephi Opera, Vol. 1-4 (Berlin: Weidmann, 1885-1890) — the standard critical edition of the Greek text. Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0526.tlg001.perseus-grc2.xml (CTS urn:cts:greekLit:tlg0526.tlg001.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the 20 Books is a top-level Division (book-1 .. book-20); each holds its own Sections (book-N-sec-M), one Passage each. Every book opens with an "arg" Section (book-N-sec-arg) — Niese\'s own printed argumentum, a short table of contents in Josephus\'s own words, one paragraph per numbered item — followed by that book\'s ordinarily numbered sections (7376 across the 20 books, 7396 sections in all with the 20 "arg" sections). Each Book\'s Division.sourceHeading is its own printed contents-heading; only Book 1\'s "arg" Section additionally carries its own heading, "Προοίμιον περὶ τῆς ὅλης πραγματείας" ("Preface concerning the whole undertaking"), since it doubles as the preface to the entire work.',
          "XML transport scaffolding only is removed: page-break markers, the arg sections' own item-numeral labels, and inline direct-quotation markup are unwrapped, their text flowing into the surrounding prose unchanged. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Section (Niese\'s own section numbering, the standard modern citation for this work, e.g. "AJ 18.63"). Division.ref is null throughout: this source\'s own inline cross-reference milestones to Whiston\'s different, older English chapter/section numbering are dropped as scaffolding rather than fabricating a use for them. Passage.ref is null throughout as well.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 20 Books and all 7396 Sections (20 "arg" + 7376 numbered) are present and in order; the bundled TEI file matches the current Perseus canonical-greekLit release.',
          "Niese's critical apparatus. 222 <del> spans (text Niese's apparatus brackets as a probable interpolation) are excluded from the reading text; every occurrence is logged individually in anomalies.json.",
          'The Testimonium Flavianum. Book 18, Sections 63-64 — the famous, long-disputed passage naming Jesus — are, in Niese\'s edition as digitised here, ENTIRELY bracketed as a probable interpolation (their sole paragraph is wrapped, start to finish, in <del>). Excluding it as usual would leave those two Sections with no reading text at all, which this app\'s schema does not support, so — mirroring an established precedent elsewhere in this library (Cicero\'s De Officiis, book-1-sec-40) — the bracketed Greek text is kept here as a last resort, with each Passage explicitly flagged as suspect via its `anomaly` field. This is a deliberate, disclosed departure from the silent-exclusion rule applied to every other <del> span in this work, made only because the alternative (an empty Section) is unsupported by the schema; readers should treat this passage\'s authenticity as an open scholarly question, not as this app\'s own editorial judgment either way. The bundled English translation (jewish-antiquities-en, Whiston 1737) presents the same passage as ordinary, unmarked text, reflecting its own (pre-critical) edition — see that work\'s own anomalies.json.',
          'A later cross-reference layer. The Perseus editors additionally marked this Greek text with inline milestones tying it to Whiston\'s different, 18th-century English chapter/section numbering; this app\'s schema has no field for a third numbering scheme, so these are dropped as scaffolding without affecting the reading text or Division.ref.',
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
  divisions.forEach((b, i) => {
    const wantTotal = EXPECTED_NUMBERED_SECTION_COUNTS[i]! + 1;
    process.stdout.write(`  Book ${String(b.number).padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections (expected ${wantTotal})  "${b.sourceHeading ?? ''}"\n`);
  });
  process.stdout.write(
    `\n  ${divisions.length} books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalDelSpans} <del>  ${totalDelFallbackSections} <del>-fallback sections  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:jewish-antiquities-grc` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    process.stderr.write(`STOP (${WORK_ID}): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exit(1);
  });
}
