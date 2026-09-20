/**
 * Cicero, *Pro Sestio* ("In Defence of Publius Sestius") - Latin text only,
 * via Perseus / OpenGreekAndLatin canonical-latinLit (CTS textgroup phi0474,
 * work phi022, edition perseus-lat2). Run-once ingestion pipeline.
 *
 *   npx tsx scripts/import-pro-sestio-la/index.ts
 *   (or: npm run import:pro-sestio-la, once wired into package.json)
 *
 * Fetches (if not already cached) and reads
 *   scripts/import-pro-sestio-la/raw/phi0474.phi022.perseus-lat2.xml
 * from
 *   https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi022/phi0474.phi022.perseus-lat2.xml
 * Idempotent: if the raw XML is already cached on disk, nothing is
 * downloaded. Writes:
 *   data/pro-sestio-la/work.json       - the GenericWork (147 flat section Divisions)
 *   data/pro-sestio-la/about.json      - provenance / licence / prose
 *   data/pro-sestio-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npx tsx scripts/import-pro-sestio-la/validate.ts`.
 *
 * Source structure (confirmed by direct inspection of the fetched XML):
 * a single `<div type="edition">`, opening with a running `<head>` title
 * (discarded - a work-level running title, not a section heading; matches
 * how this library already treats the analogous per-book `<head>` in
 * data/physics-grc), then a FLAT sequence of 147
 * `<div type="textpart" subtype="section" n="N">` divisions (N = 1..147,
 * sequential, no gaps) - there is no intermediate Book/Chapter tier. Inline
 * `<milestone unit="chapter" n="N" resp="editor"/>` markers (69 total,
 * sequential 1..69) carry the oration's traditional Roman-numeral "chapter"
 * citation, coarser than the section numbering; each section's Division.ref
 * is the chapter number active at that section's START (the nearest
 * PRECEDING milestone in document order - see data/pro-sestio-la/types.ts).
 * Most sections hold exactly one `<p>`; a few hold two (their texts are
 * joined with "\n\n" into that section's single Passage).
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-physics-grc):
 *   - verbatim Latin reading text only; no u/v or i/j regularisation, no
 *     accent/spelling/orthography/punctuation normalisation; nothing
 *     discarded or silently corrected beyond the documented apparatus
 *     handling below.
 *   - only XML transport scaffolding is removed: the work-level `<head>`,
 *     the zero-width `<milestone .../>` self-closing markers (their `n`
 *     values seed Division.ref instead), and `<note>...</note>` - Clark's
 *     apparatus criticus (manuscript sigla, proposed emendations, editors'
 *     names) - excluded ENTIRELY (tag and content), never part of the
 *     reading text. 552 occurrences.
 *   - `<del>...</del>` (3 occurrences) marks words Clark's OCT text does
 *     NOT print (an editorial deletion he judged spurious/interpolated) -
 *     EXCLUDED entirely, tag and content, same policy as
 *     import-aristotle-physics-grc; each occurrence is individually logged
 *     to anomalies.json with the excluded Latin quoted in full.
 *   - `<reg>`/`<add>`/`<num>`/`<quote>`/`<l>`/`<q>` are all unwrapped, their
 *     text KEPT inline as ordinary running prose (tags stripped only):
 *     `<reg>` = Clark's regularised-spelling form (the word he actually
 *     prints); `<add>` = his own editorial addition, incorporated into his
 *     printed text (39 occurrences); `<num rend="smallcaps">` = a numeral
 *     rendered in small capitals in print (e.g. a date, "VIII Kal. Febr.");
 *     `<quote>`/`<l>`/`<q>` wrap material Cicero himself quotes within the
 *     oration - two bare document-rubric labels ("Decvrionvm decreta.",
 *     "Litterae Ciceronis consulis.", marking where a document was read
 *     into the record but not transcribed), one verbatim quoted clause of
 *     the lex Clodia, and 18 `<l>` lines of quoted verse (tragic/epic
 *     lines Cicero cites, printed with acute-accent vowels marking metrical
 *     ictus) - all genuinely part of Cicero's own oration, not apparatus,
 *     so all are kept, inline, verbatim.
 *   - no `<choice>`/`<abbr>`/`<expan>` occur in this particular witness
 *     (confirmed by direct inspection - Pro Milone's witness does have
 *     them; see that importer).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage } from '../../data/pro-sestio-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_DIR = join(HERE, 'raw');
const RAW_XML = join(RAW_DIR, 'phi0474.phi022.perseus-lat2.xml');
const SOURCE_URL =
  'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi022/phi0474.phi022.perseus-lat2.xml';
const OUT_DIR = join(REPO_ROOT, 'data', 'pro-sestio-la');

const WORK_ID = 'pro-sestio-la';
const EXPECTED_SECTIONS = 147;
const EXPECTED_CHAPTERS = 69;
/** Verbatim incipit of sec-1's single Passage (prefix check). */
const INCIPIT = 'si quis antea, iudices, mirabatur quid esset quod, pro tantis opibus';
/** Verbatim explicit of the final section's Passage (suffix check) - truncation guard. */
const EXPLICIT = 'eos conservetis per quos me reciperavistis.';

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

