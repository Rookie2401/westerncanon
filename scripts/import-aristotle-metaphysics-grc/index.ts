/**
 * Aristotle, *Metaphysics* — Greek text (W. D. Ross's 1924 Oxford Classical
 * Text), via the Perseus/OpenGreekAndLatin canonical-greekLit TEI. Run-once
 * ingestion pipeline.
 *
 *   npm run import:aristotle-metaphysics-grc
 *
 * Reads scripts/import-aristotle-metaphysics-grc/raw/tlg0086.tlg025.perseus-grc2.xml
 * (already in the repo; fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0086/tlg025/tlg0086.tlg025.perseus-grc2.xml
 * CTS urn:cts:greekLit:tlg0086.tlg025.perseus-grc2). Writes:
 *   data/metaphysics-grc/work.json       - the GenericWork (14 books, 142 chapters, two levels deep)
 *   data/metaphysics-grc/about.json      - provenance / licence metadata + About prose
 *   data/metaphysics-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:aristotle-metaphysics-grc` (scripts/import-aristotle-metaphysics-grc/validate.ts).
 *
 * See parse.ts's own doc comment for the full structural/markup account of
 * the source (book/section nesting, milestone/del/add/quote/l/lb/gap/bibl
 * handling). Faithfulness rules mirror every other importer in this repo:
 * verbatim reading text only, only transport scaffolding removed, anomalies
 * logged rather than guessed at.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGrc } from './parse.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/metaphysics-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0086.tlg025.perseus-grc2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'metaphysics-grc');

const WORK_ID = 'metaphysics-grc';
const EXPECTED_BOOKS = 14;
const EXPECTED_CHAPTERS = 142;
const INCIPIT = 'πάντες ἄνθρωποι τοῦ εἰδέναι ὀρέγονται φύσει';

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
  process.stdout.write(`parsing ${RAW_XML} ...\n  xml ${xml.length} chars\n`);

  const parsed = parseGrc(xml);

  // --- hard structural gates -------------------------------------------
  if (parsed.books.length !== EXPECTED_BOOKS) {
    fail(`expected exactly ${EXPECTED_BOOKS} books, found ${parsed.books.length}`);
  }
  const totalChapters = parsed.books.reduce((n, b) => n + b.chapters.length, 0);
  if (totalChapters !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} chapters total, found ${totalChapters}`);
  }
  for (const b of parsed.books) {
    for (const c of b.chapters) {
      if (c.passages.length === 0) fail(`book-${b.number}-ch-${c.number} has no passages`);
      for (const p of c.passages) {
        if (p.text.length === 0) fail(`book-${b.number}-ch-${c.number} has an empty passage`);
      }
    }
  }
  const firstPassage = parsed.books[0]!.chapters[0]!.passages[0]!.text;
  if (!firstPassage.startsWith(INCIPIT)) {
    fail(`incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(firstPassage.slice(0, 120))}`);
  }

  // --- monotonicity sanity check on Bekker page markers across the work ---
  const anomalies: Anomaly[] = [...parsed.anomalies];
  let anyRefMissing = 0;
  {
    let prevPage = 0;
    let prevCol = '';
    const pageColRe = /^(\d+)([ab])$/;
    for (const b of parsed.books) {
      for (const c of b.chapters) {
        for (const marker of c.pageMarkers) {
          const m = pageColRe.exec(marker);
          if (!m) {
            anomalies.push({ where: `${WORK_ID} / book-${b.number}-ch-${c.number}`, note: `unparseable Bekker page marker "${marker}"` });
            continue;
          }
          const page = Number(m[1]);
          const col = m[2]!;
          if (page < prevPage || (page === prevPage && col < prevCol)) {
            anomalies.push({
              where: `${WORK_ID} / book-${b.number}-ch-${c.number}`,
              note: `Bekker page marker "${marker}" goes backward from the previous "${prevPage}${prevCol}" - preserved as printed in the source, not corrected.`,
            });
          }
          prevPage = page;
          prevCol = col;
        }
        if (c.pageMarkers.length === 0) anyRefMissing += 1;
      }
    }
  }

  // --- build divisions ---------------------------------------------------
  const divisions: Division[] = parsed.books.map((b) => {
    const chapters: Division[] = b.chapters.map((c) => {
      const passages: Passage[] = c.passages.map((p) => {
        const passage: Passage = { n: '', text: p.text, ref: null };
        if (p.anomaly) passage.anomaly = p.anomaly;
        return passage;
      });
      let ref: string | null;
      if (c.pageMarkers.length === 0) {
        ref = null;
        anomalies.push({
          where: `${WORK_ID} / book-${b.number}-ch-${c.number}`,
          note: 'no Bekker page marker falls inside this chapter (Division.ref is null) - flagged as an anomaly rather than assumed.',
        });
      } else if (c.pageMarkers.length === 1) {
        ref = c.pageMarkers[0]!;
      } else {
        ref = `${c.pageMarkers[0]}–${c.pageMarkers[c.pageMarkers.length - 1]}`;
      }
      return {
        id: `book-${b.number}-ch-${c.number}`,
        number: String(c.number),
        ref,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages,
      };
    });
    return {
      id: `book-${b.number}`,
      number: String(b.number),
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: chapters,
      passages: [],
    };
  });

  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${EXPECTED_BOOKS} books and ${EXPECTED_CHAPTERS} chapters are present and in order, from the incipit ("${INCIPIT}...") to the end of Book 14. The imported reading text is the Perseus/OGL canonical-greekLit transcription of the <p> paragraphs with transport scaffolding removed (milestones stripped to build Division.ref; <del> excluded; <add> kept; <bibl> excluded; <quote>/<l> unwrapped; one <gap> kept as its literal printed ellipsis) - see the individual entries above for every occurrence. No paragraph is dropped, merged or reordered, and the bundled TEI file itself is identical to the current PerseusDL/canonical-greekLit release fetched for this import.`,
  });
  anomalies.push({
    where: `${WORK_ID} / del-add-bibl-gap counts`,
    note: `${parsed.totalDelSpans} <del> spans excluded, ${parsed.totalAddSpans} <add> insertions kept verbatim, ${parsed.totalBiblCitations} <bibl> editorial fragment citations excluded, ${parsed.totalGaps} <gap> ellipsis mark(s) kept as literal printed text. Every individual occurrence is logged above.`,
  });

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };
  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Metaphysics',
    author: 'Aristotle',
    language: 'grc',
    editor: 'William David Ross',
    edition: "Aristotle's Metaphysics, ed. W. D. Ross, 2 vols. (Oxford: Clarendon Press, 1924)",
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0086.tlg025.perseus-grc2), which digitises the text of Ross\'s 1924 Oxford Classical Text; imported by scripts/import-aristotle-metaphysics-grc. The raw file is committed at scripts/import-aristotle-metaphysics-grc/raw/tlg0086.tlg025.perseus-grc2.xml.',
    license:
      "Ross's 1924 edition of the Greek text is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Aristotle's Metaphysics",
        paragraphs: [
          'This is the Greek text of Aristotle\'s τὰ μετὰ τὰ φυσικά (Metaphysics), in fourteen books, in the edition of William David Ross - the same scholar whose 1908 English translation stands alongside it in this library (see data/metaphysics-en/about.json).',
          'The text here is the original Greek, verbatim. Nothing is translated, modernised, normalised or silently corrected. Two kinds of editorial mark in Ross\'s own critical text are preserved as printed: words he judged spurious/interpolated are printed in the OCT bracketed as deletions (<del> in this digital source) and are EXCLUDED from the reading text here, matching this library\'s established convention for editorially-deleted text (see Euclid\'s Elements); his own conjectural insertions (<add>) are KEPT, also matching that convention. Every individual occurrence of both is logged in anomalies.json.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          "William David Ross, ed., Aristotle's Metaphysics, 2 vols. (Oxford: Clarendon Press, 1924) - the Oxford Classical Text. This edition is in the public domain. Bekker's page/column/line numbers (e.g. \"980a1\") are the standard way of citing Aristotle; this work spans Bekker 980a1–1093b29 in the standard pagination.",
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0086.tlg025.perseus-grc2.xml (CTS urn:cts:greekLit:tlg0086.tlg025.perseus-grc2) from the Perseus Digital Library / Open Greek and Latin canonical-greekLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer slices the TEI body into its 14 book <div>s, then each book into its "section" <div>s (Perseus\'s own attribute name for what this app treats as Aristotle\'s chapter numbering - 142 in total), then takes the <p> paragraphs inside each chapter as the passages. Self-closing <milestone> markers (Bekker page and line positions) carry no text and are stripped as scaffolding; the unit="page" ones are used, in document order, to build each chapter\'s Division.ref as a page range. <del> (editorially deleted text) is excluded from the reading text; <add> (editorial insertions) is kept; <bibl> (modern fragment citations added by the TEI encoder, not Aristotle\'s words) is excluded; <quote> and <l> (genuine quotations of other authors, some verse) are unwrapped, keeping their words as ordinary reading prose; one <gap> (a printed ellipsis inside a quoted verse fragment) is kept as its literal printed text. Every occurrence of all of these except plain milestones is logged individually in anomalies.json.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by book, chapter, and Bekker page range. Each chapter\'s Division.ref is built from the unit="page" Bekker milestones that fall inside that chapter\'s own paragraphs, in document order: a single value if only one page-marker falls inside the chapter (e.g. "1028a"), or "<first>–<last>" if more than one (e.g. "980a–981a"). No Bekker LINE-level reference is attempted for any Passage (the source prints line milestones roughly every 5 lines, not at every paragraph break, so no per-passage line reference is fabricated) - Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          `All ${EXPECTED_BOOKS} books and ${EXPECTED_CHAPTERS} chapters are present and in order, from the incipit to the end of Book 14. See anomalies.json for the complete, individually-logged account of every <del>, <add>, <bibl> and <gap> occurrence, plus any chapter where no Bekker page marker could be attributed (Division.ref null).`,
          'This Greek edition is COMPLETE; the companion English edition (data/metaphysics-en) is not - it carries only the books/chapters actually available in its Wikisource source as of this import. See data/metaphysics-en/about.json for the full account of that gap.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const chCount = b.children.length;
    const passageCount = b.children.reduce((n, c) => n + c.passages.length, 0);
    process.stdout.write(`  Book ${b.number!.padStart(2)}  ${chCount} chapters  ${passageCount} passages\n`);
  }
  const totalPassages = divisions.reduce((n, b) => n + b.children.reduce((m, c) => m + c.passages.length, 0), 0);
  process.stdout.write(
    `\n  ${divisions.length} books  ${totalChapters} chapters  ${totalPassages} passages  ` +
      `(${parsed.totalDelSpans} <del>, ${parsed.totalAddSpans} <add>, ${parsed.totalBiblCitations} <bibl>, ${parsed.totalGaps} <gap>, ${anyRefMissing} chapters with no page marker, ${anomalies.length} anomalies total)\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:aristotle-metaphysics-grc` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
