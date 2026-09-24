/**
 * Ptolemy - Greek works (Almagest, Tetrabiblos) - run-once ingestion
 * pipeline. See workTable.ts's module doc for the full research trail
 * (what exists, what doesn't, and why).
 *
 *   npx tsx scripts/import-ptolemy/index.ts
 *   npx tsx scripts/import-ptolemy/indexEn.ts   (Tetrabiblos English, separate - see that file)
 *
 * Reads scripts/import-ptolemy/raw/<file> (already fetched once and
 * committed; nothing is downloaded here) for each work and writes, per work:
 *   data/<workId>/work.json       - the GenericWork
 *   data/<workId>/about.json      - provenance / licence metadata + About prose
 *   data/<workId>/anomalies.json  - machine-readable {where, note}[]
 *   data/<workId>/types.ts        - byte-identical generated types file
 *
 * Then run `npx tsx scripts/import-ptolemy/validate.ts`.
 *
 * Idempotent: re-running overwrites the same 4 files per work with identical
 * content (no state carried between runs, no network access). Both sources
 * are exactly Book -> Chapter, two levels deep, one Passage per Chapter
 * (that chapter's paragraphs joined by a blank line) - no further folding
 * logic is needed (see teiWalker.ts's module doc).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkEdition } from './teiWalker.ts';
import type { WalkDiv, WalkFigureOccurrence, WalkLog } from './teiWalker.ts';
import { GRC_WORKS } from './workTable.ts';
import type { GrcWorkEntry } from './workTable.ts';
import { buildAboutSections } from './aboutText.ts';
import type { AboutStats } from './aboutText.ts';
import { PTOLEMY_TYPES_FILE } from './typesTemplate.ts';
import { hasCombining, DIAGRAM_PLACEHOLDER } from './text.ts';
import type { Anomaly, Division, GenericWork, Passage, PassageFigure, WorkAbout } from './genericTypes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const DATA_ROOT = join(REPO_ROOT, 'data');

function writeJson(dir: string, name: string, data: unknown): void {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`    wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

const KIND_LABEL: Record<WalkLog['kind'], string> = {
  'del-bracketed': '<del> editor-bracketed text KEPT in the reading text (in square brackets)',
  'del-already-bracketed': '<del> text KEPT in the reading text verbatim, WITHOUT adding another bracket pair (its own printed text already contains "[" or "]")',
  add: '<add> editorial insertion kept verbatim in the reading text',
  'note-footnote': 'critical-apparatus <note type="footnote"> excluded entirely (tag and content)',
  'note-marginal': 'marginal <note type="marginal"> (constellation running-head) excluded entirely (tag and content)',
  gap: '<gap> (lacuna/editorial omission) excluded - contributes no text',
  'figure-diagram': '<figure> diagram marker kept as an honest Passage.figure note (no source text to keep - graphic-only)',
  'figure-table': '<figure> table marker kept as verbatim row-serialised table text on Passage.figure.note',
};

function logsToAnomalies(workId: string, logs: WalkLog[]): Anomaly[] {
  return logs.map((l) => ({ where: `${workId} / ${l.where}`, note: `${KIND_LABEL[l.kind]}${l.excerpt ? `: "${l.excerpt}"` : ''}` }));
}

/**
 * 2026-09-23 redesign (coordinator follow-up): Passage.text must hold ONLY
 * source text - never the "diagram not available" placeholder. A <figure>
 * that carries real table text (tableText !== null - see tableOrFigure.ts)
 * contributes that text to Passage.text itself (it IS source content); a
 * <figure> with no transcribed content of its own (a bare <graphic/>
 * pointer) contributes NOTHING to Passage.text - it is disclosed SOLELY via
 * Passage.figure, one combined entry per chapter (not one per marker,
 * matching the Euclid convention: "one figure entry whose note says how
 * many diagrams appear there"), whose note names the count and lists every
 * one of this chapter's <graphic> scan-page URLs (table-figures' URLs
 * included too - a later diagram-import phase needs the page a table's
 * numbers were ALSO printed on, not just pure-diagram pages).
 */
function buildFigure(figures: WalkFigureOccurrence[], citeLabel: string, bookN: string, chN: string): PassageFigure | undefined {
  if (figures.length === 0) return undefined;
  const diagramFigures = figures.filter((f) => f.result.tableText === null);
  const tableFigures = figures.filter((f) => f.result.tableText !== null);
  const urls = figures.map((f) => f.result.graphicUrl).filter((u): u is string => u !== null);

  const parts: string[] = [];
  if (diagramFigures.length > 0) {
    parts.push(diagramFigures.length === 1 ? DIAGRAM_PLACEHOLDER : `${diagramFigures.length} diagrams appear here in the printed edition; not yet available in this build.`);
  }
  if (tableFigures.length > 0) {
    parts.push(
      tableFigures.length === 1
        ? 'A numeric table also appears here in the printed edition; its data is transcribed verbatim in the reading text above.'
        : `${tableFigures.length} numeric tables also appear here in the printed edition; their data is transcribed verbatim in the reading text above.`,
    );
  }
  if (urls.length > 0) parts.push(`Scan page(s): ${urls.join('; ')}`);

  return { source: `${citeLabel} ${bookN}.${chN}`, note: parts.join(' ') };
}

