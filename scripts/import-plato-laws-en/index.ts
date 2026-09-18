/**
 * Plato, *Laws* - English translation by R. G. Bury (Loeb Classical
 * Library vols. 187 & 192, Cambridge, MA: Harvard University Press, 1926),
 * digitized/marked-up by Perseus Digital Library / Open Greek and Latin
 * (canonical-greekLit CTS urn:cts:greekLit:tlg0059.tlg034.perseus-eng2).
 * Run-once ingestion pipeline:
 *
 *   npx tsx scripts/import-plato-laws-en/index.ts
 *
 * Reads scripts/import-plato-laws-en/raw/tlg0059.tlg034.perseus-eng2.xml
 * (fetched once from PerseusDL/canonical-greekLit on GitHub and committed
 * here - nothing is downloaded at import time) and writes:
 *   data/plato-laws-en/work.json       - the GenericWork (12 Books, each a
 *                                        flat list of Stephanus-page
 *                                        Section divisions - verified to
 *                                        match plato-laws-grc's Book/
 *                                        Section sequence exactly, div for
 *                                        div, before writing this importer)
 *   data/plato-laws-en/about.json      - provenance / licence / prose
 *   data/plato-laws-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-plato-c-shared/validate.ts`.
 *
 * Parsing (the TEI div/p/said/label/milestone/del/add/supplied/sic/gap/note
 * tokenizer) is shared with Republic-grc and Laws-grc - see
 * scripts/import-plato-c-shared/teiTwoLevel.ts's doc-comment for the full
 * apparatus-handling rules. Bury's translation carries genuine translator
 * footnotes (<note resp="Loeb">, 549 of them) which this shared parser
 * excludes wholesale as apparatus, not Bury's rendering of Plato's Greek -
 * see the corpus-level anomaly it logs.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTeiTwoLevel } from '../import-plato-c-shared/teiTwoLevel.ts';
import type { GenericWork, WorkAbout } from '../import-plato-c-shared/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0059.tlg034.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'plato-laws-en');

const WORK_ID = 'plato-laws-en';

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

/**
 * Two <said> turns in this source (confirmed by direct inspection) carry
 * who="#Ἀθηναῖος" with label "ΑΘ." (Greek) rather than the English
 * who="#Athenian" / label "Ath." used everywhere else in this translation -
 * a genuine, minor inconsistency in the Perseus transcription, not
 * something this importer corrects (the label text is kept exactly as
 * printed either way, since <label> content is always preserved verbatim).
 * Logged here individually rather than guessed at or silently normalised.
 */
function logGreekWhoQuirk(xml: string, anomalies: { where: string; note: string }[]): void {
  const re = /who="#Ἀθηναῖος"/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    count += 1;
    const context = xml.slice(m.index, m.index + 160).replace(/\s+/g, ' ');
    anomalies.push({
      where: `${WORK_ID} / <said> who attribute`,
      note: `<said who="#Ἀθηναῖος"> (Greek, with label "ΑΘ.") appears here instead of this translation's usual who="#Athenian"/"Ath." - a source-side transcription inconsistency, not corrected. Context: "${context}"`,
    });
  }
  if (count !== 2) {
    anomalies.push({
      where: `${WORK_ID} / <said> who attribute`,
      note: `Expected exactly 2 occurrences of who="#Ἀθηναῖος" (verified before writing this importer); found ${count}. Re-check if the source changed.`,
    });
  }
}

/**
 * Seven words in Book 5 (Stephanus 740-744, the "5,040 households" passage)
 * carry a capital "I" where a lowercase "l" belongs - e.g. "househoIds",
 * "illiberaI", "equivaIent" - a classic OCR-style scanno, confirmed present
 * verbatim in the raw Perseus transcription itself (not introduced by this
 * importer). Per the faithfulness rule, this is NOT corrected - it is kept
 * exactly as transcribed and logged here individually so it reads as a
 * disclosed source defect rather than an importer bug.
 */
