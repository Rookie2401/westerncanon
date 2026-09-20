/**
 * Cicero, *Pro S. Roscio Amerino* - English translation (Charles Duke
 * Yonge, *The Orations of Marcus Tullius Cicero, Volume 1*, London: Bell,
 * 1903; "For Sextus Roscius of Ameria"; CTS
 * urn:cts:latinLit:phi0474.phi002.perseus-eng2). Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-pro-roscio-amerino-en/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-pro-roscio-amerino-en/raw/phi0474.phi002.perseus-eng2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/pro-roscio-amerino-en/work.json       - flat list of 154 numbered
 *                                                 sections, one Passage each
 *   data/pro-roscio-amerino-en/about.json      - provenance / licence / prose
 *   data/pro-roscio-amerino-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-pro-roscio-amerino-la/validate.ts`
 * (shared validator for this speech's Latin+English pair).
 *
 * Source structure mirrors scripts/import-pro-archia-en's module doc
 * exactly: `<div type="translation">` -> a `<div type="commentary"
 * resp="ed">` holding "The Argument" (excluded from the reading text for
 * the same reason as Pro Archia's - see that importer's module doc) ->
 * then flat `<div type="textpart" subtype="section" n="N" resp="perseus">`
 * siblings, each usually one `<p>`, with inline `<milestone n="N"
 * unit="chapter" resp="yonge"/>` markers (Yonge's own chapter numbering,
 * independent of and coarser than the section numbers) seeding
 * Division.ref, plus zero-width `<milestone unit="Para"/>` markers
 * (confirmed to carry no "n" - pure paragraph-position noise, dropped).
 *
 * Apparatus: `<note anchored="true">` - confirmed by direct inspection to
 * be exclusively Yonge's own translator footnotes (explaining puns,
 * historical background, cross-references, even one embedded fragment of
 * Ennius quoted as `<l>` inside a `<quote>` with its own footnote) -
 * dropped entirely, tag and content, the same treatment as every other
 * translator-footnote apparatus in this app.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/pro-roscio-amerino-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0474.phi002.perseus-eng2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'pro-roscio-amerino-en');

const WORK_ID = 'pro-roscio-amerino-en';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi002/phi0474.phi002.perseus-eng2.xml';
const EXPECTED_SECTIONS = 154;

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
    note: `${totalNotes} <note anchored="true"> footnotes (Yonge's own translator's commentary - explaining puns, textual cruxes, historical background, and one embedded verse citation from Ennius) were excluded entirely, tag and content.`,
  });
  anomalies.push({
    where: `${WORK_ID} / Division.ref`,
    note: `${totalChapterMilestones} <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-roscio-amerino-la/types.ts. Passage.ref is null throughout.`,
  });
  if (droppedFrontMatterParagraphs > 0) {
    anomalies.push({
      where: `${WORK_ID} / (work level) front matter`,
      note: `This witness carries one further division the Latin sibling does not: a <div subtype="commentary"> holding "The Argument" (${droppedFrontMatterParagraphs} paragraph(s)), a whole-speech synopsis printed once before section 1. Excluded from the reading text for the same reason as Pro Archia's English edition - see that importer's module doc and anomalies.json entry. Flagged here for independent review, not silently dropped.`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'For Sextus Roscius of Ameria',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'Charles Duke Yonge',
    edition: 'The Orations of Marcus Tullius Cicero, Volume 1, trans. Charles Duke Yonge (London: Bell, 1903), "For Sextus Roscius of Ameria"',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0474.phi002.perseus-eng2), digitising Charles Duke Yonge\'s translation "For Sextus ' +
      'Roscius of Ameria" (London: Bell, 1903); imported by scripts/import-pro-roscio-amerino-en. The raw file ' +
      'is fetched once (cached at scripts/import-pro-roscio-amerino-en/raw/) and bundled with the app; nothing ' +
      'is loaded from the network at runtime.',
    license:
      'Yonge\'s translation is in the public domain (published well over 95 years ago). The digital ' +
      'transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit ' +
      'under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Cicero\'s Pro Sexto Roscio Amerino - English, trans. Yonge',
        paragraphs: [
          'This is Cicero\'s defence of Sextus Roscius against a charge of parricide, his first major criminal ' +
            'case, delivered in 80 BC under Sulla\'s dictatorship. It stands alongside the Latin text (Clark, ' +
            '1908) already in this library as a facing English rendering of the same speech.',
          'The text here is Yonge\'s translation, verbatim. Nothing is further modernised, paraphrased or ' +
            'silently corrected. Yonge\'s own footnotes are excluded - see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Charles Duke Yonge, trans., The Orations of Marcus Tullius Cicero, Volume 1 (London: Bell, 1903), ' +
            'this speech titled "For Sextus Roscius of Ameria". The speech is divided into 154 numbered ' +
            'sections, matching the Latin sibling exactly, plus the same independent "chapter" numbering ' +
            'marked inline (Yonge\'s own, per this edition\'s "resp=\\"yonge\\"" milestones).',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi002.perseus-eng2.xml (CTS ' +
            'urn:cts:latinLit:phi0474.phi002.perseus-eng2) from the Perseus Digital Library / ' +
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
            'section\'s Division.ref; the separate paragraph-position <milestone unit="Para"/> markers carry no ' +
            'chapter number and are pure noise, dropped), and purely typographic wrapper tags (<foreign>, ' +
            '<quote>, <l>, <persName>, <placeName>, <title>) are unwrapped or dropped. This witness also ' +
            'carries a whole-speech "The Argument" synopsis before section 1, excluded from the reading text - ' +
            'see "Known gaps & anomalies". Entities are decoded and runs of whitespace collapsed.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by section number (1-154), plus the traditional "chapter" citation this edition also ' +
            'prints inline. A section\'s Division.ref is the chapter number active at that section\'s start. ' +
            'Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: all 154 sections are present, in ' +
            'order, matching the Latin sibling section-for-section (including section 132\'s manuscript gap - ' +
            'Yonge\'s translation, made from a later, already-lacunose text, does not mark the gap explicitly ' +
            'the way Clark\'s critical edition does, and no corresponding <gap> element is present in this ' +
            'witness; not treated as an importer error, simply a difference between a translation and a ' +
            'critical edition); Yonge\'s own footnotes are excluded as translator apparatus; the whole-speech ' +
            '"The Argument" synopsis printed before section 1 is excluded from the reading text as editorial ' +
            'framing with no numbered home in this schema.',
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
  process.stdout.write('\nDone. Run `npx tsx scripts/import-pro-roscio-amerino-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
