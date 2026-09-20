/**
 * Cicero, *In Catilinam* — Latin text (Albert Curtis Clark's 1908 Oxford
 * Classical Text), via the Perseus/OpenGreekAndLatin canonical-latinLit TEI.
 * Run-once ingestion pipeline.
 *
 *   npm run import:in-catilinam-la
 *
 * Reads scripts/import-in-catilinam-la/raw/phi0474.phi013.perseus-lat2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi013/phi0474.phi013.perseus-lat2.xml
 * CTS urn:cts:latinLit:phi0474.phi013.perseus-lat2, and cached in the repo —
 * re-running this script never re-fetches). Writes:
 *   data/in-catilinam-la/work.json       — the GenericWork (4 Speeches, 115 Sections)
 *   data/in-catilinam-la/about.json      — provenance / licence / prose
 *   data/in-catilinam-la/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npm run validate:in-catilinam-la`.
 *
 * Structure, confirmed by direct inspection of the fetched XML: a flat
 * `<div type="textpart" subtype="speech" n="1..4">` per oration, each
 * directly containing `<div type="textpart" subtype="section" n="1..">`
 * leaves (section numbering continuous within a speech, NOT reset per
 * chapter) — no Book level. 33/29/29/24 sections per speech (115 total),
 * matching the traditionally cited counts exactly. Inline
 * `<milestone unit="chapter" n="K"/>` markers (numbering reset to 1 at each
 * speech) give the coarser traditional chapter citation; see
 * data/in-catilinam-la/types.ts for the full Division.ref algorithm.
 *
 * Markup handled (every occurrence individually logged to anomalies.json
 * except where noted):
 *   - `<note>...</note>` (482 total) is Clark's textual-critical apparatus
 *     (manuscript sigla, variant readings, editors' conjectures) — not
 *     Cicero's text. EXCLUDED entirely, tag and content, including
 *     whatever it nests (`<hi>`, `<foreign>`, `<app>`/`<lem>` — all
 *     confirmed to occur only inside `<note>` in this source). Not logged
 *     individually (482 would dwarf the rest of anomalies.json for routine
 *     apparatus), summarised once at the corpus level — mirrors this
 *     app's existing Rackham/Bekker-note convention.
 *   - `<reg>word</reg>` (461 occurrences) appears standalone in this source
 *     — NOT paired with a sibling `<orig>` the way TEI `<choice>` normally
 *     regularises spelling. Unwrapped (tag dropped, text kept) as pure
 *     transport markup; not logged individually, summarised once.
 *   - `<choice><abbr>X.</abbr> <expan>X<ex>...</ex></expan></choice>` (70
 *     occurrences, always a Roman praenomen: "Ti.", "C.", "L.", "M.") —
 *     `<abbr>` is the form Clark's edition actually PRINTS (Latin
 *     praenomina are conventionally abbreviated in running prose);
 *     `<expan>` is the encoder's un-printed editorial full form. Per this
 *     app's verbatim-text-only policy, the reading text keeps the printed
 *     `<abbr>` form and drops the `<expan>`/`<ex>` content entirely — NOT
 *     logged individually (a uniform, mechanical encoding convention, not
 *     an irregularity each time), summarised once at the corpus level. If
 *     this decision should instead prefer the expanded name, that is a
 *     one-line change to the importer — flagged in the final report.
 *   - `<del>...</del>` (1 occurrence, section 3.25: "atque... illae tamen
 *     omnes") marks text Clark's edition brackets as a spurious later
 *     addition ("seclusi" in the apparatus). EXCLUDED from the reading
 *     text, logged individually with its verbatim wording — mirrors this
 *     app's Euclid/Aeneid/Metaphysics `<del>` convention.
 *   - `<add>...</add>` (8 occurrences) marks Clark's own conjectural
 *     supplements to a defective manuscript reading. KEPT in the reading
 *     text (mirrors the same convention), each occurrence logged
 *     individually with its wording.
 *   - `<hi>`, `<foreign>`, `<app>`/`<lem>` occur only inside `<note>` in
 *     this source (confirmed by direct inspection) — excluded as part of
 *     the note, no separate handling needed.
 *   - `<q>` (10, quoted direct speech), `<num>` (3, Roman numeral date
 *     tokens), and each speech's own `<head>` rubric are unwrapped
 *     typographic/structural markup — no content-level decision.
 *
 * Faithfulness rules mirror every other importer in this repo: verbatim
 * Latin reading text only; only transport scaffolding and the two
 * documented editorial resolutions above (del exclusion, choice→abbr) are
 * content-affecting, and both are logged.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/in-catilinam-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi013.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'in-catilinam-la');

const WORK_ID = 'in-catilinam-la';
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

  const tokenRe =
    /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<choice\b[^>]*>|<\/choice>|<abbr\b[^>]*>|<\/abbr>|<expan\b[^>]*>|<\/expan>|<ex\b[^>]*>|<\/ex>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'speech' | 'section' | 'other';
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
  let choiceDepth = 0;
  let inAbbr = false;
  let abbrBuf = '';
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let totalSections = 0;
  let totalNotes = 0;
  let totalChoices = 0;
  let totalDels = 0;
  let totalAdds = 0;
  let totalRegs = 0;
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
        else if (delDepth > 0) delBuf += free;
        else if (choiceDepth > 0) {
          if (inAbbr) abbrBuf += free;
        } else if (inP) {
          pBuf += free;
          if (addDepth > 0) addBuf += free;
        }
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (noteDepth > 0) {
      if (/^<note\b/.test(tok)) noteDepth += 1; // defensive: notes are not observed to nest in this source
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
      } else {
        stack.push('other');
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
      }
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
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (/^<choice\b/.test(tok)) {
      choiceDepth += 1;
      inAbbr = false;
      abbrBuf = '';
    } else if (tok === '</choice>') {
      choiceDepth = Math.max(0, choiceDepth - 1);
      if (choiceDepth === 0) {
        if (inHead) headBuf += abbrBuf;
        else if (delDepth > 0) delBuf += abbrBuf;
        else if (inP) {
          pBuf += abbrBuf;
          if (addDepth > 0) addBuf += abbrBuf;
        }
        totalChoices += 1;
        abbrBuf = '';
      }
    } else if (/^<abbr\b/.test(tok)) {
      inAbbr = true;
    } else if (tok === '</abbr>') {
      inAbbr = false;
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth = Math.max(0, delDepth - 1);
      if (delDepth === 0) {
        totalDels += 1;
        anomalies.push({
          where: currentSectionId,
          note: `<del> excluded from the reading text (Clark's edition marks this spurious/interpolated): "${excerpt(delBuf)}"`,
        });
      }
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth = Math.max(0, addDepth - 1);
      if (addDepth === 0) {
        totalAdds += 1;
        anomalies.push({
          where: currentSectionId,
          note: `<add>${excerpt(addBuf)}</add> — Clark's own conjectural supplement, kept in the reading text.`,
        });
      }
    } else if (/^<reg\b/.test(tok) || tok === '</reg>') {
      if (tok === '<reg>' || /^<reg\b/.test(tok)) totalRegs += 1;
      // pure transport wrapper (see module doc) — text already flows via the free-text capture above.
    }
    // The final catch-all `<[^>]+>` (head/q/num/hi/foreign/app/lem/ex when not
    // otherwise matched, and any other stray tag) needs no structural action:
    // content already flows into the active buffer above, gated by noteDepth/
    // delDepth/choiceDepth/inP/inHead exactly as documented.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_SPEECHES) fail(`expected exactly ${EXPECTED_SPEECHES} speeches, got ${divisions.length}`);

  // --- cross-check section counts against the traditionally cited numbers ---
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

  // --- corpus-level anomalies ------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> textual-critical apparatus spans (manuscript sigla, variant readings, editorial conjecture discussion — not Cicero's text) were excluded entirely, tag and content; not logged individually given their number. Every <hi>/<foreign>/<app>/<lem> occurrence in this source is confirmed to fall only inside such a <note>.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalRegs} standalone <reg>word</reg> wrapper(s) (not paired with any <orig> sibling in this source) were unwrapped — pure transport markup, not logged individually.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalChoices} <choice><abbr>/<expan> pair(s) — every one a Roman praenomen abbreviation (Ti./C./L./M.) — kept the printed <abbr> form and dropped the un-printed <expan>/<ex> editorial expansion; not logged individually (a uniform encoding convention, not a per-occurrence irregularity). See the module doc if the opposite choice (expanded names) is preferred instead.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDels} <del> span(s) excluded as editorially spurious and ${totalAdds} <add> span(s) kept as editorial supplements — each logged individually above with its verbatim wording.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref (Section only) is the nearest preceding <milestone unit="chapter"> value within that section's own speech (chapter numbering restarts at 1 per speech); ${sectionsWithNoRef} section(s) had none yet and are individually logged above. Every Passage.ref is null: no chapter-level marker is printed finer than the section itself.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs ------------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'In Catilinam',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'Albert Curtis Clark',
    edition: 'M. Tulli Ciceronis Orationes, Volume 1, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1908)',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi013.perseus-lat2), which digitises Clark\'s 1908 Oxford Classical Text; imported by scripts/import-in-catilinam-la. The raw file is committed at scripts/import-in-catilinam-la/raw/phi0474.phi013.perseus-lat2.xml.',
    license:
      "Clark's 1908 edition of the Latin text is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's In Catilinam",
        paragraphs: [
          'The four speeches Cicero delivered against Lucius Sergius Catilina in 63 BC, as consul, denouncing Catiline\'s conspiracy to overthrow the Roman Republic — among the most famous political oratory to survive from antiquity, opening with the celebrated "Quo usque tandem abutere, Catilina, patientia nostra?"',
          'The text here is the original Latin, verbatim, in Albert Curtis Clark\'s 1908 Oxford Classical Text. Nothing is translated, modernised or silently corrected. One word Clark\'s apparatus marks as a spurious later addition is excluded (matching this library\'s established <del> convention elsewhere); his own conjectural supplements are kept — see "Known gaps & anomalies".',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Albert Curtis Clark, ed., M. Tulli Ciceronis Orationes, Volume 1 (Oxford: Clarendon Press, 1908) — the Oxford Classical Text. Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi013.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi013.perseus-lat2) from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository. Fetched once and bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the four speeches is a top-level Division (speech-1..speech-4) holding its Sections (speech-N-sec-M), numbered continuously within the speech as printed. Each Section holds one Passage — its <p> text, transport scaffolding stripped (entities decoded, whitespace collapsed). Clark\'s textual-critical apparatus, embedded inline as full <note> content (manuscript sigla, variant readings, conjecture — not Cicero\'s own words), is excluded entirely; see the importer\'s module doc for the complete, itemised account of every other markup decision (the single <del>, the eight <add>, and the seventy <choice><abbr>/<expan> praenomen abbreviations).',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Speech and Section (this source\'s own continuous numbering), plus the traditional Roman "chapter" reference as Division.ref on each Section — reconstructed from the source\'s own inline chapter milestones (also reset to 1 at the start of each speech). Passage.ref is null throughout: no finer per-paragraph reference is printed.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'All 4 speeches and all 115 sections (33/29/29/24) are present and in order, matching the traditionally cited section counts exactly. See anomalies.json for the complete, individually logged account of the one <del> exclusion, the eight <add> supplements, and every section with no preceding chapter milestone.',
          'Seventy <choice><abbr>/<expan> pairs (all Roman praenomen abbreviations, e.g. "Ti." for Tiberius) keep the literally-printed abbreviated form in the reading text rather than the un-printed editorial expansion — see the importer\'s module doc for the reasoning; flagged in the final import report as a judgment call rather than a hard rule from the source.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary -----------------------------------------------
  process.stdout.write('\nSpeeches:\n');
  for (const sp of divisions) {
    const want = CANONICAL_SECTION_COUNTS[Number(sp.number)];
    process.stdout.write(`  Speech ${sp.number}  ${sp.id.padEnd(9)} ${String(sp.children.length).padStart(3)} sections (traditionally cited ${want})  "${sp.sourceHeading ?? ''}"\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} speeches  ${totalSections} sections  ${totalNotes} <note>  ${totalRegs} <reg>  ${totalChoices} <choice>  ${totalDels} <del>  ${totalAdds} <add>  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:in-catilinam-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
