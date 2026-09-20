/**
 * Cicero, *De Oratore* - Latin text only. Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-de-oratore-la/index.ts
 *
 * Reads scripts/import-de-oratore-la/raw/phi0474.phi037.perseus-lat2.xml
 * (fetched once, direct from PerseusDL/canonical-latinLit on GitHub, and
 * committed here; nothing is downloaded at import time) and writes:
 *   data/de-oratore-la/work.json       - the GenericWork (3 Books, each a
 *                                        flat list of Section leaves)
 *   data/de-oratore-la/about.json      - provenance / licence / prose
 *   data/de-oratore-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-de-oratore-la/validate.ts`.
 *
 * Source (confirmed by fetching scripts/import-de-oratore-la/raw/__cts__.xml
 * before writing this importer): urn:cts:latinLit:phi0474.phi037.perseus-lat2,
 * "M. Tulli Ciceronis. Rhetorica, Vol. 1", ed. Augustus Samuel Wilkins
 * (Oxford: Clarendon Press, 1902) - the Oxford Classical Texts edition.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a single
 * two-level `<div type="textpart" subtype="book" n="1..3">` /
 * `<div type="textpart" subtype="section" n="M">` tree - 265 sections in
 * Book 1, 367 in Book 2, 230 in Book 3, each section numbering restarting
 * at 1 within its own book, exactly as printed. Each Book division's own
 * <head> carries its printed Latin rubric ("LIBER PRIMVS" / "SECVNDVS" /
 * "TERTIVS"), captured verbatim as Division.sourceHeading.
 *
 * IMPORTANT and unexpected finding: unlike its Brutus/Orator siblings in
 * the very same phi0474 corpus (which both carry
 * <milestone unit="chapter" n="N"/> markers throughout), this file carries
 * ZERO <milestone> elements of any kind - confirmed by an exhaustive grep
 * of the raw XML before writing this importer, not assumed from the task
 * brief. There is therefore no citation finer than book/section available
 * from this source at all; every Division.ref and Passage.ref is null
 * throughout (see anomalies.json).
 *
 * No public-domain English translation of the complete work is bundled:
 * the only public-domain-year fragment found (Guthrie, 1822) covers Book 1
 * only and was excluded per an explicit editorial decision (see about.json
 * "Known gaps & anomalies") - this edition is Latin-only, exactly as
 * Aristotle's Physics ships Greek-only elsewhere in this library.
 *
 * Tag handling is shared with the Brutus/Orator Latin importers - see the
 * module doc on scripts/import-cicero-la-shared/parseSection.ts for the
 * full, verified account of every apparatus tag in this phi0474 corpus and
 * how each is handled (drop <note>/<del>, log <gap>, special-case
 * <abbr>/<expan>, unwrap everything else). Faithfulness: verbatim Latin
 * reading text only; no accent/spelling/punctuation normalisation.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { parseSectionBody } from '../import-cicero-la-shared/parseSection.ts';
import type { Division, GenericWork, Passage } from '../../data/de-oratore-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi037.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-oratore-la');

const WORK_ID = 'de-oratore-la';
const EXPECTED_BOOKS = 3;
const EXPECTED_SECTION_COUNTS = [265, 367, 230];
/** Verbatim incipit of book 1, section 1. */
const INCIPIT = 'Cogitanti mihi saepe numero et memoria vetera repetenti';
/** Verbatim tail of the final section of book 3 (the work's closing sentence). */
const EXPLICIT_TAIL = 'nosque curemus et aliquando ab hac contentione disputationis animos nostros curamque laxemus.';

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
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const anomalies: Anomaly[] = [];

  const edStart = xml.indexOf('type="edition"');
  const bodyEnd = xml.indexOf('</body>');
  if (edStart < 0 || bodyEnd < 0 || bodyEnd < edStart) fail('no <div type="edition"> ... </body> found in source XML');
  const ed = xml.slice(edStart, bodyEnd);

  const bookRe = /<div type="textpart" subtype="book"[^>]*\sn="([^"]+)"[^>]*>/g;
  const bookParts = ed.split(bookRe);
  if (bookParts.length < 1 + EXPECTED_BOOKS * 2) fail(`unexpected book split shape (${bookParts.length} parts)`);

  const divisions: Division[] = [];
  let totalSections = 0;
  let totalChapterMilestonesFound = 0;
  let totalGaps = 0;
  let totalNotes = 0;
  let totalDelSpans = 0;
  let totalDelChars = 0;
  let totalAbbrExpanDropped = 0;
  let totalEmptyParagraphsDropped = 0;

  for (let i = 1; i < bookParts.length; i += 2) {
    const bookNum = Number(bookParts[i]);
    const bookBody = bookParts[i + 1] ?? '';
    if (!Number.isFinite(bookNum) || bookNum < 1 || bookNum > EXPECTED_BOOKS) fail(`unexpected book number "${bookParts[i]}"`);
    const where = `book-${bookNum}`;

    const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/.exec(bookBody);
    const sourceHeading = headMatch ? cleanText(headMatch[1]!.replace(/<[^>]+>/g, ' ')) : null;
    if (!sourceHeading) {
      anomalies.push({ where, note: 'no <head> rubric found for this book; Division.sourceHeading left null.' });
    }

    const secRe = /<div type="textpart" subtype="section"[^>]*\sn="([^"]+)"[^>]*>/g;
    const secParts = bookBody.split(secRe);
    if (secParts.length < 3) fail(`${where}: unexpected section split shape (${secParts.length} parts)`);

    const bookDiv: Division = {
      id: `book-${bookNum}`,
      number: String(bookNum),
      ref: null,
      sourceHeading,
      editorialTitle: null,
      children: [],
      passages: [],
    };

    for (let j = 1; j < secParts.length; j += 2) {
      const secNum = Number(secParts[j]);
      const secBody = secParts[j + 1] ?? '';
      const secWhere = `${where}-sec-${secNum}`;
      if (!Number.isFinite(secNum)) fail(`${secWhere}: non-numeric section n="${secParts[j]}"`);

      const parsed = parseSectionBody(secBody, secWhere, fail);
      totalSections += 1;
      totalChapterMilestonesFound += parsed.chapterMilestones.length;
      totalNotes += parsed.counts.notes;
      totalDelSpans += parsed.counts.delSpans;
      totalDelChars += parsed.counts.delChars;
      totalAbbrExpanDropped += parsed.counts.abbrExpanDropped;
      totalEmptyParagraphsDropped += parsed.counts.emptyParagraphsDropped;
      for (const g of parsed.gaps) {
        totalGaps += 1;
        anomalies.push({
          where: g.where,
          note: `lacuna marker <gap reason="${g.reason}" rend="${g.rend.trim()}"/> found; the printed edition marks a manuscript gap here (no text content in the tag itself, so nothing is fabricated in its place).`,
        });
      }
      if (parsed.counts.delSpans > 0) {
        anomalies.push({
          where: secWhere,
          note: `${parsed.counts.delSpans} editorial deletion(s) (<del>, Wilkins' apparatus criticus) totalling ${parsed.counts.delChars} characters were excluded from the reading text (not part of Wilkins' printed text).`,
        });
      }
      if (parsed.counts.abbrExpanDropped > 0) {
        anomalies.push({
          where: secWhere,
          note: `${parsed.counts.abbrExpanDropped} <abbr>...<expan>...</expan></abbr> construction(s): kept the abbreviation's own diplomatic text (what Wilkins prints), dropped the nested <expan> editorial-expansion gloss (not printed running text) - see scripts/import-cicero-la-shared/parseSection.ts module doc.`,
        });
      }

      const passage: Passage = { n: '', text: parsed.text, ref: null };
      const secDiv: Division = {
        id: secWhere,
        number: String(secNum),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [passage],
      };
      bookDiv.children.push(secDiv);
    }

    const expectedCount = EXPECTED_SECTION_COUNTS[bookNum - 1]!;
    if (bookDiv.children.length !== expectedCount) {
      fail(`${where}: expected ${expectedCount} sections, got ${bookDiv.children.length}`);
    }
    bookDiv.children.forEach((c, idx) => {
      if (c.number !== String(idx + 1)) fail(`${where}: section out of sequence at position ${idx} (id ${c.id})`);
    });

    divisions.push(bookDiv);
  }

  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} books, found ${divisions.length}`);
  divisions.forEach((b, i) => {
    if (b.number !== String(i + 1)) fail(`book out of sequence at position ${i} (id ${b.id})`);
  });

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / all division & passage refs`,
    note:
      'This edition\'s XML carries zero <milestone> elements of any kind (confirmed by exhaustive inspection before writing this importer) - unlike its Brutus/Orator siblings in the same phi0474 corpus, which both carry <milestone unit="chapter"/> markers throughout. There is therefore no citation finer than book/section available from this source at all: every Division.ref and Passage.ref is null throughout. Citation here is by Book and (Wilkins\' own) section number only, carried directly by the id/number fields.',
  });
  anomalies.push({
    where: `${WORK_ID} / apparatus totals`,
    note: `${totalNotes} apparatus-criticus <note> elements were dropped entirely (tag and content) across all three books; not logged individually given the number (mirrors the treatment of Rackham's/Ross's apparatus elsewhere in this library).`,
  });
  anomalies.push({
    where: `${WORK_ID} / English translation`,
    note:
      'No English translation is bundled with this edition. The only public-domain-year rendering found during research was a partial 1822 Guthrie translation covering Book 1 only (out of three); shipping a one-third translation alongside a complete Latin text was judged more misleading than disclosing the gap outright, so this edition is Latin-only for now - the same choice already made for Aristotle\'s Physics (Greek-only) elsewhere in this library. See about.json.',
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- hard sanity gates ---------------------------------------------------
  if (totalChapterMilestonesFound !== 0) {
    fail(`expected zero <milestone unit="chapter"> markers in this source, found ${totalChapterMilestonesFound}`);
  }
  const firstText = divisions[0]!.children[0]!.passages[0]!.text;
  if (!firstText.startsWith(INCIPIT)) fail(`incipit mismatch: got ${JSON.stringify(firstText.slice(0, 80))}`);
  const lastBook = divisions[divisions.length - 1]!;
  const lastSec = lastBook.children[lastBook.children.length - 1]!;
  const lastText = lastSec.passages[0]!.text;
  if (!lastText.endsWith(EXPLICIT_TAIL)) fail(`explicit mismatch: got tail ${JSON.stringify(lastText.slice(-80))}`);

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about = {
    workId: WORK_ID,
    title: 'De Oratore',
    author: 'Cicero',
    language: 'la' as const,
    editor: 'Augustus Samuel Wilkins',
    edition: 'Oxford Classical Texts, 1902 (Rhetorica, Vol. 1)',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository ' +
      '(urn:cts:latinLit:phi0474.phi037.perseus-lat2), which digitises M. Tulli Ciceronis Rhetorica, Vol. 1, ' +
      'ed. Augustus Samuel Wilkins (Oxford: Clarendon Press, 1902); imported by scripts/import-de-oratore-la.',
    license:
      'Wilkins\' 1902 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / Open Greek and Latin under a Creative Commons Attribution-ShareAlike 4.0 ' +
      'International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'About this edition',
        paragraphs: [
          'This is Cicero\'s De Oratore in Latin only - Augustus Samuel Wilkins\' 1902 Oxford Classical Texts edition, ' +
            'via the Perseus Digital Library / Open Greek and Latin.',
          'No English translation is bundled. The only public-domain-year English rendering found was William ' +
            'Guthrie\'s 1822 translation, and even that covers Book 1 only, out of the work\'s three books - shipping ' +
            'a one-third translation beside a complete Latin text seemed more likely to mislead a reader than to ' +
            'help one, so this edition is Latin-only for now, exactly as this library already ships Aristotle\'s ' +
            'Physics Greek-only. See "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Augustus Samuel Wilkins, ed., M. Tulli Ciceronis Rhetorica, Vol. 1 (Oxford: Clarendon Press, 1902) - the ' +
            'Scriptorum Classicorum Bibliotheca Oxoniensis (Oxford Classical Texts) edition. This edition is in the ' +
            'public domain.',
          `The work is divided into 3 Books, each a flat sequence of numbered sections (265 in Book 1, 367 in Book ` +
            `2, 230 in Book 3), restarting at 1 in each Book exactly as printed.`,
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi037.perseus-lat2.xml ' +
            '(urn:cts:latinLit:phi0474.phi037.perseus-lat2) from the Perseus Digital Library / Open Greek and Latin ' +
            'canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from ' +
            'the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the Book and Section <div>s, collecting every <p> paragraph within a section (joined ' +
            'with a blank line when a section prints more than one) into that section\'s single Passage. Each ' +
            'Book\'s own printed Latin rubric (its <head>, e.g. "LIBER PRIMVS") is captured verbatim as ' +
            'Division.sourceHeading. Wilkins\' apparatus criticus (<note>...</note>) is excluded entirely, tag and ' +
            'content, as is any editorial deletion he marks as not part of his printed text (<del>...</del>). ' +
            'Manuscript lacunae the edition marks with a self-closing <gap/> are logged individually to ' +
            'anomalies.json (the tag carries no text of its own, so nothing is invented in its place). Two ' +
            '<abbr>DIPLOMATIC<expan>...</expan></abbr> constructions keep only the abbreviation\'s own diplomatic ' +
            'text (what is actually printed), dropping the nested editorial-expansion gloss. Purely typographic ' +
            'wrapper tags (verse quotations, untranslated Greek asides, small-caps numerals, quotation marks, ' +
            'emphasis, Wilkins\' own incorporated additions) are unwrapped, their text kept inline. Entities are ' +
            'decoded and whitespace collapsed; the words are otherwise untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and section number only (e.g. "1.5"), both taken directly from Wilkins\' own ' +
            'printed numbering. Unlike its Brutus/Orator siblings from the same Perseus corpus, this particular ' +
            'edition\'s XML carries no <milestone> markers of any kind - confirmed by an exhaustive check of the ' +
            'raw file before writing this importer - so there is no finer citation (no traditional chapter number, ' +
            'no OCT page) available from this source at all. Every Division.ref and Passage.ref is therefore null ' +
            'throughout; Passage.n is also always empty (no printed per-paragraph numbering within a section).',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'No English translation. See "About this edition" above: the only public-domain-year translation found ' +
            '(Guthrie, 1822) covers Book 1 only, and was excluded as more misleading than helpful beside a ' +
            'complete Latin text.',
          'No chapter-level citation. This source carries no <milestone> markers, so citation is by Book.section ' +
            'only, not by the traditional Roman-numeral chapter numbers some secondary literature uses.',
          `${totalNotes} apparatus-criticus notes were dropped from the reading text (manuscript sigla and variant ` +
            `readings - Wilkins' scholarly apparatus, not his printed running text).`,
          `${totalDelSpans} editorial deletion span(s) (${totalDelChars} characters total) that Wilkins marks as ` +
            'not part of his printed text were excluded.',
          `${totalGaps} manuscript lacuna marker(s) (<gap/>) are logged individually in anomalies.json.`,
          `${totalAbbrExpanDropped} abbreviation/expansion construction(s) kept only the diplomatic abbreviated ` +
            'form actually printed, dropping the nested editorial-expansion gloss.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const c of b.children) {
      totalPassages += c.passages.length;
      totalChars += c.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  Book ${b.number}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections\n`);
  }
  process.stdout.write(
    `\n  ${EXPECTED_BOOKS} books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars\n` +
      `  ${totalNotes} <note>  ${totalDelSpans} <del> spans  ${totalGaps} <gap/>  ${totalAbbrExpanDropped} abbr/expan\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-de-oratore-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
