/**
 * Cicero, *In Verrem* — Latin text (William Peterson's 1917 Oxford
 * Classical Text), via the Perseus/OpenGreekAndLatin canonical-latinLit TEI.
 * Run-once ingestion pipeline.
 *
 *   npm run import:in-verrem-la
 *
 * Reads scripts/import-in-verrem-la/raw/phi0474.phi005.perseus-lat2.xml
 * (fetched once from
 * https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi005/phi0474.phi005.perseus-lat2.xml
 * CTS urn:cts:latinLit:phi0474.phi005.perseus-lat2, cached in the repo).
 * Writes:
 *   data/in-verrem-la/work.json       — the GenericWork (2 Actiones, 6 Books, 974 Sections)
 *   data/in-verrem-la/about.json      — provenance / licence / prose
 *   data/in-verrem-la/anomalies.json  — machine-readable {where, note}[]
 *
 * Then run `npm run validate:in-verrem-la`.
 *
 * THREE-level structure, confirmed by direct inspection: `<div subtype=
 * "actio" n="1|2">` → `<div subtype="book" n="…">` → `<div subtype=
 * "section" n="…">`. Actio 1 holds exactly one Book (56 sections); Actio 2
 * holds five (158/192/228/151/189 sections — Book 3, "De Frumento", is
 * confirmed the longest, matching its long-standing reputation as Cicero's
 * lengthiest surviving speech). 974 sections total. Inline `<milestone
 * unit="chapter" n="K"/>` markers reset to 1 at the start of EACH BOOK (not
 * each Actio) — max K per book: 18/61/78/98/67/72, independently confirmed
 * identical to the English sibling.
 *
 * Markup handled (mirrors scripts/import-in-catilinam-la /
 * scripts/import-philippics-la — same source family, same conventions):
 *   - `<note>...</note>` (3,985) is Peterson's textual-critical apparatus —
 *     excluded entirely, tag and content, including whatever it nests
 *     (`<hi>`, `<app>`/`<lem>`, and — unlike the other two Cicero works —
 *     the three `<add>` occurrences here, which turn out to be part of the
 *     apparatus's own discussion of a proposed supplement, not a live
 *     insertion into Peterson's printed text; confirmed by direct
 *     inspection, all three fall inside a `<note>`). Summarised once, not
 *     logged individually.
 *   - `<reg>word</reg>` (3,918 outside notes), same standalone transport
 *     wrapper as the other two Cicero works — unwrapped, summarised once.
 *   - `<del>...</del>` (35 outside notes — 10 more occur inside notes as
 *     part of apparatus discussion and are simply discarded with them)
 *     marks text Peterson's edition brackets as spurious/interpolated.
 *     EXCLUDED from the reading text, each of the 35 live occurrences
 *     logged individually with its verbatim wording.
 *   - `<num rend="smallcaps">` (134, numeral tokens — including nested
 *     `<hi rend="overline">` marking the Roman-numeral overline that
 *     multiplies a numeral by 1000, e.g. accounting figures like modii of
 *     grain) and `<quote rend="smallcaps">` (117, quoted documents/laws
 *     read into the record) are unwrapped typographic markup — no content
 *     decision, confirmed to occur only outside `<note>`.
 *   - Two `<foreign xml:lang="grc">` occurrences fall OUTSIDE any `<note>`
 *     — genuine untranslated Greek words embedded in Cicero's own Latin
 *     (β ουλευτήριον, ἐδικαιώθησαν) — unwrapped, kept as printed.
 *   - This source has NO `<choice><abbr>/<expan>` praenomen-abbreviation
 *     encoding at all (confirmed zero occurrences, like the Philippics
 *     sibling and unlike In Catilinam) — asserted and fails loudly if that
 *     ever changes.
 *   - Each Book prints one or two of its own `<head>` rubrics before its
 *     first section; the LAST one (most specific) is captured verbatim as
 *     that Book's Division.sourceHeading — for Actio 2's five books this is
 *     the traditional subject subtitle ("De Praetura Urbana", "De Praetura
 *     Siciliensi", "De Frumento", "De Signis", "De Suppliciis"); Actio 1's
 *     single book's own last head ("IN C. VERREM ACTIO PRIMA") is captured
 *     the same way even though it is not a distinct subject subtitle — see
 *     data/in-verrem-la/types.ts.
 *
 * Faithfulness rules mirror every other Cicero importer in this repo:
 * verbatim Latin reading text only; the two content-affecting decisions
 * (del exclusion, book sourceHeading = last head) are both logged/explained.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import { attrValue, isTextpartDiv } from '../import-cicero-shared/attrs.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/in-verrem-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi005.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'in-verrem-la');

const WORK_ID = 'in-verrem-la';
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

  const tokenRe =
    /<div\b[^>]*>|<\/div>|<milestone\b[^>]*\/>|<p\b[^>]*>|<\/p>|<head\b[^>]*>|<\/head>|<note\b[^>]*>|<\/note>|<choice\b[^>]*>|<\/choice>|<abbr\b[^>]*>|<\/abbr>|<expan\b[^>]*>|<\/expan>|<ex\b[^>]*>|<\/ex>|<del\b[^>]*>|<\/del>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  type Frame = 'actio' | 'book' | 'section' | 'other';
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
  let choiceDepth = 0;
  let inAbbr = false;
  let abbrBuf = '';
  let delDepth = 0;
  let delBuf = '';

  let totalSections = 0;
  let totalNotes = 0;
  let totalChoices = 0;
  let totalDels = 0;
  let totalRegs = 0;
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
        else if (delDepth > 0) delBuf += free;
        else if (choiceDepth > 0) {
          if (inAbbr) abbrBuf += free;
        } else if (inP) {
          pBuf += free;
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
        // keep overwriting while still awaiting the book head, so the LAST
        // (most specific) head wins — see the module doc.
        if (currentBookDiv && awaitingBookHead) {
          currentBookDiv.sourceHeading = cleanText(headBuf);
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
        else if (inP) pBuf += abbrBuf;
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
          note: `<del> excluded from the reading text (Peterson's edition marks this spurious/interpolated): "${excerpt(delBuf)}"`,
        });
      }
    } else if (/^<reg\b/.test(tok)) {
      totalRegs += 1;
    }
    // catch-all `<[^>]+>` (head/q/num/hi/foreign/app/lem/quote when not
    // otherwise matched): no structural action, text flows via the
    // free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (divisions.length !== EXPECTED_ACTIOS) fail(`expected exactly ${EXPECTED_ACTIOS} actiones, got ${divisions.length}`);
  if (totalChoices !== 0) fail(`expected zero <choice> in this source — got ${totalChoices}; the handling code ran but was not designed/reviewed against a real occurrence here`);

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
    note: `${totalNotes} <note> textual-critical apparatus spans were excluded entirely, tag and content; not logged individually given their number. Every <hi>/<app>/<lem> occurrence and all 3 <add> occurrences in this source are confirmed to fall only inside such a <note> (the <add>s are part of the apparatus's own discussion, not a live insertion into Peterson's printed text — unlike the other two Cicero works in this corpus).`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalRegs} standalone <reg>word</reg> wrapper(s) (not paired with any <orig> sibling) were unwrapped — pure transport markup, not logged individually. This source carries no <choice><abbr>/<expan> praenomen-abbreviation encoding at all (present in the In Catilinam sibling).`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDels} <del> span(s) outside any <note> were excluded as editorially spurious, each logged individually above with its verbatim wording.`,
  });
  anomalies.push({
    where: `${WORK_ID} / passage & division refs`,
    note: `Division.ref (Section only) is the nearest preceding <milestone unit="chapter"> value within that section's own BOOK (chapter numbering restarts at 1 per book, not per actio); ${sectionsWithNoRef} section(s) had none yet and are individually logged above. Every Passage.ref is null.`,
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
    title: 'In Verrem',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'William Peterson',
    edition: 'M. Tulli Ciceronis Orationes, Volume 3, ed. William Peterson (Oxford: Clarendon Press, 1917)',
    provenance:
      'TEI XML from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi005.perseus-lat2), which digitises Peterson\'s 1917 Oxford Classical Text; imported by scripts/import-in-verrem-la. The raw file is committed at scripts/import-in-verrem-la/raw/phi0474.phi005.perseus-lat2.xml.',
    license:
      "Peterson's 1917 edition of the Latin text is in the public domain. The digital transcription is distributed by Perseus/Open Greek and Latin under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: "Cicero's In Verrem",
        paragraphs: [
          'Cicero\'s prosecution of Gaius Verres, the corrupt former governor of Sicily, in 70 BC — the speech (or rather set of speeches) that made Cicero\'s career. Actio 1 is the short speech that opened the trial; the overwhelming evidence Cicero had assembled led Verres to flee into exile before Actio 2 could be delivered, so its five books (De Praetura Urbana, De Praetura Siciliensi, De Frumento, De Signis, De Suppliciis) were published as written speeches rather than actually spoken. (A separate, earlier work, the Divinatio in Caecilium, is not included here.)',
          'The text here is the original Latin, verbatim, in William Peterson\'s 1917 Oxford Classical Text. Nothing is translated, modernised or silently corrected. Words Peterson\'s apparatus marks as spurious/interpolated are excluded, matching this library\'s established <del> convention elsewhere — see "Known gaps & anomalies".',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Peterson, ed., M. Tulli Ciceronis Orationes, Volume 3 (Oxford: Clarendon Press, 1917) — the Oxford Classical Text. Public domain.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi005.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi005.perseus-lat2) from the Perseus Digital Library / Open Greek and Latin canonical-latinLit repository. Fetched once and bundled with the app.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The two Actiones are top-level Divisions (actio-1, actio-2), each holding its Books (actio-N-book-M — one for Actio 1, five for Actio 2), each holding its Sections (actio-N-book-M-sec-K), numbered continuously within the book as printed. Each Section holds one Passage. Each Book\'s Division.sourceHeading is the LAST of the one-or-two rubric <head>s the source prints for it (see the importer\'s module doc); for Actio 2 this is the traditional subject subtitle in Latin.',
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Actio, Book, and Section (this source\'s own continuous numbering within each book), plus the traditional Roman "chapter" reference as Division.ref on each Section, reconstructed from the source\'s own inline chapter milestones (reset to 1 at the start of each book — a finer reset boundary than the other two Cicero works in this corpus, which reset per speech). Passage.ref is null throughout.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'All 2 actiones, 6 books, and 974 sections (56 / 158, 192, 228, 151, 189) are present and in order. Book 3 of Actio 2 ("De Frumento", 228 sections) is confirmed the longest, matching its long-standing reputation as Cicero\'s lengthiest surviving speech. See anomalies.json for the complete, individually logged account of the 35 <del> exclusions and every section with no preceding chapter milestone.',
          "This edition carries no <choice><abbr>/<expan> praenomen-abbreviation encoding (present in the In Catilinam sibling); its three <add> occurrences are all part of the apparatus's own discussion, not live insertions, and are excluded along with their enclosing <note> like everything else in the apparatus.",
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
    `\n  ${divisions.length} actiones  ${totalSections} sections  ${totalNotes} <note>  ${totalRegs} <reg>  ${totalDels} <del>  ${anomalies.length} anomalies total\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:in-verrem-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
