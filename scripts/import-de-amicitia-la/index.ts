/**
 * Cicero, Laelius De Amicitia — Latin text (ed. W. A. Falconer, Loeb
 * Classical Library, Cambridge, MA: Harvard University Press; London:
 * William Heinemann Ltd, 1923; CTS urn:cts:latinLit:phi0474.phi052.perseus-
 * lat2, confirmed against this work's own __cts__.xml). Run-once ingestion
 * pipeline.
 *
 *   npm run import:de-amicitia-la
 *
 * Reads scripts/import-de-amicitia-la/raw/phi0474.phi052.perseus-lat2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-amicitia-la/work.json       - the GenericWork (FLAT: 104 numbered
 *                                          sections, no Book division)
 *   data/de-amicitia-la/about.json      - provenance / licence / prose
 *   data/de-amicitia-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-amicitia-la`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a single
 * `<div type="edition">` wrapper directly containing 104
 * `<div type="textpart" subtype="section" n="N">` divs, N = 1..104, no gaps
 * or duplicates, with NO enclosing Book div (Cicero's dialogue on friendship
 * is a single undivided work) — unlike De Natura Deorum/De Divinatione, this
 * app's flat `sec-N` id scheme applies directly (see
 * data/categoriae-la/work.json for the precedent). Each section div holds
 * one `<p>`. Inline `<milestone unit="chapter" n="…"/>` markers (27 total,
 * plus one stray `unit="section"` milestone — redundant with the explicit
 * section divs already present, silently ignored) seed each section's
 * Division.ref with this edition's own chapter citation, in document order
 * (the value active when a section closes — "nearest preceding milestone",
 * per this app's convention).
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-grc):
 *   - verbatim Latin reading text only; no spelling/wording fixes.
 *   - `<reg>...</reg>` (358 occurrences — Falconer's silently-regularised
 *     spelling, e.g. sentence-initial lowercasing) is unwrapped: the tag is
 *     transport scaffolding, its text is genuine edited Latin and flows into
 *     the surrounding prose like any other run of text.
 *   - `<note>...</note>` (16 total) is Falconer's own critical-apparatus
 *     note (manuscript-reading variants, e.g. "tum fere multis MSS.; tum
 *     forte Müller") — NOT Cicero's text — excluded from the reading text
 *     entirely (tag AND content), the same treatment this library already
 *     gives a Loeb translator/editor's apparatus elsewhere. Every occurrence
 *     is counted (not logged individually — 16 routine apparatus notes).
 *   - `<said who="#…">`/`<label>` (dialogue speaker turns — Fannius, Scaevola,
 *     Laelius — 128/14 occurrences) are unwrapped: both the printed speaker
 *     label (e.g. "FANNIUS.") and the spoken words that follow are genuine
 *     printed text, not apparatus, and flow into the surrounding prose.
 *   - `<quote>`/`<q>`/`<emph>` (typographic/quotation wrappers around
 *     genuine text) are unwrapped, their text kept; `<emph>` here is only
 *     ever seen nested inside an excluded `<note>` (confirmed by direct
 *     inspection), so it never actually surfaces in the reading text, but is
 *     harmless to unwrap regardless (catch-all rule).
 *   - `<milestone unit="chapter" n="…"/>` (27 total) is zero-width transport
 *     scaffolding — stripped; its value seeds Division.ref (see above). The
 *     one stray `<milestone unit="section" n="…"/>` is likewise zero-width
 *     and ignored (this work's sections are already delimited by explicit
 *     `<div subtype="section">`, so no section-boundary information would
 *     be gained from it).
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     section is exactly one Passage (in this source every section div
 *     holds exactly one `<p>`, so this is a formality, not an actual join).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-amicitia-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi052.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-amicitia-la');
const WORK_ID = 'de-amicitia-la';

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
    /<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="section")[^>]*\bn="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<milestone\b[^>]*\/>|<[^>]+>/g;

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

  let totalNotes = 0;
  let totalChapterMilestones = 0;
  let totalStraySectionMilestones = 0;
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
      if (inP && noteDepth === 0) pBuf += free;
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
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'chapter' && nMatch?.[1] && noteDepth === 0) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      } else if (unitMatch?.[1] === 'section') {
        totalStraySectionMilestones += 1;
      }
    }
    // catch-all: <reg>, <said>, <label>, <quote>, <q>, <emph> and their
    // closes — no structural action; their content already flows into pBuf.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_SECTIONS) {
    fail(`expected exactly ${EXPECTED_SECTIONS} sections, got ${divisions.length}`);
  }
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);

  const emptySections = divisions.filter((d) => d.passages.length === 0 || d.passages[0]!.text.length === 0);
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry empty passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> critical-apparatus notes (Falconer's manuscript-variant apparatus, not Cicero's text) were excluded entirely, tag and content; not logged individually given their routine, uniform nature.`,
  });
  anomalies.push({
    where: `${WORK_ID} / division refs`,
    note: `${totalChapterMilestones} chapter milestones captured; each section's Division.ref is the chapter citation active in that section's own document order (nearest preceding milestone), restarting fresh only in the sense that this is a single-Book work. Passage.ref is always null: no marker is printed at the per-paragraph level.`,
  });
  if (totalStraySectionMilestones > 0) {
    anomalies.push({
      where: `${WORK_ID} / structure`,
      note: `${totalStraySectionMilestones} stray <milestone unit="section"/> marker(s) found alongside the explicit <div subtype="section"> boundaries already present; ignored (redundant — this work's sections are already delimited structurally, so no information is lost by ignoring it).`,
    });
  }
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Laelius De Amicitia',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'W. A. Falconer',
    edition: 'Loeb Classical Library, 1923',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi052.perseus-lat2), which digitises the Latin text as edited by W. A. Falconer, Cicero: De Senectute, De Amicitia, De Divinatione (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1923); imported by scripts/import-de-amicitia-la.',
    license:
      "Falconer's 1923 Loeb edition is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s Laelius De Amicitia',
        paragraphs: [
          'This is Cicero’s Laelius De Amicitia ("Laelius, On Friendship"), a dialogue in which the elder Gaius Laelius, in the days after the death of his friend Scipio Africanus the Younger, discusses the nature of true friendship with his sons-in-law Quintus Mucius Scaevola and Gaius Fannius.',
          'The text here is the Latin, verbatim. Nothing is translated, modernised or silently corrected. Falconer’s own critical-apparatus notes (manuscript-reading variants) are excluded — see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'W. A. Falconer, ed., Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd, 1923). This edition is in the public domain.',
          'The work is undivided into Books — a single continuous dialogue — and is cited by 104 traditional sections, further grouped (per this edition’s own inline chapter milestones) into 27 traditional chapters; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi052.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi052.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the 104 section divs directly under the edition root (there is no Book wrapper) and collects each section’s single `<p>` into that section’s one Passage. XML transport scaffolding only is removed: `<reg>` (Falconer’s silently regularised spelling) is unwrapped with its text kept; the inline `<milestone unit="chapter">` markers seed each section’s Division.ref rather than appearing in the reading text; dialogue speaker markup (`<said>`/`<label>`, e.g. "FANNIUS.") is unwrapped with both the label and the spoken words kept, since both are genuinely printed text. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          "Falconer's own 16 critical-apparatus `<note>` elements (manuscript-reading variants, e.g. \"tum fere multis MSS.; tum forte Müller\") are excluded from the reading text entirely, tag and content — editorial apparatus, not Cicero's Latin.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by section (1–104) and, where available, this edition’s own chapter number (1–27), reconstructed from its inline `<milestone unit="chapter">` markers — the chapter citation active when a given section closes. Passage.ref is null throughout: no marker is printed at the per-paragraph level. Passage.n is also always empty: this source prints no separate paragraph numbering below the section.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 104 sections are present and in order, matching the English sibling section-for-section (data/de-amicitia-en). No paragraph is dropped, merged or reordered except where documented in anomalies.json; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          'Apparatus. 16 `<note>` critical-apparatus notes (manuscript-reading variants) were excluded entirely; not Cicero’s text.',
          'One stray section milestone. A single `<milestone unit="section">` marker appears alongside the explicit section divs already present; ignored as redundant (see anomalies.json).',
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
    `\n  ${divisions.length} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalNotes} <note>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-amicitia-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
