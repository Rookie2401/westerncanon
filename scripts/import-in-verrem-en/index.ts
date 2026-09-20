/**
 * Cicero, *In Verrem* — English translation (Charles Duke Yonge, "Against
 * Verres", in *The Orations of Marcus Tullius Cicero, Volume 1*, London:
 * Bell, 1903), via the Perseus/OpenGreekAndLatin canonical-latinLit TEI.
 * Run-once ingestion pipeline.
 *
 *   npm run import:in-verrem-en
 *
 * Reads scripts/import-in-verrem-en/raw/phi0474.phi005.perseus-eng2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi005/phi0474.phi005.perseus-eng2.xml
 * CTS urn:cts:latinLit:phi0474.phi005.perseus-eng2, cached in the repo).
 * Writes:
 *   data/in-verrem-en/work.json       — the GenericWork (2 Actiones, 6 Books, 974 Sections)
 *   data/in-verrem-en/about.json      — provenance / licence / prose
 *   data/in-verrem-en/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npm run validate:in-verrem-en`.
 *
 * Same three-level Actio -> Book -> Section div structure as the Latin
 * sibling (confirmed by direct inspection — no structural inversion, and
 * the section/chapter encoding matches the Latin exactly). Section counts
 * per book (56 / 158, 192, 228, 151, 189 — 974 total) and chapter-count
 * maxima per book (18 / 61, 78, 98, 67, 72) both independently confirmed
 * identical to the Latin sibling.
 *
 * One structural addition not present in the Latin sibling: every one of
 * the 6 books opens with a `<div type="commentary" resp="editor">` (no
 * `subtype=` attribute at all — a different encoding from the `subtype=
 * "commentary"`/`"argument"` divs in the other English Cicero witnesses in
 * this corpus, so it needs its own explicit recognition here) headed "The
 * Argument" — Yonge's own prose summary of that book's background, not a
 * translation of Cicero's words. Excluded from the reading text, tracked
 * explicitly via the div stack exactly like the In Catilinam/Philippics
 * English siblings' commentary/argument divs.
 *
 * Markup handled:
 *   - `<note>...</note>` (95) is Yonge's own translator footnote —
 *     excluded entirely, tag and content, summarised once (too many to log
 *     individually here).
 *   - `<gap reason="lost"/>` (1, self-closing, no content, at the very end
 *     of Actio 2 Book 4) marks a genuine lacuna — nothing to preserve, no
 *     text fabricated, logged individually.
 *   - `<milestone unit="Para"/>` (capitalised, no `n=`) is paragraph-
 *     numbering scaffolding like the other English Cicero witnesses'
 *     lower-case "para" — zero-width, dropped without logging.
 *   - `<foreign>` (298 outside any `<note>`) and one `<hi rend="italic">`
 *     outside a `<note>` (ordinary emphasis, e.g. "his") are unwrapped
 *     typographic markup — no content decision.
 *   - Each Book prints one or two of its own `<head>` rubrics before its
 *     first section; the LAST one is captured verbatim as that Book's
 *     Division.sourceHeading, mirroring the Latin sibling's own rule (for
 *     Actio 2 this is the English rendering of the traditional subtitle).
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * English (Yonge's own wording) reading text only.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/in-verrem-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi005.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'in-verrem-en');

const WORK_ID = 'in-verrem-en';
const EXPECTED_ACTIOS = 2;
const EXPECTED_BOOKS_PER_ACTIO: Record<number, number> = { 1: 1, 2: 5 };

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 200): string => {
  const c = s.replace(/\s+/g, ' ').trim();
  return c.length > max ? `${c.slice(0, max)}…` : c;
};

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe = /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'actio' | 'book' | 'section' | 'commentary' | 'other';
  const stack: Frame[] = [];

  let currentActioNum = 0;
  let currentActioDiv: Division | null = null;
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let awaitingBookHead = false;
  let inHead = false;
  let headBuf = '';

  let currentChapterNum: string | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;

  let totalSections = 0;
  let totalNotes = 0;
  let totalGaps = 0;
  let totalCommentaryParagraphsSkipped = 0;
  let totalEmptyParagraphsDropped = 0;
  let sectionsWithNoRef = 0;

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) fail(`${currentSectionId} has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (currentChapterNum === null) {
      sectionsWithNoRef += 1;
      anomalies.push({
        where: currentSectionId,
        note: 'No chapter milestone precedes this section yet in this book; Division.ref left null rather than fabricated.',
      });
    }
    const div: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: currentChapterNum,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(div);
    totalSections += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (noteDepth === 0) {
        if (inHead) headBuf += free;
        else if (inP) pBuf += free;
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (noteDepth > 0) {
      if (/^<note\b/.test(tok)) noteDepth += 1;
      else if (tok === '</note>') {
        noteDepth -= 1;
        totalNotes += 1;
      }
      continue;
    }

    if (/^<div\b/.test(tok)) {
      if (isTextpartDiv(tok, 'actio')) {
        const n = Number(attrValue(tok, 'n'));
        if (!Number.isFinite(n) || n < 1 || n > EXPECTED_ACTIOS) fail(`unexpected actio number in div "${tok}"`);
        stack.push('actio');
        currentActioNum = n;
        currentActioDiv = {
          id: `actio-${n}`,
          number: String(n),
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        divisions.push(currentActioDiv);
      } else if (isTextpartDiv(tok, 'book')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`book div missing n= attribute: "${tok}"`);
        if (!currentActioDiv) fail(`book div found outside any actio: "${tok}"`);
        stack.push('book');
        currentBookNum = Number(n);
        currentChapterNum = null;
        awaitingBookHead = true;
        currentBookDiv = {
          id: `actio-${currentActioNum}-book-${n}`,
          number: n,
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        currentActioDiv.children.push(currentBookDiv);
      } else if (isTextpartDiv(tok, 'section')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`section div missing n= attribute: "${tok}"`);
        stack.push('section');
        currentSectionNum = n;
        currentSectionId = `actio-${currentActioNum}-book-${currentBookNum}-sec-${n}`;
        sectionParagraphs = [];
        awaitingBookHead = false;
      } else if (/type="commentary"/.test(tok)) {
        // Every book opens with one of these (six total, resp="editor",
        // headed "The Argument") — Yonge's own prose summary, not part of
        // his translation of Cicero's words. Unlike the other English
        // Cicero witnesses in this corpus, this div carries type=
        // "commentary" directly (no subtype= attribute at all), which is
        // why it needs its own explicit branch here rather than falling
        // under isTextpartDiv (which requires type="textpart").
        stack.push('commentary');
        awaitingBookHead = false;
      } else {
        stack.push('other');
        awaitingBookHead = false;
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
      else if (kind === 'actio') currentActioDiv = null;
    } else if (/^<head\b/.test(tok)) {
      if (awaitingBookHead && !inHead) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        if (currentBookDiv && awaitingBookHead) {
          currentBookDiv.sourceHeading = cleanText(headBuf);
        }
      }
    } else if (/^<milestone\b/.test(tok)) {
      if (/unit="chapter"/.test(tok)) {
        const n = attrValue(tok, 'n');
        if (n) currentChapterNum = n;
      }
    } else if (/^<gap\b/.test(tok)) {
      totalGaps += 1;
      anomalies.push({
        where: currentSectionId || `actio-${currentActioNum}-book-${currentBookNum}`,
        note: `<gap reason="lost"/> — the source marks a genuine lacuna here; nothing to preserve, no text fabricated.`,
      });
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      const top = stack[stack.length - 1];
      if (top === 'section') {
        if (cleaned.length === 0) {
          totalEmptyParagraphsDropped += 1;
          anomalies.push({ where: currentSectionId, note: 'A paragraph cleaned to empty text; dropped rather than emitted empty.' });
        } else {
          sectionParagraphs.push(cleaned);
        }
      } else if (top === 'commentary') {
        totalCommentaryParagraphsSkipped += 1;
      } else {
        fail(`<p> found with unexpected enclosing div (stack top: "${top}"); text: "${excerpt(cleaned)}"`);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    }
    // catch-all `<[^>]+>` (head/foreign/hi and any other tag): no structural
    // action, text flows via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_ACTIOS) fail(`expected exactly ${EXPECTED_ACTIOS} actiones, got ${divisions.length}`);

  const bookCountMismatches: string[] = [];
  divisions.forEach((ac) => {
    const num = Number(ac.number);
    const want = EXPECTED_BOOKS_PER_ACTIO[num];
    if (want !== undefined && ac.children.length !== want) {
      bookCountMismatches.push(`Actio ${num}: parsed ${ac.children.length} books, expected ${want}`);
    }
  });
  if (bookCountMismatches.length > 0) fail(`book-count mismatch: ${bookCountMismatches.join('; ')}`);

  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> translator footnotes were excluded entirely, tag and content; not logged individually given their number.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalCommentaryParagraphsSkipped} paragraph(s) of Yonge's own "The Argument" editorial introduction (one per book, in a <div type="commentary"> — note: no subtype= attribute at all in this witness, unlike the other English Cicero witnesses in this corpus) were excluded — historical background prose, not a translation of Cicero's own words.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref (Section only) is the nearest preceding <milestone unit="chapter"> value within that section's own book (chapter numbering restarts at 1 per book); ${sectionsWithNoRef} section(s) had none yet and are individually logged above. Every Passage.ref is null.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Against Verres',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: 'The Orations of Marcus Tullius Cicero, Volume 1, trans. Charles Duke Yonge (London: Bell, 1903), "Against Verres"',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi005.perseus-eng2), which digitises Yonge\'s translation; imported by scripts/import-in-verrem-en. The raw file is committed at scripts/import-in-verrem-en/raw/phi0474.phi005.perseus-eng2.xml.',
    license:
      "Yonge's translation is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's In Verrem, in English",
        paragraphs: [
          "The English translation, by Charles Duke Yonge (1903), of Cicero's prosecution of Gaius Verres in 70 BC — a facing English rendering of the Latin text already in this library (data/in-verrem-la). Actio 1 is the short speech that opened the trial; Actio 2's five books (never actually delivered — Verres fled into exile first) were published as written speeches.",
          "The text here is Yonge's translation, verbatim; nothing is further modernised or paraphrased. Yonge's own footnotes are excluded — see \"How it was imported\".",
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., The Orations of Marcus Tullius Cicero, Volume 1 (London: George Bell and Sons, 1903), "Against Verres". Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi005.perseus-eng2.xml (CTS urn:cts:latinLit:phi0474.phi005.perseus-eng2) from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Same three-level Actio -> Book -> Section structure as the Latin sibling, independently parsed but confirmed to divide identically (974 sections, same per-book split, same chapter-count maxima). Each Book\'s Division.sourceHeading is the LAST of its one-or-two rubric <head>s (mirroring the Latin sibling\'s own rule) — for Actio 2 this is the English rendering of the traditional subject subtitle. Every book also opens with a "The Argument" editorial div (Yonge\'s own background summary), explicitly recognised and excluded, never silently merged into a Section\'s passage.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation matches the Latin sibling: Actio, Book, and Section (this witness\'s own numbering), plus the traditional chapter reference as each Section\'s Division.ref, reconstructed from this witness\'s own inline chapter milestones (confirmed at the same positions as the Latin). Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'All 2 actiones, 6 books, and 974 sections are present and in order, matching the Latin sibling exactly. One <gap reason="lost"/> (end of Actio 2 Book 4) marks a genuine lacuna in the source. See anomalies.json for every section with no preceding chapter milestone.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  process.stdout.write('\nActiones / Books:\n');
  for (const ac of divisions) {
    process.stdout.write(`  Actio ${ac.number}  ${ac.id}\n`);
    for (const bk of ac.children) {
      process.stdout.write(`    Book ${bk.number}  ${bk.id.padEnd(16)} ${String(bk.children.length).padStart(3)} sections  "${bk.sourceHeading ?? ''}"\n`);
    }
  }
  process.stdout.write(
    `\n  ${divisions.length} actiones  ${totalSections} sections  ${totalNotes} <note>  ${totalGaps} <gap>  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:in-verrem-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
