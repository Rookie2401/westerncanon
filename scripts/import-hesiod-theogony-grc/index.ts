/**
 * Hesiod, *Theogony* - Greek text, via the Perseus / OpenGreekAndLatin
 * `canonical-greekLit` TEI (tlg0020.tlg001.perseus-grc2.xml). Run-once
 * ingestion pipeline.
 *
 *   npx tsx scripts/import-hesiod-theogony-grc/index.ts
 *
 * Reads scripts/import-hesiod-theogony-grc/raw/tlg0020.tlg001.perseus-grc2.xml
 * (already in the repo; nothing is downloaded) and writes:
 *   data/theogony-grc/work.json       - the GenericWork (32 card divisions, one level deep)
 *   data/theogony-grc/about.json      - provenance / licence metadata
 *   data/theogony-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-hesiod-shared/validate.ts`.
 *
 * See scripts/import-hesiod-shared/xml.ts for the full source-shape and
 * card-boundary-derivation notes. The Theogony is the one Hesiodic poem
 * whose Greek witness carries its own native <milestone unit="card"> marks;
 * this importer cross-checks them against the shared boundary table (itself
 * sourced from the English file - see cardBoundaries.ts) and fails loudly on
 * any mismatch, which is what justifies reusing that same English-derived
 * table, unchecked, for Works and Days and the Shield of Heracles.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bucketGreekAtoms, bucketsFromBoundaries, fail, parseGreekBody } from '../import-hesiod-shared/xml.ts';
import { THEOGONY_CARD_BOUNDARIES, THEOGONY_FINAL_LINE } from '../import-hesiod-shared/cardBoundaries.ts';
import { buildAbout, digitalSourceParagraph, editionParagraphs, HESIOD_LICENSE_GRC } from '../import-hesiod-shared/aboutText.ts';
import type { Anomaly, Division, GenericWork, Passage } from '../import-hesiod-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0020.tlg001.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'theogony-grc');

const WORK_ID = 'theogony-grc';
const INCIPIT = 'Μουσάων Ἑλικωνιάδων ἀρχώμεθʼ ἀείδειν';
const EXPLICIT_TAIL = 'Μοῦσαι Ὀλυμπιάδες, κοῦραι Διὸς αἰγιόχοιο.';

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const parsed = parseGreekBody(xml, WORK_ID);

  // --- cross-check native Greek milestones against the shared boundary table (English-derived) ---
  const wantMilestones = THEOGONY_CARD_BOUNDARIES.map(String);
  if (JSON.stringify(parsed.nativeMilestones) !== JSON.stringify(wantMilestones)) {
    fail(
      WORK_ID,
      `native Greek <milestone unit="card"> list does not match the shared cardBoundaries table.\n` +
        `  got:  ${parsed.nativeMilestones.join(',')}\n  want: ${wantMilestones.join(',')}`,
    );
  }

  const buckets = bucketGreekAtoms(parsed.atoms, THEOGONY_CARD_BOUNDARIES, WORK_ID);
  const cards = bucketsFromBoundaries(THEOGONY_CARD_BOUNDARIES, THEOGONY_FINAL_LINE);
  if (buckets.length !== cards.length) fail(WORK_ID, `bucket/card count mismatch: ${buckets.length} vs ${cards.length}`);

  // --- spot checks ---
  const firstLineText = parsed.atoms.find((a) => a.kind === 'line')?.text ?? '';
  if (!firstLineText.normalize('NFC').startsWith(INCIPIT.normalize('NFC'))) {
    fail(WORK_ID, `incipit spot-check failed. expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(firstLineText.slice(0, 80))}`);
  }
  const lastLineText = [...parsed.atoms].reverse().find((a) => a.kind === 'line')?.text ?? '';
  if (!lastLineText.normalize('NFC').endsWith(EXPLICIT_TAIL.normalize('NFC'))) {
    fail(WORK_ID, `explicit spot-check failed. expected suffix: ${JSON.stringify(EXPLICIT_TAIL)}\n  got: ${JSON.stringify(lastLineText.slice(-80))}`);
  }

  // --- build divisions ---
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
  const gapAtoms = parsed.atoms.filter((a) => a.kind === 'gap');

  // --- anomalies ---
  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / card boundary derivation`,
    note:
      `This Greek file carries its own native <milestone unit="card"> markers (${parsed.nativeMilestones.length} ` +
      'of them). They were cross-checked at import time against the shared cardBoundaries table and match exactly, ' +
      'byte for byte. All three Hesiodic poems carry matching native card milestones in both their Greek and ' +
      'English TEI witness; see scripts/import-hesiod-shared/xml.ts for the full derivation notes.',
  });
  anomalies.push({
    where: `${WORK_ID} / <del> editorial bracketing`,
    note:
      `${delLines.length} line(s) contain ${parsed.delSpanCount} <del>...</del> span(s) in the source XML ` +
      `(editorial athetesis, e.g. n="${delLines.map((l) => l.n).slice(0, 6).join('", "')}"${delLines.length > 6 ? ', ...' : ''}` +
      `). Per this repo's "never content" rule these are KEPT verbatim in the reading text - only the <del>/</del> ` +
      'tags themselves are stripped. This deliberately departs from this repo\'s Euclid importer, which drops ' +
      '<del> content outright; that precedent does not apply here because the task instructions for this corpus ' +
      'are explicit that only XML transport scaffolding may be stripped, never content the source prints.',
  });
  anomalies.push({
    where: `${WORK_ID} / <add> editorial insertion`,
    note:
      `${addLines.length} line(s) (the lettered interpolation n="929a".."${addLines[addLines.length - 1]?.n}", the ` +
      'Hera/Hephaestus - Zeus/Metis/Athena-birth passage) are wrapped in <add>...</add> in the source XML ' +
      '(an editorially-supplied passage present in only part of the manuscript tradition). Kept verbatim in the ' +
      'reading text; only the <add>/</add> tags are stripped.',
  });
  if (gapAtoms.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / <gap> lacuna marker`,
      note:
        `${gapAtoms.length} <gap reason="ellipsis"/> marker(s) in the source XML (a lacuna between the lettered ` +
        `lines n="929f" and n="929g"), printed by the edition as "${gapAtoms[0]!.text}". Preserved verbatim as its ` +
        'own line in the reading text, at its original position, rather than silently dropped.',
    });
  }
  anomalies.push({
    where: `${WORK_ID} / lettered interpolation lines`,
    note:
      'Beyond the standard 1-1022 line numbering, the source carries 20 additional lettered lines (929a-929t) for ' +
      'the <add>-wrapped interpolated passage noted above. These are real content the source prints and are kept ' +
      'as their own reading-text lines within the card they fall in (901-938); Division.ref line ranges refer to ' +
      'the standard integer numbering only.',
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note:
      `All ${divisions.length} cards present and in order, spanning the standard line numbering 1-${THEOGONY_FINAL_LINE} ` +
      'plus the lettered interpolation. Incipit and explicit verified against the printed text.',
  });

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };
  const about = buildAbout({
    workId: WORK_ID,
    title: 'Theogony',
    greekTitle: 'Θεογονία',
    language: 'grc',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin `canonical-greekLit` GitHub repository ' +
      '(CTS urn:cts:greekLit:tlg0020.tlg001.perseus-grc2), which digitises the Greek text of Hesiod\'s Θεογονία ' +
      'as edited by Hugh G. Evelyn-White for the Loeb Classical Library (1914); imported by scripts/import-hesiod-theogony-grc.',
    license: HESIOD_LICENSE_GRC,
    introParagraphs: [
      'This is the Greek text of Hesiod\'s Θεογονία (Theogony), the archaic epic recounting the birth of the ' +
        'gods and the establishment of Zeus\'s rule over the cosmos.',
      'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently ' +
        'corrected. Where the source is irregular - editorially bracketed lines, an editorially-supplied passage, ' +
        'a lacuna marker - the irregularity is preserved and noted in anomalies.json.',
    ],
    editionParagraphs: editionParagraphs('Theogony', 'Θεογονία'),
    digitalSourceParagraph: digitalSourceParagraph('tlg0020.tlg001.perseus-grc2.xml', 'urn:cts:greekLit:tlg0020.tlg001.perseus-grc2'),
    howImportedParagraphs: [
      'The importer slices the single <div type="edition"> body into its <l n="N"> verse lines (Hesiod\'s poems ' +
        'have no Book-level division to slice first), then groups consecutive lines into "cards" using the same ' +
        '32 card boundaries carried by the source\'s own <milestone unit="card"> markers. XML transport scaffolding ' +
        'only is removed: the <milestone> markers themselves, and the <del>/<add> tags (their text content is kept ' +
        '- see "Known gaps & anomalies"). Entities are decoded and runs of whitespace collapsed; the words are ' +
        'otherwise untouched.',
    ],
    referenceSchemeParagraphs: [
      'Citation here is by card (a Loeb print-pagination unit, not a Book - this poem has none). Each card\'s ' +
        'Division.ref gives its own Greek line range (e.g. "1–28"). Passage.n is "" throughout: no sub-numbering ' +
        'below the card exists in the source.',
    ],
    gapsParagraphs: [
      `${delLines.length} line(s) editorially bracketed (<del>) and ${addLines.length} line(s) editorially supplied ` +
        `(<add>) are kept verbatim, tags stripped only. ${gapAtoms.length} lacuna marker (<gap>) is kept verbatim as ` +
        'its own line. See the individual anomaly entries above for exact locations and the reasoning for keeping ' +
        '(rather than excluding) this material.',
    ],
  });

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ---
  const totalPassages = divisions.reduce((n, d) => n + d.passages.length, 0);
  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  const totalLines = parsed.atoms.filter((a) => a.kind === 'line').length;
  process.stdout.write('\nDivisions:\n');
  for (const d of divisions) {
    process.stdout.write(`  sec-${d.number!.padEnd(3)} ${d.id.padEnd(8)} ref ${(d.ref ?? '-').padEnd(10)} ${d.passages[0]!.text.split('\n').length} line(s)\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} divisions (cards)  ${totalPassages} passages  ${totalLines} Greek lines  ${totalChars} chars  ` +
      `${delLines.length} <del>  ${addLines.length} <add>  ${gapAtoms.length} <gap>\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-hesiod-shared/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
