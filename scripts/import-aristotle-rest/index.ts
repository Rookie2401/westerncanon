/**
 * The rest of the Aristotelian corpus, Greek text only - run-once ingestion
 * pipeline covering the ~39 works in scripts/import-aristotle-rest-shared/
 * workTable.ts (see that file's module doc for the full list and the
 * corpus-wide bibliographic notes, including why De Mundo is skipped).
 *
 *   npx tsx scripts/import-aristotle-rest/index.ts
 *   (or: npm run import:aristotle-rest-grc, once wired into package.json
 *   from scripts/npm-scripts-aristotle-rest-grc.json)
 *
 * Reads scripts/import-aristotle-rest/raw/tlg0086.tlgNNN.<witness>.xml
 * (already fetched once and committed; nothing is downloaded here) for each
 * work and writes, per work:
 *   data/<workId>/work.json       - the GenericWork
 *   data/<workId>/about.json      - provenance / licence metadata + About prose
 *   data/<workId>/anomalies.json  - machine-readable {where, note}[]
 *   data/<workId>/types.ts        - byte-identical generated types file
 *
 * Then run `npx tsx scripts/import-aristotle-rest-shared/validate.ts` (or
 * `npm run validate:aristotle-rest-grc`).
 *
 * Idempotent: re-running overwrites the same 4 files per work with identical
 * content (no state carried between runs, no network access).
 *
 * On any structural mismatch against workTable.ts's expected book/chapter
 * counts, or any tag teiWalker.ts doesn't already know how to handle, this
 * STOPS (throws, caught here, non-zero exit) naming the work and what
 * disagreed - it never force-fits or silently renumbers. Touches nothing
 * outside scripts/import-aristotle-rest(-shared)/ and each work's own
 * data/<workId>/ directory.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkEdition } from '../import-aristotle-rest-shared/teiWalker.ts';
import type { WalkDiv, WalkLog } from '../import-aristotle-rest-shared/teiWalker.ts';
import {
  findAllBySubtype,
  mapBookChapter,
  mapBookPage,
  mapFlatChapters,
  mapFlatParagraphsAsChapters,
  mapProblemSection,
} from '../import-aristotle-rest-shared/shapes.ts';
import { DIAGRAMS_ARISTOTLE } from '../import-aristotle-rest-shared/diagrams/aristotle.ts';
import type { FoldResult } from '../import-aristotle-rest-shared/shapes.ts';
import { WORKS, SKIPPED_WORKS } from '../import-aristotle-rest-shared/workTable.ts';
import type { WorkEntry } from '../import-aristotle-rest-shared/workTable.ts';
import { buildAboutSections } from '../import-aristotle-rest-shared/aboutText.ts';
import type { AboutStats } from '../import-aristotle-rest-shared/aboutText.ts';
import { ARISTOTLE_REST_TYPES_FILE } from '../import-aristotle-rest-shared/typesTemplate.ts';
import { cleanBekkerMark, hasCombining } from '../import-aristotle-rest-shared/text.ts';
import type { Anomaly, Division, GenericWork, WorkAbout } from '../import-aristotle-rest-shared/genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

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

function logsToAnomalies(workId: string, logs: WalkLog[]): Anomaly[] {
  const KIND_LABEL: Record<WalkLog['kind'], string> = {
    'del-bracketed': '<del> editor-bracketed text KEPT in the reading text (in square brackets)',
    'del-already-bracketed': '<del> text KEPT in the reading text verbatim, WITHOUT adding another bracket pair (its own printed text already contains "[" or "]")',
    add: '<add> editorial insertion kept verbatim in the reading text',
    'note-discarded': 'non-citation <note> discarded entirely (tag and content)',
    'note-kept-verbatim': 'a bare (non-marginal) <note> kept inline verbatim rather than discarded - see workTable.ts#keepBareNotes / about.json for why this work is an exception',
    bibl: '<bibl> editorial citation excluded from the reading text (not Aristotle\'s own words)',
    'gap-lost': '<gap> (lacuna/editorial omission) excluded - contributes no text',
    'gap-ellipsis': '<gap reason="ellipsis"> kept as its literal printed text',
    'sic-kept': 'bare <sic> (no enclosing <choice>) kept verbatim - the edition\'s own printed reading, logged as a crux',
    'choice-sic-logged': '<choice><sic> variant NOT kept (its sibling <corr> is the reading text) - logged for disclosure',
  };
  return logs.map((l) => ({
    where: `${workId} / ${l.where}`,
    note: `${KIND_LABEL[l.kind]}: "${l.excerpt}"`,
  }));
}

function process1(entry: WorkEntry): void {
  process.stdout.write(`[${entry.tlg}] ${entry.workId} <- ${entry.file} (${entry.witness})\n`);
  const rawPath = join(RAW_DIR, entry.file);
  const xml = readFileSync(rawPath, 'utf8');

  const { root, logs } = walkEdition(xml, entry.workId, { keepBareNotes: entry.keepBareNotes });
  const anomalies: Anomaly[] = logsToAnomalies(entry.workId, logs);

  // A <head> that sits directly at the edition root, before any chapter/book
  // div opens (a title-page-style running heading - e.g. De Ventis'
  // "ΕΚ ΤΩΝ ΑΡΙΣΤΟΤΕΛΟΥΣ ΠΕΡΙ ΣΗΜΕΙΩΝ"), is captured on `root.head` but
  // root is never itself one of the output Divisions, so nothing in
  // work.json ever carries it as a sourceHeading. Logged explicitly here
  // (matching the phrasing validate.ts's coverage-accounting regex expects)
  // so it's accounted for rather than silently unexplained.
  if (root.head) {
    anomalies.push({
      where: `${entry.workId} / edition root`,
      note: `non-citation <head> discarded entirely (tag and content) - a title-page-style running heading at the edition root, before any chapter/book division, so it is not any Division's own sourceHeading: "${root.head}"`,
    });
  }

  let fold: FoldResult;
  let markSourceDiv: WalkDiv = root;

  const shape = entry.shape;
  switch (shape.kind) {
    case 'flat-chapter':
      fold = mapFlatChapters(root, shape.chapterSubtype, entry.workId, anomalies);
      break;
    case 'flat-paragraph':
      fold = mapFlatParagraphsAsChapters(root, shape.wrapperSubtype, entry.workId, anomalies);
      break;
    case 'book-chapter':
      fold = mapBookChapter(root, shape.bookSubtype, shape.chapterSubtype, entry.workId, anomalies);
      break;
    case 'book-chapter-filtered': {
      const candidates = findAllBySubtype(root, shape.filterSubtype).filter((d) => d.n === shape.filterN);
      if (candidates.length !== 1) {
        throw new Error(`${entry.workId}: expected exactly 1 "${shape.filterSubtype}" div with n="${shape.filterN}", found ${candidates.length}`);
      }
      markSourceDiv = candidates[0]!;
      fold = mapBookChapter(markSourceDiv, shape.bookSubtype, shape.chapterSubtype, entry.workId, anomalies);
      break;
    }
    case 'book-page':
      fold = mapBookPage(root, shape.bookSubtype, shape.pageSubtype, entry.workId, anomalies);
      break;
    case 'problem-section':
      fold = mapProblemSection(root, shape.problemSubtype, shape.sectionSubtype, entry.workId, anomalies);
      break;
  }

  const divisions = fold.divisions;
  const bookCount = entry.expectedBooks === null ? null : divisions.length;

  // --- hard structural gates (re-derived, not assumed - see workTable.ts) ---
  if (entry.expectedBooks !== null && divisions.length !== entry.expectedBooks) {
    throw new Error(`${entry.workId}: expected exactly ${entry.expectedBooks} book(s), got ${divisions.length}`);
  }
  if (fold.totalChapters !== entry.expectedChapters) {
    throw new Error(`${entry.workId}: expected exactly ${entry.expectedChapters} chapter(s) total, got ${fold.totalChapters}`);
  }

  // --- real printed diagrams (Mechanica only so far; see diagrams/aristotle.ts) ---
  // The source TEI carries no <figure> marker for these, so each image is
  // attached to the passage the research report matched it to by its
  // point-letters; the division id must be unique (hard-checked) and the PNG
  // must already exist under data/<workId>/images/.
  const diagramsAttached: Array<{ divisionId: string; source: string }> = [];
  for (const dg of DIAGRAMS_ARISTOTLE[entry.workId] ?? []) {
    const matches: Division[] = [];
    const findDiv = (ds: Division[]) => {
      for (const d of ds) {
        if (d.id === dg.divisionId) matches.push(d);
        findDiv(d.children);
      }
    };
    findDiv(divisions);
    if (matches.length !== 1) throw new Error(`${entry.workId}: diagram division "${dg.divisionId}" matched ${matches.length} divisions (must be exactly 1)`);
    const passage = matches[0]!.passages[dg.passageIndex];
    if (!passage) throw new Error(`${entry.workId} / ${dg.divisionId}: no passage at index ${dg.passageIndex} for diagram ${dg.image}`);
    if (!existsSync(join(DATA_ROOT, entry.workId, dg.image))) throw new Error(`${entry.workId} / ${dg.divisionId}: diagram file missing: data/${entry.workId}/${dg.image}`);
    passage.figure = { image: dg.image, imageWidth: dg.width, imageHeight: dg.height, alt: dg.alt, source: dg.source };
    diagramsAttached.push({ divisionId: dg.divisionId, source: dg.source });
    anomalies.push({
      where: `${entry.workId} / ${dg.divisionId}`,
      note: `Printed diagram attached to passage ${dg.passageIndex + 1} as ${dg.image} (${dg.source}). The source TEI carries no <figure> marker here; the placement follows the point-letters the printed figure carries, which are the ones this passage's own text names (see scripts/import-aristotle-rest-shared/diagrams/aristotle.report.md). The image is the printed ink cropped from the scanned page - never redrawn.`,
    });
  }

  // --- Bekker span across the whole (filtered, where relevant) work ---
  const cleanedMarks = markSourceDiv.allMarks.map(cleanBekkerMark).filter((v): v is string => v !== null);
  const hasBekkerMarks = cleanedMarks.length > 0;
  const bekkerSpan = hasBekkerMarks ? (cleanedMarks[0] === cleanedMarks[cleanedMarks.length - 1] ? cleanedMarks[0]! : `${cleanedMarks[0]}–${cleanedMarks[cleanedMarks.length - 1]}`) : null;
  if (!hasBekkerMarks) {
    anomalies.push({ where: `${entry.workId} / whole work`, note: 'No Bekker page/column citation of any kind was found anywhere in this source file; Division.ref is null throughout (not guessed at).' });
  }

  // --- passage / char counts, empty-paragraph drops ---
  let passageCount = 0;
  let totalChars = 0;
  const walkCount = (ds: Division[]) => {
    for (const d of ds) {
      for (const p of d.passages) {
        passageCount += 1;
        totalChars += p.text.length;
        if (p.text.length === 0) throw new Error(`${entry.workId} / ${d.id}: an empty Passage survived folding`);
      }
      walkCount(d.children);
    }
  };
  walkCount(divisions);

  if (fold.chapterStats.emptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${entry.workId} / whole work`,
      note: `${fold.chapterStats.emptyParagraphsDropped} paragraph(s) were empty after apparatus/scaffolding removal (e.g. a paragraph containing only a discarded <note> or an excluded <choice><sic> variant) and were skipped rather than emitted empty.`,
    });
  }

  const noteDiscardedCount = logs.filter((l) => l.kind === 'note-discarded').length;
  const delBracketedCount = logs.filter((l) => l.kind === 'del-bracketed').length;
  const delAlreadyBracketedCount = logs.filter((l) => l.kind === 'del-already-bracketed').length;
  const sicKeptCount = logs.filter((l) => l.kind === 'sic-kept').length;
  const choiceSicCount = logs.filter((l) => l.kind === 'choice-sic-logged').length;

  const stats: AboutStats = {
    bookCount,
    chapterCount: fold.totalChapters,
    passageCount,
    totalChars,
    delBracketedCount,
    delAlreadyBracketedCount,
    addCount: fold.chapterStats.addCount,
    ellipsisGapCount: fold.chapterStats.ellipsisGapCount,
    lostGapCount: fold.chapterStats.lostGapCount,
    chaptersWithoutRef: fold.chaptersWithoutRef,
    noteDiscardedCount,
    sicKeptCount,
    choiceSicCount,
    bekkerSpan,
    hasBekkerMarks,
    diagrams: diagramsAttached,
  };

  // --- Unicode sanity (NFC, no standalone combining marks) ---
  let combiningHits = 0;
  let nfcMismatch = 0;
  const walkUnicode = (ds: Division[]) => {
    for (const d of ds) {
      for (const p of d.passages) {
        if (hasCombining(p.text)) combiningHits += 1;
        if (p.text !== p.text.normalize('NFC')) nfcMismatch += 1;
      }
      walkUnicode(d.children);
    }
  };
  walkUnicode(divisions);
  if (combiningHits > 0) {
    // Not a digitisation artefact here: a few Bekker files mark vowel QUANTITY
    // on omicron/nu (which have no long/short letter pair the way epsilon/eta
    // and omicron/omega do) with a combining macron/breve (U+0304/U+0306) -
    // there is no precomposed Greek code point for "omicron with macron", so
    // it legitimately survives NFC normalisation. Logged, not treated as an error.
    anomalies.push({
      where: `${entry.workId} / whole work`,
      note: `${combiningHits} passage(s) contain a standalone combining diacritic (typically U+0304 COMBINING MACRON or U+0306 COMBINING BREVE over omicron/nu, marking vowel quantity) that survives NFC normalisation because Unicode has no precomposed Greek letter for it - genuine philological notation, not a digitisation artefact, and kept verbatim.`,
    });
  }
  if (nfcMismatch > 0) throw new Error(`${entry.workId}: ${nfcMismatch} passage(s) are not NFC-normalised`);

  const work: GenericWork = { workId: entry.workId, language: 'grc', divisions };
  const about: WorkAbout = {
    workId: entry.workId,
    title: entry.titleConventional,
    author: entry.authenticity === 'authentic' ? 'Aristotle' : 'pseudo-Aristotle (attributed)',
    language: 'grc',
    editor: entry.editor,
    edition: entry.edition,
    provenance: `TEI XML from the ${entry.source === 'perseus' ? 'Perseus Digital Library / Open Greek and Latin canonical-greekLit repository' : entry.source === 'digicorpus' ? 'Open Greek and Latin "digicorpus" edition' : 'OpenGreekAndLatin / First1KGreek project'} (CTS urn:cts:greekLit:tlg0086.${entry.tlg}.${entry.witness}); imported by scripts/import-aristotle-rest.`,
    license:
      'The ancient Greek text is used here for its public-domain-eligible ancient content (the same licence wording this app already uses for Archimedes/Mugler and Euclid); the digital transcription is distributed by ' +
      (entry.source === 'first1k' ? 'First1KGreek' : entry.source === 'digicorpus' ? 'Open Greek and Latin' : 'Perseus/Open Greek and Latin') +
      ' under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0), under which it is redistributed here.',
    sections: buildAboutSections(entry, stats),
  };

  const outDir = join(DATA_ROOT, entry.workId);
  mkdirSync(outDir, { recursive: true });
  writeJson(outDir, 'work.json', work);
  writeJson(outDir, 'about.json', about);
  writeJson(outDir, 'anomalies.json', anomalies);
  writeFileSync(join(outDir, 'types.ts'), ARISTOTLE_REST_TYPES_FILE, 'utf8');
  process.stdout.write(`    wrote types.ts\n`);

  const totalDivs = countDivisions(divisions);
  process.stdout.write(
    `    ${bookCount !== null ? `${bookCount} book(s), ` : ''}${fold.totalChapters} chapter(s), ${passageCount} passage(s), ${totalChars} chars` +
      ` (${totalDivs} division(s) total) - bekker=${bekkerSpan ?? 'none'} noRef=${fold.chaptersWithoutRef} anomalies=${anomalies.length}\n\n`,
  );
}

function main(): void {
  // `--only=<workId>[,<workId>...]` re-imports just those works (same output
  // as a full run for them; nothing else is touched).
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;
  const selected = only ? WORKS.filter((w) => only.has(w.workId)) : WORKS;
  if (only && selected.length !== only.size) {
    throw new Error(`--only: unknown work id(s): ${[...only].filter((id) => !WORKS.some((w) => w.workId === id)).join(', ')}`);
  }
  process.stdout.write(`Aristotle-rest importer - ${selected.length} of ${WORKS.length} works (+${SKIPPED_WORKS.length} skipped)\n\n`);
  for (const skip of SKIPPED_WORKS) {
    process.stdout.write(`[skip] ${skip.workId}: ${skip.reason}\n`);
  }
  process.stdout.write('\n');

  for (const entry of selected) {
    try {
      process1(entry);
    } catch (err) {
      process.stderr.write(`\nSTOP (${entry.workId}): ${(err as Error).message}\n\n`);
      process.exit(1);
    }
  }

  process.stdout.write(`Done, ${selected.length} work(s) imported. Run \`npx tsx scripts/import-aristotle-rest-shared/validate.ts\` next.\n`);
}

main();
