/**
 * Cicero, *Brutus* - Latin text only. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-brutus-la/index.ts
 *
 * Reads scripts/import-brutus-la/raw/phi0474.phi039.perseus-lat2.xml
 * (fetched once, direct from PerseusDL/canonical-latinLit on GitHub, and
 * committed here; nothing is downloaded at import time) and writes:
 *   data/brutus-la/work.json       - the GenericWork (FLAT: 333 numbered
 *                                    Section leaves, no book level)
 *   data/brutus-la/about.json      - provenance / licence / prose
 *   data/brutus-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-brutus-la/validate.ts`.
 *
 * Source (confirmed by fetching scripts/import-brutus-la/raw/__cts__.xml
 * before writing this importer): urn:cts:latinLit:phi0474.phi039.perseus-lat2,
 * "M. Tulli Ciceronis. Rhetorica, Vol. 2", ed. Augustus Samuel Wilkins
 * (Oxford: Clarendon Press, 1902) - the Oxford Classical Texts edition.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a FLAT
 * sequence of `<div type="textpart" subtype="section" n="N">` - no book
 * wrapper at all (Brutus is not divided into books) - running n="1".."333"
 * with no gaps, immediately preceded by one extra `n="sigla"` division
 * (Wilkins' own editorial key of manuscript sigla, "SIGLA" - F, B, O, G,
 * H, M, L, N, D, codd. dett., vulg. - NOT part of Cicero's text). That
 * sigla division is excluded entirely (logged to anomalies.json), so the
 * work's 333 real sections become `sec-1`..`sec-333`.
 *
 * This source ALSO carries <milestone unit="chapter" n="N"/> markers
 * throughout (97 total) - a coarser, traditional Roman-numeral-cited
 * chapter reference, independent of Wilkins' own section numbering. Each
 * section's Division.ref is the nearest preceding milestone value (running
 * state carried across the whole flat sequence, updated by any milestone
 * found within a section itself, since a milestone at a section's very
 * start still precedes that section's own text) - null before the first
 * milestone is seen. See anomalies.json for the exact count and any
 * sections before the first milestone.
 *
 * Tag handling is shared with the De Oratore/Orator Latin importers - see
 * the module doc on scripts/import-cicero-la-shared/parseSection.ts for
 * the full, verified account of every apparatus tag in this phi0474 corpus
 * (690 <note> apparatus-criticus entries excluded entirely; a small number
 * of <gap/> lacuna markers logged; one <abbr>/<expan> construction, in the
 * book's own <head> title rubric, outside any section - see below).
 * Faithfulness: verbatim Latin reading text only; no accent / spelling /
 * punctuation normalisation.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSectionBody } from '../import-cicero-la-shared/parseSection.ts';
import type { Division, GenericWork, Passage } from '../../data/brutus-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi039.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'brutus-la');

const WORK_ID = 'brutus-la';
const EXPECTED_SECTIONS = 333;
/** Verbatim incipit of section 1 (after the leading milestone marker). */
const INCIPIT = 'Cum e Cilicia decedens Rhodum venissem';
/** Verbatim tail of the final section (333) - the manuscript breaks off mid-sentence here. */
const EXPLICIT_TAIL = 'si operosa est concursatio magis opportunorum';

interface Anomaly {
  where: string;
  note: string;
}

