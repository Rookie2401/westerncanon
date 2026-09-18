/**
 * Hesiod, *Works and Days* - Greek text, via the Perseus / OpenGreekAndLatin
 * `canonical-greekLit` TEI (tlg0020.tlg002.perseus-grc2.xml). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-hesiod-works-and-days-grc/index.ts
 *
 * Reads scripts/import-hesiod-works-and-days-grc/raw/tlg0020.tlg002.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/works-and-days-grc/work.json       - the GenericWork (26 card divisions, one level deep)
 *   data/works-and-days-grc/about.json      - provenance / licence metadata
 *   data/works-and-days-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-hesiod-shared/validate.ts`.
 *
 * Like the Theogony, this Greek file carries its own native <milestone
 * unit="card"> markers (26 of them); this importer cross-checks them against
 * the shared cardBoundaries table and fails loudly on any mismatch. See
 * scripts/import-hesiod-shared/xml.ts for the full source-shape notes.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bucketGreekAtoms, bucketsFromBoundaries, fail, parseGreekBody } from '../import-hesiod-shared/xml.ts';
import { WORKS_AND_DAYS_CARD_BOUNDARIES, WORKS_AND_DAYS_FINAL_LINE } from '../import-hesiod-shared/cardBoundaries.ts';
import { buildAbout, digitalSourceParagraph, editionParagraphs, HESIOD_LICENSE_GRC } from '../import-hesiod-shared/aboutText.ts';
import type { Anomaly, Division, GenericWork, Passage } from '../import-hesiod-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0020.tlg002.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'works-and-days-grc');

const WORK_ID = 'works-and-days-grc';
const INCIPIT = 'μοῦσαι Πιερίηθεν ἀοιδῇσιν κλείουσαι';
const EXPLICIT_TAIL = 'ὄρνιθας κρίνων καὶ ὑπερβασίας ἀλεείνων.';

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const parsed = parseGreekBody(xml, WORK_ID);

  const wantMilestones = WORKS_AND_DAYS_CARD_BOUNDARIES.map(String);
  if (JSON.stringify(parsed.nativeMilestones) !== JSON.stringify(wantMilestones)) {
    fail(
      WORK_ID,
      `native Greek <milestone unit="card"> list does not match the shared cardBoundaries table.\n` +
        `  got:  ${parsed.nativeMilestones.join(',')}\n  want: ${wantMilestones.join(',')}`,
    );
  }

  const buckets = bucketGreekAtoms(parsed.atoms, WORKS_AND_DAYS_CARD_BOUNDARIES, WORK_ID);
  const cards = bucketsFromBoundaries(WORKS_AND_DAYS_CARD_BOUNDARIES, WORKS_AND_DAYS_FINAL_LINE);
  if (buckets.length !== cards.length) fail(WORK_ID, `bucket/card count mismatch: ${buckets.length} vs ${cards.length}`);

  const firstLineText = parsed.atoms.find((a) => a.kind === 'line')?.text ?? '';
  if (!firstLineText.normalize('NFC').startsWith(INCIPIT.normalize('NFC'))) {
    fail(WORK_ID, `incipit spot-check failed. expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(firstLineText.slice(0, 80))}`);
  }
  const lastLineText = [...parsed.atoms].reverse().find((a) => a.kind === 'line')?.text ?? '';
  if (!lastLineText.normalize('NFC').endsWith(EXPLICIT_TAIL.normalize('NFC'))) {
    fail(WORK_ID, `explicit spot-check failed. expected suffix: ${JSON.stringify(EXPLICIT_TAIL)}\n  got: ${JSON.stringify(lastLineText.slice(-160))}`);
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
  const addLines = parsed.atoms.filter((a) => a.addSpans > 0);
  const partialDelLines = parsed.atoms.filter((a) => a.delSpans > 1);
  const fullDelLines = parsed.atoms.filter((a) => a.delSpans === 1);

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / card boundary derivation`,
    note:
      'This Greek file carries its own native <milestone unit="card"> markers (26 of them, attribute order ' +
      '"n... ed... unit..." - different from the Theogony\'s "ed... unit... n..." - so parsing matches unit="card" ' +
      'via lookahead rather than assuming attribute order). They were cross-checked at import time against the ' +
      'shared cardBoundaries table and match exactly. The Greek text was bucketed into cards by each line\'s ' +
      "integer line-number prefix against this boundary list.",
  });
  anomalies.push({
    where: `${WORK_ID} / <del> editorial bracketing`,
    note:
      `${fullDelLines.length} line(s) are wholly wrapped in a single <del>...</del> span (editorial athetesis, ` +
      `n="${fullDelLines.map((l) => l.n).join('", "')}"). Per this repo's "never content" rule these are KEPT ` +
      'verbatim in the reading text - only the <del>/</del> tags themselves are stripped (see the parallel note ' +
      'in theogony-grc for why this departs from the Euclid importer\'s precedent of dropping <del> content).',
  });
  anomalies.push({
    where: `${WORK_ID} / partial in-line <del> bracketing (lettered lines)`,
    note:
      `The 4 lettered lines n="${partialDelLines.map((l) => l.n).join('", "')}" (a "silver race" doublet beyond ` +
      'the standard 1-828 numbering, present in only part of the manuscript tradition) each carry TWO separate ' +
      '<del> spans with un-bracketed plain text between them (e.g. n="169a": "<del>τοῦ γὰρ δεσμὸν</del> ἔλυσε πα' +
      '<del>τὴρ ἀνδρῶν τε θεῶν τε.</del>" - NOT wrapped in <add> as originally guessed before the raw XML was ' +
      'inspected closely). All text is kept verbatim (both the bracketed and the un-bracketed portions); only the ' +
      '<del>/</del> tags are stripped, same treatment as the whole-line <del> spans above. This file has no <add> ' +
      'elements at all.',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${divisions.length} cards present and in order, spanning the standard line numbering 1-${WORKS_AND_DAYS_FINAL_LINE} plus the lettered doublet. Incipit and explicit verified against the printed text.`,
  });

  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };
  const about = buildAbout({
    workId: WORK_ID,
    title: 'Works and Days',
    greekTitle: 'Ἔργα καὶ Ἡμέραι',
    language: 'grc',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin `canonical-greekLit` GitHub repository ' +
      '(CTS urn:cts:greekLit:tlg0020.tlg002.perseus-grc2), which digitises the Greek text of Hesiod\'s Ἔργα καὶ ' +
      'Ἡμέραι as edited by Hugh G. Evelyn-White for the Loeb Classical Library (1914); imported by scripts/import-hesiod-works-and-days-grc.',
    license: HESIOD_LICENSE_GRC,
    introParagraphs: [
      'This is the Greek text of Hesiod\'s Ἔργα καὶ Ἡμέραι (Works and Days), a didactic poem of farming ' +
        'wisdom, ethical exhortation and the myths of Prometheus, Pandora and the Ages of Man.',
      'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently ' +
        'corrected. Where the source is irregular - editorially bracketed lines, a lettered doublet with partial ' +
        'in-line bracketing - the irregularity is preserved and noted in anomalies.json.',
    ],
    editionParagraphs: editionParagraphs('Works and Days', 'Ἔργα καὶ Ἡμέραι'),
    digitalSourceParagraph: digitalSourceParagraph('tlg0020.tlg002.perseus-grc2.xml', 'urn:cts:greekLit:tlg0020.tlg002.perseus-grc2'),
    howImportedParagraphs: [
      'The importer slices the single <div type="edition"> body into its <l n="N"> verse lines, then groups ' +
        'consecutive lines into 26 "cards" using the source\'s own <milestone unit="card"> markers. The ' +
        '<milestone> markers and every <del>/<add> tag are stripped (including the partial, non-whole-line <del> ' +
        'spans on the lettered doublet - see "Known gaps & anomalies"), keeping their text content. Entities are ' +
        'decoded and runs of whitespace collapsed; the words are otherwise untouched.',
    ],
    referenceSchemeParagraphs: [
      'Citation here is by card (a Loeb print-pagination unit, not a Book - this poem has none). Each card\'s ' +
        'Division.ref gives its own Greek line range (e.g. "1–10"). Passage.n is "" throughout.',
    ],
    gapsParagraphs: [
      `${fullDelLines.length} line(s) wholly bracketed (<del>) and ${partialDelLines.length} lettered line(s) with ` +
        'partial in-line <del> bracketing are kept verbatim, tags stripped only; this file has no <add> elements. ' +
        'See the individual anomaly entries above for exact locations and reasoning.',
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
    `\n  ${divisions.length} divisions (cards)  ${totalPassages} passages  ${totalLines} Greek lines  ${totalChars} chars  ` +
      `${delLines.length} <del>  ${addLines.length} <add>\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-hesiod-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