function foldWork(root: WalkDiv, entry: GrcWorkEntry): { divisions: Division[]; passageCount: number; totalChars: number; chapterCount: number } {
  const bookDivs = root.children.filter((d) => d.subtype === 'book');
  const divisions: Division[] = [];
  let passageCount = 0;
  let totalChars = 0;
  let chapterCount = 0;

  for (const book of bookDivs) {
    const bookN = book.n ?? '';
    const chapterDivs = book.children.filter((d) => d.subtype === entry.chapterSubtype);
    const children: Division[] = [];
    for (const ch of chapterDivs) {
      const chN = ch.n ?? '';
      const tableFigureTexts = ch.figures.map((f) => f.result.tableText).filter((t): t is string => t !== null);
      if (tableFigureTexts.length > 0 && ch.paragraphs.length > 0) {
        // Not designed for and never seen in either source (confirmed by
        // direct inspection - table-bearing figures only ever occur in a
        // chapter with NO running-prose <p> at all, e.g. the Almagest's
        // Table of Chords, book-1-ch-11) - a future upstream change adding
        // this shape needs its own ordering logic, not a guess.
        throw new Error(`${entry.workId}: book-${bookN}-ch-${chN} has BOTH running prose and a table-bearing <figure> - needs explicit interleaving logic`);
      }
      // Passage.text is source text ONLY: this chapter's own <p> paragraphs,
      // plus (mutually exclusive with the above, per the check just above)
      // any <figure> table text the transcription itself carries (e.g. the
      // Table of Chords) - one "paragraph" per table. A pure-diagram
      // <figure> (no transcribed content) NEVER contributes to Passage.text;
      // see buildFigure's doc comment - it is disclosed solely via
      // Passage.figure.
      const text = [...ch.paragraphs.map((p) => p.text), ...tableFigureTexts].join('\n\n');
      const figure = buildFigure(ch.figures, entry.figureCiteLabel, bookN, chN);
      if (text.length === 0 && !figure) throw new Error(`${entry.workId}: book-${bookN}-ch-${chN} has no paragraph text and no figures - empty chapter`);

      // book-N-ch-toc (Almagest only): the source prints no <head> for this
      // division - its own first paragraph ("Τάδε ἔνεστιν ἐν τῷ πρώτῳ…",
      // "Here is contained in the first [book] of…") reads as the section's
      // heading in the printed edition. Copied into sourceHeading for
      // sensible labelling WITHOUT removing it from Passage.text (it is
      // genuine <p> content, not a <head> tag, and stays there verbatim -
      // see aboutText.ts's "Reference scheme" section).
      const sourceHeading = ch.head ?? (chN === 'toc' ? (ch.paragraphs[0]?.text ?? null) : null);

      const passage: Passage = { n: '', text, ref: null, ...(figure ? { figure } : {}) };
      passageCount += 1;
      totalChars += text.length;
      chapterCount += 1;
      children.push({
        id: `book-${bookN}-ch-${chN}`,
        number: chN,
        ref: null,
        sourceHeading,
        editorialTitle: null,
        children: [],
        passages: [passage],
      });
    }
    divisions.push({
      id: `book-${bookN}`,
      number: bookN,
      ref: null,
      sourceHeading: book.head,
      editorialTitle: null,
      children,
      passages: [],
    });
  }
  return { divisions, passageCount, totalChars, chapterCount };
}

