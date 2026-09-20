/**
 * Cicero, De Divinatione — English translation (trans. William Armistead
 * Falconer, Loeb Classical Library, 1923 printing; CTS urn:cts:latinLit:
 * phi0474.phi053.perseus-eng1, part of the same combined Loeb volume as the
 * companion De Amicitia/De Senectute English translations). Run-once
 * ingestion pipeline.
 *
 *   npm run import:de-divinatione-en
 *
 * Reads scripts/import-de-divinatione-en/raw/phi0474.phi053.perseus-eng1.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-divinatione-en/work.json       - the GenericWork (2 Books, each
 *                                            a flat list of section divisions)
 *   data/de-divinatione-en/about.json      - provenance / licence / prose
 *   data/de-divinatione-en/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-divinatione-en`.
 *
 * IMPORTANT structural difference from the Latin sibling (confirmed by
 * direct inspection): this witness carries only the 2 Book divs
 * (`<div type="textpart" subtype="book" n="1"/"2">`) — NO section divs at
 * all, and no "ARGUMENTUM" synopsis (that is specific to the Latin
 * edition's own front matter). Sections are recovered entirely from this
 * source's own inline `<milestone unit="section" n="N"/>` markers (one
 * occurrence is misspelled `unit="seciton"` — a genuine source typo,
 * treated identically), which frequently fall MID-PARAGRAPH. A handful of
 * quoted-verse blocks (Cicero's own early poem "Marius", and his verse
 * translation of Aratus's Prognostica) are printed as a bare
 * `<quote>...<l>...</l>...</quote>` sitting directly between two `<p>`
 * elements, not inside either — this importer captures ALL text within a
 * Book (not just text inside a `<p>`), so this content is not lost; it
 * simply becomes part of whichever section's piece it falls within (the
 * quote's own verse-line breaks are not specially preserved, matching this
 * app's usual whitespace-collapse rule elsewhere).
 *
 * GENUINE SOURCE GAP (verified by direct inspection, not a parser bug): the
 * Book 1 section-milestone sequence skips n="25" entirely (…24, 26…) — no
 * duplicate (compare the companion De Senectute English witness's "35"/"35b"
 * duplicate — a different kind of irregularity). Nothing is fabricated to
 * fill it: `book-1-sec-25` simply does not exist in this witness; its
 * content is present in the Latin sibling (data/de-divinatione-la), which
 * has no such gap. Book 2's own section-milestone sequence is complete
 * (1..150, no gaps) — confirmed by direct inspection, not assumed from
 * Book 1's irregularity.
 *
 * Faithfulness rules (mirrors scripts/import-de-senectute-en, the other
 * milestone-only witness in this batch):
 *   - verbatim English (Falconer's own translation) reading text only.
 *   - `<note>...</note>` (289 total) is Falconer's own translator's
 *     footnote — excluded entirely (tag AND content).
 *   - `<bibl>...</bibl>` (5 occurrences, each nested inside a `<cit>`
 *     alongside a `<quote>`) is a citation gloss identifying the source of a
 *     quoted verse fragment — excluded entirely, tag and content.
 *   - `<foreign>`, `<quote>`, `<hi rend="italics">`, `<l>` (verse lines) are
 *     unwrapped, text kept.
 *   - `<milestone unit="chapter"/>` (130) and `unit="section"/"seciton"`
 *     (280 + 1 misspelled) are zero-width transport scaffolding — stripped;
 *     their values instead build Division.ref and the section cut points.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-divinatione-en/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi053.perseus-eng1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-divinatione-en');
const WORK_ID = 'de-divinatione-en';

interface Anomaly {
  where: string;
  note: string;
}

// [book, expected section count, known gap n (null = no gap - complete 1..count)]
const BOOK_EXPECTATIONS: Array<{ count: number; gap: number | null }> = [
  { count: 131, gap: 25 },
  { count: 150, gap: null },
];

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const xml = readFileSync(RAW_XML, 'utf8');
  process.stdout.write(`parsing ${RAW_XML} ...\n`);

  const textStart = xml.indexOf('<text');
  const textEnd = xml.indexOf('</text>');
  if (textStart < 0 || textEnd < 0) fail('no <text>...</text> found in source XML');
  const body = xml.slice(textStart, textEnd);

  const tokenRe =
    /<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="book")[^>]*\bn="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<bibl\b[^>]*>|<\/bibl>|<milestone\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentSectionNum: string | null = null;
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let currentChapterRef: string | null = null;

  let pBuf = '';
  let noteDepth = 0;
  let biblDepth = 0;

  let totalNotes = 0;
  let totalBibl = 0;
  let totalChapterMilestones = 0;
  let totalSectionMilestones = 0;
  let totalTyposFixed = 0;

  /** Flush whatever has accumulated in pBuf as one text-run piece of the
   *  current section. A flush point here can be triggered either by a real
   *  `</p>` or by a section/chapter milestone that happens to sit right at
   *  the very start of a `<p>` - the latter case routinely leaves pBuf
   *  holding nothing but incidental inter-tag whitespace (this source has no
   *  <del>-style exclusion that could genuinely blank out real content, so
   *  there is no legitimate case here where that would signal lost text);
   *  such a buffer is dropped silently rather than logged as an anomaly. */
  function flushPiece(): void {
    if (pBuf.length === 0) return;
    const cleaned = cleanText(pBuf);
    pBuf = '';
    if (cleaned.length === 0) return;
    sectionParagraphs.push(cleaned);
  }

  function closeSectionIfOpen(): void {
    if (currentSectionNum === null) return;
    flushPiece();
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    const division: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: currentChapterRef,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(division);
  }

  function openSection(n: string): void {
    closeSectionIfOpen();
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (currentBookDiv && noteDepth === 0 && biblDepth === 0) pBuf += free;
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      stack.push('book');
      currentBookNum = Number(m[1]);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 2) {
        fail(`unexpected book number "${m[1]}"`);
      }
      currentChapterRef = null;
      currentSectionNum = null;
      currentBookDiv = {
        id: `book-${currentBookNum}`,
        number: String(currentBookNum),
        ref: null,
        sourceHeading: null,
        editorialTitle: null,
        children: [],
        passages: [],
      };
      divisions.push(currentBookDiv);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'book') {
        closeSectionIfOpen();
        currentSectionNum = null;
        currentBookDiv = null;
      }
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      // no state change - flushPiece() at </p> or the next section cut does the work
    } else if (tok === '</p>') {
      flushPiece();
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<bibl\b/.test(tok)) {
      biblDepth += 1;
    } else if (tok === '</bibl>') {
      biblDepth -= 1;
      totalBibl += 1;
    } else if (/^<milestone\b/.test(tok)) {
      const unitMatch = /unit="([^"]+)"/.exec(tok);
      const nMatch = /\sn="([^"]+)"/.exec(tok);
      const unit = unitMatch?.[1];
      if (unit === 'chapter' && nMatch?.[1] && noteDepth === 0 && biblDepth === 0) {
        currentChapterRef = nMatch[1];
        totalChapterMilestones += 1;
      } else if ((unit === 'section' || unit === 'seciton') && nMatch?.[1] && noteDepth === 0 && biblDepth === 0) {
        if (unit === 'seciton') {
          totalTyposFixed += 1;
          anomalies.push({
            where: `book-${currentBookNum}`,
            note: `Source typo: <milestone unit="seciton" n="${nMatch[1]}"/> (misspelled "section") treated identically to a normal section milestone.`,
          });
        }
        openSection(nMatch[1]);
        totalSectionMilestones += 1;
      }
    }
    // catch-all: <foreign>, <quote>, <hi>, <l>, <cit> and their closes — no
    // structural action; their content already flows into pBuf.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 2) fail(`expected exactly 2 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (biblDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${biblDepth})`);

  divisions.forEach((b, i) => {
    const exp = BOOK_EXPECTATIONS[i]!;
    if (b.children.length !== exp.count) fail(`Book ${i + 1}: expected ${exp.count} sections, got ${b.children.length}`);
    if (exp.gap !== null) {
      const gapPresent = b.children.some((d) => d.number === String(exp.gap));
      if (gapPresent) fail(`Book ${i + 1}: expected section ${exp.gap} to be ABSENT (documented source gap), but it is present - the source may have changed`);
    }
  });

  const emptySections = divisions.flatMap((b) => b.children).filter((d) => d.passages.length === 0 || d.passages[0]!.text.length === 0);
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry empty passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: 'This witness carries no section divs at all; every section boundary above was reconstructed from inline <milestone unit="section"/> markers, which frequently fall mid-paragraph. A handful of quoted-verse blocks (the "Marius" fragment, the Aratus/Prognostica translation) are printed as a bare <quote><l>...</l></quote> sitting between two <p> elements rather than inside either; captured regardless since this importer reads all text within a Book, not just text inside a <p>.',
  });
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `Book 1 section 25 has no <milestone unit="section"/> of its own in this witness (a genuine gap, not a duplicate - contrast the companion De Senectute English witness's "35"/"35b" duplicate). Book 2's own section-milestone sequence is complete (1..150, no gaps). Nothing is fabricated; section 25 is present and complete in the Latin sibling (data/de-divinatione-la).`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> translator's footnotes (Falconer's own cross-references and commentary, not the translated running text) were excluded entirely, tag and content; not logged individually given their routine, uniform nature.`,
  });
  if (totalBibl > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalBibl} <bibl> citation gloss(es) identifying the source of a quoted verse fragment (not Falconer's translated text) were excluded entirely, tag and content.`,
    });
  }
  anomalies.push({
    where: `${WORK_ID} / division refs`,
    note: `${totalChapterMilestones} chapter milestones and ${totalSectionMilestones} section milestones captured (${totalTyposFixed} of the latter spelled "seciton" in the source, treated identically); each section's Division.ref is the chapter citation active when that section's milestone fired. Passage.ref is always null.`,
  });

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'en', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'On Divination',
    author: 'Marcus Tullius Cicero',
    language: 'en',
    translator: 'William Armistead Falconer',
    edition: 'Loeb Classical Library, 1923 printing',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi053.perseus-eng1), which digitises William Armistead Falconer’s translation of De Divinatione, part of Cicero: De Senectute, De Amicitia, De Divinatione (London: William Heinemann Ltd; New York: G. P. Putnam’s Sons, 1923 printing); imported by scripts/import-de-divinatione-en.',
    license:
      "Falconer's 1923 translation is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Divinatione — English, trans. Falconer',
        paragraphs: [
          'This is Cicero’s De Divinatione ("On Divination") in the English translation made by William Armistead Falconer for the Loeb Classical Library, 1923. It stands alongside the Latin text (ed. Mueller) already in this library as a facing English rendering of the same dialogue.',
          'The text here is the translation, verbatim. Nothing is further modernised, paraphrased or silently corrected. Falconer’s own translator’s footnotes are excluded — see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'William Armistead Falconer, trans., Cicero: De Senectute, De Amicitia, De Divinatione, Loeb Classical Library (London: William Heinemann Ltd; New York: G. P. Putnam’s Sons, 1923 printing). This translation is in the public domain.',
          'The work is divided into 2 Books, cited by section (131 present of 132 in Book 1 — see "Known gaps & anomalies"; all 150 present in Book 2) and, where this edition’s own inline chapter milestones supply one, by chapter.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi053.perseus-eng1.xml (CTS urn:cts:latinLit:phi0474.phi053.perseus-eng1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'Unlike the Latin sibling, this witness carries no section divs at all (only the 2 Book divs). Every section boundary is reconstructed from this source’s own inline `<milestone unit="section">` markers, which often fall mid-paragraph; the importer cuts the running text at each one. `<milestone unit="chapter">` markers likewise seed each section’s Division.ref. A handful of quoted-verse passages (Cicero’s own early poem "Marius", his verse translation of Aratus’s Prognostica) are printed as a bare `<quote>`/`<l>` block sitting between two `<p>` elements rather than inside either — captured regardless, since the importer reads all text within a Book. XML transport scaffolding only is removed: `<foreign>`, `<quote>`, `<hi>`, `<l>` are unwrapped with their text kept; entities decoded, whitespace collapsed.',
          "Falconer's own 289 translator's `<note>` footnotes and 5 `<bibl>` citation glosses (identifying the source of a quoted verse fragment) are excluded from the reading text entirely, tag and content.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and section, plus this edition’s own chapter number where available. Passage.ref is null throughout; Passage.n is always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Section 25 (Book 1). This witness has no `<milestone unit="section">` for it — a genuine gap in this specific digitisation, not a duplicate (contrast the companion De Senectute English witness’s "35"/"35b" duplicate-numbering irregularity). Book 2’s own section-milestone sequence is complete (1..150, no gaps). Nothing is fabricated; section 25 is present and complete in the Latin sibling (data/de-divinatione-la).',
          'One source typo. A single `<milestone unit="seciton" n="…"/>` (misspelled "section") is treated identically to a normal section milestone; logged individually in anomalies.json.',
          'Footnotes & citation glosses. 289 translator’s `<note>` footnotes and 5 `<bibl>` citation glosses were excluded entirely; neither is Falconer’s translated running text.',
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalSections = 0;
  let totalChars = 0;
  for (const b of divisions) {
    totalSections += b.children.length;
    totalChars += b.children.reduce((n, d) => n + d.passages.reduce((mm, p) => mm + p.text.length, 0), 0);
  }
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  Book ${b.number}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections\n`);
  }
  process.stdout.write(
    `\n  2 books  ${totalSections} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalSectionMilestones} section milestones  ${totalNotes} <note>  ${totalBibl} <bibl>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-divinatione-en` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
