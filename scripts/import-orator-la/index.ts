/**
 * Cicero, *Orator* - Latin text only. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-orator-la/index.ts
 *
 * Reads scripts/import-orator-la/raw/phi0474.phi040.perseus-lat2.xml
 * (fetched once, direct from PerseusDL/canonical-latinLit on GitHub, and
 * committed here; nothing is downloaded at import time) and writes:
 *   data/orator-la/work.json       - the GenericWork (FLAT: 238 numbered
 *                                    Section leaves, no book level)
 *   data/orator-la/about.json      - provenance / licence / prose
 *   data/orator-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-orator-la/validate.ts`.
 *
 * Source (confirmed by fetching scripts/import-orator-la/raw/__cts__.xml
 * before writing this importer): urn:cts:latinLit:phi0474.phi040.perseus-lat2,
 * "M. Tulli Ciceronis. Rhetorica, Vol. 2", ed. Augustus Samuel Wilkins
 * (Oxford: Clarendon Press, 1902) - the Oxford Classical Texts edition
 * (same volume and editor as its Brutus sibling, data/brutus-la).
 *
 * Structure (confirmed by direct inspection of the fetched XML): a FLAT
 * sequence of `<div type="textpart" subtype="section" n="N">` - no book
 * wrapper (Orator is not divided into books either), running n="1".."238"
 * with no gaps, and - unlike Brutus - no leading "sigla" division (the
 * work's own <head> title rubric "M. TVLLI CICERONIS ORATOR AD M.
 * BRVTVM" sits directly before section 1). The commented-out `<!--<back>`
 * index of names at the end of the file is outside `<body>...</body>`, so
 * it is never reached by this importer's body-only slice.
 *
 * This source ALSO carries <milestone unit="chapter" n="N"/> markers
 * throughout (71 total). Each section's Division.ref is the nearest
 * preceding milestone value (running state carried across the whole flat
 * sequence, updated by any milestone found within a section itself) -
 * null before the first milestone is seen. See anomalies.json.
 *
 * Tag handling is shared with the De Oratore/Brutus Latin importers - see
 * the module doc on scripts/import-cicero-la-shared/parseSection.ts.
 * Faithfulness: verbatim Latin reading text only; no accent / spelling /
 * punctuation normalisation.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSectionBody } from '../import-cicero-la-shared/parseSection.ts';
import type { Division, GenericWork, Passage } from '../../data/orator-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi040.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'orator-la');

const WORK_ID = 'orator-la';
const EXPECTED_SECTIONS = 238;
/** Verbatim incipit of section 1 (after the leading milestone marker). */
const INCIPIT = 'Utrum difficilius aut maius esset negare tibi saepius idem roganti';
/** Verbatim tail of the final section (238) - the work's closing sentence. */
const EXPLICIT_TAIL = 'verecundia negandi scribendi me impudentiam suscepisse.';

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

  for (let j = 1; j < secParts.length; j += 2) {
    const rawN = secParts[j]!;
    const secBody = secParts[j + 1] ?? '';

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
  if (totalDelSpans > 0) {
    anomalies.push({
      where: `${WORK_ID} / del totals`,
      note: `${totalDelSpans} editorial deletion span(s) (${totalDelChars} characters total) that Wilkins marks as not part of his printed text were excluded; individual occurrences are also logged per-section above.`,
    });
  }
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- hard sanity gates ---------------------------------------------------
  if (totalChapterMilestonesFound !== 71) {
    anomalies.push({
      where: `${WORK_ID} / milestones`,
      note: `expected 71 <milestone unit="chapter"> markers (confirmed by direct inspection before writing this importer), found ${totalChapterMilestonesFound}.`,
    });
  }
  const firstText = divisions[0]!.passages[0]!.text;
  if (!firstText.startsWith(INCIPIT)) fail(`incipit mismatch: got ${JSON.stringify(firstText.slice(0, 80))}`);
  const lastText = divisions[divisions.length - 1]!.passages[0]!.text;
  if (!lastText.endsWith(EXPLICIT_TAIL)) fail(`explicit mismatch: got tail ${JSON.stringify(lastText.slice(-100))}`);

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about = {
    workId: WORK_ID,
    title: 'Orator',
    author: 'Cicero',
    language: 'la' as const,
    editor: 'Augustus Samuel Wilkins',
    edition: 'Oxford Classical Texts, 1902 (Rhetorica, Vol. 2)',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository ' +
      '(urn:cts:latinLit:phi0474.phi040.perseus-lat2), which digitises M. Tulli Ciceronis Rhetorica, Vol. 2, ' +
      'ed. Augustus Samuel Wilkins (Oxford: Clarendon Press, 1902); imported by scripts/import-orator-la.',
    license:
      'Wilkins\' 1902 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / Open Greek and Latin under a Creative Commons Attribution-ShareAlike 4.0 ' +
      'International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'This is Cicero\'s Orator (his treatise on the ideal orator and prose style, addressed to M. Junius ' +
            'Brutus) in Latin - Augustus Samuel Wilkins\' 1902 Oxford Classical Texts edition, via the Perseus ' +
            'Digital Library / Open Greek and Latin. An independent English translation (E. Jones, 1776, from the ' +
            'same shared volume as the Brutus translation) is also bundled - see data/orator-en.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Augustus Samuel Wilkins, ed., M. Tulli Ciceronis Rhetorica, Vol. 2 (Oxford: Clarendon Press, 1902) - the ' +
            'Scriptorum Classicorum Bibliotheca Oxoniensis (Oxford Classical Texts) edition; the same volume and ' +
            'editor as the Brutus sibling. This edition is in the public domain.',
          'The work is not divided into books: it is a flat sequence of 238 numbered sections, exactly as printed.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi040.perseus-lat2.xml ' +
            '(urn:cts:latinLit:phi0474.phi040.perseus-lat2) from the Perseus Digital Library / Open Greek and Latin ' +
            'canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from ' +
            'the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the flat sequence of section <div>s, collecting every <p> paragraph within a section ' +
            '(joined with a blank line when a section prints more than one) into that section\'s single Passage. ' +
            'Wilkins\' apparatus criticus (<note>...</note>, 687 occurrences) is excluded entirely, tag and ' +
            'content, as is every editorial deletion he marks as not part of his printed text (<del>...</del>, 38 ' +
            'occurrences in the running text - 3 further <del> tags occur only inside an apparatus <note> itself, ' +
            'e.g. quoting a rejected reading, and are removed along with that note rather than double-counted). ' +
            'Purely typographic wrapper tags (regularised spelling, untranslated Greek asides, ' +
            'quotation marks, emphasis, quoted verse) are unwrapped, their text kept inline. Entities are decoded ' +
            'and whitespace collapsed; the words are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by section number (Wilkins\' own printed numbering, 1-238) plus the traditional chapter ' +
            'number this source marks inline with <milestone unit="chapter"/> (71 markers total, coarser than the ' +
            'section numbering). A section\'s Division.ref is the nearest preceding chapter-milestone value; null ' +
            'for any section before the very first milestone. Passage.ref and Passage.n are always null/empty - ' +
            'the milestone is a chapter-level marker only, never printed per-paragraph.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          '687 apparatus-criticus notes (manuscript variant readings) were dropped from the reading text.',
          '38 editorial-deletion spans in the running text that Wilkins marks as not part of his printed text were ' +
            'excluded (3 further <del> occurrences sit only inside an apparatus note and were removed with it).',
          'A handful of manuscript lacunae (<gap/>) are logged individually in anomalies.json.',
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
      `  ${totalNotes} <note>  ${totalDelSpans} <del> spans  ${totalGaps} <gap/>  ${totalChapterMilestonesFound} milestones  ${totalAbbrExpanDropped} <choice> abbr/expan resolved\n` +
      `  sections before first milestone: ${sectionsBeforeFirstMilestone}\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-orator-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
