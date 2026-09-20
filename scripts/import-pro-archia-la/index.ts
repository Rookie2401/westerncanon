/**
 * Cicero, *Pro Archia Poeta* - Latin text (Albert Curtis Clark, ed., *M.
 * Tulli Ciceronis Orationes, Volume 6*, Oxford: Clarendon Press, 1911; CTS
 * urn:cts:latinLit:phi0474.phi016.perseus-lat2). Run-once ingestion
 * pipeline.
 *
 *   npx tsx scripts/import-pro-archia-la/index.ts
 *
 * Downloads (once - cached thereafter)
 *   scripts/import-pro-archia-la/raw/phi0474.phi016.perseus-lat2.xml
 * from the Perseus/OpenGreekAndLatin canonical-latinLit GitHub repository
 * and writes:
 *   data/pro-archia-la/work.json       - the GenericWork (flat list of 32
 *                                         numbered sections, one Passage each)
 *   data/pro-archia-la/about.json      - provenance / licence / prose
 *   data/pro-archia-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-pro-archia-la/validate.ts` (which also
 * validates the sibling English edition - see that file).
 *
 * --- Source structure (confirmed by direct inspection of the fetched XML) ---
 * <body><div type="edition"><head>PRO ARCHIA POETA ORATIO</head>
 *   <div type="textpart" subtype="section" n="1"> <p>...</p> [<p>...</p>] </div>
 *   <div type="textpart" subtype="section" n="2"> ... </div>
 *   ...
 * </div></body>
 * Sections are FLAT siblings (no book/chapter wrapper), numbered 1..32,
 * matching the traditionally cited 32 sections of this speech exactly. A
 * `<milestone n="N" unit="chapter"/>` self-closing marker is sprinkled
 * inline within the running text at points that do NOT line up with
 * section boundaries - the traditional Roman-numeral chapter citation,
 * coarser than and independent of the section numbering - see
 * data/pro-archia-la/types.ts for how this becomes each section's
 * Division.ref.
 *
 * Apparatus (all confirmed, by direct inspection, to occur ONLY nested
 * inside <note>...</note> in this witness - never at top level): critical
 * apparatus `<app><lem>...</lem>...</app>` recording manuscript variants,
 * and `<hi rend="italic">` used only for manuscript sigla/editor names
 * inside that apparatus. Every <note> (192 in this file, including some
 * nested one inside another) is dropped entirely, tag and content - it is
 * Clark's own critical apparatus, not Cicero's text.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-en
 * and every other import this session):
 *   - verbatim Latin reading text only; no modernising or "correcting"
 *     Clark's 1911 text.
 *   - `<reg>` (regularised-spelling marker, no attributes) is unwrapped,
 *     keeping its text - it flags nothing this schema needs, the printed
 *     word is exactly what's inside it.
 *   - `<choice><abbr>X</abbr><expan>Y<ex>...</ex></expan></choice>` (a
 *     praenomen abbreviation, e.g. "M." for "Marcus"): the edition PRINTS
 *     the abbreviated form only (<expan> is Perseus's own unprinted
 *     editorial gloss, never rendered inline in the OCT); <abbr>'s text is
 *     kept verbatim, <expan> (and its nested <ex>) is dropped entirely.
 *     None occur in this particular work (Pro Archia) - see the sibling
 *     Pro Roscio Amerino / Pro Caelio importers, which do have them.
 *   - `<add>...</add>` (an editorial supplement to fill a manuscript gap,
 *     e.g. "<add>lumen</add>") is unwrapped, keeping its text - it IS part
 *     of what Clark's edition prints as the running text (the edition's
 *     own reconstructed reading), not apparatus.
 *   - `<quote>`, `<q>`, `<foreign>` (untranslated Greek in a Latin
 *     oration), `<hi>` (only ever seen inside <note> in this witness) are
 *     unwrapped, text kept.
 *   - `<milestone unit="chapter"/>` seeds Division.ref (see above);
 *     self-closing, zero-width, dropped from the running text itself.
 *   - `<p>` boundaries ARE preserved per section: a section with more than
 *     one <p> becomes one Passage whose paragraphs are joined with "\n\n".
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/pro-archia-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0474.phi016.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'pro-archia-la');

const WORK_ID = 'pro-archia-la';
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi016/phi0474.phi016.perseus-lat2.xml';
/** Traditionally cited section count for this speech; compared against the real parsed count, never forced. */
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

