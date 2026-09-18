/**
 * Hesiod (attrib.), *Shield of Heracles* - English translation (Hugh G.
 * Evelyn-White, 1914 Loeb Classical Library), via the Perseus /
 * OpenGreekAndLatin `canonical-greekLit` TEI (tlg0020.tlg003.perseus-eng2.xml).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-hesiod-shield-of-heracles-en/index.ts
 *
 * Reads scripts/import-hesiod-shield-of-heracles-en/raw/tlg0020.tlg003.perseus-eng2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/shield-of-heracles-en/work.json       - the GenericWork (13 card divisions, one level deep)
 *   data/shield-of-heracles-en/about.json      - provenance / licence metadata
 *   data/shield-of-heracles-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-hesiod-shared/validate.ts`.
 *
 * See scripts/import-hesiod-shared/xml.ts for the full source-shape notes
 * (no <p> paragraphs; a bare <l> reference-anchor stream carrying prose,
 * threaded with the same card <milestone> scheme as the Greek witness).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bucketsFromBoundaries, fail, parseEnglishBody } from '../import-hesiod-shared/xml.ts';
import { SHIELD_CARD_BOUNDARIES, SHIELD_FINAL_LINE } from '../import-hesiod-shared/cardBoundaries.ts';
import { buildAbout, digitalSourceParagraph, editionParagraphs, HESIOD_LICENSE_EN } from '../import-hesiod-shared/aboutText.ts';
import type { Anomaly, Division, GenericWork, Passage } from '../import-hesiod-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0020.tlg003.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'shield-of-heracles-en');

const WORK_ID = 'shield-of-heracles-en';
const INCIPIT = 'Or like her who left home and country and came to Thebes';

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const parsed = parseEnglishBody(xml, WORK_ID);

  const wantN = SHIELD_CARD_BOUNDARIES.map(String);
  const gotN = parsed.cards.map((c) => c.n);
  if (JSON.stringify(gotN) !== JSON.stringify(wantN)) {
    fail(WORK_ID, `English card milestone list does not match the shared cardBoundaries table.\n  got:  ${gotN.join(',')}\n  want: ${wantN.join(',')}`);
  }

  const cards = bucketsFromBoundaries(SHIELD_CARD_BOUNDARIES, SHIELD_FINAL_LINE);
  if (cards.length !== parsed.cards.length) fail(WORK_ID, `card count mismatch: ${cards.length} vs ${parsed.cards.length}`);

  if (!parsed.cards[0]!.text.startsWith(INCIPIT)) {
    fail(WORK_ID, `incipit spot-check failed. expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(parsed.cards[0]!.text.slice(0, 80))}`);
  }

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

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / source structure deviation`,
    note:
      'As with theogony-en and works-and-days-en, the source carries NO <p> anywhere: the body is a bare stream ' +
      'of <l n="N"> reference-anchor elements carrying ordinary prose, threaded with <milestone unit="card"> ' +
      'markers. Each card is imported as one continuous prose block by walking the whole text stream token-by-' +
      'token and cutting at each milestone.',
  });
  anomalies.push({
    where: `${WORK_ID} / card boundary source`,
    note:
      `This file's own ${parsed.cards.length} <milestone unit="card"> markers were cross-checked against the ` +
      'shared cardBoundaries table (itself matching this work\'s Greek witness\'s own native card milestones) and ' +
      'match exactly.',
  });
  anomalies.push({
    where: `${WORK_ID} / <note> footnotes dropped`,
    note:
      `${parsed.noteCount} <note resp="Loeb" ...> element(s) - Evelyn-White's own translator's footnotes, not ` +
      'the poem\'s text - were dropped wholesale, matching this repo\'s established <note> convention (see e.g. ' +
      'import-euclid-en). Each drop was replaced with a single space to guard against words merging across the cut.',
  });
  anomalies.push({
    where: `${WORK_ID} / inline <placeName> unwrapped`,
    note:
      'Occurrences of <placeName> wrapping ordinary reading-text words were unwrapped, keeping the text; verified ' +
      'by direct inspection that every occurrence outside a dropped <note> sits at a whitespace/punctuation ' +
      'boundary on both sides.',
  });
  anomalies.push({
    where: `${WORK_ID} / Division.ref`,
    note:
      'Division.ref gives the underlying Greek verse line range for each card, since Evelyn-White\'s prose ' +
      'translation carries no line numbers of its own. This is the same range printed in the companion ' +
      'shield-of-heracles-grc work.',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${divisions.length} cards present and in order, from the incipit through the poem's final card. No truncation.`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };
  const about = buildAbout({
    workId: WORK_ID,
    title: 'Shield of Heracles',
    greekTitle: 'Ἀσπὶς Ἡρακλέους',
    language: 'en',
    translator: 'Hugh G. Evelyn-White',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin `canonical-greekLit` GitHub repository ' +
      '(CTS urn:cts:greekLit:tlg0020.tlg003.perseus-eng2), which digitises Hugh G. Evelyn-White\'s 1914 Loeb ' +
      'Classical Library prose translation of the Shield of Heracles; imported by scripts/import-hesiod-shield-of-heracles-en.',
    license: HESIOD_LICENSE_EN,
    introParagraphs: [
      'This is Hugh G. Evelyn-White\'s 1914 prose translation of the Shield of Heracles, an archaic epic narrating ' +
        'Heracles\' battle with Cycnus and centred on an extended description of his shield. The poem is ' +
        'traditionally, though doubtfully, attributed to Hesiod; it is transmitted with the rest of the Hesiodic ' +
        'corpus and is included here on that traditional footing.',
      'The translation is reproduced verbatim; nothing is modernised, abridged or silently corrected. Evelyn-' +
        'White\'s own explanatory footnotes are not part of the poem\'s text and are not reproduced here (see ' +
        '"Known gaps & anomalies").',
    ],
    editionParagraphs: editionParagraphs('Shield of Heracles', 'Ἀσπὶς Ἡρακλέους'),
    digitalSourceParagraph: digitalSourceParagraph('tlg0020.tlg003.perseus-eng2.xml', 'urn:cts:greekLit:tlg0020.tlg003.perseus-eng2'),
    howImportedParagraphs: [
      'The importer walks the single translation <div> as one continuous text stream and cuts it into 13 cards at ' +
        'each <milestone unit="card"> marker (there is no <p> structure to slice on - see "Known gaps & ' +
        'anomalies"). Evelyn-White\'s own footnotes (<note>) are dropped; <placeName> wrapping is unwrapped, ' +
        'keeping the word. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched.',
    ],
    referenceSchemeParagraphs: [
      'Citation here is by card, matching the companion shield-of-heracles-grc Greek work card for card. Each ' +
        'card\'s Division.ref gives the underlying Greek verse line range. Passage.n is "" throughout.',
    ],
    gapsParagraphs: [
      `${parsed.noteCount} translator's footnote(s) were dropped (not the poem's text). No <p> paragraph ` +
        'structure exists in the source, so each card is imported as a single continuous prose block.',
    ],
  });

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

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