function process1(entry: GrcWorkEntry): void {
  process.stdout.write(`[${entry.workId}] <- ${entry.file}\n`);
  const rawPath = join(RAW_DIR, entry.file);
  const xml = readFileSync(rawPath, 'utf8');

  const { root, logs } = walkEdition(xml, entry.workId);
  const anomalies: Anomaly[] = logsToAnomalies(entry.workId, logs);

  const { divisions, passageCount, totalChars, chapterCount } = foldWork(root, entry);

  if (divisions.length !== entry.expectedBooks) throw new Error(`${entry.workId}: expected ${entry.expectedBooks} book(s), got ${divisions.length}`);
  if (chapterCount !== entry.expectedChapters) throw new Error(`${entry.workId}: expected ${entry.expectedChapters} chapter(s), got ${chapterCount}`);

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
    anomalies.push({
      where: `${entry.workId} / whole work`,
      note: `${combiningHits} passage(s) contain a standalone combining diacritic that survives NFC normalisation - genuine philological notation, kept verbatim.`,
    });
  }
  if (nfcMismatch > 0) throw new Error(`${entry.workId}: ${nfcMismatch} passage(s) are not NFC-normalised`);

  const delCount = logs.filter((l) => l.kind === 'del-bracketed' || l.kind === 'del-already-bracketed').length;
  const addCount = logs.filter((l) => l.kind === 'add').length;
  const gapLogs = logs.filter((l) => l.kind === 'gap');
  const gapCount = gapLogs.length;

  // Per-book <gap/> counts - see aboutText.ts's dedicated "Material
  // incompleteness" section: every gap in this corpus falls inside the
  // Almagest's Book VII-VIII star catalogue (each star's longitude/
  // latitude/magnitude numeral, omitted by this transcription while the
  // star's own descriptive identification survives) - a coordinator-
  // verified finding, not assumed here; this loop just tallies it per book
  // from the logs' own `where` path ("book[N]/section[M]", see
  // teiWalker.ts#currentPath) so a future re-run/different source
  // re-derives the same disclosure rather than hard-coding "7 and 8".
  const gapsByBook = new Map<string, number>();
  for (const l of gapLogs) {
    const bookMatch = /\bbook\[([^\]]+)\]/.exec(l.where);
    const bookN = bookMatch ? bookMatch[1]! : 'unknown';
    gapsByBook.set(bookN, (gapsByBook.get(bookN) ?? 0) + 1);
  }
  for (const [bookN, count] of [...gapsByBook.entries()].sort((a, b) => (Number(a[0]) || 0) - (Number(b[0]) || 0))) {
    anomalies.push({
      where: `${entry.workId} / book-${bookN}`,
      note: `${count} <gap reason="omitted"/> lacuna(e) in this book - the transcription omits the NUMERIC entries (longitude/latitude/magnitude degree-values) of Ptolemy's tables here; the descriptive identification of each row (e.g. a star's position within its constellation) survives as ordinary reading text, but the numbers themselves are not present anywhere in this build. See about.json's "Material incompleteness" section.`,
    });
  }

  const footnoteCount = logs.filter((l) => l.kind === 'note-footnote').length;
  const marginalCount = logs.filter((l) => l.kind === 'note-marginal').length;
  const figureDiagramCount = logs.filter((l) => l.kind === 'figure-diagram').length;
  const figureTableLogs = logs.filter((l) => l.kind === 'figure-table');
  const figureTableCount = figureTableLogs.length;
  const tableRowsTotal = figureTableLogs.reduce((sum, l) => sum + (l.excerpt ? l.excerpt.split('\n').length : 0), 0);

  const stats: AboutStats = {
    bookCount: divisions.length,
    chapterCount,
    passageCount,
    totalChars,
    delCount,
    addCount,
    gapCount,
    gapsByBook: [...gapsByBook.entries()].sort((a, b) => (Number(a[0]) || 0) - (Number(b[0]) || 0)),
    footnoteCount,
    marginalCount,
    figureDiagramCount,
    figureTableCount,
    tableRowsTotal,
  };

  const work: GenericWork = { workId: entry.workId, language: 'grc', divisions };
  const about: WorkAbout = {
    workId: entry.workId,
    title: entry.titleGreek,
    author: 'Claudius Ptolemy',
    language: 'grc',
    editor: entry.editor,
    edition: entry.edition,
    provenance: `TEI XML from the ${entry.source === 'first1k-almagest' ? 'OpenGreekAndLatin / First1KGreek project' : 'Perseus Digital Library / Open Greek and Latin canonical-greekLit repository'} (CTS ${entry.ctsUrn}); imported by scripts/import-ptolemy.`,
    license:
      'The ancient Greek text is used here for its public-domain-eligible ancient content (the same licence wording this app already uses for Archimedes/Mugler, Euclid, and the rest of the Aristotle corpus); the digital transcription is distributed under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0), under which it is redistributed here.',
    sections: buildAboutSections(entry, stats),
  };

  const outDir = join(DATA_ROOT, entry.workId);
  mkdirSync(outDir, { recursive: true });
  writeJson(outDir, 'work.json', work);
  writeJson(outDir, 'about.json', about);
  writeJson(outDir, 'anomalies.json', anomalies);
  writeFileSync(join(outDir, 'types.ts'), PTOLEMY_TYPES_FILE, 'utf8');
  process.stdout.write(`    wrote types.ts\n`);
  process.stdout.write(
    `    ${divisions.length} book(s), ${chapterCount} chapter(s), ${passageCount} passage(s), ${totalChars} chars - del=${delCount} add=${addCount} gap=${gapCount} footnote=${footnoteCount} marginal=${marginalCount} figDiag=${figureDiagramCount} figTable=${figureTableCount} anomalies=${anomalies.length}\n\n`,
  );
}

function main(): void {
  process.stdout.write(`Ptolemy Greek importer - ${GRC_WORKS.length} work(s)\n\n`);
  for (const entry of GRC_WORKS) {
    try {
      process1(entry);
    } catch (err) {
      process.stderr.write(`\nSTOP (${entry.workId}): ${(err as Error).message}\n\n`);
      process.exit(1);
    }
  }
  process.stdout.write(`Done. Run \`npx tsx scripts/import-ptolemy/validate.ts\` next.\n`);
}

main();
