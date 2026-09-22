/**
 * Flavius Josephus, *The Jewish War* (Ἰουδαϊκοῦ πολέμου πρὸς Ῥωμαίους) —
 * Greek text, ed. Benedikt Niese (Flavii Iosephi Opera, Vol. 6, Berlin:
 * Weidmann, 1895), via the Perseus/OpenGreekAndLatin canonical-greekLit TEI.
 * Run-once ingestion pipeline, self-fetching and idempotent.
 *
 *   npx tsx scripts/import-jewish-war-grc/index.ts
 *
 * On first run, fetches
 * https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg004/tlg0526.tlg004.perseus-grc2.xml
 * (CTS urn:cts:greekLit:tlg0526.tlg004.perseus-grc2) and caches it verbatim at
 * scripts/import-jewish-war-grc/raw/tlg0526.tlg004.perseus-grc2.xml; a later
 * run reuses that cached file and never touches the network again. Writes:
 *   data/jewish-war-grc/work.json       - the GenericWork (7 books, 4001 sections, two levels deep)
 *   data/jewish-war-grc/about.json      - provenance / licence / prose
 *   data/jewish-war-grc/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-jewish-war-grc/validate.ts`.
 *
 * TWO-level structure, confirmed by direct inspection of the whole fetched
 * file: a single `<div type="edition" xml:lang="grc">` wrapper holds 7
 * `<div type="textpart" subtype="book" n="N">`, each holding a flat run of
 * `<div type="textpart" subtype="section" n="M">` - NO chapter-level div in
 * between. Each book's own section numbering is continuous 1..count (673 /
 * 654 / 542 / 663 / 572 / 442 / 455 - 4001 total), confirmed sequential with
 * no gaps in every book. Every section holds exactly one `<p>` (4001 `<p>`
 * total in the body, one per section - independently confirmed, so no
 * within-section multi-paragraph joining ever actually occurs here, though
 * the importer still joins with "\n\n" defensively per this app's standard
 * Book->Section Passage convention).
 *
 * Markup handled (this edition carries NO critical apparatus at all -
 * `<note>`, `<del>`, `<gap>`, `<add>`, `<foreign>`, `<hi>` are all confirmed
 * ZERO occurrences by direct inspection; asserted below and fails loudly if
 * that ever changes):
 *   - Each book opens with one `<head>` rubric (e.g. "Φλαυίου Ἰωσήπου ἱστορία
 *     Ἰουδαϊκοῦ πολέμου πρὸς Ῥωμαίους βιβλίον α.") - captured verbatim as
 *     that Book's Division.sourceHeading. Its embedded `<num>` (the book's
 *     Greek numeral letter, α/β/γ/δ/ε/ζ) is pure typographic markup and is
 *     unwrapped, its text flowing into the heading. Book 6's own `<num>`
 *     spells out the numeral as the bracketed word "[στιγμα]" instead of the
 *     single stigma-numeral character ϛ used everywhere else in Greek
 *     numeral notation - the source's own idiosyncrasy, preserved exactly as
 *     printed, not corrected to ϛ; logged as an anomaly.
 *   - `<q rend="...">...</q>` (456 - 91 with no rend attribute, 365
 *     `rend="merge"`) is typographic quotation-mark markup around Josephus's
 *     own direct speech - unwrapped, no content decision; the `rend` value
 *     is not represented in this app's schema (no field for it) and is
 *     dropped as scaffolding, same as this app's established treatment of
 *     purely typographic `<hi>`/`<foreign>` wrappers elsewhere.
 *   - `<pb/>` (487, self-closing page-break markers, no content) is dropped
 *     with no text fabricated in its place.
 *   - `<milestone unit="Whiston_chapter"/>` (111) and `<milestone
 *     unit="Whiston_section"/>` (707) thread William Whiston's own English
 *     chapter/section citation scheme through Niese's Greek text (matching
 *     this work's English sibling exactly in count and, independently
 *     confirmed at the same relative textual positions). This app's
 *     Book->Section schema for this work has no field for a second, coarser
 *     citation system, so - per this task's explicit instruction that
 *     Division.ref is null throughout for this work - these markers are
 *     dropped as scaffolding without affecting the reading text or any
 *     Division.ref; disclosed once at the corpus level rather than
 *     fabricating a use for them (mirrors this app's established
 *     alternatechpater/alternatesection handling in de-officiis-la).
 *
 * Faithfulness rules (mirrors every other importer in this repo): verbatim
 * Greek reading text only; only transport scaffolding is removed; every
 * genuine irregularity is logged individually to anomalies.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/jewish-war-grc/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'tlg0526.tlg004.perseus-grc2.xml');
const RAW_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/tlg0526/tlg004/tlg0526.tlg004.perseus-grc2.xml';
const OUT_DIR = join(REPO_ROOT, 'data', 'jewish-war-grc');

const WORK_ID = 'jewish-war-grc';
const EXPECTED_BOOKS = 7;
/** This source's own per-book section counts (I..VII), continuous 1..count in each book. */
const EXPECTED_SECTION_COUNTS = [673, 654, 542, 663, 572, 442, 455];

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 160): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

