/**
 * Cicero, Tusculanae Disputationes - Latin text (ed. Max Pohlenz, M. Tulli
 * Ciceronis Tusculanae Disputationes, Leipzig: Teubner, 1918; CTS
 * urn:cts:latinLit:phi0474.phi049.perseus-lat2). Run-once ingestion
 * pipeline.
 *
 *   npm run import:tusculan-disputations-la
 *
 * Reads scripts/import-tusculan-disputations-la/raw/phi0474.phi049.perseus-lat2.xml
 * (fetched once from the PerseusDL/canonical-latinLit GitHub repository and
 * committed here; nothing is downloaded at import time) and writes:
 *   data/tusculan-disputations-la/work.json       - the GenericWork (5
 *                                                    Books, each a flat list
 *                                                    of Section divisions,
 *                                                    one Passage each)
 *   data/tusculan-disputations-la/about.json      - provenance / licence / prose
 *   data/tusculan-disputations-la/anomalies.json  - machine-readable {where, note}[]
 *
 * Then run `npm run validate:tusculan-disputations-la`.
 *
 * Structure (confirmed by direct inspection of the fetched XML): two-level
 * `<div type="textpart" subtype="book" n="N">` (5 books) containing
 * `<div type="textpart" subtype="section" n="M">` (475 total - Perseus's own
 * fine paragraph-level numbering). Each section div holds one or more `<p>`
 * paragraphs.
 *
 * UNLIKE its De Finibus sibling (phi048, same Perseus text group, same
 * critical-apparatus vocabulary), this Pohlenz XML carries NO
 * `<milestone unit="chapter"/>` markers at all (confirmed: zero occurrences
 * in the whole document) and NO `<head>` elements either (no "LIBER PRIMUS"
 * text) - so every Section's Division.ref is null throughout, and every
 * Book's Division.sourceHeading is null throughout. Nothing is fabricated to
 * supply either; this is a genuine, confirmed difference between the two
 * Perseus editions, not a parsing gap (see about.json). The traditional
 * Tusculan chapter numbers ARE available on the ENGLISH sibling
 * (data/tusculan-disputations-en), whose 1877 Gutenberg source happens to
 * print them inline; the two editions are parsed completely independently
 * and not reconciled against each other.
 *
 * This edition additionally carries a handful of tags the De Finibus
 * sibling does not: `<label n="line_num">…</label>` (12 occurrences, all in
 * the running text, never inside a <note>) numbers individual lines of
 * quoted Ennius verse (e.g. "1046") - a citation aid from the edition, not
 * part of Cicero's own transmitted words - EXCLUDED from the reading text,
 * same treatment as a Perseus citation gloss; `<num rend="smallcaps">`
 * (Roman numerals spelled out in the running prose, e.g. "cccccx") and
 * `<figure/>` (535 occurrences, ALL confirmed - by direct inspection - to
 * sit inside a `<note>`, a formatting placeholder in the apparatus, so
 * already excluded along with that note) are otherwise handled exactly like
 * the shared vocabulary below.
 *
 * Faithfulness rules (mirrors scripts/import-de-finibus-la and
 * scripts/import-aristotle-nicomachean-ethics-grc):
 *   - verbatim Latin reading text only; no accent/spelling/wording fixes.
 *   - `<pb n="…"/>` (244 total) are zero-width transport scaffolding with no
 *     reference role in this schema - stripped, not counted individually.
 *   - `<note>...</note>` (8,392 total) is Pohlenz's own critical apparatus -
 *     manuscript sigla, variant readings, editorial cross-references - NOT
 *     Cicero's text; excluded from the reading text entirely (tag AND
 *     content).
 *   - `<del>...</del>` (28 spans outside any note) is text Pohlenz's
 *     apparatus brackets as a probable interpolation/gloss - EXCLUDED from
 *     the reading text; every occurrence outside a note is logged verbatim
 *     (a further 3 occur nested inside a `<note>` and are already excluded
 *     as part of that note).
 *   - `<add>...</add>` (120 spans outside any note) is a genuine editorial
 *     insertion Pohlenz prints - INCLUDED in the reading text; every
 *     occurrence outside a note is logged and the containing section's
 *     Passage carries an `anomaly` note (a further 50 occur nested inside a
 *     `<note>` and are excluded as part of it).
 *   - `<gap reason="…" rend="…"/>` (12 total outside any note; a further 29
 *     occur nested inside a `<note>`) is self-closing but genuinely PRINTED
 *     content when outside a note (the `rend` attribute is the literal
 *     dots/asterisks Pohlenz's page shows); kept verbatim as that literal
 *     text, logged individually. When `rend` is absent (reason="omitted"
 *     with no visible rendering supplied), nothing is inserted but the
 *     occurrence is still logged.
 *   - `<label n="line_num">...</label>` (12 total, all outside any note) is
 *     the edition's own Ennius-verse line-number citation apparatus, not
 *     Cicero's words - EXCLUDED from the reading text entirely (tag and
 *     content), every occurrence logged.
 *   - `<quote>`/`<l>`/`<q>` (Ennius/Sophocles/other verse Cicero quotes,
 *     quotation marks), `<foreign xml:lang="grc">` (untranslated Greek
 *     words), `<hi>` (typographic styling), `<num rend="smallcaps">` (Roman
 *     numerals spelled in prose), and the note-only `<w>`/`<figure/>` are
 *     unwrapped where they appear in the running text.
 *   - `<p>` boundaries are NOT preserved as separate Passage objects: each
 *     Section is exactly one Passage, its surviving `<p>`s joined with
 *     "\n\n".
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from '../import-isagoge-shared/text.ts';
import type { Division, GenericWork, Passage, WorkAbout } from '../../data/tusculan-disputations-la/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const RAW_XML = join(HERE, 'raw', 'phi0474.phi049.perseus-lat2.xml');
const OUT_DIR = join(REPO_ROOT, 'data', 'tusculan-disputations-la');

const WORK_ID = 'tusculan-disputations-la';

interface Anomaly {
  where: string;
  note: string;
}

function fail(message: string): never {
  process.stderr.write(`STOP (${WORK_ID}): ${message}\n`);
  process.exit(1);
}

const excerpt = (s: string, max = 160): string => {
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
    /<div type="textpart" subtype="book"[^>]*n="([^"]+)"[^>]*>|<div type="textpart" subtype="section"[^>]*n="([^"]+)"[^>]*>|<div\b[^>]*>|<\/div>|<p\b[^>]*>|<\/p>|<note\b[^>]*>|<\/note>|<del\b[^>]*>|<\/del>|<add\b[^>]*>|<\/add>|<label\b[^>]*>|<\/label>|<gap\b[^>]*\/>|<[^>]+>/g;

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
  let noteDepth = 0;
  let delDepth = 0;
  let delBuf = '';
  let addDepth = 0;
  let addBuf = '';
  let labelDepth = 0;

  let totalSections = 0;
  let totalDelSpans = 0;
  let totalDelSpansInNote = 0;
  let totalAddSpans = 0;
  let totalAddSpansInNote = 0;
  let totalGaps = 0;
  let totalGapsInNote = 0;
  let totalLabels = 0;
  let totalNotes = 0;
  let totalEmptyParagraphsDropped = 0;

  function openSection(n: string): void {
    currentSectionNum = n;
    currentSectionId = `book-${currentBookNum}-sec-${n}`;
    sectionParagraphs = [];
    sectionAnomalyNotes = [];
  }

  function closeSection(): void {
    if (!currentBookDiv) fail(`section "${currentSectionId}" closed outside any book`);
    if (sectionParagraphs.length === 0) {
      fail(`section "${currentSectionId}" has no surviving paragraph text`);
    }
    const text = sectionParagraphs.join('\n\n');
    const passage: Passage = { n: '', text, ref: null };
    if (sectionAnomalyNotes.length > 0) passage.anomaly = sectionAnomalyNotes.join(' ');
    const sectionDiv: Division = {
      id: currentSectionId,
      number: currentSectionNum,
      ref: null,
      sourceHeading: null,
      editorialTitle: null,
      children: [],
      passages: [passage],
    };
    currentBookDiv.children.push(sectionDiv);
    totalSections += 1;
  }

  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = tokenRe.exec(body))) {
    if (m.index > lastIndex) {
      const free = body.slice(lastIndex, m.index);
      if (inP && noteDepth === 0 && labelDepth === 0) {
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
      // book open
      stack.push('book');
      currentBookNum = Number(m[1]);
      if (!Number.isFinite(currentBookNum) || currentBookNum < 1 || currentBookNum > 5) {
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
      // section open
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
          note: 'A paragraph cleaned to empty text; dropped from the reading text rather than emitted empty.',
        });
      } else {
        sectionParagraphs.push(cleaned);
      }
    } else if (/^<note\b/.test(tok)) {
      noteDepth += 1;
    } else if (tok === '</note>') {
      noteDepth -= 1;
      totalNotes += 1;
    } else if (/^<del\b/.test(tok)) {
      delDepth += 1;
      if (noteDepth === 0) delBuf = '';
    } else if (tok === '</del>') {
      delDepth -= 1;
      if (noteDepth === 0) {
        totalDelSpans += 1;
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<del> excluded from the reading text (Pohlenz's apparatus brackets this as a probable interpolation/gloss): "${excerpt(delBuf)}"`,
        });
        delBuf = '';
      } else {
        totalDelSpansInNote += 1;
      }
    } else if (/^<add\b/.test(tok)) {
      addDepth += 1;
      if (noteDepth === 0) addBuf = '';
    } else if (tok === '</add>') {
      addDepth -= 1;
      if (noteDepth === 0) {
        totalAddSpans += 1;
        const t = excerpt(addBuf);
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<add> editorial insertion, kept verbatim in the reading text: "${t}"`,
        });
        sectionAnomalyNotes.push(`editorial insertion <add> printed in the edition, kept verbatim: "${t}"`);
        addBuf = '';
      } else {
        totalAddSpansInNote += 1;
      }
    } else if (/^<label\b/.test(tok)) {
      labelDepth += 1;
    } else if (tok === '</label>') {
      labelDepth -= 1;
      totalLabels += 1;
      anomalies.push({
        where: currentSectionId || `book-${currentBookNum}`,
        note: '<label n="line_num"> Ennius-verse line-number citation excluded from the reading text (the edition\'s own citation apparatus, not Cicero\'s words).',
      });
    } else if (/^<gap\b/.test(tok)) {
      const rendMatch = /rend="([^"]*)"/.exec(tok);
      const reasonMatch = /reason="([^"]*)"/.exec(tok);
      const literal = rendMatch?.[1] ?? '';
      if (noteDepth === 0) {
        totalGaps += 1;
        if (inP && delDepth === 0 && labelDepth === 0) {
          pBuf += literal;
          if (addDepth > 0) addBuf += literal;
        }
        anomalies.push({
          where: currentSectionId || `book-${currentBookNum}`,
          note: `<gap reason="${reasonMatch?.[1] ?? ''}"/> in the source, printed as "${literal || '(no visible rendering supplied)'}"; kept verbatim in the reading text rather than dropped.`,
        });
      } else {
        totalGapsInNote += 1;
      }
    }
    // The final catch-all `<[^>]+>` handles every other tag generically
    // (quote/l/q opens & closes, foreign, hi, num, and the note-only
    // w/figure): no structural action - their content already flows into
    // pBuf via the free-text capture above.
  }

  if (stack.length !== 0) fail(`unbalanced <div> nesting at end of document (stack: ${stack.join(',')})`);
  if (divisions.length !== 5) fail(`expected exactly 5 Book divisions, got ${divisions.length}`);
  if (noteDepth !== 0) fail(`unbalanced <note> nesting (final depth ${noteDepth})`);
  if (delDepth !== 0) fail(`unbalanced <del> nesting (final depth ${delDepth})`);
  if (addDepth !== 0) fail(`unbalanced <add> nesting (final depth ${addDepth})`);
  if (labelDepth !== 0) fail(`unbalanced <label> nesting (final depth ${labelDepth})`);

  // --- no section should ever be empty ------------------------------------
  const emptySections: string[] = [];
  for (const b of divisions) {
    for (const s of b.children) {
      if (s.passages.length === 0 || s.passages[0]!.text.length === 0) emptySections.push(s.id);
    }
  }
  if (emptySections.length > 0) {
    fail(`section division(s) unexpectedly carry empty passage text: ${emptySections.sort().join(', ')}`);
  }

  // --- corpus-level anomalies ----------------------------------------------
  anomalies.push({
    where: `${WORK_ID} / structure`,
    note:
      'This edition (Pohlenz 1918) carries NO <milestone unit="chapter"/> markers and NO <head> book-title elements at all, unlike its De Finibus sibling (Schiche 1915, same Perseus text group) - confirmed by direct inspection, not a parsing gap. Every Section Division.ref and every Book Division.sourceHeading is therefore null throughout this edition. The traditional Tusculan chapter numbers are available on the English sibling instead (data/tusculan-disputations-en), whose source happens to print them inline; the two editions are parsed independently and not reconciled.',
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalNotes} <note> elements (Pohlenz's critical apparatus) were excluded entirely, tag and content; not logged individually given their number. This also accounts for the ${totalDelSpansInNote} <del>, ${totalAddSpansInNote} <add> occurrences nested inside an excluded <note> (already excluded as part of it, not double-logged below).`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalDelSpans} <del> spans outside any <note> were excluded from the reading text; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalAddSpans} <add> editorial insertions outside any <note> were kept verbatim in the reading text; every occurrence is logged individually above and flagged on its Passage.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalGaps} <gap/> markers outside any <note> were kept as their literal printed rendering where one is supplied; every occurrence is logged individually above.`,
  });
  anomalies.push({
    where: `${WORK_ID} / reading text`,
    note: `${totalLabels} <label n="line_num"> Ennius-verse line-number citations were excluded from the reading text entirely; every occurrence is logged individually above.`,
  });
  if (totalEmptyParagraphsDropped > 0) {
    anomalies.push({
      where: `${WORK_ID} / reading text`,
      note: `${totalEmptyParagraphsDropped} paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.`,
    });
  }

  // --- write outputs ---------------------------------------------------
  const work: GenericWork = { workId: WORK_ID, language: 'la', divisions };

  const about: WorkAbout = {
    workId: WORK_ID,
    title: 'Tusculanae Disputationes',
    author: 'Marcus Tullius Cicero',
    language: 'la',
    edition: 'Pohlenz 1918 (Teubner)',
    editor: 'Max Pohlenz',
    provenance:
      'TEI XML from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository (CTS urn:cts:latinLit:phi0474.phi049.perseus-lat2), which digitises Max Pohlenz, ed., M. Tulli Ciceronis Tusculanae Disputationes (Leipzig: Teubner, 1918); imported by scripts/import-tusculan-disputations-la.',
    license:
      "Pohlenz's 1918 Teubner critical text is in the public domain. The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).",
    sections: [
      {
        heading: 'Cicero\'s Tusculanae Disputationes',
        paragraphs: [
          'This is the Latin text of the Tusculanae Disputationes ("Tusculan Disputations"), five books of philosophical dialogue Cicero set at his villa in Tusculum in 45 BC, each addressing one obstacle to a happy life: the fear of death (Book 1), the endurance of pain (Book 2), grief (Book 3), other disturbances of the soul (Book 4), and whether virtue alone suffices for happiness (Book 5).',
          'The text here is the original Latin, verbatim. Nothing is translated, modernised, normalised or silently corrected. Where the source is irregular - a bracketed interpolation, an editorial insertion, a marked manuscript gap - the irregularity is preserved and noted below.',
        ],
      },
      {
        heading: 'The edition',
        paragraphs: [
          'Max Pohlenz, ed., M. Tulli Ciceronis Tusculanae Disputationes (Leipzig: Teubner, 1918), the standard Teubner critical text. This edition is in the public domain.',
          'The work is divided into 5 Books; within each Book, this edition carries only Perseus\'s own fine paragraph-level "section" numbering (475 sections total - see "Reference scheme"). Unlike its De Finibus sibling in the same Perseus text group, this edition\'s own XML supplies no inline traditional-chapter markers and no book-title text at all - see "Known gaps & anomalies".',
        ],
      },
      {
        heading: 'Digital source',
        paragraphs: [
          'The machine-readable text is the TEI XML file phi0474.phi049.perseus-lat2.xml (CTS urn:cts:latinLit:phi0474.phi049.perseus-lat2) from the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit repository. It was fetched once and is bundled with the app; nothing is loaded from the network at runtime.',
        ],
      },
      {
        heading: 'How it was imported',
        paragraphs: [
          'The importer walks the book and section <div>s and collects every <p> paragraph within each section, in document order, into that section\'s single Passage. XML transport scaffolding only is removed: page-break <pb/> markers are dropped, and purely typographic wrapper tags (<quote>/<l>/<q> verse and quotation markup, <foreign xml:lang="grc"> for Cicero\'s own untranslated Greek, <hi>, <num rend="smallcaps">) are unwrapped, their text flowing into the surrounding prose.',
          "Pohlenz's own critical apparatus is handled the same way as this app's other Perseus critical editions: <note> elements are dropped entirely; text his apparatus brackets as a probable interpolation (<del>) is excluded; a genuine editorial insertion he prints (<add>) is kept; a marked manuscript gap (<gap>) is kept as its literal printed rendering. This edition additionally prints Ennius-verse line-number citations inline (<label n=\"line_num\">) - excluded from the reading text as editorial citation apparatus, not Cicero's words. Every occurrence of all four outside a <note> is logged individually in anomalies.json.",
        ],
      },
      {
        heading: 'Reference scheme',
        paragraphs: [
          'Citation here is by Book and (Perseus) Section - the fine, 475-entry paragraph numbering this edition\'s own XML carries. Division.ref is always null in this edition: it carries no inline traditional-chapter markers to reconstruct one from (see "Known gaps & anomalies"). Passage.ref is always null.',
        ],
      },
      {
        heading: 'Known gaps & anomalies',
        paragraphs: [
          'Completeness. All 5 Books and all 475 sections of this edition are present and in order. No paragraph is dropped, merged or reordered except where documented below; the bundled TEI file is identical to the current Perseus canonical-latinLit release.',
          'No traditional chapter numbering or book titles. Unlike its De Finibus sibling (same Perseus text group, same apparatus vocabulary), this Pohlenz XML carries no <milestone unit="chapter"/> markers and no <head> elements at all - confirmed genuine by direct inspection, not a parsing gap. Every Section Division.ref and Book Division.sourceHeading is therefore null. The traditional Tusculan chapter numbers (I, II, III...) are available on the English sibling (data/tusculan-disputations-en) instead, whose 1877 Gutenberg source happens to print them inline.',
          "Pohlenz's critical apparatus. <del>/<add>/<gap>/<label> spans outside any <note> are individually logged in anomalies.json, with counts and treatment matching this app's other Perseus critical editions (see \"How it was imported\").",
        ],
      },
    ],
  };

  writeJson('work.json', work);
  writeJson('about.json', about);
  writeJson('anomalies.json', anomalies);

  // --- console summary ----------------------------------------------------
  let totalPassages = 0;
  let totalChars = 0;
  for (const b of divisions) {
    for (const s of b.children) {
      totalPassages += s.passages.length;
      totalChars += s.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }

  process.stdout.write('\nBooks:\n');
  for (const b of divisions) {
    process.stdout.write(`  Book ${b.number!.padStart(2)}  ${b.id.padEnd(8)} ${String(b.children.length).padStart(3)} sections\n`);
  }
  process.stdout.write(
    `\n  5 books  ${totalSections} sections  ${totalPassages} passages  ${totalChars} chars  ` +
      `${totalDelSpans} <del>  ${totalAddSpans} <add>  ${totalGaps} <gap> (${totalGapsInNote} inside <note>)  ${totalLabels} <label>  ${totalNotes} <note>\n`,
  );
  process.stdout.write('\nDone. Run `npm run validate:tusculan-disputations-la` next.\n');
}

function writeJson(name: string, data: unknown): void {
  const file = join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote ${name} (${(readFileSync(file).length / 1024).toFixed(1)} KB)\n`);
}

main();
