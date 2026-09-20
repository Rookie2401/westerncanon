/**
 * Cicero, *Philippics* — English translation (Charles Duke Yonge,
 * "Philippics", in *The Orations of Marcus Tullius Cicero, Vol. 4*, London:
 * Bell, 1856), via the Perseus/OpenGreekAndLatin canonical-latinLit TEI.
 * Run-once ingestion pipeline.
 *
 *   npm run import:philippics-en
 *
 * Reads scripts/import-philippics-en/raw/phi0474.phi035.perseus-eng1.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi035/phi0474.phi035.perseus-eng1.xml
 * CTS urn:cts:latinLit:phi0474.phi035.perseus-eng1 — note the witness id:
 * perseus-eng1, not -eng2 like most other English witnesses in this corpus;
 * this is the only English Perseus digitization of the Philippics). Writes:
 *   data/philippics-en/work.json       — the GenericWork (14 Speeches, 543 Sections)
 *   data/philippics-en/about.json      — provenance / licence / prose
 *   data/philippics-en/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npm run validate:philippics-en`.
 *
 * STRUCTURALLY INVERTED relative to every other Cicero witness in this
 * corpus, confirmed by direct inspection: this source nests
 * `<div type="textpart" subtype="chapter" n="K">` divs directly under each
 * speech (the traditional "chapter" IS a div here), and marks the finer
 * "section" boundary with an inline `<milestone unit="section" n="M"/>`
 * INSIDE a chapter div — chapter is the container, section the marker,
 * opposite of the Latin sibling (section div / chapter milestone). All 14
 * speeches are present, and every speech's own chapter-count maximum
 * matches the Latin sibling exactly (15/46/15/6/19/7/9/11/7/11/15/12/21/14)
 * — confirmed by independently walking both files.
 *
 * The importer flattens this: a new Section begins at every `<milestone
 * unit="section">` (numbered continuously across the whole speech, exactly
 * like the Latin sibling's own section numbering), accumulating `<p>` text
 * until the next such milestone OR the end of the speech. A single `<p>`
 * can itself contain more than one section milestone (confirmed by direct
 * inspection — the paragraph does not end there, only the section does), so
 * the importer splits mid-paragraph when needed rather than only at `</p>`.
 * Section boundaries frequently do NOT coincide with chapter-div boundaries
 * — traditional "chapter" (an older, coarser citation system) and "section"
 * (the finer modern one) are independently numbered in Ciceronian
 * scholarship and often don't nest cleanly. 93 of the 543 sections in this
 * witness are confirmed to have their own last real paragraph text arrive
 * after a NEW chapter div has already opened (their own start was in an
 * earlier chapter) — each logged individually to anomalies.json with its
 * start/end chapter numbers, not silently patched. Separately, one genuine
 * numbering GAP exists in the source's own section-milestone sequence
 * (Philippic 2 jumps from 23 straight to 25, with no milestone for 24 at
 * all) — also logged individually. Division.ref for each Section is whichever chapter div is open at the
 * moment its OWN milestone is seen (its start), never wherever it happens
 * to end.
 *
 * Every speech here ALSO opens with a `subtype="argument"` div (one speech —
 * Philippic 2 — misspells this `subtype="argumnt"` in the source; both
 * variants are recognised) headed "THE ARGUMENT." — Yonge's own prose
 * summary, not a translation of Cicero's words; the importer tracks the div
 * stack explicitly and only ever collects `<p>` text while the innermost
 * open div is `chapter`, exactly mirroring the `commentary`-div handling in
 * scripts/import-in-catilinam-en.
 *
 * Markup handled:
 *   - `<note anchored="true">...</note>` (55) is Yonge's own translator
 *     footnote — excluded entirely, tag and content, summarised once (too
 *     many to log individually here, unlike the In Catilinam English
 *     sibling's 14).
 *   - `<gap reason="omitted"/>` (7, self-closing, no content) marks a
 *     passage this 1856 translation itself omits (one falls inside a
 *     `<note>` and is discarded with it; the other 6 are logged
 *     individually) — nothing to preserve, no text fabricated.
 *   - `<pb n="…"/>` (29, print page breaks) is transport scaffolding,
 *     dropped without logging.
 *   - `<foreign>`, `<q>`, `<quote>` are unwrapped typographic markup.
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * English (Yonge's own wording) reading text only.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/philippics-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi035.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'philippics-en');

const WORK_ID = 'philippics-en';
const EXPECTED_SPEECHES = 14;

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

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe = /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<pb\b[^>]*\/>|<gap\b[^>]*\/>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'speech' | 'chapter' | 'argument' | 'other';
  const stack: Frame[] = [];

  let currentSpeechNum = 0;
  let currentSpeechDiv: Division | null = null;
  let awaitingSpeechHead = false;
  let inHead = false;
  let headBuf = '';

  let currentChapterNum: string | null = null;
  let currentSectionNum: string | null = null;
  let currentSectionRefChapter: string | null = null;
  let sectionParagraphs: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;

  let totalSections = 0;
  let totalNotes = 0;
  let totalGaps = 0;
  let totalPageBreaks = 0;
  let totalArgumentParagraphsSkipped = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalSpanningSections = 0;
  let totalNumberingGaps = 0;

  /**
   * Pushes whatever has accumulated in `pBuf` right now onto the CURRENTLY
   * OPEN section's paragraph list, then clears `pBuf`. Called both at a
   * genuine `</p>` close AND mid-paragraph, right before a section
   * milestone that falls INSIDE an still-open `<p>` (confirmed to happen in
   * this source — a single `<p>` can contain more than one section
   * milestone; the paragraph does not end there, only the section does).
   * `logEmptyAsAnomaly` is false for a mid-paragraph split (an empty
   * fragment there is an expected, unremarkable side effect of the split,
   * not a genuine empty paragraph).
   */
  let lastFragmentChapterNum: string | null = null;

  function pushCurrentParagraphFragment(logEmptyAsAnomaly: boolean): void {
    const cleaned = cleanText(pBuf);
    pBuf = '';
    if (cleaned.length === 0) {
      if (logEmptyAsAnomaly) {
        totalEmptyParagraphsDropped += 1;
      }
      return;
    }
    if (currentSectionNum === null) fail(`paragraph text found before any section milestone in speech-${currentSpeechNum}: "${excerpt(cleaned)}"`);
    sectionParagraphs.push(cleaned);
    lastFragmentChapterNum = currentChapterNum; // chapter genuinely in effect when this real content arrived
  }

  function flushSection(): void {
    if (currentSectionNum === null) return; // nothing open yet
    if (!currentSpeechDiv) fail(`section "${currentSectionNum}" closed outside any speech`);
    const id = `speech-${currentSpeechNum}-sec-${currentSectionNum}`;
    if (sectionParagraphs.length === 0) fail(`${id} has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (currentSectionRefChapter === null) {
      anomalies.push({ where: id, note: 'No chapter div precedes this section yet; Division.ref left null rather than fabricated.' });
    } else if (lastFragmentChapterNum !== null && lastFragmentChapterNum !== currentSectionRefChapter) {
      // Only a genuine content-bearing crossing counts — i.e. this section
      // actually received real paragraph text while a LATER chapter div was
      // open, not merely that some later chapter div happened to have opened
      // by the time the NEXT section's milestone triggered this flush.
      totalSpanningSections += 1;
      anomalies.push({
        where: id,
        note: `This section's text continues past a chapter-div boundary with no new section milestone in between: it started in chapter ${currentSectionRefChapter} and its last real paragraph text was read while chapter ${lastFragmentChapterNum} was open. Division.ref is "${currentSectionRefChapter}" (the chapter active at this section's own start), not wherever it happens to end.`,
      });
    }
    const div: Division = {
      id,
      number: currentSectionNum,
      ref: currentSectionRefChapter,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentSpeechDiv.children.push(div);
    totalSections += 1;
    sectionParagraphs = [];
  }

  let lastSectionNumSeen = 0;
  function startSection(n: string): void {
    flushSection();
    currentSectionNum = n;
    currentSectionRefChapter = currentChapterNum;
    lastFragmentChapterNum = null;
    const num = Number(n);
    if (Number.isFinite(num) && lastSectionNumSeen !== 0 && num !== lastSectionNumSeen + 1) {
      totalNumberingGaps += 1;
      anomalies.push({
        where: `speech-${currentSpeechNum}-sec-${n}`,
        note: `This source's own section-milestone numbering jumps from ${lastSectionNumSeen} to ${n} (no milestone printed for the number(s) in between) — the source's own gap, preserved as printed, not patched.`,
      });
    }
    if (Number.isFinite(num)) lastSectionNumSeen = num;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inHead) headBuf += free;
        else if (inP) pBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (noteDepth > 0) {
      if (/^<note\b/.test(tok)) noteDepth += 1;
      else if (tok === '</note>') {
        noteDepth -= 1;
        totalNotes += 1;
      }
      continue;
    }

    if (/^<div\b/.test(tok)) {
      if (isTextpartDiv(tok, 'speech')) {
        const n = Number(attrValue(tok, 'n'));
        if (!Number.isFinite(n) || n < 1 || n > EXPECTED_SPEECHES) fail(`unexpected speech number in div "${tok}"`);
        stack.push('speech');
        currentSpeechNum = n;
        currentChapterNum = null;
        currentSectionNum = null;
        currentSectionRefChapter = null;
        lastSectionNumSeen = 0;
        lastFragmentChapterNum = null;
        sectionParagraphs = [];
        awaitingSpeechHead = true;
        currentSpeechDiv = {
          id: `speech-${n}`,
          number: String(n),
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        divisions.push(currentSpeechDiv);
      } else if (isTextpartDiv(tok, 'chapter')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`chapter div missing n= attribute: "${tok}"`);
        stack.push('chapter');
        currentChapterNum = n;
        awaitingSpeechHead = false;
      } else if (isTextpartDiv(tok, 'argument') || isTextpartDiv(tok, 'argumnt')) {
        stack.push('argument');
        awaitingSpeechHead = false;
      } else {
        stack.push('other');
        awaitingSpeechHead = false;
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'speech') {
        flushSection();
        currentSpeechDiv = null;
      }
      // chapter/argument/other close: no action — a section may legitimately
      // continue past a chapter-div close (see module doc).
    } else if (/^<head\b/.test(tok)) {
      if (awaitingSpeechHead && !inHead) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        // Speech 1 alone prints TWO heads before its argument div (a
        // work-level title, then its own "THE FIRST PHILIPPIC." rubric);
        // every other speech prints exactly one. Keep overwriting while
        // still awaiting the speech head so the LAST (most specific) one
        // wins, rather than the generic work-level title.
        if (currentSpeechDiv && awaitingSpeechHead) {
          currentSpeechDiv.sourceHeading = cleanText(headBuf);
        }
      }
    } else if (/^<milestone\b/.test(tok)) {
      if (/unit="section"/.test(tok)) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`section milestone missing n= attribute: "${tok}"`);
        if (inP) pushCurrentParagraphFragment(false); // mid-paragraph split — see pushCurrentParagraphFragment's doc
        startSection(n);
      }
    } else if (/^<pb\b/.test(tok)) {
      totalPageBreaks += 1;
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      anomalies.push({
        where: currentSectionNum !== null ? `speech-${currentSpeechNum}-sec-${currentSectionNum}` : `speech-${currentSpeechNum}`,
        note: `<gap reason="omitted"/> — this 1856 translation itself omits a passage here; nothing to preserve, no text fabricated.`,
      });
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const top = stack[stack.length - 1];
      if (top === 'chapter') {
        pushCurrentParagraphFragment(true);
      } else if (top === 'argument') {
        totalArgumentParagraphsSkipped += 1;
        pBuf = '';
      } else {
        fail(`<p> found with unexpected enclosing div (stack top: "${top}"); text: "${excerpt(cleanText(pBuf))}"`);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    }
    // catch-all `<[^>]+>` (foreign/q/quote and any other tag): no structural
    // action, text already flows via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_SPEECHES) fail(`expected exactly ${EXPECTED_SPEECHES} speeches, got ${divisions.length}`);

  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalArgumentParagraphsSkipped} paragraph(s) of Yonge's own "THE ARGUMENT." editorial introduction (one per speech, subtype "argument" or, once, the source's own misspelling "argumnt") were excluded — historical background prose, not a translation of Cicero's own words.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note anchored="true"> translator footnotes were excluded entirely, tag and content; not logged individually given their number. ${totalPageBreaks} <pb/> print page breaks were dropped as zero-width transport scaffolding.`,
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `This witness nests "chapter" as a <div> and marks "section" with an inline <milestone> — the exact inverse of the Latin sibling's <div subtype="section">/<milestone unit="chapter"> encoding. ${totalSpanningSections} section(s) were confirmed to continue their text across a chapter-div boundary with no new section milestone in between (individually logged above); every other section's text falls entirely within one chapter div. Separately, ${totalNumberingGaps} section-milestone numbering gap(s) were found (individually logged above) — this source's own gap, not a parsing artifact.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment (mostly degenerate empty <p></p> formatting artifacts in this source).`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'The Philippics',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: 'The Orations of Marcus Tullius Cicero, Vol. 4, trans. Charles Duke Yonge (London: Bell, 1856), "Philippics"',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi035.perseus-eng1), which digitises Yonge\'s 1856 translation; imported by scripts/import-philippics-en. The raw file is committed at scripts/import-philippics-en/raw/phi0474.phi035.perseus-eng1.xml.',
    license:
      "Yonge's 1856 translation is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's Philippics, in English",
        paragraphs: [
          "The English translation, by Charles Duke Yonge (1856), of the fourteen speeches Cicero delivered against Mark Antony in 44–43 BC — a facing English rendering of the Latin text already in this library (data/philippics-la).",
          "The text here is Yonge's translation, verbatim; nothing is further modernised or paraphrased. Yonge's own editorial \"Argument\" introductions and footnotes are excluded — see \"How it was imported\".",
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., The Orations of Marcus Tullius Cicero, Vol. 4 (London: Henry G. Bohn, 1856), "Philippics". Public domain. This is the only English translation of the Philippics available from Perseus (witness id perseus-eng1).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi035.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi035.perseus-eng1) from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'This witness encodes its structure the opposite way round from every other Cicero witness in this library: "chapter" is the <div> level and "section" is only an inline milestone inside it (the Latin sibling has section as the <div> and chapter as the milestone). The importer reconstructs a Section per <milestone unit="section"> exactly as printed, splitting mid-paragraph where needed (a single <p> can carry more than one section milestone), and attributes each Section\'s Division.ref to whichever chapter div was open when its OWN milestone appeared — even for the 93 sections (of 543) whose text runs on past that chapter div\'s end, into the next, with no new section milestone in between; each is logged individually with its start/end chapter numbers rather than silently patched. Every speech also opens with a "THE ARGUMENT." editorial div (Yonge\'s own historical summary), explicitly recognised and excluded, never silently merged into a Section\'s passage.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation matches the Latin sibling: Speech and Section (this witness\'s own continuous section-milestone numbering), plus the traditional chapter reference as each Section\'s Division.ref. Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'All 14 speeches are present, and every speech\'s chapter-count maximum matches the Latin sibling exactly. One genuine gap in this specific witness: Philippic 2\'s own section-milestone numbering jumps from 23 straight to 25, with no milestone printed anywhere in the source for section 24 — that section\'s Latin-sibling counterpart (speech-2-sec-24) accordingly has NO English counterpart Division in this file; its text is not recoverable from this witness. This edition therefore holds 543 Sections where the Latin sibling holds 544 — logged individually in anomalies.json and NOT silently patched or renumbered.',
          "93 of the 543 sections (about 1 in 6) have their own text continue past a chapter-div boundary with no new section milestone in between — traditional \"chapter\" and \"section\" are independently numbered systems in Ciceronian scholarship and often don't nest cleanly; each is logged individually in anomalies.json with its start/end chapter numbers. Division.ref always reflects the chapter active at that section's own START, never wherever it happens to end.",
          "Seven <gap reason=\"omitted\"/> markers record passages this 1856 translation itself omits; six are logged individually (one falls inside an already-excluded <note>).",
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  process.stdout.write('\nSpeeches:\n');
  for (const sp of divisions) {
    process.stdout.write(`  Speech ${String(sp.number).padStart(2)}  ${sp.id.padEnd(10)} ${String(sp.children.length).padStart(3)} sections  "${sp.sourceHeading ?? ''}"\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} speeches  ${totalSections} sections  ${totalNotes} <note>  ${totalGaps} <gap>  ${totalSpanningSections} chapter-spanning section(s)  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:philippics-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