async function ensureRaw(): Promise<string> {
  mkdirSync(dirname(RAW_XML), { recursive: true });
  if (existsSync(RAW_XML)) {
    process.stdout.write(`using cached ${RAW_XML}\n`);
    return readFileSync(RAW_XML, 'utf8');
  }
  process.stdout.write(`fetching ${RAW_URL} ...\n`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let text: string;
  try {
    const res = await fetch(RAW_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (summa-app-importer; offline PWA corpus build)' },
      signal: controller.signal,
    });
    if (!res.ok) fail(`HTTP ${res.status} fetching ${RAW_URL}`);
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }
  if (text.length < 500000) fail(`suspiciously short response (${text.length} bytes) from ${RAW_URL}`);
  writeFileSync(RAW_XML, text, 'utf8');
  process.stdout.write(`cached to ${RAW_XML} (${text.length} bytes)\n`);
  return text;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = await ensureRaw();
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<body');
  const textEnd = xml.indexOf('</body>');
  if (textStart < 0 || textEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(textStart, textEnd);

  // Attribute order in this file is consistently type="textpart" subtype="X"
  // xml:base="..." n="Y", but lookaheads keep this robust either way.
  const BOOK_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="book")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const SECTION_OPEN = '<div type="textpart"(?=[^>]*\\bsubtype="section")(?=[^>]*\\bn="([^"]+)")[^>]*>';
  const tokenRe = new RegExp(
    `${BOOK_OPEN}|${SECTION_OPEN}|<div\\b[^>]*>|<\\/div>|<head\\b[^>]*>|<\\/head>|<p\\b[^>]*>|<\\/p>|<milestone\\b[^>]*\\/>|<note\\b[^>]*>|<\\/note>|<del\\b[^>]*>|<\\/del>|<gap\\b[^>]*\\/>|<add\\b[^>]*>|<\\/add>|<foreign\\b[^>]*>|<\\/foreign>|<hi\\b[^>]*>|<\\/hi>|<[^>]+>`,
    'g',
  );

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'book' | 'section' | 'other';
  const stack: Frame[] = [];

  let currentBookNum = '';
  let currentBookDiv: Division | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];

  // head handling: which target ('book' | 'section') the next <head> belongs to.
  let headTarget: 'book' | 'section' | null = null;
  let inHead = false;
  let headBuf = '';
  let sectionHeading: string | null = null;

  let inP = false;
  let pBuf = '';

  let totalSections = 0;
  let totalChapterMilestones = 0;
  let totalSectionMilestones = 0;
  let totalPbMarkers = 0;
  let totalQTags = 0;
  let totalEmptyParagraphsDropped = 0;
  // guard: assert this edition really carries none of these (see module doc)
  let sawApparatusTag = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionHeading = null;
    headTarget = 'section';
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    const sectionDiv: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: null,
      sourceHeading: sectionHeading,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(sectionDiv);
    totalSections += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inHead) headBuf += free;
      else if (inP) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      // book open
      stack.push('book');
      currentBookNum = m[1];
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: currentBookNum,
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
      headTarget = 'book';
    } else if (m[2] !== undefined) {
      // section open
      stack.push('section');
      openSection(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<head\b/.test(tok)) {
      if (headTarget === null) fail(`unexpected <head> with no pending book/section target near "${excerpt(body.slice(m.index, m.index + 80))}"`);
      inHead = true;
      headBuf = '';
    } else if (tok === '</head>') {
      inHead = false;
      const cleaned = cleanText(headBuf);
      if (headTarget === 'book') {
        if (!currentBookDiv) fail('</head> (book) closed outside any book');
        currentBookDiv.sourceHeading = cleaned;
      } else if (headTarget === 'section') {
        sectionHeading = cleaned;
      }
      headTarget = null;
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        totalEmptyParagraphsDropped += 1;
        anomalies.push({ where: currentSectionId, note: 'A paragraph cleaned to empty text; dropped rather than emitted empty.' });
      } else {
        sectionParagraphs.push(cleaned);
      }
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      if (unitMatch?.[1] === 'Whiston_chapter') totalChapterMilestones += 1;
      else if (unitMatch?.[1] === 'Whiston_section') totalSectionMilestones += 1;
    } else if (/^<pb\b/.test(tok)) {
      totalPbMarkers += 1;
    } else if (/^<q\b/.test(tok)) {
      totalQTags += 1;
    } else if (/^<note\b/.test(tok) || /^<del\b/.test(tok) || /^<gap\b/.test(tok) || /^<add\b/.test(tok) || /^<foreign\b/.test(tok) || /^<hi\b/.test(tok)) {
      sawApparatusTag += 1;
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (<num>/</num> inside book heads, </q>, self-closing <pb/> etc.): no
    // structural action - their content, if any, already flows into
    // pBuf/headBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== EXPECTED_BOOKS) fail(`expected exactly ${EXPECTED_BOOKS} books, got ${divisions.length}`);
  if (sawApparatusTag !== 0) {
    fail(
      `expected zero <note>/<del>/<gap>/<add>/<foreign>/<hi> tags in this edition (confirmed by direct inspection) - ` +
        `found ${sawApparatusTag}; the handling code for these was never designed/reviewed against a real occurrence here`,
    );
  }

  const sectionCountMismatches: string[] = [];
  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTION_COUNTS[i]!;
    const got = b.children.length;
    if (got !== want) sectionCountMismatches.push(`Book ${i + 1}: parsed ${got} sections, expected ${want}`);
    // sanity: this source's own section numbering is continuous 1..count within each book
    b.children.forEach((sec, j) => {
      const wantN = String(j + 1);
      if (sec.number !== wantN) {
        anomalies.push({
          where: sec.id,
          note: `This book's own section numbering is not continuous here: division ${j + 1} in document order carries source n="${sec.number}", expected "${wantN}".`,
        });
      }
    });
  });
  if (sectionCountMismatches.length > 0) {
    fail(`section-count mismatch: ${sectionCountMismatches.join('; ')}`);
  }

  const emptySections = divisions.flatMap((b) => b.children.filter((s) => s.passages.length === 0 || s.passages[0]!.text.length === 0).map((s) => s.id));
  if (emptySections.length > 0) fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.join(', ')}`);

  // --- Book 6's own numeral idiosyncrasy (see module doc) ---
  const book6 = divisions[5];
  if (book6?.sourceHeading?.includes('[στιγμα]')) {
    anomalies.push({
      where: book6.id,
      note:
        'This source spells out Book 6\'s Greek numeral as the bracketed word "[στιγμα]" in its own <num> element, instead of the single stigma-numeral character ϛ used for the digit 6 elsewhere in Greek numeral notation (and unlike the plain single-letter numerals α/β/γ/δ/ε/ζ printed for every other book). Preserved exactly as printed in the source, not corrected.',
    });
  } else {
    anomalies.push({
      where: `${WORK_ID} / book headings`,
      note: `Expected Book 6's own heading to spell out its numeral as "[στιγμα]" (confirmed by direct inspection of the source); found "${book6?.sourceHeading ?? '(missing)'}" instead - re-check this by hand.`,
    });
  }

  // --- corpus-level anomalies ---
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `This edition carries no critical apparatus at all: <note>, <del>, <gap>, <add>, <foreign>, <hi> are all confirmed zero occurrences by direct inspection of the whole source file.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalQTags} <q rend="..."> typographic quotation-mark spans (91 with no rend attribute, 365 rend="merge") were unwrapped; the rend value has no field in this app's schema and is dropped as scaffolding, not logged individually given their number.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalPbMarkers} self-closing <pb/> page-break markers (no content) were dropped; nothing fabricated in their place.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `${totalChapterMilestones} <milestone unit="Whiston_chapter"/> and ${totalSectionMilestones} <milestone unit="Whiston_section"/> markers thread William Whiston's own English chapter/section citation scheme through this Greek text (matching the English sibling's own milestone counts exactly). This app's schema for this work has no field for a second citation system and Division.ref is null throughout per this work's own convention, so both marker types are dropped as scaffolding without affecting the reading text or any Division.ref.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs ---
  const work: GenericWork = { workId: WORK_ID, language: 'grc', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Ἰουδαϊκοῦ πολέμου πρὸς Ῥωμαίους',
    author: 'Flavius Josephus',
    language: 'grc',
    editor: 'Benedikt Niese',
    edition: 'Flavii Iosephi Opera, Vol. 6, ed. Benedikt Niese (Berlin: Weidmann, 1895)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository (CTS urn:cts:greekLit:tlg0526.tlg004.perseus-grc2), which digitises Niese\'s 1895 critical text of Josephus, The Jewish War (Ἰουδαϊκοῦ πολέμου πρὸς Ῥωμαίους); imported by scripts/import-jewish-war-grc. The raw file was fetched once at import time and is committed at scripts/import-jewish-war-grc/raw/tlg0526.tlg004.perseus-grc2.xml.',
    license:
      "Niese's 1895 Greek text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'The Jewish War — Greek',
        paragraphs: [
          'Flavius Josephus\'s account, in his own Greek, of the First Jewish-Roman War (66-73 AD), from the Hasmonean-era unrest that preceded it to the fall of Jerusalem and Masada. In seven books, it is Josephus\'s earliest work, written for a Greco-Roman audience in the 70s AD by a former Judean commander turned observer of, and participant in, the war\'s final Roman campaign.',
          'The text here is the original Greek, verbatim. Nothing is translated, modernised or silently corrected. An English translation (Whiston, 1737/1856) of the same textual tradition is bundled separately as jewish-war-en; see its own about.json - note that the two editions do not divide the text at matching points (see "Reference scheme" below).',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Benedikt Niese, ed., Flavii Iosephi Opera, Vol. 6 (Berlin: Weidmann, 1895). This edition is in the public domain.',
          'The work is divided into 7 Books and, within each Book, this edition\'s own continuously numbered sections (673 / 654 / 542 / 663 / 572 / 442 / 455, 4001 total) - see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file tlg0526.tlg004.perseus-grc2.xml (CTS urn:cts:greekLit:tlg0526.tlg004.perseus-grc2) from the Perseus Digital Library / OpenGreekAndLatin canonical-greekLit repository. It is fetched once by the importer and then bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section <div>s directly (there is no chapter-level div in this source) and collects each section\'s single <p> paragraph into that section\'s one Passage. XML transport scaffolding only is removed: purely typographic <q> quotation-mark wrappers are unwrapped, self-closing <pb/> page-break markers are dropped, and the Whiston_chapter/Whiston_section cross-reference milestones (see "Reference scheme") are dropped as scaffolding. Entities are decoded and runs of whitespace collapsed; the words are otherwise untouched. This edition carries no critical apparatus (<note>/<del>/<gap>/<add>) at all.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and Section, using this edition\'s own continuous per-book section numbering (Division.ref is null throughout - there is no separate, coarser reference level in this app\'s schema for this work). The source also threads William Whiston\'s own English chapter/section citation scheme through the Greek text via inline milestones (for cross-reference to older English-language scholarship); those milestones are not represented in this app\'s schema and are dropped without affecting the reading text.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 7 Books and all 4001 of this edition\'s own sections are present and in order; the bundled TEI file is identical to the current Perseus canonical-greekLit release.',
          'No critical apparatus. Unlike several other works in this library, this edition carries no <note>/<del>/<gap>/<add> apparatus at all - confirmed by direct inspection.',
          'Book 6\'s numeral. This source spells out Book 6\'s own heading numeral as the bracketed word "[στιγμα]" rather than the single stigma-numeral character used for 6 elsewhere in Greek numeral notation - preserved exactly as printed, not corrected.',
          'Edition mismatch with the English sibling. This Greek edition\'s own section numbering (4001 sections, fine-grained, one Niese section per printed paragraph) does not match the English translation\'s own section numbering (707 sections, William Whiston\'s coarser paragraph divisions) - each Division.number is this edition\'s own printed number, not remapped to the other edition\'s scheme. See jewish-war-en\'s own about.json for the full account.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ---
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const s of b.children) {
      totalPassages += s.passages.length;
      totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    const want = EXPECTED_SECTION_COUNTS[Number(b.number) - 1];
    process.stdout.write(
      `  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(4)} sections (expected ${want})  "${b.sourceHeading}"\n`,
    );
  }
  process.stdout.write(
    `\n  7 books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalChapterMilestones} Whiston_chapter  ${totalSectionMilestones} Whiston_section  ${totalPbMarkers} <pb/>  ${totalQTags} <q>\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-jewish-war-grc/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main().catch((err) => {
  process.stderr.write(`STOP (${WORK_ID}): ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
