/**
 * Cicero, *Pro Marcello* ("In Defence of Marcus Marcellus") - Latin text
 * only, via Perseus / OpenGreekAndLatin canonical-latinLit (CTS textgroup
 * phi0474, work phi032, edition perseus-lat2). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-pro-marcello-la/index.ts
 *   (or: npm run import:pro-marcello-la, once wired into package.json)
 *
 * Fetches (if not already cached) and reads
 *   scripts/import-pro-marcello-la/raw/phi0474.phi032.perseus-lat2.xml
 * from
 *   https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi032/phi0474.phi032.perseus-lat2.xml
 * Idempotent: if the raw XML is already cached on disk, nothing is
 * downloaded. Writes:
 *   data/pro-marcello-la/work.json       - the GenericWork (34 flat section Divisions)
 *   data/pro-marcello-la/about.json      - provenance / licence / prose
 *   data/pro-marcello-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-pro-marcello-la/validate.ts`.
 *
 * Source structure (confirmed by direct inspection of the fetched XML,
 * independently of the other three Cicero importers - this witness is NOT
 * assumed identical): a single `<div type="edition">`, opening with a
 * running `<head>` title (discarded, as in the other three), then a FLAT
 * sequence of 34 `<div type="textpart" subtype="section" n="N">` divisions
 * (N = 1..34, sequential, no gaps). Inline `<milestone unit="chapter" n="N"
 * resp="editor"/>` markers (11 total, sequential 1..11) carry the oration's
 * traditional chapter citation; each section's Division.ref is the chapter
 * number active at that section's START (see data/pro-marcello-la/types.ts).
 *
 * Faithfulness rules (mirrors scripts/import-pro-sestio-la):
 *   - verbatim Latin reading text only; nothing discarded or silently
 *     corrected beyond the documented apparatus handling below.
 *   - only XML transport scaffolding is removed: the work-level `<head>`,
 *     the zero-width `<milestone .../>` markers (their `n` values seed
 *     Division.ref), and `<note>...</note>` - Clark's apparatus criticus -
 *     excluded ENTIRELY. 137 occurrences.
 *   - this witness carries NO `<del>`, `<add>`, `<choice>`/`<abbr>`/
 *     `<expan>`, `<num>`, `<quote>` or `<l>` at all (confirmed by direct
 *     inspection - the shortest and structurally simplest of the four
 *     speeches in this batch). Only `<reg>` (109 occurrences) and a single
 *     `<q rend="single">` occur, both unwrapped and kept inline verbatim.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/pro-marcello-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0474.phi032.perseus-lat2.xml');
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi032/phi0474.phi032.perseus-lat2.xml';
const OUT_DIR = join(REPO_ROOT, 'data', 'pro-marcello-la');

const WORK_ID = 'pro-marcello-la';
const EXPECTED_SECTIONS = 34;
const EXPECTED_CHAPTERS = 11;
/** Verbatim incipit of sec-1's single Passage (prefix check). */
const INCIPIT = 'diuturni silenti, patres conscripti, quo eram his temporibus usus, non';
/** Verbatim explicit of the final section's Passage (suffix check) - truncation guard. */
const EXPLICIT = 'quod fieri iam posse non arbitrabar, magnus hoc tuo facto cumulus accesserit.';

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

async function fetchIfMissing(): Promise<void> {
  if (existsSync(RAW_XML)) return;
  mkdirSync(RAW_DIR, { recursive: true });
  process.stdout.write(`fetching ${SOURCE_URL} ...\n`);
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'summa-app-importer/1.0 (offline PWA corpus build)' },
  });
  if (!res.ok) fail(`HTTP ${res.status} fetching source XML`);
  const text = await res.text();
  writeFileSync(RAW_XML, text, 'utf8');
  process.stdout.write(`  cached -> ${RAW_XML} (${(text.length / 1024).toFixed(1)} KB)\n`);
}

interface ParsedSection {
  number: number;
  ref: string | null;
  text: string;
}

interface ParseResult {
  headText: string | null;
  sections: ParsedSection[];
  noteCount: number;
  delOccurrences: { where: string; text: string }[];
  abbrOccurrences: { where: string; abbr: string; expan: string }[];
  addCount: number;
  regCount: number;
  quoteCount: number;
  lCount: number;
  qCount: number;
  numCount: number;
  totalMilestones: number;
}