/**
 * Parse a Perseus phi0474 Latin oration TEI body into a flat array of
 * section Divisions. Shared shape across the three Latin importers in this
 * batch (pro-archia-la, pro-roscio-amerino-la, pro-caelio-la); kept as a
 * plain function here (not a shared module - see each importer's own
 * top-of-file note on why no cross-work shared helper file was introduced)
 * rather than copy-pasted inline logic elsewhere, so each importer owns one
 * clear, auditable copy.
 */
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
      }
    }
    // catch-all <[^>]+> (reg, /reg, choice, /choice, abbr, /abbr, add, /add,
    // foreign, /foreign, q, /q, quote, /quote, l, /l, lb/>, ex, /ex (inside
    // expan, already suppressed), hi.. (only inside note, already
    // suppressed), app/lem.. (only inside note), desc, /desc, head, /head,
    // pb/>): no structural action - text already flows via the free-text
    // capture above (suppressed while noteDepth>0 or expanDepth>0).
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
    note: `${totalNotes} <note> elements (Clark's critical apparatus - manuscript variant readings <app><lem>...</lem>...</app>, and the scholiast/editorial glosses embedded the same way) were excluded entirely, tag and content, at every nesting depth. None are Cicero's own text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / Division.ref`,
    note: `${totalChapterMilestones} <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-archia-la/types.ts. Passage.ref is null throughout: no finer inline citation exists.`,
  });
  if (totalGaps > 0) {
    anomalies.push({
      where: `${WORK_ID} / manuscript gap(s)`,
      note: `${totalGaps} <gap reason="lost"/> marker(s) found; the literal asterisk sequence Clark's edition prints in their place (its "rend" attribute) is kept verbatim in the reading text, exactly as printed, rather than silently smoothed over.`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Pro Archia Poeta',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'Albert Curtis Clark',
    edition: 'M. Tulli Ciceronis Orationes, Volume 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1911)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS ' +
      'urn:cts:latinLit:phi0474.phi016.perseus-lat2), digitising Albert Curtis Clark\'s Oxford Classical Text ' +
      'edition of Pro Archia Poeta (1911); imported by scripts/import-pro-archia-la. The raw file is fetched ' +
      'once (cached at scripts/import-pro-archia-la/raw/) and bundled with the app; nothing is loaded from the ' +
      'network at runtime.',
    license:
      'Clark\'s 1911 critical text is in the public domain. The digital transcription is distributed by the ' +
      'Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons ' +
      'Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Cicero\'s Pro Archia Poeta',
        paragraphs: [
          'Delivered in 62 BC, Pro Archia Poeta is Cicero\'s defence of his old teacher, the Greek poet Aulus ' +
            'Licinius Archias, against a charge that he was not a genuine Roman citizen. The legal argument ' +
            'occupies only the opening sections; most of the speech is a celebrated digression in praise of ' +
            'literature, poetry and the humane studies (studia humanitatis) - among the most quoted passages ' +
            'in all of Cicero\'s oratory.',
          'The text here is Clark\'s Latin, verbatim. Nothing is modernised, paraphrased or silently corrected.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Albert Curtis Clark, ed., M. Tulli Ciceronis Orationes, Volume 6 (Oxford: Clarendon Press, 1911), ' +
            'an Oxford Classical Text. The speech is divided into 32 numbered sections, matching the ' +
            'traditionally cited section count exactly, plus an independent, coarser traditional "chapter" ' +
            'numbering (12 chapters) marked inline - see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi016.perseus-lat2.xml (CTS ' +
            'urn:cts:latinLit:phi0474.phi016.perseus-lat2) from the Perseus Digital Library / ' +
            'OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; ' +
            'nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the flat sequence of section <div>s and collects every <p> paragraph within each ' +
            'into that section\'s single Passage (joined with a blank line when a section has more than one ' +
            'paragraph). Only transport/editorial scaffolding is removed: Clark\'s critical apparatus (every ' +
            '<note> - manuscript variants and scholia, none of them Cicero\'s own words), the inline chapter ' +
            '<milestone> markers (their values instead seed each section\'s Division.ref), and purely ' +
            'typographic/editorial wrapper tags (<reg>, <choice>/<abbr>/<expan>, <add>, <quote>, <q>, ' +
            '<foreign>) are unwrapped or dropped per the rules in the importer\'s own module doc. Entities are ' +
            'decoded and runs of whitespace collapsed; the words themselves are untouched.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation is by section number (Cicero\'s and the edition\'s own numbering, 1-32), plus the ' +
            'traditional Roman-numeral "chapter" citation the edition also prints inline (coarser-grained, ' +
            'independent of the section numbers). A section\'s Division.ref is the chapter number active at ' +
            'that section\'s start. Passage.ref is null throughout: no citation finer than the chapter exists ' +
            'in this source.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'See anomalies.json for the full machine-readable list. In summary: all 32 sections are present, in ' +
            'order, matching the traditionally cited section count exactly; Clark\'s critical apparatus is ' +
            'excluded entirely as editorial material, not Cicero\'s text.',
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

export { parseLatinOration };