/** Strip a specific paired tag ENTIRELY, content included. */
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
  // milestones are zero-width citation markers, already captured separately
  s = s.replace(/<milestone\b[^>]*\/>/g, '');
  // everything else remaining at this point (reg/add/num/quote/l/q and their
  // closes) is a purely typographic/structural wrapper around genuine
  // Cicero text - strip tags, keep the text they wrap.
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

  // 1. Apparatus criticus: <note>...</note> removed entirely (never part of
  //    Cicero's printed running text) - counted, not logged individually.
  const noteCount = (body.match(/<note\b[^>]*>/g) ?? []).length;
  body = body.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, '');

  // 2. Split into the 147 flat sections (order-preserving; attribute order
  //    in the source is type/subtype/n, tolerated via lookaheads in case a
  //    future re-fetch ever reorders them).
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

    // 3. <del>...</del> - Clark's editorial deletion, not part of his
    //    printed text - excluded, each occurrence individually logged.
    const delResult = dropTag(content, 'del');
    content = delResult.out;
    for (const text of delResult.removed) delOccurrences.push({ where, text });

    // 4. <choice><abbr>X</abbr> <expan>Y</expan></choice> - the manuscript
    //    abbreviation vs. its resolved reading; the resolved <expan> is
    //    what Clark's edition actually prints as running text, so <abbr> is
    //    dropped entirely and <choice>/<expan> unwrapped below.
    const abbrRe = /<choice>\s*<abbr>([\s\S]*?)<\/abbr>\s*<expan>([\s\S]*?)<\/expan>\s*<\/choice>/g;
    content = content.replace(abbrRe, (_whole, abbr: string, expan: string) => {
      abbrOccurrences.push({ where, abbr: abbr.replace(/<[^>]+>/g, ''), expan: expan.replace(/<[^>]+>/g, '') });
      return expan;
    });

    // 5. milestone n= values, in document order, before removing them.
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

  // --- hard structural gates --------------------------------------------
  if (parsed.sections.length !== EXPECTED_SECTIONS) {
    fail(`expected exactly ${EXPECTED_SECTIONS} sections, found ${parsed.sections.length}`);
  }
  parsed.sections.forEach((s, i) => {
    if (s.number !== i + 1) fail(`section index ${i}: carries n="${s.number}" (out of sequence)`);
  });
  if (parsed.totalMilestones !== EXPECTED_CHAPTERS) {
    fail(`expected exactly ${EXPECTED_CHAPTERS} chapter milestones, found ${parsed.totalMilestones}`);
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

  // --- build divisions ----------------------------------------------------
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

  // --- anomalies -----------------------------------------------------
  const anomalies: Anomaly[] = [];
  anomalies.push({
    where: `${WORK_ID} / refs`,
    note:
      'This source prints two independent citation schemes: its own 147 numbered sections (Division.id / ' +
      'Division.number, "sec-1".."sec-147") and, coarser, the traditional 69 Roman-numeral "chapter" citation as ' +
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
  for (const d of parsed.delOccurrences) {
    anomalies.push({
      where: d.where,
      note: `The source's own <del> marks this word as an editorial deletion Clark's OCT text does not print: ${JSON.stringify(d.text)}. Excluded entirely from the reading text, matching this library's <del> policy elsewhere (e.g. import-aristotle-physics-grc).`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / editorial additions`,
    note: `${parsed.addCount} <add> elements (Clark's own editorial additions/emendations, incorporated into his printed text) were kept inline, tags stripped, text preserved verbatim.`,
  });
  anomalies.push({
    where: `${WORK_ID} / regularised spellings`,
    note: `${parsed.regCount} <reg> elements (Clark's regularised-spelling form - the word he actually prints) were kept inline, tags stripped, text preserved verbatim.`,
  });
  anomalies.push({
    where: `${WORK_ID} / quoted material`,
    note:
      `${parsed.quoteCount} <quote>, ${parsed.lCount} <l> and ${parsed.qCount} <q> elements were unwrapped and kept ` +
      "inline as ordinary running text: these wrap material Cicero himself quotes within the oration, not " +
      'apparatus - two bare document-rubric labels ("Decvrionvm decreta.", "Litterae Ciceronis consulis.", ' +
      'marking where a document was read into the record but not transcribed, sec-10 and sec-11), one verbatim ' +
      'quoted clause of the lex Clodia (sec-33, archaic "v"-for-consonantal-"u" spelling kept exactly as printed, ' +
      'not regularised), and 18 <l> lines of quoted verse (tragic/epic lines Cicero cites in the peroratio, ' +
      'printed with acute-accent vowels marking metrical ictus, e.g. "múltae insidiae súnt bonis" - kept ' +
      'verbatim, joined into the surrounding prose with a single space per line rather than a line break, since ' +
      "this app's flat section/passage schema has no separate verse-line field here).",
  });
  if (parsed.numCount > 0) {
    anomalies.push({
      where: `${WORK_ID} / numerals`,
      note: `${parsed.numCount} <num rend="smallcaps"> element(s) (a numeral rendered in small capitals in print, e.g. the date "VIII Kal. Febr." in sec-8) were kept inline, tags stripped, text preserved verbatim.`,
    });
  }
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
      'The source uses precomposed accented Latin vowels (e.g. ú U+00FA) for the metrical-ictus marks in quoted ' +
      'verse, not combining diacritics; no HTML/XML entities occur in the reading text (only inside the ' +
      'unrelated <revisionDesc> editorial change-log, outside the body). Bytes are preserved exactly as ' +
      'transmitted; no normalisation applied.',
  });

  // --- write outputs -----------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };
  writeJson('work.json', work);
  writeJson('anomalies.json', anomalies);
  writeAbout();

  // --- console summary -----------------------------------------------------
  const totalChars = divisions.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  process.stdout.write(
    `\n  ${divisions.length} sections, ${parsed.totalMilestones} chapters, ${totalChars} chars, ${anomalies.length} anomalies recorded\n`,
  );
  process.stdout.write('\nDone. Run `npx tsx scripts/import-pro-sestio-la/validate.ts` next.\n');
}

function writeAbout(): void {
  const about = {
    workId: WORK_ID,
    title: 'Pro Sestio',
    author: 'Marcus Tullius Cicero',
    language: 'la' as const,
    edition: 'William Peterson, ed., M. Tulli Ciceronis Orationes, Vol. 5 (Oxford: Clarendon Press, 1909)',
    editor: 'William Peterson',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:' +
      'latinLit:phi0474.phi022.perseus-lat2); imported by scripts/import-pro-sestio-la.',
    license:
      "Peterson's 1909 critical edition and Cicero's Latin text are in the public domain. The digital " +
      'transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under ' +
      'the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).',
    sections: [
      {
        heading: 'Pro Sestio',
        paragraphs: [
          'Delivered in 56 BC, Pro Sestio is Cicero\'s defence of Publius Sestius, a tribune of the plebs ' +
            'prosecuted for political violence during the campaign to secure Cicero\'s own recall from exile. ' +
            'The speech ranges far beyond the narrow legal charge into a sweeping defence of Cicero\'s consulship, ' +
            'his exile and restoration, and - in its famous central digression - a manifesto for the optimates, ' +
            'the "boni", as the party of constitutional order against popular demagoguery.',
          'The text here is Latin only, verbatim. Nothing is translated, modernised, normalised or silently ' +
            'corrected beyond the documented resolution of the source\'s own critical-apparatus markup (see "How ' +
            'it was imported" below). Where the source is irregular or a genuine judgement call was made, it is ' +
            'preserved/recorded and flagged in "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'No English edition bundled - by design',
        paragraphs: [
          'No English translation of Pro Sestio is bundled alongside this Latin text. This is a deliberate ' +
            'choice, not an oversight: two independent research passes searched Perseus\'s own CTS catalog for ' +
            'this work (which lists no "perseus-eng*" English witness for phi0474.phi022), English Wikisource, ' +
            'and Project Gutenberg, and found no public-domain, complete digital English translation that meets ' +
            'this app\'s two-source verification policy. A handful of 19th-century (Yonge-tradition) translation ' +
            'leads exist only on the Internet Archive, outside this app\'s established two-source policy for ' +
            'translation-hunting, and were not independently verified for completeness - so they were not used. ' +
            'Rather than ship an unverified or partial English text, the decision was to publish the Latin text ' +
            'on its own, mirroring how this library already handles Aristotle\'s Physics (data/physics-grc) when ' +
            'no suitable public-domain translation could be confirmed. A future contributor who locates and ' +
            'verifies a suitable source is welcome to add a companion data/pro-sestio-en/ work following the ' +
            'same flat section shape defined in data/pro-sestio-la/types.ts.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'The printed source, per this XML file\'s own <teiHeader>/<sourceDesc> and __cts__.xml, is William ' +
            'Peterson, ed., M. Tulli Ciceronis Orationes, Vol. 5 (Oxford: Clarendon Press, 1909) - part of the ' +
            'Scriptorum Classicorum Bibliotheca Oxoniensis (Oxford Classical Texts) series.',
          'The oration is divided into 147 numbered sections (the modern citation unit, e.g. "Sest. 96") and, ' +
            'more coarsely, 69 traditional Roman-numeral "chapters" (e.g. "Sest. xliv"), both printed in this ' +
            'source; see "Reference scheme" below for how each is represented here.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI/EpiDoc XML file phi0474.phi022.perseus-lat2.xml (CTS urn:cts:' +
            'latinLit:phi0474.phi022.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin ' +
            'canonical-latinLit repository. It is fetched once (and cached under the importer\'s own raw/ ' +
            'directory) and bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer slices the single <div type="edition"> body into its 147 flat, numbered <div ' +
            'type="textpart" subtype="section"> divisions (there is no intervening Book/Chapter tier), then takes ' +
            'the <p> paragraph(s) inside each section (joined with a blank line if more than one) as that ' +
            'section\'s single Passage. Clark\'s apparatus criticus (<note>, 552 occurrences: manuscript sigla, ' +
            'proposed emendations, editors\' names) is excluded entirely, tag and content - it is scholarly ' +
            'commentary on the text, never Cicero\'s own words. <del> (3 occurrences: words the editor judged ' +
            'spurious and does not print) is likewise excluded entirely, each one individually logged in ' +
            'anomalies.json. <reg> (the editor\'s regularised-spelling form), <add> (his own editorial addition, ' +
            'incorporated into the printed text), <num rend="smallcaps"> (a numeral set in small capitals, e.g. a ' +
            'date), and <quote>/<l>/<q> (material Cicero himself quotes - document rubrics, a verbatim legal ' +
            'clause, and quoted verse) are all unwrapped and kept inline, verbatim: these are genuinely part of ' +
            'what Clark prints as Cicero\'s oration, not apparatus. The work-level running-title <head> is ' +
            'discarded (not a section heading). Entities are decoded and runs of whitespace collapsed; the words ' +
            'are otherwise untouched.',
          'The source also prints the oration\'s traditional chapter citation inline, as <milestone ' +
            'unit="chapter" n="N"/> markers (69 total, sequential). Each section\'s Division.ref is set to the ' +
            'chapter number active at that section\'s start - the nearest preceding milestone in document order - ' +
            'built by a single left-to-right pass that never looks ahead; see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by section (Division.id "sec-N" / Division.number "N", e.g. "Sest. 96") - the same ' +
            'numbering the source itself prints and the modern standard citation unit for this speech - plus, in ' +
            'Division.ref, the traditional chapter number (e.g. "44") active at that section\'s start, reconstructed ' +
            'from the source\'s own inline chapter milestones. sec-1\'s ref is null: the source\'s own chapter-1 ' +
            'milestone sits just inside sec-1\'s own text, not before it, so no chapter has yet begun when sec-1 ' +
            'opens - the one documented, expected case of a null ref in this work. Passage.ref is null throughout ' +
            'and Passage.n is "" throughout (no further printed sub-numbering survives in this source).',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Every irregularity is either preserved verbatim and flagged, or excluded with the exclusion ' +
            'explicitly documented; anomalies.json records the full machine-readable list.',
          'Apparatus criticus resolved into a single reading text. 552 <note> elements (manuscript sigla, ' +
            'proposed emendations, editors\' names) were excluded entirely as scholarly commentary, not counted ' +
            'individually. 3 <del> elements (editorial deletions Clark does not print) were excluded entirely, ' +
            'each individually logged with the excluded Latin quoted in full. 39 <add> elements (Clark\'s own ' +
            'editorial additions, incorporated into his printed text) were kept inline.',
          'Quoted material kept inline. Two bare document-rubric labels ("Decvrionvm decreta.", "Litterae ' +
            'Ciceronis consulis.") mark where a document was read into the record but not transcribed; one ' +
            'verbatim clause of the lex Clodia is quoted with its archaic "v"-for-consonantal-"u" spelling ' +
            'preserved exactly, not regularised; 18 <l> lines of quoted verse (with acute-accent metrical-ictus ' +
            'marks) are joined inline into the surrounding prose rather than kept as separate verse lines, since ' +
            'this work\'s flat section/passage schema has no dedicated verse-line field.',
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
