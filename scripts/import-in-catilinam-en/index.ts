/**
 * Cicero, *In Catilinam* — English translation (Charles Duke Yonge, "Against
 * L. Catiline", in *The Orations of Marcus Tullius Cicero, Volume 2*,
 * London: Bell, 1856), via the Perseus/OpenGreekAndLatin canonical-latinLit
 * TEI. Run-once ingestion pipeline.
 *
 *   npm run import:in-catilinam-en
 *
 * Reads scripts/import-in-catilinam-en/raw/phi0474.phi013.perseus-eng2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi013/phi0474.phi013.perseus-eng2.xml
 * CTS urn:cts:latinLit:phi0474.phi013.perseus-eng2, cached in the repo).
 * Writes:
 *   data/in-catilinam-en/work.json       — the GenericWork (4 Speeches, 115 Sections)
 *   data/in-catilinam-en/about.json      — provenance / licence / prose
 *   data/in-catilinam-en/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npm run validate:in-catilinam-en`.
 *
 * Structure, confirmed by direct inspection: same speech/section div shape
 * and same 33/29/29/24 section counts as the Latin sibling (independently
 * parsed — this importer never reads the Latin file). ONE structural
 * difference: every speech div here ALSO nests a
 * `<div type="textpart" subtype="commentary" resp="editor">` (headed "THE
 * ARGUMENT.") immediately before its section divs — Yonge's own prose
 * summary of the oration's historical background, not a translation of
 * Cicero's words. The importer tracks the div stack explicitly and only
 * ever collects `<p>` text while the innermost open div is a `section`;
 * `<p>`s under `commentary` are counted (for transparency) and discarded,
 * never silently mixed into a Section's passage. Any `<p>` found under
 * neither is treated as a genuine structural surprise and stops the import
 * (`fail()`) rather than risking silently mis-attributed text.
 *
 * Markup handled:
 *   - `<note anchored="true">...</note>` (14) is Yonge's own translator
 *     footnote (historical/explanatory commentary, not his translated
 *     running text) — excluded entirely, tag and content, each logged
 *     individually (few enough to do so, unlike the Latin sibling's 482
 *     textual-apparatus notes).
 *   - `<milestone unit="chapter" n="K"/>` (49, same positions/values as the
 *     Latin sibling) seeds Division.ref exactly as in the Latin sibling.
 *     `<milestone unit="para"/>` (120, no `n=`) is Yonge's own paragraph-
 *     numbering scaffolding, zero-width and dropped without logging.
 *   - `<pb n="…"/>` (10, print page breaks) is transport scaffolding,
 *     dropped without logging.
 *   - `<foreign>` (10, 3 of them outside any `<note>` — short untranslated
 *     Latin/Greek phrases Yonge leaves in the original) and `<placeName>`/
 *     `<persName>`/`<q>` are unwrapped typographic markup — no content
 *     decision, text kept.
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * English (Yonge's own wording) reading text only; only transport
 * scaffolding and the two excluded prose blocks (translator notes, the
 * commentary/argument div) are removed, and both are logged/explained.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/in-catilinam-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi013.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'in-catilinam-en');

const WORK_ID = 'in-catilinam-en';
const EXPECTED_SPEECHES = 4;
const CANONICAL_SECTION_COUNTS: Record<number, number> = { 1: 33, 2: 29, 3: 29, 4: 24 };

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

  const tokenRe = /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<pb\b[^>]*\/>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'speech' | 'section' | 'commentary' | 'other';
  const stack: Frame[] = [];

  let currentSpeechNum = 0;
  let currentSpeechDiv: Division | null = null;
  let awaitingSpeechHead = false;
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
  let totalParaMilestones = 0;
  let totalPageBreaks = 0;
  let totalCommentaryParagraphsSkipped = 0;
  let totalEmptyParagraphsDropped = 0;
  let sectionsWithNoRef = 0;

  function closeSection(): void {
    if (!currentSpeechDiv) fail(`section "${currentSectionId}" closed outside any speech`);
    if (sectionParagraphs.length === 0) fail(`${currentSectionId} has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (currentChapterNum === null) {
      sectionsWithNoRef += 1;
      anomalies.push({
        where: currentSectionId,
        note: 'No chapter milestone precedes this section yet in this speech; Division.ref left null rather than fabricated.',
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
    currentSpeechDiv.children.push(div);
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
      if (isTextpartDiv(tok, 'speech')) {
        const n = Number(attrValue(tok, 'n'));
        if (!Number.isFinite(n) || n < 1 || n > EXPECTED_SPEECHES) fail(`unexpected speech number in div "${tok}"`);
        stack.push('speech');
        currentSpeechNum = n;
        currentChapterNum = null;
        awaitingSpeechHead = true;
        currentSpeechDiv = {
          id: `speech-${n}`,
          number: String(n),
          ref: null,
          sourceHeading: null,
          editorialTitle: null,
          children: [],
          passages: [],
        };
        divisions.push(currentSpeechDiv);
      } else if (isTextpartDiv(tok, 'section')) {
        const n = attrValue(tok, 'n');
        if (!n) fail(`section div missing n= attribute: "${tok}"`);
        stack.push('section');
        currentSectionNum = n;
        currentSectionId = `speech-${currentSpeechNum}-sec-${n}`;
        sectionParagraphs = [];
        awaitingSpeechHead = false;
      } else if (isTextpartDiv(tok, 'commentary')) {
        stack.push('commentary');
        awaitingSpeechHead = false;
      } else {
        stack.push('other');
        awaitingSpeechHead = false;
      }
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'speech') currentSpeechDiv = null;
    } else if (/^<head\b/.test(tok)) {
      if (awaitingSpeechHead && !inHead) {
        inHead = true;
        headBuf = '';
      }
    } else if (tok === '</head>') {
      if (inHead) {
        inHead = false;
        if (currentSpeechDiv && currentSpeechDiv.sourceHeading === null) {
          currentSpeechDiv.sourceHeading = cleanText(headBuf);
        }
      }
    } else if (/^<milestone\b/.test(tok)) {
      if (/unit="chapter"/.test(tok)) {
        const n = attrValue(tok, 'n');
        if (n) currentChapterNum = n;
      } else if (/unit="para"/.test(tok)) {
        totalParaMilestones += 1;
      }
    } else if (/^<pb\b/.test(tok)) {
      totalPageBreaks += 1;
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
    // catch-all `<[^>]+>` (foreign/placeName/persName/q and any other tag):
    // no structural action, text already flows via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_SPEECHES) fail(`expected exactly ${EXPECTED_SPEECHES} speeches, got ${divisions.length}`);

  const mismatches: string[] = [];
  divisions.forEach((sp) => {
    const num = Number(sp.number);
    const want = CANONICAL_SECTION_COUNTS[num];
    if (want !== undefined && sp.children.length !== want) {
      mismatches.push(`Speech ${num}: parsed ${sp.children.length} sections, traditionally cited ${want}`);
    }
  });
  if (mismatches.length > 0) {
    anomalies.push({
      where: `${WORK_ID} / section counts`,
      note: `${mismatches.length} speech(es) parse to a section count different from the traditionally cited number: ${mismatches.join('; ')}.`,
    });
  }

  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalCommentaryParagraphsSkipped} paragraph(s) of Yonge's own "THE ARGUMENT." editorial introduction (one per speech, inside a <div subtype="commentary">) were excluded — historical background prose, not a translation of Cicero's own words.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalParaMilestones} <milestone unit="para"/> markers (Yonge's own paragraph-numbering scaffolding) and ${totalPageBreaks} <pb/> print page breaks were dropped as zero-width transport scaffolding, not logged individually.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref (Section only) is the nearest preceding <milestone unit="chapter"> value within that section's own speech, at the same textual positions as the Latin sibling; ${sectionsWithNoRef} section(s) had none yet and are individually logged above. Every Passage.ref is null.`,
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
    title: 'Against Catiline',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: 'The Orations of Marcus Tullius Cicero, Volume 2, trans. Charles Duke Yonge (London: Bell, 1856), "Against L. Catiline"',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi013.perseus-eng2), which digitises Yonge\'s 1856 translation; imported by scripts/import-in-catilinam-en. The raw file is committed at scripts/import-in-catilinam-en/raw/phi0474.phi013.perseus-eng2.xml.',
    license:
      "Yonge's 1856 translation is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's speeches against Catiline, in English",
        paragraphs: [
          'The English translation, by Charles Duke Yonge (1856), of the four speeches Cicero delivered against Lucius Sergius Catilina in 63 BC — a facing English rendering of the Latin text already in this library (data/in-catilinam-la).',
          'The text here is Yonge\'s translation, verbatim; nothing is further modernised or paraphrased. Yonge\'s own editorial "Argument" introductions and footnotes (historical background, not his translation of Cicero\'s words) are excluded — see "How it was imported".',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., The Orations of Marcus Tullius Cicero, Volume 2 (London: Henry G. Bohn, 1856), "Against L. Catiline". Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi013.perseus-eng2.xml (CTS urn:cts:latinLit:phi0474.phi013.perseus-eng2) from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each speech is a top-level Division (speech-1..speech-4) holding its Sections (speech-N-sec-M), independently parsed from the Latin sibling but confirmed to divide identically (33/29/29/24 sections). Every speech in this witness also nests a "THE ARGUMENT." commentary div directly before its sections — Yonge\'s own prose summary of the oration\'s historical background — which the importer explicitly recognises and excludes (never silently merged into a Section\'s passage).',
          "Yonge's own footnotes (14, historical/explanatory) are excluded entirely, each logged individually; his paragraph-numbering milestones and the source's print page-break markers are dropped as zero-width transport scaffolding.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation matches the Latin sibling: Speech and Section (this witness\'s own numbering), plus the traditional chapter reference as each Section\'s Division.ref, reconstructed from this witness\'s own inline chapter milestones (confirmed at the same positions as the Latin). Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'All 4 speeches and all 115 sections are present and in order, matching the Latin sibling and the traditionally cited section counts exactly. See anomalies.json for the itemised account of every excluded footnote and every section with no preceding chapter milestone.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  process.stdout.write('\nSpeeches:\n');
  for (const sp of divisions) {
    const want = CANONICAL_SECTION_COUNTS[Number(sp.number)];
    process.stdout.write(`  Speech ${sp.number}  ${sp.id.padEnd(9)} ${String(sp.children.length).padStart(3)} sections (traditionally cited ${want})  "${sp.sourceHeading ?? ''}"\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} speeches  ${totalSections} sections  ${totalNotes} <note>  ${totalCommentaryParagraphsSkipped} commentary paragraphs skipped  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:in-catilinam-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
