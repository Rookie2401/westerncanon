/**
 * Hesiod (attrib.), *Shield of Heracles* - Greek text, via the Perseus /
 * OpenGreekAndLatin `canonical-greekLit` TEI (tlg0020.tlg003.perseus-grc2.xml).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-hesiod-shield-of-heracles-grc/index.ts
 *
 * Reads scripts/import-hesiod-shield-of-heracles-grc/raw/tlg0020.tlg003.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/shield-of-heracles-grc/work.json       - the GenericWork (13 card divisions, one level deep)
 *   data/shield-of-heracles-grc/about.json      - provenance / licence metadata
 *   data/shield-of-heracles-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-hesiod-shared/validate.ts`.
 *
 * Like the Theogony and Works and Days, this Greek file carries its own
 * native <milestone unit="card"> markers (13 of them); this importer
 * cross-checks them against the shared cardBoundaries table and fails
 * loudly on any mismatch. See scripts/import-hesiod-shared/xml.ts for the
 * full source-shape notes.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bucketGreekAtoms, bucketsFromBoundaries, fail, parseGreekBody } from '../import-hesiod-shared/xml.ts';
import { SHIELD_CARD_BOUNDARIES, SHIELD_FINAL_LINE } from '../import-hesiod-shared/cardBoundaries.ts';
import { buildAbout, digitalSourceParagraph, editionParagraphs, HESIOD_LICENSE_GRC } from '../import-hesiod-shared/aboutText.ts';
import type { Anomaly, Division, GenericWork, Passage } from '../import-hesiod-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0020.tlg003.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'shield-of-heracles-grc');

const WORK_ID = 'shield-of-heracles-grc';
const INCIPIT = 'ἢ οἵη προλιποῦσα δόμους καὶ πατρίδα γαῖαν';
const EXPLICIT_TAIL = 'ὅστις ἄγοι Πυθοῖδε βίῃ σύλασκε δοκεύων.';

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const parsed = parseGreekBody(xml, WORK_ID);

  const wantMilestones = SHIELD_CARD_BOUNDARIES.map(String);
  if (JSON.stringify(parsed.nativeMilestones) !== JSON.stringify(wantMilestones)) {
    fail(
      WORK_ID,
      `native Greek <milestone unit="card"> list does not match the shared cardBoundaries table.\n` +
        `  got:  ${parsed.nativeMilestones.join(',')}\n  want: ${wantMilestones.join(',')}`,
    );
  }

  const buckets = bucketGreekAtoms(parsed.atoms, SHIELD_CARD_BOUNDARIES, WORK_ID);
  const cards = bucketsFromBoundaries(SHIELD_CARD_BOUNDARIES, SHIELD_FINAL_LINE);
  if (buckets.length !== cards.length) fail(WORK_ID, `bucket/card count mismatch: ${buckets.length} vs ${cards.length}`);

  const firstLineText = parsed.atoms.find((a) => a.kind === 'line')?.text ?? '';
  if (!firstLineText.normalize('NFC').startsWith(INCIPIT.normalize('NFC'))) {
    fail(WORK_ID, `incipit spot-check failed. expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(firstLineText.slice(0, 80))}`);
  }
  const lastLineText = [...parsed.atoms].reverse().find((a) => a.kind === 'line')?.text ?? '';
  if (!lastLineText.normalize('NFC').endsWith(EXPLICIT_TAIL.normalize('NFC'))) {
    fail(WORK_ID, `explicit spot-check failed. expected suffix: ${JSON.stringify(EXPLICIT_TAIL)}\n  got: ${JSON.stringify(lastLineText.slice(-80))}`);
  }

  const divisions: Division[] = cards.map((card, i) => {
    const atoms = buckets[i]!;
    const text = atoms.map((a) => a.text).join('\n');
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

  const delLines = parsed.atoms.filter((a) => a.delSpans > 0);
  const partialDelLines = parsed.atoms.filter((a) => a.delSpans > 1);

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / card boundary derivation`,
    note:
      `This Greek file carries its own native <milestone unit="card"> markers (${parsed.nativeMilestones.length} ` +
      'of them, attribute order "ed... n... unit..."). They were cross-checked at import time against the shared ' +
      'cardBoundaries table and match exactly, byte for byte.',
  });
  anomalies.push({
    where: `${WORK_ID} / <del> editorial bracketing`,
    note:
      `${delLines.length} line(s) contain ${parsed.delSpanCount} <del>...</del> span(s) in the source XML ` +
      `(editorial athetesis, n="${delLines.map((l) => l.n).join('", "')}"${partialDelLines.length > 0 ? ' - some lines carry more than one partial span mixed with plain text, same treatment as works-and-days-grc n="169a"-"169d"' : ''}` +
      `). Per this repo's "never content" rule these are KEPT verbatim in the reading text - only the <del>/</del> ` +
      'tags themselves are stripped. This file has no <add> or <gap> elements.',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${divisions.length} cards present and in order, spanning the full line numbering 1-${SHIELD_FINAL_LINE}. Incipit and explicit verified against the printed text.`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };
  const about = buildAbout({
    workId: WORK_ID,
    title: 'Shield of Heracles',
    greekTitle: 'Ἀσπὶς Ἡρακλέους',
    language: 'grc',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin `canonical-greekLit` GitHub repository ' +
      '(CTS urn:cts:greekLit:tlg0020.tlg003.perseus-grc2), which digitises the Greek text of the poem attributed ' +
      'to Hesiod, Ἀσπὶς Ἡρακλέους, as edited by Hugh G. Evelyn-White for the Loeb Classical Library (1914); ' +
      'imported by scripts/import-hesiod-shield-of-heracles-grc.',
    license: HESIOD_LICENSE_GRC,
    introParagraphs: [
      'This is the Greek text of the Ἀσπὶς Ἡρακλέους (Shield of Heracles), an archaic epic narrating Heracles\' ' +
        'battle with Cycnus and centred on an extended ekphrasis describing his shield. Ancient and modern ' +
        'scholarship alike has long doubted that Hesiod himself composed this poem (it is traditionally ' +
        '"attributed" to him, likely a later imitation drawing on the Theogony and the Homeric epics), but it is ' +
        'transmitted with the rest of the Hesiodic corpus and is included here on that traditional footing.',
      'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently ' +
        'corrected. Where the source is irregular - editorially bracketed lines - the irregularity is preserved ' +
        'and noted in anomalies.json.',
    ],
    editionParagraphs: editionParagraphs('Shield of Heracles', 'Ἀσπὶς Ἡρακλέους'),
    digitalSourceParagraph: digitalSourceParagraph('tlg0020.tlg003.perseus-grc2.xml', 'urn:cts:greekLit:tlg0020.tlg003.perseus-grc2'),
    howImportedParagraphs: [
      'The importer slices the single <div type="edition"> body into its <l n="N"> verse lines, then groups ' +
        'consecutive lines into 13 "cards" using the source\'s own <milestone unit="card"> markers. The ' +
        '<milestone> and <del> tags are stripped, the latter keeping its text content. Entities are decoded and ' +
        'runs of whitespace collapsed; the words are otherwise untouched.',
    ],
    referenceSchemeParagraphs: [
      'Citation here is by card (a Loeb print-pagination unit, not a Book - this poem has none). Each card\'s ' +
        'Division.ref gives its own Greek line range. Passage.n is "" throughout.',
    ],
    gapsParagraphs: [
      `${delLines.length} line(s) editorially bracketed (<del>) are kept verbatim, tags stripped only. See the ` +
        'individual anomaly entries above for exact locations and reasoning.',
    ],
  });

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  const totalLines = parsed.atoms.filter((a) => a.kind === 'line').length;
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(`  sec-${d.number!.padEnd(3)} ${d.id.padEnd(8)} ref ${(d.ref ?? '-').padEnd(10)} ${d.passages[0]!.text.split('\n').length} line(s)\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions (cards)  ${totalPassages} passages  ${totalLines} Greek lines  ${totalChars} chars  ${delLines.length} <del>\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-hesiod-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
