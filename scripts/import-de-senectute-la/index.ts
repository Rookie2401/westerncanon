/**
 * Cicero, Cato Maior De Senectute — Latin text (ed. W. A. Falconer, Loeb
 * Classical Library, London: William Heinemann Ltd; New York: G. P.
 * Putnam's Sons, 1923 printing; CTS urn:cts:latinLit:phi0474.phi051.perseus-
 * lat2, confirmed against this work's own __cts__.xml). Run-once ingestion
 * pipeline.
 *
 *   npm run import:de-senectute-la
 *
 * Reads scripts/import-de-senectute-la/raw/phi0474.phi051.perseus-lat2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-senectute-la/work.json       - the GenericWork (FLAT: 85 numbered
 *                                          sections, no Book division)
 *   data/de-senectute-la/about.json      - provenance / licence / prose
 *   data/de-senectute-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-senectute-la`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a single
 * `<div type="edition">` wrapper directly containing 85
 * `<div type="textpart" subtype="section" n="N">` divs, N = 1..85, no gaps
 * or duplicates, with NO enclosing Book div (a single undivided dialogue) —
 * this app's flat `sec-N` id scheme applies directly (see
 * data/categoriae-la/work.json for the precedent). Sections hold one or more
 * `<p>` (111 total across 85 sections). Inline `<milestone unit="chapter"
 * n="…"/>` markers (23 total) seed each section's Division.ref with this
 * edition's own chapter citation, in document order (the value active when
 * a section closes).
 *
 * Faithfulness rules (mirrors scripts/import-de-amicitia-la — same edition,
 * same translator, same source repository, same tag vocabulary):
 *   - verbatim Latin reading text only; no spelling/wording fixes.
 *   - `<reg>...</reg>` (315 occurrences — Falconer's silently-regularised
 *     spelling) is unwrapped: the tag is transport scaffolding, its text is
 *     genuine edited Latin.
 *   - `<note>...</note>` (33 total) is Falconer's own critical-apparatus
 *     note (manuscript-reading variants) — excluded entirely (tag AND
 *     content). Every occurrence is counted, not logged individually.
 *   - `<said who="#…">`/`<label rend="smallcaps">` (dialogue speaker turns —
 *     Cato, Scipio, Laelius — 107/8 occurrences) are unwrapped: both the
 *     printed speaker label and the spoken words are genuine printed text.
 *   - `<quote>`/`<q>`/`<hi rend="italic">` (typographic/quotation wrappers)
 *     are unwrapped, text kept; `<hi>` here is only ever seen nested inside
 *     an excluded `<note>` (confirmed by direct inspection), so it never
 *     actually surfaces in the reading text, but is harmless to unwrap
 *     regardless (catch-all rule).
 *   - `<milestone unit="chapter" n="…"/>` (23 total) is zero-width transport
 *     scaffolding — stripped; its value seeds Division.ref.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     section is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n" when a section has more than one.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-senectute-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi051.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-senectute-la');
const WORK_ID = 'de-senectute-la';

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
      }
    }
    // catch-all: <reg>, <said>, <label>, <quote>, <q>, <hi> and their
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
    note: `${totalChapterMilestones} chapter milestones captured; each section's Division.ref is the chapter citation active in that section's own document order (nearest preceding milestone). Passage.ref is always null: no marker is printed at the per-paragraph level.`,
  });
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
    title: 'Cato Maior De Senectute',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'W. A. Falconer',
    edition: "William Heinemann Ltd; New York: G. P. Putnam's Sons, 1923 (printing)",
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi051.perseus-lat2), which digitises the Latin text as edited by W. A. Falconer, Cicero: De Senectute, De Amicitia, De Divinatione (London: William Heinemann Ltd; New York: G. P. Putnam’s Sons, 1923 printing); imported by scripts/import-de-senectute-la.',
    license:
      "Falconer's 1923 Loeb edition is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s Cato Maior De Senectute',
        paragraphs: [
          'This is Cicero’s Cato Maior De Senectute ("Cato the Elder, On Old Age"), a dialogue in which the aged Marcus Porcius Cato the Censor, addressing the younger Scipio Aemilianus and Gaius Laelius, argues that old age, rightly lived, is not to be feared or despised.',
          'The text here is the Latin, verbatim. Nothing is translated, modernised or silently corrected. Falconer’s own critical-apparatus notes (manuscript-reading variants) are excluded — see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'W. A. Falconer, ed., Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library (London: William Heinemann Ltd; New York: G. P. Putnam’s Sons, 1923 printing). This edition is in the public domain.',
          'The work is undivided into Books — a single continuous dialogue — and is cited by 85 traditional sections, further grouped (per this edition’s own inline chapter milestones) into 23 traditional chapters; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi051.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi051.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the 85 section divs directly under the edition root (there is no Book wrapper) and collects each section’s `<p>` paragraph(s) — 111 total, so several sections hold more than one — into that section’s one Passage, joined with a blank line where there is more than one. XML transport scaffolding only is removed: `<reg>` (Falconer’s silently regularised spelling) is unwrapped with its text kept; the inline `<milestone unit="chapter">` markers seed each section’s Division.ref rather than appearing in the reading text; dialogue speaker markup (`<said>`/`<label>`, e.g. "SCIPIO.") is unwrapped with both the label and the spoken words kept. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
          "Falconer's own 33 critical-apparatus `<note>` elements (manuscript-reading variants) are excluded from the reading text entirely, tag and content — editorial apparatus, not Cicero's Latin.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by section (1–85) and, where available, this edition’s own chapter number (1–23), reconstructed from its inline `<milestone unit="chapter">` markers — the chapter citation active when a given section closes. Passage.ref is null throughout: no marker is printed at the per-paragraph level. Passage.n is also always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 85 sections are present and in order. No paragraph is dropped, merged or reordered except where documented in anomalies.json; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          'Apparatus. 33 `<note>` critical-apparatus notes (manuscript-reading variants) were excluded entirely; not Cicero’s text.',
          'Witness-structure note for the English sibling: unlike this Latin witness, the companion English translation (data/de-senectute-en, an older Perseus digitisation style, CTS ...perseus-eng1) carries no section divs at all and is missing a milestone for section 36 specifically — see that importer’s own module doc and about.json for the full account. This Latin edition is unaffected and complete.',
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
  process.stdout.write('\nDone. Run `npm run validate:de-senectute-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