function dropTag(s: string, tag: string): { out: string; removed: string[] } {
  const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  const removed: string[] = [];
  const out = s.replace(re, (_whole, inner: string) => {
    removed.push(inner.replace(/<[^>]+>/g, ''));
    return '';
  });
  return { out, removed };
}

function cleanParagraph(pInner: string): string {
  let s = pInner;
  s = s.replace(/<milestone\b[^>]*\/>/g, '');
  s = s.replace(/<[^>]+>/g, '');
  return cleanText(s);
}

function parseSections(xml: string): ParseResult {
  const bodyStart = xml.indexOf('<body');
  const bodyEnd = xml.indexOf('</body>');
  if (bodyStart < 0 || bodyEnd < 0 || bodyEnd < bodyStart) fail('no <body>...</body> found in source XML');
  let body = xml.slice(bodyStart, bodyEnd);

  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head>/.exec(body);
  const headText = headMatch ? cleanText(headMatch[1].replace(/<[^>]+>/g, ' ')) : null;

  const noteCount = (body.match(/<note\b[^>]*>/g) ?? []).length;
  body = body.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, '');

  const sectionRe = /<div(?=[^>]*\btype="textpart")(?=[^>]*\bsubtype="section")[^>]*\bn="(\d+)"[^>]*>/g;
  const parts = body.split(sectionRe);
  if (parts.length < 3 || parts.length % 2 !== 1) fail(`unexpected section split shape (${parts.length} parts)`);

  const sections: ParsedSection[] = [];
  const delOccurrences: { where: string; text: string }[] = [];
  const abbrOccurrences: { where: string; abbr: string; expan: string }[] = [];
  let addCount = 0;
  let regCount = 0;
  let quoteCount = 0;
  let lCount = 0;
  let qCount = 0;
  let numCount = 0;
  let totalMilestones = 0;
  let currentChapter: string | null = null;

  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const where = `${WORK_ID} / sec-${n}`;
    let content = parts[i + 1] ?? '';

    const delResult = dropTag(content, 'del');
    content = delResult.out;
    for (const text of delResult.removed) delOccurrences.push({ where, text });

    const abbrRe = /<choice>\s*<abbr>([\s\S]*?)<\/abbr>\s*<expan>([\s\S]*?)<\/expan>\s*<\/choice>/g;
    content = content.replace(abbrRe, (_whole, abbr: string, expan: string) => {
      abbrOccurrences.push({ where, abbr: abbr.replace(/<[^>]+>/g, ''), expan: expan.replace(/<[^>]+>/g, '') });
      return expan;
    });

    const msNums = [...content.matchAll(/<milestone\b[^>]*\bn="(\d+)"[^>]*\/>/g)].map((m) => m[1]!);
    const ref = currentChapter;
    if (msNums.length > 0) {
      currentChapter = msNums[msNums.length - 1]!;
      totalMilestones += msNums.length;
    }

    addCount += (content.match(/<add\b/g) ?? []).length;
    regCount += (content.match(/<reg\b/g) ?? []).length;
    quoteCount += (content.match(/<quote\b/g) ?? []).length;
    lCount += (content.match(/<l\b/g) ?? []).length;
    qCount += (content.match(/<q\b/g) ?? []).length;
    numCount += (content.match(/<num\b/g) ?? []).length;

    const pMatches = [...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)];
    if (pMatches.length === 0) fail(`${where}: no <p> paragraphs found`);
    const cleaned = pMatches.map((m) => cleanParagraph(m[1]!)).filter((t) => t.length > 0);
    if (cleaned.length === 0) fail(`${where}: all paragraphs empty after cleaning`);

    sections.push({ number: n, ref, text: cleaned.join('\n\n') });
  }

  return {
    headText,
    sections,
    noteCount,
    delOccurrences,
    abbrOccurrences,
    addCount,
    regCount,
    quoteCount,
    lCount,
    qCount,
    numCount,
    totalMilestones,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await fetchIfMissing();
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const parsed = parseSections(xml);

  if (parsed.sections.length !== EXPECTED_SECTIONS) {
    fail(`expected exactly ${EXPECTED_SECTIONS} sections, found ${parsed.sections.length}`);
  }
  parsed.sections.forEach((s, i) => {
    if (s.number !== i + 1) fail(`section index ${i}: carries n="${s.number}" (out of sequence)`);
  });
  if (parsed.totalMilestones !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} chapter milestones, found ${parsed.totalMilestones}`);
  }
  if (parsed.delOccurrences.length !== 0 || parsed.abbrOccurrences.length !== 0 || parsed.addCount !== 0 || parsed.numCount !== 0 || parsed.quoteCount !== 0 || parsed.lCount !== 0) {
    fail(
      `expected 0 <del>/<choice>/<add>/<num>/<quote>/<l> occurrences in this witness, found del=${parsed.delOccurrences.length} choice=${parsed.abbrOccurrences.length} add=${parsed.addCount} num=${parsed.numCount} quote=${parsed.quoteCount} l=${parsed.lCount} (module doc comment needs updating if this is genuine)`,
    );
  }

  const first = parsed.sections[0]!;
  if (!first.text.startsWith(INCIPIT)) {
    fail(`sec-1 incipit spot-check failed.\n  expected prefix: ${JSON.stringify(INCIPIT)}\n  got: ${JSON.stringify(first.text.slice(0, 90))}`);
  }
  const last = parsed.sections[parsed.sections.length - 1]!;
  if (!last.text.endsWith(EXPLICIT)) {
    fail(`sec-${last.number} explicit spot-check failed.\n  expected suffix: ${JSON.stringify(EXPLICIT)}\n  got tail: ${JSON.stringify(last.text.slice(-90))}`);
  }
  if (first.ref !== null) {
    fail(`sec-1 ref expected null (no chapter milestone precedes it), got ${JSON.stringify(first.ref)}`);
  }

  const divisions: Division[] = parsed.sections.map((s) => {
    const passage: Passage = { n: '', text: s.text, ref: null };
    return {
      id: `sec-${s.number}`,
      number: String(s.number),
      ref: s.ref,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
  });

  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      'This source prints two independent citation schemes: its own 34 numbered sections (Division.id / ' +
      'Division.number, "sec-1".."sec-34") and, coarser, the traditional 11 Roman-numeral "chapter" citation as ' +
      'inline <milestone unit="chapter" n="N"/> markers. Division.ref for each section is the chapter number ' +
      "active at that section's START - the nearest PRECEDING milestone in document order - built by a strict " +
      "document-order walk (never inferred). sec-1 is the sole section with ref null: the source's own " +
      'chapter-1 milestone sits just inside sec-1\'s own <p>, not before it, so no chapter is yet "active" when ' +
      'sec-1 opens - this is the documented, expected null case, not a gap. Passage.ref is null throughout and ' +
      'Passage.n is "" throughout (no printed sub-section numbering survives in this source).',
  });
  anomalies.push({
    where: `${WORK_ID} / apparatus criticus`,
    note: `${parsed.noteCount} <note> elements (Clark's apparatus criticus - manuscript sigla, proposed emendations, editors' names) were excluded entirely, tag and content; not logged individually given their number. None of this is Cicero's own text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / apparatus tags absent`,
    note:
      'Unlike the companion Pro Sestio and Pro Milone imports, this witness carries no <del>, <add>, ' +
      '<choice>/<abbr>/<expan>, <num>, <quote> or <l> at all (confirmed by direct inspection - the shortest and ' +
      'structurally simplest of the four speeches bundled in this batch). Only <reg> and a single <q> occur.',
  });
  anomalies.push({
    where: `${WORK_ID} / regularised spellings`,
    note: `${parsed.regCount} <reg> elements (Clark's regularised-spelling form - the word he actually prints) were kept inline, tags stripped, text preserved verbatim.`,
  });
  anomalies.push({
    where: `${WORK_ID} / quoted speech`,
    note: `${parsed.qCount} <q rend="single"> element(s) (Cicero quoting his own earlier, now-famous remark "satis diu vel naturae vixi vel gloriae", sec-25) were unwrapped and kept inline as ordinary running text.`,
  });
  anomalies.push({
    where: `${WORK_ID} / work-level head`,
    note: `The source's own running title <head> ("${parsed.headText}") is a work-level heading, not a section heading; discarded entirely and not stored on any Division, matching how this library already treats the analogous per-book <head> in data/physics-grc.`,
  });
  anomalies.push({
    where: `${WORK_ID} / completeness`,
    note: `All ${EXPECTED_SECTIONS} sections and all ${EXPECTED_CHAPTERS} chapter milestones are present and sequential, from the incipit "${INCIPIT}..." to the explicit "...${EXPLICIT}".`,
  });
  anomalies.push({
    where: `${WORK_ID} / character encoding`,
    note:
      'No HTML/XML entities occur anywhere in this file\'s reading text (confirmed by direct inspection); no ' +
      'combining diacritics are used. Bytes are preserved exactly as transmitted; no normalisation applied.',
  });
  anomalies.push({
    where: `${WORK_ID} / English translation scope decision`,
    note:
      'An incomplete/partial 19th-century (Yonge-tradition) English translation of Pro Marcello does exist on ' +
      'English Wikisource. It was deliberately NOT used for this import: this app ships the Latin text only for ' +
      'now, and a complete, independently-verified public-domain English translation will be sought later ' +
      'rather than shipping a partial one now. See about.json\'s "No English edition bundled" section.',
  });

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };
  writeJson('work.json', work);
  writeJson('anomalies.json', anomalies);
  writeAbout();

  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  process.stdout.write(
    `\n  ${divisions.length} sections, ${parsed.totalMilestones} chapters, ${totalChars} chars, ${anomalies.length} anomalies recorded\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-pro-marcello-la/validate.ts` next.\n');
}

