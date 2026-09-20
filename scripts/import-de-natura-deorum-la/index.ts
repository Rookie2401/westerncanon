/**
 * Cicero, De Natura Deorum — Latin text (ed. Otto Plasberg, "M. Tulli
 * Ciceronis Scripta Quae Manserunt Omnia, Fasc. 45: De Natura Deorum",
 * Leipzig: Teubner, 1917; CTS urn:cts:latinLit:phi0474.phi050.perseus-lat2).
 * Run-once ingestion pipeline.
 *
 *   npm run import:de-natura-deorum-la
 *
 * IMPORTANT provenance note: the task brief that commissioned this importer
 * assumed a `perseus-lat1`/Mueller witness, by analogy with the sibling De
 * Divinatione volume. Direct inspection of this work's own __cts__.xml
 * (phi0474/phi050/__cts__.xml) shows that assumption is WRONG for this
 * specific work: no `perseus-lat1` file exists for phi050 at all (confirmed
 * 404 from the canonical-latinLit repository); the only edition listed, and
 * the only file present, is `perseus-lat2`, edited by Otto Plasberg (not
 * Mueller), Teubner 1917 (not the De Divinatione volume's 1915). This
 * importer uses exactly what __cts__.xml and the fetched file actually say.
 *
 * Reads scripts/import-de-natura-deorum-la/raw/phi0474.phi050.perseus-lat2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository;
 * nothing is downloaded at run time) and writes:
 *   data/de-natura-deorum-la/work.json       - the GenericWork (3 Books, each
 *                                              a flat list of section divisions)
 *   data/de-natura-deorum-la/about.json      - provenance / licence / prose
 *   data/de-natura-deorum-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:de-natura-deorum-la`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): a single
 * `<div type="edition">` wrapper directly containing 3
 * `<div type="textpart" subtype="book" n="1"/"2"/"3">` divs, each holding a
 * flat run of `<div type="textpart" subtype="section" n="N">` (124 in Book
 * 1, 168 in Book 2, 95 in Book 3 - no gaps or duplicates in any book). This
 * witness carries NO `<milestone>` elements of any kind (confirmed by direct
 * inspection - only `<pb/>` page breaks), so unlike every other work in this
 * batch, Division.ref is null throughout; nothing is fabricated to supply a
 * chapter reference this source does not print.
 *
 * Book 3's famous fragmentary ending: Cicero's own text of the dialogue
 * breaks off partway through, and Plasberg's edition reconstructs the
 * surviving remnants from later authors' quotations (Lactantius, Arnobius,
 * etc., via a `<cit><quote>...</quote><bibl>SOURCE</bibl></cit>` wrapper per
 * fragment) plus one English-language editorial marker
 * (`<label resp="perseus">Fragments: sources are not immediately clear.
 * </label>`) inserted by Perseus itself, not Cicero or Plasberg. Both the
 * `<bibl>` citations and the Perseus `<label>` are excluded from the reading
 * text entirely (see below); the fragment text itself (inside `<quote>`) is
 * kept verbatim.
 *
 * Faithfulness rules (mirrors scripts/import-aristotle-nicomachean-ethics-grc
 * for the del/add/gap apparatus, and Nicomachean Ethics's Perseus-note
 * precedent for the bibl/label exclusions):
 *   - verbatim Latin reading text only; no spelling/wording fixes.
 *   - `<del>...</del>` (18 spans) is text Plasberg's apparatus brackets as a
 *     probable interpolation/gloss — EXCLUDED; every occurrence logged.
 *   - `<add>...</add>` (46 spans) is a genuine editorial insertion Plasberg
 *     prints — INCLUDED, every occurrence logged and flagged on its Passage.
 *   - `<gap reason="…" rend="…"/>` (33 total) is self-closing but genuinely
 *     PRINTED content (the literal dots/asterisks the page shows); kept
 *     verbatim, every occurrence logged.
 *   - `<bibl>...</bibl>` (6 occurrences, in the Book 3 fragments) is a
 *     citation gloss identifying the secondary source that preserved a
 *     fragment (e.g. "Lact. Inst. 2.3.2") — NOT Cicero's text — excluded
 *     entirely, tag and content, the same treatment this library already
 *     gives a Perseus/editorial citation gloss elsewhere.
 *   - `<label resp="perseus" xml:lang="eng">...</label>` (2 occurrences) is
 *     Perseus's own English-language editorial marker, not Latin, not
 *     Cicero's or Plasberg's — excluded entirely, tag and content.
 *   - `<cit>` (wraps a `<quote>`+`<bibl>` fragment pair) is transport
 *     scaffolding only, unwrapped.
 *   - `<foreign>`, `<quote>`, `<q>`, `<hi rend="…">`, `<lg>`/`<l>` (verse) are
 *     unwrapped, text kept.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     section is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n" (485 `<p>` across 387 sections, so many sections hold more than
 *     one).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/de-natura-deorum-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi050.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'de-natura-deorum-la');
const WORK_ID = 'de-natura-deorum-la';

interface Anomaly {
  where: string;
  note: string;
}

const EXPECTED_SECTIONS_PER_BOOK = [124, 168, 95];

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
    /<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="book")[^>]*\bn="([^"]+)"[^>]*>|<div\b(?=[^>]*type="textpart")(?=[^>]*subtype="section")[^>]*\bn="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<bibl\b[^>]*>|<\/bibl>|<label\b[^>]*>|<\/label>|<gap\b[^>]*\/>|<[^>]+>/g;

  const anomalies: Anomaly[] = [];
  const divisions: Division[] = [];

  const stack: Array<'book' | 'section' | 'other'> = [];
  let currentBookNum = 0;
  let currentBookDiv: Division | null = null;
  let currentSectionNum = '';
  let currentSectionId = '';
  let sectionParagraphs: string[] = [];
  let sectionAnomalyNotes: string[] = [];

  let inP = false;
  let pBuf = '';
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';
  let biblDepth = 0;
  let labelDepth = 0;
  let labelIsPerseus = false;

  let totalDelSpans = 0;
  let totalAddSpans = 0;
  let totalGaps = 0;
  let totalBibl = 0;
  let totalPerseusLabels = 0;
  let totalEmptyParagraphsDropped = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionAnomalyNotes = [];
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) fail(`section "${currentSectionId}" has no surviving paragraph text`);
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (sectionAnomalyNotes.length > 0) passage.anomaly = sectionAnomalyNotes.join(' ');
    const division: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: null,
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
      if (inP && biblDepth === 0 && labelDepth === 0) {
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
      stack.push('book');
      currentBookNum = Number(m[1]);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 3) {
        fail(`unexpected book number "${m[1]}"`);
      }
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
    } else if (m[2] !== undefined) {
      stack.push('section');
      openSection(m[2]);
    } else if (tok === '</div>') {
      const kind = stack.pop();
      if (kind === 'section') closeSection();
      else if (kind === 'book') currentBookDiv = null;
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
          where: currentSectionId || `book-${currentBookNum}`,
          note: 'A paragraph cleaned to empty text (fully <del>-excluded, or otherwise); dropped from the reading text rather than joined as an empty segment.',
        });
      } else {
        sectionParagraphs.push(cleaned);
      }
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      totalDelSpans += 1;
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: `<del> excluded from the reading text (Plasberg's apparatus brackets this as a probable interpolation/gloss): "${excerpt(delBuf)}"`,
      });
      delBuf = '';
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      totalAddSpans += 1;
      const t = excerpt(addBuf);
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: `<add> editorial insertion, kept verbatim in the reading text: "${t}"`,
      });
      sectionAnomalyNotes.push(`editorial insertion <add> printed in the edition, kept verbatim: "${t}"`);
      addBuf = '';
    } else if (/^<bibl\b/.test(tok)) {
      biblDepth += 1;
    } else if (tok === '</bibl>') {
      biblDepth -= 1;
      totalBibl += 1;
    } else if (/^<label\b/.test(tok)) {
      labelDepth += 1;
      labelIsPerseus = /resp="perseus"/.test(tok);
    } else if (tok === '</label>') {
      labelDepth -= 1;
      if (labelIsPerseus) {
        totalPerseusLabels += 1;
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: '<label resp="perseus" xml:lang="eng"> excluded entirely: Perseus\'s own English-language editorial marker ("Fragments: sources are not immediately clear."), not Latin, not Cicero\'s or Plasberg\'s text.',
        });
      }
      labelIsPerseus = false;
    } else if (/^<gap\b/.test(tok)) {
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      totalGaps += 1;
      if (inP && delDepth === 0 && biblDepth === 0 && labelDepth === 0) {
        pBuf += literal;
        if (addDepth > 0) addBuf += literal;
      }
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source, printed as "${literal}"; kept verbatim in the reading text rather than dropped.`,
      });
    }
    // catch-all: <cit>, <foreign>, <quote>, <q>, <hi>, <lg>, <l> and their
    // closes — no structural action; their content already flows into pBuf.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 3) fail(`expected exactly 3 Book divisions, got ${divisions.length}`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);
  if (biblDepth !== 0) fail(`unbalanced <bibl> nesting (final depth ${biblDepth})`);
  if (labelDepth !== 0) fail(`unbalanced <label> nesting (final depth ${labelDepth})`);

  divisions.forEach((b, i) => {
    const want = EXPECTED_SECTIONS_PER_BOOK[i]!;
    if (b.children.length !== want) fail(`Book ${i + 1}: expected ${want} sections, got ${b.children.length}`);
  });

  const emptySections = divisions.flatMap((b) => b.children).filter((d) => d.passages.length === 0 || d.passages[0]!.text.length === 0);
  if (emptySections.length > 0) fail(`section(s) unexpectedly carry empty passage text: ${emptySections.map((d) => d.id).join(', ')}`);

  // --- corpus-level anomalies ---------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / division refs`,
    note: 'This witness carries no <milestone> elements of any kind (confirmed by direct inspection - only <pb/> page breaks); Division.ref is null throughout for every section. Nothing is fabricated to supply a chapter reference this source does not print.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans (Plasberg's apparatus brackets these as probable interpolations/glosses) were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial insertions were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap/> markers (manuscript lacunae, mostly in the fragmentary end of Book 3) were kept as their literal printed rendering; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalBibl} <bibl> citation gloss(es) (identifying the secondary source - Lactantius, Arnobius, etc. - that preserved a Book 3 fragment, not Cicero's text) were excluded entirely, tag and content.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalPerseusLabels} <label resp="perseus"> English-language editorial marker(s) were excluded entirely, tag and content.`,
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
    title: 'De Natura Deorum',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    editor: 'Otto Plasberg',
    edition: 'Scripta Quae Manserunt Omnia, Fasc. 45 (Leipzig: Teubner, 1917)',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi050.perseus-lat2), which digitises the Latin text as edited by Otto Plasberg, M. Tulli Ciceronis Scripta Quae Manserunt Omnia, Fasc. 45: De Natura Deorum (Leipzig: Teubner, 1917); imported by scripts/import-de-natura-deorum-la. NOTE: the commissioning brief for this import assumed a perseus-lat1/Mueller witness by analogy with the sibling De Divinatione volume; this work’s own __cts__.xml lists only perseus-lat2/Plasberg, and no perseus-lat1 file exists for it - confirmed directly rather than assumed.',
    license:
      "Plasberg's 1917 Teubner edition is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero’s De Natura Deorum',
        paragraphs: [
          'This is Cicero’s De Natura Deorum ("On the Nature of the Gods"), a dialogue in three books surveying Epicurean, Stoic and Academic sceptic views of the gods, staged as a conversation among Gaius Velleius (Epicurean), Quintus Lucilius Balbus (Stoic) and Gaius Aurelius Cotta (Academic).',
          'The text here is the Latin, verbatim. Nothing is translated, modernised or silently corrected. Where the source is irregular — a bracketed interpolation, an editorial insertion, a marked lacuna, the fragmentary close of Book 3 — the irregularity is preserved and noted; see "Known gaps & anomalies" below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Otto Plasberg, ed., M. Tulli Ciceronis Scripta Quae Manserunt Omnia, Fasc. 45: De Natura Deorum (Leipzig: Teubner, 1917). This edition is in the public domain.',
          'The work is divided into 3 Books and, within each, numbered sections (124 in Book 1, 168 in Book 2, 95 in Book 3). Unlike the companion De Divinatione/De Amicitia/De Senectute Latin texts in this library, this witness prints no chapter milestones at all, so citation here is by Book and section only — see "Reference scheme" below.',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi050.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi050.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section `<div>`s and collects every `<p>` paragraph within each section, in document order, into that section’s single Passage (485 `<p>` elements across 387 sections, so many sections hold more than one). XML transport scaffolding only is removed: `<foreign>`/`<quote>`/`<q>`/`<hi>`/`<lg>`/`<l>` (verse) are unwrapped with their text kept; `<cit>` (a fragment-citation wrapper in Book 3’s ending) is likewise unwrapped.',
          "Plasberg's own critical apparatus is handled the same way this app already treats it in Nicomachean Ethics (Bywater/Perseus): text his apparatus brackets as a probable interpolation (<del>, 18 spans) is excluded; a genuine editorial insertion he prints (<add>, 46 spans) is kept; a marked manuscript lacuna (<gap>, 33 markers) is kept as its literal printed rendering. In Book 3's fragmentary ending, each secondary-source citation (<bibl>, 6 occurrences, e.g. \"Lact. Inst. 2.3.2\") is excluded as apparatus, and a single Perseus-added English editorial marker (<label resp=\"perseus\">, 2 occurrences: \"Fragments: sources are not immediately clear.\") is excluded as not being Latin or Cicero's/Plasberg's text at all. Every occurrence of all of these is logged individually in anomalies.json.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and section only. This witness prints no `<milestone>` of any kind (confirmed by direct inspection), so Division.ref is null throughout — not fabricated. Passage.ref is likewise always null; Passage.n is always empty.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 3 Books and all 387 sections (124 + 168 + 95) are present and in order. No paragraph is dropped, merged or reordered except where documented in anomalies.json; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          'Book 3’s fragmentary ending. Cicero’s own text of Book 3 breaks off before the dialogue’s natural close (a well-known transmission gap); Plasberg’s edition supplies the surviving remnants as quotations by later authors (Lactantius, Arnobius and others). Each such fragment is kept verbatim as its own section; the secondary author’s own citation and a Perseus-added English note are excluded as apparatus — see "How it was imported".',
          'Apparatus. 18 <del> spans excluded, 46 <add> spans kept, 33 <gap> markers kept as their literal printed rendering (mostly clustered in Book 3’s fragmentary close). All individually logged.',
          'No chapter references. Unlike the companion Cicero works in this library, this witness prints no chapter milestones at all; every Division.ref is null.',
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
    `\n  3 books  ${totalSections} sections  ${totalChars} chars  ${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalGaps} <gap>  ${totalBibl} <bibl>  ${totalPerseusLabels} <label resp=perseus>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:de-natura-deorum-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
