/**
 * Cicero, *Pro M. Caelio* - Latin text (Albert Curtis Clark, ed., *M. Tulli
 * Ciceronis Orationes, Volume 1*, Oxford: Clarendon Press, 1908; CTS
 * urn:cts:latinLit:phi0474.phi024.perseus-lat2). Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-pro-caelio-la/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-pro-caelio-la/raw/phi0474.phi024.perseus-lat2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/pro-caelio-la/work.json       - flat list of 80 numbered sections,
 *                                         one Passage each
 *   data/pro-caelio-la/about.json      - provenance / licence / prose
 *   data/pro-caelio-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-pro-caelio-la/validate.ts` (shared
 * validator for this speech's Latin+English pair).
 *
 * Source structure and faithfulness rules are the same as
 * scripts/import-pro-archia-la and scripts/import-pro-roscio-amerino-la
 * (flat `<div type="textpart" subtype="section" n="N">` siblings, inline
 * `<milestone unit="chapter"/>` markers seeding Division.ref, apparatus
 * confined to <note>...</note> at every depth,
 * `<choice><abbr>X</abbr><expan>Y<ex>...</ex></expan></choice>` praenomen
 * abbreviations keeping only the printed <abbr> form, `<reg>`/`<add>`
 * unwrapped keeping their text). This speech additionally quotes several
 * passages of Latin verse (Ennius's Medea, ps.-Caecilius) set off with
 * `<quote>`/`<l>`/`<lb/>` inside their own <p> - confirmed by direct
 * inspection to occur only INSIDE a <p> like any other paragraph content;
 * `<l>` line boundaries are not preserved as a separate structure in this
 * app's prose-oration schema (matching how this app's other prose works
 * with embedded verse, e.g. the Nicomachean Ethics's Homer quotations,
 * treat them) - the lines simply flow into the surrounding paragraph text,
 * `<lb/>` itself being zero-width scaffolding already flanked by
 * whitespace in the source.
 *
 * No `<gap>` (manuscript lacuna marker) appears anywhere in this witness,
 * confirmed by direct inspection - unlike the Pro Roscio Amerino sibling.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/pro-caelio-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0474.phi024.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'pro-caelio-la');

const WORK_ID = 'pro-caelio-la';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi024/phi0474.phi024.perseus-lat2.xml';
const EXPECTED_SECTIONS = 80;

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

function parseLatinOration(xml: string, anomalies: Anomaly[]): { divisions: Division[]; totalNotes: number; totalChapterMilestones: number; totalGaps: number; totalEmptyParagraphsDropped: number } {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0) fail('no <body>...</body> found in source XML');
  const body = xml.slice(bodyStart, bodyEnd);

  const tokenRe =
    /<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<expan\b[^>]*>|<\/expan>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<div\b[^>]*>|<[^>]+>/g;

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
  let expanDepth = 0;

  let totalNotes = 0;
  let totalChapterMilestones = 0;
  let totalGaps = 0;
  let totalEmptyParagraphsDropped = 0;

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
      if (inP && noteDepth === 0 && expanDepth === 0) pBuf += free;
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
        totalEmptyParagraphsDropped += 1;
        anomalies.push({
          where: currentSectionId || '(before any section)',
          note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
        });
      } else if (currentSectionId) {
        paragraphs.push(cleaned);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      if (noteDepth === 0) totalNotes += 1;
    } else if (/^<expan\b/.test(tok)) {
      expanDepth += 1;
    } else if (tok === '</expan>') {
      expanDepth -= 1;
    } else if (/^<milestone\b/.test(tok)) {
      if (noteDepth === 0 && expanDepth === 0) {
        const unitMatch = /unit="([^"]+)"/.exec(tok);
        const nMatch = /\sn="([^"]+)"/.exec(tok);
        if (unitMatch?.[1] === 'chapter' && nMatch?.[1]) {
          currentChapter = nMatch[1];
          totalChapterMilestones += 1;
        }
      }
    } else if (/^<gap\b/.test(tok)) {
      if (inP && noteDepth === 0 && expanDepth === 0) {
        const rendMatch = /rend="([^"]*)"/.exec(tok);
        const literal = rendMatch?.[1]?.trim() ?? '';
        if (literal.length > 0) pBuf += ` ${literal} `;
        totalGaps += 1;
        anomalies.push({
          where: currentSectionId || '(before any section)',
          note: 'Genuine manuscript lacuna: a <gap reason="lost"/> marker in the source, printed as a literal row of asterisks (kept verbatim in the reading text).',
        });
      }
    }
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (expanDepth !== 0) fail(`unbalanced <expan> nesting (final depth ${expanDepth})`);

  return { divisions, totalNotes, totalChapterMilestones, totalGaps, totalEmptyParagraphsDropped };
}

async function main(): Promise<void> {
  await ensureRawXml();
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const anomalies: Anomaly[] = [];
  const { divisions, totalNotes, totalChapterMilestones, totalGaps, totalEmptyParagraphsDropped } = parseLatinOration(xml, anomalies);

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
    note: `${totalNotes} <note> elements (Clark's critical apparatus - manuscript variant readings, scholia) were excluded entirely, tag and content, at every nesting depth. None are Cicero's own text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / Division.ref`,
    note: `${totalChapterMilestones} <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-caelio-la/types.ts. Passage.ref is null throughout.`,
  });
  anomalies.push({
    where: `${WORK_ID} / praenomen abbreviations`,
    note: 'Every <choice><abbr>X</abbr><expan>Y<ex>...</ex></expan></choice> (a praenomen like "M." for "Marcus", "P." for "Publius") keeps only the printed <abbr> form; <expan> is dropped entirely.',
  });
  anomalies.push({
    where: `${WORK_ID} / verse quotations`,
    note: 'This speech quotes several passages of Latin verse (Ennius\'s Medea exul, and a fragment attributed to Caecilius) marked with <quote>/<l>/<lb/>. Line boundaries are not preserved as a separate structure in this app\'s prose-oration schema; the verse text flows into the surrounding paragraph, matching how this app treats embedded verse quotations elsewhere in prose works.',
  });
  if (totalGaps > 0) {
    anomalies.push({
      where: `${WORK_ID} / (work level) manuscript gap`,
      note: `${totalGaps} <gap reason="lost"/> marker(s) found. See the per-occurrence anomaly entries above.`,
    });
  } else {
    anomalies.push({
      where: `${WORK_ID} / (work level)`,
      note: 'No <gap> (manuscript lacuna marker) appears anywhere in this witness, confirmed by direct inspection - unlike the Pro Roscio Amerino sibling, whose section 132 carries a well-known lacuna.',
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Pro M. Caelio',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'Albert Curtis Clark',
    edition: 'M. Tulli Ciceronis Orationes, Volume 1, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1908)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0474.phi024.perseus-lat2), digitising Albert Curtis Clark\'s Oxford Classical Text ' +
      'edition of Pro Marco Caelio (1908); imported by scripts/import-pro-caelio-la. The raw file is fetched ' +
      'once (cached at scripts/import-pro-caelio-la/raw/) and bundled with the app; nothing is loaded from the ' +
      'network at runtime.',
    license:
      'Clark\'s 1908 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Cicero\'s Pro Marco Caelio',
        paragraphs: [
          'Delivered in 56 BC, this is Cicero\'s defence of the young politician Marcus Caelius Rufus against ' +
            'charges of political violence, in a trial entangled with Cicero\'s celebrated, savage character ' +
            'assassination of the prosecution\'s chief witness, Clodia Metelli.',
          'The text here is Clark\'s Latin, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Albert Curtis Clark, ed., M. Tulli Ciceronis Orationes, Volume 1 (Oxford: Clarendon Press, 1908), ' +
            'an Oxford Classical Text. The speech is divided into 80 numbered sections, matching the ' +
            'traditionally cited section count exactly, plus an independent, coarser traditional "chapter" ' +
            'numbering marked inline.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi024.perseus-lat2.xml (CTS ' +
            'urn:cts:latinLit:phi0474.phi024.perseus-lat2) from the Perseus Digital Library / ' +
            'OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the flat sequence of section <div>s and collects every <p> paragraph within each ' +
            'into that section\'s single Passage. Only transport/editorial scaffolding is removed: Clark\'s ' +
            'critical apparatus (every <note>), the inline chapter <milestone> markers (their values instead ' +
            'seed each section\'s Division.ref), and purely typographic/editorial wrapper tags (<reg>, ' +
            '<choice>/<abbr>/<expan>, <add>, <quote>, <q>, <l>, <lb/>, <foreign>) are unwrapped or dropped. ' +
            'Entities are decoded and runs of whitespace collapsed; the words themselves are untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by section number (1-80), plus the traditional "chapter" citation this edition also ' +
            'prints inline. A section\'s Division.ref is the chapter number active at that section\'s start. ' +
            'Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: all 80 sections are present, in ' +
            'order, matching the traditionally cited section count exactly; Clark\'s critical apparatus is ' +
            'excluded as editorial material; no manuscript lacuna marker occurs anywhere in this witness.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  let totalChars = 0;
  for (const d of divisions) totalChars += d.passages.reduce((n, p) => n + p.text.length, 0);
  process.stdout.write(`\n  ${divisions.length} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalNotes} <note>  ${totalGaps} <gap>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${anomalies.length} anomalies\n`);
  process.stdout.write('\nDone. Run `npx tsx scripts/import-pro-caelio-la/validate.ts` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