function fail(msg: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${msg}\n`);
  process.exit(1);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const anomalies: Anomaly[] = [];

  const edStart = xml.indexOf('type="edition"');
  const bodyEnd = xml.indexOf('</body>');
  if (edStart < 0 || bodyEnd < 0 || bodyEnd < edStart) fail('no <div type="edition"> ... </body> found in source XML');
  const ed = xml.slice(edStart, bodyEnd);

  const secRe = /<div type="textpart" subtype="section"[^>]*\sn="([^"]+)"[^>]*>/g;
  const secParts = ed.split(secRe);
  if (secParts.length < 3) fail(`unexpected section split shape (${secParts.length} parts)`);

  const divisions: Division[] = [];
  let currentChapterRef: string | null = null;
  let sectionsBeforeFirstMilestone = 0;
  let totalChapterMilestonesFound = 0;
  let totalGaps = 0;
  let totalNotes = 0;
  let totalDelSpans = 0;
  let totalDelChars = 0;
  let totalAbbrExpanDropped = 0;
  let totalEmptyParagraphsDropped = 0;
  let siglaSkipped = false;

  for (let j = 1; j < secParts.length; j += 2) {
    const rawN = secParts[j]!;
    const secBody = secParts[j + 1] ?? '';

    if (rawN === 'sigla') {
      siglaSkipped = true;
      anomalies.push({
        where: `${WORK_ID} / front matter`,
        note:
          'The source\'s first "section" division (n="sigla") is Wilkins\' own editorial key of manuscript sigla ' +
          '(F, B, O, G, H, M, L, N, D, codd. dett., vulg.) - front matter for his critical apparatus, not part of ' +
          'Cicero\'s text. Excluded entirely; the work\'s 333 real sections become sec-1..sec-333.',
      });
      continue;
    }

    const secNum = Number(rawN);
    if (!Number.isFinite(secNum)) fail(`non-numeric section n="${rawN}"`);
    const secId = `sec-${secNum}`;

    const parsed = parseSectionBody(secBody, secId, fail);
    totalChapterMilestonesFound += parsed.chapterMilestones.length;
    totalNotes += parsed.counts.notes;
    totalDelSpans += parsed.counts.delSpans;
    totalDelChars += parsed.counts.delChars;
    totalAbbrExpanDropped += parsed.counts.abbrExpanDropped;
    totalEmptyParagraphsDropped += parsed.counts.emptyParagraphsDropped;
    for (const g of parsed.gaps) {
      totalGaps += 1;
      anomalies.push({
        where: g.where,
        note: `lacuna marker <gap reason="${g.reason}" rend="${g.rend.trim()}"/> found; the printed edition marks a manuscript gap here (no text content in the tag itself, so nothing is fabricated in its place).`,
      });
    }
    if (parsed.counts.delSpans > 0) {
      anomalies.push({
        where: secId,
        note: `${parsed.counts.delSpans} editorial deletion(s) (<del>, Wilkins' apparatus criticus) totalling ${parsed.counts.delChars} characters were excluded from the reading text.`,
      });
    }

    if (parsed.chapterMilestones.length > 0) {
      currentChapterRef = parsed.chapterMilestones[parsed.chapterMilestones.length - 1]!;
    } else if (currentChapterRef === null) {
      sectionsBeforeFirstMilestone += 1;
    }

    const passage: Passage = { n: '', text: parsed.text, ref: null };
    const secDiv: Division = {
      id: secId,
      number: String(secNum),
      ref: currentChapterRef,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    divisions.push(secDiv);
  }

  if (!siglaSkipped) anomalies.push({ where: `${WORK_ID} / front matter`, note: 'expected an n="sigla" front-matter division; none was found (unexpected).' });
  if (divisions.length !== EXPECTED_SECTIONS) fail(`expected ${EXPECTED_SECTIONS} sections, got ${divisions.length}`);
  divisions.forEach((d, i) => {
    if (d.number !== String(i + 1)) fail(`section out of sequence at position ${i} (id ${d.id})`);
  });

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / apparatus totals`,
    note: `${totalNotes} apparatus-criticus <note> elements were dropped entirely (tag and content); not logged individually given the number (mirrors the treatment elsewhere in this library).`,
  });
  if (sectionsBeforeFirstMilestone > 0) {
    anomalies.push({
      where: `${WORK_ID} / division refs`,
      note: `${sectionsBeforeFirstMilestone} section(s) precede the first <milestone unit="chapter"> marker in the source; their Division.ref is null rather than fabricated.`,
    });
  }
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- hard sanity gates ---------------------------------------------------
  if (totalChapterMilestonesFound !== 97) {
    anomalies.push({
      where: `${WORK_ID} / milestones`,
      note: `expected 97 <milestone unit="chapter"> markers (confirmed by direct inspection before writing this importer), found ${totalChapterMilestonesFound}.`,
    });
  }
  const firstText = divisions[0]!.passages[0]!.text;
  if (!firstText.startsWith(INCIPIT)) fail(`incipit mismatch: got ${JSON.stringify(firstText.slice(0, 80))}`);
  const lastText = divisions[divisions.length - 1]!.passages[0]!.text;
  if (!lastText.includes(EXPLICIT_TAIL)) fail(`explicit mismatch: expected to find ${JSON.stringify(EXPLICIT_TAIL)} in final section, got ${JSON.stringify(lastText.slice(-200))}`);

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about = {
    workId: WORK_ID,
    title: 'Brutus',
    author: 'Cicero',
    language: 'la' as const,
    editor: 'Augustus Samuel Wilkins',
    edition: 'Oxford Classical Texts, 1902 (Rhetorica, Vol. 2)',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository ' +
      '(urn:cts:latinLit:phi0474.phi039.perseus-lat2), which digitises M. Tulli Ciceronis Rhetorica, Vol. 2, ' +
      'ed. Augustus Samuel Wilkins (Oxford: Clarendon Press, 1902); imported by scripts/import-brutus-la.',
    license:
      'Wilkins\' 1902 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / Open Greek and Latin under a Creative Commons Attribution-ShareAlike 4.0 ' +
      'International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'This is Cicero\'s Brutus (a dialogue on the history of Roman and Greek oratory, addressed to M. Junius ' +
            'Brutus) in Latin - Augustus Samuel Wilkins\' 1902 Oxford Classical Texts edition, via the Perseus ' +
            'Digital Library / Open Greek and Latin. An independent English translation (E. Jones, 1776) is also ' +
            'bundled - see data/brutus-en.',
          'The Latin manuscript tradition itself breaks off mid-sentence near the end of the work ("si operosa est ' +
            'concursatio magis opportunorum ...") - not a defect of this import; see "Known gaps & anomalies".',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Augustus Samuel Wilkins, ed., M. Tulli Ciceronis Rhetorica, Vol. 2 (Oxford: Clarendon Press, 1902) - the ' +
            'Scriptorum Classicorum Bibliotheca Oxoniensis (Oxford Classical Texts) edition. This edition is in the ' +
            'public domain.',
          'The work is not divided into books: it is a flat sequence of 333 numbered sections, exactly as printed.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi039.perseus-lat2.xml ' +
            '(urn:cts:latinLit:phi0474.phi039.perseus-lat2) from the Perseus Digital Library / Open Greek and Latin ' +
            'canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from ' +
            'the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the flat sequence of section <div>s, collecting every <p> paragraph within a section ' +
            '(joined with a blank line when a section prints more than one) into that section\'s single Passage. ' +
            'The source\'s leading n="sigla" division (Wilkins\' own key of manuscript-sigla abbreviations, front ' +
            'matter for his critical apparatus, not Cicero\'s text) is excluded entirely. Wilkins\' apparatus ' +
            'criticus (<note>...</note>, 690 occurrences) is excluded entirely, tag and content, as is any ' +
            'editorial deletion he marks as not part of his printed text (<del>...</del>). A handful of manuscript ' +
            'lacunae marked with a self-closing <gap/> are logged individually to anomalies.json. Purely ' +
            'typographic wrapper tags (regularised spelling, verse quotations, untranslated Greek asides, ' +
            'quotation marks, emphasis) are unwrapped, their text kept inline. Entities are decoded and whitespace ' +
            'collapsed; the words are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by section number (Wilkins\' own printed numbering, 1-333) plus the traditional chapter ' +
            'number this source marks inline with <milestone unit="chapter"/> (97 markers total, coarser than the ' +
            'section numbering). A section\'s Division.ref is the nearest preceding chapter-milestone value; null ' +
            'for the rare section before the very first milestone. Passage.ref and Passage.n are always null/empty ' +
            '- the milestone is a chapter-level marker only, never printed per-paragraph.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'The work itself is incomplete in every surviving manuscript: it breaks off mid-sentence in section 333 ' +
            '("si operosa est concursatio magis opportunorum ...") followed by the editorial note that the ' +
            'archetype manuscript itself was already missing leaves at this point (Flavius Blondus\' subscription, ' +
            'quoted in Wilkins\' apparatus and excluded here as apparatus, not text) - a genuine ancient textual ' +
            'gap, not an import defect.',
          '690 apparatus-criticus notes (manuscript sigla and variant readings) were dropped from the reading text.',
          'A small number of manuscript lacunae (<gap/>) are logged individually in anomalies.json.',
          'The excluded "SIGLA" front-matter division is Wilkins\' own editorial key, not part of Cicero\'s Brutus.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  const totalChars = divisions.reduce((n, d) => n + d.passages[0]!.text.length, 0);
  process.stdout.write(
    `\n  ${divisions.length} sections  ${totalChars} chars\n` +
      `  ${totalNotes} <note>  ${totalDelSpans} <del> spans (${totalDelChars} chars)  ${totalGaps} <gap/>  ${totalChapterMilestonesFound} milestones\n` +
      `  ${totalAbbrExpanDropped} <choice> abbr/expan resolved\n` +
      `  sections before first milestone: ${sectionsBeforeFirstMilestone}\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-brutus-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