function writeAbout(): void {
  const about = {
    workId: WORK_ID,
    title: 'Pro Marcello',
    author: 'Marcus Tullius Cicero',
    language: 'la' as const,
    edition: 'Albert Curtis Clark, ed., M. Tulli Ciceronis Orationes, Vol. 6 (Oxford: Clarendon Press, 1918)',
    editor: 'Albert Curtis Clark',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:' +
      'latinLit:phi0474.phi032.perseus-lat2); imported by scripts/import-pro-marcello-la.',
    license:
      "Clark's 1918 critical edition and Cicero's Latin text are in the public domain. The digital transcription " +
      'is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative ' +
      'Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Pro Marcello',
        paragraphs: [
          'Delivered in 46 BC, Pro Marcello is Cicero\'s speech of thanks to Julius Caesar for pardoning Marcus ' +
            'Claudius Marcellus, an ex-consul and former opponent in the civil war, and allowing his return from ' +
            'exile. The shortest of Cicero\'s speeches bundled in this app, it is prized for its careful, ' +
            'double-edged praise of Caesar\'s clemency - genuine gratitude shadowed by an implicit warning about ' +
            'the dangers of one-man rule.',
          'The text here is Latin only, verbatim. Nothing is translated, modernised, normalised or silently ' +
            'corrected beyond the documented resolution of the source\'s own critical-apparatus markup (see "How ' +
            'it was imported" below). Where the source is irregular or a genuine judgement call was made, it is ' +
            'preserved/recorded and flagged in "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'No English edition bundled - by design',
        paragraphs: [
          'No English translation of Pro Marcello is bundled alongside this Latin text. This is a deliberate ' +
            'choice, not an oversight: two independent research passes searched Perseus\'s own CTS catalog for ' +
            'this work (which lists no "perseus-eng*" English witness for phi0474.phi032), English Wikisource, ' +
            'and Project Gutenberg, and found no public-domain, COMPLETE digital English translation that meets ' +
            'this app\'s two-source verification policy.',
          'An incomplete/partial 19th-century (Yonge-tradition) English translation of this speech does exist on ' +
            'English Wikisource - but it was deliberately NOT used here: shipping a partial translation would be ' +
            'worse than shipping none, since a reader could not tell where the translation silently stops. The ' +
            'decision (confirmed with the maintainer) was to publish the Latin text on its own for now and search ' +
            'for a complete, independently-verified public-domain translation later, mirroring how this library ' +
            'already handles Aristotle\'s Physics (data/physics-grc) when no suitable translation could be ' +
            'confirmed. A future contributor who locates and verifies a complete source is welcome to add a ' +
            'companion data/pro-marcello-en/ work following the same flat section shape defined in ' +
            'data/pro-marcello-la/types.ts.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The printed source, per this XML file\'s own <teiHeader>/<sourceDesc> and __cts__.xml, is Albert ' +
            'Curtis Clark, ed., M. Tulli Ciceronis Orationes, Vol. 6 (Oxford: Clarendon Press, 1918) - part of the ' +
            'Scriptorum Classicorum Bibliotheca Oxoniensis (Oxford Classical Texts) series (the same volume that ' +
            'also contains Pro Milone and Pro Ligario, both also bundled in this app).',
          'The oration is divided into 34 numbered sections (the modern citation unit, e.g. "Marcell. 19") and, ' +
            'more coarsely, 11 traditional Roman-numeral "chapters" (e.g. "Marcell. v"), both printed in this ' +
            'source; see "Reference scheme" below for how each is represented here.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI/EpiDoc XML file phi0474.phi032.perseus-lat2.xml (CTS urn:cts:' +
            'latinLit:phi0474.phi032.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-latinLit repository. It is fetched once (and cached under the importer\'s own raw/ ' +
            'directory) and bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer slices the single <div type="edition"> body into its 34 flat, numbered <div ' +
            'type="textpart" subtype="section"> divisions (there is no intervening Book/Chapter tier), then takes ' +
            'the <p> paragraph(s) inside each section (joined with a blank line if more than one) as that ' +
            'section\'s single Passage. Clark\'s apparatus criticus (<note>, 137 occurrences) is excluded entirely, ' +
            'tag and content. This witness carries no <del>, <add>, <choice>/<abbr>/<expan>, <num>, <quote> or ' +
            '<l> at all - structurally the simplest of the four speeches in this batch. <reg> (Clark\'s ' +
            'regularised-spelling form) and a single <q rend="single"> (Cicero quoting his own earlier remark) ' +
            'are unwrapped and kept inline, verbatim. The work-level running-title <head> is discarded (not a ' +
            'section heading). Entities are decoded and runs of whitespace collapsed; the words are otherwise ' +
            'untouched.',
          'The source also prints the oration\'s traditional chapter citation inline, as <milestone ' +
            'unit="chapter" n="N"/> markers (11 total, sequential). Each section\'s Division.ref is set to the ' +
            'chapter number active at that section\'s start - the nearest preceding milestone in document order - ' +
            'built by a single left-to-right pass that never looks ahead; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by section (Division.id "sec-N" / Division.number "N", e.g. "Marcell. 19") - the ' +
            'same numbering the source itself prints and the modern standard citation unit for this speech - plus, ' +
            'in Division.ref, the traditional chapter number (e.g. "5") active at that section\'s start, ' +
            'reconstructed from the source\'s own inline chapter milestones. sec-1\'s ref is null: the source\'s ' +
            'own chapter-1 milestone sits just inside sec-1\'s own text, not before it, so no chapter has yet ' +
            'begun when sec-1 opens - the one documented, expected case of a null ref in this work. Passage.ref ' +
            'is null throughout and Passage.n is "" throughout (no further printed sub-numbering survives in ' +
            'this source).',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Every irregularity is either preserved verbatim and flagged, or excluded with the exclusion ' +
            'explicitly documented; anomalies.json records the full machine-readable list.',
          'Apparatus criticus resolved into a single reading text. 137 <note> elements were excluded entirely as ' +
            'scholarly commentary, not counted individually. This witness has zero <del>, <add>, <choice>/<abbr>/' +
            '<expan>, <num>, <quote> and <l> - the simplest apparatus profile of the four speeches in this batch.',
          'English translation scope. A partial 19th-century Wikisource translation was deliberately excluded ' +
            '(see "No English edition bundled" above) - this app ships Latin only for now.',
          `Completeness. All ${EXPECTED_SECTIONS} sections and all ${EXPECTED_CHAPTERS} chapter milestones are ` +
            `present and in sequential order, from the incipit "${INCIPIT}..." to the explicit "...${EXPLICIT}"`,
        ],
      },
    ],
  };
  writeJson('about.json', about);
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