function logScannoArtifacts(xml: string, anomalies: { where: string; note: string }[]): void {
  const text = xml.replace(/<[^>]*>/g, ' ');
  const sectionRe = /<div type="textpart" subtype="section"[^>]*\bn="([^"]*)"/g;
  const sectionStarts: Array<[number, string]> = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionRe.exec(xml))) sectionStarts.push([sm.index, sm[1]!]);
  const sectionAt = (idx: number): string => {
    let best = '?';
    for (const [pos, n] of sectionStarts) {
      if (pos <= idx) best = n;
      else break;
    }
    return best;
  };
  const re = /\b[a-z]+I[a-z]*\b/g;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(text))) {
    count += 1;
    const sectionN = sectionAt(m.index);
    const context = text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ').trim();
    anomalies.push({
      where: `${WORK_ID} / Stephanus ${sectionN}`,
      note: `Scanno in the source transcription: "${m[0]}" (capital "I" for lowercase "l"), kept verbatim, not corrected. Context: "...${context}..."`,
    });
  }
  if (count !== 7) {
    anomalies.push({
      where: `${WORK_ID} / scanno check`,
      note: `Expected exactly 7 "I"-for-"l" scanno occurrences (verified before writing this importer, all within Book 5's 5,040-households passage); found ${count}. Re-check if the source changed.`,
    });
  }
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const { divisions, anomalies, stats } = parseTeiTwoLevel(xml, {
    sourceLabel: WORK_ID,
    expectedBookCount: 12,
    expectedSectionCount: 327,
  });

  logGreekWhoQuirk(xml, anomalies);
  logScannoArtifacts(xml, anomalies);

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Laws',
    author: 'Plato',
    language: 'en',
    translator: 'R. G. Bury',
    edition: 'Loeb Classical Library 187 & 192 (1926)',
    provenance:
      'Text: Perseus Digital Library / Open Greek and Latin, canonical-greekLit corpus ' +
      '(github.com/PerseusDL/canonical-greekLit), urn:cts:greekLit:tlg0059.tlg034.perseus-eng2, fetched directly and ' +
      'committed to this repository at scripts/import-plato-laws-en/raw/. Translation by R. G. Bury, first published ' +
      'in the Loeb Classical Library (Harvard University Press / William Heinemann) in 1926. Structural markup ' +
      "(Book/Stephanus-page divisions, speaker turns) is the Perseus Project's own TEI-XML encoding of Bury's " +
      'translation.',
    license:
      'Perseus/OGL canonical-greekLit texts are released under a Creative Commons Attribution-ShareAlike 4.0 ' +
      "International licence (CC BY-SA 4.0). Bury's 1926 translation is in the public domain in the United States: " +
      'works published in 1926 entered the US public domain on January 1, 2022 under the 95-years-from-publication ' +
      'rule (17 U.S.C. §304), for any work published before 1978 whose copyright was not renewed or that has simply ' +
      'run its full term - 1926 publications are unambiguously expired regardless of renewal, unlike works first ' +
      'published in 1930 or later that are still working through the same rule year by year.',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          "This is R. G. Bury's English translation of Plato's Laws, first published in the Loeb Classical Library " +
            'in 1926 (vols. 187 and 192) and now in the US public domain, as digitized and structurally marked up by ' +
            'the Perseus Digital Library / Open Greek and Latin project.',
          'Navigation is by Book (12 total) and Stephanus page, matching the accompanying Greek text ' +
            '(data/plato-laws-grc) page for page - verified div-for-div against it before this importer was written.',
          'Bury\'s own footnotes (mostly cross-references to other passages and brief textual/historical notes) are ' +
            'not included in the reading text; they are translator apparatus, not his translation of Plato\'s Greek. ' +
            'See anomalies.json for a summary.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  process.stdout.write(
    `\n  ${stats.bookCount} books  ${stats.sectionCount} sections  ${stats.paragraphCount} paragraphs  ` +
      `del=${stats.delSpans} add=${stats.addSpans} supplied=${stats.suppliedSpans} sic=${stats.sicSpans} gap=${stats.gapMarkers} note=${stats.noteSpans} bibl=${stats.biblSpans}\n`,
  );
  process.stdout.write('Done. Run `npx tsx scripts/import-plato-c-shared/validate.ts` next.\n');
}

main();
