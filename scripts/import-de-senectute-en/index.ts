/**
 * Cicero, Cato Maior De Senectute — English translation ("Cato the Elder On
 * Old Age", trans. William Armistead Falconer, Loeb Classical Library,
 * London: William Heinemann Ltd; New York: G. P. Putnam's Sons, 1923
 * printing; CTS urn:cts:latinLit:phi0474.phi051.perseus-eng1, confirmed
 * against this work's own __cts__.xml). Run-once ingestion pipeline.
 *
 *   npm run import:de-senectute-en
 *
 * Reads scripts/import-de-senectute-en/raw/phi0474.phi051.perseus-eng1.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-senectute-en/work.json       - the GenericWork (FLAT: 85 numbered
 *                                          sections, no Book division)
 *   data/de-senectute-en/about.json      - provenance / licence / prose
 *   data/de-senectute-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-senectute-en`.
 *
 * IMPORTANT structural difference from the Latin sibling (confirmed by
 * direct inspection): this witness (an older Perseus digitisation style,
 * CTS ...perseus-eng1, unlike the companion De Amicitia English's ...eng2)
 * carries NO section (or Book) divs at all — a single
 * `<div type="translation">` wrapper directly holds a flat run of `<p>`
 * elements. Sections are recovered entirely from this source's own inline
 * `<milestone unit="section" n="N"/>` markers, which frequently fall
 * MID-PARAGRAPH (not at a `<p>` boundary) — confirmed by direct inspection,
 * e.g. section 2's milestone falls inside the middle of what would
 * otherwise read as one continuous paragraph. `<milestone unit="chapter"
 * n="N"/>` similarly seeds Division.ref, independent of paragraph/section
 * boundaries.
 *
 * A section boundary is therefore built by cutting the running text at each
 * `unit="section"` milestone (mid-paragraph or not) rather than at `<p>`
 * boundaries; a `</p>` still ends a "paragraph piece" for `\n\n`-joining
 * purposes, but does not by itself start a new section.
 *
 * GENUINE SOURCE IRREGULARITY (verified by direct inspection, not a parser
 * bug): the section-milestone sequence runs 1, 2, …, 34, 35, 35, 37, 38, …
 * 85 — i.e. `n="35"` appears TWICE in a row and `n="36"` never appears at
 * all. This looks like a single-character transcription slip in the source
 * (36 mistyped as 35), but since it cannot be verified against the Latin
 * sibling's OWN section boundaries (the Latin has no equivalent milestone
 * gap — data/de-senectute-la is complete and unaffected), this importer does
 * NOT silently renumber it to "36": the source's own literal, duplicated
 * "35" is kept as that section's `number` (matching what a reader citing
 * this specific witness would see), and only the `id` (which this app's
 * routing requires to be unique) is disambiguated with a "b" suffix for the
 * second occurrence (`sec-35b`) — logged loudly in anomalies.json and on
 * that Passage's own `anomaly` field. See data/de-senectute-en/about.json's
 * "Known gaps & anomalies" for the reader-facing account.
 *
 * Faithfulness rules (mirrors scripts/import-de-divinatione-en, the other
 * milestone-only witness in this batch):
 *   - verbatim English (Falconer's own translation) reading text only.
 *   - `<note>...</note>` (60 total) is Falconer's own translator's footnote
 *     — excluded entirely (tag AND content).
 *   - `<bibl>...</bibl>` (2 occurrences, each nested inside a `<cit>`
 *     alongside a `<quote>`) is a citation gloss identifying the source of a
 *     quoted verse fragment — excluded entirely, tag and content.
 *   - `<foreign>`, `<quote>`, `<hi rend="italics">`, `<l>` (verse lines) are
 *     unwrapped, text kept.
 *   - `<milestone unit="chapter"/>` (23) and `unit="section"/>` (85, with
 *     the one duplicate/gap above) are zero-width transport scaffolding —
 *     stripped from the reading text; their values instead build
 *     Division.ref and the section cut points respectively.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-senectute-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi051.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-senectute-en');
const WORK_ID = 'de-senectute-en';

interface Anomaly {
  where: string;
  note: string;
}

const EXPECTED_SECTIONS = 85;

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<milestone\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  let currentSectionRaw: string | null = null; // literal source n= value, as printed
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let sectionAnomaly: string | null = null;
  let currentChapterRef: string | null = null;
  const seenSectionRaw = new Map<string, number>(); // raw value -> occurrence count so far

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let biblDepth = 0;

  let totalNotes = 0;
  let totalBibl = 0;
  let totalChapterMilestones = 0;
  let totalSectionMilestones = 0;

  /** Flush whatever has accumulated in pBuf as one text-run piece of the
   *  current section. A flush point here can be triggered either by a real
   *  `</p>` or by a section/chapter milestone that happens to sit right at
   *  the very start of a `<p>` - the latter case routinely leaves pBuf
   *  holding nothing but incidental inter-tag whitespace (this source has no
   *  <del>-style exclusion that could genuinely blank out real content, so
   *  there is no legitimate case here where that would signal lost text);
   *  such a buffer is dropped silently rather than logged as an anomaly. */
  function flushPiece(): void {
    if (pBuf.length === 0) return;
    const cleaned = cleanText(pBuf);
    pBuf = '';
    if (cleaned.length === 0) return;
    sectionParagraphs.push(cleaned);
  }

  function closeSectionIfOpen(): void {
    if (currentSectionRaw === null) return;
    flushPiece();
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (sectionAnomaly) passage.anomaly = sectionAnomaly;
    const division: Division = {
      id: currentSectionId,
      number: currentSectionRaw,
      ref: currentChapterRef,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    divisions.push(division);
  }

  function openSection(rawN: string): void {
    closeSectionIfOpen();
    const occurrence = (seenSectionRaw.get(rawN) ?? 0) + 1;
    seenSectionRaw.set(rawN, occurrence);
    currentSectionRaw = rawN;
    sectionAnomaly = null;
    if (occurrence === 1) {
      currentSectionId = `sec-${rawN}`;
    } else {
      // genuine source irregularity: a section-milestone number repeats
      // rather than advancing (see module doc) - disambiguate the id (this
      // app's routing needs uniqueness) while keeping the literal source
      // number on `number`/the anomaly note; never silently renumbered.
      const suffix = String.fromCharCode('a'.charCodeAt(0) + occurrence - 1); // 2nd occurrence -> "b"
      currentSectionId = `sec-${rawN}${suffix}`;
      sectionAnomaly = `This source's own <milestone unit="section" n="${rawN}"/> repeats here rather than advancing (occurrence ${occurrence} of "${rawN}") - a probable single-character transcription slip in the source (compare the missing "36" - see anomalies.json). Kept literally as printed rather than silently renumbered; only this Division's id is disambiguated ("${currentSectionId}") for this app's own routing.`;
      anomalies.push({ where: currentSectionId, note: sectionAnomaly });
    }
    sectionParagraphs = [];
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inP && noteDepth === 0 && biblDepth === 0) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (/^<div\b/.test(tok) || tok === '</div>') {
      // structural wrapper only (the single outer type="translation" div) -
      // no book/section nesting to track in this witness.
    } else if (/^<p\b/.test(tok)) {
      inP = true;
    } else if (tok === '</p>') {
      inP = false;
      flushPiece();
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<bibl\b/.test(tok)) {
      biblDepth += 1;
    } else if (tok === '</bibl>') {
      biblDepth -= 1;
      totalBibl += 1;
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      const unit = unitMatch?.[1];
      if (unit === 'chapter' && nMatch?.[1] && noteDepth === 0 && biblDepth === 0) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      } else if (unit === 'section' && nMatch?.[1] && noteDepth === 0 && biblDepth === 0) {
        flushPiece();
        openSection(nMatch[1]);
        totalSectionMilestones += 1;
      }
    }
    // catch-all: <foreign>, <quote>, <hi>, <l>, <cit> and their closes — no
    // structural action; their content already flows into pBuf.
  }
  closeSectionIfOpen();

  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (biblDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${biblDepth})`);
  if (divisions.length !== EXPECTED_SECTIONS) {
    fail(`expected exactly ${EXPECTED_SECTIONS} sections, got ${divisions.length}`);
  }

  const emptySections = divisions.filter((d) => d.passages.length === 0 || d.passages[0]!.text.length === 0);
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry empty passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `This witness carries no section (or Book) divs at all; every section boundary above was reconstructed from this source's own inline <milestone unit="section"/> markers, which frequently fall mid-paragraph (not at a <p> boundary) - confirmed by direct inspection. Section 36 has no milestone of its own (see the "35"/"35b" anomaly above); its Latin counterpart (data/de-senectute-la) is complete and unaffected.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> translator's footnotes (Falconer's own cross-references and commentary, not the translated running text) were excluded entirely, tag and content; not logged individually given their routine, uniform nature.`,
  });
  if (totalBibl > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalBibl} <bibl> citation gloss(es) identifying the source of a quoted verse fragment (not Falconer's translated text) were excluded entirely, tag and content.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / division refs`,
    note: `${totalChapterMilestones} chapter milestones and ${totalSectionMilestones} section milestones captured; each section's Division.ref is the chapter citation active when that section's milestone fired. Passage.ref is always null.`,
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Cato the Elder On Old Age',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'William Armistead Falconer',
    edition: "London: William Heinemann Ltd; New York: G. P. Putnam's Sons, 1923 (printing)",
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi051.perseus-eng1), which digitises William Armistead Falconer’s translation "Cato the Elder On Old Age", part of Cicero: De Senectute, De Amicitia, De Divinatione (London: William Heinemann Ltd; New York: G. P. Putnam’s Sons, 1923 printing); imported by scripts/import-de-senectute-en.',
    license:
      "Falconer's 1923 translation is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s Cato Maior De Senectute — English, trans. Falconer',
        paragraphs: [
          'This is Cicero’s Cato Maior De Senectute ("Cato the Elder, On Old Age") in the English translation made by William Armistead Falconer for the Loeb Classical Library, 1923. It stands alongside the Latin text already in this library as a facing English rendering of the same dialogue.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Falconer’s own translator’s footnotes are excluded — see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Armistead Falconer, trans., Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library (London: William Heinemann Ltd; New York: G. P. Putnam’s Sons, 1923 printing). This translation is in the public domain.',
          'The work is undivided into Books, cited by 85 traditional sections and, where this edition’s own inline chapter milestones supply one, 23 traditional chapters.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi051.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi051.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Unlike the Latin sibling (and the companion De Amicitia English translation), this witness carries no section or Book divs at all: it is a single flat run of `<p>` elements under one wrapper div. Every section boundary is reconstructed from this source’s own inline `<milestone unit="section">` markers, which often fall mid-paragraph rather than at a `<p>` boundary; the importer cuts the running text at each one, joining the resulting pieces (and any ordinary `<p>` breaks within one section) with a blank line. `<milestone unit="chapter">` markers likewise seed each section’s Division.ref independently of the section cuts. XML transport scaffolding only is removed: `<foreign>`, `<quote>`, `<hi>`, `<l>` (verse lines) are unwrapped with their text kept; entities are decoded and whitespace collapsed.',
          "Falconer's own 60 translator's `<note>` footnotes and 2 `<bibl>` citation glosses (identifying the source of a quoted verse fragment) are excluded from the reading text entirely, tag and content.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by section and, where available, this edition’s own chapter number, reconstructed from its inline milestones. Passage.ref is null throughout; Passage.n is always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Section 35/36 numbering. This witness’s own section-milestone sequence reads 1, 2, …, 34, 35, 35, 37, 38, …, 85: `n="35"` is printed TWICE in a row and `n="36"` never appears — almost certainly a single-character transcription slip in this specific digitisation (36 mistyped as 35), but not silently corrected here. Both sections are kept, each carrying the source’s own literal "35" as their citation `number`; only the second one’s `id` is disambiguated (`sec-35b`) since this app’s routing requires unique ids. The Latin sibling (data/de-senectute-la) has no such gap and is complete and unaffected — use it for the canonically-numbered "§ 36" passage.',
          'Footnotes & citation glosses. 60 translator’s `<note>` footnotes and 2 `<bibl>` citation glosses were excluded entirely; neither is Falconer’s translated running text.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  process.stdout.write(
    `\n  ${divisions.length} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalSectionMilestones} section milestones  ${totalNotes} <note>  ${totalBibl} <bibl>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-senectute-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
