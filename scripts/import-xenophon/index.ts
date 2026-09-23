/**
 * Xenophon - all 14 surviving works, Greek text + Loeb English translation
 * (28 data files). Run-once, idempotent ingestion pipeline.
 *
 *   npm run import:xenophon        (tsx scripts/import-xenophon/index.ts)
 *
 * Downloads (once - cached thereafter) each work's Greek and English TEI XML
 *   scripts/import-xenophon/raw/tlg0032.tlgNNN.perseus-{grc,eng}2.xml
 * from the Perseus/OpenGreekAndLatin canonical-greekLit GitHub repository
 * and writes, per work x language (28 directories):
 *   data/xenophon-<slug>-{grc,en}/work.json       - the GenericWork
 *   data/xenophon-<slug>-{grc,en}/about.json      - provenance / licence / prose
 *   data/xenophon-<slug>-{grc,en}/anomalies.json  - machine-readable {where, note}[]
 *   data/xenophon-<slug>-{grc,en}/types.ts        - generated types (see typesTemplate.ts)
 *
 * Then run `npm run validate:xenophon`.
 *
 * On any structural mismatch against workTable.ts's expectations, or any
 * genuinely irregular/unbalanced markup, this STOPS (throws XenophonStopError,
 * caught here, non-zero exit) naming the work/language and what disagreed -
 * it never force-fits or silently renumbers. See parse.ts's module doc for
 * the full corpus-wide markup census this parser was built from, and
 * workTable.ts's module doc for the structural verification behind the
 * 'books' / 'flat-chapters' / 'flat-sections' classification.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  XENOPHON_WORKS,
  grcFileName,
  engFileName,
  grcSourceUrl,
  engSourceUrl,
  workId as workIdOf,
} from '../import-xenophon-shared/workTable.ts';
import type { XenophonWorkEntry } from '../import-xenophon-shared/workTable.ts';
import { parseXenophonXml, XenophonStopError } from '../import-xenophon-shared/parse.ts';
import type { Anomaly } from '../import-xenophon-shared/parse.ts';
import { buildAboutSections } from '../import-xenophon-shared/aboutText.ts';
import { xenophonTypesFile } from '../import-xenophon-shared/typesTemplate.ts';
import type { Division, GenericWork, WorkAbout } from '../import-xenophon-shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

async function ensureRawXml(fileName: string, url: string): Promise<void> {
  const path = join(RAW_DIR, fileName);
  if (existsSync(path)) return;
  mkdirSync(RAW_DIR, { recursive: true });
  process.stdout.write(`  raw XML not found, downloading ${fileName} ...\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed for ${fileName}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  process.stdout.write(`    saved ${buf.length} bytes\n`);
}

function writeJson(dir: string, name: string, data: unknown): void {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`    wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

function countDivisions(divs: Division[]): number {
  let n = 0;
  for (const d of divs) {
    n += 1;
    n += countDivisions(d.children);
  }
  return n;
}

async function importOne(entry: XenophonWorkEntry, lang: 'grc' | 'en'): Promise<void> {
  const id = workIdOf(entry, lang);
  const fileName = lang === 'grc' ? grcFileName(entry) : engFileName(entry);
  const url = lang === 'grc' ? grcSourceUrl(entry) : engSourceUrl(entry);
  await ensureRawXml(fileName, url);

  const rawPath = join(RAW_DIR, fileName);
  process.stdout.write(`[${entry.tlg}] ${id} <- ${fileName}\n`);
  const xml = readFileSync(rawPath, 'utf8');

  const { divisions, anomalies, stats } = parseXenophonXml(xml, entry, lang);

  // --- Cyropaedia (tlg007), English only: the single corpus-wide
  // <delSpan>/<anchor> pair. It spans from just before Book 8 Chapter 8 to
  // essentially the very end of the document body (verified directly: the
  // anchor sits 15,111 characters after the delSpan, within ~40 characters
  // of the body's closing tags) - i.e. Miller's Loeb edition marks the
  // entirety of Book 8 Chapter 8 as suspected spurious (a well-known
  // classical-scholarship question: the chapter's uncharacteristically harsh
  // verdict on Persian moral decline is widely considered a later,
  // un-Xenophontic addition). Marchant's Greek edition carries NO such
  // marking at all - it prints Chapter 8 as ordinary running text. Per this
  // app's policy of never silently omitting textually-present content, and
  // to preserve structural symmetry between the two editions (both keep 41
  // chapters across 8 books), delSpan/anchor are treated as zero-width
  // markers (see parse.ts) - Chapter 8 is kept UNBRACKETED (delSpan/anchor
  // is a distant span-pointer, not a wrapping tag, so it never goes through
  // <del>'s bracket-insertion machinery either) - and disclosed here
  // explicitly. This is a deliberate editorial judgment call, not a parser
  // default, which is why it is handled here rather than mechanically.
  if (entry.tlg === 'tlg007' && stats.delSpanCount > 0) {
    anomalies.unshift({
      where: `${id} / Book 8, Chapter 8`,
      note:
        'This English witness carries a <delSpan spanTo="#a"/> ... <anchor xml:id="a"/> pair spanning from just ' +
        'before Book 8 Chapter 8 to the very end of the document (verified by direct offset inspection) - Miller\'s ' +
        'Loeb edition marking essentially the whole of Book 8 Chapter 8 as suspected spurious (not by Xenophon; a ' +
        'well-known classical-scholarship question - the chapter\'s harsh critique of Persian moral decline is ' +
        'widely regarded as a later addition). Marchant\'s Greek edition carries no such marking and prints Chapter ' +
        '8 as ordinary text. This app KEEPS Chapter 8 in both editions\' reading text, unbracketed (delSpan/anchor ' +
        'is a distant span-pointer, not a wrapping tag like <del>, so it is not run through the bracket-insertion ' +
        'policy either): omitting an entire final chapter from only one of the two parallel editions would both ' +
        'discard content still present in the source and break the two editions\' structural symmetry (41 chapters ' +
        'across 8 books in both). Readers should be aware of this well-documented authenticity question when ' +
        'reading Book 8, Chapter 8.',
    });
  }

  const reorderNote =
    stats.reorderedSiblingGroups > 0
      ? `${stats.reorderedSiblingGroups} sibling group(s) in this witness were reordered from the source XML's raw document order into citation-number order (a source-transcription quirk, not a manuscript issue) - see the individual anomaly entries above for exactly which chapter/section group(s); the running text was independently confirmed to read coherently in citation-number order across that boundary.`
      : null;

  const aboutSections = buildAboutSections({ entry, lang, stats, reorderNote });

  const isGrc = lang === 'grc';
  const about: WorkAbout = {
    workId: id,
    title: isGrc ? entry.grcTitle : entry.commonTitleEn,
    author: 'Xenophon',
    language: lang,
    edition: isGrc
      ? `Marchant, Xenophontis Opera Omnia, vol. ${entry.marchantVolume} (Oxford: Clarendon Press, ${entry.marchantYear})`
      : `Xenophon in Seven Volumes, vol. ${entry.translatorLoebVol} (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., ${entry.translatorYears})`,
    editor: isGrc ? 'E. C. Marchant' : undefined,
    translator: isGrc ? undefined : entry.translator,
    provenance:
      `TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS ` +
      `urn:cts:greekLit:tlg0032.${entry.tlg}.perseus-${isGrc ? 'grc' : 'eng'}2), digitising ` +
      (isGrc
        ? `E. C. Marchant's Oxford Classical Text edition (vol. ${entry.marchantVolume}, ${entry.marchantYear})`
        : `${entry.translator}'s Loeb Classical Library translation (vol. ${entry.translatorLoebVol}, ${entry.translatorYears})`) +
      `; imported by scripts/import-xenophon. The raw file is fetched once (cached at scripts/import-xenophon/raw/) ` +
      `and bundled with the app; nothing is loaded from the network at runtime.`,
    license:
      (isGrc
        ? `Marchant's ${entry.marchantYear} critical text is in the public domain.`
        : `${entry.translator}'s ${entry.translatorYears} translation is in the public domain (pre-1931 publication).`) +
      ' The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: aboutSections,
  };

  if (entry.tlg === 'tlg007') {
    about.sections!.push({
      heading: 'A note on Book 8, Chapter 8',
      paragraphs: [
        'Chapter 8 of Book 8 - the very last chapter of the Cyropaedia - is, in the English witness bundled here, ' +
          'marked by its Loeb editor/translator (Walter Miller) as suspected spurious in its entirety, via a TEI ' +
          '<delSpan>/<anchor> pair spanning from just before the chapter to the end of the document. This reflects ' +
          'a genuine, long-standing classical-scholarship question (the chapter\'s pessimistic verdict on Persian ' +
          'moral decline is widely thought inconsistent with, and later than, the rest of the work) - it is not a ' +
          'transcription error. The Greek edition bundled here (Marchant\'s) carries no such marking and prints the ' +
          'chapter as ordinary text. Both editions here KEEP Chapter 8 in the reading text; see anomalies.json for ' +
          'the full technical disclosure.',
      ],
    });
  }

  const work: GenericWork = { workId: id, language: lang, divisions };
  const outDir = join(DATA_ROOT, id);
  mkdirSync(outDir, { recursive: true });
  writeJson(outDir, 'work.json', work);
  writeJson(outDir, 'about.json', about);
  writeJson(outDir, 'anomalies.json', anomalies);
  writeFileSync(join(outDir, 'types.ts'), xenophonTypesFile(lang), 'utf8');
  process.stdout.write(`    wrote types.ts\n`);

  const divisionCount = countDivisions(divisions);
  process.stdout.write(
    `    ${divisionCount} division(s)  ${stats.totalPassages} passage(s)  ${stats.totalChars} chars  ` +
      `add=${stats.addCount} del=${stats.delCount} sic=${stats.sicCount}(${stats.sicSuppressedCount} suppressed) ` +
      `corr=${stats.corrCount} choice=${stats.choiceCount} gap=${stats.gapCount} note=${stats.noteCount} bibl=${stats.biblCount} ` +
      `reorders=${stats.reorderedSiblingGroups}\n\n`,
  );
}

async function main(): Promise<void> {
  process.stdout.write(`Xenophon importer - ${XENOPHON_WORKS.length} works x 2 languages = ${XENOPHON_WORKS.length * 2} outputs\n\n`);

  for (const entry of XENOPHON_WORKS) {
    for (const lang of ['grc', 'en'] as const) {
      try {
        await importOne(entry, lang);
      } catch (err) {
        if (err instanceof XenophonStopError) {
          process.stderr.write(`\nSTOP (${entry.slug}-${lang}): ${err.message}\n\n`);
          process.exit(1);
        }
        throw err;
      }
    }
  }

  process.stdout.write(`Done, all ${XENOPHON_WORKS.length * 2} outputs imported. Run \`npm run validate:xenophon\` next.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { main, importOne };
// unused-import guard (kept for symmetry with sibling importers that
// re-export Anomaly for validate.ts convenience)
export type { Anomaly };
