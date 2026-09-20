/**
 * Cicero, De Divinatione — Latin text (ed. C. F. W. Mueller, "M. Tullii
 * Ciceronis De divinatione libri duo libri de fato quae manserunt", Leipzig:
 * Teubner, 1915; CTS urn:cts:latinLit:phi0474.phi053.perseus-lat1, confirmed
 * against this work's own __cts__.xml). Run-once ingestion pipeline.
 *
 *   npm run import:de-divinatione-la
 *
 * Reads scripts/import-de-divinatione-la/raw/phi0474.phi053.perseus-lat1.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-divinatione-la/work.json       - the GenericWork (2 Books, each
 *                                             a flat list of section divisions)
 *   data/de-divinatione-la/about.json      - provenance / licence / prose
 *   data/de-divinatione-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-divinatione-la`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a `<front>`
 * wraps a book-1 "ARGUMENTUM" (editorial synopsis, `<div type="textpart"
 * n="1arg" subtype="book">`) BEFORE `<body>` opens; INSIDE `<body>`, the
 * edition div holds, as three siblings: the real Book 1 (`n="1"`, 132
 * sections), a book-2 "ARGUMENTUM" embedded directly in the main flow with
 * NO `<front>` wrapper this time (`n="2arg"`), and the real Book 2 (`n="2"`,
 * 150 sections). BOTH "ARGUMENTUM" divs — Mueller's own third-person prose
 * synopsis of each book ("Hoc altero de divinatione libro Cicero postquam
 * …") — are EXCLUDED ENTIRELY from the reading text: they are not Cicero's
 * words, and this app's Book->section schema has no field for a book-level
 * synopsis. This importer therefore only ever opens a real Division for a
 * book div whose `n` is a plain integer ("1", "2"), never "1arg"/"2arg" —
 * logged as a corpus-level anomaly, not silently dropped.
 *
 * Inline `<milestone unit="chapter" n="…"/>` markers (130 total: 58 in Book
 * 1, 72 in Book 2 — chapter numbering restarts at 1 in Book 2, confirmed)
 * seed each section's Division.ref with this edition's own chapter
 * citation, in document order (the value active when a section closes,
 * reset to null at the start of each real Book).
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-grc,
 * the closest existing precedent for this del/add/gap apparatus vocabulary):
 *   - verbatim Latin reading text only; no spelling/wording fixes.
 *   - `<note type="sp" place="inline">C.</note>` (the ONLY <note> in this
 *     witness — a speaker-change abbreviation printed inline within a
 *     multi-speaker verse quotation from Ennius) is excluded from the
 *     reading text per this app's blanket "<note> is apparatus, discard
 *     entirely" rule — even though, unlike a typical critical-apparatus
 *     note, this one arguably IS part of the printed page (a speaker label,
 *     like the `<speaker>H.</speaker>` immediately preceding it in the same
 *     quotation, which IS kept because it uses a different, non-`<note>`
 *     tag). Treated identically to every other `<note>` in this corpus for
 *     consistency and predictability rather than special-cased; logged
 *     individually and flagged in the final report as the one genuinely
 *     judgment-call exclusion in this batch.
 *   - `<del>...</del>` (14 spans) is text Mueller's apparatus brackets as a
 *     probable interpolation/gloss — EXCLUDED from the reading text,
 *     matching Euclid's/Nicomachean Ethics's `<del>` convention; every
 *     occurrence logged verbatim.
 *   - `<add>...</add>` (26 spans) is a genuine editorial insertion Mueller
 *     prints — INCLUDED in the reading text; every occurrence logged and the
 *     containing section's Passage carries an `anomaly` note.
 *   - `<gap reason="…" rend="…"/>` (7 total) is self-closing but genuinely
 *     PRINTED content (the `rend` attribute is the literal dots/asterisks
 *     the page shows, e.g. " * * "); kept verbatim as that literal text
 *     rather than dropped, logged individually.
 *   - `<speaker>`/`<quote>`/`<q>`/`<foreign>`/`<hi rend="…">` (typographic
 *     and quotation wrappers around genuine text, including the fragmentary
 *     Ennius verse quoted in chs. 30-31 and elsewhere) are unwrapped, text
 *     kept.
 *   - `<milestone unit="chapter" n="…"/>` is zero-width transport
 *     scaffolding — stripped; its value seeds Division.ref.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     section is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n" when a section has more than one.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-divinatione-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi053.perseus-lat1.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-divinatione-la');
const WORK_ID = 'de-divinatione-la';

interface Anomaly {
  where: string;
  note: string;
}

const EXPECTED_SECTIONS_PER_BOOK = [132, 150];

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 140): string => {
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
    /<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="book")[^>]*\bn="([^"]+)"[^>]*>|<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="section")[^>]*\bn="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<milestone\b[^>]*\/>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'argbook' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let sectionAnomalyNotes: string[] = [];
  let currentChapterRef: string | null = null;

  let inSection = false;
  let pBuf = '';
  let noteDepth = 0;
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';

  let totalArgumentaExcluded = 0;
  let totalNotes = 0;
  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalGaps = 0;
  let totalChapterMilestones = 0;
  let totalEmptyParagraphsDropped = 0;
  let totalBareVerseSections = 0;

  function skipping(): boolean {
    return stack.includes('argbook');
  }

  /** Flush whatever has accumulated in pBuf as one paragraph/verse piece of
   *  the current section (used both at </p> and, for the rare section that
   *  holds bare `<l>` verse lines with NO enclosing <p> at all - see the
   *  module doc - at section close). Silently ignores a raw-empty buffer
   *  (nothing accumulated since the last cut - not an anomaly); logs and
   *  drops a buffer that cleans to empty despite having raw content. */
  function flushPiece(): void {
    if (!inSection || pBuf.length === 0) {
      pBuf = '';
      return;
    }
    const cleaned = cleanText(pBuf);
    pBuf = '';
    if (cleaned.length === 0) {
      totalEmptyParagraphsDropped += 1;
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: 'A text run cleaned to empty text (fully <del>-excluded, or otherwise); dropped from the reading text rather than joined as an empty segment.',
      });
      return;
    }
    sectionParagraphs.push(cleaned);
  }

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionAnomalyNotes = [];
    inSection = true;
    pBuf = '';
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    // flush any bare verse (<l> lines with no enclosing <p> - see module doc)
    // that accumulated directly under the section div, outside any <p>. Most
    // sections only have ordinary trailing whitespace here (between the last
    // </p> and </div>), which cleans to empty and is silently dropped - only
    // a buffer that cleans to REAL content triggers the bare-verse anomaly.
    if (pBuf.length > 0) {
      if (cleanText(pBuf).length > 0) {
        flushPiece();
        totalBareVerseSections += 1;
        anomalies.push({
          where: currentSectionId,
          note: 'This section holds bare <l> verse lines with no enclosing <p> at all (part of the Aratus/Prognostica quotation) - its text was captured directly under the section div rather than via a paragraph boundary.',
        });
      } else {
        pBuf = '';
      }
    }
    inSection = false;
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (sectionAnomalyNotes.length > 0) passage.anomaly = sectionAnomalyNotes.join(' ');
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

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (!skipping() && inSection && noteDepth === 0) {
        if (delDepth > 0) {
          delBuf += free;
        } else {
          pBuf += free;
          if (addDepth > 0) addBuf += free;
        }
      }
    }
    lastIndex = tokenRe.lastIndex;
    const tok = m[0];

    if (m[1] !== undefined) {
      // book-level div (real or "arg" synopsis)
      const raw = m[1];
      if (/arg$/.test(raw)) {
        stack.push('argbook');
        totalArgumentaExcluded += 1;
        anomalies.push({
          where: `${WORK_ID} / book "${raw}"`,
          note: `EXCLUDED ENTIRELY: this is Mueller's own editorial "ARGUMENTUM" (a third-person prose synopsis of the book, e.g. "Hoc altero de divinatione libro Cicero postquam..."), not Cicero's text, and this app's Book->section schema has no field for a book-level synopsis.`,
        });
      } else {
        stack.push('book');
        currentBookNum = Number(raw);
        if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 2) {
          fail(`unexpected book number "${raw}"`);
        }
        currentChapterRef = null; // chapter numbering restarts at 1 each Book (confirmed)
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
      }
    } else if (m[2] !== undefined) {
      stack.push('section');
      if (!skipping()) openSection(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (!skipping()) {
        if (kind === 'section') closeSection();
        else if (kind === 'book') currentBookDiv = null;
      }
    } else if (/^<div\b/.test(tok)) {
      stack.push('other');
    } else if (/^<p\b/.test(tok)) {
      // no state change needed - flushPiece() at </p> (or at section close,
      // for the rare bare-verse section) does the real work.
    } else if (tok === '</p>') {
      if (!skipping()) flushPiece();
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      if (!skipping()) {
        totalNotes += 1;
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: '<note type="sp" place="inline">C.</note> (a speaker-change abbreviation inline within a quoted verse passage) excluded per this app\'s blanket <note> = apparatus rule - see this importer\'s module doc for why this one is a genuine judgment call rather than routine apparatus.',
        });
      }
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      if (!skipping()) {
        totalDelSpans += 1;
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<del> excluded from the reading text (Mueller's apparatus brackets this as a probable interpolation/gloss): "${excerpt(delBuf)}"`,
        });
      }
      delBuf = '';
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      if (!skipping()) {
        totalAddSpans += 1;
        const t = excerpt(addBuf);
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<add> editorial insertion, kept verbatim in the reading text: "${t}"`,
        });
        sectionAnomalyNotes.push(`editorial insertion <add> printed in the edition, kept verbatim: "${t}"`);
      }
      addBuf = '';
    } else if (/^<milestone\b/.test(tok)) {
      if (!skipping()) {
        const unitMatch = /unit="([^"]+)"/.exec(tok);
        const nMatch = /\sn="([^"]+)"/.exec(tok);
        if (unitMatch?.[1] === 'chapter' && nMatch?.[1] && noteDepth === 0) {
          currentChapterRef = nMatch[1];
          totalChapterMilestones += 1;
        }
      }
    } else if (/^<gap\b/.test(tok)) {
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (!skipping()) {
        totalGaps += 1;
        if (inSection && noteDepth === 0 && delDepth === 0) {
          pBuf += literal;
          if (addDepth > 0) addBuf += literal;
        }
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source, printed as "${literal}"; kept verbatim in the reading text rather than dropped.`,
        });
      }
    }
    // catch-all: <speaker>, <quote>, <q>, <foreign>, <hi> and their closes —
    // no structural action; their content already flows into pBuf.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 2) fail(`expected exactly 2 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);

  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTIONS_PER_BOOK[i]!;
    if (b.children.length !== want) fail(`Book ${i + 1}: expected ${want} sections, got ${b.children.length}`);
  });

  const emptySections = divisions.flatMap((b) => b.children).filter((d) => d.passages.length === 0 || d.passages[0]!.text.length === 0);
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry empty passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note: `${totalArgumentaExcluded} "ARGUMENTUM" book-synopsis divs (Mueller's own editorial prose, not Cicero's) were excluded entirely; see the individual entries above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (Mueller's apparatus brackets these as probable interpolations/glosses) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial insertions were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap/> markers (manuscript lacunae) were kept as their literal printed rendering; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / division refs`,
    note: `${totalChapterMilestones} chapter milestones captured (58 in Book 1, 72 in Book 2 - chapter numbering restarts at 1 each Book, confirmed); each section's Division.ref is the chapter citation active in that section's own document order. Passage.ref is always null.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs -------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'De Divinatione',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'C. F. W. Mueller',
    edition: 'Leipzig: Teubner, 1915',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi053.perseus-lat1), which digitises the Latin text as edited by C. F. W. Mueller, M. Tullii Ciceronis De divinatione libri duo libri de fato quae manserunt (Leipzig: Teubner, 1915); imported by scripts/import-de-divinatione-la.',
    license:
      "Mueller's 1915 Teubner edition is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Divinatione',
        paragraphs: [
          'This is Cicero’s De Divinatione ("On Divination"), a dialogue in two books between Cicero and his brother Quintus on the validity of divination — Quintus defending the Stoic position that some form of foreknowledge is real, Cicero (in Book 2) arguing the Academic sceptic’s case against it.',
          'The text here is the Latin, verbatim. Nothing is translated, modernised or silently corrected. Mueller’s own editorial synopses ("ARGUMENTUM") preceding each book are excluded, as is his critical apparatus — see "How it was imported" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'C. F. W. Mueller, ed., M. Tullii Ciceronis De divinatione libri duo libri de fato quae manserunt (Leipzig: Teubner, 1915). This edition is in the public domain.',
          'The work is divided into 2 Books and, within each, numbered sections (132 in Book 1, 150 in Book 2, restarting at 1 each Book) further grouped into 58 and 72 traditional chapters respectively (chapter numbering restarts at 1 in Book 2 too), per this edition’s own inline chapter milestones.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi053.perseus-lat1.xml (CTS urn:cts:latinLit:phi0474.phi053.perseus-lat1) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section `<div>`s and collects every `<p>` paragraph within each section, in document order, into that section’s single Passage. Each book’s "ARGUMENTUM" (Mueller’s own third-person prose synopsis, e.g. "Hoc altero de divinatione libro Cicero postquam...") is excluded entirely — it is editorial framing, not Cicero’s text, and this app’s schema has no field for a book-level synopsis. XML transport scaffolding only is removed: the inline `<milestone unit="chapter">` markers seed each section’s Division.ref rather than appearing in the reading text; `<speaker>`/`<quote>`/`<q>`/`<foreign>`/`<hi>` are unwrapped with their text kept. Entities are decoded and whitespace collapsed.',
          "Mueller's own critical apparatus is handled the same way this app already treats it in Nicomachean Ethics (Bywater/Perseus): text his apparatus brackets as a probable interpolation (<del>, 14 spans) is excluded; a genuine editorial insertion he prints (<add>, 26 spans) is kept; a marked manuscript lacuna (<gap>, 7 markers) is kept as its literal printed rendering. The single <note> in this witness (a speaker-change abbreviation inline within a quoted Ennius verse passage) is excluded per this app's blanket <note> rule — see the module doc for why this is flagged as a genuine judgment call rather than routine apparatus. Every occurrence of all of these is logged individually in anomalies.json.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and section, plus this edition’s own chapter number where available, reconstructed from its inline `<milestone unit="chapter">` markers (chapter numbering restarts at 1 in Book 2). Passage.ref is null throughout; Passage.n is always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. Both Books and all 282 sections (132 + 150) are present and in order. No paragraph is dropped, merged or reordered except where documented in anomalies.json; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          'Editorial synopses excluded. Each book’s "ARGUMENTUM" (a third-person prose summary by Mueller) is excluded entirely from the reading text — not Cicero’s own words, and this app’s Book->section schema has no place for a book-level synopsis.',
          'Apparatus. 14 <del> spans excluded, 26 <add> spans kept, 7 <gap> markers kept as their literal printed rendering. All individually logged.',
          'One judgment-call note exclusion. The single <note> in this witness is a speaker-change abbreviation ("C.") printed inline within a quoted verse passage from Ennius, arguably part of the printed page rather than editorial apparatus — excluded anyway, per this app’s blanket <note> rule, for consistency; flagged individually.',
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
    totalChars += b.children.reduce((n, d) => n + d.passages.reduce((m, p) => m + p.text.length, 0), 0);
  }
  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  Book ${b.number}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections\n`);
  }
  process.stdout.write(
    `\n  2 books  ${totalSections} sections  ${totalChars} chars  ${totalChapterMilestones} chapter milestones  ${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalGaps} <gap>  ${totalNotes} <note>  ${totalEmptyParagraphsDropped} empty paragraphs dropped  ${totalBareVerseSections} bare-verse sections\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-divinatione-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
