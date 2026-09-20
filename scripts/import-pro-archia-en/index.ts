/**
 * Cicero, *Pro Archia Poeta* - English translation (Charles Duke Yonge,
 * *The Orations of Marcus Tullius Cicero, Volume 2*, London: Bell, 1856;
 * "For Archias"; CTS urn:cts:latinLit:phi0474.phi016.perseus-eng2).
 * Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-pro-archia-en/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-pro-archia-en/raw/phi0474.phi016.perseus-eng2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/pro-archia-en/work.json       - the GenericWork (flat list of 32
 *                                         numbered sections, one Passage each)
 *   data/pro-archia-en/about.json      - provenance / licence / prose
 *   data/pro-archia-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-pro-archia-la/validate.ts` (shared
 * validator for this speech's Latin+English pair).
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * <body><div type="translation"><head>THE SPEECH OF M. T. CICERO FOR AULUS
 *   LICINIUS ARCHIAS, THE POET</head>
 *   <div type="textpart" subtype="commentary" resp="editor">
 *     <head>THE ARGUMENT.</head> <p>...</p>
 *   </div>
 *   <div type="textpart" subtype="section" n="1"> <p>...</p> </div>
 *   ...
 * </div></body>
 * Same flat 32-section structure and independent inline
 * `<milestone unit="chapter"/>` markers as the Latin sibling (see
 * data/pro-archia-la/types.ts for the Division.ref convention) - PLUS one
 * extra front-matter division this Latin witness does not have: a
 * `subtype="commentary"` block holding "THE ARGUMENT", Yonge's/Perseus's
 * own prose synopsis of the whole speech, printed once before section 1,
 * not tied to any numbered section.
 *
 * Handling of "THE ARGUMENT": this is editorial framing - a synopsis
 * written for the reader, not part of Cicero's oration Yonge is
 * translating - structurally separate from, and prior to, the numbered
 * section sequence this app's flat sec-N schema captures. Unlike
 * scripts/import-aristotle-posterior-analytics-en's Bouchier "argument"
 * (which is genuinely tied to each individual numbered chapter and is kept
 * as that chapter's opening paragraph), this is a single whole-speech
 * synopsis with no numbered home of its own in this schema, so it is
 * excluded from the reading text - logged once, honestly, as an anomaly
 * rather than silently dropped or forced into an invented "sec-0".
 *
 * Apparatus: `<note anchored="true">` - Yonge's own translator footnotes
 * (explaining puns, textual cruxes, historical background) - confirmed by
 * direct inspection to occur only where a translator would add one, never
 * carrying Cicero's own words; dropped entirely, tag and content, the same
 * treatment as Rackham's notes in the Nicomachean Ethics import.
 *
 * Faithfulness rules mirror the Latin sibling; additionally this witness's
 * `<foreign xml:lang="la">` (untranslated Latin technical terms Yonge
 * leaves in the original), `<persName>`, `<placeName>`, `<title>` and
 * `<pb n=".."/>` (physical page-break marker, zero-width) are unwrapped /
 * dropped the same way as the equivalent tags in
 * scripts/import-aristotle-nicomachean-ethics-en.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/pro-archia-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0474.phi016.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'pro-archia-en');

const WORK_ID = 'pro-archia-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi016/phi0474.phi016.perseus-eng2.xml';
const EXPECTED_SECTIONS = 32;

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

async function ensureRawXml(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  mkdirSync(RAW_DIR, { recursive: true });
  process.stdout.write(`raw XML not found, downloading from ${SOURCE_URL} ...\n`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(RAW_XML, buf);
  process.stdout.write(`saved ${buf.length} bytes to ${RAW_XML}\n`);
}

function parseEnglishOration(xml: string, anomalies: Anomaly[]): { divisions: Division[]; totalNotes: number; totalChapterMilestones: number; droppedFrontMatterParagraphs: number; totalEmptyParagraphsDropped: number } {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<milestone\b[^>]*\/>|<div\b[^>]*>|<[^>]+>/g;

  const divisions: Division[] = [];
  const stack: Array<'section' | 'other'> = [];

  let currentChapter: string | null = null;
  let currentSectionId = '';
  let currentSectionNum = '';
  let currentSectionRef: string | null = null;
  let paragraphs: string[] = [];

  let inP = false;
  let pBuf = '';
  let noteDepth = 0;

  let totalNotes = 0;
  let totalChapterMilestones = 0;
  let totalEmptyParagraphsDropped = 0;
  let droppedFrontMatterParagraphs = 0;

  function openSection(n: string): void {
    currentSectionId = `sec-${n}`;
    currentSectionNum = n;
    currentSectionRef = currentChapter;
    paragraphs = [];
  }

  function closeSection(): void {
    if (paragraphs.length === 0) fail(`section "${currentSectionId}" has no surviving paragraph text`);
    const passage: Passage = { n: '', text: paragraphs.join('\n\n'), ref: null };
    divisions.push({
      id: currentSectionId,
      number: currentSectionNum,
      ref: currentSectionRef,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    });
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inP && noteDepth === 0) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      stack.push('section');
      openSection(m[1]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      if (cleaned.length === 0) {
        if (currentSectionId) {
          totalEmptyParagraphsDropped += 1;
          anomalies.push({
            where: currentSectionId,
            note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
          });
        }
      } else if (currentSectionId) {
        paragraphs.push(cleaned);
      } else {
        // a <p> that closed before any section opened yet - this is "THE
        // ARGUMENT" front-matter commentary (see the module doc); excluded
        // from the reading text by design, not by accident.
        droppedFrontMatterParagraphs += 1;
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      if (noteDepth === 0) totalNotes += 1;
    } else if (/^<milestone\b/.test(tok)) {
      if (noteDepth === 0) {
        const unitMatch = /unit="([^"]+)"/.exec(tok);
        const nMatch = /\sn="([^"]+)"/.exec(tok);
        if (unitMatch?.[1] === 'chapter' && nMatch?.[1]) {
          currentChapter = nMatch[1];
          totalChapterMilestones += 1;
        }
      }
    }
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);

  return { divisions, totalNotes, totalChapterMilestones, droppedFrontMatterParagraphs, totalEmptyParagraphsDropped };
}

async function main(): Promise<void> {
  await ensureRawXml();
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const anomalies: Anomaly[] = [];
  const { divisions, totalNotes, totalChapterMilestones, droppedFrontMatterParagraphs, totalEmptyParagraphsDropped } = parseEnglishOration(xml, anomalies);

  if (divisions.length !== EXPECTED_SECTIONS) {
    anomalies.push({
      where: `${WORK_ID} / section count`,
      note: `Parsed ${divisions.length} sections; the traditionally cited count for this speech is ${EXPECTED_SECTIONS}. Reported honestly, not forced.`,
    });
  }
  divisions.forEach((d, i) => {
    const want = String(i + 1);
    if (d.number !== want) fail(`section out of order/number: divisions[${i}] has number ${JSON.stringify(d.number)}, expected "${want}"`);
  });

  anomalies.push({
    where: `${WORK_ID} / apparatus`,
    note: `${totalNotes} <note anchored="true"> footnotes (Yonge's own translator's commentary - explaining puns, textual cruxes, historical background; not Cicero's own words) were excluded entirely, tag and content.`,
  });
  anomalies.push({
    where: `${WORK_ID} / Division.ref`,
    note: `${totalChapterMilestones} <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-archia-la/types.ts. Passage.ref is null throughout.`,
  });
  if (droppedFrontMatterParagraphs > 0) {
    anomalies.push({
      where: `${WORK_ID} / (work level) front matter`,
      note: `This witness carries one further division the Latin sibling does not: a <div subtype="commentary"> holding "THE ARGUMENT" (${droppedFrontMatterParagraphs} paragraph(s)), a whole-speech synopsis printed once before section 1, not tied to any numbered section. It is editorial framing for the reader, not part of the translated oration itself, and this app's flat sec-N schema has no slot for a division that precedes section 1 - it is therefore excluded from the reading text rather than invented into a spurious "sec-0". Flagged here for independent review, not silently dropped: a reader wanting Yonge's/Perseus's synopsis should consult the raw XML at scripts/import-pro-archia-en/raw/.`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'For Archias',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: 'The Orations of Marcus Tullius Cicero, Volume 2, trans. Charles Duke Yonge (London: Bell, 1856), "For A. L. Archias"',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0474.phi016.perseus-eng2), digitising Charles Duke Yonge\'s translation "For A. L. ' +
      'Archias" (London: Bell, 1856); imported by scripts/import-pro-archia-en. The raw file is fetched once ' +
      '(cached at scripts/import-pro-archia-en/raw/) and bundled with the app; nothing is loaded from the ' +
      'network at runtime.',
    license:
      'Yonge\'s 1856 translation is in the public domain (published well over 95 years ago). The digital ' +
      'transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit ' +
      'under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Cicero\'s Pro Archia Poeta - English, trans. Yonge',
        paragraphs: [
          'This is Cicero\'s defence of the poet Archias, in the English translation made by Charles Duke ' +
            'Yonge for Bell\'s Bohn\'s Classical Library, 1856. It stands alongside the Latin text (Clark, ' +
            '1911) already in this library as a facing English rendering of the same speech.',
          'The text here is Yonge\'s translation, verbatim. Nothing is further modernised, paraphrased or ' +
            'silently corrected. Yonge\'s own footnotes (translator\'s commentary, not part of the translated ' +
            'running text) are excluded - see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., The Orations of Marcus Tullius Cicero, Volume 2 (London: Bell, 1856), ' +
            'this speech titled "For A. L. Archias". The speech is divided into 32 numbered sections, matching ' +
            'the Latin sibling exactly, plus the same independent, coarser "chapter" numbering marked inline.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi016.perseus-eng2.xml (CTS ' +
            'urn:cts:latinLit:phi0474.phi016.perseus-eng2) from the Perseus Digital Library / ' +
            'OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the flat sequence of section <div>s and collects every <p> paragraph within each ' +
            'into that section\'s single Passage. Only transport/editorial scaffolding is removed: Yonge\'s own ' +
            'footnotes (every <note>), the inline chapter <milestone> markers (their values instead seed each ' +
            'section\'s Division.ref), page-break <pb/> markers, and purely typographic wrapper tags ' +
            '(<foreign>, <persName>, <placeName>, <title>) are unwrapped or dropped. This witness also carries ' +
            'a whole-speech "THE ARGUMENT" synopsis before section 1, which is excluded from the reading text ' +
            '- see "Known gaps & anomalies". Entities are decoded and runs of whitespace collapsed.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by section number (1-32), plus the traditional Roman-numeral "chapter" citation this ' +
            'edition also prints inline. A section\'s Division.ref is the chapter number active at that ' +
            'section\'s start. Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: all 32 sections are present, in ' +
            'order, matching the Latin sibling section-for-section; Yonge\'s own footnotes are excluded as ' +
            'translator apparatus; the whole-speech "THE ARGUMENT" synopsis printed before section 1 is ' +
            'excluded from the reading text as editorial framing with no numbered home in this schema (flagged ' +
            'for independent review, not silently dropped).',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  let totalChars = 0;
  for (const d of divisions) totalChars += d.passages.reduce((n, p) => n + p.text.length, 0);
  process.stdout.write(`\n  ${divisions.length} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalNotes} <note>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`);
  process.stdout.write('\nDone. Run `npx tsx scripts/import-pro-archia-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
