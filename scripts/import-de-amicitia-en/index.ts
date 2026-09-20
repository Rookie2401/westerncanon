/**
 * Cicero, Laelius De Amicitia — English translation ("Laelius on
 * Friendship", trans. William Armistead Falconer, Loeb Classical Library,
 * Cambridge, MA: Harvard University Press; London: William Heinemann Ltd,
 * 1923 printing; CTS urn:cts:latinLit:phi0474.phi052.perseus-eng2,
 * confirmed against this work's own __cts__.xml). Run-once ingestion
 * pipeline.
 *
 *   npm run import:de-amicitia-en
 *
 * Reads scripts/import-de-amicitia-en/raw/phi0474.phi052.perseus-eng2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-amicitia-en/work.json       - the GenericWork (FLAT: 104 numbered
 *                                         sections, no Book division)
 *   data/de-amicitia-en/about.json      - provenance / licence / prose
 *   data/de-amicitia-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-amicitia-en`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): unlike the
 * companion De Divinatione/De Senectute English witnesses (which carry no
 * section divs at all - see those importers' module docs), THIS witness has
 * the SAME structure as its Latin sibling: a single `<div type="translation">`
 * wrapper directly containing 104 `<div type="textpart" subtype="section"
 * n="N">` divs, N = 1..104, no gaps or duplicates, matching the Latin
 * section-for-section exactly. Each section div holds one `<p>`. Inline
 * `<milestone unit="chapter" n="…"/>` markers (27 total, matching the Latin)
 * seed each section's Division.ref with this edition's own chapter citation.
 *
 * Faithfulness rules (mirrors scripts/import-de-amicitia-la):
 *   - verbatim English (Falconer's own translation) reading text only.
 *   - `<note>...</note>` (68 total) is Falconer's own translator's footnote
 *     (cross-references, textual/historical commentary) — NOT part of the
 *     translated running text — excluded entirely (tag AND content).
 *   - `<bibl>...</bibl>` (1 occurrence, nested inside a `<cit>` alongside a
 *     `<quote>`) is a citation gloss identifying the source of a quoted
 *     verse fragment ("Lines from the Epiclerus by Caecilius Statius") — NOT
 *     Falconer's translated text — excluded entirely, same treatment this
 *     library already gives a Perseus/editorial citation gloss elsewhere
 *     (e.g. Nicomachean Ethics's `<note resp="Perseus">`). The `<cit>`
 *     wrapper itself is transport scaffolding, unwrapped.
 *   - `<said who="#…">`/`<label>` (dialogue speaker turns, 128/14
 *     occurrences, matching the Latin) are unwrapped: both the printed
 *     speaker label and the spoken words are genuine printed text.
 *   - `<foreign>`, `<quote>`, `<q>`, `<emph>` (typographic/quotation
 *     wrappers around genuine translated text) are unwrapped, text kept.
 *   - `<milestone unit="chapter" n="…"/>` (27 total) is zero-width transport
 *     scaffolding — stripped; its value seeds Division.ref.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     section is exactly one Passage (every section div holds exactly one
 *     `<p>` in this source, so this is a formality, not an actual join).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-amicitia-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi052.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-amicitia-en');
const WORK_ID = 'de-amicitia-en';

interface Anomaly {
  where: string;
  note: string;
}

const EXPECTED_SECTIONS = 104;

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
    /<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="section")[^>]*\bn="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<milestone\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'section' | 'other'> = [];
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let currentChapterRef: string | null = null;

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;
  let biblDepth = 0;

  let totalNotes = 0;
  let totalBibl = 0;
  let totalChapterMilestones = 0;
  let totalEmptyParagraphsDropped = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `sec-${n}`;
    sectionParagraphs = [];
  }

  function closeSection(): void {
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    const division: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: currentChapterRef,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    divisions.push(division);
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

    if (m[1] !== undefined) {
      stack.push('section');
      openSection(m[1]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({
          where: currentSectionId || WORK_ID,
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
    } else if (/^<bibl\b/.test(tok)) {
      biblDepth += 1;
    } else if (tok === '</bibl>') {
      biblDepth -= 1;
      totalBibl += 1;
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'chapter' && nMatch?.[1] && noteDepth === 0) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      }
    }
    // catch-all: <foreign>, <said>, <label>, <quote>, <q>, <emph>, <cit> and
    // their closes — no structural action; their content already flows into
    // pBuf (suppressed only while noteDepth/biblDepth > 0).
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_SECTIONS) {
    fail(`expected exactly ${EXPECTED_SECTIONS} sections, got ${divisions.length}`);
  }
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (biblDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${biblDepth})`);

  const emptySections = divisions.filter((d) => d.passages.length === 0 || d.passages[0]!.text.length === 0);
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry empty passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
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
    note: `${totalChapterMilestones} chapter milestones captured; each section's Division.ref is the chapter citation active in that section's own document order (nearest preceding milestone). Passage.ref is always null: no marker is printed at the per-paragraph level.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'On Friendship',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'William Armistead Falconer',
    edition: 'Loeb Classical Library, 1923 printing',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi052.perseus-eng2), which digitises William Armistead Falconer’s translation "Laelius on Friendship", part of Cicero: De Senectute, De Amicitia, De Divinatione (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1923 printing); imported by scripts/import-de-amicitia-en.',
    license:
      "Falconer's 1923 translation is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s Laelius De Amicitia — English, trans. Falconer',
        paragraphs: [
          'This is Cicero’s Laelius De Amicitia ("Laelius, On Friendship") in the English translation made by William Armistead Falconer for the Loeb Classical Library, 1923. It stands alongside the Latin text (ed. Falconer) already in this library as a facing English rendering of the same dialogue.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Falconer’s own translator’s footnotes are excluded — see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Armistead Falconer, trans., Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1923 printing). This translation is in the public domain.',
          'The work is undivided into Books, and is cited by 104 traditional sections, further grouped (per this edition’s own inline chapter milestones) into 27 traditional chapters, matching the Latin sibling section-for-section and chapter-for-chapter.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi052.perseus-eng2.xml (CTS urn:cts:latinLit:phi0474.phi052.perseus-eng2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Unlike the companion De Divinatione/De Senectute English translations (which carry no section divs at all), this witness marks every section with an explicit `<div subtype="section">`, matching the Latin structurally. The importer walks the 104 section divs directly under the translation root and collects each section’s single `<p>` into that section’s one Passage. XML transport scaffolding only is removed: the inline `<milestone unit="chapter">` markers seed each section’s Division.ref rather than appearing in the reading text; dialogue speaker markup (`<said>`/`<label>`) is unwrapped with both the label and the spoken words kept, since both are genuinely printed text; `<foreign>`/`<quote>`/`<q>`/`<emph>` are likewise unwrapped with their text kept. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          "Falconer's own 68 translator's `<note>` footnotes (cross-references and commentary, not the translated running text) and a single `<bibl>` citation gloss (identifying the source of a quoted verse fragment) are excluded from the reading text entirely, tag and content — apparatus, not Falconer's translated prose.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by section (1–104) and, where available, this edition’s own chapter number (1–27), reconstructed from its inline `<milestone unit="chapter">` markers. Passage.ref is null throughout: no marker is printed at the per-paragraph level. Passage.n is also always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 104 sections are present and in order, matching the Latin sibling section-for-section (data/de-amicitia-la). No paragraph is dropped, merged or reordered except where documented in anomalies.json; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          'Footnotes & citation gloss. 68 translator’s `<note>` footnotes and 1 `<bibl>` citation gloss were excluded entirely; neither is Falconer’s translated running text.',
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
    `\n  ${divisions.length} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalNotes} <note>  ${totalBibl} <bibl>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-amicitia-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
