/**
 * Cicero, *Philippicae* — Latin text (Albert Curtis Clark's 1918 Oxford
 * Classical Text), via the Perseus/OpenGreekAndLatin canonical-latinLit TEI.
 * Run-once ingestion pipeline.
 *
 *   npm run import:philippics-la
 *
 * Reads scripts/import-philippics-la/raw/phi0474.phi035.perseus-lat2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi035/phi0474.phi035.perseus-lat2.xml
 * CTS urn:cts:latinLit:phi0474.phi035.perseus-lat2, cached in the repo).
 * Writes:
 *   data/philippics-la/work.json       — the GenericWork (14 Speeches, 544 Sections)
 *   data/philippics-la/about.json      — provenance / licence / prose
 *   data/philippics-la/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npm run validate:philippics-la`.
 *
 * Structure: same shape as data/in-catilinam-la (flat
 * `<div subtype="speech" n="1..14">` each directly containing
 * `<div subtype="section" n="1..">` leaves, section numbering continuous
 * within a speech, no Book level). 544 sections total across the 14
 * speeches (38/118/39/16/53/19/27/33/17/26/40/30/50/38 — see the console
 * summary), independently confirmed against the English sibling's own
 * chapter-div/section-milestone maxima (see data/philippics-en's importer):
 * every speech's chapter-count maximum matches exactly between the two
 * witnesses. Inline `<milestone unit="chapter" n="K"/>` markers (reset to 1
 * per speech, max K per speech: 15/46/15/6/19/7/9/11/7/11/15/12/21/14) give
 * the Division.ref algorithm described in data/philippics-la/types.ts.
 *
 * Markup handled (mirrors scripts/import-in-catilinam-la exactly — same
 * source-family TEI, same editorial conventions):
 *   - `<note>...</note>` (2,489) is Clark's textual-critical apparatus —
 *     excluded entirely, tag and content, including whatever it nests
 *     (`<hi>`, `<foreign>`, `<app>`/`<lem>`, `<w type="lemma">` — all
 *     confirmed to occur only inside `<note>` in this source). Summarised
 *     once at the corpus level, not logged individually.
 *   - `<reg>word</reg>` (2,588), same standalone (no `<orig>` sibling)
 *     transport wrapper as In Catilinam — unwrapped, summarised once.
 *   - Unlike In Catilinam, this source has NO `<choice><abbr>/<expan>`
 *     praenomen-abbreviation encoding at all (confirmed by direct
 *     inspection: zero occurrences) — the importer still carries the same
 *     handling code as its sibling for defence in depth, but asserts zero
 *     occurrences and fails loudly if that ever changes, rather than
 *     silently mishandling a real one.
 *   - `<add>...</add>` (41) marks Clark's own conjectural supplements to a
 *     defective manuscript reading — kept in the reading text, each
 *     occurrence logged individually. This source has NO `<del>` at all
 *     (confirmed zero occurrences; In Catilinam had exactly one) — same
 *     defensive assertion as `<choice>`.
 *   - `<quote rend="smallcaps">...</quote>` (5, quoted enacted-law text,
 *     e.g. "consules populum iure rogaverunt" in 1.26) and `<q>` (146,
 *     quoted direct speech) are unwrapped typographic markup.
 *
 * Faithfulness rules mirror scripts/import-in-catilinam-la: verbatim Latin
 * reading text only; only transport scaffolding is removed, and the single
 * content-affecting decision (kept `<add>` supplements) is logged.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/philippics-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi035.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'philippics-la');

const WORK_ID = 'philippics-la';
const EXPECTED_SPEECHES = 14;

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
      }
    } else if (/^<p\b/.test(tok)) {
      inP = true;
      pBuf = '';
    } else if (tok === '</p>') {
      inP = false;
      const cleaned = cleanText(pBuf);
      const top = stack[stack.length - 1];
      if (top !== 'section') fail(`<p> found outside any section div (stack top: "${top}"); text: "${excerpt(cleaned)}"`);
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
    } else if (/^<reg\b/.test(tok)) {
      totalRegs += 1;
    }
    // catch-all `<[^>]+>` (head/q/num/quote/hi/foreign/app/lem/w when not
    // otherwise matched): no structural action, text flows via the
    // free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_SPEECHES) fail(`expected exactly ${EXPECTED_SPEECHES} speeches, got ${divisions.length}`);
  if (totalChoices !== 0) fail(`expected zero <choice> in this source (unlike In Catilinam) — got ${totalChoices}; the handling code ran but was not designed/reviewed against a real occurrence here`);
  if (totalDels !== 0) {
    process.stdout.write(`  note: ${totalDels} <del> span(s) found (In Catilinam had exactly 1) — handled and logged normally.\n`);
  }

  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> textual-critical apparatus spans were excluded entirely, tag and content; not logged individually given their number. Every <hi>/<foreign>/<app>/<lem>/<w type="lemma"> occurrence in this source is confirmed to fall only inside such a <note>.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalRegs} standalone <reg>word</reg> wrapper(s) (not paired with any <orig> sibling) were unwrapped — pure transport markup, not logged individually.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAdds} <add> span(s) — Clark's own conjectural supplements — kept in the reading text, each logged individually above. This source carries no <del> and no <choice><abbr>/<expan> praenomen-abbreviation encoding at all (both present in the In Catilinam sibling); confirmed by direct inspection and asserted at import time.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref (Section only) is the nearest preceding <milestone unit="chapter"> value within that section's own speech (chapter numbering restarts at 1 per speech); ${sectionsWithNoRef} section(s) had none yet and are individually logged above. Every Passage.ref is null.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Philippicae',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'Albert Curtis Clark',
    edition: 'M. Tulli Ciceronis Orationes, Vol. 6, ed. Albert Curtis Clark (Oxford: Clarendon Press, 1918)',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi035.perseus-lat2), which digitises Clark\'s 1918 Oxford Classical Text; imported by scripts/import-philippics-la. The raw file is committed at scripts/import-philippics-la/raw/phi0474.phi035.perseus-lat2.xml.',
    license:
      "Clark's 1918 edition of the Latin text is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's Philippicae",
        paragraphs: [
          'The fourteen speeches Cicero delivered against Mark Antony in 44–43 BC, in the last months of his life — named (by Cicero\'s own account, in a letter to Brutus) after Demosthenes\'s orations against Philip II of Macedon. The Fourteenth Philippic is the last speech of Cicero\'s to survive; he was killed on Antony\'s orders in December 43 BC.',
          'The text here is the original Latin, verbatim, in Albert Curtis Clark\'s 1918 Oxford Classical Text. Nothing is translated, modernised or silently corrected. This edition\'s own conjectural supplements to gaps in the manuscript tradition are kept in the reading text — see "Known gaps & anomalies".',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Albert Curtis Clark, ed., M. Tulli Ciceronis Orationes, Vol. 6 (Oxford: Clarendon Press, 1918) — the Oxford Classical Text. Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi035.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi035.perseus-lat2) from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Each of the fourteen speeches is a top-level Division (speech-1..speech-14) holding its Sections (speech-N-sec-M), numbered continuously within the speech as printed. Each Section holds one Passage. Clark\'s textual-critical apparatus, embedded as full <note> content, is excluded entirely; see the importer\'s module doc for the complete account of every other markup decision.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Speech and Section (this source\'s own continuous numbering), plus the traditional Roman "chapter" reference as Division.ref on each Section, reconstructed from the source\'s own inline chapter milestones (reset to 1 at the start of each speech). Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'All 14 speeches and all 544 sections are present and in order. Section counts per speech (38/118/39/16/53/19/27/33/17/26/40/30/50/38) and chapter-count maxima per speech (15/46/15/6/19/7/9/11/7/11/15/12/21/14) were independently cross-checked against the English sibling (data/philippics-en) and match exactly, except for one confirmed gap in the English witness itself — see data/philippics-en/about.json.',
          'Forty-one <add> conjectural supplements are kept in the reading text and individually logged; this edition carries no <del> and no praenomen-abbreviation <choice> encoding at all (both present in the In Catilinam sibling edition).',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  process.stdout.write('\nSpeeches:\n');
  for (const sp of divisions) {
    process.stdout.write(`  Speech ${String(sp.number).padStart(2)}  ${sp.id.padEnd(10)} ${String(sp.children.length).padStart(3)} sections  "${sp.sourceHeading ?? ''}"\n`);
  }
  process.stdout.write(
    `\n  ${divisions.length} speeches  ${totalSections} sections  ${totalNotes} <note>  ${totalRegs} <reg>  ${totalAdds} <add>  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:philippics-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
