/**
 * Hesiod, *Theogony* - English translation (Hugh G. Evelyn-White, 1914 Loeb
 * Classical Library), via the Perseus / OpenGreekAndLatin `canonical-greekLit`
 * TEI (tlg0020.tlg001.perseus-eng2.xml). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-hesiod-theogony-en/index.ts
 *
 * Reads scripts/import-hesiod-theogony-en/raw/tlg0020.tlg001.perseus-eng2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/theogony-en/work.json       - the GenericWork (32 card divisions, one level deep)
 *   data/theogony-en/about.json      - provenance / licence metadata
 *   data/theogony-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-hesiod-shared/validate.ts`.
 *
 * See scripts/import-hesiod-shared/xml.ts for the full source-shape notes,
 * including the departure from the originally-assumed <p>-paragraph
 * structure (there are none; the English source is a bare stream of <l>
 * reference-anchor elements carrying ordinary prose, threaded with the same
 * card <milestone> scheme as the Greek witness).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bucketsFromBoundaries, fail, parseEnglishBody } from '../import-hesiod-shared/xml.ts';
import { THEOGONY_CARD_BOUNDARIES, THEOGONY_FINAL_LINE } from '../import-hesiod-shared/cardBoundaries.ts';
import { buildAbout, digitalSourceParagraph, editionParagraphs, HESIOD_LICENSE_EN } from '../import-hesiod-shared/aboutText.ts';
import type { Anomaly, Division, GenericWork, Passage } from '../import-hesiod-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0020.tlg001.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'theogony-en');

const WORK_ID = 'theogony-en';
const INCIPIT = 'From the Heliconian Muses let us begin to sing';

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const parsed = parseEnglishBody(xml, WORK_ID);

  const wantN = THEOGONY_CARD_BOUNDARIES.map(String);
  const gotN = parsed.cards.map((c) => c.n);
  if (JSON.stringify(gotN) !== JSON.stringify(wantN)) {
    fail(WORK_ID, `English card milestone list does not match the shared cardBoundaries table.\n  got:  ${gotN.join(',')}\n  want: ${wantN.join(',')}`);
  }

  const cards = bucketsFromBoundaries(THEOGONY_CARD_BOUNDARIES, THEOGONY_FINAL_LINE);
  if (cards.length !== parsed.cards.length) fail(WORK_ID, `card count mismatch: ${cards.length} vs ${parsed.cards.length}`);

  if (!parsed.cards[0]!.text.startsWith(INCIPIT)) {
    fail(WORK_ID, `incipit spot-check failed. expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(parsed.cards[0]!.text.slice(0, 80))}`);
  }

  // --- build divisions ---
  const divisions: Division[] = cards.map((card, i) => {
    const text = parsed.cards[i]!.text;
    const passages: Passage[] = [{ n: '', text, ref: null }];
    return {
      id: `sec-${card.index}`,
      number: String(card.index),
      ref: `${card.startLine}–${card.endLine}`,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages,
    };
  });

  // --- anomalies ---
  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / source structure deviation`,
    note:
      'The importer was originally planned around <p> paragraphs with inline <milestone> card breaks (mirroring ' +
      'this repo\'s Homer-style English encoding). The actual source carries NO <p> anywhere: the body is a bare ' +
      'stream of <l n="N"> "line group" elements (reference anchors spaced roughly every 5 Greek lines, not real ' +
      'verse lines - Evelyn-White\'s translation is ordinary prose) with <milestone unit="card"> markers threaded ' +
      'through it, sometimes at an <l> boundary and sometimes mid-<l>. Each card is therefore imported as ONE ' +
      'continuous prose block (there is no source paragraph division to join with "\\n\\n"), built by walking the ' +
      'whole text stream token-by-token and cutting at each milestone regardless of which <l> it falls inside.',
  });
  anomalies.push({
    where: `${WORK_ID} / card boundary source`,
    note:
      `This file's own ${parsed.cards.length} <milestone unit="card"> markers ARE the canonical card boundaries ` +
      '(their n values equal the Greek starting line number of each card) - used both for this English work and, ' +
      'via the shared cardBoundaries table, cross-checked against and reused for the Greek work of the same title.',
  });
  anomalies.push({
    where: `${WORK_ID} / <note> footnotes dropped`,
    note:
      `${parsed.noteCount} <note resp="Loeb" ...> element(s) - Evelyn-White's own translator's footnotes, not ` +
      'Hesiod\'s text - were dropped wholesale, matching this repo\'s established <note> convention (see e.g. ' +
      'import-euclid-en). Each drop was replaced with a single space to guard against words merging across the cut ' +
      '(verified: several notes abut reading-text words with no surrounding whitespace in the source).',
  });
  anomalies.push({
    where: `${WORK_ID} / inline <placeName> unwrapped`,
    note:
      'Occurrences of <placeName> wrapping ordinary reading-text words (e.g. "Olympus") were unwrapped, keeping the ' +
      'text; every occurrence outside a dropped <note> sits at a whitespace/punctuation boundary on both sides ' +
      '(verified by direct inspection), so no word-merging risk. <foreign> and <hi> occur only inside dropped ' +
      '<note> blocks in this file and needed no separate handling.',
  });
  anomalies.push({
    where: `${WORK_ID} / Division.ref`,
    note:
      'Division.ref gives the underlying Greek verse line range for each card (e.g. "1–28"), since Evelyn-White\'s ' +
      'prose translation carries no line numbers of its own. This is the same range printed in the companion ' +
      'theogony-grc work, so the two witnesses\' cards can be read side by side.',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${divisions.length} cards present and in order, from the incipit through the poem's final card. No truncation.`,
  });

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };
  const about = buildAbout({
    workId: WORK_ID,
    title: 'Theogony',
    greekTitle: 'Θεογονία',
    language: 'en',
    translator: 'Hugh G. Evelyn-White',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin `canonical-greekLit` GitHub repository ' +
      '(CTS urn:cts:greekLit:tlg0020.tlg001.perseus-eng2), which digitises Hugh G. Evelyn-White\'s 1914 Loeb ' +
      'Classical Library prose translation of Hesiod\'s Theogony; imported by scripts/import-hesiod-theogony-en.',
    license: HESIOD_LICENSE_EN,
    introParagraphs: [
      'This is Hugh G. Evelyn-White\'s 1914 prose translation of Hesiod\'s Theogony, the archaic epic recounting ' +
        'the birth of the gods and the establishment of Zeus\'s rule over the cosmos.',
      'The translation is reproduced verbatim; nothing is modernised, abridged or silently corrected. Evelyn-' +
        'White\'s own explanatory footnotes are not part of Hesiod\'s text and are not reproduced here (see ' +
        '"Known gaps & anomalies").',
    ],
    editionParagraphs: editionParagraphs('Theogony', 'Θεογονία'),
    digitalSourceParagraph: digitalSourceParagraph('tlg0020.tlg001.perseus-eng2.xml', 'urn:cts:greekLit:tlg0020.tlg001.perseus-eng2'),
    howImportedParagraphs: [
      'The importer walks the single translation <div> as one continuous text stream and cuts it into 32 cards at ' +
        'each <milestone unit="card"> marker (there is no <p> structure to slice on - see "Known gaps & ' +
        'anomalies"). Evelyn-White\'s own footnotes (<note>) are dropped; <placeName> wrapping is unwrapped, ' +
        'keeping the word. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
    ],
    referenceSchemeParagraphs: [
      'Citation here is by card, matching the companion theogony-grc Greek work card for card. Each card\'s ' +
        'Division.ref gives the underlying Greek verse line range. Passage.n is "" throughout.',
    ],
    gapsParagraphs: [
      `${parsed.noteCount} translator's footnote(s) were dropped (not Hesiod's text). No <p> paragraph structure ` +
        'exists in the source, so each card is imported as a single continuous prose block. See the individual ' +
        'anomaly entries above for the full reasoning.',
    ],
  });

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ---
  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(`  sec-${d.number!.padEnd(3)} ${d.id.padEnd(8)} ref ${(d.ref ?? '-').padEnd(10)} ${d.passages[0]!.text.length} chars\n`);
  }
  process.stdout.write(`\n  ${divisions.length} divisions (cards)  ${totalPassages} passages  ${totalChars} chars  ${parsed.noteCount} <note> dropped\n`);
  process.stdout.write('\nDone. Run `npx tsx scripts/import-hesiod-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
